// Защита админки на своём сервере (JSON-файлы): подписанный initData, попытки обхода, CORS, загрузка файлов.
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* Проверка защиты: поднимаем сервер с тестовым токеном во временной папке и стучимся к нему.
   Запуск: node tools/test-local.mjs */
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKEN = '7000000000:TEST-local-token-not-real';
const ADMIN = 987654321, USER = 123456789;
const PORT = 8561;
const B = `http://127.0.0.1:${PORT}`;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-sec-'));
const sleep = ms => new Promise(r => setTimeout(r, ms));

export function signInit(user, { token = TOKEN, authDate = Math.floor(Date.now() / 1000) } = {}) {
  const p = new URLSearchParams();
  p.set('query_id', 'AAH' + crypto.randomBytes(6).toString('hex'));
  p.set('user', JSON.stringify(user));
  p.set('auth_date', String(authDate));
  const check = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  p.set('hash', crypto.createHmac('sha256', secret).update(check).digest('hex'));
  return p.toString();
}
const adminUser = { id: ADMIN, first_name: 'Abdullah', username: 'RakhimovAbdullah', language_code: 'ru' };
const plainUser = { id: USER, first_name: 'Client', username: 'someone', language_code: 'ru' };
const INIT_ADMIN = signInit(adminUser), INIT_USER = signInit(plainUser);

const srv = spawn(process.execPath, ['bot/server.js', '--dev'], {
  cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, BOT_TOKEN: TOKEN, ADMIN_TELEGRAM_ID: String(ADMIN), BOT_POLLING: '0', PORT: String(PORT), DATA_DIR: DATA, APP_URL: 'https://example.test/' }
});
let log = '';
srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
for (let i = 0; i < 40; i++) { try { await fetch(B + '/api/health'); break; } catch (e) { await sleep(150); } }

const req = async (method, p, { init, body, headers = {} } = {}) => {
  const h = Object.assign({}, headers);
  if (init) h['X-Init-Data'] = init;
  if (body !== undefined && !(body instanceof Uint8Array)) h['Content-Type'] = 'application/json';
  const r = await fetch(B + p, { method, headers: h, body: body === undefined ? undefined : (body instanceof Uint8Array ? body : JSON.stringify(body)), redirect: 'manual' });
  let j = null; const txt = await r.text(); try { j = JSON.parse(txt); } catch (e) {}
  return { status: r.status, j, txt, headers: r.headers };
};
const results = [];
const test = (name, ok, detail) => { results.push([ok ? 'OK ' : 'ОШИБКА', name, detail || '']); };

/* --- кто я --- */
let r = await req('POST', '/api/me', { body: {} });
test('без initData: не админ', r.j && r.j.admin === false && r.j.id === null, JSON.stringify(r.j));
r = await req('POST', '/api/me', { init: INIT_USER, body: {} });
test('обычный пользователь: не админ, свой id', r.j && r.j.admin === false && r.j.id === USER, JSON.stringify(r.j));
r = await req('POST', '/api/me', { init: INIT_ADMIN, body: {} });
test('администратор по ADMIN_TELEGRAM_ID', r.j && r.j.admin === true && r.j.id === ADMIN, JSON.stringify(r.j));

/* --- admin API --- */
r = await req('GET', '/api/admin/catalog');
test('admin API без initData → 403', r.status === 403, r.status);
r = await req('GET', '/api/admin/catalog', { init: INIT_USER });
test('admin API обычному пользователю → 403', r.status === 403, r.status);
r = await req('GET', '/api/admin/catalog', { init: INIT_ADMIN });
test('admin API администратору → 200', r.status === 200 && r.j.ok && Array.isArray(r.j.apartments), r.status);

/* --- попытки обхода --- */
const tampered = INIT_USER.replace(encodeURIComponent(`"id":${USER}`), encodeURIComponent(`"id":${ADMIN}`));
r = await req('GET', '/api/admin/catalog', { init: tampered });
test('подменён id в initData (подпись старая) → 403', r.status === 403 && tampered !== INIT_USER, r.status);
r = await req('GET', '/api/admin/catalog', { init: signInit(adminUser, { token: '1111111111:OTHER-bot' }) });
test('initData, подписанный другим ботом → 403', r.status === 403, r.status);
r = await req('GET', '/api/admin/catalog', { init: signInit(adminUser, { authDate: Math.floor(Date.now() / 1000) - 2 * 86400 }) });
test('просроченный initData (2 суток) → 403', r.status === 403, r.status);
r = await req('GET', '/api/admin/catalog', { init: signInit(adminUser, { authDate: Math.floor(Date.now() / 1000) + 3600 }) });
test('initData «из будущего» → 403', r.status === 403, r.status);
r = await req('GET', '/api/admin/catalog', { headers: { 'X-Dev-Admin': '1' } });
test('X-Dev-Admin при заданном BOT_TOKEN (даже с --dev) → 403', r.status === 403, r.status);
r = await req('GET', '/api/admin/catalog', { headers: { Cookie: 'isAdmin=1', 'X-Admin': 'true' } });
test('куки/заголовки «я админ» → 403', r.status === 403, r.status);
r = await req('POST', '/api/dev/update', { body: { message: { chat: { id: 1 }, from: { id: 1 }, text: '/list' } } });
test('/api/dev/update недоступен при токене', r.status === 404, r.status);

/* --- действия: обычный пользователь не может, админ может --- */
const before = (await req('GET', '/api/catalog')).j;
r = await req('POST', '/api/admin/status', { init: INIT_USER, body: { id: 'sultana', status: 'rented' } });
test('смена статуса обычным пользователем → 403', r.status === 403, r.status);
r = await req('POST', '/api/admin/content', { init: INIT_USER, body: { section: 'brand', data: { tagline: { ru: 'взлом' } } } });
test('правка контента обычным пользователем → 403', r.status === 403, r.status);
r = await req('POST', '/api/admin/upload?name=hack00001&ext=png', { init: INIT_USER, body: new Uint8Array([137, 80, 78, 71]), headers: { 'Content-Type': 'image/png' } });
test('загрузка файла обычным пользователем → 403', r.status === 403, r.status);
const after0 = (await req('GET', '/api/catalog')).j;
test('после попыток данные не изменились', JSON.stringify(before.content) === JSON.stringify(after0.content) && before.rev === after0.rev, '');

r = await req('POST', '/api/admin/content', { init: INIT_ADMIN, body: { section: 'brand', data: Object.assign({}, before.content.brand, { tagline: { ru: 'Проверка админки', uz: 'Admin tekshiruvi', en: 'Admin check' } }) } });
test('правка бренда администратором → 200', r.status === 200 && r.j.content.brand.tagline.ru === 'Проверка админки', r.status);
const after1 = (await req('GET', '/api/catalog')).j;
test('клиенты сразу получают новый текст и новую ревизию', after1.content.brand.tagline.ru === 'Проверка админки' && after1.rev !== before.rev, after1.rev + ' vs ' + before.rev);
const rv = (await req('GET', '/api/rev')).j;
test('/api/rev отдаёт ту же ревизию', rv.rev === after1.rev, rv.rev);

r = await req('POST', '/api/admin/content', { init: INIT_ADMIN, body: { section: 'i18n', data: { ru: { tabCatalog: '<img src=x onerror=alert(1)>Жильё', noSuchKey: 'x', roomForms: ['комната', 'комнаты', 'комнат'] } } } });
test('HTML в надписи вырезан, чужие ключи отброшены', r.status === 200 && r.j.content.i18n.ru.tabCatalog === 'img src=x onerror=alert(1)Жильё' && !('noSuchKey' in r.j.content.i18n.ru) && !('roomForms' in r.j.content.i18n.ru), JSON.stringify(r.j && r.j.content.i18n.ru));

r = await req('POST', '/api/admin/content', { init: INIT_ADMIN, body: { section: 'layout', data: { tabs: [{ id: 'catalog', on: false }, { id: 'visa', on: false }, { id: 'tours', on: false }, { id: 'cars', on: false }, { id: 'offer', on: false }, { id: 'evil', on: true }], blocks: { housingMap: false } } } });
test('разделы: хотя бы одна вкладка остаётся, чужие id отброшены', r.status === 200 && r.j.content.layout.tabs.filter(x => x.on).length === 1 && !r.j.content.layout.tabs.some(x => x.id === 'evil') && r.j.content.layout.blocks.housingMap === false, JSON.stringify(r.j && r.j.content.layout.tabs));

r = await req('POST', '/api/admin/content', { init: INIT_ADMIN, body: { section: 'contacts', data: { brothers: { tg: 'javascript:alert(1)', phone: '+966 50 667 2436', wa: '966506672436' }, sisters: {}, instagram: 'javascript:alert(1)', hours: { ru: 'Круглосуточно' } } } });
test('контакты: опасные ссылки не сохраняются', r.status === 200 && r.j.content.contacts.brothers.tg === '' && r.j.content.contacts.instagram === '' && r.j.content.contacts.brothers.wa === '966506672436', JSON.stringify(r.j && r.j.content.contacts));

const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
r = await req('POST', '/api/admin/upload?name=logo000001&ext=png', { init: INIT_ADMIN, body: png, headers: { 'Content-Type': 'image/png' } });
test('загрузка изображения администратором → 200', r.status === 200 && r.j.url === '/media/logo000001.png', JSON.stringify(r.j));
r = await req('POST', '/api/admin/content', { init: INIT_ADMIN, body: { section: 'images', data: { logo: '/media/logo000001.png', emblem: 'https://evil.test/x.png' } } });
test('логотип заменён, внешняя ссылка отклонена', r.status === 200 && r.j.content.images.logo === '/media/logo000001.png' && r.j.content.images.emblem === '', JSON.stringify(r.j && r.j.content.images));

/* --- страница /admin и CORS --- */
r = await req('GET', '/admin');
test('/admin отдаёт страницу (данных админки в ней нет)', r.status === 200 && /<main class="screen" id="screenAdmin" hidden><\/main>/.test(r.txt) && !/apartments/.test(r.txt.slice(0, 50)), r.status);
r = await req('GET', '/admin/');
test('/admin/ → редирект на /admin', r.status === 301 && r.headers.get('location') === '/admin', r.status + ' ' + r.headers.get('location'));
r = await req('OPTIONS', '/api/admin/content', { headers: { Origin: 'https://evil.test', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'x-init-data' } });
test('CORS: чужой сайт не получает доступа к admin API', !r.headers.get('access-control-allow-origin'), r.headers.get('access-control-allow-origin'));
r = await req('OPTIONS', '/api/admin/content', { headers: { Origin: 'https://example.test', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'x-init-data' } });
test('CORS: свой адрес (APP_URL) разрешён', r.headers.get('access-control-allow-origin') === 'https://example.test', r.headers.get('access-control-allow-origin'));

/* --- обычный пользователь пользуется приложением --- */
r = await req('GET', '/api/catalog');
test('каталог открыт всем, черновиков и сданных нет', r.status === 200 && r.j.apartments.every(a => a.status !== 'draft' && a.status !== 'rented'), r.j.apartments.length);
r = await req('POST', '/api/request', { init: INIT_USER, body: { kind: 'visa', item: 'tourist', people: 1, name: 'IVANOV IVAN', date: '2026-11-10', lang: 'ru' } });
// токен тут поддельный: Telegram заявку не примет — сервер должен честно сказать «не дошло» (502),
// а не делать вид, что всё отправлено. Главное — обычного пользователя не отсекли как чужого.
test('заявка на визу от обычного пользователя принимается (Telegram тут недоступен — честный 502)',
  (r.status === 200 && r.j.ok) || (r.status === 502 && r.j.telegram === false), JSON.stringify(r.j));
test('BOT_TOKEN не попадает во фронтенд и ответы API', !JSON.stringify((await req('GET', '/api/catalog')).j).includes(TOKEN) && !fs.readdirSync(ROOT + '/assets/js').some(f => fs.readFileSync(ROOT + '/assets/js/' + f, 'utf8').includes('BOT_TOKEN')), '');

srv.kill();
await sleep(300);
console.log(results.map(x => x.join(' | ')).join('\n'));
console.log('\nИтого: ' + results.filter(x => x[0].startsWith('OK')).length + ' из ' + results.length);
console.log('\nЛог сервера (начало):\n' + log.split('\n').slice(0, 6).join('\n'));
fs.rmSync(DATA, { recursive: true, force: true });
process.exit(results.every(x => x[0].startsWith('OK')) ? 0 : 1);   // иначе npm test не заметит ошибку

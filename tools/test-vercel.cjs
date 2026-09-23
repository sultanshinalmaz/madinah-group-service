/* Проверка режима Vercel без Vercel (запуск: node tools/test-vercel.cjs): Postgres в памяти (pg-mem), эмулятор Vercel Blob,
   эмулятор Telegram. Приложение поднимается ровно так же, как в функции api/[...path].js. */
'use strict';
const Module = require('module');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TOKEN = '7000000000:TEST-local-token-not-real';
const ADMIN = 593048264;
const BLOB_BASE = 'https://teststore1234.public.blob.vercel-storage.com';

/* ------------------------------------------------ окружение как на Vercel */
process.env.VERCEL = '1';
process.env.DATABASE_URL = 'postgres://user:pw@db.neon.tech/madinah?sslmode=require';
process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_TESTSTORE_xxx';
process.env.BLOB_BASE_URL = BLOB_BASE;
process.env.BOT_TOKEN = TOKEN;
process.env.ADMIN_TELEGRAM_ID = String(ADMIN);
process.env.APP_URL = 'https://madinah-group.vercel.app/';
process.env.WEBHOOK_SECRET = 'secret-for-webhook-123';
delete process.env.DATA_DIR;

/* ------------------------------------------------------- база в памяти */
let newDb;
try { newDb = require('pg-mem').newDb; }
catch (e) {
  console.log('Для этой проверки нужен pg-mem (эмулятор Postgres): npm install --no-save pg-mem');
  process.exit(0);
}
const memDb = newDb({ noAstCoverageCheck: true });
const pgStub = memDb.adapters.createPg();

/* ------------------------------------------------------ эмулятор Blob */
const blobFiles = new Map();
const blobStub = {
  async put(pathname, body, opts) {
    if (!opts || opts.access !== 'public' || !opts.token) throw new Error('put: нет access/token');
    let buf = body;
    if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
    blobFiles.set(pathname, { buf, type: opts.contentType });
    return { url: BLOB_BASE + '/' + pathname, pathname, contentType: opts.contentType };
  },
  async copy(from, to, opts) {
    const src = blobFiles.get(String(from).replace(BLOB_BASE + '/', ''));
    if (!src) throw new Error('copy: нет источника');
    blobFiles.set(to, src);
    return { url: BLOB_BASE + '/' + to, pathname: to };
  },
  async del() {}
};

/* -------------------------------------------------- эмулятор Telegram */
const sent = [];           // что бот отправил
const tgCalls = [];        // какие методы вызывались
const delivered = [];      // на какие запросы Telegram УЖЕ ответил (как в жизни: не мгновенно)
const tgFail = {};         // метод → текст ошибки, чтобы проверить поведение при сбое Telegram
let tgDelay = 0;           // задержка ответа Telegram, мс
const tgReply = {
  getMe: { ok: true, result: { id: 7000000000, username: 'MadinahGroupTestBot' } },
  setWebhook: { ok: true, result: true },
  sendMessage: { ok: true, result: { message_id: 1 } },
  sendDocument: { ok: true, result: { message_id: 2 } },
  editMessageReplyMarkup: { ok: true, result: {} },
  answerCallbackQuery: { ok: true, result: true },
  getFile: { ok: true, result: { file_path: 'photos/file_1.jpg' } }
};
const realRequest = https.request;
https.request = function (opts, cb) {
  if (!opts || opts.hostname !== 'api.telegram.org') return realRequest.apply(this, arguments);
  const method = String(opts.path).split('/').pop();
  let body = '';
  const res = new (require('stream').PassThrough)();
  res.statusCode = 200;
  const req = {
    on: () => req, setTimeout: () => req,
    write: (c) => { body += c; return true; },
    end: (c) => {
      if (c) body += c;                           // тело может прийти и в end(body)
      const payload = (() => { try { return JSON.parse(body || '{}'); } catch (e) { return {}; } })();
      tgCalls.push({ method, payload });
      if (method === 'sendMessage') sent.push({ chat: payload.chat_id, text: payload.text, kb: payload.reply_markup });
      setTimeout(() => {
        cb(res);
        const fail = tgFail[method];
        if (!fail) delivered.push({ method, chat: payload.chat_id, text: payload.text || '' });
        res.end(JSON.stringify(fail ? { ok: false, description: fail } : (tgReply[method] || { ok: true, result: {} })));
      }, tgDelay);
    },
    destroy: () => {}
  };
  return req;
};
const realFetch = global.fetch;
global.fetch = async function (url, init) {
  if (String(url).startsWith('https://api.telegram.org/file/')) {
    return { ok: true, status: 200, arrayBuffer: async () => Buffer.from('PHOTO-BYTES-' + Math.random()).buffer };
  }
  return realFetch(url, init);
};

/* ------------------------------ подмена модулей pg и @vercel/blob */
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'pg') return pgStub;
  if (request === '@vercel/blob') return blobStub;
  return origLoad.apply(this, arguments);
};

/* --------------------------------------------- «экземпляр функции» */
function freshApp() {                       // как новый холодный запуск функции Vercel
  Object.keys(require.cache).forEach(k => { if (/[\\/](lib|assets[\\/]js)[\\/]/.test(k)) delete require.cache[k]; });
  return require(path.join(ROOT, 'lib', 'app.js'));
}
let app = freshApp();
const server = http.createServer((req, res) => app.handle(req, res));

/* ------------------------------------------------------- инструменты */
function signInit(user, ageSec) {
  const p = new URLSearchParams();
  p.set('user', JSON.stringify(user));
  p.set('auth_date', String(Math.floor(Date.now() / 1000) - (ageSec || 0)));
  const check = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  p.set('hash', crypto.createHmac('sha256', secret).update(check).digest('hex'));
  return p.toString();
}
const initAdmin = signInit({ id: ADMIN, first_name: 'Abdullah', username: 'RakhimovAbdullah' });
const initUser = signInit({ id: 111222333, first_name: 'Гость' });

let B = '';
async function call(pathname, opts) {
  opts = opts || {};
  const r = await realFetch(B + pathname, {
    method: opts.method || 'GET',
    headers: Object.assign({}, opts.headers || {}),
    body: opts.body,
    redirect: 'manual'
  });
  let data = null;
  const txt = await r.text();
  try { data = JSON.parse(txt); } catch (e) { data = txt; }
  return { status: r.status, data, headers: r.headers, text: txt };
}
const asAdmin = (extra) => Object.assign({ 'X-Init-Data': initAdmin }, extra || {});
const asUser = (extra) => Object.assign({ 'X-Init-Data': initUser }, extra || {});
const jsonHdr = (h) => Object.assign({ 'Content-Type': 'application/json' }, h || {});

let ok = 0, fail = 0;
function check(name, cond, info) {
  if (cond) { ok++; console.log('OK  | ' + name + (info ? ' | ' + info : '')); }
  else { fail++; console.log('ОШИБКА | ' + name + (info ? ' | ' + info : '')); }
}

/* ------------------------------------------------------------ проверки */
(async () => {
  await new Promise(r => server.listen(8577, r));
  B = 'http://127.0.0.1:8577';

  const health = await call('/api/health');
  check('health: база Postgres, файлы Blob, режим хостинга', health.data.store === 'pg' && health.data.media === 'blob' && health.data.hosted === true && health.data.admins === 1,
    JSON.stringify(health.data));

  const cat = await call('/api/catalog');
  check('каталог отдаётся: квартиры, районы, услуги, тексты', cat.data.apartments.length === 16 && Object.keys(cat.data.districts).length === 12 && !!cat.data.content.brand && cat.data.rev > 0,
    'квартир ' + cat.data.apartments.length);

  const rows = await new pgStub.Pool().query('select key from docs order by key');
  const keys = rows.rows.map(r => r.key).join(', ');
  check('данные записались в базу', /listings/.test(keys) && /content/.test(keys) && /rev/.test(keys), keys);

  const meU = await call('/api/me', { method: 'POST', headers: asUser() });
  check('обычный пользователь — не админ', meU.data.admin === false && meU.data.id === 111222333, JSON.stringify(meU.data));
  const meA = await call('/api/me', { method: 'POST', headers: asAdmin() });
  check('ADMIN_TELEGRAM_ID=593048264 — админ', meA.data.admin === true && meA.data.id === ADMIN, JSON.stringify(meA.data));

  check('admin API без подписи → 403', (await call('/api/admin/catalog')).status === 403);
  check('admin API обычному пользователю → 403', (await call('/api/admin/catalog', { headers: asUser() })).status === 403);
  const admCat = await call('/api/admin/catalog', { headers: asAdmin() });
  check('admin API администратору → 200', admCat.status === 200 && admCat.data.apartments.length === 16);

  /* ---- правка контента и её сохранность ---- */
  const brand = Object.assign({}, cat.data.content.brand, { tagline: { ru: 'Проверка Vercel', uz: '', en: '' } });
  const save = await call('/api/admin/content', { method: 'POST', headers: jsonHdr(asAdmin()), body: JSON.stringify({ section: 'brand', data: brand }) });
  check('админ правит текст → 200', save.status === 200 && save.data.content.brand.tagline.ru === 'Проверка Vercel');

  const cat2 = await call('/api/catalog');
  check('клиенты сразу видят правку и новую ревизию', cat2.data.content.brand.tagline.ru === 'Проверка Vercel' && cat2.data.rev > cat.data.rev, cat.data.rev + ' → ' + cat2.data.rev);
  const rev = await call('/api/rev');
  check('/api/rev совпадает с каталогом', rev.data.rev === cat2.data.rev, String(rev.data.rev));

  /* ---- новый деплой: функция запускается с нуля, данные на месте ---- */
  app = freshApp();
  const cat3 = await call('/api/catalog');
  check('после нового деплоя правка на месте (данные в базе)', cat3.data.content.brand.tagline.ru === 'Проверка Vercel' && cat3.data.apartments.length === 16);

  /* ---- загрузка фото ---- */
  const photo = Buffer.from('WEBP-TEST-IMAGE-DATA');
  const up = await call('/api/admin/upload?name=apt000123&ext=webp', { method: 'POST', headers: asAdmin({ 'Content-Type': 'image/webp' }), body: photo });
  check('фото от админа уходит в Blob', up.status === 200 && up.data.url === BLOB_BASE + '/media/apt000123.webp' && blobFiles.has('media/apt000123.webp'), up.data.url || up.text);

  const upU = await call('/api/admin/upload?name=hack00001&ext=webp', { method: 'POST', headers: asUser({ 'Content-Type': 'image/webp' }), body: photo });
  check('обычному пользователю загрузка запрещена', upU.status === 403 && !blobFiles.has('media/hack00001.webp'));

  const bigBuf = Buffer.alloc(5 * 1048576, 1);
  const upBig = await call('/api/admin/upload?name=bigvideo01&ext=mp4', { method: 'POST', headers: asAdmin({ 'Content-Type': 'video/mp4' }), body: bigBuf });
  check('файл больше предела → понятный отказ с подсказкой про бота', upBig.status === 413 && /боту в Telegram/.test(upBig.data.error || ''), upBig.data.error);

  /* ---- квартира с фото из облака ---- */
  const listing = { title: { ru: 'Тестовая квартира' }, rooms: 2, price: { month: 1500 }, district: Object.keys(cat.data.districts)[0], status: 'free', photos: [up.data.url] };
  const saved = await call('/api/admin/listing', { method: 'POST', headers: jsonHdr(asAdmin()), body: JSON.stringify({ apartment: listing }) });
  check('квартира с фото из Blob сохраняется', saved.status === 200 && saved.data.apartment.photos[0] === up.data.url, JSON.stringify(saved.data.apartment && saved.data.apartment.photos));

  const badPhoto = await call('/api/admin/listing', { method: 'POST', headers: jsonHdr(asAdmin()), body: JSON.stringify({ apartment: Object.assign({}, listing, { photos: ['https://evil.example.com/a.webp'] }) }) });
  check('чужая ссылка на фото отбрасывается', badPhoto.status === 200 && badPhoto.data.apartment.photos.length === 0);

  /* ---- старая ссылка /media/... ---- */
  const red = await call('/media/apt000123.webp');
  check('старая ссылка /media/… ведёт в облако', red.status === 302 && red.headers.get('location') === BLOB_BASE + '/media/apt000123.webp', red.headers.get('location') || String(red.status));

  /* ---- вебхук ---- */
  const upd = (m) => JSON.stringify({ update_id: Math.floor(Math.random() * 1e6), message: m });
  const post = (extra) => Object.assign({
    message_id: 501, chat: { id: ADMIN, type: 'private' }, from: { id: ADMIN, first_name: 'Abdullah', language_code: 'ru' },
    forward_origin: { type: 'channel', chat: { username: 'madinah_rent', title: 'Канал' }, message_id: 77 },
    media_group_id: 'AG123', photo: [{ file_id: 'ph1', file_size: 1000 }, { file_id: 'ph1-big', file_size: 90000 }]
  }, extra || {});

  const wrong = await call('/api/webhook', { method: 'POST', headers: jsonHdr({ 'X-Telegram-Bot-Api-Secret-Token': 'wrong-secret' }), body: upd(post()) });
  check('вебхук с чужим секретом → 403', wrong.status === 403);

  const hdrWeb = () => jsonHdr({ 'X-Telegram-Bot-Api-Secret-Token': 'secret-for-webhook-123' });
  sent.length = 0;
  const w1 = await call('/api/webhook', { method: 'POST', headers: hdrWeb(), body: upd(post({ caption: '2 комнаты, Ханда, 1500 риал/мес, есть кондиционер' })) });
  const afterDraft = await call('/api/admin/catalog', { headers: asAdmin() });
  const draft = afterDraft.data.apartments.find(a => a.post === 'https://t.me/madinah_rent/77');
  check('пересланный пост → черновик с фото из облака', w1.status === 200 && !!draft && draft.status === 'draft' && /public\.blob\.vercel-storage\.com/.test(draft.photos[0] || ''),
    draft ? draft.photos.join(' ') : 'черновик не создан');
  check('бот ответил риелтору про черновик', sent.some(s => /Черновик создан/.test(s.text)), sent.map(s => (s.text || '').slice(0, 30)).join(' | '));

  app = freshApp();                                   // второе сообщение альбома — другой экземпляр функции
  const w2 = await call('/api/webhook', { method: 'POST', headers: hdrWeb(), body: upd(post({ message_id: 502, photo: [{ file_id: 'ph2', file_size: 95000 }] })) });
  const after2 = await call('/api/admin/catalog', { headers: asAdmin() });
  const drafts = after2.data.apartments.filter(a => a.post === 'https://t.me/madinah_rent/77');
  check('второе фото альбома дописалось в ту же карточку', w2.status === 200 && drafts.length === 1 && drafts[0].photos.length === 2,
    'карточек ' + drafts.length + ', фото ' + (drafts[0] ? drafts[0].photos.length : 0));

  /* ---- заявки ---- */
  sent.length = 0;
  const bk = await call('/api/booking', { method: 'POST', headers: jsonHdr(asUser()), body: JSON.stringify({ apartment: saved.data.apartment.id, name: 'Ахмад', phone: '+79990001122', who: 'family', people: 3, date: '2026-10-01', term: 'month', lang: 'ru' }) });
  check('заявка на квартиру принята и ушла риелтору', bk.status === 200 && sent.some(s => s.chat === ADMIN && /НОВАЯ ЗАЯВКА/.test(s.text)), sent.length + ' сообщ.');

  sent.length = 0;
  const vs = await call('/api/request', { method: 'POST', headers: jsonHdr(asUser()), body: JSON.stringify({ kind: 'visa', item: 'umrah', name: 'Ахмад Каримов', phone: '+79990001122', date: '2026-11-10', people: 2, lang: 'ru' }) });
  check('заявка на визу принята и ушла риелтору', vs.status === 200 && sent.some(s => /ЗАЯВКА НА ВИЗУ/.test(s.text)), JSON.stringify(vs.data));

  /* ---- вебхук настроился сам ---- */
  const setW = tgCalls.filter(c => c.method === 'setWebhook');
  check('вебхук Telegram прописался сам', setW.length > 0 && setW[0].payload.url === 'https://madinah-group.vercel.app/api/webhook' && setW[0].payload.secret_token === 'secret-for-webhook-123',
    setW.length ? setW[0].payload.url : 'setWebhook не вызывался');
  check('вебхук ставится один раз, а не на каждый запрос', setW.length === 1, 'вызовов: ' + setW.length);

  /* ---- CORS и токен ---- */
  const foreign = await call('/api/admin/catalog', { headers: asAdmin({ Origin: 'https://evil.example.com' }) });
  check('admin API не отвечает чужому сайту (CORS)', !foreign.headers.get('access-control-allow-origin'));
  const own = await call('/api/admin/catalog', { headers: asAdmin({ Origin: 'https://madinah-group.vercel.app' }) });
  check('своему адресу CORS разрешён', own.headers.get('access-control-allow-origin') === 'https://madinah-group.vercel.app');

  const all = [health.text, cat.text, admCat.text, JSON.stringify(sent)].join(' ');
  check('токен бота никуда не утекает', !all.includes(TOKEN) && !all.includes('BLOB_READ_WRITE'));

  /* ---- главное: сообщение доставлено ДО ответа (на Vercel функция засыпает сразу после него) ---- */
  tgDelay = 250;                                     // Telegram отвечает не мгновенно
  delivered.length = 0;
  const vs2 = await call('/api/request', { method: 'POST', headers: jsonHdr(asUser()),
    body: JSON.stringify({ kind: 'tour', item: '', name: 'Юсуф', phone: '+998901112233', date: '2026-12-01', people: 3, lang: 'ru' }) });
  check('заявка на тур доставлена в Telegram до ответа клиенту', vs2.status === 200 && delivered.some(d => d.method === 'sendMessage' && /ЗАЯВКА НА ТУР/.test(d.text)),
    'доставлено к моменту ответа: ' + delivered.length);

  delivered.length = 0;
  const bk2 = await call('/api/booking', { method: 'POST', headers: jsonHdr(asUser()), body: JSON.stringify({ apartment: saved.data.apartment.id, name: 'Юсуф', phone: '+998901112233', who: 'brothers', people: 2, date: '2026-10-02', term: 'month', lang: 'ru' }) });
  check('бронь доставлена риелтору и клиенту до ответа', bk2.status === 200 &&
    delivered.some(d => d.chat === ADMIN && /НОВАЯ ЗАЯВКА/.test(d.text)) && delivered.some(d => d.chat === 111222333),
    'доставлено: ' + delivered.map(d => d.method + '→' + d.chat).join(', '));

  // риелтор нажал «✅ Забронировать» под заявкой — клиент получает ответ, кнопки меняются
  const bkId = (await new pgStub.Pool().query("select data from docs where key = 'bookings'")).rows[0].data.slice(-1)[0].id;
  delivered.length = 0;
  const cb = await call('/api/webhook', { method: 'POST', headers: hdrWeb(), body: JSON.stringify({ update_id: 777001,
    callback_query: { id: 'cq1', data: 'bk:' + bkId + ':ok', from: { id: ADMIN, first_name: 'Abdullah' },
      message: { message_id: 55, chat: { id: ADMIN, type: 'private' } } } }) });
  check('кнопка под заявкой: клиенту ответ, кнопки обновлены — всё до ответа Telegram-у', cb.status === 200 &&
    delivered.some(d => d.method === 'sendMessage' && d.chat === 111222333) &&
    delivered.some(d => d.method === 'editMessageReplyMarkup') && delivered.some(d => d.method === 'answerCallbackQuery'),
    delivered.map(d => d.method).join(', '));

  /* ---- Telegram не принимает сообщения: честная ошибка, процесс не падает ---- */
  tgDelay = 0;
  tgFail.sendMessage = "Forbidden: bot can't initiate conversation with a user";
  const bad = await call('/api/request', { method: 'POST', headers: jsonHdr(asUser()),
    body: JSON.stringify({ kind: 'car', item: '', name: 'Юсуф', phone: '+998901112233', date: '2026-12-05', dateTo: '2026-12-07', people: 2, lang: 'ru' }) });
  check('Telegram отказал — клиенту 502, приложение предложит отправить вручную', bad.status === 502 && bad.data.telegram === false, JSON.stringify(bad.data));
  const alive = await call('/api/health');
  check('после сбоя Telegram сервер жив (нет необработанных ошибок)', alive.status === 200 && alive.data.ok === true);

  /* ---- диагностика: /api/health?telegram=1 ---- */
  const diag = await call('/api/health?telegram=1');
  const t = (diag.data && diag.data.telegram) || {};
  check('диагностика: токен, бот, адрес приложения, вебхук', t.token === 'ok' && t.bot === '@MadinahGroupTestBot' && typeof t.appUrlOk === 'boolean' && !!t.webhook,
    JSON.stringify({ token: t.token, bot: t.bot, appUrlOk: t.appUrlOk, webhook: t.webhook }));
  tgFail.sendChatAction = "Forbidden: bot can't initiate conversation with a user";
  const diag2 = await call('/api/health?telegram=1');
  const adm = ((diag2.data && diag2.data.telegram) || {}).admins || [];
  check('диагностика подсказывает: админ должен нажать «Старт» у бота', adm.some(a => /нажать «Старт»/.test(a)), adm.join(' | '));
  delete tgFail.sendMessage; delete tgFail.sendChatAction;
  check('в диагностике нет токена', !diag.text.includes(TOKEN) && !diag2.text.includes(TOKEN));

  /* ---- APP_URL и WEBHOOK_SECRET не заданы: адрес берётся из Vercel, пароль — из токена ---- */
  const keepEnv = { APP_URL: process.env.APP_URL, WEBHOOK_SECRET: process.env.WEBHOOK_SECRET };
  delete process.env.APP_URL; delete process.env.WEBHOOK_SECRET;
  process.env.VERCEL_PROJECT_PRODUCTION_URL = 'madinah-group-service.vercel.app';
  tgCalls.length = 0;
  app = freshApp();
  await call('/api/health');
  const sw = tgCalls.filter(c => c.method === 'setWebhook').slice(-1)[0];
  check('APP_URL не задан — адрес берётся из настроек проекта Vercel', !!sw && sw.payload.url === 'https://madinah-group-service.vercel.app/api/webhook', sw && sw.payload.url);
  const secret = (sw && sw.payload.secret_token) || '';
  check('WEBHOOK_SECRET не задан — пароль вебхука всё равно есть', /^[0-9a-f]{48}$/.test(secret));
  const fakeClick = JSON.stringify({ update_id: 900001, callback_query: { id: 'x', data: 'bk:nope:ok', from: { id: ADMIN }, message: { message_id: 1, chat: { id: ADMIN } } } });
  const forged = await call('/api/webhook', { method: 'POST', headers: jsonHdr(), body: fakeClick });
  check('поддельное «нажатие кнопки» от имени админа без пароля → 403', forged.status === 403);
  const realHook = await call('/api/webhook', { method: 'POST', headers: jsonHdr({ 'X-Telegram-Bot-Api-Secret-Token': secret }),
    body: JSON.stringify({ update_id: 900002, message: { message_id: 9, chat: { id: 111222333, type: 'private' }, from: { id: 111222333, language_code: 'ru' }, text: '/start' } }) });
  check('с правильным паролем Telegram достукивается до бота', realHook.status === 200);
  const menu = tgCalls.filter(c => c.method === 'setChatMenuButton').slice(-1)[0];
  check('кнопка Mini App указывает на боевой адрес', !!menu && menu.payload.menu_button.web_app.url === 'https://madinah-group-service.vercel.app/',
    menu && menu.payload.menu_button.web_app.url);
  Object.assign(process.env, keepEnv); delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  app = freshApp();

  console.log('\nИтого: ' + ok + ' из ' + (ok + fail));
  server.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('СЛОМАЛОСЬ:', e); process.exit(1); });

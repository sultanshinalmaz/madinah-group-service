/* Проверка развёрнутого приложения: node tools/check-deploy.mjs https://ваш-адрес.vercel.app
   Без адреса берёт APP_URL из .env. Если рядом есть BOT_TOKEN — заодно спросит Telegram про вебхук. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = {};
for (const f of ['.env', 'bot/.env']) {
  try {
    fs.readFileSync(path.join(ROOT, f), 'utf8').split(/\r?\n/).forEach(l => {
      const m = l.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*?)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    });
  } catch (e) {}
}
const cfg = k => (env[k] || process.env[k] || '').trim();

let base = (process.argv[2] || cfg('APP_URL') || '').trim();
if (!base) {
  console.log('Укажите адрес: node tools/check-deploy.mjs https://ваш-проект.vercel.app');
  process.exit(1);
}
if (!/^https?:\/\//.test(base)) base = 'https://' + base;
base = base.replace(/\/+$/, '');

let bad = 0;
const ok = (good, name, info) => {
  if (!good) bad++;
  console.log((good ? '✅ ' : '❌ ') + name + (info ? ' — ' + info : ''));
};
const get = async (p, opts) => {
  try {
    const r = await fetch(base + p, Object.assign({ redirect: 'manual' }, opts || {}));
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) {}
    return { status: r.status, text, json, headers: r.headers };
  } catch (e) { return { status: 0, text: String(e.message), json: null, headers: new Headers() }; }
};

console.log('Проверяю ' + base + '\n');

const h = await get('/api/health');
ok(h.status === 200 && h.json && h.json.ok, 'приложение отвечает', h.status ? 'HTTP ' + h.status : h.text);
if (h.json) {
  ok(h.json.store === 'pg', 'база подключена (DATABASE_URL)', 'store: ' + h.json.store + (h.json.store === 'fs' ? ' — данные пропадут при новом деплое!' : ''));
  ok(h.json.media === 'blob', 'хранилище файлов подключено (BLOB_READ_WRITE_TOKEN)', 'media: ' + h.json.media);
  ok(!!h.json.bot, 'токен бота задан (BOT_TOKEN)');
  ok(h.json.admins > 0, 'администратор задан (ADMIN_TELEGRAM_ID)', 'админов: ' + h.json.admins);
}

const main = await get('/');
ok(main.status === 200 && /Madinah|madinah/i.test(main.text), 'главная страница открывается', 'HTTP ' + main.status);

const adm = await get('/admin');
ok(adm.status === 200 && /<html/i.test(adm.text), 'страница /admin открывается', 'HTTP ' + adm.status);

const cat = await get('/api/catalog');
ok(cat.status === 200 && cat.json && Array.isArray(cat.json.apartments), 'каталог отдаётся',
  cat.json ? 'квартир: ' + cat.json.apartments.length : 'HTTP ' + cat.status);

const admApi = await get('/api/admin/catalog');
ok(admApi.status === 403, 'admin API закрыт без подписи Telegram', 'HTTP ' + admApi.status);

const hook = await get('/api/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
ok(hook.status === 403 || hook.status === 200, 'вебхук отвечает', 'HTTP ' + hook.status +
  (hook.status === 403 ? ' (секрет проверяется — так и надо)' : ' (WEBHOOK_SECRET не задан)'));

const token = cfg('BOT_TOKEN');
if (token) {
  try {
    const r = await (await fetch('https://api.telegram.org/bot' + token + '/getWebhookInfo')).json();
    const info = r.result || {};
    ok(info.url === base + '/api/webhook', 'Telegram шлёт обновления на этот адрес', info.url || 'вебхук не установлен');
    if (info.last_error_message) console.log('   ⚠️ последняя ошибка Telegram: ' + info.last_error_message);
    if (info.pending_update_count) console.log('   ⚠️ необработанных обновлений: ' + info.pending_update_count);
  } catch (e) { console.log('❌ не удалось спросить Telegram: ' + e.message); }
} else {
  console.log('ℹ️ BOT_TOKEN рядом нет — вебхук проверьте так:');
  console.log('   https://api.telegram.org/bot<ТОКЕН>/getWebhookInfo');
}

console.log('\n' + (bad ? '❌ Не всё в порядке: ' + bad + '. Смотрите ДЕПЛОЙ.md.' : '✅ Всё в порядке. Откройте бота и нажмите «Каталог».'));
process.exit(bad ? 1 : 0);

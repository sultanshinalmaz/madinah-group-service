/* ==========================================================================
   Запуск на своём компьютере: node bot/server.js [--dev]

   На Vercel этот файл не нужен — там каждый запрос обрабатывает api/[...path].js.
   Здесь то же самое, только вокруг обычный сервер: он ещё раздаёт index.html,
   assets/ и загруженные файлы, а обновления от Telegram забирает опросом.

     node bot/server.js            — как на сервере (нужен BOT_TOKEN)
     node bot/server.js --dev      — проверка без Telegram: http://localhost:8443/admin?admin
     node bot/server.js --reseed   — перечитать квартиры из assets/js/data.js
     node bot/server.js --reseed-content — вернуть тексты и разделы к исходным
   ========================================================================== */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const app = require('../lib/app.js');
const store = require('../lib/store.js');
const media = require('../lib/media.js');
const { ROOT, cfg } = require('../lib/env.js');

const PORT = Number(cfg('PORT', 8443));
const TOKEN = cfg('BOT_TOKEN');
const DEV = process.argv.includes('--dev') || cfg('DEV') === '1';
const BOT_POLLING = cfg('BOT_POLLING', '1') !== '0';
const WEBHOOK_URL = cfg('WEBHOOK_URL');

if (!TOKEN && !DEV) {
  console.error('Нет BOT_TOKEN. Скопируйте .env.example в bot/.env и впишите токен от @BotFather.');
  console.error('Проверить без бота: node bot/server.js --dev');
  process.exit(1);
}

/* ------------------------------------------------------------ файлы */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
  '.m4v': 'video/mp4', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.pdf': 'application/pdf'
};
function serveFile(req, res, file, cache) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Не найдено'); }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': cache || 'no-cache' };
    const range = req.headers.range;
    if (range) {
      const [a, b] = range.replace(/bytes=/, '').split('-');
      const start = Math.min(+a || 0, st.size - 1), end = b ? Math.min(+b, st.size - 1) : st.size - 1;
      res.writeHead(206, Object.assign(headers, { 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 }));
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, Object.assign(headers, { 'Content-Length': st.size }));
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}
function inside(base, rel) {
  const full = path.normalize(path.join(base, rel));
  return full.startsWith(base + path.sep) ? full : null;
}

/* -------------------------------------------------------------- сервер */
const server = http.createServer((req, res) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch (e) { res.writeHead(400); return res.end(); }
  const p = decodeURIComponent(url.pathname);

  if ((req.method === 'GET' || req.method === 'HEAD') && !p.startsWith('/api/') && p !== '/webhook') {
    if (p === '/' || p === '/index.html') return serveFile(req, res, path.join(ROOT, 'index.html'), 'no-cache');
    // /admin — та же страница: без подписанного Telegram initData и ADMIN_TELEGRAM_ID она покажет «нет доступа»,
    // а все данные и действия админки идут через /api/admin/* с проверкой на сервере
    if (p === '/admin') return serveFile(req, res, path.join(ROOT, 'index.html'), 'no-store');
    if (p === '/admin/') { res.writeHead(301, { Location: '/admin' + (url.search || '') }); return res.end(); }
    if (p.startsWith('/assets/')) {
      const f = inside(path.join(ROOT, 'assets'), p.slice('/assets/'.length));
      if (!f) { res.writeHead(404); return res.end(); }
      return serveFile(req, res, f, /\.(webp|jpe?g|png|mp4)$/i.test(f) ? 'public, max-age=86400' : 'no-cache');
    }
    if (p.startsWith('/media/')) {
      const f = media.kind === 'fs' && inside(media.mediaDir, p.slice('/media/'.length));
      if (f && fs.existsSync(f)) return serveFile(req, res, f, 'public, max-age=604800');
      return app.handle(req, res);              // файлы в облаке — ответит ссылкой
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Не найдено');
  }

  app.handle(req, res);
});

/* --------------------------------------------------------------- запуск */
(async () => {
  if (process.argv.includes('--reseed')) await store.del('listings');
  if (process.argv.includes('--reseed-content')) await store.del('content');
  await app.load(true);
  const s = app.stats();

  server.listen(PORT, () => {
    console.log(`Madinah Group: http://localhost:${PORT}` +
      (DEV && !TOKEN ? '  (режим проверки: панель — http://localhost:' + PORT + '/admin?admin)' : '') +
      (TOKEN ? `  · админка: ${app.APP_URL ? new URL('admin', app.APP_URL) : '/admin'}` : ''));
    console.log(`Квартир: ${s.listings}, районов: ${s.districts}, администраторов: ${s.admins}` +
      `, данные: ${store.kind === 'pg' ? 'Postgres' : store.dataDir}, файлы: ${media.kind === 'blob' ? 'Vercel Blob' : media.mediaDir}`);
    setTimeout(() => console.log('ffmpeg: ' + (media.hasFfmpeg ? 'есть — видео будут сжиматься' : 'нет — видео хранятся как есть (apt install ffmpeg)')), 800);
  });

  /* --------------------------------------------------------------- бот */
  if (TOKEN && !BOT_POLLING) {
    console.log('Бот: опрос Telegram выключен (BOT_POLLING=0) — проверяется только initData');
  } else if (TOKEN) {
    app.botUsername();
    if (WEBHOOK_URL) {
      app.tg('setWebhook', Object.assign({ url: WEBHOOK_URL, allowed_updates: ['message', 'callback_query'], max_connections: 1 },
        cfg('WEBHOOK_SECRET') ? { secret_token: cfg('WEBHOOK_SECRET') } : {}))
        .then(() => console.log('Webhook: ' + WEBHOOK_URL))
        .catch(e => console.error('setWebhook:', e.message));
    } else {
      let offset = 0;
      const poll = () => {
        app.tg('getUpdates', { offset, timeout: 30, allowed_updates: ['message', 'callback_query'] })
          .then(async list => {
            for (const u of list) {
              offset = u.update_id + 1;
              await app.load(true);
              await app.handleUpdate(u);
              await app.settle();
              await store.flush();
            }
            poll();
          })
          .catch(e => { console.error('getUpdates:', e.message); setTimeout(poll, 5000); });
      };
      app.tg('deleteWebhook', {}).catch(() => {}).then(poll);
      console.log('Бот: опрос Telegram (webhook не задан)');
    }
  } else {
    console.log('Бот выключен: нет BOT_TOKEN (режим проверки)');
  }
})().catch(e => {
  console.error('Не удалось запуститься:', e);
  process.exit(1);
});

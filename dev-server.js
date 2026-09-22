/* Локальный просмотр без зависимостей:  node dev-server.js  →  http://localhost:5180 */
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5180;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.jpg':  'image/jpeg',
  '.png':  'image/png',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.mp4':  'video/mp4',
  '.pdf':  'application/pdf'
};

http.createServer((req, res) => {
  let file = decodeURIComponent(req.url.split('?')[0]);
  if (file === '/') file = '/index.html';
  const full = path.join(__dirname, file);
  if (!full.startsWith(__dirname)) { res.writeHead(403).end('no'); return; }
  fs.readFile(full, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Не найдено: ' + file); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  });
}).listen(PORT, () => console.log('Открой http://localhost:' + PORT));

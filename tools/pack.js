/* Собирает папку для выкладки: только то, что нужно клиенту.
   node tools/pack.js  →  dist/site/  (её и перетаскивают на хостинг)
   Бот, .env, README и служебные файлы туда не попадают. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'site');

fs.rmSync(path.join(ROOT, 'dist'), { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

function copy(rel) {
  const from = path.join(ROOT, rel);
  const to = path.join(OUT, rel);
  if (fs.statSync(from).isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    fs.readdirSync(from).forEach(f => copy(path.join(rel, f)));
  } else {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
}
['index.html', 'assets'].forEach(copy);

let files = 0, bytes = 0;
(function walk(dir) {
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else { files++; bytes += fs.statSync(p).size; }
  });
})(OUT);
console.log('Готово: dist/site — ' + files + ' файлов, ' + (bytes / 1048576).toFixed(1) + ' МБ');
console.log('Эту папку перетащите на https://app.netlify.com/drop');

/* Печатает условия аренды для клиентов (вкладка «Условия») в PDF.
   node tools/terms-pdf.mjs            →  assets/docs/client-terms-ru.pdf, -uz.pdf, -en.pdf
   node tools/terms-pdf.mjs --local    →  то же, но текст строго из assets/js/data.js
   По умолчанию берётся действующая редакция с сайта (её могли поправить в панели), если сайт
   недоступен — из data.js. Адрес сайта: SITE_URL или https://madinah-group-service.vercel.app.
   Шаблон — tools/client-terms.html. Нужен Chrome или Edge и интернет (шрифт PT Serif с Google Fonts). */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..', 'assets', 'docs');
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SITE = (process.env.SITE_URL || 'https://madinah-group-service.vercel.app').replace(/\/+$/, '');

let live = null;
if (!process.argv.includes('--local')) {
  try {
    const r = await fetch(SITE + '/api/catalog', { signal: AbortSignal.timeout(15000) });
    const j = await r.json();
    if (j.content && j.content.offer && j.content.offer.sections) {
      live = { offer: j.content.offer, brand: j.content.brand, contacts: j.content.contacts };
      console.log('Текст: действующая редакция с сайта', live.offer.version, '(' + SITE + ')');
    }
  } catch (e) { console.log('Сайт недоступен (' + e.message + ') — беру текст из data.js'); }
}
if (!live) console.log('Текст: assets/js/data.js');

const chrome = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium'
].find(p => fs.existsSync(p));
if (!chrome) { console.error('Не найден Chrome или Edge'); process.exit(1); }

const PORT = 9343;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mr-terms-'));
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });

let ws;
for (let i = 0; i < 40 && !ws; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
    ws = new WebSocket(list.webSocketDebuggerUrl);
  } catch (e) { await sleep(250); }
}
await new Promise(r => ws.addEventListener('open', r, { once: true }));

let id = 0;
const pending = new Map();
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const call = (method, params = {}, sessionId) => new Promise(res => {
  const mid = ++id;
  pending.set(mid, res);
  ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
});
const evaluate = async (expr, sessionId) =>
  (await call('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId)).result.result.value;

const { result: { targetId } } = await call('Target.createTarget', { url: 'about:blank' });
const { result: { sessionId } } = await call('Target.attachToTarget', { targetId, flatten: true });
await call('Page.enable', {}, sessionId);
await call('Runtime.enable', {}, sessionId);

const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
let failed = 0;

for (const lang of ['ru', 'uz', 'en']) {
  const url = pathToFileURL(path.join(HERE, 'client-terms.html')).href + '?lang=' + lang + (live ? '&ext=1' : '');
  await call('Page.navigate', { url }, sessionId);
  if (live) {
    for (let i = 0; i < 80 && !(await evaluate('typeof window.__setData === "function"', sessionId)); i++) await sleep(100);
    await evaluate('window.__setData(' + JSON.stringify(live) + '), true', sessionId);
  }
  for (let i = 0; i < 80 && !(await evaluate('window.__ready === true', sessionId)); i++) await sleep(150);
  if (!(await evaluate('document.fonts.check(\'10pt "PT Serif"\')', sessionId))) console.log('  внимание: шрифт PT Serif не загрузился (нет интернета?) — будет запасной');
  const f = await evaluate('window.__footer', sessionId);
  if (!f) { console.error('Шаблон не отрисовался:', lang); failed++; continue; }
  const footer = `<div style="width:100%;margin:0 16mm;display:flex;justify-content:space-between;` +
    `font:8px 'Segoe UI',Tahoma,Arial,sans-serif;color:#8a7b6a"><span>${esc(f.left)}</span>` +
    `<span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
  const pdf = await call('Page.printToPDF', {
    printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: footer
  }, sessionId);
  if (!pdf.result) { console.error('Ошибка печати', lang, pdf.error); failed++; continue; }
  const file = path.join(OUT, `client-terms-${lang}.pdf`);
  fs.writeFileSync(file, Buffer.from(pdf.result.data, 'base64'));
  console.log('Сохранено:', path.relative(process.cwd(), file), Math.round(fs.statSync(file).size / 1024) + ' КБ');
}

ws.close();
proc.kill();
await sleep(300);
try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
if (failed) process.exit(1);

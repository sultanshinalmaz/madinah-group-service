/* Рисует обложку для BotFather (/newapp просит 640×360) и для закрепа в канале.
   node tools/cover.mjs  →  deploy/cover-640x360.png и deploy/cover-1280x720.png
   Нужен Chrome или Edge. npm не нужен. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..', 'deploy');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const chrome = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium'
].find(p => fs.existsSync(p));
if (!chrome) { console.error('Не найден Chrome или Edge'); process.exit(1); }

const PORT = 9341;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mr-cover-'));
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--allow-file-access-from-files', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });

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

const { result: { targetId } } = await call('Target.createTarget', { url: 'about:blank' });
const { result: { sessionId } } = await call('Target.attachToTarget', { targetId, flatten: true });
await call('Page.enable', {}, sessionId);

for (const scale of [1, 2]) {
  await call('Emulation.setDeviceMetricsOverride', { width: 640, height: 360, deviceScaleFactor: scale, mobile: false }, sessionId);
  await call('Page.navigate', { url: pathToFileURL(path.join(HERE, 'cover.html')).href }, sessionId);
  await sleep(1200);
  const shot = await call('Page.captureScreenshot', { format: 'png' }, sessionId);
  const file = path.join(OUT, scale === 1 ? 'cover-640x360.png' : 'cover-1280x720.png');
  fs.writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
  console.log('Сохранено:', path.relative(process.cwd(), file));
}

ws.close();
proc.kill();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}

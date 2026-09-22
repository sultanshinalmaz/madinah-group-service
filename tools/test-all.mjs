/* Все проверки разом: npm test
     1) свой сервер, данные в JSON-файлах  — tools/test-local.mjs
     2) режим Vercel: Postgres + Blob + вебхук — tools/test-vercel.cjs
   Второй проверке нужен эмулятор Postgres: npm install --no-save pg-mem */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(file) {
  return new Promise(resolve => {
    console.log('\n──────── ' + file + ' ────────');
    const p = spawn(process.execPath, [path.join('tools', file)], { cwd: ROOT, stdio: 'inherit' });
    p.on('exit', code => resolve(code || 0));
  });
}

const a = await run('test-local.mjs');
const b = await run('test-vercel.cjs');
console.log('\n' + (a || b ? '❌ Есть ошибки — смотрите выше.' : '✅ Всё прошло.'));
process.exit(a || b);

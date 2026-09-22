'use strict';
/* Настройки: .env в корне, bot/.env (он главнее) и переменные окружения.
   На Vercel файлов .env нет — всё приходит из переменных проекта. */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function loadEnv(file) {
  const out = {};
  try {
    fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach(line => {
      const m = line.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*?)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    });
  } catch (e) {}
  return out;
}

const ENV = Object.assign(loadEnv(path.join(ROOT, '.env')), loadEnv(path.join(ROOT, 'bot', '.env')));
const cfg = (k, def) => String(ENV[k] || process.env[k] || def || '').trim();

module.exports = { ROOT, ENV, cfg, loadEnv };

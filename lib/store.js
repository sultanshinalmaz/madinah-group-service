'use strict';
/* ==========================================================================
   Хранилище данных приложения: квартиры, районы, услуги, заявки, сделки,
   настройки, контент админки.

     • есть DATABASE_URL  → Postgres (Neon, Supabase, Vercel Postgres) — так работает Vercel
     • нет DATABASE_URL   → JSON-файлы в bot/data, как было раньше (свой компьютер)

   Наружу оба варианта выглядят одинаково:
     load()          — прочитать все документы разом
     save(key, data) — поставить запись в очередь (не ждём: ответ клиенту не задерживаем)
     flush()         — дождаться всех записей; возвращает список ошибок (пустой — всё сохранено)
     claim(key,data) — записать, только если такого ключа ещё не было (для альбомов из Telegram)
   ========================================================================== */

const fs = require('fs');
const path = require('path');
const { ROOT, cfg } = require('./env.js');

const PG_URL = cfg('DATABASE_URL') || cfg('POSTGRES_URL');
const kind = PG_URL ? 'pg' : 'fs';

/* ------------------------------------------------------------- Postgres */
let pool = null;
function db() {
  if (!pool) {
    const { Pool } = require('pg');
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(PG_URL) || /sslmode=disable/.test(PG_URL);
    pool = new Pool({
      connectionString: PG_URL,
      max: Number(cfg('PG_MAX', 3)),
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      ssl: local ? false : { rejectUnauthorized: false }
    });
    pool.on('error', e => console.error('postgres:', e.message));
  }
  return pool;
}
let ready = null;
function init() {
  if (!ready) {
    ready = db().query(
      'create table if not exists docs (key text primary key, data jsonb not null, updated_at timestamptz not null default now())'
    ).catch(e => { ready = null; throw e; });
  }
  return ready;
}
const PG = {
  async load() {
    await init();
    const r = await db().query('select key, data from docs');
    const out = {};
    r.rows.forEach(row => { out[row.key] = row.data; });
    return out;
  },
  async put(key, data) {
    await init();
    await db().query(
      'insert into docs (key, data) values ($1, $2::jsonb) on conflict (key) do update set data = excluded.data, updated_at = now()',
      [key, JSON.stringify(data)]
    );
  },
  async claim(key, data) {                       // true — ключа не было, занял его я
    await init();
    const ex = await db().query('select 1 from docs where key = $1', [key]);
    if (ex.rows.length) return false;
    try {
      await db().query('insert into docs (key, data) values ($1, $2::jsonb)', [key, JSON.stringify(data)]);
      return true;
    } catch (e) {                                // кто-то успел за эти миллисекунды — ключ занят им
      if (e && (e.code === '23505' || /duplicate|unique/i.test(e.message || ''))) return false;
      throw e;
    }
  },
  async get(key) {
    await init();
    const r = await db().query('select data from docs where key = $1', [key]);
    return r.rows.length ? r.rows[0].data : null;
  },
  async del(key) {
    await init();
    await db().query('delete from docs where key = $1', [key]);
  },
  async sweep(prefix, hours) {                   // убрать старые служебные записи (альбомы)
    await init();
    await db().query("delete from docs where key like $1 and updated_at < now() - ($2 || ' hours')::interval", [prefix + '%', String(hours)]);
  }
};

/* ---------------------------------------------------------- JSON-файлы */
const DATA_DIR = path.resolve(ROOT, cfg('DATA_DIR', 'bot/data'));
const fileOf = key => path.join(DATA_DIR, key.replace(/[^a-z0-9:_-]/gi, '_') + '.json');
const FS = {
  async load() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const out = {};
    fs.readdirSync(DATA_DIR).forEach(f => {
      if (!f.endsWith('.json')) return;
      try { out[f.slice(0, -5)] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')); } catch (e) {}
    });
    return out;
  },
  async put(key, data) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const file = fileOf(key);
    fs.writeFileSync(file + '.tmp', JSON.stringify(data, null, 1));
    fs.renameSync(file + '.tmp', file);          // запись целиком: файл не побьётся на полуслове
  },
  async claim(key, data) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(fileOf(key))) return false;
    await FS.put(key, data);
    return true;
  },
  async get(key) {
    try { return JSON.parse(fs.readFileSync(fileOf(key), 'utf8')); } catch (e) { return null; }
  },
  async del(key) {
    try { fs.unlinkSync(fileOf(key)); } catch (e) {}
  },
  async sweep(prefix, hours) {
    try {
      fs.readdirSync(DATA_DIR).forEach(f => {
        if (!f.startsWith(prefix.replace(/:/g, '_'))) return;
        const p = path.join(DATA_DIR, f);
        if (Date.now() - fs.statSync(p).mtimeMs > hours * 3600000) fs.unlinkSync(p);
      });
    } catch (e) {}
  }
};

const drv = kind === 'pg' ? PG : FS;

/* ------------------------------------------ очередь записей и ожидание */
const PENDING = [];
const ERRORS = [];

function save(key, data) {
  const p = drv.put(key, JSON.parse(JSON.stringify(data))).catch(e => {
    console.error('сохранение «' + key + '»:', e.message);
    ERRORS.push(e.message);
  });
  PENDING.push(p);
  return p;
}
/* дождаться всех записей (и тех, что появились по ходу) — вызывается до ответа клиенту */
async function flush() {
  while (PENDING.length) await Promise.all(PENDING.splice(0));
  return ERRORS.splice(0);
}

module.exports = {
  kind,
  dataDir: kind === 'fs' ? DATA_DIR : PG_URL.replace(/:[^:@/]*@/, ':***@'),
  load: () => drv.load(),
  get: key => drv.get(key),
  del: key => drv.del(key),
  claim: (key, data) => drv.claim(key, data),
  sweep: (prefix, hours) => drv.sweep(prefix, hours).catch(() => {}),
  save,
  flush
};

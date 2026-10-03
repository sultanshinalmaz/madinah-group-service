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
  async albumMerge(key, patch) {
    await init();
    const data = {
      listing: String((patch && patch.listing) || ''),
      photos: Array.isArray(patch && patch.photos) ? patch.photos : [],
      videos: Array.isArray(patch && patch.videos) ? patch.videos : []
    };
    await db().query(
      "insert into docs (key, data) values ($1, $2::jsonb) " +
      "on conflict (key) do update set data = jsonb_build_object(" +
        "'listing', case when coalesce($2::jsonb->>'listing','') <> '' then $2::jsonb->>'listing' else coalesce(docs.data->>'listing','') end, " +
        "'photos', coalesce(docs.data->'photos','[]'::jsonb) || coalesce($2::jsonb->'photos','[]'::jsonb), " +
        "'videos', coalesce(docs.data->'videos','[]'::jsonb) || coalesce($2::jsonb->'videos','[]'::jsonb)" +
      "), updated_at = now()",
      [key, JSON.stringify(data)]
    );
  },
  async sweep(prefix, hours) {                   // убрать старые служебные записи (альбомы)
    await init();
    await db().query("delete from docs where key like $1 and updated_at < now() - ($2 || ' hours')::interval", [prefix + '%', String(hours)]);
  },
  /* одна запись списка (бронь, заявка): строка заблокирована на время правки, поэтому две заявки,
     пришедшие в одну секунду в разные экземпляры функции, не затирают друг друга */
  async putListItem(key, item, max) {
    await init();
    const c = await db().connect();
    try {
      await c.query('begin');
      const r = await c.query('select data from docs where key = $1 for update', [key]);
      const list = r.rows[0] && Array.isArray(r.rows[0].data) ? r.rows[0].data : [];
      const i = list.findIndex(x => x && x.id === item.id);
      if (i >= 0) list[i] = item; else list.push(item);
      await c.query('insert into docs (key, data) values ($1, $2::jsonb) on conflict (key) do update set data = excluded.data, updated_at = now()',
        [key, JSON.stringify(list.slice(-max))]);
      await c.query('commit');
    } catch (e) {
      try { await c.query('rollback'); } catch (_) {}
      throw e;
    } finally { c.release(); }
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
  async albumMerge(key, patch) {
    const cur = await FS.get(key) || { listing: '', photos: [], videos: [] };
    const p = Array.isArray(patch && patch.photos) ? patch.photos : [];
    const v = Array.isArray(patch && patch.videos) ? patch.videos : [];
    cur.listing = String((patch && patch.listing) || cur.listing || '');
    cur.photos = Array.from(new Set((cur.photos || []).concat(p))).slice(0, 30);
    cur.videos = (cur.videos || []).concat(v).slice(0, 6);
    await FS.put(key, cur);
  },
  async putListItem(key, item, max) {
    const cur = await FS.get(key);
    const list = Array.isArray(cur) ? cur : [];
    const i = list.findIndex(x => x && x.id === item.id);
    if (i >= 0) list[i] = item; else list.push(item);
    await FS.put(key, list.slice(-max));
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
/* одна запись списка: добавить или заменить по id, не переписывая остальные */
function saveItem(key, item, max) {
  const p = drv.putListItem(key, JSON.parse(JSON.stringify(item)), max || 2000).catch(e => {
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
  albumMerge: (key, patch) => drv.albumMerge(key, patch),
  save,
  saveItem,
  flush
};

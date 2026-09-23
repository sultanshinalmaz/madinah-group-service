/* ==========================================================================
   Madinah Group — приложение целиком: каталог, панель, заявки, бот.

   Этот файл не запускает сервер сам. Его подключают:
     • api/index.js   — функция Vercel (один запрос = один вызов)
     • bot/server.js  — обычный сервер на своём компьютере (ещё и раздаёт файлы)

   Данные — через lib/store.js (Postgres на Vercel, JSON-файлы у себя),
   фото и видео — через lib/media.js (Vercel Blob или папка bot/data/media).

   Что делает:
     • отдаёт каталог, услуги и тексты приложения, принимает заявки
     • панель администратора: квартиры, машины, услуги, тексты, разделы, отчёт
     • проверяет подпись Telegram (initData) и пускает в админку только ADMIN_TELEGRAM_ID
     • бот: /start с кнопкой каталога, команды статусов, /report, /owner, импорт постов канала
   ========================================================================== */

'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const { ROOT, ENV, cfg } = require('./env.js');
const store = require('./store.js');
const media = require('./media.js');

/* ----------------------------------------------------------- настройки */
const DEV = process.argv.includes('--dev') || cfg('DEV') === '1';
/* HOSTED — приложение живёт на хостинге (Vercel): база, облако для файлов, бот на вебхуке */
const HOSTED = !!process.env.VERCEL || store.kind === 'pg' || media.kind === 'blob';

const TOKEN = cfg('BOT_TOKEN');
/* администратор — только по числовому Telegram ID: username можно сменить или передать, id — нет.
   ADMIN_TELEGRAM_ID — основной, ADMIN_IDS — прежнее имя, тоже читается. Несколько id — через запятую. */
const ADMIN_BAD = [];
const ADMIN_IDS = [...new Set([cfg('ADMIN_TELEGRAM_ID'), cfg('ADMIN_IDS')].join(',').split(',')
  .map(x => x.trim()).filter(Boolean)
  .filter(x => /^\d{5,15}$/.test(x) || (ADMIN_BAD.push(x), false)).map(Number))];
const APP_URL = cfg('APP_URL');
const PORT = Number(cfg('PORT', 8443));
const WEBHOOK_SECRET = cfg('WEBHOOK_SECRET');
/* Vercel не принимает тело запроса больше 4,5 МБ; на своём сервере предел прежний */
const MAX_UPLOAD = Number(cfg('MAX_UPLOAD_MB', media.kind === 'blob' ? 4 : 300)) * 1048576;
const TRANSLATE_EMAIL = cfg('TRANSLATE_EMAIL');

/* путь написан прямо, а не собран из кусков: так сборщик Vercel видит файл и кладёт его в функцию */
const parsePost = require('../assets/js/parse-post.js');

if (DEV && !TOKEN && !ADMIN_IDS.length) ADMIN_IDS.push(1);        // проверка без Telegram: риелтор — «чат 1» в логе

if (ADMIN_BAD.length) {
  console.error('ADMIN_TELEGRAM_ID: «' + ADMIN_BAD.join(', ') + '» — не числовой id. Нужен именно номер, не @username.');
  console.error('Узнать номер: напишите боту /id или @userinfobot.');
}
if (TOKEN && !ADMIN_IDS.length) console.warn('ADMIN_TELEGRAM_ID не задан — админ-панель закрыта для всех.');

if (!TOKEN && !DEV) console.error('Нет BOT_TOKEN: бот и проверка подписи Telegram выключены — впишите токен от @BotFather.');

/* ------------------------------------------------------------ хранилище */
/* ревизия данных: меняется при каждом сохранении — приложение сверяет её и подтягивает изменения */
let REV = 0;
function bumpRev() { REV = Math.max(Date.now(), REV + 1); store.save('rev', { n: REV }); }

function readDataJs() {
  const src = fs.readFileSync(path.join(ROOT, 'assets', 'js', 'data.js'), 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { timeout: 2000 });
  return sandbox.window.DATA;
}
/* строки интерфейса — чтобы проверять ключи, которые правит админ */
function readI18nJs() {
  const src = fs.readFileSync(path.join(ROOT, 'assets', 'js', 'i18n.js'), 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { timeout: 2000 });
  return sandbox.window.I18N;
}

const DATA = readDataJs();
const I18N_BASE = readI18nJs();

let LISTINGS = [], DISTRICTS = {}, BOOKINGS = [], SERVICES = {}, REQUESTS = [], DEALS = [];
let SETTINGS = { partnerToken: '', visaPartners: [] };
let CONTENT = {};
let BOT_USERNAME = '';

/* контент, который правит админ: бренд, контакты, условия, шаги, разделы, тексты интерфейса, изображения.
   Первый запуск — копия из data.js; дальше правится только в админке. */
const TAB_IDS = ['catalog', 'visa', 'tours', 'cars', 'transfer', 'offer'];
const BLOCK_IDS = ['housingMap', 'housingFav', 'offerAbout', 'offerSteps', 'offerCases', 'offerContacts', 'visaDocs', 'visaPriceNote', 'badge247'];
const defaultLayout = () => ({ tabs: TAB_IDS.map(id => ({ id, on: true })), blocks: Object.fromEntries(BLOCK_IDS.map(b => [b, true])) });
const defaultContent = () => JSON.parse(JSON.stringify({
  brand: DATA.brand, contacts: DATA.contacts, offer: DATA.offer, steps: DATA.steps,
  layout: defaultLayout(), i18n: { ru: {}, uz: {}, en: {} }, images: { logo: '', emblem: '' }
}));

/* Читаем всё хранилище разом. На Vercel каждый запрос может попасть в новый экземпляр,
   поэтому данные берём заново (короткая передышка — чтобы не дёргать базу на каждый чих). */
const CACHE_MS = store.kind === 'fs' ? 1e9 : 1000;
let loadedAt = 0, loading = null;
function load(force) {
  if (!force && loadedAt && Date.now() - loadedAt < CACHE_MS) return Promise.resolve();
  if (loading) return loading;
  loading = readAll().then(() => { loading = null; }, e => { loading = null; throw e; });
  return loading;
}
async function readAll() {
  if (process.env.VERCEL && store.kind !== 'pg') {
    console.error('DATABASE_URL не задан: на Vercel данные сохранять некуда. Подключите базу (Storage → Neon) и разверните проект заново.');
  }
  const d = await store.load();
  const seed = [];
  const take = (key, def) => {
    if (d[key] === undefined || d[key] === null) { seed.push([key, def]); return JSON.parse(JSON.stringify(def)); }
    return d[key];
  };
  LISTINGS = take('listings', DATA.apartments);
  DISTRICTS = take('districts', DATA.districts);
  BOOKINGS = take('bookings', []);
  SERVICES = take('services', DATA.services || {});
  REQUESTS = d.requests || [];
  DEALS = d.deals || [];
  SETTINGS = Object.assign({ partnerToken: '', visaPartners: [] }, d.settings || {});
  CONTENT = Object.assign(defaultContent(), d.content === undefined ? (seed.push(['content', defaultContent()]), {}) : d.content);
  REV = Number((d.rev || {}).n) || 0;
  if (!REV) { REV = Date.now(); store.save('rev', { n: REV }); }
  BOT_USERNAME = BOT_USERNAME || SETTINGS.botUsername || '';
  seed.forEach(([k, v]) => store.save(k, v));
  mergeServices();
  loadedAt = Date.now();
  ensureWebhook();
}

/* На хостинге постоянного процесса нет — Telegram должен присылать обновления сам.
   Проверяем адрес вебхука при первом запросе после развёртывания и чиним, если он другой. */
function ensureWebhook() {
  if (!HOSTED || !TOKEN || !/^https:\/\//.test(APP_URL)) return;

  // Основная кнопка Telegram для всех пользователей: открывает Mini App прямо из чата с ботом.
  // Это отдельная настройка от inline-кнопки /start и не требует ручного popup.
  const menuUrl = new URL(APP_URL);
  if (SETTINGS.menuButtonUrl !== menuUrl.toString() || SETTINGS.menuButtonText !== '🏠 Madinah Group') {
    track(tg('setChatMenuButton', {
      menu_button: {
        type: 'web_app',
        text: '🏠 Madinah Group',
        web_app: { url: menuUrl.toString() }
      }
    }).then(() => {
      // Записываем флаг только после успешного ответа Telegram, чтобы временный сетевой сбой
      // не оставил приложение с «галочкой» при фактически не настроенной кнопке.
      SETTINGS.menuButtonUrl = menuUrl.toString();
      SETTINGS.menuButtonText = '🏠 Madinah Group';
      saveSettings();
      console.log('Telegram Mini App menu button: ' + menuUrl.toString());
    }, e => console.error('setChatMenuButton:', e.message)));
  }

  const target = new URL('api/webhook', APP_URL).toString();
  if (SETTINGS.webhookUrl === target) return;
  if (SETTINGS.webhookTry && Date.now() - SETTINGS.webhookTry < 3600000) return;   // не дёргаем чаще раза в час
  SETTINGS.webhookTry = Date.now();
  saveSettings();
  track(tg('setWebhook', Object.assign({
    url: target, allowed_updates: ['message', 'callback_query'], max_connections: 1
  }, WEBHOOK_SECRET ? { secret_token: WEBHOOK_SECRET } : {})).then(() => {
    SETTINGS.webhookUrl = target;
    saveSettings();
    console.log('Webhook Telegram: ' + target);
  }, e => console.error('setWebhook:', e.message)));
}

/* data.js → services: новые виды виз, туры и машины добавляем, тексты обновляем.
   Правки риелтора (доля, «показывать», цены туров, маршрут, машины) не трогаем,
   удалённые им машины обратно не возвращаем. */
function mergeServices() {
  const base = DATA.services || {};
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const copy = (o) => JSON.parse(JSON.stringify(o));
  let changed = false, settingsChanged = false;
  Object.keys(base).forEach(k => { if (!SERVICES[k]) { SERVICES[k] = copy(base[k]); changed = true; } });
  const ed = SERVICES.edited || {};                 // разделы, тексты и порядок которых уже правил админ
  const bv = base.visa || {}, sv = SERVICES.visa || (SERVICES.visa = {});
  if (!ed.visa) ['intro', 'docs', 'docsNote', 'cats', 'terms', 'consent', 'currency'].forEach(k => {
    if (bv[k] !== undefined && !same(sv[k], bv[k])) { sv[k] = copy(bv[k]); changed = true; }
  });
  /* новые группы виз из data.js добавляем всегда — иначе новые виды окажутся без раздела */
  (bv.cats || []).forEach(bc => {
    if (!(sv.cats || []).some(c => c.id === bc.id)) { (sv.cats = sv.cats || []).push(copy(bc)); changed = true; }
  });
  const oldTypes = sv.types || [];
  let types;
  if (ed.visa) {
    types = oldTypes.slice();
    (bv.types || []).forEach(b => { if (!types.some(x => x.id === b.id)) { types.push(copy(b)); changed = true; } });
  } else {
    types = (bv.types || []).map(b => {
      const st = oldTypes.find(x => x.id === b.id);
      if (!st) { changed = true; return copy(b); }
      ['title', 'text', 'cat', 'icon'].forEach(k => { if (!same(st[k], b[k])) { st[k] = copy(b[k]); changed = true; } });
      return st;
    });
    oldTypes.forEach(st => { if (!types.includes(st)) types.push(st); });
    if (!same(types.map(x => x.id), oldTypes.map(x => x.id))) changed = true;
  }
  sv.types = types;
  const bt = base.tours || {}, stt = SERVICES.tours || (SERVICES.tours = { items: [] });
  if (!ed.tours) ['intro', 'terms', 'consent'].forEach(k => { if (bt[k] !== undefined && !same(stt[k], bt[k])) { stt[k] = copy(bt[k]); changed = true; } });
  (bt.items || []).forEach(bi => {
    const si = (stt.items || (stt.items = [])).find(x => x.id === bi.id);
    if (!si) { stt.items.push(copy(bi)); changed = true; return; }
    if (!ed.tours) ['title', 'text', 'icon', 'guide', 'includes', 'note'].forEach(k => { if (bi[k] !== undefined && !same(si[k], bi[k])) { si[k] = copy(bi[k]); changed = true; } });
  });
  const bc = base.cars || {}, sc = SERVICES.cars || (SERVICES.cars = { items: [] });
  if (!ed.cars) ['intro', 'emptyNote', 'terms', 'consent'].forEach(k => { if (bc[k] !== undefined && !same(sc[k], bc[k])) { sc[k] = copy(bc[k]); changed = true; } });
  sc.items = sc.items || [];
  if (!SETTINGS.seenCars) { SETTINGS.seenCars = sc.items.map(c => c.id); settingsChanged = true; }
  (bc.items || []).forEach(c => {
    const ex = sc.items.find(x => x.id === c.id);
    if (ex && !(ex.photos || []).length && (c.photos || []).length) {        // машина без фото — берём фото модели из data.js
      ex.photos = c.photos.slice(); ex.credit = c.credit || ''; ex.creditUrl = c.creditUrl || '';
      changed = true;
    }
    if (SETTINGS.seenCars.includes(c.id)) return;
    SETTINGS.seenCars.push(c.id);
    settingsChanged = true;
    if (!sc.items.some(x => x.id === c.id)) { sc.items.push(copy(c)); changed = true; }
  });
  if (changed) store.save('services', SERVICES);
  if (settingsChanged) store.save('settings', SETTINGS);
}

function saveListings() { store.save('listings', LISTINGS); bumpRev(); }
function saveDistricts() { store.save('districts', DISTRICTS); bumpRev(); }
function saveContent() { store.save('content', CONTENT); bumpRev(); }
function saveBookings() { store.save('bookings', BOOKINGS.slice(-2000)); }
function saveServices() { store.save('services', SERVICES); bumpRev(); }
function saveRequests() { store.save('requests', REQUESTS.slice(-3000)); }
function saveDeals() { store.save('deals', DEALS); }
function saveSettings() { store.save('settings', SETTINGS); }

/* Сообщения бота и прочие дела, начатые по ходу запроса: на Vercel функция засыпает
   сразу после ответа, поэтому ответ отдаём только когда всё это закончилось. */
const TASKS = [];
function track(p) {
  const q = Promise.resolve(p).catch(e => console.error('фоном:', (e && e.message) || e));
  TASKS.push(q);
  return q;
}
async function settle() {
  let guard = 0;
  while (TASKS.length && guard++ < 20) await Promise.all(TASKS.splice(0));
}

/* время Медины (UTC+3, без перехода на летнее) — чтобы день и месяц в отчёте были местными */
const MADINAH_MS = 3 * 3600000;
const today = () => new Date(Date.now() + MADINAH_MS).toISOString().slice(0, 10);
const monthOf = (iso) => new Date(Date.parse(iso) + MADINAH_MS).toISOString().slice(0, 7);
const rid = (n) => crypto.randomBytes(n || 4).toString('hex');
const STATUS = ['free', 'booked', 'busy', 'rented', 'draft'];
const STATUS_RU = { free: 'свободна', booked: 'забронирована', busy: 'занята', rented: 'сдана', draft: 'черновик' };

function findListings(key) {
  const k = String(key || '').trim().toLowerCase();
  return LISTINGS.filter(a => a.id.toLowerCase() === k || String(a.code || '').toLowerCase() === k);
}

/* ------------------------------------------------------ проверка данных */
function text(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max || 400);
}
function langs(obj, max) {
  if (!obj) return null;
  if (typeof obj === 'string') return obj.trim() ? { ru: text(obj, max) } : null;
  const o = {};
  ['ru', 'uz', 'en'].forEach(k => { if (obj[k] && String(obj[k]).trim()) o[k] = text(obj[k], max); });
  return Object.keys(o).length ? o : null;
}
function pos(v) { const n = Number(v); return isFinite(n) && n > 0 ? Math.round(n) : null; }
function amount(v) {
  if (v === '' || v == null) return null;
  const n = Number(String(v).replace(',', '.').replace(/\s/g, ''));
  return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}
function date(v) { return /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : ''; }
/* допустимые адреса фото и видео: облако Vercel Blob, своя папка /media, файлы проекта */
const MEDIA_RE = /^(https:\/\/[a-z0-9-]{1,63}\.public\.blob\.vercel-storage\.com\/media\/[a-z0-9-]{4,80}\.(webp|jpe?g|png|mp4|mov|webm|m4v)|\/media\/[a-z0-9-]{4,80}\.(webp|jpe?g|png|mp4|mov|webm|m4v)|assets\/(img|video)\/[a-z0-9-]{2,80}\.(webp|jpe?g|png|mp4)|[a-z0-9-]{2,80}\.(webp|jpe?g|png))$/;
const AMEN = ['electricity', 'water', 'gas', 'wifi', 'furniture', 'ac', 'kitchen', 'fridge', 'washer', 'tv'];

function sanitize(a, prev) {
  const out = {
    id: prev ? prev.id : ('apt-' + rid(3)),
    code: text(a.code, 16).toUpperCase(),
    status: STATUS.includes(a.status) ? a.status : 'draft',
    bookedUntil: date(a.bookedUntil),
    busyUntil: date(a.busyUntil),
    updated: today(),
    district: DISTRICTS[a.district] ? a.district : (prev ? prev.district : ''),
    title: langs(a.title, 120) || { ru: '' },
    rooms: pos(a.rooms) || 1,
    beds: pos(a.beds),
    baths: pos(a.baths) || 1,
    floor: pos(a.floor),
    lift: !!a.lift,
    pin: !!a.pin,
    price: {
      month: pos(a.price && a.price.month), day: pos(a.price && a.price.day), year: pos(a.price && a.price.year),
      deposit: pos(a.price && a.price.deposit) || 0, agentFee: pos(a.price && a.price.agentFee) || 0
    },
    priceNotes: (Array.isArray(a.priceNotes) ? a.priceNotes : []).map(n => langs(n, 200)).filter(Boolean).slice(0, 8),
    includes: (a.includes || []).filter(k => AMEN.includes(k)),
    extra: (a.extra || []).filter(k => AMEN.includes(k)),
    terms: {
      iqama: !!(a.terms && a.terms.iqama),
      minStay: ['day', 'month', '3months', '6months', 'year'].includes(a.terms && a.terms.minStay) ? a.terms.minStay : 'month',
      forWhom: ['family', 'students', 'any'].includes(a.terms && a.terms.forWhom) ? a.terms.forWhom : 'any',
      maxPeople: pos(a.terms && a.terms.maxPeople)
    },
    walk: { haram: langs(a.walk && a.walk.haram, 80), other: langs(a.walk && a.walk.other, 160) },
    features: (Array.isArray(a.features) ? a.features : []).map(f => langs(f, 240)).filter(Boolean).slice(0, 14),
    photos: (Array.isArray(a.photos) ? a.photos : []).filter(p => MEDIA_RE.test(p)).slice(0, 30),
    videos: (Array.isArray(a.videos) ? a.videos : [])
      .filter(v => v && MEDIA_RE.test(v.src) && (!v.poster || MEDIA_RE.test(v.poster)))
      .map(v => ({ src: v.src, poster: v.poster || '' })).slice(0, 6),
    geo: null,
    post: /^https:\/\/t\.me\/[\w/]+$/.test(String(a.post || '')) ? a.post : ''
  };
  out.extra = out.extra.filter(k => !out.includes.includes(k));
  if (a.geo && isFinite(a.geo.lat) && isFinite(a.geo.lng)) {
    const lat = +a.geo.lat, lng = +a.geo.lng;
    if (lat > 24.2 && lat < 24.8 && lng > 39.3 && lng < 39.95) out.geo = { lat: +lat.toFixed(6), lng: +lng.toFixed(6) };
  }
  return out;
}

/* услуги из панели: цены виз, туры с маршрутом, машины. Тексты виз берём из data.js/прошлой версии */
function sanitizeServices(inp) {
  const prev = SERVICES || {};
  const out = JSON.parse(JSON.stringify(prev));
  const v = inp.visa || {}, pv = out.visa || (out.visa = {});
  const pct = Number(v.commissionPct);
  pv.commissionPct = isFinite(pct) && pct >= 0 && pct <= 50 ? Math.round(pct * 10) / 10 : (pv.commissionPct || 0);
  (pv.types || []).forEach(ty => {
    const src = (v.types || []).find(x => x && x.id === ty.id) || {};
    ty.active = src.active !== false;                 // цены на визы плавающие — клиент видит «уточняйте»
    if (src.title) ty.title = mlc(src.title, 80) || ty.title;
    if (src.text) ty.text = mlc(src.text, 500) || ty.text;
  });
  sortBy(pv.types, v.types);
  if (v.intro) pv.intro = mlc(v.intro, 1200) || pv.intro;
  if (Array.isArray(v.docs)) pv.docs = v.docs.slice(0, 12).map(x => mlc(x, 300)).filter(Boolean);
  if (v.docsNote) pv.docsNote = mlc(v.docsNote, 400) || pv.docsNote;
  if (Array.isArray(v.terms)) pv.terms = v.terms.slice(0, 15).map(x => mlc(x, 700)).filter(Boolean);
  if (v.consent) pv.consent = mlc(v.consent, 700) || pv.consent;
  (pv.cats || []).forEach(c => {
    const src = (v.cats || []).find(x => x && x.id === c.id);
    if (!src) return;
    if (src.title) c.title = mlc(src.title, 60) || c.title;
    if (src.note !== undefined) c.note = mlc(src.note, 200);
  });
  const tr = inp.tours || {}, pt = out.tours || (out.tours = { items: [] });
  (pt.items || []).forEach(it => {
    const src = (tr.items || []).find(x => x && x.id === it.id);
    if (!src) return;
    it.price = amount(src.price);
    it.per = src.per === 'person' ? 'person' : 'group';
    it.duration = langs(src.duration, 60);
    if (Array.isArray(src.stops)) {
      it.stops = src.stops.map(st => ({ title: langs(st && st.title, 80), text: langs(st && st.text, 300) }))
        .filter(st => st.title).slice(0, 20);
    }
    if (src.title) it.title = mlc(src.title, 100) || it.title;
    if (src.text) it.text = mlc(src.text, 1200) || it.text;
    if (src.note !== undefined) it.note = mlc(src.note, 400);
    if (Array.isArray(src.includes)) it.includes = src.includes.slice(0, 10).map(x => mlc(x, 80)).filter(Boolean);
    it.image = MEDIA_RE.test(String(src.image || '')) ? src.image : '';
    it.hidden = !!src.hidden;
  });
  sortBy(pt.items, tr.items);
  if (tr.intro) pt.intro = mlc(tr.intro, 1200) || pt.intro;
  if (Array.isArray(tr.terms)) pt.terms = tr.terms.slice(0, 15).map(x => mlc(x, 700)).filter(Boolean);
  if (tr.consent) pt.consent = mlc(tr.consent, 700) || pt.consent;
  const cr = inp.cars || {}, pc = out.cars || (out.cars = { items: [] });
  pc.items = (Array.isArray(cr.items) ? cr.items : []).slice(0, 40).map(c => {
    const old = (prev.cars && prev.cars.items || []).find(x => x.id === c.id);
    const year = pos(c.year);
    const booked = c.status === 'booked';
    return {
      id: old ? old.id : 'car-' + rid(3),
      name: text(c.name, 60),
      year: year && year >= 1980 && year <= 2100 ? year : null,
      color: CAR_COLORS.includes(c.color) ? c.color : 'black',
      trim: text(c.trim, 40),
      photos: (Array.isArray(c.photos) ? c.photos : []).filter(ph => MEDIA_RE.test(ph)).slice(0, 12),
      seats: pos(c.seats), gear: c.gear === 'manual' ? 'manual' : 'auto',
      pricePerDay: amount(c.pricePerDay), deposit: amount(c.deposit),
      note: langs(c.note, 300), active: c.active !== false,
      credit: text(c.credit, 120),
      creditUrl: /^https:\/\/commons\.wikimedia\.org\/wiki\/File:[^\s"'<>]{1,200}$/.test(String(c.creditUrl || '')) ? c.creditUrl : '',
      status: booked ? 'booked' : 'free', bookedUntil: booked ? date(c.bookedUntil) : '',
      busy: (Array.isArray(c.busy) ? c.busy : []).map(r => ({ from: date(r && r.from), to: date(r && r.to), rid: text(r && r.rid, 24) }))
        .filter(r => r.from && r.to && r.to >= r.from).slice(-60)
    };
  }).filter(c => c.name);
  if (cr.intro) pc.intro = mlc(cr.intro, 400) || pc.intro;
  if (cr.emptyNote) pc.emptyNote = mlc(cr.emptyNote, 400) || pc.emptyNote;
  if (Array.isArray(cr.terms)) pc.terms = cr.terms.slice(0, 15).map(x => mlc(x, 700)).filter(Boolean);
  if (cr.consent) pc.consent = mlc(cr.consent, 700) || pc.consent;
  out.edited = { visa: true, tours: true, cars: true };   // дальше data.js не перезаписывает тексты и порядок
  return out;
}
/* порядок как прислал админ (по id), неизвестные — в конце */
function sortBy(list, order) {
  if (!Array.isArray(list) || !Array.isArray(order)) return;
  const ids = order.map(x => x && x.id);
  const at = id => { const i = ids.indexOf(id); return i < 0 ? 1e6 : i; };
  list.sort((a, b) => at(a.id) - at(b.id));
}
function publicServices() {
  const out = JSON.parse(JSON.stringify(SERVICES || {}));
  if (out.visa) {
    delete out.visa.commissionPct;
    delete out.visa.partner;
    out.visa.types = (out.visa.types || []).filter(ty => ty.active !== false);
    out.visa.types.forEach(ty => { delete ty.basePrice; delete ty.price; });
  }
  if (out.cars) {
    const d = today();
    out.cars.items = (out.cars.items || []).filter(c => c.active !== false)
      .map(c => Object.assign(c, { busy: (c.busy || []).filter(r => r.to >= d).map(r => ({ from: r.from, to: r.to })) }));
  }
  return out;
}
const CAR_COLORS = ['black', 'white', 'silver', 'grey', 'blue', 'red', 'beige', 'brown', 'green'];
const dmy = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) ? d.slice(8, 10) + '.' + d.slice(5, 7) + '.' + d.slice(0, 4) : (d || '');
const carName = c => c ? c.name + (c.year ? ' ' + c.year : '') : '';
/* пересекаются ли даты заявки с бронями машины (по заявкам или «забронирована до …») */
function carClash(car, from, to) {
  const end = to && to > from ? to : from;
  const ranges = (car.busy || []).slice();
  if (car.status === 'booked') ranges.push({ from: today(), to: car.bookedUntil || '9999-12-31' });
  return ranges.find(r => from <= r.to && end >= r.from) || null;
}

/* ------------------------------------------------------ сделки для отчёта */
const KINDS = ['housing', 'visa', 'tour', 'car', 'transfer', 'other'];
function sanitizeDeal(d, prev) {
  return {
    id: prev ? prev.id : 'd' + Date.now().toString(36) + rid(2),
    date: date(d.date) || (prev && prev.date) || today(),
    kind: KINDS.includes(d.kind) ? d.kind : 'other',
    title: text(d.title, 140),
    amount: amount(d.amount),
    currency: d.currency === 'USD' ? 'USD' : 'SAR',
    refund: amount(d.refund) || 0,
    note: text(d.note, 300),
    apartment: text(d.apartment, 40),
    source: prev ? prev.source : 'manual'
  };
}
function addDeal(d) {
  if (d.source && d.source !== 'manual' && DEALS.some(x => x.source === d.source)) return null;   // одна сделка на заявку
  const deal = Object.assign(sanitizeDeal(d, null), { source: d.source || 'manual' });
  DEALS.push(deal);
  saveDeals();
  return deal;
}
const USD_SAR = 3.75;                      // риал привязан к доллару
function reportData(month) {
  const deals = DEALS.filter(d => (d.date || '').slice(0, 7) === month);
  const req = REQUESTS.filter(r => monthOf(r.at) === month);
  const bks = BOOKINGS.filter(b => monthOf(b.at) === month);
  const months = new Set([today().slice(0, 7)]);
  DEALS.forEach(d => d.date && months.add(d.date.slice(0, 7)));
  REQUESTS.forEach(r => months.add(monthOf(r.at)));
  BOOKINGS.forEach(b => months.add(monthOf(b.at)));
  return {
    month, deals,
    counts: {
      bookings: bks.length, confirmed: bks.filter(b => b.status === 'confirmed').length,
      visa: req.filter(r => r.kind === 'visa').length, tour: req.filter(r => r.kind === 'tour').length,
      car: req.filter(r => r.kind === 'car').length, transfer: req.filter(r => r.kind === 'transfer').length
    },
    months: [...months].sort()
  };
}
function sums(deals) {
  const s = { SAR: 0, USD: 0, refundSAR: 0, refundUSD: 0, rented: 0, empty: 0 };
  deals.forEach(d => {
    if (d.amount == null) s.empty++;
    s[d.currency] += d.amount || 0;
    s['refund' + d.currency] += d.refund || 0;
    if (d.kind === 'housing' && !(d.refund && d.amount != null && d.refund >= d.amount)) s.rented++;
  });
  s.net = (s.SAR - s.refundSAR) + (s.USD - s.refundUSD) * USD_SAR;
  return s;
}
const MONTHS_RU = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
function num(n) { return Math.round(n * 100) / 100 === Math.round(n) ? String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : String(Math.round(n * 100) / 100).replace('.', ','); }
function reportText(month) {
  const r = reportData(month);
  const s = sums(r.deals);
  const [y, m] = month.split('-');
  const money = (sar, usd) => [sar ? num(sar) + ' риал' : '', usd ? num(usd) + ' $' : ''].filter(Boolean).join(' + ') || '0';
  return [
    `📊 <b>Отчёт за ${MONTHS_RU[+m - 1]} ${y}</b>`,
    '',
    `Заработано: <b>${money(s.SAR, s.USD)}</b>`,
    s.refundSAR || s.refundUSD ? `Возвраты: −${money(s.refundSAR, s.refundUSD)}` : '',
    `Итого: <b>≈ ${num(s.net)} риал</b>` + (s.USD ? ` <i>(1 $ = ${String(USD_SAR).replace('.', ',')} риала)</i>` : ''),
    `Сдано квартир: <b>${s.rented}</b>`,
    `Заявки: жильё ${r.counts.bookings} (подтверждено ${r.counts.confirmed}) · визы ${r.counts.visa} · туры ${r.counts.tour} · авто ${r.counts.car} · трансфер ${r.counts.transfer}`,
    s.empty ? `\n✍️ Без суммы: ${s.empty} — впишите в приложении: Панель риелтора → «Отчёт».` : '',
    '\nДругой месяц: <code>/report 2026-08</code>'
  ].filter(x => x !== '').join('\n');
}

/* ---------------------------------------------- контент из админки: проверка */
const noTags = s => String(s).replace(/[<>]/g, '');            // тексты вставляются в страницу — HTML не пропускаем
function mlc(obj, max) {
  const o = langs(obj, max);
  if (!o) return null;
  Object.keys(o).forEach(k => { o[k] = noTags(o[k]); });
  return o;
}
const arr = (x, n) => (Array.isArray(x) ? x.slice(0, n) : []);
const httpsUrl = v => { const u = String(v || '').trim(); return /^https:\/\/[^\s"'<>]{3,300}$/.test(u) ? u : ''; };
const tgName = v => { const u = String(v || '').trim().replace(/^@/, '').replace(/^https?:\/\/t\.me\//, ''); return /^[A-Za-z0-9_]{4,32}$/.test(u) ? u : ''; };
const phoneNum = v => { const u = String(v || '').trim(); return /^\+?[0-9][0-9 ()-]{5,19}$/.test(u) ? u : ''; };
const waNum = v => { const u = String(v || '').replace(/\D/g, ''); return u.length >= 8 && u.length <= 15 ? u : ''; };
const OFFER_ICONS = ['handshake', 'people', 'wallet', 'home', 'force', 'key', 'doc'];
const contact = c => ({ tg: tgName(c && c.tg), phone: phoneNum(c && c.phone), wa: waNum(c && c.wa) });

function sanitizeContent(section, d) {
  const prev = CONTENT[section];
  d = d || {};
  if (section === 'brand') return {
    name: mlc(d.name, 40) || prev.name, tagline: mlc(d.tagline, 80) || {}, realtor: mlc(d.realtor, 60) || {},
    about: mlc(d.about, 1200) || {}, channel: httpsUrl(d.channel) || prev.channel, channelName: noTags(text(d.channelName, 40))
  };
  if (section === 'contacts') return {
    brothers: contact(d.brothers), sisters: contact(d.sisters), instagram: httpsUrl(d.instagram), hours: mlc(d.hours, 160) || {}
  };
  if (section === 'offer') {
    const cs = d.cases || {};
    return {
      version: noTags(text(d.version, 10)) || prev.version, updated: date(d.updated) || today(),
      intro: mlc(d.intro, 1500) || {},
      sections: arr(d.sections, 20).map(x => ({
        icon: OFFER_ICONS.includes(x && x.icon) ? x.icon : 'doc', title: mlc(x && x.title, 100) || { ru: '' },
        items: arr(x && x.items, 20).map(i => mlc(i, 700)).filter(Boolean), hidden: !!(x && x.hidden)
      })).filter(x => x.title.ru || x.items.length),
      cases: {
        title: mlc(cs.title, 80) || (prev.cases && prev.cases.title) || {}, note: mlc(cs.note, 300) || {},
        list: arr(cs.list, 40).map(c => ({ q: mlc(c && c.q, 240), a: mlc(c && c.a, 1000), hidden: !!(c && c.hidden) })).filter(c => c.q && c.a)
      },
      keyPoints: arr(d.keyPoints, 8).map(x => mlc(x, 400)).filter(Boolean),
      consent: mlc(d.consent, 700) || prev.consent
    };
  }
  if (section === 'steps') return arr(d, 12).map(x => mlc(x, 400)).filter(Boolean);
  if (section === 'layout') {
    const seen = new Set();
    const tabs = arr(d.tabs, 10).filter(x => x && TAB_IDS.includes(x.id) && !seen.has(x.id) && seen.add(x.id))
      .map(x => ({ id: x.id, on: x.on !== false }));
    TAB_IDS.forEach(id => { if (!seen.has(id)) tabs.push({ id, on: true }); });
    if (!tabs.some(x => x.on)) tabs[0].on = true;                // хоть один раздел должен остаться
    const b = d.blocks || {};
    return { tabs, blocks: Object.fromEntries(BLOCK_IDS.map(k => [k, b[k] !== false])) };
  }
  if (section === 'i18n') {
    const out = { ru: {}, uz: {}, en: {} };
    ['ru', 'uz', 'en'].forEach(l => {
      Object.keys((d && d[l]) || {}).slice(0, 900).forEach(k => {
        if (!Object.prototype.hasOwnProperty.call(I18N_BASE.ru, k)) return;
        const base = (I18N_BASE[l] && I18N_BASE[l][k] !== undefined) ? I18N_BASE[l][k] : I18N_BASE.ru[k];
        const v = d[l][k];
        if (Array.isArray(base)) {
          if (!Array.isArray(v) || v.length !== base.length) return;
          const vv = v.map(x => noTags(text(x, 60)));
          if (vv.every(Boolean) && JSON.stringify(vv) !== JSON.stringify(base)) out[l][k] = vv;
        } else if (typeof v === 'string') {
          const vv = noTags(text(v, 400));
          if (vv && vv !== base) out[l][k] = vv;
        }
      });
    });
    return out;
  }
  if (section === 'images') {
    const img = v => (MEDIA_RE.test(String(v || '')) ? v : '');
    return { logo: img(d.logo), emblem: img(d.emblem) };
  }
  return undefined;
}
function sanitizeDistricts(inp) {
  const out = JSON.parse(JSON.stringify(DISTRICTS));
  Object.keys(out).forEach(k => {
    const src = inp && inp[k];
    if (!src) return;
    const nm = mlc(src, 60);
    if (nm && nm.ru) { out[k].ru = nm.ru; out[k].uz = nm.uz || nm.ru; out[k].en = nm.en || nm.uz || nm.ru; }
    out[k].haram = mlc(src.haram, 60) || { ru: '', uz: '', en: '' };
    out[k].note = mlc(src.note, 200) || { ru: '', uz: '', en: '' };
    const lat = Number(src.lat), lng = Number(src.lng);
    if (lat > 24.2 && lat < 24.8 && lng > 39.3 && lng < 39.95) { out[k].lat = +lat.toFixed(5); out[k].lng = +lng.toFixed(5); }
    out[k].approx = !!src.approx;
  });
  return out;
}

/* новый район: ключ латиницей из узбекского или русского названия */
const TRANS = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
function addDistrict(nd) {
  const ru = text(nd.ru, 60), uz = text(nd.uz, 60), en = text(nd.en, 60);
  if (!ru && !uz) return '';
  const base = (uz || ru).toLowerCase().split('').map(ch => TRANS[ch] != null ? TRANS[ch] : ch).join('')
    .replace(/['‘’`]/g, '').replace(/^(al|as|az|at|ad|an|hay)[\s-]+/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'rayon';
  let key = base, n = 2;
  while (DISTRICTS[key]) key = base + '-' + (n++);
  const lat = Number(nd.lat), lng = Number(nd.lng);
  DISTRICTS[key] = {
    ru: ru || uz, uz: uz || ru, en: en || uz || ru,
    haram: { ru: '', uz: '', en: '' }, note: { ru: '', uz: '', en: '' },
    lat: isFinite(lat) && lat ? +lat.toFixed(5) : null, lng: isFinite(lng) && lng ? +lng.toFixed(5) : null, approx: true
  };
  saveDistricts();
  return key;
}

/* ------------------------------------------------------------ Telegram API */
function tg(method, payload) {
  if (!TOKEN) return Promise.reject(new Error('нет токена'));
  const body = JSON.stringify(payload || {});
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.telegram.org',
      servername: 'api.telegram.org',
      family: 4,
      path: `/bot${TOKEN}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Connection': 'close'
      }
    }, res => {
      let out = '';
      res.setEncoding('utf8');
      res.on('data', d => out += d);
      res.on('end', () => {
        try {
          const j = JSON.parse(out);
          if (j.ok) resolve(j.result);
          else reject(new Error(j.description || ('HTTP ' + res.statusCode)));
        } catch (e) {
          reject(new Error('Telegram: неверный ответ'));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(12000, () => req.destroy(new Error('timeout')));
    req.end(body);
  });
}
/* файл с диска — multipart, без npm: так PDF уходит, даже если сайт ещё не открыт снаружи */
function tgUpload(method, fields, field, file, fileName, type) {
  if (!TOKEN) return Promise.reject(new Error('нет токена'));
  return new Promise((resolve, reject) => {
    const boundary = '----mr' + rid(8);
    const parts = Object.keys(fields).map(k =>
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${fields[k]}\r\n`));
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${field}"; filename="${fileName}"\r\nContent-Type: ${type}\r\n\r\n`));
    parts.push(fs.readFileSync(file));
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const body = Buffer.concat(parts);
    const req = https.request({
      hostname: 'api.telegram.org', path: `/bot${TOKEN}/${method}`, method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary, 'Content-Length': body.length }
    }, res => {
      let out = '';
      res.on('data', d => out += d);
      res.on('end', () => { try { const j = JSON.parse(out); j.ok ? resolve(j.result) : reject(new Error(j.description)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => req.destroy(new Error('timeout')));
    req.end(body);
  });
}
const OWNER_PDF = {
  ar: { file: 'owner-policy-ar.pdf', name: 'Madinah-Group-owner-policy-AR.pdf', caption: '📄 Политика для владельцев — на арабском. Перешлите владельцу: пусть прочитает и подпишет.\nРусский перевод для вас: /owner ru · английская версия: /owner en' },
  ru: { file: 'owner-policy-ru.pdf', name: 'Madinah-Group-owner-policy-RU.pdf', caption: '📄 Русский перевод политики для владельцев — для вас. Владельцу отправляйте арабскую версию: /owner' },
  en: { file: 'owner-policy-en.pdf', name: 'Madinah-Group-owner-policy-EN.pdf', caption: '📄 Owner policy — English version (для владельцев, которые читают по-английски).' }
};
function sendOwnerPdf(chatId, lang) {
  const d = OWNER_PDF[lang] || OWNER_PDF.ar;
  const file = path.join(ROOT, 'assets', 'docs', d.file);
  /* на хостинге PDF лежит рядом с приложением — Telegram заберёт его по ссылке сам,
     на своём компьютере (сайт снаружи не виден) отправляем файлом */
  if (HOSTED && /^https:\/\//.test(APP_URL)) {
    return tg('sendDocument', { chat_id: chatId, document: new URL('assets/docs/' + d.file, APP_URL).toString(), caption: d.caption });
  }
  if (!fs.existsSync(file)) return send(chatId, 'PDF не найден: assets/docs/' + d.file + ' — пересоберите: node tools/owner-pdf.mjs');
  return tgUpload('sendDocument', { chat_id: chatId, caption: d.caption }, 'document', file, d.name, 'application/pdf');
}

async function send(chatId, msg, extra) {
  if (!TOKEN && DEV) {                   // режим проверки: сообщения бота печатаем в окне сервера
    const kb = extra && extra.reply_markup && extra.reply_markup.inline_keyboard;
    console.log(`[бот → ${chatId}] ` + String(msg).replace(/<[^>]+>/g, '').replace(/\n/g, ' | ') + (kb ? '  [' + kb.map(r => r.map(b => b.text).join(' / ')).join(' | ') + ']' : ''));
    return { dev: true };
  }
  try {
    const result = await tg('sendMessage', Object.assign({ chat_id: chatId, text: msg, parse_mode: 'HTML', disable_web_page_preview: true }, extra || {}));
    console.log('Telegram sendMessage: ok chat=' + chatId);
    return result;
  } catch (e) {
    console.error('Telegram sendMessage failed chat=' + chatId + ':', e && e.message ? e.message : e);
    throw e;
  }
}
/* файл из Telegram — сразу в память: дальше он уходит в облако или на диск */
async function tgFileBuf(fileId) {
  const f = await tg('getFile', { file_id: fileId });
  const r = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${f.file_path}`);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return Buffer.from(await r.arrayBuffer());
}

/* ------------------------------------------------ подпись initData и доступ */
function verifyInitData(initData) {
  if (!initData || !TOKEN) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');
  const check = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  const sign = crypto.createHmac('sha256', secret).update(check).digest('hex');
  if (sign.length !== hash.length || !crypto.timingSafeEqual(Buffer.from(sign), Buffer.from(hash))) return null;
  const age = Date.now() / 1000 - Number(params.get('auth_date') || 0);
  if (!(age > -300 && age < 86400)) return null;      // подпись старше суток (или «из будущего») не принимаем
  try {
    const user = JSON.parse(params.get('user') || 'null');
    return user && Number.isSafeInteger(user.id) ? user : null;
  } catch (e) { return null; }
}
function isLocal(req) {
  const a = (req.socket && req.socket.remoteAddress) || '';
  return /^(127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)$/.test(a) && !req.headers['x-forwarded-for'];
}
/* админ — только если Telegram подписал initData и id совпал с ADMIN_TELEGRAM_ID.
   Режим проверки без бота (--dev и нет BOT_TOKEN) пускает в панель только с этого компьютера. */
function adminOf(req) {
  if (DEV && !TOKEN && req.headers['x-dev-admin'] === '1' && isLocal(req)) return { id: 0, first_name: 'Dev' };
  const u = verifyInitData(req.headers['x-init-data'] || '');
  return u && ADMIN_IDS.includes(Number(u.id)) ? u : null;
}

/* --------------------------------------------------------- фото и видео */
/* вся работа с файлами — в lib/media.js: Vercel Blob или своя папка с ffmpeg */
const storePhoto = (buf, name) => media.photo(name, buf);
const storeVideo = (buf, name) => media.video(name, buf);
const pendingVideos = media.pending;   // исходная ссылка → сжатая (если панель сохранит позже)

/* ------------------------------------------------------------- перевод */
function translateOne(q, from, to) {
  const url = 'https://api.mymemory.translated.net/get?langpair=' + from + '|' + to +
    (TRANSLATE_EMAIL ? '&de=' + encodeURIComponent(TRANSLATE_EMAIL) : '') + '&q=' + encodeURIComponent(q.slice(0, 480));
  return new Promise(resolve => {
    const req = https.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          const t = j && j.responseData && j.responseData.translatedText;
          resolve(t && !/MYMEMORY WARNING|INVALID/i.test(t) ? t : '');
        } catch (e) { resolve(''); }
      });
    }).on('error', () => resolve(''));
    req.setTimeout(7000, () => { req.destroy(); resolve(''); });
  });
}

/* ---------------------------------------------------------- тексты бота */
const GREET = {
  ru: ['Ассаляму алейкум! 👋', '', 'Это <b>Madinah Group</b> Абдуллаха: жильё в Медине, визы, туры и зиярат, аренда машин.',
       'В приложении видно, какие квартиры свободны прямо сейчас: район, цена, что входит в аренду, фото и видео. Там же — заявка на визу, тур или машину.',
       '🕐 Работаем круглосуточно, без выходных.', '',
       'Нажмите кнопку ниже — откроется каталог.'],
  uz: ['Assalomu alaykum! 👋', '', 'Bu Abdullahning <b>Madinah Group</b>i: Madinada uy-joy, viza, tur va ziyorat, avtomobil ijarasi.',
       'Ilovada hozir qaysi kvartiralar bo‘shligi ko‘rinadi: hudud, narx, ijaraga nima kiradi, surat va video. U yerda viza, tur yoki mashina uchun ariza ham bor.',
       '🕐 Kun-u tun, dam olish kunlarisiz ishlaymiz.', '',
       'Pastdagi tugmani bosing — katalog ochiladi.'],
  en: ['Assalamu alaikum! 👋', '', 'This is Abdullah’s <b>Madinah Group</b>: homes in Madinah, visas, tours and ziyarat, car rental.',
       'The app shows which apartments are available right now: area, price, what the rent includes, photos and videos — plus requests for a visa, a tour or a car.',
       '🕐 Open 24/7, every day.', '',
       'Tap the button below to open the catalogue.']
};
const BTN = {
  ru: ['🏠 Каталог квартир', '📣 Канал с новыми квартирами'],
  uz: ['🏠 Kvartiralar katalogi', '📣 Yangi kvartiralar kanali'],
  en: ['🏠 Apartment catalogue', '📣 Channel with new listings']
};
const CLIENT = {
  sent: { ru: 'Заявка принята ✅\nАбдуллах свяжется с вами здесь, в Telegram. Работаем круглосуточно — обычно отвечаем в течение часа.',
          uz: 'Ariza qabul qilindi ✅\nAbdullah siz bilan shu yerda, Telegramda bog‘lanadi. Kun-u tun ishlaymiz — odatda bir soat ichida javob beramiz.',
          en: 'Request received ✅\nAbdullah will contact you here in Telegram. We’re open 24/7 and usually reply within an hour.' },
  visaSent: { ru: 'Заявка принята ✅\nЕё уже получила партнёрская визовая компания Madinah Group — с вами свяжутся здесь, в Telegram, или по телефону.',
              uz: 'Ariza qabul qilindi ✅\nUni Madinah Group hamkori bo‘lgan viza kompaniyasi oldi — siz bilan shu yerda, Telegramda yoki telefon orqali bog‘lanishadi.',
              en: 'Request received ✅\nMadinah Group’s partner visa company already has it and will contact you here in Telegram or by phone.' },
  svcOk: { ru: '✅ Подтверждено: «{t}». Абдуллах напишет вам, чтобы обо всём договориться.',
           uz: '✅ Tasdiqlandi: «{t}». Abdullah hamma narsani kelishish uchun sizga yozadi.',
           en: '✅ Confirmed: “{t}”. Abdullah will message you to arrange everything.' },
  svcNo: { ru: 'К сожалению, «{t}» не получится. Абдуллах напишет вам с другими вариантами.',
           uz: 'Afsuski, «{t}» amalga oshmaydi. Abdullah sizga boshqa variantlar bilan yozadi.',
           en: 'Unfortunately “{t}” is not possible. Abdullah will message you with other options.' },
  ok:   { ru: '✅ Бронь подтверждена: «{t}». Абдуллах напишет вам, чтобы договориться о встрече и заселении.',
          uz: '✅ Bron tasdiqlandi: «{t}». Abdullah uchrashuv va joylashishni kelishish uchun sizga yozadi.',
          en: '✅ Booking confirmed: “{t}”. Abdullah will message you to arrange the viewing and move-in.' },
  no:   { ru: 'К сожалению, «{t}» уже не свободна. Абдуллах напишет вам с похожими вариантами.',
          uz: 'Afsuski, «{t}» endi bo‘sh emas. Abdullah sizga o‘xshash variantlar bilan yozadi.',
          en: 'Unfortunately “{t}” is no longer available. Abdullah will message you with similar options.' }
};
const PARTNER = {
  hello: { ru: 'Готово ✅ Вы подключены как визовая компания Madinah Group.\nЗаявки на визу и по икаме от клиентов Абдуллаха будут приходить сюда. Под каждой — кнопки «Оформлено» и «Отказ».',
           uz: 'Tayyor ✅ Siz Madinah Group viza kompaniyasi sifatida ulandingiz.\nAbdullah mijozlarining viza va iqoma arizalari shu yerga keladi. Har birining ostida «Rasmiylashtirildi» va «Rad etildi» tugmalari bor.',
           en: 'Done ✅ You are connected as Madinah Group’s visa company.\nVisa and iqama requests from Abdullah’s clients will arrive here, each with “Done” and “Refused” buttons.' },
  head:  { ru: '🛂 <b>ЗАЯВКА НА ВИЗУ</b>', uz: '🛂 <b>VIZA ARIZASI</b>', en: '🛂 <b>VISA REQUEST</b>' },
  headIq: { ru: '🪪 <b>ЗАЯВКА ПО ИКАМЕ</b>', uz: '🪪 <b>IQOMA BO‘YICHA ARIZA</b>', en: '🪪 <b>IQAMA REQUEST</b>' },
  fio: { ru: 'ФИО', uz: 'F.I.Sh.', en: 'Full name' }, service: { ru: 'Услуга', uz: 'Xizmat', en: 'Service' },
  when: { ru: 'Когда нужно', uz: 'Qachon kerak', en: 'Needed by' },
  priceAsk: { ru: 'Цена: уточняйте (плавающая)', uz: 'Narx: aniqlashtiring (o‘zgaruvchan)', en: 'Price: to be confirmed (varies)' },
  reqDate: { ru: 'Заявка от', uz: 'Ariza sanasi', en: 'Request date' },
  from:  { ru: '💼 Клиент от Абдуллаха (Madinah Group) — его доля {p}%', uz: '💼 Mijoz Abdullahdan (Madinah Group) — uning ulushi {p}%', en: '💼 Client from Abdullah (Madinah Group) — his share {p}%' },
  type: { ru: 'Вид визы', uz: 'Viza turi', en: 'Visa type' }, price: { ru: 'Цена для клиента', uz: 'Mijoz uchun narx', en: 'Client price' },
  citizen: { ru: 'Гражданство', uz: 'Fuqarolik', en: 'Citizenship' }, people: { ru: 'Человек', uz: 'Kishi', en: 'People' },
  date: { ru: 'Дата поездки', uz: 'Safar sanasi', en: 'Travel date' }, name: { ru: 'Имя', uz: 'Ism', en: 'Name' },
  phone: { ru: 'Телефон', uz: 'Telefon', en: 'Phone' }, note: { ru: 'Комментарий', uz: 'Izoh', en: 'Comment' },
  lang: { ru: 'Язык клиента', uz: 'Mijoz tili', en: 'Client language' },
  terms: { ru: '✅ Клиент принял условия: визу выдают власти КСА, за отказ и сроки Madinah Group не отвечает.',
           uz: '✅ Mijoz shartlarni qabul qildi: vizani SA hokimiyati beradi, rad etish va muddatlar uchun Madinah Group javob bermaydi.',
           en: '✅ The client accepted the terms: visas are issued by the Saudi authorities; Madinah Group is not liable for refusals or timing.' },
  done: { ru: '✅ Оформлено', uz: '✅ Rasmiylashtirildi', en: '✅ Done' },
  no:   { ru: '✖ Отказ', uz: '✖ Rad etildi', en: '✖ Refused' },
  write: { ru: '✍️ Написать клиенту', uz: '✍️ Mijozga yozish', en: '✍️ Message the client' },
  marked: { ru: 'Отмечено, Абдуллах получил уведомление', uz: 'Belgilandi, Abdullah xabar oldi', en: 'Marked, Abdullah has been notified' }
};
/* имя бота нужно для ссылки визовой компании; спрашиваем Telegram один раз и запоминаем */
async function botUsername() {
  if (BOT_USERNAME) return BOT_USERNAME;
  if (SETTINGS.botUsername) { BOT_USERNAME = SETTINGS.botUsername; return BOT_USERNAME; }
  if (!TOKEN) return '';
  try {
    const me = await tg('getMe', {});
    BOT_USERNAME = me.username || '';
    if (BOT_USERNAME) { SETTINGS.botUsername = BOT_USERNAME; saveSettings(); }
  } catch (e) { console.error('getMe:', e.message); }
  return BOT_USERNAME;
}
async function partnerLink() {
  if (!SETTINGS.partnerToken) { SETTINGS.partnerToken = rid(6); saveSettings(); }
  const bot = await botUsername();
  return bot ? `https://t.me/${bot}?start=visa-${SETTINGS.partnerToken}` : '';
}

function langOf(from) {
  const c = String((from && from.language_code) || '').slice(0, 2).toLowerCase();
  if (c === 'uz') return 'uz';
  if (['ru', 'uk', 'be', 'kk', 'ky', 'tg', 'tk', 'az'].includes(c)) return 'ru';
  return 'en';
}
/* ссылка на приложение с параметром: ?new=1 или ?edit=<id> (хвост после # занимает сам Telegram) */
function appLink(params) {
  const u = new URL(APP_URL);
  Object.keys(params || {}).forEach(k => u.searchParams.set(k, params[k]));
  return u.toString();
}
function appKeyboard(lang, params) {
  if (!/^https:\/\//.test(APP_URL)) return {};
  const b = BTN[lang || 'ru'];
  const rows = [[{ text: b[0], web_app: { url: appLink(params) } }]];
  if (!params) rows.push([{ text: b[1], url: DATA.brand.channel }]);
  return { reply_markup: { inline_keyboard: rows } };
}
function adminKeyboard() {
  if (!/^https:\/\//.test(APP_URL)) return {};
  return { reply_markup: { inline_keyboard: [[{ text: '⚙️ Админ-панель', web_app: { url: new URL('admin', APP_URL).toString() } }]] } };
}
function editKeyboard(id) {
  if (!/^https:\/\//.test(APP_URL)) return {};
  return { reply_markup: { inline_keyboard: [[{ text: '✏️ Открыть и проверить', web_app: { url: appLink({ edit: id }) } }]] } };
}

function listText() {
  const by = { free: [], booked: [], busy: [], rented: [], draft: [] };
  LISTINGS.forEach(ap => {
    const price = ap.price.month ? `${ap.price.month} риал/мес` : ap.price.day ? `${ap.price.day} риал/сут` : `${ap.price.year || '—'} риал/год`;
    const until = ap.status === 'booked' ? ap.bookedUntil : ap.busyUntil;
    (by[ap.status] || by.free).push(`${ap.code || '—'} <code>${ap.id}</code> · ${ap.title.ru || '—'} · ${price}` + (until ? ` (до ${until})` : ''));
  });
  let out = '<b>Квартиры</b>\n';
  [['free', '🟢 Свободны'], ['booked', '🔒 Забронированы'], ['busy', '🟠 Заняты'], ['rented', '⚪️ Сданы'], ['draft', '📝 Черновики']]
    .forEach(([k, title]) => { if (by[k].length) out += `\n${title}\n` + by[k].map(l => '• ' + l).join('\n') + '\n'; });
  out += '\nСменить статус: <code>/free TG22</code>, <code>/book TG22 25.09</code>, <code>/busy TG22 15.10</code>, <code>/sold TG22</code>';
  return out;
}

function normalizeDate(s) {
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[.\/](\d{1,2})(?:[.\/](\d{2,4}))?$/);
  if (!m) return '';
  const now = new Date();
  const year = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : now.getFullYear();
  const d = `${year}-${String(+m[2]).padStart(2, '0')}-${String(+m[1]).padStart(2, '0')}`;
  if (!m[3] && d < now.toISOString().slice(0, 10)) return `${year + 1}` + d.slice(4);
  return d;
}

function setStatus(list, status, until) {
  list.forEach(ap => {
    ap.status = status;
    if (status === 'booked') ap.bookedUntil = until || '';
    if (status === 'busy') ap.busyUntil = until || '';
    if (status === 'free') { ap.bookedUntil = ''; ap.busyUntil = ''; }
    ap.updated = today();
  });
  saveListings();
}

/* ------------------------------------------------------- команды в боте */
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const txt = (msg.text || '').trim();
  const isAdmin = ADMIN_IDS.includes(msg.from && msg.from.id);
  const lang = langOf(msg.from);

  if (isAdmin && (msg.forward_origin || msg.forward_from_chat)) { await queueImport(msg); return; }

  const pm = txt.match(/^\/start\s+visa-([a-f0-9]{6,32})$/);
  if (pm && SETTINGS.partnerToken && pm[1] === SETTINGS.partnerToken) {
    const f = msg.from || {};
    const partner = { id: chatId, name: [f.first_name, f.last_name].filter(Boolean).join(' ') || 'без имени', username: f.username || '', lang, at: new Date().toISOString() };
    SETTINGS.visaPartners = SETTINGS.visaPartners.filter(x => x.id !== chatId).concat([partner]);
    saveSettings();
    await send(chatId, PARTNER.hello[lang]);
    ADMIN_IDS.forEach(id => send(id, `🤝 Визовая компания подключена: <b>${escapeHtml(partner.name)}</b>` + (partner.username ? ` (@${partner.username})` : '') +
      '.\nТеперь заявки на визу уходят ей сразу, копия — вам. Отключить можно в приложении: вкладка «Виза».'));
    return;
  }
  if (/^\/start/.test(txt)) {
    await send(chatId, GREET[lang].join('\n'), appKeyboard(lang));
    if (isAdmin) await send(chatId, 'Вы вошли как администратор. /help — команды. Перешлите сюда пост из канала — он станет карточкой в приложении.', adminKeyboard());
    return;
  }
  if (/^\/help/.test(txt)) {
    await send(chatId, isAdmin ? [
      '<b>Команды риелтора</b>',
      '/list — все квартиры и статусы',
      '/new — добавить квартиру в приложении',
      '/free TG22 — снова свободна',
      '/book TG22 25.09 — забронирована (до даты заезда)',
      '/busy TG22 15.10 — живут жильцы, освободится 15 октября',
      '/sold TG22 — сдана, убрать из каталога',
      '/report — отчёт за месяц: заработок, сдано квартир, возвраты',
      '/owner — PDF-политика для владельца (арабский; /owner ru — перевод)',
      '/admin — открыть админ-панель, /id — ваш Telegram ID',
      '',
      'Если у нескольких квартир один код, укажите короткое имя из /list.',
      'Перешлите пост из канала — фото и видео подтянутся в полном качестве.'
    ].join('\n') : 'Нажмите /start, чтобы открыть каталог квартир.');
    return;
  }
  if (/^\/id\b/.test(txt)) {
    await send(chatId, `Ваш Telegram ID: <code>${msg.from.id}</code>` +
      (isAdmin ? '\nВы — администратор.' : !ADMIN_IDS.length ? '\nЧтобы стать администратором, впишите этот номер в переменную ADMIN_TELEGRAM_ID (на Vercel — Settings → Environment Variables) и разверните проект заново.' : ''));
    return;
  }
  if (/^\/admin\b/.test(txt)) {
    await send(chatId, isAdmin ? 'Админ-панель: тексты, кнопки, разделы, квартиры, услуги, отчёт.' : 'Нет доступа.', isAdmin ? adminKeyboard() : {});
    return;
  }
  if (!isAdmin) {
    const hint = { ru: 'Каталог открывается кнопкой ниже. По вопросам пишите @', uz: 'Katalog pastdagi tugma orqali ochiladi. Savollar bo‘yicha: @', en: 'The catalogue opens with the button below. Questions: @' }[lang];
    const cts = (CONTENT && CONTENT.contacts) || DATA.contacts;   // контакты из админки, если их правили
    const sis = { ru: '\nСёстрам — @', uz: '\nOpa-singillar uchun — @', en: '\nFor sisters — @' }[lang];
    await send(chatId, hint + cts.brothers.tg + (cts.sisters && cts.sisters.tg ? sis + cts.sisters.tg : ''), appKeyboard(lang));
    return;
  }
  if (/^\/list/.test(txt)) { await send(chatId, listText()); return; }
  const rm = txt.match(/^\/report(?:\s+(\d{4})-(\d{1,2}))?/);
  if (rm) {
    const month = rm[1] ? `${rm[1]}-${String(+rm[2]).padStart(2, '0')}` : today().slice(0, 7);
    await send(chatId, reportText(month));
    return;
  }
  const om = txt.match(/^\/owner(?:\s+(ar|ru|en))?/i);
  if (om) {
    await sendOwnerPdf(chatId, (om[1] || 'ar').toLowerCase()).catch(e => send(chatId, '❌ Не отправилось: ' + e.message));
    return;
  }
  if (/^\/new/.test(txt)) {
    await send(chatId, 'Откройте приложение — форма новой квартиры уже будет открыта.', appKeyboard('ru', { new: '1' }));
    return;
  }
  const m = txt.match(/^\/(free|open|book|busy|sold)\s+(\S+)(?:\s+(\S+))?/i);
  if (m) {
    const cmd = m[1].toLowerCase();
    const found = findListings(m[2]);
    const until = normalizeDate(m[3]);
    const status = { free: 'free', open: 'free', book: 'booked', busy: 'busy', sold: 'rented' }[cmd];
    if (!found.length) { await send(chatId, 'Не нашёл квартиру ' + m[2] + '. Посмотрите /list'); return; }
    if (status === 'busy' && !until) { await send(chatId, 'Укажите дату: <code>/busy ' + m[2] + ' 15.10</code>'); return; }
    setStatus(found, status, until);
    await send(chatId, `Готово: ${found.map(f => (f.code || f.id) + ' — ' + STATUS_RU[status]).join(', ')}` + (until ? ` до ${until}` : '') + '\nВ приложении обновится сразу.');
    return;
  }
  await send(chatId, 'Не понял команду. /help — список команд.');
}

/* ------------------------------------------ импорт пересланных постов */
/* Альбом из канала приходит несколькими сообщениями подряд. Постоянного процесса нет,
   поэтому первое сообщение создаёт черновик и записывает его номер в хранилище,
   а следующие сообщения того же альбома дописывают свои фото в этот же черновик. */
async function queueImport(msg) {
  try { await importOne(msg); }
  catch (e) { console.error('импорт:', e.message); await send(msg.chat.id, '❌ Не получилось: ' + e.message); }
}

async function grabMedia(m) {
  const photos = [], videos = [];
  let big = 0;
  const name = 'tg-' + rid(5);
  try {
    if (m.photo) {
      const best = m.photo[m.photo.length - 1];
      photos.push(await storePhoto(await tgFileBuf(best.file_id), name));
    } else if (m.video || (m.document && /^video\//.test(m.document.mime_type || ''))) {
      const v = m.video || m.document;
      if (v.file_size && v.file_size > 20 * 1048576) big++;
      else videos.push(await storeVideo(await tgFileBuf(v.file_id), name));
    } else if (m.document && /^image\//.test(m.document.mime_type || '')) {
      photos.push(await storePhoto(await tgFileBuf(m.document.file_id), name));
    }
  } catch (e) { console.error('импорт файла:', e.message); }
  return { photos, videos, big };
}

/* ждём, пока первое сообщение альбома создаст черновик */
async function waitAlbum(key) {
  for (let i = 0; i < 12; i++) {
    const info = await store.get(key);
    if (info && info.listing) return info;
    await new Promise(r => setTimeout(r, 400));
  }
  return null;
}

async function importOne(msg) {
  const chatId = msg.chat.id;
  const key = 'album:' + (msg.media_group_id ? 'g' + msg.media_group_id : 'm' + msg.message_id);
  const first = await store.claim(key, { at: Date.now(), listing: '' });
  await store.flush();
  if (first) {
    store.sweep('album:', 6);
    if (msg.photo || msg.video || msg.document) await send(chatId, '⏳ Забираю фото и видео в полном качестве…');
  }

  const got = await grabMedia(msg);
  const text0 = msg.caption || msg.text || '';
  const origin = msg.forward_origin || {};
  const chat = origin.chat || msg.forward_from_chat || {};
  const postId = origin.message_id || msg.forward_from_message_id;
  const postUrl = chat.username && postId ? `https://t.me/${chat.username}/${postId}` : '';

  await load(true);                                  // берём самые свежие данные: сообщения идут пачкой
  let ap = postUrl ? LISTINGS.find(x => x.post === postUrl) : null;
  if (!ap && !first) {
    const info = await waitAlbum(key);
    if (info && info.listing) ap = LISTINGS.find(x => x.id === info.listing);
  }

  /* обложка видео: без ffmpeg кадр не вырезать — ставим первое фото из того же поста */
  const withPoster = (videos, photos) => videos.map(v => Object.assign({}, v, { poster: v.poster || photos[0] || '' }));

  if (ap) {
    if (first) {                                     // тот же пост прислали заново — заменяем медиа
      if (got.photos.length) ap.photos = got.photos;
      if (got.videos.length) ap.videos = withPoster(got.videos, got.photos.length ? got.photos : ap.photos || []);
    } else {                                         // продолжение альбома — дописываем
      if (got.photos.length) ap.photos = (ap.photos || []).concat(got.photos).slice(0, 30);
      if (got.videos.length) ap.videos = (ap.videos || []).concat(withPoster(got.videos, ap.photos || [])).slice(0, 6);
    }
    ap.updated = today();
    saveListings();
    await store.flush();
    if (first) await send(chatId, `✅ Обновил «${ap.title.ru || ap.id}»: фото ${got.photos.length}, видео ${got.videos.length} — теперь в полном качестве.`, editKeyboard(ap.id));
    if (got.big) await send(chatId, '⚠️ Видео больше 20 МБ Telegram ботам не отдаёт. Добавьте его в приложении: карточка → «Редактировать» → «Добавить».');
    return;
  }

  const p = parsePost(text0, DISTRICTS);
  let district = p.district;
  if (!district && p.districtName && (p.districtName.ru || p.districtName.uz)) district = addDistrict(p.districtName);
  const draft = sanitize({
    code: p.code, status: 'draft', district: district,
    title: { ru: p.title.ru, uz: p.title.uz }, rooms: p.rooms, baths: p.baths, beds: p.beds, floor: p.floor, lift: p.lift,
    price: p.price, priceNotes: p.priceNotes, includes: p.includes, extra: p.extra, terms: p.terms,
    walk: p.walk, features: p.features, photos: got.photos, videos: withPoster(got.videos, got.photos), post: postUrl
  });
  LISTINGS.push(draft);
  saveListings();
  store.save(key, { at: Date.now(), listing: draft.id });
  await store.flush();
  await send(chatId, `📝 Черновик создан: «${draft.title.ru || 'без названия'}»\nФото: ${got.photos.length}, видео: ${got.videos.length}. Поля из текста: ${p.filled.length}.\nОстальные фото альбома подтянутся через несколько секунд.\nПроверьте и нажмите «Сохранить и показать» — до этого черновик видите только вы.`, editKeyboard(draft.id));
  if (got.big) await send(chatId, '⚠️ Видео больше 20 МБ Telegram ботам не отдаёт. Добавьте его в приложении: карточка → «Редактировать» → «Добавить».');
}

/* ------------------------------------------------ кнопки под заявками */
async function handleCallback(cq) {
  const answer = (t) => tg('answerCallbackQuery', { callback_query_id: cq.id, text: t || '' }).catch(() => {});
  const rq = /^rq:([\w-]+):(done|no)$/.exec(cq.data || '');
  if (rq) return requestDecision(cq, rq[1], rq[2], answer);
  const m = /^bk:([\w-]+):(ok|no)$/.exec(cq.data || '');
  if (!m || !ADMIN_IDS.includes(cq.from.id)) return answer();
  const b = BOOKINGS.find(x => x.id === m[1]);
  if (!b) return answer('Заявка не найдена');
  const ap = LISTINGS.find(x => x.id === b.apartment);
  const title = ap ? (ap.title[b.lang] || ap.title.ru) : b.apartment;
  const lang = ['ru', 'uz', 'en'].includes(b.lang) ? b.lang : 'ru';
  if (m[2] === 'ok') {
    if (ap) setStatus([ap], 'booked', b.date || '');
    b.status = 'confirmed';
    // сделка в отчёт: сумма — комиссия риелтора из карточки квартиры, её можно поправить в приложении
    addDeal({ kind: 'housing', date: today(), source: 'booking:' + b.id, apartment: ap ? ap.id : '', currency: 'SAR',
      amount: ap && ap.price && ap.price.agentFee ? ap.price.agentFee : null,
      title: (ap ? (ap.code ? ap.code + ' · ' : '') + (ap.title.ru || ap.id) : b.apartment) + ' — ' + (b.name || 'клиент') });
    if (b.user) send(b.user.id, CLIENT.ok[lang].replace('{t}', title));
  } else {
    b.status = 'declined';
    if (b.user) send(b.user.id, CLIENT.no[lang].replace('{t}', title));
  }
  saveBookings();
  const label = m[2] === 'ok' ? '✅ Забронировано — в приложении уже видно' : '✖ Отказано, клиент предупреждён';
  const rows = [[{ text: label, callback_data: 'noop' }]];
  if (b.user) rows.push([{ text: '✍️ Написать клиенту', url: 'tg://user?id=' + b.user.id }]);
  tg('editMessageReplyMarkup', { chat_id: cq.message.chat.id, message_id: cq.message.message_id, reply_markup: { inline_keyboard: rows } }).catch(() => {});
  answer(m[2] === 'ok' ? 'Квартира отмечена как забронированная' : 'Готово');
}

/* заявка на визу / тур / машину: «оформлено» или «отказ» — от визовой компании или риелтора */
async function requestDecision(cq, id, verdict, answer) {
  const isAdmin = ADMIN_IDS.includes(cq.from.id);
  const partner = SETTINGS.visaPartners.find(x => x.id === cq.from.id);
  const r = REQUESTS.find(x => x.id === id);
  if (!r || !(isAdmin || (partner && r.kind === 'visa'))) return answer();
  if (r.status !== 'new') return answer(r.status === 'done' ? 'Уже отмечено как оформленное' : 'Уже отмечено');
  r.status = verdict === 'done' ? 'done' : 'declined';
  r.decidedBy = isAdmin ? 'admin' : 'partner';
  saveRequests();
  const who = partner && !isAdmin ? `визовая компания ${escapeHtml(partner.name)}` : 'вы';
  const what = requestTitle(r);
  let deal = null;
  if (r.status === 'done') {
    const v = SERVICES.visa || {}, tr = SERVICES.tours || {};
    let sum = null, currency = 'SAR';
    if (r.kind === 'visa') {
      const ty = (v.types || []).find(x => x.id === r.item) || {};
      currency = 'USD';
      if (ty.price && ty.basePrice && ty.price > ty.basePrice) sum = (ty.price - ty.basePrice) * r.people;
      else if (ty.basePrice && v.commissionPct) sum = Math.round(ty.basePrice * v.commissionPct) / 100 * r.people;
    } else if (r.kind === 'tour') {
      const it = (tr.items || []).find(x => x.id === r.item) || {};
      if (it.price) sum = it.per === 'person' ? it.price * r.people : it.price;
    } else if (r.kind === 'car') {
      const car = ((SERVICES.cars || {}).items || []).find(x => x.id === r.item);
      if (car && r.date) {
        const to = r.dateTo && r.dateTo >= r.date ? r.dateTo : r.date;
        car.busy = (car.busy || []).filter(x => x.rid !== r.id).concat([{ from: r.date, to, rid: r.id }]);
        saveServices();                                   // в приложении машина сразу «забронирована» на эти даты
        const days = to > r.date ? Math.round((Date.parse(to) - Date.parse(r.date)) / 86400000) : 1;
        if (car.pricePerDay) sum = car.pricePerDay * days;
      }
    }
    deal = addDeal({ kind: r.kind, date: today(), source: 'request:' + r.id, amount: sum, currency,
      title: (r.kind === 'car' ? 'Машина ' : '') + what + ' — ' + (r.name || 'клиент') + (r.people > 1 && r.kind !== 'car' ? `, ${r.people} чел.` : '') });
  }
  if (r.user && r.kind !== 'visa') {
    const l = ['ru', 'uz', 'en'].includes(r.lang) ? r.lang : 'ru';
    const dates = r.kind === 'car' && r.date ? ` (${dmy(r.date)}${r.dateTo && r.dateTo !== r.date ? '–' + dmy(r.dateTo) : ''})` : '';
    send(r.user.id, (r.status === 'done' ? CLIENT.svcOk : CLIENT.svcNo)[l].replace('{t}', requestTitle(r, l) + dates));
  }
  const verdictRu = r.status === 'done' ? (r.kind === 'visa' ? '✅ Оформлено' : '✅ Договорились') : '✖ Отказ';
  const dealLine = deal ? (deal.amount != null ? `\nВ отчёт записано: ${num(deal.amount)} ${deal.currency === 'USD' ? '$' : 'риал'}.` : '\nВ отчёт добавлена сделка — впишите сумму в приложении (Панель → «Отчёт»).') : '';
  if (!isAdmin) ADMIN_IDS.forEach(aid => send(aid, `${verdictRu}: ${escapeHtml(what)} — ${escapeHtml(r.name)} (отметила ${who}).${dealLine}`));
  else if (dealLine) send(cq.from.id, verdictRu + ': ' + escapeHtml(what) + '.' + dealLine);
  const rows = [[{ text: verdictRu, callback_data: 'noop' }]];
  if (r.user) rows.push([{ text: (PARTNER.write[partner && !isAdmin ? partner.lang : 'ru'] || PARTNER.write.ru), url: 'tg://user?id=' + r.user.id }]);
  tg('editMessageReplyMarkup', { chat_id: cq.message.chat.id, message_id: cq.message.message_id, reply_markup: { inline_keyboard: rows } }).catch(() => {});
  answer(partner && !isAdmin ? PARTNER.marked[partner.lang] || PARTNER.marked.ru : 'Готово');
}
function requestTitle(r, lang) {
  const l = lang || 'ru';
  if (r.kind === 'transfer') {
    const route = [r.from, r.to].filter(Boolean).join(' → ');
    const word = { ru: 'Трансфер', uz: 'Transfer', en: 'Transfer' }[l] || 'Трансфер';
    return route ? word + ' ' + route : word;
  }
  if (r.kind === 'visa') { const ty = ((SERVICES.visa || {}).types || []).find(x => x.id === r.item); return ty ? (ty.title[l] || ty.title.ru) : 'Виза'; }
  if (r.kind === 'tour') { const it = ((SERVICES.tours || {}).items || []).find(x => x.id === r.item); return it ? (it.title[l] || it.title.ru) : 'Тур'; }
  const car = ((SERVICES.cars || {}).items || []).find(x => x.id === r.item);
  return car ? carName(car) : ({ ru: 'машина (подобрать)', uz: 'mashina (tanlab berish)', en: 'a car (to be selected)' }[l] || 'машина (подобрать)');
}

async function handleUpdate(u) {
  try {
    if (u.message) await handleMessage(u.message);
    else if (u.callback_query) await handleCallback(u.callback_query);
  } catch (e) { console.error('update:', e.message); }
}

/* ---------------------------------------------------------- HTTP: утилиты */
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Init-Data, X-Dev-Admin', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
const APP_ORIGIN = (() => { try { return new URL(APP_URL).origin; } catch (e) { return ''; } })();
function corsFor(req) {
  const p = (req.url || '').split('?')[0];
  if (!p.startsWith('/api/admin/')) return CORS;
  // панель открывается с того же адреса, что и сервер; чужим сайтам admin API не отвечает
  return APP_ORIGIN && req.headers.origin === APP_ORIGIN ? Object.assign({}, CORS, { 'Access-Control-Allow-Origin': APP_ORIGIN, Vary: 'Origin' }) : {};
}
function json(res, code, obj) {
  res.writeHead(code, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, res.cors || CORS));
  res.end(JSON.stringify(obj));
}
/* тело запроса. На Vercel оно иногда уже разобрано — тогда берём готовое */
function readBody(req, limit) {
  const b = req.body;
  if (b !== undefined && b !== null && b !== '') {
    if (Buffer.isBuffer(b) || typeof b === 'string') {
      try { return Promise.resolve(JSON.parse(String(b) || '{}')); } catch (e) { return Promise.resolve({}); }
    }
    if (typeof b === 'object') return Promise.resolve(b);
  }
  return new Promise(resolve => {
    let data = '';
    req.on('data', d => { data += d; if (data.length > (limit || 2e6)) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}
/* файл целиком (фото из панели) */
function readRaw(req, limit) {
  const b = req.body;
  if (Buffer.isBuffer(b)) return Promise.resolve(b);
  if (typeof b === 'string' && b) return Promise.resolve(Buffer.from(b, 'binary'));
  return new Promise((resolve, reject) => {
    const chunks = [];
    let got = 0;
    req.on('data', c => {
      got += c.length;
      if (got > limit) { req.destroy(); return reject(new Error('слишком большой файл')); }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
const hits = new Map();
function tooMany(req, max, windowMs) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > max;
}

/* почему не получилось достучаться до хранилища — человеческим языком */
function storeHint(e) {
  const msg = String((e && e.message) || e || '').slice(0, 160);
  if (store.kind !== 'pg' && HOSTED) {
    return 'База данных не подключена: на хостинге файлы записывать нельзя. Подключите Postgres (Vercel → Storage → Neon), ' +
      'чтобы появилась переменная DATABASE_URL, и разверните проект заново.';
  }
  if (/password|authent|ENOTFOUND|ECONNREFUSED|timeout|SSL|certificate/i.test(msg)) {
    return 'База данных не отвечает: ' + msg;
  }
  return 'Хранилище недоступно: ' + msg;
}

/* -------------------------------------------------------------- HTTP */
/* Один запрос. Само приложение (index.html, assets/) раздаёт Vercel или локальный сервер —
   сюда приходят только /api/…, /webhook и ссылки на загруженные файлы. */
async function route(req, res) {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch (e) { res.writeHead(400); return res.end(); }
  const p = decodeURIComponent(url.pathname);
  res.cors = corsFor(req);
  if (req.method === 'OPTIONS') { res.writeHead(204, res.cors); return res.end(); }

  try {
    /* --- старые ссылки на загруженные файлы: в облаке они лежат по своему адресу --- */
    if ((req.method === 'GET' || req.method === 'HEAD') && /^\/(api\/)?media\//.test(p)) {
      const to = media.urlOf(p.replace(/^\/(api\/)?media\//, ''));
      if (to) { res.writeHead(302, { Location: to, 'Cache-Control': 'public, max-age=3600' }); return res.end(); }
      return json(res, 404, { ok: false, error: 'Файл не найден' });
    }

    /* --- ревизия: спрашивают часто, поэтому отвечаем, не читая весь каталог --- */
    if (p === '/api/rev') {
      const r = await store.get('rev');
      if (r && r.n) return json(res, 200, { ok: true, rev: Number(r.n) });
      await load();
      return json(res, 200, { ok: true, rev: REV });
    }

    /* --- проверка состояния: отвечает даже когда хранилище недоступно --- */
    if (p === '/api/health') {
      let ready = true, why = '';
      try { await load(); } catch (e) { ready = false; why = storeHint(e); }
      return json(res, 200, { ok: true, app: 'madinah-rent', dev: DEV, ffmpeg: media.hasFfmpeg, bot: !!TOKEN,
        store: store.kind, media: media.kind, hosted: HOSTED, admins: ADMIN_IDS.length,
        maxUploadMb: Math.round(MAX_UPLOAD / 1048576), ready, error: why });
    }

    try {
      await load();
    } catch (e) {
      console.error('хранилище:', e);
      return json(res, 503, { ok: false, error: storeHint(e) });
    }

    if (p === '/api/catalog') {
      return json(res, 200, { ok: true, rev: REV, districts: DISTRICTS, services: publicServices(), content: CONTENT,
        apartments: LISTINGS.filter(a => a.status !== 'draft' && a.status !== 'rented') });
    }
    if (p === '/api/me' && req.method === 'POST') {
      const user = verifyInitData(req.headers['x-init-data'] || '');
      const admin = adminOf(req);
      return json(res, 200, { ok: true, admin: !!admin, id: user ? user.id : null, dev: DEV && !TOKEN });
    }
    if (p === '/api/booking' && req.method === 'POST') {
      if (tooMany(req, 8, 10 * 60000)) return json(res, 429, { ok: false, error: 'Слишком много заявок, попробуйте позже' });
      const b = await readBody(req);
      const user = verifyInitData(req.headers['x-init-data'] || b.initData || '');
      const ap = LISTINGS.find(x => x.id === b.apartment);
      if (!ap) return json(res, 404, { ok: false, error: 'Квартира не найдена' });
      const booking = {
        id: 'b' + Date.now().toString(36) + rid(2), at: new Date().toISOString(), status: 'new',
        apartment: ap.id, code: ap.code, mode: b.mode === 'wait' ? 'wait' : 'book',
        name: text(b.name, 80), phone: text(b.phone, 40), date: date(b.date), term: text(b.term, 10),
        who: text(b.who, 10), people: Math.min(20, pos(b.people) || 1), kids: Math.min(19, Math.max(0, Math.round(Number(b.kids) || 0))), note: text(b.note, 600),
        lang: ['ru', 'uz', 'en'].includes(b.lang) ? b.lang : 'ru', offerVersion: text(b.offerVersion, 10), user: user || null
      };
      BOOKINGS.push(booking);
      saveBookings();
      const telegram = await notifyBooking(booking, ap);
      if (user) {
        try { await send(user.id, CLIENT.sent[booking.lang]); }
        catch (e) { console.error('Telegram client confirmation failed:', e && e.message ? e.message : e); }
      }
      return json(res, telegram.ok ? 200 : 502, { ok: telegram.ok, telegram: telegram.ok, error: telegram.ok ? undefined : 'Не удалось отправить заявку в Telegram' });
    }
    if (p === '/api/request' && req.method === 'POST') {
      if (tooMany(req, 8, 10 * 60000)) return json(res, 429, { ok: false, error: 'Слишком много заявок, попробуйте позже' });
      const b = await readBody(req);
      const user = verifyInitData(req.headers['x-init-data'] || '');
      const kind = ['visa', 'tour', 'car', 'transfer'].includes(b.kind) ? b.kind : '';
      const name = text(b.name, 80), phone = text(b.phone, 40);
      if (!kind) return json(res, 400, { ok: false, error: 'Неверная заявка' });
      if (!name || (!user && !phone)) return json(res, 400, { ok: false, error: 'Нужны имя и телефон' });
      const r = {
        id: 'r' + Date.now().toString(36) + rid(2), at: new Date().toISOString(), status: 'new', kind,
        item: text(b.item, 40), people: Math.min(30, pos(b.people) || 1), name, phone,
        date: date(b.date), dateTo: date(b.dateTo), citizenship: text(b.citizenship, 60), pickup: text(b.pickup, 120),
        note: text(b.note, 600), lang: ['ru', 'uz', 'en'].includes(b.lang) ? b.lang : 'ru', user: user || null,
        /* трансфер: рейс, маршрут и что везём */
        time: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(b.time || '')) ? String(b.time) : '',
        from: text(b.from, 120), to: text(b.to, 120),
        bags: Math.min(20, Math.max(0, Math.round(Number(b.bags) || 0))), kids: b.kids === 'yes' ? 'yes' : 'no', chair: b.chair === 'yes' ? 'yes' : 'no',
        routed: kind === 'visa' && SETTINGS.visaPartners.length ? 'partner' : 'admin'
      };
      if (kind === 'transfer' && (!r.date || !r.from || !r.to)) {
        return json(res, 400, { ok: false, error: 'Для трансфера нужны дата прилёта, откуда и куда' });
      }
      REQUESTS.push(r);
      saveRequests();
      notifyRequest(r);
      if (user) send(user.id, (r.routed === 'partner' ? CLIENT.visaSent : CLIENT.sent)[r.lang]);
      return json(res, 200, { ok: true, routed: r.routed });
    }
    if (DEV && !TOKEN && p === '/api/dev/update' && req.method === 'POST' && isLocal(req)) {
      await handleUpdate(await readBody(req));                     // проверка сценариев бота без Telegram
      return json(res, 200, { ok: true });
    }
    if ((p === '/webhook' || p === '/api/webhook') && req.method === 'POST') {
      if (WEBHOOK_SECRET && req.headers['x-telegram-bot-api-secret-token'] !== WEBHOOK_SECRET) return json(res, 403, { ok: false });
      const u = await readBody(req);
      await handleUpdate(u);                 // отвечаем Telegram, когда всё сделано: функция засыпает сразу после ответа
      return json(res, 200, { ok: true });
    }

    /* --- панель риелтора --- */
    if (p.startsWith('/api/admin/')) {
      const admin = adminOf(req);
      if (!admin) return json(res, 403, { ok: false, error: 'Нет доступа' });

      if (p === '/api/admin/catalog') return json(res, 200, { ok: true, rev: REV, apartments: LISTINGS, districts: DISTRICTS, services: SERVICES, content: CONTENT });

      if (p === '/api/admin/content' && req.method === 'POST') {
        const b = await readBody(req);
        const section = String(b.section || '');
        if (!['brand', 'contacts', 'offer', 'steps', 'layout', 'i18n', 'images'].includes(section)) return json(res, 400, { ok: false, error: 'Неизвестный раздел' });
        CONTENT[section] = sanitizeContent(section, b.data);
        saveContent();
        return json(res, 200, { ok: true, rev: REV, content: CONTENT });
      }
      if (p === '/api/admin/districts' && req.method === 'POST') {
        const b = await readBody(req);
        DISTRICTS = sanitizeDistricts(b.districts || {});
        saveDistricts();
        return json(res, 200, { ok: true, rev: REV, districts: DISTRICTS });
      }

      if (p === '/api/admin/services' && req.method === 'POST') {
        const b = await readBody(req);
        SERVICES = sanitizeServices(b.services || {});
        saveServices();
        return json(res, 200, { ok: true, services: SERVICES });
      }

      if (p === '/api/admin/car-status' && req.method === 'POST') {
        const b = await readBody(req);
        const car = ((SERVICES.cars || {}).items || []).find(x => x.id === b.id);
        if (!car) return json(res, 404, { ok: false, error: 'Машина не найдена' });
        car.status = b.status === 'booked' ? 'booked' : 'free';
        car.bookedUntil = car.status === 'booked' ? date(b.until) : '';
        saveServices();
        return json(res, 200, { ok: true, services: SERVICES });
      }

      if (p === '/api/admin/report') {
        const month = /^\d{4}-\d{2}$/.test(url.searchParams.get('month') || '') ? url.searchParams.get('month') : today().slice(0, 7);
        return json(res, 200, Object.assign({ ok: true, rate: USD_SAR }, reportData(month)));
      }
      if (p === '/api/admin/deal' && req.method === 'POST') {
        const b = await readBody(req);
        const d = b.deal || {};
        const prev = d.id ? DEALS.find(x => x.id === d.id) : null;
        const clean = sanitizeDeal(d, prev);
        if (!clean.title) return json(res, 400, { ok: false, error: 'Напишите, что за сделка' });
        if (prev) DEALS[DEALS.indexOf(prev)] = clean; else DEALS.push(clean);
        saveDeals();
        return json(res, 200, { ok: true, deal: clean });
      }
      if (p === '/api/admin/deal-delete' && req.method === 'POST') {
        const b = await readBody(req);
        const i = DEALS.findIndex(x => x.id === b.id);
        if (i < 0) return json(res, 404, { ok: false, error: 'Не найдено' });
        DEALS.splice(i, 1);
        saveDeals();
        return json(res, 200, { ok: true });
      }

      if (p === '/api/admin/partners') {
        if (req.method === 'POST') {
          const b = await readBody(req);
          if (b.action === 'remove') SETTINGS.visaPartners = SETTINGS.visaPartners.filter(x => String(x.id) !== String(b.id));
          if (b.action === 'relink') SETTINGS.partnerToken = rid(6);
          saveSettings();
        }
        const link = await partnerLink();
        return json(res, 200, { ok: true, link, bot: BOT_USERNAME, dev: DEV,
          partners: SETTINGS.visaPartners.map(x => ({ id: x.id, name: x.name, username: x.username, at: x.at })) });
      }

      if (p === '/api/admin/owner-pdf' && req.method === 'POST') {
        const b = await readBody(req);
        if (!TOKEN || !admin.id) return json(res, 400, { ok: false, error: 'Бот выключен (режим проверки) — откройте PDF по ссылке' });
        try { await sendOwnerPdf(admin.id, ['ar', 'ru', 'en'].includes(b.lang) ? b.lang : 'ar'); }
        catch (e) { return json(res, 500, { ok: false, error: e.message }); }
        return json(res, 200, { ok: true });
      }

      if (p === '/api/admin/status' && req.method === 'POST') {
        const b = await readBody(req);
        const ap = LISTINGS.find(x => x.id === b.id);
        if (!ap || !STATUS.includes(b.status)) return json(res, 400, { ok: false, error: 'Неверные данные' });
        setStatus([ap], b.status, date(b.until));
        return json(res, 200, { ok: true, apartment: ap });
      }

      if (p === '/api/admin/listing' && req.method === 'POST') {
        const b = await readBody(req);
        const a = b.apartment || {};
        if (b.newDistrict && (b.newDistrict.ru || b.newDistrict.uz)) a.district = addDistrict(b.newDistrict);
        (a.videos || []).forEach(v => { if (pendingVideos.has(v.src)) v.src = pendingVideos.get(v.src); });
        const prev = a.id ? LISTINGS.find(x => x.id === a.id) : null;
        const clean = sanitize(a, prev);
        if (!clean.title.ru && !clean.title.uz) return json(res, 400, { ok: false, error: 'Нет заголовка' });
        if (prev) LISTINGS[LISTINGS.indexOf(prev)] = clean; else LISTINGS.unshift(clean);
        saveListings();
        return json(res, 200, { ok: true, apartment: clean, districts: DISTRICTS });
      }

      if (p === '/api/admin/delete' && req.method === 'POST') {
        const b = await readBody(req);
        const i = LISTINGS.findIndex(x => x.id === b.id);
        if (i < 0) return json(res, 404, { ok: false, error: 'Не найдено' });
        LISTINGS.splice(i, 1);
        saveListings();
        return json(res, 200, { ok: true });
      }

      if (p === '/api/admin/upload' && req.method === 'POST') {
        const name = String(url.searchParams.get('name') || '').toLowerCase();
        const ext = String(url.searchParams.get('ext') || '').toLowerCase();
        if (!/^[a-z0-9-]{6,80}$/.test(name) || !/^(webp|jpe?g|png|mp4|mov|webm|m4v)$/.test(ext)) return json(res, 400, { ok: false, error: 'Неверное имя файла' });
        if (process.env.VERCEL && media.kind !== 'blob') {
          return json(res, 503, { ok: false, error: 'Хранилище файлов не подключено: добавьте Vercel Blob (Storage → Blob) и разверните проект заново.' });
        }
        const big = 'Файл больше ' + Math.round(MAX_UPLOAD / 1048576) + ' МБ' +
          (media.kind === 'blob' ? '. Видео пришлите боту в Telegram — он добавит его в карточку.' : '');
        const len = Number(req.headers['content-length'] || 0);
        if (len > MAX_UPLOAD) return json(res, 413, { ok: false, error: big });
        let buf;
        try { buf = await readRaw(req, MAX_UPLOAD); }
        catch (e) { return json(res, 413, { ok: false, error: big }); }
        if (!buf || !buf.length) return json(res, 400, { ok: false, error: 'Пустой файл' });
        const saved = await media.put(name, ext, buf);
        return json(res, 200, { ok: true, url: saved });
      }

      if (p === '/api/admin/translate' && req.method === 'POST') {
        const b = await readBody(req);
        const to = b.to === 'uz' ? 'uz' : 'en';
        const texts = (Array.isArray(b.texts) ? b.texts : []).slice(0, 40).map(s => text(s, 480));
        const outT = [];
        for (const s of texts) outT.push(s ? await translateOne(s, 'ru', to) : '');
        return json(res, 200, { ok: true, texts: outT });
      }

      return json(res, 404, { ok: false, error: 'Нет такого действия' });
    }

    json(res, 404, { ok: false });
  } catch (e) {
    console.error('http:', e);
    json(res, 500, { ok: false, error: 'Ошибка сервера' });
  }
}

async function notifyBooking(b, ap) {
  const who = { family: 'семья', brothers: 'братья', sisters: 'сёстры' }[b.who] || b.who;
  const term = { day: 'посуточно', month: 'на месяц', long: 'надолго' }[b.term] || b.term;
  const dist = DISTRICTS[ap.district] || {};
  const lines = [
    b.mode === 'wait' ? '⏳ <b>ОЧЕРЕДЬ НА КВАРТИРУ</b>' : '🔔 <b>НОВАЯ ЗАЯВКА</b>',
    '',
    `<b>Квартира:</b> ${ap.title.ru || ap.id} (${ap.code || ap.id})`,
    `<b>Район:</b> ${dist.ru || ap.district}`,
    `<b>Цена:</b> ${ap.price.month ? ap.price.month + ' риал/мес' : ap.price.day ? ap.price.day + ' риал/сут' : (ap.price.year || '—') + ' риал/год'}`,
    `<b>Сейчас:</b> ${STATUS_RU[ap.status]}`,
    '',
    `<b>Имя:</b> ${escapeHtml(b.name) || '—'}`,
    `<b>Телефон:</b> ${escapeHtml(b.phone) || '—'}`,
    `<b>Заезд:</b> ${b.date || '—'} · ${term} (аренда — с дня передачи оплаты владельцу)`,
    `<b>Кто заселяется:</b> ${who}, ${b.people} чел.` + (b.who === 'family' && b.kids ? `, из них детей: ${b.kids}` : ''),
    ap.terms && ap.terms.forWhom === 'family' ? '⚠️ Владелец сдаёт только семьям' : '',
    b.note ? `<b>Комментарий:</b> ${escapeHtml(b.note)}` : '',
    `<b>Язык:</b> ${b.lang.toUpperCase()}`,
    '',
    `✅ Условия брони приняты (редакция ${b.offerVersion || '—'}): состав верный, аренда с дня оплаты владельцу, после заселения — к владельцу`,
    b.user ? `<b>Telegram:</b> ${b.user.username ? '@' + b.user.username : 'без ника'} (id ${b.user.id})` : '<i>Открыто вне Telegram — связь по телефону</i>',
    ap.post ? `<a href="${ap.post}">Пост в канале</a>` : ''
  ].filter(x => x !== '');
  const rows = [];
  if (b.mode !== 'wait') rows.push([{ text: '✅ Забронировать', callback_data: 'bk:' + b.id + ':ok' }, { text: '✖ Отказать', callback_data: 'bk:' + b.id + ':no' }]);
  if (b.user) rows.push([{ text: '✍️ Написать клиенту', url: 'tg://user?id=' + b.user.id }]);
  const extra = rows.length ? { reply_markup: { inline_keyboard: rows } } : {};
  if (!ADMIN_IDS.length) {
    console.error('Telegram notification skipped: no ADMIN_TELEGRAM_ID configured');
    return { ok: false };
  }
  const results = await Promise.allSettled(ADMIN_IDS.map(id => send(id, lines.join('\n'), extra)));
  const failed = results.filter(r => r.status === 'rejected');
  return { ok: failed.length === 0, sent: results.length - failed.length, failed: failed.length };
}
function notifyRequest(r) {
  const v = SERVICES.visa || {};
  const ty = r.kind === 'visa' ? (v.types || []).find(x => x.id === r.item) : null;
  const userLine = (lang) => r.user ? `<b>Telegram:</b> ${r.user.username ? '@' + r.user.username : (lang === 'ru' ? 'без ника' : 'no username')} (id ${r.user.id})` : '';
  const kb = (lang, labels) => {
    const rows = [[{ text: labels[0], callback_data: 'rq:' + r.id + ':done' }, { text: labels[1], callback_data: 'rq:' + r.id + ':no' }]];
    if (r.user) rows.push([{ text: PARTNER.write[lang] || PARTNER.write.ru, url: 'tg://user?id=' + r.user.id }]);
    return { reply_markup: { inline_keyboard: rows } };
  };
  if (r.kind === 'visa') {
    const partners = SETTINGS.visaPartners;
    const iq = ty && ty.cat === 'iqama';
    const body = (lang) => {
      const P = (k) => PARTNER[k][lang] || PARTNER[k].ru;
      return [
        iq ? P('headIq') : P('head'),
        P('from').replace('{p}', v.commissionPct || 0),
        `${P('reqDate')} ${dmy(today())}`,
        '',
        `<b>${P('fio')}:</b> ${escapeHtml(r.name)}`,
        `<b>${iq ? P('service') : P('type')}:</b> ${escapeHtml(requestTitle(r, lang))}`,
        r.date ? `<b>${iq ? P('when') : P('date')}:</b> ${dmy(r.date)}` : '',
        `<b>${P('priceAsk')}</b>`,
        r.citizenship ? `<b>${P('citizen')}:</b> ${escapeHtml(r.citizenship)}` : '',
        `<b>${P('people')}:</b> ${r.people}`,
        `<b>${P('phone')}:</b> ${escapeHtml(r.phone) || '—'}`,
        r.note ? `<b>${P('note')}:</b> ${escapeHtml(r.note)}` : '',
        `<b>${P('lang')}:</b> ${r.lang.toUpperCase()}`,
        userLine(lang),
        '',
        P('terms')
      ].filter(x => x !== '').join('\n');
    };
    partners.forEach(pt => send(pt.id, body(pt.lang), kb(pt.lang, [PARTNER.done[pt.lang] || PARTNER.done.ru, PARTNER.no[pt.lang] || PARTNER.no.ru])));
    const names = partners.map(pt => escapeHtml(pt.name) + (pt.username ? ' @' + pt.username : '')).join(', ');
    const copy = body('ru') + '\n\n' + (partners.length
      ? `📨 Отправлено визовой компании: ${names}. Когда она нажмёт «Оформлено», сделка попадёт в отчёт — впишите там сумму.`
      : '⚠️ Визовая компания не подключена — ответьте клиенту сами или подключите её в приложении: вкладка «Виза» → «Отправить ссылку компании».');
    ADMIN_IDS.forEach(id => send(id, copy, partners.length ? (r.user ? { reply_markup: { inline_keyboard: [[{ text: '✍️ Написать клиенту', url: 'tg://user?id=' + r.user.id }]] } } : {})
      : kb('ru', ['✅ Оформлено', '✖ Отказ'])));
    return;
  }
  if (r.kind === 'transfer') {
    const yn = v => v === 'yes' ? 'есть' : 'нет';
    const bagWord = n => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? 'место' : (a >= 2 && a <= 4 && (b < 10 || b >= 20)) ? 'места' : 'мест'; };
    const lines = [
      '🚐 <b>ЗАЯВКА НА ТРАНСФЕР</b>',
      '',
      `<b>Прилёт:</b> ${dmy(r.date)}` + (r.time ? ` в <b>${r.time}</b>` : ''),
      `<b>Откуда:</b> ${escapeHtml(r.from)}`,
      `<b>Куда:</b> ${escapeHtml(r.to)}`,
      `<b>Пассажиров:</b> ${r.people}`,
      `<b>Багаж:</b> ${r.bags ? r.bags + ' ' + bagWord(r.bags) : 'без багажа'} · <b>Дети:</b> ${yn(r.kids)}`,
      r.chair === 'yes' ? '♿️ <b>Инвалидная коляска:</b> есть — нужна машина побольше' : '',
      '',
      `<b>Имя:</b> ${escapeHtml(r.name)}`,
      `<b>Телефон:</b> ${escapeHtml(r.phone) || '—'}`,
      r.note ? `<b>Комментарий:</b> ${escapeHtml(r.note)}` : '',
      `<b>Язык:</b> ${r.lang.toUpperCase()}`,
      userLine('ru') || '<i>Открыто вне Telegram — связь по телефону</i>',
      '',
      '✅ Условия приняты: цена и машина — по согласованию, при задержке рейса водитель ждёт по договорённости'
    ].filter((x, i, a) => x !== '' || (a[i - 1] !== '' && i > 0));
    ADMIN_IDS.forEach(id => send(id, lines.join('\n'), kb('ru', ['✅ Договорились', '✖ Отказ'])));
    return;
  }
  const car = r.kind === 'car' ? ((SERVICES.cars || {}).items || []).find(x => x.id === r.item) : null;
  const days = r.kind === 'car' && r.date ? (r.dateTo && r.dateTo > r.date ? Math.round((Date.parse(r.dateTo) - Date.parse(r.date)) / 86400000) : 1) : 0;
  const clash = car && r.date ? carClash(car, r.date, r.dateTo) : null;
  const lines = [
    r.kind === 'tour' ? '🕌 <b>ЗАЯВКА НА ТУР</b>' : '🚗 <b>ЗАЯВКА НА МАШИНУ</b>',
    '',
    `<b>${r.kind === 'tour' ? 'Тур' : 'Машина'}:</b> ${escapeHtml(requestTitle(r))}`,
    r.date ? `<b>${r.kind === 'car' ? 'С' : 'Дата'}:</b> ${dmy(r.date)}` + (r.dateTo ? ` <b>по</b> ${dmy(r.dateTo)}` : '') : '',
    days ? `<b>Срок:</b> ${days} сут.` + (car && car.pricePerDay ? ` · ${num(days * car.pricePerDay)} риал` + (car.deposit ? ` + залог ${num(car.deposit)}` : '') : '') : '',
    clash ? `⚠️ Пересекается с бронью ${dmy(clash.from)}${clash.to !== '9999-12-31' ? '–' + dmy(clash.to) : ''}` : '',
    `<b>${r.kind === 'car' ? 'Пассажиров' : 'Человек'}:</b> ${r.people}`,
    r.pickup ? `<b>Откуда забрать:</b> ${escapeHtml(r.pickup)}` : '',
    '',
    `<b>Имя:</b> ${escapeHtml(r.name)}`,
    `<b>Телефон:</b> ${escapeHtml(r.phone) || '—'}`,
    r.note ? `<b>Комментарий:</b> ${escapeHtml(r.note)}` : '',
    `<b>Язык:</b> ${r.lang.toUpperCase()}`,
    userLine('ru') || '<i>Открыто вне Telegram — связь по телефону</i>',
    '',
    r.kind === 'tour' ? '✅ Условия приняты: маршрут, время и цена — по согласованию, при форс-мажоре — перенос'
                      : '✅ Условия приняты: осмотр при выдаче, штрафы и повреждения — за счёт арендатора'
  ].filter((x, i, a) => x !== '' || (a[i - 1] !== '' && i > 0));
  ADMIN_IDS.forEach(id => send(id, lines.join('\n'), kb('ru', ['✅ Договорились', '✖ Отказ'])));
}
function escapeHtml(s) { return String(s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

/* ------------------------------------------------- один запрос целиком */
/* Ответ собираем в памяти: на Vercel функция засыпает сразу после ответа, поэтому
   сначала дописываем данные в хранилище и досылаем сообщения бота — и только потом отвечаем. */
function Buffered() {
  this.code = 200;
  this.headers = {};
  this.chunks = [];
  this.cors = null;
}
Buffered.prototype.writeHead = function (code, headers) { this.code = code; Object.assign(this.headers, headers || {}); return this; };
Buffered.prototype.setHeader = function (k, v) { this.headers[k] = v; };
Buffered.prototype.write = function (chunk) { if (chunk) this.chunks.push(Buffer.from(chunk)); return true; };
Buffered.prototype.end = function (chunk) { if (chunk) this.write(chunk); };
Buffered.prototype.reset = function () { this.code = 200; this.headers = {}; this.chunks = []; };
Buffered.prototype.fail = function (code, error) {
  this.reset();
  this.writeHead(code, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, this.cors || CORS));
  this.end(JSON.stringify({ ok: false, error }));
};
Buffered.prototype.sendTo = function (res) {
  res.writeHead(this.code, this.headers);
  res.end(Buffer.concat(this.chunks));
};

async function handle(req, res) {
  const buf = new Buffered();
  try {
    await route(req, buf);
  } catch (e) {
    console.error('http:', e);
    buf.fail(500, 'Ошибка сервера');
  }
  try {
    await settle();                                 // досылаем сообщения бота
    const errs = await store.flush();               // дописываем данные
    if (errs.length && buf.code < 400) buf.fail(500, 'Не сохранилось: ' + errs[0]);
  } catch (e) {
    console.error('сохранение:', e);
    if (buf.code < 400) buf.fail(500, 'Не сохранилось: ' + ((e && e.message) || e));
  }
  buf.sendTo(res);
}

module.exports = {
  handle, route, load, handleUpdate, settle, track, tg, send, botUsername, verifyInitData,
  store, media, ENV, cfg, DEV, HOSTED, TOKEN, APP_URL, ADMIN_IDS, PORT,
  stats: () => ({ listings: LISTINGS.length, districts: Object.keys(DISTRICTS).length, admins: ADMIN_IDS.length, rev: REV })
};

// Vercel deploy sync: 2026-09-23

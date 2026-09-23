/* ==========================================================================
   Madinah Group — ядро мини-приложения
   Каталог, карточки, детали, фильтры, бронь, избранное, условия.
   Галерея — gallery.js, карта — map.js, визы/туры/авто — services.js,
   панель риелтора — admin.js и admin-biz.js (отчёт, услуги).
   Работает и внутри Telegram, и в обычном браузере.
   ========================================================================== */
(function () {
  'use strict';

  var D = window.DATA;
  var LANGS = ['ru', 'uz', 'en'];
  var I18N_DEFAULT = JSON.parse(JSON.stringify(window.I18N));   // исходные надписи: админ правит поверх них
  var ADMIN_PATH = /^\/admin\/?$/.test(location.pathname);      // страница /admin
  var TAB_IDS = ['catalog', 'visa', 'tours', 'cars', 'offer'];
  var TG = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  var STATUS_RANK = { free: 0, booked: 1, busy: 2, rented: 3, draft: 4 };
  var DEFAULT_FILTERS = { district: 'all', rooms: 0, maxPrice: 0, term: 'any', freeOnly: false, noIqama: false, allIn: false, sort: 'new' };

  var state = {
    lang: 'ru',
    items: normalize(D.apartments),
    fav: [],
    screen: 'catalog',
    termsTab: 'housing',
    filters: Object.assign({}, DEFAULT_FILTERS),
    current: null,
    sheet: null,
    layers: [],
    server: false,
    isAdmin: false,
    me: null,
    rev: 0
  };

  /* ------------------------------------------------------------ утилиты */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function t(key) { var s = window.I18N[state.lang] || window.I18N.ru; return s[key] != null ? s[key] : (window.I18N.ru[key] != null ? window.I18N.ru[key] : key); }
  function tpl(key, vars) { return String(t(key)).replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : ''; }); }
  function L(obj) { return !obj ? '' : (typeof obj === 'string' ? obj : (obj[state.lang] || obj.en || obj.ru || '')); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n) { return Number(n).toLocaleString(state.lang === 'en' ? 'en-US' : 'ru-RU').replace(/ /g, ' '); }
  /* вибро-отклик есть в Telegram с версии 6.1; в обычном браузере молчим */
  function tgv(v) { return !!(TG && TG.isVersionAtLeast && TG.isVersionAtLeast(v)); }
  function haptic(kind) { try { if (tgv('6.1')) TG.HapticFeedback.impactOccurred(kind || 'light'); } catch (e) {} }
  function hapticNotify(kind) { try { if (tgv('6.1')) TG.HapticFeedback.notificationOccurred(kind); } catch (e) {} }
  function alertMsg(text) { if (TG && TG.showAlert && TG.isVersionAtLeast && TG.isVersionAtLeast('6.2')) TG.showAlert(text); else window.alert(text); }

  /* фото: голое имя — из assets/img, путь или ссылка — как есть; у каждого фото есть уменьшенная копия -m */
  function media(p) {
    if (!p) return '';
    return /^(https?:|data:|blob:|\/|assets\/)/.test(p) ? p : 'assets/img/' + p;
  }
  function mediaCard(p) {
    var full = media(p);
    if (/^(data:|blob:)/.test(full)) return full;
    return /-m\.(webp|jpe?g|png)$/i.test(full) ? full : full.replace(/\.(webp|jpe?g|png)$/i, '-m.$1');
  }

  function normalize(list) {
    return (list || []).map(function (ap) {
      ap = Object.assign({}, ap);
      if (ap.status === 'soon') ap.status = 'busy';
      if (!STATUS_RANK.hasOwnProperty(ap.status)) ap.status = 'free';
      ap.photos = ap.photos || [];
      ap.videos = ap.videos || [];
      ap.includes = ap.includes || [];
      ap.extra = ap.extra || [];
      ap.features = ap.features || [];
      ap.priceNotes = ap.priceNotes || [];
      ap.terms = Object.assign({ iqama: false, minStay: 'month', forWhom: 'any' }, ap.terms || {});
      ap.price = Object.assign({ month: null, day: null, year: null, deposit: 0, agentFee: 0 }, ap.price || {});
      ap.walk = ap.walk || {};
      ap.title = ap.title || { ru: '' };
      return ap;
    });
  }

  var ICON = {
    pin:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    bed:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 18v-7h18v7"/><path d="M3 11V7m18 4V9a2 2 0 0 0-2-2h-5v4"/><path d="M6.5 11V9.5a1.5 1.5 0 0 1 3 0V11"/></svg>',
    bath:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3Z"/><path d="M6 12V6a2 2 0 0 1 4 0"/></svg>',
    walk:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="13" cy="4.5" r="1.8"/><path d="M11 21l2-6-2.5-2.5L9 17"/><path d="M13.5 8 11 9.5 8.5 13"/><path d="M13.5 8l2.5 2 2.5.5"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6.5"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 12h12"/></svg>',
    warn:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M12 4 2.8 20h18.4L12 4Z"/><path d="M12 10v4.4M12 17.4v.2"/></svg>',
    lock:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 7.9a4.1 4.1 0 0 1 7.5 2.7C19.5 15.4 12 20 12 20Z"/></svg>',
    tg:    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.6 4.3 2.9 11.4c-1 .4-1 1.7 0 2l4.7 1.5 1.8 5.5c.3.8 1.3 1 1.9.4l2.6-2.5 4.7 3.5c.7.5 1.7.1 1.9-.8l3-14.6c.2-1-.8-1.8-1.9-1.1Z"/></svg>',
    wa:    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1-1.4-1-2.6 0-1.3.6-1.9.9-2.1.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .6l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.2.1.4.1.6-.1l.8-1c.2-.2.3-.2.6-.1l2 .9c.2.1.4.2.4.3.1.2.1.7-.1 1.3Z"/></svg>',
    doc:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/></svg>',
    key:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8 2 2-2 2 2 2-3 3-2-2-2 2"/></svg>',
    wallet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/><circle cx="17" cy="14" r="1.2" fill="currentColor"/></svg>',
    home:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
    people:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5"/><path d="M16 8.2A3 3 0 0 1 19 11m-.5 9c0-2.4-.8-4.2-2-5.3"/></svg>',
    hands: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 12 3.5-3.5L12 13l5.5-4.5L21 12"/><path d="M3 12v3l6 4 6-4 6-3"/></svg>',
    chev:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>',
    edit:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.2-6.5a1 1 0 0 0 0-1.7L9.5 4.6A1 1 0 0 0 8 5.5Z"/></svg>'
  };
  var SEC_ICON = { handshake: ICON.hands, key: ICON.key, wallet: ICON.wallet, doc: ICON.doc, home: ICON.home, people: ICON.people, force: ICON.warn };

  /* --------------------------------------------------------- хранилище */
  function cloudOk() {
    return !!(TG && TG.CloudStorage && TG.CloudStorage.getItem && TG.isVersionAtLeast && TG.isVersionAtLeast('6.9'));
  }
  function storeGet(key, cb) {
    if (!cloudOk()) { cb(safeLocal(key)); return; }
    var done = false;
    var finish = function (val) { if (done) return; done = true; cb(val); };
    setTimeout(function () { finish(safeLocal(key)); }, 600);    // облако молчит — не ждём
    try { TG.CloudStorage.getItem(key, function (err, val) { finish(!err && val ? val : safeLocal(key)); }); }
    catch (e) { finish(safeLocal(key)); }
  }
  function storeSet(key, val) {
    try { localStorage.setItem(key, val); } catch (e) {}
    if (cloudOk()) { try { TG.CloudStorage.setItem(key, val, function () {}); } catch (e) {} }
  }
  function safeLocal(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }

  /* ------------------------------------------------------------ сервер */
  var api = {
    base: null,
    headers: function (json) {
      var h = {};
      if (json) h['Content-Type'] = 'application/json';
      if (TG && TG.initData) h['X-Init-Data'] = TG.initData;
      if (devAdmin()) h['X-Dev-Admin'] = '1';
      return h;
    },
    get: function (path) {
      return fetch(api.base + path, { headers: api.headers(), cache: 'no-store' }).then(api.json);
    },
    post: function (path, body) {
      return fetch(api.base + path, { method: 'POST', headers: api.headers(true), body: JSON.stringify(body || {}) }).then(api.json);
    },
    json: function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok || data.ok === false) { var e = new Error(data.error || ('HTTP ' + r.status)); e.status = r.status; throw e; }
        return data;
      });
    }
  };
  /* ?admin в адресе на своём компьютере — проверка панели без Telegram (сервер в режиме --dev) */
  function devAdmin() {
    return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]admin\b/.test(location.search);
  }

  function detectServer() {
    var conf = D.booking && D.booking.api;
    if (!conf || location.protocol === 'file:') return Promise.resolve(false);
    api.base = conf === 'auto' ? '' : String(conf).replace(/\/$/, '');
    var timeout = new Promise(function (res) { setTimeout(function () { res(false); }, 2500); });
    var probe = fetch(api.base + '/api/health', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && j.ok) state.health = j;              // предел загрузки и где живут файлы — берём с сервера
        return !!(j && j.ok && j.app === 'madinah-rent');
      })
      .catch(function () { return false; });
    return Promise.race([probe, timeout]).then(function (ok) {
      state.server = ok;
      if (!ok) api.base = null;
      return ok;
    });
  }

  function loadCatalog() {
    if (!state.server) return Promise.resolve();
    return api.get(state.isAdmin ? '/api/admin/catalog' : '/api/catalog').then(function (data) {
      if (data.districts) D.districts = Object.assign({}, D.districts, data.districts);
      if (data.apartments && data.apartments.length) state.items = normalize(data.apartments);
      if (data.services) D.services = data.services;
      if (data.rev) state.rev = data.rev;
      if (data.content) applyContent(data.content);
      else renderAll();
    }).catch(function () { /* сеть пропала — показываем то, что есть */ });
  }

  /* кто открыл: сервер проверяет подпись Telegram (initData) и сверяет id с ADMIN_TELEGRAM_ID.
     Флаг isAdmin в браузере ничего не открывает — каждое действие админки сервер проверяет заново. */
  function checkAdmin() {
    if (!state.server || (!(TG && TG.initData) && !devAdmin())) return Promise.resolve(false);
    return api.post('/api/me', {}).then(function (me) {
      state.me = me;
      state.isAdmin = !!me.admin;
      if (!state.isAdmin) return false;
      return loadScript('assets/js/admin.js').then(function () {
        return loadScript('assets/js/admin-biz.js').catch(function () {});
      }).then(function () {
        return loadScript('assets/js/admin-content.js').catch(function () {});
      }).then(function () {
        if (window.Admin) window.Admin.init(MR);
        if (window.AdminBiz) window.AdminBiz.init(MR);
        if (window.AdminContent) window.AdminContent.init(MR);
        return true;
      });
    }).catch(function () { return false; });
  }

  /* ----------------------------------------------- контент из админки */
  function layout() {
    var l = D.layout || {};
    return { tabs: l.tabs || TAB_IDS.map(function (id) { return { id: id, on: true }; }), blocks: l.blocks || {} };
  }
  function blockOn(key) { return layout().blocks[key] !== false; }
  function tabOn(id) { var x = layout().tabs.filter(function (t) { return t.id === id; })[0]; return !x || x.on !== false; }

  function applyContent(c) {
    if (c.brand) D.brand = Object.assign({}, D.brand, c.brand);
    if (c.contacts) D.contacts = Object.assign({}, D.contacts, c.contacts);
    if (c.offer) D.offer = c.offer;
    if (c.steps) D.steps = c.steps;
    D.layout = c.layout || null;
    D.images = c.images || {};
    LANGS.forEach(function (l) {                       // надписи: исходные + правки админа
      window.I18N[l] = Object.assign({}, I18N_DEFAULT[l], (c.i18n && c.i18n[l]) || {});
    });
    applyImages();
    applyLayout();
    setLang(state.lang);
  }
  function applyImages() {
    var im = D.images || {};
    var logo = im.logo ? media(im.logo) : 'assets/img/emblem-192.webp';
    $$('.appbar-logo').forEach(function (el) { if (el.getAttribute('src') !== logo) el.setAttribute('src', logo); });
    $$('link[rel="icon"], link[rel="apple-touch-icon"]').forEach(function (el) { el.setAttribute('href', logo); });
    var emb = im.emblem ? media(im.emblem) : 'assets/img/emblem.webp';
    var ie = $('.intro-emblem');
    if (ie && ie.getAttribute('src') !== emb) ie.setAttribute('src', emb);
  }
  /* порядок и видимость вкладок, «Карта» и «Избранное» внутри «Квартир» */
  function applyLayout() {
    var bar = $('#tabbar');
    var shown = 0;
    layout().tabs.forEach(function (x) {
      var b = bar.querySelector('.tab[data-screen="' + x.id + '"]');
      if (!b) return;
      bar.appendChild(b);
      b.hidden = x.on === false;
      if (!b.hidden) shown++;
    });
    bar.style.gridTemplateColumns = 'repeat(' + Math.max(1, shown) + ', 1fr)';
    var nav = $('#housingNav');
    nav.querySelector('[data-screen="map"]').hidden = !blockOn('housingMap');
    nav.querySelector('[data-screen="fav"]').hidden = !blockOn('housingFav');
    var visible = nav.querySelectorAll('[data-screen]:not([hidden])').length;
    nav.classList.toggle('is-single', visible < 2);
    var cur = state.screen;
    var group = HOUSING.indexOf(cur) >= 0 ? 'catalog' : cur;
    if (cur !== 'admin' && (!tabOn(group) || (cur === 'map' && !blockOn('housingMap')) || (cur === 'fav' && !blockOn('housingFav')))) {
      var first = layout().tabs.filter(function (x) { return x.on !== false; })[0];
      if (first && $('#appbar') && !$('#appbar').hidden) switchScreen(first.id);
      else state.screen = first ? first.id : 'catalog';
    }
  }

  /* изменения из админки видны сразу: сверяем ревизию каждые 30 с и когда приложение снова на экране */
  function watchRev() {
    if (!state.server) return;
    var check = function () {
      if (document.visibilityState !== 'visible') return;
      fetch(api.base + '/api/rev', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
        if (j && j.rev && j.rev !== state.rev) loadCatalog();
      }).catch(function () {});
    };
    setInterval(check, 30000);
    document.addEventListener('visibilitychange', check);
  }

  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (document.querySelector('script[src="' + src + '"]')) return res();
      var s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  /* ----------------------------------------------------------- статусы */
  function formatDate(iso) {
    var p = String(iso || '').split('-');
    return p.length === 3 ? p[2] + '.' + p[1] : (iso || '');
  }
  function statusText(ap) {
    var s = ap.status;
    if (s === 'free') return t('stFree');
    if (s === 'rented') return t('stRented');
    if (s === 'draft') return t('stDraft');
    var d = s === 'booked' ? ap.bookedUntil : ap.busyUntil;
    var label = s === 'booked' ? t('stBooked') : t('stBusy');
    return d ? label + ' · ' + tpl('untilTpl', { d: formatDate(d) }) : label;
  }
  function statusIcon(s) { return s === 'booked' ? ICON.lock : s === 'busy' ? ICON.clock : '<i></i>'; }
  function freshness(iso) {
    var d = new Date((iso || '2026-01-01') + 'T12:00:00');
    var days = Math.round((Date.now() - d.getTime()) / 86400000);
    if (days <= 0) return t('today');
    if (days === 1) return t('yesterday');
    return days + ' ' + t('daysAgo');
  }
  function nForm(n, forms) {
    if (state.lang === 'uz') return forms[2];
    if (state.lang === 'en') return n === 1 ? forms[0] : forms[1];
    var n10 = n % 10, n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return forms[0];
    if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
    return forms[2];
  }
  function word(key, n) { return n + ' ' + nForm(n, t(key)); }

  /* --------------------------------------------------------- фильтрация */
  function haramMeters(ap) {
    var h = ap.walk && ap.walk.haram;
    var s = (h && (h.ru || h)) || '';
    if (typeof s !== 'string') s = '';
    var km = s.match(/([\d,\.]+)\s*км/);
    if (km) return parseFloat(km[1].replace(',', '.')) * 1000;
    var m = s.match(/(\d+)\s*м(?![и])/);
    if (m) return +m[1];
    var mins = s.match(/(\d+)(?:[–-](\d+))?\s*мин/);
    if (mins) return (+(mins[2] || mins[1])) * 80;
    return 9999;
  }
  function priceOf(ap) { return ap.price.month || (ap.price.day ? ap.price.day * 30 : 0) || (ap.price.year ? ap.price.year / 12 : 99999); }

  /* что видит посетитель: сданные и черновики прячем, риелтору показываем всё */
  function visible() {
    return state.items.filter(function (ap) {
      return state.isAdmin || (ap.status !== 'rented' && ap.status !== 'draft');
    });
  }

  function applyFilters() {
    var f = state.filters;
    var list = visible().filter(function (ap) {
      if (f.freeOnly && ap.status !== 'free') return false;
      if (f.district !== 'all' && ap.district !== f.district) return false;
      if (f.rooms && (f.rooms === 3 ? ap.rooms < 3 : ap.rooms !== f.rooms)) return false;
      if (f.maxPrice && priceOf(ap) > f.maxPrice) return false;
      if (f.noIqama && ap.terms.iqama) return false;
      if (f.allIn && ap.extra.length) return false;
      if (f.term === 'day' && !ap.price.day) return false;
      if (f.term === 'month' && !ap.price.month) return false;
      if (f.term === 'long' && !(ap.price.month || ap.price.year)) return false;
      return true;
    });
    var by = f.sort === 'cheap' ? function (a, b) { return priceOf(a) - priceOf(b); }
           : f.sort === 'near' ? function (a, b) { return haramMeters(a) - haramMeters(b); }
           : function (a, b) { return (b.updated || '').localeCompare(a.updated || ''); };
    // свободные всегда первыми, забронированные и занятые — ниже, но их видно
    list.sort(function (a, b) { return (STATUS_RANK[a.status] - STATUS_RANK[b.status]) || ((b.pin ? 1 : 0) - (a.pin ? 1 : 0)) || by(a, b); });
    return list;
  }

  /* ------------------------------------------------------------ цены */
  function priceMain(ap, small) {
    var wrap = function (n, per) { return money(n) + ' ' + (small ? '<small>' + t('riyal') + ' ' + per + '</small>' : t('riyal') + ' <span>' + per + '</span>'); };
    if (ap.price.month) return wrap(ap.price.month, t('perMonth'));
    if (ap.price.year) return wrap(ap.price.year, t('perYear'));
    if (ap.price.day) return wrap(ap.price.day, t('perDay'));
    return '—';
  }
  function priceAlt(ap) {
    var alt = [];
    if (ap.price.month && ap.price.day) alt.push(money(ap.price.day) + ' ' + t('riyal') + ' ' + t('perDay'));
    if (ap.price.month && ap.price.year) alt.push(money(ap.price.year) + ' ' + t('riyal') + ' ' + t('perYear'));
    return alt;
  }

  /* ------------------------------------------------------- карточка ---- */
  function badgeHTML(ap) {
    return '<span class="badge ' + ap.status + '">' + statusIcon(ap.status) + esc(statusText(ap)) + '</span>';
  }

  function cardHTML(ap) {
    var d = D.districts[ap.district] || {};
    var alt = priceAlt(ap);
    var isFav = state.fav.indexOf(ap.id) >= 0;
    var hold = ap.status === 'booked' || ap.status === 'busy';
    return '' +
      '<article class="card st-' + ap.status + '" data-id="' + esc(ap.id) + '">' +
        '<div class="card-media">' +
          window.Gallery.stripHTML(ap, false) +
          badgeHTML(ap) +
          (ap.videos.length && ap.photos.length ? '<span class="chip-video">' + ICON.video + t('videoTour') + '</span>' : '') +
          '<button class="fav-btn' + (isFav ? ' is-on' : '') + '" data-fav="' + esc(ap.id) + '" aria-label="' + t('fav') + '">' + ICON.heart + '</button>' +
          (hold ? '<div class="card-hold">' + (ap.status === 'booked' ? ICON.lock : ICON.clock) + esc(statusText(ap)) + '</div>' : '') +
        '</div>' +
        '<div class="card-body">' +
          '<div class="card-price-row"><span class="card-price num">' + priceMain(ap, true) + '</span>' +
            (alt.length ? '<span class="card-price-alt num">' + alt.join(' · ') + '</span>' : '') +
          '</div>' +
          '<div class="card-title">' + esc(L(ap.title)) + '</div>' +
          '<div class="card-where">' + ICON.pin + esc(L(d)) + '</div>' +
          '<div class="metrics">' +
            '<span class="metric">' + ICON.bed + word('roomForms', ap.rooms || 1) + '</span>' +
            '<span class="metric">' + ICON.bath + word('bathForms', ap.baths || 1) + '</span>' +
            (ap.walk && ap.walk.haram ? '<span class="metric accent">' + ICON.walk + t('toHaram') + ' ' + esc(L(ap.walk.haram)) + '</span>' : '') +
            (!ap.terms.iqama ? '<span class="metric">' + t('iqamaNo') + '</span>' : '') +
          '</div>' +
          (state.isAdmin && (ap.status === 'draft' || ap.status === 'rented') ? '<div class="card-admin-note">' + t('adminHiddenNote') + '</div>' : '') +
        '</div>' +
      '</article>';
  }

  function renderCards() {
    var list = applyFilters();
    var box = $('#cards');
    box.innerHTML = list.length
      ? list.map(cardHTML).join('')
      : '<div class="empty"><h3>' + t('nothing') + '</h3><p>' + t('nothingHint') + '</p>' +
        '<button class="btn btn-ghost" id="emptyReset">' + t('resetFilters') + '</button></div>';
    var booked = list.filter(function (ap) { return ap.status === 'booked'; }).length;
    $('#liveLine').textContent = t('found') + ' ' + list.length + ' ' + nForm(list.length, [t('foundOne'), t('foundFew'), t('foundMany')]) +
      (booked ? ' · ' + word('bookedForms', booked) : '') +
      ' · ' + t('updated') + ' ' + freshness(newestDate());
    window.Gallery.bind(box);
    var er = $('#emptyReset');
    if (er) er.addEventListener('click', resetFilters);
  }

  function newestDate() {
    return state.items.reduce(function (acc, ap) { return (ap.updated || '') > acc ? ap.updated : acc; }, '2026-01-01');
  }

  /* ----------------------------------------------------- чипы районов */
  function renderChips() {
    var counts = {};
    visible().forEach(function (ap) {
      if (state.filters.freeOnly && ap.status !== 'free') return;
      counts[ap.district] = (counts[ap.district] || 0) + 1;
    });
    var keys = Object.keys(D.districts).filter(function (k) { return counts[k]; })
      .sort(function (a, b) { return counts[b] - counts[a]; });
    var html = '<button class="chip chip-filter' + (isFilterOn() ? ' has-on' : '') + '" data-open="filter">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" style="width:14px;height:14px"><path d="M3 6h18M6 12h12M10 18h4"/></svg>' + t('filters') + '</button>';
    html += '<button class="chip' + (state.filters.district === 'all' ? ' is-on' : '') + '" data-dist="all">' + t('allDistricts') + '</button>';
    html += keys.map(function (k) {
      return '<button class="chip' + (state.filters.district === k ? ' is-on' : '') + '" data-dist="' + k + '">' +
        esc(L(D.districts[k])) + ' <span class="cnt">' + counts[k] + '</span></button>';
    }).join('');
    $('#districtChips').innerHTML = html;
  }
  function isFilterOn() {
    var f = state.filters;
    return !!(f.rooms || f.maxPrice || f.term !== 'any' || f.noIqama || f.allIn || f.freeOnly || f.sort !== 'new');
  }

  /* ------------------------------------------------------ детали квартиры */
  function find(id) {
    return state.items.filter(function (x) { return x.id === id; })[0] || (window.Services ? window.Services.find(id) : null);
  }

  function openDetail(id) {
    var ap = find(id);
    if (!ap) return;
    state.current = ap;
    var d = D.districts[ap.district] || {};
    var alt = priceAlt(ap);

    var includes = ap.includes.map(function (k) {
      return '<div class="row-i">' + ICON.check + '<span>' + esc(L(window.AMENITIES[k])) + '</span></div>';
    }).join('');
    var extra = ap.extra.map(function (k) {
      return '<div class="row-i minus">' + ICON.minus + '<span>' + esc(L(window.AMENITIES[k])) + '</span></div>';
    }).join('');
    var feats = ap.features.map(function (f) {
      return '<div class="row-i">' + ICON.check + '<span>' + esc(L(f)) + '</span></div>';
    }).join('');
    var notes = ap.priceNotes.map(function (n) {
      return '<div class="note-warn">' + ICON.warn + '<span>' + esc(L(n)) + '</span></div>';
    }).join('');
    var holdNote = ap.status === 'booked' ? '<div class="note-hold">' + ICON.lock + '<span><b>' + esc(statusText(ap)) + '.</b> ' + t('bookedNote') + '</span></div>'
                 : ap.status === 'busy' ? '<div class="note-hold busy">' + ICON.clock + '<span><b>' + esc(statusText(ap)) + '.</b> ' + t('busyNote') + '</span></div>'
                 : '';

    var whoKey = { family: 'forFamily', students: 'forStudents', any: 'forAny' }[ap.terms.forWhom] || 'forAny';
    var stayKey = { day: 'minStayDay', month: 'minStayMonth', '3months': 'minStay3', '6months': 'minStay6', year: 'minStayYear' }[ap.terms.minStay] || 'minStayMonth';
    var tags = [t(whoKey), t(stayKey), ap.terms.iqama ? t('iqamaYes') : t('iqamaNo')];
    if (ap.floor) tags.push(ap.floor + ' ' + t('floorShort'));
    if (ap.lift) tags.push(t('lift'));
    if (ap.beds) tags.push(word('bedForms', ap.beds));
    if (ap.terms.maxPeople) tags.push(tpl('maxPeopleTag', { n: ap.terms.maxPeople }));

    var first = ap.price.month || ap.price.day || ap.price.year || 0;
    var total = first + (ap.price.deposit || 0) + (ap.price.agentFee || 0);
    var mapQuery = ap.geo && ap.geo.lat ? ap.geo.lat + ',' + ap.geo.lng : (d.lat ? d.lat + ',' + d.lng : (d.en || d.uz || '') + ', Madinah');

    $('#detailScroll').innerHTML = '' +
      '<div class="det-gallery">' +
        window.Gallery.stripHTML(ap, true) +
        badgeHTML(ap) +
        '<button class="fav-btn' + (state.fav.indexOf(ap.id) >= 0 ? ' is-on' : '') + '" data-fav="' + esc(ap.id) + '">' + ICON.heart + '</button>' +
      '</div>' +
      window.Gallery.thumbsHTML(ap) +
      '<div class="det-body">' +
        '<div>' +
          '<div class="det-price num"><b>' + priceMain(ap, false) + '</b>' +
            (alt.length ? '<span>' + alt.join(' · ') + '</span>' : '') + '</div>' +
          '<h2 style="margin-top:6px;font-size:19px">' + esc(L(ap.title)) + '</h2>' +
          '<div class="card-where" style="margin-top:7px">' + ICON.pin + esc(L(d)) +
            (d.haram ? ' · ' + t('toHaram') + ' ' + esc(L(d.haram)) : '') + '</div>' +
          (ap.walk && ap.walk.other ? '<div class="card-where">' + ICON.walk + esc(L(ap.walk.other)) + '</div>' : '') +
        '</div>' +
        holdNote +
        notes +
        '<div class="tags">' + tags.map(function (x) { return '<span class="tag">' + esc(x) + '</span>'; }).join('') + '</div>' +
        (feats ? '<div class="block"><h3>' + t('features') + '</h3><div class="rows">' + feats + '</div></div>' : '') +
        (includes ? '<div class="block"><h3>' + t('included') + '</h3><div class="rows">' + includes + '</div></div>' : '') +
        (extra ? '<div class="block"><h3>' + t('extraPay') + '</h3><div class="rows">' + extra + '</div></div>' : '') +
        '<div class="block"><h3>' + t('calc') + '</h3>' +
          '<div class="calc num">' +
            '<div class="calc-row"><span>' + t('calcRent') + '</span><b>' + money(first) + ' ' + t('riyal') + '</b></div>' +
            (ap.price.deposit ? '<div class="calc-row"><span>' + t('calcDeposit') + '</span><b>' + money(ap.price.deposit) + ' ' + t('riyal') + '</b></div>' : '') +
            (ap.price.agentFee ? '<div class="calc-row"><span>' + t('calcAgent') + '</span><b>' + money(ap.price.agentFee) + ' ' + t('riyal') + '</b></div>' : '') +
            '<div class="calc-row calc-total"><span>' + t('calcTotal') + '</span><b>' + money(total) + ' ' + t('riyal') + '</b></div>' +
            '<div class="calc-note">' + t('calcNote') + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;color:var(--ink-3);font-size:12.5px">' +
          '<span>' + t('codeLabel') + ': ' + esc(ap.code || '—') + '</span>' +
          '<span>' + t('updated') + ' ' + freshness(ap.updated) + '</span>' +
        '</div>' +
        '<button class="link-line" data-act="show-on-map">' + ICON.pin + t('openMap') + '</button>' +
        '<button class="link-line" data-go="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(mapQuery) + '">' + ICON.pin + 'Google Maps</button>' +
        (ap.post ? '<a class="link-line" href="' + esc(ap.post) + '" target="_blank" rel="noopener">' + ICON.tg + t('fromChannel') + '</a>' : '') +
        (state.isAdmin ? adminBox(ap) : '') +
      '</div>';

    var main = ap.status === 'free'
      ? '<button class="btn" data-act="book">' + t('book') + '</button>'
      : ap.status === 'booked' || ap.status === 'busy'
        ? '<button class="btn btn-clay" data-act="wait">' + ICON.clock + t('waitlist') + '</button>'
        : '';
    $('#detailCta').innerHTML = main + '<button class="btn btn-ghost" data-act="ask">' + t('ask') + '</button>';

    window.Gallery.bind($('#detailScroll'));
    openSheet('#sheetDetail');
  }

  /* быстрый статус для риелтора прямо в карточке */
  function adminBox(ap) {
    var opts = ['free', 'booked', 'busy', 'rented', 'draft'];
    var label = { free: t('stFree'), booked: t('stBooked'), busy: t('stBusy'), rented: t('stRented'), draft: t('stDraft') };
    var until = ap.status === 'booked' ? ap.bookedUntil : ap.busyUntil;
    return '<div class="admin" id="admQuick" data-id="' + esc(ap.id) + '">' +
      '<h3>' + t('adminQuick') + '</h3>' +
      '<div class="st-seg">' + opts.map(function (s) {
        return '<button class="st-opt st-' + s + (ap.status === s ? ' is-on' : '') + '" data-st="' + s + '">' + label[s] + '</button>';
      }).join('') + '</div>' +
      '<div class="field" style="margin-top:10px"><label>' + t('adminDate') + '</label>' +
        '<input type="date" id="admUntil" value="' + esc(until || '') + '"></div>' +
      '<div class="btn-row two" style="margin-top:10px">' +
        '<button class="btn" data-act="admin-status" style="min-height:44px">' + t('adminSave') + '</button>' +
        '<button class="btn btn-ghost" data-act="admin-edit" style="min-height:44px">' + ICON.edit + t('adminEdit') + '</button>' +
      '</div>' +
    '</div>';
  }

  function saveQuickStatus() {
    var box = $('#admQuick');
    var ap = find(box.getAttribute('data-id'));
    var on = box.querySelector('.st-opt.is-on');
    var status = on ? on.getAttribute('data-st') : ap.status;
    var until = $('#admUntil').value;
    api.post('/api/admin/status', { id: ap.id, status: status, until: until }).then(function (res) {
      Object.assign(ap, normalize([res.apartment])[0]);
      hapticNotify('success');
      renderAll();
      closeSheet();
    }).catch(function (e) { alertMsg(t('adminErr') + ': ' + e.message); });
  }

  /* ------------------------------------------------------------ фильтры */
  function renderFilters() {
    var f = state.filters;
    var prices = state.items.map(priceOf).filter(function (x) { return x < 90000; });
    var maxP = Math.ceil(Math.max.apply(null, prices.concat([3000])) / 100) * 100;
    var curP = f.maxPrice || maxP;
    $('#filterBody').innerHTML = '' +
      '<div class="field"><label>' + t('sortLabel') + '</label>' +
        '<div class="seg" data-seg="sort">' +
          ['new', 'cheap', 'near'].map(function (v) {
            return '<button data-v="' + v + '" class="' + (f.sort === v ? 'is-on' : '') + '">' + t({ new: 'sortNew', cheap: 'sortCheap', near: 'sortNear' }[v]) + '</button>';
          }).join('') +
        '</div></div>' +
      '<div class="field"><label>' + t('rooms') + '</label>' +
        '<div class="seg" data-seg="rooms">' +
          '<button data-v="0" class="' + (!f.rooms ? 'is-on' : '') + '">' + t('anyRooms') + '</button>' +
          [1, 2, 3].map(function (n) { return '<button data-v="' + n + '" class="' + (f.rooms === n ? 'is-on' : '') + '">' + (n === 3 ? '3+' : n) + '</button>'; }).join('') +
        '</div></div>' +
      '<div class="field"><label>' + t('term') + '</label>' +
        '<div class="seg" data-seg="term">' +
          ['any', 'day', 'month', 'long'].map(function (v) {
            return '<button data-v="' + v + '" class="' + (f.term === v ? 'is-on' : '') + '">' + t({ any: 'termAny', day: 'termDay', month: 'termMonth', long: 'termLong' }[v]) + '</button>';
          }).join('') +
        '</div></div>' +
      '<div class="field"><label>' + t('priceUpTo') + ': <b class="num" id="priceOut">' + money(curP) + ' ' + t('riyal') + '</b></label>' +
        '<input type="range" id="priceRange" min="1000" max="' + maxP + '" step="100" value="' + curP + '" style="min-height:auto;padding:0;border:0;background:transparent;accent-color:var(--green)">' +
      '</div>' +
      '<label class="check"><input type="checkbox" id="fFree" ' + (f.freeOnly ? 'checked' : '') + '><span>' + t('onlyFree') + '</span></label>' +
      '<label class="check"><input type="checkbox" id="fIqama" ' + (f.noIqama ? 'checked' : '') + '><span>' + t('noIqama') + '</span></label>' +
      '<label class="check"><input type="checkbox" id="fAllIn" ' + (f.allIn ? 'checked' : '') + '><span>' + t('allIncluded') + '</span></label>';

    $$('#filterBody .seg').forEach(function (seg) {
      seg.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-v]');
        if (!b) return;
        haptic('light');
        $$('button', seg).forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
        var key = seg.getAttribute('data-seg');
        state.filters[key] = key === 'rooms' ? +b.getAttribute('data-v') : b.getAttribute('data-v');
      });
    });
    var range = $('#priceRange');
    range.addEventListener('input', function () {
      $('#priceOut').textContent = money(range.value) + ' ' + t('riyal');
      state.filters.maxPrice = +range.value >= maxP ? 0 : +range.value;
    });
    $('#fFree').addEventListener('change', function (e) { state.filters.freeOnly = e.target.checked; });
    $('#fIqama').addEventListener('change', function (e) { state.filters.noIqama = e.target.checked; });
    $('#fAllIn').addEventListener('change', function (e) { state.filters.allIn = e.target.checked; });
  }

  function resetFilters() {
    state.filters = Object.assign({}, DEFAULT_FILTERS);
    renderChips();
    renderCards();
    closeSheet();
  }

  /* ------------------------------------------------------------- заявка */
  function openBooking(ap, mode) {
    var user = TG && TG.initDataUnsafe && TG.initDataUnsafe.user ? TG.initDataUnsafe.user : null;
    var name = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : '';
    var o = D.offer;
    $('#bookScroll').innerHTML = '' +
      '<div class="sheet-head"><h2>' + (mode === 'wait' ? t('waitlist') : t('bookTitle')) + '</h2>' +
        '<div class="sub">' + esc(L(ap.title)) + ' · ' + esc(L(D.districts[ap.district])) + (ap.code ? ' · ' + esc(ap.code) : '') + '</div></div>' +
      '<div class="wrap" style="display:grid;gap:14px;padding-bottom:10px">' +
        (mode === 'wait' ? '<div class="note-hold">' + ICON.clock + '<span>' + (ap.status === 'booked' ? t('bookedNote') : t('busyNote')) + '</span></div>' : '') +
        '<div class="field" id="fldWho"><label>' + t('bookWho') + ' *</label>' +
          '<div class="seg" id="segWho">' +
            '<button data-v="family">' + t('whoFamily') + '</button>' +
            '<button data-v="brothers">' + t('whoBrothers') + '</button>' +
            '<button data-v="sisters">' + t('whoSisters') + '</button>' +
          '</div>' +
          '<span class="hint">' + t('bookWhoHint') + '</span></div>' +
        '<div class="ed-grid2">' +
          '<div class="field"><label>' + t('bookPeopleTotal') + '</label>' +
            '<div class="stepper"><button data-step="people:-1">−</button><b class="num" id="bPeople">1</b><button data-step="people:1">+</button></div></div>' +
          '<div class="field" id="fldKids" hidden><label>' + t('bookKids') + '</label>' +
            '<div class="stepper"><button data-step="kids:-1">−</button><b class="num" id="bKids">0</b><button data-step="kids:1">+</button></div></div>' +
        '</div>' +
        '<div class="note-warn" id="whoWarn" hidden>' + ICON.warn + '<span></span></div>' +
        '<div class="field" id="fldName"><label>' + t('bookName') + ' *</label>' +
          '<input id="bName" value="' + esc(name) + '" placeholder="' + t('bookNamePh') + '" autocomplete="name"></div>' +
        '<div class="field"><label>' + t('bookPhone') + '</label>' +
          '<input id="bPhone" type="tel" inputmode="tel" placeholder="+998 / +966 / +7" autocomplete="tel">' +
          '<span class="hint">' + t('bookPhonePh') + '</span></div>' +
        '<div class="field"><label>' + t('bookFromRent') + '</label><input id="bDate" type="date">' +
          '<span class="hint">' + t('bookFromHint') + '</span></div>' +
        '<div class="field"><label>' + t('bookTermQ') + '</label>' +
          '<div class="seg" id="segTerm">' +
            (ap.price.day ? '<button data-v="day">' + t('termDay') + '</button>' : '') +
            '<button data-v="month" class="is-on">' + t('termMonth') + '</button>' +
            '<button data-v="long">' + t('termLong') + '</button>' +
          '</div></div>' +
        '<div class="field"><label>' + t('bookComment') + '</label>' +
          '<textarea id="bNote" placeholder="' + t('bookCommentPh') + '"></textarea></div>' +
        '<div class="key-points"><h3>' + t('keyPointsTitle') + '</h3><ul>' +
          (o.keyPoints || []).map(function (k) { return '<li>' + esc(L(k)) + '</li>'; }).join('') +
        '</ul><button class="link-line" data-act="open-offer">' + ICON.doc + t('readOffer') + '</button></div>' +
        '<label class="check" id="agreeBox"><input type="checkbox" id="bAgree"><span>' + esc(L(o.consent)) + '</span></label>' +
      '</div>';
    $('#bookCta').innerHTML = '<button class="btn" id="bSend">' + t('send') + '</button>';

    var form = { term: 'month', who: '', people: 1, kids: 0, mode: mode || 'book' };
    var check = function () { return checkWho(ap, form); };
    $$('#bookScroll .seg').forEach(function (seg) {
      seg.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-v]');
        if (!b) return;
        haptic('light');
        $$('button', seg).forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
        if (seg.id === 'segTerm') form.term = b.getAttribute('data-v');
        else {
          form.who = b.getAttribute('data-v');
          $('#fldWho').classList.remove('err');
          $('#fldKids').hidden = form.who !== 'family';
          if (form.who !== 'family') { form.kids = 0; $('#bKids').textContent = 0; }
          check();
        }
      });
    });
    $$('#bookScroll [data-step]').forEach(function (b) {
      b.addEventListener('click', function () {
        var parts = b.getAttribute('data-step').split(':');
        var key = parts[0], d = +parts[1];
        if (key === 'people') form.people = Math.max(1, Math.min(20, form.people + d));
        else form.kids = Math.max(0, Math.min(Math.max(0, form.people - 1), form.kids + d));
        if (form.kids > form.people - 1) form.kids = Math.max(0, form.people - 1);
        $('#bPeople').textContent = form.people;
        $('#bKids').textContent = form.kids;
        haptic('light');
        check();
      });
    });
    $('#bookScroll').onclick = function (e) {          // один обработчик на шторку: форма услуг ставит свой
      if (e.target.closest('[data-act="open-offer"]')) { closeSheet(); openTerms('housing'); }
    };
    $('#bSend').addEventListener('click', function () { submitBooking(ap, form); });
    openSheet('#sheetBook');
  }

  /* ограничения владельца: только семьи / только студенты / не больше N человек */
  function checkWho(ap, form) {
    var warn = $('#whoWarn');
    var msg = '';
    var forWhom = ap.terms.forWhom;
    if (form.who && forWhom === 'family' && form.who !== 'family') msg = t('onlyFamilyWarn');
    else if (form.who && forWhom === 'students' && form.who === 'family') msg = t('onlyStudentsWarn');
    else if (ap.terms.maxPeople && form.people > ap.terms.maxPeople) msg = tpl('maxPeopleWarn', { n: ap.terms.maxPeople });
    if (warn) {
      warn.hidden = !msg;
      warn.querySelector('span').textContent = msg;
    }
    var btn = $('#bSend');
    if (btn) btn.disabled = !!msg;
    return !msg;
  }

  function bookingText(ap, form) {
    var user = TG && TG.initDataUnsafe && TG.initDataUnsafe.user ? TG.initDataUnsafe.user : null;
    var termMap = { day: 'посуточно', month: 'на месяц', long: 'надолго' };
    var whoMap = { family: 'семья', brothers: 'братья', sisters: 'сёстры' };
    var who = whoMap[form.who] + ', ' + form.people + ' чел.' + (form.who === 'family' && form.kids ? ' (из них детей: ' + form.kids + ')' : '');
    var dist = D.districts[ap.district] || {};
    var lines = [
      (form.mode === 'wait' ? 'ОЧЕРЕДЬ / ПРЕДБРОНЬ' : 'ЗАЯВКА') + ' · Madinah Group',
      '',
      'Квартира: ' + (ap.title.ru || L(ap.title)),
      'Район: ' + (dist.ru || '') + (ap.code ? ' · код ' + ap.code : ''),
      'Цена: ' + (ap.price.month ? ap.price.month + ' риал/мес' : ap.price.day ? ap.price.day + ' риал/сутки' : (ap.price.year || '—') + ' риал/год'),
      '',
      'Имя: ' + ($('#bName').value || '—'),
      'Телефон: ' + ($('#bPhone').value || '—'),
      'Бронь с даты (аренда идёт с неё): ' + ($('#bDate').value || '—'),
      'Срок: ' + termMap[form.term],
      'Кто заселяется: ' + who,
      'Комментарий: ' + ($('#bNote').value || '—'),
      'Язык клиента: ' + state.lang.toUpperCase(),
      '',
      'Условия брони приняты (редакция ' + D.offer.version + '): состав верный, аренда с даты брони, после заселения — к владельцу',
      user ? 'Telegram: @' + (user.username || ('id' + user.id)) : '',
      ap.post ? 'Объект в канале: ' + ap.post : ''
    ];
    return lines.filter(function (x, i) { return x !== '' || lines[i - 1] !== ''; }).join('\n');
  }

  function submitBooking(ap, form) {
    var whoOk = !!form.who;
    var nameOk = !!$('#bName').value.trim();
    var agreeOk = $('#bAgree').checked;
    $('#fldWho').classList.toggle('err', !whoOk);
    $('#fldName').classList.toggle('err', !nameOk);
    $('#agreeBox').classList.toggle('err', !agreeOk);
    if (!whoOk || !nameOk || !agreeOk) {
      hapticNotify('error');
      alertMsg(!whoOk ? t('whoErr') : !nameOk ? t('nameErr') : t('agreeErr'));
      return;
    }
    if (!checkWho(ap, form)) { hapticNotify('error'); return; }
    var text = bookingText(ap, form);
    var btn = $('#bSend');
    btn.disabled = true;
    btn.textContent = t('sending');
    if (!state.server) { showDone(ap, text, false); return; }
    api.post('/api/booking', {
      apartment: ap.id, code: ap.code, mode: form.mode,
      name: $('#bName').value, phone: $('#bPhone').value, date: $('#bDate').value,
      term: form.term, who: form.who, people: form.people, kids: form.kids, note: $('#bNote').value,
      offerVersion: D.offer.version, lang: state.lang, text: text
    }).then(function () { showDone(ap, text, true); })
      .catch(function () { showDone(ap, text, false); });
  }

  function showDone(ap, text, sent) {
    hapticNotify('success');
    var c = D.contacts;
    var on = $('#segWho') && $('#segWho').querySelector('.is-on');
    var isSisters = on && on.getAttribute('data-v') === 'sisters';
    var person = (isSisters && c.sisters.tg) ? c.sisters : c.brothers;
    var tgLink = person.tg ? 'https://t.me/' + person.tg : D.brand.channel;
    $('#bookCta').innerHTML = '';
    $('#bookScroll').innerHTML = '' +
      '<div class="done">' +
        '<div class="ring">' + (sent ? ICON.check : ICON.tg) + '</div>' +
        '<h2>' + (sent ? t('sentTitle') : t('sendFallback')) + '</h2>' +
        '<p>' + (sent ? t(isSisters && c.sisters.tg ? 'sentTextSisters' : 'sentText') : t('sendFallbackNote')) + '</p>' +
      '</div>' +
      '<div class="wrap" style="display:grid;gap:10px;padding-bottom:22px">' +
        (sent
          // сёстры пишут на свой ник — так и подписываем кнопку
          ? '<button class="btn" data-go="' + tgLink + '">' + t(isSisters && c.sisters.tg ? 'writeSisters' : 'sentOpenChat') + '</button>'
          : '<button class="btn" data-done="tg">' + ICON.tg + t('sendTg') + '</button>') +
        '<button class="btn btn-ghost" data-act="close">' + t('close') + '</button>' +
      '</div>';
    $('#bookScroll').onclick = function (e) {
      if (!e.target.closest('[data-done]')) return;
      sendViaTg(text);
    };
  }

  /* Заявка уходит в Telegram уже готовым сообщением: остаётся выбрать чат и нажать «Отправить».
     Ссылку «сразу в чат с текстом» Telegram не поддерживает, поэтому открываем окно «Поделиться»;
     текст заодно копируем — если окно почему-то не откроется, его можно вставить руками. */
  function sendViaTg(text) {
    copyText(text);
    // адрес обязателен: без него t.me/share уводит на главную Telegram. Заодно Абдуллах видит, откуда заявка
    var home = /^https?:$/.test(location.protocol) ? location.origin + '/' : D.brand.channel;
    var url = 'https://t.me/share/url?url=' + encodeURIComponent(home) + '&text=' + encodeURIComponent(text);
    if (TG && TG.initData && TG.openTelegramLink && tgv('6.1')) { TG.openTelegramLink(url); return; }
    window.open(url, '_blank');                      // в браузере — новая вкладка, приложение остаётся открытым
  }

  function copyText(text) {
    try { if (navigator.clipboard) { navigator.clipboard.writeText(text); return; } } catch (e) {}
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  function openLink(url) {
    if (!url) return;
    if (TG && /^https:\/\/t\.me\//.test(url) && TG.openTelegramLink) { TG.openTelegramLink(url); return; }
    if (TG && TG.openLink) { TG.openLink(url); return; }
    window.open(url, '_blank');
  }

  /* --------------------------------------------------------- избранное */
  function toggleFav(id) {
    var i = state.fav.indexOf(id);
    if (i >= 0) state.fav.splice(i, 1); else state.fav.push(id);
    storeSet('mr_fav', state.fav.join(','));
    haptic('medium');
    $$('[data-fav="' + id + '"]').forEach(function (b) { b.classList.toggle('is-on', state.fav.indexOf(id) >= 0); });
    updateFavPip();
    if (state.screen === 'fav') renderFav();
  }
  function updateFavPip() {
    var n = visible().filter(function (ap) { return state.fav.indexOf(ap.id) >= 0; }).length;
    var pip = $('#favPip');
    pip.hidden = !n;
    pip.textContent = n;
  }
  function renderFav() {
    var list = visible().filter(function (ap) { return state.fav.indexOf(ap.id) >= 0; });
    $('#favCards').innerHTML = list.map(cardHTML).join('');
    $('#favEmpty').hidden = !!list.length;
    $('#favEmptyTitle').textContent = t('favEmpty');
    $('#favEmptyHint').textContent = t('favEmptyHint');
    window.Gallery.bind($('#favCards'));
  }

  /* ------------------------------------------------ районы (под картой) */
  function districtListHTML() {
    var counts = {};
    visible().forEach(function (ap) {
      if (ap.status === 'rented' || ap.status === 'draft') return;
      counts[ap.district] = (counts[ap.district] || 0) + 1;
    });
    return Object.keys(D.districts).filter(function (k) { return counts[k]; }).map(function (k) {
      var d = D.districts[k];
      return '<div class="dist-card" data-dist-go="' + k + '">' +
        '<div><div class="n">' + esc(L(d)) + '</div>' +
          '<div class="d">' + esc(L(d.note)) + '</div>' +
          '<div class="d" style="color:var(--green);margin-top:4px">' + t('toHaram') + ' ' + esc(L(d.haram)) + '</div>' +
        '</div>' +
        '<div class="cnt-b"><b class="num">' + counts[k] + '</b><span>' + nForm(counts[k], t('aptForms')) + '</span></div>' +
      '</div>';
    }).join('');
  }

  /* ------------------------------------------------------------ оферта */
  function renderOffer() {
    var o = D.offer;
    var tab = state.termsTab;
    $('#offerTitleEl').textContent = t('tabOffer');
    $$('#termsSeg [data-terms]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-terms') === tab); });
    $('#offerHousing').hidden = tab !== 'housing';
    $('#offerService').hidden = tab === 'housing';
    if (tab !== 'housing' && window.Services) $('#offerService').innerHTML = window.Services.termsHTML(tab);
    $('#offerIntro').textContent = L(o.intro);
    $('#offerVersion').textContent = t('offerUpdated') + ' ' + o.updated + ' · v' + o.version;
    $('#offerSections').innerHTML = o.sections.filter(function (s) { return !s.hidden; }).map(function (s, i) {
      return '<div class="acc' + (i === 0 ? ' is-open' : '') + '">' +
        '<button class="acc-head"><span class="ic">' + (SEC_ICON[s.icon] || ICON.doc) + '</span>' +
          '<span>' + esc(L(s.title)) + '</span><span class="arrow">' + ICON.chev + '</span></button>' +
        '<div class="acc-body"><ul>' + s.items.map(function (it) { return '<li>' + esc(L(it)) + '</li>'; }).join('') + '</ul></div></div>';
    }).join('');
    $('#casesTitleEl').textContent = L(o.cases.title);
    $('#casesList').innerHTML =
      '<p style="color:var(--ink-3);font-size:13px;margin-bottom:12px">' + esc(L(o.cases.note)) + '</p>' +
      o.cases.list.filter(function (c) { return !c.hidden; }).map(function (c) {
        return '<div class="case"><div class="case-q">' + esc(L(c.q)) + '</div><div class="case-a">' + esc(L(c.a)) + '</div></div>';
      }).join('');
    var cases = blockOn('offerCases') && o.cases.list.some(function (c) { return !c.hidden; });
    $('#casesTitleEl').hidden = !cases;
    $('#casesBox').hidden = !cases;
    $('#stepsTitleEl').hidden = $('#stepsList').hidden = !blockOn('offerSteps');
    $('.about').hidden = !blockOn('offerAbout');
    $('#contactTitleEl').hidden = $('#contactBox').hidden = !blockOn('offerContacts');
    $('#aboutTitleEl').textContent = t('aboutTitle');
    $('#aboutText').textContent = L(D.brand.about);
    $('#stepsTitleEl').textContent = t('stepsTitle');
    $('#stepsList').innerHTML = D.steps.map(function (s) { return '<div class="step"><span>' + esc(L(s)) + '</span></div>'; }).join('');
    var c = D.contacts;
    $('#contactTitleEl').textContent = t('contactTitle');
    $('#contactBox').innerHTML =
      (c.brothers.tg ? '<button class="btn" data-go="https://t.me/' + c.brothers.tg + '">' + ICON.tg + t('writeBrothers') + '</button>' : '') +
      (c.sisters.tg ? '<button class="btn btn-ghost" data-go="https://t.me/' + c.sisters.tg + '">' + ICON.tg + t('writeSisters') + '</button>' : '') +
      '<button class="btn btn-ghost" data-go="' + D.brand.channel + '">' + t('channelBtn') + '</button>' +
      '<p style="color:var(--ink-3);font-size:13px;text-align:center">' + esc(L(c.hours)) + '</p>';
  }

  /* ------------------------------------------------------------- экраны */
  var SCREENS = ['catalog', 'map', 'fav', 'visa', 'tours', 'cars', 'offer', 'admin'];
  var HOUSING = ['catalog', 'map', 'fav'];
  function switchScreen(name) {
    if (SCREENS.indexOf(name) < 0) name = 'catalog';
    state.screen = name;
    SCREENS.forEach(function (s) {
      $('#screen' + s.charAt(0).toUpperCase() + s.slice(1)).hidden = s !== name;
    });
    syncNav();
    if (name === 'fav') renderFav();
    if (name === 'map') renderMap();
    if (name === 'offer') renderOffer();
    if (name === 'admin' && window.AdminContent && state.isAdmin) window.AdminContent.render();
    if (window.Services) window.Services.render(name);
    window.scrollTo(0, 0);
    haptic('light');
  }
  /* нижние вкладки — разделы; «Квартиры» подсвечены и на карте, и в избранном */
  function syncNav() {
    var name = state.screen;
    var housing = HOUSING.indexOf(name) >= 0;
    document.body.classList.toggle('on-map', name === 'map');
    document.body.classList.toggle('on-admin', name === 'admin');
    $('#housingNav').hidden = !housing || $('#appbar').hidden;
    $('#tabbar').hidden = name === 'admin' || $('#appbar').hidden;
    $$('.tab').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-screen') === (housing ? 'catalog' : name)); });
    $$('#housingNav [data-screen]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-screen') === name); });
  }
  function openTerms(kind) {
    state.termsTab = ['housing', 'visa', 'tours', 'cars'].indexOf(kind) >= 0 ? kind : 'housing';
    switchScreen('offer');
  }

  function renderMap() {
    $('#mapHint').textContent = t('mapHint');
    if ($('#mapBadge')) $('#mapBadge').textContent = t('mapApprox');
    $('#mapAreasTitle').textContent = t('mapAreas');
    $('#districtList').innerHTML = districtListHTML();
    if (window.MapView) window.MapView.show();
  }

  /* ------------------------------------------------------ шторки и слои */
  function pushLayer(fn) { state.layers.push(fn); syncBack(); }
  function popLayer(fn) {
    var i = state.layers.lastIndexOf(fn);
    if (i >= 0) state.layers.splice(i, 1);
    syncBack();
  }
  function syncBack() {
    if (!(TG && TG.BackButton && TG.isVersionAtLeast && TG.isVersionAtLeast('6.1'))) return;
    if (state.layers.length) TG.BackButton.show(); else TG.BackButton.hide();
  }
  function closeTop() {
    var top = state.layers[state.layers.length - 1];
    if (top) top();
  }

  function openSheet(sel) {
    if (state.sheet && state.sheet !== sel) hideSheetNow(state.sheet);
    var sheet = $(sel);
    $('#sheetBack').hidden = false;
    sheet.hidden = false;
    void sheet.offsetWidth;                 // без пересчёта анимация не запустится
    $('#sheetBack').classList.add('is-open');
    sheet.classList.add('is-open');
    var sc = sheet.querySelector('.sheet-scroll');
    if (sc) sc.scrollTop = 0;
    if (state.sheet !== sel) pushLayer(closeSheet);
    state.sheet = sel;
    document.body.style.overflow = 'hidden';
  }
  function hideSheetNow(sel) {
    var sheet = $(sel);
    sheet.classList.remove('is-open');
    sheet.hidden = true;
  }
  function closeSheet() {
    if (!state.sheet) return;
    var sheet = $(state.sheet);
    sheet.classList.remove('is-open');
    $('#sheetBack').classList.remove('is-open');
    setTimeout(function () {
      if (!sheet.classList.contains('is-open')) sheet.hidden = true;
      if (!state.sheet) $('#sheetBack').hidden = true;
    }, 320);
    state.sheet = null;
    document.body.style.overflow = '';
    popLayer(closeSheet);
  }

  /* ---------------------------------------------------------- язык/тема */
  function setLang(lang) {
    state.lang = LANGS.indexOf(lang) >= 0 ? lang : 'ru';
    storeSet('mr_lang', state.lang);
    document.documentElement.lang = state.lang;
    $('#brandName').textContent = L(D.brand.name);
    $('#brandSub').textContent = L(D.brand.tagline);
    $$('[data-setlang]').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-setlang') === state.lang);
      b.setAttribute('aria-pressed', b.getAttribute('data-setlang') === state.lang);
    });
    $('#favTitleEl').textContent = t('favTitle');
    $$('[data-t]').forEach(function (el) { el.textContent = t(el.getAttribute('data-t')); });
    renderAll();
    if (state.screen !== 'catalog') switchScreen(state.screen);
    if (window.Admin && state.isAdmin) window.Admin.render();
  }

  function renderAll() {
    renderChips();
    renderCards();
    updateFavPip();
    if (state.screen === 'fav') renderFav();
    if (state.screen === 'map') renderMap();
    if (window.Services) window.Services.render(state.screen);
    if (window.Admin && state.isAdmin) window.Admin.render();
  }

  function applyTheme() {
    var dark = TG && TG.colorScheme ? TG.colorScheme === 'dark'
             : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.classList.toggle('theme-dark', !!dark);
    if (TG) {
      try {
        if (TG.isVersionAtLeast && TG.isVersionAtLeast('6.1')) {
          TG.setHeaderColor(dark ? '#14161a' : '#f4ece0');
          TG.setBackgroundColor(dark ? '#14161a' : '#f4ece0');
        }
      } catch (e) {}
    }
    if (window.MapView) window.MapView.theme();
  }

  /* -------------------------------------------------------------- клики */
  function bindGlobal() {
    document.addEventListener('click', function (e) {
      if (window.Gallery.handleClick(e)) return;
      if (window.Admin && state.isAdmin && window.Admin.handleClick(e)) return;
      if (window.AdminBiz && state.isAdmin && window.AdminBiz.handleClick(e)) return;
      if (window.AdminContent && state.isAdmin && window.AdminContent.handleClick(e)) return;
      if (window.Services && window.Services.handleClick(e)) return;

      var fav = e.target.closest('[data-fav]');
      if (fav) { e.stopPropagation(); toggleFav(fav.getAttribute('data-fav')); return; }

      var chip = e.target.closest('[data-dist]');
      if (chip) { state.filters.district = chip.getAttribute('data-dist'); haptic('light'); renderChips(); renderCards(); return; }
      if (e.target.closest('[data-open="filter"]')) { renderFilters(); openSheet('#sheetFilter'); return; }

      var distGo = e.target.closest('[data-dist-go]');
      if (distGo) { state.filters.district = distGo.getAttribute('data-dist-go'); switchScreen('catalog'); renderChips(); renderCards(); return; }

      var card = e.target.closest('.card');
      if (card) { openDetail(card.getAttribute('data-id')); return; }

      var tab = e.target.closest('.tab, #housingNav [data-screen]');
      if (tab) { switchScreen(tab.getAttribute('data-screen')); return; }
      var sg = e.target.closest('[data-screen-go]');
      if (sg) { switchScreen(sg.getAttribute('data-screen-go')); return; }

      var ts = e.target.closest('[data-terms]');
      if (ts) { state.termsTab = ts.getAttribute('data-terms'); haptic('light'); renderOffer(); return; }

      var acc = e.target.closest('.acc-head');
      if (acc) { acc.parentNode.classList.toggle('is-open'); haptic('light'); return; }

      var stOpt = e.target.closest('.st-opt');
      if (stOpt) {
        $$('.st-opt', stOpt.parentNode).forEach(function (b) { b.classList.toggle('is-on', b === stOpt); });
        haptic('light');
        return;
      }

      var go = e.target.closest('[data-go]');
      if (go) { openLink(go.getAttribute('data-go')); return; }

      var act = e.target.closest('[data-act]');
      if (act) {
        var kind = act.getAttribute('data-act');
        var ap = state.current;
        if (kind === 'book' || kind === 'wait') {
          closeSheet();
          setTimeout(function () { openBooking(ap, kind); }, 300);
        } else if (kind === 'ask') {
          openLink('https://t.me/' + D.contacts.brothers.tg);
        } else if (kind === 'close') {
          closeSheet();
        } else if (kind === 'show-on-map') {
          closeSheet();
          switchScreen('map');
          if (window.MapView) window.MapView.focus(ap.id);
        } else if (kind === 'admin-status') {
          saveQuickStatus();
        } else if (kind === 'admin-edit' && window.Admin) {
          closeSheet();
          setTimeout(function () { window.Admin.edit(ap.id); }, 300);
        }
        return;
      }

      if (e.target.id === 'sheetBack') closeSheet();
      if (e.target.id === 'filterApply') { renderChips(); renderCards(); closeSheet(); }
      if (e.target.id === 'filterReset') resetFilters();
      var lb = e.target.closest('[data-setlang]');
      if (lb && lb.getAttribute('data-setlang') !== state.lang) { haptic('light'); setLang(lb.getAttribute('data-setlang')); }
    });

    $$('.lang-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        setLang(b.getAttribute('data-lang'));
        state.langChosen = true;
        $('#langScreen').hidden = true;
        showApp();
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.layers.length && !document.querySelector('.lb.is-open')) closeTop();
    });
    if (TG && TG.BackButton && TG.isVersionAtLeast && TG.isVersionAtLeast('6.1')) TG.BackButton.onClick(closeTop);
    if (TG && TG.onEvent) TG.onEvent('themeChanged', applyTheme);
  }

  function guessLang() {
    var code = TG && TG.initDataUnsafe && TG.initDataUnsafe.user ? (TG.initDataUnsafe.user.language_code || '') : '';
    if (!code) code = (navigator.language || 'ru').slice(0, 2);
    code = code.toLowerCase().slice(0, 2);
    if (code === 'uz') return 'uz';
    if (['ru', 'uk', 'be', 'kk', 'ky', 'tg', 'tk', 'az'].indexOf(code) >= 0) return 'ru';
    return 'en';
  }

  function showApp() {
    $('#appbar').hidden = false;
    $('#screenCatalog').hidden = state.screen !== 'catalog';
    $('#tabbar').hidden = false;
    syncNav();
  }

  /* /admin для всех, кроме администратора: без админских скриптов и данных */
  function renderDenied() {
    var me = state.me;
    var inTg = !!(TG && TG.initData);
    $('#screenAdmin').innerHTML = '<div class="adm-denied">' +
      '<div class="adm-denied-ic">' + ICON.lock + '</div>' +
      '<h2>' + t('admDeniedTitle') + '</h2>' +
      '<p>' + t(!state.server ? 'admNoServer' : inTg ? 'admDeniedText' : 'admOpenInTg') + '</p>' +
      (me && me.id ? '<p class="adm-id">' + t('admYourId') + ': <b class="num">' + esc(me.id) + '</b></p>' : '') +
      '<button class="btn" data-screen-go="catalog">' + t('admToApp') + '</button>' +
    '</div>';
    switchScreen('admin');
  }
  function openAdminPage() {
    if (state.isAdmin && window.AdminContent) switchScreen('admin');
    else renderDenied();
  }

  /* заставка: ждём, пока вкладку реально покажут, и держим не меньше 3,5 с */
  function runIntro(afterIntro) {
    var intro = $('#intro');
    var started = false;
    function start() {
      if (started) return;
      started = true;
      intro.classList.add('is-live');
      setTimeout(function () {
        intro.classList.add('is-gone');
        setTimeout(function () { intro.hidden = true; afterIntro(); }, 600);
      }, 3800);
    }
    if (document.visibilityState === 'visible') start();
    else document.addEventListener('visibilitychange', function once() {
      if (document.visibilityState === 'visible') { document.removeEventListener('visibilitychange', once); start(); }
    });
    setTimeout(start, 1200);
  }

  /* ------------------------------------------------------ общее ядро */
  var MR = {
    D: D, state: state, api: api, ICON: ICON, sendViaTg: sendViaTg,
    t: t, tpl: tpl, L: L, esc: esc, money: money, word: word, nForm: nForm,
    haptic: haptic, hapticNotify: hapticNotify, alert: alertMsg,
    media: media, mediaCard: mediaCard, normalize: normalize,
    find: find, visible: visible, statusText: statusText, priceMain: priceMain,
    openDetail: openDetail, openSheet: openSheet, closeSheet: closeSheet,
    pushLayer: pushLayer, popLayer: popLayer, openLink: openLink,
    reload: loadCatalog, renderAll: renderAll, switchScreen: switchScreen, openTerms: openTerms,
    copyText: copyText, loadScript: loadScript,
    applyContent: applyContent, i18nDefault: I18N_DEFAULT, layout: layout, blockOn: blockOn, tabIds: TAB_IDS,
    relabel: function () { setLang(state.lang); },
    tg: TG
  };
  window.MR = MR;

  function init() {
    window.Gallery.init(MR);
    if (window.MapView) window.MapView.init(MR);
    if (window.Services) window.Services.init(MR);
    if (TG) {
      try {
        TG.ready();
        TG.expand();
        if (TG.disableVerticalSwipes && TG.isVersionAtLeast && TG.isVersionAtLeast('7.7')) TG.disableVerticalSwipes();
      } catch (e) {}
    }
    applyTheme();
    bindGlobal();

    // пока идёт заставка, узнаём, есть ли сервер, и подтягиваем свежий каталог
    var ready = detectServer().then(checkAdmin).then(loadCatalog).then(watchRev);

    storeGet('mr_fav', function (val) {
      state.fav = val ? val.split(',').filter(Boolean) : [];
      updateFavPip();
      storeGet('mr_lang', function (lang) {
        var known = LANGS.indexOf(lang) >= 0;
        setLang(known ? lang : guessLang());
        $('#introSub').textContent = L(D.brand.tagline);
        if (ADMIN_PATH) {                              // /admin — без заставки и выбора языка
          $('#intro').hidden = true;
          ready.then(function () { showApp(); openAdminPage(); });
          return;
        }
        runIntro(function () {
          if (known || state.langChosen) showApp();
          else $('#langScreen').hidden = false;
          ready.then(function () { if (window.Admin && state.isAdmin) window.Admin.afterStart(); });
        });
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

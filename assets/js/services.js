/* ==========================================================================
   Услуги Madinah Group: визы и икама, туры и зиярат, аренда машин.
   Экраны разделов, заявка по каждой услуге и отправка:
   с сервером — в бот (визы — сразу визовой компании), без сервера — готовым сообщением в Telegram.
   Контент — DATA.services в data.js (с сервером — из панели риелтора).
   ========================================================================== */
(function () {
  'use strict';

  var MR, t, L, esc;
  var hooks = [];                 // панель риелтора дорисовывает свои блоки после отрисовки
  var visaCat = 'all';

  var S = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  var I = {
    passport: '<svg viewBox="0 0 24 24" ' + S + '><rect x="5" y="2.8" width="14" height="18.4" rx="2.2"/><circle cx="12" cy="10.2" r="3.2"/><path d="M8.8 10.2h6.4M12 7v6.4M9 17h6"/></svg>',
    plane:    '<svg viewBox="0 0 24 24" ' + S + '><path d="M2.8 12.6 21 5.5l-3.3 13-5.4-4.1-3 3.4v-4.9L17.6 8"/></svg>',
    kaaba:    '<svg viewBox="0 0 24 24" ' + S + '><path d="M4 8.4 12 5l8 3.4v8.2L12 20l-8-3.4Z"/><path d="M4 8.4 12 12l8-3.6M12 12v8"/><path d="M4 11.3 12 15l8-3.7" stroke-width="2.4" stroke-opacity=".55"/></svg>',
    transit:  '<svg viewBox="0 0 24 24" ' + S + '><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/><path d="M2 5.5 5 3M22 5.5 19 3"/></svg>',
    family:   '<svg viewBox="0 0 24 24" ' + S + '><circle cx="8" cy="7" r="2.6"/><circle cx="16.5" cy="8" r="2.2"/><circle cx="12.5" cy="14" r="1.8"/><path d="M3.5 19c0-3 2-5 4.5-5 1.2 0 2.2.4 3 1.1M14 15.4c.7-.6 1.6-1 2.5-1 2.3 0 4 1.9 4 4.6M10.4 20c.2-1.6 1-2.6 2.1-2.6s1.9 1 2.1 2.6"/></svg>',
    briefcase:'<svg viewBox="0 0 24 24" ' + S + '><rect x="3" y="7" width="18" height="12.5" rx="2.5"/><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7M3 12.5h18M11 12.5v2h2v-2"/></svg>',
    work:     '<svg viewBox="0 0 24 24" ' + S + '><path d="M4 16.5a8 8 0 0 1 16 0"/><path d="M2.8 16.5h18.4v2.2H2.8zM10 8.9V5.5h4v3.4"/></svg>',
    student:  '<svg viewBox="0 0 24 24" ' + S + '><path d="m2.5 9.5 9.5-4.5 9.5 4.5-9.5 4.5Z"/><path d="M6.5 11.5v4.2c1.3 1.3 3.3 2 5.5 2s4.2-.7 5.5-2v-4.2M21.5 9.5v5"/></svg>',
    home:     '<svg viewBox="0 0 24 24" ' + S + '><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5M9.5 21v-6h5v6"/></svg>',
    idcard:   '<svg viewBox="0 0 24 24" ' + S + '><rect x="2.8" y="5" width="18.4" height="14" rx="2.4"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5.3 16c.4-1.5 1.7-2.4 3.2-2.4s2.8.9 3.2 2.4M14.5 10h4M14.5 13.5h3"/></svg>',
    transfer: '<svg viewBox="0 0 24 24" ' + S + '><path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/></svg>',
    reentry:  '<svg viewBox="0 0 24 24" ' + S + '><path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v4.5h-4.5"/></svg>',
    exit:     '<svg viewBox="0 0 24 24" ' + S + '><path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15"/></svg>',
    route:    '<svg viewBox="0 0 24 24" ' + S + '><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/></svg>',
    car:      '<svg viewBox="0 0 24 24" ' + S + '><path d="M3 16.5V13l2.2-5a2 2 0 0 1 1.8-1.2h10a2 2 0 0 1 1.8 1.2L21 13v3.5"/><path d="M3 13h18M3 16.5h18"/><circle cx="7.5" cy="16.8" r="1.9"/><circle cx="16.5" cy="16.8" r="1.9"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" ' + S + '><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    gear:     '<svg viewBox="0 0 24 24" ' + S + '><circle cx="6" cy="6" r="1.7"/><circle cx="12" cy="6" r="1.7"/><circle cx="18" cy="6" r="1.7"/><circle cx="6" cy="18" r="1.7"/><circle cx="12" cy="18" r="1.7"/><path d="M6 7.7v8.6M12 7.7v8.6M18 7.7V12H6"/></svg>',
    guide:    '<svg viewBox="0 0 24 24" ' + S + '><circle cx="10" cy="7" r="3"/><path d="M4.5 20c0-3.3 2.4-5.6 5.5-5.6 1.3 0 2.4.4 3.4 1"/><path d="M17 11v10M17 11.5h4l-1.2 1.8L21 15h-4"/></svg>',
    star:     '<svg viewBox="0 0 24 24" ' + S + '><path d="m12 3.5 2.5 5.3 5.7.7-4.2 4 1.1 5.7L12 16.4l-5.1 2.8 1.1-5.7-4.2-4 5.7-.7Z"/></svg>',
    h24:      '<svg viewBox="0 0 24 24" ' + S + '><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.2 1.9"/></svg>',
    right:    '<svg viewBox="0 0 24 24" ' + S + '><path d="m9 6 6 6-6 6"/></svg>'
  };
  /* восьмиконечная звезда (руб аль-хизб) — тот же узор, что в «Условиях» и в PDF для владельцев */
  var STAR = '<svg class="pattern" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 8 L58 34 L84 26 L76 50 L84 74 L58 66 L50 92 L42 66 L16 74 L24 50 L16 26 L42 34 Z" fill="none" stroke="currentColor" stroke-width="3"/></svg>';

  /* цвета машин: название на трёх языках и три тона для рисунка кузова */
  var COLORS = {
    black:  { ru: 'Чёрный', uz: 'Qora', en: 'Black', sw: '#141417', g: ['#56565f', '#1d1d22', '#09090b'] },
    white:  { ru: 'Белый', uz: 'Oq', en: 'White', sw: '#f4f4f1', g: ['#ffffff', '#e6e6e2', '#bdbdb7'] },
    silver: { ru: 'Серебристый', uz: 'Kumushrang', en: 'Silver', sw: '#c3c6cb', g: ['#f1f3f6', '#c3c6cb', '#868a90'] },
    grey:   { ru: 'Серый', uz: 'Kulrang', en: 'Grey', sw: '#6b6e74', g: ['#a2a5ab', '#6b6e74', '#3f4146'] },
    blue:   { ru: 'Синий', uz: 'Ko‘k', en: 'Blue', sw: '#1f3f73', g: ['#5577ad', '#1f3f73', '#10233f'] },
    red:    { ru: 'Красный', uz: 'Qizil', en: 'Red', sw: '#9e1b1b', g: ['#d45252', '#9e1b1b', '#560d0d'] },
    beige:  { ru: 'Бежевый', uz: 'Bej', en: 'Beige', sw: '#cdb893', g: ['#efe3c9', '#cdb893', '#98825a'] },
    brown:  { ru: 'Коричневый', uz: 'Jigarrang', en: 'Brown', sw: '#5b3b24', g: ['#8d6546', '#5b3b24', '#351f11'] },
    green:  { ru: 'Зелёный', uz: 'Yashil', en: 'Green', sw: '#1f5a3d', g: ['#53907a', '#1f5a3d', '#10331f'] }
  };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function SV() { return MR.D.services || {}; }
  function user() { return MR.tg && MR.tg.initDataUnsafe && MR.tg.initDataUnsafe.user ? MR.tg.initDataUnsafe.user : null; }
  function val(id) { var el = $('#' + id); return el ? el.value.trim() : ''; }

  function fmt(n, cur) {
    var num = MR.money(n);
    if (cur === 'USD') return MR.state.lang === 'en' ? '$' + num : num + ' $';
    return num + ' ' + t('riyal');
  }
  function perLabel(per) { return per === 'person' ? t('perPerson') : per === 'group' ? t('perGroup') : per === 'day' ? t('carPerDay') : ''; }
  function priceHTML(price, cur, per) {
    if (!price) return '<span class="svc-price is-ask">' + t('priceOnRequest') + '</span>';
    return '<span class="svc-price num"><b>' + fmt(price, cur) + '</b>' + (per ? ' <small>' + perLabel(per) + '</small>' : '') + '</span>';
  }

  /* даты — строки ГГГГ-ММ-ДД, «сегодня» — по времени Медины */
  function todayISO() { return new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10); }
  function addDays(d, n) { var x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
  function daysBetween(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); }
  function dm(d) { var p = String(d).split('-'); return p.length === 3 ? p[2] + '.' + p[1] : d; }
  function dmy(d) { var p = String(d).split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : d; }

  /* ------------------------------------------------------------ общие части */
  function hero(title, text, icon, badges) {
    return '<div class="svc-hero">' + STAR +
      '<span class="svc-hero-ic">' + I[icon] + '</span>' +
      '<h2>' + esc(title) + '</h2>' +
      '<p>' + esc(text) + '</p>' +
      '<div class="svc-badges">' + (badges || []).map(function (b) { return '<span class="svc-badge">' + MR.ICON.check + esc(b) + '</span>'; }).join('') +
        (MR.blockOn('badge247') ? '<span class="svc-badge is-24">' + I.h24 + esc(t('open247')) + '</span>' : '') + '</div>' +
    '</div>';
  }
  function termsLink(kind) {
    return '<button class="link-line svc-terms-link" data-svc-terms="' + kind + '">' + MR.ICON.doc + t('readTermsL') + '</button>';
  }
  function adminSlot(kind) { return MR.state.isAdmin ? '<div class="svc-admin" data-svc-admin="' + kind + '"></div>' : ''; }

  /* ------------------------------------------------------------ виза и икама */
  function visaTypes() {
    var v = SV().visa;
    return ((v && v.types) || []).filter(function (x) { return x.active !== false; });
  }
  function catOf(id) { var ty = visaTypes().filter(function (x) { return x.id === id; })[0]; return ty ? ty.cat : ''; }

  function renderVisa() {
    var v = SV().visa;
    var box = $('#screenVisa');
    if (!v || !box) return;
    var types = visaTypes();
    var cats = (v.cats || []).filter(function (c) { return types.some(function (x) { return x.cat === c.id; }); });
    if (visaCat !== 'all' && !cats.some(function (c) { return c.id === visaCat; })) visaCat = 'all';
    var shown = cats.filter(function (c) { return visaCat === 'all' || c.id === visaCat; });
    box.innerHTML =
      hero(t('visaTitle'), L(v.intro), 'passport', [t('partnerBadge')]) +
      adminSlot('visa') +
      '<div class="chips visa-chips">' +
        '<button class="chip' + (visaCat === 'all' ? ' is-on' : '') + '" data-visa-cat="all">' + t('visaAll') + '</button>' +
        cats.map(function (c) {
          var n = types.filter(function (x) { return x.cat === c.id; }).length;
          return '<button class="chip' + (visaCat === c.id ? ' is-on' : '') + '" data-visa-cat="' + c.id + '">' + esc(L(c.title)) + ' <span class="cnt">' + n + '</span></button>';
        }).join('') +
      '</div>' +
      shown.map(function (c) {
        return '<section class="visa-group' + (c.id === 'iqama' ? ' is-iqama' : '') + '">' +
          '<div class="visa-group-h"><b>' + esc(c.id === 'iqama' ? t('iqamaHead') : L(c.title)) + '</b>' +
            (c.note ? '<span>' + esc(L(c.note)) + '</span>' : '') + '</div>' +
          '<div class="visa-list">' + types.filter(function (x) { return x.cat === c.id; }).map(function (ty) {
            return '<button class="visa-row" data-svc-req="visa" data-item="' + esc(ty.id) + '">' +
              '<span class="svc-ic">' + (I[ty.icon] || I.passport) + '</span>' +
              '<span class="vr-t"><b>' + esc(L(ty.title)) + '</b><small>' + esc(L(ty.text)) + '</small></span>' +
              '<span class="vr-go">' + I.right + '</span>' +
            '</button>';
          }).join('') + '</div></section>';
      }).join('') +
      (MR.blockOn('visaPriceNote') ? '<div class="visa-price-note">' + I.star + '<span>' + t('visaPriceNote') + '</span></div>' : '') +
      ((v.docs || []).length && MR.blockOn('visaDocs') ? '<div class="svc-docs"><h3>' + t('visaDocs') + '</h3><ul>' +
        v.docs.map(function (d) { return '<li>' + MR.ICON.check + '<span>' + esc(L(d)) + '</span></li>'; }).join('') + '</ul>' +
        (v.docsNote ? '<p>' + esc(L(v.docsNote)) + '</p>' : '') + '</div>' : '') +
      termsLink('visa');
  }

  /* ------------------------------------------------------------------ туры */
  function renderTours() {
    var tr = SV().tours;
    var box = $('#screenTours');
    if (!tr || !box) return;
    box.innerHTML =
      hero(t('toursTitle'), L(tr.intro), 'route') +
      adminSlot('tours') +
      '<div class="svc-list">' + (tr.items || []).filter(function (it) { return !it.hidden; }).map(function (it) {
        var stops = it.stops || [];
        return '<article class="svc-card' + (it.image ? ' has-cover' : '') + '">' +
          (it.image ? '<div class="svc-cover"><img src="' + esc(MR.mediaCard(it.image)) + '" alt="" loading="lazy" onerror="this.onerror=null;this.src=\'' + esc(MR.media(it.image)) + '\'"></div>' : '') +
          '<div class="svc-head"><span class="svc-ic">' + (I[it.icon] || I.route) + '</span>' +
            '<div class="svc-head-t"><h3>' + esc(L(it.title)) + '</h3>' + priceHTML(it.price, 'SAR', it.per) + '</div></div>' +
          (it.guide || L(it.duration) ? '<div class="svc-tags">' +
            (it.guide ? '<span class="svc-tag">' + I.guide + t('withGuide') + '</span>' : '') +
            (L(it.duration) ? '<span class="svc-tag">' + MR.ICON.clock + esc(L(it.duration)) + '</span>' : '') + '</div>' : '') +
          '<p class="svc-text">' + esc(L(it.text)) + '</p>' +
          (stops.length ? '<div class="svc-sub">' + t('routeTitle') + '</div><ol class="route">' + stops.map(function (st) {
            return '<li><b>' + esc(L(st.title)) + '</b>' + (L(st.text) ? '<span>' + esc(L(st.text)) + '</span>' : '') + '</li>';
          }).join('') + '</ol>' : '') +
          ((it.includes || []).length ? '<div class="svc-sub">' + t('inPackage') + '</div><div class="svc-inc">' +
            it.includes.map(function (x) { return '<span>' + MR.ICON.check + esc(L(x)) + '</span>'; }).join('') + '</div>' : '') +
          (it.note ? '<p class="svc-note">' + esc(L(it.note)) + '</p>' : '') +
          '<button class="btn" data-svc-req="tour" data-item="' + esc(it.id) + '">' + (it.guide ? t('bookTour') : t('leaveRequest')) + '</button>' +
        '</article>';
      }).join('') + '</div>' +
      termsLink('tours');
  }

  /* ------------------------------------------------------------------ машины */
  function cars() {
    var c = SV().cars;
    return ((c && c.items) || []).filter(function (x) { return x.active !== false || MR.state.isAdmin; }).map(function (x) {
      return Object.assign({ photos: [], videos: [], seats: null, gear: 'auto', status: 'free', bookedUntil: '', busy: [] }, x);
    });
  }
  function carTitle(car) { return (car.name || '') + (car.year ? ' ' + car.year : ''); }
  /* занятые дни: брони по заявкам + ручной статус «забронирована до …» */
  function carRanges(car) {
    var out = (car.busy || []).filter(function (r) { return r && r.from && r.to; }).map(function (r) { return { from: r.from, to: r.to }; });
    if (car.status === 'booked') out.push({ from: todayISO(), to: car.bookedUntil || '9999-12-31', manual: true });
    return out.sort(function (a, b) { return a.from.localeCompare(b.from); });
  }
  function carNow(car) {
    var today = todayISO();
    var cur = carRanges(car).filter(function (r) { return r.from <= today && r.to >= today; })
      .sort(function (a, b) { return b.to.localeCompare(a.to); })[0];
    return cur ? { busy: true, until: cur.to === '9999-12-31' ? '' : cur.to } : { busy: false };
  }
  function carConflict(car, from, to) {
    if (!from) return null;
    var end = to && to > from ? to : from;
    return carRanges(car).filter(function (r) { return from <= r.to && end >= r.from; })[0] || null;
  }
  function rangeText(r) {
    if (r.to === '9999-12-31') return t('carBookedNowR');
    return r.from === r.to ? dm(r.from) : dm(r.from) + '–' + dm(r.to);
  }
  function carUpcoming(car) {
    var today = todayISO();
    return (car.busy || []).filter(function (r) { return r && r.to >= today; })
      .sort(function (a, b) { return a.from.localeCompare(b.from); }).slice(0, 3);
  }
  function statusBadge(car) {
    var now = carNow(car);
    return now.busy
      ? '<span class="badge booked">' + MR.ICON.lock + esc(now.until ? MR.tpl('carBookedUntil', { d: dm(now.until) }) : t('carBooked')) + '</span>'
      : '<span class="badge free"><i></i>' + esc(t('carFree')) + '</span>';
  }
  /* пока нет фото — рисунок кроссовера в цвете машины на фоне с восьмиконечной звездой */
  function carArt(car) {
    var col = COLORS[car.color] || COLORS.black;
    var g = 'cg' + String(car.id || 'x').replace(/[^\w]/g, '');
    return '<div class="car-art">' + STAR +
      '<svg class="car-svg" viewBox="0 0 400 190" aria-hidden="true"><defs>' +
        '<linearGradient id="' + g + 'b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col.g[0] + '"/><stop offset=".48" stop-color="' + col.g[1] + '"/><stop offset="1" stop-color="' + col.g[2] + '"/></linearGradient>' +
        '<linearGradient id="' + g + 'w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b8c8d6"/><stop offset="1" stop-color="#3e4c59"/></linearGradient>' +
      '</defs>' +
      /* кроссовер сбоку: высокий кузов, рейлинги на крыше, вертикальная корма */
      '<ellipse cx="200" cy="178" rx="172" ry="8" fill="rgba(0,0,0,.2)"/>' +
      '<path d="M186 51 L308 50 M196 51 L196 56 M298 50 L298 55" stroke="#c9ccd1" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M30 148 L28 118 Q29 106 42 103 L128 97 L166 62 Q172 56 182 56 L314 55 Q326 55 333 62 L356 90 Q365 99 367 110 L370 140 Q370 148 362 148 L334 148 A36 36 0 0 0 262 148 L136 148 A36 36 0 0 0 64 148 L36 148 Q30 148 30 148 Z" fill="url(#' + g + 'b)"/>' +
      '<path d="M138 96 L169 66 Q174 61 182 61 L228 61 L228 96 Z M234 61 L296 61 L296 96 L234 96 Z M302 61 L313 61 Q322 61 328 68 L348 94 L302 96 Z" fill="url(#' + g + 'w)"/>' +
      '<path d="M40 104 L364 104" stroke="rgba(255,255,255,.2)" stroke-width="2"/>' +
      '<path d="M231 60 L231 146 M160 98 L158 146" stroke="rgba(255,255,255,.13)" stroke-width="1.6"/>' +
      '<path d="M136 140 L262 140" stroke="rgba(255,255,255,.3)" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="M150 88 L162 84 L164 92 L152 94 Z" fill="' + col.g[2] + '"/>' +
      '<path d="M29 114 Q33 106 48 104 L56 111 Q42 114 30 118 Z" fill="#f4ead0"/>' +
      '<path d="M358 94 L366 104 L368 118 L359 113 Z" fill="#b8322a"/>' +
      [100, 298].map(function (x) {
        return '<circle cx="' + x + '" cy="150" r="29" fill="#0a0a0b"/><circle cx="' + x + '" cy="150" r="18" fill="#7b7e84"/>' +
          '<path d="M' + x + ' 150 L' + x + ' 133 M' + x + ' 150 L' + (x + 16.2) + ' 144.7 M' + x + ' 150 L' + (x + 10) + ' 163.8 M' + x + ' 150 L' + (x - 10) + ' 163.8 M' + x + ' 150 L' + (x - 16.2) + ' 144.7" stroke="#55585d" stroke-width="3"/>' +
          '<circle cx="' + x + '" cy="150" r="6" fill="#2a2b2f"/>';
      }).join('') +
      '</svg><span class="car-art-note">' + esc(t('carPhotoSoon')) + '</span></div>';
  }
  function carAdminBox(car) {
    var booked = car.status === 'booked';
    return '<div class="car-admin" data-car-admin="' + esc(car.id) + '">' +
      '<div class="st-seg">' +
        '<button class="st-opt st-free' + (booked ? '' : ' is-on') + '" data-car-st="free">' + t('carFree') + '</button>' +
        '<button class="st-opt st-booked' + (booked ? ' is-on' : '') + '" data-car-st="booked">' + t('carBooked') + '</button>' +
      '</div>' +
      '<div class="field"><label>' + t('carUntilL') + '</label><input type="date" class="car-until" value="' + esc(car.bookedUntil || '') + '"></div>' +
      '<div class="btn-row two">' +
        '<button class="btn" data-biz="car-st-save" data-id="' + esc(car.id) + '">' + t('adminSave') + '</button>' +
        '<button class="btn btn-ghost" data-biz="car-open" data-id="' + esc(car.id) + '">' + MR.ICON.edit + t('adminEdit') + '</button>' +
      '</div></div>';
  }
  function renderCars() {
    var c = SV().cars;
    var box = $('#screenCars');
    if (!c || !box) return;
    var list = cars();
    box.innerHTML =
      hero(t('carsTitle'), L(c.intro), 'car') +
      adminSlot('cars') +
      (list.length
        ? '<div class="svc-list">' + list.map(function (car) {
            var col = COLORS[car.color];
            var up = carUpcoming(car);
            // фото модели из интернета (не загруженные риелтором) — помечаем и подписываем автора
            var stock = !!car.credit && car.photos.some(function (p) { return !/^\/media\//.test(p); });
            return '<article class="svc-card svc-car' + (car.active === false ? ' is-off' : '') + '">' +
              '<div class="svc-car-media">' + (car.photos.length ? window.Gallery.stripHTML(car, true) : carArt(car)) + statusBadge(car) +
                (stock ? '<span class="car-stock">' + esc(t('carModelPhoto')) + '</span>' : '') + '</div>' +
              (stock ? '<button class="car-credit" data-go="' + esc(car.creditUrl || 'https://commons.wikimedia.org/') + '">' +
                esc(MR.tpl('carPhotoCredit', { a: car.credit })) + '</button>' : '') +
              '<div class="svc-head"><div class="svc-head-t"><h3>' + esc(carTitle(car)) + '</h3>' +
                priceHTML(car.pricePerDay, 'SAR', 'day') + '</div></div>' +
              '<div class="svc-tags">' +
                (col ? '<span class="svc-tag"><i class="sw" style="background:' + col.sw + '"></i>' + esc(L(col)) + '</span>' : '') +
                (car.trim ? '<span class="svc-tag is-trim">' + I.star + esc(car.trim) + '</span>' : '') +
                (car.seats ? '<span class="svc-tag">' + MR.ICON.people + car.seats + ' ' + MR.nForm(car.seats, t('seatForms')) + '</span>' : '') +
                '<span class="svc-tag">' + I.gear + (car.gear === 'manual' ? t('gearManual') : t('gearAuto')) + '</span>' +
                (car.deposit ? '<span class="svc-tag">' + t('carDeposit') + ' ' + fmt(car.deposit, 'SAR') + '</span>' : '') +
              '</div>' +
              (up.length ? '<div class="car-busy">' + I.calendar + '<span>' + esc(MR.tpl('carBusyDates', { r: up.map(rangeText).join(', ') })) + '</span></div>' : '') +
              (L(car.note) ? '<p class="svc-text">' + esc(L(car.note)) + '</p>' : '') +
              '<button class="btn" data-svc-req="car" data-item="' + esc(car.id) + '">' + I.calendar + t('carPickDates') + '</button>' +
              (MR.state.isAdmin ? carAdminBox(car) : '') +
            '</article>';
          }).join('') + '</div>' +
          '<div class="wrap"><button class="btn btn-ghost" data-svc-req="car" data-item="">' + t('carHelpPick') + '</button></div>'
        : '<div class="svc-empty">' +
            '<div class="svc-empty-ic">' + I.car + '</div>' +
            '<p>' + esc(L(c.emptyNote)) + '</p>' +
            '<button class="btn" data-svc-req="car" data-item="">' + t('leaveRequest') + '</button>' +
          '</div>') +
      transferHTML() +
      termsLink('cars');
    window.Gallery.bind(box);
  }

  /* Трансфер: встреча в аэропорту. Цену не показываем — она зависит от машины и времени. */
  function transferHTML() {
    if (!MR.blockOn('carsTransfer')) return '';
    return '<section class="svc-transfer">' +
      '<div class="svc-sep"><span>' + I.plane + '</span><h3>' + t('trfTitle') + '</h3></div>' +
      '<article class="svc-card">' +
        '<p class="svc-text">' + esc(t('trfText')) + '</p>' +
        '<ul class="trf-points">' + (t('trfPoints') || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
        '<button class="btn" data-svc-req="transfer" data-item="">' + I.calendar + t('trfBtn') + '</button>' +
      '</article></section>';
  }

  function render(name) {
    if (name === 'visa') renderVisa();
    else if (name === 'tours') renderTours();
    else if (name === 'cars') renderCars();
    else return;
    var root = $('#screen' + name.charAt(0).toUpperCase() + name.slice(1));
    hooks.forEach(function (fn) { try { fn(name, root); } catch (e) {} });
  }

  /* ----------------------------------------------------------- условия услуг */
  function termsHTML(kind) {
    var s = SV()[kind];
    if (!s) return '';
    var title = { visa: 'termsVisaTitle', tours: 'termsToursTitle', cars: 'termsCarsTitle' }[kind];
    var icon = { visa: I.passport, tours: I.route, cars: I.car }[kind];
    return '<div class="offer-hero">' + STAR + '<span>' + esc(L(s.intro)) + '</span></div>' +
      '<div class="acc is-open"><button class="acc-head"><span class="ic">' + icon + '</span><span>' + t(title) + '</span>' +
        '<span class="arrow">' + MR.ICON.chev + '</span></button>' +
        '<div class="acc-body"><ul>' + (s.terms || []).map(function (x) { return '<li>' + esc(L(x)) + '</li>'; }).join('') + '</ul></div></div>' +
      (kind === 'visa' && (s.docs || []).length ? '<div class="acc"><button class="acc-head"><span class="ic">' + MR.ICON.doc + '</span><span>' + t('visaDocs') + '</span>' +
        '<span class="arrow">' + MR.ICON.chev + '</span></button>' +
        '<div class="acc-body"><ul>' + s.docs.map(function (x) { return '<li>' + esc(L(x)) + '</li>'; }).join('') + '</ul></div></div>' : '');
  }

  /* ------------------------------------------------------------------ заявка */
  var COUNTRIES = {
    ru: ['Узбекистан', 'Россия', 'Казахстан', 'Таджикистан', 'Кыргызстан', 'Азербайджан', 'Туркменистан'],
    uz: ['O‘zbekiston', 'Rossiya', 'Qozog‘iston', 'Tojikiston', 'Qirg‘iziston', 'Ozarbayjon', 'Turkmaniston'],
    en: ['Uzbekistan', 'Russia', 'Kazakhstan', 'Tajikistan', 'Kyrgyzstan', 'Azerbaijan', 'Turkmenistan']
  };
  var TERMS = [[1, 'term1'], [3, 'term3'], [7, 'term7'], [30, 'term30']];

  function itemsOf(kind) {
    if (kind === 'visa') return visaTypes();
    if (kind === 'tour') return ((SV().tours && SV().tours.items) || []).filter(function (it) { return !it.hidden; });
    return cars();
  }
  function itemTitle(kind, it, lang) {
    if (!it) return kind === 'car' ? (lang === 'ru' ? 'подобрать' : t('carAny')) : '';
    return kind === 'car' ? carTitle(it) : (lang ? (it.title[lang] || it.title.ru || '') : L(it.title));
  }
  /* частые точки маршрута: подставляются в поле одним касанием */
  function places() {
    return ['trfPlaceMadAir', 'trfPlaceJedAir', 'trfPlaceHaram', 'trfPlaceMakkah', 'trfPlaceHome'].map(function (k) { return t(k); });
  }
  function chipsHTML(forId) {
    return '<div class="term-chips">' + places().map(function (p) {
      return '<button type="button" data-chip="' + esc(p) + '" data-chip-for="' + forId + '">' + esc(p) + '</button>';
    }).join('') + '</div>';
  }
  /* переключатель «да / нет» (багаж, дети, коляска) */
  function ynHTML(id, yes, no, cur) {
    return '<div class="seg seg-wrap" data-seg id="' + id + '">' +
      '<button data-v="yes" class="' + (cur === 'yes' ? 'is-on' : '') + '">' + esc(yes) + '</button>' +
      '<button data-v="no" class="' + (cur === 'no' ? 'is-on' : '') + '">' + esc(no) + '</button></div>';
  }
  function segVal(id) { var b = $('#' + id + ' .is-on'); return b ? b.getAttribute('data-v') : ''; }

  function segHTML(id, list, cur, labelFn) {
    return '<div class="seg seg-wrap" id="' + id + '">' + list.map(function (x) {
      return '<button data-v="' + esc(x.id) + '" class="' + (x.id === cur ? 'is-on' : '') + '">' + esc(labelFn(x)) + '</button>';
    }).join('') + '</div>';
  }
  function stepper(key, v) {
    return '<div class="stepper"><button data-rq-step="' + key + ':-1">−</button><b class="num" id="rq_' + key + '">' + v + '</b><button data-rq-step="' + key + ':1">+</button></div>';
  }
  function visaSelect(cur) {
    var v = SV().visa || {};
    var types = visaTypes();
    return '<select id="rqItem">' + (v.cats || []).map(function (c) {
      var list = types.filter(function (x) { return x.cat === c.id; });
      return list.length ? '<optgroup label="' + esc(L(c.title)) + '">' + list.map(function (x) {
        return '<option value="' + esc(x.id) + '"' + (x.id === cur ? ' selected' : '') + '>' + esc(L(x.title)) + '</option>';
      }).join('') + '</optgroup>' : '';
    }).join('') + '</select>';
  }

  function openRequest(kind, itemId) {
    var u = user();
    var name = u ? [u.first_name, u.last_name].filter(Boolean).join(' ') : '';
    var list = itemsOf(kind);
    var cur = list.filter(function (x) { return x.id === itemId; })[0] || (kind === 'car' ? null : list[0]);
    var svc = kind === 'visa' ? SV().visa : kind === 'tour' ? SV().tours : SV().cars;
    var f = { kind: kind, item: cur ? cur.id : '', people: 1, conflict: null };
    var iq = kind === 'visa' && cur && cur.cat === 'iqama';
    var title = kind === 'visa' ? (iq ? 'iqamaReqTitle' : 'visaReqTitle') : kind === 'tour' ? 'tourReqTitle' : kind === 'transfer' ? 'trfReqTitle' : 'carReqTitle';
    var today = todayISO();
    var pick = '', body = '';

    if (kind === 'visa') {
      pick = '<div class="field"><label for="rqItem">' + t('visaOrService') + '</label>' + visaSelect(f.item) +
        '<div class="rq-desc" id="rqDesc"></div></div>';
      body = '<div class="field" id="rqNameF"><label for="rqName">' + t('fioLabel') + ' *</label>' +
          '<input id="rqName" value="" placeholder="' + esc(t('fioPh')) + '" autocomplete="name" autocapitalize="characters">' +
          '<span class="hint">' + t('fioHint') + '</span></div>' +
        '<div class="ed-grid2"><div class="field" id="rqDateF"><label for="rqDate" id="rqDateL"></label><input id="rqDate" type="date" min="' + today + '"></div>' +
          '<div class="field"><label>' + t('bookPeople') + '</label>' + stepper('people', 1) + '</div></div>' +
        '<div class="field"><label for="rqCitizen">' + t('citizenship') + '</label>' +
          '<input id="rqCitizen" list="rqCountries" placeholder="' + esc(t('citizenshipPh')) + '" autocomplete="country-name">' +
          '<datalist id="rqCountries">' + (COUNTRIES[MR.state.lang] || COUNTRIES.ru).map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist></div>';
    } else if (kind === 'tour') {
      pick = '<div class="field"><label>' + t('tourPick') + '</label>' + segHTML('rqSeg', list, f.item, function (x) { return L(x.title); }) + '</div>';
      body = '<div class="ed-grid2"><div class="field"><label for="rqDate">' + t('tourDate') + '</label><input id="rqDate" type="date" min="' + today + '"></div>' +
          '<div class="field"><label>' + t('bookPeople') + '</label>' + stepper('people', 1) + '</div></div>' +
        '<div class="field"><label for="rqPickup">' + t('pickup') + '</label><input id="rqPickup" placeholder="' + esc(t('pickupPh')) + '"></div>';
    } else if (kind === 'transfer') {
      body = '<div class="ed-grid2">' +
          '<div class="field" id="rqDateF"><label for="rqDate">' + t('trfDate') + ' *</label><input id="rqDate" type="date" min="' + today + '"></div>' +
          '<div class="field" id="rqTimeF"><label for="rqTime">' + t('trfTime') + ' *</label><input id="rqTime" type="time"></div>' +
        '</div>' +
        '<div class="field" id="rqFromF"><label for="rqFrom">' + t('trfFrom') + ' *</label>' +
          '<input id="rqFrom" placeholder="' + esc(t('trfFromPh')) + '">' + chipsHTML('rqFrom') + '</div>' +
        '<div class="field" id="rqToF"><label for="rqTo">' + t('trfTo') + ' *</label>' +
          '<input id="rqTo" placeholder="' + esc(t('trfToPh')) + '">' + chipsHTML('rqTo') + '</div>' +
        '<div class="field"><label>' + t('trfPeople') + '</label>' + stepper('people', 1) + '</div>' +
        '<div class="field"><label>' + t('trfBags') + '</label>' + ynHTML('rqBags', t('trfBagsYes'), t('trfBagsNo'), 'yes') + '</div>' +
        '<div class="field"><label>' + t('trfKids') + '</label>' + ynHTML('rqKids', t('trfYes'), t('trfNo'), 'no') + '</div>' +
        '<div class="field"><label>' + t('trfChair') + '</label>' + ynHTML('rqChair', t('trfYes'), t('trfNo'), 'no') + '</div>';
    } else {
      if (list.length) {
        pick = '<div class="field"><label for="rqCar">' + t('carPick') + '</label><select id="rqCar">' +
          '<option value="">' + esc(t('carAny')) + '</option>' +
          list.map(function (x) {
            var now = carNow(x);
            return '<option value="' + esc(x.id) + '"' + (x.id === f.item ? ' selected' : '') + '>' + esc(carTitle(x)) + ' · ' +
              esc(now.busy ? (now.until ? MR.tpl('carBookedUntil', { d: dm(now.until) }) : t('carBooked')) : t('carFree')).toLowerCase() + '</option>';
          }).join('') + '</select></div>';
      }
      body = '<div class="ed-grid2"><div class="field"><label for="rqDate">' + t('carFrom') + '</label><input id="rqDate" type="date" min="' + today + '"></div>' +
          '<div class="field"><label for="rqDateTo">' + t('carTo') + '</label><input id="rqDateTo" type="date" min="' + today + '"></div></div>' +
        '<div class="field"><label>' + t('carTerm') + '</label><div class="term-chips" id="rqTerms">' +
          TERMS.map(function (x) { return '<button type="button" data-term="' + x[0] + '">' + t(x[1]) + '</button>'; }).join('') + '</div></div>' +
        '<div class="avail" id="rqAvail" hidden></div>' +
        '<div class="car-calc" id="rqCalc" hidden></div>' +
        '<div class="field"><label>' + t('carPassengers') + '</label>' + stepper('people', 1) + '</div>';
    }
    var notePh = { visa: 'visaNotePh', tour: 'tourNotePh', car: 'carNotePh', transfer: 'trfNotePh' }[kind];
    var nameField = kind === 'visa' ? '' :
      '<div class="field" id="rqNameF"><label for="rqName">' + t('bookName') + ' *</label>' +
        '<input id="rqName" value="' + esc(name) + '" placeholder="' + esc(t('bookNamePh')) + '" autocomplete="name"></div>';

    $('#bookScroll').innerHTML =
      '<div class="sheet-head"><h2 id="rqTitle">' + t(title) + '</h2>' +
        (kind === 'visa' ? '<div class="sub">' + t('partnerBadge') + '</div>' : '') + '</div>' +
      '<div class="wrap" style="display:grid;gap:14px;padding-bottom:10px">' +
        pick + body + nameField +
        '<div class="field" id="rqPhoneF"><label for="rqPhone">' + t('bookPhone') + (u ? '' : ' *') + '</label>' +
          '<input id="rqPhone" type="tel" inputmode="tel" placeholder="+998 / +966 / +7" autocomplete="tel">' +
          (u ? '<span class="hint">' + t('bookPhonePh') + '</span>' : '') + '</div>' +
        '<div class="field"><label for="rqNote">' + t('bookComment') + '</label><textarea id="rqNote" placeholder="' + esc(t(notePh)) + '"></textarea></div>' +
        '<div class="key-points"><h3>' + t('keyPointsTitle') + '</h3><ul>' +
          (kind === 'transfer' ? (t('trfPoints') || []).map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('')
            : (svc.terms || []).slice(0, 3).map(function (k) { return '<li>' + esc(L(k)) + '</li>'; }).join('')) +
        '</ul><button class="link-line" data-svc-terms="' + (kind === 'tour' ? 'tours' : kind === 'visa' ? 'visa' : 'cars') + '">' + MR.ICON.doc + t('readTermsL') + '</button></div>' +
        '<label class="check" id="rqAgreeBox"><input type="checkbox" id="rqAgree"><span>' + esc(kind === 'transfer' ? t('trfConsent') : L(svc.consent)) + '</span></label>' +
      '</div>';
    $('#bookCta').innerHTML = '<button class="btn" id="rqSend">' + t('send') + '</button>';

    var sc = $('#bookScroll');
    sc.onclick = function (e) {
      var b = e.target.closest('#rqSeg button[data-v]');
      if (b) {
        $$('#rqSeg button').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        f.item = b.getAttribute('data-v');
        MR.haptic('light');
        return;
      }
      var ch = e.target.closest('[data-chip]');
      if (ch) {                                            // точка маршрута одним касанием
        var inp = $('#' + ch.getAttribute('data-chip-for'));
        if (inp) inp.value = ch.getAttribute('data-chip');
        $$('[data-chip-for="' + ch.getAttribute('data-chip-for') + '"]').forEach(function (x) { x.classList.toggle('is-on', x === ch); });
        MR.haptic('light');
        return;
      }
      var yn = e.target.closest('.seg[data-seg] button');
      if (yn) {
        $$('button', yn.parentNode).forEach(function (x) { x.classList.toggle('is-on', x === yn); });
        MR.haptic('light');
        return;
      }
      var st = e.target.closest('[data-rq-step]');
      if (st) {
        var d = +st.getAttribute('data-rq-step').split(':')[1];
        f.people = Math.max(1, Math.min(kind === 'car' || kind === 'transfer' ? 15 : 30, f.people + d));
        $('#rq_people').textContent = f.people;
        MR.haptic('light');
        return;
      }
      var tb = e.target.closest('[data-term]');
      if (tb) {
        var from = val('rqDate') || today;
        $('#rqDate').value = from;
        $('#rqDateTo').value = addDays(from, +tb.getAttribute('data-term'));
        $$('#rqTerms button').forEach(function (x) { x.classList.toggle('is-on', x === tb); });
        MR.haptic('light');
        updateCar(f);
      }
    };
    if (kind === 'visa') {
      $('#rqItem').addEventListener('change', function (e) { f.item = e.target.value; updateVisa(f); });
      updateVisa(f);
    }
    if (kind === 'car') {
      var rc = $('#rqCar');
      if (rc) rc.addEventListener('change', function (e) { f.item = e.target.value; updateCar(f); });
      ['rqDate', 'rqDateTo'].forEach(function (id) {
        $('#' + id).addEventListener('change', function () {
          $$('#rqTerms button').forEach(function (x) { x.classList.remove('is-on'); });
          if (id === 'rqDate' && val('rqDate')) $('#rqDateTo').min = val('rqDate');
          updateCar(f);
        });
      });
      updateCar(f);
    }
    $('#rqSend').onclick = function () { submit(f); };
    MR.openSheet('#sheetBook');
  }

  /* описание выбранной визы, подпись даты и заголовок: для икамы — «когда нужно» */
  function updateVisa(f) {
    var ty = visaTypes().filter(function (x) { return x.id === f.item; })[0];
    var iq = ty && ty.cat === 'iqama';
    $('#rqDesc').innerHTML = ty ? '<span>' + esc(L(ty.text)) + '</span><b>' + t('visaPriceAsk') + '</b>' : '';
    $('#rqDateL').textContent = iq ? t('whenNeeded') : t('travelDate') + ' *';
    $('#rqTitle').textContent = t(iq ? 'iqamaReqTitle' : 'visaReqTitle');
  }

  /* машина: свободна ли на выбранные даты и сколько стоит */
  function updateCar(f) {
    var car = cars().filter(function (x) { return x.id === f.item; })[0];
    var box = $('#rqAvail'), calc = $('#rqCalc'), send = $('#rqSend');
    var from = val('rqDate'), to = val('rqDateTo');
    f.conflict = null;
    if (!car) { box.hidden = true; calc.hidden = true; if (send) send.disabled = false; return; }
    if (!from) {
      var now = carNow(car);
      box.hidden = !now.busy;
      if (now.busy) { box.className = 'avail no'; box.innerHTML = MR.ICON.lock + '<span>' + esc(now.until ? MR.tpl('carBookedUntil', { d: dm(now.until) }) : t('carBooked')) + ' — ' + esc(t('carPickLater')) + '</span>'; }
      calc.hidden = true;
      if (send) send.disabled = false;
      return;
    }
    var c = carConflict(car, from, to);
    f.conflict = c;
    box.hidden = false;
    box.className = 'avail ' + (c ? 'no' : 'ok');
    box.innerHTML = c ? MR.ICON.warn + '<span>' + esc(MR.tpl('carAvailNo', { r: rangeText(c) })) + '</span>'
                      : MR.ICON.check + '<span>' + esc(t('carAvailOk')) + '</span>';
    var days = to && to > from ? daysBetween(from, to) : 1;
    calc.hidden = false;
    calc.innerHTML = '<span>' + t('carCalc') + ' · ' + days + ' ' + MR.nForm(days, t('dayForms')) + '</span>' +
      (car.pricePerDay ? '<b class="num">' + fmt(days * car.pricePerDay, 'SAR') + '</b>' +
        '<small>' + days + ' × ' + fmt(car.pricePerDay, 'SAR') + (car.deposit ? ' · ' + MR.tpl('carCalcDeposit', { p: fmt(car.deposit, 'SAR') }) : '') + '</small>'
        : '<b>' + t('priceOnRequest') + '</b>');
    if (send) send.disabled = !!c;
  }

  function collect(f) {
    if (f.kind === 'car') f.item = val('rqCar');
    if (f.kind === 'visa') f.item = val('rqItem');
    var from = val('rqDate'), to = val('rqDateTo');
    return {
      kind: f.kind, item: f.item, people: f.people,
      name: val('rqName'), phone: val('rqPhone'), note: val('rqNote'),
      date: from, dateTo: to, citizenship: val('rqCitizen'), pickup: val('rqPickup'),
      time: val('rqTime'), from: val('rqFrom'), to: val('rqTo'),
      bags: segVal('rqBags') || 'yes', kids: segVal('rqKids') || 'no', chair: segVal('rqChair') || 'no',
      days: f.kind === 'car' && from ? (to && to > from ? daysBetween(from, to) : 1) : 0,
      lang: MR.state.lang
    };
  }

  /* готовая заявка по-русски — её читают Абдуллах и визовая компания */
  function requestText(r) {
    var u = user();
    var it = itemsOf(r.kind).filter(function (x) { return x.id === r.item; })[0];
    var iq = r.kind === 'visa' && it && it.cat === 'iqama';
    var head = r.kind === 'visa' ? (iq ? 'ЗАЯВКА ПО ИКАМЕ' : 'ЗАЯВКА НА ВИЗУ') : r.kind === 'tour' ? 'ЗАЯВКА НА ТУР'
      : r.kind === 'transfer' ? 'ЗАЯВКА НА ТРАНСФЕР' : 'ЗАЯВКА НА МАШИНУ';
    var terms = { visa: 'визу выдают власти КСА, Madinah Group за отказ и сроки не отвечает',
                  tour: 'маршрут, время и цена — по согласованию, форс-мажор — перенос',
                  car: 'осмотр при выдаче, штрафы и повреждения — за счёт арендатора' }[r.kind];
    var lines;
    if (r.kind === 'transfer') {
      lines = [
        head + ' · Madinah Group',
        '',
        'Прилёт: ' + dmy(r.date) + (r.time ? ' в ' + r.time : ''),
        'Откуда: ' + (r.from || '—'),
        'Куда: ' + (r.to || '—'),
        'Пассажиров: ' + r.people,
        'Багаж: ' + (r.bags === 'no' ? 'без багажа' : 'есть'),
        'Дети: ' + (r.kids === 'yes' ? 'есть' : 'нет'),
        'Инвалидная коляска: ' + (r.chair === 'yes' ? 'есть' : 'нет'),
        '',
        'Имя: ' + (r.name || '—'),
        'Телефон: ' + (r.phone || '—'),
        r.note ? 'Комментарий: ' + r.note : '',
        'Язык клиента: ' + r.lang.toUpperCase(),
        '',
        'Условия приняты: цена и машина — по согласованию, при задержке рейса водитель ждёт по договорённости',
        u ? 'Telegram: @' + (u.username || ('id' + u.id)) : ''
      ];
    } else if (r.kind === 'visa') {
      lines = [
        head + ' · Madinah Group',
        'Клиент от Абдуллаха (Madinah Group) · заявка от ' + dmy(todayISO()),
        '',
        'ФИО: ' + (r.name || '—'),
        (iq ? 'Услуга: ' : 'Виза: ') + itemTitle('visa', it, 'ru'),
        r.date ? (iq ? 'Когда нужно: ' : 'Дата поездки: ') + dmy(r.date) : '',
        'Цена: уточняйте (плавающая)',
        r.citizenship ? 'Гражданство: ' + r.citizenship : '',
        'Человек: ' + r.people,
        'Телефон: ' + (r.phone || '—'),
        r.note ? 'Комментарий: ' + r.note : '',
        'Язык клиента: ' + r.lang.toUpperCase(),
        '',
        'Условия приняты: ' + terms,
        u ? 'Telegram: @' + (u.username || ('id' + u.id)) : ''
      ];
    } else {
      var car = r.kind === 'car' ? it : null;
      lines = [
        head + ' · Madinah Group',
        '',
        ({ tour: 'Тур: ', car: 'Машина: ' }[r.kind]) + itemTitle(r.kind, it, 'ru'),
        r.kind === 'car' ? 'Пассажиров: ' + r.people : 'Человек: ' + r.people,
        r.date ? (r.kind === 'car' ? 'С: ' : 'Дата: ') + dmy(r.date) : '',
        r.dateTo ? 'По: ' + dmy(r.dateTo) : '',
        r.days ? 'Срок: ' + r.days + ' сут.' + (car && car.pricePerDay ? ' · ' + (r.days * car.pricePerDay) + ' риал' : '') : '',
        r.pickup ? 'Откуда забрать: ' + r.pickup : '',
        '',
        'Имя: ' + (r.name || '—'),
        'Телефон: ' + (r.phone || '—'),
        r.note ? 'Комментарий: ' + r.note : '',
        'Язык клиента: ' + r.lang.toUpperCase(),
        '',
        'Условия приняты: ' + terms,
        u ? 'Telegram: @' + (u.username || ('id' + u.id)) : ''
      ];
    }
    return lines.filter(function (x, i) { return x !== '' || (lines[i - 1] !== '' && i > 0); }).join('\n').replace(/\n+$/, '');
  }

  function submit(f) {
    var r = collect(f);
    var u = user();
    var iq = r.kind === 'visa' && catOf(r.item) === 'iqama';
    var nameOk = !!r.name, contactOk = !!(u || r.phone), agreeOk = $('#rqAgree').checked;
    var dateOk = !(r.kind === 'visa' && !iq && !r.date) && !(r.kind === 'transfer' && (!r.date || !r.time));
    var routeOk = r.kind !== 'transfer' || (r.from && r.to);
    if ($('#rqTimeF')) $('#rqTimeF').classList.toggle('err', r.kind === 'transfer' && !r.time);
    if ($('#rqFromF')) $('#rqFromF').classList.toggle('err', !routeOk);
    if ($('#rqToF')) $('#rqToF').classList.toggle('err', !routeOk);
    $('#rqNameF').classList.toggle('err', !nameOk);
    $('#rqPhoneF').classList.toggle('err', !contactOk);
    $('#rqAgreeBox').classList.toggle('err', !agreeOk);
    if ($('#rqDateF')) $('#rqDateF').classList.toggle('err', !dateOk);
    if (!nameOk || !dateOk || !routeOk || !contactOk || !agreeOk) {
      MR.hapticNotify('error');
      MR.alert(!nameOk ? t(r.kind === 'visa' ? 'fioErr' : 'nameErr')
        : !dateOk ? t(r.kind === 'transfer' ? 'trfDateErr' : 'dateErr')
        : !routeOk ? t('trfRouteErr') : !contactOk ? t('contactErr') : t('agreeErr'));
      return;
    }
    if (f.conflict) { MR.hapticNotify('error'); MR.alert(MR.tpl('carAvailNo', { r: rangeText(f.conflict) })); return; }
    var text = requestText(r);
    var btn = $('#rqSend');
    btn.disabled = true;
    btn.textContent = t('sending');
    if (!MR.state.server) { done(r, text, null); return; }
    r.text = text;
    MR.api.post('/api/request', r).then(function (res) { done(r, text, res); })
      .catch(function () { done(r, text, null); });
  }

  function done(r, text, res) {
    MR.hapticNotify('success');
    var sent = !!res;
    var toPartner = sent && res.routed === 'partner';
    var c = MR.D.contacts;
    var partner = (SV().visa && SV().visa.partner) || {};
    // без сервера заявку на визу отправляем компании, если Абдуллах вписал её контакты
    var usePartner = r.kind === 'visa' && partner.tg;
    var tg = usePartner ? partner.tg : c.brothers.tg;
    var tgLink = tg ? 'https://t.me/' + tg : MR.D.brand.channel;
    $('#bookCta').innerHTML = '';
    $('#bookScroll').innerHTML =
      '<div class="done">' +
        '<div class="ring">' + (sent ? MR.ICON.check : MR.ICON.tg) + '</div>' +
        '<h2>' + (toPartner ? t('sentPartnerTitle') : sent ? t('sentTitle') : t('sendFallback')) + '</h2>' +
        '<p>' + (toPartner ? t('sentPartnerText') : sent ? t('sentText') : t('sendFallbackNote')) + '</p>' +
      '</div>' +
      '<div class="wrap" style="display:grid;gap:10px;padding-bottom:22px">' +
        (sent
          ? (toPartner ? '' : '<button class="btn" data-go="https://t.me/' + c.brothers.tg + '">' + t('sentOpenChat') + '</button>')
          : '<button class="btn" data-rq-done="tg">' + MR.ICON.tg + t('sendTg') + '</button>') +
        '<button class="btn btn-ghost" data-act="close">' + t('close') + '</button>' +
      '</div>';
    $('#bookScroll').onclick = function (e) {
      if (!e.target.closest('[data-rq-done]')) return;
      MR.sendViaTg(text);
    };
  }

  /* --------------------------------------------------------------- клики */
  function handleClick(e) {
    var rq = e.target.closest('[data-svc-req]');
    if (rq) { MR.haptic('light'); openRequest(rq.getAttribute('data-svc-req'), rq.getAttribute('data-item')); return true; }
    var tl = e.target.closest('[data-svc-terms]');
    if (tl) { MR.closeSheet(); MR.openTerms(tl.getAttribute('data-svc-terms')); return true; }
    var vc = e.target.closest('[data-visa-cat]');
    if (vc) { visaCat = vc.getAttribute('data-visa-cat'); MR.haptic('light'); render('visa'); return true; }
    return false;
  }

  function find(id) { return cars().filter(function (c) { return c.id === id; })[0] || null; }

  window.Services = {
    init: function (core) { MR = core; t = core.t; L = core.L; esc = core.esc; },
    render: render,
    termsHTML: termsHTML,
    handleClick: handleClick,
    find: find,
    open: openRequest,
    onRender: function (fn) { hooks.push(fn); },
    icons: I,
    colors: COLORS,
    carTitle: carTitle
  };
})();

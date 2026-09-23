/* ==========================================================================
   Админ-панель /admin: всё, что видит клиент, правится здесь —
   тексты и кнопки, бренд и контакты, условия и шаги, районы, тексты услуг,
   разделы и порядок, логотип и эмблема; квартиры, машины, услуги, отчёт.

   Файл грузится только после того, как сервер подтвердил администратора
   (подпись Telegram initData + ADMIN_TELEGRAM_ID). Каждое сохранение идёт
   в /api/admin/*, где сервер проверяет это заново, — подменить флаг в браузере
   бесполезно.
   ========================================================================== */
(function () {
  'use strict';

  var MR, t, L, esc;
  var LANGS = ['ru', 'uz', 'en'];
  var draft = null;             // рабочая копия открытого раздела
  var mode = '';                // какой редактор открыт
  var i18nDraft = null;         // правки надписей (накапливаются между группами)
  var i18nView = { group: 'tabs', q: '' };
  var openKey = '';             // какой из раскрывающихся блоков оставить открытым после перестройки

  var IC = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5M9.5 21v-6h5v6"/></svg>',
    tune: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/></svg>',
    text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 6V4.5h14V6M12 4.5v15M9 19.5h6"/></svg>',
    car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 16.5V13l2.2-5a2 2 0 0 1 1.8-1.2h10a2 2 0 0 1 1.8 1.2L21 13v3.5"/><path d="M3 13h18M3 16.5h18"/><circle cx="7.5" cy="16.8" r="1.9"/><circle cx="16.5" cy="16.8" r="1.9"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2.8" y="5" width="18.4" height="14" rx="2.4"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5.3 16c.4-1.5 1.7-2.4 3.2-2.4s2.8.9 3.2 2.4M14.5 10h4M14.5 13.5h3"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h4"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    words: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 5h9M8.5 5v14M14 11h6M17 11v8"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 13 9 5 9-5"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5.5-5.5L6 19.5"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    tg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.6 4.3 2.9 11.4c-1 .4-1 1.7 0 2l4.7 1.5 1.8 5.5c.3.8 1.3 1 1.9.4l2.6-2.5 4.7 3.5c.7.5 1.7.1 1.9-.8l3-14.6c.2-1-.8-1.8-1.9-1.1Z"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M9.5 13h5M9.5 16.5h3"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 10 6 6 6-6"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 4l16 16M9.9 5.8A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.8M6.5 7.6A16.6 16.6 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4-.9"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>'
  };
  var OFFER_ICONS = ['handshake', 'people', 'wallet', 'home', 'force', 'key', 'doc'];

  /* ------------------------------------------------------------ утилиты */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function clone(o) { return JSON.parse(JSON.stringify(o == null ? null : o)); }
  function toast(msg) {
    var el = document.createElement('div');
    el.className = 'ed-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2700);
  }
  function confirmBox(text) {
    return new Promise(function (res) {
      var tg = MR.tg;
      if (tg && tg.showConfirm && tg.isVersionAtLeast && tg.isVersionAtLeast('6.2')) tg.showConfirm(text, function (ok) { res(!!ok); });
      else res(window.confirm(text));
    });
  }
  function head(title, sub) {
    return '<div class="sheet-head"><h2>' + esc(title) + '</h2>' + (sub ? '<div class="sub">' + esc(sub) + '</div>' : '') + '</div>';
  }
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function field(id, label, value, attrs) {
    return '<div class="field"><label for="' + id + '">' + esc(label) + '</label><input id="' + id + '" value="' + esc(value == null ? '' : value) + '"' + (attrs || '') + '></div>';
  }
  function check(id, label, on) {
    return '<label class="check"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span>' + esc(label) + '</span></label>';
  }

  /* поле на трёх языках: RU · UZ · EN */
  function ml(id, label, obj, opts) {
    opts = opts || {};
    return '<div class="field ml-field"><label>' + esc(label) + '</label>' + LANGS.map(function (l) {
      var v = obj && obj[l] ? obj[l] : '';
      return '<div class="ml-row"><span class="ml-tag">' + l.toUpperCase() + '</span>' +
        (opts.area ? '<textarea id="' + id + '_' + l + '" rows="' + (opts.rows || 3) + '">' + esc(v) + '</textarea>'
                   : '<input id="' + id + '_' + l + '" value="' + esc(v) + '">') + '</div>';
    }).join('') + '</div>';
  }
  function mlRead(id) {
    var o = {};
    LANGS.forEach(function (l) { var v = val(id + '_' + l); if (v) o[l] = v; });
    return o;
  }
  /* список пунктов: по одному на строку, строки RU/UZ/EN совпадают по номеру */
  function lines(id, label, list, hint) {
    var n = Math.max(3, (list || []).length + 1);
    return '<div class="field ml-field"><label>' + esc(label) + '</label>' + (hint ? '<span class="hint">' + esc(hint) + '</span>' : '') +
      LANGS.map(function (l) {
        return '<div class="ml-row"><span class="ml-tag">' + l.toUpperCase() + '</span><textarea id="' + id + '_' + l + '" data-lines="1" rows="' + n + '">' +
          esc((list || []).map(function (x) { return (x && x[l]) || ''; }).join('\n')) + '</textarea></div>';
      }).join('') + '</div>';
  }
  function linesRead(id) {
    var rows = {};
    LANGS.forEach(function (l) {
      var el = document.getElementById(id + '_' + l);
      rows[l] = el ? el.value.split('\n').map(function (x) { return x.trim(); }) : [];
    });
    var out = [];
    rows.ru.forEach(function (ru, i) {
      if (!ru) return;
      var o = { ru: ru };
      if (rows.uz[i]) o.uz = rows.uz[i];
      if (rows.en[i]) o.en = rows.en[i];
      out.push(o);
    });
    return out;
  }
  /* строка управления элементом списка: ↑ ↓ показать/скрыть удалить */
  function tools(list, i, opts) {
    opts = opts || {};
    return '<div class="ac-tools">' +
      '<button type="button" data-ac="' + list + '-up" data-i="' + i + '" aria-label="↑">' + IC.up + '</button>' +
      '<button type="button" data-ac="' + list + '-down" data-i="' + i + '" aria-label="↓">' + IC.down + '</button>' +
      (opts.hide ? '<button type="button" data-ac="' + list + '-hide" data-i="' + i + '" class="' + (opts.hidden ? 'is-off' : '') + '" aria-label="👁">' + (opts.hidden ? IC.eyeOff : IC.eye) + '</button>' : '') +
      (opts.del ? '<button type="button" data-ac="' + list + '-del" data-i="' + i + '" class="del" aria-label="×">' + IC.x + '</button>' : '') +
    '</div>';
  }
  function move(listArr, i, d) {
    var j = i + d;
    if (j < 0 || j >= listArr.length) return;
    var x = listArr[i]; listArr[i] = listArr[j]; listArr[j] = x;
  }
  function details(key, summary, body, extraClass) {
    return '<details class="ac-item' + (extraClass ? ' ' + extraClass : '') + '" data-key="' + esc(key) + '"' + (openKey === key ? ' open' : '') + '>' +
      '<summary>' + summary + '</summary><div class="ac-body">' + body + '</div></details>';
  }
  function cta(saveLabel) {
    $('#adminCta').innerHTML = '<button class="btn" data-ac="save">' + esc(saveLabel || t('acSave')) + '</button>' +
      '<button class="btn btn-ghost" data-ac="translate">' + esc(t('acTranslate')) + '</button>';
  }
  function busy(on) { $$('#adminCta .btn').forEach(function (b) { b.disabled = on; }); }

  /* ------------------------------------------------------------ панель */
  var TILES = [
    ['apartments', 'home', 'acApartments', 'acApartmentsSub'],
    ['cars', 'car', 'acCars', 'acCarsSub'],
    ['services', 'tune', 'acServices', 'acServicesSub'],
    ['svctexts', 'text', 'acSvcTexts', 'acSvcTextsSub'],
    ['brand', 'card', 'acBrand', 'acBrandSub'],
    ['offer', 'doc', 'acOffer', 'acOfferSub'],
    ['i18n', 'words', 'acTexts', 'acTextsSub'],
    ['layout', 'layers', 'acLayout', 'acLayoutSub'],
    ['images', 'image', 'acImages', 'acImagesSub'],
    ['districts', 'pin', 'acDistricts', 'acDistrictsSub'],
    ['report', 'chart', 'adminReport', 'acReportSub'],
    ['partner', 'tg', 'partnerTitle', 'acPartnerSub'],
    ['pdf', 'pdf', 'adminOwnerPdf', 'acPdfSub']
  ];
  function render() {
    var box = $('#screenAdmin');
    if (!box) return;
    var items = MR.state.items;
    var cars = ((MR.D.services && MR.D.services.cars && MR.D.services.cars.items) || []).length;
    var u = MR.tg && MR.tg.initDataUnsafe && MR.tg.initDataUnsafe.user;
    var me = MR.state.me || {};
    var who = u ? [u.first_name, u.last_name].filter(Boolean).join(' ') + (u.username ? ' (@' + u.username + ')' : '') : 'Dev';
    var logo = (MR.D.images && MR.D.images.logo) ? MR.media(MR.D.images.logo) : 'assets/img/emblem-192.webp';
    var stat = function (n, label) { return '<div class="adm-stat"><b class="num">' + n + '</b><span>' + esc(label) + '</span></div>'; };
    box.innerHTML =
      '<div class="adm-head"><img class="adm-logo" src="' + esc(logo) + '" alt="">' +
        '<div><h1>' + esc(t('acTitle')) + '</h1><p>' + esc(who) + (me.id ? ' · ID ' + esc(me.id) : '') + '</p></div></div>' +
      '<div class="adm-stats">' +
        stat(items.length, t('acStatApts')) +
        stat(items.filter(function (a) { return a.status === 'free'; }).length, t('acStatFree')) +
        stat(items.filter(function (a) { return a.status === 'draft'; }).length, t('adminCntDrafts')) +
        stat(cars, t('svcCars')) +
      '</div>' +
      '<div class="adm-grid">' + TILES.map(function (x) {
        return '<button class="adm-tile" data-ac="open" data-what="' + x[0] + '"><span class="adm-tile-ic">' + IC[x[1]] + '</span>' +
          '<b>' + esc(t(x[2])) + '</b><small>' + esc(t(x[3])) + '</small></button>';
      }).join('') + '</div>' +
      '<div class="adm-foot"><p>' + esc(t('acLiveNote')) + '</p>' +
        '<button class="btn btn-ghost" data-screen-go="catalog">' + esc(t('admToApp')) + '</button></div>';
  }

  function open(what) {
    openKey = '';
    if (what === 'apartments') return openApartments();
    if (what === 'cars') return openCars();
    if (what === 'services') return window.AdminBiz && window.AdminBiz.openServices();
    if (what === 'svctexts') return openSvcTexts();
    if (what === 'brand') return openBrand();
    if (what === 'offer') return openOffer();
    if (what === 'i18n') return openI18n();
    if (what === 'layout') return openLayout();
    if (what === 'images') return openImages();
    if (what === 'districts') return openDistricts();
    if (what === 'report') return window.AdminBiz && window.AdminBiz.openReport();
    if (what === 'partner') { MR.switchScreen('visa'); return; }
    if (what === 'pdf') return window.AdminBiz && window.AdminBiz.openOwner();
  }
  function sheet(html, withCta) {
    $('#adminScroll').innerHTML = html;
    if (withCta) cta(); else $('#adminCta').innerHTML = '';
    MR.openSheet('#sheetAdmin');
  }
  function after(res) {
    if (res && res.content) MR.applyContent(res.content);
    MR.hapticNotify('success');
    toast(t('acSaved'));
    render();
  }
  function fail(e) { busy(false); MR.hapticNotify('error'); MR.alert(t('adminErr') + ': ' + (e && e.message ? e.message : e)); }
  function postContent(section, data) { return MR.api.post('/api/admin/content', { section: section, data: data }); }

  /* ------------------------------------------------------------ квартиры */
  function openApartments() {
    mode = 'apartments';
    var list = MR.state.items.slice().sort(function (a, b) { return (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || (a.code || '').localeCompare(b.code || ''); });
    sheet(head(t('acApartments'), t('acApartmentsSub')) +
      '<div class="wrap" style="display:grid;gap:8px;padding-bottom:14px">' +
        '<button class="btn" data-adm="new">' + esc(t('acaAdd')) + '</button>' +
        list.map(function (a) {
          return '<div class="ac-row">' +
            '<button class="ac-row-main" data-ac="apt-edit" data-id="' + esc(a.id) + '">' +
              '<span class="badge-mini st-' + a.status + '">' + esc(MR.statusText(a)) + '</span>' +
              '<b>' + esc((a.code ? a.code + ' · ' : '') + L(a.title)) + '</b>' +
              '<small>' + esc(L(MR.D.districts[a.district] || {})) + (a.pin ? ' · 📌 ' + t('acaPinned') : '') + '</small>' +
            '</button></div>';
        }).join('') +
      '</div>', false);
  }

  /* ------------------------------------------------------------ машины */
  function openCars() {
    mode = 'cars';
    var list = (MR.D.services && MR.D.services.cars && MR.D.services.cars.items) || [];
    sheet(head(t('acCars'), t('acCarsSub')) +
      '<div class="wrap" style="display:grid;gap:8px;padding-bottom:14px">' +
        '<button class="btn" data-biz="car-new-direct">' + esc(t('svcAddCar')) + '</button>' +
        list.map(function (c) {
          var title = window.Services ? window.Services.carTitle(c) : c.name;
          var booked = c.status === 'booked';
          return '<div class="ac-row"><button class="ac-row-main" data-biz="car-open" data-id="' + esc(c.id) + '">' +
            '<span class="badge-mini st-' + (booked ? 'booked' : 'free') + '">' + esc(booked ? t('carBooked') : t('carFree')) + '</span>' +
            '<b>' + esc(title) + '</b><small>' + (c.photos || []).length + ' 📷' + (c.active === false ? ' · ⏸' : '') + '</small></button></div>';
        }).join('') +
      '</div>', false);
  }

  /* ------------------------------------------------------------ бренд и контакты */
  function openBrand() {
    mode = 'brand';
    draft = { brand: clone(MR.D.brand), contacts: clone(MR.D.contacts) };
    var b = draft.brand, c = draft.contacts;
    var person = function (key, title) {
      var p = c[key] || {};
      return '<div class="ed-sec"><h3>' + esc(title) + '</h3>' +
        field('cn_' + key + '_tg', t('acbTg'), p.tg, ' placeholder="RakhimovAbdullah" autocapitalize="off"') +
        '<div class="ed-grid2">' + field('cn_' + key + '_phone', t('acbPhone'), p.phone, ' type="tel" placeholder="+966..."') +
          '</div></div>';
    };
    sheet(head(t('acBrand'), t('acLiveNote')) +
      '<div class="ed-sec"><h3>' + esc(t('acBrand')) + '</h3>' +
        ml('bName', t('acbName'), b.name) + ml('bTag', t('acbTagline'), b.tagline) + ml('bRealtor', t('acbRealtor'), b.realtor) +
        ml('bAbout', t('acbAbout'), b.about, { area: true, rows: 4 }) + '</div>' +
      '<div class="ed-sec"><h3>' + esc(t('acbLinks')) + '</h3>' +
        field('bChannel', t('acbChannel'), b.channel, ' type="url" placeholder="https://t.me/..."') +
        field('bChannelName', t('acbChannelName'), b.channelName, ' placeholder="@madinah_rent"') +
        field('bInsta', t('acbInsta'), c.instagram, ' type="url" placeholder="https://instagram.com/..."') + '</div>' +
      person('brothers', t('acbBrothers')) + person('sisters', t('acbSisters')) +
      '<div class="ed-sec">' + ml('bHours', t('acbHours'), c.hours) + '</div>', true);
  }
  function saveBrand() {
    var b = {
      name: mlRead('bName'), tagline: mlRead('bTag'), realtor: mlRead('bRealtor'), about: mlRead('bAbout'),
      channel: val('bChannel'), channelName: val('bChannelName')
    };
    var person = function (key) { return { tg: val('cn_' + key + '_tg'), phone: val('cn_' + key + '_phone'), wa: '' }; };
    var c = { brothers: person('brothers'), sisters: person('sisters'), instagram: val('bInsta'), hours: mlRead('bHours') };
    busy(true);
    return postContent('brand', b).then(function () { return postContent('contacts', c); }).then(function (res) {
      after(res);
      openBrand();
    }).catch(fail);
  }

  /* ------------------------------------------------------------ условия и шаги */
  function openOffer() {
    mode = 'offer';
    draft = { offer: clone(MR.D.offer), steps: clone(MR.D.steps) };
    drawOffer();
    MR.openSheet('#sheetAdmin');
  }
  function drawOffer() {
    var o = draft.offer;
    o.cases = o.cases || { title: {}, note: {}, list: [] };
    $('#adminScroll').innerHTML = head(t('acOffer'), t('acLiveNote')) +
      '<div class="ed-sec"><div class="ed-grid2">' + field('oVer', t('acoVersion'), o.version) +
        '<div class="field"><label>' + esc(t('offerUpdated')) + '</label><input value="' + esc(o.updated || '') + '" disabled></div></div>' +
        ml('oIntro', t('acoIntro'), o.intro, { area: true, rows: 4 }) + '</div>' +
      '<div class="ed-sec"><h3>' + esc(t('acoSections')) + '</h3>' +
        (o.sections || []).map(function (sct, i) {
          return details('sec' + i, '<span class="ac-sum">' + esc(L(sct.title) || '—') + (sct.hidden ? ' <em>' + esc(t('acHiddenMark')) + '</em>' : '') + '</span>' +
            tools('sec', i, { hide: true, hidden: sct.hidden, del: true }),
            ml('oS' + i + 't', t('acoSectionTitle'), sct.title) +
            '<div class="field"><label>' + esc(t('acoIcon')) + '</label><select id="oS' + i + 'i">' + OFFER_ICONS.map(function (k) {
              return '<option value="' + k + '"' + (sct.icon === k ? ' selected' : '') + '>' + k + '</option>';
            }).join('') + '</select></div>' +
            lines('oS' + i + 'l', t('acoItems'), sct.items), sct.hidden ? 'is-hidden' : '');
        }).join('') +
        '<button class="btn btn-ghost" data-ac="sec-add">' + esc(t('acoAddSection')) + '</button></div>' +
      '<div class="ed-sec"><h3>' + esc(t('acoCases')) + '</h3>' +
        ml('oCt', t('acoCasesTitle'), o.cases.title) + ml('oCn', t('acoCasesNote'), o.cases.note) +
        (o.cases.list || []).map(function (c, i) {
          return details('case' + i, '<span class="ac-sum">' + esc(L(c.q) || '—') + (c.hidden ? ' <em>' + esc(t('acHiddenMark')) + '</em>' : '') + '</span>' +
            tools('case', i, { hide: true, hidden: c.hidden, del: true }),
            ml('oQ' + i, t('acoQ'), c.q) + ml('oA' + i, t('acoA'), c.a, { area: true, rows: 3 }), c.hidden ? 'is-hidden' : '');
        }).join('') +
        '<button class="btn btn-ghost" data-ac="case-add">' + esc(t('acoAddCase')) + '</button></div>' +
      '<div class="ed-sec">' + lines('oKp', t('acoKeyPoints'), o.keyPoints) + ml('oCons', t('acoConsent'), o.consent, { area: true, rows: 3 }) + '</div>' +
      '<div class="ed-sec">' + lines('oSteps', t('acoSteps'), draft.steps) + '</div>';
    cta();
  }
  function readOffer() {
    var o = draft.offer;
    o.version = val('oVer') || o.version;
    o.intro = mlRead('oIntro');
    (o.sections || []).forEach(function (sct, i) {
      if (!document.getElementById('oS' + i + 't_ru')) return;
      sct.title = mlRead('oS' + i + 't');
      sct.icon = val('oS' + i + 'i') || sct.icon;
      sct.items = linesRead('oS' + i + 'l');
    });
    o.cases.title = mlRead('oCt');
    o.cases.note = mlRead('oCn');
    (o.cases.list || []).forEach(function (c, i) {
      if (!document.getElementById('oQ' + i + '_ru')) return;
      c.q = mlRead('oQ' + i);
      c.a = mlRead('oA' + i);
    });
    o.keyPoints = linesRead('oKp');
    o.consent = mlRead('oCons');
    draft.steps = linesRead('oSteps');
  }
  function saveOffer() {
    readOffer();
    busy(true);
    return postContent('offer', draft.offer).then(function () { return postContent('steps', draft.steps); }).then(function (res) {
      after(res);
      openOffer();
    }).catch(fail);
  }

  /* ------------------------------------------------------------ тексты услуг */
  function openSvcTexts() {
    mode = 'svctexts';
    draft = clone(MR.D.services || {});
    drawSvcTexts();
    MR.openSheet('#sheetAdmin');
  }
  function drawSvcTexts() {
    var v = draft.visa || {}, tr = draft.tours || {}, cr = draft.cars || {};
    $('#adminScroll').innerHTML = head(t('acSvcTexts'), t('acLiveNote')) +
      '<div class="ed-sec"><h3>' + esc(t('acsVisa')) + '</h3>' +
        ml('vIntro', t('acsIntro'), v.intro, { area: true, rows: 3 }) +
        '<div class="svc-sub">' + esc(t('acsCats')) + '</div>' +
        (v.cats || []).map(function (c, i) { return ml('vCat' + i, c.id, c.title); }).join('') +
        '<div class="svc-sub">' + esc(t('acsTypes')) + '</div>' +
        (v.types || []).map(function (ty, i) {
          var off = ty.active === false;
          return details('vt' + i, '<span class="ac-sum">' + esc(L(ty.title) || ty.id) + (off ? ' <em>' + esc(t('acHiddenMark')) + '</em>' : '') + '</span>' +
            tools('vt', i, { hide: true, hidden: off }),
            ml('vT' + i + 't', t('acsTitle'), ty.title) + ml('vT' + i + 'x', t('acsText'), ty.text, { area: true, rows: 3 }), off ? 'is-hidden' : '');
        }).join('') +
        lines('vDocs', t('acsDocs'), v.docs) + ml('vDocsNote', t('acsDocsNote'), v.docsNote, { area: true, rows: 2 }) +
        lines('vTerms', t('acsTerms'), v.terms) + ml('vCons', t('acsConsent'), v.consent, { area: true, rows: 3 }) + '</div>' +

      '<div class="ed-sec"><h3>' + esc(t('acsTours')) + '</h3>' +
        ml('tIntro', t('acsIntro'), tr.intro, { area: true, rows: 3 }) +
        (tr.items || []).map(function (it, i) {
          return details('ti' + i, '<span class="ac-sum">' + esc(L(it.title) || it.id) + (it.hidden ? ' <em>' + esc(t('acHiddenMark')) + '</em>' : '') + '</span>' +
            tools('ti', i, { hide: true, hidden: it.hidden }),
            '<div class="field"><label>' + esc(t('acsImage')) + '</label><div class="ac-img">' +
              (it.image ? '<img src="' + esc(MR.mediaCard(it.image)) + '" alt="">' : '<span>—</span>') +
              '<label class="btn btn-ghost ac-upload">' + esc(t('aciUpload')) + '<input type="file" accept="image/*" data-ac-file="tour" data-i="' + i + '"></label>' +
              (it.image ? '<button type="button" class="btn btn-ghost" data-ac="ti-noimg" data-i="' + i + '">' + esc(t('acDel')) + '</button>' : '') +
            '</div></div>' +
            ml('tI' + i + 't', t('acsTitle'), it.title) + ml('tI' + i + 'x', t('acsText'), it.text, { area: true, rows: 3 }) +
            ml('tI' + i + 'n', t('acsNote'), it.note, { area: true, rows: 2 }) + lines('tI' + i + 'c', t('acsIncludes'), it.includes),
            it.hidden ? 'is-hidden' : '');
        }).join('') +
        lines('tTerms', t('acsTerms'), tr.terms) + ml('tCons', t('acsConsent'), tr.consent, { area: true, rows: 3 }) + '</div>' +

      '<div class="ed-sec"><h3>' + esc(t('acsCars')) + '</h3>' +
        ml('cIntro', t('acsIntro'), cr.intro, { area: true, rows: 2 }) + ml('cEmpty', t('acsEmpty'), cr.emptyNote, { area: true, rows: 2 }) +
        lines('cTerms', t('acsTerms'), cr.terms) + ml('cCons', t('acsConsent'), cr.consent, { area: true, rows: 3 }) + '</div>';
    cta();
  }
  function readSvcTexts() {
    var v = draft.visa || {}, tr = draft.tours || {}, cr = draft.cars || {};
    v.intro = mlRead('vIntro');
    (v.cats || []).forEach(function (c, i) { c.title = mlRead('vCat' + i); });
    (v.types || []).forEach(function (ty, i) {
      if (!document.getElementById('vT' + i + 't_ru')) return;
      ty.title = mlRead('vT' + i + 't');
      ty.text = mlRead('vT' + i + 'x');
    });
    v.docs = linesRead('vDocs'); v.docsNote = mlRead('vDocsNote'); v.terms = linesRead('vTerms'); v.consent = mlRead('vCons');
    tr.intro = mlRead('tIntro');
    (tr.items || []).forEach(function (it, i) {
      if (!document.getElementById('tI' + i + 't_ru')) return;
      it.title = mlRead('tI' + i + 't'); it.text = mlRead('tI' + i + 'x'); it.note = mlRead('tI' + i + 'n'); it.includes = linesRead('tI' + i + 'c');
    });
    tr.terms = linesRead('tTerms'); tr.consent = mlRead('tCons');
    cr.intro = mlRead('cIntro'); cr.emptyNote = mlRead('cEmpty'); cr.terms = linesRead('cTerms'); cr.consent = mlRead('cCons');
  }
  function saveSvcTexts() {
    readSvcTexts();
    busy(true);
    return MR.api.post('/api/admin/services', { services: draft }).then(function (res) {
      MR.D.services = res.services;
      MR.renderAll();
      after(null);
      openSvcTexts();
    }).catch(fail);
  }

  /* ------------------------------------------------------------ районы */
  function openDistricts() {
    mode = 'districts';
    draft = clone(MR.D.districts || {});
    var keys = Object.keys(draft);
    sheet(head(t('acDistricts'), t('acDistrictsSub')) +
      '<div class="ed-sec">' + keys.map(function (k) {
        var d = draft[k];
        return details('d_' + k, '<span class="ac-sum">' + esc(L(d)) + '</span>',
          ml('dN_' + k, t('acdName'), { ru: d.ru, uz: d.uz, en: d.en }) +
          ml('dH_' + k, t('acdHaram'), d.haram) + ml('dT_' + k, t('acdNote'), d.note, { area: true, rows: 2 }) +
          '<div class="ed-grid2">' + field('dLa_' + k, t('acdLat'), d.lat, ' inputmode="decimal"') + field('dLo_' + k, t('acdLng'), d.lng, ' inputmode="decimal"') + '</div>' +
          check('dAp_' + k, t('acdApprox'), d.approx));
      }).join('') + '</div>', true);
  }
  function saveDistricts() {
    var out = {};
    Object.keys(draft).forEach(function (k) {
      if (!document.getElementById('dN_' + k + '_ru')) return;
      var n = mlRead('dN_' + k);
      out[k] = { ru: n.ru, uz: n.uz, en: n.en, haram: mlRead('dH_' + k), note: mlRead('dT_' + k),
        lat: val('dLa_' + k), lng: val('dLo_' + k), approx: document.getElementById('dAp_' + k).checked };
    });
    busy(true);
    return MR.api.post('/api/admin/districts', { districts: out }).then(function (res) {
      MR.D.districts = res.districts;
      MR.renderAll();
      after(null);
      openDistricts();
    }).catch(fail);
  }

  /* ------------------------------------------------------------ тексты и кнопки */
  var GROUPS = [
    ['tabs', 'acgTabs', /^(tab|sub)[A-Z]|^(introTitle|introSub|introHint|chooseLang|chooseLangSub|langName|langSwitch)$/],
    ['catalog', 'acgCatalog', /^(catalog|found|nothing|filters|apply|resetFilters|sort|rooms|anyRooms|term[A-Z]|termAny|priceUpTo|onlyFree|noIqama|allIncluded|allDistricts|updated|today|yesterday|daysAgo|toHaram|iqama(Yes|No)|st[A-Z]|untilTpl|bookedForms|aptForms|roomForms|bathForms|bedForms|waitlist|bookedNote|busyNote|videoTour|prev|next|fav|map[A-Z]|mapHint|mapAreas|mapOffline|dist|objectsIn|features|included|extraPay|calc|codeLabel|openMap|fromChannel|book$|ask$|minStay|for[A-Z]|perMonth|perYear|perDay|riyal|floorShort|lift$|maxPeopleTag)/],
    ['booking', 'acgBooking', /^(book[A-Z]|who[A-Z]|agree|nameErr|send|sent|copied|copyText|keyPointsTitle|readOffer|only(Family|Students)Warn|maxPeopleWarn|close$)/],
    ['visa', 'acgVisa', /^(visa|iqama[A-Z]|fio|partnerBadge|citizenship|travelDate|applyVisa|whenNeeded|dateErr|contactErr|priceOnRequest|perPerson|perGroup|open247|svcFor|readTermsL|termsVisaTitle)/],
    ['tours', 'acgTours', /^(tour|route|withGuide|inPackage|durationL|pickup|bookTour|leaveRequest|termsToursTitle)/],
    ['cars', 'acgCars', /^(car[A-Z]|seatForms|gear|term[0-9]|dayForms|chooseThisCar|termsCarsTitle)/],
    ['offer', 'acgOffer', /^(offer|about|steps|contact|write|callPhone|channelBtn|termsHousing)/]
  ];
  function groupOf(key) {
    if (/^(admin|rep[A-Z]|svc[A-Z]|partner|owner|kind[A-Z]|ac[a-z]*[A-Z]|adm[A-Z])/.test(key)) return 'admin';
    for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i][2].test(key)) return GROUPS[i][0];
    return 'other';
  }
  function curOverrides() {
    var o = {};
    LANGS.forEach(function (l) {
      o[l] = {};
      Object.keys(window.I18N[l] || {}).forEach(function (k) {
        var def = MR.i18nDefault[l] ? MR.i18nDefault[l][k] : undefined;
        if (JSON.stringify(window.I18N[l][k]) !== JSON.stringify(def)) o[l][k] = window.I18N[l][k];
      });
    });
    return o;
  }
  function openI18n() {
    mode = 'i18n';
    i18nDraft = curOverrides();
    drawI18n();
    MR.openSheet('#sheetAdmin');
  }
  function i18nKeys() {
    var q = i18nView.q.toLowerCase();
    return Object.keys(MR.i18nDefault.ru).filter(function (k) {
      if (q) {
        if (k.toLowerCase().indexOf(q) >= 0) return true;
        return LANGS.some(function (l) {
          var v = i18nValue(l, k);
          return String(Array.isArray(v) ? v.join(', ') : v || '').toLowerCase().indexOf(q) >= 0;
        });
      }
      return groupOf(k) === i18nView.group;
    });
  }
  function i18nValue(l, k) {
    if (i18nDraft[l] && i18nDraft[l][k] !== undefined) return i18nDraft[l][k];
    var d = MR.i18nDefault[l];
    return d && d[k] !== undefined ? d[k] : MR.i18nDefault.ru[k];
  }
  function drawI18n() {
    var keys = i18nKeys();
    var shown = keys.slice(0, 80);
    var cats = GROUPS.map(function (g) { return [g[0], g[1]]; }).concat([['other', 'acgOther'], ['admin', 'acgAdmin']]);
    $('#adminScroll').innerHTML = head(t('acTexts'), t('acTextsSub')) +
      '<div class="ed-sec">' +
        '<div class="field"><input id="i18nQ" type="search" value="' + esc(i18nView.q) + '" placeholder="' + esc(t('actSearch')) + '"></div>' +
        (i18nView.q ? '' : '<div class="chips ac-chips">' + cats.map(function (c) {
          return '<button class="chip' + (i18nView.group === c[0] ? ' is-on' : '') + '" data-ac="i18n-group" data-g="' + c[0] + '">' + esc(t(c[1])) + '</button>';
        }).join('') + '</div>') +
        '<div class="ed-hint">' + esc(MR.tpl('actCount', { n: keys.length })) + (keys.length > shown.length ? ' · ' + esc(t('actRefine')) : '') + '</div>' +
        (shown.length ? shown.map(i18nRow).join('') : '<div class="ed-hint">' + esc(t('actNothing')) + '</div>') +
      '</div>';
    $('#adminCta').innerHTML = '<button class="btn" data-ac="save">' + esc(t('acSave')) + '</button>' +
      '<button class="btn btn-ghost" data-ac="translate">' + esc(t('acTranslate')) + '</button>';
    var q = $('#i18nQ');
    q.addEventListener('input', function () {
      i18nView.q = q.value.trim();
      clearTimeout(q._t);
      q._t = setTimeout(function () { drawI18n(); var n = $('#i18nQ'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 300);
    });
    $$('#adminScroll [data-i18n-key]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var k = inp.getAttribute('data-i18n-key'), l = inp.getAttribute('data-lang');
        var def = MR.i18nDefault[l] && MR.i18nDefault[l][k] !== undefined ? MR.i18nDefault[l][k] : MR.i18nDefault.ru[k];
        var v = Array.isArray(def) ? inp.value.split(',').map(function (x) { return x.trim(); }) : inp.value;
        if (JSON.stringify(v) === JSON.stringify(def) || (!Array.isArray(def) && !v.trim())) delete i18nDraft[l][k];
        else i18nDraft[l][k] = v;
        inp.closest('.ac-t').classList.toggle('is-changed', LANGS.some(function (x) { return i18nDraft[x][k] !== undefined; }));
      });
    });
  }
  function i18nRow(k) {
    var changed = LANGS.some(function (l) { return i18nDraft[l][k] !== undefined; });
    var def = MR.i18nDefault.ru[k];
    var label = Array.isArray(def) ? def.join(', ') : String(def);
    return '<div class="ac-t' + (changed ? ' is-changed' : '') + '"><div class="ac-t-h"><b>' + esc(label.length > 70 ? label.slice(0, 70) + '…' : label) + '</b>' +
      '<code>' + esc(k) + '</code><button type="button" data-ac="i18n-reset" data-k="' + esc(k) + '">' + esc(t('actReset')) + '</button></div>' +
      LANGS.map(function (l) {
        var v = i18nValue(l, k);
        var arrv = Array.isArray(v);
        var long = !arrv && String(v || '').length > 60;
        var attrs = ' data-i18n-key="' + esc(k) + '" data-lang="' + l + '"';
        return '<div class="ml-row"><span class="ml-tag">' + l.toUpperCase() + '</span>' +
          (long ? '<textarea rows="2"' + attrs + '>' + esc(v) + '</textarea>'
                : '<input value="' + esc(arrv ? v.join(', ') : (v || '')) + '"' + attrs + (arrv ? ' placeholder="' + esc(t('actArrayHint')) + '"' : '') + '>') + '</div>';
      }).join('') + '</div>';
  }
  function saveI18n() {
    busy(true);
    return postContent('i18n', i18nDraft).then(function (res) {
      after(res);
      i18nDraft = curOverrides();
      drawI18n();
    }).catch(fail);
  }

  /* ------------------------------------------------------------ разделы и порядок */
  var BLOCKS = ['housingMap', 'housingFav', 'offerAbout', 'offerSteps', 'offerCases', 'offerContacts', 'visaDocs', 'visaPriceNote', 'badge247', 'carsTransfer'];
  function openLayout() {
    mode = 'layout';
    draft = clone(MR.layout());
    drawLayout();
    MR.openSheet('#sheetAdmin');
  }
  function drawLayout() {
    var tabName = { catalog: 'tabCatalog', visa: 'tabVisa', tours: 'tabTours', cars: 'tabCars', offer: 'tabOffer' };
    $('#adminScroll').innerHTML = head(t('acLayout'), t('acLiveNote')) +
      '<div class="ed-sec"><h3>' + esc(t('aclTabs')) + '</h3><div class="ed-hint">' + esc(t('aclTabsHint')) + '</div>' +
        draft.tabs.map(function (x, i) {
          return '<div class="ac-row' + (x.on === false ? ' is-hidden' : '') + '"><span class="ac-row-main is-static"><b>' + esc(t(tabName[x.id])) + '</b>' +
            '<small>' + esc(x.on === false ? t('acHiddenMark') : t('acShown')) + '</small></span>' +
            tools('tab', i, { hide: true, hidden: x.on === false }) + '</div>';
        }).join('') + '</div>' +
      '<div class="ed-sec"><h3>' + esc(t('aclBlocks')) + '</h3>' +
        BLOCKS.map(function (b) { return check('lb_' + b, t('aclb_' + b), draft.blocks[b] !== false); }).join('') + '</div>';
    $('#adminCta').innerHTML = '<button class="btn" data-ac="save">' + esc(t('acSave')) + '</button>';
  }
  function readLayout() { BLOCKS.forEach(function (b) { var el = document.getElementById('lb_' + b); if (el) draft.blocks[b] = el.checked; }); }
  function saveLayout() {
    readLayout();
    busy(true);
    return postContent('layout', draft).then(function (res) { after(res); openLayout(); }).catch(fail);
  }

  /* ------------------------------------------------------------ изображения */
  function openImages() {
    mode = 'images';
    draft = clone(MR.D.images || {});
    drawImages();
    MR.openSheet('#sheetAdmin');
  }
  function drawImages() {
    var one = function (key, title, def) {
      var src = draft[key] ? MR.media(draft[key]) : def;
      return '<div class="ed-sec"><h3>' + esc(title) + '</h3><div class="ac-img big">' +
        '<img class="ac-logo-prev" src="' + esc(src) + '" alt="">' +
        '<label class="btn btn-ghost ac-upload">' + esc(t('aciUpload')) + '<input type="file" accept="image/*" data-ac-file="' + key + '"></label>' +
        (draft[key] ? '<button type="button" class="btn btn-ghost" data-ac="img-reset" data-k="' + key + '">' + esc(t('aciReset')) + '</button>' : '') +
      '</div></div>';
    };
    $('#adminScroll').innerHTML = head(t('acImages'), t('acImagesSub')) +
      one('logo', t('aciLogo'), 'assets/img/emblem-192.webp') + one('emblem', t('aciEmblem'), 'assets/img/emblem.webp') +
      '<div class="ed-sec"><div class="ed-hint">' + esc(t('aciNote')) + '</div></div>';
    $('#adminCta').innerHTML = '<button class="btn" data-ac="save">' + esc(t('acSave')) + '</button>';
  }
  function saveImages() {
    busy(true);
    return postContent('images', draft).then(function (res) { after(res); openImages(); }).catch(fail);
  }

  /* загрузка фото: логотип, эмблема, обложка тура — тем же путём, что фото квартир (webp 1600 + копия 800) */
  function upload(input) {
    var file = input.files && input.files[0];
    if (!file || !window.Admin || !window.Admin.uploadPhoto) return;
    var kind = input.getAttribute('data-ac-file');
    var item = { pending: true, progress: 0 };
    var label = input.closest('.ac-upload');
    if (label) label.classList.add('is-busy');
    window.Admin.uploadPhoto(file, item).then(function () {
      if (kind === 'tour') {
        readSvcTexts();
        draft.tours.items[+input.getAttribute('data-i')].image = item.url;
        drawSvcTexts();
      } else {
        draft[kind] = item.url;
        drawImages();
      }
      toast(t('aciUploaded'));
    }).catch(function (e) { fail(e); if (label) label.classList.remove('is-busy'); });
  }

  /* ------------------------------------------------ перевод пустых UZ/EN с русского */
  function translateEmpty() {
    var jobs = [];
    $$('#adminScroll [id$="_ru"]').forEach(function (ru) {
      var base = ru.id.slice(0, -3);
      var isLines = ru.getAttribute('data-lines') === '1';
      ['uz', 'en'].forEach(function (to) {
        var el = document.getElementById(base + '_' + to);
        if (!el || !ru.value.trim()) return;
        if (!isLines) { if (!el.value.trim()) jobs.push({ el: el, to: to, text: ru.value.trim() }); return; }
        var ruLines = ru.value.split('\n'), cur = el.value.split('\n');
        ruLines.forEach(function (line, i) {
          if (line.trim() && !(cur[i] || '').trim()) jobs.push({ el: el, to: to, text: line.trim(), line: i, lines: ruLines.length });
        });
      });
    });
    // тексты и кнопки: пустые UZ/EN у показанных надписей
    $$('#adminScroll [data-i18n-key][data-lang="ru"]').forEach(function (ru) {
      var k = ru.getAttribute('data-i18n-key');
      ['uz', 'en'].forEach(function (to) {
        var el = $('#adminScroll [data-i18n-key="' + k + '"][data-lang="' + to + '"]');
        if (el && !el.value.trim() && ru.value.trim()) jobs.push({ el: el, to: to, text: ru.value.trim(), i18n: true });
      });
    });
    if (!jobs.length) { toast(t('acNothingToTranslate')); return; }
    busy(true);
    var chunks = [];
    ['uz', 'en'].forEach(function (to) {
      var list = jobs.filter(function (j) { return j.to === to; });
      for (var i = 0; i < list.length; i += 40) chunks.push({ to: to, list: list.slice(i, i + 40) });
    });
    var filled = 0;
    var run = chunks.reduce(function (pr, ch) {
      return pr.then(function () {
        return MR.api.post('/api/admin/translate', { texts: ch.list.map(function (j) { return j.text; }), to: ch.to }).then(function (res) {
          (res.texts || []).forEach(function (tx, n) {
            var j = ch.list[n];
            if (!tx) return;
            if (j.line != null) {
              var cur = j.el.value.split('\n');
              while (cur.length < j.lines) cur.push('');
              cur[j.line] = tx;
              j.el.value = cur.join('\n');
            } else j.el.value = tx;
            if (j.i18n) j.el.dispatchEvent(new Event('input'));
            filled++;
          });
        }).catch(function () {});
      });
    }, Promise.resolve());
    run.then(function () { busy(false); toast(filled ? MR.tpl('acTranslated', { n: filled }) : t('adminTranslateErr')); });
  }

  /* --------------------------------------------------------------- клики */
  function save() {
    if (mode === 'brand') return saveBrand();
    if (mode === 'offer') return saveOffer();
    if (mode === 'svctexts') return saveSvcTexts();
    if (mode === 'districts') return saveDistricts();
    if (mode === 'i18n') return saveI18n();
    if (mode === 'layout') return saveLayout();
    if (mode === 'images') return saveImages();
  }
  function listAction(list, act, i) {
    if (list === 'sec' || list === 'case') {
      readOffer();
      var arrRef = list === 'sec' ? draft.offer.sections : draft.offer.cases.list;
      if (act === 'up') { move(arrRef, i, -1); openKey = list + (i - 1); }
      if (act === 'down') { move(arrRef, i, 1); openKey = list + (i + 1); }
      if (act === 'hide') { arrRef[i].hidden = !arrRef[i].hidden; openKey = ''; }
      if (act === 'del') {
        return confirmBox(t('acDelQ')).then(function (ok) { if (ok) { arrRef.splice(i, 1); openKey = ''; drawOffer(); } });
      }
      return drawOffer();
    }
    if (list === 'vt' || list === 'ti') {
      readSvcTexts();
      var a2 = list === 'vt' ? draft.visa.types : draft.tours.items;
      if (act === 'up') { move(a2, i, -1); openKey = list + (i - 1); }
      if (act === 'down') { move(a2, i, 1); openKey = list + (i + 1); }
      if (act === 'hide') {
        if (list === 'vt') a2[i].active = a2[i].active === false;
        else a2[i].hidden = !a2[i].hidden;
        openKey = '';
      }
      return drawSvcTexts();
    }
    if (list === 'tab') {
      readLayout();
      if (act === 'up') move(draft.tabs, i, -1);
      if (act === 'down') move(draft.tabs, i, 1);
      if (act === 'hide') {
        var on = draft.tabs.filter(function (x) { return x.on !== false; }).length;
        if (draft.tabs[i].on !== false && on <= 1) { MR.alert(t('aclOneTab')); return; }
        draft.tabs[i].on = draft.tabs[i].on === false;
      }
      return drawLayout();
    }
  }
  function handleClick(e) {
    var b = e.target.closest('[data-ac]');
    if (!b) return false;
    var k = b.getAttribute('data-ac');
    var i = +b.getAttribute('data-i');
    if (b.closest('summary') && /-(up|down|hide|del)$/.test(k)) e.preventDefault();   // не раскрывать блок
    if (k === 'open') open(b.getAttribute('data-what'));
    else if (k === 'save') save();
    else if (k === 'translate') translateEmpty();
    else if (k === 'apt-edit') { var id = b.getAttribute('data-id'); window.Admin.edit(id); }
    else if (k === 'sec-add') { readOffer(); draft.offer.sections.push({ icon: 'doc', title: { ru: '' }, items: [], hidden: false }); openKey = 'sec' + (draft.offer.sections.length - 1); drawOffer(); }
    else if (k === 'case-add') { readOffer(); draft.offer.cases.list.push({ q: { ru: '' }, a: { ru: '' }, hidden: false }); openKey = 'case' + (draft.offer.cases.list.length - 1); drawOffer(); }
    else if (k === 'ti-noimg') { readSvcTexts(); draft.tours.items[i].image = ''; openKey = 'ti' + i; drawSvcTexts(); }
    else if (k === 'img-reset') { draft[b.getAttribute('data-k')] = ''; drawImages(); }
    else if (k === 'i18n-group') { i18nView.group = b.getAttribute('data-g'); drawI18n(); }
    else if (k === 'i18n-reset') { var key = b.getAttribute('data-k'); LANGS.forEach(function (l) { delete i18nDraft[l][key]; }); drawI18n(); }
    else {
      var m = /^(sec|case|vt|ti|tab)-(up|down|hide|del)$/.exec(k);
      if (m) listAction(m[1], m[2], i);
    }
    MR.haptic('light');
    return true;
  }
  document.addEventListener('change', function (e) {
    var f = e.target.closest && e.target.closest('[data-ac-file]');
    if (f && MR && MR.state.isAdmin) upload(f);
  });

  window.AdminContent = {
    init: function (core) { MR = core; t = core.t; L = core.L; esc = core.esc; },
    render: render,
    handleClick: handleClick,
    open: open
  };
})();

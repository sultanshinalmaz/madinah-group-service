/* ==========================================================================
   Панель риелтора, вторая часть: отчёт (заработок, сдано квартир, возвраты),
   цены услуг и машины, визовая компания-партнёр, PDF-политика для владельцев.
   Загружается только у риелтора, вместе с admin.js.
   ========================================================================== */
(function () {
  'use strict';

  var MR, t, L, esc;
  var ready = false;
  var rep = { month: '', data: null };
  var svc = null;               // рабочая копия услуг в редакторе
  var carEd = null;             // редактируемая машина
  var partners = null;
  var LANGS = ['ru', 'uz', 'en'];
  var KINDS = ['housing', 'visa', 'tour', 'car', 'other'];
  var RATE = 3.75;

  var IC = {
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    tune:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/></svg>'
  };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
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
  function today() { return new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10); }
  function num(v) { if (v === '' || v == null) return null; var n = Number(String(v).replace(',', '.').replace(/\s/g, '')); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null; }
  function money(n, cur) {
    var s = MR.money(Math.round(n * 100) / 100);
    return cur === 'USD' ? (MR.state.lang === 'en' ? '$' + s : s + ' $') : s + ' ' + t('riyal');
  }
  function head(title, sub) {
    return '<div class="sheet-head"><h2>' + esc(title) + '</h2>' + (sub ? '<div class="sub">' + esc(sub) + '</div>' : '') + '</div>';
  }
  function field(id, label, value, attrs) {
    return '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '" value="' + esc(value == null ? '' : value) + '"' + (attrs || '') + '></div>';
  }
  function numInput(id, label, value) { return field(id, label, value, ' type="number" inputmode="decimal" min="0" step="any"'); }
  function val(id) { var el = $('#' + id); return el ? el.value.trim() : ''; }
  function seg(id, opts, cur) {
    return '<div class="seg" id="' + id + '">' + opts.map(function (o) {
      return '<button type="button" data-v="' + o[0] + '" class="' + (o[0] === cur ? 'is-on' : '') + '">' + esc(o[1]) + '</button>';
    }).join('') + '</div>';
  }
  function segVal(id) { var b = $('#' + id + ' .is-on'); return b ? b.getAttribute('data-v') : ''; }
  function bindSegs(root) {
    $$('.seg', root).forEach(function (sg) {
      sg.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-v]');
        if (!b) return;
        $$('button', sg).forEach(function (x) { x.classList.toggle('is-on', x === b); });
        MR.haptic('light');
        sg.dispatchEvent(new CustomEvent('segchange', { detail: b.getAttribute('data-v') }));
      });
    });
  }

  /* ------------------------------------------------ кнопки в полосе риелтора */
  function barHTML() {
    if (!ready) return '';
    return '<div class="admin-bar-tools">' +
      '<button class="is-main" data-screen-go="admin">' + IC.tune + t('admPanelBtn') + '</button>' +
      '<button data-biz="report">' + IC.chart + t('adminReport') + '</button>' +
      '<button data-biz="services">' + IC.tune + t('adminServices') + '</button>' +
      '<button data-biz="owner">' + MR.ICON.doc + t('adminOwnerPdf') + '</button>' +
    '</div>';
  }

  /* ================================================================ ОТЧЁТ */
  function kindLabel(k) { return t({ housing: 'kindHousing', visa: 'kindVisa', tour: 'kindTour', car: 'kindCar', other: 'kindOther' }[k] || 'kindOther'); }
  function monthName(m) {
    var p = m.split('-');
    var d = new Date(+p[0], +p[1] - 1, 15);
    try { return d.toLocaleDateString(MR.state.lang === 'en' ? 'en-US' : MR.state.lang === 'uz' ? 'uz-UZ' : 'ru-RU', { month: 'long', year: 'numeric' }).replace(' г.', ''); }
    catch (e) { return m; }
  }
  function sums(deals) {
    var s = { SAR: 0, USD: 0, rSAR: 0, rUSD: 0, rented: 0, empty: 0 };
    deals.forEach(function (d) {
      if (d.amount == null) s.empty++;
      s[d.currency] += d.amount || 0;
      s['r' + d.currency] += d.refund || 0;
      if (d.kind === 'housing' && !(d.refund && d.amount != null && d.refund >= d.amount)) s.rented++;
    });
    s.net = (s.SAR - s.rSAR) + (s.USD - s.rUSD) * RATE;
    return s;
  }
  function pair(sar, usd) {
    var out = [];
    if (sar || !usd) out.push('<span class="nw">' + money(sar, 'SAR') + '</span>');
    if (usd) out.push('<span class="nw">' + money(usd, 'USD') + '</span>');
    return out.join(' + ');
  }

  function openReport(month) {
    rep.month = month || rep.month || today().slice(0, 7);
    $('#adminScroll').innerHTML = head(t('repTitle'), t('repOnlyYou')) + '<div class="rep-empty">' + t('sending') + '</div>';
    $('#adminCta').innerHTML = '';
    MR.openSheet('#sheetAdmin');
    loadReport();
  }
  function loadReport() {
    MR.api.get('/api/admin/report?month=' + rep.month).then(function (d) {
      rep.data = d;
      if (d.rate) RATE = d.rate;
      drawReport();
    }).catch(function (e) { $('#adminScroll').innerHTML = head(t('repTitle')) + '<div class="rep-empty">' + esc(t('adminErr') + ': ' + e.message) + '</div>'; });
  }
  function drawReport() {
    var d = rep.data;
    var s = sums(d.deals);
    var i = d.months.indexOf(d.month);
    var c = d.counts;
    var list = d.deals.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    $('#adminScroll').innerHTML = head(t('repTitle'), t('repOnlyYou')) +
      '<div class="rep-month"><button data-biz="rep-month" data-d="-1"' + (i <= 0 ? ' disabled' : '') + '>‹</button>' +
        '<b>' + esc(monthName(d.month)) + '</b>' +
        '<button data-biz="rep-month" data-d="1"' + (i < 0 || i >= d.months.length - 1 ? ' disabled' : '') + '>›</button></div>' +
      '<div class="rep-tiles">' +
        '<div class="rep-tile main"><span>' + t('repNet') + '</span><b class="num">≈ ' + money(s.net, 'SAR') + '</b>' +
          (s.USD || s.rUSD ? '<small>' + t('repRate') + '</small>' : '') + '</div>' +
        '<div class="rep-tile"><span>' + t('repEarned') + '</span><b class="num">' + pair(s.SAR, s.USD) + '</b></div>' +
        '<div class="rep-tile' + (s.rSAR || s.rUSD ? ' neg' : '') + '"><span>' + t('repRefunds') + '</span><b class="num">' + (s.rSAR || s.rUSD ? '−' + pair(s.rSAR, s.rUSD) : '0') + '</b></div>' +
        '<div class="rep-tile"><span>' + t('repRented') + '</span><b class="num">' + s.rented + '</b></div>' +
        '<div class="rep-tile"><span>' + t('repRequests') + '</span><b class="num">' + (c.bookings + c.visa + c.tour + c.car) + '</b>' +
          '<small>' + [t('repBookings') + ' ' + c.bookings, t('repVisa') + ' ' + c.visa, t('repTours') + ' ' + c.tour, t('repCars') + ' ' + c.car].join(' · ') + '</small></div>' +
      '</div>' +
      '<div class="section-title">' + t('repDeals') + '</div>' +
      (list.length ? '<div class="rep-list">' + list.map(function (x) {
        var amt = x.amount == null ? '<span class="a need">' + t('repNeedAmount') + '</span>'
          : '<span class="a num">' + money(x.amount, x.currency) + (x.refund ? '<small>−' + money(x.refund, x.currency) + ' · ' + t('repRefundTag') + '</small>' : '') + '</span>';
        return '<button class="rep-row" data-biz="deal" data-id="' + esc(x.id) + '">' +
          '<span class="k ' + esc(x.kind) + '">' + esc(kindLabel(x.kind)) + '</span>' +
          '<span class="t"><b>' + esc(x.title) + '</b><small>' + esc((x.date || '').split('-').reverse().join('.')) +
            (x.source && x.source !== 'manual' ? ' · ' + t('repAuto') : '') + '</small></span>' + amt +
        '</button>';
      }).join('') + '</div>' : '<div class="rep-empty">' + t('repNoDeals') + '</div>');
    $('#adminCta').innerHTML = '<button class="btn" data-biz="deal-new">' + t('repAdd') + '</button>';
  }

  /* ----------------------------------------------------------- запись отчёта */
  function editDeal(deal) {
    var d = deal ? JSON.parse(JSON.stringify(deal)) : { id: '', date: today(), kind: 'housing', title: '', amount: null, currency: 'SAR', refund: 0, note: '', apartment: '' };
    var apts = MR.state.items.slice().sort(function (a, b) { return (a.code || '').localeCompare(b.code || ''); });
    $('#adminScroll').innerHTML = head(t('repEdit'), d.source && d.source !== 'manual' ? t('repAuto') : '') +
      '<div class="ed-sec">' +
        '<div class="field"><label>' + t('repKind') + '</label>' + seg('dlKind', KINDS.map(function (k) { return [k, kindLabel(k)]; }), d.kind) + '</div>' +
        '<div class="field" id="dlAptBox"' + (d.kind === 'housing' ? '' : ' hidden') + '><label for="dlApt">' + t('repPickApt') + '</label><select id="dlApt">' +
          '<option value="">' + esc(t('repNoApt')) + '</option>' +
          apts.map(function (a) { return '<option value="' + esc(a.id) + '"' + (a.id === d.apartment ? ' selected' : '') + '>' + esc((a.code ? a.code + ' · ' : '') + L(a.title)) + '</option>'; }).join('') +
        '</select></div>' +
        field('dlTitle', t('repTitleL') + ' *', d.title, ' placeholder="' + esc(t('repTitlePh')) + '"') +
        '<div class="ed-grid2">' + numInput('dlAmount', t('repAmount'), d.amount) +
          '<div class="field"><label>' + t('repCurrency') + '</label>' + seg('dlCur', [['SAR', t('riyal')], ['USD', '$']], d.currency) + '</div></div>' +
        '<div class="ed-grid2">' + numInput('dlRefund', t('repRefund'), d.refund || '') + field('dlDate', t('repDate'), d.date, ' type="date"') + '</div>' +
        '<div class="field"><label for="dlNote">' + t('repNote') + '</label><textarea id="dlNote" rows="2">' + esc(d.note || '') + '</textarea></div>' +
        (d.id ? '<button class="btn btn-danger" data-biz="deal-del" data-id="' + esc(d.id) + '" style="min-height:44px">' + t('repDelete') + '</button>' : '') +
      '</div>';
    $('#adminCta').innerHTML = '<button class="btn" data-biz="deal-save" data-id="' + esc(d.id) + '">' + t('adminSave') + '</button>' +
      '<button class="btn btn-ghost" data-biz="report-back">' + t('prev') + '</button>';
    var sc = $('#adminScroll');
    bindSegs(sc);
    $('#dlKind').addEventListener('segchange', function (e) {
      $('#dlAptBox').hidden = e.detail !== 'housing';
      if (e.detail === 'visa') $$('#dlCur button').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-v') === 'USD'); });
    });
    $('#dlApt').addEventListener('change', function (e) {
      var ap = MR.find(e.target.value);
      if (!ap) return;
      if (!val('dlTitle')) $('#dlTitle').value = (ap.code ? ap.code + ' · ' : '') + (ap.title.ru || L(ap.title));
      if (!val('dlAmount') && ap.price && ap.price.agentFee) $('#dlAmount').value = ap.price.agentFee;
    });
    sc.scrollTop = 0;
  }
  function saveDeal(id) {
    var deal = {
      id: id || '', kind: segVal('dlKind'), apartment: segVal('dlKind') === 'housing' ? val('dlApt') : '',
      title: val('dlTitle'), amount: num(val('dlAmount')), currency: segVal('dlCur') || 'SAR',
      refund: num(val('dlRefund')) || 0, date: val('dlDate'), note: val('dlNote')
    };
    if (!deal.title) { MR.hapticNotify('error'); MR.alert(t('repTitleL')); return; }
    MR.api.post('/api/admin/deal', { deal: deal }).then(function (res) {
      MR.hapticNotify('success');
      toast(t('adminSaved'));
      rep.month = (res.deal.date || today()).slice(0, 7);
      openReport(rep.month);
    }).catch(function (e) { MR.alert(t('adminErr') + ': ' + e.message); });
  }
  function deleteDeal(id) {
    confirmBox(t('repDeleteQ')).then(function (ok) {
      if (!ok) return;
      MR.api.post('/api/admin/deal-delete', { id: id }).then(function () { toast(t('adminSaved')); openReport(rep.month); })
        .catch(function (e) { MR.alert(t('adminErr') + ': ' + e.message); });
    });
  }

  /* ======================================================= ВИЗОВАЯ КОМПАНИЯ */
  function partnerCard() {
    var p = partners;
    var list = p && p.partners ? p.partners : [];
    var names = list.map(function (x) { return x.name + (x.username ? ' (@' + x.username + ')' : ''); }).join(', ');
    return '<div class="biz-card"><h3>' + t('partnerTitle') + '</h3>' +
      '<p>' + esc(!p ? t('sending') : list.length ? MR.tpl('partnerOn', { n: names }) : t('partnerNone')) + '</p>' +
      '<p style="color:var(--ink-3);font-size:12.5px">' + t('partnerHint') + '</p>' +
      '<button class="btn" data-biz="partner-send">' + MR.ICON.tg + t('partnerSend') + '</button>' +
      (list.length ? '<button class="link-line" data-biz="partner-remove" data-id="' + esc(list[0].id) + '" style="color:var(--clay)">' + t('partnerRemove') + '</button>' : '') +
      '</div>';
  }
  function servicesBtn() {
    return '<button class="btn btn-ghost svc-edit-btn" data-biz="services">' + IC.tune + t('svcTitle') + '</button>';
  }
  function fillSlots(name, root) {
    if (!MR.state.isAdmin || !root) return;
    var slot = root.querySelector('[data-svc-admin]');
    if (!slot) return;
    if (name === 'visa') {
      slot.innerHTML = partnerCard() + '<div style="height:10px"></div>' + servicesBtn();
      if (!partners) loadPartners();
    } else if (name === 'cars') {
      slot.innerHTML = '<button class="btn" data-biz="car-new-direct">' + t('svcAddCar') + '</button>' + servicesBtn();
    } else slot.innerHTML = servicesBtn();
  }
  function loadPartners(body) {
    var req = body ? MR.api.post('/api/admin/partners', body) : MR.api.get('/api/admin/partners');
    return req.then(function (d) {
      partners = d;
      var slot = document.querySelector('[data-svc-admin="visa"]');
      if (slot) slot.innerHTML = partnerCard() + '<div style="height:10px"></div>' + servicesBtn();
      return d;
    }).catch(function () {});
  }
  function sendPartnerLink() {
    var go = function (d) {
      if (!d || !d.link) { MR.alert(d && d.dev ? 'Режим проверки: бот выключен, ссылка появится на сервере с токеном бота.' : t('adminErr')); return; }
      MR.openLink('https://t.me/share/url?url=' + encodeURIComponent(d.link) + '&text=' + encodeURIComponent(t('partnerShareText')));
    };
    if (partners && partners.link) go(partners); else loadPartners().then(go);
  }

  /* ================================================================ УСЛУГИ */
  function langsOf(obj) { return obj && typeof obj === 'object' ? obj : (obj ? { ru: String(obj) } : null); }
  function ru(obj) { return obj ? (typeof obj === 'string' ? obj : obj.ru || '') : ''; }

  function openServices() {
    svc = JSON.parse(JSON.stringify(MR.D.services || {}));
    drawServices();
    MR.openSheet('#sheetAdmin');
  }
  function drawServices() {
    var v = svc.visa || { types: [] }, tr = svc.tours || { items: [] }, cr = svc.cars || { items: [] };
    var pct = v.commissionPct == null ? 5 : v.commissionPct;
    $('#adminScroll').innerHTML = head(t('svcTitle'), t('svcTranslateHint')) +

      '<div class="ed-sec"><h3>' + t('svcVisa') + '</h3>' +
        numInput('svPct', t('svcPct'), pct) +
        '<div class="ed-hint">' + t('svcPctNote') + '</div>' +
        '<div class="car-ed"><b>' + t('svcVisaShow') + '</b>' +
          (v.cats || []).map(function (c) {
            var list = (v.types || []).map(function (ty, i) { return [ty, i]; }).filter(function (x) { return x[0].cat === c.id; });
            return list.length ? '<div class="vis-cat">' + esc(L(c.title)) + '</div>' + list.map(function (x) {
              return '<label class="vis-row"><input type="checkbox" id="svShow' + x[1] + '"' + (x[0].active !== false ? ' checked' : '') + '><span>' + esc(L(x[0].title)) + '</span></label>';
            }).join('') : '';
          }).join('') +
        '</div></div>' +

      '<div class="ed-sec"><h3>' + t('svcTours') + '</h3>' +
        (tr.items || []).map(function (it, i) {
          return '<div class="car-ed"><b>' + esc(L(it.title)) + '</b>' +
            '<div class="ed-grid2">' + numInput('trPrice' + i, t('svcTourPrice'), it.price) +
              '<div class="field"><label>' + t('svcPer') + '</label>' + seg('trPer' + i, [['group', t('perGroup')], ['person', t('perPerson')]], it.per || 'group') + '</div></div>' +
            field('trDur' + i, t('svcDuration'), ru(it.duration), ' placeholder="' + esc(t('svcDurationPh')) + '"') +
            (it.stops ? '<div class="svc-sub">' + t('svcStops') + '</div><div style="display:grid;gap:8px" id="trStops' + i + '">' +
              it.stops.map(function (st, j) { return stopRow(i, j, st); }).join('') + '</div>' +
              '<button class="btn btn-ghost" data-biz="stop-add" data-i="' + i + '" style="min-height:42px">' + t('svcAddStop') + '</button>' : '') +
          '</div>';
        }).join('') + '</div>' +

      '<div class="ed-sec"><h3>' + t('svcCars') + '</h3>' +
        ((cr.items || []).length ? (cr.items || []).map(function (c, i) {
          return '<button class="rep-row" data-biz="car-edit" data-i="' + i + '">' +
            '<span class="k car">' + (c.photos && c.photos.length ? c.photos.length + ' 📷' : '—') + '</span>' +
            '<span class="t"><b>' + esc(window.Services.carTitle(c)) + '</b><small>' + (c.active === false ? '⏸ ' : '') + (c.status === 'booked' ? '🔒 ' : '') +
              [c.seats ? c.seats + ' ' + MR.nForm(c.seats, t('seatForms')) : '', c.gear === 'manual' ? t('gearManual') : t('gearAuto')].filter(Boolean).join(' · ') + '</small></span>' +
            '<span class="a num">' + (c.pricePerDay ? money(c.pricePerDay, 'SAR') : '—') + '</span></button>';
        }).join('') : '<div class="ed-hint">' + t('svcNoCars') + '</div>') +
        '<button class="btn btn-ghost" data-biz="car-new" style="min-height:44px">' + t('svcAddCar') + '</button></div>';

    $('#adminCta').innerHTML = '<button class="btn" data-biz="svc-save">' + t('svcSave') + '</button>';
    bindSegs($('#adminScroll'));
  }
  function stopRow(i, j, st) {
    return '<div class="stop-row" data-stop="' + i + ':' + j + '">' +
      '<div class="stop-top"><b>' + (j + 1) + '</b><input id="stN' + i + '_' + j + '" value="' + esc(ru(st.title)) + '" placeholder="' + esc(t('svcStopName')) + '">' +
        '<button type="button" data-biz="stop-del" data-i="' + i + '" data-j="' + j + '" aria-label="×">×</button></div>' +
      '<textarea id="stT' + i + '_' + j + '" rows="2" placeholder="' + esc(t('svcStopText')) + '">' + esc(ru(st.text)) + '</textarea></div>';
  }

  /* русский текст поменялся — узбекский и английский переводим заново */
  function setRu(obj, value) {
    var o = langsOf(obj) || {};
    if ((o.ru || '') === value) return o;
    return value ? { ru: value } : null;
  }
  function readServices() {
    var v = svc.visa || {}, tr = svc.tours || {};
    v.commissionPct = num(val('svPct'));
    (v.types || []).forEach(function (ty, i) { var cb = $('#svShow' + i); if (cb) ty.active = cb.checked; });
    (tr.items || []).forEach(function (it, i) {
      it.price = num(val('trPrice' + i));
      it.per = segVal('trPer' + i) || 'group';
      it.duration = setRu(it.duration, val('trDur' + i));
      if (it.stops) {
        it.stops = it.stops.map(function (st, j) {
          return { title: setRu(st.title, val('stN' + i + '_' + j)), text: setRu(st.text, val('stT' + i + '_' + j)) };
        });
      }
    });
  }
  function needTranslate() {
    var jobs = [];
    var push = function (o) { if (o && o.ru && (!o.uz || !o.en)) jobs.push(o); };
    ((svc.tours && svc.tours.items) || []).forEach(function (it) {
      push(it.duration);
      (it.stops || []).forEach(function (st) { push(st.title); push(st.text); });
    });
    ((svc.cars && svc.cars.items) || []).forEach(function (c) { push(c.note); });
    return jobs;
  }
  function translateAll() {
    var jobs = needTranslate();
    if (!jobs.length) return Promise.resolve();
    var texts = jobs.map(function (o) { return o.ru; });
    var slow = new Promise(function (res) { setTimeout(function () { res(null); }, 15000); });
    return Promise.race([slow, Promise.all(['uz', 'en'].map(function (to) { return MR.api.post('/api/admin/translate', { texts: texts, to: to }).catch(function () { return { texts: [] }; }); }))
      ]).then(function (res) {
        if (!res) return;
        jobs.forEach(function (o, k) {
          if (!o.uz && res[0].texts && res[0].texts[k]) o.uz = res[0].texts[k];
          if (!o.en && res[1].texts && res[1].texts[k]) o.en = res[1].texts[k];
        });
      });
  }
  function saveServices() {
    if ($('#svPct')) readServices();
    var btn = $('#adminCta .btn');
    if (btn) { btn.disabled = true; btn.textContent = t('adminTranslating'); }
    translateAll().then(function () {
      return MR.api.post('/api/admin/services', { services: svc });
    }).then(function (res) {
      MR.D.services = res.services;
      svc = JSON.parse(JSON.stringify(res.services));
      MR.hapticNotify('success');
      toast(t('adminSaved'));
      MR.closeSheet();
      MR.renderAll();
    }).catch(function (e) {
      MR.alert(t('adminErr') + ': ' + e.message);
      if (btn) { btn.disabled = false; btn.textContent = t('svcSave'); }
    });
  }

  /* ---------------------------------------------------------------- машина */
  function editCar(i) {
    readIfOpen();
    var list = (svc.cars = svc.cars || { items: [] }).items = svc.cars.items || [];
    carEd = i == null ? { i: -1, car: { id: '', name: '', year: null, color: 'black', trim: '', photos: [], seats: 5, gear: 'auto',
                                        pricePerDay: null, deposit: null, note: null, active: true, status: 'free', bookedUntil: '', busy: [] } }
                      : { i: i, car: JSON.parse(JSON.stringify(list[i])) };
    carEd.car.busy = carEd.car.busy || [];
    carEd.media = (carEd.car.photos || []).map(function (u) { return { url: u }; });
    drawCar();
  }
  function readIfOpen() { if ($('#svPct')) readServices(); }
  function drawCar() {
    var c = carEd.car;
    var colors = window.Services.colors;
    var booked = c.status === 'booked';
    $('#adminScroll').innerHTML = head(window.Services.carTitle(c) || t('svcAddCar').replace(/^\+\s*/, ''), '') +
      '<div class="ed-sec"><h3>' + t('carPhotos') + '</h3><div class="ed-media" id="carMedia"></div></div>' +
      '<div class="ed-sec">' +
        field('crName', t('carName') + ' *', c.name, ' placeholder="Lincoln MKX"') +
        '<div class="ed-grid2">' + numInput('crYear', t('carYear'), c.year) +
          '<div class="field"><label for="crColor">' + t('carColor') + '</label><select id="crColor">' +
            Object.keys(colors).map(function (k) { return '<option value="' + k + '"' + (k === (c.color || 'black') ? ' selected' : '') + '>' + esc(L(colors[k])) + '</option>'; }).join('') +
          '</select></div></div>' +
        field('crTrim', t('carTrim'), c.trim || '', ' placeholder="' + esc(t('carTrimPh')) + '"') +
        '<div class="ed-grid2">' + numInput('crSeats', t('carSeats'), c.seats) +
          '<div class="field"><label>' + t('carGear') + '</label>' + seg('crGear', [['auto', t('gearAuto')], ['manual', t('gearManual')]], c.gear || 'auto') + '</div></div>' +
        '<div class="ed-grid2">' + numInput('crPrice', t('carPrice'), c.pricePerDay) + numInput('crDeposit', t('carDepositL'), c.deposit) + '</div>' +
        '<div class="field"><label for="crNote">' + t('carNoteL') + '</label><textarea id="crNote" rows="3">' + esc(ru(c.note)) + '</textarea></div>' +
        '<label class="check"><input type="checkbox" id="crActive"' + (c.active !== false ? ' checked' : '') + '><span>' + t('carShow') + '</span></label>' +
      '</div>' +
      '<div class="ed-sec"><h3>' + t('carStatusL') + '</h3>' +
        seg('crStatus', [['free', t('carFree')], ['booked', t('carBooked')]], booked ? 'booked' : 'free') +
        field('crUntil', t('carUntilL'), c.bookedUntil || '', ' type="date"') +
        '<div class="svc-sub">' + t('carBusyL') + '</div>' +
        '<div style="display:grid;gap:6px" id="crBusy">' + busyRows(c) + '</div>' +
        (carEd.i >= 0 ? '<button class="btn btn-danger" data-biz="car-del" style="min-height:44px">' + t('svcDelCar') + '</button>' : '') +
      '</div>';
    $('#adminCta').innerHTML = '<button class="btn" data-biz="car-ok">' + t('adminSave') + '</button>' +
      '<button class="btn btn-ghost" data-biz="car-back">' + t('prev') + '</button>';
    bindSegs($('#adminScroll'));
    drawCarMedia();
    $('#adminScroll').scrollTop = 0;
  }
  function busyRows(c) {
    var list = c.busy || [];
    if (!list.length) return '<div class="ed-hint">' + t('carNoBusy') + '</div>';
    return list.map(function (r, j) {
      var d = function (x) { var p = String(x).split('-'); return p[2] + '.' + p[1] + '.' + p[0]; };
      return '<div class="busy-row"><span>' + d(r.from) + (r.to && r.to !== r.from ? ' — ' + d(r.to) : '') + '</span>' +
        '<button type="button" data-biz="car-busy-del" data-j="' + j + '" aria-label="×">×</button></div>';
    }).join('');
  }
  function drawCarMedia() {
    var box = $('#carMedia');
    if (!box) return;
    box.innerHTML = carEd.media.map(function (m, i) {
      var img = m.preview || MR.mediaCard(m.url);
      return '<div class="ed-m"><img src="' + esc(img) + '" alt="" onerror="this.onerror=null;this.src=\'' + esc(m.url ? MR.media(m.url) : '') + '\'">' +
        (m.pending ? '<div class="ed-prog"><i style="width:' + Math.round((m.progress || 0) * 100) + '%"></i></div>'
          : '<div class="ed-tools"><button data-biz="car-ph" data-a="left" data-i="' + i + '">‹</button>' +
            '<button class="del" data-biz="car-ph" data-a="del" data-i="' + i + '">×</button>' +
            '<button data-biz="car-ph" data-a="right" data-i="' + i + '">›</button></div>') + '</div>';
    }).join('') + '<label class="ed-add"><b>+</b>' + t('adminAddMedia') + '<input type="file" id="carFiles" accept="image/*" multiple></label>';
    $('#carFiles').addEventListener('change', function (e) {
      Array.prototype.slice.call(e.target.files || []).forEach(function (file) {
        if (!/^image\//.test(file.type)) return;
        var item = { pending: true, progress: 0, preview: URL.createObjectURL(file) };
        carEd.media.push(item);
        drawCarMedia();
        var timer = setInterval(function () {
          var bar = $$('#carMedia .ed-prog i')[carEd.media.filter(function (m) { return m.pending; }).indexOf(item)];
          if (bar) bar.style.width = Math.round((item.progress || 0) * 100) + '%';
        }, 250);
        window.Admin.uploadPhoto(file, item).then(function () {
          item.pending = false;
        }).catch(function (err) {
          carEd.media.splice(carEd.media.indexOf(item), 1);
          MR.alert(t('adminErr') + ': ' + (err && err.message ? err.message : err));
        }).then(function () { clearInterval(timer); drawCarMedia(); });
      });
      e.target.value = '';
    });
  }
  function carOk() {
    if (carEd.media.some(function (m) { return m.pending; })) { MR.alert(t('adminUploading')); return; }
    var c = carEd.car;
    c.name = val('crName');
    if (!c.name) { MR.hapticNotify('error'); MR.alert(t('carName')); return; }
    c.year = num(val('crYear'));
    c.color = val('crColor') || 'black';
    c.trim = val('crTrim');
    c.status = segVal('crStatus') || 'free';
    c.bookedUntil = c.status === 'booked' ? val('crUntil') : '';
    c.seats = num(val('crSeats'));
    c.gear = segVal('crGear') || 'auto';
    c.pricePerDay = num(val('crPrice'));
    c.deposit = num(val('crDeposit'));
    c.note = setRu(c.note, val('crNote'));
    c.active = $('#crActive').checked;
    c.photos = carEd.media.filter(function (m) { return m.url; }).map(function (m) { return m.url; });
    if (carEd.i >= 0) svc.cars.items[carEd.i] = c; else svc.cars.items.push(c);
    carEd = null;
    saveServices();
  }
  function carDel() {
    confirmBox(t('svcDelCarQ')).then(function (ok) {
      if (!ok) return;
      svc.cars.items.splice(carEd.i, 1);
      carEd = null;
      saveServices();
    });
  }

  /* машина из вкладки «Авто»: сразу в форму, без списка услуг */
  function openCarDirect(id) {
    svc = JSON.parse(JSON.stringify(MR.D.services || {}));
    svc.cars = svc.cars || { items: [] };
    svc.cars.items = svc.cars.items || [];
    var i = id ? svc.cars.items.map(function (c) { return c.id; }).indexOf(id) : -1;
    editCar(i >= 0 ? i : null);
    carEd.direct = true;
    MR.openSheet('#sheetAdmin');
  }
  /* быстрый статус в карточке машины: свободна / забронирована до даты */
  function saveCarStatus(id, btn) {
    var box = document.querySelector('[data-car-admin="' + id + '"]');
    if (!box) return;
    var on = box.querySelector('.st-opt.is-on');
    var status = on ? on.getAttribute('data-car-st') : 'free';
    var until = box.querySelector('.car-until').value;
    btn.disabled = true;
    MR.api.post('/api/admin/car-status', { id: id, status: status, until: until }).then(function (res) {
      MR.D.services = res.services;
      MR.hapticNotify('success');
      toast(t('carStatusSaved'));
      window.Services.render('cars');
    }).catch(function (e) { MR.alert(t('adminErr') + ': ' + e.message); btn.disabled = false; });
  }

  /* ================================================== PDF-политика владельцам */
  function openOwner() {
    var base = location.origin + location.pathname.replace(/[^/]*$/, '') + 'assets/docs/';
    $('#adminScroll').innerHTML = head(t('adminOwnerPdf'), t('ownerPdfSub')) +
      '<div class="wrap" style="display:grid;gap:10px;padding-bottom:12px">' +
        '<p style="color:var(--ink-2);font-size:14px">' + t('ownerHint') + '</p>' +
        '<button class="btn" data-biz="pdf-send" data-lang="ar">' + MR.ICON.tg + t('ownerSendAr') + '</button>' +
        '<button class="btn btn-ghost" data-biz="pdf-send" data-lang="ru">' + t('ownerSendRu') + '</button>' +
        '<button class="btn btn-ghost" data-biz="pdf-send" data-lang="en">' + t('ownerSendEn') + '</button>' +
        '<div class="section-title" style="padding-left:0">' + t('ownerOpen') + '</div>' +
        ['ar', 'ru', 'en'].map(function (l) {
          return '<button class="link-line" data-go="' + base + 'owner-policy-' + l + '.pdf">' + MR.ICON.doc + 'owner-policy-' + l + '.pdf</button>';
        }).join('') +
      '</div>';
    $('#adminCta').innerHTML = '';
    MR.openSheet('#sheetAdmin');
  }
  function sendPdf(lang, btn) {
    btn.disabled = true;
    MR.api.post('/api/admin/owner-pdf', { lang: lang }).then(function () {
      MR.hapticNotify('success');
      toast(t('ownerSent'));
    }).catch(function (e) { MR.alert(e.message); })
      .then(function () { btn.disabled = false; });
  }

  /* ---------------------------------------------------------------- клики */
  function handleClick(e) {
    var b = e.target.closest('[data-biz]');
    if (!b) return false;
    var k = b.getAttribute('data-biz');
    var id = b.getAttribute('data-id');
    var i = b.getAttribute('data-i');
    if (k === 'report') openReport();
    else if (k === 'rep-month') {
      var m = rep.data.months, idx = m.indexOf(rep.data.month) + (+b.getAttribute('data-d'));
      if (m[idx]) { rep.month = m[idx]; loadReport(); }
    }
    else if (k === 'deal') editDeal(rep.data.deals.filter(function (x) { return x.id === id; })[0]);
    else if (k === 'deal-new') editDeal(null);
    else if (k === 'deal-save') saveDeal(id);
    else if (k === 'deal-del') deleteDeal(id);
    else if (k === 'report-back') drawReport();
    else if (k === 'services') openServices();
    else if (k === 'svc-save') saveServices();
    else if (k === 'stop-add') {
      readServices();
      var it = svc.tours.items[+i];
      it.stops = (it.stops || []).concat([{ title: null, text: null }]);
      drawServices();
      var last = $('#trStops' + i + ' .stop-row:last-child input');
      if (last) { last.focus(); last.scrollIntoView({ block: 'center' }); }
    }
    else if (k === 'stop-del') { readServices(); svc.tours.items[+i].stops.splice(+b.getAttribute('data-j'), 1); drawServices(); }
    else if (k === 'car-new') editCar(null);
    else if (k === 'car-edit') editCar(+i);
    else if (k === 'car-ok') carOk();
    else if (k === 'car-del') carDel();
    else if (k === 'car-back') { var direct = carEd && carEd.direct; carEd = null; if (direct) MR.closeSheet(); else drawServices(); }
    else if (k === 'car-busy-del') { carEd.car.busy.splice(+b.getAttribute('data-j'), 1); $('#crBusy').innerHTML = busyRows(carEd.car); }
    else if (k === 'car-new-direct' || k === 'car-open') openCarDirect(k === 'car-open' ? id : null);
    else if (k === 'car-st-save') saveCarStatus(id, b);
    else if (k === 'car-ph') {
      var a = b.getAttribute('data-a'), n = +i, md = carEd.media;
      if (a === 'del') md.splice(n, 1);
      else { var j = a === 'left' ? n - 1 : n + 1; if (j >= 0 && j < md.length) { var tmp = md[n]; md[n] = md[j]; md[j] = tmp; } }
      drawCarMedia();
    }
    else if (k === 'partner-send') sendPartnerLink();
    else if (k === 'partner-remove') {
      confirmBox(t('partnerRemoveQ')).then(function (ok) { if (ok) loadPartners({ action: 'remove', id: id }); });
    }
    else if (k === 'owner') openOwner();
    else if (k === 'pdf-send') sendPdf(b.getAttribute('data-lang'), b);
    MR.haptic('light');
    return true;
  }

  window.AdminBiz = {
    init: function (core) {
      MR = core; t = core.t; L = core.L; esc = core.esc;
      ready = true;
      if (window.Services) window.Services.onRender(fillSlots);
      if (window.Admin) window.Admin.render();
    },
    barHTML: barHTML,
    handleClick: handleClick,
    openReport: openReport,
    openServices: openServices,
    openOwner: openOwner,
    editCar: openCarDirect
  };
})();

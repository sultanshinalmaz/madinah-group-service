/* ==========================================================================
   Панель риелтора. Загружается только у риелтора (его telegram id — в ADMIN_IDS
   на сервере). Добавление и правка квартир, фото и видео с телефона,
   заполнение из текста поста, перевод, точка на карте, статусы.
   ========================================================================== */
(function () {
  'use strict';

  var MR, t, L, esc;
  var ed = null;             // рабочая копия редактируемой квартиры
  var edLang = 'ru';
  var edMap = null, edMarker = null;
  var LANGS = ['ru', 'uz', 'en'];
  var AMEN = ['electricity', 'water', 'gas', 'wifi', 'furniture', 'ac', 'kitchen', 'fridge', 'washer', 'tv'];
  var STATUSES = ['free', 'booked', 'busy', 'rented', 'draft'];
  /* предел размера файла задаёт сервер: на Vercel это 4 МБ, на своём сервере — 300 */
  function maxMb() { var h = MR.state && MR.state.health; return (h && h.maxUploadMb) || 300; }
  var PIN = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/></svg>';

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function toast(msg) {
    var el = document.createElement('div');
    el.className = 'ed-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2700);
  }
  function uid() { return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (document.querySelector('script[src="' + src + '"]')) return res();
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  function confirmBox(text) {
    return new Promise(function (res) {
      var tg = MR.tg;
      if (tg && tg.showConfirm && tg.isVersionAtLeast && tg.isVersionAtLeast('6.2')) tg.showConfirm(text, function (ok) { res(!!ok); });
      else res(window.confirm(text));
    });
  }

  /* ------------------------------------------------------ полоса в каталоге */
  function renderBar() {
    var bar = $('#adminBar');
    if (!bar) return;
    var all = MR.state.items;
    var drafts = all.filter(function (a) { return a.status === 'draft'; }).length;
    var hidden = all.filter(function (a) { return a.status === 'rented'; }).length;
    var booked = all.filter(function (a) { return a.status === 'booked'; }).length;
    bar.hidden = false;
    bar.innerHTML = '<div class="admin-bar">' +
      '<div class="ab-t"><b>' + t('adminPanel') + '</b>' +
        [t('adminCntDrafts') + ': ' + drafts, t('adminCntBooked') + ': ' + booked, t('adminCntRented') + ': ' + hidden].join(' · ') + '</div>' +
      '<button class="btn" data-adm="new">+ ' + t('adminAdd') + '</button>' +
    '</div>' + (window.AdminBiz ? window.AdminBiz.barHTML() : '');
  }

  /* -------------------------------------------------------- открыть форму */
  function blankListing() {
    return {
      id: '', code: '', status: 'draft', bookedUntil: '', busyUntil: '', pin: false, district: Object.keys(MR.D.districts)[0] || '',
      title: { ru: '', uz: '', en: '' }, rooms: 1, beds: null, baths: 1, floor: null, lift: false,
      price: { month: null, day: null, year: null, deposit: 0, agentFee: 500 },
      priceNotes: [], includes: ['furniture', 'ac'], extra: ['electricity'],
      terms: { iqama: false, minStay: 'month', forWhom: 'any' },
      walk: { haram: null, other: null }, features: [], photos: [], videos: [], geo: null, post: ''
    };
  }

  function toWork(ap) {
    var w = JSON.parse(JSON.stringify(ap));
    w.texts = {};
    LANGS.forEach(function (l) {
      w.texts[l] = {
        title: (ap.title && ap.title[l]) || '',
        features: (ap.features || []).map(function (f) { return f[l] || ''; }).join('\n').replace(/\n+$/, ''),
        notes: (ap.priceNotes || []).map(function (n) { return n[l] || ''; }).join('\n').replace(/\n+$/, ''),
        haram: (ap.walk && ap.walk.haram && ap.walk.haram[l]) || '',
        other: (ap.walk && ap.walk.other && ap.walk.other[l]) || ''
      };
    });
    w.media = (ap.photos || []).map(function (p) { return { type: 'photo', url: p }; })
      .concat((ap.videos || []).map(function (v) { return { type: 'video', src: v.src, poster: v.poster }; }));
    w.includes = (ap.includes || []).slice();
    w.extra = (ap.extra || []).slice();
    w.newDistrict = null;
    return w;
  }

  function create() { open(toWork(blankListing()), true); }
  function edit(id) {
    var ap = MR.find(id);
    if (!ap) { toast('Не найдено'); return; }
    open(toWork(ap), false);
  }

  function open(work, isNew) {
    if (!MR.state.server) { MR.alert(t('adminNoServer')); return; }
    ed = work;
    ed.isNew = isNew;
    edLang = 'ru';
    renderEditor();
    MR.openSheet('#sheetAdmin');
    setTimeout(initMiniMap, 350);
  }

  /* --------------------------------------------------------- форма */
  function opt(v, label, cur) { return '<option value="' + esc(v) + '"' + (String(cur) === String(v) ? ' selected' : '') + '>' + esc(label) + '</option>'; }
  function numField(id, label, val) {
    return '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '" type="number" inputmode="numeric" min="0" value="' + (val == null ? '' : esc(val)) + '"></div>';
  }

  function renderEditor() {
    var D = MR.D;
    var st = ed.status;
    var until = st === 'booked' ? ed.bookedUntil : ed.busyUntil;
    var districtOpts = Object.keys(D.districts).map(function (k) { return opt(k, L(D.districts[k]), ed.district); }).join('') +
      opt('__new', t('adminNewDistrict'), ed.newDistrict ? '__new' : '');
    var stayOpts = ['day', 'month', '3months', '6months', 'year'].map(function (v) {
      return opt(v, t({ day: 'minStayDay', month: 'minStayMonth', '3months': 'minStay3', '6months': 'minStay6', year: 'minStayYear' }[v]), ed.terms.minStay);
    }).join('');
    var whoOpts = ['any', 'family', 'students'].map(function (v) {
      return opt(v, t({ any: 'forAny', family: 'forFamily', students: 'forStudents' }[v]), ed.terms.forWhom);
    }).join('');

    $('#adminScroll').innerHTML = '' +
      '<div class="sheet-head"><h2>' + (ed.isNew ? t('adminNew') : t('adminEdit') + (ed.code ? ' · ' + esc(ed.code) : '')) + '</h2>' +
        '<div class="sub">' + (ed.status === 'draft' ? t('adminHiddenNote') : esc(MR.statusText(ed))) + '</div></div>' +

      '<div class="ed-sec"><h3>' + t('adminMedia') + '</h3>' +
        '<div class="ed-media" id="edMedia"></div>' +
        '<div class="ed-hint">' + t('adminMediaHint') + '</div></div>' +

      '<div class="ed-sec"><h3>' + t('adminPaste') + '</h3>' +
        '<div class="ed-hint">' + t('adminPasteHint') + '</div>' +
        '<div class="field"><textarea id="edPaste" rows="4" placeholder="🏠 2-комнатная квартира / Медина&#10;💰 2 500 риал в месяц&#10;…"></textarea></div>' +
        '<button class="btn btn-ghost" data-adm="fill" style="min-height:44px">' + t('adminFill') + '</button></div>' +

      '<div class="ed-sec"><h3>' + t('adminStatus') + '</h3>' +
        '<div class="st-seg" id="edStatus">' + STATUSES.map(function (s) {
          return '<button class="st-opt st-' + s + (st === s ? ' is-on' : '') + '" data-adm-st="' + s + '">' + t({ free: 'stFree', booked: 'stBooked', busy: 'stBusy', rented: 'stRented', draft: 'stDraft' }[s]) + '</button>';
        }).join('') + '</div>' +
        '<div class="field" id="edDateBox"' + (st === 'booked' || st === 'busy' ? '' : ' hidden') + '><label for="edDate">' + t('adminDate') + '</label>' +
          '<input id="edDate" type="date" value="' + esc(until || '') + '"></div>' +
        '<label class="check"><input type="checkbox" id="edPin"' + (ed.pin ? ' checked' : '') + '><span>' + t('acaPin') + '</span></label></div>' +

      '<div class="ed-sec"><h3>' + t('adminMain') + '</h3>' +
        '<div class="ed-grid2">' +
          '<div class="field"><label for="edCode">' + t('codeLabel') + '</label><input id="edCode" value="' + esc(ed.code || '') + '" placeholder="TG24" autocapitalize="characters"></div>' +
          '<div class="field"><label for="edDistrict">' + t('adminDistrict') + '</label><select id="edDistrict">' + districtOpts + '</select></div>' +
        '</div>' +
        '<div id="edNewDistrict"' + (ed.newDistrict ? '' : ' hidden') + ' class="ed-grid3">' +
          '<div class="field"><label>RU</label><input id="edNdRu" value="' + esc(ed.newDistrict ? ed.newDistrict.ru || '' : '') + '" placeholder="' + t('adminNewDistrictName') + '"></div>' +
          '<div class="field"><label>UZ</label><input id="edNdUz" value="' + esc(ed.newDistrict ? ed.newDistrict.uz || '' : '') + '"></div>' +
          '<div class="field"><label>EN</label><input id="edNdEn" value="' + esc(ed.newDistrict ? ed.newDistrict.en || '' : '') + '"></div>' +
        '</div>' +
        '<div class="ed-grid3">' +
          numField('edRooms', t('rooms'), ed.rooms) + numField('edBaths', t('adminBaths'), ed.baths) + numField('edBeds', t('adminBeds'), ed.beds) +
        '</div>' +
        '<div class="ed-grid2">' + numField('edFloor', t('adminFloor'), ed.floor) +
          '<label class="check" style="align-self:end"><input type="checkbox" id="edLift"' + (ed.lift ? ' checked' : '') + '><span>' + t('adminLift') + '</span></label>' +
        '</div></div>' +

      '<div class="ed-sec"><h3>' + t('adminPrices') + '</h3>' +
        '<div class="ed-grid3">' + numField('edMonth', t('adminMonth'), ed.price.month) + numField('edDay', t('adminDay'), ed.price.day) + numField('edYear', t('adminYear'), ed.price.year) + '</div>' +
        '<div class="ed-grid2">' + numField('edDeposit', t('adminDeposit'), ed.price.deposit || '') + numField('edFee', t('adminFee'), ed.price.agentFee || '') + '</div></div>' +

      '<div class="ed-sec"><h3>' + t('included') + ' / ' + t('extraPay') + '</h3>' +
        '<div class="ed-hint">' + t('adminAmenHint') + '</div>' +
        '<div class="am-chips" id="edAmen">' + amenChips() + '</div></div>' +

      '<div class="ed-sec"><h3>' + t('terms') + '</h3>' +
        '<div class="ed-grid2">' +
          '<div class="field"><label for="edStay">' + t('adminMinStay') + '</label><select id="edStay">' + stayOpts + '</select></div>' +
          '<div class="field"><label for="edWho">' + t('adminForWhom') + '</label><select id="edWho">' + whoOpts + '</select></div>' +
        '</div>' +
        '<div class="ed-grid2">' + numField('edMaxPeople', t('adminMaxPeople'), ed.terms.maxPeople) +
          '<label class="check" style="align-self:end"><input type="checkbox" id="edIqama"' + (ed.terms.iqama ? ' checked' : '') + '><span>' + t('iqamaYes') + '</span></label>' +
        '</div></div>' +

      '<div class="ed-sec"><h3>' + t('adminTexts') + '</h3>' +
        '<div class="ed-langs" id="edLangs">' + langTabs() + '</div>' +
        '<div id="edTexts">' + textFields() + '</div>' +
        '<button class="btn btn-ghost" data-adm="translate" style="min-height:44px">' + t('adminTranslate') + '</button></div>' +

      '<div class="ed-sec"><h3>' + t('adminPlace') + '</h3>' +
        '<div class="ed-hint">' + t('adminPlaceHint') + '</div>' +
        '<div class="ed-map" id="edMap"></div>' +
        '<button class="btn btn-ghost" data-adm="pin-reset" style="min-height:42px">' + t('adminPlaceReset') + '</button></div>' +

      '<div class="ed-sec"><div class="field"><label for="edPost">' + t('adminPost') + '</label>' +
        '<input id="edPost" value="' + esc(ed.post || '') + '" placeholder="https://t.me/madinah_rent/400" inputmode="url"></div>' +
        (ed.isNew ? '' : '<button class="btn btn-danger" data-adm="delete" style="min-height:44px">' + t('adminDelete') + '</button>') +
      '</div>';

    $('#adminCta').innerHTML =
      '<button class="btn" data-adm="save">' + t('adminPublish') + '</button>' +
      '<button class="btn btn-ghost" data-adm="draft">' + t('adminSaveDraft') + '</button>';

    renderMedia();
    $('#edDistrict').addEventListener('change', function (e) {
      var isNew = e.target.value === '__new';
      $('#edNewDistrict').hidden = !isNew;
      ed.newDistrict = isNew ? (ed.newDistrict || { ru: '', uz: '', en: '' }) : null;
      if (!isNew) { ed.district = e.target.value; if (!ed.geo) centerMiniMap(); }
    });
  }

  function amenChips() {
    return AMEN.map(function (k) {
      var cls = ed.includes.indexOf(k) >= 0 ? ' inc' : ed.extra.indexOf(k) >= 0 ? ' ext' : '';
      return '<button class="am-chip' + cls + '" data-amen="' + k + '">' + esc(L(window.AMENITIES[k])) + '</button>';
    }).join('');
  }
  function langTabs() {
    return LANGS.map(function (l) {
      var empty = !ed.texts[l].title;
      return '<button class="' + (l === edLang ? 'is-on' : '') + (empty && l !== 'ru' ? ' is-empty' : '') + '" data-adm-lang="' + l + '">' + l.toUpperCase() + '</button>';
    }).join('');
  }
  function textFields() {
    var x = ed.texts[edLang];
    return '<div style="display:grid;gap:12px">' +
      '<div class="field"><label for="edTitle">' + t('adminTitleL') + ' (' + edLang.toUpperCase() + ')</label><input id="edTitle" value="' + esc(x.title) + '"></div>' +
      '<div class="field"><label for="edHaram">' + t('adminHaram') + '</label><input id="edHaram" value="' + esc(x.haram) + '" placeholder="' + (edLang === 'ru' ? '1,2 км, 15–20 мин пешком' : edLang === 'uz' ? '1,2 km, piyoda 15–20 daqiqa' : '1.2 km, 15–20 min walk') + '"></div>' +
      '<div class="field"><label for="edFeatures">' + t('adminFeatures') + '</label><textarea id="edFeatures" rows="4">' + esc(x.features) + '</textarea></div>' +
      '<div class="field"><label for="edNotes">' + t('adminNotes') + '</label><textarea id="edNotes" rows="2">' + esc(x.notes) + '</textarea></div>' +
    '</div>';
  }
  function saveTextTab() {
    if (!$('#edTitle')) return;
    var x = ed.texts[edLang];
    x.title = $('#edTitle').value.trim();
    x.haram = $('#edHaram').value.trim();
    x.features = $('#edFeatures').value.replace(/\s+$/, '');
    x.notes = $('#edNotes').value.replace(/\s+$/, '');
  }

  /* ------------------------------------------------------ фото и видео */
  function renderMedia() {
    var box = $('#edMedia');
    if (!box) return;
    var photosFirst = ed.media;
    box.innerHTML = photosFirst.map(function (m, i) {
      var img = m.type === 'video' ? (m.preview || (m.poster ? MR.media(m.poster) : '')) : (m.preview || MR.mediaCard(m.url));
      return '<div class="ed-m">' +
        (img ? '<img src="' + esc(img) + '" alt="" onerror="this.onerror=null;this.src=\'' + esc(m.type === 'photo' && m.url ? MR.media(m.url) : '') + '\'">' : '') +
        (m.type === 'video' ? '<span class="ed-vid">' + window.Gallery.playIcon + '</span>' : (i === firstPhotoIndex() ? '<span class="ed-cover">' + (MR.state.lang === 'en' ? 'Cover' : MR.state.lang === 'uz' ? 'Muqova' : 'Обложка') + '</span>' : '')) +
        (m.pending ? '<div class="ed-prog"><i style="width:' + Math.round((m.progress || 0) * 100) + '%"></i></div>'
                   : '<div class="ed-tools"><button data-adm-media="left" data-i="' + i + '" aria-label="' + t('prev') + '">‹</button>' +
                     '<button class="del" data-adm-media="del" data-i="' + i + '" aria-label="×">×</button>' +
                     '<button data-adm-media="right" data-i="' + i + '" aria-label="' + t('next') + '">›</button></div>') +
      '</div>';
    }).join('') +
      '<label class="ed-add"><b>+</b>' + t('adminAddMedia') + '<input type="file" id="edFiles" accept="image/*,video/*" multiple></label>';
    $('#edFiles').addEventListener('change', function (e) { addFiles(Array.prototype.slice.call(e.target.files || [])); e.target.value = ''; });
  }
  function firstPhotoIndex() {
    for (var i = 0; i < ed.media.length; i++) if (ed.media[i].type === 'photo') return i;
    return -1;
  }

  function addFiles(files) {
    files.forEach(function (file) {
      var isVideo = /^video\//.test(file.type) || /\.(mp4|mov|webm|m4v)$/i.test(file.name);
      var lim = maxMb();
      if (file.size > lim * 1048576) {
        // видео крупнее предела на Vercel не загрузить — его проще прислать боту в Telegram
        MR.alert(MR.tpl(isVideo && lim <= 20 ? 'adminVideoBot' : 'adminFileBig', { n: lim }));
        return;
      }
      var item = isVideo
        ? { type: 'video', pending: true, progress: 0, preview: '' }
        : { type: 'photo', pending: true, progress: 0, preview: URL.createObjectURL(file) };
      ed.media.push(item);
      renderMedia();
      (isVideo ? uploadVideo(file, item) : uploadPhoto(file, item)).then(function () {
        item.pending = false;
        renderMedia();
      }).catch(function (e) {
        ed.media.splice(ed.media.indexOf(item), 1);
        renderMedia();
        MR.alert(t('adminErr') + ': ' + (e && e.message ? e.message : e));
      });
    });
  }

  function loadImage(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return imgEl(file); });
    }
    return imgEl(file);
  }
  function imgEl(file) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () { res(img); };
      img.onerror = function () { rej(new Error('фото не читается')); };
      img.src = URL.createObjectURL(file);
    });
  }
  function canvasBlob(src, w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, w, h);
    return new Promise(function (res) {
      c.toBlob(function (b) {
        if (b && b.type === 'image/webp') return res({ blob: b, ext: 'webp' });
        c.toBlob(function (j) { res({ blob: j, ext: 'jpg' }); }, 'image/jpeg', 0.88);
      }, 'image/webp', 0.86);
    });
  }
  /* фото ужимаем на телефоне: 1600 px по длинной стороне и копия 800 для карточек */
  function uploadPhoto(file, item) {
    var id = uid();
    return loadImage(file).then(function (img) {
      var W = img.width, H = img.height;
      var k = Math.min(1, 1600 / Math.max(W, H));
      var k2 = Math.min(1, 800 / W);
      return Promise.all([canvasBlob(img, Math.round(W * k), Math.round(H * k)), canvasBlob(img, Math.round(W * k2), Math.round(H * k2))]);
    }).then(function (pair) {
      return send(pair[0].blob, id, pair[0].ext, function (p) { item.progress = p * 0.8; progressOnly(); })
        .then(function (r) {
          return send(pair[1].blob, id + '-m', pair[1].ext, function (p) { item.progress = 0.8 + p * 0.2; progressOnly(); })
            .then(function () { item.url = r.url; });
        });
    });
  }
  /* видео: кадр-обложку снимаем в браузере, сам файл сервер сожмёт в фоне */
  function uploadVideo(file, item) {
    var id = uid();
    var ext = ((file.name.match(/\.(mp4|mov|webm|m4v)$/i) || [])[1] || (file.type.split('/')[1] || 'mp4')).toLowerCase().replace('quicktime', 'mov');
    return posterOf(file).then(function (poster) {
      var step = poster ? send(poster.blob, id + '-poster', poster.ext).then(function (r) { item.poster = r.url; item.preview = r.url; renderMedia(); }) : Promise.resolve();
      return step.then(function () {
        return send(file, id, ext, function (p) { item.progress = p; progressOnly(); }).then(function (r) { item.src = r.url; });
      });
    });
  }
  function posterOf(file) {
    return new Promise(function (res) {
      var v = document.createElement('video');
      var done = false;
      var finish = function (x) { if (!done) { done = true; res(x); } };
      v.muted = true; v.playsInline = true; v.preload = 'metadata';
      v.onloadedmetadata = function () { try { v.currentTime = Math.min(1, (v.duration || 2) / 3); } catch (e) { finish(null); } };
      v.onseeked = function () {
        var W = v.videoWidth, H = v.videoHeight;
        if (!W) return finish(null);
        var k = Math.min(1, 800 / W);
        canvasBlob(v, Math.round(W * k), Math.round(H * k)).then(finish, function () { finish(null); });
      };
      v.onerror = function () { finish(null); };
      setTimeout(function () { finish(null); }, 8000);
      v.src = URL.createObjectURL(file);
    });
  }
  function send(blob, name, ext, onProgress) {
    return new Promise(function (res, rej) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', MR.api.base + '/api/admin/upload?name=' + encodeURIComponent(name) + '&ext=' + encodeURIComponent(ext));
      var h = MR.api.headers();
      Object.keys(h).forEach(function (k) { xhr.setRequestHeader(k, h[k]); });
      xhr.setRequestHeader('Content-Type', blob.type || 'application/octet-stream');
      if (onProgress) xhr.upload.onprogress = function (e) { if (e.lengthComputable) onProgress(e.loaded / e.total); };
      xhr.onload = function () {
        var j = {};
        try { j = JSON.parse(xhr.responseText); } catch (e) {}
        if (xhr.status === 200 && j.ok) res(j); else rej(new Error(j.error || ('HTTP ' + xhr.status)));
      };
      xhr.onerror = function () { rej(new Error('нет связи с сервером')); };
      xhr.send(blob);
    });
  }
  function progressOnly() {
    var bars = $$('#edMedia .ed-prog i');
    var pend = ed.media.filter(function (m) { return m.pending; });
    bars.forEach(function (b, i) { if (pend[i]) b.style.width = Math.round(pend[i].progress * 100) + '%'; });
  }

  /* ----------------------------------------------- заполнить из текста поста */
  function fillFromPost() {
    var txt = $('#edPaste').value;
    if (!txt.trim()) return;
    loadScript('assets/js/parse-post.js').then(function () {
      var p = window.parsePost(txt, MR.D.districts);
      readForm();
      if (p.code) ed.code = p.code;
      if (p.status) ed.status = p.status;
      if (p.title.ru) ed.texts.ru.title = p.title.ru;
      if (p.title.uz) ed.texts.uz.title = p.title.uz;
      ['rooms', 'baths', 'beds', 'floor'].forEach(function (k) { if (p[k]) ed[k] = p[k]; });
      if (p.lift) ed.lift = true;
      ['month', 'day', 'year', 'deposit', 'agentFee'].forEach(function (k) { if (p.price[k]) ed.price[k] = p.price[k]; });
      if (p.includes.length) ed.includes = p.includes.slice();
      if (p.extra.length) ed.extra = p.extra.slice();
      if (p.terms.iqama != null) ed.terms.iqama = p.terms.iqama;
      if (p.terms.minStay) ed.terms.minStay = p.terms.minStay;
      if (p.terms.forWhom) ed.terms.forWhom = p.terms.forWhom;
      if (p.walk.haram) LANGS.forEach(function (l) { if (p.walk.haram[l]) ed.texts[l].haram = p.walk.haram[l]; });
      if (p.features.length) {
        ed.texts.ru.features = p.features.map(function (f) { return f.ru; }).join('\n');
        ed.texts.uz.features = p.features.map(function (f) { return f.uz || ''; }).join('\n').replace(/\n+$/, '');
      }
      if (p.priceNotes.length) ed.texts.ru.notes = p.priceNotes.map(function (n) { return n.ru; }).join('\n');
      if (p.district) { ed.district = p.district; ed.newDistrict = null; }
      else if (p.districtName && p.districtName.ru) ed.newDistrict = { ru: p.districtName.ru, uz: p.districtName.uz || '', en: p.districtName.uz || '' };
      var keepGeo = ed.geo;
      renderEditor();
      ed.geo = keepGeo;
      setTimeout(initMiniMap, 50);
      MR.hapticNotify('success');
      toast(MR.tpl('adminFilled', { n: p.filled.length }));
    }).catch(function () { MR.alert(t('adminErr')); });
  }

  /* -------------------------------------------------------------- перевод */
  function translate() {
    saveTextTab();
    var ru = ed.texts.ru;
    var fLines = ru.features ? ru.features.split('\n') : [];
    var nLines = ru.notes ? ru.notes.split('\n') : [];
    var texts = [ru.title, ru.haram].concat(fLines, nLines);
    var btn = $('[data-adm="translate"]');
    btn.disabled = true;
    btn.textContent = t('adminTranslating');
    Promise.all(['uz', 'en'].map(function (to) { return MR.api.post('/api/admin/translate', { texts: texts, to: to }); }))
      .then(function (res) {
        var filled = 0;
        ['uz', 'en'].forEach(function (to, n) {
          var out = res[n].texts || [];
          var x = ed.texts[to];
          var put = function (key, val) { if (val && !x[key]) { x[key] = val; filled++; } };
          put('title', out[0]);
          put('haram', out[1]);
          var f = out.slice(2, 2 + fLines.length), nn = out.slice(2 + fLines.length);
          if (!x.features && f.some(Boolean)) { x.features = f.join('\n'); filled++; }
          if (!x.notes && nn.some(Boolean)) { x.notes = nn.join('\n'); filled++; }
        });
        $('#edLangs').innerHTML = langTabs();
        $('#edTexts').innerHTML = textFields();
        toast(filled ? t('adminDone') : t('adminTranslateErr'));
      })
      .catch(function () { MR.alert(t('adminTranslateErr')); })
      .then(function () { btn.disabled = false; btn.textContent = t('adminTranslate'); });
  }

  /* ---------------------------------------------------- точка на карте */
  function districtCenter() {
    var d = MR.D.districts[ed.district];
    return d && d.lat ? [d.lat, d.lng] : window.MapView.haram();
  }
  function initMiniMap() {
    var box = $('#edMap');
    if (!box) return;
    window.MapView.loadLeaflet().then(function () {
      if (edMap) { edMap.remove(); edMap = null; edMarker = null; }
      var c = ed.geo ? [ed.geo.lat, ed.geo.lng] : districtCenter();
      edMap = window.L.map(box, { zoomControl: true, attributionControl: false }).setView(c, ed.geo ? 16 : 15);
      window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(edMap);
      if (ed.geo) placePin(ed.geo.lat, ed.geo.lng);
      edMap.on('click', function (e) {
        ed.geo = { lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) };
        placePin(ed.geo.lat, ed.geo.lng);
        MR.haptic('light');
      });
    }).catch(function () { box.textContent = t('mapOffline'); });
  }
  function placePin(lat, lng) {
    var icon = window.L.divIcon({ className: '', html: '<div class="ed-pin">' + PIN + '</div>', iconSize: null });
    if (edMarker) edMarker.setLatLng([lat, lng]);
    else edMarker = window.L.marker([lat, lng], { icon: icon }).addTo(edMap);
  }
  function centerMiniMap() {
    if (!edMap) return;
    edMap.setView(districtCenter(), 15);
  }

  /* ------------------------------------------------------ собрать и сохранить */
  function val(id) { var el = $('#' + id); return el ? el.value : ''; }
  function numVal(id) { var n = Number(val(id)); return isFinite(n) && n > 0 ? Math.round(n) : null; }
  function readForm() {
    if (!$('#edCode')) return;
    saveTextTab();
    ed.code = val('edCode').trim().toUpperCase();
    var on = $('#edStatus .is-on');
    ed.status = on ? on.getAttribute('data-adm-st') : ed.status;
    var d = val('edDate');
    if (ed.status === 'booked') ed.bookedUntil = d;
    if (ed.status === 'busy') ed.busyUntil = d;
    var dist = val('edDistrict');
    if (dist === '__new') ed.newDistrict = { ru: val('edNdRu').trim(), uz: val('edNdUz').trim(), en: val('edNdEn').trim() };
    else { ed.district = dist; ed.newDistrict = null; }
    ed.rooms = numVal('edRooms') || 1;
    ed.baths = numVal('edBaths') || 1;
    ed.beds = numVal('edBeds');
    ed.floor = numVal('edFloor');
    ed.lift = $('#edLift').checked;
    ed.price = { month: numVal('edMonth'), day: numVal('edDay'), year: numVal('edYear'), deposit: numVal('edDeposit') || 0, agentFee: numVal('edFee') || 0 };
    ed.terms = { iqama: $('#edIqama').checked, minStay: val('edStay'), forWhom: val('edWho'), maxPeople: numVal('edMaxPeople') };
    ed.post = val('edPost').trim();
    ed.pin = $('#edPin').checked;
  }
  function zip(key) {
    var rows = {};
    var max = 0;
    LANGS.forEach(function (l) {
      rows[l] = (ed.texts[l][key] || '').split('\n').map(function (s) { return s.trim(); });
      max = Math.max(max, rows.ru.length);
    });
    var out = [];
    for (var i = 0; i < rows.ru.length; i++) {
      if (!rows.ru[i]) continue;
      var o = { ru: rows.ru[i] };
      if (rows.uz[i]) o.uz = rows.uz[i];
      if (rows.en[i]) o.en = rows.en[i];
      out.push(o);
    }
    return out;
  }
  function langsOf(key) {
    var o = {};
    LANGS.forEach(function (l) { if (ed.texts[l][key]) o[l] = ed.texts[l][key]; });
    return Object.keys(o).length ? o : null;
  }
  function build() {
    return {
      id: ed.isNew ? '' : ed.id, code: ed.code, status: ed.status, bookedUntil: ed.bookedUntil || '', busyUntil: ed.busyUntil || '', pin: !!ed.pin,
      district: ed.district, title: langsOf('title') || { ru: '' },
      rooms: ed.rooms, beds: ed.beds, baths: ed.baths, floor: ed.floor, lift: ed.lift, price: ed.price,
      priceNotes: zip('notes'), includes: ed.includes, extra: ed.extra, terms: ed.terms,
      walk: { haram: langsOf('haram'), other: langsOf('other') },
      features: zip('features'),
      photos: ed.media.filter(function (m) { return m.type === 'photo' && m.url; }).map(function (m) { return m.url; }),
      videos: ed.media.filter(function (m) { return m.type === 'video' && m.src; }).map(function (m) { return { src: m.src, poster: m.poster || '' }; }),
      geo: ed.geo, post: ed.post
    };
  }

  function save(asDraft) {
    readForm();
    if (ed.media.some(function (m) { return m.pending; })) { MR.alert(t('adminUploading')); return; }
    if (asDraft) ed.status = 'draft';
    else if (ed.status === 'draft') ed.status = 'free';
    var ap = build();
    if (!ap.title.ru || !(ap.price.month || ap.price.day || ap.price.year)) { MR.hapticNotify('error'); MR.alert(t('adminNeed')); return; }
    var body = { apartment: ap };
    if (ed.newDistrict && (ed.newDistrict.ru || ed.newDistrict.uz)) {
      body.newDistrict = Object.assign({}, ed.newDistrict, ed.geo ? { lat: ed.geo.lat, lng: ed.geo.lng } : {});
    }
    var btns = $$('#adminCta .btn');
    btns.forEach(function (b) { b.disabled = true; });
    MR.api.post('/api/admin/listing', body).then(function (res) {
      if (res.districts) MR.D.districts = Object.assign({}, MR.D.districts, res.districts);
      MR.hapticNotify('success');
      toast(t('adminSaved'));
      MR.closeSheet();
      return MR.reload();
    }).catch(function (e) {
      MR.hapticNotify('error');
      MR.alert(t('adminErr') + ': ' + e.message);
    }).then(function () { btns.forEach(function (b) { b.disabled = false; }); });
  }

  function remove() {
    confirmBox(t('adminDeleteQ')).then(function (ok) {
      if (!ok) return;
      MR.api.post('/api/admin/delete', { id: ed.id }).then(function () {
        toast(t('adminSaved'));
        MR.closeSheet();
        MR.reload();
      }).catch(function (e) { MR.alert(t('adminErr') + ': ' + e.message); });
    });
  }

  /* ------------------------------------------------------------ клики */
  function handleClick(e) {
    var a = e.target.closest('[data-adm]');
    if (a) {
      var k = a.getAttribute('data-adm');
      if (k === 'new') create();
      else if (k === 'save') save(false);
      else if (k === 'draft') save(true);
      else if (k === 'delete') remove();
      else if (k === 'fill') fillFromPost();
      else if (k === 'translate') translate();
      else if (k === 'pin-reset') { ed.geo = null; if (edMarker) { edMarker.remove(); edMarker = null; } centerMiniMap(); }
      return true;
    }
    var st = e.target.closest('[data-adm-st]');
    if (st) {
      $$('#edStatus .st-opt').forEach(function (b) { b.classList.toggle('is-on', b === st); });
      var s = st.getAttribute('data-adm-st');
      $('#edDateBox').hidden = !(s === 'booked' || s === 'busy');
      var until = s === 'booked' ? ed.bookedUntil : ed.busyUntil;
      $('#edDate').value = until || '';
      MR.haptic('light');
      return true;
    }
    var lg = e.target.closest('[data-adm-lang]');
    if (lg) {
      saveTextTab();
      edLang = lg.getAttribute('data-adm-lang');
      $('#edLangs').innerHTML = langTabs();
      $('#edTexts').innerHTML = textFields();
      return true;
    }
    var am = e.target.closest('[data-amen]');
    if (am) {
      var key = am.getAttribute('data-amen');
      if (ed.includes.indexOf(key) >= 0) { ed.includes.splice(ed.includes.indexOf(key), 1); ed.extra.push(key); }
      else if (ed.extra.indexOf(key) >= 0) ed.extra.splice(ed.extra.indexOf(key), 1);
      else ed.includes.push(key);
      $('#edAmen').innerHTML = amenChips();
      MR.haptic('light');
      return true;
    }
    var md = e.target.closest('[data-adm-media]');
    if (md) {
      var i = +md.getAttribute('data-i');
      var act = md.getAttribute('data-adm-media');
      if (act === 'del') ed.media.splice(i, 1);
      else {
        var j = act === 'left' ? i - 1 : i + 1;
        if (j >= 0 && j < ed.media.length) { var tmp = ed.media[i]; ed.media[i] = ed.media[j]; ed.media[j] = tmp; }
      }
      renderMedia();
      MR.haptic('light');
      return true;
    }
    return false;
  }

  /* ?new=1 или ?edit=<id> — из кнопок бота */
  function afterStart() {
    renderBar();
    var q = new URLSearchParams(location.search);
    if (q.get('new')) setTimeout(create, 200);
    else if (q.get('edit')) setTimeout(function () { edit(q.get('edit')); }, 200);
  }

  window.Admin = {
    init: function (core) { MR = core; t = core.t; L = core.L; esc = core.esc; renderBar(); },
    render: renderBar,
    afterStart: afterStart,
    handleClick: handleClick,
    edit: edit,
    create: create,
    uploadPhoto: uploadPhoto
  };
})();

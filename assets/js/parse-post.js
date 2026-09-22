/* ==========================================================================
   Разбор текста объявления из канала @madinah_rent в поля карточки.
   Посты там идут по одному шаблону: русский блок, флаги 🇺🇿, узбекский блок.
   Работает и в браузере (window.parsePost), и на сервере (require).
   Результат — черновик: риелтор проверяет поля перед сохранением.
   ========================================================================== */
(function (root) {
  'use strict';

  var UZ_FLAG = '🇺🇿';          // 🇺🇿
  var FLAGS = /(?:\uD83C[\uDDE6-\uDDFF]){2}/g;        // любые флаги
  var EMOJI = /[☀-➿️‍⃣]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDFFF]/g;

  function num(s) {
    if (s == null) return null;
    var n = parseFloat(String(s).replace(/[\s ]/g, '').replace(/,(?=\d{3}\b)/g, '').replace(',', '.'));
    return isNaN(n) ? null : Math.round(n);
  }
  function clean(line) {
    return line.replace(/[\u200B-\u200F\u2060\uFEFF]/g, '').replace(FLAGS, '').replace(EMOJI, '').replace(/[•·]/g, '').replace(/\s+/g, ' ').trim();
  }
  function isNoise(line) {
    return /^(связь|aloqa|для братьев|для сест|erkaklar|opa-singil|telegram|instagram)/i.test(clean(line)) ||
           /@\w{4,}/.test(line) || /telegram\s+instagram/i.test(clean(line)) ||
           /please open telegram|view in telegram/i.test(line);
  }

  function splitLangs(text) {
    var t = String(text || '').replace(/\r/g, '');
    var i = t.indexOf(UZ_FLAG + UZ_FLAG);
    if (i < 0) i = t.indexOf(UZ_FLAG);
    return i > 0 ? { ru: t.slice(0, i), uz: t.slice(i) } : { ru: t, uz: '' };
  }

  function lines(block) {
    return block.split('\n').map(function (l) { return l.trim(); })
      .filter(function (l) { return l && clean(l) && !isNoise(l); });
  }

  /* «~1.2 км до мечети Пророка ﷺ 🚶 15–20 минут пешком» → «1,2 км, 15–20 мин пешком» */
  function haramRu(text) {
    var km = text.match(/~?\s*([\d.,]+)\s*км/);
    var parts = [];
    if (km) parts.push(km[1].replace('.', ',') + ' км');
    else {
      var mt = text.match(/~?\s*(\d{2,4})\s*(?:м|метр[а-яё]*)(?![а-яё])/);
      if (mt) parts.push(mt[1] + ' м');
    }
    var re = /(\d+(?:\s*[–-]\s*\d+)?)\s*мин[а-яё]*\s*(пешком|на машине|на авто[а-яё]*)?/g, mm;
    while ((mm = re.exec(text))) {
      parts.push(mm[1].replace(/\s/g, '') + ' мин ' + (mm[2] && /машин|авто/.test(mm[2]) ? 'на машине' : 'пешком'));
    }
    if (!parts.length) {
      var m = text.match(/(\d+)\s*метр/);
      if (m) parts.push(m[1] + ' м');
    }
    return parts.join(', ');
  }
  function haramUz(text) {
    var km = text.match(/~?\s*([\d.,]+)\s*km/i);
    var parts = [];
    if (km) parts.push(km[1].replace('.', ',') + ' km');
    else {
      var mt = text.match(/~?\s*(\d{2,4})\s*(?:m|metr)\b/i);
      if (mt) parts.push(mt[1] + ' m');
    }
    var re = /(mashinada|avtomobilda|piyoda)?\s*(\d+(?:\s*[–-]\s*\d+)?)\s*daqiqa[a-z‘']*\s*(piyoda|mashinada)?/gi, mm;
    while ((mm = re.exec(text))) {
      var car = /mashina|avto/i.test((mm[1] || '') + (mm[3] || ''));
      parts.push((car ? 'mashinada ' : 'piyoda ') + mm[2].replace(/\s/g, '') + ' daqiqa');
    }
    return parts.join(', ');
  }
  function haramEn(ru) {
    return ru.replace(/(\d),(\d)/g, '$1.$2').replace(/км/g, 'km').replace(/мин пешком/g, 'min walk')
      .replace(/мин на машине/g, 'min by car').replace(/(\d)\s*м(?![а-яё])/g, '$1 m');
  }
  /* если узбекской строки в посте нет — переводим сами по шаблону */
  function haramUzFromRu(ru) {
    return ru.replace(/км/g, 'km').replace(/(\d)\s*м(?![а-яё])/g, '$1 m')
      .replace(/([\d–-]+) мин пешком/g, 'piyoda $1 daqiqa').replace(/([\d–-]+) мин на машине/g, 'mashinada $1 daqiqa');
  }

  function detectAmenities(text, out) {
    var s = text.toLowerCase();
    var add = function (list, k) { if (list.indexOf(k) < 0) list.push(k); };
    var incLine = /(входят в стоимость|входит в стоимость|включен|включена|включены|в цене|все включено|всё включено)/;
    var extLine = /(отдельно|оплата только за|оплачивается|\+\s*свет|по счётчику|по счетчику)/;
    s.split('\n').forEach(function (l) {
      var target = extLine.test(l) ? out.extra : incLine.test(l) ? out.includes : null;
      if (!target) return;
      if (/свет|электр/.test(l)) add(target, 'electricity');
      if (/вод/.test(l)) add(target, 'water');
      if (/газ/.test(l)) add(target, 'gas');
      if (/wi-?fi|интернет|вайфай/.test(l)) add(target, 'wifi');
      if (/коммунал/.test(l) && target === out.includes) { add(target, 'electricity'); add(target, 'water'); }
    });
    if (/мебел|обставлен|меблир/.test(s)) add(out.includes, 'furniture');
    if (/кондиционер/.test(s)) add(out.includes, 'ac');
    if (/холодильник/.test(s)) add(out.includes, 'fridge');
    if (/стиральн/.test(s)) add(out.includes, 'washer');
    if (/плазм|телевизор/.test(s)) add(out.includes, 'tv');
    if (/кухн[а-я]* (со всеми|с техник)|техника|принадлежност/.test(s)) add(out.includes, 'kitchen');
    if (/wi-?fi|интернет/.test(s) && out.extra.indexOf('wifi') < 0) add(out.includes, 'wifi');
    // что платится отдельно, то не может входить в цену
    out.includes = out.includes.filter(function (k) { return out.extra.indexOf(k) < 0; });
  }

  function parsePost(text, districts) {
    var parts = splitLangs(text);
    var ru = lines(parts.ru), uz = lines(parts.uz);
    var rawRu = parts.ru;
    var res = {
      title: { ru: '', uz: '' }, price: {}, priceNotes: [], includes: [], extra: [],
      terms: {}, walk: {}, features: [], filled: []
    };
    var mark = function (k) { if (res.filled.indexOf(k) < 0) res.filled.push(k); };

    /* код объекта и «СДАНА» */
    var code = String(text || '').match(/Apt:\s*([A-Za-z]{1,4}\s?-?\d{1,4})/);
    if (code) { res.code = code[1].replace(/\s/g, '').toUpperCase(); mark('code'); }
    if (/СДАН/i.test(text || '')) { res.status = 'rented'; mark('status'); }

    /* заголовок */
    var head = ru.filter(function (l) { return /🏠/.test(l); })[0] || ru[0] || '';
    var title = clean(head).replace(/\/\s*(Медина|Madina|Medina).*$/i, '').replace(/^(квартира)\s*$/i, '').trim();
    var headUz = uz.filter(function (l) { return /🏠/.test(l); })[0] || '';
    var titleUz = clean(headUz).replace(/\/\s*(Medina|Madina).*$/i, '').trim();

    /* цены */
    var m;
    if ((m = rawRu.match(/Месяц:\s*([\d][\d\s,.]*)/i)) || (m = rawRu.match(/([\d][\d\s,.]*)\s*риал[а-яё]*\s*(?:в|\/|за)\s*месяц/i))) { res.price.month = num(m[1]); mark('price'); }
    if ((m = rawRu.match(/Сутки:\s*([\d][\d\s,.]*)/i)) || (m = rawRu.match(/([\d][\d\s,.]*)\s*риал[а-яё]*\s*(?:в|\/|за)\s*(?:сутки|день)/i))) { res.price.day = num(m[1]); mark('price'); }
    if ((m = rawRu.match(/([\d][\d\s,.]*)\s*риал[а-яё]*\s*(?:в|\/|за)\s*год/i))) { res.price.year = num(m[1]); mark('price'); }
    if (!res.price.month && !res.price.day && !res.price.year && (m = rawRu.match(/Цена:\s*([\d][\d\s,.]*)\s*риал/i))) { res.price.month = num(m[1]); mark('price'); }
    if ((m = rawRu.match(/Залог[^\d\n]*([\d][\d\s,.]*)/i))) { res.price.deposit = num(m[1]); mark('deposit'); }
    if ((m = rawRu.match(/Комисси[а-яё]*[^\d\n]*([\d][\d\s,.]*)/i))) { res.price.agentFee = num(m[1]); mark('fee'); }

    /* дополнительные условия цены — в примечания */
    var noteRe = /^(•\s*)?(При |От \d|Оплата |Цена действует|В месяц Рамадан|цена актуальна)/i;
    ru.forEach(function (l, i) {
      var c = clean(l);
      if (/^Цена/i.test(c)) return;
      if (noteRe.test(c) || (/•/.test(l) && /риал/.test(l) && !/в месяц\s*$/.test(c) && i > 0 && res.priceNotes.length < 3 && /(скидк|при |от \d)/i.test(c))) {
        if (res.priceNotes.some(function (n) { return n.ru === c; })) return;
        res.priceNotes.push({ ru: c.replace(/^[-–]\s*/, ''), uz: '' });
      }
    });
    if (res.priceNotes.length) mark('notes');

    /* комнаты, санузлы, этаж */
    if ((m = rawRu.match(/(\d+)\s*[-–]?\s*(?:комнатн|спальн)/i)) || (m = rawRu.match(/🛏\s*(\d+)/)) || (m = rawRu.match(/(\d+)\s*комнат/i))) { res.rooms = +m[1]; mark('rooms'); }
    if (/студи/i.test(rawRu) && !res.rooms) { res.rooms = 1; mark('rooms'); }
    if ((m = rawRu.match(/(\d+)\s*(?:санузл|санузел)/i)) || (m = rawRu.match(/(?:🚿|🛁)\s*(\d+)/))) { res.baths = +m[1]; mark('baths'); }
    else if (/два санузла|2 санузла/i.test(rawRu)) { res.baths = 2; mark('baths'); }
    else if (/санузел|душ/i.test(rawRu)) { res.baths = 1; mark('baths'); }
    if ((m = rawRu.match(/(\d+)\s*кроват/i))) { res.beds = +m[1]; mark('beds'); }
    if ((m = rawRu.match(/(\d+)\s*(?:-?й)?\s*этаж/i))) { res.floor = +m[1]; mark('floor'); }
    if (/лифт/i.test(rawRu) && !/нет лифта|без лифта/i.test(rawRu)) { res.lift = true; mark('lift'); }

    /* удобства и коммуналка */
    detectAmenities(rawRu, res);
    if (res.includes.length || res.extra.length) mark('amenities');

    /* условия */
    if (/без икамы/i.test(rawRu)) { res.terms.iqama = false; mark('iqama'); }
    else if (/икам/i.test(rawRu) && /(требуется|обязательно|нужна)/i.test(rawRu)) { res.terms.iqama = true; mark('iqama'); }
    if (/посуточ|в сутки|сутки:/i.test(rawRu)) res.terms.minStay = 'day';
    else if (/полгода|6 месяцев/i.test(rawRu) && /сда[её]тся на полгода|от полугода/i.test(rawRu)) res.terms.minStay = '6months';
    else if (/годов|на год|в год/i.test(rawRu) && !res.price.month) res.terms.minStay = 'year';
    else if (res.price.month) res.terms.minStay = 'month';
    if (res.terms.minStay) mark('minStay');
    if (/семейн|для семьи|семье/i.test(rawRu)) { res.terms.forWhom = 'family'; mark('forWhom'); }
    else if (/студент/i.test(rawRu)) { res.terms.forWhom = 'students'; mark('forWhom'); }

    /* до Харама и другие мечети */
    var hLine = ru.filter(function (l) { return /(Харам|мечети Пророка|Мечети Пророка)/.test(l); })[0];
    if (hLine) {
      var hr = haramRu(clean(hLine));
      var hLineUz = uz.filter(function (l) { return /(Haram|Payg.ambar)/i.test(l); })[0] || '';
      if (hr) { res.walk.haram = { ru: hr, uz: haramUz(clean(hLineUz)) || haramUzFromRu(hr), en: haramEn(hr) }; mark('haram'); }
    }
    var oLine = ru.filter(function (l) { return /(мечет|Масджид)/i.test(l) && /(Куба|Киблатайн|Кыблатайн)/.test(l) && !/(Харам|Пророка|📍|Район)/.test(l); })[0];
    if (oLine) {
      var oUz = uz.filter(function (l) { return /(Quba|Qiblatayn)/i.test(l) && !/(Haram|Payg)/i.test(l); })[0];
      res.walk.other = { ru: clean(oLine), uz: oUz ? clean(oUz) : '' };
    }

    /* район */
    var dLine = ru.filter(function (l) { return /📍/.test(l) || /^(Район|Локация)\s*:/i.test(clean(l)); })[0];
    if (dLine) {
      var dn = clean(dLine).replace(/^(Район|Локация|Расположение)\s*:?\s*/i, '');
      var detail = (dn.match(/\(([^)]+)\)/) || [])[1];
      dn = dn.replace(/\([^)]*\)/g, '').trim();
      var dUz = uz.filter(function (l) { return /📍/.test(l); })[0];
      var dnUz = dUz ? clean(dUz).replace(/^(Rayon|Manzil|Lokatsiya)\s*:?\s*/i, '').replace(/\([^)]*\)/g, '').trim() : '';
      res.districtName = { ru: dn, uz: dnUz };
      res.district = matchDistrict(dn, dnUz, districts);
      if (detail && !/^\d/.test(detail) && detail.length > 14 && /\s/.test(detail)) res.features.push({ ru: detail.charAt(0).toUpperCase() + detail.slice(1), uz: '' });
      mark('district');
    }

    /* особенности: строки с ✨ 📚 🆕 🌳 🏙 📺 🌐 🍖 🌅 🪑 и т. п. */
    var featRe = /(✨|📚|🆕|🌳|🏙|📺|🌐|🍖|🌅|🪑|📌|🌿|👥|🔴|👨)/;
    function collect(list) {
      var out = [];
      list.forEach(function (l, i) {
        if (!featRe.test(l)) return;
        var c = clean(l);
        if (/:$/.test(c)) {                         // «Рядом есть:» и пункты ниже
          var items = [];
          for (var j = i + 1; j < list.length && /^•/.test(list[j]); j++) items.push(clean(list[j]).toLowerCase());
          if (items.length) c = c + ' ' + items.join(', ');
        }
        if (c && c.length >= 4) out.push(c);
      });
      return out;
    }
    var fRu = collect(ru), fUz = collect(uz);
    fRu.forEach(function (c, i) { res.features.push({ ru: c, uz: fUz[i] || '' }); });
    if (res.features.length) mark('features');

    /* заголовок: если в посте просто «Квартира» — собираем из комнат */
    if (!title && res.rooms) title = res.rooms + '-комнатная квартира';
    if ((!titleUz || /^kvartira$/i.test(titleUz)) && res.rooms) titleUz = res.rooms + ' xonali xonadon';
    if (title) { res.title.ru = title; mark('title'); }
    if (titleUz) res.title.uz = titleUz;
    return res;
  }

  function norm(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е')
      .replace(/^(аль|ал|ас|аз|ат|ад|ан|al|as|az|at|ad|an|hay|хай)[\s-]+/, '')
      .replace(/[^a-zа-я0-9]/g, '');
  }
  function matchDistrict(ru, uz, districts) {
    if (!districts) return null;
    var a = norm(ru), b = norm(uz);
    var keys = Object.keys(districts);
    for (var i = 0; i < keys.length; i++) {
      var d = districts[keys[i]];
      var cands = [norm(d.ru), norm(d.uz), norm(d.en), norm(keys[i])];
      if (cands.some(function (c) { return c && (c === a || c === b || (a && a.length > 3 && (c.indexOf(a) === 0 || a.indexOf(c) === 0))); })) return keys[i];
    }
    return null;
  }

  parsePost.matchDistrict = matchDistrict;
  root.parsePost = parsePost;
  if (typeof module !== 'undefined' && module.exports) module.exports = parsePost;
})(typeof window !== 'undefined' ? window : globalThis);

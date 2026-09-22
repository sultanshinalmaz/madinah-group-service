/* ==========================================================================
   Карта квартир: OpenStreetMap + Leaflet (лежит в assets/vendor/leaflet).
   Цена на каждом пине, квартиры одного района собраны в один пин,
   вокруг Харама — кольца 1, 2 и 3 км. Под картой — лента карточек.
   Leaflet подгружается только когда открыли вкладку «Карта».
   ========================================================================== */
(function () {
  'use strict';

  var MR, map, pins, loading, groups = [], fitted = false, selectedKey = null, pendingFocus = null;

  var DOME = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.2c.5 1.2 1.6 2 1.6 3.2A1.6 1.6 0 0 1 12 8a1.6 1.6 0 0 1-1.6-1.6c0-1.2 1.1-2 1.6-3.2Z"/><path d="M5 20v-3.2C5 12.6 8.1 9.5 12 9.5s7 3.1 7 7.3V20H5Z"/><rect x="3.5" y="20" width="17" height="1.6" rx=".8"/></svg>';
  var MOSQUE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 20v-4.5a5 5 0 0 1 10 0V20H7Z"/><path d="M12 6.5c.4.9 1.2 1.4 1.2 2.3a1.2 1.2 0 0 1-2.4 0c0-.9.8-1.4 1.2-2.3Z"/><rect x="3" y="9" width="2" height="11" rx="1"/><rect x="19" y="9" width="2" height="11" rx="1"/></svg>';

  function loadLeaflet() {
    if (window.L && window.L.map) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise(function (res, rej) {
      var css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'assets/vendor/leaflet/leaflet.css';
      document.head.appendChild(css);
      var s = document.createElement('script');
      s.src = 'assets/vendor/leaflet/leaflet.js';
      s.onload = function () { res(); };
      s.onerror = function () { loading = null; rej(new Error('leaflet')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  function haram() {
    var lm = (MR.D.landmarks || []).filter(function (x) { return x.main; })[0];
    return lm ? [lm.lat, lm.lng] : [24.46868, 39.61116];
  }

  function coordsOf(ap) {
    if (ap.geo && ap.geo.lat) return { lat: +ap.geo.lat, lng: +ap.geo.lng, exact: true };
    var d = MR.D.districts[ap.district];
    if (d && d.lat) return { lat: d.lat, lng: d.lng, exact: false, approx: !!d.approx };
    return null;
  }

  function create() {
    var box = document.getElementById('mapBox');
    map = window.L.map(box, { zoomControl: false, attributionControl: true, scrollWheelZoom: true, tap: true });
    window.L.control.zoom({ position: 'topright' }).addTo(map);
    map.attributionControl.setPrefix(false);
    var tiles = window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, minZoom: 11, attribution: '© OpenStreetMap'
    }).addTo(map);
    var loadedTiles = 0, badTiles = 0;
    tiles.on('tileload', function () { loadedTiles++; document.getElementById('mapOffline').hidden = true; });
    tiles.on('tileerror', function () {
      badTiles++;
      if (badTiles > 6 && !loadedTiles) offline();
    });

    // кольца расстояния от Харама
    var h = haram();
    [1000, 2000, 3000].forEach(function (r, i) {
      window.L.circle(h, { radius: r, color: '#147a5c', weight: 1.3, opacity: .55 - i * .1, dashArray: '5 7', fill: i === 0, fillColor: '#147a5c', fillOpacity: .05, interactive: false }).addTo(map);
      window.L.marker([h[0] + r / 111320, h[1]], {
        interactive: false, keyboard: false,
        icon: window.L.divIcon({ className: 'mring', html: '<span>' + (r / 1000) + ' ' + MR.t('km') + '</span>', iconSize: null })
      }).addTo(map);
    });

    // ориентиры: Харам, Куба, Киблатайн
    (MR.D.landmarks || []).forEach(function (lm) {
      window.L.marker([lm.lat, lm.lng], {
        keyboard: false, zIndexOffset: lm.main ? -400 : -600,
        icon: window.L.divIcon({ className: 'mlm-wrap', iconSize: null,
          html: '<div class="mlm' + (lm.main ? ' main' : '') + '"><i>' + (lm.main ? DOME : MOSQUE) + '</i><span>' + MR.esc(MR.L(lm)) + '</span></div>' })
      }).addTo(map);
    });

    pins = window.L.layerGroup().addTo(map);
    map.on('click', function () { select(null); });
    map.on('zoomend', function () {
      box.classList.toggle('z-low', map.getZoom() < 14);
      if (groups.length) renderPins();
    });
  }

  /* квартиры с одинаковой точкой (центр района) — в один пин */
  function buildGroups() {
    var list = MR.visible().filter(function (ap) { return MR.state.isAdmin || (ap.status !== 'rented' && ap.status !== 'draft'); });
    var by = {};
    groups = [];
    list.forEach(function (ap) {
      var c = coordsOf(ap);
      if (!c) return;
      var key = c.exact ? 'ap:' + ap.id : 'd:' + ap.district;
      if (!by[key]) { by[key] = { key: key, lat: c.lat, lng: c.lng, exact: c.exact, approx: c.approx, items: [] }; groups.push(by[key]); }
      by[key].items.push(ap);
    });
    var rank = { free: 0, booked: 1, busy: 2, rented: 3, draft: 4 };
    groups.forEach(function (g) {
      g.items.sort(function (a, b) { return (rank[a.status] - rank[b.status]) || (priceOf(a) - priceOf(b)); });
      g.best = g.items[0].status;
    });
    return list;
  }

  function priceOf(ap) { return ap.price.month || (ap.price.day ? ap.price.day * 30 : 0) || (ap.price.year ? Math.round(ap.price.year / 12) : 0); }
  function shortPrice(ap) {
    if (ap.price.month) return MR.money(ap.price.month);
    if (ap.price.year) return MR.money(Math.round(ap.price.year / 12));
    return MR.money(ap.price.day) + '/' + (MR.state.lang === 'en' ? 'n' : MR.state.lang === 'uz' ? 'k' : 'сут');
  }

  function pinHTML(g) {
    var cls = 'mpin st-' + g.best + (g.key === selectedKey ? ' is-on' : '');
    if (g.items.length === 1) return '<div class="' + cls + '"><b class="num">' + shortPrice(g.items[0]) + '</b></div>';
    var min = g.items.filter(function (a) { return a.status === 'free'; })[0] || g.items[0];
    return '<div class="' + cls + ' group"><em class="num">' + g.items.length + '</em><b class="num">' +
      MR.esc(MR.tpl('fromTpl', { p: shortPrice(min) })) + '</b></div>';
  }

  /* близкие на экране пины сливаются: при отдалении — один пин с числом квартир */
  function clusters() {
    var R = 62;
    var pts = groups.map(function (g) { return { g: g, p: map.latLngToContainerPoint([g.lat, g.lng]) }; });
    var order = pts.map(function (_, i) { return i; }).sort(function (a, b) { return pts[b].g.items.length - pts[a].g.items.length; });
    var used = {}, out = [];
    order.forEach(function (i) {
      if (used[i]) return;
      used[i] = true;
      var c = [pts[i].g];
      order.forEach(function (j) {
        if (used[j]) return;
        var dx = pts[i].p.x - pts[j].p.x, dy = pts[i].p.y - pts[j].p.y;
        if (dx * dx + dy * dy < R * R) { used[j] = true; c.push(pts[j].g); }
      });
      out.push(c);
    });
    return out;
  }

  function clusterHTML(members) {
    var all = [];
    members.forEach(function (g) { all = all.concat(g.items); });
    var free = all.filter(function (a) { return a.status === 'free'; });
    var base = (free.length ? free : all).slice().sort(function (a, b) { return priceOf(a) - priceOf(b); })[0];
    var st = free.length ? 'free' : all[0].status;
    var on = members.some(function (g) { return g.key === selectedKey; });
    return '<div class="mpin group st-' + st + (on ? ' is-on' : '') + '"><em class="num">' + all.length + '</em><b class="num">' +
      MR.esc(MR.tpl('fromTpl', { p: shortPrice(base) })) + '</b></div>';
  }

  function renderPins() {
    pins.clearLayers();
    groups.forEach(function (g) { g.marker = null; });
    clusters().forEach(function (members) {
      if (members.length === 1) {
        var g = members[0];
        var m = window.L.marker([g.lat, g.lng], {
          riseOnHover: true, zIndexOffset: g.key === selectedKey ? 2000 : 500,
          icon: window.L.divIcon({ className: 'mpin-wrap', html: pinHTML(g), iconSize: null })
        });
        m.on('click', function (e) { window.L.DomEvent.stopPropagation(e); select(g.key, true); });
        m.addTo(pins);
        g.marker = m;
        return;
      }
      var lat = 0, lng = 0;
      members.forEach(function (g) { lat += g.lat; lng += g.lng; });
      var cm = window.L.marker([lat / members.length, lng / members.length], {
        riseOnHover: true, zIndexOffset: 600,
        icon: window.L.divIcon({ className: 'mpin-wrap', html: clusterHTML(members), iconSize: null })
      });
      cm.on('click', function (e) {
        window.L.DomEvent.stopPropagation(e);
        var b = window.L.latLngBounds(members.map(function (g) { return [g.lat, g.lng]; }));
        var z = Math.min(18, Math.max.apply(null, members.map(function (g) { return separateZoom(g, map.getZoom() + 1); })));
        var fitZ = map.getBoundsZoom(b.pad(0.35));
        map.flyTo(b.getCenter(), Math.max(Math.min(fitZ, 18), Math.min(z, fitZ + 2)), { duration: .6 });
        MR.haptic('light');
      });
      cm.addTo(pins);
    });
  }

  function renderCarousel(list) {
    var rank = { free: 0, booked: 1, busy: 2, rented: 3, draft: 4 };
    var ordered = [];
    groups.forEach(function (g) { g.items.forEach(function (ap) { ordered.push({ ap: ap, key: g.key }); }); });
    ordered.sort(function (a, b) { return (rank[a.ap.status] - rank[b.ap.status]) || (priceOf(a.ap) - priceOf(b.ap)); });
    var box = document.getElementById('mapCards');
    box.innerHTML = ordered.map(function (o) {
      var ap = o.ap, d = MR.D.districts[ap.district] || {};
      var photo = ap.photos[0] ? MR.mediaCard(ap.photos[0]) : (ap.videos[0] && ap.videos[0].poster ? MR.mediaCard(ap.videos[0].poster) : '');
      return '<button class="mc st-' + ap.status + (o.key === selectedKey ? ' is-on' : '') + '" data-mc="' + MR.esc(ap.id) + '" data-key="' + MR.esc(o.key) + '">' +
        (photo ? '<img src="' + photo + '" alt="" loading="lazy" decoding="async">' : '<span class="mc-noimg"></span>') +
        '<span class="mc-b">' +
          '<b class="num">' + MR.priceMain(ap, true) + '</b>' +
          '<span class="mc-t">' + MR.esc(MR.L(ap.title)) + '</span>' +
          '<span class="mc-d">' + MR.esc(MR.L(d)) + ' · <i class="mc-st">' + MR.esc(MR.statusText(ap)) + '</i></span>' +
        '</span>' +
      '</button>';
    }).join('');
    var noGeo = list.length - ordered.length;
    document.getElementById('mapNoGeo').hidden = noGeo <= 0;
  }

  function select(key, fromPin) {
    selectedKey = key;
    if (map && groups.length) renderPins();
    var cards = document.querySelectorAll('#mapCards .mc');
    var first = null;
    Array.prototype.forEach.call(cards, function (c) {
      var on = key && c.getAttribute('data-key') === key;
      c.classList.toggle('is-on', !!on);
      if (on && !first) first = c;
    });
    if (first) {
      var box = document.getElementById('mapCards');
      box.scrollTo({ left: first.offsetLeft - 16, behavior: 'smooth' });
    }
    if (fromPin) MR.haptic('light');
  }

  function fit() {
    var pts = groups.map(function (g) { return [g.lat, g.lng]; });
    pts.push(haram());
    if (pts.length === 1) { map.setView(pts[0], 14); return; }
    map.fitBounds(window.L.latLngBounds(pts), { padding: [34, 34], maxZoom: 15 });
  }

  function offline() {
    document.getElementById('mapOffline').hidden = false;
    document.getElementById('mapOffline').textContent = MR.t('mapOffline');
  }

  function show() {
    loadLeaflet().then(function () {
      if (!map) create();
      var list = buildGroups();
      map.invalidateSize();
      if (!fitted) { fit(); fitted = true; }      // вид карты нужен до пинов: скопления считаются в пикселях
      renderPins();
      renderCarousel(list);
      setTimeout(function () {
        map.invalidateSize();                     // вкладка только что стала видимой
        renderPins();
        if (pendingFocus) { var id = pendingFocus; pendingFocus = null; focus(id); }
      }, 120);
    }, offline).catch(function (e) { if (window.console) console.error('map', e); });
  }

  /* наименьший масштаб, на котором пин группы стоит отдельно от соседей */
  function separateZoom(g, from) {
    for (var z = from; z <= 18; z++) {
      var p = map.project([g.lat, g.lng], z);
      var near = groups.some(function (o) {
        if (o === g) return false;
        var q = map.project([o.lat, o.lng], z);
        return (p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y) < 62 * 62;
      });
      if (!near) return z;
    }
    return 18;
  }

  function focus(id) {
    if (!map) { pendingFocus = id; return; }
    var g = groups.filter(function (x) { return x.items.some(function (a) { return a.id === id; }); })[0];
    if (!g) return;
    map.setView([g.lat, g.lng], separateZoom(g, Math.max(map.getZoom(), 15)), { animate: true });
    select(g.key);
  }

  function bind() {
    document.addEventListener('click', function (e) {
      var mc = e.target.closest('[data-mc]');
      if (!mc) return;
      var key = mc.getAttribute('data-key');
      if (key !== selectedKey) {
        select(key);
        var g = groups.filter(function (x) { return x.key === key; })[0];
        if (g && map) {
          if (!g.marker) map.flyTo([g.lat, g.lng], separateZoom(g, Math.max(map.getZoom(), 15)), { duration: .6 });
          else map.panTo([g.lat, g.lng], { animate: true });
        }
        return;
      }
      MR.openDetail(mc.getAttribute('data-mc'));
    });
  }

  window.MapView = {
    init: function (core) { MR = core; bind(); },
    show: show,
    focus: focus,
    theme: function () { /* тёмная тема карты — через CSS-фильтр на слое плиток */ },
    loadLeaflet: loadLeaflet,
    coordsOf: coordsOf,
    haram: haram
  };
})();

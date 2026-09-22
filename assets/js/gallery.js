/* ==========================================================================
   Галерея: лента фото со стрелками и счётчиком (в карточке и в деталях),
   миниатюры под большим фото и полноэкранный просмотр с видео.
   ========================================================================== */
(function () {
  'use strict';

  var MR;                                   // общее ядро приложения (app.js)
  var lb = null;                            // полноэкранный просмотр
  var lbItems = [];

  var ARROW_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m14.5 5-7 7 7 7"/></svg>';
  var ARROW_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9.5 5 7 7-7 7"/></svg>';
  var PLAY    = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.2-6.5a1 1 0 0 0 0-1.7L9.5 4.6A1 1 0 0 0 8 5.5Z"/></svg>';
  var CLOSE   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  /* ---------------------------------------------------------- материалы */
  function items(ap) {
    var list = (ap.photos || []).map(function (p) {
      return { type: 'photo', full: MR.media(p), card: MR.mediaCard(p) };
    });
    (ap.videos || []).forEach(function (v) {
      var slide = {
        type: 'video', src: MR.media(v.src),
        poster: v.poster ? MR.mediaCard(v.poster) : (list[0] ? list[0].card : ''),
        posterFull: v.poster ? MR.media(v.poster) : (list[0] ? list[0].full : '')
      };
      // видеообход ставим вторым: его сразу видно, но обложкой остаётся фото
      list.splice(Math.min(1, list.length), 0, slide);
    });
    return list;
  }

  function imgTag(it, i, big) {
    var src = big ? it.full : it.card;
    return '<img src="' + src + '" data-full="' + it.full + '" alt="" draggable="false" ' +
      'loading="' + (i ? 'lazy' : 'eager') + '" decoding="async" ' +
      'onerror="if(this.src!==this.dataset.full){this.src=this.dataset.full}">';
  }

  function slideHTML(it, i, big) {
    if (it.type === 'video') {
      return '<div class="gal-slide is-video" data-lb-open="' + i + '">' +
        '<img src="' + it.poster + '" alt="" loading="lazy" decoding="async" draggable="false">' +
        '<span class="gal-play">' + PLAY + '</span>' +
        '<span class="gal-vlabel">' + MR.t('videoTour') + '</span>' +
      '</div>';
    }
    return '<div class="gal-slide"' + (big ? ' data-lb-open="' + i + '"' : '') + '>' + imgTag(it, i, big) + '</div>';
  }

  /* лента для карточки и для деталей */
  function stripHTML(ap, big) {
    var list = items(ap);
    if (!list.length) return '<div class="gal gal-empty"></div>';
    var many = list.length > 1;
    var dots = many && list.length <= 9
      ? '<div class="card-dots">' + list.map(function (_, i) { return '<i class="' + (i ? '' : 'on') + '"></i>'; }).join('') + '</div>'
      : '';
    return '<div class="gal' + (big ? ' gal-big' : '') + '" data-gal="' + ap.id + '" data-n="' + list.length + '">' +
      '<div class="gal-track">' + list.map(function (it, i) { return slideHTML(it, i, big); }).join('') + '</div>' +
      (many ? '<button class="gal-arrow prev" data-gal-nav="-1" aria-label="' + MR.t('prev') + '" hidden>' + ARROW_L + '</button>' +
              '<button class="gal-arrow next" data-gal-nav="1" aria-label="' + MR.t('next') + '">' + ARROW_R + '</button>' +
              '<span class="gal-count num">1 / ' + list.length + '</span>' : '') +
      dots +
    '</div>';
  }

  function thumbsHTML(ap) {
    var list = items(ap);
    if (list.length < 2) return '';
    return '<div class="gal-thumbs" data-thumbs="' + ap.id + '">' + list.map(function (it, i) {
      return '<button class="gal-thumb' + (i ? '' : ' is-on') + (it.type === 'video' ? ' is-video' : '') + '" data-gal-go="' + i + '" aria-label="' + (i + 1) + '">' +
        '<img src="' + (it.type === 'video' ? it.poster : it.card) + '" alt="" loading="lazy" decoding="async" draggable="false">' +
        (it.type === 'video' ? '<span>' + PLAY + '</span>' : '') +
      '</button>';
    }).join('') + '</div>';
  }

  /* ------------------------------------------------------------ поведение */
  function indexOf(track) {
    return Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
  }

  function sync(gal) {
    var track = gal.querySelector('.gal-track');
    var n = +gal.getAttribute('data-n');
    var i = Math.max(0, Math.min(n - 1, indexOf(track)));
    var c = gal.querySelector('.gal-count');
    if (c) c.textContent = (i + 1) + ' / ' + n;
    var prev = gal.querySelector('.prev'), next = gal.querySelector('.next');
    if (prev) prev.hidden = i === 0;
    if (next) next.hidden = i >= n - 1;
    var dots = gal.querySelectorAll('.card-dots i');
    for (var k = 0; k < dots.length; k++) dots[k].classList.toggle('on', k === i);
    var thumbs = document.querySelector('[data-thumbs="' + gal.getAttribute('data-gal') + '"]');
    if (thumbs && gal.classList.contains('gal-big')) {
      var tb = thumbs.querySelectorAll('.gal-thumb');
      for (var j = 0; j < tb.length; j++) tb[j].classList.toggle('is-on', j === i);
      if (tb[i]) {
        var left = tb[i].offsetLeft - (thumbs.clientWidth - tb[i].offsetWidth) / 2;
        thumbs.scrollTo({ left: left, behavior: 'smooth' });
      }
    }
    gal._i = i;
  }

  function go(gal, i, smooth) {
    var track = gal.querySelector('.gal-track');
    var n = +gal.getAttribute('data-n');
    i = Math.max(0, Math.min(n - 1, i));
    track.scrollTo({ left: i * track.clientWidth, behavior: smooth === false ? 'auto' : 'smooth' });
    gal._i = i;
    setTimeout(function () { sync(gal); }, smooth === false ? 0 : 380);
  }

  /* подключить прокрутку ко всем лентам внутри root */
  function bind(root) {
    var gals = (root || document).querySelectorAll('.gal[data-n]');
    Array.prototype.forEach.call(gals, function (gal) {
      if (gal._bound) return;
      gal._bound = true;
      var track = gal.querySelector('.gal-track');
      var timer = null;
      track.addEventListener('scroll', function () {
        if (timer) return;
        timer = setTimeout(function () { timer = null; sync(gal); }, 70);   // без rAF: он молчит в скрытой вкладке
      }, { passive: true });
      // мышью тоже можно листать: колесо по горизонтали и перетаскивание
      track.addEventListener('wheel', function (e) {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        if (!gal.matches(':hover') || +gal.getAttribute('data-n') < 2 || !e.shiftKey) return;
        e.preventDefault();
        go(gal, (gal._i || 0) + (e.deltaY > 0 ? 1 : -1));
      }, { passive: false });
    });
  }

  /* клик внутри галереи; true — событие обработано */
  function handleClick(e) {
    var nav = e.target.closest('[data-gal-nav]');
    if (nav) {
      e.preventDefault();
      e.stopPropagation();
      var gal = nav.closest('.gal');
      go(gal, (gal._i != null ? gal._i : indexOf(gal.querySelector('.gal-track'))) + (+nav.getAttribute('data-gal-nav')));
      MR.haptic('light');
      return true;
    }
    var th = e.target.closest('[data-gal-go]');
    if (th) {
      var box = th.closest('[data-thumbs]');
      var g = document.querySelector('.gal-big[data-gal="' + box.getAttribute('data-thumbs') + '"]');
      if (g) go(g, +th.getAttribute('data-gal-go'));
      MR.haptic('light');
      return true;
    }
    var open = e.target.closest('[data-lb-open]');
    if (open) {
      var owner = open.closest('.gal');
      var ap = MR.find(owner.getAttribute('data-gal'));
      if (ap) { openLightbox(ap, +open.getAttribute('data-lb-open')); return true; }
    }
    return false;
  }

  /* --------------------------------------------------- полноэкранный просмотр */
  function buildLightbox() {
    lb = document.createElement('div');
    lb.className = 'lb';
    lb.hidden = true;
    lb.innerHTML =
      '<div class="lb-top"><span class="lb-count num"></span><button class="lb-close" aria-label="' + MR.t('close') + '">' + CLOSE + '</button></div>' +
      '<div class="lb-track"></div>' +
      '<button class="lb-arrow prev" aria-label="' + MR.t('prev') + '">' + ARROW_L + '</button>' +
      '<button class="lb-arrow next" aria-label="' + MR.t('next') + '">' + ARROW_R + '</button>' +
      '<div class="lb-thumbs"></div>';
    document.body.appendChild(lb);

    var track = lb.querySelector('.lb-track');
    var timer = null;
    track.addEventListener('scroll', function () {
      if (timer) return;
      timer = setTimeout(function () { timer = null; lbSync(); }, 80);
    }, { passive: true });

    lb.addEventListener('click', function (e) {
      if (e.target.closest('.lb-close')) { closeLightbox(); return; }
      if (e.target.closest('.lb-arrow')) { lbGo(lbIndex() + (e.target.closest('.next') ? 1 : -1)); return; }
      var th = e.target.closest('.lb-thumb');
      if (th) { lbGo(+th.getAttribute('data-i')); return; }
    });

    // двойное касание — увеличить фото в 2,5 раза, ещё раз — вернуть
    var lastTap = 0;
    track.addEventListener('click', function (e) {
      var slide = e.target.closest('.lb-slide');
      if (!slide || slide.classList.contains('is-video')) return;
      var now = Date.now();
      if (now - lastTap < 320) { toggleZoom(slide, e); lastTap = 0; }
      else lastTap = now;
    });

    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'ArrowRight') lbGo(lbIndex() + 1);
      else if (e.key === 'ArrowLeft') lbGo(lbIndex() - 1);
      else if (e.key === 'Escape') closeLightbox();
    });
  }

  function toggleZoom(slide, e) {
    var img = slide.querySelector('img');
    var track = lb.querySelector('.lb-track');
    if (slide.classList.contains('is-zoom')) {
      slide.classList.remove('is-zoom');
      track.classList.remove('no-swipe');
      slide.scrollTo(0, 0);
      return;
    }
    var r = img.getBoundingClientRect();
    var fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    slide.classList.add('is-zoom');
    track.classList.add('no-swipe');
    setTimeout(function () {
      slide.scrollLeft = fx * slide.scrollWidth - slide.clientWidth / 2;
      slide.scrollTop = fy * slide.scrollHeight - slide.clientHeight / 2;
    }, 20);
    MR.haptic('light');
  }

  function lbIndex() {
    var track = lb.querySelector('.lb-track');
    return Math.max(0, Math.min(lbItems.length - 1, Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));
  }

  function lbSync() {
    var i = lbIndex();
    lb.querySelector('.lb-count').textContent = (i + 1) + ' / ' + lbItems.length;
    lb.querySelector('.lb-arrow.prev').hidden = i === 0;
    lb.querySelector('.lb-arrow.next').hidden = i >= lbItems.length - 1;
    var th = lb.querySelectorAll('.lb-thumb');
    for (var k = 0; k < th.length; k++) th[k].classList.toggle('is-on', k === i);
    var bar = lb.querySelector('.lb-thumbs');
    if (th[i]) bar.scrollTo({ left: th[i].offsetLeft - (bar.clientWidth - th[i].offsetWidth) / 2, behavior: 'smooth' });
    // видео играет только на своём слайде
    Array.prototype.forEach.call(lb.querySelectorAll('video'), function (v, n) {
      var own = +v.closest('.lb-slide').getAttribute('data-i') === i;
      if (!own && !v.paused) v.pause();
    });
    // увеличенное фото сбрасываем, когда ушли с него
    Array.prototype.forEach.call(lb.querySelectorAll('.lb-slide.is-zoom'), function (s) {
      if (+s.getAttribute('data-i') !== i) { s.classList.remove('is-zoom'); lb.querySelector('.lb-track').classList.remove('no-swipe'); }
    });
  }

  function lbGo(i, instant) {
    i = Math.max(0, Math.min(lbItems.length - 1, i));
    var track = lb.querySelector('.lb-track');
    track.scrollTo({ left: i * track.clientWidth, behavior: instant ? 'auto' : 'smooth' });
    setTimeout(lbSync, instant ? 0 : 400);
    MR.haptic('light');
  }

  function openLightbox(ap, index) {
    if (!lb) buildLightbox();
    lbItems = items(ap);
    var track = lb.querySelector('.lb-track');
    track.innerHTML = lbItems.map(function (it, i) {
      if (it.type === 'video') {
        return '<div class="lb-slide is-video" data-i="' + i + '">' +
          '<video src="' + it.src + '" poster="' + (it.posterFull || it.poster) + '" controls playsinline preload="none"></video></div>';
      }
      return '<div class="lb-slide" data-i="' + i + '"><img src="' + it.full + '" alt="" decoding="async" draggable="false"></div>';
    }).join('');
    lb.querySelector('.lb-thumbs').innerHTML = lbItems.length > 1 ? lbItems.map(function (it, i) {
      return '<button class="lb-thumb' + (it.type === 'video' ? ' is-video' : '') + '" data-i="' + i + '">' +
        '<img src="' + (it.type === 'video' ? it.poster : it.card) + '" alt="" loading="lazy" draggable="false">' +
        (it.type === 'video' ? '<span>' + PLAY + '</span>' : '') + '</button>';
    }).join('') : '';
    lb.hidden = false;
    void lb.offsetWidth;
    lb.classList.add('is-open');
    lbGo(index || 0, true);
    var cur = lbItems[index || 0];
    if (cur && cur.type === 'video') {
      var v = track.querySelector('[data-i="' + index + '"] video');
      if (v) { try { v.play(); } catch (e) {} }
    }
    MR.pushLayer(closeLightbox);
  }

  function closeLightbox() {
    if (!lb || lb.hidden) return;
    Array.prototype.forEach.call(lb.querySelectorAll('video'), function (v) { v.pause(); });
    lb.classList.remove('is-open');
    setTimeout(function () { lb.hidden = true; lb.querySelector('.lb-track').innerHTML = ''; }, 250);
    MR.popLayer(closeLightbox);
  }

  window.Gallery = {
    init: function (core) { MR = core; },
    items: items,
    stripHTML: stripHTML,
    thumbsHTML: thumbsHTML,
    bind: bind,
    handleClick: handleClick,
    open: openLightbox,
    close: closeLightbox,
    playIcon: PLAY
  };
})();

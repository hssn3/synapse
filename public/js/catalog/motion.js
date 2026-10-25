/* حرکت‌های لایهٔ بصری کاتالوگ — ریویل اسکرول، درخشش نشانگر و تیلت ملایم.
   هیچ داده یا رفتاری را تغییر نمی‌دهد؛ در نبود IntersectionObserver یا با
   prefers-reduced-motion، صفحه دقیقاً مثل قبل و بدون پنهان‌شدن چیزی کار می‌کند. */
(function () {
  'use strict';

  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var fine = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : null;

  var REVEAL = '.sec-hd, .dir-bar, .tiles, .mx-bar, .mx-status, .mx-list, .sop-rail, .sop-all, .safe-grid, .tiles-4, .dana-grid, .cmp-wrap, .cmp-note, .demo-grid';
  var LISTS = '.tiles, .sop-rail, .sop-all, .mx-list, .tiles-4, .paths, .stats, .dana-grid > div';
  var CARD = '.tile, .stat, .sop-card, .prompt, .mrow, .stats-pane';

  function stampIndex(root) {
    var kids = root.children;
    for (var i = 0; i < kids.length && i < 14; i++) {
      if (!kids[i].style.getPropertyValue('--i')) kids[i].style.setProperty('--i', String(i));
    }
  }

  function stampAll() {
    var lists = document.querySelectorAll(LISTS);
    for (var i = 0; i < lists.length; i++) stampIndex(lists[i]);
  }

  // لیست‌ها بعد از فیلتر/جستجو دوباره ساخته می‌شوند؛ برای تأخیر پلکانی باید دوباره شماره بخورند.
  function watchLists() {
    if (!window.MutationObserver) return;
    var mo = new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var t = records[i].target;
        if (t && t.children) stampIndex(t);
      }
    });
    var lists = document.querySelectorAll(LISTS);
    for (var i = 0; i < lists.length; i++) mo.observe(lists[i], { childList: true });
  }

  function bindReveal() {
    if (!('IntersectionObserver' in window)) return;
    var els = document.querySelectorAll(REVEAL);
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
    for (var i = 0; i < els.length; i++) {
      els[i].classList.add('rv');
      io.observe(els[i]);
    }
  }

  function bindPointer() {
    if (!fine || !fine.matches || (reduce && reduce.matches)) return;
    var active = null, last = null, raf = false;

    function paint() {
      raf = false;
      if (!active || !last) return;
      var r = active.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var px = ((last.x - r.left) / r.width * 100).toFixed(2) + '%';
      var py = ((last.y - r.top) / r.height * 100).toFixed(2) + '%';
      active.style.setProperty('--px', px);
      active.style.setProperty('--py', py);
      if (active.matches('.tile, .stat, .sop-card')) {
        var rx = ((last.y - r.top) / r.height - 0.5) * -2.4;
        var ry = ((last.x - r.left) / r.width - 0.5) * 2.4;
        active.style.setProperty('--rx', rx.toFixed(2) + 'deg');
        active.style.setProperty('--ry', ry.toFixed(2) + 'deg');
      }
    }

    function reset(el) {
      el.style.removeProperty('--px');
      el.style.removeProperty('--py');
      el.style.removeProperty('--rx');
      el.style.removeProperty('--ry');
    }

    document.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var el = e.target.closest ? e.target.closest(CARD) : null;
      if (!el) return;
      active = el; last = { x: e.clientX, y: e.clientY };
      if (!raf) { raf = true; requestAnimationFrame(paint); }
    }, { passive: true });

    document.addEventListener('pointerout', function (e) {
      if (!active) return;
      if (active.contains(e.relatedTarget)) return;
      reset(active); active = null; last = null;
    }, { passive: true });
  }

  function init() {
    stampAll();
    watchLists();
    bindReveal();
    bindPointer();
  }

  window.CatalogMotion = { init: init };
})();

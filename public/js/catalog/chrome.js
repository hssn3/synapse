/* پوستهٔ کاتالوگ: نوار مطالعه، ریل بخش‌ها، کپی و کنش‌های دکمه‌ها. */
(function () {
  'use strict';

  var U = window.CatalogUtils;
  var $$ = U.$$;

  var RAIL_SECS = ['hero', 'directory', 'accreditation', 'clinical-sop', 'safety-never-events', 'intelligence', 'dana-copilot', 'comparison', 'demo'];

  function syncRail() {
    var y = window.scrollY + 120, cur = RAIL_SECS[0];
    for (var i = 0; i < RAIL_SECS.length; i++) {
      var el = document.getElementById(RAIL_SECS[i]);
      if (el && el.offsetTop <= y) cur = RAIL_SECS[i];
    }
    $$('.rail a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + cur); });
  }

  function bindActions() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]'); if (!btn) return;
      var action = btn.getAttribute('data-action');
      if (action === 'focus-quickfind') { e.preventDefault(); window.CatalogQuickfind.focus(); }
      else if (action === 'open-safety') { e.preventDefault(); window.CatalogMeasures.openSafetyFilter(); }
      else if (action === 'goto-demo') { e.preventDefault(); window.location.hash = '#demo'; }
    });
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-copy]'); if (!b) return;
      U.copy(b.getAttribute('data-copy'), 'متن پرسش کپی شد');
    });
  }

  // نوار تیتر با اسکرول جمع می‌شود و فقط در حرکت روبه‌پایین پنهان می‌شود؛
  // prefers-reduced-motion پنهان‌شدن را کامل غیرفعال می‌کند.
  function bindHeader() {
    var body = document.body, fill = document.getElementById('rdFill');
    var rm = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var lastY = window.scrollY || 0, acc = 0, raf = false;

    function apply() {
      raf = false;
      var doc = document.documentElement;
      var y = window.scrollY || doc.scrollTop || 0;
      var max = (doc.scrollHeight - window.innerHeight) || 1;
      if (fill) fill.style.transform = 'scaleX(' + Math.min(1, Math.max(0, y / max)).toFixed(4) + ')';
      body.classList.toggle('scrolled', y > 26);
      if (!(rm && rm.matches)) {
        var d = y - lastY;
        if ((d > 0 && acc < 0) || (d < 0 && acc > 0)) acc = 0;
        acc += d;
        if (y > 420 && acc > 90) body.classList.add('hd-hidden');
        if (acc < -26 || y < 180) body.classList.remove('hd-hidden');
      }
      lastY = y;
    }

    window.addEventListener('scroll', function () {
      if (!raf) { raf = true; requestAnimationFrame(apply); }
    }, { passive: true });
    apply();
  }

  function init() {
    bindActions();
    bindHeader();
    syncRail();
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { syncRail(); ticking = false; });
    }, { passive: true });
  }

  window.CatalogChrome = { init: init, syncRail: syncRail };
})();

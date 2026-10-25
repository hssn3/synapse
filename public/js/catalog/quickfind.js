/* جستجوی سراسری Ctrl+K روی بخش‌ها، SOPها و سنجه‌ها. */
(function () {
  'use strict';

  var U = window.CatalogUtils, D = window.CatalogData;
  var $ = U.$, $$ = U.$$, esc = U.esc;

  var QF = { items: [], flat: [], active: -1 };

  function qfBuildIndex() {
    QF.items = [];
    D.MODULES.forEach(function (m) {
      QF.items.push({ type: 'mod', k: m.k, t: m.t, s: window.CatalogDirectory.groupTitle(m.g), x: (m.t + ' ' + m.d + ' ' + m.k + ' ' + window.CatalogDirectory.groupTitle(m.g)) });
    });
    D.SOPS.forEach(function (s) { QF.items.push({ type: 'sop', k: s.c, t: s.t, s: s.c, x: (s.t + ' ' + s.c) }); });
    var idx = window.CatalogMeasures.getIndex();
    if (idx) idx.measures.forEach(function (m) { QF.items.push({ type: 'measure', k: m.c, t: m.s, s: m.c + ' · محور ' + m.ax, x: (m.c + ' ' + m.s) }); });
  }

  function qfSearch(q) {
    if (!q || q.length < 2) return { mod: [], sop: [], measure: [] };
    q = q.toLowerCase();
    var out = { mod: [], sop: [], measure: [] };
    for (var i = 0; i < QF.items.length; i++) {
      var it = QF.items[i];
      var hay = (it.x || (it.t + ' ' + it.s)).toLowerCase();
      if (hay.indexOf(q) === -1) continue;
      var g = it.type === 'mod' ? out.mod : (it.type === 'sop' ? out.sop : out.measure);
      if (g.length < (it.type === 'measure' ? 8 : 6)) g.push(it);
    }
    return out;
  }

  function qfRender(q) {
    var box = $('#qfRes'); if (!box) return;
    var r = qfSearch(q);
    var flat = [];
    var html = '';
    function block(t, arr) {
      if (!arr.length) return '';
      var h = '<div class="qf-g">' + t + '</div>';
      arr.forEach(function (it) {
        flat.push(it);
        var idx = flat.length - 1;
        h += '<button type="button" class="qf-i" data-i="' + idx + '" role="option">' +
          '<span class="qf-t">' + esc(it.t) + '</span><span class="qf-s">' + esc(it.s) + '</span></button>';
      });
      return h;
    }
    html += block('بخش‌های سامانه', r.mod);
    html += block('روش‌های اجرایی', r.sop);
    html += block('سنجه‌ها', r.measure);
    if (!html) {
      html = '<div class="qf-empty">چیزی برای «' + esc(q) + '» پیدا نشد. کد سنجه (مثل ب-۵-۴-۱) یا نام بخش را امتحان کنید.</div>';
      if (!window.CatalogMeasures.getIndex()) html += '<div class="qf-empty">فهرست سنجه‌ها هنوز بارگذاری نشده؛ لحظه‌ای بعد دوباره تایپ کنید.</div>';
    }
    QF.flat = flat; QF.active = -1;
    box.innerHTML = html;
    box.classList.add('on');
  }

  function qfClose() {
    var b = $('#qfRes');
    if (b) { b.classList.remove('on'); b.innerHTML = ''; }
  }

  function qfPick(i) {
    var it = (QF.flat || [])[i]; if (!it) return;
    qfClose();
    var qf = $('#qf'); if (qf) qf.blur();
    if (it.type === 'mod') {
      var dir = $('#directory'); if (dir) dir.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.CatalogDirectory.focusModule(it.k);
      U.toast('بخش «' + it.t + '» — لینک ورود داخل کارت است');
    } else if (it.type === 'sop') {
      var el = $('#sop-' + it.k);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); U.flash('#sop-' + it.k); }
    } else {
      window.CatalogMeasures.focusMeasure(it.k);
    }
  }

  function focus() {
    var i = $('#qf');
    if (i) { i.focus(); i.select(); }
  }

  function init() {
    qfBuildIndex();

    var qfInput = $('#qf');
    if (qfInput) {
      qfInput.addEventListener('input', U.debounce(function () { qfBuildIndex(); qfRender(qfInput.value.trim()); }, 110));
      qfInput.addEventListener('keydown', function (e) {
        var items = $$('.qf-i', $('#qfRes'));
        if (!items.length) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          QF.active = Math.max(0, Math.min(items.length - 1, (QF.active < 0 ? -1 : QF.active) + (e.key === 'ArrowDown' ? 1 : -1)));
          items.forEach(function (x, i) { x.classList.toggle('on', i === QF.active); });
          if (items[QF.active]) items[QF.active].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
          e.preventDefault(); qfPick(QF.active >= 0 ? QF.active : 0);
        } else if (e.key === 'Escape') { qfClose(); }
      });
    }

    var qfRes = $('#qfRes');
    if (qfRes) qfRes.addEventListener('click', function (e) {
      var b = e.target.closest('.qf-i'); if (!b) return;
      qfPick(parseInt(b.getAttribute('data-i'), 10) || 0);
    });
    document.addEventListener('click', function (e) {
      var w = $('.qf'); if (w && !w.contains(e.target)) qfClose();
    });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); focus(); }
    });
  }

  window.CatalogQuickfind = { init: init, focus: focus, rebuildIndex: qfBuildIndex };
})();

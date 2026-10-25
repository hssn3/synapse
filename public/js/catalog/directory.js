/* دایرکتوری ماژول‌ها، روش‌های اجرایی، هوش مدیریتی و دمو. */
(function () {
  'use strict';

  var U = window.CatalogUtils, D = window.CatalogData;
  var $ = U.$, $$ = U.$$, esc = U.esc, fa = U.fa, icon = U.icon;
  var dirState = { g: 'all', q: '' };

  function groupTitle(id) {
    for (var i = 0; i < D.GROUPS.length; i++) if (D.GROUPS[i].id === id) return D.GROUPS[i].t;
    return '';
  }

  function renderGroupChips() {
    var box = $('#gchips'); if (!box) return;
    var html = '<button type="button" class="gchip" data-g="all" aria-pressed="true">همه (' + fa(D.MODULES.length) + ')</button>';
    D.GROUPS.forEach(function (gr) {
      var n = D.MODULES.filter(function (m) { return m.g === gr.id; }).length;
      html += '<button type="button" class="gchip" data-g="' + gr.id + '" aria-pressed="false">' + esc(gr.t) + ' (' + fa(n) + ')</button>';
    });
    box.innerHTML = html;
    box.addEventListener('click', function (e) {
      var b = e.target.closest('.gchip'); if (!b) return;
      dirState.g = b.getAttribute('data-g');
      $$('.gchip', box).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      renderTiles();
    });
  }

  function matchDir(m) {
    if (dirState.g !== 'all' && m.g !== dirState.g) return false;
    if (!dirState.q) return true;
    var q = dirState.q.toLowerCase();
    return (m.t + ' ' + m.d + ' ' + m.k).toLowerCase().indexOf(q) !== -1;
  }

  function renderTiles() {
    var box = $('#tiles'); if (!box) return;
    var list = D.MODULES.filter(matchDir);
    box.innerHTML = list.map(function (m) {
      return '<article class="tile" id="mod-' + esc(m.k) + '" data-g="' + esc(m.g) + '">' +
        '<div class="tile-hd"><span class="tile-ic">' + icon(m.i) + '</span><h3>' + esc(m.t) + '</h3></div>' +
        '<p>' + esc(m.d) + '</p>' +
        '<div class="tile-ft"><a class="lnk" href="/#' + esc(m.k) + '" target="_blank" rel="noopener">باز کردن در سامانه' +
        '<svg class="ic-s" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg></a>' +
        '<span class="hint">' + esc(groupTitle(m.g)) + '</span></div></article>';
    }).join('');
    var em = $('#tilesEmpty'); if (em) em.hidden = list.length > 0;
  }

  function renderSops() {
    var rail = $('#sopRail');
    if (rail) rail.innerHTML = D.FEATURED.map(function (s) {
      return '<article class="sop-card">' +
        '<div class="sop-top"><span class="sop-code">' + esc(s.c) + '</span><span class="sop-ref">' + esc(s.tag) + '</span></div>' +
        '<h3>' + esc(s.t) + '</h3><p>' + esc(s.d) + '</p>' +
        '<div class="sop-meta"><span>استاندارد مرجع: ' + esc(s.ref) + '</span>' +
        '<a class="lnk" href="/#documents" target="_blank" rel="noopener">در سامانه</a></div></article>';
    }).join('');
    var all = $('#sopAll');
    if (all) all.innerHTML = D.SOPS.map(function (s) {
      return '<div class="sop-li" id="sop-' + esc(s.c) + '"><span class="c">' + esc(s.c) + '</span><span>' + esc(s.t) + '</span></div>';
    }).join('');
  }

  function renderIntel() {
    var box = $('#intelTiles'); if (!box) return;
    box.innerHTML = D.INTEL.map(function (x) {
      return '<article class="tile"><div class="tile-hd"><span class="tile-ic">' + icon(x.i) + '</span><h3>' + esc(x.t) + '</h3></div>' +
        '<p>' + esc(x.d) + '</p><div class="tile-ft"><a class="lnk" href="/#' + esc(x.k) + '" target="_blank" rel="noopener">باز کردن در سامانه</a></div></article>';
    }).join('');
  }

  function renderDemo() {
    var tb = $('#demoRows');
    if (tb) tb.innerHTML = D.DEMO_ROWS.map(function (r) {
      return '<tr><td>' + esc(r.r) + '</td><td class="u">' + esc(r.u) + '</td><td class="p">Demo@2026</td></tr>';
    }).join('');
    var p = $('#demoPaths');
    if (p) p.innerHTML = D.PATHS.map(function (x) {
      return '<a class="tile" href="' + esc(x.h) + '" target="_blank" rel="noopener" style="text-decoration:none">' +
        '<div class="tile-hd"><span class="tile-ic">' + icon('play') + '</span><h3>' + esc(x.t) + '</h3></div>' +
        '<p>' + esc(x.d) + '</p></a>';
    }).join('');
  }

  // انتخاب یک ماژول از جستجوی سراسری: فیلترها را صفر می‌کند تا کارت حتماً دیده شود.
  function focusModule(k) {
    dirState.q = '';
    var dq = $('#dirQ'); if (dq) dq.value = '';
    dirState.g = 'all';
    $$('.gchip').forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-g') === 'all')); });
    renderTiles();
    U.flash('#mod-' + k);
  }

  function init() {
    renderGroupChips();
    renderTiles();
    renderSops();
    renderIntel();
    renderDemo();
    var dirQ = $('#dirQ');
    if (dirQ) dirQ.addEventListener('input', function () {
      dirState.q = dirQ.value.trim();
      renderTiles();
    });
  }

  window.CatalogDirectory = {
    init: init, renderTiles: renderTiles, groupTitle: groupTitle, focusModule: focusModule
  };
})();

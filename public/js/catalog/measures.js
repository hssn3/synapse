/* مرورگر سنجه‌های ویرایش ششم — ایندکس تنبل، فیلترها و راهنمای ارزیابی. */
(function () {
  'use strict';

  var U = window.CatalogUtils;
  var $ = U.$, $$ = U.$$, esc = U.esc, fa = U.fa, faW = U.faW;

  var MIndex = null, MNotes = null, idxPromise = null, notesPromise = null;
  var MX = { q: '', axis: '', level: '', safe: false, shown: 40 };
  var PAGE = 40;
  var onIndexLoaded = null;

  function loadIndex() {
    if (MIndex) return Promise.resolve(MIndex);
    if (idxPromise) return idxPromise;
    setMxStatus('در حال بارگذاری فهرست ۳۹۵ سنجه…');
    idxPromise = fetch('/accreditation/catalog/measures-index.json')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        MIndex = j;
        buildAxisOptions();
        renderSafety();
        if (typeof onIndexLoaded === 'function') onIndexLoaded();
        renderMeasures();
        return j;
      })
      .catch(function (e) {
        idxPromise = null;
        setMxStatus('بارگذاری فهرست سنجه‌ها ناموفق بود (' + esc(e.message) + '). اتصال را بررسی کنید و صفحه را نو کنید.');
        throw e;
      });
    return idxPromise;
  }

  function loadNotes() {
    if (MNotes) return Promise.resolve(MNotes);
    if (notesPromise) return notesPromise;
    notesPromise = fetch('/accreditation/catalog/measures-notes.json')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { MNotes = j; return j; })
      .catch(function (e) { notesPromise = null; throw e; });
    return notesPromise;
  }

  function setMxStatus(t) { var el = $('#mxCount'); if (el) el.textContent = t; }

  function buildAxisOptions() {
    var sel = $('#mxAxis'); if (!sel || !MIndex) return;
    var cur = sel.value;
    var html = '<option value="">همهٔ محورها (۱۸)</option>';
    var lastCh = '';
    (MIndex.axes || []).forEach(function (a) {
      if (a.ch !== lastCh) {
        if (lastCh) html += '</optgroup>';
        html += '<optgroup label="بخش ' + esc(a.ch) + '">';
        lastCh = a.ch;
      }
      html += '<option value="' + esc(a.c) + '">' + esc(a.c) + ' — ' + esc(a.t) + ' (' + fa(a.m) + ' سنجه)</option>';
    });
    if (lastCh) html += '</optgroup>';
    sel.innerHTML = html;
    sel.value = cur;
  }

  function matchMx(m) {
    if (MX.axis && m.ax !== MX.axis) return false;
    if (MX.level && String(m.l) !== MX.level) return false;
    if (MX.safe && !m.f) return false;
    if (!MX.q) return true;
    var q = MX.q.toLowerCase();
    return (m.c + ' ' + m.s).toLowerCase().indexOf(q) !== -1;
  }

  function measureRow(m) {
    var badges = '<span class="bdg bdg-lv">سطح ' + fa(m.l) + '</span>' +
      '<span class="bdg bdg-w">وزن ' + faW(m.w) + '</span>' +
      (m.f ? '<span class="bdg bdg-sf">ایمنی بیمار</span>' : '');
    return '<article class="mrow" id="mrow-' + esc(m.c) + '" data-c="' + esc(m.c) + '">' +
      '<button type="button" class="mrow-hd" aria-expanded="false">' +
        '<span class="mrow-code">' + esc(m.c) + '</span>' +
        '<span class="mrow-stmt">' + esc(m.s) + '</span>' +
        '<span class="mrow-badges">' + badges + '</span>' +
      '</button>' +
      '<div class="mrow-bd"></div></article>';
  }

  function renderMeasures() {
    if (!MIndex) return;
    var list = MIndex.measures.filter(matchMx);
    var shown = list.slice(0, MX.shown);
    var box = $('#mxList'); if (!box) return;
    var active = [];
    if (MX.q) active.push('«' + MX.q + '»');
    if (MX.axis) active.push('محور ' + MX.axis);
    if (MX.level) active.push('سطح ' + fa(MX.level));
    if (MX.safe) active.push('فقط ایمنی بیمار');
    setMxStatus('نمایش ' + fa(shown.length) + ' از ' + fa(list.length) + ' سنجه' +
      (list.length !== MIndex.measures.length ? ' (فیلتر: ' + active.join(' · ') + ')' : '') +
      (list.length ? '' : ' — موردی با این فیلتر پیدا نشد.'));
    box.innerHTML = shown.map(measureRow).join('');
    var more = $('#mxMore');
    if (more) {
      more.hidden = list.length <= MX.shown;
      more.textContent = 'نمایش ' + fa(Math.min(PAGE, list.length - MX.shown)) + ' مورد بیشتر';
    }
  }

  function fillDetail(row, code) {
    if (row.getAttribute('data-filled') === '1') return Promise.resolve();
    var bd = $('.mrow-bd', row);
    bd.innerHTML = '<div class="mx-load">در حال بارگذاری راهنمای ارزیابی…</div>';
    var m = null;
    if (MIndex) MIndex.measures.some(function (x) { if (x.c === code) { m = x; return true; } return false; });
    var std = null;
    if (MIndex && m) MIndex.standards.some(function (x) { if (x.c === m.std) { std = x; return true; } return false; });
    return loadNotes().then(function (notes) {
      var d = notes[code] || { n: '', st: [] };
      var steps = (d.st || []).map(function (s) {
        return '<li><span class="dot"></span><span style="flex:1">' + esc(s[0]) +
          (s[1] ? '<span class="resp"> — ' + esc(s[1]) + '</span>' : '') + '</span></li>';
      }).join('');
      var html = '<div class="mx-meta">' +
        '<span class="bdg bdg-lv">سطح ' + fa(m ? m.l : '') + '</span>' +
        '<span class="bdg bdg-w">وزن ' + faW(m ? m.w : '') + '</span>' +
        (m && m.f ? '<span class="bdg bdg-sf">پرچم ایمنی بیمار</span>' : '') +
        '<span class="bdg">صفحهٔ ' + fa(m ? m.p : '') + ' کتاب</span></div>';
      if (std) html += '<div class="mx-std">استاندارد <b>' + esc(std.c) + '</b> — ' + esc(std.s) + '</div>';
      if (steps) html += '<div class="mx-sec-t">مراحل موردانتظار</div><ul class="mx-steps">' + steps + '</ul>';
      if (d.n) html += '<div class="mx-sec-t">راهنمای ارزیابی</div><div class="mx-notes">' + esc(d.n) + '</div>';
      html += '<div class="mx-acts">' +
        '<a class="mx-btn" href="/#measures" target="_blank" rel="noopener">باز کردن ماژول سنجه‌ها در سامانه</a>' +
        '<button type="button" class="mx-btn" data-copycode="' + esc(code) + '">کپی کد سنجه</button>' +
        '<span class="hint">کد را می‌توانید در جستجوی سامانه جای‌گذاری کنید</span></div>';
      bd.innerHTML = html;
      row.setAttribute('data-filled', '1');
    }).catch(function () {
      bd.innerHTML = '<div class="mx-load">راهنمای ارزیابی بارگذاری نشد — متن کامل در <a href="/#measures" target="_blank" rel="noopener">ماژول سنجه‌ها</a> در دسترس است.</div>';
    });
  }

  function renderSafety() {
    if (!MIndex) return;
    var chs = MIndex.stats.byChapter || [];
    var total = 0; chs.forEach(function (c) { total += c.safety; });
    var elT = $('#sfTotal'); if (elT) elT.textContent = fa(total);
    chs.forEach(function (c, i) {
      var num = $('#sf' + (i === 0 ? 'A' : (i === 1 ? 'B' : 'C')));
      var bar = $('#sfBar' + (i === 0 ? 'A' : (i === 1 ? 'B' : 'C')));
      if (num) num.textContent = fa(c.safety);
      if (bar) bar.style.width = (total ? (c.safety / total * 100).toFixed(1) : 0) + '%';
    });
  }

  function renderHeroStats() {
    if (!MIndex) return;
    var s = MIndex.stats;
    var a = $('#st-measures'), b = $('#st-safety'), c = $('#st-std'), d = $('#st-axes');
    if (a) a.textContent = fa(s.measures);
    if (b) b.textContent = fa(s.safety);
    if (c) c.textContent = fa(s.standards);
    if (d) d.textContent = fa(s.axes);
  }

  function openSafetyFilter() {
    MX = { q: '', axis: '', level: '', safe: true, shown: PAGE };
    var mxQ = $('#mxQ'), mxAxis = $('#mxAxis'), mxLevel = $('#mxLevel'), mxSafe = $('#mxSafe');
    if (mxQ) mxQ.value = ''; if (mxAxis) mxAxis.value = ''; if (mxLevel) mxLevel.value = '';
    if (mxSafe) mxSafe.setAttribute('aria-pressed', 'true');
    var sec = $('#accreditation'); if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    loadIndex().then(renderMeasures).catch(function () {});
  }

  // انتخاب یک سنجه از جستجوی سراسری: فیلتر را روی همان کد می‌گذارد و جزئیات را باز می‌کند.
  function focusMeasure(code) {
    MX = { q: code, axis: '', level: '', safe: false, shown: PAGE };
    var mxQ = $('#mxQ'), mxAxis = $('#mxAxis'), mxLevel = $('#mxLevel'), mxSafe = $('#mxSafe');
    if (mxQ) mxQ.value = code;
    if (mxAxis) mxAxis.value = '';
    if (mxLevel) mxLevel.value = '';
    if (mxSafe) mxSafe.setAttribute('aria-pressed', 'false');
    loadIndex().then(function () {
      renderMeasures();
      var sec = $('#accreditation'); if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var row = $('#mrow-' + code);
      if (row) {
        var hd = $('.mrow-hd', row);
        if (hd && row.getAttribute('data-filled') !== '1') {
          row.classList.add('open');
          hd.setAttribute('aria-expanded', 'true');
          $('.mrow-bd', row).classList.add('on');
          fillDetail(row, code);
        }
        U.flash('#mrow-' + code);
      }
    }).catch(function () {});
  }

  function init(opts) {
    onIndexLoaded = opts && opts.onIndexLoaded;

    var mxList = $('#mxList');
    if (mxList) mxList.addEventListener('click', function (e) {
      var copyBtn = e.target.closest('[data-copycode]');
      if (copyBtn) { U.copy(copyBtn.getAttribute('data-copycode'), 'کد سنجه کپی شد'); return; }
      var hd = e.target.closest('.mrow-hd'); if (!hd) return;
      var row = hd.closest('.mrow'); if (!row) return;
      var open = row.classList.toggle('open');
      hd.setAttribute('aria-expanded', String(open));
      var bd = $('.mrow-bd', row);
      if (open) {
        bd.classList.add('on');
        if (row.getAttribute('data-filled') !== '1') fillDetail(row, row.getAttribute('data-c'));
      } else {
        bd.classList.remove('on');
      }
    });

    var mxQ = $('#mxQ');
    if (mxQ) mxQ.addEventListener('input', U.debounce(function () {
      MX.q = mxQ.value.trim(); MX.shown = PAGE;
      if (MIndex) renderMeasures(); else loadIndex().catch(function () {});
    }, 140));

    var mxAxis = $('#mxAxis');
    if (mxAxis) mxAxis.addEventListener('change', function () { MX.axis = mxAxis.value; MX.shown = PAGE; renderMeasures(); });
    var mxLevel = $('#mxLevel');
    if (mxLevel) mxLevel.addEventListener('change', function () { MX.level = mxLevel.value; MX.shown = PAGE; renderMeasures(); });
    var mxSafe = $('#mxSafe');
    if (mxSafe) mxSafe.addEventListener('click', function () {
      MX.safe = !MX.safe; mxSafe.setAttribute('aria-pressed', String(MX.safe)); MX.shown = PAGE; renderMeasures();
    });
    var mxReset = $('#mxReset');
    if (mxReset) mxReset.addEventListener('click', function () {
      MX = { q: '', axis: '', level: '', safe: false, shown: PAGE };
      if (mxQ) mxQ.value = ''; if (mxAxis) mxAxis.value = ''; if (mxLevel) mxLevel.value = '';
      if (mxSafe) mxSafe.setAttribute('aria-pressed', 'false');
      renderMeasures();
    });
    var mxMore = $('#mxMore');
    if (mxMore) mxMore.addEventListener('click', function () { MX.shown += PAGE; renderMeasures(); });

    $$('.stat').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var go = btn.getAttribute('data-go');
        var sec = $('#accreditation'); if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (go === 'safety') openSafetyFilter();
        else loadIndex().then(renderMeasures).catch(function () {});
      });
    });

    ['#mxQ', '#mxAxis', '#mxLevel', '#mxSafe'].forEach(function (sel) {
      var el = $(sel);
      if (el) el.addEventListener('focus', function () { loadIndex().catch(function () {}); }, { once: true });
    });
  }

  // بارگذاری تنبل فهرست: لنگر سنجه/ایمنی → فوری؛ در غیر این صورت در زمان بیکاری.
  function idleLoad() {
    if (window.location.hash === '#accreditation' || window.location.hash === '#safety-never-events') {
      loadIndex().then(function () { renderHeroStats(); }).catch(function () {});
      return;
    }
    if ('requestIdleCallback' in window) requestIdleCallback(function () { loadIndex().then(renderHeroStats).catch(function () {}); }, { timeout: 2500 });
    else setTimeout(function () { loadIndex().then(renderHeroStats).catch(function () {}); }, 1400);
  }

  window.CatalogMeasures = {
    init: init,
    idleLoad: idleLoad,
    loadIndex: loadIndex,
    renderMeasures: renderMeasures,
    openSafetyFilter: openSafetyFilter,
    focusMeasure: focusMeasure,
    getIndex: function () { return MIndex; }
  };
})();

/* ابزارهای مشترک کاتالوگ — DOM، قالب‌بندی فارسی، اعلان، کپی و درخشش. */
(function () {
  'use strict';

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fa(n) { return String(n).replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[+d]; }); }
  function faW(w) { return fa(String(w)).replace('.', '٫'); }

  var toastTimer = null;
  function toast(msg) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('on');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var a = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, a); }, ms);
    };
  }

  function icon(n) {
    try { return (typeof window.ic === 'function') ? window.ic(n) : ''; }
    catch (e) { return ''; }
  }

  function flash(sel) {
    var el = $(sel); if (!el) return;
    el.classList.add('flash');
    setTimeout(function () { el.classList.remove('flash'); }, 2600);
  }

  function legacyCopy(text, done) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      done();
    } catch (e) { toast('کپی نشد — دستی انتخاب کنید'); }
  }
  function copy(text, msg) {
    function done() { toast(msg || 'کپی شد'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { legacyCopy(text, done); });
    } else legacyCopy(text, done);
  }

  window.CatalogUtils = {
    $: $, $$: $$, esc: esc, fa: fa, faW: faW,
    toast: toast, debounce: debounce, icon: icon, flash: flash, copy: copy
  };
})();

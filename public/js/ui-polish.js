/* ==========================================================================
   ui-polish.js — بهبوددهندهٔ کوچک رابط (استانداردسازی ۲۰۲۶-۰۹-۲۹)
   --------------------------------------------------------------------------
   چرا: (۱) ستارهٔ «*» انتهای برچسب‌های فرم متنِ ساده و کم‌جلوه بود — به نشان
   استایل‌دار تبدیل می‌شود. (۲) «هرجا فرم هست باید روشن باشد چطور کار کند» —
   یک نوار راهنمای کوتاه بالای فرم‌های واقعی (پنل/مودال) تزریق می‌شود.
   (۳) دکمهٔ اصلی «ثبت/ذخیره» و «انصراف» فرم نشان‌دار می‌شوند تا بزرگ‌تر و
   برجسته‌تر دیده شوند (استایل در ui-polish.css).
   همه‌چیز idempotent و داخل try/catch — هیچ منطق یا داده‌ای تغییر نمی‌کند و
   راهنمای طلایی موجود (applyFieldGuides) دست‌نخورده می‌ماند.
   ========================================================================== */
(function () {
  'use strict';
  if (window.__UIP_LOADED) return;
  window.__UIP_LOADED = true;

  var GUIDE_HTML = '<span class="fg-ico">🧭</span><span>راهنمای فرم: فیلدهای نشان‌دار با <b>*</b> الزامی‌اند. کنار فیلدهای خالی، نشانگر طلایی <b>؟</b> توضیح و دکمهٔ «✎ پر کردن نمونه» را نشان می‌دهد. پس از تکمیل، دکمهٔ <b>ثبت / ذخیره</b> پایین فرم را بزنید.</span>';

  /* ---------- ۱) ستارهٔ الزامی: span.req ---------- */
  function polishLabels(root) {
    var labels, i, L, kids, tn, t, m, sp, k;
    try { labels = root.querySelectorAll('.fg > label'); } catch (e) { return; }
    for (i = 0; i < labels.length; i++) {
      L = labels[i];
      if (L.getAttribute('data-uip') === '1') continue;
      L.setAttribute('data-uip', '1');
      // آخرین گره متنی که با «*» تمام می‌شود را پیدا و تبدیل می‌کنیم
      kids = L.childNodes; tn = null;
      for (k = kids.length - 1; k >= 0; k--) {
        if (kids[k].nodeType === 3 && /\*\s*$/.test(kids[k].data)) { tn = kids[k]; break; }
      }
      if (!tn) continue;
      m = tn.data.match(/^(.*?)\s*\*+\s*$/);
      if (!m) continue;
      tn.data = m[1];
      sp = document.createElement('span');
      sp.className = 'req';
      sp.textContent = '*';
      tn.parentNode.insertBefore(sp, tn.nextSibling);
    }
  }

  /* ---------- ۲) نوار راهنمای فرم ---------- */
  function looksLikeForm(q) {
    var fgs, hasSave;
    try { fgs = q.querySelectorAll('.fg'); } catch (e) { return false; }
    if (fgs.length < 2) return false;
    if (q.classList && q.classList.contains('docfilters')) return false;
    /* صفحهٔ «برنامهٔ شیفت» گرید ساعتی دارد؛ فیلدهای یادداشت/توضیحش «فرم» نیستند */
    if (q.querySelector('.tbl-wrap.ss-grid-wrap')) return false;
    hasSave = /save|submit|store/i.test(scanOnclicks(q));
    if (hasSave) return true;
    /* بدون دکمهٔ ثبت، فقط ظرف‌هایی با فیلدهای کافی «فرم واقعی» حساب می‌شوند؛
       کارت‌های یادداشت/تنظیماتِ دو-فیلدی نوار راهنما نمی‌گیرند. */
    if ((q.querySelector('.docgrid') || q.querySelector('textarea')) && fgs.length >= 3) return true;
    return false;
  }
  function scanOnclicks(q) {
    var out = '', btns, i, oc;
    try { btns = q.querySelectorAll('button[onclick]'); } catch (e) { return ''; }
    for (i = 0; i < btns.length && i < 40; i++) {
      oc = btns[i].getAttribute('onclick') || '';
      out += oc + ' ';
    }
    return out;
  }
  function injectGuide(q) {
    if (q.getAttribute('data-uip-form') === '1') return;
    if (!looksLikeForm(q)) return;
    q.setAttribute('data-uip-form', '1');
    var guide = document.createElement('div');
    guide.className = 'form-guide';
    guide.setAttribute('role', 'note');
    guide.innerHTML = GUIDE_HTML;
    var anchor = null, fg;
    try { fg = q.querySelector('.docgrid') || q.querySelector('.fg'); } catch (e) { fg = null; }
    if (fg) {
      anchor = fg;
      while (anchor && anchor.parentNode && anchor.parentNode !== q) anchor = anchor.parentNode;
      if (anchor && anchor.parentNode !== q) anchor = null;
    }
    try {
      if (anchor) q.insertBefore(guide, anchor);
      else q.insertBefore(guide, q.firstChild);
    } catch (e) { /* در صورت شکست، بی‌صدا رد شو */ }
  }

  /* ---------- ۳) نشان‌دارکردن دکمه‌های فرم ---------- */
  function markButtons(q) {
    var btns, i, b, oc;
    try { btns = q.querySelectorAll('button'); } catch (e) { return; }
    for (i = 0; i < btns.length && i < 60; i++) {
      b = btns[i]; oc = b.getAttribute('onclick') || '';
      if (/save|submit|store/i.test(oc)) {
        if (!b.classList.contains('form-submit')) b.classList.add('form-submit');
      } else if (/back|cancel|revert/i.test(oc)) {
        if (!b.classList.contains('form-cancel')) b.classList.add('form-cancel');
      }
    }
  }

  /* ---------- اجرای همه: اسکن خوشه‌ای با debounce ---------- */
  function run() {
    var boxes, i;
    try { polishLabels(document); } catch (e) { /* noop */ }
    try { boxes = document.querySelectorAll('.pbody, .modal-box'); } catch (e) { boxes = []; }
    for (i = 0; i < boxes.length; i++) {
      try { injectGuide(boxes[i]); } catch (e) { /* noop */ }
      try { markButtons(boxes[i]); } catch (e) { /* noop */ }
    }
  }
  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    setTimeout(function () { pending = false; run(); }, 200);
  }

  function boot() {
    run();
    setTimeout(run, 700);
    setTimeout(run, 1800);
    try {
      var mo = new MutationObserver(function () { schedule(); });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) { /* مرورگر قدیمی: بدون ناظر هم اجرای اولیه کافی است */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

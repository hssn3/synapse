/* ==========================================================================
 * سیستم دکمه و مودال تأیید فارسی — buttons-system.js
 * --------------------------------------------------------------------------
 * چرا این فایل ساخته شد: هیچ BTN.confirmDanger و هیچ buttons-system.js
 * در پروژه نبود (۴۹ فراخوانی confirm/prompt بومی پراکنده). قرارداد تابع
 * ثابت می‌ماند تا همه فراخوانی‌ها بدون شکست جایگزین شوند:
 *   BTN.confirmDanger({title,text,confirmText,cancelText}) => Promise<bool>
 * دکمه خطرناک قرمز + تأیید دومرحله‌ای است (کلیک اول مسلح می‌کند، کلیک
 * دوم در ۵ ثانیه تأیید می‌کند) تا حذف تصادفی رخ ندهد. کاملاً فارسی RTL.
 * ========================================================================== */
(function (global) {
  'use strict';

  /**
   * چرا: ساخت اسکلت مودال فارسی بدون وابستگی خارجی.
   * @param {Object} opts عنوان و متن و برچسب‌ها
   * @param {boolean} danger اگر true تم قرمز خطرناک می‌گیرد
   * @returns {{back, okBtn, cancelBtn}} عناصر مودال
   */
  function buildModal(opts, danger) {
    var back = document.createElement('div');
    back.className = 'btn-modal-backdrop';
    back.setAttribute('role', 'presentation');
    var title = (opts && opts.title) || 'تأیید عملیات';
    var text = (opts && opts.text) || 'آیا مطمئن هستید؟';
    var confirmText = (opts && opts.confirmText) || 'تأیید';
    var cancelText = (opts && opts.cancelText) || 'انصراف';
    back.innerHTML =
      '<div class="btn-modal' + (danger ? ' btn-modal-danger' : '') + '" role="alertdialog" aria-modal="true" aria-label="' +
      String(title).replace(/"/g, '') + '">' +
      '<h3></h3><p></p>' +
      '<div class="btn-modal-actions">' +
      '<button type="button" class="btn--danger btn--md btn-ok"></button>' +
      '<button type="button" class="btn--secondary btn--md btn-cancel"></button>' +
      '</div></div>';
    back.querySelector('h3').textContent = title;
    back.querySelector('p').textContent = text;
    var okBtn = back.querySelector('.btn-ok');
    var cancelBtn = back.querySelector('.btn-cancel');
    okBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;
    if (!danger) {
      okBtn.className = 'btn--primary btn--md btn-ok';
    }
    return { back: back, okBtn: okBtn, cancelBtn: cancelBtn, confirmText: confirmText };
  }

  /**
   * چرا: منطق مشترک نمایش مودال با پشتیبانی ESC و کلیک بیرون.
   * @param {Object} opts گزینه‌ها
   * @param {boolean} danger حالت خطرناک
   * @param {boolean} twoStep تأیید دومرحله‌ای
   * @returns {Promise<boolean>} true یعنی تأیید شد
   */
  function showModal(opts, danger, twoStep) {
    return new Promise(function (resolve) {
      var m = buildModal(opts, danger);
      var armed = !twoStep;
      var timer = null;
      document.body.appendChild(m.back);
      m.cancelBtn.focus();
      function cleanup(val) {
        if (timer) clearTimeout(timer);
        document.removeEventListener('keydown', onKey, true);
        if (m.back.parentNode) m.back.parentNode.removeChild(m.back);
        resolve(val);
      }
      function onKey(e) {
        if (e.key === 'Escape') cleanup(false);
        if (e.key === 'Enter' && document.activeElement === m.cancelBtn) cleanup(false);
      }
      document.addEventListener('keydown', onKey, true);
      m.back.addEventListener('mousedown', function (e) {
        if (e.target === m.back) cleanup(false);
      });
      m.cancelBtn.addEventListener('click', function () { cleanup(false); });
      m.okBtn.addEventListener('click', function () {
        if (!armed) {
          armed = true;
          m.okBtn.textContent = 'برای تأیید نهایی دوباره کلیک کنید';
          m.okBtn.classList.add('btn--loading');
          timer = setTimeout(function () {
            armed = false;
            m.okBtn.classList.remove('btn--loading');
            m.okBtn.textContent = m.confirmText;
          }, 5000);
          return;
        }
        cleanup(true);
      });
    });
  }

  var BTN = {
    /**
     * چرا: جایگزین فارسی confirm بومی برای عملیات خطرناک (حذف/انصراف).
     * قرارداد ثابت: ورودی آبجکت، خروجی Promise<boolean>.
     */
    confirmDanger: function (opts) {
      if (typeof opts === 'string') opts = { text: opts };
      return showModal(opts || {}, true, true);
    },
    /**
     * چرا: تأیید عمومی تک‌مرحله‌ای برای عملیات غیرمخرب.
     */
    confirm: function (opts) {
      if (typeof opts === 'string') opts = { text: opts };
      return showModal(opts || {}, false, false);
    },
    /**
     * چرا: جایگزین alert بومی با مودال فارسی یک‌دکمه‌ای.
     */
    alert: function (opts) {
      if (typeof opts === 'string') opts = { text: opts };
      var o = opts || {};
      o.cancelText = o.cancelText || 'باشه';
      return new Promise(function (resolve) {
        var m = buildModal({ title: o.title || 'اطلاع', text: o.text || '', confirmText: o.cancelText }, false);
        document.body.appendChild(m.back);
        m.back.querySelector('.btn-modal-actions').innerHTML = '';
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'btn--primary btn--md'; b.textContent = o.cancelText;
        m.back.querySelector('.btn-modal-actions').appendChild(b);
        b.focus();
        b.addEventListener('click', function () {
          if (m.back.parentNode) m.back.parentNode.removeChild(m.back);
          resolve(true);
        });
      });
    },
    /**
     * چرا: جایگزین فارسی prompt بومی (دلیل رد، درصد، مقدار، عنوان) با اینپوت راست‌چین.
     * قرارداد: BTN.prompt(text, defaultValue) => Promise<string|null> (null یعنی انصراف).
     */
    prompt: function (text, defVal) {
      return new Promise(function (resolve) {
        var back = document.createElement('div');
        back.className = 'btn-modal-backdrop';
        back.setAttribute('role', 'presentation');
        back.innerHTML = '<div class="btn-modal" role="dialog" aria-modal="true">' +
          '<h3>ورودی</h3><p></p>' +
          '<input type="text" class="btn-prompt-input" style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;border:1px solid rgba(212,175,90,.4);background:#0a1a14;color:#fff;font-family:inherit;font-size:14px;direction:rtl">' +
          '<div class="btn-modal-actions" style="margin-top:14px">' +
          '<button type="button" class="btn--primary btn--md btn-ok">تأیید</button>' +
          '<button type="button" class="btn--secondary btn--md btn-cancel">انصراف</button>' +
          '</div></div>';
        back.querySelector('p').textContent = String(text || '');
        var inp = back.querySelector('input');
        inp.value = (defVal === undefined || defVal === null) ? '' : String(defVal);
        document.body.appendChild(back);
        inp.focus();
        function done(v) {
          if (back.parentNode) back.parentNode.removeChild(back);
          document.removeEventListener('keydown', onKey, true);
          resolve(v);
        }
        function onKey(e) {
          if (e.key === 'Escape') done(null);
          if (e.key === 'Enter') done(inp.value);
        }
        document.addEventListener('keydown', onKey, true);
        back.addEventListener('mousedown', function (e) { if (e.target === back) done(null); });
        back.querySelector('.btn-cancel').addEventListener('click', function () { done(null); });
        back.querySelector('.btn-ok').addEventListener('click', function () { done(inp.value); });
      });
    },
    /**
     * چرا: حالت لودینگ استاندارد روی دکمه بدون دست‌کاری inline.
     */
    setLoading: function (btn, on) {
      if (!btn) return;
      if (on) { btn.classList.add('btn--loading'); btn.setAttribute('aria-disabled', 'true'); btn.disabled = true; }
      else { btn.classList.remove('btn--loading'); btn.removeAttribute('aria-disabled'); btn.disabled = false; }
    }
  };

  global.BTN = BTN;
})(typeof window !== 'undefined' ? window : this);

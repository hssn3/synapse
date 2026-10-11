/**
 * هدر و فوترِ صفحات عمومی (بدون احراز هویت)
 *
 * صفحات public/*.html فرم‌های مستقل‌اند (نه بخشی از SPA) و هیچ هدر/فوتری نداشتند —
 * کاربری که از بیرون روی لینک نظرسنجی یا گزارش خطا می‌آمد، یک کارت تنها در وسط صفحه
 * می‌دید بدون هیچ نشانی از اینکه اینجا کجاست و متعلق به کدام سامانه است.
 *
 * برعکسِ داخل حساب کاربری (که هدر/فوترِ معرفی محصول عمداً پنهان است چون فقط ارتفاع
 * می‌گیرد)، این‌جا بازدیدکننده‌ی ناشناس است و دقیقاً همان معرفی را لازم دارد.
 *
 * همان کلاس‌های app.css بازاستفاده می‌شوند (#ghdr/.ghdr-in/.gftr-in و …) تا ظاهر با
 * صفحه‌ی اصلی یکی باشد؛ این فایل فقط markup را تزریق می‌کند و CSS تازه‌ای نمی‌آورد.
 * بدون وابستگی به app.js — آن فایل کل SPA است و این صفحات لودش نمی‌کنند.
 */
(function () {
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function mount() {
    if (document.getElementById('ghdr')) return;   // قبلاً تزریق شده

    var hdr = document.createElement('div');
    hdr.id = 'ghdr';
    hdr.innerHTML =
      '<div class="ghdr-in">' +
        '<a class="ghdr-brand" href="/" title="بازگشت به صفحه‌ی اصلی سامانه" style="text-decoration:none">' +
          '<div class="lmark sm shine anim">✦</div>' +
          '<b>سامانه جامع مدیریت بیمارستانی</b>' +
        '</a>' +
        '<div class="ghdr-cta"><a class="btn btn-o btn-sm" href="/">ورود به سامانه</a></div>' +
      '</div>';
    document.body.insertBefore(hdr, document.body.firstChild);

    var ftr = document.createElement('div');
    ftr.id = 'gftr';
    ftr.innerHTML =
      '<div class="gftr-in">' +
        '<div class="gftr-brand"><div class="lmark sm shine">✦</div>' +
          '<div><b>سامانه جامع مدیریت بیمارستانی</b>' +
          '<span>این فرم بدون ورود به سامانه تکمیل می‌شود و مستقیماً برای واحد بهبود کیفیت همان مرکز ثبت می‌گردد.</span></div>' +
        '</div>' +
        // راهنما به‌ازای هر فرم فرق می‌کند و متنِ ثابت روی بعضی‌شان دروغ بود:
        // «پس از ثبت، کد رهگیری دریافت می‌کنید» فقط برای گزارش خطا درست است.
        // نظرسنجی بی‌نام است و هیچ کدی نمی‌دهد، و همین باعث شده بود کاربر بپرسد
        // «بعد از نظرسنجی معلوم نیست جوابش کجا می‌رود». هر صفحه می‌تواند
        // window.PUBLIC_NOTES را پیش از بارگذاری این فایل تعریف کند.
        '<div class="gftr-col"><b>راهنما</b>' +
          (window.PUBLIC_NOTES && window.PUBLIC_NOTES.length
            ? window.PUBLIC_NOTES.map(function(t){ return '<span>' + esc(t) + '</span>'; }).join('')
            : '<span>تکمیل فرم می‌تواند ناشناس باشد.</span>' +
              '<span>پس از ثبت، کد رهگیری دریافت می‌کنید.</span>') +
        '</div>' +
      '</div>' +
      '<div class="gftr-cr">© ' + esc(new Date().getFullYear()) +
        ' سامانه جامع مدیریت بیمارستانی — تمام حقوق محفوظ است.</div>';
    document.body.appendChild(ftr);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();

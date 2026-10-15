// سربرگ استاندارد صفحات عمومی بدون‌ورود (/public/*): لوگو + نام بیمارستان.
// یک تابع مشترک — در فرم‌های عمومی کپی نمی‌شود، هر صفحه فقط این فایل را لود و صدا می‌زند.
// نکته: اگر بیمارستان لوگو نداشت (404 مورد عادی)، آیکن جایگزین نمایش داده می‌شود؛ اگر شناسه نامعتبر
// بود، سربرگ ساکت حذف می‌شود (هشدار اصلی خطا را همان اسکریپت خود صفحه نمایش می‌دهد).
function initPubLetterhead(hospitalId, mountEl) {
  var mount = mountEl || document.getElementById('pubLetterhead');
  if (!mount || !hospitalId) return;
  mount.innerHTML =
    '<span class="pll-logo" id="pllLogo">🏥</span>' +
    '<div class="pll-txt"><b id="pllName">&nbsp;</b><span>سربرگ رسمی مرکز درمانی</span></div>';
  // اول اطلاعات بیمارستان می‌آید و img.src فقط وقتی ست می‌شود که has_logo صادق باشد.
  // قبلاً img.src همیشه ست می‌شد و برای بیمارستانِ بدونِ‌لوگو یک درخواستِ ۴۰۴ بی‌فایده
  // در کنسول هر پنج فرم عمومی می‌گذاشت (۴۰۴ سمت سرور عمدی است). حالت جایگزین (آیکن 🏥)
  // و رفتار خطا مثل قبل باقی می‌ماند.
  fetch('/api/public/hospital/' + encodeURIComponent(hospitalId))
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || !d.hospital) return; // شناسه‌ی نامعتبر — سربرگ ساکت می‌ماند
      if (d.hospital.name) document.getElementById('pllName').textContent = d.hospital.name;
      if (!d.hospital.has_logo) return; // لوگو ثبت نشده — آیکن پیش‌فرض می‌ماند
      var logoEl = document.getElementById('pllLogo');
      var img = new Image();
      // متن جایگزین = نام مرکز — صفحه‌خوان‌ها لوگو را «بیمارستان …» اعلام کنند (WCAG 1.1.1)
      img.alt = (d.hospital && d.hospital.name) ? d.hospital.name : 'لوگوی مرکز درمانی';
      img.onload = function () { logoEl.innerHTML = ''; logoEl.appendChild(img); img.className = 'pll-img'; };
      img.onerror = function () { /* لوگو ثبت شده ولی فایل روی سرور نیست — آیکن پیش‌فرض باقی می‌ماند */ };
      img.src = '/api/public/hospital/' + encodeURIComponent(hospitalId) + '/logo';
    })
    .catch(function () { /* نام/لوگو اختیاری است */ });
}

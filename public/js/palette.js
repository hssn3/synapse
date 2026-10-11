/* Command Palette مودال — مورد ۱۹ چک‌لیست (مکمل جستجوی inline موجود در app.js)
   چرا فایل جدا: app.js حدود ۱.۲۸MB است؛ دست‌کاری مستقیم ریسک رگرسیون دارد.
   این فایل فقط یک اورلی Ctrl+K دوم می‌سازد که روی همان go(p) سوار می‌شود. */
(function () {
  'use strict';
  const COMMANDS = [
    ['داشبورد', 'dash'], ['اعتباربخشی', 'measures'], ['شاخص‌ها', 'indicators'],
    ['کارت امتیازی (BSC)', 'bsc'], ['چک‌لیست‌ها', 'checklists'], ['کمیته‌ها', 'committees'],
    ['مستندات و پرونده‌ها', 'documents'], ['خطاها و وقایع ناخواسته', 'errors'], ['رضایت‌سنجی بیمار', 'satisfaction'],
    ['توسعه منابع انسانی', 'hrdev'], ['پیمانکاران و تأمین‌کنندگان', 'vendors'], ['نظارت پرستاری', 'nsupervision'],
    ['برنامه شیفت پرسنل', 'staffshift'], ['داروخانه و استوک', 'pharmacy'], ['کارتابل وظایف من', 'duties'],
    ['کاربران و دسترسی‌ها', 'users'], ['گزارش‌ها و تحلیل آماری', 'reports'],
    ['راهنمای جامع نقش', 'guide'], ['تنظیمات سامانه', 'settings'],
    ['مدیریت مالی', 'finance'], ['آموزش و بهسازی', 'education'], ['مدیریت بحران و بلایا', 'disaster'],
    ['جراحی ایمن', 'safesurgery'], ['مدیریت خون و فرآورده‌ها', 'blood'], ['آزمایشگاه', 'lab'],
    ['تصویربرداری پزشکی', 'imaging'], ['کنترل عفونت', 'infection'], ['بهداشت حرفه‌ای', 'occhealth'],
    ['حقوق گیرنده خدمت', 'patientfocus'], ['ارتباط با مراجعین (CRM)', 'crm'], ['حضور و غیاب شیفت', 'shiftatt'],
    ['مدیریت دارایی‌ها و تجهیزات', 'assets'], ['آموزش پرسنل', 'training'],
    ['شکایات و پیشنهادات', 'crm'], ['ایمنی بیمار و FMEA', 'fmea'],
    ['تلفیق دارویی بالینی', 'medrecon'], ['پسماند و اتوکلاو', 'waste'],
    ['ارزیابی انطباق و شکاف', 'reviewgaps'], ['گردش‌های ایمنی (Walkarounds)', 'walkarounds'],
    ['فرایندهای بیمارستانی', 'processes'], ['برنامه‌های عملیاتی', 'programs'],
    ['ساختار و چارت سازمانی', 'orgstructure'], ['پیگیری بیماران', 'followup'],
    ['حقوق بیمار', 'patientrights'], ['مادر و نوزاد', 'maternal'], ['خدمات سرپایی', 'outpatient']
  ];
  let overlay = null, input = null, list = null, sel = 0, filtered = COMMANDS;
  function build() {
    overlay = document.createElement('div');
    overlay.id = 'cmdk';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,23,.6);z-index:9999;display:none;align-items:flex-start;justify-content:center;padding-top:12vh';
    overlay.innerHTML = '<div style="width:min(560px,92vw);background:#0f172a;border:1px solid #334155;border-radius:14px;overflow:hidden">'
      + '<input id="cmdk-q" placeholder="دستور یا صفحه… (تایپ کنید)" style="width:100%;padding:14px 16px;background:transparent;border:0;color:#e2e8f0;font-size:15px;outline:none">'
      + '<div id="cmdk-list" style="max-height:320px;overflow:auto;border-top:1px solid #1e293b"></div></div>';
    document.body.appendChild(overlay);
    input = overlay.querySelector('#cmdk-q');
    list = overlay.querySelector('#cmdk-list');
    input.addEventListener('input', () => { draw(input.value); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, filtered.length - 1); paint(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); paint(); }
      else if (e.key === 'Enter') { goSel(); }
      else if (e.key === 'Escape') { close(); }
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  }
  function draw(q) {
    const s = (q || '').trim();
    filtered = COMMANDS.filter((c) => !s || c[0].includes(s) || c[1].includes(s.toLowerCase()));
    sel = 0; paint();
  }
  function paint() {
    list.innerHTML = filtered.map((c, i) => '<div data-i="' + i + '" style="padding:10px 16px;cursor:pointer;color:' + (i === sel ? '#fbbf24' : '#e2e8f0') + ';background:' + (i === sel ? '#1e293b' : 'transparent') + '">' + c[0] + ' <span style="opacity:.5;font-size:12px">' + c[1] + '</span></div>').join('') || '<div style="padding:14px;color:#64748b">یافت نشد</div>';
    list.querySelectorAll('[data-i]').forEach((el) => { el.onclick = () => { sel = +el.dataset.i; goSel(); }; });
  }
  function goSel() {
    const c = filtered[sel]; close();
    if (!c) return;
    try {
      if (typeof go === 'function') go(c[1]);
      else location.hash = '#/' + c[1];
    } catch (e) { location.hash = '#/' + c[1]; }
  }
  function open() { if (!overlay) build(); draw(''); overlay.style.display = 'flex'; setTimeout(() => input.focus(), 30); }
  function close() { if (overlay) overlay.style.display = 'none'; }
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'K' || e.key === 'k')) { e.preventDefault(); open(); }
  });
  window.__cmdk = { open, close };
})();

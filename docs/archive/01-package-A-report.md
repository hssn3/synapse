# 01-package-A-report — زیبایی ظاهری (بسته A)

## A-1: مهاجرت ۱۷ دکمه sn-btn-act — انجام شد ۱۷/۱۷
- فایل: `public/js/hassan-hubs.js` — چرا: همه دکمه‌ها inline بودند، نگهداری و تم یکپارچه ناممکن بود.
- نگاشت (onclick دست نخورد):
  - طلایی → `btn btn--primary btn--md` (خطوط 906، 1546، btnSaveDoc 2183)
  - شیشه‌ای/خاکستری → `btn btn--secondary btn--md` یا `btn--ghost btn--md` (910، 1236، 1362، 1549، 2188، 2648)
  - سبز → `btn btn--success btn--md/sm` (1224، 2125 btnLoadTpl، 2642)
  - آبی #2563eb → `btn btn--info btn--md` (1252، 1359)
  - چاپ فیروزه‌ای #0e7490 → `btn btn--info btn--md` (2483)
  - مشاهده کوچک → `btn btn--secondary btn--sm` (1216)
  - btnToggleA4 داینامیک: `class="btn ${currentTab==='a4'?'btn--primary':'btn--ghost'} btn--sm"` — منطق currentTab حفظ شد، استایل inline حذف شد.
- اثبات: `grep sn-btn-act hassan-hubs.js` = صفر. `node --check` سبز. سرو 200.

## A-2: مودال تأیید فارسی BTN.confirmDanger — انجام شد (ساخت از صفر)
- چرا: هیچ buttons-system.js/css و هیچ BTN در پروژه نبود (grep صفر). ۴۹ فراخوانی confirm/prompt بومی نیاز به قرارداد ثابت داشتند.
- فایل تازه: `public/js/buttons-system.js` — چرا: قرارداد `BTN.confirmDanger({title,text,confirmText,cancelText}) => Promise<boolean>` ثابت بماند.
  - خطرناک = قرمز + تأیید دومرحله‌ای (کلیک اول مسلح، دوم در ۵ ثانیه تأیید). ESC/کلیک بیرون = false. فوکوس روی انصراف.
  - `BTN.confirm` تک‌مرحله‌ای، `BTN.alert` یک‌دکمه‌ای، `BTN.setLoading` استاندارد.
- فایل تازه: `public/css/buttons-system.css` — چرا: ۹ نوع (Primary/Secondary/Outline/Ghost/Danger/Success/Warning/Info/Link)، ۴ اندازه (sm 32px, md 44px, lg 56px, xl 64px)، ۶ حالت (Default/Hover/Active/Focus/Disabled/Loading). حداقل ۴۴px برای md به بالا. RTL، focus-visible، اسپینر، بدون inline.
- سیم‌کشی در `public/index.html` (link + script با v=20260926). سرو: css 200، js 200.

## A-3: کارتی‌کردن جدول‌های پهن موبایل — نیمه‌انجام
- انجام‌شده: مدیای موبایل در buttons-system.css (دکمه‌های md/lg تمام‌عرض + btn-row فلکس). ۱۱۴ مدیاکوئری موجود (REPORT).
- مانده: کارت‌سازی خاص BSC/شیفت/rpg-t با تست ۳۹۰×۸۴۴. در فاز پایانی ۱ تکمیل می‌شود.

## A-4: empty state با CTA — مانده
- نمونه آماده در hassan-hubs.js خط 1224 («+ ساخت اولین چک‌لیست») که به btn--success مهاجرت شد.
- مانده: تعمیم به همه جدول‌های RPG (drawList در resource-page.js) + هایلایت فیلد خطادار و فوکوس.

## A-5: RTL پیشرفت CRM + dir=ltr تلفن/کدملی + کنتراست چیپ — مانده
- باید در crm.js بررسی و اعمال شود (فاز بعد).

## A-6: جست‌وجوی منو/پالت فرمان — انجام شد (گسترش)
- فایل: `public/js/palette.js` — چرا: فقط ۲۰ دستور داشت، نیاز ~۵۰ بود.
- اکنون ۵۱ دستور (COMMANDS=51): ۲۰ قبلی + مالی، آموزش، بلایا، ایمنی، خون، لب، تصویربرداری، عفونت، بهداشت حرفه‌ای، تمرکز بیمار، CRM، حضور، دارایی، کالیبراسیون، آموزش پرسنل، رخداد، شکایات، کنترل عفونت، ایمنی بیمار، دارو، پرونده، سوپروایزر روزانه/هفتگی/ماهانه، استوک، تجهیزات، ارزیابی، بازرسی، KPI، گزارش دوره‌ای، آنکال.
- `node --check` سبز. Ctrl+Shift+K (موجود) بدون تغییر.

## چک‌لیست بسته A
- [x] A-1 ۱۷/۱۷
- [x] A-2 قرارداد + فایل + سیم‌کشی
- [ ] A-3 کامل (نیمه)
- [ ] A-4 کامل
- [ ] A-5 کامل
- [x] A-6 ۵۱ آیتم

## تست‌ها
- اجرا شد: smoke ۶/۶، assistant سبز، assistant-response سبز، unit ۴/۴، integration ۵/۵.
- اجرا نشد: E2E مرورگری (نیاز به کروم دستی روی 100.75.7.103:3000).

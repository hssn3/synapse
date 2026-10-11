# 04-buttons-redesign — بازسازی کامل دکمه‌ها (فاز پایانی ۱)

## سیستم نهایی
- فایل `public/css/buttons-system.css`: ۹ نوع (Primary/Secondary/Outline/Ghost/Danger/Success/Warning/Info/Link)، ۴ اندازه (sm 32px/md 44px/lg 56px/xl 64px)، ۶ حالت (Default/Hover/Active/Focus-visible/Disabled/Loading). حداقل ۴۴px برای md به بالا. RTL، وزیرمتن، آیکون+متن تراز، انیمیشن نرم، سایه استاندارد، شعاع یکپارچه (8/10/12/14).
- فایل `public/js/buttons-system.js`: `BTN.confirmDanger` (قرمز + دومرحله‌ای ۵ ثانیه‌ای)، `BTN.confirm`، `BTN.alert`، `BTN.setLoading`. قرارداد ثابت.
- اکشن اصلی (ثبت/ذخیره) برجسته (primary/info/success + سایه). خطرناک قرمز + مودال دومرحله‌ای. disabled خاکستری + غیرکلیک. loading اسپینر. فوکوس keyboard + ARIA (alertdialog/modal).

## مهاجرت
- ۱۷/۱۷ sn-btn-act در hassan-hubs.js → btn--* (onclick دست نخورد). grep صفر.
- RPG حذف → BTN.confirmDanger. empty state CTA «ثبت اولین مورد».
- پالت ۲۰→۵۱. موبایل: دکمه‌های md/lg تمام‌عرض در btn-row فلکس؛ جدول‌های rpg-t/sn-table کارتی با data-l.

## تست
- node --check سبز برای هر ۵ فایل JS. سرو css/js 200. smoke ۶/۶. سایز ۳۹۰×۸۴۴ و دسکتاپ: منطقی (رندر دستگاه واقعی نشد — قید REPORT).

# 00-review-1 — بازبینی اول و نقشه‌برداری (فاز ۰)

تاریخ: 2026-09-25 — سرور: http://100.75.7.103:3000 (200) و http://localhost:3000 (200)
پوشه کار: `C:\Users\NvDAdmin\Desktop\خروجی اصلی\پروژه نهایی آتریا`

## ۰-۱ تا ۰-۳: خوانش
- سرور با `node src/app.js` بالا آمد (0.0.0.0:3000). سیدها کامل اجرا شدند.
- smoke-test: ۶/۶ سبز (healthz, 401 داشبورد ناشناس, login hospital3_admin, dashboard total=520 full=391, accreditation tree 520, public hospitals 1).
- test:assistant: همه ادعاها سبز. test:assistant-response: سبز. test:unit: ۴/۴. test:integration: ۵/۵.
- docs/CONTINUATION.md (۲۱۶ خط) خوانده شد. md/REPORT-MuseSpark-Final.md (۵۹ خط) خوانده شد.
- سه فایل درخواستی پرامت یافت نشد (با glob/grep در کل خروجی اصلی راستی‌آزمایی شد):
  - `docs/QWEN-BASELINE.md` — یافت نشد. docs/ فقط: extracted_knowledge/, ui_verify/, CONTINUATION.md, HANDOVER-COMPLETE.md, nginx.conf, ROADMAP-V2.md
  - `08-md-full-log.md` — یافت نشد (ریشه ۳۳ ورودی، این فایل نیست)
  - `MD_CATALOG.md` — یافت نشد
  - طبق قانون ۲۰: «یافت نشد + نام فایل‌های گشته‌شده» ثبت شد. جایگزین: بخش_001_تا_034 در md/ و HANDOVER-COMPLETE.md و PROGRESS.md.

## ۰-۴: جدول ارزیابی (خلاصه)
| ردیف | بخش | در پروژه | در md | در atria | در hospital | وضعیت | اقدام |
|---|---|---|---|---|---|---|---|
| 1 | Design System دکمه btn--* | نبود (۰ فایل) | — | — | — |缺| ساخته شد: buttons-system.css/js (بسته A) |
| 2 | BTN.confirmDanger | نبود (۰) | — | — | — |缺| ساخته شد (مودال فارسی دومرحله‌ای) |
| 3 | sn-btn-act در hassan-hubs.js | ۱۷ مورد inline | — | — | — | نیاز مهاجرت | انجام شد ۱۷/۱۷ به btn--* |
| 4 | confirm/prompt بومی | ۴۰+۹=۴۹ در public/js | — | — | — | نیاز جایگزینی تدریجی | قرارداد BTN آماده، جایگزینی نقطه‌ای بعدی |
| 5 | RPG.define فرانت | ۱۴ ماژول | — | — | — | سالم | دست نزن |
| 6 | mountCrud بک‌اند | ۱۵ فراخوانی (pharmacy بدون RPG فرانت) | — | — | — | سالم | دست نزن |
| 7 | پالت فرمان ادمین | ۲۰ آیتم | — | — | — | کم | گسترش به ۵۱ آیتم |
| 8 | seed-telegram-docs (۲۶۹ سند TG) | باید بررسی شود | REPORT می‌گوید ۲۶۹ سند | — | — | باز | بسته B-3 |
| 9 | Origin/Referer + JWT blocklist | باید بررسی شود | — | — | — | باز | بسته B-1/B-2 |
| 10 | tracking_code تیکت ERR-… | باید بررسی شود | CONTINUATION می‌گوید ERR-{بیمارستان}-{سال}-{شماره} موجود است | — | — | نیاز تأیید | بسته B-6 |

## ۰-۵: دکمه‌ها
- ۱۷ sn-btn-act همه inline بودند (لیست کامل در گزارش ساب‌ایجنت). هیچ btn--* نبود.
- اقدام: ۱۷/۱۷ به btn--primary/secondary/ghost/success/info مهاجرت شد، onclick دست نخورد. node --check سبز.

## ۰-۶: فرم‌ها
- ۱۴ RPG فرانت + ۱۵ mountCrud بک‌اند. pharmacy بک‌اند دارد ولی فرانت سفارشی (pharmacy.js) است.
- بررسی تک‌تک اعتبارسنجی/چک‌لیست/خط‌مشی در بسته C ادامه دارد.

## ۰-۷: داده‌های md که در پروژه نیستند — باز (بسته C)
- چک‌لیست‌ها، خط‌مشی‌ها، فرایندها، نمودارها، KPI، گزارش‌های دوره‌ای، شیفت/آنکال، گزارش سوپروایزر، استوک، تجهیزات/کالیبراسیون، آموزش، Incident، شکایات، عفونت، ایمنی بیمار، دارو، پرونده — استخراج از بخش_001_تا_034 مانده است.

## ۰-۸: کدهای ناقص/TODO
- جست‌وجوی TODO در src/ و public/js در مرحله بعد (بسته C + فاز پایانی ۲).

## ۰-۹ تا ۰-۱۳
- باگ: seed-error-reports سه ستون never_event_code/sentinel_event/rca_lead — طبق REPORT قبلاً در بیلد تمیز فیکس شده؛ باید backport به پروژه اصلی تأیید شود (بسته B).
- امنیت: رمزهای دمو عمومی‌اند (CONTINUATION). تعویض با کاربر است. Origin/Referer و JWT blocklist باز.
- تاریخ شمسی: tehranTodayStr/toGregorian باید ممیزی شود (بسته B-5 + فاز ۲).
- UX: BSC موبایل اسکرول-only، empty state تک‌خطی، تارگت‌های ۲۶-۳۵px (بسته A-3/A-4 ادامه دارد).
- محتوای خالی/---/N/A: جست‌وجوی کامل مانده است.

## نتیجه
- فاز ۰ نقشه کامل شد. سه فایل مبنا «یافت نشد» صادقانه ثبت شد.
- بسته A شروع شد: A-1 (۱۷/۱۷) و A-2 (قرارداد + فایل) و A-6 (۲۰→۵۱) انجام شد. A-3/A-4/A-5 مانده است.

# 02-package-B-report — تکمیل فنی (بسته B)

## B-1: چک Origin/Referer — انجام شد
- فایل: `src/middleware/security.js` — چرا: دفاع CSRF فقط SameSite بود؛ فرم مخرب کراس‌سایت با کوکی Lax در برخی ناوبری‌های top-level می‌توانست POST بزند.
- پیاده‌سازی: فقط متدهای تغییردهنده (غیر GET/HEAD/OPTIONS) روی /api/. اگر Origin و Referer هر دو غایب → عبور (موبایل/curl/navigations نمی‌شکنند). اگر حاضر و host با میزبان فعلی/BASE_URL/localhost/100.75.7.103/CSRF_TRUSTED_ORIGINS نخواند → 403.
- اثبات: `Origin:https://evil.com + POST /api/auth/logout = 403 مبدأ درخواست مجاز نیست`. `Origin:http://100.75.7.103:3000 = 200`. بدون Origin = عبور (SameSite نمی‌شکند).

## B-2: بلاک‌لیست logout برای JWT — انجام شد
- فایل تازه: `src/services/jwt-blocklist.js` — چرا: logout فقط کوکی را پاک می‌کرد و توکن ربوده‌شده تا ۸ ساعت زنده بود.
- جدول `jwt_blocklist(token_hash PK, exp, created_at)` + ایندکس exp. هش SHA256 (نه خود توکن). TTL از `jwt.decode().exp` وگرنه ۸ ساعت. پاک‌سازی ردیف‌های منقضی حداکثر هر ۵ دقیقه.
- سیم‌کشی: `authRequired/authOptional/superAdminRequired` در `src/middleware/auth.js` (چک + fail-open با لاگ) و `POST /logout` + `POST /super-logout` در `src/routes/auth.js` (ثبت توکن).
- اثبات: login 200 → Bearer /me 200 → logout 200 → Bearer قدیمی /me = 401 «نشست پایان یافته است». `SELECT COUNT(*) FROM jwt_blocklist` = ۲ پس از تست‌ها.
- اصلاح جانبی ضروری: کوکی Secure در production روی http://IP:port باعث می‌شد مرورگر کوکی را پس نفرستد و لاگین عملاً بشکند. اکنون `secure` فقط وقتی true است که درخواست واقعاً https باشد (`req.secure` یا `x-forwarded-proto`, با trust proxy). روی Railway-https همچنان Secure+HttpOnly. sameSite از strict به lax تغییر کرد تا ناوبری top-level + SameSite نشکند (Origin چک لایه دوم است).

## B-3: پورت seed-telegram-docs — ساختاری انجام شد، داده یافت نشد
- جست‌وجو شد: `knowledge-base/` (نیست)، `database/seed-telegram*` (نبود)، `Get-ChildItem -Recurse -Filter *telegram*` در کل خروجی اصلی (صفر)، `atria/` و `hospital-1405-07-01_17-39` و `md/` (سند TG نیست).
- طبق REPORT-MuseSpark-Final باید ۲۶۹ سند TG-001..TG-269 با draft و hospital_id جدا باشند. جعل ۲۶۹ سند ممنوع است.
- فایل تازه: `database/seed-telegram-docs.js` (`module.exports={run,runMigration:run}`) — چرا: قرارداد سید idempotent + سیم‌کشی بوت لازم بود حتی وقتی منبع غایب است.
- رفتار: تضمین جدول/ستون source و ایندکس‌ها، اگر پوشه منبع برگردد ورود idempotent بر اساس doc_code، وگرنه ۰ ردیف + لاگ gap. سیم‌کشی در `src/app.js` کنار seed-documents با try/catch و کامنت «چرا» فارسی. اسکریپت `npm run seed-telegram-docs`.
- اثبات idempotency: دو اجرای پیاپی = هر دو «0 rows» و یکسان.

## B-4: خلأهای 08-md-full-log — یافت نشد
- فایل `08-md-full-log.md` در ریشه پروژه و کل خروجی اصلی نیست (glob **/*full-log* صفر، grep صفر). پس مصوبات/گزارش هفتگی/ماهانه/آنکال از این لاگ قابل استخراج نیست — «یافت نشد». جعل نشد. کاندید جایگزین برای بسته C: `بخش_001_تا_034` در md/.

## B-5: تاریخ/ورودی موبایل در resource-page — انجام شد
- فایل: `public/js/resource-page.js` (`fieldHtml`) — چرا: ۱۴ ماژول از همین موتور فرم می‌سازند؛ اصلاح فقط در crm کافی نبود.
- `t:date` اکنون `{value}` را به `jalaliDateInputHtml` می‌دهد (ویرایش، مقدار قبلی را نشان می‌دهد؛ save از قبل `readJalaliDateInput` بود).
- phone/mobile/tel و national/nid/melli خودکار: `dir=ltr` + `text-align:left` + `inputmode=tel/numeric` + `maxlength` (۱۵/۱۰). پشتیبانی عمومی `f.inputmode/maxlength/min/max/step`.
- نمره‌ها: اگر `f.min/max` نباشد و کلید score/rate/rating-percent باشد، پیش‌فرض `min=0 max=5` برای `t:num`.
- فایل `public/js/crm.js`: `admission_date/discharge_date`: `text→date`؛ `national_id/phone`: maxlength+inputmode؛ `satisfaction_score`: `min:0 max:5 step:0.5`.
- `RPG.remove` از `confirm` بومی به `BTN.confirmDanger` رفت (fallback فقط اگر BTN لود نشده باشد).

## B-6: tracking_code خودکار تیکت‌ها — انجام شد
- قبل: `POST /public/complaint` کد `TCK-PUB-######` سمت سرور می‌ساخت، ولی `POST /crm/tickets` از mountCrud عمومی، tracking_code خالی/تکراری کلاینت را همان‌طور درج می‌کرد.
- پچ در `src/routes/api.js` داخل `mountCrud POST`: اگر `def.table==='crm_tickets'` و tracking_code خالی باشد، `TCK-{4 حرف hospitalId}-{سال میلادی}-{۶ رقم}` با حداکثر ۵ تلاش یکتایی ساخته می‌شود؛ fallback زمانی. هرگز از کلاینت اعتماد نمی‌شود.
- اثبات: `node --check src/routes/api.js` سبز. تست API اختصاصی تیکت در فاز ایجنت (فاز ۵).

## چک‌لیست بسته B
- [x] B-1 Origin/Referer بدون شکست SameSite
- [x] B-2 بلاک‌لیست JWT با TTL
- [x] B-3 ساختاری (داده: یافت نشد + گشته‌شده‌ها ثبت شد)
- [x] B-4 یافت نشد ثبت شد (جعل ممنوع)
- [x] B-5 موتور + اسپک CRM
- [x] B-6 تیکت خودکار سمت سرور

## تست‌ها
- اجرا شد: smoke ۶/۶ پس از هر ری‌استارت، login/me/logout/me چرخه کامل، Bearer blocklist (200→200→401 نشست پایان یافته)، evil-Origin 403.
- اجرا نشد: E2E مرورگری.

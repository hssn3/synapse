# CHANGELOG — تحویل Muse Spark 1.3 (2026-09-25)

# CHANGELOG — رفع باگ‌های RTL و RBAC (2026-10-11) — Step 5 Preview

## منطق (Logic)
- `database/migrate-dedupe-roles.js` (تازه، idempotent): نقش‌های تکراری seed را یکی کرد —
  `roles`: ۸۵ → ۲۸ ردیف (۵۷ کپی اضافی از `head_nurse`/`nurse`/`supervisor_clinical` حذف)،
  انتقال `users.role_id`، `role_tenures.role_id`، `role_permissions.role_id` به کپی کانونی
  و ساخت ایندکس یکتای `roles_code_unique` تا تکرار دوباره ممکن نباشد.
- `src/modules/rbac/policy-engine.js`: `getUserPermissionSet` وقتی نگاشت NIST چیزی تولید نکرد،
  از ستون مرجع `roles.permissions` برمی‌گرداند (پلِ ناسازگاری دو سیستم دسترسی). پیش از این،
  برای نقش‌های عملیاتی آرایهٔ خالی برگردانده می‌شد.
- ورود کاشی‌ای: `platform_settings.require_password` از `1` به `0` تغییر کرد — کلیک روی سمت
  بدون رمز وارد می‌شود (۲۴ کاشی سمت، ۴۷ کاربر فعال).

## فرانت فارسی/RTL
- `public/css/persian-rtl-fix.css` (تازه، آخرین فایل در زنجیرهٔ CSS): حذف `letter-spacing` برای
  متن فارسی (حروف فارسی با فاصلهٔ بین‌حرفی می‌شکنند)، `text-align:start` برای محتوای فارسی،
  `line-height:1.85`، `overflow-wrap:break-word`، و تثبیت فونت Vazirmatn محلی.
- `public/index.html`: حذف وابستگی به `fonts.googleapis.com` (فونت محلی `/fonts/Vazirmatn-Variable.woff2`)،
  افزودن `link rel=icon`/`apple-touch-icon`/`theme-color` و سیم‌کشی `persian-rtl-fix.css`.
- `public/js/rbac-guard.js`: ۴۰۱ پیش از ورود دیگر خطای کنسول نمی‌سازد؛ پاک‌کردن کش دسترسی‌ها.
- `public/js/views/dashboard/catalog-part4.js`: پس از `role-login` و `super-login`،
  `RbacGuard.sync()` صدا زده می‌شود تا گاردریل UI با دسترسی‌های تازه همگام شود.

## PWA/آیکون
- `public/img/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `public/apple-touch-icon.png`
  (از `hospital-logo-sample.svg`) — قبلاً منیفست به فایل‌های ناموجود اشاره می‌کرد (۴۰۴ در کنسول).

## تثبیت
- همهٔ تست‌ها سبز: unit ۴، integration ۵، RBAC ۱۴، form-engine ۶، guardrails ۶، harness ۶/۶،
  assistant-retrieval ۲۱ ادعا، assistant-response ۱۰ پاسخ، smoke ۶ پروب.
- `npm run lint`: ۰ خطا (۱۳,۴۹۸ اخطارِ پیش‌موجودِ استایل).
- نکته: `DEMO_OPEN=1` در `.env` در کد خوانده نمی‌شود (تنظیم بی‌استفاده) — قابل حذف.


## اجرا
- بوت روی `0.0.0.0:3000`؛ تست `http://100.75.7.103:3000` و `http://localhost:3000` هر دو 200.

## بسته A (ظاهر)
- `public/css/buttons-system.css` (تازه): ۹ نوع/۴ اندازه/۶ حالت + مودال + موبایل‌کارت + RTL پیشرفت + چیپ + invalid.
- `public/js/buttons-system.js` (تازه): `BTN.confirmDanger/confirm/alert/setLoading`.
- `public/js/hassan-hubs.js`: ۱۷/۱۷ sn-btn-act → btn--* (onclick دست نخورد).
- `public/js/palette.js`: ۲۰→۵۱ دستور.
- `public/js/resource-page.js`: empty CTA «ثبت اولین مورد» + BTN در حذف + date value + inputmode/maxlength/min-max.
- `public/js/crm.js`: admission/discharge→date؛ phone/national maxlength+inputmode؛ score min/max.
- `public/index.html`: سیم‌کشی css/js با v=20260926.

## بسته B (فنی)
- `src/middleware/security.js`: چک Origin/Referer ملایم (evil 403، بدون هدر عبور).
- `src/services/jwt-blocklist.js` (تازه) + چک در auth middleware + ثبت در logout/super-logout (Bearer قدیمی 401 «نشست پایان یافته»).
- `src/routes/auth.js`: کوکی Secure داینامیک (فقط https واقعی) + sameSite lax.
- `database/seed-telegram-docs.js` (تازه، ۰ ردیف چون منبع نیست) + سیم‌کشی بوت + npm script.
- `src/routes/api.js` (mountCrud): tracking_code خودکار TCK-… برای crm_tickets.

## بسته C (داده md)
- `database/seed-md-package-c.js` (تازه): ۳۷ ردیف اول، دوم ۰ (چک‌لیست نوزادان OH.ED.CL.9703.00، سند DUE، ۳ فرایند، ۳ KPI، ۶ تجهیز برنددار، ۳ دوره آموزشی). بدون نام حقیقی.

## گزارش‌ها
- `00-review-1.md` تا `09-final-review.md` + `scripts/agent-test.js` (۱۱ assert سبز).

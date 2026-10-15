# ARCHITECTURE — معماری سامانه (مخزن new313)

> **دامنهٔ سند:** معماری «واقعیتِ امروز» مخزن، از منابع درون‌مخزن استخراج شده است.
> **منابع اصلی:** `docs/HANDOVER-COMPLETE.md`، `docs/adr/0001…0004`، `package.json`، `src/app.js` و mountها (استخراج مکانیکی)، `docs/PROGRESS.md`، `docs/SECURITY.md`، `public/sw.js`، `docker-compose.yml` و `docs/nginx.conf`.
> **تاریخ تدوین:** ۱۴۰۵/۰۷/۲۵b (2026-10-15) — مطابق مستر پرامت، فاز ۱. هر ادعای بدون منبع، «تأییدنشده» علامت می‌خورد.

## ۱) نمای کلی و دامنه
- نام: «سیناپس» — سامانه یکپارچه نظارت، اعتباربخشی و پایش سلامت.
- دامنه: اعتباربخشی ملی ویرایش پنجم ایران (۵۲۰ سنجه)، به‌همراه ماژول‌های مدیریتی/بالینی/پشتیبانی: اسناد کنترل‌شده، کمیته‌ها، چک‌لیست‌ها، ایمنی بیمار، داروخانه، آزمایشگاه، تصویربرداری، انتقال خون، کنترل عفونت، پرستاری، مالی، منابع انسانی، آموزش و…
- واحد استقرار: چندبیمارستانی (multi-tenant) روی یک نصب؛ تقریباً همهٔ جدول‌ها `hospital_id` دارند.
- زبان/UI: فارسی، RTL کامل؛ بدون build step.

## ۲) استک فنی و الزامات اجرا
| لایه | فناوری | نکته |
|---|---|---|
| بک‌اند | Node.js + Express | `engines.node >= 22`؛ Express ^4.19 |
| دیتابیس | better-sqlite3 (WAL) | ^12.11؛ تک‌فایل `database/hospital.db` |
| امنیت | helmet (CSP)، express-rate-limit (login/tile-login)، jsonwebtoken، bcryptjs | `src/middleware/security.js`، `src/config/app.js` |
| اعتبارسنجی | zod / express-validator | در ماژول‌ها |
| فایل و خروجی | multer، exceljs، sharp | آپلود پیش‌فرض ۵MB (`config.upload.maxFileSize`) |
| دستیار «دانا» | provider قابل‌تنظیم (SDK آنتروپیک + سازگارها) | `src/services/ai-provider.js`، `src/modules/assistant/*` |
| تست | node:test + اسکریپت‌های smoke/eval؛ puppeteer-core/axe-core برای سنجش UI | `tests/*`، `scripts/smoke-test.js` |
| فرانت | Vanilla JS SPA بدون build؛ RTL | `public/js/**`، `public/css/**` |
| CI | GitHub Actions | `.github/workflows/ci.yml` |

## ۳) چیدمان مخزن (خلاصه)
```
src/        app.js (راه‌انداز) · config/ · middleware/ · routes/ · services/ · utils/
            modules/{accreditation, assistant, clinical, collaboration, core,
                     documents, forms, operations, quality, rbac, users}/*.routes.js
public/     index.html · js/core/01…08 (هستهٔ شماره‌دار) · js/views/** · css/** ·
            sw.js · manifest.json · *-public.html (فرم‌های عمومی بی‌ورود)
database/   migrate*.js · seed-*.js (idempotent) · demo-snapshot/ (دموی پاک‌سازی‌شده)
docs/       adr/ + AUDIT · PROGRESS · DECISIONS · REQUIREMENTS · SECURITY · PRIVACY · HANDOVER
tests/      سوئیت‌های node:test · scripts/ ابزارهای QA · .github/workflows/ci.yml
Dockerfile · docker-compose.yml · .env.example · package.json
```

## ۴) معماری بک‌اند
- **راه‌انداز `src/app.js`:** ترتیب بوت = امنیت (helmet/CSP/rate-limit) → استاتیک → احراز هویت → mount مسیرها → زنجیرهٔ مهاجرت‌ها و seedها → کرون‌ها (بکاپ، چک‌پوینت WAL، ریمایندر) → گوش‌دادن روی پورت.
- **mountهای اصلی (از `src/app.js`):** `GET /healthz`، `/api/auth`، `/api/super`، `/api/entry`، `/api/copilot`، `/api/clinical`، `GET /api/server-time`، `/api` (directives + modules + export + notifications)، `GET /api/version`.
- **الگوی ماژولار (ADR-0001):** Modular Monolith با مرزهای دامنه‌ای (Auth، RBAC/ABAC، Form Engine، Workflow، AI Assistant، Reporting/Auditing)؛ هر ماژول با فایل‌های `*.routes.js` و در موارد بزرگ‌تر سرویس/ریپازیتوری جدا.
- **موتورهای مرکزی (طبق AGENTS.md):** `mountCrud` سمت سرور (CRUD از تعریف)؛ `RPG` سمت فرانت (جدول/فرم/چاپ از توصیف ماژول).
- **زنجیرهٔ نگهبان مسیرها:** `authRequired` (JWT در کوکی httpOnly) → `requirePermission`/`requireAnyPermission` (موتور سیاست Fail-Closed — ADR-0002) → `hospitalScope` (جداسازی مستأجر). سوپرادمین با نوع توکن جدا (`type:'super_admin'`).
- **حسابرسی و خطا:** `src/middleware/audit.js` + جدول‌های حسابرسی؛ لاگ خطا در `error_log`.

## ۵) لایهٔ داده
- SQLite تک‌فایل با WAL؛ مسیرها از `src/config/paths.js` با پشتیبانی `DATA_DIR` (والیوم در استقرار).
- مهاجرت‌ها: `database/migrate*.js` (اجرا در بوت)؛ seedها (فایل‌های `seed-*.js`، idempotent) هم در بوت اجرا می‌شوند.
- اسنپ‌شات دمو: `database/demo-snapshot/` (از کلیدهای حساس پاک‌سازی شده است)؛ بازگردانی با `npm run demo-restore`.
- بکاپ: `scripts/backup.js` + کرون بکاپ روزانه (نگهداری ۱ نسخه) + چک‌پوینت WAL؛ بازگردانی: `scripts/restore.js`.
- مقیاس مستند (طبق HANDOVER-COMPLETE): ~۴۶۵ endpoint، ۲۲۱ جدول، ۱۳ مایگریشن، ۵۲۰ سنجه، ۲۸ نقش.

## ۶) معماری فرانت
- SPA بدون build؛ هستهٔ شماره‌دار `public/js/core/01-roles-permissions.js … 08-router-routes.js` (ترتیب بارگذاری = ترتیب بوت).
- viewهای دامنه‌ای زیر `public/js/views/**` (accreditation، clinical، collaboration، dashboard، documents، quality، users).
- پوستهٔ اپ‌مانند (کامیت ۱۴۰۵/۰۷/۲۰): تب‌بار پایین موبایل با دکمهٔ مرکزی «دانا» + سایدبار راست تمام‌قد دسکتاپ — `public/js/app-nav.js` و `public/css/app-nav.css`؛ برای کاربر واردشده هدر/فوتر سراسری حذف و `body.app-shell` فعال می‌شود.
- قواعد سخت فرانت: فارسی به کلاینت فقط با `esc()`؛ مجوز فرانت فقط UX است (امنیت سمت سرور)؛ تاریخ/امروز از سرور با تقویم جلالی (`src/config/jalali.js`).

## ۷) PWA
- `public/manifest.json` + `public/sw.js` (نسخهٔ `hosp-v13`): فقط پوستهٔ استاتیک کش می‌شود؛ API هرگز کش نمی‌شود؛ برای `/` و `index.html` شبکه-اول؛ پیام `CLEAR_SHELL` هنگام logout همهٔ کش‌ها را پاک می‌کند (دستگاه مشترک بیمارستانی).

## ۸) استقرار (بدون دیپلوی فعال — تصمیم مالک)
- `Dockerfile` (node:22-slim) + `docker-compose.yml` (app + nginx + volume) + `docs/nginx.conf` (HTTP→app با هدرهای X-Forwarded؛ بلوک HTTPS کامنت‌شده).
- متغیرهای محیطی (فقط نام‌ها): `PORT`، `NODE_ENV`، `DATA_DIR`، `JWT_SECRET` (≥۳۲ کاراکتر؛ گارد production دارد)، `JWT_EXPIRES_IN`، `GEMINI_API_KEY` (کلید دانا؛ از env با `npm run assistant:key` یا پنل سوپرادمین)، `SUPPORT_EMAIL`.
- سرویس production فعالی وجود ندارد؛ چک‌لیست استقرار: `docs/DEPLOYMENT-CHECKLIST.md`.

## ۹) عملیات، تست و CI
- سلامت: `GET /healthz` (no-store)، `GET /api/version`؛ لاگ winston؛ جدول `error_log`؛ بکاپ و چک‌پوینت WAL زمان‌بندی‌شده در بوت.
- تست‌ها: `npm run test:all` (سوئیت‌های unit/integration/rbac/form/guardrails)، `test:rbac-matrix` (ماتریس per-endpoint)، `smoke-test`، evalهای دانا (retrieval ۲۱ + response ۱۰)، تست‌های privacy و w5.
- CI: روی push به `main` و PR به `main` (+ اجرای دستی): نصب → demo-restore → بوت (ساخت schema با زنجیرهٔ seed) → سوئیت‌های آفلاین → smoke → ماتریس RBAC → evalهای دانا.

## ۱۰) مسائل باز (ارجاع تکمیلی)
- revoke کلید قدیمی Gemini (اقدام مالک)؛ تصمیم provider استقرار؛ LICENSE — `docs/SECURITY.md`/`PROGRESS.md`.
- ناسازگاری دو منبع مجوز (`roles.permissions` JSON ↔ جدول `role_permissions`) — `docs/DECISIONS.md`.
- Card Docking (`activeCardId`) پیاده نشده؛ حذف `unsafe-inline` از CSP در بک‌لاگ — `docs/IMPLEMENTATION_PLAN.md`.
- بازبینی کامل «مسیرهای authRequired بدون permission» — خلاصه و اعداد در `docs/AUDIT.md` (به‌روزرسانی همان روز).

---
*این سند مبنایی است؛ مطابق مستر پرامت، هر تغییر معماری باید هم‌زمان آن را به‌روز کند.*

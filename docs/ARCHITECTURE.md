# معماری سیناپس — سند معماری

> **تدوین:** ۱۴۰۵/۰۷/۲۳ (2026-10-15) · **وضعیت:** جاری
> **منابع:** `docs/HANDOVER-COMPLETE.md` (2026-10-12)، `README.md`، `PROJECT_STRUCTURE.md`، `docs/adr/0001..0004` + بازبینی مستقیم `src/app.js`، `src/modules/index.js`، ساختار پوشه‌ها و `package.json`.
> **قاعده:** هر ادعای بدون منبعِ درون‌مخزنی با «تأییدنشده» علامت خورده است. در تعارض اعداد بین README (قدیمی‌تر) و HANDOVER (جدیدتر)، ملاک HANDOVER و `docs/PROGRESS.md` است.

## ۱) نمای کلی و دامنه
- سامانه جامع مدیریت، کیفیت و اعتباربخشی بیمارستان؛ دامنهٔ اصلی: اعتباربخشی ملی ویرایش پنجم ایران (**۵۲۰ سنجه**، ۱۲۳ مورد ایمنی بیمار) به‌همراه ماژول‌های مدیریتی/بالینی/پشتیبانی: اسناد کنترل‌شده، کمیته‌ها، چک‌لیست‌ها، ایمنی بیمار، داروخانه، آزمایشگاه، تصویربرداری، انتقال خون، عفونت، پرستاری، مالی، منابع انسانی، آموزش… [HANDOVER §۱، README]
- **الگوی معماری:** Modular Monolith با Bounded Contexts — شش کانتکست: Auth، RBAC/ABAC، Form Engine، Workflow، AI Assistant («دانا»)، Reporting & Auditing [ADR-0001].
- **چندمستأجری:** تقریباً همهٔ جدول‌ها `hospital_id` دارند و `hospitalScope` روی مسیرها اعمال می‌شود؛ سوپرادمین پلتفرم توکن جدا (`type:'super_admin'`) و مسیر مخفی `/admin313` [HANDOVER §۲، §۴].
- **کاربر هدف:** بیمارستان‌های ایرانی (چند بیمارستان روی یک نصب).

## ۲) استک و نسخه‌ها
| لایه | فناوری | مأخذ |
|---|---|---|
| بک‌اند | Node.js ≥22 + Express ^4.19.2 | package.json، HANDOVER |
| داده | better-sqlite3 ^12.11.1 (WAL، تک‌فایل) | package.json، HANDOVER |
| احراز هویت | JWT در کوکی httpOnly + bcryptjs | HANDOVER §۲ |
| امنیت | helmet ^7.1، express-rate-limit، express-validator، zod ^4.6 | package.json |
| لاگ | winston ^3.14 | package.json |
| فرانت | Vanilla JS SPA، بدون build step، RTL فارسی | HANDOVER §۲ |
| تست | node:test + اسکریپت‌های smoke/eval | HANDOVER §۲ |
| تکمیلی | exceljs، multer، nodemailer، @anthropic-ai/sdk ^0.122، sharp/canvas/pdfjs | package.json |

## ۳) چیدمان مخزن (مختصر)
```
new313/
├─ src/
│  ├─ app.js              راه‌انداز: زنجیرهٔ بوت، مایگریشن/seed، ثبت مسیرها
│  ├─ modules/            ۱۱ ماژول دامنه‌ای (فهرست در §۴)
│  ├─ routes/             auth, super, entry, api, clinical, copilot, directives, export, notifications
│  ├─ middleware/         auth, audit, security (فهرست کامل تأییدنشده)
│  ├─ services/           assistant*, reminder-cron, backup-cron, wal-checkpoint
│  ├─ config/             database-sqlite, paths (DATA_DIR), jalali
│  └─ db/ · utils/
├─ public/                SPA: js/{core,views,vendor,+ماژول‌ها}، css/، sw.js، manifest.json، فرم‌های عمومی *-public.html
├─ database/              migrate*.js + seed*.js (idempotent، اجرا در بوت)، hospital.db (gitignore)
├─ docs/                  ADRها، HANDOVER-COMPLETE، PROGRESS، DECISIONS، nginx.conf، SECURITY…
├─ tests/ · scripts/      node:test، smoke، ابزارهای کمکی
└─ Dockerfile · docker-compose.yml · package.json · .env.example
```

## ۴) بک‌اند
- **ماژول‌ها:** `src/modules/index.js` یازده ماژول را mount می‌کند: core، accreditation، documents، collaboration، quality، clinical، operations، users، و سه دامنهٔ تخصصی `/rbac`، `/forms`، `/assistant-enterprise` [بازبینی index.js].
- هر دامنه طبق ADR-0001 لایه‌بندی `{routes, controllers, services, repositories, dto}` دارد (نمونهٔ تأییدشده: `src/modules/forms/form.*.js`)؛ سقف ~۵۰۰ خط برای هر فایل هدف‌گذاری شده است [ADR-0001].
- **CRUD از تعریف:** موتور مشترک `src/modules/core/crud-engine.js` [بازبینی فایل]؛ README از «۱۴ ماژول mountCrud» در `src/routes/api.js` نام می‌برد (دورهٔ قدیمی‌تر — تعداد فعلی تأییدنشده). مسیرهای استاندارد CRUD از تعریف جدول/ستون ساخته می‌شوند، نه کد دستی per-entity.
- **زنجیرهٔ middleware هر مسیر دامنه‌ای (مستند):** `authRequired` → `requirePermission` → `hospitalScope` [HANDOVER §۵ قانون ۳]. ترتیب کامل میدلورهای سراسری (helmet/rate-limit/audit/…) در این بازبینی خط‌به‌خط تأییدنشده است.
- **RBAC/ABAC:** کلید مجوز `<domain>:<resource>:<action>`؛ جداول roles/permissions/role_permissions/user_roles/resource_policies؛ میان‌افزار `authorize(resource, action, [abacChecker])` با اصل **Fail-Closed** (عدم احراز = 403 + ثبت لاگ امنیتی)؛ گارد فرانت `can(resource, action)` فقط برای UX — اعتبارسنجی واقعی سمت سرور است [ADR-0002، HANDOVER §۵ قانون ۵].
- **hospital_id:** هر کوئری داده بیمارستانی باید `hospital_id` بگیرد؛ هر مسیر جدید باید هر سه گارد بالا را داشته باشد [HANDOVER §۵].
- **ثبت مسیرهای سراسری در app.js:** `/api/auth`، `/api/super`، `/api/entry`، `/api/copilot`، `/api/clinical`، `directives`، `modules`، `export`، `notifications` [بازبینی app.js].

## ۵) لایهٔ داده
- **SQLite + WAL:** تک‌فایل `database/hospital.db`؛ مسیرها از `src/config/paths.js` با پشتیبانی `DATA_DIR` [HANDOVER §۲]. چک‌پوینت خودکار WAL برای جلوگیری از رشد فایل `-wal` در بوت استارت می‌شود [بازبینی app.js].
- **زنجیرهٔ migration بوت:** `src/app.js` مایگریشن‌ها/seedها را در هر بوت به‌صورت idempotent اجرا می‌کند (۱۳۵ فایل seed؛ خطا با `seedFail` مدیریت می‌شود). نمونهٔ موارد اخیر: `seed-enterprise-management-enrichment`، `migrate-document-revisions`، `seed-indicator-slides`، `migrate-313-audit`، `migrate-form-submission-client-token` (گارد ارسال تکراری فرم) [بازبینی app.js + HANDOVER §۲].
- **demo-snapshot:** اسکریپت‌های `demo-snapshot` / `demo-restore` برای بازگردانی دموی تازه پس از clone؛ در کامیت `d07d5b0` کلید API دستیار از اسنپ‌شات دمو پاک‌سازی شد (ممیزی امنیتی) [HANDOVER §۳].
- **بکاپ:** سرویس `backup-cron` بکاپ روزانهٔ خودکار در `database/backups/auto-YYYY-MM-DD.db` (تعداد نگهداری با نام‌متغیر `AUTO_BACKUP_KEEP_COUNT`)؛ دستی: `npm run backup-db`؛ اسکریپت `backup:gdrive` نیز وجود دارد [بازبینی app.js + package.json].
- حجم داده (دورهٔ README): ۳٬۳۴۳ سند کنترل‌شده، ۲۲۲ KPI، ۱٬۹۷۳ شکایت — اعداد جاری را از PROGRESS بگیرید.

## ۶) فرانت
- SPA وانیلا-جی‌اس بدون build step؛ `public/js/` (۸۹ فایل در زمان HANDOVER) شامل زیرپوشه‌های `core/`، `views/`، `vendor/` و ماژول‌های دامنه‌ای؛ `public/css/` (۲۲ فایل) [HANDOVER §۲ + بازبینی پوشه].
- **موتور فرم:** کلاینت `enterprise-form-engine.js` (رندر schema-محور، منطق شرطی، مجوز سطح فیلد) + ماژول سرور `forms` طبق ADR-0003؛ نسخه‌بندی تغییرناپذیر: `forms`/`form_versions`/`form_submissions` با `form_version_id`؛ گردش کار `draft→submitted→under_review→approved→archived`.
- **جدول‌ها:** مؤلفه‌های جدول داخل لایهٔ UI فرانت‌اند؛ بهینه‌سازی‌های چیدمان در تاریخچهٔ کامیت‌ها. نام فایل اختصاصی «موتور جدول» در این بازبینی تأییدنشده است.
- **app-shell:** تب‌بار پایین موبایل + سایدبار راست دسکتاپ + شیت منو؛ `public/js/app-nav.js` + `public/css/app-nav.css` (کامیت `49c78fe`). چیدمان کارت‌ها: فقط Horizontal RTL Flow (Zero Vertical Stacking) [HANDOVER §۲، §۵ قانون ۷].
- **گارد فرانت:** `rbac-guard.js` (متد `can`) طبق ADR-0002.

## ۷) PWA
- `public/sw.js` + `public/manifest.json`؛ Service Worker **فقط پوسته را کش می‌کند — API هرگز کش نمی‌شود** [HANDOVER §۲].
- آیکون‌ها: `apple-touch-icon.png` و دارایی‌های `public/img/`. جزئیات استراتژی نسخه‌گذاری کش در این بازبینی تأییدنشده است.

## ۸) استقرار
- **Docker:** `Dockerfile` (node:22-slim + وابستگی‌های native) و `docker-compose.yml` (app + nginx + volume)؛ کانفیگ nginx در `docs/nginx.conf` [HANDOVER §۶].
- **متغیرهای محیطی (فقط نام‌ها، بدون مقدار):** `DATA_DIR`، `JWT_SECRET`، `NODE_ENV`، `PORT`، `GEMINI_API_KEY`، `SUPPORT_EMAIL`، `SUPPORT_PHONE`، `AUTO_BACKUP_KEEP_COUNT`، `MD_DIR`، `SMOKE_BASE_URL`؛ مرجع: `.env.example`.
- نکات: `DATA_DIR` روی والیوم ماندگار؛ placeholder `JWT_SECRET` عمداً سرور را متوقف می‌کند؛ پشت HTTPS واقعی `NODE_ENV=production` (بدون گواهی، upgrade-insecure-requests خاموش می‌ماند) [HANDOVER §۶].
- کلید دستیار: از env با `npm run assistant:key` یا پنل سوپرادمین [HANDOVER §۶].
- **وضعیت:** production فعال ندارد (سرویس Railway قبلی از کار افتاده؛ تصمیم کارفرما لازم است)؛ پیش‌نمایش با Cloudflare Quick Tunnel (موقتی، آدرس هر اجرا عوض می‌شود) [HANDOVER §۳، §۶].

## ۹) عملیات
- **`/healthz`:** بدون احراز هویت (پیش از میدلور auth ثبت شده)؛ کوئری سبک `SELECT 1`؛ پاسخ ok با uptime/version/env یا 503 در قطعی دیتابیس — مناسب HEALTHCHECK و مونیتورینگ [بازبینی app.js].
- **`/api/version`** (نسخه پکیج، نسخه Node، env) و **`/api/server-time`** (ساعت مرجع تهران/جلالی برای تصحیح انحراف ساعت مرورگر — بدون ورود) [بازبینی app.js].
- **لاگ‌ها:** winston در وابستگی‌ها؛ لاگ امنیتی برای ۴۰۳های مجوز [ADR-0002] و Audit Log کامل گفتگو/فعالیت‌های «دانا» [ADR-0004]؛ میدلور `audit` در `src/middleware`. پیکربندی متمرکز لاگ‌ها در این بازبینی تأییدنشده است.
- **زمان‌بندها:** `reminder-cron` فقط برای کانال‌های خروجی (ایمیل/پیامک؛ بدون پیکربندی خودش اجرا نمی‌شود) و اقلام کارتابل مستقل محاسبه می‌شوند؛ `backup-cron` و `wal-checkpoint` در بوت [بازبینی app.js].
- **درگاه‌های عمومی:** `/public/{slug}/:hospitalId` (services، fmea، error-report، complaint، satisfaction) و `/api/site-contact` (اطلاعات تماس از env؛ در صورت نبود، فرانت بخش تماس را پنهان می‌کند) [بازبینی app.js].
- قاعدهٔ محیطی: متن فارسی هرگز از argv پاس نمی‌شود (جلوگیری از خرابی کدپیج ویندوز) [HANDOVER §۲].

## ۱۰) مسائل باز و ارجاعات
- **منابع زندهٔ وضعیت/تصمیم‌ها:** `docs/PROGRESS.md` و `docs/DECISIONS.md` — این سند جای آن‌ها را نمی‌گیرد.
- بدهی‌های شناخته‌شده (HANDOVER §۷): revoke کلید قدیمی Gemini توسط مالک؛ تصمیم آرشیو `scripts/split_backend_monolith.js`؛ `scripts/inspect_upload.js` مال ایجنت دیگر است — دست‌نزنید؛ تصمیم دربارهٔ `.freebuff/project-id` و LICENSE؛ اندازه‌گیری عددی Lighthouse/دسترس‌پذیری انجام نشده؛ تست صریح IDOR/privilege-escalation (فراتر از ماتریس policy-engine) ارزش افزودن دارد.
- استقرار production تأییدنشده/فاقد سرویس فعال — نیازمند تصمیم کارفرما [HANDOVER §۳].
- اختلاف اعداد README قدیمی (۴۳۶ endpoint / ۲۰۸ جدول / ۱۹ نقش) با HANDOVER جدید (۴۶۵ / ۲۲۱) — ملاک، HANDOVER و PROGRESS است. `PROJECT_STRUCTURE.md` نیز در بخش‌هایی قدیمی است (مسیرهای پیشین و اعداد دورهٔ قبل).

---
*پایان سند — تدوین‌شده در ممیزی Master Prompt (زیرایجنت ۰۳)؛ این فایل کامیت نشده است.*

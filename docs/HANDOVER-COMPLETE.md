# HANDOVER-COMPLETE — سند تحویل و ادامه‌ی کار

> **آخرین به‌روزرسانی:** 2026-10-12 (۱۴۰۵/۰۷/۲۰)
> این سند جایگزین ارجاعات قدیمی AGENTS.md به اسنادِ در‌مخزن‌نبوده است
> (`HANDOVER-COMPLETE.md` و `ROADMAP-V2.md` و `CONTINUATION.md` هیچ‌وقت به این
> مخزن نیامدند — ممیزی ۱۴۰۵/۰۷/۲۰). هرچه لازم است بدانید اینجاست.

## ۱) پروژه در یک نگاه

- **نام:** سامانه جامع مدیریت، کیفیت و اعتباربخشی بیمارستان (پروژه ۳۱۳ / «آتریا»).
- **دامنه:** اعتباربخشی ملی ویرایش پنجم ایران (۵۲۰ سنجه)، به‌همراه ماژول‌های
  مدیریتی/بالینی/پشتیبانی: اسناد کنترل‌شده، کمیته‌ها، چک‌لیست‌ها، ایمنی بیمار،
  داروخانه، آزمایشگاه، تصویربرداری، انتقال خون، عفونت، پرستاری، مالی، منابع انسانی، آموزش…
- **کاربر هدف:** بیمارستان‌های ایرانی (چندمستأجری روی یک نصب).

## ۲) معماری (واقعیتِ امروز مخزن)

| لایه | فناوری | محل |
|---|---|---|
| بک‌اند | Node.js 22 + Express 4 | `src/app.js` (راه‌انداز) → `src/modules/*` (۱۱ ماژول دامنه‌ای) + `src/routes/*` |
| دیتابیس | better-sqlite3 (WAL، تک‌فایل `database/hospital.db`) | `src/config/database-sqlite.js`؛ مسیرها از `src/config/paths.js` (پشتیبانی DATA_DIR) |
| احراز هویت | JWT در کوکی httpOnly + bcrypt | `src/middleware/auth.js`, `src/routes/auth.js` |
| مجوزها | RBAC/ABAC با موتور سیاست Fail-Closed | `src/modules/rbac/policy-engine.js`, `authorize.middleware.js` |
| فرانت | Vanilla JS SPA بدون build step، RTL فارسی | `public/js/**` (۸۹ فایل)، `public/css/**` (۲۲ فایل) |
| ناوبری اپ‌مانند | تب‌بار پایین موبایل + سایدبار راست دسکتاپ + شیت منو | `public/js/app-nav.js`, `public/css/app-nav.css` (۱۴۰۵/۰۷/۲۰) |
| دستیار «دانا» | سرویس LLM قابل‌تنظیم (provider/model/key در DB هر بیمارستان) + بازیابی دانش داخلی | `src/services/assistant*.js`, `src/modules/assistant/*` |
| PWA | Service Worker فقط برای پوسته (API هرگز کش نمی‌شود) | `public/sw.js`, `public/manifest.json` |
| تست‌ها | node:test + اسکریپت‌های smoke/eval | `tests/*`, `scripts/smoke-test.js` |

نکات کلیدی:
- ~۴۶۵ endpoint؛ ۲۲۱ جدول؛ ۱۳ مایگریشن در `database/migrate*.js`؛ ۱۳۵ فایل seed
  در `database/seed*.js` (همه idempotent و در بوت اجرا می‌شوند — `src/app.js`)
- چندمستأجری: تقریباً همه‌ی جدول‌ها `hospital_id` دارند و `hospitalScope` روی
  مسیرها اعمال می‌شود؛ سوپرادمین در نوع توکن جدا (`type:'super_admin'`).
- فارسی هرگز از argv پاس نمی‌شود (کدپیج ویندوز نابودش می‌کند)؛ متن‌ها از فایل.

## ۳) وضعیت فعلی (با شواهد)

- آخرین کامیت‌ها روی `main` (مخزن `hssn3/new313`):
  - `d07d5b0` — security: scrub assistant API key from demo snapshot + fix `assistant:key` + harden JWT guard + `docs/nginx.conf`
  - `49c78fe` — app-shell redesign (تب‌بار پایین/سایدبار راست/حذف هدر-فوتر)
- تست‌های سبز (اجرای واقعی ۱۴۰۵/۰۷/۲۰): unit 4/4 · integration 5/5 · rbac 14/14 ·
  forms 6/6 · guardrails 6/6 · smoke ۶/۶ · assistant-retrieval «همه سبز» · assistant-response «همه سبز»
- QA نقش‌ها: ۲۴/۲۴ نقش فعال با ورود واقعی + گشت صفحات (۶ صفحه/نقش) — صفر خطای JS/سرریز
- پیش‌نمایش: Cloudflare Quick Tunnel (موقتی) — آدرس با هر اجرا عوض می‌شود.
  اجرای دوباره: `cd .openclaw/tmp && ./cloudflared tunnel --url http://127.0.0.1:3311`
- **دیپلوی production ندارد** (سرویس قبلی Railway از کار افتاده؛ تصمیم کارفرما لازم است).

## ۴) دستورات کاری

```bash
npm install                # نصب (Node 22)
PORT=3311 npm start        # اجرای سرور (dev)
npm run smoke-test         # ۶ چک سلامت (سرور باید بالا باشد؛ SMOKE_BASE_URL قابل تغییر)
npm run test:assistant        # ۲۱ ادعای بازیابی دانا — آفلاین
npm run test:assistant-response # ۱۰ ادعای مسیر پاسخ دانا — آفلاین
npm test                   # تست واحد + یکپارچه
npm run lint               # eslint (تنها warning؛ خطا صفر)
npm run demo-restore       # بازگردانی اسنپ‌شات دمو (پس از clone تازه)
npm run assistant:key      # پرکردن کلید دانا از env  (تعمیر شد ۱۴۰۵/۰۷/۲۰)
npm run backup-db          # بکاپ دیتابیس + آپلودها
```

ورود دمو: کاشی‌های سمت روی صفحه‌ی ورود (بدون رمز، پیش‌فرض دمو) یا
`hospital3_admin / Hospital3@Admin2026`. سوپرادمین: مسیر مخفی `/admin313`.

## ۵) قواعد تله‌دار (خونده شود پیش از تغییر)

1. **`seed-management-roles.js` مجوز نقش‌های مدیریتی را merge می‌کند، نه overwrite.**
   حذف یک مجوز = حذف از همین فایل + پاک‌سازی دستی ردیف قدیمی.
2. هر seed باید **idempotent** باشد؛ روی بوت هر بار اجرا می‌شوند.
3. هر کوئری داده بیمارستانی `hospital_id` می‌گیرد؛ هر مسیر تازه:
   `authRequired` + `requirePermission` + `hospitalScope`.
4. فارسی به کلاینت فقط با `esc()` — هیچ درون‌ریزی خام در HTML.
5. محاسبه/اعتبارسنجی سمت سرور؛ مجوز فرانت فقط برای تجربه است.
6. تاریخ‌ها از سرور؛ تقویم جلالی از `src/config/jalali.js`.
7. چیدمان کارت‌ها/زیرشاخه‌ها: **فقط Horizontal RTL Flow** (Zero Vertical Stacking).
8. کامنت‌های کد «چرا»محورند — قبل از تغییر، کامنت همان ناحیه را بخوانید.
9. `require_password` پیش‌فرض نصب تازه خاموش است (دمو) — برای واقعی روشن کنید.
10. **هیچ رازی در مخزن** (کلید API، توکن، .env) — ممیزی ۱۴۰۵/۰۷/۲۰ این را تصویب کرد.

## ۶) استقرار (Deployment)

- **فعلی:** فقط اجرای محلی + تونل موقتی برای پیش‌نمایش. سرویس production سابق
  (Railway) دیگر زنده نیست.
- **Docker:** `Dockerfile` (node:22-slim + native deps) و `docker-compose.yml`
  (app + nginx + volume). فایل `docs/nginx.conf` (که گمشده بود) اضافه شد.
- **نکات مهم استقرار:**
  - `DATA_DIR` را روی والیوم ماندگار ست کنید (وگرنه هر دیپلوی داده را می‌برد).
  - `JWT_SECRET` قوی (≥۳۲ کاراکتر) — پلیس‌هولدر dاکر حالا عمداً سرور را متوقف می‌کند.
  - پشت HTTPS واقعی، `NODE_ENV=production`. بدون گواهی، upgrade-insecure-requests خاموش می‌ماند.
  - کلید دستیار: از env (`GEMINI_API_KEY`) با `npm run assistant:key` یا از پنل سوپرادمین.

## ۷) بدهی‌های شناخته‌شده / کارهای باز

- [ ] **rotation کلید Gemini حذف‌شده از تاریخچه** — مالک باید کلید قدیمی را در
  کنسول Google revoke کند (خارج از توان این محیط؛ فقط گزارش شده).
- [ ] `scripts/split_backend_monolith.js` — ابزار یک‌بارمصرف با requireهای شکسته؛
  تصمیم: آرشیو (بدون تأثیر روی اجرا).
- [ ] `scripts/inspect_upload.js` مال ایجنت دیگری است (untracked سابقاً) — دست‌نزنید.
- [ ] `.freebuff/project-id` و LICENSE — تصمیم کارفرما.
- [ ] Lighthouse/accessibility عددی در محیط فعلی **اندازه‌گیری نشده** (ابزار در دسترس نبود).
- [ ] تست‌های صریح IDOR/privilege-escalation به‌صورت اسکریپت جدا (matrix فعلی
  روی policy-engine است؛ تست HTTP کامل‌تر ارزش افزودن دارد).

## ۸) تاریخچه‌ی این سند

- ۱۴۰۵/۰۷/۲۰: نسخه اول — نوشته‌شده در ممیزی جامع (Master Prompt) بعد از تعمیرات
  امنیتی (`d07d5b0`). ارجاعات قدیمی AGENTS.md به اسناد ناموجود با این سند پوشش داده شد.

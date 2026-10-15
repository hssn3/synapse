# PROGRESS — Hospital Platform Hardening & Completion

> آخرین به‌روزرسانی: 2026-10-15 (نشست ۱۴۰۵/۰۷/۲۵ — آغاز کار روی همین ماشین ویندوزی، ادامه‌ی محلی)
> این فایل منبعِ حقیقتِ پیشرفت است. در شروع هر نشست: PROGRESS.md را بخوان، سپس `git status` و `git log` را با hash انتهای این فایل مقایسه کن.
> HEAD محلی به‌عنوان مبنای — از روی حافظه تایپ نشود، همیشه از `git rev-parse HEAD` کپی شود.

## Mode
- **MODE A — full agent** (فایل + ترمینال + Git + GitHub + تست). تأییدشده با اجرای واقعی در همین محیط.
- ماشین توسعه: کانتینر Linux؛ Node v22.23.1؛ npm 10.8.2. سرور تست: `PORT=3311 node src/app.js` روی 127.0.0.1:3311.
- پیش‌نمایش: Cloudflare Quick Tunnel → `https://carb-jane-pitch-dans.trycloudflare.com` (موقتی؛ در صورت مرگ: `./cloudflared tunnel --url http://127.0.0.1:3311` از پوشه `.openclaw/tmp`).

## Baseline (قبل از این نشست)
- git HEAD: `49c78fe` — App-shell redesign (پوش‌شده روی origin/main)
- تست‌های سبز قبل از تغییرات این نشست:
  - unit 4/4 · integration 5/5 · rbac 14/14 · forms 6/6 · guardrails 6/6
  - smoke 6/6 · assistant-retrieval «همهی ادعاها سبز» · assistant-response «همهی پاسخها سبز»
- هیچ CI در ریپو نیست (`.github` وجود ندارد). هیچ CLI دیپلوی (gh/railway/docker) در محیط نیست.

## این نشست — کارهای انجام‌شده

### امنیت (Priority 1)
- [x] **پاک‌سازی کلید API از اسنپ‌شات دموی کامیت‌شده** (`database/demo-snapshot/hospital-demo.db.gz`):
  - کلید Gemini (`AIza…`) در جدول `assistant_hospital_settings.api_key` بود و ریپو عمومی است.
  - اسنپ‌شات بازسازی و ستون NULL شد؛ بازبینی بایتی: صفر یافته `AIza`.
  - manifest به‌روز شد: `scrubbedColumns` شامل `assistant_hospital_settings.api_key`.
- [x] **اصلاح ریشه‌ای `scripts/demo-snapshot.js`**: جدول+ستون کلید به `SECRET_COLUMNS` اضافه شد تا اسنپ‌شات بعدی هم بدون کلید ساخته شود.
- [x] **رفع `npm run assistant:key`** (MODULE_NOT_FOUND روی `../agents/config`): تابع `maskKey` مطابق الگوی مستند پروژه inline شد؛ اجرای اسکریپت تست و تأیید شد (no-op با پیام روشن چون کلید env نیست).
- [x] **محافظ JWT production**: پلیس‌هولدر `change_this_to_a_random_long_string_at_least_32_chars` به `WEAK_JWT_SECRETS` اضافه شد؛ تست: با همان پلیس‌هولدر سرور عمداً بالا نمی‌آید؛ با راز قوی بالا می‌آید.
- [x] **ساخت `docs/nginx.conf`** (گمشده بود و docker-compose شکسته بود) — HTTP→app با هدرهای X-Forwarded؛ بلوک HTTPS کامنت‌شده.
- [x] **به‌روزرسانی کامنت docker-compose.yml** درباره رفتار محافظ JWT.

### تا اینجا تست‌های اجراشده بعد از تغییرات
- `npm run assistant:key` → خروجی سالمه (no-op تمیز).
- JWT guard → دو تست دستی بالا (ضعیف رد شد؛ قوی قبول شد).
- integrity اسنپ‌شات جدید → باز شد؛ 1 بیمارستان / 62 کاربر / 520 سنجه؛ کلید صفر.

## کارهای انجام‌شده — دسته دوم (کامیت `c80c018`)
- [x] سند `docs/HANDOVER-COMPLETE.md` جدید از وضعیت واقعی مخزن + `docs/AUDIT.md` + `docs/DECISIONS.md` + `docs/REQUIREMENTS.md`.
- [x] AGENTS.md: ارجاعات اسناد گمشده اصلاح شد؛ اعداد مقیاس به‌روز شد؛ بخش «وضعیت جاری» بازنویسی شد؛ سیاست push مطابق مجوز جدید.
- [x] `public/sw.js` نسخه v13 + پیام `CLEAR_SHELL`: کش پوسته هنگام logout پاک می‌شود (دستگاه مشترک بیمارستانی).
- [x] `scripts/split_backend_monolith.js` → `scripts/archive/` + README توضیحی (ابزار شکسته/بی‌مصرف).
- [x] `.freebuff/` از مخزن حذف و به `.gitignore` اضافه شد.
- [x] تست logout در مرورگر واقعی برای ۳ نقش: `logout-ok`، تب‌بار و app-shell هر دو پاک می‌شوند.

## کارهای انجام‌شده — دسته سوم (کامیت‌های `758b220`, `ad1b7a0`, `90bee32`)
- [x] **ماتریس per-endpoint RBAC بدون UI** (`tests/rbac-endpoint-matrix.test.js`): ۱۵ تست —
  anonymous 401، deny نقش‌ها (users/audit/export)، scope دریافت‌کنندگان ابلاغیه،
  privilege escalation، سنجه‌نویسی nurse ممنوع، کوکی جعلی، جداسازی /api/super/*،
  **لغو mid-session** (غیرفعال‌سازی → 401 در درخواست بعدی)، سلف‌سرویس پروفایل، sweep نقش‌ها.
  → در harness (سوئیت ۷) و `package.json` (`test:rbac-matrix`، `test:all`) سیم‌کشی شد.
- [x] **رفع آسیب‌پذیری uuid**: override به `^11.1.1` (exceljs فقط v4 مصرف می‌کند) →
  `npm audit` حالا **۰ آسیب‌پذیری**؛ تست واقعی: xlsx export از دو endpoint 200 + PK header.
- [x] **docs/SECURITY.md**: جدول کنترل‌های فنی اجراشده + تصمیم‌های سازمانی لازم برای کارفرما
  (rotation کلید، retention، بکاپ، ناشناسی گزارش‌دهنده).
- [x] **docs/DEPLOYMENT-CHECKLIST.md**: چک‌لیست کامل استقرار/بازگردانی برای provider آینده.

## کارهای انجام‌شده — دسته چهارم (کامیت‌های `7306257` → `e55d1d2`)
- [x] **CI راه افتاد (GitHub Actions):** `.github/workflows/ci.yml` — روی هر push/PR:
  نصب → demo-restore → بوت سرور (زنجیره seed) → ۵ سوئیت آفلاین → smoke → ماتریس RBAC → evalهای دانا.
  اجرای اول با باگ ترتیب شکست خورد (`no such table: forms`)؛ ریشه: اسنپ‌شات دمو جداول جدیدتر را
  ندارد و فقط بوت سرور می‌سازد → ترتیب اصلاح شد (بوت قبل از تست‌ها) → **اجرای دوم: تمام مراحل سبز**
  (Run ID 38239943115، commit `e55d1d2`).

## کارهای انجام‌شده — دسته پنجم (نشست ۱۴۰۵/۰۷/۲۳ — ماشین ویندوزی)
- [x] **تأیید بیسلاین روی ماشین ویندوزی جدید** (قبلاً فقط لینوکس/CI): demo-restore → بوت :3311 →
  ۵ سوئیت ۳۵/۳۵ · smoke ۶/۶ · endpoint-matrix ۱۵/۱۵ · دانا ۲۱+۱۰ ادعا همه سبز ·
  lint 0 error (13498 warning ازپیش‌موجود — استایل) · `npm audit --omit=dev` 0.
- [x] **اولین سنجش عددی دسترس‌پذیری با axe-core 4.x (WCAG 2.x A/AA)** — تا حالا «not measured» بود:
  - قبل از فیکس: داشبورد ۱۲۸۰=۲۷ pass/۲ violation · ۷۶۸=۲۵/۱ · ۳۶۰=۲۵/۱ ·
    error-report=۱۳/۲ قانون · fmea=۱۲/۲ · complaint=۱۳/۲.
- [x] **رفع تمام نقض‌های اندازه‌گیری‌شده → صفر** (روش: axe تزریقی در Chromium از node_modules):
  - `select-name` (critical): اتصال for/id در error-report (۳ سلکت) و complaint (۱)؛
    `aria-label="سال ارزشیابی"` روی کمبوی سال در `02-visual-theme.js`.
  - `label` ×۱۰ (critical) در fmea: اتصال for/id همه ورودی/متن‌ها.
  - `image-alt` (critical): `img.alt = نام مرکز` در `public-letterhead.js` — روی هر ۵ فرم عمومی اثر می‌گذارد.
  - `scrollable-region-focusable` (serious): `snav` در `08-router-routes.js` → `role="region"` + `aria-label` + `tabindex="0"`.
  - سنجه مجدد: داشبورد ۱۲۸۰=۲۸/۰ · ۳۶۰=۲۶/۰ · error-report=۱۶/۰ · fmea=۱۵/۰ · complaint=۱۶/۰.
  - رگرسیون بعد از فیکس: ۵ سوئیت ۳۵/۳۵ + smoke ۶/۶ سبز.
- [x] نکته ابزار: دکمه‌های لندینگ با انیمیشن بی‌پایان (`shine anim`) کلیک خودکار Playwright را
  ناپایدار می‌کنند (timeout روی actionability) — در تست خودکار UI باید force/evaluate به کار رود.
  نقض a11y نیست: `prefers-reduced-motion` در `motion.css:504` همه انیمیشن‌ها را خاموش می‌کند.

## کارهای بعدی (به ترتیب)
1. [ ] **revoke کلید Gemini توسط مالک** (اقدام انسانی خارج از محیط — بالاترین اولویت).
2. [ ] تصمیم دیپلوی production (provider) — چک‌لیست آماده در `docs/DEPLOYMENT-CHECKLIST.md`.
3. [ ] LICENSE — نیاز به تصمیم کارفرما (سند SECURITY توضیح داده).
4. [x] a11y عددی با axe-core اندازه‌گیری و صفر شد (۱۴۰۵/۰۷/۲۳) — Lighthouse/performance هنوز «not measured» (ابزار در محیط نیست).
5. [ ] (اختیاری/بلندمدت) حذف تدریجی `unsafe-inline` از CSP (مهاجرت onclick → addEventListener).

## آخرین وضعیت تأییدشده (1405/07/23)
- روی ماشین ویندوزی (Node v22.23.3): ۵ سوئیت ۳۵/۳۵ · smoke 6/6 · endpoint-matrix 15/15 ·
  دانا retrieval 21 + response 10 همه سبز · `npm audit --omit=dev` 0 · lint 0 error.
- **axe-core (WCAG 2.x A/AA): صفر نقض** در داشبورد (۱۲۸۰/۳۶۰) و سه فرم عمومی
  (error-report / fmea / complaint) — اندازه‌گیری قبل/بعد در همین فایل.
- HEAD پس از کامیت فیکس‌های a11y این نشست: `22fe02e` (کپی از `git rev-parse HEAD`؛ کامیت docs بعد از همین می‌آید).
- **پوش نشده** (۱۴۰۵/۰۷/۲۳): `22fe02e` (a11y) و `15991ab` (docs) — `git push` با خطای
  «could not read Username for https://github.com» شکست خورد؛ روی این ماشین اعتبارنامه‌ی گیت‌هاب
  تنظیم نشده. راه امن برای مالک: یک‌بارinteractive پوش با Git Credential Manager یا `gh auth login`.
  توکن هرگز در چت پاس نشود.

---

# نشست ۱۴۰۵/۰۷/۲۵ — حسابرسی موازی + موج رفع امنیتی (در جریان)

## وضعیت ورودی نشست (تأییدشده با اجرا)
- HEAD ورودی: `3a2d287` روی `main`؛ **۳ کامیت پوش‌نشده** روی `origin/main` (‏`22fe02e`, `15991ab`, `3a2d287`). درخت کاری تمیز (بدون تغییر کامیت‌نشده).
- تصمیم‌های مالک امروز: (۱) کار محلی در همین پوشه، **بدون push** تا اجاره‌ی جداگانه (۲) استقرار: فقط آماده‌سازی و اعتبارسنجی، بدون دیپلوی (۳) داده: فقط ساختگی/دمو در همه‌ی محیط‌ها.
- نکته‌ی محیطی مهم: `node` روی PATH = v24.20.0 (نسخه‌ی همراه ابزار میزبان) و درایور `better-sqlite3` برای ABI 127 (Node 22) ساخته شده → اجرای پروژه با مسیر کامل `C:\Program Files\nodejs\node.exe` (v22.23.3). همه‌ی دستورهای این نشست با Node ۲۲ زده شده‌اند.

## بیس‌لاین اجراشده (شاهد دست‌اول من)
- سرور: `PORT=3311` بالا آمد (development) — `/healthz` ✅، smoke ۶/۶ ✅
- `test:all` → **۳۵/۳۵** (unit, integration, rbac-matrix, form-engine, assistant-guardrails)
- `test:rbac-matrix` (ماتریس per-endpoint) → **۱۵/۱۵**
- دانا: retrieval **۲۱/۲۱** · response **۱۰/۱۰** (بدون کلید provider)
- `npm audit --omit=dev` → **۰ آسیب‌پذیری**
- رندر واقعی با Edge headless: ورود `hospital3_admin` موفق، داشبورد `#acc` رندر شد، `body.app-shell` فعال، **صفر خطای صفحه**؛ در ویوپورت ۳۹۰px سرریز افقی صفر (`docW=winW=390`) به‌جز دو عنصر تزئینی پس‌زمینه.
- تنها خطای کنسول: `401 GET /api/rbac/my-permissions` — با آزمون تفکیکی ثابت شد **فقط در حالت بی‌نشست** رخ می‌دهد (پروب fail-closed پیش از ورود) و در حالت نشست‌دار صفر خطا است.

## حسابرسی فاز ۱ (موج ۵ زیرعامل موازی)
- یافته‌ها با ستون «تأیید» (✅ خودم / 🟡 گزارش زیرعامل) در `docs/AUDIT.md` بخش ۸ ثبت شد.
- گزارش‌های خام روی دیسک: `audit/02-db.md`، `audit/03-frontend.md`، `audit/04-tests-devops.md`.
- بالاترین ریسک‌های تأییدشده‌ی خودم: (۱) XSS ذخیره‌شده در `public/js/views/quality/indicator-slides-view.js:1079` (تنها جای فایل بدون `esc()`؛ نویسنده: `src/modules/quality/indicator-slides.routes.js:134`) (۲) اسکیپر ناقص `public/js/shift-schedule.js:22` (بدون اسکیپ `'`) با تزریق در `onclick` خط ۱۳۱ (۳) افشای فهرست کاربران فعال (`username` + `full_name`) بدون احراز هویت در `GET /api/entry/hospital/:id/roles` که با `require_password` خاموش پیش‌فرض، زنجیره‌ی «شمارش کاربران → ورود بی‌رمز» می‌سازد.

## در جریان (موج اجرا W1–W3 — سه زیرعامل موازی، بدون کامیت از سوی آن‌ها)
- W1: رفع دو XSS سمت کلاینت (فقط دو فایل فرانت).
- W2: سخت‌سازی `entry.js` (کاهش افشا + هشدار production) و دستیار (سقف ورودی، تایم‌اوت provider، بررسی مجوز مسیر چت).
- W3: ایمنی seed (`seed-measure-status-year.js` بدون ازدست‌رفتن ستون + idempotent)، پاک‌سازی ارجاع‌های یتیم، نمایان‌کردن seedهای ناموفق در بوت.
- قرارداد هر سه در `docs/IMPLEMENTATION_PLAN.md` (واحدهای W1–W3) ثبت است.

## نتیجهٔ نهایی نشست ۱۴۰۵/۰۷/۲۵

### کامیت‌های این نشست (hash کپی‌شده از `git log`، همه محلی و **پوش‌نشده** — تصمیم مالک)
| hash | موضوع |
|---|---|
| `cdf4379` | `fix(xss)`: اسکیپ عنوان اسلاید + دکمه‌های بخش با ایندکس |
| `1fc856c` | `harden(entry)`: حذف `username` از فهرست بی‌احراز + کمینه‌سازی نام + هشدار توت production |
| `965849e` | `harden(assistant)`: سقف ورودی ۴۰۰۰ + پاسخ امن در تایم‌اوت provider |
| `212f8de` | `fix(seed)`: مایگریشن `measure_status` غیرتخریبی + جاروی ارجاع یتیم + جمع‌بندی seedهای ناموفق بوت |
| `cb77b82` | `fix(deploy)`: مسیر compose قابل‌بوت (اجبار `JWT_SECRET`) |
| `c04d747` | `privacy(assistant)`: متن رکورد محرمانه به provider بیرونی نمی‌رود |
| `84b8de6` | `test(w5)`: تثبیت انقضای نشست + مستندسازی حفرهٔ باز ارسال تکراری |
| `f83f252` | `docs`: حسابرسی فاز ۱ + قرارداد ماژول‌ها |
| `dd92bb6` | `docs`: PRIVACY + DECISIONS + REQUIREMENTS |

وضعیت گیت: `main` = `dd92bb6`، **ahead ۱۲** از `origin/main`؛ درخت کاری پس از کامیت نهایی این سند تمیز است.

### تست‌های اجراشدهٔ پایانی (شاهد دست‌اول)
| دستور | نتیجه |
|---|---|
| `npm run test:all` | **35/35** ✅ |
| `npm run test:rbac-matrix` | **15/15** ✅ |
| `npm run smoke-test` (`SMOKE_BASE_URL=:3311`) | **6/6** ✅ |
| دانا: `test:assistant` / `test:assistant-response` | همهٔ ادعاها سبز (۲۱ + ۱۰) ✅ |
| `node --test tests/assistant-privacy-confidential.test.js` | **4/4** ✅ |
| `node --test tests/w5-session-and-duplicate.test.js` | **3/3** ✅ |
| `npm audit --omit=dev` | **۰ آسیب‌پذیری** ✅ |
| axe-core (WCAG A/AA) — لندینگ ۱۲۸۰/۳۹۰ و داشبورد ۱۲۸۰/۳۹۰ | **۰ نقض** در چهار اسکن ✅ |
| رندر E2E ورود کاشی‌ای (Edge headless) | ورود موفق روی `#acc`، صفر `pageerror` ✅ |
| مایگریشن seed روی دیتابیس زنده پس از بوت | `measure_status cols=18 rows=520 quick_check=ok`، ارجاع یتیم **۰** ✅ |
| تایم‌اوت ۳۰ ثانیه‌ای provider (شبیه‌سازی) | **اجرا نشد** ⚠️ (در REQUIREMENTS به‌عنوان NOT run ثبت شد) |
| `docker compose up` کانتینری | **اجرا نشد** ⚠️ (daemon در دسترس نبود؛ فقط `compose config` و بوت production محلی) |

### کارهای باز (برای نشست بعدی)
1. **تصمیم مالک: push.** ۱۲ کامیت روی `main` پوش نشده؛ ورود امن با `gh auth login` یا Git Credential Manager (توکن در چت پاس نشود).
2. **ارسال تکراری فرم:** حفره باز است (شاهد: ۲۰۱/۲۰۱ و حتی بی‌اثر بودن `Idempotency-Key`)؛ رفع درست = ستون `client_token` + قید `UNIQUE` → نیازمند تصمیم schema.
3. **دو منبع حقیقت مجوز:** `roles.permissions` (JSON) در برابر `role_permissions` (جدول) — ۶ نقش در جدول کلید را دارند، ۰ از ۴۷ کاربر در JSON → مهاجرت/هم‌راستاسازی لازم است. (به همین دلیل گارد `requirePermission` روی چت اضافه **نشد** — متناقض با «deny by default» ولی تنها گزینه‌ی بدون شکستن دسترسی.)
4. بازبینی خط‌به‌خط ۱۶۶ مسیر «authRequired بدون requirePermission»؛ حذف تدریجی `unsafe-inline` از CSP؛ مدل Card Docking با `activeCardId` (در کد فعلی وجود ندارد).
5. اقدام انسانی خارج از محیط: revoke کلید قدیمی Gemini در کنسول Google.

### قدم بعدی (اولین کار نشست بعد)
- خواندن همین بخش، سپس `git status` و `git log` و آشتی، بعد بند ۱ تا ۵ به ترتیب تصمیم مالک.
- **ادامه‌ی خودکار وجود ندارد**؛ اگر نشست قطع شد، با فرستادن «ادامه» از همین نقطه ادامه می‌دهم.

---

## نشست ۱۴۰۵/۰۷/۲۳ (ادامه) — بستنِ حفرهٔ ارسال تکراری فرم (W9) + push

> این بخش پس از نشست بالا نوشته شده؛ بند ۲ فهرست «کارهای باز» همان نشست (ارسال تکراری فرم) بسته شد.

### آنچه تغییر کرد
- گارد ارسال تکراری در لایهٔ داده: ستون `form_submissions.client_token` + ایندکس یکتای جزئی
  `(hospital_id, form_id, client_token) WHERE client_token IS NOT NULL` — مهاجرت idempotent در
  `database/migrate-form-submission-client-token.js` و در زنجیرهٔ بوت `src/app.js`.
- قرارداد HTTP: ثبت تازه ۲۰۱؛ بازفرستِ همان توکن ۲۰۰ + `duplicate:true` با `submissionId` اصلی؛
  کلاینت بدون توکن عیناً رفتار قبل؛ توکن نامعتبر یا مهاجرت اجرانشده → خطای روشن (۴۰۰)، نه نادیده‌گرفتن.
- دانا: سقف ورودی روی طول خام پیام اندازه‌گیری می‌شود (پدِ فاصله دیگر بدنهٔ بزرگ‌تر از ۴۰۰۰ را عبور نمی‌دهد).

### شاهد اجراشدهٔ همین نشست (Node v22.23.3)
| دستور | نتیجه |
|---|---|
| `node --test` روی هفت سوئیت (unit, integration, rbac-matrix, form-engine, guardrails, privacy, endpoint-matrix) | **54/54** ✅ |
| `node --test tests/w5-session-and-duplicate.test.js` | **4/4** ✅ (آزمون تازهٔ «۲ب» گارد را قفل می‌کند؛ قبلاً ۳/۳) |
| `test:assistant` / `test:assistant-response` | ۲۱ + ۱۰ ادعا سبز ✅ |
| `SMOKE_BASE_URL=:3322 node scripts/smoke-test.js` | **6/6** ✅ |
| بوت واقعی سرور روی :3322 | `[Migrate FormClientToken] ✅` + `[Boot] ✅ همهٔ مراحل seed بدون خطا` ✅ |

### وضعیت git
- کامیت‌ها: `56edfe9` (گارد فرم) · `0585dc8` (سقف خام ورودی دانا) — **پوش‌شده روی `origin/main`** (`9661bd7..0585dc8`).
- تأیید پس از push: `git rev-parse main` = `git ls-remote origin refs/heads/main` = `0585dc8…` و `ahead/behind = 0/0`.


---

## نشست ۱۴۰۵/۰۷/۲۳b — اجرای مستر-پرامت روی کلون ویندوزی (شاخهٔ feature/hospital-platform)

### وضعیت ورودی (تأییدشده با اجرا)
- کلون تازه: `new313` — `main`=`bec3d57`، درخت تمیز، همگام با origin.
- ماشین: Windows — Node v22.22.0 روی PATH، npm 10.9.4 (nativeها با `npm ci` برای همین نسخه ساخته شدند؛ تلهٔ ABI قبلی تکرار نشد).

### کارهای انجام‌شده (همه با شاهد اجرایی این نشست)
- شاخهٔ کاری `feature/hospital-platform` (طبق §۷ مستر پرامت؛ `main` دست‌نخورده).
- `npm ci` (۳۷۰ پکیج) → `demo-restore --force` → بوت `:3311`؛ زنجیرهٔ seed کامل بدون خطا؛ `[Migrate FormClientToken] ✅`.
- **بیس‌لاین کامل سبز:** smoke 6/6 · test:all 35/35 · rbac-matrix 15/15 · دانا 21+10 ادعا · privacy 4/4 · w5 4/4 · `npm audit --omit=dev`=۰ · lint ۰ خطا · اسکن سکرتِ tracked-tree پاک · E2E واقعی (Edge headless): ورود موفق، `body.app-shell`، موبایل ۳۹۰ بدون سرریز، صفر pageerror. (تنها خطای مشاهده‌شده: یک ۴۰۱ روی پروب `my-permissions` که با تست فازبندی‌شده اثبات شد **فقط پیش از ورود** رخ می‌دهد.)
- **اسناد جدید (فاز ۱ مستر پرامت):** `docs/ARCHITECTURE.md` و `docs/API_CONTRACTS.md`.
- **بازرسی مجوزها:** ۴۷۳ مسیر در ۱۳۰ فایل استخراج شد؛ فهرست A (authRequired بدون نگهبان استاندارد) = **۱۶۶** (هم‌خوان با رقم نشست ۱۴۰۵/۰۷/۲۵)؛ فهرست B = ۵۳ (۴۶ = `/api/super/*` پشت `superAdminRequired` — تأیید `super.js:39`؛ ۷ = auth عمدی). ۲۲ نمونهٔ دستی: اسکن تک‌خطی سوگیری منفی دارد؛ اکثریت دارای نگهبان درون‌تابعی/میان‌افزار نام‌دار هستند؛ کاندیدهای باقی‌مانده در `docs/AUDIT.md` بخش ۹.
- **درس محیطی ثبت‌شده:** سقف ۲۰ دقیقهٔ زیرعامل‌های موازی؛ ۸ تلاش (دو دور × ۴) همه به سقف خوردند → جمع‌بندی این نشست دستی انجام شد؛ نشست بعد: دامنهٔ باریک‌تر یا بودجهٔ گام‌کوچک.

### کارهای باز (اولویت‌دار — ادامه در نشست بعد)
1. تصمیم مالک: merge شاخهٔ `feature/hospital-platform` (PR آماده است) به `main`.
2. هم‌راستاسازی دو منبع مجوز (`roles.permissions` ↔ `role_permissions`) — پیش‌نیاز سخت‌سازی بیشتر RBAC.
3. پاس per-route روی کاندیدهای بخش ۹ AUDIT (assistant chat، KPI/export، چند read) — سپس استانداردسازی نگهبان‌ها.
4. revoke کلید قدیمی Gemini (اقدام انسان)، provider استقرار production، LICENSE.



### تکمیل گیت (پایان نشست)
- کامیت‌ها روی شاخهٔ `feature/hospital-platform` (hash کپی‌شده از `git log`):
  - `b2e2119` — docs: add ARCHITECTURE.md
  - `38a38f7` — docs: add API_CONTRACTS.md
  - `5302ca1` — docs: log session 1405-07-23b (PROGRESS/DECISIONS/AUDIT/AGENTS/IMPLEMENTATION_PLAN)
  - [کامیتِ گزارش نشست — بعد از این سند]
- پوش: شاخهٔ `feature/hospital-platform` → گیت‌هاب انجام شد؛ **PR #1**: https://github.com/hssn3/synapse/pull/1 ; `main` دست‌نخورده (merge = تصمیم مالک).
- CI: روی PR اجرا شد → **سبز** (run `38761906321`، conclusion=success؛ شامل نصب/بوت/سوئیت‌ها/smoke/ماتریس/evalها). پس از پوش کامیت گزارش، یک ران تازه روی آخرین کامیت شروع می‌شود.


---

## ۱۴۰۵/۰۷/۲۳ (ب) — برند «سیناپس» + مخزن خصوصی (Rebrand Session)
- **نام رسمی جدید:** «سیناپس» — «سامانه یکپارچه نظارت، اعتباربخشی و پایش سلامت» (لاتین: Synapse).
- **تم سراسری:** پالت جدید سرمهٔ نوی عمیق (#081222) + فیروزه‌ای (#3ec6d8) + طلایی گرم (حفظ شد). بازرنگ‌آمیزی ۵۶ فایل CSS/JS/HTML؛ توکن‌ها به‌روزرسانی + لایهٔ `public/css/synapse-theme.css` اضافه شد.
- **آیکون‌ها:** favicon-32، icon-192/512، maskable، apple-touch-icon از نسخهٔ بدون پس‌زمینهٔ نشان (گل‌و‌بُرگ)؛ نشانِ داخل lmark/برندها به تصویر تغییر کرد. کش PWA به `hosp-v14` ارتقا یافت.
- **متون برند:** هدر/فوتر/داشبورد/کاتالوگ/میزکار/متن‌های عمومی به «سیناپس»؛ `manifest.json`، `package.json`، `README`، `AGENTS`، `HANDOVER-COMPLETE`، `ARCHITECTURE` به‌روزرسانی شدند.
- **پرامت شماره‌یک:** پس از اجرا از مخزن برداشته و بیرون از گیت بایگانی شد (قابل بازگردانی از تاریخ گیت).
- **گیت‌هاب:** مخزن به `hssn3/synapse` تغییر نام و **خصوصی** شد.
- **بازبینی بصری:** اسکرین‌شات موبایل (۳۹۰px) و دسکتاپ (۱۲۸۰px) از لندینگ/داشبورد/کاتالوگ/میزکار — بدون سرریز افقی؛ سرور توسعه سالم. (تست‌های خودکار از طریق CI همین پوش اجرا می‌شوند.)

---

## ۱۴۰۵/۰۷/۲۳ (ب-۲) — پولیش هدر/برند + تست کامل شیفت‌های پرستاری
- **هدر:** لوگوی «گل‌وبُرگ» بدون کادر و کاملاً شفاف در هدرها/فوترها؛ هدر شیشه‌ای حرفه‌ای (خط فیروزه‌ای، هاور خط‌دار، نام برند گرادیانی).
- **تبِ مرکزی «دانا»:** برچسب متنی حذف شد (فقط آیکون + حلقهٔ مداری؛ برای دسترس‌پذیری `aria-label` حفظ شد).
- **دارایی‌ها:** `synapse-mark.png` شفاف (۲۵۶px) + بازسازی `favicon-32`/`synapse-mark-64`/`synapse-logo` بدون پس‌زمینه؛ کش PWA به `hosp-v16`.
- **فیکس مهم:** لینک `synapse-theme.css` در `index.html` جاافتاده بود (به‌دلیل CRLF در جایگزینی قبلی) — اضافه شد و تأیید شد.
- **تست شیفت‌های پرستاری (E2E واقعی):** فرم پرسنل با «سمت» («تست سیناپس / پرستار آزمایشی / TST‑۰۱») → ثبت 201؛ سلول گرید روز ۱ → `M` (۶ ساعت) → بازخوانی: `total=6`, `headcount.M=1`؛ موبایل ۳۹۰ بدون سرریز. جزئیات: `.cluster/new313-master-prompt/review.md`.
- **zcode:** CLI نسخهٔ 0.16.5 روی سیستم شناسایی و از حالت headless آن برای ریویو استفاده شد.

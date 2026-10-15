# PROGRESS — Hospital Platform Hardening & Completion

> آخرین به‌روزرسانی: 2026-10-15 (نشست ۱۴۰۵/۰۷/۲۳ — ماشین ویندوزی جدید)
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

# PROGRESS — Hospital Platform Hardening & Completion

> آخرین به‌روزرسانی: 2026-10-12 (نشست ۱۴۰۵/۰۷/۲۰)
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

## کارهای بعدی (به ترتیب)
1. [ ] revoke کلید Gemini توسط مالک (اقدام انسانی خارج از محیط).
2. [ ] تست خودکار ماتریس per-endpoint مجاز/ممنوع بدون UI (IDOR/privilege escalation صریح) — افزودن به tests/.
3. [ ] تصمیم دیپلوی production (provider) + چک‌لیست سخت‌سازی استقرار.
4. [ ] LICENSE (تصمیم کارفرما).
5. [ ] Lighthouse/a11y عددی در محیطی با Chromium کامل.

## Blockers / Notes
- تونل‌های Quick موقتی‌اند؛ با هر restart آدرس عوض می‌شود.
- برای دیپلوی production: هیچ provider در دسترس این محیط نیست؛ نیاز به تصمیم کارفرما (Railway سابق از کار افتاده).
- کلید API حذف‌شده باید توسط مالک revoke/rotate شود (خارج از توان این محیط — فقط گزارش).

## Last verified commit hash (copy from git)
- local HEAD: `49c78fe9db797283265d954393d7ce210383c1b1` (بدون تغییرات جدید کامیت‌نشده هنوز)
- origin/main: `49c78fe9db797283265d954393d7ce210383c1b1`

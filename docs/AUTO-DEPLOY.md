# استقرار خودکار — هر push روی `main` = آپدیت خودکار سایت

> تنها نصبِ فعال: **Wispbyte** (`https://synapse.wisp.uno`، سرور `22e42511`). سرور قبلی حذف شده است.
> آخرین به‌روزرسانی: ۱۴۰۵/۰۷/۲۸ · جزئیاتِ پنل (پاداش/کپچا، npm 12، متغیرها): `docs/WISPBYTE-DEPLOY.md`.

## زنجیره

```
پنل Wispbyte ──► scripts/boot.js ──► scripts/live-deploy.js ──► src/app.js
                  (نگهبانِ ثابت)       (پایشِ main هر ۱۲۰ ثانیه)    (اپ)
```

`boot.js` عمداً کوچک و بدونِ آپدیت‌پذیریِ درجاست؛ چون اجرای آن از Startup پنل می‌آید و فقط با
ری‌استارتِ کانتینر عوض می‌شود. هر منطقِ دیپلوی در `live-deploy.js` است که خودش را هم به‌روز می‌کند.

## رفتار در سه حالت

| چه چیزی عوض شده | نتیجه |
|---|---|
| `docs/`، `tests/`، `*.md` ریشه، `.opencode/` | فایل‌ها روی دیسک به‌روز می‌شوند؛ **اپ ری‌استارت نمی‌شود** (بدون downtime) |
| خودِ `scripts/live-deploy.js` یا `scripts/boot.js` | سوپروایزر تمیز خارج می‌شود؛ `boot.js` نسخهٔ تازه را بالا می‌آورد |
| هر چیز دیگر (`src/`، `public/`، `database/`، `package.json`…) | اگر `package*.json` عوض شده باشد `npm install`؛ سپس ری‌استارت نرم (SIGTERM، ۸ ثانیه مهلت) |

قواعد ایمنی:

- `git fetch --depth 1` + `git reset --hard FETCH_HEAD` — فقط فایل‌های ردیابی‌شده؛ `.env`، `database/`، `backups/`، `uploads/`، `node_modules/` دست‌نخورده می‌مانند.
- اگر `npm install` شکست بخورد، **اپِ سالمِ فعلی کشته نمی‌شود** و نصب در بررسی بعدی تکرار می‌شود.
- خطای شبکه/GitHub فقط لاگ می‌شود؛ اپ بدون GitHub هم بالا می‌ماند.
- خروجِ غیرمنتظرهٔ اپ → بالا آمدنِ دوباره با backoff (۳ تا ۳۰ ثانیه). خروجِ سوپروایزر → `boot.js` دو ثانیه بعد دوباره.
- تنها استثنا: تغییرِ خودِ `scripts/boot.js` تا ری‌استارتِ کانتینر اثر کامل ندارد.

## ماندگاری داده (تأییدشده با اجرای واقعی)

- DB روی والیوم پایدار کانتینر است: `/home/container/database/hospital.db` (+ `-wal`/`-shm`).
- `demo-restore` فقط وقتی نشانگر `.db-restored-v3` وجود نداشته باشد اجرا می‌شود — یعنی فقط در نصب تازه؛ آپدیت و ری‌استارت داده را بازنویسی نمی‌کند.
- تست انجام‌شده (۱۴۰۵/۰۷/۲۸):
  1. `POST /api/public/complaint` با متنِ مارکر یکتا → `200` و `id=0b107dcb-…`
  2. خواندن با نقش «ریاست بیمارستان» (`GET /api/users/complaints/list`) → رکورد با `source=public` دیده شد.
  3. **ری‌استارت کامل کانتینر از پنل** → پس از بالا آمدن، همان رکورد با همان `id` و `created_at=2026-10-19 23:48:51` باقی بود.
  4. رکورد آزمایشی با `PUT /api/users/complaints/:id` و `status=closed` بسته شد (داده‌ی دمو تمیز ماند).
- نتیجه: نوشتن‌های کاربران واقعی‌اند و روی دیسک می‌مانند؛ بکاپ خودکار روزانه هم در `backups/` والیوم ذخیره می‌شود.

## عملیات (پنل Wispbyte)

```text
# وضعیت و لاگ
کنسول سرور ← خطوط [boot-guard] و [live-deploy] و «Hospital Platform running on port …»

# دیپلوی فوری (بدون منتظرِ ۱۲۰ ثانیه)
پنل ← Restart (آزاد، بدون ویدیوی پاداش) — Startup خودش fetch/reset می‌کند

# بررسی سلامت از بیرون
curl -s https://synapse.wisp.uno/healthz
SMOKE_BASE_URL=https://synapse.wisp.uno npm run smoke-test      # ۶/۶

# تغییر بازهٔ بررسی (پیش‌فرض ۱۲۰ ثانیه، حداقل ۳۰)
در Startup:  DEPLOY_POLL_SECONDS=60 exec node scripts/boot.js

# خاموش‌کردنِ بررسی خودکار (اپ روشن می‌ماند)
در Startup:  DEPLOY_DISABLE=1 exec node scripts/boot.js

# بازگشت به اجرای سادهٔ بدون سوپروایزر
در Startup:  exec node src/app.js

# rollback امن (تاریخ را جلو نبر): یک کامیت revert روی main بزن؛ سوپروایزر خودش اعمال می‌کند
# اگر باید بدون revert عقب بروی: اول DEPLOY_DISABLE=1، بعد در Startup یک‌بار reset به sha دلخواه، سپس Restart
```

- «شروع» سرور در پلن رایگان یک ویدیوی پاداش می‌خواهد (نشستِ ~۵ ساعته)؛ «Restart» آزاد است.
- ذخیرهٔ Startup در پنل ممکن است به‌خاطر Cloudflare Rocket Loader بی‌صدا انجام نشود؛
  `window.__cfRLUnblockHandlers = true` را ست کن و بعد از ذخیره صفحه را رفرش کن و مقدار را ببین.

## تأییدهای اجرای واقعی

| زمان (UTC) | رخداد |
|---|---|
| `22:52:14` | کامیت `38a9853` دیده شد → `22:52:15` ری‌استارت → smoke ۶/۶ |
| `23:06:21` | زنجیرهٔ `boot-guard → live-deploy → app` فعال شد |
| `23:08:22` | کامیت فقط-مستندات `eb4a633` گرفته شد و **ری‌استارت نکرد** (uptime پیوسته ۴۹→۱۲۹s) |
| `23:20:28` | کامیت فقط-مستندات `1b1f8c5` گرفته شد؛ بدون ری‌استارت (uptime پیوسته) |
| `23:48:51` | ثبت عمومی تست → `23:50` ری‌استارت کانتینر → رکورد سالم باقی ماند |

## عیب‌یابی

| نشانه | علت/درمان |
|---|---|
| `Could not locate the bindings file` | npm 12 اسکریپت نصبِ `better-sqlite3` را مسدود کرده؛ `allowScripts` در `package.json` باید باشد (کامیت `385b38a`) |
| Start با `403 captchaRequired` | نشستِ ویدیوی پاداش مصرف شده؛ دوباره از صفحهٔ پنل Start بزن |
| ذخیرهٔ Startup اعمال نمی‌شود | Rocket Loader؛ `window.__cfRLUnblockHandlers = true` سپس `saveStartupCommand(...)` |
| سایت بالا نیست، کنسول زنده است | خروجیِ `[live-deploy]` را ببین: backoff/کرشِ اپ، `EADDRINUSE`، یا `npm install` ناموفق |
| آپدیت نمی‌آید | `git status`/`git log` در پنل؟ اینترنت کانتینر؟ `DEPLOY_DISABLE` ست نشده باشد؟ |

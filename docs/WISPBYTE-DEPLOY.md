# استقرار روی Wispbyte (پلن رایگان) — سیناپس

> تاریخ استقرار: ۱۴۰۵/۰۷/۲۸ (2026-10-19) · وضعیت: **زنده و سالم** (`smoke 6/6`)
> این سند تنها مرجعِ راه‌اندازی/به‌روزرسانی همین نصب است؛ نمای کلی زنجیرهٔ خودکار و ماندگاری داده: `docs/AUTO-DEPLOY.md`.

## نشانی‌ها

| مورد | مقدار |
|---|---|
| سایت | `https://synapse.wisp.uno` (Cloudflare → `http://78.154.103.39:12220`) |
| پنل سرور | `https://wispbyte.com/client/servers/22e42511` |
| نود / تگ پشتیبانی | `FREE-EU-RO-34` / `22e42511` |
| حساب پنل | `user_0czzv9` |

## مشخصات سرویس‌دهنده (پلن رایگان)

- **Docker image:** `ghcr.io/parkervcp/yolks:nodejs_22` → Node **v22.23.3** و npm **12.x** داخل کانتینر (Debian trixie-slim؛ `git`، `python3`، `build-essential` نصب است).
- **منابع:** ۵۱۲MiB RAM (با تماشای ویدیوی پاداش تا +۱۰۰MiB برای هر روز) · ۱GiB دیسک · ۳۵٪ یک vCPU.
- **مصرف واقعی پس از بالا آمدن:** RAM ≈ ۱۲۴MB از ۵۸۸MB · دیسک ≈ ۴۲۶MB از ۱۰۲۴MB.
- **قواعد پلن رایگان:** هر ۲ هفته یک بار باید در پنل لاگین کنی وگرنه سرور خاموش می‌ماند؛ ۳۰ روز خاموشی → انتقال به «storage» (حذف نمی‌شود).

## متغیرهای Startup (پنل → Startup)

| متغیر | مقدار |
|---|---|
| Git Repo Address | `https://github.com/hssn3/synapse.git` |
| Branch | `main` |
| Auto Update | `1` (هر استارت `git fetch` + `reset --hard`) |
| JS File | `src/app.js` |
| User Uploaded Files | `0` |

## فرمان Startup — **تک‌خطی** (تله‌ی مهم)

پنل دستور را در `/entrypoint.sh` با `eval` اجرا می‌کند و **خطوط جدید را به فاصله تبدیل می‌کند**؛ پس هر `if ... then` چندخطی با `syntax error near unexpected token 'then'` می‌شکند. همه‌چیز باید با `;` در یک خط باشد:

```
cd /home/container || exit 1; if [ ! -f package.json ] && [ -n "${GIT_ADDRESS}" ]; then git clone --depth 1 -b "${BRANCH:-main}" "${GIT_ADDRESS}" . || echo "[boot] git clone failed"; fi; if [ -d .git ] && [ "${AUTO_UPDATE:-0}" = "1" ]; then git fetch --depth 1 origin "${BRANCH:-main}" && git reset --hard FETCH_HEAD || echo "[boot] git update skipped"; fi; if [ ! -f .env ]; then { echo NODE_ENV=production; echo PORT=${SERVER_PORT:-12220}; echo JWT_SECRET=$(head -c 64 /dev/urandom | base64 | tr -dc A-Za-z0-9 | head -c 48); } > .env; fi; if [ ! -f .deps-ok ]; then rm -rf node_modules; fi; if [ -n "${NODE_PACKAGES}" ]; then npm install --no-audit --no-fund ${NODE_PACKAGES}; fi; if [ -n "${UNNODE_PACKAGES}" ]; then npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f package.json ]; then npm install --no-audit --no-fund; touch .deps-ok; fi; if [ ! -f .db-restored-v3 ]; then npm run demo-restore -- --force || echo "[boot] demo-restore failed"; touch .db-restored-v3; fi; exec node scripts/boot.js
```

چه می‌کند:

1. اگر مخزن نیست، `clone` می‌کند (پنل خودش کلون نمی‌کند؛ Reinstall فقط کانتینر را می‌سازد).
2. با `AUTO_UPDATE=1` هر استارت آخرین `main` را می‌گیرد (تغییراتِ ردیابی‌نشده مثل `.env` و دیتابیس دست‌نخورده می‌مانند).
3. `.env` فقط یک‌بار ساخته می‌شود: `NODE_ENV=production` + `PORT` از `SERVER_PORT` + `JWT_SECRET` تصادفی ۴۸ کاراکتری (اجباری؛ گاردِ `src/config/app.js` در production بدون آن بالا نمی‌آید).
4. `node_modules` فقط وقتی نشانگر `.deps-ok` نباشد از صفر نصب می‌شود (اولین بوت حدود ۳ دقیقه؛ بعد از آن چند ثانیه).
5. اگر نشانگر `.db-restored-v3` نباشد، عکس دمو روی دیتابیس بازگردانی می‌شود (`npm run demo-restore -- --force`).
6. در پایان، **`scripts/boot.js`** بالا می‌آید: نگهبانِ بیرونی → `scripts/live-deploy.js` (سوپروایزر خودبه‌روز) → `src/app.js` (بخش بعد).

> برای وادار کردن نصب مجدد وابستگی‌ها یا بازگردانی دوبارهٔ دیتابیس، همان فایل نشانگر (`.deps-ok` / `.db-restored-v3`) را در File Manager پاک کن و ری‌استارت بزن.

## به‌روزرسانی خودکار پس از هر push (`scripts/boot.js` + `scripts/live-deploy.js`)

پلن رایگان نه webhook دارد نه CI؛ متغیر `AUTO_UPDATE` پنل هم فقط هنگامِ استارتِ کانتینر کار می‌کند. برای خواستِ «هر بار GitHub آپدیت شد، این نصب هم آپدیت شود»، فرمانِ نهاییِ Startup به‌جای `node src/app.js` زنجیرهٔ سه‌لایه را اجرا می‌کند:

```
پنل ──exec──► scripts/boot.js ──spawn──► scripts/live-deploy.js ──spawn──► src/app.js
              (نگهبانِ ثابت)              (دیپلویِ خودبه‌روز)            (اپ)
```

- `live-deploy.js` اپ را به‌عنوان **فرزند** بالا می‌آورد (لاگ‌ها بدون تغییر به کنسول پنل می‌روند).
- هر `DEPLOY_POLL_SECONDS` (پیش‌فرض **۱۲۰ ثانیه**) با `git ls-remote` HEAD ریموت را می‌پرسد.
- اگر جلو رفته بود: `git fetch --depth 1` → `git reset --hard FETCH_HEAD` → اگر `package.json`/`package-lock.json` عوض شده باشد `npm install` → بر اساس نوع تغییر یکی از این سه:
  - **تغییر مستندات/تست‌ها** (`docs/`، `tests/`، `*.md` ریشه، `.opencode/`): فقط کد روی دیسک به‌روز می‌شود؛ اپ **ری‌استارت نمی‌شود** (بدون downtime).
  - **تغییر کدِ خودِ سوپروایزر** (`scripts/live-deploy.js` یا `scripts/boot.js`): سوپروایزر با `SIGTERM` اپ را می‌بندد و تمیز خارج می‌شود؛ `boot.js` بلافاصله نسخهٔ تازه را بالا می‌آورد (بدون ری‌استارت کانتینر و بدون ویدیوی پاداش).
  - **هر تغییر دیگر** (`src/`، `public/`، `database/`، `package.json`…): ری‌استارتِ نرم با `SIGTERM` (۸ ثانیه مهلت) تا کدِ تازه و مهاجرت‌ها/seedهای بوت دوباره اجرا شوند.
- اگر `npm install` شکست بخورد، **اپِ سالمِ فعلی کشته نمی‌شود**؛ همان کد قبلی سرویس می‌دهد و نصب در بررسی بعدی تکرار می‌شود (تله‌ی better-sqlite3: کدِ تازه با باینریِ ناقص = کرش).
- خروجِ غیرمنتظرهٔ اپ → بالا آوردنِ دوباره با backoff (۳ تا ۳۰ ثانیه) تا پنل «stopped» نبیند؛ خروجِ غیرمنتظرهٔ سوپروایزر → `boot.js` دو ثانیه بعد دوباره بالا می‌آورد.
- خطای شبکه/GitHub فقط لاگ می‌شود؛ دسترس‌پذیریِ اپ به GitHub گره نمی‌خورد.

> تنها استثنا: تغییرِ خودِ `scripts/boot.js` تا ری‌استارتِ کانتینر اثر کامل نمی‌کند (نگهبانِ در حال اجرا قابلِ جایگزینیِ درجا نیست)؛ به همین دلیل boot.js عمداً کوچک و تقریباً ثابت است.

**شواهد زندهٔ همین نصب (۱۴۰۵/۰۷/۲۸):**
- `23:06:21` پس از ری‌استارت کانتینر: `[boot-guard] اجرای سوپروایزر` → `[live-deploy] سوپروایزر فعال` → `Hospital Platform running`.
- زنجیرهٔ سه‌لایه پیش از استقرار، در یک ریپوی آزمایشی محلی تست شد: کامیتِ مستندات → بدون ری‌استارت · تغییرِ `live-deploy.js` → خروجِ سوپروایزر و بالا آمدنِ نسخهٔ تازه توسط boot-guard · تغییرِ `src/` → ری‌استارتِ نرم و نسخهٔ تازه.


متغیرهای اختیاری (در Startup یا `.env`): `DEPLOY_POLL_SECONDS` (کمینه ۳۰) · `DEPLOY_BRANCH` · `DEPLOY_REMOTE` · `APP_ENTRY` · `DEPLOY_DISABLE=1`.

**چرخهٔ کار روزمره:** فقط `git push origin main` → حداکثر تا ۲ دقیقه بعد، سرور خودش `fetch/reset/install/restart` می‌کند و در کنسول پنل خطِ `[live-deploy] کد به <sha> به‌روز شد` دیده می‌شود.

- کامیت‌های فقط-مستندات (`docs/`، `tests/`، `*.md` ریشه، `.opencode/`) فقط `fetch/reset` می‌شوند و **اپ را ری‌استارت نمی‌کنند** (بدون downtime)؛ تغییر در هر مسیر دیگری — از جمله `public/`، `src/`، `database/` — ری‌استارتِ نرم می‌دهد.
- توقفِ موقتِ کلِ مکانیزم: `DEPLOY_DISABLE=1` در Startup (اپ همچنان با سوپروایز/کرش‌ری‌استارت کار می‌کند).
- **آزمونِ واقعی ۱۴۰۵/۰۷/۲۸:** کامیت `38a9853` در `22:52:14` در کنسول دیده شد؛ `22:52:15` کد به‌روز و اپ ری‌استارت شد؛ بلافاصله `smoke 6/6` روی دامنه سبز (uptime=50s).

## تله‌ی npm 12: اسکریپت‌های نصب مسدود می‌شوند

کانتینر با npm 12 بالا می‌آید و npm 12 به‌طور پیش‌فرض `preinstall/install/postinstall` وابستگی‌ها را اجرا نمی‌کند؛ نتیجه: `better-sqlite3` بدون باینری می‌ماند و اپ با `Could not locate the bindings file` کرش می‌کند.

- راه‌حل قطعی: فیلد `allowScripts` در `package.json` (کامیت `385b38a`):
  ```json
  "allowScripts": { "better-sqlite3": true, "canvas": true }
  ```
- پرچم `npm install --allow-scripts=...` در نصبِ پروژه‌ای **رد می‌شود**: `npm error code EALLOWSCRIPTS`.
- هر دو بسته باینری آمادهٔ لینوکس دارند و کامپایل لازم نیست: `better-sqlite3` (node-v127-linux-x64) و `canvas` (napi-v7-linux-x64). `sharp` اسکریپت نصب ندارد (باینری از optional dep می‌آید).

## شروع سرور: تماشای ویدیوی پاداش

در پلن رایگان، هر **شروع** نیاز به یک ویدیوی تبلیغاتی کوتاه دارد:

- `POST /client/api/server/start` بدون نشستِ پاداش → `403 {"captchaRequired":true}`.
- در UI: دکمهٔ Start → صفحهٔ `venatus-reward-demo-prod` → «Watch ad to continue» → بازگشت با نشستِ معتبر (≈۵ ساعت) و استارت خودکار.
- نشستِ پاداش **یک‌بارمصرف** است؛ برای استارت بعدی دوباره باید ویدیو دیده شود. اگر تبلیغ پر نشود، پنل خودش به کپچای Turnstile می‌افتد.
- دکمهٔ «Watch ad» جداگانه در کنار کارت RAM هم +۱۰۰MiB رم برای یک روز می‌دهد (قابل انباشت تا ۷ روز).

## به‌روزرسانی دستی (وقتی سوپروایزر خاموش است)

1. در پنل: Console → **Restart** (Startup خودش `git fetch` و `npm install` را اجرا می‌کند).
2. تأیید: `SMOKE_BASE_URL=https://synapse.wisp.uno npm run smoke-test` باید ۶/۶ سبز باشد (total=395).

## تأیید سلامت (اجرای واقعی ۱۴۰۵/۰۷/۲۸)

```
Smoke test → https://synapse.wisp.uno
✅ healthz — env=production
✅ anonymous dashboard → 401
✅ login — user=hospital3_admin
✅ dashboard — total=395 full=296
✅ accreditation tree — measures=395
✅ public hospitals — 1 مرکز فعال
🎉 همه‌ی چک‌ها سبز است
```

## نکات امنیتی این نصب

- `require_password` در این نصب **خاموش** است؛ یعنی `POST /api/entry/role-login` با دانستن `user_id` بدون رمز نشست می‌دهد (خود اپ هم در بوت هشدار می‌دهد). برای استفادهٔ واقعی از پنل سوپرادمین روشنش کن. برای دموی عمومی این حالت عامدانه است.
- `JWT_SECRET` در `.env` همین کانتینر تولید می‌شود (تصادفی، ۴۸ کاراکتری) و در گیت نیست.
- دیتابیس (`database/hospital.db`) و `.env` خارج از گیت‌اند؛ `git reset --hard` به آن‌ها دست نمی‌زند.
- کلید LLM/پیامک/ایمیل در `.env` تنظیم نشده؛ پس دانا در حالت بدون کلید و ریمایندرها خاموش‌اند.

## عیب‌یابی سریع

| نشانه | علت / راه‌حل |
|---|---|
| `syntax error near unexpected token 'then'` | فرمان Startup چندخطی است؛ باید تک‌خطی با `;` باشد. |
| `Could not locate the bindings file` | npm 12 اسکریپت نصب را اجرا نکرده؛ `allowScripts` در `package.json` + پاک‌کردن `.deps-ok` و ری‌استارت. |
| `EALLOWSCRIPTS` | استفاده از `--allow-scripts` در نصب پروژه‌ای ممنوع است؛ به `allowScripts` منتقل کن. |
| `FATAL: JWT_SECRET غایب یا ضعیف است` | فایل `.env` نیست/پاک شده؛ حذف `.env` و ری‌استارت تا بازتولید شود. |
| صفحهٔ «Web server offline» از سمت دامنه | کانتینر خاموش یا اپ بالا نیامده؛ Console را ببین. |
| `CAPTCHA verification required before starting a server` | نشست پاداش مصرف شده؛ از UI (ویدیو) استارت بزن. |
| آپدیت خودکار نمی‌آید | در کنسول دنبال `[live-deploy] بررسیِ ریموت ناموفق` بگرد؛ خروجیِ `git ls-remote origin main` را در ترمینال پنل چک کن. |
| دیسک نزدیک ۱GiB | `node_modules` (~۳۸۰MB) + مخزن (~۲۵MB) + دیتابیس (~۱۰MB) + بکاپ‌های `database/backups`؛ بکاپ‌های قدیمی را پاک کن. |

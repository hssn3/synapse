# استقرار خودکار — هر push روی `main` = آپدیت خودکار نصب‌ها

> منبعِ حقیقتِ رفتارِ دیپلویِ خودکار · آخرین به‌روزرسانی: ۱۴۰۵/۰۷/۲۸
> جزئیاتِ مخصوصِ پنل Wispbyte (متغیرها، پاداش/کپچا، npm 12) در `docs/WISPBYTE-DEPLOY.md` است.

## دو نصبِ فعال

| نصب | میزبان | مسیر | اجرا | نشانی |
|---|---|---|---|---|
| اصلی (Ubuntu) | `104.252.77.146` (systemd: `synapse`) | `/root/313` | `node scripts/boot.js` | `http://104.252.77.146/` (nginx → 3311) |
| دموی رایگان (Wispbyte) | پنل `wispbyte.com`, سرور `22e42511` | `/home/container` | `node scripts/boot.js` (در Startup) | `https://synapse.wisp.uno` |

هر دو یک زنجیرهٔ واحد دارند:

```
systemd / پنل ──► scripts/boot.js ──► scripts/live-deploy.js ──► src/app.js
                  (نگهبانِ ثابت)       (پایشِ main هر ۱۲۰ ثانیه)    (اپ)
```

## رفتار در سه حالت

| چه چیزی عوض شده | نتیجه |
|---|---|
| `docs/`، `tests/`، `*.md` ریشه، `.opencode/` | کد روی دیسک به‌روز می‌شود؛ **اپ ری‌استارت نمی‌شود** (بدون downtime) |
| خودِ `scripts/live-deploy.js` یا `scripts/boot.js` | سوپروایزر تمیز خارج می‌شود؛ نگهبان نسخهٔ تازه را بالا می‌آورد |
| هر چیز دیگر (`src/`، `public/`، `database/`، `package.json`…) | اگر `package*.json` عوض شده `npm install`؛ سپس ری‌استارت نرم (SIGTERM، ۸ ثانیه مهلت) |

قواعد ایمنی:

- `git fetch --depth 1` + `git reset --hard FETCH_HEAD` — فایل‌های ردیابی‌نشده (`.env`، `database/hospital.db`، `backups/`، `node_modules/`) دست‌نخورده می‌مانند.
- اگر `npm install` شکست بخورد، **اپِ سالمِ فعلی کشته نمی‌شود** و نصب در بررسی بعدی تکرار می‌شود.
- خطای شبکه/GitHub فقط لاگ می‌شود؛ اپ بدون GitHub هم بالا می‌ماند.
- خروجِ غیرمنتظرهٔ اپ → بالا آمدنِ دوباره با backoff (۳ تا ۳۰ ثانیه). خروجِ سوپروایزر → `boot.js` دو ثانیه بعد دوباره.
- تنها استثنا: تغییرِ خودِ `scripts/boot.js` تا ری‌استارتِ کانتینر/سرویس اثر کامل ندارد (فرآیندِ در حال اجرا قابل جایگزینیِ درجا نیست)؛ boot.js عمداً کوچک و ثابت است.

## Ubuntu — عملیات

```bash
# وضعیت
systemctl status synapse --no-pager
tail -f /root/313-server.log          # خطوط [boot-guard] و [live-deploy]

# دیپلوی فوری (بدون منتظرِ ۱۲۰ ثانیه)
cd /root/313 && git fetch --depth 1 origin main && git reset --hard FETCH_HEAD && \
  npm install --no-audit --no-fund && systemctl restart synapse

# خاموش‌کردنِ بررسیِ خودکار (بدون توقفِ اپ)
systemctl edit synapse
#   [Service]
#   Environment=DEPLOY_DISABLE=1
systemctl daemon-reload && systemctl restart synapse

# بازگشت کامل به حالتِ قبل از خودکارسازی
cp /root/synapse.service.bak /etc/systemd/system/synapse.service   # نسخهٔ پشتیبان با ExecStart=node src/app.js
systemctl daemon-reload && systemctl restart synapse

# عقب‌گردِ یک نسخه (rollback) — سوپروایزر همان لحظه دوباره جلو نمی‌برد چون main همان است
cd /root/313 && git reset --hard <sha> && systemctl restart synapse

# بکاپ قبل از هر تغییر
cd /root/313 && npm run backup-db
```

- بکاپِ خودکار روزانهٔ اپ (`BackupCron`) و بکاپِ دستی در `/root/313/backups/` است (خارج از گیت).
- `.env` سرور (`NODE_ENV`، `PORT`، `JWT_SECRET`) در ۱۴۰۵/۱۰/۱۶ ساخته شده و مستقل از گیت است.
- سرویس با `NODE_ENV=development` بالا می‌آید (تنظیمِ موجود در `.env` سرور؛ عمداً تغییر داده نشد).

## Wispbyte — عملیات

- Startup ← `exec node scripts/boot.js` (بقیهٔ خطوط: clone/fetch، `.env`، `npm install`، `demo-restore`).
- کنسول پنل: خطوط `[boot-guard]` و `[live-deploy]` را ببین.
- خاموش‌کردن: در Startup به‌جای boot.js همان `node src/app.js` را بگذار (با هر ری‌استارتِ کانتینر یک بار `AUTO_UPDATE=1` هم اجرا می‌شود).
- جزئیاتِ npm 12 / `allowScripts` / ویدیوی پاداشِ شروع: `docs/WISPBYTE-DEPLOY.md`.

## تأیید (اجرای واقعی ۱۴۰۵/۰۷/۲۸)

| زمان | رخداد |
|---|---|
| `22:52:14` | Wispbyte: کامیت `38a9853` دیده شد → `22:52:15` ری‌استارت → smoke ۶/۶ |
| `23:06:21` | Wispbyte: زنجیرهٔ `boot-guard → live-deploy → app` فعال شد |
| `23:08:22` | Wispbyte: کامیت فقط-مستندات `eb4a633` گرفته شد و **ری‌استارت نکرد** (uptime پیوسته ۴۹→۱۲۹s) |
| `23:14:56` | Ubuntu: بکاپِ DB+uploads گرفته شد، `628e4b9 → eb4a633` دیپلوی شد، `npm install` ۲ ثانیه |
| `23:15:37` | Ubuntu: سرویس با `scripts/boot.js` بالا آمد؛ smoke روی `127.0.0.1:3311` **۶/۶** |

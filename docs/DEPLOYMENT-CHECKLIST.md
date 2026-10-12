# DEPLOYMENT — چک‌لیست استقرار (Production)

> وضعیت فعلی: **دیپلوی production ندارد** (سرویس قبلی Railway از کار افتاده — تأیید ۱۴۰۵/۰۷/۲۰).
> این چک‌لیست برای هر provider جدید (Railway / VPS+Docker / هر ابری) استفاده شود.
> هیچ مرحله‌ای اینجا «انجام‌شده» فرض نمی‌شود مگر با شاهد اجرا.

## A) پیش از استقرار

- [ ] **JWT_SECRET** قوی: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
      (پلیس‌هولدرها عمداً سرور را در production متوقف می‌کنند — این طبیعی است.)
- [ ] **DATA_DIR** روی والیوم ماندگار (دیتابیس + uploads + backups با هم).
      اگر ست نشود، هر redeploy داده را می‌برد.
- [ ] **NODE_ENV=production** + HTTPS واقعی (برای کوکی Secure و CSP).
- [ ] **BASE_URL** دامنه‌ی عمومی (برای لینک‌های QR/ایمیل).
- [ ] کلید LLM دستیار: از پنل سوپرادمین یا `GEMINI_API_KEY` + `npm run assistant:key`.
- [ ] رمزهای دموی پیش‌فرضِ دیتابیس تازه (hospital3_admin / SuperAdmin@2026) **عوض شوند**.
- [ ] `require_password` برای ورود کاشی‌ای روشن شود (پنل سوپرادمین → تنظیمات).
- [ ] SMTP/SMS در صورت نیاز ریمایندرها (بدون آن، فقط درون کارتابل).

## B) استقرار (Docker)

```bash
# ۱) کپی نمونه و مقداردهی (مقادیر واقعی — هرگز در گیت)
cp .env.example .env   # و پر کردن

# ۲) ساخت و بالا آوردن
docker compose up -d --build

# ۳) صبر برای بوت اول (زنجیره‌ی seed/migration روی والیوم خالی ~۱-۲ دقیقه)
docker compose logs -f app   # تا پیام "Hospital Platform running on port 3000"

# ۴) سلامت
curl -fsS http://localhost:3000/healthz
```

- فایل nginx مرجع: `docs/nginx.conf` (بلوک HTTPS بعد از certbot از کامنت خارج شود).
- بکاپ خودکار روزانه: فعال است (`AUTO_BACKUP_RETENTION_DAYS`).
- برای VPS بدون Docker: `npm ci --omit=dev && npm run init-db && npm start` پشت systemd/PM2 + nginx.

## C) پس از استقرار (Smoke واقعی)

- [ ] `SMOKE_BASE_URL=https://<دامنه> npm run smoke-test` → ۶/۶
- [ ] `SMOKE_BASE_URL=... node --test tests/rbac-endpoint-matrix.test.js` → ۱۵/۱۵
- [ ] ورود با کاربر واقعی دمو پس از تعویض رمزها؛ بررسی 401 ناشناس.
- [ ] آزمون بازگردانی بکاپ روی یک محیط جدا (حداقل یک‌بار).
- [ ] بازبینی لاگ خطای بوت از پنل سوپرادمین (`/api/super/error-log`) — صفر خطای غیرمنتظره.

## D) بازگردانی (Rollback)

- کد: برگشت به ایمیج قبلی (`docker compose up -d --build` با تگ قبلی) یا `git revert` (بدون force).
- داده: `npm run restore-db` از آخرین بکاپ سالم — **فقط پس از بکاپ از وضعیت فعلی**.
- در هر رخداد: ثبت در `docs/PROGRESS.md` (چه شد، چه کردیم، نتیجه).

## E) ممنوعیت‌ها

- هیچ دیپلوی production از این محیط توسعه بدون **مجوز صریح کتبی کارفرما**.
- هرگز دیتابیس production را به محیط dev/preview وصل نکنید.
- هرگز داده‌ی بیمار واقعی در مخزن/اسکرین‌شات/پرامپت AI نگذارید.

# SECURITY — سیاست و رویه‌های امنیتی

> این سند «قواعد فنیِ اجراشده» را از «تصمیم‌های سازمانیِ لازم» جدا می‌کند.
> تاریخ آخرین بازبینی: 1405/07/20 (2026-10-12)

## ۱) قواعد فنی اجراشده (در کد)

| موضوع | پیاده‌سازی | محل |
|---|---|---|
| احراز هویت | JWT در کوکی httpOnly؛ بررسی وضعیت فعال کاربر در هر درخواست (غیرفعال‌سازی فوری) | `src/middleware/auth.js` |
| مجوزدهی | RBAC/ABAC Fail-Closed روی سرور؛ `requirePermission`/`requireAnyPermission` + `hospitalScope` | `src/middleware/auth.js` + `src/modules/rbac/` |
| جداسازی مستأجر | `hospital_id` در کوئری‌ها؛ سوپرادمین با نوع توکن جدا (`type:'super_admin'`) | سراسری + `src/routes/super.js` |
| رمز عبور | bcrypt (راند ۱۲ پیش‌فرض)؛ قفل حساب بعد از ۵ تلاش ناموفق (۱۵ دقیقه) | `src/routes/auth.js`, `src/routes/entry.js` |
| نشست | بلاک‌لیست logout، کوکی Secure فقط پشت HTTPS واقعی، SameSite=Lax، انقضای ۸ ساعته | `src/services/jwt-blocklist.js` |
| نرخ درخواست | سطل کاربر-محور برای API؛ سطل IP برای login؛ سطل جدا برای ورود کاشی‌ای | `src/middleware/security.js` |
| CSRF | چک Origin/Referer ملایم روی متدهای تغییردهنده (دفاع اصلی: SameSite) | `src/middleware/security.js` |
| XSS | CSP + `esc()` اجباری برای متن فارسی به کلاینت (بدهی: `unsafe-inline` برای onclick ها) | `src/middleware/security.js` + قواعد پروژه |
| آپلود فایل | whitelist نوع (jpg/png/webp/pdf) + سقف حجم + ذخیره خارج web-root | `src/modules/core/upload-middleware.js` |
| رازها | فقط env؛ هرگز در کد/مخزن. اسنپ‌شات دموی عمومی هم اسکراب می‌شود | `.env.example` + `scripts/demo-snapshot.js` |
| لاگ خطا | پیام عمومی به کاربر؛ جزئیات فقط در `error_log` برای سوپرادمین | `src/app.js` |
| PWA کش | فقط پوسته استاتیک؛ API هرگز؛ پاک‌سازی در logout | `public/sw.js` |

## ۲) آزمون‌های امنیتی موجود (اجراشده)

- `tests/rbac-endpoint-matrix.test.js` — ۱۵ تست HTTP بدون UI (anonymous، deny نقش‌ها، IDOR، ارتقای سطح، سقط mid-session)
- `tests/rbac-matrix.test.js` — ۱۴ ادعای سیاست
- `scripts/smoke-test.js` — ۶ پروب (شامل ۴۰۱ ناشناس)
- `tests/assistant-guardrails.test.js` — گاردریل‌های دستیار (شامل مرز نقش)

اجرا: `SMOKE_BASE_URL=http://127.0.0.1:3311 node scripts/self-test-harness.js` (۷ سوئیت)

## ۳) تصمیم‌های سازمانی لازم (کارفرما — خارج از توان محیط)

1. **rotation دارایی‌ها:** کلید Gemini قدیمی که در تاریخچه‌ی مخزن عمومی بوده باید در کنسول Google باطل (revoke) شود. هر راز دیگری که ممکن است در نسخه‌های قبلی جابه‌جا شده باشد هم بازبینی شود.
2. **سیاست نگهداری داده (Retention):** مدت نگهداری گزارش‌های خطا/واقعه، سوابق بیمار و لاگ‌ها طبق مقررات بیمارستان تعیین شود — در کد پیش‌فرضی اعمال نشده چون سیاست شما باید وزنش را بدهد.
3. **سیاست بکاپ:** محل، بسامد، رمزنگاری و آزمون بازگردانی. (ابزارهای فنی موجود: `npm run backup-db`, `AUTO_BACKUP_*`.)
4. **LEVEL OF ANONYMITY گزارش‌دهنده ناشناس:** معماری فعلی شناسه‌ی گزارش‌دهنده را روی گزارش ذخیره نمی‌کند و لاگ‌های درخواست شامل IP است. اگر ناشناسی کامل الزام قانونی است، باید لاگ‌گیری سرور (IP/User-Agent) نیز برای مسیر گزارش ناشناس محدود شود — نیازمند تصمیم شما.
5. **استقرار تجاری:** انتخاب provider و سطح SLA.

## ۴) بدهی‌های فنی شناخته‌شده (شفاف)

- CSP با `unsafe-inline` (به‌خاطر onclick های فراوان؛ حذف تدریجی نیازمند مهاجرت به addEventListener).
- بدون CI (هر تغییر دستی تست می‌شود؛ افزودن GitHub Actions پیشنهاد می‌شود).
- `npm audit`: ۲ آسیب‌پذیری moderate از پکیج `uuid` (زیرمجموعه‌ی exceljs؛ breaking fix).

## ۵) گزارش رخداد / ارتباط

یافته امنیتی؟ تا وصل شدن کانال رسمی: در مخزن issue با برچسب security ثبت شود — بدون درج جزئیات حساس در متن عمومی.

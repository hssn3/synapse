# پیشرفت توسعه — فایل پیگیری

> اگر توکن تمام شد: این فایل را بخوان و از آخرین `[/]` یا `[ ]` ادامه بده.
> تاریخ شروع: ۱۴۰۵/۰۷/۰۱ (2026-09-23)

## ترتیب اجرا
امنیت (دسته ۱) → **آخرین مرحله** (دست نزن تا کاربر بگوید)

---

## دسته ۳ — گزارش و خروجی
- [x] 13. خروجی Excel واقعی (xlsx) با exceljs
- [x] 15. نمودار روند سنجه‌ها + تاریخچه وضعیت (measure_status_history)
- [x] 18. صفحه‌بندی سمت سرور (Server Pagination) در mountCrud

## دسته ۲ — ایمیل/پیامک/اعلان
- [x] 9. پیاده‌سازی واقعی ارسال ایمیل (nodemailer)
- [x] 10. پیاده‌سازی واقعی ارسال پیامک (kavenegar)
- [x] 11. سیستم اعلان داخل اپ (In-App Notification)

## دسته ۴ — تجربه کاربری و موبایل
- [x] 19. جستجوی سراسری / Command Palette
- [x] 20. PWA (manifest + service worker)
- [x] 21. کارت‌کردن جدول‌های پهن موبایل
- [x] 23. Breadcrumb / مسیرنمای صفحه

## دسته ۵ — تست و کیفیت
- [x] 27-28. Unit test + Integration test
- [x] 31. ESLint

## دسته ۶ — بهینه‌سازی معماری
- [x] 35. WAL checkpoint خودکار
- [x] 21(old). بازگردانی آبشاری سطل بازیافت

## دسته ۷ — داده و عملیات
- [x] 37. داده نمونه ۳ ماژول (hrdev/vendors/nsupervision)
- [x] 39. دسته‌بندی ۲۸ نوع خطای پزشکی

## 🔒 دسته ۱ — امنیت (آخرین مرحله — منتظر تأیید کاربر)
- [ ] 1. فراموشی رمز عبور
- [ ] 2. احراز هویت دو مرحله‌ای (2FA)
- [ ] 4. حفاظت CSRF
- [ ] 5. Audit Log جامع
- [ ] 6. سیاست رمز عبور پیشرفته

---

## لاگ تغییرات
- 2026-09-23: دسته ۳ کامل شد — ۴ خروجی xlsx (measures/bsc/users/indicators + checklists/:id)، تاریخچه وضعیت با هوک PUT، pagination در mountCrud. تست: smoke ۶/۶ + exports همه XLSX-OK.
- 2026-09-23: دسته ۵ کامل شد — tests/unit.test.js (۴ تست) + tests/integration.test.js (۵ تست)، eslint.config.js + npm run lint. همه سبز.
- 2026-09-23: دسته ۶ کامل شد — wal-checkpoint هر ۶ ساعت + restore-cascade در سطل بازیافت.
- 2026-09-23: دسته ۷ کامل شد — seed-sample (هر ماژول ۳ ردیف دمو) + medical_error_types با ۲۸ کد.
- 2026-09-23: دسته ۲ کامل شد — nodemailer/kavenegar واقعی + روتر notifications (لیست/ساخت/خوانده).
- 2026-09-23: دسته ۴ کامل شد — palette.js (Ctrl+Shift+K)، manifest.json + sw.js، کارت موبایل data-card، breadcrumb موجود تأیید شد.

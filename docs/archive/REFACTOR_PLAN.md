# 🗺️ سند جامع بازمهندسی سازمانی — نقشه راه رفکتورینگ (REFACTOR_PLAN.md)
## پلتفرم Enterprise فرم‌ساز، RBAC سخت‌گیرانه، دستیار چندنقشی و انهدام مونولیت‌ها (v3.0)

---

### ۱. هدف و استراتژی انهدام مونولیت‌ها (Annihilation Strategy)
پروژه از وضعیت مونولیتیک با فایل‌های حجیم (`src/routes/api.js` ۱۰،۷۵۸ خط و `public/js/app.js` ۱۷،۲۷۷ خط) به ساختار کاملاً ماژولار و تفکیک‌شده تحت Bounded Contexts ارتقا می‌یابد:
1. **تجزیه کامل و حذف فیزیکی `src/routes/api.js`** به ماژول‌های دامنه‌ای مجزا در `src/modules/<domain>/`.
2. **تجزیه کامل و مهاجرت `public/js/app.js`** به ماژول‌های ES Modules در `public/js/core/`, `views/`, `components/`, `utils/`, `guards/`.
3. **حذف فیزیکی `src/middleware/demo-open.js`** و تمامی ارجاعات آن در سیستم.
4. **مهاجرت کلیه فرم‌های سیستم** به موتور پویا Schema-Driven Form Engine و حذف فرم‌های هاردکدشده.
5. **سقف اندازه فایل:** هیچ فایل کدی در انتهای فازها نباید بالای ۵۰۰ LOC باشد (به جز جداول ایستا/دیکشنری متون).

---

### ۲. دروازه‌های ۱۲گانه فازها (Phase Gates)

```
Phase 1: Discovery & Baseline
  ├─ ثبت وضعیت اولیه در BASELINE.md
  └─ Gate: تایید سنجه‌های اولیه و کامیت پایه ✅

Phase 2: Tooling & Hygiene Foundation
  ├─ استقرار قوانین ESLint برای منع innerHTML خام و دیتابیس مستقیم در کنترلر
  └─ Gate: اجرای بدون خطای ابزارهای تحلیل ایستای کد

Phase 3: Backend Monolith Annihilation ⭐
  ├─ تفکیک تمام مسیرهای api.js به دامنه‌های:
  │    accreditation, documents, quality, operations, collaboration, clinical, users
  ├─ انتقال کامل منطق به Controller / Service / Repository
  ├─ حذف فیزیکی src/routes/api.js
  └─ Gate: grep برای "routes/api" خالی باشد + هیچ فایلی > 500 LOC نباشد

Phase 4: Frontend Monolith Annihilation ⭐
  ├─ تفکیک app.js به core/, views/, components/, utils/, guards/
  ├─ حذف فیزیکی public/js/app.js
  ├─ مهاجرت به ES Modules
  └─ Gate: عدم وجود innerHTML خام روی داده‌های کاربر + حذف app.js

Phase 5: RBAC/ABAC Hardening
  ├─ اعمال میدل‌ور سراسری authorize(resource, action) با Fail-Closed
  └─ Gate: قبولی ۱۰۰٪ آزمون ماتریس دسترسی NIST

Phase 6: Form Engine Complete Migration ⭐
  ├─ اتصال فرم‌های عملیاتی (برنامه ماهانه، گزارش خطا، چک‌لیست‌ها) به Form Engine
  └─ Gate: نبودن هیچ متد renderForm هاردکد در صفحات

Phase 7: AI Assistant Multi-Persona
  ├─ رجیستری ابزارها و گاردریل‌های مبتنی بر استناد و قوانین قانونی
  └─ Gate: رد سناریوهای اقدام غیرمجاز با استناد صریح NIST

Phase 8: AppSec Enforcement
  ├─ حذف قطعی demoOpen، اعمال هدرهای امنیتی Helmet و کنترل CSRF
  └─ Gate: نبود هیچ اثری از demoOpen در سورس‌کد

Phase 9: DevOps & Reliability
  ├─ ایزوله‌سازی کارهای سنگین (بکاپ/چک‌پوینت) در Worker Thread
  └─ Gate: تأخیر Event-loop در هنگام بکاپ کمتر از 20ms

Phase 10: UI/UX Rule 11 Verification
  ├─ انطباق کامل جریان افقی RTL و حذف پشته‌های عمودی در تمام ابعاد
  └─ Gate: آزمون چیدمان بدون خطای سرریز عمودی

Phase 11: Enterprise Self-Test Harness
  ├─ اجرای خودکار تمامی آزمون‌های ۶گانه با شواهد عددی
  └─ Gate: قبولی ۱۰۰٪ تمامی آزمون‌ها در خروجی خام

Phase 12: Documentation & Final Delivery
  ├─ گزارش انطباق نهایی و مستندات بازمهندسی
  └─ Gate: آماده برای استقرار نهایی در محیط عملیاتی
```

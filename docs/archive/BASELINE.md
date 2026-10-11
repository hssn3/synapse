# 📊 BASELINE METRICS REPORT — Project 313
**Timestamp:** 2026-10-06T09:03:00Z  
**Commit Hash (Baseline):** `6619746097a5634724df6da0c7b802a500d6afa2`  
**Orchestrator Swarm:** 16-Agent Enterprise Engineering Swarm  

---

## ۱. آمار پایه کد (Codebase Baseline Metrics)

| ردیف | سنجه (Metric) | مقدار اولیه (Baseline) | وضعیت استاندارد هدف |
|:---:|:---|:---:|:---|
| **۱** | **بزرگترین فایل کد فرانت‌اند** | `public/js/app.js` (**۱۷,۲۷۷ LOC** / ۱.۲۸MB) | حذف کامل یا تجزیه به ماژول‌های ≤ ۵۰۰ LOC |
| **۲** | **بزرگترین فایل کد بک‌اند** | `src/routes/api.js` (**۱۰,۷۵۸ LOC** / ۷۳۱KB) | حذف کامل و تفکیک به `src/modules/<domain>/` |
| **۳** | **تعداد مسیرهای هاردکد در `api.js`** | ۳۴۱ اندپوینت در یک فایل | صفر (تفکیک به ماژول‌های دامنه‌ای) |
| **۴** | **تعداد فایل‌های > ۵۰۰ سطر** | ۱۷ فایل | صفر (به جز دیتاهای ایستا/دیکشنری مرجع) |
| **۵** | **حالت ناامن `demoOpen`** | فعال در `src/middleware/demo-open.js` | حذف کامل فیزیکی و حذف از `src/app.js` |
| **۶** | **مدل ماژولار فرانت** | تک‌فایل اسکریپت قدیمی (Monolith Script) | ES Modules (`<script type="module">`) |
| **۷** | **فرم‌های سیستم** | هاردکد درون توابع فرانت‌اند | Schema-Driven Form Engine پویا |
| **۸** | **زمان پاسخدهی سلامت (`/healthz`)** | < ۱۵ms | زیر ۳۰۰ms پایدار |
| **۹** | **وضعیت تست‌های پایه** | ۶/۶ سوئیت در هارنس سبز | حفظ ۱۰۰٪ سبزی در طول کل ریفکتور |

---

## ۲. فهرست فایل‌های بالای ۵۰۰ سطر در Baseline

1. `public/js/app.js` (۱۷,۲۷۷ LOC) — هسته مونولیتیک فرانت‌اند
2. `src/routes/api.js` (۱۰,۷۵۸ LOC) — هسته مونولیتیک بک‌اند
3. `public/accreditation/data.js` (۶,۶۳۶ LOC) — داده‌های کتابچه ملی سنجه‌ها
4. `public/js/accreditation-measures-registry.js` (۵,۲۱۱ LOC) — رجیستری سنجه‌ها
5. `public/js/hassan-hubs.js` (۲,۷۲۶ LOC) — ماژول‌های نمای فرانت‌اند
6. `src/services/text-repair.js` (۱,۳۲۷ LOC) — واژه‌نامه تصحیح متون فارسی
7. `src/routes/super.js` (۱,۰۹۲ LOC) — مسیرهای سوپرادمین
8. `src/app.js` (۸۱۸ LOC) — بوت‌استرپ سرور
9. `public/js/shift-schedule.js` (۸۱۸ LOC) — مدیریت شیفت
10. `public/js/super-docs.js` (۶۴۰ LOC) — اسناد سوپرادمین
11. `src/services/assistant-context.js` (۶۰۹ LOC) — بافت دانا
12. `public/js/accreditation-suite.js` (۵۹۳ LOC) — سوئیت اعتباربخشی
13. `public/js/api.js` (۵۶۷ LOC) — کلاینت ارتباط با سرور
14. `public/js/accreditation-standards-registry.js` (۵۶۶ LOC) — استانداردهای ملی
15. `src/services/ai-provider.js` (۵۶۲ LOC) — کلاینت هوش مصنوعی
16. `src/services/decision-engine.js` (۵۵۰ LOC) — موتور تصمیم‌گیری
17. `public/js/bg-theme.js` (۵۰۱ LOC) — تم پس‌زمینه

---

## ۳. دروازه‌های عبور از فازها (Phase Gates)
- فاز ۱: ثبت Baseline و تدوین برنامه ریفکتور بدون تنبلی (`REFACTOR_PLAN.md`)
- فاز ۲: استقرار ابزارهای اعتبارسنجی و قوانین ESLint سخت‌گیرانه
- فاز ۳: انهدام `src/routes/api.js` و تفکیک به `src/modules/{domain}/`
- فاز ۴: انهدام `public/js/app.js` و تفکیک به ES Modules
- فاز ۵: اعمال گاردریل NIST RBAC و Fail-Closed روی تمام اندپوینت‌ها
- فاز ۶: مهاجرت کامل فرم‌ها به Schema-Driven Form Engine
- فاز ۷: تثبیت دستیار هوشمند چندپرسونایی با گاردریل‌های ارجاعی
- فاز ۸: استحکام‌بخشی امنیتی، حذف `demoOpen`، استقرار Rate-limit و CSRF
- فاز ۹: ایزوله‌سازی Worker Threads برای بکاپ و چک‌پوینت
- فاز ۱۰: اعتبارسنجی جریان افقی RTL و صفر پشته‌سازی عمودی (قانون ۱۱)
- فاز ۱۱: اجرای Self-Test Harness جامع با شواهد عددی
- فاز ۱۲: تحویل نهایی و گزارش انطباق سازمانی

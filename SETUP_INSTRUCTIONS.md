# راهنمای راه‌اندازی اولیه — سامانه اعتباربخشی

## پیش‌نیازها
- Node.js 20+
- SQLite3 (برای dev) یا PostgreSQL 15+ (برای production)

---

## نصب و راه‌اندازی

### قدم ۱: نصب dependencies
```bash
cd webapp
npm install
```

### قدم ۲: ایجاد دیتابیس و seed کامل
```bash
npm run init-db
```

این کامند به ترتیب انجام می‌دهد:
1. **migrate-sqlite** — ایجاد ۲۰ جدول
2. **seed** — seed داده‌های اولیه (استانداردها، نقش‌ها، KPIها)
3. **migrate-multi-tenant** — اضافه کردن super_admins و subdomain
4. **seed-hospital-two** — ایجاد بیمارستان دمو (بیمارستان دو)

### قدم ۳: اجرای سرور
```bash
npm run dev
```

سرور روی `http://localhost:3000` اجرا می‌شود.

---

## حساب‌های کاربری پیش‌فرض

### Super Admin (مدیر اصلی پلتفرم)
```
URL: http://localhost:3000/superadmin/login
Username: superadmin
Password: SuperAdmin@2026
⚠️  حتماً این رمز را تغییر دهید!
```

### بیمارستان دو — Hospital Admin
```
URL: http://localhost:3000/h2/login
Username: hospital2_admin
Password: Hospital2@Admin2026
⚠️  در اولین ورود باید تغییر کند
```

### بیمارستان دو — کاربران
| نام | نقش | Username | Password |
|---|---|---|---|
| خانم فاطمه رضایی | مدیر کنترل کیفیت | f.rezaei | 123456 |
| خانم زهرا کریمی | مدیر پرستاری | z.karimi | 123456 |
| خانم مریم حسینی | سوپروایزر کنترل عفونت | m.hosseini | 123456 |
| آقای علی محمدی | سوپروایزر آموزشی | a.mohammadi | 123456 |
| خانم سارا احمدی | سوپروایزر بالینی | s.ahmadi | 123456 |
| خانم نرگس زارعی | کارشناس شیر مادر | n.zarei | 123456 |
| خانم مینا رستمی | پرستار (جراحی) | m.rostami | 123456 |
| آقای رضا کاظمی | پرستار (داخلی) | r.kazemi | 123456 |

---

## ساختار Multi-Tenant

### پنل Super Admin
- تعریف بیمارستان‌های جدید
- تخصیص admin به هر بیمارستان
- مانیتور کل platform
- مدیریت subdomain

### پنل Hospital Admin
- مدیریت کاربران بیمارستان خودش
- تنظیمات: لوگو، سربرگ، امضا
- دید کامل داده‌های بیمارستان

### پنل کاربران
- هر کاربر فقط داده بیمارستان خودش را می‌بیند
- دسترسی بر اساس نقش (9 نقش)
- داشبورد نقش‌محور

---

## داده‌های seed شده

### بیمارستان دو شامل:
✅ **520 سنجه** اعتباربخشی (از کتاب نسل 5+6)
✅ **62 شاخص KPI** بیمارستانی
✅ **6 کمیته** پیش‌فرض
✅ **4 رویداد تقویم** سالانه بهداشتی
✅ **9 نقش** با مجوزهای دقیق
✅ **8 کاربر** دمو

---

## مسیرهای اصلی

```
GET  /                          → redirect به dashboard/login
GET  /superadmin/login          → ورود super admin
GET  /superadmin/dashboard      → پنل مدیریت بیمارستان‌ها
GET  /:hospital_slug/login      → ورود بیمارستان
GET  /:hospital_slug/dashboard  → داشبورد بیمارستان
GET  /api/auth/login            → API login
GET  /api/dashboard             → API داشبورد
GET  /api/accreditation/tree    → درخت 520 سنجه
...
```

---

## تست سیستم

### ۱. Login کنید با یکی از کاربران
```
http://localhost:3000/h2/login
Username: f.rezaei (مدیر کنترل کیفیت)
Password: 123456
```

### ۲. چک کنید:
- [x] داشبورد لود می‌شود
- [x] درخت اعتباربخشی (520 سنجه) باز می‌شود
- [x] وضعیت سنجه قابل تغییر است
- [x] کمیته‌ها نمایش داده می‌شوند
- [x] تقویم رویدادهای بهداشتی دارد
- [x] هیچ نامی از رقبا نیست

---

## فایل‌های مهم

| فایل | توضیح |
|---|---|
| `src/app.js` | Entry point اصلی Express |
| `src/routes/api.js` | همه API endpoints (SQLite) |
| `src/routes/auth.js` | Login/logout |
| `src/middleware/auth.js` | JWT + RBAC |
| `database/migrate-sqlite.js` | Migration اصلی |
| `database/seed.js` | Seed داده‌های اولیه |
| `database/seed-hospital-two.js` | بیمارستان دمو |
| `docs/DESIGN.md` | طراحی کامل 14 ماژول |
| `docs/MULTI_TENANT_ARCHITECTURE.md` | معماری چند بیمارستانی |

---

## مشکلات متداول

### Error: database file not found
```bash
# دیتابیس ساخته نشده - اجرا کنید:
npm run init-db
```

### Error: EADDRINUSE port 3000
```bash
# پورت اشغال است - kill کنید:
lsof -ti:3000 | xargs kill -9
# یا پورت را تغییر دهید در .env:
PORT=3001
```

### Frontend لود نمی‌شود
```bash
# مطمئن شوید public/ در مسیر صحیح است
ls -la public/
```

---

## قدم بعدی: شروع Development

بروید به `docs/DESIGN.md` — راهنمای کامل طراحی 14 ماژول سیستم.

**فاز ۱ اولویت:**
1. اتصال frontend به API واقعی (حذف DEMO mode)
2. داشبورد نقش‌محور
3. تست کامل ایزوله‌سازی داده بین بیمارستان‌ها

---

*موفق باشید! 🎉*

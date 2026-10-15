# API_CONTRACTS — قراردادهای API (وضعیت فعلی مخزن)

> **روش تهیه:** استخراج ایستای مسیرها از `src/app.js`، `src/routes/*.js` و `src/modules/**/*.routes.js` (۴۷۳ مسیر در ۱۳۰ فایل) + بازبینی هدفمندِ ۲۲ مسیر حساس در سورس.
> **صداقت پوشش:** این سند «قرارداد فعلی» است، نه قرارداد آرمانی؛ اجرای ران‌تایم همهٔ مسیرها انجام نشده — هر جا مطمئن نیستیم «تأییدنشده» علامت خورده است. تاریخ: ۱۴۰۵/۰۷/۲۳ (2026-10-15).
> **پیشوندها:** بیشتر ماژول‌ها زیر `app.use('/api', require('./modules'))` سوار می‌شوند؛ یه‌جز `rbac`، `forms` و `assistant-enterprise` که پیشوند اختصاصی دارند: `/api/rbac/*`، `/api/forms/*`، `/api/assistant-enterprise/*`.

## بخش A — قراردادهای عمومی

### A1) احراز هویت و نشست
- ورود: `POST /api/auth/login`؛ سوپرادمین: `POST /api/auth/super-login`. توکن JWT در کوکی httpOnly؛ انقضای پیش‌فرض **۸ ساعت** (`JWT_EXPIRES_IN` — `src/config/app.js:37`).
- خروج: `POST /api/auth/logout` — توکن بلاک‌لیست می‌شود (`src/services/jwt-blocklist.js`).
- وضعیت نشست برای SPA: `GET /api/auth/session` عمداً هرگز ۴۰۱ نمی‌دهد و `{authenticated:false}` برمی‌گرداند (کامنت `src/routes/auth.js:289-292`)؛ در مقابل `GET /api/auth/me` برای بی‌نشست ۴۰۱ می‌دهد.
- ورود کاشی‌ای: `POST /api/entry/role-login` — عمداً بیرون از `/api/public/*` (محدودیت نرخ سخت‌گیرانهٔ آن برای این مسیر مناسب نبود — `src/routes/entry.js:1-5`).
- سوپرادمین: کل `/api/super/*` پشت `superAdminRequired` است (`src/routes/super.js:39`)؛ دامنهٔ آن «مدیریت بیمارستان‌ها، بدون دسترسی به دادهٔ درون‌سازمانی» (`super.js:1-3`).

### A2) مجوزدهی — سه لایهٔ فعال
1. **`requirePermission('کلید')` / `requireAnyPermission(...)`** — رایج‌ترین لایه؛ نمونه کلیدها: `manage_users`، `edit_measure_status`، `manage_documents`، `submit_checklists`، `view_indicators`، `manage_hospital_settings`.
2. **`authorize(resource, action)`** — موتور سیاست (نمونه‌های تأییدشده: فرم‌ها `form_engine:schema:create` در `form.routes.js:15`؛ RBAC `system:rbac:view/manage` در `rbac.routes.js:23,56,77`؛ ممیزی دستیار `assistant:audit:view` در `assistant.routes.js:94`).
3. **نگهبان‌های دامنه‌ای/درون‌تابعی** — `hospitalScope` (جداسازی بیمارستان)، `requireFeature('management')`، `canEditDocuments`، و چک‌های درون‌هندلر مثل `nrsCanManage` (`shift-staff.routes.js:181`)، `shiftAccessUnit` (`shift-schedule.routes.js:207-209`)، `hasPerm` (`evidence.routes.js:158`)، `canApprovePrograms` (`programs.routes.js:153-155`)، `canEditPeriod` (`timeline.routes.js:108`)، `mgmtCanManage` (`org-structure.routes.js:282`).

> ⚠️ **بدهی تأییدشده (مستند در DECISIONS):** دو منبع مجوز — `roles.permissions` (JSON) در برابر جدول `role_permissions` — ناهم‌راستا هستند؛ تا هم‌راستاسازی، رفتار مسیرها به «مسیر خواندن مجوز» حساس است. نمونهٔ شناخته‌شده: `POST /api/assistant-enterprise/chat` عمداً بدون گارد added مانده تا دسترسی کسی قطع نشود.

### A3) خطاها
- شکل غالب: `{ "error": "<متن فارسی>" }` با کدهای 400/401/403/404/409/500 (نمونه‌های متعدد در بازبینی).
- `401` = نبود/انقضای نشست؛ `403` = رد مجوز (سیاست Fail-Closed — ADR-0002).
- یکنواخت‌بودن کامل شکل خطا (وجود هم‌زمان `error` و `message`) **تأییدنشده / بدهی کیفیت**.

### A4) محدودیت نرخ و هدرهای امنیتی
- `loginLimiter` روی `/api/auth/login` و `/api/auth/super-login`؛ `tileLoginLimiter` روی `/api/entry/role-login` و `/api/auth/dev-login` (`src/middleware/security.js:86-108`).
- helmet + CSP (`security.js:9-22`)؛ `unsafe-inline` هنوز در CSP هست (بک‌لاگ مهاجرت `onclick`).

### A5) آپلود و فایل
- پیش‌فرض ۵MB (`config.upload.maxFileSize` — `src/modules/core/upload-middleware.js:10`)؛ لوگوی بیمارستان ۲MB (`super.js:43`)؛ whitelist نوع فایل. شواهد (evidence) همین محدودیت مشترک را دارند (`evidence.routes.js:153`).

### A6) ضد ارسال تکراری فرم
- `client_token` (اختیاری): ثبت تازه = `201`؛ بازفرستِ همان توکن = `200` + `duplicate:true` + `submissionId` اصلی (`src/modules/forms/form.repository.js`؛ مهاجرت idempotent در زنجیرهٔ بوت `src/app.js:699`).

### A7) داده و زمان
- چندمستأجری: `hospital_id` در داده + `hospitalScope` روی مسیرها.
- مرجع زمان/تاریخ: سرور — `GET /api/server-time` و تقویم جلالی `src/config/jalali.js` (کلاینت هرگز ساعت خودش را ملاک نمی‌گیرد).

## بخش B — نمای ماژول‌ها (شمارش کامل مکانیکی؛ ردبندی نماینده)

| ماژول (پیشوند) | تعداد مسیر | نگهبان شاخص |
|---|---|---|
| `auth` — `/api/auth` | ۱۰ | عمدتاً عمومی (login)؛ بقیه self-scoped |
| `entry` — `/api/entry` | ۴ | عمومیِ عامدانه + rate-limit کاشی |
| `super` — `/api/super` | ۴۶ | کل روتر: `superAdminRequired` |
| `accreditation` — `/api` | ۳۳ | `requireAnyPermission` (سنجه/درخت) + درون‌تابعی (period/overrides) |
| `clinical` — `/api` + `/api/clinical` | ۶۷ | درون‌تابعی شیفت/پرستاری + `requirePermission` ارزیابی‌ها |
| `collaboration` — `/api` | ۵۳ | self-scoped (کارتابل/پیام) + `manage_*` برای ساخت |
| `core` — `/api` | ۴۰ | `authorize`/درون‌تابعی؛ فرم‌های عمومی جدا |
| `documents` — `/api` | ۴۵ | `view_documents/manage_documents` + `canEditDocuments`/`hasPerm` |
| `forms` — `/api/forms` | ۹ | `authorize('form_engine:...')` + client_token |
| `operations` — `/api` | ۳۲ | `P*:view/manage_<دومین>` روی داشبوردها |
| `quality` — `/api` | ۶۶ | `view/manage` (سنجه/چکلیست/کیفیت) + درون‌تابعی برنامه‌ها |
| `rbac` — `/api/rbac` | ۴ | `authorize('system:rbac', ...)` + `my-permissions` (self) |
| `users` — `/api` | ۳۱ | `manage_users/org_structure` + self-profile |
| `clinical routes` — `/api/clinical` | ۱۳ | `requirePermission` ارزیابی‌های بالینی |
| `copilot` — `/api/copilot` | ۸ | `authRequired + hospitalScope` (self) |
| `directives` — `/api` | ۵ | `manage_directives` برای ارسال؛ read/ack self |
| `export` — `/api` | ۷ | ترکیبی (چند مورد فقط scope — کاندید بازبینی) |
| `notifications` — `/api` | ۳ | self-scoped |
| misc (app.js/healthz) | ۷ | عمومیِ عامدانه (healthz/version/static) |

### نمونه‌های نماینده (قرارداد عملی)
**اکریدیشن**
- `GET /api/accreditation/tree` → `requireAnyPermission(view_accreditation_full_tree | edit_measure_status | view_measure_status_readonly)`
- `PUT /api/accreditation/status/:measureId` → `requirePermission('edit_measure_status') + hospitalScope`
- `PUT /api/policy/period` → `authRequired + hospitalScope` + چک درون‌تابعی `canEditPeriod` (۴۰۳ برای غیرمجاز)

**فرم‌ها (`/api/forms`)**
- `POST /api/forms/` → `authorize('form_engine:schema','create')`
- `GET /api/forms/:idOrSlug` → `authorize(req.params.idOrSlug,'view')`
- `POST /api/forms/:id/submit` → ثبت پاسخ + گارد ضدتکرار با `client_token`

**اسناد کنترل‌شده**
- `GET /api/documents` → `requireAnyPermission(view_documents|manage_documents)`
- `POST /api/documents` → درون‌تابعی: فقط manager یا `manage_documents`/`edit_measure_status`
- `PUT /api/documents/:id` → `canEditDocuments` (midware) و هر ویرایش = snapshot در `document_versions`

**شیفت و پرستاری (نمونه)**
- `GET /api/shift/schedule?ward=..&year=..&month=..` → `hospitalScope` + `shiftAccessUnit` (دسترسی بخش‌محور)
- `PUT /api/shift/settings` و `PUT /api/shift/schedule/cell` → فقط head/deputy/overseer همان بخش
- `PUT /api/nursing/head/wards/:id/deputies` → `hnAccessWard` + فقط سرپرستار/ناظر

**دستِیار دانا**
- `POST /api/assistant-enterprise/chat` → `authRequired` (سقف ورودی + تایم‌اوت + فالبک امن؛ گارد مجوز = بدهی دو-منبع فوق)
- `GET /api/assistant-enterprise/audit` → `authorize('assistant:audit','view')`

**RBAC**
- `GET /api/rbac/my-permissions` → self (بدون گارد اضافی، عمدی)
- `GET /api/rbac/matrix` / `POST grant` / `POST revoke` → `authorize('system:rbac','view'|'manage')`

**گزارش‌ها و خروجی‌ها (کاندید بازبینی)**
- `GET /api/kpis`, `/api/kpis/dashboard`، `GET /api/export/measures.xlsx`، `GET /api/export/bsc.xlsx` → فعلاً `authRequired + hospitalScope` (بدون `requirePermission`) — در «کارهای بازِ AUDIT» ثبت شد.

---
*منبع شمارش: اسکریپت استخراج مکانیکی جلسه (route-inventory) — قبل از تغییر جدی مسیرها، این سند باید هم‌زمان به‌روز شود (الزام مستر پرامت، قرارداد-اول).*

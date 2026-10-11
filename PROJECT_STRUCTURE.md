# نقشه‌ی پروژه — یک فایل مرجع

این فایل فقط برای مرور سریع ساختار و تاریخچه است؛ خودِ کد و مستندات کامل در `docs/BACKUP_INFO.md` و `docs/CONTINUATION.md` است.

## اسکلت پوشه‌ها

```
پروژه اصلی/
├─ .env                      تنظیمات محیطی واقعی (رمز/کلید — private)
├─ .env.example               نمونه‌ی بدون رمز
├─ CLAUDE.md                  قوانین کار Claude Code روی این پروژه
├─ SETUP_INSTRUCTIONS.md       راه‌اندازی از صفر
├─ readme.md
├─ package.json / package-lock.json
├─ docker-compose.yml / dockerfile   (فعلاً استفاده نمی‌شود — اجرا فقط لوکال است)
│
├─ src/                       بک‌اند (Express)
│  ├─ app.js                  نقطه‌ی ورود؛ ترتیب بوت/مایگریشن‌ها اینجاست
│  ├─ config/                 دیتابیس، jalali، تنظیمات کلی
│  ├─ middleware/              auth، audit، security
│  ├─ routes/                  auth.js / entry.js / super.js / api.js
│  └─ services/                reminders، guide-timeline
│
├─ public/                     فرانت (Vanilla JS/CSS، بدون build step)
│  ├─ index.html
│  ├─ js/app.js                کل UI اپ در همین یک فایل بزرگ است
│  ├─ js/api.js                رَپر تماس‌های API
│  ├─ css/app.css
│  └─ *-public.html            فرم‌های عمومی بدون ورود (گزارش خطا، FMEA، ...)
│
├─ database/
│  ├─ hospital.db(+wal/shm)    دیتابیس زنده‌ی SQLite (در .gitignore، فقط روی دیسک)
│  ├─ migrate-sqlite.js         ساخت جدول‌های پایه + نقش‌های اولیه
│  └─ seed-*.js                 ~۴۵ مایگریشن idempotent؛ همه از src/app.js صدا زده می‌شوند
│
├─ docs/                       مستندات و تحلیل رقیب
│  ├─ BACKUP_INFO.md            ⭐ وضعیت کامل پروژه + رمزهای دمو (همیشه اول این را بخوان)
│  ├─ CONTINUATION.md           ⭐ ادامه‌ی کار بعد از قطع نشست
│  └─ hassan_ANALYSIS*.md        تحلیل رقیب «طراحی اولیه حسن»
│
├─ node_modules/                (در .gitignore — با npm install یا کپی از نسخه‌ی قبلی ساخته شد)
├─ uploads/                     فایل‌های آپلودی کاربران (در .gitignore)
└─ scripts/                     backup.js / restore.js (اسکریپت‌های کمکی خط‌فرمان، جدا از UI بکاپ سوپرادمین)
```

## گیت‌هاب

مخزن: `https://github.com/hssn3/hospital-accreditation-platform` — برنچ `main`

این پوشه («پروژه اصلی») از تاریخ ۱۴۰۵/۰۵/۲۵ (۲۰۲۶-۰۸-۱۶) **همان مخزن گیت اصلی** است — پوشه‌ی `.git` از پوشه‌ی قدیمی `p` به اینجا منتقل شد، نه کپی. یعنی از این به بعد هر `git commit`/`git push` که از داخل همین پوشه انجام شود مستقیم می‌رود روی همان تاریخچه‌ی گیت‌هاب — دو مخزن جدا وجود ندارد.

### آخرین ۳۰ کامیت (در لحظه‌ی نوشتن این فایل)
```
6281e81 Rewrite guide-timeline copy, add field-level pointers, expand milestone coverage, polish home cards
fc32194 Add unified org-chart page (3-row layout), box public-services strip, fix role-tile grid to 4-per-row
1e19276 Rename admin role label to «مدیر داخلی»; add gear-icon quick settings + easier admin-to-admin promotion
1f8c95e docs: update superadmin access instructions for the new hidden /admin313 path
577ec75 Hide superadmin login behind /admin313; rename top hospital-leadership label to ریاست بیمارستان
f9e9a49 Context-aware header, profile page, and shared card shine/glow polish
d807ebb Add مدیریت division drill-down: named sub-positions with superadmin-configurable labels
e833853 Public-services strip: wrap into a grid instead of horizontal scroll
f815887 Role-tile mosaic: side-by-side cards instead of stacked rows
aa94486 Add platform-level backup & restore to superadmin panel
3f7abf4 Add support-division drill-down page (stub departments) under پشتیبانی
572a103 Restyle header/footer/landing to reference emerald+gold palette
a73eaf3 Add head-nurse/deputy ward dashboard: attendance, leave requests, shift checklist alarms
bdf4b55 Add dedicated dashboard sections for infection-control and education supervisors
d87fcac Add nursing management drill-down under the پرستاری division
bee90fc Add guide timeline: start-year onboarding step, deterministic milestone tracker, calendar month icons
0c7adf7 Add first-layer org divisions: management/nursing/support cards on dashboard
6dbd1e9 Fix global header overlapping the post-login app shell height
98568bd Add persistent global header/footer and public home/about/contact
4bcf9fd Replace hospital login form with a role-tile mosaic entry screen
369999d Remove test rows whose Persian text was destroyed by the shell codepage
04005dd Add backup-info doc with credentials and full project status for re-upload continuity
971881f Get "now" from the server, not from the user's machine clock
c956f59 Role guide: one section per screen with prev/next, not one long scroll
f926709 Drop the unused Farsi-Digits font variant
2f1b480 Drop letter-spacing from Persian headings; cap the BSC label column on phones
06745e9 Tables: aligned figures, per-cell bidi, and a pinned column on the wide one
e63f6f9 Entry page: move guest-services out of the landing page, behind a CTA
1a4e90c Real Persian typeface: Vazirmatn replaces a serif with no Persian glyphs
00c4c9b Jalali+Tehran datetime: one shared formatter, swept across all display sites
```
تاریخچه‌ی کامل‌تر: `git log --oneline` داخل همین پوشه.

## نکته‌ی مهم — فقط همین یک پوشه

پوشه‌ی قدیمی `C:\Users\Administrator\Desktop\p` دیگر استفاده نمی‌شود. **از این تاریخ به بعد، تنها نسخه‌ی معتبر پروژه همین `C:\Users\NvDAdmin\Desktop\313` است** — اجرای سرور و ویرایش کد همه از همین‌جا انجام می‌شود.

برای بکاپ‌گیری کامل: کافی است همین یک پوشه را زیپ کنید (یا فقط `.git` را نگه دارید و مطمئن شوید گیت‌هاب هم‌زمان است — چون کد و تاریخچه‌ی کامل آنجا هم هست).


## افزوده‌های تحویل 2026-09-25
- public/css/buttons-system.css + public/js/buttons-system.js (Design System + BTN)
- src/services/jwt-blocklist.js (بلاک‌لیست logout)
- database/seed-telegram-docs.js + database/seed-md-package-c.js (بوت idempotent)
- scripts/agent-test.js (۱۱ assert) + گزارش‌های 00 تا 09 + CHANGELOG/FINAL_REPORT

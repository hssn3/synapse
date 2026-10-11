/**
 * Hospital Accreditation Platform - Main App (SQLite)
 */
const express = require('express');
require('express-async-errors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const config = require('./config/app');
const { setupSecurity } = require('./middleware/security');

// محافظت سطح فرایند — یک درخواست بد یا یک Promise رد‌شده‌ی مدیریت‌نشده نباید کل سرور را پایین بیاورد.
// express-async-errors همه‌ی خطاهای async درون route handler ها را به میان‌افزار خطای Express هدایت
// می‌کند، اما کد خارج از چرخه‌ی درخواست (تایمرها، اتصالات پس‌زمینه) از آن مسیر رد نمی‌شود؛
// این دو handler همان مورد را می‌گیرند. جزئیات را (اگر جدول error_log آماده باشد) ثبت می‌کنیم،
// وگرنه فقط لاگ کنسول. برای uncaughtException طبق رویه‌ی استاندارد Node.js: لاگ می‌کنیم و با
// کد خروج غیرصفر خارج می‌شویم — ادامه‌ی اجرا در وضعیتی که ممکن است حافظه/state خراب باشد خطرناک‌تر
// از یک ری‌استارت کنترل‌شده است (process manager مثل pm2/systemd/docker باید آن را بالا بیاورد).
// نیازی به تأخیر برای flush نیست: هم console.error و هم نوشتن روی error_log (better-sqlite3)
// همگام (synchronous) هستند و پیش از رسیدن به process.exit کامل تمام شده‌اند.
function logProcessError(kind, err) {
  console.error(`[Process] ${kind}:`, err && err.stack ? err.stack : err);
  try {
    const { query } = require('./config/database-sqlite');
    const { uuid } = require('./utils/db');
    query(
      `INSERT INTO error_log (id, hospital_id, user_id, method, route, status_code, message, stack, ip_address)
       VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, NULL)`,
      [uuid(), 'PROCESS', kind, 0, String((err && err.message) || err).slice(0, 2000), String((err && err.stack) || '').slice(0, 4000)]
    );
  } catch (logErr) {
    console.error('[Process] Failed to persist process-level error log:', logErr.message);
  }
}

process.on('unhandledRejection', (reason) => {
  logProcessError('unhandledRejection', reason);
});

process.on('uncaughtException', (err) => {
  logProcessError('uncaughtException', err);
  console.error('[Process] uncaughtException — در حال خروج کنترل‌شده...');
  process.exit(1);
});

const app = express();

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// cookieParser باید پیش از setupSecurity باشد: محدودکننده‌ی نرخ، سطلِ هر کاربر را از
// روی کوکی جلسه می‌سازد و اگر کوکی‌ها هنوز پارس نشده باشند همه‌ی کاربرانِ پشت یک IP
// دوباره در یک سطل مشترک می‌افتند — یعنی همان قفل‌شدن کل بیمارستان.
app.use(cookieParser());

setupSecurity(app);

// آپلود فایل واقعی از مسیر جدای multer با محدودیت اختصاصی رد می‌شود؛ این سقف فقط برای بدنه JSON/فرم است
// و برای جلوگیری از فشار حافظه با درخواست‌های همزمان زیاد (مقیاس تعداد کاربر بالا) کاهش یافته
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(express.static(path.join(__dirname, '../public')));

const uploadDir = path.resolve(config.upload.dir);
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

/* ---------- راه‌اندازیِ خودکارِ دیتابیسِ خالی ----------
   کارفرما: «شاید ریلوی کار نکند و لازم شود سایت را روی سرور دیگری بالا بیاورم
   و با نمونه‌ها نشان بدهم».

   تا امروز روی یک دیتابیسِ کاملاً خالی، فقط `npm start` کافی نبود: جدول‌های
   پایه (roles/hospitals) را اسکریپت‌های init-db می‌سازند و سیدهای پایینِ همین
   فایل بدونِ آن‌ها یکی‌یکی «no such table: roles» می‌دادند و ساکت رد می‌شدند.
   با آزمونِ واقعی روی یک DATA_DIR خالی دیده شد، نه با حدس.

   حالا اگر جدولِ hospitals نبود، همان زنجیره‌ی init-db یک‌بار و به‌ترتیب اجرا
   می‌شود. روی دیتابیسِ موجود هیچ‌کدام اجرا نمی‌شوند، پس داده‌ی مشتری در امان
   است. child process است نه require، چون آن اسکریپت‌ها آخرشان process.exit
   دارند و require کردنشان کلِ سرور را می‌بندد. */
function bootstrapEmptyDatabase() {
  const { db } = require('./config/database-sqlite');
  let hasCore = false;
  try {
    hasCore = !!db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='hospitals'").get();
  } catch (e) { hasCore = false; }
  if (hasCore) return;

  console.log('[Boot] دیتابیس خالی است — راه‌اندازیِ اولیه یک‌بار اجرا می‌شود…');
  const { execFileSync } = require('child_process');
  const steps = ['migrate-sqlite.js', 'seed.js', 'migrate-multi-tenant.js', 'migrate-roles.js'];
  for (const f of steps) {
    const script = path.join(__dirname, '..', 'database', f);
    if (!fs.existsSync(script)) continue;
    try {
      execFileSync(process.execPath, [script], { stdio: 'inherit', env: process.env });
      console.log(`[Boot] ✅ ${f}`);
    } catch (err) {
      console.error(`[Boot] ❌ ${f} شکست خورد:`, err.message);
      break;   // ادامه‌ی زنجیره روی پایه‌ی ناقص فقط خطای بیشتر می‌سازد
    }
  }
}
try { bootstrapEmptyDatabase(); }
catch (err) { console.error('[Boot] bootstrapEmptyDatabase failed:', err.message); }

// اجرای امن/idempotent روی هر boot، نه فقط اولین راه‌اندازی — چون روی Railway ممکن است دیتابیس
// از قبل روی Volume موجود باشد و اسکریپت‌های npm run init-db دوباره اجرا نشوند
try { require('../database/seed-committees').runMigration(); }
catch (err) { console.error('[Boot] Committee seed/migration failed:', err.message); }

try { require('../database/seed-documents').runMigration(); }
catch (err) { console.error('[Boot] Controlled document seed/migration failed:', err.message); }

// چرا این‌جا: اسناد تلگرام (TG-001..269) باید مثل بقیه سیدهای md در بوت وصل باشند تا idempotent بمانند؛ منبع فعلاً نیست و سید ۰ ردیف می‌سازد.
try { require('../database/seed-telegram-docs').runMigration(); }
catch (err) { console.error('[Boot] Telegram docs seed failed:', err.message); }

// چرا این‌جا: شکاف‌های واقعی md (بسته C) کنار بقیه سیدها تا اجرای دوباره صفر تغییر بماند.
try { require('../database/seed-md-package-c').runMigration(); }
catch (err) { console.error('[Boot] PackageC seed failed:', err.message); }

// چرا این‌جا: جدول‌های گمشده قطعی md (انبار مرکزی/ترالی/آنتی‌دوت/بحران/درس‌آموخته/نکات بالینی) — فقط اسکیما، بدون داده.
try { require('../database/seed-md-missing-tables').runMigration(); }
catch (err) { console.error('[Boot] MissingTables seed failed:', err.message); }

// چرا این‌جا: داده واقعی ناشناس همان جدول‌ها (آنتی‌دوت/ترالی/بحران/درس‌آموخته/نکات/استوک) — idempotent.
try { require('../database/seed-md-missing-data').runMigration(); }
catch (err) { console.error('[Boot] MissingData seed failed:', err.message); }

// چرا این‌جا: جدول‌های مرحله ۲ (فرم اداری/یخچال/تحویل شیفت/امانت/گواهی/نیازسنجی/آموزش بیمار) — فقط اسکیما.
try { require('../database/seed-md-stage2-tables').runMigration(); }
catch (err) { console.error('[Boot] Stage2Tables seed failed:', err.message); }

// چرا این‌جا: داده واقعی مرحله ۲ (فرم‌های کددار/یخچال/تحویل/امانت/گواهی/پمفلت/استوک/فارماکوپه) — idempotent.
try { require('../database/seed-md-stage2-data').runMigration(); }
catch (err) { console.error('[Boot] Stage2Data seed failed:', err.message); }

// چرا این‌جا: شکاف مجوز هر سمت (فقط افزودنی) + ۱۰ خط‌مشی کددار گمشده — idempotent.
try { require('../database/seed-md-stage3').runMigration(); }
catch (err) { console.error('[Boot] Stage3 seed failed:', err.message); }

// چرا این‌جا: فارماکوپه کامل ۵۳۲ قلمی از md (فقط غایب‌ها، با پرچم واقعی) — idempotent.
try { require('../database/seed-md-formulary-full').runMigration(); }
catch (err) { console.error('[Boot] FormularyFull seed failed:', err.message); }

// چرا این‌جا: یافته‌های بازخوانی عمیق G1-G3 (چک‌لیست عملیاتی/اسناد بحران/فرایند انتقال/استوک VIP/برآورد نیرو) — idempotent.
try { require('../database/seed-md-stage4').runMigration(); }
catch (err) { console.error('[Boot] Stage4 seed failed:', err.message); }

try { require('../database/seed-checklists').runMigration(); }
catch (err) { console.error('[Boot] Checklist seed/migration failed:', err.message); }

// باید بعد از دو مورد بالا اجرا شود — به جدول‌های committees و controlled_documents ستون اضافه می‌کند
try { require('../database/seed-sections-documents').runMigration(); }
catch (err) { console.error('[Boot] Section/document bridge seed/migration failed:', err.message); }

try { require('../database/seed-leadership-sops').runMigration(); }
catch (err) { console.error('[Boot] Leadership SOPs seed/migration failed:', err.message); }

try { require('../database/migrate-enterprise-core').runMigration(); }
catch (err) { console.error('[Boot] Enterprise core migration failed:', err.message); }

try { require('../database/seed-leadership-policies').runSeed(); }
catch (err) { console.error('[Boot] Leadership Policies seed failed:', err.message); }

// شاخهٔ تحلیل ریشه‌ای (RCA) و کد رهگیری روی گزارش خطا/واقعه
try { require('../database/seed-error-reports').runMigration(); }
catch (err) { console.error('[Boot] Medical error report migration failed:', err.message); }

// ماژول FMEA — عوامل تهدید کننده ایمنی بیمار
try { require('../database/seed-fmea').runMigration(); }
catch (err) { console.error('[Boot] FMEA seed/migration failed:', err.message); }

// کتابخانه دیجیتال — مخزن ساده فایل (بدون گردش‌کار امضا)
try { require('../database/seed-library').runMigration(); }
catch (err) { console.error('[Boot] Digital library seed/migration failed:', err.message); }

// حسابرسی داخلی — باید بعد از seed-checklists و seed-library اجرا شود (FK به checklists، grantPerms)
try { require('../database/seed-audits').runMigration(); }
catch (err) { console.error('[Boot] Internal audit seed/migration failed:', err.message); }

// بازدید میدانی مدیریتی (واکراند) + مصوبه‌ها (پس از seed-library به‌خاطر grantPerms مشترک)
try { require('../database/seed-walkarounds').runMigration(); }
catch (err) { console.error('[Boot] Walkaround seed/migration failed:', err.message); }

// رجیستری فرآیندها / فلوچارت فرآیند (پس از seed-library به‌خاطر grantPerms مشترک)
try { require('../database/seed-processes').runMigration(); }
catch (err) { console.error('[Boot] Process registry migration failed:', err.message); }

// نشان‌ها و گواهینامه‌ها (پس از seed-library به‌خاطر grantPerms مشترک)
try { require('../database/seed-certifications').runMigration(); }
catch (err) { console.error('[Boot] Certification seed/migration failed:', err.message); }

// اقلام و نگهداشت دوره‌ای — محورهای الف-۶ و الف-۷ (بعد از seed-library، مثل بالا)
try { require('../database/seed-facility-assets').runMigration(); }
catch (err) { console.error('[Boot] FacilityAssets seed/migration failed:', err.message); }

// مدیریت دارویی — محور ب-۶
try { require('../database/seed-pharmacy').runMigration(); }
catch (err) { console.error('[Boot] Pharmacy seed/migration failed:', err.message); }

// مدیریت خطر حوادث و بلایا — محور الف-۲
try { require('../database/seed-disaster-safety').runMigration(); }
catch (err) { console.error('[Boot] DisasterSafety seed/migration failed:', err.message); }

// سلامت حرفه‌ای و بهداشت کار — الف-۳-۵/۶/۷ (پس از seed-library به‌خاطر grantPerms مشترک)
try { require('../database/seed-occupational-health').runMigration(); }
catch (err) { console.error('[Boot] OccHealth seed/migration failed:', err.message); }

// ارزیابی و توسعه‌ی کارکنان — الف-۳-۱/۲-۳/۳/۴-۲ و الف-۴-۱-۱/۲/۳
try { require('../database/seed-hr-development').runMigration(); }
catch (err) { console.error('[Boot] HRDev seed/migration failed:', err.message); }

// پیمانکاران و تأمین‌کنندگان — الف-۱-۱۰
try { require('../database/seed-vendors').runMigration(); }
catch (err) { console.error('[Boot] Vendors seed/migration failed:', err.message); }

// نظارت مدیریت پرستاری — الف-۴-۱-۴/۵ و الف-۴-۳-۲/۳/۴
try { require('../database/seed-nursing-supervision').runMigration(); }
catch (err) { console.error('[Boot] NursingSupervision seed/migration failed:', err.message); }

// منابع مالی و مشارکت‌های مردمی — الف-۱-۹-۱ و الف-۱-۹-۳
try { require('../database/seed-finance').runMigration(); }
catch (err) { console.error('[Boot] Finance seed/migration failed:', err.message); }

// بیمارمحوری و علت‌کاوی — الف-۱-۷-۴، الف-۱-۸-۶، الف-۱-۸-۷
try { require('../database/seed-patient-focus').runMigration(); }
catch (err) { console.error('[Boot] PatientFocus seed/migration failed:', err.message); }

// آموزش و اثربخشی — الف-۳-۲-۴ و الف-۴-۲-۳/۴/۵
try { require('../database/seed-education').runMigration(); }
catch (err) { console.error('[Boot] Education seed/migration failed:', err.message); }

// چهار سنجه‌ی پراکنده روی ماژول‌های موجود — الف-۱-۱-۲، الف-۱-۹-۴/۵/۷، الف-۳-۴-۴/۵
try { require('../database/seed-gap10').runMigration(); }
catch (err) { console.error('[Boot] Gap10 seed/migration failed:', err.message); }

// تعمیرِ «رعایت ← رضایت» در متنِ الف-۳-۴-۴ و الف-۳-۴-۵
try { require('../database/seed-measure-text-fix').runMigration(); }
catch (err) { console.error('[Boot] MeasureTextFix failed:', err.message); }

// پیشگیری و کنترل عفونت — محور ب-۵
try { require('../database/seed-infection-control').runMigration(); }
catch (err) { console.error('[Boot] InfectionControl seed/migration failed:', err.message); }

// طب انتقال خون و هموویژیلانس — محور ب-۹
try { require('../database/seed-blood-transfusion').runMigration(); }
catch (err) { console.error('[Boot] BloodTransfusion seed/migration failed:', err.message); }

// خدمات آزمایشگاه — محور ب-۸
try { require('../database/seed-laboratory').runMigration(); }
catch (err) { console.error('[Boot] Laboratory seed/migration failed:', err.message); }

// تصویربرداری و ایمنی پرتو — محور ب-۷
try { require('../database/seed-imaging').runMigration(); }
catch (err) { console.error('[Boot] Imaging seed/migration failed:', err.message); }

// عنوان استانداردهایی که به‌جای متن واقعی، کدِ خام نشان می‌دادند
try { require('../database/seed-standard-titles').runMigration(); }
catch (err) { console.error('[Boot] Standard title migration failed:', err.message); }

// اصلاح سلسله‌مراتب درخت سنجه‌ها + sort_order/icon (باید بعد از seed-sections-documents باشد)
try { require('../database/seed-demo-user-names').runMigration(); }
catch (err) { console.error('[Boot] Demo user rename migration failed:', err.message); }

try { require('../database/seed-role-management').runMigration(); }
catch (err) { console.error('[Boot] Role-management permission grant failed:', err.message); }

// عنوان نمایشی نقش admin: «ادمین سیستم» → «مدیر داخلی» (کد نقش و مجوزها بدون تغییر)
try { require('../database/seed-admin-role-rename').runMigration(); }
catch (err) { console.error('[Boot] Admin role label rename failed:', err.message); }

// دسترسی موردی کاربر↔سنجه + دسترسی فقط‌خواندنی نقش «پرستار»
try { require('../database/seed-measure-overrides').runMigration(); }
catch (err) { console.error('[Boot] Measure override migration failed:', err.message); }

// کارتابل شخصی + کاربر جانشین
try { require('../database/seed-inbox').runMigration(); }
catch (err) { console.error('[Boot] Inbox/delegate migration failed:', err.message); }

// زمان‌بندی جلسات کمیته‌ها: اتاق جلسه + ستون‌های تقویم (بعد از seed-committees)
try { require('../database/seed-meetings').runMigration(); }
catch (err) { console.error('[Boot] Meeting scheduling migration failed:', err.message); }

// صورت‌جلسه‌ی کمیته طبق شش بندِ حداقلیِ الف-۱-۵-۲ (بعد از seed-committees)
try { require('../database/seed-committee-minutes').runMigration(); }
catch (err) { console.error('[Boot] Committee minutes migration failed:', err.message); }

// پیام‌های داخلی + میانبرهای شخصی — بعد از seed-inbox و seed-meetings، چون
// related_meeting_event_id به calendar_events (ستون‌های جلسه) ارجاع می‌دهد
try { require('../database/seed-messages').runMigration(); }
catch (err) { console.error('[Boot] Internal messages/shortcuts migration failed:', err.message); }

try { require('../database/seed-section-tree-fix').runMigration(); }
catch (err) { console.error('[Boot] Section tree fix migration failed:', err.message); }

// یک رکورد «نمونه/الگو» به ازای هر ماژول و هر بیمارستان — باید آخرین seed باشد چون به
// جدول‌های همه‌ی ماژول‌های بالا (و به کمیته‌های seed شده) وابسته است.
// اگر کاربر نمونه را حذف کند دوباره ساخته نمی‌شود (example_seed_log).
try { require('../database/seed-examples').runMigration(); }
catch (err) { console.error('[Boot] Example/template record seed failed:', err.message); }

// نام‌گذاری دوباره‌ی بیمارستان‌ها (حذف نام دموی ساختگی) — باید بعد از seed-committees باشد
try { require('../database/seed-hospital-rename').runMigration(); }
catch (err) { console.error('[Boot] Hospital rename migration failed:', err.message); }

// پروفایل بیمارستان — پشتوانه‌ی ویزارد «راه‌اندازی اولیه» در اولین ورود
try { require('../database/seed-hospital-profile').runMigration(); }
catch (err) { console.error('[Boot] Hospital profile migration failed:', err.message); }

// برنامه‌های بهبود/عملیاتی/استراتژیک (بعد از seed-library به‌خاطر grantPerms مشترک)
try { require('../database/seed-programs').runMigration(); }
catch (err) { console.error('[Boot] Improvement program migration failed:', err.message); }

// کارت امتیازی متوازن (BSC) — دو ستون روی hospital_kpis + مقادیر ماهانه
try { require('../database/seed-bsc').runMigration(); }
catch (err) { console.error('[Boot] BSC migration failed:', err.message); }

// شناسنامه‌ی کامل شاخص + ۶۱ شاخص استاندارد — حتماً *بعد* از seed-bsc، چون
// ستون‌ها را روی hospital_kpis و bsc_monthly_values اضافه می‌کند و آن دو را
// seed-bsc می‌سازد.
try { require('../database/seed-indicators').runMigration(); }
catch (err) { console.error('[Boot] Indicators migration failed:', err.message); }

// هدف و مقدارِ نمونه برای شاخص‌ها. بدون این، ۶۱ شاخص از ۷۱ نه هدف داشتند نه
// داده، و داشبورد/نمودار/گزارش هر سه خالی بالا می‌آمدند. فقط جای خالی را پر
// می‌کند و مقدارِ ثبت‌شده را دست نمی‌زند؛ ردیف‌هایش هم برچسبِ «داده‌ی نمونه»
// دارند تا با اندازه‌گیریِ واقعی اشتباه نشوند و یک‌جا پاک‌شدنی باشند.
try { require('../database/seed-indicator-values').runMigration(); }
catch (err) { console.error('[Boot] Indicator values seed failed:', err.message); }

// چرخه‌ی عدم انطباق و اقدام اصلاحی روی سنجه — دومین شکافِ سندِ مرجع
try { require('../database/seed-corrective-actions').runMigration(); }
catch (err) { console.error('[Boot] Corrective actions migration failed:', err.message); }

// ساختار سازمانی (گروه شغلی/واحد/پست/ساختمان) — بعد از seed-programs، چون به
// improvement_programs ستون org_unit_id اضافه می‌کند
try { require('../database/seed-org-structure').runMigration(); }
catch (err) { console.error('[Boot] Org structure migration failed:', err.message); }

// سه حوزه‌ی کلان سازمانی (مدیریت/پرستاری/پشتیبانی) — لایه‌ی اول، مستقل از org_units بالا
try { require('../database/seed-org-divisions').runMigration(); }
catch (err) { console.error('[Boot] Org divisions migration failed:', err.message); }

// زیرساختار حوزه‌ی پرستاری (سوپروایزرها/بخش‌ها) — بعد از seed-org-divisions، همان لایه را ادامه می‌دهد
try { require('../database/seed-nursing-hierarchy').runMigration(); }
catch (err) { console.error('[Boot] Nursing hierarchy migration failed:', err.message); }

// زیرساختار حوزه‌ی مدیریت (پست‌های نام‌دار: مدیر بیمارستان/مدیر بهبود کیفیت/مسئول فنی و…) —
// بعد از seed-org-divisions، همان لایه را ادامه می‌دهد (شبیه seed-nursing-hierarchy)
try { require('../database/seed-management-hierarchy').runMigration(); }
catch (err) { console.error('[Boot] Management hierarchy migration failed:', err.message); }

// پست‌های تازه‌ی نمودار سازمانی یکپارچه (مالی/منابع‌انسانی/تغذیه/بهداشت حرفه‌ای/بهداشت محیط) —
// افزودنی روی همان جدول management_position_slots، بعد از seed-management-hierarchy
try { require('../database/seed-org-chart-positions').runMigration(); }
catch (err) { console.error('[Boot] Org chart positions migration failed:', err.message); }

// تکمیل نمودار سازمانی «بیمارستان یک» با کاربران دمو (اسلات‌های خالی مدیریت/سوپروایزر/بخش) —
// بعد از seed-org-chart-positions و seed-nursing-hierarchy چون به هر دو جدول وابسته است
try { require('../database/seed-hospital-one-org-chart').runMigration(); }
catch (err) { console.error('[Boot] Hospital one org chart migration failed:', err.message); }

// نیازسنجی آموزشی (کاربر → مافوق → سازمان) — بعد از seed-library به‌خاطر grantPerms مشترک
try { require('../database/seed-training').runMigration(); }
catch (err) { console.error('[Boot] Training needs migration failed:', err.message); }

// داشبورد سرپرستار/جانشین بخش (حضور‌غیاب، مرخصی، چک‌لیست شیفت) — بعد از seed-nursing-hierarchy
// چون به nursing_wards.head_nurse_id/deputy1_id/deputy2_id وابسته است
try { require('../database/seed-head-nurse').runMigration(); }
catch (err) { console.error('[Boot] Head nurse dashboard migration failed:', err.message); }


// پرسنل بخش و برنامه‌ی ماهانه‌ی شیفت (M/E/N/مرخصی) — منطق از فایل اکسل کارفرما
try { require('../database/seed-shift-schedule').runMigration(); }
catch (err) { console.error('[Boot] Shift schedule migration failed:', err.message); }

// حضورِ شیفتی و گزارشِ ۲۴ ساعته — بعد از seed-shift-schedule چون به ward_staff
// (روسترِ برنامه‌ی شیفت) کلید خارجی دارد
try { require('../database/seed-shift-attendance').runMigration(); }
catch (err) { console.error('[Boot] Shift attendance migration failed:', err.message); }


// دوره‌ی سراسری اعتباربخشی (بازه‌ی رسمی ورود اطلاعات، سیاست سطح بیمارستان)
try { require('../database/seed-accreditation-period').runMigration(); }
catch (err) { console.error('[Boot] Accreditation period migration failed:', err.message); }

// نظرسنجی رضایت بیمار (فرم عمومی) + ستون source روی گزارش خطا و شکایات
try { require('../database/seed-satisfaction').runMigration(); }
catch (err) { console.error('[Boot] Satisfaction migration failed:', err.message); }

// تاریخ بازبینی بعدی مدارک کنترل‌شده — بعد از seed-documents
try { require('../database/seed-doc-review-date').runMigration(); }
catch (err) { console.error('[Boot] Document review-date migration failed:', err.message); }

// امضای الکترونیکی — بعد از seed-documents، چون ستون signature_image را به document_signoffs اضافه می‌کند
try { require('../database/seed-signatures').runMigration(); }
catch (err) { console.error('[Boot] Electronic signature migration failed:', err.message); }

// پرونده‌ی الکترونیکی شواهد (سنجه/حسابرسی/مصوبه‌ی واکراند) — جدول مستقل، بدون وابستگی
try { require('../database/seed-evidence-files').runMigration(); }
catch (err) { console.error('[Boot] Evidence files migration failed:', err.message); }

// ریمایندرهای خودکار — بعد از seed-doc-review-date و seed-accreditation-period،
// چون قوانین پیش‌فرض روی همان ستون/جدول‌ها حساب می‌کنند
try { require('../database/seed-reminders').runMigration(); }
catch (err) { console.error('[Boot] Reminder migration failed:', err.message); }

// سناریوی تست «بیمارستان سوم» — ساخت بیمارستان + ادمین + سه ماه فعالیت واقعی (اسناد/کمیته/
// سنجه/نمودار سازمانی با برچسب‌های عمومی سمت). باید بعد از seed-committees، seed-org-structure،
// seed-org-divisions، seed-nursing-hierarchy، seed-management-hierarchy، seed-org-chart-positions،
// seed-documents، seed-meetings، seed-accreditation-period و seed-hospital-profile باشد چون از
// جداول همه‌ی آن‌ها استفاده می‌کند (و خودش هم آن migration ها را برای بیمارستان تازه صدا می‌زند).
try { require('../database/seed-hospital-three-scenario').runMigration(); }
catch (err) { console.error('[Boot] Hospital-three scenario migration failed:', err.message); }

// نقش‌های واقعی پست‌های مدیریتی (ریاست، مسئول فنی، مالی، منابع انسانی و ...) و انتقال
// کاربرِ هر پست از staff_nurse به نقش درست خودش. باید بعد از seed سناریو باشد چون آن
// فایل است که کاربرهای پست‌ها را می‌سازد.
try { require('../database/seed-management-roles').runMigration(); }
catch (err) { console.error('[Boot] Management roles migration failed:', err.message); }

// مجوزهای افزودنی CRM/جراحی‌ایمن/پسماند روی نقش‌های پایه — افزایشی است و باید بعد
// از seed-management-roles باشد (وگرنه بازنویسی آن را خنثی می‌کرد؛ ensureRoles هم
// از این به بعد ادغام می‌کند نه بازنویسی).
try { require('../database/seed-crm-roles').run(); }
catch (err) { console.error('[Boot] CRM roles migration failed:', err.message); }

// بیمارستان شماره ۳ (مرکز آموزشی، درمانی و تخصصی شماره ۳) با داده‌های واقعی ناشناس‌شده ۱۴۰۳
// باید بعد از seed-management-roles باشد تا نقش‌های مدیریتی آماده باشند
// try { require('../database/seed-hospital3-real1403').runMigration(); }
// catch (err) { console.error('[Boot] Hospital3 real1403 migration failed:', err.message); }

// ده نظرسنجی رضایت نمونه — بعد از سناریوی بالا، چون به بیمارستانِ نمونه‌ی همان فایل
// و به جدولی که seed-satisfaction می‌سازد وابسته است.
try { require('../database/seed-satisfaction-samples').runMigration(); }
catch (err) { console.error('[Boot] Satisfaction samples migration failed:', err.message); }

// ترمیم متنِ آسیب‌دیده‌ی کتاب سنجه‌ها (استخراج معیوب از PDF). باید بعد از
// seed سنجه‌ها باشد و idempotent است — بار دوم صفر ردیف عوض می‌کند.
try { require('../database/seed-repair-measure-text').runMigration(); }
catch (err) { console.error('[Boot] Measure text repair failed:', err.message); }

// «مسئول اجرای هر سنجه» (ستون responsible_role). این migration فقط در اسکریپت
// init-db بود و در دستور استارت production نبود — یعنی روی هر نصب تازه ستون
// ساخته نمی‌شد و مسئولِ همه‌ی سنجه‌ها «—» نشان داده می‌شد. باید بعد از seed
// سنجه‌ها باشد؛ idempotent است و نتیجه‌اش هر بار یکی است.
try { require('../database/migrate-roles').runMigration(); }
catch (err) { console.error('[Boot] Responsible-role migration failed:', err.message); }

// وضعیت پنجم سنجه: «غیرقابل ارزیابی» (ستون na_reason).
try { require('../database/seed-measure-na').runMigration(); }
catch (err) { console.error('[Boot] Measure NA migration failed:', err.message); }

// دوره‌ای کردن وضعیت سنجه‌ها (ستون year + کلید یکتای سه‌تایی). باید *بعد از*
// migration بالا باشد: جدول را بازمی‌سازد و ستون na_reason را هم کپی می‌کند،
// پس روی پایگاه‌داده‌ی تازه باید آن ستون از قبل وجود داشته باشد.
try { require('../database/seed-measure-status-year').runMigration(); }
catch (err) { console.error('[Boot] Measure status year migration failed:', err.message); }

// روش ارزیابی هر سنجه (مستندات/مشاهده/مصاحبه). باید بعد از seed سنجه‌ها باشد؛
// فقط ردیف‌های تأییدنشده را دوباره استنتاج می‌کند.
try { require('../database/seed-eval-methods').runMigration(); }
catch (err) { console.error('[Boot] Eval-method migration failed:', err.message); }

// سه قضاوت مستقل روی هر سنجه (خودارزیابی / ارزیابی داخلی / ارزیابی بیرونی).
// باید *بعد از* migration دوره‌ای‌شدن باشد، چون آن یکی جدول را با فهرست ستونِ
// صریح بازمی‌سازد و ستون‌های اینجا را نمی‌شناسد.
try { require('../database/seed-measure-three-scores').runMigration(); }
catch (err) { console.error('[Boot] Measure three-score migration failed:', err.message); }

// چارت سلسله‌مراتبیِ سمت‌ها — ترتیب کارت‌های صفحه‌ی ورود. باید بعد از ساخته‌شدن
// نقش‌ها باشد؛ ردیف‌هایی که سوپرادمین دستی مرتب کرده را دست نمی‌زند.
try { require('../database/seed-role-hierarchy').runMigration(); }
catch (err) { console.error('[Boot] Role hierarchy migration failed:', err.message); }

// تصدی سمت‌ها (چه کسی از کِی تا کِی) و فهرست ویرایشگران مجاز فرم‌ها.
// باید بعد از ساخته‌شدن کاربران و نقش‌ها باشد.
try { require('../database/seed-tenure-and-editors').runMigration(); }
catch (err) { console.error('[Boot] Tenure/editors migration failed:', err.message); }

// داده‌ی نمایشی شش‌ماهه با دو بار جابه‌جایی متصدی هر سمت — باید بعد از
// seed-tenure-and-editors باشد چون جدول role_tenures را همان می‌سازد، و بعد از
// seed-examples چون به وجودداشتنِ activity_types و کاربر فعلی هر سمت وابسته است.
try { require('../database/seed-six-month-demo').runMigration(); }
catch (err) { console.error('[Boot] Six-month demo data seed failed:', err.message); }

// دستیار هوشمند «دانا» — جدول‌های گفت‌وگو، بانک دانش، و تنظیمات هر بیمارستان
try { require('../database/seed-assistant').runMigration(); }
catch (err) { console.error('[Boot] Assistant migration failed:', err.message); }

// پیگیری بیمار و مادر باردار — مرحله‌ی ۶ نقشه‌راه نسخه‌ی ۲
try { require('../database/seed-patient-followup').runMigration(); }
catch (err) { console.error('[Boot] Patient-followup migration failed:', err.message); }

// نمونه‌ی کاملِ سه‌ماهه‌ی اول (شاخص ماهانه، جلسه و صورت‌جلسه، برنامه‌ی بهبود، نیازسنجی
// آموزشی، گزارش خطا، واکراند، اجرای چک‌لیست، شکایت، وظیفه، فرایند). باید بعد از سناریوی
// بیمارستان نمونه و بعد از نقش‌های مدیریتی باشد چون به دوره‌ی فعال، شاخص‌ها، کمیته‌ها و
// کاربرانِ ساخته‌شده‌ی آن‌ها تکیه می‌کند.
try { require('../database/seed-quarter-one-sample').seedQuarterOneSample(); }
catch (err) { console.error('[Boot] Quarter-one sample seed failed:', err.message); }

// عمق‌دادن به همان سه‌ماهه: کارتابل، داشبورد سرپرستار، فعالیت‌ها، شاخص‌های
// بیشتر، نظرسنجی داخلی، مصوبه‌های واکراند و … . بعد از seed-q1 اجرا می‌شود.
try { require('../database/seed-quarter-one-depth').seedQuarterOneDepth(); }
catch (err) { console.error('[Boot] Quarter-one depth seed failed:', err.message); }

// پرکردن بازه‌ی بهمن ۱۴۰۳ تا شهریور ۱۴۰۵ برای فرم‌هایی که فقط داده‌ی ۱۴۰۵ داشتند
// (برنامه‌ی بهبود، ممیزی، خطا، FMEA، واکراند، شکایت، پیشنهاد، رضایت‌سنجی، پیگیری
// بیمار، گزارش شیفت، مرخصی، صورت‌جلسه). بعد از seed-q1-depth چون روی همان جدول‌ها
// می‌نویسد و فقط ماه‌های خالی را پر می‌کند.
try { require('../database/seed-range-fill').runMigration(); }
catch (err) { console.error('[Boot] Range fill seed failed:', err.message); }

// لوگوی بیمارستان نمونه — SVG مخزن را به WebP تبدیل و روی همان مرکز ست می‌کند
try { require('../database/seed-hospital-logo').seedHospitalLogo(); }
catch (err) { console.error('[Boot] Hospital logo seed failed:', err.message); }

// پاک‌سازی رکوردهای آزمایشی با متن فارسیِ نابودشده («????») — باید بعد از همه‌ی
// seed‌ها باشد تا اگر seedی چنین رکوردی ساخت هم پاک شود. جزئیات در خود فایل.
try { require('../database/seed-cleanup-mangled-text').runMigration(); }
catch (err) { console.error('[Boot] Mangled-text cleanup failed:', err.message); }

// شرح وظایف قانونی هر سمت (منبع: دانشگاه علوم پزشکی ایران) — جدا از وظایف
// دوره‌ای که role-duties.js می‌دهد. جدولش قابل ویرایش است تا هر مرکز بتواند
// نسخه‌ی خودش را ثبت کند.
try { require('../database/seed-legal-duties').runMigration(); }
catch (err) { console.error('[Boot] Legal duties migration failed:', err.message); }

// تنظیمات سراسری پلتفرم — فعلاً فقط «پسورد اجباری» برای ورود سریع با کلیک روی سمت
try { require('../database/seed-platform-settings').runMigration(); }
catch (err) { console.error('[Boot] Platform settings migration failed:', err.message); }

// ضریب وزنی سطح سنجه — در platform_settings ذخیره می‌شود، پس باید *بعد از*
// ساخته‌شدن آن جدول باشد. (این ترتیب را تست روی پایگاه‌داده‌ی خالی پیدا کرد:
// روی نصب تازه، جدول هنوز وجود نداشت و migration بی‌صدا شکست می‌خورد.)
try { require('../database/seed-scoring-weights').runMigration(); }
catch (err) { console.error('[Boot] Scoring weights migration failed:', err.message); }

// فیلدهای اختیاری پروفایل شخصی کاربر (جنسیت/عکس/بیو/نحوه تماس) + سوییچ سراسری فعال‌سازی
try { require('../database/seed-user-profile-fields').runMigration(); }
catch (err) { console.error('[Boot] User profile fields migration failed:', err.message); }

// راهنمای مسیر اعتباربخشی (سال شروع + گام‌های واقعی مشتق از داده)
try { require('../database/seed-guide-timeline').runMigration(); }
catch (err) { console.error('[Boot] Guide timeline migration failed:', err.message); }

// لاگ اقدامات سوپرادمین در سطح پلتفرم (بکاپ/بازگردانی و مشابه)
try { require('../database/seed-super-audit').runMigration(); }
catch (err) { console.error('[Boot] Super audit migration failed:', err.message); }

// لاگ خطاهای سرور — برای پنل سوپرادمین (میان‌افزار خطا در انتهای این فایل از این جدول استفاده می‌کند)
try { require('../database/seed-error-log').runMigration(); }
catch (err) { console.error('[Boot] Error log migration failed:', err.message); }

// ایندکس‌های عملکردی روی hospital_id برای جدول‌هایی که مستقیم با این ستون کوئری می‌شوند
// اما در migrate-sqlite.js جا افتاده بودند (audit_log/committees/roles/... ) — باید آخر باشد
// چون به وجود همه‌ی جدول‌های بالا وابسته است (idempotent، اگر جدولی نبود بی‌خطر رد می‌شود)
try { require('../database/seed-perf-indexes').runMigration(); }
catch (err) { console.error('[Boot] Performance index migration failed:', err.message); }

// برنامه‌ی نمونه‌ی شیفت برای همه‌ی بخش‌ها + دفتر پرستاری — عمداً آخرینِ زنجیره.
// روی یک دیتابیسِ کاملاً خالی با بوتِ واقعی دیده شد که بخش‌های پرستاری را
// seed-hospital-three-scenario می‌سازد و آن *بعد از* جای قبلیِ این سید بود؛
// نتیجه‌اش این می‌شد که فقط دفتر پرستاری نمونه می‌گرفت و دوازده بخش خالی
// می‌ماندند. این‌جا هر چیزی که لازم دارد قطعاً ساخته شده است.
// idempotent است: بخشی که از قبل پرسنل دارد دست‌نخورده رد می‌شود، پس روی
// دیتابیسِ واقعیِ مشتری چیزی نمی‌ریزد.
try { require('../database/seed-shift-sample').runMigration(); }
catch (err) { console.error('[Boot] ShiftSample seed failed:', err.message); }

// داده‌ی نمونه‌ی ماژول‌های تازه — عمداً **آخرینِ زنجیره**، بعد از
// seed-hospital-three-scenario و seed-shift-sample.
//
// یک بوتِ واقعی روی دیتابیسِ خالی نشان داد جای قبلی‌شان (وسطِ زنجیره) دو
// اشکال داشت و هر دو ساکت بودند:
//
//  ۱) این سیدها روی «بیمارستان پیش‌فرض» می‌نشستند، و
//     seed-hospital-three-scenario چند خط بعد همان بیمارستان را حذف می‌کرد.
//     با ON DELETE CASCADE کلِ داده‌ی نمونه هم می‌رفت — لاگ «۱۲ رکورد» می‌گفت
//     ولی جدول در پایانِ بوت صفر بود.
//  ۲) سیدِ حضورِ شیفتی روسترش را از shift_entries می‌خواند و آن را
//     seed-shift-sample می‌سازد که پایین‌تر بود؛ پس حضور همیشه صفر می‌ماند.
//
// نتیجه: روی هر سرورِ تازه، صفحه‌های سلامت حرفه‌ای، مالی، بیمارمحوری و آموزش
// با صفرِ قرمز بالا می‌آمدند — دقیقاً همان چیزی که این سیدها برای جلوگیری‌اش
// نوشته شده بودند. دیده نشده بود چون نمایش همیشه با demo-restore بالا می‌آمد.
//
// هر سه idempotent‌اند و فقط جدولِ خالیِ همان بیمارستان را پر می‌کنند، پس
// روی داده‌ی واقعیِ مشتری نمی‌نشینند.
// ---------------------------------------------------------------------
try { require('../database/seed-occhealth-shift-sample').runMigration(); }
catch (err) { console.error('[Boot] OccHealth/Shift sample failed:', err.message); }

try { require('../database/seed-finance-pf-sample').runMigration(); }
catch (err) { console.error('[Boot] Finance/PF sample failed:', err.message); }

try { require('../database/seed-education-gap10-sample').runMigration(); }
catch (err) { console.error('[Boot] Education/Gap10 sample failed:', err.message); }

// جداول Unified Copilot (سه پرسونا یکپارچه) — بعد از assistant knowledge
try { require('../database/seed-copilot-tables').runMigration(); }
catch (err) { console.error('[Boot] Copilot tables migration failed:', err.message); }

// چهار ماژول بالینی جدید (Morse/Braden/Critical Values/ADR/HSI)
try { require('../database/seed-clinical-modules').runMigration(); }
catch (err) { console.error('[Boot] Clinical modules migration failed:', err.message); }

// CRM بالینی + ستون‌های Never-Event روی medical_error_reports (وگرنه safety-dashboard ۵۰۰ می‌دهد)
try { require('../database/migrate-clinical-crm').runMigration(); }
catch (err) { console.error('[Boot] Clinical-CRM migration failed:', err.message); }

// Gap Analysis (تحلیل شکاف ۵۲۰ سنجه)
try { require('../database/seed-gap-analysis').runMigration(); }
catch (err) { console.error('[Boot] Gap analysis migration failed:', err.message); }

// خط‌مشی‌ها و دستورالعمل‌های استاندارد رهبری و مدیریت
try { require('../database/seed-leadership-policies').runSeed(); }
catch (err) { console.error('[Boot] Leadership policies seed failed:', err.message); }
try { require('../database/seed-leadership-instructions').runSeed(); }
catch (err) { console.error('[Boot] Leadership instructions seed failed:', err.message); }

// دستورالعمل‌ها، خط‌مشی‌ها و چک‌لیست‌های استاندارد بخش‌های بالینی (کنترل عفونت، آزمایشگاه، بانک خون، تصویربرداری و ترخیص)
try { require('../database/seed-clinical-accreditation-instructions').runSeed(); }
catch (err) { console.error('[Boot] Clinical accreditation instructions seed failed:', err.message); }

// دستورالعمل‌ها، روش‌های اجرایی (SOPs) اورژانس، جراحی، تغذیه و بالینی عمومی
try { require('../database/seed-emergency-surgery-clinical-instructions').runSeed(); }
catch (err) { console.error('[Boot] Emergency and clinical SOPs seed failed:', err.message); }

// دستورالعمل‌ها، خط‌مشی‌ها و SOPهای حقوق گیرنده خدمت، مراقبت بالینی و خدمات سرپایی (دسته ۴۰ تایی استخراج‌شده از ۵۴۴ اسکرین‌شات)
try { require('../database/seed-patient-rights-and-outpatient-docs').runSeed(); }
catch (err) { console.error('[Boot] Patient rights and outpatient docs seed failed:', err.message); }

// اقلام استاندارد کتابخانه دیجیتال (پمفلت‌ها، کتابچه‌ها، فرم‌های ابلاغی، آیین‌نامه‌ها، جزوه‌ها)
try { require('../database/seed-digital-library-enrichment').runSeed(); }
catch (err) { console.error('[Boot] Digital library enrichment seed failed:', err.message); }

// تصحیح عناوین کامل استانداردهای الف-3-2، ب-1-1 و ج-1-6 طبق کتاب اعتباربخشی ملی
try { require('../database/seed-standards-titles-fix').runMigration(); }
catch (err) { console.error('[Boot] Standards titles fix seed failed:', err.message); }

// تاریخچه تغییرات وضعیت سنجه — برای نمودار روند و مقایسه بین دوره‌ها (چک‌لیست کمبود مورد ۷ و ۱۵)
try { require('../database/seed-measure-history').runMigration(); }
catch (err) { console.error('[Boot] MeasureHistory migration failed:', err.message); }

// داده نمونه ۳ ماژول + ۲۸ نوع خطا (موارد ۳۷ و ۳۹)
try { require('../database/seed-sample-hr-vendors-nsup').runMigration(); }
catch (err) { console.error('[Boot] Sample3 migration failed:', err.message); }
try { require('../database/seed-never-events-28').runMigration(); }
catch (err) { console.error('[Boot] ErrorTypes28 migration failed:', err.message); }
try { require('../database/seed-notifications').runMigration(); }
catch (err) { console.error('[Boot] Notifications migration failed:', err.message); }
try { require('../database/seed-md-formulary').runMigration(); }
catch (err) { console.error('[Boot] MD-Formulary migration failed:', err.message); }
try { require('../database/seed-md-documents').runMigration(); }
catch (err) { console.error('[Boot] MD-Documents migration failed:', err.message); }
try { require('../database/seed-md2-formulary').runMigration(); }
catch (err) { console.error('[Boot] MD2-Formulary migration failed:', err.message); }
try { require('../database/seed-md2-content').runMigration(); }
catch (err) { console.error('[Boot] MD2-Content migration failed:', err.message); }
try { require('../database/seed-md3-final').runMigration(); }
catch (err) { console.error('[Boot] MD3-Final migration failed:', err.message); }
// استخراج کامل آرشیو md (۲۸۵۹ سند یکتای OCRشده از بیمارستان واقعی). idempotent:
// کنترل وجود با doc_code=MDX-xxxx، پس اجرای مجدد هیچ تغییری ایجاد نمی‌کند.
// این سید فقط زمانی اجرا می‌شود که پوشه md در دسترس باشد (MD_DIR یا ../../md).
try { require('../database/seed-md-full').runMigration(); }
catch (err) { console.error('[Boot] MD-Full migration failed:', err.message); }

// غنی‌سازی جامع داده‌های مدیریت بیمارستان (پسماند، HVA و مانورهای بلایا، ارزیابی پیمانکاران، PM تجهیزات، سوپروایزری ۲۴ ساعته)
try { require('../database/seed-enterprise-management-enrichment').runMigration(); }
catch (err) { console.error('[Boot] Enterprise management enrichment seed failed:', err.message); }

// تفکیک شماره نسخه و شماره ویرایش (نسخه اولیه تا ویرایش ۲۰) در اسناد، فرآیندها و فرم‌ها
try { require('../database/migrate-document-revisions').runMigration(); }
catch (err) { console.error('[Boot] Document revisions migration failed:', err.message); }

// اسلایدها و داده‌های جامع ۶۷ شاخص عملکردی و بالینی بیمارستان (پاورپوینت و اکسل‌های توکار ۱۴۰۴-۱۴۰۵)
try { require('../database/seed-indicator-slides').runMigration(); }
catch (err) { console.error('[Boot] Indicator slides migration failed:', err.message); }

// زمان‌بند فقط برای کانال‌های خروجی (ایمیل/پیامک). بدون پیکربندی، خودش اجرا نمی‌شود و
// هرگز throw نمی‌کند — اقلام درون‌برنامه‌ای در کارتابل محاسبه می‌شوند و مستقل از این‌اند.
try { require('./services/reminder-cron').startCron(); }
catch (err) { console.error('[Boot] Reminder cron start failed:', err.message); }

// بکاپ خودکار روزانه‌ی دیتابیس (بدون نیاز به یادآوری ادمین) — تعداد نسخه‌های باقی‌مانده قابل‌تنظیم با
// AUTO_BACKUP_KEEP_COUNT (پیش‌فرض ۱ نسخه)، فایل‌ها در database/backups/auto-YYYY-MM-DD.db
try { require('./services/backup-cron').startAutoBackup(); }
catch (err) { console.error('[Boot] Auto-backup cron start failed:', err.message); }

// چک‌پوینت خودکار WAL (مورد ۳۵) — جلوگیری از رشد بی‌رویه فایل -wal
try {
  const { db } = require('./config/database-sqlite');
  require('./services/wal-checkpoint').startWalCheckpoint(db);
} catch (err) { console.error('[Boot] WAL checkpoint start failed:', err.message); }

// ساعتِ مرجع. مرورگرِ کاربر «حالا» را از ساعتِ خودِ دستگاه می‌خواند و اگر آن ساعت
// اشتباه باشد (یا منطقه‌ی زمانی غلط باشد)، هر محاسبه‌ی «امروز» در رابط کاربری خطا
// می‌خورد. فرانت این پاسخ را یک‌بار می‌گیرد و اختلافِ ساعتِ خودش با سرور را نگه می‌دارد.
// بدون ورود و بی‌هزینه است — عمداً پیش از app.use('/api', …) ثبت شده تا از میان‌افزار
// احراز هویت رد نشود.
app.get('/api/server-time', (req, res) => {
  const { tehranNow, tehranTodayStr, todayJalali, JMONTHS } = require('./config/jalali');
  const t = tehranNow();   // Date‌ای که گِتِرهای UTC آن ساعتِ دیواری تهران را می‌دهند
  const j = todayJalali();
  res.set('Cache-Control', 'no-store');
  res.json({
    utc: new Date().toISOString(),
    epoch_ms: Date.now(),
    tehran_date: tehranTodayStr(),                       // میلادیِ امروزِ تهران، YYYY-MM-DD
    tehran_time: `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`,
    jalali: { jy: j.jy, jm: j.jm, jd: j.jd, month_name: JMONTHS[j.jm - 1] },
  });
});

// اطلاعات تماس سایت عمومی. از متغیر محیطی می‌آید تا هر استقرار نشانی خودش را داشته
// باشد؛ قبلاً support@example.com در سورس هاردکد بود و تنها راه تماس در کل سایت هم
// همان بود — بازدیدکننده‌ی تازه از روی همان قضاوت می‌کرد که محصول آماده نیست.
// اگر چیزی ست نشده باشد، فرانت کل بخش تماس را پنهان می‌کند (بهتر از نشان‌دادن نشانی الکی).
// عمداً زیر /api/public/ نیست: آن مسیر محدودکننده‌ی سخت‌گیرانه‌ی فرم‌های عمومی را دارد
// (۲۰ درخواست در ۱۵ دقیقه) که برای ارسال فرم درست است ولی برای یک GET که با هر بار
// بازشدن صفحه‌ی اول صدا زده می‌شود، بازدیدکننده‌ها را بی‌دلیل می‌بست.
app.get('/api/site-contact', (req, res) => {
  res.json({
    email: process.env.SUPPORT_EMAIL || null,
    phone: process.env.SUPPORT_PHONE || null,
  });
});

// بررسی سلامت برای مانیتورینگ uptime (لوازم‌بالانسر/systemd/docker HEALTHCHECK). بدون ورود، بدون
// هزینه‌ی احراز هویت — عمداً پیش از app.use('/api', …) ثبت شده. یک کوئری سبک SELECT 1 هم می‌زند
// تا واقعاً اتصال دیتابیس را تست کند، نه فقط اینکه process بالاست.
const pkg = require('../package.json');
app.get('/healthz', (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const { query } = require('./config/database-sqlite');
    query('SELECT 1');
    res.json({ status: 'ok', uptime_seconds: Math.round(process.uptime()), version: pkg.version, env: config.env });
  } catch (err) {
    res.status(503).json({ status: 'error', error: 'اتصال دیتابیس برقرار نیست' });
  }
});

app.get('/api/version', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ name: pkg.name, version: pkg.version, node: process.version, env: config.env });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/super', require('./routes/super'));
app.use('/api/entry', require('./routes/entry'));
app.use('/api/copilot', require('./routes/copilot'));
app.use('/api/clinical', require('./routes/clinical'));
app.use('/api', require('./routes/directives'));   // ابلاغیه و دستور + جوابیه
app.use('/api', require('./modules'));
app.use('/api', require('./routes/export'));  // خروجی xlsx + تاریخچه سنجه (چک‌لیست کمبود مورد ۱۳/۷/۱۵)
app.use('/api', require('./routes/notifications'));  // اعلان داخل اپ (مورد ۱۱)

// درگاه‌های عمومی — نشانی‌های تمیز و قابل QR، بدون ورود و بدون بارگذاری پوسته‌ی SPA.
// همه‌ی ثبت‌ها روی /api/public/* انجام می‌شود که محدودکننده‌ی نرخ فرم‌های عمومی روی آن اعمال است.
const PUBLIC_PAGES = {
  'services': 'services-public.html',        // فهرست خدمات همگانی یک بیمارستان
  'fmea': 'fmea-public.html',                // عوامل تهدید کننده ایمنی بیمار
  'error-report': 'error-report-public.html',// گزارش خطا و وقایع ناخواسته
  'complaint': 'complaint-public.html',      // انتقادات، پیشنهادها و تقدیر
  'satisfaction': 'satisfaction-public.html',// نظرسنجی رضایت بیمار (پرسشنامه رسمی)
};
Object.entries(PUBLIC_PAGES).forEach(([slug, file]) => {
  app.get(`/public/${slug}/:hospitalId`, (req, res) => {
    res.sendFile(path.join(__dirname, '../public', file));
  });
});

const STATIC_ASSET_EXT = /\.(js|mjs|css|map|json|woff2?|ttf|otf|eot|png|jpe?g|gif|webp|avif|svg|ico|pdf|txt|xml|webmanifest)$/i;

// Serve SPA
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (STATIC_ASSET_EXT.test(req.path)) {
    return res.status(404).type('text/plain; charset=utf-8').send('یافت نشد');
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use((req, res) => res.status(404).json({ error: 'یافت نشد' }));

// میان‌افزار نهایی خطا — عمداً آخرین چیز ثبت‌شده روی app (بعد از همه‌ی route ها).
// پاسخی که به کاربر می‌رود همیشه پیام عمومی است؛ جزئیات واقعی (پیام + stack کوتاه‌شده)
// در جدول error_log ذخیره می‌شود تا فقط سوپرادمین از GET /api/super/error-log ببیند.
app.use((err, req, res, next) => {
  console.error('[App] Error:', err.message);
  let statusCode = 500;
  let userMessage = 'خطای داخلی سرور';
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) { statusCode = 400; userMessage = 'JSON نامعتبر'; }
  else if (err.code === 'LIMIT_FILE_SIZE') { statusCode = 400; userMessage = 'حجم فایل زیاد است'; }
  else if (err.name === 'ZodError' || err.name === 'ValidationError' || err.status === 400 || (err.message && err.message.includes('ساختار استاندارد فرم همخوانی ندارند'))) {
    statusCode = 400;
    userMessage = err.message || 'اطلاعات ارسالی نامعتبر است';
  }

  try {
    const { query } = require('./config/database-sqlite');
    const { uuid } = require('./utils/db');
    query(
      `INSERT INTO error_log (id, hospital_id, user_id, method, route, status_code, message, stack, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid(),
        req.user?.hospital_id || null,
        req.user?.id || null,
        req.method,
        req.originalUrl || req.path,
        statusCode,
        String(err.message || err).slice(0, 2000),
        String(err.stack || '').slice(0, 4000),
        req.ip || null,
      ]
    );
  } catch (logErr) {
    console.error('[App] Failed to persist error log:', logErr.message);
  }

  res.status(statusCode).json({ error: userMessage });
});

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log('============================================');
  console.log(`  Hospital Platform running on port ${config.port}`);
  console.log(`  URL: http://0.0.0.0:${config.port}`);
  console.log(`  Environment: ${config.env}`);
  console.log('============================================');
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });

module.exports = app;

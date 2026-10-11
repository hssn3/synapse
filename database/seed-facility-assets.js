/**
 * اقلام و نگهداشت دوره‌ای (تجهیزات پزشکی، تأسیسات، بهداشت محیط)
 * ---------------------------------------------------------------------
 * چرا یک ماژول مشترک و نه سه ماژول جدا:
 *
 * سه محورِ اعتباربخشی که هیچ ماژولی نداشتند — الف-۶ (بهداشت محیط)، الف-۷
 * (مدیریت تجهیزات پزشکی) و بخشی از الف-۲ — وقتی جمله‌به‌جمله خوانده شوند، همه
 * یک شکلِ داده‌ی یکسان می‌خواهند:
 *
 *     قلم  →  برنامه‌ی دوره‌ای (تناوب + سررسید)  →  ثبت اجرا (تاریخ + نتیجه)  →  اقدام اصلاحی
 *
 * الف-۷ می‌گوید «شناسنامه‌ی تجهیز» و «کالیبراسیون/نگهداشت پیشگیرانه‌ی دوره‌ای با
 * ثبت سوابق»؛ الف-۶ می‌گوید «پایش دوره‌ی آب/پسماند/آشپزخانه با ثبت نتیجه و اقدام
 * اصلاحی در صورت انحراف». اسمِ قلم فرق می‌کند، ولی چرخه یکی است. پس یک موتور
 * ساخته شد و نوعِ قلم (category) و نوعِ کار (kind) داده است، نه کد.
 *
 * نسبتش با جدول‌های موجود:
 *  - certifications قبلاً بود و «سند دارای انقضا» را پوشش می‌دهد (یک تاریخ، یک
 *    فایل). این‌جا دوباره ساخته نشد. چیزی که آن‌جا نیست و این‌جا هست: تناوبِ
 *    تکرارشونده و تاریخچه‌ی اجراها. یعنی certifications پاسخِ «مجوز معتبر داریم؟»
 *    است و این ماژول پاسخِ «برنامه‌ی دوره‌ای اجرا شده و سوابقش هست؟».
 *  - corrective actions در ماژول‌های دیگر هم هست؛ این‌جا عمداً یک فیلدِ متنی روی
 *    خودِ لاگ گذاشته شد نه ارجاع به آن جدول، چون ممیز در بازدید انتظار دارد
 *    «نتیجه و اقدام» کنارِ هم و در یک ردیفِ سوابق دیده شود.
 *
 * جدول‌ها:
 *  - facility_assets: شناسنامه‌ی قلم — کد اموال/شناسنامه، عنوان، دسته، محل
 *    استقرار، سازنده/مدل/سریال، تاریخ خرید و نصب، پایان گارانتی، رده‌ی خطر،
 *    وضعیت (فعال/خارج از سرویس/اسقاط)، مسئول.
 *  - asset_maintenance_plans: برنامه‌ی دوره‌ای روی یک قلم — نوع کار
 *    (کالیبراسیون/PM/بازرسی/آزمون/تمدید مجوز)، تناوب برحسب ماه، آخرین اجرا و
 *    سررسید بعدی. سررسید عمداً ستونِ ذخیره‌شده است نه محاسبه‌ی درجا، چون گاهی
 *    تاریخِ بعدی را خودِ پیمانکار تعیین می‌کند و با تناوبِ اسمی یکی نیست.
 *  - asset_maintenance_logs: هر اجرا — تاریخ، نتیجه (سالم/نیازمند اقدام/مردود)،
 *    مجری، هزینه، شرح و اقدام اصلاحی.
 *
 * وضعیتِ سررسید (گذشته/نزدیک/در مهلت) موقع خواندن از next_due_date حساب می‌شود،
 * دقیقاً به همان دلیلِ certifications: بدون job زمان‌بندی‌شده هم همیشه درست است.
 *
 * Run: خودکار روی هر boot. idempotent است.
 */
const { db } = require('../src/config/database-sqlite');
const { grantPerms } = require('./seed-library');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS facility_assets (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    asset_code TEXT,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'تجهیزات پزشکی',
    location TEXT,
    manufacturer TEXT,
    model TEXT,
    serial_no TEXT,
    purchase_date TEXT,
    install_date TEXT,
    warranty_end TEXT,
    risk_class TEXT DEFAULT 'متوسط',
    status TEXT NOT NULL DEFAULT 'active',
    responsible TEXT,
    note TEXT,
    section_id TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_fassets_hospital ON facility_assets(hospital_id, category, status)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_fassets_code ON facility_assets(hospital_id, asset_code)
     WHERE asset_code IS NOT NULL AND asset_code != ''`,

  `CREATE TABLE IF NOT EXISTS asset_maintenance_plans (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    asset_id TEXT NOT NULL REFERENCES facility_assets(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'نگهداشت پیشگیرانه',
    title TEXT,
    interval_months INTEGER NOT NULL DEFAULT 12,
    last_done_date TEXT,
    next_due_date TEXT,
    responsible TEXT,
    vendor TEXT,
    note TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_fplans_due ON asset_maintenance_plans(hospital_id, is_active, next_due_date)`,
  `CREATE INDEX IF NOT EXISTS idx_fplans_asset ON asset_maintenance_plans(asset_id)`,

  `CREATE TABLE IF NOT EXISTS asset_maintenance_logs (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    plan_id TEXT REFERENCES asset_maintenance_plans(id) ON DELETE CASCADE,
    asset_id TEXT NOT NULL REFERENCES facility_assets(id) ON DELETE CASCADE,
    done_date TEXT NOT NULL,
    result TEXT NOT NULL DEFAULT 'ok',
    performed_by TEXT,
    cost INTEGER,
    description TEXT,
    corrective_action TEXT,
    file_path TEXT,
    file_name TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_flogs_asset ON asset_maintenance_logs(hospital_id, asset_id, done_date)`,
  `CREATE INDEX IF NOT EXISTS idx_flogs_plan ON asset_maintenance_logs(plan_id, done_date)`,
];

// چه کسی مدیریت می‌کند: مدیر و مسئول کنترل کیفیت به‌طور کامل؛ سایر نقش‌هایی که در
// بازدید ممیزی پای همین سوابق می‌ایستند فقط مشاهده. عمداً به مسئول تجهیزات پزشکی
// نقشِ تازه‌ای داده نشد — اگر بیمارستان چنین نقشی داشته باشد، مدیر از پنل
// دسترسی‌ها همین مجوز را به او می‌دهد؛ ساختنِ نقشِ سراسری تازه برای همه‌ی
// مستأجرها تصمیمِ ما نیست.
const ROLE_PERMS = {
  admin: ['manage_facility_assets', 'view_facility_assets'],
  quality_control_manager: ['manage_facility_assets', 'view_facility_assets'],
  nursing_director: ['view_facility_assets'],
  clinical_supervisor: ['view_facility_assets'],
  infection_control_supervisor: ['view_facility_assets'],
};

function runMigration() {
  for (const sql of TABLES) db.exec(sql);
  grantPerms(ROLE_PERMS, 'Seed FacilityAssets');
  console.log('[Seed FacilityAssets] ✅ facility_assets / asset_maintenance_plans / asset_maintenance_logs ready');
}

module.exports = { runMigration };

/**
 * خدمات تصویربرداری و ایمنی پرتو — محور ب-۷
 * ---------------------------------------------------------------------
 * سومین و آخرین محور از فهرستِ «ساختنی»های نقشه‌ی پوشش. شش جدول:
 *
 *  1) imaging_devices — ب-۷-۳-۶ و ب-۷-۳-۷: دستگاه‌ها به تفکیک نوع (MRI, CT،
 *     رادیوگرافی، فلوروسکوپی، سونوگرافی) با خروجی دیجیتال/دایکام. نوعِ دستگاه
 *     ستونِ جداست چون خودِ سنجه کالیبراسیون را «اختصاصی» و به‌تفکیکِ همین انواع
 *     خواسته است.
 *
 *  2) imaging_qc — ب-۷-۳-۶: دو چیزِ متفاوت که سنجه با هم آورده و این‌جا با ستون
 *     kind از هم جدا می‌شوند: «تأییدیه‌ی کنترل کیفی حداقل سالانه از شرکت‌های
 *     موردتأیید سازمان انرژی اتمی» و «کالیبراسیون اختصاصی بر اساس توصیه‌ی
 *     کارخانه». اولی تاریخ اعتبار دارد و دومی ندارد؛ و «موردتأیید بودنِ شرکت»
 *     تیکِ جداست، چون تأییدیه از شرکتِ تأییدنشده اعتبار ندارد.
 *
 *  3) radiation_dosimetry — ب-۷-۱-۳: مسئول فیزیک بهداشت طبق ضوابط سازمان انرژی
 *     اتمی. سنجه خودِ دزیمتری را نام نمی‌برد ولی وظیفه‌ی محوله همین است و بدون
 *     سابقه‌ی دز، «انجام وظایف محوله» چیزی برای نشان‌دادن ندارد. حدِ مجاز روی
 *     خودِ رکورد است نه ثابتِ برنامه، چون بر حسب دوره (ماهانه/فصلی/سالانه) و
 *     نوعِ پرتوکار فرق می‌کند؛ و عبور از حد را سرور تعیین می‌کند.
 *
 *  4) imaging_prep_forms — ب-۷-۲-۲: «شناسایی و فهرست‌نمودن پروسیجرهای نیازمند
 *     کسب آمادگی» و «تهیه فرم‌های آمادگی برای تمام پروسیجرهای شناسایی‌شده به
 *     تفکیک» و «دسترسی بیماران سرپایی و بخش‌های بستری». پس «فرم تهیه شده» و
 *     «در دسترس بخش‌ها هست» دو چیز جدا هستند.
 *
 *  5) imaging_critical_reports — ب-۷-۳-۵: «فهرست محدوده‌ی بحرانی در معرض دید» و
 *     «خط آزاد ارتباطی» و «ارتباط مؤثر و به‌موقع». مثل ب-۸-۳-۲، فاصله‌ی زمانی را
 *     سرور از دو ساعت حساب می‌کند.
 *
 *  6) imaging_quality_reviews — ب-۷-۳-۴: «شناسایی و بررسی عوامل تأثیرگذار بر
 *     کیفیت خدمات به‌صورت منظم و دوره‌ای و حداقل ماهیانه» و «ارائه راهکار به تیم
 *     رهبری». بازبینیِ بدون اقدام و بدون ارائه به تیم رهبری، این سنجه را پاسخ
 *     نمی‌دهد.
 *
 * و ب-۷-۳-۲ (مهلتِ مصوبِ کمیته برای تصویربرداری اورژانس و پایشِ رعایتش) روی
 * همان جدولِ بازبینی نمی‌نشیند؛ عمداً به imaging_tat_audits نرفت و در عوض در
 * توضیحِ داشبورد به «پایش زمان پاسخ‌دهی» ماژول آزمایشگاه ارجاع داده شد — چون
 * شکلِ داده دقیقاً همان است و ساختنِ دوباره‌اش فقط دو جای ثبتِ موازی می‌ساخت.
 * (اگر کارفرما بخواهد جداگانه باشد، یک منبع تازه در همین ماژول کافی است.)
 *
 * چیزی که عمداً ساخته نشد: ب-۷-۱-۱ (فضای مستقل، علائم هشدار، چراغ‌های هشدار)
 * وضعیتِ کالبدی است → چک‌لیست؛ ب-۷-۱-۲ و ب-۷-۲-۱ و ب-۷-۳-۱ کنارِ دستگاه اثبات
 * می‌شوند و به پرونده‌ی بیمار گره خورده‌اند.
 *
 * Run: خودکار روی هر boot. idempotent است.
 */
const { db } = require('../src/config/database-sqlite');
const { grantPerms } = require('./seed-library');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS imaging_devices (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    modality TEXT NOT NULL DEFAULT 'رادیوگرافی',
    manufacturer TEXT,
    model TEXT,
    serial_no TEXT,
    install_date TEXT,
    location TEXT,
    digital_output INTEGER NOT NULL DEFAULT 0,
    pacs_connected INTEGER NOT NULL DEFAULT 0,
    responsible TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_imgdev_h ON imaging_devices(hospital_id, is_active)`,

  `CREATE TABLE IF NOT EXISTS imaging_qc (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL REFERENCES imaging_devices(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'کنترل کیفی سالانه',
    performed_date TEXT NOT NULL,
    company TEXT,
    aeoi_approved INTEGER NOT NULL DEFAULT 0,
    certificate_no TEXT,
    valid_until TEXT,
    is_valid INTEGER NOT NULL DEFAULT 0,
    result TEXT NOT NULL DEFAULT 'pass',
    findings TEXT,
    corrective_action TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_imgqc_h ON imaging_qc(hospital_id, device_id, performed_date)`,

  `CREATE TABLE IF NOT EXISTS radiation_dosimetry (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    staff_name TEXT NOT NULL,
    job_title TEXT,
    badge_no TEXT,
    period_from TEXT NOT NULL,
    period_to TEXT NOT NULL,
    dose_msv REAL,
    dose_limit_msv REAL,
    over_limit INTEGER NOT NULL DEFAULT 0,
    action_taken TEXT,
    reported_by TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_dosim_h ON radiation_dosimetry(hospital_id, period_to)`,

  `CREATE TABLE IF NOT EXISTS imaging_prep_forms (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    procedure_name TEXT NOT NULL,
    modality TEXT,
    needs_prep INTEGER NOT NULL DEFAULT 1,
    form_ready INTEGER NOT NULL DEFAULT 0,
    available_to_wards INTEGER NOT NULL DEFAULT 0,
    prep_summary TEXT,
    approved_by TEXT,
    approved_date TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_imgprep_uniq ON imaging_prep_forms(hospital_id, procedure_name)`,

  `CREATE TABLE IF NOT EXISTS imaging_critical_reports (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    report_date TEXT NOT NULL,
    modality TEXT,
    finding TEXT NOT NULL,
    patient_ref TEXT,
    ward TEXT NOT NULL,
    result_time TEXT,
    reported_time TEXT,
    minutes_to_report INTEGER,
    reported_by TEXT,
    receiver_name TEXT,
    read_back_done INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_imgcr_h ON imaging_critical_reports(hospital_id, report_date)`,

  `CREATE TABLE IF NOT EXISTS imaging_quality_reviews (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    review_date TEXT NOT NULL,
    period_label TEXT,
    factors_found TEXT NOT NULL,
    priorities TEXT,
    corrective_action TEXT NOT NULL,
    presented_to_leadership INTEGER NOT NULL DEFAULT 0,
    presented_date TEXT,
    reviewer TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_imgqr_h ON imaging_quality_reviews(hospital_id, review_date)`,
];

const ROLE_PERMS = {
  admin: ['manage_imaging', 'view_imaging'],
  quality_control_manager: ['manage_imaging', 'view_imaging'],
  nursing_director: ['view_imaging'],
  clinical_supervisor: ['view_imaging'],
  infection_control_supervisor: ['view_imaging'],
};

function runMigration() {
  for (const sql of TABLES) db.exec(sql);
  grantPerms(ROLE_PERMS, 'Seed Imaging');
  console.log('[Seed Imaging] ✅ devices / QC+calibration / dosimetry / prep forms / critical reports / quality reviews ready');
}

module.exports = { runMigration };

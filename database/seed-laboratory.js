/**
 * خدمات آزمایشگاه — محور ب-۸
 * ---------------------------------------------------------------------
 * دومین محور از فهرستِ «ساختنی»های نقشه‌ی پوشش (docs/ROADMAP-V2.md). مثل ب-۹،
 * هر جدول پاسخِ یک الزامِ صریح است و کدِ سنجه‌اش کنارش آمده:
 *
 *  1) lab_sample_checks — ب-۸-۱-۴ «تعیین معیارهای رد یا قبول نمونه» و صریح‌تر:
 *     «مسئول پیگیری نمونه‌های غیرقابل قبول تعیین شده … بلافاصله با بخش مربوطه
 *     هماهنگی و یا تجدید نمونه به عمل آید». پس «به بخش اطلاع داده شد» و «مسئول
 *     پیگیری» ستونِ جدا هستند، نه توضیح؛ و ب-۸-۱-۲ دو شناسه‌ی منحصربه‌فرد و
 *     تاریخ/ساعت نمونه‌گیری روی برچسب را می‌خواهد، پس هر سه تیکِ جداگانه‌اند.
 *
 *  2) lab_reference — ب-۸-۲-۴ (جدول مدت پایداری نمونه) و ب-۸-۳-۳ (جدول زمان
 *     پاسخ‌دهی روتین و اورژانس). این دو عمداً یک جدول شدند: هر دو «قاعده‌ای که
 *     آزمایشگاه تدوین و به بخش‌ها ابلاغ می‌کند» هستند، هر دو یک سقفِ زمانی دارند،
 *     و هر دو سنجه «اطلاع‌رسانی به بخش‌های بستری و اورژانس» را جزء الزام آورده‌اند.
 *     دو جدولِ تقریباً یکسان فقط دو تبِ اضافه می‌ساخت.
 *
 *  3) lab_qc_records — ب-۸-۲-۳ «کنترل کیفیت داخلی در هر نوبت کاری» و ب-۸-۲-۵
 *     «شرکت سه نوبت در سال در ارزیابی خارجی کیفیت». یک جدول با ستون kind، چون
 *     چرخه‌شان یکی است: نتیجه → تفسیر → اقدام اصلاحی → نگهداری سابقه تا یک سال.
 *     «نوبت کاری» ستونِ جداست چون سنجه آن را شمرده، نه فقط تاریخ.
 *
 *  4) lab_supervisions — ب-۸-۲-۱ «کسب امتیاز قابل قبول بر اساس چک‌لیست ارزیابی
 *     آزمایشگاه مرجع سلامت». حدِ نصاب را آزمایشگاه مرجع تعیین و ابلاغ می‌کند و
 *     ثابت نیست، پس روی خودِ رکورد ذخیره می‌شود و قبولی را سرور از مقایسه‌ی
 *     امتیاز با همان حدِ نصاب حساب می‌کند.
 *
 *  5) lab_referrals — ب-۸-۲-۶ «قرارداد مکتوب با آزمایشگاه طرف قرارداد» و «انجام
 *     ارزیابی صلاحیت دوره‌ای آزمایشگاه ارجاع و نگهداری سوابق آن». قراردادی که
 *     تاریخ اعتبارش گذشته یا ارزیابی صلاحیتش انجام نشده، همان چیزی است که ارزیاب
 *     می‌گیرد؛ پس هر دو ستونِ ایندکس‌شده‌اند.
 *
 *  6) lab_critical_values — ب-۸-۳-۱ «تعیین دامنه یا مقادیر بحرانی … به تفکیک
 *     گروه‌ها و شرایط بالینی بیماران» (نوزادان، دیالیزی و …) و «قرار گرفتن در
 *     معرض دید کارکنان». پس گروهِ بیمار بخشی از کلید است، نه یک توضیح.
 *
 *  7) lab_critical_reports — ب-۸-۳-۲ «گزارش آنی نتایج بحرانی … با روش Repeat
 *     Back» و «کنترل مجدد نتایج بحرانی پس از اعلام اضطراری نتیجه اولیه». فاصله‌ی
 *     زمانیِ آماده‌شدنِ نتیجه تا اعلامش را سرور از دو مُهرِ زمانی حساب می‌کند —
 *     «آنی» بودن با تیکِ کاربر اثبات نمی‌شود.
 *
 *  8) lab_tat_audits — ب-۸-۳-۵ «مسئول فنی وضعیت عملکرد آزمایشگاه را از طریق
 *     تعیین شاخص‌های کیفیت و اندازه‌گیری دوره‌ای آنها پایش نماید». درصد رعایتِ
 *     زمانِ پاسخ‌دهی از کسر حساب می‌شود نه از عددی که کاربر می‌نویسد.
 *
 * چیزی که عمداً ساخته نشد:
 *  • ب-۸-۱-۱ (راهنمای آمادگی بیمار و جمع‌آوری نمونه) و ب-۸-۲-۲ (دستورالعمل انجام
 *    آزمایش‌ها) سندِ مکتوب‌اند → ماژول «اسناد کنترل‌شده».
 *  • ب-۸-۱-۵ و ب-۸-۱-۶ (چاپ خودکار برچسب و ابزار خون‌گیری خلأ) وضعیتِ تجهیزاتی‌اند
 *    → ماژول «اقلام و نگهداشت» و چک‌لیست.
 *  • ب-۸-۱-۳ (بسته‌بندی سه‌لایه و انتقال ایمن نمونه‌ی عفونی) و ب-۸-۳-۴ (تأیید
 *    دولایه‌ی نتایج) کنارِ میزِ کار اثبات می‌شوند، نه با رکورد.
 *
 * Run: خودکار روی هر boot. idempotent است.
 */
const { db } = require('../src/config/database-sqlite');
const { grantPerms } = require('./seed-library');

const TABLES = [
  // ---- ب-۸-۱-۲ و ب-۸-۱-۴ کنترل نمونه‌ی ورودی ----
  `CREATE TABLE IF NOT EXISTS lab_sample_checks (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    check_date TEXT NOT NULL,
    ward TEXT NOT NULL,
    sample_type TEXT NOT NULL DEFAULT 'خون',
    patient_ref TEXT,
    two_identifiers INTEGER NOT NULL DEFAULT 1,
    collection_time_on_label INTEGER NOT NULL DEFAULT 1,
    label_complete INTEGER NOT NULL DEFAULT 1,
    sampler_name TEXT,
    accepted INTEGER NOT NULL DEFAULT 1,
    reject_reason TEXT,
    ward_notified INTEGER NOT NULL DEFAULT 0,
    follow_up_owner TEXT,
    resampled INTEGER NOT NULL DEFAULT 0,
    resample_date TEXT,
    checked_by TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_labsample_h ON lab_sample_checks(hospital_id, check_date)`,
  `CREATE INDEX IF NOT EXISTS idx_labsample_open ON lab_sample_checks(hospital_id, accepted, resampled)`,

  // ---- ب-۸-۲-۴ و ب-۸-۳-۳ جدول‌های ابلاغی به بخش‌ها ----
  `CREATE TABLE IF NOT EXISTS lab_reference (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'زمان پاسخ‌دهی',
    item_name TEXT NOT NULL,
    category TEXT,
    limit_minutes INTEGER,
    storage_condition TEXT,
    announced_to_wards INTEGER NOT NULL DEFAULT 0,
    announced_date TEXT,
    approved_by TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_labref_h ON lab_reference(hospital_id, kind, item_name)`,

  // ---- ب-۸-۲-۳ و ب-۸-۲-۵ کنترل کیفیت ----
  `CREATE TABLE IF NOT EXISTS lab_qc_records (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'internal',
    qc_date TEXT NOT NULL,
    shift TEXT NOT NULL DEFAULT 'صبح',
    lab_section TEXT NOT NULL DEFAULT 'بیوشیمی',
    test_name TEXT NOT NULL,
    control_level TEXT,
    lot_no TEXT,
    result TEXT NOT NULL DEFAULT 'pass',
    interpretation TEXT,
    corrective_action TEXT,
    provider TEXT,
    round_no TEXT,
    performed_by TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_labqc_h ON lab_qc_records(hospital_id, kind, qc_date)`,

  // ---- ب-۸-۲-۱ ارزیابی آزمایشگاه مرجع سلامت ----
  `CREATE TABLE IF NOT EXISTS lab_supervisions (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    visit_date TEXT NOT NULL,
    assessor TEXT,
    score REAL,
    max_score REAL,
    min_required REAL,
    passed INTEGER NOT NULL DEFAULT 0,
    findings TEXT,
    action_plan TEXT,
    action_due TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_labsup_h ON lab_supervisions(hospital_id, visit_date)`,

  // ---- ب-۸-۲-۶ آزمایشگاه طرف قرارداد ----
  `CREATE TABLE IF NOT EXISTS lab_referrals (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    lab_name TEXT NOT NULL,
    contract_no TEXT,
    contract_date TEXT,
    contract_expiry TEXT,
    scope TEXT,
    packaging_standard INTEGER NOT NULL DEFAULT 0,
    turnaround_agreed TEXT,
    competency_assessed INTEGER NOT NULL DEFAULT 0,
    assessment_date TEXT,
    assessment_result TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_labrefer_h ON lab_referrals(hospital_id, is_active, contract_expiry)`,

  // ---- ب-۸-۳-۱ دامنه‌ی مقادیر بحرانی ----
  `CREATE TABLE IF NOT EXISTS lab_critical_values (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    test_name TEXT NOT NULL,
    patient_group TEXT NOT NULL DEFAULT 'بزرگسال',
    low_value TEXT,
    high_value TEXT,
    unit TEXT,
    approved_by TEXT,
    approved_date TEXT,
    posted_visible INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_labcv_uniq ON lab_critical_values(hospital_id, test_name, patient_group)`,

  // ---- ب-۸-۳-۲ گزارش آنی نتیجه‌ی بحرانی ----
  `CREATE TABLE IF NOT EXISTS lab_critical_reports (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    report_date TEXT NOT NULL,
    test_name TEXT NOT NULL,
    result_value TEXT,
    patient_ref TEXT,
    ward TEXT NOT NULL,
    result_time TEXT,
    reported_time TEXT,
    minutes_to_report INTEGER,
    reported_by TEXT,
    receiver_name TEXT,
    read_back_done INTEGER NOT NULL DEFAULT 0,
    repeat_test_done INTEGER NOT NULL DEFAULT 0,
    repeat_result TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_labcr_h ON lab_critical_reports(hospital_id, report_date)`,

  // ---- ب-۸-۳-۵ پایش دوره‌ای زمان پاسخ‌دهی ----
  `CREATE TABLE IF NOT EXISTS lab_tat_audits (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    audit_date TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'روتین',
    lab_section TEXT,
    samples_checked INTEGER NOT NULL DEFAULT 0,
    within_target INTEGER NOT NULL DEFAULT 0,
    compliance_pct REAL,
    auditor TEXT,
    corrective_action TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_labtat_h ON lab_tat_audits(hospital_id, audit_date)`,
];

// «مسئول فنی آزمایشگاه» نقشِ استانداردِ سامانه نیست؛ مثل ماژول دارویی و بانک
// خون، مدیر مرکز این مجوز را از پنل دسترسی‌ها به متصدیِ واقعیِ همان مرکز می‌دهد.
const ROLE_PERMS = {
  admin: ['manage_lab', 'view_lab'],
  quality_control_manager: ['manage_lab', 'view_lab'],
  nursing_director: ['view_lab'],
  clinical_supervisor: ['view_lab'],
  infection_control_supervisor: ['view_lab'],
};

function runMigration() {
  for (const sql of TABLES) db.exec(sql);
  grantPerms(ROLE_PERMS, 'Seed Laboratory');
  console.log('[Seed Laboratory] ✅ sample checks / reference tables / QC / supervision / referrals / critical values+reports / TAT audits ready');
}

module.exports = { runMigration };

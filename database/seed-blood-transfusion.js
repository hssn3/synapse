/**
 * طب انتقال خون و هموویژیلانس — نسل۶ ذیل محور ب-۸ (خدمات آزمایشگاه و طب انتقال خون)
 * ---------------------------------------------------------------------
 * چرا این محور: از تحلیلِ متنِ ویرایش پنجم، ب-۹ تنها محوری بود که هم هیچ جایی
 * برای ثبت در سامانه نداشت و هم الزام‌هایش تماماً «داده‌ی دوره‌ایِ قابل‌نگهداری»
 * است، نه عملکردِ بالینیِ کنارِ تخت. محورهای ب-۱ و ب-۲ و ب-۳ عمداً ساخته نشدند:
 * سنجه‌هایشان در پرونده‌ی بیمار و HIS اثبات می‌شوند و ما پرونده‌ی بالینی نداریم.
 *
 * هر جدول پاسخِ یک الزامِ صریح است و کدِ سنجه‌اش کنارش آمده:
 *
 *  1) blood_storage_units — ب-8-4-2: «تنظیم سیستم هشداردهنده‌ی یخچال بانک خون با
 *     اعلام هشدار کمتر از ۲/۵ و بیشتر از ۵/۵ درجه» و «نگهداری پلاکت‌ها در دمای
 *     ۲۰ تا ۲۴ با تکان آرام». پس حدِ مجاز روی خودِ دستگاه است نه ثابتِ برنامه —
 *     یخچالِ خون، فریزرِ پلاسما و شیکر-انکوباتورِ پلاکت سه دامنه‌ی متفاوت دارند.
 *     پیش‌فرضِ هر نوع از همان متنِ سنجه گرفته شده.
 *
 *  2) blood_temp_logs — همان سنجه: «ثبت دمای یخچال و فریزر و شیکر انکوباتوردار
 *     پلاکت با ترمومتر دیجیتالی-ترموگراف دستی». عمداً از یخچالِ دارویی (ب-۶-۲-۱)
 *     جدا ماند: آن‌جا دامنه ۲ تا ۸ است و این‌جا ۲/۵ تا ۵/۵ — یعنی دمایی که برای
 *     دارو مجاز است می‌تواند برای خون انحراف باشد. یکی‌کردنشان یعنی پنهان‌کردنِ
 *     همان انحرافی که سنجه دنبالش است.
 *
 *  3) blood_receipts — ب-8-4-1 فهرستِ الزام‌ها را خودش شمرده: ماشین مخصوص،
 *     «کارت یا گواهیِ دارای اعتبار» برای فردِ مسئولِ حمل، محفظه‌ی ثبت‌کننده‌ی دما،
 *     و «ثبت دمای فرآورده در هنگام تحویل در بانک خون». پس تاریخِ اعتبارِ گواهیِ
 *     حامل ستونِ جداست، نه یک یادداشت.
 *
 *  4) blood_bags — ب-8-4-2 «چیدمان به ترتیب تاریخ انقضا و ثبت کنترل روزانه از
 *     نظر تاریخ انقضا» و ب-8-5-1 «برچسب کراسمچ با نام، بخش، شناسه و نامِ انجام‌
 *     دهنده‌ی آزمایش سازگاری». تاریخِ انقضا ستونِ ایندکس‌شده است تا «کدام کیسه
 *     امروز منقضی می‌شود» یک کوئری باشد نه یک بازبینیِ چشمی.
 *
 *  5) blood_sample_checks — ب-8-1-2: «تعیین معیارهای پذیرش و رد نمونه» و «در صورت
 *     عدم انطباق، اخذ نمونه‌ی مجدد». پس «نمونه‌ی مجدد گرفته شد» فیلدِ جداست؛
 *     نمونه‌ی ردشده‌ای که نمونه‌ی مجددش ثبت نشده، یعنی کارِ نیمه‌تمام.
 *
 *  6) blood_qc_records — ب-8-2-3: کنترل کیفیِ داخلی «روزانه قبل از مصرف … بر اساس
 *     هر سری ساخت»، و شرکت در «برنامه‌ی ارزیابی خارجی کیفیت» با «قابلیت بازیابی
 *     تا یک سال». هر دو در یک جدول با ستون kind، چون هر دو یک چرخه دارند
 *     (نتیجه → تفسیر → اقدام اصلاحی) و جداکردنشان دو فرمِ تقریباً یکسان می‌ساخت.
 *
 *  7) blood_adverse_events — ب-8-6-4: «گزارش … حداکثر ظرف ۴۸ ساعت از وقوع عارضه»
 *     و ب-8-6-6: «تحلیل ریشه‌ای» و «طرح در کمیته‌ی طب انتقال خون». مهلتِ ۴۸ ساعت
 *     در سرور از روی دو تاریخ حساب می‌شود، نه از روی تیکی که کاربر می‌زند.
 *
 *  8) blood_returns — ب-8-6-5: «پایش میزان خون‌های برگشتی به تفکیک بخش‌ها» و
 *     «ارزیابی دمای خون‌های برگشتی و اقدام اصلاحی در صورت لزوم». قابلِ استفاده
 *     بودنِ کیسه‌ی برگشتی از دما نتیجه می‌شود، پس همان‌جا سنجیده می‌شود.
 *
 * چیزی که عمداً ساخته نشد:
 *  • ب-8-6-1 (گواهیِ استقرار هموویژیلانس) → ماژول «گواهینامه‌ها» از قبل هست.
 *  • ب-8-6-2 (دوره‌ی آموزشی پزشکان/پرستاران/کارکنان بانک خون) → ماژول «آموزش».
 *  ساختنِ دوباره‌شان فقط دو جای ثبتِ موازی می‌ساخت و ارزیاب را سردرگم می‌کرد.
 *
 * Run: خودکار روی هر boot. idempotent است.
 */
const { db } = require('../src/config/database-sqlite');
const { grantPerms } = require('./seed-library');

const TABLES = [
  // ---- ب-8-4-2 محل نگهداری و دامنه‌ی مجاز ----
  `CREATE TABLE IF NOT EXISTS blood_storage_units (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    unit_type TEXT NOT NULL DEFAULT 'یخچال بانک خون',
    location TEXT,
    min_temp REAL NOT NULL DEFAULT 2.5,
    max_temp REAL NOT NULL DEFAULT 5.5,
    has_alarm INTEGER NOT NULL DEFAULT 0,
    has_agitator INTEGER NOT NULL DEFAULT 0,
    on_emergency_power INTEGER NOT NULL DEFAULT 0,
    thermometer_type TEXT,
    serial_no TEXT,
    responsible TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_bstorage_h ON blood_storage_units(hospital_id, is_active)`,

  `CREATE TABLE IF NOT EXISTS blood_temp_logs (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    unit_id TEXT NOT NULL REFERENCES blood_storage_units(id) ON DELETE CASCADE,
    log_date TEXT NOT NULL,
    slot TEXT NOT NULL DEFAULT 'صبح',
    temperature REAL NOT NULL,
    in_range INTEGER NOT NULL DEFAULT 1,
    alarm_tested INTEGER NOT NULL DEFAULT 0,
    action_taken TEXT,
    recorded_by TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_btemp_uniq ON blood_temp_logs(unit_id, log_date, slot)`,
  `CREATE INDEX IF NOT EXISTS idx_btemp_h ON blood_temp_logs(hospital_id, log_date)`,

  // ---- ب-8-4-1 تحویل فرآورده از سازمان انتقال خون ----
  `CREATE TABLE IF NOT EXISTS blood_receipts (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    receipt_date TEXT NOT NULL,
    product_type TEXT NOT NULL DEFAULT 'خون کامل',
    unit_count INTEGER NOT NULL DEFAULT 1,
    courier_name TEXT,
    courier_cert_no TEXT,
    courier_cert_expiry TEXT,
    dedicated_vehicle INTEGER NOT NULL DEFAULT 1,
    box_has_datalogger INTEGER NOT NULL DEFAULT 1,
    arrival_temp REAL,
    temp_ok INTEGER NOT NULL DEFAULT 1,
    accepted INTEGER NOT NULL DEFAULT 1,
    reject_reason TEXT,
    received_by TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_breceipt_h ON blood_receipts(hospital_id, receipt_date)`,

  // ---- ب-8-4-2 + ب-8-5-1 موجودی کیسه‌ها، انقضا و کراسمچ ----
  `CREATE TABLE IF NOT EXISTS blood_bags (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    bag_code TEXT NOT NULL,
    product_type TEXT NOT NULL DEFAULT 'خون کامل',
    blood_group TEXT NOT NULL DEFAULT 'O',
    rh TEXT NOT NULL DEFAULT '+',
    volume_ml INTEGER,
    collected_date TEXT,
    expiry_date TEXT NOT NULL,
    storage_unit_id TEXT REFERENCES blood_storage_units(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'available',
    crossmatch_patient TEXT,
    crossmatch_ward TEXT,
    crossmatch_by TEXT,
    crossmatch_result TEXT,
    issued_ward TEXT,
    issued_date TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_bbag_code ON blood_bags(hospital_id, bag_code)`,
  `CREATE INDEX IF NOT EXISTS idx_bbag_exp ON blood_bags(hospital_id, status, expiry_date)`,

  // ---- ب-8-1-2 معیار پذیرش و رد نمونه ----
  `CREATE TABLE IF NOT EXISTS blood_sample_checks (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    check_date TEXT NOT NULL,
    ward TEXT NOT NULL,
    patient_ref TEXT,
    label_complete INTEGER NOT NULL DEFAULT 1,
    identity_verified INTEGER NOT NULL DEFAULT 1,
    sampler_name TEXT,
    accepted INTEGER NOT NULL DEFAULT 1,
    reject_reason TEXT,
    resampled INTEGER NOT NULL DEFAULT 0,
    resample_date TEXT,
    checked_by TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_bsample_h ON blood_sample_checks(hospital_id, check_date)`,

  // ---- ب-8-2-3 کنترل کیفیِ داخلی و ارزیابی خارجی ----
  `CREATE TABLE IF NOT EXISTS blood_qc_records (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'internal',
    qc_date TEXT NOT NULL,
    item_name TEXT NOT NULL,
    lot_no TEXT,
    expiry_date TEXT,
    result TEXT NOT NULL DEFAULT 'pass',
    interpretation TEXT,
    corrective_action TEXT,
    provider TEXT,
    performed_by TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_bqc_h ON blood_qc_records(hospital_id, kind, qc_date)`,

  // ---- ب-8-6-6 و ب-8-6-4 عوارض ناخواسته‌ی تزریق ----
  `CREATE TABLE IF NOT EXISTS blood_adverse_events (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    event_date TEXT NOT NULL,
    ward TEXT NOT NULL,
    product_type TEXT NOT NULL DEFAULT 'خون کامل',
    bag_code TEXT,
    patient_ref TEXT,
    reaction_type TEXT NOT NULL DEFAULT 'تب غیرهمولیتیک',
    severity TEXT NOT NULL DEFAULT 'خفیف',
    description TEXT NOT NULL,
    standard_form_done INTEGER NOT NULL DEFAULT 0,
    reported_date TEXT,
    reported_within_48h INTEGER NOT NULL DEFAULT 0,
    rca_done INTEGER NOT NULL DEFAULT 0,
    rca_summary TEXT,
    committee_ref TEXT,
    corrective_action TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_bae_h ON blood_adverse_events(hospital_id, status, event_date)`,

  // ---- ب-8-6-5 خون‌های برگشتی ----
  `CREATE TABLE IF NOT EXISTS blood_returns (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    return_date TEXT NOT NULL,
    ward TEXT NOT NULL,
    bag_code TEXT,
    product_type TEXT NOT NULL DEFAULT 'خون کامل',
    unit_count INTEGER NOT NULL DEFAULT 1,
    return_temp REAL,
    temp_acceptable INTEGER NOT NULL DEFAULT 1,
    reusable INTEGER NOT NULL DEFAULT 0,
    reason TEXT NOT NULL DEFAULT 'عدم نیاز بیمار',
    corrective_action TEXT,
    reported_to_committee INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_bret_h ON blood_returns(hospital_id, return_date, ward)`,
];

// «مسئول فنی آزمایشگاه» و «مسئول بانک خون» نقشِ استانداردِ سامانه نیستند؛ مثل
// ماژول دارویی، مدیر مرکز این مجوز را از پنل دسترسی‌ها به متصدیِ واقعیِ همان
// مرکز می‌دهد. ساختنِ نقشِ سراسریِ تازه برای همه‌ی مستأجرها تصمیم ما نیست.
const ROLE_PERMS = {
  admin: ['manage_blood', 'view_blood'],
  quality_control_manager: ['manage_blood', 'view_blood'],
  nursing_director: ['view_blood'],
  clinical_supervisor: ['view_blood'],
  infection_control_supervisor: ['view_blood'],
};

function runMigration() {
  for (const sql of TABLES) db.exec(sql);
  grantPerms(ROLE_PERMS, 'Seed BloodTransfusion');
  console.log('[Seed BloodTransfusion] ✅ storage+temp / receipts / bags / sample checks / QC / adverse events / returns ready');
}

module.exports = { runMigration };

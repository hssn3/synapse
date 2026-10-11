/**
 * مدیریت دارویی — محور ب-۶
 * ---------------------------------------------------------------------
 * این ماژول از روی متنِ خودِ ۲۱ سنجه‌ی محور ب-۶ ساخته شد، نه از روی تصورِ کلی از
 * «انبار دارو». هر جدول زیر پاسخِ یک الزامِ صریح است و کنارش کدِ سنجه‌اش آمده تا
 * بعداً معلوم باشد چرا هست:
 *
 *  1) drug_formulary — ب-۶-۴-۱ صریح گفته فرمولاری باید «نام ژنریک، نام تجاری، کد
 *     اختصاصی، شکل دارویی، قدرت» داشته باشد؛ پس همین پنج ستون عیناً هستند.
 *     برچسب‌های ایمنی هم ستونِ جدا شدند نه یک فیلدِ متنی، چون سنجه‌های دیگر روی
 *     تک‌تکشان جدا حکم دارند: حیاتی/ضروری (ب-۶-۱-۲)، هشدار بالا (ب-۶-۲-۴)،
 *     مشابه/LASA و یخچالی و مخدر و سایتوتوکسیک (ب-۶-۲-۱). گروهِ ABC هم هست چون
 *     ب-۶-۴-۱ «آنالیز ABC هر سه ماه یک‌بار» را خواسته.
 *
 *  2) drug_fridges + drug_temp_logs — ب-۶-۲-۱: «کنترل دمای یخچال‌های دارویی در
 *     انبار دارویی، داروخانه و بخش و مجهز به سیستم هشداردهنده در صورت انحراف از
 *     دمای مجاز». این عمداً در ماژول «اقلام و نگهداشت دوره‌ای» ننشست: آن‌جا تناوب
 *     ماهانه است و این‌جا ثبت روزانه و چندنوبته؛ و انحراف باید فوراً اقدام بگیرد
 *     نه سررسیدِ بعدی. حد مجاز روی خودِ یخچال است تا هر یخچال دامنه‌ی خودش را
 *     داشته باشد (یخچال معمولی ۲ تا ۸، فریزر منفی).
 *
 *  3) drug_recalls — ب-۶-۲-۳ فهرستِ مستنداتِ لازم را خودش شمرده: مشخصات، کارخانه
 *     سازنده، سری ساخت، تاریخ تولید و انقضا، سوابق اطلاع‌رسانی به بخش‌ها، و
 *     «روشن بودن سرنوشت نهایی». پس هر کدام یک ستون است، از جمله وضعیتِ چرخه
 *     (اطلاع‌رسانی → جمع‌آوری → تعیین تکلیف).
 *
 *  4) drug_disposals — ب-۶-۲-۶: «انهدام … با تدوین صورت‌جلسه برای هر مورد با حضور
 *     مسئول فنی داروخانه». پس شماره صورت‌جلسه و حاضران ستونِ اجباری‌اند، نه
 *     توضیحِ اختیاری.
 *
 *  5) drug_adverse_events — ب-۶-۳-۴. خودِ سنجه تأکید کرده ADR و «خطای دارویی» دو
 *     مقوله‌ی مستقل‌اند («علی‌رغم رعایت داروی صحیح … واکنش ناخواسته»). پس یک ستون
 *     kind دارد و در ماژولِ گزارش خطای موجود ادغام نشد: آن‌جا خطای پزشکی عمومی
 *     است و این‌جا مسیرِ فرم زرد و سازمان غذا و دارو.
 *
 *  6) drug_shortages — ب-۶-۱-۳: «شناسایی داروهای با احتمال و سابقه کمبود»،
 *     «تعیین نقطه سفارش»، «پیش‌بینی روش‌های جایگزین»، «اطلاع‌رسانی به بخش‌ها».
 *
 *  7) drug_off_formulary — ب-۶-۴-۲: «ثبت سوابق تجویز خارج از فرمولاری» با تأیید
 *     طبق فرایند مصوبِ کمیته.
 *
 * چیزی که عمداً ساخته نشد: بازنگری داروساز بالینی (ب-۶-۵) به پرونده‌ی بیمار و
 * HIS گره خورده و سامانه‌ی ما پرونده‌ی بالینی ندارد؛ ساختنِ نیم‌بندش فقط توهمِ
 * پوشش می‌ساخت.
 *
 * Run: خودکار روی هر boot. idempotent است.
 */
const { db } = require('../src/config/database-sqlite');
const { grantPerms } = require('./seed-library');

const TABLES = [
  // ---- ب-۶-۴-۱ فرمولاری ----
  `CREATE TABLE IF NOT EXISTS drug_formulary (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    generic_name TEXT NOT NULL,
    brand_name TEXT,
    local_code TEXT,
    dosage_form TEXT,
    strength TEXT,
    atc_code TEXT,
    abc_class TEXT,
    is_vital INTEGER NOT NULL DEFAULT 0,
    is_essential INTEGER NOT NULL DEFAULT 0,
    is_high_alert INTEGER NOT NULL DEFAULT 0,
    is_lasa INTEGER NOT NULL DEFAULT 0,
    is_refrigerated INTEGER NOT NULL DEFAULT 0,
    is_narcotic INTEGER NOT NULL DEFAULT 0,
    is_cytotoxic INTEGER NOT NULL DEFAULT 0,
    reorder_point INTEGER,
    storage_note TEXT,
    note TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_review_date TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_formulary_h ON drug_formulary(hospital_id, is_active, generic_name)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_formulary_code ON drug_formulary(hospital_id, local_code)
     WHERE local_code IS NOT NULL AND local_code != ''`,

  // ---- ب-۶-۲-۱ یخچال دارویی و پایش دما ----
  `CREATE TABLE IF NOT EXISTS drug_fridges (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    location TEXT,
    min_temp REAL NOT NULL DEFAULT 2,
    max_temp REAL NOT NULL DEFAULT 8,
    has_alarm INTEGER NOT NULL DEFAULT 0,
    on_emergency_power INTEGER NOT NULL DEFAULT 0,
    responsible TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_fridges_h ON drug_fridges(hospital_id, is_active)`,

  `CREATE TABLE IF NOT EXISTS drug_temp_logs (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    fridge_id TEXT NOT NULL REFERENCES drug_fridges(id) ON DELETE CASCADE,
    log_date TEXT NOT NULL,
    slot TEXT NOT NULL DEFAULT 'صبح',
    temperature REAL NOT NULL,
    humidity REAL,
    in_range INTEGER NOT NULL DEFAULT 1,
    action_taken TEXT,
    recorded_by TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_templog_uniq ON drug_temp_logs(fridge_id, log_date, slot)`,
  `CREATE INDEX IF NOT EXISTS idx_templog_h ON drug_temp_logs(hospital_id, log_date)`,

  // ---- ب-۶-۲-۳ فراخوان ----
  `CREATE TABLE IF NOT EXISTS drug_recalls (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    item_kind TEXT NOT NULL DEFAULT 'دارو',
    manufacturer TEXT,
    batch_no TEXT,
    production_date TEXT,
    expiry_date TEXT,
    source_letter TEXT,
    announced_date TEXT,
    notified_wards TEXT,
    notified_date TEXT,
    collected_qty TEXT,
    final_disposition TEXT,
    status TEXT NOT NULL DEFAULT 'announced',
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_recalls_h ON drug_recalls(hospital_id, status, announced_date)`,

  // ---- ب-۶-۲-۶ انهدام با صورت‌جلسه ----
  `CREATE TABLE IF NOT EXISTS drug_disposals (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    minutes_no TEXT NOT NULL,
    disposal_date TEXT NOT NULL,
    item_name TEXT NOT NULL,
    item_kind TEXT NOT NULL DEFAULT 'دارو',
    batch_no TEXT,
    expiry_date TEXT,
    quantity TEXT,
    reason TEXT NOT NULL DEFAULT 'تاریخ مصرف گذشته',
    method TEXT,
    attendees TEXT NOT NULL,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_disposals_h ON drug_disposals(hospital_id, disposal_date)`,

  // ---- ب-۶-۳-۴ عوارض ناخواسته و خطای دارویی ----
  `CREATE TABLE IF NOT EXISTS drug_adverse_events (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'adr',
    event_date TEXT NOT NULL,
    ward TEXT,
    drug_name TEXT NOT NULL,
    patient_ref TEXT,
    patient_age TEXT,
    patient_gender TEXT,
    description TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'خفیف',
    outcome TEXT,
    analysis TEXT,
    corrective_action TEXT,
    yellow_form_sent INTEGER NOT NULL DEFAULT 0,
    yellow_form_date TEXT,
    reported_by TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_adr_h ON drug_adverse_events(hospital_id, kind, event_date)`,

  // ---- ب-۶-۱-۳ کمبود دارو ----
  `CREATE TABLE IF NOT EXISTS drug_shortages (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    formulary_id TEXT REFERENCES drug_formulary(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    started_date TEXT,
    resolved_date TEXT,
    severity TEXT NOT NULL DEFAULT 'متوسط',
    alternative TEXT,
    priority_rule TEXT,
    wards_notified TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_shortages_h ON drug_shortages(hospital_id, status)`,

  // ---- ب-۶-۴-۲ تجویز خارج از فرمولاری ----
  `CREATE TABLE IF NOT EXISTS drug_off_formulary (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    request_date TEXT NOT NULL,
    item_name TEXT NOT NULL,
    prescriber TEXT,
    ward TEXT,
    patient_ref TEXT,
    justification TEXT NOT NULL,
    in_idl INTEGER NOT NULL DEFAULT 1,
    decision TEXT NOT NULL DEFAULT 'pending',
    decided_by TEXT,
    decided_date TEXT,
    decision_note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_offform_h ON drug_off_formulary(hospital_id, decision, request_date)`,
];

// مسئول فنی داروخانه در نقش‌های استاندارد سامانه نیست؛ مدیر بیمارستان با پنل
// دسترسی‌ها این مجوز را به هر کسی که در آن مرکز این سمت را دارد می‌دهد. ساختنِ
// نقشِ سراسریِ تازه برای همه‌ی مستأجرها تصمیم ما نیست.
const ROLE_PERMS = {
  admin: ['manage_pharmacy', 'view_pharmacy'],
  quality_control_manager: ['manage_pharmacy', 'view_pharmacy'],
  nursing_director: ['view_pharmacy'],
  clinical_supervisor: ['view_pharmacy'],
  infection_control_supervisor: ['view_pharmacy'],
};

function runMigration() {
  for (const sql of TABLES) db.exec(sql);
  grantPerms(ROLE_PERMS, 'Seed Pharmacy');
  console.log('[Seed Pharmacy] ✅ formulary / fridges+temp / recalls / disposals / adverse events / shortages / off-formulary ready');
}

module.exports = { runMigration };

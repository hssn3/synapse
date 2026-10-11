/**
 * پیشگیری و کنترل عفونت — محور ب-۵
 * ---------------------------------------------------------------------
 * ۱۷ سنجه‌ی این محور، وقتی جمله‌به‌جمله خوانده شوند، پنج چرخه‌ی مستقل می‌سازند:
 *
 *  1) sterilizers + sterilizer_tests — ب-۵-۲-۱ («آزمون‌های اطمینان از عملکرد
 *     دستگاه‌های استریل‌کننده») و ب-۵-۲-۴ («سوابق عملکرد هر دستگاه … حداقل برای
 *     یک سال نگهداری می‌شود»). یعنی سابقه باید per-device و تاریخ‌دار باشد؛
 *     یک جدولِ عمومیِ آزمون کافی نبود. نوع آزمون (بو‌وی‌دیک/بیولوژیک/شیمیایی/
 *     نشتی) ستون است چون هر کدام تناوب و معنای متفاوتی دارد.
 *
 *  2) sterile_batches — ب-۵-۲-۵: «برچسب هر بسته استریل حاوی حداقل اطلاعات مورد
 *     نیاز برای فراخوان است». «فراخوان» یعنی باید بتوان از یک بسته به دستگاه،
 *     سیکل، تاریخ و اپراتور رسید — پس شماره سیکل و تاریخ انقضا ستون‌اند.
 *
 *  3) hand_hygiene_audits — ب-۵-۴-۲: «میزان رعایت و پذیرش بهداشت دست با
 *     روش‌های استاندارد اندازه‌گیری شده و بر اساس نتایج، اقدامات اصلاحی…».
 *     «میزان» یعنی کسر: فرصت‌های مشاهده‌شده و موارد رعایت‌شده هر دو ثبت می‌شوند
 *     و درصد در سرور حساب می‌شود، نه یک عددِ دستی که قابل دست‌کاری است.
 *
 *  4) hai_cases — ب-۵-۵-۱ («بیماریابی مستمر و گزارش ماهیانه عفونت‌های
 *     بیمارستانی») و ب-۵-۵-۴ (طغیان). ستون is_outbreak روی همان رکورد است نه
 *     جدول جدا، چون طغیان مجموعه‌ای از همین موارد است با یک نشانه.
 *
 *  5) antibiograms — ب-۵-۶-۲: «حداقل سه ماه یک‌بار، نتایج مقاومت‌های میکروبی
 *     گزارش شده و نتایج آن در روند تجویز و مصرف منطقی آنتی‌بیوتیک اعمال شود».
 *     پس دوره (سال/فصل) و «چه تغییری در تجویز ایجاد شد» هر دو ستون‌اند.
 *
 * چیزی که ساخته نشد: بندهای کالبدی (تفکیک فضای کثیف/تمیز/استریل — ب-۵-۳-۱،
 * مسیر انتقال در اتاق عمل — ب-۵-۳-۳) وضعیتِ ساختمانی‌اند نه داده‌ی دوره‌ای؛
 * جای‌شان چک‌لیست و ممیزیِ موجود است، نه یک جدول تازه.
 *
 * Run: خودکار روی هر boot. idempotent است.
 */
const { db } = require('../src/config/database-sqlite');
const { grantPerms } = require('./seed-library');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS sterilizers (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'اتوکلاو بخار',
    location TEXT,
    serial_no TEXT,
    manufacturer TEXT,
    responsible TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ster_h ON sterilizers(hospital_id, is_active)`,

  `CREATE TABLE IF NOT EXISTS sterilizer_tests (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    sterilizer_id TEXT NOT NULL REFERENCES sterilizers(id) ON DELETE CASCADE,
    test_date TEXT NOT NULL,
    test_type TEXT NOT NULL DEFAULT 'بیولوژیک',
    cycle_no TEXT,
    result TEXT NOT NULL DEFAULT 'pass',
    operator TEXT,
    action_taken TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_stt_h ON sterilizer_tests(hospital_id, sterilizer_id, test_date)`,

  `CREATE TABLE IF NOT EXISTS sterile_batches (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    sterilizer_id TEXT REFERENCES sterilizers(id) ON DELETE SET NULL,
    batch_label TEXT NOT NULL,
    pack_content TEXT NOT NULL,
    cycle_no TEXT,
    sterilized_date TEXT NOT NULL,
    expiry_date TEXT,
    operator TEXT,
    destination TEXT,
    chemical_indicator_ok INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'released',
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sbt_h ON sterile_batches(hospital_id, sterilized_date)`,

  `CREATE TABLE IF NOT EXISTS hand_hygiene_audits (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    audit_date TEXT NOT NULL,
    ward TEXT NOT NULL,
    staff_group TEXT,
    moment TEXT,
    opportunities INTEGER NOT NULL DEFAULT 0,
    compliant INTEGER NOT NULL DEFAULT 0,
    compliance_pct REAL,
    auditor TEXT,
    corrective_action TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_hha_h ON hand_hygiene_audits(hospital_id, audit_date)`,

  `CREATE TABLE IF NOT EXISTS hai_cases (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    detected_date TEXT NOT NULL,
    ward TEXT NOT NULL,
    infection_type TEXT NOT NULL DEFAULT 'عفونت محل جراحی',
    organism TEXT,
    patient_ref TEXT,
    device_related TEXT,
    is_outbreak INTEGER NOT NULL DEFAULT 0,
    reported_to_system INTEGER NOT NULL DEFAULT 0,
    reported_date TEXT,
    control_measures TEXT,
    outcome TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_hai_h ON hai_cases(hospital_id, detected_date, is_outbreak)`,

  `CREATE TABLE IF NOT EXISTS antibiograms (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    jalali_year INTEGER NOT NULL,
    quarter INTEGER NOT NULL DEFAULT 1,
    report_date TEXT,
    scope TEXT,
    key_findings TEXT NOT NULL,
    resistant_organisms TEXT,
    prescribing_changes TEXT,
    restricted_antibiotics TEXT,
    approved_by TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_abg_h ON antibiograms(hospital_id, jalali_year, quarter)`,
];

const ROLE_PERMS = {
  admin: ['manage_infection', 'view_infection'],
  quality_control_manager: ['manage_infection', 'view_infection'],
  infection_control_supervisor: ['manage_infection', 'view_infection'],
  nursing_director: ['view_infection'],
  clinical_supervisor: ['view_infection'],
};

function runMigration() {
  for (const sql of TABLES) db.exec(sql);
  grantPerms(ROLE_PERMS, 'Seed InfectionControl');
  console.log('[Seed InfectionControl] ✅ sterilizers+tests / sterile batches / hand hygiene / HAI / antibiograms ready');
}

module.exports = { runMigration };

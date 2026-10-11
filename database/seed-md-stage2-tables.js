/**
 * Migration مرحله ۲ بسته C: جدول‌های فرم اداری/یخچال/تحویل شیفت/امانت/گواهی/نیازسنجی/آموزش بیمار
 * چرا: خوانش هر ۹۸ فایل md ثابت کرد این ۸ موجودیت جدول ندارند (فرم‌های کددار HRM/FM/EU/NM،
 * لاگ روزانه یخچال کد ۴۶، تحول شیفت، امانت بین‌بخشی، کارنامه/گواهی، نیازسنجی رسمی،
 * ~۱۵۰ پمفلت آموزش بیمار). فقط DDL + ستون سازگار mountCrud (created_by). idempotent.
 * همه hospital_id دارند. داده در seed-md-stage2-data.js می‌آید.
 * Run: npm run seed-md-stage2-tables
 */
function store() {
  return require('../src/config/database-sqlite');
}

const TABLES = [
  `CREATE TABLE IF NOT EXISTS admin_forms (
    id TEXT PRIMARY KEY, hospital_id TEXT NOT NULL,
    form_code TEXT, title TEXT NOT NULL, category TEXT,
    fields_json TEXT DEFAULT '[]', status TEXT DEFAULT 'active',
    created_by TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS admin_form_submissions (
    id TEXT PRIMARY KEY, hospital_id TEXT NOT NULL,
    form_id TEXT NOT NULL, data_json TEXT DEFAULT '{}',
    submitted_by TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS fridge_logs (
    id TEXT PRIMARY KEY, hospital_id TEXT NOT NULL,
    ward TEXT NOT NULL, log_date TEXT NOT NULL,
    temp_morning REAL, temp_evening REAL, humidity REAL,
    defrost_done INTEGER DEFAULT 0, controller_role TEXT,
    created_by TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS shift_handovers (
    id TEXT PRIMARY KEY, hospital_id TEXT NOT NULL,
    ward TEXT NOT NULL, handover_date TEXT NOT NULL,
    from_shift TEXT, to_shift TEXT, summary TEXT, issues TEXT,
    created_by TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS equipment_loans (
    id TEXT PRIMARY KEY, hospital_id TEXT NOT NULL,
    item_name TEXT NOT NULL, from_ward TEXT, to_ward TEXT,
    loan_date TEXT, return_date TEXT, status TEXT DEFAULT 'active',
    receiver_role TEXT, created_by TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS training_certs (
    id TEXT PRIMARY KEY, hospital_id TEXT NOT NULL,
    course_title TEXT NOT NULL, holder_role TEXT, score REAL,
    issue_date TEXT, cert_no TEXT,
    created_by TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS training_needs_assessment (
    id TEXT PRIMARY KEY, hospital_id TEXT NOT NULL,
    group_name TEXT, topic TEXT NOT NULL, priority TEXT DEFAULT 'متوسط',
    year INTEGER, created_by TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS patient_education (
    id TEXT PRIMARY KEY, hospital_id TEXT NOT NULL,
    disease TEXT NOT NULL, inpatient_content TEXT, discharge_content TEXT,
    created_by TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`,
];

const ALTERS = [
  ['stock_items', 'created_by TEXT'],
  ['stock_items', 'created_at TEXT'],
  ['stock_moves', 'created_by TEXT'],
  ['stock_moves', 'created_at TEXT'],
  ['crash_cart_stock', 'created_by TEXT'],
  ['antidotes', 'created_by TEXT'],
  ['antidotes', 'created_at TEXT'],
  ['crisis_roles', 'created_by TEXT'],
  ['crisis_roles', 'created_at TEXT'],
  ['incident_learning', 'created_by TEXT'],
  ['clinical_notes', 'created_by TEXT'],
];

function run() {
  const { query } = store();
  for (const sql of TABLES) {
    try { query(sql); } catch (e) { console.error('[Seed Stage2Tables] failed:', e.message); }
  }
  for (const [t, col] of ALTERS) {
    try {
      const cols = query('PRAGMA table_info(' + t + ')').rows.map(r => r.name);
      const name = col.split(' ')[0];
      if (!cols.includes(name)) query('ALTER TABLE ' + t + ' ADD COLUMN ' + col);
    } catch (e) { /* non-fatal */ }
  }
  console.log('[Seed Stage2Tables] 8 tables + 11 columns ready (idempotent).');
  return { tables: TABLES.length };
}

module.exports = { run, runMigration: run };

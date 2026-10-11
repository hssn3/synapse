/**
 * Migration: جدول‌های گمشده قطعی از md (بسته C — مرحله ۲)
 * چرا این فایل ساخته شد: خوانش ۵۵ دسته + بخش‌های 001 تا 017 ثابت کرد این ۶ موجودیت
 * در پروژه جدول ندارند: انبار مرکزی (کد کالا/موجودی/نقطه سفارش/رسید/حواله)، استوک
 * ترالی احیا (کشو/دارو/تعداد/EXP — دسته ۹۰/۹۱)، آنتی‌دوت‌ها (جنرال/ویژه/ICU)، شرح
 * وظایف بحران (66/67/68)، درس‌آموخته‌ها (RCA/FMEA بدون نام بیمار)، نکات بالینی
 * خلاصه. فقط اسکیما می‌سازد و داده نمی‌گذارد (داده پس از پایان هر ۵ ایجنت md).
 * idempotent: CREATE TABLE IF NOT EXISTS — اجرای دوباره صفر تغییر. همه hospital_id دارند.
 * Run: npm run seed-md-missing-tables
 */
function store() {
  return require('../src/config/database-sqlite');
}

const TABLES = [
  `CREATE TABLE IF NOT EXISTS stock_items (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL,
    item_code TEXT,
    item_name TEXT NOT NULL,
    category TEXT,
    qty REAL DEFAULT 0,
    reorder_point REAL,
    exp_date TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS stock_moves (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    move_type TEXT NOT NULL,
    qty REAL NOT NULL,
    doc_no TEXT,
    move_date TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS crash_cart_stock (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL,
    cart_location TEXT NOT NULL,
    drawer TEXT NOT NULL,
    item_name TEXT NOT NULL,
    qty INTEGER DEFAULT 0,
    exp_date TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS antidotes (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL,
    poisoning TEXT NOT NULL,
    antidote TEXT NOT NULL,
    note TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS crisis_roles (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL,
    title TEXT NOT NULL,
    duty_scope TEXT,
    report_to TEXT,
    contact_role TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS incident_learning (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL,
    title TEXT NOT NULL,
    source TEXT,
    lesson TEXT,
    action TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS clinical_notes (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
];

function run() {
  const { query } = store();
  for (const sql of TABLES) {
    try { query(sql); } catch (e) { console.error('[Seed MissingTables] failed:', e.message); }
  }
  console.log('[Seed MissingTables] 7 tables ready (idempotent).');
  return { tables: TABLES.length };
}

module.exports = { run, runMigration: run };

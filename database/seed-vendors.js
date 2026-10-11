/**
 * پیمانکاران و تأمین‌کنندگان — استاندارد الف‑۱‑۱۰ (چهار سنجه)
 * ---------------------------------------------------------------------
 * واژه‌ی «پیمانکار» در کلِ مخزن فقط یک فیلدِ متنی در facility-assets بود
 * (پیمانکارِ تعمیرِ یک دستگاه) و «تأمین‌کننده» اصلاً وجود نداشت — در حالی که
 * الف‑۱‑۱۰ یک استانداردِ کامل با چهار سنجه است.
 *
 * سه جدول، چون متنِ سنجه‌ها سه چرخه‌ی جدا دارد:
 *
 *  ۱) vendors — الف‑۱‑۱۰‑۱ و ۱۰‑۳: «انتخاب پیمانکاران با لحاظ معیارهای کیفی
 *     به صورت مدون» و «ارزیابی و انتخاب تامین کنندگان با لحاظ معیارهای معین».
 *     پیمانکار و تأمین‌کننده یک جدول با ستونِ kind شدند، نه دو جدولِ همسان:
 *     چرخه‌ی هر دو یکی است (انتخاب با معیار → قرارداد → پایش) و تفاوتشان فقط
 *     در چیزی است که تحویل می‌دهند.
 *     سررسیدِ قرارداد ستون دارد چون قراردادِ منقضی‌شده در ممیزی همان
 *     «بدون قرارداد» است.
 *
 *  ۲) vendor_evaluations — الف‑۱‑۱۰‑۱/۳، بندِ «معیار»: ارزیابیِ امتیازدهی‌شده در
 *     لحظه‌ی انتخاب. معیارها و وزنشان متنی ذخیره می‌شوند نه ستون‌های ثابت، چون
 *     هر بیمارستان معیارِ خودش را دارد و ستونِ ثابت یعنی معیارِ تحمیلی.
 *
 *  ۳) vendor_reviews — الف‑۱‑۱۰‑۲ و ۱۰‑۴: «**نظارت مستمر** بر عملکرد پیمانکاران»
 *     و «پیمانکاران مایل به تداوم همکاری هستند». «مستمر» یعنی دوره‌ای، پس یک
 *     ردیف به‌ازای هر دوره؛ و رضایتِ دوطرفه دو ستونِ جدا دارد چون سنجه‌ی
 *     الف‑۱‑۱۰‑۴ از *طرفِ پیمانکار* می‌پرسد، نه از ما.
 *
 * Run: node database/seed-vendors.js (یا خودکار روی هر boot). idempotent است.
 */
const { db } = require('../src/config/database-sqlite');
const { grantPerms } = require('./seed-library');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS vendors (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'پیمانکار',
    title TEXT NOT NULL,
    service_scope TEXT,
    contact_person TEXT,
    phone TEXT,
    national_id TEXT,
    contract_no TEXT,
    contract_start TEXT,
    contract_end TEXT,
    contract_amount TEXT,
    responsible_unit TEXT,
    selection_criteria TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_vnd_h ON vendors(hospital_id, kind, is_active)`,

  `CREATE TABLE IF NOT EXISTS vendor_evaluations (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    vendor_id TEXT REFERENCES vendors(id) ON DELETE CASCADE,
    eval_date TEXT,
    purpose TEXT NOT NULL DEFAULT 'انتخاب اولیه',
    criteria TEXT,
    quality_score REAL,
    price_score REAL,
    delivery_score REAL,
    total_score REAL,
    decision TEXT NOT NULL DEFAULT 'تأیید',
    committee_ref TEXT,
    evaluator TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_vev_h ON vendor_evaluations(hospital_id, vendor_id, eval_date)`,

  `CREATE TABLE IF NOT EXISTS vendor_reviews (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    vendor_id TEXT REFERENCES vendors(id) ON DELETE CASCADE,
    period TEXT,
    review_date TEXT,
    performance_score REAL,
    complaints_count INTEGER,
    nonconformities TEXT,
    corrective_action TEXT,
    our_satisfaction TEXT,
    vendor_willing_to_continue TEXT,
    reviewer TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_vrv_h ON vendor_reviews(hospital_id, vendor_id, review_date)`,
];

/* ⚠ financial_manager / accounting_manager / technical_officer / hospital_president /
   accreditation_manager را این‌جا نگذارید — seed-management-roles.js بعد از این
   فایل اجرا می‌شود و permissions آن نقش‌ها را کامل بازنویسی می‌کند. */
const ROLE_PERMS = {
  admin: ['manage_vendors', 'view_vendors'],
  quality_control_manager: ['manage_vendors', 'view_vendors'],
  nutrition_manager: ['view_vendors'],
};

function runMigration() {
  console.log('[Seed Vendors] Starting...');
  try {
    for (const sql of TABLES) db.exec(sql);
    grantPerms(ROLE_PERMS, 'Seed Vendors');
    console.log('[Seed Vendors] ✅ vendors / vendor_evaluations / vendor_reviews ready');
  } catch (err) {
    console.error('[Seed Vendors] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) { runMigration(); process.exit(0); }
module.exports = { runMigration };

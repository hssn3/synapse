/**
 * منابع مالی و مشارکت‌های مردمی — الف‑۱‑۹‑۱ و الف‑۱‑۹‑۳
 * ---------------------------------------------------------------------
 * تا پیش از این، تنها ردِ «مالی» در کلِ مخزن یک منظرِ مالی در کارت امتیازی
 * متوازن بود؛ یعنی جایی برای «بودجه‌ی تخصیصی در برابر هزینه‌ی واقعی» و برای
 * «کمکِ خیرین» وجود نداشت، در حالی که هر دو سنجه‌ی مستقل‌اند.
 *
 * چهار جدول، چون متنِ دو سنجه چهار چرخه‌ی جدا دارد:
 *
 *  ۱) fin_budget_lines — الف‑۱‑۹‑۱، بندِ «هزینه‌کردِ منابع و بودجه‌های عملیاتی
 *     تخصیصی مطابق اهدافِ برنامه‌های ابلاغی». پس واحدِ ردیف، «برنامه» است نه
 *     سرفصلِ حسابداری: بدونِ ستونِ برنامه، انطباقِ هزینه با هدف قابل نشان‌دادن
 *     نیست و سنجه دقیقاً همین انطباق را می‌خواهد.
 *     انحراف در سرور حساب می‌شود، نه دستی — عددی که خودش را توضیح می‌دهد.
 *
 *  ۲) fin_reports — همان سنجه، بندِ «مدیر مالی گزارش‌های تفسیری و تحلیلی
 *     ماهانه … در اختیار تیم رهبری و مدیریت قرار می‌گیرد». ماهانه‌بودن یعنی یک
 *     ردیف به‌ازای هر ماه، و «در اختیارِ تیم رهبری» یعنی ستونِ تحویل و تاریخِ
 *     بررسی — گزارشی که به تیم رهبری نرسیده، در ممیزی همان گزارشِ نانوشته است.
 *     ستونِ کنترلِ داخلیِ حسابداری هم این‌جاست چون همان سنجه آن را دوره‌ای
 *     خواسته و جایِ طبیعی‌اش گزارشِ ماهانه است، نه یک جدولِ تک‌ستونیِ جدا.
 *
 *  ۳) fin_donations — الف‑۱‑۹‑۳: هر کمکِ خیّر یک ردیف. دو قاعده‌ی خودِ متن
 *     ستون گرفتند: هزینه‌ی درمانِ مددجو «با هماهنگی مددکاری»، و ساخت/تجهیز و
 *     بازسازی «با تأیید تیم رهبری و مدیریت». اگر این دو فقط در توضیح می‌ماندند،
 *     نبودشان قابل شمردن نبود.
 *     نامِ بیمار ذخیره نمی‌شود؛ فقط کدِ پرونده — کمکِ خیّر به یک بیمارِ نام‌دار،
 *     خودش داده‌ی حساس است.
 *
 *  ۴) fin_donation_targets — همان سنجه، بندِ اولِ آن: «تعیین مقدار و سهم
 *     کمک‌های خیرین … در ۵ سال اخیر و هدف‌گذاری برای سال‌های آینده». این یعنی
 *     یک ردیف به‌ازای هر سال با هدف و برنامه‌ی ترویجی؛ بدونِ آن، فهرستِ کمک‌ها
 *     هست ولی «هدف‌گذاری» نیست.
 *
 * Run: node database/seed-finance.js (یا خودکار روی هر boot). idempotent است.
 */
const { db } = require('../src/config/database-sqlite');
const { grantPerms } = require('./seed-library');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS fin_budget_lines (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    year TEXT,
    period TEXT,
    program_title TEXT NOT NULL,
    budget_code TEXT,
    source TEXT NOT NULL DEFAULT 'ردیف بودجه‌ای',
    allocated_amount REAL,
    spent_amount REAL,
    variance REAL,
    variance_pct REAL,
    aligned_with_program INTEGER NOT NULL DEFAULT 1,
    deviation_reason TEXT,
    corrective_action TEXT,
    responsible TEXT,
    approved_by TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_finb_h ON fin_budget_lines(hospital_id, year, period)`,

  `CREATE TABLE IF NOT EXISTS fin_reports (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    year TEXT,
    month TEXT,
    total_allocated REAL,
    total_spent REAL,
    variance_pct REAL,
    analysis TEXT,
    deviations TEXT,
    actions TEXT,
    internal_control_done INTEGER NOT NULL DEFAULT 0,
    internal_control_note TEXT,
    submitted_to_leadership INTEGER NOT NULL DEFAULT 0,
    leadership_review_date TEXT,
    leadership_decision TEXT,
    prepared_by TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_finr_h ON fin_reports(hospital_id, year, month)`,

  `CREATE TABLE IF NOT EXISTS fin_donations (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    year TEXT,
    donation_date TEXT,
    donor_name TEXT NOT NULL,
    donor_kind TEXT NOT NULL DEFAULT 'خیّر حقیقی',
    kind TEXT NOT NULL DEFAULT 'نقدی',
    amount REAL,
    purpose TEXT,
    target_program TEXT,
    patient_case_code TEXT,
    social_work_coordinated INTEGER NOT NULL DEFAULT 0,
    leadership_approved INTEGER NOT NULL DEFAULT 0,
    receipt_no TEXT,
    recorded_in_accounting INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_find_h ON fin_donations(hospital_id, year, kind)`,

  `CREATE TABLE IF NOT EXISTS fin_donation_targets (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    year TEXT NOT NULL,
    target_amount REAL,
    achieved_amount REAL,
    achieved_pct REAL,
    share_of_budget_pct REAL,
    promotion_plan TEXT,
    meetings_held INTEGER,
    approved_by TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_fint_h ON fin_donation_targets(hospital_id, year)`,
];

/* ⚠ financial_manager / accounting_manager / hospital_president /
   accreditation_manager را این‌جا نگذارید — seed-management-roles.js بعد از این
   فایل اجرا می‌شود و permissions آن نقش‌ها را کامل بازنویسی می‌کند.
   مجوزِ آن نقش‌ها در همان فایل اضافه شده است. */
const ROLE_PERMS = {
  admin: ['manage_finance', 'view_finance'],
  quality_control_manager: ['view_finance'],
  nursing_director: ['view_finance'],
};

function runMigration() {
  console.log('[Seed Finance] Starting...');
  try {
    for (const sql of TABLES) db.exec(sql);
    grantPerms(ROLE_PERMS, 'Seed Finance');
    console.log('[Seed Finance] ✅ fin_budget_lines / fin_reports / fin_donations / fin_donation_targets ready');
  } catch (err) {
    console.error('[Seed Finance] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) { runMigration(); process.exit(0); }
module.exports = { runMigration };

/**
 * Migration + Seed: برنامه‌های بهبود / عملیاتی / استراتژیک — شکاف ۴ رقیب
 * (docs/hassan_ANALYSIS.md بند ۷ — هاب سه‌دسته‌ای برنامه‌ها با گردش‌کار «پیشنهاد → تأیید»)
 *
 * چرا فقط یک جدول و نه آبشار کامل راهبرد→هدف→اولویت→برنامه؟
 *  طراحی اولیه حسن یک ماژول کامل OKR سازمانی دارد (Strategy → Goal → Priority → Program). ارزش عملی
 *  آن برای بیمارستان در «پیشنهاد پایین‌به‌بالا و تأیید مدیریتی + درصد پیشرفت» است، نه در
 *  سلسله‌مراتب سه‌لایه‌ی اهداف. پس هدف استراتژیک به‌صورت یک فیلد متنی روی خود برنامه نگه
 *  داشته می‌شود؛ اگر بعداً «تدوین برنامه استراتژیک» ساخته شد، این ستون به FK تبدیل می‌شود
 *  بدون آن‌که داده‌ی موجود از دست برود.
 *
 * نکته‌ی دسترسی: ساخت برنامه عمداً پشت هیچ مجوزی نیست — الگوی «پیشنهاد برنامه» در طراحی اولیه حسن
 * صریحاً پایین‌به‌بالاست و هر کارمندی می‌تواند پیشنهاد بدهد. فقط تأیید/رد پشت
 * approve_programs است.
 * Run: npm run seed-programs — idempotent است و روی هر boot امن اجرا می‌شود.
 */
const { db } = require('../src/config/database-sqlite');
const { grantPerms } = require('./seed-library');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS improvement_programs (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    program_type TEXT NOT NULL DEFAULT 'بهبود',
    description TEXT,
    strategic_goal TEXT,
    department TEXT,
    proposed_by TEXT REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'پیشنهاد_شده',
    progress_percent INTEGER DEFAULT 0,
    start_date TEXT,
    due_date TEXT,
    approved_by TEXT REFERENCES users(id),
    approved_at TEXT,
    decision_note TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_prog_hospital ON improvement_programs(hospital_id, status, program_type)`,
  `CREATE INDEX IF NOT EXISTS idx_prog_dept ON improvement_programs(hospital_id, department)`,
];

// مشاهده گسترده (همه پیشنهاد می‌دهند پس همه باید فهرست را ببینند)، تأیید فقط مدیریتی
const ROLE_PERMS = {
  admin: ['approve_programs', 'view_programs'],
  quality_control_manager: ['approve_programs', 'view_programs'],
  nursing_director: ['approve_programs', 'view_programs'],
  clinical_supervisor: ['view_programs'],
  education_supervisor: ['view_programs'],
  infection_control_supervisor: ['view_programs'],
  breastfeeding_specialist: ['view_programs'],
  staff_nurse: ['view_programs'],
};

function runMigration() {
  console.log('[Seed Programs] Starting...');
  try {
    for (const sql of TABLES) db.exec(sql);
    grantPerms(ROLE_PERMS, 'Seed Programs');
    console.log('[Seed Programs] ✅ improvement_programs ready');
  } catch (err) {
    console.error('[Seed Programs] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };

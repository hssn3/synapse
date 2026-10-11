/**
 * Migration + Seed: نیازسنجی آموزشی — شکاف ۵ رقیب (آخرین قلم فهرست اولویت)
 * (docs/hassan_ANALYSIS_V4.md بندهای ۲ و ۳ — سه پنل `/nr/education/{user,superior,supervisor}`)
 *
 * چرا یک جدول و نه سه جدول برای سه پنل؟
 *  سه آدرسِ رقیب سه *نما* روی یک داده‌اند، نه سه مدل داده: «پنل کاربر» درخواست‌های خودِ کاربر،
 *  «پنل مافوق» درخواست‌هایی که منتظر نظر سرپرست‌اند، «پنل سازمان» درخواست‌هایی که مافوق تأیید
 *  کرده و منتظر تصمیم نهایی دفتر آموزش‌اند. پس یک جدول با ماشین وضعیت، دقیقاً مثل
 *  improvement_programs (پیشنهاد → تأیید) که یک گام کمتر دارد.
 *
 * نکته اصطلاح‌شناسی (hassan_ANALYSIS_V4 بند ۱): در ادبیات رقیب `superior` = «مافوق» (سرپرست بخش)
 * و `supervisor` = «سازمان» (دفتر آموزش بیمارستان). نام‌گذاری اینجا از معنا پیروی می‌کند نه از
 * آن آدرس‌ها: مرحله ۲ = مافوق، مرحله ۳ = سازمان.
 *
 * مسئله‌ی «مافوق کیست؟»: ستون users.supervisor_id از قبل در اسکیما هست ولی برای هیچ کاربری
 * پر نشده و هیچ‌جای برنامه نوشته/خوانده نمی‌شود. پس هر دو راه پشتیبانی می‌شود:
 *   ۱) اگر users.supervisor_id کاربر پر باشد، همان به‌عنوان superior_id درخواست ثبت می‌شود.
 *   ۲) در غیر این صورت کاربر (یا ادمین) هنگام ثبت، مافوق را از فهرست کاربران بیمارستان انتخاب
 *      می‌کند؛ و اگر هیچ‌کدام نبود، هر کاربر دارای مجوز review_training_needs درخواست‌های
 *      «بدون مافوقِ مشخص» را در کارتابل مرحله ۲ خود می‌بیند تا هیچ درخواستی زمین نماند.
 * وضعیت: ثبت_شده → بررسی_مافوق → تأییدشده | رد_شده (رد در هر دو مرحله ممکن است)
 * Run: npm run seed-training — idempotent است و روی هر boot امن اجرا می‌شود.
 */
const { db } = require('../src/config/database-sqlite');
const { grantPerms } = require('./seed-library');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS training_needs (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    employee_id TEXT REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    requested_course_type TEXT NOT NULL DEFAULT 'عمومی',
    job_group TEXT,
    department TEXT,
    year TEXT,
    status TEXT NOT NULL DEFAULT 'ثبت_شده',
    superior_id TEXT REFERENCES users(id),
    superior_decision TEXT,
    superior_comment TEXT,
    superior_reviewed_at TEXT,
    org_decision TEXT,
    org_comment TEXT,
    decided_by TEXT REFERENCES users(id),
    decided_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_trn_hospital ON training_needs(hospital_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_trn_employee ON training_needs(hospital_id, employee_id)`,
  `CREATE INDEX IF NOT EXISTS idx_trn_superior ON training_needs(hospital_id, superior_id, status)`,
];

// ثبت نیاز آموزشی عمداً پشت هیچ مجوزی نیست (الگوی پایین‌به‌بالا، مثل برنامه‌ها و FMEA).
// review_training_needs = مرحله ۲ (مافوق/سرپرست بخش)، approve_training = مرحله ۳ (دفتر آموزش).
const ROLE_PERMS = {
  admin: ['review_training_needs', 'approve_training', 'view_training'],
  quality_control_manager: ['review_training_needs', 'approve_training', 'view_training'],
  // سوپروایزر آموزشی = همان «سازمان»/دفتر آموزش در ادبیات رقیب — صاحب اصلی تأیید نهایی
  education_supervisor: ['review_training_needs', 'approve_training', 'view_training'],
  nursing_director: ['review_training_needs', 'view_training'],
  clinical_supervisor: ['review_training_needs', 'view_training'],
  infection_control_supervisor: ['review_training_needs', 'view_training'],
  breastfeeding_specialist: ['view_training'],
  staff_nurse: ['view_training'],
};

function runMigration() {
  console.log('[Seed Training] Starting...');
  try {
    for (const sql of TABLES) db.exec(sql);
    grantPerms(ROLE_PERMS, 'Seed Training');
    console.log('[Seed Training] ✅ training_needs ready');
  } catch (err) {
    console.error('[Seed Training] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };

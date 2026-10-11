/**
 * آموزش و اثربخشی — الف‑۳‑۲‑۴ و الف‑۴‑۲‑۳/۴/۵
 * ---------------------------------------------------------------------
 * ماژولِ `training` موجود فقط **نیازسنجی** است: جدولِ training_needs ستونِ
 * برگزاری ندارد و ستونِ اثربخشی هم ندارد. یعنی چهار سنجه‌ی بالا هیچ میزبانی
 * نداشتند — نه سیاستِ آموزشِ بیمار، نه رکوردِ برگزاری، نه پیش‌آزمون/پس‌آزمون.
 *
 * سه جدول، دقیقاً به شکلی که متنِ سنجه‌ها خواسته‌اند:
 *
 *  ۱) edu_policies — الف‑۴‑۲‑۳: «سیاست‌های آموزشی بیماران … تدوین **و ابلاغ**
 *     شده است». پس «تدوین» و «ابلاغ» دو ستونِ جدا هستند نه یکی: سیاستی که
 *     نوشته شده ولی ابلاغ نشده، در ممیزی نصفِ سنجه است.
 *     ستونِ revision_basis برای الف‑۴‑۲‑۵ است: بازنگری باید بگوید **بر پایه‌ی
 *     کدام نتیجه‌ی اثربخشی** انجام شده، وگرنه «بازنگری» یک تاریخ است نه یک کار.
 *
 *  ۲) edu_sessions — الف‑۴‑۲‑۴ («برنامه‌ریزی آموزشی بیماران **در چارچوب
 *     سیاست‌های** مدیریت پرستاری») و ظرفِ دوره‌های کارکنان.
 *     ستونِ audience دو مخاطب را در یک جدول نگه می‌دارد چون چرخه‌شان یکی است
 *     (برنامه → برگزاری → سنجشِ اثربخشی) و تنها تفاوتشان این است که دوره‌ی
 *     بیمار باید به یک سیاست بچسبد.
 *
 *  ۳) edu_effectiveness — الف‑۳‑۲‑۴. متنِ سنجه روشِ سنجش را خودش تعیین کرده و
 *     ستون‌ها از همان بیرون آمده‌اند، نه از حدس:
 *       • حیطه‌ی آگاهی → «با انجام پیش‌آزمون و پس‌آزمون» → دو ستونِ جدا
 *       • حیطه‌ی مهارت → «با بررسی مهارت‌های عملی … ارزیابی میدانی» → ستونِ جدا
 *       • «بر مبنای شاخص‌های اثربخشی» → ستونِ هدف، که باید از پیش تعیین شود
 *     «اثربخش بودن» در سرور از مقایسه‌ی نتیجه با همان هدف درمی‌آید، نه با
 *     تیکِ دستی — وگرنه هر دوره‌ای اثربخش اعلام می‌شود.
 *
 * Run: node database/seed-education.js (یا خودکار روی هر boot). idempotent است.
 */
const { db } = require('../src/config/database-sqlite');
const { grantPerms } = require('./seed-library');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS edu_policies (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    audience TEXT NOT NULL DEFAULT 'بیماران',
    care_level TEXT,
    version TEXT,
    content TEXT,
    approved_by TEXT,
    approved_date TEXT,
    communicated INTEGER NOT NULL DEFAULT 0,
    communication_method TEXT,
    communication_date TEXT,
    last_review_date TEXT,
    revision_basis TEXT,
    next_review_due TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_edup_h ON edu_policies(hospital_id, audience, is_active)`,

  `CREATE TABLE IF NOT EXISTS edu_sessions (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    policy_id TEXT REFERENCES edu_policies(id) ON DELETE SET NULL,
    audience TEXT NOT NULL DEFAULT 'کارکنان',
    title TEXT NOT NULL,
    topic TEXT,
    ward TEXT,
    target_group TEXT,
    session_date TEXT,
    duration_hours REAL,
    trainer TEXT,
    method TEXT,
    planned INTEGER NOT NULL DEFAULT 1,
    participants_count INTEGER,
    invited_count INTEGER,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_edus_h ON edu_sessions(hospital_id, audience, session_date)`,

  `CREATE TABLE IF NOT EXISTS edu_effectiveness (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    session_id TEXT REFERENCES edu_sessions(id) ON DELETE CASCADE,
    eval_date TEXT,
    target_pct REAL,
    pre_test_score REAL,
    post_test_score REAL,
    knowledge_gain REAL,
    skill_method TEXT,
    skill_score REAL,
    effective INTEGER NOT NULL DEFAULT 0,
    evaluated_count INTEGER,
    corrective_action TEXT,
    used_in_policy_review INTEGER NOT NULL DEFAULT 0,
    policy_review_ref TEXT,
    evaluator TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_edue_h ON edu_effectiveness(hospital_id, session_id, eval_date)`,
];

/* ⚠ hospital_president / accreditation_manager / hr_manager را این‌جا نگذارید —
   seed-management-roles.js بعد از این فایل اجرا می‌شود و permissions آن نقش‌ها
   را کامل بازنویسی می‌کند. مجوزشان همان‌جا اضافه شده است. */
const ROLE_PERMS = {
  admin: ['manage_education', 'view_education'],
  education_supervisor: ['manage_education', 'view_education'],
  nursing_director: ['manage_education', 'view_education'],
  quality_control_manager: ['view_education'],
  clinical_supervisor: ['view_education'],
  infection_control_supervisor: ['view_education'],
};

function runMigration() {
  console.log('[Seed Education] Starting...');
  try {
    for (const sql of TABLES) db.exec(sql);
    grantPerms(ROLE_PERMS, 'Seed Education');
    console.log('[Seed Education] ✅ edu_policies / edu_sessions / edu_effectiveness ready');
  } catch (err) {
    console.error('[Seed Education] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) { runMigration(); process.exit(0); }
module.exports = { runMigration };

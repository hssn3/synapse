/**
 * Migration: داشبورد سرپرستار/جانشین بخش (خودِ فرد، نه پنل ادمین سلسله‌مراتب پرستاری)
 *
 * تصمیم دسترسی: نقش جدید ساخته نشد. طبق همان الگویی که database/seed-nursing-hierarchy.js
 * برای head_nurse_id/deputy1_id/deputy2_id دنبال کرده (انتخاب از «کاربران فعال بیمارستان»،
 * نه یک role مجزا) — یک کاربر می‌تواند staff_nurse یا هر نقش دیگری باشد و همزمان به‌عنوان
 * سرپرستار/جانشینِ یک بخش در nursing_wards ثبت شود. پس دسترسی به این داشبورد
 * reference-based است: «آیا user.id در nursing_wards.head_nurse_id/deputy1_id/deputy2_id
 * برای هر بخشی دیده می‌شود؟» — نه یک permission ثابت. این منطق در src/routes/api.js
 * (تابع headNurseWardsOf) و src/routes/auth.js (برای نشان‌دادن مدخل ناوبری) پیاده شده.
 *
 * جدول‌ها:
 *  - nursing_leave_requests: درخواست مرخصی پرستار → بررسی سرپرستار/جانشین (سه‌حالته،
 *    دقیقاً مثل training_needs: در_انتظار → تأییدشده | ردشده)
 *  - nursing_daily_attendance: حضور/غیاب روزانه‌ی هر پرستار یک بخش (ثبت‌شده توسط
 *    سرپرستار حاضر، یا جانشینِ حاضر اگر سرپرستار غایب باشد)
 *  - nursing_head_presence: پرچم روزانه‌ی «سرپرستار امروز حاضر است؟» — تعیین می‌کند
 *    چه کسی مسئول ثبت حضور‌غیاب/چک‌لیست شیفت آن روز است
 *  - nursing_shift_tasks: چک‌لیست/فهرست‌کار هر شیفت (صبح/عصر/شب) یک بخش — اگر تا مهلت
 *    منطقی پایان شیفت پر نشود، در reminders.js به‌عنوان قلم کارتابل «هشدار» به سرپرستار
 *    همان بخش نمایش داده می‌شود (RULE_TYPES: shift_task_unfilled)
 *
 * Run: npm run seed-head-nurse (یا خودکار روی هر boot). idempotent است.
 */
const { db } = require('../src/config/database-sqlite');
const crypto = require('crypto');
const uid = () => crypto.randomUUID();

const TABLES = [
  `CREATE TABLE IF NOT EXISTS nursing_leave_requests (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    nurse_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ward TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'در_انتظار',
    reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TEXT,
    review_comment TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_nlr_ward ON nursing_leave_requests(hospital_id, ward, status)`,
  `CREATE INDEX IF NOT EXISTS idx_nlr_nurse ON nursing_leave_requests(hospital_id, nurse_id)`,

  `CREATE TABLE IF NOT EXISTS nursing_daily_attendance (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    ward TEXT NOT NULL,
    att_date TEXT NOT NULL,
    nurse_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    present INTEGER NOT NULL DEFAULT 1,
    note TEXT,
    marked_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_nda_uniq ON nursing_daily_attendance(hospital_id, ward, att_date, nurse_id)`,

  `CREATE TABLE IF NOT EXISTS nursing_head_presence (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    ward TEXT NOT NULL,
    p_date TEXT NOT NULL,
    head_present INTEGER NOT NULL DEFAULT 1,
    set_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_nhp_uniq ON nursing_head_presence(hospital_id, ward, p_date)`,

  `CREATE TABLE IF NOT EXISTS nursing_shift_tasks (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    ward TEXT NOT NULL,
    shift_date TEXT NOT NULL,
    shift_type TEXT NOT NULL,
    task_list TEXT,
    filled_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    filled_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_nst_uniq ON nursing_shift_tasks(hospital_id, ward, shift_date, shift_type)`,
];

const SHIFT_TYPES = ['صبح', 'عصر', 'شب'];

function seedReminderRule() {
  // reminder_rules از database/seed-reminders.js می‌آید و ممکن است بعد از این فایل اجرا شود؛
  // پس جدول را اینجا هم idempotent می‌سازیم تا هر ترتیب بوت امن باشد.
  db.exec(`CREATE TABLE IF NOT EXISTS reminder_rules (
    id TEXT PRIMARY KEY, hospital_id TEXT NOT NULL, name TEXT NOT NULL, rule_type TEXT NOT NULL,
    days_before INTEGER DEFAULT 7, channel TEXT DEFAULT 'inbox', enabled INTEGER DEFAULT 1,
    created_by TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT
  )`);
  let added = 0;
  for (const h of db.prepare('SELECT id FROM hospitals').all()) {
    const ex = db.prepare(`SELECT id FROM reminder_rules WHERE hospital_id = ? AND rule_type = 'shift_task_unfilled'`).get(h.id);
    if (ex) continue;
    db.prepare(`INSERT INTO reminder_rules (id, hospital_id, name, rule_type, days_before, channel, enabled)
      VALUES (?, ?, 'هشدار چک‌لیست شیفت پر نشده', 'shift_task_unfilled', 0, 'inbox', 1)`).run(uid(), h.id);
    added++;
  }
  return added;
}

function runMigration() {
  console.log('[Seed HeadNurse] Starting...');
  try {
    for (const sql of TABLES) db.exec(sql);
    const rulesAdded = seedReminderRule();
    console.log(`[Seed HeadNurse] ✅ nursing_leave_requests / nursing_daily_attendance / nursing_head_presence / nursing_shift_tasks ready (reminder rules added: ${rulesAdded})`);
  } catch (err) {
    console.error('[Seed HeadNurse] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration, SHIFT_TYPES };

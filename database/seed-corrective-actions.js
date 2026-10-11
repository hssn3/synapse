/* =====================================================================
   Migration: چرخه‌ی عدم انطباق و اقدام اصلاحی روی سنجه

   دومین (و آخرین) شکافِ واقعی که تطبیق با سندِ مرجعِ کارفرما پیدا کرد
   (بخش ۹ سند). زنجیره‌ی سند این است:

     سنجه → ثبت عدم انطباق → علت → اقدام اصلاحی → مسئول/مهلت
          → پیشرفت → مدرک → راستی‌آزمایی → تأیید/رد → بستن

   این چرخه از قبل برای چک‌لیست (checklist_corrective_action → tasks) و
   واکراند (walkaround_resolutions) و ممیزی داخلی (corrective_action_required)
   وجود داشت — اما نه برای خودِ سنجه. measure_status فقط وضعیتِ خوداظهاری و
   نمره‌ی داخلی/بیرونی را نگه می‌دارد؛ هیچ‌کدام «علت»، «راستی‌آزمایی» یا
   «بستن» ندارند.

   چرا جدولِ تازه و نه استفاده از tasks (مثل چک‌لیست): چرخه‌ی سند برای سنجه
   عمیق‌تر از یک وظیفه‌ی ساده است — هشت وضعیتِ متمایز، علتِ ریشه‌ای، درصدِ
   پیشرفت، و نتیجه‌ی جداگانه‌ی راستی‌آزمایی. چپاندنِ این‌ها در description ِ
   tasks یعنی parse کردنِ متنِ آزاد برای هر خواندن — همان الگویی که در سنجه‌ها
   دقیقاً منجر به خرابی شد (متنِ ساختاریافته که باید متنِ آزاد بماند).

   مجوزها: ساخت/به‌روزرسانیِ پیشرفت با همان edit_measure_status ی که سنجه را
   پر می‌کند (خودِ مسئولِ سنجه)؛ راستی‌آزمایی/تأیید/رد/بستن با
   approve_measure_status — همان مجوزِ بازبینیِ داخلی/بیرونیِ سنجه که از قبل
   وجود دارد، چون همان نقش‌ها (مدیر کیفیت، مدیر اعتباربخشی، مدیر پرستاری،
   رئیس) طبیعتاً کسانی‌اند که باید اقدامِ اصلاحی را هم تأیید کنند.
   ===================================================================== */
'use strict';

const { db, query } = require('../src/config/database-sqlite');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS measure_corrective_actions (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    measure_id TEXT NOT NULL REFERENCES accreditation_sections(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    root_cause TEXT,
    action_text TEXT,
    responsible_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    department TEXT,
    priority TEXT NOT NULL DEFAULT 'متوسط',
    start_date TEXT,
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'جدید',
    progress_percent INTEGER NOT NULL DEFAULT 0,
    evidence_note TEXT,
    verifier_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    verification_result TEXT,
    verification_note TEXT,
    verified_at TEXT,
    closed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    closed_at TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_mca_measure ON measure_corrective_actions(hospital_id, measure_id, year)`,
  `CREATE INDEX IF NOT EXISTS idx_mca_status ON measure_corrective_actions(hospital_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_mca_responsible ON measure_corrective_actions(hospital_id, responsible_user_id)`,
  // تاریخچه‌ی تغییرِ وضعیت — سند صریح می‌خواهد «وضعیت قبلی و جدید، کاربر، زمان
  // و دلیل audit شود». یک ردیفِ status روی خودِ جدولِ اصلی این را نمی‌دهد.
  `CREATE TABLE IF NOT EXISTS measure_corrective_action_history (
    id TEXT PRIMARY KEY,
    action_id TEXT NOT NULL REFERENCES measure_corrective_actions(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    note TEXT,
    changed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    changed_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_mca_hist_action ON measure_corrective_action_history(action_id)`,
];

function runMigration() {
  try {
    for (const sql of TABLES) db.exec(sql);
    console.log('[Seed CorrectiveActions] ✅ measure_corrective_actions + تاریخچه آماده است');
  } catch (err) {
    console.error('[Seed CorrectiveActions] failed:', err.message);
  }
}

module.exports = { runMigration };

if (require.main === module) runMigration();

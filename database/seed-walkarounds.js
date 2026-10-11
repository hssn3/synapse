/**
 * Migration + Seed: بازدید میدانی مدیریتی (واکراند) — شکاف ۲ تحلیل رقیب
 * ساخت جدول‌های management_walkarounds و walkaround_resolutions و افزودن
 * مجوزهای manage_walkarounds / view_walkarounds.
 *
 * چرا مجوز جدا و نه استفاده از manage_audits؟
 *  حسابرسی داخلی یک «بازرسی رسمی با پرسش‌نامه» است و مجوزش به مدیر کیفیت/مترون داده شده؛
 *  واکراند اما یک بازدید مدیریتی است که مصوبه تولید می‌کند و مسئول اجرا تعیین می‌کند —
 *  دامنهٔ نقش‌های درگیر (ریاست، مدیر داخلی، ایمنی بیمار) با ممیزی یکی نیست.
 *  view_walkarounds عمداً گسترده‌تر است چون هر مسئولِ مصوبه باید بتواند وضعیت را ببیند.
 *
 * چرا مصوبه‌ها جدول جدا هستند و نه ستون JSON؟
 *  هر مصوبه وضعیت، مسئول و مهلت مستقل دارد و داشبورد درصد اجرا باید روی همان‌ها
 *  GROUP BY بزند؛ با JSON، محاسبهٔ درصدها در SQL ممکن نبود.
 *
 * Run: npm run seed-walkarounds — idempotent است و روی هر boot امن اجرا می‌شود.
 */
const { db } = require('../src/config/database-sqlite');
const { grantPerms } = require('./seed-library');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS management_walkarounds (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    visit_date TEXT,
    department TEXT,
    attendees TEXT,            -- آرایه JSON از نام حاضران تیم بازدیدکننده
    absentees TEXT,            -- آرایه JSON از نام غایبان (درصد حضور/غیبت)
    summary TEXT,
    status TEXT DEFAULT 'planned',
    conducted_by TEXT REFERENCES users(id),
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS walkaround_resolutions (
    id TEXT PRIMARY KEY,
    walkaround_id TEXT NOT NULL REFERENCES management_walkarounds(id) ON DELETE CASCADE,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    responsible_user_id TEXT REFERENCES users(id),
    responsible_name TEXT,
    department TEXT,
    status TEXT DEFAULT 'not_done',  -- not_done | in_progress | done  (انجام‌نشده | در دست اقدام | انجام‌شده)
    due_date TEXT,
    completed_at TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_wa_hospital ON management_walkarounds(hospital_id, status, visit_date)`,
  `CREATE INDEX IF NOT EXISTS idx_wa_dept ON management_walkarounds(hospital_id, department)`,
  `CREATE INDEX IF NOT EXISTS idx_war_wa ON walkaround_resolutions(walkaround_id)`,
  `CREATE INDEX IF NOT EXISTS idx_war_resp ON walkaround_resolutions(hospital_id, responsible_user_id, status)`,
];

const ROLE_PERMS = {
  admin: ['manage_walkarounds', 'view_walkarounds'],
  quality_control_manager: ['manage_walkarounds', 'view_walkarounds'],
  nursing_director: ['manage_walkarounds', 'view_walkarounds'],
  clinical_supervisor: ['view_walkarounds'],
  infection_control_supervisor: ['view_walkarounds'],
};

function runMigration() {
  console.log('[Seed Walkarounds] Starting...');
  try {
    for (const sql of TABLES) db.exec(sql);
    grantPerms(ROLE_PERMS, 'Seed Walkarounds');
    console.log('[Seed Walkarounds] ✅ management_walkarounds + walkaround_resolutions ready');
  } catch (err) {
    console.error('[Seed Walkarounds] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };

// ============ مهاجرت: دوره‌ی سراسری اعتباربخشی ============
// یک ردیف به ازای هر بیمارستان (UNIQUE روی hospital_id): بازه‌ی زمانی رسمی ورود اطلاعات.
// سیاست سطح بیمارستان است، نه داده‌ی یک کاربر — همه‌ی کاربران بنر آن را می‌بینند.
const { db } = require('../src/config/database-sqlite');

function runMigration() {
  db.prepare(`CREATE TABLE IF NOT EXISTS accreditation_periods (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL UNIQUE,
    title TEXT,
    start_date TEXT,
    end_date TEXT,
    note TEXT,
    is_active INTEGER DEFAULT 0,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT
  )`).run();
  console.log('[Seed AccreditationPeriod] ✅ جدول accreditation_periods آماده است');
}

module.exports = { runMigration };

/**
 * جدول تاریخچه تغییرات وضعیت سنجه + صفحه‌بندی mountCrud
 * ---------------------------------------------------------------
 * مورد ۷ و ۱۸ از چک‌لیست کمبودها:
 *   - جدول measure_status_history: هر بار وضعیت سنجه تغییر کند، قبلی ثبت شود
 *   - ستون page/per_page در mountCrud GET
 *
 * چرا trigger نزدیم: SQLite تریگر دارد ولی تریگرِ روی UPDATE فقط خودِ رکورد
 * جدید را دارد و OLD.status را فقط در تریگر می‌بیند — ولی ما changed_by (کاربر)
 * را هم لازم داریم که در context تریگر نیست. پس ثبت تاریخچه از خودِ api.js
 * (جایی که PUT /measures/:id/status وجود دارد) با یک خط اضافه انجام می‌شود.
 */
'use strict';

const { db } = require('../src/config/database-sqlite');

const TABLES = [
  // تاریخچه تغییرات وضعیت سنجه
  `CREATE TABLE IF NOT EXISTS measure_status_history (
    id TEXT PRIMARY KEY,
    measure_id TEXT NOT NULL,
    hospital_id TEXT NOT NULL,
    year INTEGER,
    old_status TEXT,
    new_status TEXT NOT NULL,
    old_self_score REAL,
    new_self_score REAL,
    changed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    changed_at TEXT DEFAULT (datetime('now')),
    note TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_msh_measure ON measure_status_history(measure_id, hospital_id)`,
  `CREATE INDEX IF NOT EXISTS idx_msh_date ON measure_status_history(changed_at)`,
];

function runMigration() {
  for (const sql of TABLES) {
    db.exec(sql);
  }
  console.log('[Seed MeasureHistory] ✅ جدول measure_status_history آماده');
}

if (require.main === module) { runMigration(); process.exit(0); }
module.exports = { runMigration };

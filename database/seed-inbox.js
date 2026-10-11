/**
 * Migration: کارتابل شخصی + کاربر جانشین (user_delegates)
 *
 * کارتابل خودش جدول ندارد و عمداً view است: اقلام «در انتظار اقدام شما» از همان جدول‌های
 * موجود (tasks / document_signoffs / internal_audits / calendar_events) در لحظه جمع می‌شوند.
 * جدول جدید فقط برای «جانشین» لازم است: کاربر می‌تواند در بازه‌ی تاریخی مشخص، همکاری از همان
 * بیمارستان را جانشین خود کند تا اقلام کارتابلش برای او هم دیده شود (بدون انتقال مالکیت).
 * Run: npm run seed-inbox — idempotent است و روی هر boot امن اجرا می‌شود.
 */
const { db } = require('../src/config/database-sqlite');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS user_delegates (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delegate_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_delegates_user ON user_delegates(hospital_id, user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_delegates_target ON user_delegates(hospital_id, delegate_user_id, starts_at, ends_at)`,
];

function runMigration() {
  console.log('[Seed Inbox] Starting...');
  try {
    for (const sql of TABLES) db.exec(sql);
    console.log('[Seed Inbox] ✅ user_delegates ready');
  } catch (err) {
    console.error('[Seed Inbox] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };

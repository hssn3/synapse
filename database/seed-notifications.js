'use strict';
// اعلان داخل اپ — مورد ۱۱ چک‌لیست
// جدول سبک notifications + ساخته شدن در بوت. idempotent.
const { db } = require('../src/config/database-sqlite');

function runMigration() {
  db.exec(`CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    hospital_id TEXT,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT,
    link TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read, created_at)');
  console.log('[Seed Notifications] جدول notifications آماده');
}

if (require.main === module) { runMigration(); process.exit(0); }
module.exports = { runMigration };

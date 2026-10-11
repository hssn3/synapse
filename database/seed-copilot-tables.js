// database/seed-copilot-tables.js
// جداول جدید برای Unified Copilot

const Database = require('better-sqlite3');
const path = require('path');

function runMigration() {
  const dbPath = path.join(__dirname, 'hospital.db');
  const db = new Database(dbPath);

  console.log('[CopilotTables] Creating copilot tables...');

  // جدول sessions گفت‌وگو
  db.exec(`
    CREATE TABLE IF NOT EXISTS copilot_sessions (
      id TEXT PRIMARY KEY,
      hospital_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      persona TEXT NOT NULL DEFAULT 'guide',
      context_snapshot TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // جدول پیام‌های گفت‌وگو
  db.exec(`
    CREATE TABLE IF NOT EXISTS copilot_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (session_id) REFERENCES copilot_sessions(id) ON DELETE CASCADE
    )
  `);

  // ایندکس‌ها
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_copilot_sessions_user ON copilot_sessions(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_copilot_sessions_hospital ON copilot_sessions(hospital_id);
    CREATE INDEX IF NOT EXISTS idx_copilot_messages_session ON copilot_messages(session_id, created_at ASC);
  `);

  console.log('[CopilotTables] ✓ Copilot tables created');
  db.close();
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };

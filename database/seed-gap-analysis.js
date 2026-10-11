// database/seed-gap-analysis.js
// جدول گزارشات تحلیل شکاف

const Database = require('better-sqlite3');
const path = require('path');

function runMigration() {
  const dbPath = path.join(__dirname, 'hospital.db');
  const db = new Database(dbPath);

  console.log('[GapAnalysis] Creating gap analysis table...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS gap_analysis_reports (
      id TEXT PRIMARY KEY,
      hospital_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      total_measures INTEGER NOT NULL,
      gaps_count INTEGER NOT NULL,
      critical_gaps INTEGER DEFAULT 0,
      patient_safety_gaps INTEGER DEFAULT 0,
      readiness_rate REAL DEFAULT 0,
      report_data TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_gap_analysis_hospital_year ON gap_analysis_reports(hospital_id, year DESC);
  `);

  console.log('[GapAnalysis] ✓ Gap analysis table created');
  db.close();
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };

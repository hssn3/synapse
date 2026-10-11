// database/init-system-db.js
// ساخت و راه‌اندازی system.db (مشترک بین همه tenants)
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const SYSTEM_DB_PATH = path.join(__dirname, 'system.db');

function initSystemDb() {
  console.log('راه‌اندازی system.db...');
  
  const db = new Database(SYSTEM_DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000'); // 64MB cache
  db.pragma('foreign_keys = ON');

  // جدول hospitals (اطلاعات اصلی بیمارستانها)
  db.exec(`
    CREATE TABLE IF NOT EXISTS hospitals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tenant_db_path TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // جدول accreditation_measures (سنجه‌های کتاب اعتباربخشی)
  db.exec(`
    CREATE TABLE IF NOT EXISTS accreditation_measures (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      chapter TEXT,
      section TEXT,
      subsection TEXT,
      level INTEGER,
      parent_id TEXT,
      order_num INTEGER,
      is_patient_safety BOOLEAN DEFAULT 0,
      detail_text TEXT,
      tags TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // ایندکس‌ها
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_measures_code ON accreditation_measures(code);
    CREATE INDEX IF NOT EXISTS idx_measures_chapter ON accreditation_measures(chapter);
    CREATE INDEX IF NOT EXISTS idx_measures_parent ON accreditation_measures(parent_id);
    CREATE INDEX IF NOT EXISTS idx_hospitals_status ON hospitals(status);
  `);

  console.log('✓ ساختار system.db ایجاد شد');

  // بارگذاری داده‌های اولیه (اگر جداول خالی باشند)
  const hospitalCount = db.prepare('SELECT COUNT(*) as cnt FROM hospitals').get().cnt;
  const measureCount = db.prepare('SELECT COUNT(*) as cnt FROM accreditation_measures').get().cnt;

  if (hospitalCount === 0) {
    console.log('بارگذاری بیمارستانهای موجود...');
    // خواندن از hospital.db فعلی
    const oldDb = new Database(path.join(__dirname, 'hospital.db'), { readonly: true });
    const hospitals = oldDb.prepare('SELECT * FROM hospitals').all();
    
    const insertHospital = db.prepare(`
      INSERT OR IGNORE INTO hospitals (id, name, tenant_db_path, status, created_at, updated_at)
      VALUES (@id, @name, @tenant_db_path, @status, @created_at, @updated_at)
    `);

    const insertMany = db.transaction((hospitals) => {
      for (const h of hospitals) {
        insertHospital.run({
          id: h.id,
          name: h.name,
          tenant_db_path: `database/tenants/${h.id}/hospital.db`,
          status: 'active',
          created_at: h.created_at || new Date().toISOString().slice(0, 19).replace('T', ' '),
          updated_at: h.updated_at || new Date().toISOString().slice(0, 19).replace('T', ' ')
        });
      }
    });
    insertMany(hospitals);
    oldDb.close();
    console.log(`✓ ${hospitals.length} بیمارستان وارد شدند`);
  }

  if (measureCount === 0) {
    console.log('بارگذاری سنجه‌های اعتباربخشی...');
    const measuresFile = path.join(__dirname, 'accreditation-standards-data.json');
    if (fs.existsSync(measuresFile)) {
      const measuresData = JSON.parse(fs.readFileSync(measuresFile, 'utf8'));
      const measures = measuresData.measures || [];
      
      const insertMeasure = db.prepare(`
        INSERT OR IGNORE INTO accreditation_measures (id, code, title, chapter, section, subsection, level, parent_id, order_num, is_patient_safety, detail_text, tags, created_at, updated_at)
        VALUES (@id, @code, @title, @chapter, @section, @subsection, @level, @parent_id, @order_num, @is_patient_safety, @detail_text, @tags, @created_at, @updated_at)
      `);

      const insertMany = db.transaction((measures) => {
        for (const m of measures) {
          insertMeasure.run({
            ...m,
            is_patient_safety: m.is_patient_safety ? 1 : 0,
            tags: m.tags ? JSON.stringify(m.tags) : null,
            created_at: m.created_at || new Date().toISOString().slice(0, 19).replace('T', ' '),
            updated_at: m.updated_at || new Date().toISOString().slice(0, 19).replace('T', ' ')
          });
        }
      });
      insertMany(measures);
      console.log(`✓ ${measures.length} سنجه وارد شدند`);
    }
  }

  db.close();
  console.log('✓ system.db آماده است');
  return SYSTEM_DB_PATH;
}

if (require.main === module) {
  try {
    initSystemDb();
    process.exit(0);
  } catch (err) {
    console.error('خطا در راه‌اندازی system.db:', err);
    process.exit(1);
  }
}

module.exports = { initSystemDb, SYSTEM_DB_PATH };

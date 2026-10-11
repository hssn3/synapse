const { db } = require('../src/config/database-sqlite');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function runMigration() {
  // 1. Create table
  db.exec(`
    CREATE TABLE IF NOT EXISTS hospital_indicator_slides (
      id TEXT PRIMARY KEY,
      hospital_id TEXT NOT NULL,
      slide_number INTEGER NOT NULL,
      section_id TEXT NOT NULL,
      section_title TEXT NOT NULL,
      title TEXT NOT NULL,
      slide_text TEXT,
      chart_type TEXT NOT NULL,
      unit TEXT,
      headers_json TEXT,
      data_json TEXT NOT NULL,
      corrective_actions TEXT,
      year_from INTEGER DEFAULT 1404,
      year_to INTEGER DEFAULT 1405,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(hospital_id, slide_number)
    );
    CREATE INDEX IF NOT EXISTS idx_ind_slides_hosp_slide ON hospital_indicator_slides (hospital_id, slide_number);
  `);

  // 2. Load enriched slide data
  const enrichedPath = path.join(__dirname, '../scripts/enriched_indicators_76.json');
  if (!fs.existsSync(enrichedPath)) {
    console.warn('[SeedIndicatorSlides] Enriched indicator JSON file not found, skipping seed data.');
    return;
  }

  const slidesData = JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));

  // Hospitals list
  const hospitals = db.prepare('SELECT id, name FROM hospitals').all();
  if (!hospitals.length) {
    hospitals.push({ id: 'default', name: 'بیمارستان' });
  }

  const insertStmt = db.prepare(`
    INSERT INTO hospital_indicator_slides 
    (id, hospital_id, slide_number, section_id, section_title, title, slide_text, chart_type, unit, headers_json, data_json, corrective_actions, year_from, year_to, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1404, 1405, datetime('now'))
    ON CONFLICT(hospital_id, slide_number) DO UPDATE SET
      section_id=excluded.section_id,
      section_title=excluded.section_title,
      title=excluded.title,
      slide_text=excluded.slide_text,
      chart_type=excluded.chart_type,
      unit=excluded.unit,
      headers_json=excluded.headers_json,
      data_json=excluded.data_json,
      corrective_actions=excluded.corrective_actions,
      updated_at=datetime('now')
  `);

  let totalInserted = 0;
  const insertMany = db.transaction(() => {
    for (const hosp of hospitals) {
      const hospName = hosp.name || 'بیمارستان';
      for (const s of slidesData) {
        const id = crypto.randomUUID();
        let title = (s.title || '')
          .replace(/\{HOSPITAL_NAME\}/g, hospName)
          .replace(/ب[یي]مارستان\s*ام[یي]د/g, hospName);
        let slideText = (s.slide_text || '')
          .replace(/\{HOSPITAL_NAME\}/g, hospName)
          .replace(/ب[یي]مارستان\s*ام[یي]د/g, hospName);

        if (s.slide_number === 1) {
          title = `${hospName} در یک نگاه - سال‌های ۱۴۰۴-۱۴۰۵`;
          slideText = `${hospName} در یک نگاه | سال‌های ۱۴۰۴-۱۴۰۵`;
        } else if (s.slide_number === 19) {
          title = `شاخص توصیفی ${hospName} در یک نگاه - سال‌های ۱۴۰۴-۱۴۰۵`;
          slideText = `شاخص توصیفی ${hospName} در یک نگاه | سال‌های ۱۴۰۴-۱۴۰۵`;
        } else if (s.slide_number === 76) {
          title = 'از توجه شما عزیزان سپاسگزاریم - در جهت ارتقاء شاخص‌های کیفی در سال‌های آتی';
          slideText = 'از توجه شما عزیزان سپاسگزاریم | در جهت ارتقاء شاخص‌های کیفی در سال‌های آتی';
        }

        insertStmt.run(
          id,
          hosp.id,
          s.slide_number,
          s.section_id,
          s.section_title,
          title,
          slideText,
          s.chart_type || 'bar',
          s.unit || 'تعداد',
          JSON.stringify(s.headers || ['دوره / سرفصل', 'عملکرد ۱۴۰۴', 'هدف / عملکرد ۱۴۰۵']),
          JSON.stringify(s.rows || s.data || []),
          s.corrective_actions || s.analysis_note || ''
        );
        totalInserted++;
      }
    }
  });

  insertMany();
  console.log(`[SeedIndicatorSlides] Successfully seeded/updated ${totalInserted} indicator slide records for ${hospitals.length} hospitals.`);
}

module.exports = { runMigration };

if (require.main === module) {
  runMigration();
}

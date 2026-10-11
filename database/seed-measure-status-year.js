/* =====================================================================
   دوره‌ای کردن وضعیت سنجه‌ها
   ---------------------------------------------------------------------
   هر دور اعتباربخشی یک دوره‌ی مستقل است و مقایسه‌ی سنجه‌به‌سنجه‌ی دو دوره،
   خودش سند بهبود کیفیت است. اما measure_status کلید یکتای
   (hospital_id, measure_id) داشت و ستون سال نداشت — یعنی خودارزیابی امسال
   روی پارسال نوشته می‌شد و سابقه‌ی دوره‌ی قبل بازیابی‌شدنی نبود.

   این migration ستون year اضافه می‌کند و کلید یکتا را به
   (hospital_id, measure_id, year) می‌برد.

   چرا بازسازی جدول و نه ALTER؟ SQLite قید UNIQUE را با ALTER عوض نمی‌کند.
   پس جدول تازه ساخته می‌شود، ردیف‌ها کپی می‌شوند، و جای قبلی را می‌گیرد —
   همه داخل یک تراکنش، تا هیچ حالت نیمه‌کاره‌ای روی دیسک نماند.

   سالِ ردیف‌های موجود از دوره‌ی فعالِ همان بیمارستان برداشته می‌شود
   (accreditation_periods.start_year)؛ اگر دوره‌ای نبود، سال جاری شمسی.
   ===================================================================== */
'use strict';

const { query } = require('../src/config/database');
const { db } = require('../src/config/database-sqlite');
const { todayJalali } = require('../src/config/jalali');

function hasCol(table, col) {
  try { return query(`PRAGMA table_info(${table})`).rows.some(r => r.name === col); }
  catch (e) { return false; }
}

function runMigration() {
  try {
    if (hasCol('measure_status', 'year')) {
      console.log('[Seed MeasureYear] ✅ measure_status از قبل دوره‌ای است');
      return;
    }
    const nowY = String(todayJalali().jy);

    db.transaction(() => {
      db.prepare(`CREATE TABLE measure_status_new (
        id TEXT PRIMARY KEY,
        hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
        measure_id TEXT NOT NULL REFERENCES accreditation_sections(id) ON DELETE CASCADE,
        year TEXT NOT NULL,
        status TEXT DEFAULT 'not_reviewed',
        notes TEXT,
        na_reason TEXT,
        last_reviewed_by TEXT REFERENCES users(id),
        last_reviewed_at TEXT,
        linked_activity_record_id TEXT REFERENCES activity_records(id) ON DELETE SET NULL,
        UNIQUE(hospital_id, measure_id, year)
      )`).run();

      // سال هر ردیف = سالِ دوره‌ی فعالِ همان بیمارستان، وگرنه سال جاری
      db.prepare(`INSERT INTO measure_status_new
          (id, hospital_id, measure_id, year, status, notes, na_reason,
           last_reviewed_by, last_reviewed_at, linked_activity_record_id)
        SELECT ms.id, ms.hospital_id, ms.measure_id,
               COALESCE((SELECT CAST(p.start_year AS TEXT) FROM accreditation_periods p
                          WHERE p.hospital_id = ms.hospital_id AND p.is_active = 1
                            AND p.start_year IS NOT NULL LIMIT 1), ?),
               ms.status, ms.notes, ms.na_reason,
               ms.last_reviewed_by, ms.last_reviewed_at, ms.linked_activity_record_id
          FROM measure_status ms`).run(nowY);

      db.prepare('DROP TABLE measure_status').run();
      db.prepare('ALTER TABLE measure_status_new RENAME TO measure_status').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_ms_hy ON measure_status(hospital_id, year)').run();
    })();

    const n = query('SELECT COUNT(*) c FROM measure_status').rows[0].c;
    const yrs = query('SELECT year, COUNT(*) c FROM measure_status GROUP BY year').rows
      .map(r => `${r.year}:${r.c}`).join('، ');
    console.log(`[Seed MeasureYear] ✅ measure_status دوره‌ای شد (${n} ردیف — ${yrs})`);
  } catch (err) {
    console.error('[Seed MeasureYear] failed:', err.message);
  }
}

module.exports = { runMigration };
if (require.main === module) runMigration();

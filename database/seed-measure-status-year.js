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

   ⚠️ بازنویسی (۱۴۰۵/۰۷/۲۳) — خطر ازدست‌رفتن ستون در نسخه‌ی قبلی:
   نسخه‌ی قبلی جدول تازه را با «۱۰ ستونِ ثابت» می‌ساخت و بعد از کپی،
   `DROP TABLE measure_status` می‌زد. اگر جدولِ موجود ستون دیگری هم داشت،
   هم آن ستون و هم داده‌اش برای همیشه می‌رفت. این حالت واقعاً دست‌یافتنی است:
   seed-measure-three-scores کمی بعدتر در همین زنجیره‌ی src/app.js هشت ستونِ
   ارزیابی داخلی/خارجی (internal_status … external_at) را با ALTER TABLE اضافه
   می‌کند، و catchِ خودِ همین فایل هم خطا را می‌بلعد و بوت ادامه می‌دهد. پس
   کافی است این migration یک بار نیمه‌کاره بماند (مثلاً UNIQUE تکراری)، تا
   بوتِ بعد با جدولی روبه‌رو شود که ستون‌های نمره را دارد ولی year ندارد —
   و همان بوت، نمره‌های ثبت‌شده را پاک کند.

   نسخه‌ی فعلی هیچ ستونی را فرض نمی‌کند: DDL و فهرست ستون‌ها از خودِ جدول
   خوانده می‌شود (sqlite_master + PRAGMA table_info)، ستون year به همان DDL
   اضافه می‌شود، قید یکتا سه‌ستونی می‌شود و «همه‌ی» ستون‌های موجود کپی
   می‌شوند. دو محافظ هم پیش از DROP، داخل همان تراکنش، اجرا می‌شوند:
     ۱) ستون‌های جدول تازه باید ابرمجموعه‌ی ستون‌های جدول قدیم باشند،
     ۲) تعداد ردیف‌های کپی‌شده باید با جدول قدیم برابر باشد.
   نقض هر محافظ = throw داخل تراکنش = rollback = دیتابیس دست‌نخورده.
   ===================================================================== */
'use strict';

const { query } = require('../src/config/database');
const { db } = require('../src/config/database-sqlite');
const { todayJalali } = require('../src/config/jalali');

const NEW_TABLE = 'measure_status_new';

// ستون‌هایی که نسخه‌ی قبلی کپی می‌کرد — فقط برای گزارشِ «چه چیزی حفظ شد» استفاده می‌شود
const PREVIOUSLY_COPIED_COLS = ['id', 'hospital_id', 'measure_id', 'status', 'notes', 'na_reason',
  'last_reviewed_by', 'last_reviewed_at', 'linked_activity_record_id'];

function colsOf(table) {
  try { return db.prepare(`PRAGMA table_info(${table})`).all().map(r => r.name); }
  catch (e) { return []; }
}

function hasCol(table, col) {
  return colsOf(table).includes(col);
}

// DDL فعلیِ جدول از sqlite_master — تا ستون‌های اضافه (نمره‌های داخلی/خارجی و هر ستونِ
// آینده) عیناً حفظ شوند و ما مجبور نباشیم شکل جدول را حدس بزنیم.
function tableDdl(name) {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name = ?").get(name);
  return row && row.sql ? String(row.sql).trim() : null;
}

// ایندکس‌های دست‌سازِ جدول (آن‌هایی که sql دارند؛ autoindexِ قیدها sql ندارد و خودش با قید
// ساخته می‌شود). DROP TABLE ایندکس‌ها را هم می‌برد، پس همین‌ها بعد از بازسازی برمی‌گردند.
function indexSqlsOf(name) {
  return db.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name = ? AND sql IS NOT NULL")
    .all(name).map(r => String(r.sql));
}

// DDL تازه از DDL موجود: نام تازه + ستون year + قید یکتای سه‌ستونی.
function buildNewDdl(oldDdl) {
  let ddl = String(oldDdl).trim().replace(/;+\s*$/, '');
  const header = /^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`\[]?[A-Za-z0-9_$]+["`\]]?/i;
  if (!header.test(ddl)) throw new Error('DDL جدول با CREATE TABLE شروع نمی‌شود');
  ddl = ddl.replace(header, `CREATE TABLE ${NEW_TABLE}`);

  // قید یکتای دوسطونی → سه‌ستونی (اگر چنین قیدی نبود، در پایان اضافه می‌شود تا کلیدِ
  // یکتای دوره‌ای — هدف این migration — حتماً وجود داشته باشد)
  const twoCol = /UNIQUE\s*\(\s*hospital_id\s*,\s*measure_id\s*\)/i;
  if (twoCol.test(ddl)) ddl = ddl.replace(twoCol, 'UNIQUE(hospital_id, measure_id, year)');
  const needUnique = !/UNIQUE\s*\(\s*hospital_id\s*,\s*measure_id\s*,\s*year\s*\)/i.test(ddl);

  // ستون year باید پیش از اولین قید سطح‌جدول بیاید؛ SQLite ستونِ بعد از قید را نمی‌پذیرد.
  const firstConstraint = /,\s*(?:CONSTRAINT\s+["`\[]?[^\s"`\],]+["`\]]?\s*)?(?:UNIQUE|PRIMARY\s+KEY|CHECK|FOREIGN\s+KEY)\s*\(/i;
  const m = firstConstraint.exec(ddl);
  if (m) {
    ddl = ddl.slice(0, m.index) + ',\n  year TEXT NOT NULL' + ddl.slice(m.index);
  } else {
    const close = ddl.lastIndexOf(')');
    if (close < 0) throw new Error('DDL جدول پرانتز بستن ندارد');
    ddl = ddl.slice(0, close) + ',\n  year TEXT NOT NULL' + ddl.slice(close);
  }
  if (needUnique) {
    const close = ddl.lastIndexOf(')');
    ddl = ddl.slice(0, close) + ',\n  UNIQUE(hospital_id, measure_id, year)' + ddl.slice(close);
  }
  return ddl;
}

function runMigration() {
  try {
    if (hasCol('measure_status', 'year')) {
      console.log('[Seed MeasureYear] ✅ measure_status از قبل دوره‌ای است');
      return;
    }
    const oldDdl = tableDdl('measure_status');
    if (!oldDdl) {
      console.log('[Seed MeasureYear] ℹ️ جدول measure_status وجود ندارد — چیزی برای مهاجرت نیست');
      return;
    }
    const oldCols = colsOf('measure_status');
    const oldIndexSqls = indexSqlsOf('measure_status');
    const colList = oldCols.map(c => `"${c}"`).join(', ');
    const newDdl = buildNewDdl(oldDdl);
    const nowY = String(todayJalali().jy);

    db.transaction(() => {
      // بازمانده‌ی یک اجرای نیمه‌کاره‌ی قبلی (جدول اصلی دست‌نخورده است)
      db.prepare(`DROP TABLE IF EXISTS ${NEW_TABLE}`).run();
      db.prepare(newDdl).run();

      // کپیِ همه‌ی ستون‌های موجود + ستون تازه‌ی year
      db.prepare(`INSERT INTO ${NEW_TABLE} (${colList}, "year")
        SELECT ${colList},
               COALESCE((SELECT CAST(p.start_year AS TEXT) FROM accreditation_periods p
                          WHERE p.hospital_id = ms.hospital_id AND p.is_active = 1
                            AND p.start_year IS NOT NULL LIMIT 1), ?)
          FROM measure_status ms`).run(nowY);

      // محافظ ۱ — هیچ ستونی نباید گم شود (این همان تله‌ای است که نسخه‌ی قبلی داشت)
      const newCols = colsOf(NEW_TABLE);
      const missing = oldCols.filter(c => !newCols.includes(c));
      if (missing.length) throw new Error(`محافظ ستون‌ها: ${missing.join('، ')} در جدول تازه نیست`);

      // محافظ ۲ — هیچ ردیفی نباید گم شود
      const before = db.prepare('SELECT COUNT(*) c FROM measure_status').get().c;
      const copied = db.prepare(`SELECT COUNT(*) c FROM ${NEW_TABLE}`).get().c;
      if (before !== copied) throw new Error(`محافظ ردیف‌ها: ${before} ردیف بود، ${copied} ردیف کپی شد`);

      db.prepare('DROP TABLE measure_status').run();
      db.prepare(`ALTER TABLE ${NEW_TABLE} RENAME TO measure_status`).run();
      for (const sql of oldIndexSqls) db.prepare(sql).run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_ms_hy ON measure_status(hospital_id, year)').run();
    })();

    const n = query('SELECT COUNT(*) c FROM measure_status').rows[0].c;
    const yrs = query('SELECT year, COUNT(*) c FROM measure_status GROUP BY year').rows
      .map(r => `${r.year}:${r.c}`).join('، ');
    console.log(`[Seed MeasureYear] ✅ measure_status دوره‌ای شد (${n} ردیف — ${yrs})`);
    const kept = oldCols.filter(c => !PREVIOUSLY_COPIED_COLS.includes(c));
    if (kept.length) {
      console.log(`[Seed MeasureYear] ✅ ${kept.length} ستون دیگرِ جدول عیناً حفظ شد: ${kept.join('، ')}`);
    }
  } catch (err) {
    console.error('[Seed MeasureYear] failed — بدون تغییر ماند (rollback):', err.message);
  }
}

module.exports = { runMigration };
if (require.main === module) runMigration();

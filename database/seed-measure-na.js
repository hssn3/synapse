/* =====================================================================
   وضعیت پنجم سنجه: «غیرقابل ارزیابی»
   ---------------------------------------------------------------------
   در فرایند رسمی اعتباربخشی، بیمارستان در مرحله‌ی خوداظهاری اعلام می‌کند
   کدام سنجه‌ها به دلیل نداشتن آن خدمت/بخش اصلاً قابل ارزیابی نیستند.
   آن سنجه‌ها از فهرست همان مرکز حذف می‌شوند: نه ارزیاب می‌بیندشان و نه در
   مخرجِ کسرِ امتیاز می‌آیند.

   سامانه تا امروز چهار وضعیت داشت که هر چهار تا معنای «ارزیابی‌شدنی»
   می‌دادند. بیمارستانِ بدون بخش دیالیز، سنجه‌های دیالیز را یا
   «بررسی‌نشده» رها می‌کرد یا ناچار «عدم انطباق» می‌زد — و در هر دو حالت
   درصد آمادگی‌اش سیستماتیک کمتر از واقعیت درمی‌آمد. هرچه بیمارستان
   کوچک‌تر، انحراف بزرگ‌تر.

   ستون na_reason عمداً اجباری است (سمت مسیر بررسی می‌شود): «غیرقابل
   ارزیابی» یک ادعای قابل‌ممیزی است، نه راهی برای پاک کردن سنجه‌های سخت.
   ارزیاب بیرونی همین دلیل را می‌خواند.
   ===================================================================== */
'use strict';

const { query } = require('../src/config/database');

function hasCol(table, col) {
  try { return query(`PRAGMA table_info(${table})`).rows.some(r => r.name === col); }
  catch (e) { return false; }
}

function runMigration() {
  try {
    if (!hasCol('measure_status', 'na_reason')) {
      query('ALTER TABLE measure_status ADD COLUMN na_reason TEXT');
      console.log('[Seed MeasureNA] ✅ ستون na_reason به measure_status اضافه شد');
    } else {
      console.log('[Seed MeasureNA] ✅ measure_status از قبل آماده است');
    }
  } catch (err) {
    console.error('[Seed MeasureNA] failed:', err.message);
  }
}

module.exports = { runMigration };
if (require.main === module) runMigration();

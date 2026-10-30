/**
 * اصلاح عناوین ۴ استاندارد اعتباربخشی ملی (الف-3-2، ب-1-1، ب-7-3، ج-1-4)
 * همسو با database/accreditation-standards-data.json — کتاب ملی اعتباربخشی بیمارستان‌های ایران (نسل ششم)
 * کاملاً idempotent است.
 */
const { db } = require('../src/config/database-sqlite');

const FIXES = [
  {
    code: 'الف-3-2',
    title: 'توانمند‌سازی کارکنان بر اساس آموزش های هدفمند، برنامه ریزی و اجرا می شود.',
    statement: 'توانمند‌سازی کارکنان بر اساس آموزش های هدفمند، برنامه ریزی و اجرا می شود.'
  },
  {
    code: 'ب-1-1',
    title: 'ارزیابی اولیه بیماران مطابق ضوابط انجام می شود',
    statement: 'ارزیابی اولیه بیماران مطابق ضوابط انجام می شود'
  },
  {
    code: 'ب-7-3',
    title: 'واحد تصویر‌برداری بهمنظور ارائه ی خدمات تصویر‌برداری با کیفیت، برنامه ریزی و پیگیری لازم را انجام می‌دهد',
    statement: 'واحد تصویر‌برداری بهمنظور ارائه ی خدمات تصویر‌برداری با کیفیت، برنامه ریزی و پیگیری لازم را انجام می‌دهد'
  },
  {
    code: 'ج-1-4',
    title: 'بیمارستان تسهیلات رفاهی و معنوی لازم را برای بیماران و مراجعه‌کنندگان تأمین می نماید.',
    statement: 'بیمارستان تسهیلات رفاهی و معنوی لازم را برای بیماران و مراجعه‌کنندگان تأمین می نماید.'
  }
];

function runMigration() {
  console.log('[Seed StandardsTitlesFix] Updating standard titles...');
  try {
    const upd = db.prepare("UPDATE accreditation_sections SET title = ?, statement = ? WHERE code = ? AND level_type = 'standard'");
    let count = 0;
    const tx = db.transaction(() => {
      for (const fix of FIXES) {
        const res = upd.run(fix.title, fix.statement, fix.code);
        if (res.changes > 0) count += res.changes;
      }
    });
    tx();
    console.log(`[Seed StandardsTitlesFix] Updated ${count} standard(s) successfully.`);
  } catch (err) {
    console.error('[Seed StandardsTitlesFix] Error:', err.message);
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };

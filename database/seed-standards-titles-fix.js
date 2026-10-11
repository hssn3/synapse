/**
 * اصلاح عناوین ۳ استاندارد اعتباربخشی ملی (الف-3-2، ب-1-1، ج-1-6)
 * طبق کتاب ملی استانداردهای اعتباربخشی بیمارستان‌های ایران (ویرایش پنجم)
 * کاملاً idempotent است.
 */
const { db } = require('../src/config/database-sqlite');

const FIXES = [
  {
    code: 'الف-3-2',
    title: 'آموزش و توانمندسازی منابع انسانی بر اساس نیازسنجی و برنامه‌ریزی اثربخش انجام می‌شود.',
    statement: 'آموزش و توانمندسازی منابع انسانی بر اساس نیازسنجی و برنامه‌ریزی اثربخش انجام می‌شود.'
  },
  {
    code: 'ب-1-1',
    title: 'شناسایی صحیح و فعال بیماران در تمام مراحل ارائه خدمات تشخیصی و درمانی انجام می‌شود.',
    statement: 'شناسایی صحیح و فعال بیماران در تمام مراحل ارائه خدمات تشخیصی و درمانی انجام می‌شود.'
  },
  {
    code: 'ج-1-6',
    title: 'بیمارستان در تامین خدمات تشخیصی، درمانی، دارویی و تجهیزات پزشکی مورد نیاز بیماران متعهد و پاسخگو است.',
    statement: 'بیمارستان در تامین خدمات تشخیصی، درمانی، دارویی و تجهیزات پزشکی مورد نیاز بیماران متعهد و پاسخگو است.'
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

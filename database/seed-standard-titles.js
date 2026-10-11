/**
 * Migration: عنوان استانداردها (سطح standard) که به‌جای متن واقعی، کدِ خام را نشان می‌دادند
 *
 * مشکل: ۱۰۸ ردیف با level_type='standard' مقدار title برابرِ code داشتند (مثلاً title='ب-1-2')
 * و در داشبورد به‌صورت کدِ نامفهوم رندر می‌شدند، درحالی‌که متن واقعی استاندارد
 * از همان ابتدا در ستون statement موجود بود.
 *
 * منبع تأیید: database/accreditation-standards-data.json (کتاب سنجه‌های ویرایش پنجم/دور ششم).
 * هر ردیف پیش از به‌روزرسانی با همان فایل تطبیق داده می‌شود؛ اگر تطبیق نداشت،
 * به‌جای متن جعلی یک برچسبِ صریحِ «عنوان کامل ثبت نشده» می‌نشیند.
 *
 * Idempotent: اجرای دوم هیچ ردیفی را تغییر نمی‌دهد.
 * Run: node database/seed-standard-titles.js
 */
const path = require('path');
const { db } = require('../src/config/database-sqlite');

const PLACEHOLDER_SUFFIX = ' — عنوان کامل هنوز ثبت نشده';

function buildStatementMap() {
  const data = require(path.join(__dirname, 'accreditation-standards-data.json'));
  const map = new Map();
  for (const section of Object.values(data)) {
    for (const axis of Object.values(section.axes || {})) {
      for (const std of Object.values(axis.standards || {})) {
        if (std && std.code && std.statement) map.set(String(std.code).trim(), String(std.statement).trim());
      }
    }
  }
  return map;
}

// عنوان کوتاه و خوانا از متن استاندارد (یک جملهٔ کامل؛ بدون بریدنِ وسطِ کلمه)
function titleFromStatement(statement) {
  const clean = statement.replace(/\s+/g, ' ').trim();
  if (clean.length <= 120) return clean;
  const cut = clean.slice(0, 120);
  return cut.slice(0, cut.lastIndexOf(' ')) + '…';
}

function runMigration() {
  console.log('[Standard Titles] Starting...');
  try {
    const statementMap = buildStatementMap();
    const rows = db.prepare(
      `SELECT id, code, title, statement FROM accreditation_sections WHERE level_type = 'standard'`
    ).all();

    const upd = db.prepare('UPDATE accreditation_sections SET title = ? WHERE id = ?');
    let fixed = 0, labelled = 0, skipped = 0;

    const tx = db.transaction(() => {
      for (const r of rows) {
        const code = String(r.code || '').trim();
        const title = String(r.title || '').trim();
        // فقط ردیف‌هایی که عنوانشان خالی یا برابر کد است؛ ۴۷۵+ عنوان واقعی دست‌نخورده می‌مانند
        if (title && title !== code && !title.endsWith(PLACEHOLDER_SUFFIX)) { skipped++; continue; }

        const verified = statementMap.get(code);
        const dbStatement = String(r.statement || '').trim();
        // متن فقط وقتی «تأییدشده» است که DB و فایل مرجع دقیقاً یکی باشند
        if (verified && dbStatement && verified === dbStatement) {
          const next = titleFromStatement(verified);
          if (next !== title) { upd.run(next, r.id); fixed++; }
          continue;
        }
        // تأیید نشد → متن جعلی نمی‌سازیم؛ برچسبِ صریحِ پلیس‌هولدر می‌گذاریم
        // این تابع فقط ردیف‌های level_type='standard' را می‌بیند، پس برچسب باید «استاندارد» باشد نه «سنجه»
        const next = `استاندارد ${code}${PLACEHOLDER_SUFFIX}`;
        if (next !== title) { upd.run(next, r.id); labelled++; }
      }
    });
    tx();

    console.log(`[Standard Titles] ✅ ${fixed} titles restored from verified source, ` +
      `${labelled} marked as explicit placeholders, ${skipped} already-real titles untouched`);
  } catch (err) {
    console.error('[Standard Titles] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };

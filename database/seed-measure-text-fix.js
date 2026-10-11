/**
 * تعمیرِ هدفمندِ متنِ دو سنجه — الف‑۳‑۴‑۴ و الف‑۳‑۴‑۵
 * ---------------------------------------------------------------------
 * در متنِ استخراج‌شده از کتاب، واژه‌ی «رضایت» در این دو سنجه «رعایت» تایپ
 * شده. این همان دسته‌ی آسیبِ «ض خوانده‌شده ع» است که src/services/text-repair.js
 * توضیحش داده (عوابط ← ضوابط، فاعالب ← فاضلاب).
 *
 * چرا این‌جا و نه در نگاشتِ سراسریِ text-repair.js:
 * «رعایت» برخلافِ «عوابط» یک واژه‌ی **کاملاً درستِ** فارسی است و در متنِ همین
 * کتاب بارها به‌جا به کار رفته — «رعایت اصول کیفیت و ایمنی بیمار»، «رعایت
 * ضوابط». یک قاعده‌ی سراسریِ رعایت←رضایت ده‌ها جای سالم را خراب می‌کرد. پس
 * تعمیر فقط روی همین دو رکورد و فقط روی همان ترکیب‌هایی انجام می‌شود که در
 * متنِ آن دو، معنی‌شان بی‌ابهام «رضایت» است.
 *
 * شاهدِ بی‌ابهامی، از خودِ شرحِ همان سنجه‌ها:
 *   «بالاترین مرتبه رعایتمندی توصیه بهرهمندی به دیگران است»
 *   «مسائل معیشتی کارکنان مهمترین عامل رعایتمندی کارکنان است»
 * هیچ خوانشی از «رعایت» این دو جمله را معنادار نمی‌کند.
 *
 * idempotent است: اجرای دوباره صفر تغییر می‌دهد، چون بعد از تعمیر دیگر
 * الگوی خراب در متن نیست.
 *
 * Run: node database/seed-measure-text-fix.js (یا خودکار روی هر boot).
 */
const { db } = require('../src/config/database-sqlite');

const CODES = ['الف-3-4-4', 'الف-3-4-5'];

// ترتیب مهم است: ترکیب‌های بلندتر اول، وگرنه «رعایت » کوتاه‌تر آن‌ها را
// نصفه می‌کرد و «رضایتمندی» به «رضایتمندی» تبدیل نمی‌شد.
const FIXES = [
  ['رعایتمندی', 'رضایتمندی'],
  ['رعایت سنجی', 'رضایت‌سنجی'],
  ['رعایت‌سنجی', 'رضایت‌سنجی'],
  ['رعایت کارکنان', 'رضایت کارکنان'],
  ['رعایت کامل', 'رضایت کامل'],
  ['رعایت مندی', 'رضایتمندی'],
  ['افزایش رعایت', 'افزایش رضایت'],
  ['نتایج رعایت', 'نتایج رضایت'],
];

function fix(text) {
  if (!text) return text;
  let out = text;
  for (const [bad, good] of FIXES) out = out.split(bad).join(good);
  return out;
}

function runMigration() {
  console.log('[Seed MeasureTextFix] Starting...');
  try {
    const sel = db.prepare('SELECT id, statement, detail_text FROM accreditation_sections WHERE code = ?');
    const upd = db.prepare('UPDATE accreditation_sections SET statement = ?, detail_text = ? WHERE id = ?');
    let n = 0;
    const tx = db.transaction(() => {
      for (const code of CODES) {
        for (const row of sel.all(code)) {
          const s = fix(row.statement), d = fix(row.detail_text);
          if (s !== row.statement || d !== row.detail_text) { upd.run(s, d, row.id); n++; }
        }
      }
    });
    tx();
    console.log(`[Seed MeasureTextFix] ✅ ${n} رکورد تعمیر شد (رعایت ← رضایت در الف-۳-۴-۴/۵)`);
  } catch (err) {
    console.error('[Seed MeasureTextFix] ❌ Failed:', err.message);
  }
}

if (require.main === module) { runMigration(); process.exit(0); }
module.exports = { runMigration };

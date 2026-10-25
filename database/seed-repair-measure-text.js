/* =====================================================================
   اعمال ترمیم متن روی داده‌ی سنجه‌ها
   ---------------------------------------------------------------------
   دو کار می‌کند:
     ۱) فایل مرجع database/accreditation-standards-data.json را ترمیم می‌کند
        (فقط وقتی با --json صدا زده شود) تا نصب‌های تازه از ابتدا سالم باشند.
     ۲) ردیف‌های از قبل seed‌شده‌ی accreditation_sections را در جا ترمیم می‌کند.

   idempotent: بار دوم صفر ردیف عوض می‌شود، چون متنِ ترمیم‌شده دیگر با هیچ
   مدخلِ نگاشت جور نمی‌شود.

   منطق ترمیم در src/services/text-repair.js است و عمداً آنجاست، نه اینجا:
   همان منطق برای هر متنِ واردشده‌ی دیگری هم لازم می‌شود.
   ===================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const { query } = require('../src/config/database');
const { repair, reverseLatinRuns } = require('../src/services/text-repair');

// ستون‌های متنیِ سنجه/استاندارد که ممکن است آسیب داشته باشند
const COLS = ['title', 'statement', 'detail_text', 'description'];

// نشانه‌ی «رشته‌های لاتین یک‌بار برگردانده شدند». بدون این، اجرای دوم متن را
// دوباره وارونه می‌کرد (وارونگی، وارونه‌ی خودش است) و «Just Culture» یک بوت
// درست و بوت بعد خراب دیده می‌شد.
const LATIN_FLAG = 'latin_runs_unreversed_v1';

function latinDone() {
  try {
    return !!query('SELECT value FROM platform_settings WHERE key = ?', [LATIN_FLAG]).rows[0];
  } catch (err) { return true; } // جدول هنوز نیست → این مهاجرت جای دیگری اجرا می‌شود
}

function markLatinDone() {
  query(`INSERT INTO platform_settings (key, value) VALUES (?, '1')
         ON CONFLICT(key) DO UPDATE SET value = '1'`, [LATIN_FLAG]);
}

// یک‌بار-اجرا: رشته‌های لاتینِ وارونه‌ی همان ستون‌ها را سرِ جایشان برمی‌گرداند.
function unreverseLatinDb() {
  if (latinDone()) return { skipped: true };
  let changedRows = 0, changedFields = 0;
  const rows = query(`SELECT id, ${COLS.join(', ')} FROM accreditation_sections`).rows;
  for (const r of rows) {
    const set = [], vals = [];
    for (const c of COLS) {
      const before = r[c];
      if (typeof before !== 'string' || !before || !/[A-Za-z]{2,}/.test(before)) continue;
      const after = reverseLatinRuns(before);
      if (after !== before) { set.push(`${c} = ?`); vals.push(after); changedFields++; }
    }
    if (set.length) {
      vals.push(r.id);
      query(`UPDATE accreditation_sections SET ${set.join(', ')} WHERE id = ?`, vals);
      changedRows++;
    }
  }
  markLatinDone();
  return { changedRows, changedFields };
}

function repairDb() {
  let changedRows = 0, changedFields = 0;
  const rows = query(`SELECT id, ${COLS.join(', ')} FROM accreditation_sections`).rows;
  for (const r of rows) {
    const set = [], vals = [];
    for (const c of COLS) {
      const before = r[c];
      if (typeof before !== 'string' || !before) continue;
      const after = repair(before);
      if (after !== before) { set.push(`${c} = ?`); vals.push(after); changedFields++; }
    }
    if (!set.length) continue;
    vals.push(r.id);
    query(`UPDATE accreditation_sections SET ${set.join(', ')} WHERE id = ?`, vals);
    changedRows++;
  }
  // فاصله‌های تکراری در متن سنجه‌ها («الف-1-6-5  وقایع») — نرمال‌سازی تایپوگرافیکِ
  // بی‌خطر؛ فقط ستون statement و فقط ردیف‌های متأثر (idempotent).
  let wsFixed = 0;
  const wsp = query(`SELECT id, statement FROM accreditation_sections WHERE statement LIKE '%  %'`).rows;
  for (const r of wsp) {
    const after = String(r.statement || '').replace(/ {2,}/g, ' ');
    if (after !== r.statement) { query('UPDATE accreditation_sections SET statement = ? WHERE id = ?', [after, r.id]); wsFixed++; }
  }
  // خطِ تازه وسطِ جملهٔ سنجه معنا ندارد؛ دو مورد در نسخهٔ ششم از استخراج
  // باقی مانده بود («کنترل کیفی\nدورهای…»). فقط statement — چون detail_text
  // عمداً پاراگراف‌بندی دارد.
  let nlFixed = 0;
  const nlp = query(`SELECT id, statement FROM accreditation_sections
                     WHERE statement LIKE '%' || char(10) || '%'
                        OR statement LIKE '%' || char(13) || '%'`).rows;
  for (const r of nlp) {
    const after = String(r.statement || '').replace(/\s*[\r\n]+\s*/g, ' ').replace(/ {2,}/g, ' ');
    if (after !== r.statement) { query('UPDATE accreditation_sections SET statement = ? WHERE id = ?', [after, r.id]); nlFixed++; }
  }

  return { changedRows, changedFields, total: rows.length, wsFixed, nlFixed };
}

function fixStatementNewlines(data) {
  let n = 0;
  const walk = (node) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node || typeof node !== 'object') return;
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (k === 'statement' && typeof v === 'string') {
        const f = v.replace(/\s*[\r\n]+\s*/g, ' ').replace(/ {2,}/g, ' ');
        if (f !== v) { node[k] = f; n++; }
      } else if (v && typeof v === 'object') walk(v);
    }
  };
  walk(data);
  return n;
}

function repairJson(latin) {
  const p = path.join(__dirname, 'accreditation-standards-data.json');
  if (!fs.existsSync(p)) return { skipped: true };
  const raw = fs.readFileSync(p, 'utf8');
  const data = JSON.parse(raw);
  let n = 0;
  const walk = (o) => {
    if (Array.isArray(o)) { o.forEach((v, i) => { o[i] = walk(v); }); return o; }
    if (o && typeof o === 'object') { for (const k of Object.keys(o)) o[k] = walk(o[k]); return o; }
    if (typeof o === 'string') { const f = latin ? reverseLatinRuns(repair(o)) : repair(o); if (f !== o) n++; return f; }
    return o;
  };
  walk(data);
  const nlFixed = fixStatementNewlines(data);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  return { changedStrings: n, nlFixed };
}

function runMigration() {
  try {
    const r = repairDb();
    console.log(`[Seed TextRepair] ✅ ${r.changedRows} ردیف / ${r.changedFields} فیلد از ${r.total} سنجه ترمیم شد` +
      (r.changedRows === 0 ? ' (قبلاً سالم بود)' : '') +
      (r.wsFixed ? ` | ${r.wsFixed} فاصلهٔ تکراری نرمال شد` : '') +
      (r.nlFixed ? ` | ${r.nlFixed} خطِ تازهٔ زائد در statement نرمال شد` : ''));
  } catch (err) {
    console.error('[Seed TextRepair] failed:', err.message);
  }
  try {
    const l = unreverseLatinDb();
    console.log(l.skipped
      ? '[Seed TextRepair] رشته‌های لاتین قبلاً برگردانده شده‌اند — رد شد'
      : `[Seed TextRepair] ✅ رشته‌های لاتین در ${l.changedRows} ردیف / ${l.changedFields} فیلد به ترتیب درست برگشتند`);
  } catch (err) {
    console.error('[Seed TextRepair] latin pass failed:', err.message);
  }
}

module.exports = { runMigration, repairDb, repairJson, unreverseLatinDb };

if (require.main === module) {
  if (process.argv.includes('--json')) console.log('[TextRepair] JSON:', JSON.stringify(repairJson(process.argv.includes('--latin'))));
  runMigration();
}

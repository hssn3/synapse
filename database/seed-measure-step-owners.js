/**
 * مسئولِ رسمیِ هر «گام» سنجه — ستون step_owners
 * ---------------------------------------------------------------------------
 * کتاب ویرایش ششم برای هر گامِ ارزیابی یک «مسئول» نام می‌برد (مثلاً «بهبود کیفیت»،
 * «کنترل عفونت»). تا امروز این داده در JSON مرجع بود اما به دیتابیس/رابط کاربری
 * نمی‌رسید؛ تنها یک مسئولِ کلی در responsible_role هر سنجه ذخیره می‌شد که با
 * مسئولِ گام‌ها یکی نیست (۳۶ مسئولِ متفاوت در گام‌ها، ۱۰ نقش در responsible_role).
 *
 * چرا ستون جدا و نه تغییر detail_text: قرارداد parseGuide فرانت‌اند روی متنِ
 * detail_text با جداکنندهٔ U+F0A7 است و متن رسمی کتاب نباید دست بخورد. این ستون
 * فقط آرایه‌ای هم‌طول با گام‌ها نگه می‌دارد (null برای گامی که کتاب مسئول ننوشته)
 * تا فرانت بدون دست‌زدن به متن، مسئول هر گام را کنار همان گام نشان دهد.
 *
 * Idempotent: مقدار هر سنجه فقط وقتی عوض می‌شود که با JSON مرجع فرق کند.
 * Run: node database/seed-measure-step-owners.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { query } = require('../src/config/database');

function hasCol(table, col) {
  try { return query(`PRAGMA table_info(${table})`).rows.some(r => r.name === col); }
  catch (e) { return false; }
}

function runMigration() {
  if (!hasCol('accreditation_sections', 'step_owners')) {
    query('ALTER TABLE accreditation_sections ADD COLUMN step_owners TEXT');
  }

  const dataPath = path.join(__dirname, 'accreditation-standards-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  // code → آرایهٔ مسئول‌ها به ترتیب گام‌ها (عیناً همان رشتهٔ کتاب؛ null = بدون مسئول)
  const byCode = new Map();
  for (const sec of Object.values(data)) {
    if (!sec || typeof sec !== 'object' || !sec.axes) continue;
    for (const ax of Object.values(sec.axes)) {
      for (const m of (ax.measures || [])) {
        byCode.set(m.code, (m.steps || []).map(s => (s && s.responsible) || null));
      }
    }
  }

  const rows = query(
    `SELECT id, code, step_owners FROM accreditation_sections WHERE level_type = 'measure'`).rows;
  let changed = 0, withOwners = 0, multiOwner = 0, missing = 0;
  for (const r of rows) {
    if (!byCode.has(r.code)) { missing++; continue; }
    const owners = byCode.get(r.code);
    const json = JSON.stringify(owners);
    if (json !== r.step_owners) {
      query('UPDATE accreditation_sections SET step_owners = ? WHERE id = ?', [json, r.id]);
      changed++;
    }
    if (owners.some(Boolean)) withOwners++;
    if (new Set(owners.filter(Boolean)).size > 1) multiOwner++;
  }

  console.log(`[Seed StepOwners] ${changed} سنجه به‌روز شد — ${withOwners} سنجه مسئولِ گام دارد` +
    ` (${multiOwner} سنجه با بیش از یک مسئول)` + (missing ? `، ${missing} سنجه در JSON نبود` : ''));
}

module.exports = { runMigration };
if (require.main === module) runMigration();

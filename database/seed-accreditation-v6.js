/**
 * Migration: جایگزینی درختِ اعتباربخشی به «ویرایش ششم» (نسل ۶)
 * ---------------------------------------------------------------------------
 * چه می‌کند: کل ردیف‌های accreditation_sections را با درخت نسل۶ از فایل مرجع
 * database/accreditation-standards-data.json بازنویسی می‌کند:
 *   ۳ فصل / ۱۸ محور / ۸۸ استاندارد / ۳۹۵ سنجه (۳۷۸ ملی + ۱۷ بستهٔ روان‌پزشکی)
 *
 * چرا این فایل لازم است: نصب‌های موجود (دمو، سرور و…) درخت نسل۵ دارند و
 * فایل مرجع هم در جا عوض شده؛ migrate-sqlite.js فقط روی دیتابیسِ خالی seed
 * می‌کند. پس این seed یک‌بار سوئیچ می‌کند و بعد از آن با نشانهٔ داخلی رد می‌شود.
 *
 * نشانهٔ نسل۶: وجود سنجهٔ «ج-1-5-18» — نسل۵ فقط تا «ج-1-5-3» سنجه داشت
 * (بررسی مستقیم روی دیتابیس دمو در ۱۴۰۵/۰۷/۲۷). توجه: «ب-1-10-1» نشانهٔ خوبی
 * نیست چون در نسل۵ هم یک سنجهٔ هم‌کد (ذیل بستهٔ آموزش بیمار) وجود دارد.
 *
 * ارجاع‌های جداول دیگر به شناسه‌های قدیمی، قبل از حذف، بر اساس «کد» به ردیف
 * جدید منتقل می‌شوند (وضعیت سنجه، اسناد کنترل‌شده، چک‌لیست‌ها…). هر ارجاعی که
 * کدِ نظیرش در نسل۶ نمانده باشد NULL می‌شود؛ به‌جز وضعیت سنجه‌ها که با
 * CASCADE خودبه‌خود می‌رود — یعنی تاریخچهٔ ارزیابی نسل۵ برای کدهای بازنشسته
 * باقی نمی‌ماند (تصمیم آگاهانه در docs/ACC-V6-MIGRATION.md).
 *
 * پرچم‌ها:
 *   • latin_runs_unreversed_v1 — متن لاتین نسخهٔ ششم از منبع ساختاریافته سالم
 *     است؛ عبور یک‌بارهٔ reverseLatinRuns (در seed-repair-measure-text) آن را
 *     وارونه می‌کرد («WHO» → «OHW»). این پرچم باید پیش از آن seed ست شود.
 *   • accreditation_edition = '6' — نشانهٔ ماندگار نسخه برای ممیزی/گزارش.
 *
 * Idempotent: اجرای دوم صفر تغییر می‌دهد (فقط پرچم‌ها را تضمین می‌کند).
 * Run: node database/seed-accreditation-v6.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db } = require('../src/config/database-sqlite');

// جداولی که ستون ارجاع‌دهنده به درخت دارند (کشف‌شده با PRAGMA روی دیتابیس دمو)
const REF_TABLES = [
  ['measure_status', 'measure_id'],
  ['measure_status_history', 'measure_id'],
  ['user_measure_overrides', 'measure_id'],
  ['activity_measure_mapping', 'measure_id'],
  ['measure_corrective_actions', 'measure_id'],
  ['controlled_documents', 'section_id'],
  ['checklists', 'section_id'],
  ['processes', 'section_id'],
  ['certifications', 'section_id'],
  ['digital_library_items', 'section_id'],
  ['facility_assets', 'section_id'],
];

function setSetting(key, value) {
  try {
    db.prepare(`INSERT INTO platform_settings (key, value) VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(key, value);
  } catch (err) {
    // جدول تنظیمات هنوز ساخته نشده — پرچم بعداً هم قابل بازیابی است
  }
}

function runMigration() {
  const v6Present = db.prepare(
    "SELECT COUNT(*) c FROM accreditation_sections WHERE code = 'ج-1-5-18' AND level_type = 'measure'"
  ).get().c > 0;

  setSetting('latin_runs_unreversed_v1', '1'); // در هر دو مسیر: متن ما تمیز است

  if (v6Present) {
    setSetting('accreditation_edition', '6');
    return { skipped: true };
  }

  const dataPath = path.join(__dirname, 'accreditation-standards-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  // ۱) نقشهٔ قدیمی برای انتقال ارجاع‌ها
  const oldRows = db.prepare('SELECT id, code, level_type FROM accreditation_sections').all();
  const oldById = new Map(oldRows.map((r) => [r.id, r]));

  // ۲) ارجاع‌ها را قبل از هر تغییری جمع کن (فقط ارجاع‌هایی که به همین درخت می‌خوردند)
  const refs = [];
  for (const [table, col] of REF_TABLES) {
    let rows;
    try { rows = db.prepare(`SELECT id, ${col} AS ref FROM ${table} WHERE ${col} IS NOT NULL`).all(); }
    catch (err) { continue; }
    const mine = rows.filter((r) => oldById.has(r.ref));
    if (mine.length) refs.push({ table, col, rows: mine });
  }

  const ins = db.prepare(`INSERT INTO accreditation_sections
    (id, code, level_type, parent_id, title, statement, detail_text, page, measure_level,
     patient_safety_flag, weight_multiplier, year)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '1405')`);

  const stats = { sections: 0, axes: 0, standards: 0, measures: 0, remapped: 0, unmapped: 0 };
  const newByKey = new Map(); // «level_type|code» → شناسهٔ جدید

  const tx = db.transaction(() => {
    // ۳) درج درخت نسخهٔ ششم (شناسه‌های تازه)
    for (const [secCode, sec] of Object.entries(data)) {
      if (!sec || typeof sec !== 'object' || !sec.axes) continue; // کلیدهای متادیتا (source/source2)
      const secId = crypto.randomUUID();
      ins.run(secId, secCode, 'section', null, sec.title || null, null, null, sec.title_page || null, null, 0, 1.0);
      newByKey.set('section|' + secCode, secId);
      stats.sections++;

      for (const [axCode, ax] of Object.entries(sec.axes)) {
        const axId = crypto.randomUUID();
        ins.run(axId, axCode, 'axis', secId, ax.title || null, null, null, ax.title_page || null, null, 0, 1.0);
        newByKey.set('axis|' + axCode, axId);
        stats.axes++;

        const stdIds = {};
        for (const [stdCode, std] of Object.entries(ax.standards || {})) {
          const stId = crypto.randomUUID();
          ins.run(stId, stdCode, 'standard', axId, std.code || stdCode, std.statement || null, null, std.page || null, null, 0, 1.0);
          stdIds[stdCode] = stId;
          newByKey.set('standard|' + stdCode, stId);
          stats.standards++;
        }
        for (const m of ax.measures || []) {
          const parent = stdIds[m.standard_code] || axId;
          const w = m.weight != null ? m.weight : (m.patient_safety_flag ? 2.0 : 1.0);
          const mid = crypto.randomUUID();
          ins.run(mid, m.code, 'measure', parent, null, m.statement || null, m.detail_text || null,
            m.page || null, m.level || null, m.patient_safety_flag ? 1 : 0, w);
          newByKey.set('measure|' + m.code, mid);
          stats.measures++;
        }
      }
    }

    // ۴) انتقال ارجاع‌ها بر اساس کد (قابل‌نگاشت) یا تهی‌کردن (بدون نظیر)
    for (const { table, col, rows } of refs) {
      const upd = db.prepare(`UPDATE ${table} SET ${col} = ? WHERE id = ?`);
      for (const r of rows) {
        const old = oldById.get(r.ref);
        const nid = old ? (newByKey.get(old.level_type + '|' + old.code) || null) : null;
        try {
          upd.run(nid, r.id);
          if (nid) stats.remapped++; else stats.unmapped++;
        } catch (err) {
          // تضاد یکتا (مثلاً دو وضعیت هم‌کد) → ردیف قدیمی می‌ماند و با CASCADE می‌رود
          stats.unmapped++;
        }
      }
    }

    // ۵) حذف ردیف‌های قدیمی (فرزندان با CASCADE؛ وضعیت‌های باقی‌مانده هم می‌روند)
    const ids = oldRows.map((r) => r.id);
    for (let i = 0; i < ids.length; i += 400) {
      const chunk = ids.slice(i, i + 400);
      db.prepare(`DELETE FROM accreditation_sections WHERE id IN (${chunk.map(() => '?').join(',')})`).run(...chunk);
    }
  });

  tx();

  setSetting('latin_runs_unreversed_v1', '1');
  setSetting('accreditation_edition', '6');

  console.log(`[AccreditationV6] ✅ درخت به ویرایش ششم سوئیچ شد: ` +
    `${stats.sections} فصل، ${stats.axes} محور، ${stats.standards} استاندارد، ${stats.measures} سنجه`);
  console.log(`[AccreditationV6] ارجاع‌ها: ${stats.remapped} منتقل، ${stats.unmapped} تهی (کد بازنشسته)`);
  return stats;
}

module.exports = { runMigration };

if (require.main === module) { runMigration(); process.exit(0); }

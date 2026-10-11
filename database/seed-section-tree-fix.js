/**
 * Migration: اصلاح سلسله‌مراتب و متادیتای درخت accreditation_sections
 *
 * سه اشکال که در ممیزی پوشش استاندارد (docs/STANDARD_COVERAGE_AUDIT.md) پیدا شد:
 *
 * ۱) سه استاندارد «الف-3-2»، «ب-1-1» و «ج-1-6» در فایل مرجع
 *    database/accreditation-standards-data.json فقط به‌صورت `standard_code`
 *    داخل سنجه‌ها آمده‌اند و در دیکشنری `standards` هر محور غایب‌اند.
 *    در نتیجه ۱۲ سنجه هنگام seed مستقیماً به «محور» وصل شده بودند و
 *    زنجیره محور ← استاندارد ← سنجه برایشان شکسته بود.
 *    اینجا گره استاندارد با همان کدِ موجود در مرجع ساخته می‌شود و
 *    سنجه‌ها زیر آن منتقل می‌شوند. متن استاندارد **جعل نمی‌شود**؛
 *    عنوان با همان قرارداد seed-standard-titles.js برچسب «ثبت‌نشده» می‌گیرد.
 *
 * ۲) sort_order در کل ۶۵۰ ردیف صفر بود، پس ترتیب واقعی کتاب قابل بازتولید نبود.
 *    اینجا از ترتیبِ عددیِ خودِ کد (الف-3-12 بعد از الف-3-2) پر می‌شود.
 *
 * ۳) icon در کل ردیف‌ها NULL بود. برای ۳ فصل و ۱۹ محور یک گلیف متنی
 *    (هم‌سبک با LIB_CAT_ICON در public/js/app.js) نشانده می‌شود.
 *    برای استاندارد/سنجه چیزی ست نمی‌شود.
 *
 * page_type عمداً دست‌نخورده (NULL) می‌ماند: مقادیر آن در طراحی اولیه حسن
 * («خط مشی»، «روش اجرایی»، «چک لیست»، …) در فایل مرجع ما وجود ندارد و
 * حدس‌زدنش یعنی ساختن محتوای مقرراتی.
 *
 * Idempotent: اجرای دوم هیچ ردیفی را تغییر نمی‌دهد.
 * Run: node database/seed-section-tree-fix.js
 */
const path = require('path');
const crypto = require('crypto');
const { db } = require('../src/config/database-sqlite');

const TITLE_UNSET = ' — عنوان کامل هنوز ثبت نشده';

// گلیف هر محور/فصل — صرفاً تزئین رابط کاربری، بدون بار محتوایی
const ICONS = {
  'الف': '◈', 'ب': '✚', 'ج': '❖',
  'الف-1': '★', 'الف-2': '⚠', 'الف-3': '👤', 'الف-4': '⚕', 'الف-5': '▤',
  'الف-6': '✿', 'الف-7': '⚙',
  'ب-1': '♥', 'ب-2': '✚', 'ب-3': '⌘', 'ب-4': '☺', 'ب-5': '☤',
  'ب-6': '⚗', 'ب-7': '◉', 'ب-8': '⚛', 'ب-9': '❤', 'ب-10': '☰',
  'ج-1': '⛑', 'ج-2': '⚖',
};

function loadReference() {
  const data = require(path.join(__dirname, 'accreditation-standards-data.json'));
  const order = [];              // ترتیب خطی کل درخت، همان ترتیب کتاب
  const knownStandards = new Set();
  const orphans = new Map();     // standard_code → { axisCode, measureCodes[] }
  for (const [partCode, part] of Object.entries(data)) {
    order.push(partCode);
    for (const [axisCode, axis] of Object.entries(part.axes || {})) {
      order.push(axisCode);
      for (const stdCode of Object.keys(axis.standards || {})) {
        knownStandards.add(stdCode);
        order.push(stdCode);
      }
      for (const m of axis.measures || []) order.push(m.code);
      for (const m of axis.measures || []) {
        const sc = String(m.standard_code || '').trim();
        if (!sc || (axis.standards || {})[sc]) continue;
        if (!orphans.has(sc)) orphans.set(sc, { axisCode, measureCodes: [] });
        orphans.get(sc).measureCodes.push(m.code);
      }
    }
  }
  for (const sc of knownStandards) orphans.delete(sc);
  return { order, orphans };
}

// کلید مرتب‌سازی طبیعی: «الف-3-12» باید بعد از «الف-3-2» بیاید نه قبلش
function codeKey(code) {
  const [head, ...nums] = String(code).split('-');
  const part = { 'الف': 1, 'ب': 2, 'ج': 3 }[head] ?? 9;
  const n = nums.map((x) => Number(x) || 0);
  return [part, n[0] || 0, n[1] || 0, n[2] || 0];
}

function run() {
  const { order, orphans } = loadReference();
  const rows = db.prepare('SELECT id, code, level_type, parent_id, sort_order, icon FROM accreditation_sections').all();
  const byCodeType = new Map(rows.map((r) => [r.level_type + '|' + r.code, r]));
  const stats = { standardsCreated: 0, measuresReparented: 0, sortSet: 0, iconsSet: 0 };

  const tx = db.transaction(() => {
    // ۱) گره استانداردهای گمشده + انتقال سنجه‌های یتیم
    for (const [stdCode, info] of orphans) {
      const axis = byCodeType.get('axis|' + info.axisCode);
      if (!axis) { console.warn('  ! محور یافت نشد:', info.axisCode); continue; }
      let std = byCodeType.get('standard|' + stdCode);
      if (!std) {
        const id = crypto.randomUUID();
        db.prepare(`INSERT INTO accreditation_sections (id, code, level_type, parent_id, title, year)
                    VALUES (?, ?, 'standard', ?, ?, '1405')`)
          .run(id, stdCode, axis.id, 'استاندارد ' + stdCode + TITLE_UNSET);
        std = { id, code: stdCode };
        byCodeType.set('standard|' + stdCode, std);
        stats.standardsCreated++;
      }
      const upd = db.prepare(`UPDATE accreditation_sections SET parent_id = ?
                              WHERE code = ? AND level_type = 'measure' AND parent_id IS NOT ?`);
      for (const mc of info.measureCodes) stats.measuresReparented += upd.run(std.id, mc, std.id).changes;
    }

    // ۲) sort_order بر اساس ترتیب طبیعی کد، مستقل در میان هم‌نیاکان
    const all = db.prepare('SELECT id, code, level_type, parent_id, sort_order FROM accreditation_sections').all();
    const groups = new Map();
    for (const r of all) {
      const k = r.parent_id || 'ROOT';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(r);
    }
    const setSort = db.prepare('UPDATE accreditation_sections SET sort_order = ? WHERE id = ? AND sort_order IS NOT ?');
    for (const list of groups.values()) {
      list.sort((a, b) => {
        const ka = codeKey(a.code), kb = codeKey(b.code);
        for (let i = 0; i < 4; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
        return String(a.code).localeCompare(String(b.code));
      });
      list.forEach((r, i) => { stats.sortSet += setSort.run((i + 1) * 10, r.id, (i + 1) * 10).changes; });
    }

    // ۳) آیکون فصل‌ها و محورها
    const setIcon = db.prepare(`UPDATE accreditation_sections SET icon = ?
                                WHERE code = ? AND level_type IN ('section','axis')
                                  AND (icon IS NULL OR icon <> ?)`);
    for (const [code, glyph] of Object.entries(ICONS)) stats.iconsSet += setIcon.run(glyph, code, glyph).changes;
  });

  tx();

  console.log('اصلاح درخت اعتباربخشی:');
  console.log('  استانداردهای بازسازی‌شده :', stats.standardsCreated);
  console.log('  سنجه‌های منتقل‌شده       :', stats.measuresReparented);
  console.log('  sort_order تنظیم‌شده     :', stats.sortSet);
  console.log('  آیکون تنظیم‌شده          :', stats.iconsSet);
  // انتظار: تعداد گره‌های دیتابیس = گره‌های فایل مرجع + استانداردهای بازسازی‌شده
  const total = db.prepare('SELECT COUNT(*) c FROM accreditation_sections').get().c;
  const expected = order.length + orphans.size;
  if (total !== expected) console.warn(`  ! تعداد گره‌ها ${total} است ولی ${expected} انتظار می‌رفت.`);
}

function runMigration() { run(); }

if (require.main === module) { runMigration(); process.exit(0); }
module.exports = { runMigration, run };

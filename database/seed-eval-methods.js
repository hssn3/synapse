/* =====================================================================
   روش ارزیابی هر سنجه: مستندات / مشاهده / مصاحبه
   ---------------------------------------------------------------------
   کتاب استاندارد برای هر سنجه مشخص می‌کند که ارزیاب با چه ترکیبی
   راستی‌آزمایی می‌کند: بررسی مستندات، مشاهده‌ی میدانی، مصاحبه با کارکنان
   و بیماران — و اغلب بیش از یکی.

   تا امروز سامانه این را ذخیره نمی‌کرد؛ عبارت «مدارک مورد انتظار بازرس»
   را از روی کلیدواژه‌های متن سنجه *حدس* می‌زد. روی سنجه‌هایی که متنشان
   کلیدواژه‌ی روشنی ندارد، راهنما ناقص یا گمراه‌کننده می‌شد و کاربر هم
   نمی‌فهمید که این یک حدس بوده.

   حالا سه پرچم مستقل روی خود سنجه ذخیره می‌شود. مقدار اولیه از همان
   استنتاجِ کلیدواژه‌ای می‌آید — نه چون دقیق است، بلکه چون بهتر از خالی
   گذاشتنِ ۶۵۳ ردیف است — و مدیر اعتباربخشی می‌تواند اصلاحش کند. ستون
   eval_source می‌گوید مقدار فعلی حدسِ سامانه است یا تأییدِ آدم، تا در
   رابط کاربری صادقانه تفکیک شود.
   ===================================================================== */
'use strict';

const { query } = require('../src/config/database');

// کلیدواژه‌هایی که به روش ارزیابی اشاره دارند. عمداً محافظه‌کارانه‌اند:
// اگر هیچ‌کدام نخورد، «مستندات» تنها پیش‌فرض است، چون هر سنجه‌ای دست‌کم
// یک ردّ مکتوب لازم دارد.
const OBS = /مشاهده|بازدید|میدانی|محیط|تجهیز|چیدمان|علائم|تابلو|فضای|ساختمان|نظافت|دما|نور|تهویه/;
const ITV = /مصاحبه|آگاهی|اطلاع کارکنان|پرسش|رضایت|آموزش دیده|توجیه|فرهنگ/;

function hasCol(table, col) {
  try { return query(`PRAGMA table_info(${table})`).rows.some(r => r.name === col); }
  catch (e) { return false; }
}

function runMigration() {
  try {
    const cols = [
      ['eval_doc', 'INTEGER DEFAULT 1'],
      ['eval_obs', 'INTEGER DEFAULT 0'],
      ['eval_itv', 'INTEGER DEFAULT 0'],
      ['eval_source', "TEXT DEFAULT 'inferred'"],   // inferred | confirmed
    ];
    let added = 0;
    for (const [name, type] of cols) {
      if (!hasCol('accreditation_sections', name)) {
        query(`ALTER TABLE accreditation_sections ADD COLUMN ${name} ${type}`);
        added++;
      }
    }

    // فقط ردیف‌هایی که هنوز کسی تأییدشان نکرده دوباره استنتاج می‌شوند؛
    // ویرایش دستی مدیر اعتباربخشی هرگز بازنویسی نمی‌شود.
    const rows = query(
      `SELECT id, statement, detail_text FROM accreditation_sections
        WHERE level_type = 'measure' AND COALESCE(eval_source,'inferred') = 'inferred'`).rows;
    let n = 0;
    for (const r of rows) {
      const t = (r.statement || '') + ' ' + (r.detail_text || '');
      query('UPDATE accreditation_sections SET eval_doc = 1, eval_obs = ?, eval_itv = ? WHERE id = ?',
        [OBS.test(t) ? 1 : 0, ITV.test(t) ? 1 : 0, r.id]);
      n++;
    }
    console.log(`[Seed EvalMethods] ✅ ${added} ستون افزوده شد، روش ارزیابی ${n} سنجه استنتاج شد`);
  } catch (err) {
    console.error('[Seed EvalMethods] failed:', err.message);
  }
}

module.exports = { runMigration };
if (require.main === module) runMigration();

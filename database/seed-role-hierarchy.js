/* =====================================================================
   سلسله‌مراتبِ سمت‌ها (چارت سازمانی) برای فهرستِ پیش از ورود
   ---------------------------------------------------------------------
   تا پیش از این، سمت‌ها در صفحه‌ی ورود به ترتیبِ rowid یعنی «ترتیبِ ساخته
   شدنشان در seed» چیده می‌شدند؛ نتیجه‌اش این بود که «ریاست بیمارستان»
   یازدهمین کارت بود و «مدیر داخلی» اول. این migration دو ستون به roles
   اضافه می‌کند:

     hierarchy_order — جای سمت در چارت (کوچک‌تر = بالاتر)
     hierarchy_level — عمق در چارت (۰ = رأس)، فقط برای تورفتگیِ نمایشی

   چرا ستون روی roles و نه یک جدولِ ترتیبِ جدا؟ چون نقش‌ها در این سامانه
   سراسری‌اند (hospital_id = NULL) و ترتیبشان هم یک تصمیمِ سراسریِ
   سوپرادمین است، نه چیزی که هر بیمارستان جدا داشته باشد. یک جدولِ جدا
   فقط یک JOIN اضافه می‌آورد بی‌آنکه چیزی را ممکن کند.

   ترتیبِ پیش‌فرض طبق چارت رایجِ بیمارستان‌های کشور است. سوپرادمین از پنل
   خودش با کشیدنِ کارت‌ها می‌تواند عوضش کند و این seed دیگر دست نمی‌زند
   (فقط ردیف‌هایی را مقدار می‌دهد که هنوز NULL‌اند).
   ===================================================================== */
'use strict';

const { query } = require('../src/config/database');

// [code, level] — سطح فقط برای تورفتگی؛ ترتیب از خودِ آرایه می‌آید
const CHART = [
  ['hospital_president', 0],
  ['technical_officer', 1],
  ['admin', 1],
  ['nursing_director', 1],
  ['accreditation_manager', 1],
  ['quality_control_manager', 1],
  ['hr_manager', 2],
  ['financial_manager', 2],
  ['accounting_manager', 3],
  ['nutrition_manager', 2],
  ['occupational_health_officer', 2],
  ['environmental_health_officer', 2],
  ['clinical_supervisor', 2],
  ['education_supervisor', 2],
  ['infection_control_supervisor', 2],
  ['nursing_office_assistant', 2],
  ['breastfeeding_specialist', 3],
  ['staff_nurse', 3],
  ['anonymous_reporter', 4],
];

function hasCol(table, col) {
  try { return query(`PRAGMA table_info(${table})`).rows.some(r => r.name === col); }
  catch (e) { return false; }
}

function runMigration() {
  try {
    if (!hasCol('roles', 'hierarchy_order')) query('ALTER TABLE roles ADD COLUMN hierarchy_order INTEGER');
    if (!hasCol('roles', 'hierarchy_level')) query('ALTER TABLE roles ADD COLUMN hierarchy_level INTEGER');

    let set = 0;
    CHART.forEach(([code, level], i) => {
      const r = query('UPDATE roles SET hierarchy_order = ?, hierarchy_level = ? WHERE code = ? AND hierarchy_order IS NULL',
        [(i + 1) * 10, level, code]);
      set += (r.rowCount || 0);
    });

    // نقش‌های سفارشیِ خارج از چارتِ پیش‌فرض: انتهای فهرست، به ترتیب ساخته‌شدن
    const rest = query('SELECT id FROM roles WHERE hierarchy_order IS NULL ORDER BY rowid').rows;
    let next = (CHART.length + 1) * 10;
    for (const r of rest) {
      query('UPDATE roles SET hierarchy_order = ?, hierarchy_level = COALESCE(hierarchy_level, 2) WHERE id = ?', [next, r.id]);
      next += 10; set++;
    }
    console.log(`[Seed RoleHierarchy] ✅ چارت سمت‌ها آماده است (${set} نقش مرتب شد)`);
  } catch (err) {
    console.error('[Seed RoleHierarchy] failed:', err.message);
  }
}

module.exports = { runMigration, CHART };
if (require.main === module) runMigration();

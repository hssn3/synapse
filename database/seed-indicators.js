/**
 * Migration + Seed: شناسنامه‌ی کامل شاخص + ۶۱ شاخص استاندارد
 *
 * ── چرا این مهاجرت ─────────────────────────────────────────────────────────
 * کارفرما سند مرجعِ سامانه‌ی قبلیِ بیمارستان را داد. تطبیق نشان داد از ۳۵ بخشِ آن
 * سند، ۳۳ بخش در این پروژه کامل است و دو شکاف واقعی مانده. این فایل شکافِ اولِ
 * آن است: «ماژول شاخص».
 *
 * وضعیت قبل: جدول hospital_kpis وجود داشت با ۱۸ ستون و ۱۰ ردیف نمونه، و فقط از
 * داخل صفحه‌ی BSC دیده می‌شد. سند مرجع ۶۱ شاخص استاندارد با شناسنامه‌ی ۳۴ فیلدی
 * می‌خواهد — یعنی کمبود هم در عمق (فیلدها) بود، هم در پهنا (تعداد).
 *
 * ── چرا جدول تازه ساخته نشد ────────────────────────────────────────────────
 * همان استدلالی که seed-bsc.js نوشته، اینجا هم برقرار است و حتی مهم‌تر: اگر
 * «شاخصِ اعتباربخشی» جدولِ جدایی از hospital_kpis می‌گرفت، بیمارستان مجبور
 * می‌شد «میزان عفونت بیمارستانی» را دو بار تعریف کند و BSC نمی‌توانست به آن وصل
 * شود. پس hospital_kpis همان‌جا می‌ماند و فقط ستون‌های شناسنامه به آن اضافه
 * می‌شود — کمترین تغییر، بدون شکستنِ BSC که از قبل روی همین جدول کار می‌کند.
 *
 * مقادیر دوره‌ای هم جدول تازه نگرفت: bsc_monthly_values از قبل دقیقاً همین است
 * (شاخص × سال × ماه) و ایندکس یکتای آن جلوی ثبت تکراری را می‌گیرد — همان چیزی
 * که بند ۱۰.۶ سند می‌خواهد. فقط ستون‌های وضعیت/منبع/تأیید به آن افزوده شد تا
 * چرخه‌ی «ثبت‌کننده → تأییدکننده → وضعیت» کامل شود.
 *
 * ── داده‌ی ۶۱ شاخص ─────────────────────────────────────────────────────────
 * از database/indicators-reference.json خوانده می‌شود — هر ۶۱ رکورد با تمام
 * فیلدهای شناسنامه، مستقیماً از سند مرجع. هیچ مقداری حدس زده نشده؛ فیلدی که در
 * سند خالی بوده اینجا هم خالی می‌ماند.
 *
 * ── چه چیزی از سند مرجع عمداً برداشته شد ──────────────────────────────────
 * سند مرجع ناشناس‌سازی نشده بود: آرایه‌ی collectors هر شاخص، نام و نام خانوادگی
 * و کد ملی و کد پرسنلی و *شماره موبایل واقعیِ* کارکنان بیمارستانِ مبدأ را داشت،
 * به‌علاوه‌ی مسیر فایل امضای اسکن‌شده‌شان. این‌ها در مخزن ذخیره نشدند. دو دلیل:
 * اول اینکه داده‌ی هویتیِ افرادِ یک بیمارستانِ دیگر است و جایش در سورس‌کنترل
 * نیست؛ دوم اینکه حتی اگر مشکلی هم نداشت، برای بیمارستانِ مشتری بی‌معناست —
 * جمع‌آورنده را باید خودِ همان مرکز از کاربرانِ خودش انتخاب کند. برای همین
 * جدول kpi_collectors ساخته شد و خالی می‌ماند تا مرکز پرش کند.
 * شناسه‌های داخلیِ سامانه‌ی مبدأ (hospital_id، ward_id، id) هم برداشته شدند
 * چون به هیچ رکوردی در این پروژه اشاره نمی‌کنند.
 *
 * idempotent: تشخیص بر اساس (hospital_id, title) است، پس اجرای دوم چیزی اضافه
 * نمی‌کند و ویرایش‌های کاربر را هم بازنویسی نمی‌کند.
 */
'use strict';

const { db, query } = require('../src/config/database-sqlite');
const { uuid } = require('../src/utils/db');

// ---------- ستون‌های شناسنامه ----------
// هر کدام یک فیلد از ۳۴ فیلدِ شناسنامه‌ی سند مرجع است که در جدول فعلی نبود.
const ADD_COLUMNS = [
  ['code', 'TEXT'],                    // کد شاخص
  ['logical_reasons', 'TEXT'],         // منطق/دلیل جمع‌آوری
  ['basis', 'TEXT'],                   // مبنا: برنامه استراتژیک / عملکردی / مطالبات بالادستی
  ['desirability', 'TEXT'],            // جهت مطلوب به‌صورت متن (افزاینده/کاهنده) — عددش higher_is_better است
  ['report_type', 'TEXT'],             // روش گزارش
  ['measure_interval', 'TEXT'],        // دوره‌ی اندازه‌گیری
  ['delivery_respite', 'TEXT'],        // مهلت ارسال
  ['see_bsc', 'INTEGER DEFAULT 0'],    // در کارت امتیازی دیده شود؟
  ['bsc_weight', 'REAL'],              // وزن در BSC
  ['safety_related', 'INTEGER DEFAULT 0'],   // شاخص ایمنی بیمار
  ['send_to_kartabl', 'INTEGER DEFAULT 0'],  // به کارتابل جمع‌آورنده برود
  ['year', 'INTEGER'],                 // سال شاخص
  ['source', 'TEXT'],                  // منبع/الزام
  ['quality_dimension', "TEXT DEFAULT '[]'"], // ابعاد کیفیت (آرایه‌ی JSON)
  ['ward_name', 'TEXT'],               // بخش/واحد مسئول
  ['managemental', 'INTEGER DEFAULT 0'],     // مدیریتی (در برابر بالینی)
  ['is_mandatory', 'INTEGER DEFAULT 1'],     // اجباری یا اختیاری
  ['numerator_formula', 'TEXT'],       // فرمول صورت
  ['denominator_formula', 'TEXT'],     // فرمول مخرج
  ['data_origin', "TEXT DEFAULT 'local'"],   // reference | derived | local
  ['updated_at', 'TEXT'],
  // محورِ اعتباربخشیِ مرتبط — «الف-4»، «ب-5» و… (کدِ محور، نه کدِ سنجه)
  ['linked_axis_code', 'TEXT'],
];

// ---------- نگاشت دسته‌ی شاخص به محورِ اعتباربخشی ----------
//
// کارفرما گفت شاخص‌ها «منطق» ندارند و معلوم نیست با سنجه‌ها چه ارتباطی دارند.
// درست بود: ۷۱ شاخص در یک جدولِ تخت بودند و هیچ‌جا به درختِ اعتباربخشی وصل
// نمی‌شدند، پس عملاً یک جزیره‌ی جدا بودند.
//
// نگاشت در سطحِ *محور* است نه سنجه، و عمداً: ادعای اینکه فلان شاخص دقیقاً به
// سنجه‌ی «ب-۵-۴-۲» می‌خورد، حدسی است که ما حق نداریم بزنیم — ولی اینکه
// شاخص‌های دسته‌ی «کنترل عفونت» زیرِ محورِ «پیش‌گیری و کنترل عفونت» می‌نشینند،
// از خودِ نامِ هر دو پیداست و قابل بررسی است. مدیر می‌تواند بعداً از فرمِ
// شناسنامه محورِ دیگری انتخاب کند؛ این فقط نقطه‌ی شروعِ درست است.
//
// عنوان‌های سمتِ راست، عیناً title همان محور در accreditation_sections است.
const CATEGORY_AXIS = {
  'ایمنی بیمار':            'الف-1',  // رهبری و مدیریت کیفیت (برنامه‌ی ایمنی بیمار زیر همین محور است)
  'عمومی':                  'الف-1',
  'دفتر پرستاری':           'الف-4',  // مدیریت خدمات پرستاری
  'مدیریت اطلاعات سلامت':   'الف-5',  // فناوری و مدیریت اطلاعات سلامت
  'اورژانس':                'ب-2',    // مراقبت‌های حاد و اورژانس
  'کنترل عفونت':            'ب-5',    // پیش‌گیری و کنترل عفونت
  'آزمایشگاه جنرال':        'ب-8',    // خدمات آزمایشگاه
  'آموزش به بیمار':         'ج-2',    // احترام به حقوق گیرنده خدمت
};

// فقط ردیف‌هایی که هنوز محور ندارند پر می‌شوند — اگر مدیری دستی محور دیگری
// انتخاب کرده باشد، این مهاجرت (که در هر بوت اجرا می‌شود) نباید انتخابش را
// پس بگیرد.
function linkAxes() {
  let n = 0;
  for (const [cat, axis] of Object.entries(CATEGORY_AXIS)) {
    const r = db.prepare(
      `UPDATE hospital_kpis SET linked_axis_code = ?
       WHERE linked_axis_code IS NULL AND category = ?`).run(axis, cat);
    n += r.changes;
  }
  return n;
}

// مقادیر دوره‌ای: چرخه‌ی ثبت→تأیید که سند در بند ۱۰.۶ می‌خواهد
const ADD_VALUE_COLUMNS = [
  ['status', "TEXT DEFAULT 'ثبت‌شده'"], // ثبت‌شده | تأییدشده | ردشده
  ['source_note', 'TEXT'],
  ['approved_by', 'TEXT'],
  ['approved_at', 'TEXT'],
];

const TABLES = [
  // جمع‌آورندگان هر شاخص. جدول جدا و نه ستون JSON، چون سند می‌خواهد شاخص به
  // کارتابل جمع‌آورنده برود — یعنی باید بشود «شاخص‌های منِ جمع‌آورنده» را
  // با یک JOIN گرفت، نه با گشتن داخل JSON.
  `CREATE TABLE IF NOT EXISTS kpi_collectors (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    kpi_id TEXT NOT NULL REFERENCES hospital_kpis(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    display_name TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_kpi_coll_unique ON kpi_collectors(kpi_id, user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_kpi_coll_user ON kpi_collectors(hospital_id, user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_kpi_hosp_year ON hospital_kpis(hospital_id, year)`,
];

const ROLE_PERMS = {
  admin: ['manage_indicators', 'view_indicators'],
  quality_control_manager: ['manage_indicators', 'view_indicators'],
  accreditation_manager: ['manage_indicators', 'view_indicators'],
  nursing_director: ['manage_indicators', 'view_indicators'],
  president: ['view_indicators'],
  internal_manager: ['view_indicators'],
  clinical_supervisor: ['view_indicators'],
  infection_control_supervisor: ['manage_indicators', 'view_indicators'],
  education_supervisor: ['view_indicators'],
  head_nurse: ['view_indicators'],
};

// ---------- ۶۱ شاخص استاندارد ----------
// از سند مرجع، بدون دست‌کاری. جدا نگه داشته شد و داخل کد inline نشد تا اگر
// وزارت بهداشت فهرست را به‌روز کرد، فقط یک فایل داده عوض شود نه یک فایل کد.
const REFERENCE = require('./indicators-reference.json');

// جهت مطلوب در سند متنی است؛ ستون higher_is_better عددی است و BSC از قبل روی
// همان حساب می‌کند، پس هر دو نگه داشته می‌شوند.
const isIncreasing = (d) => String(d || '').trim() === 'افزاینده';

// ---------- اجرا ----------

function hasColumn(table, col) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === col);
}

function addColumns() {
  let n = 0;
  for (const [col, type] of ADD_COLUMNS) {
    if (hasColumn('hospital_kpis', col)) continue;
    db.exec(`ALTER TABLE hospital_kpis ADD COLUMN ${col} ${type}`);
    n++;
  }
  for (const [col, type] of ADD_VALUE_COLUMNS) {
    if (hasColumn('bsc_monthly_values', col)) continue;
    db.exec(`ALTER TABLE bsc_monthly_values ADD COLUMN ${col} ${type}`);
    n++;
  }
  return n;
}

function grantPerms() {
  let n = 0;
  for (const [roleCode, perms] of Object.entries(ROLE_PERMS)) {
    const roles = query('SELECT id, permissions FROM roles WHERE code = ?', [roleCode]).rows;
    for (const role of roles) {
      let list;
      try { list = JSON.parse(role.permissions || '[]'); } catch (e) { list = []; }
      if (!Array.isArray(list)) continue;
      // نقشی که '*' دارد از قبل همه‌چیز را دارد؛ افزودن مجوزِ صریح فقط نویز است
      if (list.includes('*')) continue;
      const missing = perms.filter(p => !list.includes(p));
      if (!missing.length) continue;
      query('UPDATE roles SET permissions = ? WHERE id = ?', [JSON.stringify(list.concat(missing)), role.id]);
      n++;
    }
  }
  return n;
}

// جهتِ مطلوبیت در دو ستون نگه داشته می‌شود: desirability ِ متنی (از سند وزارت) و
// higher_is_better ِ عددی (که BSC و نمودارها روی آن حساب می‌کنند). این دو در ۲۰
// شاخص از هم دررفته بودند و نتیجه‌اش خطرناک بود: شاخصی مثل «جاماندن جسم خارجی در
// بدن بیمار» با desirability=کاهنده ولی higher_is_better=1 ثبت شده بود، یعنی هرچه
// بدتر می‌شد، داشبورد و گزارش سبزتر نشانش می‌دادند.
//
// علتش این بود که این شاخص‌ها از seed ِ قدیمیِ BSC آمده بودند؛ seed ِ شاخص‌ها فقط
// ردیفِ تازه insert می‌کند و برای ردیفِ موجود ستون‌های خالی را پر می‌کرد، پس
// desirability از سند مرجع نوشته می‌شد ولی higher_is_better ِ غلطِ قبلی سرِ جایش
// می‌ماند. سند وزارت مرجع است، پس عدد از متن مشتق می‌شود نه برعکس.
function reconcileDesirability() {
  const r = query(
    `UPDATE hospital_kpis
        SET higher_is_better = CASE WHEN TRIM(desirability) = 'افزاینده' THEN 1 ELSE 0 END
      WHERE desirability IN ('افزاینده', 'کاهنده')
        AND higher_is_better <> (CASE WHEN TRIM(desirability) = 'افزاینده' THEN 1 ELSE 0 END)`);
  // query() ِ این پروژه {rows, rowCount} برمی‌گرداند، نه info ِ خامِ better-sqlite3؛
  // خواندنِ r.changes همیشه undefined می‌دهد و شمارش را صفر نشان می‌دهد.
  return (r && r.rowCount) || 0;
}

function currentJalaliYear() {
  // سالِ جاریِ دوره‌ی اعتباربخشی؛ اگر ثبت نشده، از سالِ شاخص‌های موجود می‌آید.
  const row = query('SELECT MAX(jalali_year) y FROM bsc_monthly_values').rows[0];
  return (row && row.y) || 1405;
}

function seedIndicators() {
  const hospitals = query('SELECT id FROM hospitals').rows;
  let inserted = 0, hospitalsTouched = 0;

  for (const h of hospitals) {
    // idempotent: عنوان‌های موجود دوباره درج نمی‌شوند و ویرایش‌های کاربر
    // دست‌نخورده می‌مانند.
    const existing = new Set(query('SELECT title FROM hospital_kpis WHERE hospital_id = ?', [h.id])
      .rows.map(r => String(r.title || '').trim()));
    let n = 0;
    for (const r of REFERENCE) {
      const title = String(r.title || '').trim();
      if (!title || existing.has(title)) continue;
      const ward = r.main_ward_name || null;
      // کد «-» در سند یعنی «کد ندارد»، نه اینکه کدش خطِ تیره باشد.
      const code = (r.code && r.code !== '-') ? r.code : null;
      const num = (v) => (v === '' || v === null || v === undefined) ? null : Number(v);
      query(
        `INSERT INTO hospital_kpis
           (id, hospital_id, title, code, category, ward_name, aspect, indicator_type, unit,
            higher_is_better, desirability, measure_interval, report_type, source,
            safety_related, quality_dimension, basis, managemental, is_mandatory,
            year, definition, logical_reasons, delivery_respite, see_bsc, bsc_weight,
            send_to_kartabl, target_value, upper_limit, lower_limit,
            is_active, data_origin, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                 1, 'reference', datetime('now'), datetime('now'))`,
        [uuid(), h.id, title, code, ward, ward, r.aspect || null, r.indicator_type || null,
          r.measurement_unit || null,
          isIncreasing(r.desirability) ? 1 : 0, r.desirability || null,
          r.measure_interval || null, r.report_type || null, r.source || null,
          r.safety_related ? 1 : 0, JSON.stringify(r.quality_dimension || []),
          r.basis || null, r.managemental ? 1 : 0,
          String(r.source || '').startsWith('الزامی') ? 1 : 0,
          r.year || null, r.definition || null, r.logical_reasons_of_collecting || null,
          r.delivery_date_respite || null, r.see_bsc ? 1 : 0, r.bsc_weight,
          r.send_to_kartabl ? 1 : 0, num(r.target), num(r.upper_limit), num(r.lower_limit)]
      );
      n++;
    }
    if (n) { inserted += n; hospitalsTouched++; }
  }
  return { inserted, hospitalsTouched };
}

// شاخص‌های قدیمیِ بدون شناسنامه هم باید حداقلِ فیلدها را داشته باشند، وگرنه در
// فهرست جدید بدون بخش/جنبه/سال ظاهر می‌شوند و فیلترها از قلمشان می‌اندازند.
function backfillLegacy() {
  const year = currentJalaliYear();
  const r = query(
    `UPDATE hospital_kpis
       SET year = COALESCE(year, ?),
           aspect = COALESCE(aspect, 'مدیریتی'),
           indicator_type = COALESCE(indicator_type, 'پیامدی'),
           category = COALESCE(category, 'عمومی'),
           ward_name = COALESCE(ward_name, category, 'عمومی'),
           measure_interval = COALESCE(measure_interval, 'ماهانه'),
           desirability = COALESCE(desirability, CASE WHEN higher_is_better = 1 THEN 'افزاینده' ELSE 'کاهنده' END),
           quality_dimension = COALESCE(quality_dimension, '[]'),
           data_origin = COALESCE(data_origin, 'local'),
           -- ستون با DEFAULT 1 اضافه شد، پس ردیف‌های قدیمی «اجباری» گرفتند در
           -- حالی که شاخصِ محلیِ خودِ بیمارستان‌اند، نه الزامِ دانشگاه. COALESCE
           -- اینجا کار نمی‌کند چون مقدار NULL نیست.
           is_mandatory = 0
     WHERE year IS NULL OR aspect IS NULL OR category IS NULL OR ward_name IS NULL`,
    [year]);
  return (r && r.rowCount) || 0;
}

function runMigration() {
  try {
    const cols = addColumns();
    for (const sql of TABLES) db.exec(sql);
    const perms = grantPerms();
    const back = backfillLegacy();
    const s = seedIndicators();
    const linked = linkAxes();
    const fixed = reconcileDesirability();
    console.log(`[Seed Indicators] ✅ ${cols} ستون افزوده شد، ${perms} نقش مجوز گرفت، `
      + `${back} شاخص قدیمی تکمیل شد، ${s.inserted} شاخص استاندارد در ${s.hospitalsTouched} بیمارستان درج شد، `
      + `${linked} شاخص به محور اعتباربخشی وصل شد`
      + (fixed ? `، جهتِ مطلوبیتِ ${fixed} شاخص با سند مرجع هماهنگ شد` : ''));
  } catch (err) {
    console.error('[Seed Indicators] failed:', err.message);
  }
}

module.exports = { runMigration, REFERENCE, ROLE_PERMS, CATEGORY_AXIS };

if (require.main === module) runMigration();

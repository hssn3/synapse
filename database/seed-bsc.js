/**
 * Migration + Seed: کارت امتیازی متوازن (BSC) — شکاف ۷ رقیب
 * چهار وجه کلاسیک کاپلان-نورتون × ۱۲ ماه شمسی × تارگت + خروجی CSV.
 *
 * ── تصمیم طراحی: چرا جدول شاخص جدید ساخته نشد ─────────────────────────────
 * دو نامزد برای «شاخص» در این پروژه وجود داشت:
 *  ۱) activity_types/activity_records — بررسی شد و *رد شد*: activity_records یک رویدادنگارِ
 *     فرم‌محور است (form_data به‌صورت JSON، occurred_at به‌صورت لحظه‌ی وقوع). نه ستون مقدار
 *     عددی دارد، نه تارگت، نه دوره‌ی تناوب. جمع‌بندی ماهانه روی آن یعنی تکیه بر کلید دلخواه
 *     داخل یک JSON بدون اسکیمای تضمین‌شده — شکننده و غیرقابل ایندکس.
 *  ۲) hospital_kpis — *انتخاب شد*: از قبل دقیقاً «شاخص» است (عنوان، تعریف، صورت/مخرج،
 *     target_value، حد بالا/پایین، dimension، aspect) و ۱۴ ردیف واقعی دارد.
 * پس BSC یک جدول شاخص موازی نمی‌سازد؛ فقط دو ستون به hospital_kpis اضافه می‌کند
 * (bsc_perspective، unit) و یک جدول مقادیر ماهانه‌ی نازک. اگر جدول تازه‌ای می‌ساختیم،
 * بیمارستان مجبور می‌شد «میزان عفونت بیمارستانی» را دو بار تعریف کند.
 *
 * مقادیر ماهانه چرا جدول جدا و نه ۱۲ ستون؟ چون سال شمسی بُعد اصلی داده در این دامنه است
 * (سند رقیب، بند ۴.۲) و با ۱۲ ستون، هر سال جدید یعنی مهاجرت اسکیما.
 * Run: npm run seed-bsc — idempotent است و روی هر boot امن اجرا می‌شود.
 */
const { db } = require('../src/config/database-sqlite');
const { grantPerms } = require('./seed-library');

// چهار وجه استاندارد کارت امتیازی متوازن (Kaplan & Norton, 1992)
const PERSPECTIVES = ['مالی', 'گیرنده خدمت', 'فرآیندهای داخلی', 'رشد و یادگیری'];

const ADD_COLUMNS = [
  { table: 'hospital_kpis', column: 'bsc_perspective', ddl: 'ALTER TABLE hospital_kpis ADD COLUMN bsc_perspective TEXT' },
  { table: 'hospital_kpis', column: 'unit', ddl: 'ALTER TABLE hospital_kpis ADD COLUMN unit TEXT' },
  // جهت مطلوب شاخص: ۱ یعنی بیشتر بهتر (رضایت)، ۰ یعنی کمتر بهتر (عفونت، سقوط)
  { table: 'hospital_kpis', column: 'higher_is_better', ddl: 'ALTER TABLE hospital_kpis ADD COLUMN higher_is_better INTEGER DEFAULT 1' },
];

const TABLES = [
  `CREATE TABLE IF NOT EXISTS bsc_monthly_values (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    kpi_id TEXT NOT NULL REFERENCES hospital_kpis(id) ON DELETE CASCADE,
    jalali_year INTEGER NOT NULL,
    jalali_month INTEGER NOT NULL,
    value REAL,
    note TEXT,
    recorded_by TEXT REFERENCES users(id),
    recorded_at TEXT DEFAULT (datetime('now'))
  )`,
  // یک مقدار به‌ازای هر شاخص/سال/ماه — ثبت دوباره باید به‌روزرسانی باشد نه ردیف تکراری
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_bsc_val_unique ON bsc_monthly_values(kpi_id, jalali_year, jalali_month)`,
  `CREATE INDEX IF NOT EXISTS idx_bsc_val_hosp ON bsc_monthly_values(hospital_id, jalali_year)`,
];

const ROLE_PERMS = {
  admin: ['manage_bsc', 'view_bsc'],
  quality_control_manager: ['manage_bsc', 'view_bsc'],
  nursing_director: ['manage_bsc', 'view_bsc'],
  clinical_supervisor: ['view_bsc'],
  infection_control_supervisor: ['view_bsc'],
  education_supervisor: ['view_bsc'],
};

// نگاشت شاخص‌های موجود به وجه‌های BSC بر اساس category/dimension آن‌ها (بدون جعل تارگت)
function perspectiveFor(kpi) {
  if (kpi.dimension === 'رضایتمندی' || kpi.dimension === 'به‌موقع بودن') return 'گیرنده خدمت';
  if (kpi.category === 'patient_safety' || kpi.category === 'infection_control') return 'فرآیندهای داخلی';
  return 'فرآیندهای داخلی';
}
// شاخص‌هایی که «کمتر بهتر» هستند از روی عنوانشان تشخیص داده می‌شوند
const LOWER_IS_BETTER = ['سقوط', 'مرگ', 'عوارض', 'عفونت', 'زخم', 'ناموفق', 'ترک با مسئولیت', 'انتظار', 'جدا شدن'];

// حداقل یک شاخص واقعی برای هر چهار وجه، تا کارت امتیازی هیچ بیمارستانی خالی نباشد.
// اینها شاخص‌های رایج و مستند بیمارستانی‌اند، نه مقدار ساختگی — مقدار ماهانه seed نمی‌شود.
const STARTER_KPIS = [
  { title: 'درصد اشغال تخت', category: 'financial', dimension: 'کارایی', aspect: 'مدیریتی',
    unit: 'درصد', bsc_perspective: 'مالی', target_value: 75, higher_is_better: 1,
    definition: 'نسبت تخت‌روز اشغالی به تخت‌روز فعال' },
  { title: 'میانگین مدت اقامت بیمار', category: 'efficiency', dimension: 'کارایی', aspect: 'مدیریتی',
    unit: 'روز', bsc_perspective: 'فرآیندهای داخلی', target_value: 3, higher_is_better: 0,
    definition: 'مجموع روزهای بستری تقسیم بر تعداد ترخیص' },
  { title: 'درصد رضایت گیرنده خدمت', category: 'satisfaction', dimension: 'رضایتمندی', aspect: 'مدیریتی',
    unit: 'درصد', bsc_perspective: 'گیرنده خدمت', target_value: 90, higher_is_better: 1,
    definition: 'میانگین نمره نظرسنجی رضایت بیماران بستری و سرپایی' },
  { title: 'میانگین ساعت آموزش به ازای هر کارمند', category: 'education', dimension: 'توانمندی', aspect: 'مدیریتی',
    unit: 'ساعت', bsc_perspective: 'رشد و یادگیری', target_value: 20, higher_is_better: 1,
    definition: 'مجموع نفر-ساعت آموزش تقسیم بر تعداد کارکنان' },
];

function runMigration() {
  console.log('[Seed BSC] Starting...');
  try {
    for (const c of ADD_COLUMNS) {
      const cols = db.prepare(`PRAGMA table_info(${c.table})`).all().map(r => r.name);
      if (!cols.includes(c.column)) { db.exec(c.ddl); console.log(`[Seed BSC] + ${c.table}.${c.column}`); }
    }
    for (const sql of TABLES) db.exec(sql);

    // ۱) وجه BSC شاخص‌های موجود که هنوز تعیین نشده
    const orphans = db.prepare('SELECT id, title, category, dimension FROM hospital_kpis WHERE bsc_perspective IS NULL').all();
    if (orphans.length) {
      const upd = db.prepare('UPDATE hospital_kpis SET bsc_perspective = ?, higher_is_better = ? WHERE id = ?');
      db.transaction(() => {
        for (const k of orphans) {
          const lower = LOWER_IS_BETTER.some(w => (k.title || '').includes(w));
          upd.run(perspectiveFor(k), lower ? 0 : 1, k.id);
        }
      })();
      console.log(`[Seed BSC] ${orphans.length} existing KPI(s) mapped to a BSC perspective`);
    }

    // ۲) شاخص پایه برای وجه‌های بدون شاخص، به‌ازای هر بیمارستان (بر اساس عنوان، پس تکرارناپذیر)
    const hospitals = db.prepare('SELECT id FROM hospitals').all();
    const exists = db.prepare('SELECT id FROM hospital_kpis WHERE hospital_id = ? AND title = ?');
    const ins = db.prepare(`INSERT INTO hospital_kpis (id, hospital_id, title, category, dimension, aspect,
      definition, target_value, unit, bsc_perspective, higher_is_better, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`);
    let added = 0;
    db.transaction(() => {
      for (const h of hospitals) {
        for (const k of STARTER_KPIS) {
          if (exists.get(h.id, k.title)) continue;
          ins.run(require('crypto').randomUUID(), h.id, k.title, k.category, k.dimension, k.aspect,
            k.definition, k.target_value, k.unit, k.bsc_perspective, k.higher_is_better);
          added++;
        }
      }
    })();
    if (added) console.log(`[Seed BSC] ${added} starter BSC indicator(s) added`);

    grantPerms(ROLE_PERMS, 'Seed BSC');
    console.log('[Seed BSC] ✅ BSC (4 perspectives × 12 Jalali months) ready');
  } catch (err) {
    console.error('[Seed BSC] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration, PERSPECTIVES };

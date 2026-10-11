/**
 * Migration + Seed: جدول hospital_features — سوییچ فعال/غیرفعال هر «بخش» سامانه به‌ازای هر بیمارستان،
 * پایه‌ی مدل پکیج/اشتراک فروشی (superadmin تعیین می‌کند کدام بخش‌ها در پکیج آن بیمارستان هست).
 *
 * گرانولاریتی: هر کلید دقیقاً همان صفحه‌ی سطح‌بالای منوی کناری است (همان چیزی که در
 * public/js/app.js → go(p) رندر می‌شود و در NAV_GROUPS دیده می‌شود) — نه هر دکمه‌ی داخل صفحه
 * (خیلی ریزدانه و غیرقابل‌مدیریت برای پکیج واقعی) و نه هر گروه ناوبری (فقط ۳ گروه: خیلی درشت‌دانه،
 * مثلاً «سازمان و گزارش‌ها» ده‌ها زیرماژول نامرتبط را با هم می‌فروخت). این دقیقاً همان مرزی است که
 * کاربر با کلیک روی آیتم منو تجربه می‌کند، پس برای «برو این بخش رو بخر» طبیعی‌ترین واحد فروش است.
 *
 * صفحات هسته‌ای/زیرساختی (داشبورد، کارتابل، پیام‌ها، تقویم، گزارش‌ها، کاربران، تنظیمات، پروفایل،
 * راهنما) عمداً بیرون از این فهرست‌اند — این‌ها بخشی از بدنه‌ی اصلی سامانه‌اند نه یک «امکان» جداگانه
 * که بشود فروخت/نفروخت، و قطع‌شان تجربه‌ی پایه را می‌شکند (مثلاً بدون کارتابل هیچ ماژول دیگری قابل‌استفاده نیست).
 *
 * پیش‌فرض: برای همه‌ی بیمارستان‌های موجود enabled=1 برای همه‌ی کلیدها (INSERT ... WHERE NOT EXISTS
 * به‌ازای هر جفت hospital×feature) — یعنی این تغییر کاملاً افزایشی است و هیچ رفتار فعلی را نمی‌شکند؛
 * غیرفعال‌سازی فقط از پنل سوپرادمین و برای بیمارستان‌های مشخص اتفاق می‌افتد.
 *
 * Run: idempotent است و روی هر boot / ساخت بیمارستان جدید امن اجرا می‌شود.
 */
const { db } = require('../src/config/database-sqlite');
const { uuid: genId } = require('../src/utils/db');

// فهرست کانونی کلیدهای «بخش» قابل‌فروش — دقیقاً هم‌راستا با کلید صفحه در public/js/app.js (go(p) / NAV_GROUPS)
const FEATURE_KEYS = [
  { key: 'measures',     label_fa: 'سنجه‌ها و ارزیابی' },
  { key: 'documents',    label_fa: 'مدارک کنترل‌شده، کتابخانه و نشان‌ها' },
  { key: 'checklists',   label_fa: 'بانک چک‌لیست‌ها' },
  { key: 'audits',       label_fa: 'حسابرسی داخلی' },
  { key: 'walkarounds',  label_fa: 'بازدید میدانی مدیریتی (واکراند)' },
  { key: 'errors',       label_fa: 'گزارش خطا و واقعه' },
  { key: 'fmea',         label_fa: 'عوامل تهدیدکننده ایمنی (FMEA)' },
  { key: 'satisfaction', label_fa: 'نظرسنجی رضایت بیمار' },
  { key: 'orgchart',     label_fa: 'نمودار سازمانی' },
  { key: 'committees',   label_fa: 'کمیته‌ها' },
  { key: 'programs',     label_fa: 'برنامه‌های بهبود' },
  { key: 'training',     label_fa: 'نیازسنجی آموزشی' },
  { key: 'bsc',          label_fa: 'کارت امتیازی متوازن (BSC)' },
  { key: 'orgstructure', label_fa: 'ساختار سازمانی' },
  { key: 'nursing',      label_fa: 'سلسله‌مراتب پرستاری' },
  { key: 'support',      label_fa: 'حوزه‌ی پشتیبانی' },
  { key: 'management',   label_fa: 'حوزه‌ی مدیریت' },
  { key: 'headnurse',    label_fa: 'داشبورد سرپرستار بخش' },
  { key: 'processes',    label_fa: 'فرآیندها و فلوچارت‌ها' },
  { key: 'activities',   label_fa: 'ثبت فعالیت‌ها' },
  { key: 'patient_followup', label_fa: 'پیگیری بیمار و مادر باردار' },
  { key: 'crm',          label_fa: 'مدیریت ارتباط با مراجعین (CRM)' },
  { key: 'safesurgery',   label_fa: 'جراحی ایمن' },
  { key: 'waste',        label_fa: 'مدیریت پسماند و بی‌خطرسازی' },
];
const FEATURE_KEY_SET = new Set(FEATURE_KEYS.map(f => f.key));

function ensureTable() {
  db.exec(`CREATE TABLE IF NOT EXISTS hospital_features (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(hospital_id, feature_key)
  )`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_hospital_features_hospital ON hospital_features(hospital_id)`);
}

// همه‌ی جفت‌های hospital×feature را با enabled=1 پر می‌کند اگر از قبل نبوده — idempotent،
// هم روی boot (برای بیمارستان‌های موجود) و هم بعد از ساخت بیمارستان جدید (seedForHospital) صدا زده می‌شود.
function seedForHospital(hospitalId) {
  const ins = db.prepare(`INSERT INTO hospital_features (id, hospital_id, feature_key, enabled)
    SELECT ?, ?, ?, 1 WHERE NOT EXISTS (
      SELECT 1 FROM hospital_features WHERE hospital_id = ? AND feature_key = ?
    )`);
  let added = 0;
  const tx = db.transaction(() => {
    for (const f of FEATURE_KEYS) {
      const r = ins.run(genId(), hospitalId, f.key, hospitalId, f.key);
      if (r.changes > 0) added++;
    }
  });
  tx();
  return added;
}

function runMigration() {
  console.log('[Seed Hospital Features] Starting...');
  try {
    ensureTable();
    const hospitals = db.prepare('SELECT id FROM hospitals').all();
    let total = 0;
    for (const h of hospitals) total += seedForHospital(h.id);
    console.log(`[Seed Hospital Features] ✅ hospital_features ready (${total} row(s) seeded across ${hospitals.length} hospital(s))`);
  } catch (err) {
    console.error('[Seed Hospital Features] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration, seedForHospital, FEATURE_KEYS, FEATURE_KEY_SET };

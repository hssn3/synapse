/**
 * داده‌ی نمونه‌ی شاخص‌ها — هدف و مقدارِ ماهانه
 *
 * چرا لازم شد: ۷۱ شاخصِ استاندارد seed می‌شدند ولی ۶۱ تای‌شان نه هدف داشتند نه
 * مقدار. یعنی داشبورد، نمودارِ مقایسه‌ای و گزارش هر سه خالی بالا می‌آمدند و
 * ماژول شاخص عملاً چیزی برای نشان‌دادن نداشت.
 *
 * این فایل داده‌ی *نمونه* می‌سازد، نه اندازه‌گیریِ واقعی. هر ردیف در source_note
 * علامت می‌خورد تا کسی آن را با داده‌ی واقعیِ بیمارستان اشتباه نگیرد و بشود بعداً
 * همه را یک‌جا پاک کرد.
 *
 * دو ویژگی که عمدی‌اند:
 *  • مولدِ شبه‌تصادفی از روی شناسه‌ی شاخص seed می‌شود، پس هر بار همان اعداد
 *    ساخته می‌شوند — ارائه‌ی امروز و ارائه‌ی هفته‌ی بعد یک نمودار نشان می‌دهند.
 *  • همه‌ی شاخص‌ها «بر هدف» نیستند. بخشی عقب‌اند و بخشی رو به افت، چون برگه‌ای
 *    که همه‌چیزش سبز است نه باورپذیر است و نه رنگ‌بندیِ وضعیت را نشان می‌دهد.
 */

const { db, query } = require('../src/config/database-sqlite');
const crypto = require('crypto');

// ---------- هدفِ پیش‌فرض بر پایه‌ی واحد و جهتِ مطلوبیت ----------
// اعداد از همان بازه‌ای‌اند که شاخص‌های هدف‌دارِ موجود در آن قرار دارند، تا
// شاخصِ تازه‌هدف‌گرفته کنارِ شاخصِ قدیمی ناجور نباشد.
const TARGETS = {
  'درصد|افزاینده': 90,
  'درصد|کاهنده': 2,
  'تعداد|افزاینده': 12,
  'تعداد|کاهنده': 2,
  'دقیقه|کاهنده': 30,
  'نسبت|افزاینده': 1.5,
  'در هزار|کاهنده': 2,
  'روز|کاهنده': 3,
  'ساعت|افزاینده': 20,
  'ساعت|کاهنده': 6,
};

function defaultTarget(unit, desirability) {
  return TARGETS[`${String(unit || '').trim()}|${String(desirability || '').trim()}`] ?? null;
}

// ---------- مولدِ شبه‌تصادفیِ قابلِ تکرار ----------
// mulberry32 روی هشِ شناسه‌ی شاخص: کوچک، بدون وابستگی، و برای داده‌ی نمایشی کافی.
function seededRandom(key) {
  let s = parseInt(crypto.createHash('md5').update(String(key)).digest('hex').slice(0, 8), 16);
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// گردکردن متناسب با واحد: «۳ بیمار و ۲۷ صدم» عددِ بی‌معنایی است.
function roundFor(unit, v) {
  const u = String(unit || '').trim();
  if (u === 'تعداد') return Math.max(0, Math.round(v));
  if (u === 'دقیقه') return Math.max(0, Math.round(v));
  if (u === 'نسبت') return Math.max(0, Math.round(v * 100) / 100);
  return Math.max(0, Math.round(v * 10) / 10);
}

// «درصد تحققِ هدف» ِ هر پروفایل — همان کسری که گزارش حساب می‌کند:
// افزاینده → مقدار/هدف، کاهنده → هدف/مقدار. سری از روی این نسبت ساخته می‌شود،
// نه برعکس، وگرنه کنترلی روی وضعیتِ نهایی نداریم.
//
// نسخه‌ی اول سری را «از فاصله‌ای تا هدف، به‌سمتِ هدف» می‌ساخت و چون هیچ‌وقت از
// هدف رد نمی‌شد، هر ۷۱ شاخص زیرِ ۱۰۰٪ درمی‌آمدند: صفر شاخصِ «بر هدف» روی برگه.
const PROFILE_RATIO = {
  on:     [1.02, 1.12],   // بر هدف و کمی جلوتر
  near:   [0.86, 0.97],   // نزدیک، ولی هنوز نرسیده
  behind: [0.58, 0.78],   // آشکارا عقب
};

/**
 * یک سریِ ماهانه می‌سازد که میانگینش به درصدِ تحققِ خواسته‌شده می‌رسد.
 *
 * توزیعِ پروفایل‌ها عمدی است: بیشترِ شاخص‌ها بر هدف یا نزدیک‌اند و اقلیتی عقب —
 * همان شکلی که یک بیمارستانِ فعال واقعاً دارد، و رنگ‌بندیِ وضعیت را هم نشان می‌دهد.
 */
function makeSeries(rnd, target, unit, higherIsBetter, profile, months) {
  const [lo, hi] = PROFILE_RATIO[profile];
  const endRatio = lo + rnd() * (hi - lo);
  // سالِ اول کمی بدتر از سالِ دوم، تا مقایسه‌ی سال‌به‌سال چیزی برای گفتن داشته باشد.
  const startRatio = endRatio * (0.88 + rnd() * 0.08);

  // نسبت → مقدار. برای شاخصِ کاهنده کسر وارونه است، پس مقدار هم وارونه درمی‌آید.
  const valueAt = r => (higherIsBetter ? target * r : target / Math.max(r, 0.05));
  const span = Math.max(Math.abs(target), 1);

  const out = [];
  for (let i = 0; i < months; i++) {
    const t = months === 1 ? 1 : i / (months - 1);
    const base = valueAt(startRatio + (endRatio - startRatio) * t);
    const noise = (rnd() - 0.5) * 0.09 * span;    // نوسانِ ماه‌به‌ماه
    // نوروز: فروردین در بیمارستان واقعاً با بقیه‌ی سال فرق دارد — همیشه به سمتِ بدتر.
    const nowruz = (i % 12 === 0) ? (higherIsBetter ? -1 : 1) * 0.05 * span : 0;
    out.push(roundFor(unit, base + noise + nowruz));
  }
  return out;
}

const SAMPLE_TAG = 'داده‌ی نمونه';

function ensureTargets() {
  const rows = query(
    `SELECT id, unit, desirability FROM hospital_kpis WHERE target_value IS NULL`).rows;
  let n = 0;
  for (const r of rows) {
    const t = defaultTarget(r.unit, r.desirability);
    if (t === null) continue;
    query('UPDATE hospital_kpis SET target_value = ? WHERE id = ?', [t, r.id]);
    n++;
  }
  return n;
}

function seedValues(years) {
  const kpis = query(
    `SELECT id, hospital_id, unit, higher_is_better, target_value
       FROM hospital_kpis
      WHERE is_active = 1 AND target_value IS NOT NULL`).rows;

  // مقدارهای موجود دست نمی‌خورند: اگر بیمارستان عددِ واقعی ثبت کرده، داده‌ی
  // نمونه نباید رویش بنویسد.
  const taken = new Set(
    query('SELECT kpi_id, jalali_year, jalali_month FROM bsc_monthly_values').rows
      .map(v => `${v.kpi_id}|${v.jalali_year}|${v.jalali_month}`));

  const months = years.length * 12;
  let inserted = 0;

  for (const k of kpis) {
    const rnd = seededRandom(k.id);
    // پروفایل از خودِ شناسه می‌آید تا ثابت بماند: ۵۵٪ بر هدف، ۳۰٪ نزدیک، ۱۵٪ عقب
    const p = rnd();
    const profile = p < 0.55 ? 'on' : p < 0.85 ? 'near' : 'behind';
    const series = makeSeries(rnd, k.target_value, k.unit,
      !(k.higher_is_better === 0), profile, months);

    let i = 0;
    for (const year of years) {
      for (let m = 1; m <= 12; m++, i++) {
        const key = `${k.id}|${year}|${m}`;
        if (taken.has(key)) continue;
        query(
          `INSERT INTO bsc_monthly_values
             (id, hospital_id, kpi_id, jalali_year, jalali_month, value, status, source_note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [crypto.randomUUID(), k.hospital_id, k.id, year, m, series[i],
            'ثبت‌شده', SAMPLE_TAG]);
        inserted++;
      }
    }
  }
  return { inserted, kpis: kpis.length };
}

function runMigration(opts = {}) {
  try {
    // دو سالِ کامل، چون خواسته‌ی کارفرما مقایسه‌ی سال‌به‌سال است (۱۴۰۴ و ۱۴۰۵).
    const years = opts.years || [1404, 1405];
    const t = ensureTargets();
    const s = seedValues(years);
    console.log(`[Seed Indicator Values] ✅ ${t} شاخص هدف گرفت، `
      + `${s.inserted} مقدار نمونه برای ${s.kpis} شاخص در سال‌های ${years.join(' و ')} ثبت شد`);
  } catch (err) {
    console.error('[Seed Indicator Values] failed:', err.message);
  }
}

// پاک‌کردنِ یک‌جای داده‌ی نمونه، وقتی بیمارستان بخواهد با داده‌ی واقعیِ خودش شروع کند.
function clearSample() {
  const r = query('DELETE FROM bsc_monthly_values WHERE source_note = ?', [SAMPLE_TAG]);
  const n = (r && r.rowCount) || 0;
  console.log(`[Seed Indicator Values] ${n} مقدار نمونه پاک شد`);
  return n;
}

module.exports = { runMigration, clearSample, SAMPLE_TAG };

if (require.main === module) {
  if (process.argv.includes('--clear')) clearSample();
  else runMigration();
}

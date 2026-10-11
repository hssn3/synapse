/* =====================================================================
   ضریب وزنی سطح سنجه
   ---------------------------------------------------------------------
   سنجه‌ها سه سطح دارند: سطح ۱ انتظار پایه و قابل تحقق، سطح ۲ تحقق متوسط،
   سطح ۳ فراتر از انتظار پایه. تا امروز این سطح فقط روی کارت سنجه نمایش
   داده می‌شد و در محاسبه‌ی درصد آمادگی هیچ اثری نداشت — تنها تمایز، ضریب
   ۲ سنجه‌های ایمنی بیمار بود.

   ضریب‌ها اینجا و در platform_settings ذخیره می‌شوند، نه در کد، چون
   ضرایب رسمی هر دوره را وزارت اعلام می‌کند و باید بدون دیپلوی عوض شوند.

   پیش‌فرض عمداً ۱/۱/۱ است، یعنی «دقیقاً همان رفتار امروز». اگر پیش‌فرض را
   عددی غیر از یک می‌گذاشتیم، درصد آمادگیِ همه‌ی بیمارستان‌ها یک‌شبه و بدون
   اینکه کسی تصمیمی گرفته باشد جابه‌جا می‌شد. سوپرادمین آگاهانه عوضش کند.
   ===================================================================== */
'use strict';

const { query } = require('../src/config/database');

const KEY = 'measure_level_weights';
const DEFAULT = { 1: 1, 2: 1, 3: 1 };

function read() {
  try {
    const row = query('SELECT value FROM platform_settings WHERE key = ?', [KEY]).rows[0];
    if (!row) return { ...DEFAULT };
    const v = JSON.parse(row.value);
    const out = {};
    for (const k of [1, 2, 3]) {
      const n = Number(v[k]);
      out[k] = (Number.isFinite(n) && n > 0 && n <= 5) ? n : DEFAULT[k];
    }
    return out;
  } catch (e) { return { ...DEFAULT }; }
}

function write(weights) {
  const out = {};
  for (const k of [1, 2, 3]) {
    const n = Number(weights && weights[k]);
    // بین ۰٫۱ و ۵ محدود می‌شود: ضریب صفر یعنی حذف بی‌صدای یک سطح از امتیاز،
    // و ضریب خیلی بزرگ یعنی یک سطح عملاً کل نمره را تعیین می‌کند.
    out[k] = (Number.isFinite(n) && n >= 0.1 && n <= 5) ? Math.round(n * 100) / 100 : DEFAULT[k];
  }
  const exists = query('SELECT key FROM platform_settings WHERE key = ?', [KEY]).rows[0];
  if (exists) query('UPDATE platform_settings SET value = ? WHERE key = ?', [JSON.stringify(out), KEY]);
  else query('INSERT INTO platform_settings (key, value) VALUES (?, ?)', [KEY, JSON.stringify(out)]);
  return out;
}

function runMigration() {
  try {
    const exists = query('SELECT key FROM platform_settings WHERE key = ?', [KEY]).rows[0];
    if (!exists) {
      query('INSERT INTO platform_settings (key, value) VALUES (?, ?)', [KEY, JSON.stringify(DEFAULT)]);
      console.log('[Seed ScoringWeights] ✅ ضریب سطح سنجه با پیش‌فرض ۱/۱/۱ ثبت شد');
    } else {
      console.log('[Seed ScoringWeights] ✅ ضریب سطح سنجه از قبل تنظیم شده است');
    }
  } catch (err) {
    console.error('[Seed ScoringWeights] failed:', err.message);
  }
}

module.exports = { runMigration, read, write, KEY, DEFAULT };
if (require.main === module) runMigration();

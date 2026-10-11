/**
 * Seed بسته C مرحله ۳: داده واقعی ناشناس برای ۷ جدول گمشده
 * چرا این سید ساخته شد: خوانش هر ۹۸ فایل md تمام شد؛ این آیتم‌ها مستند و واقعی‌اند:
 * آنتی‌دوت جنرال۷/ویژه (دسته 02/05)، ترالی اورژانس و۸ کشو۱-۵ + کیف نوزاد (دسته ۹۰/۹۱)،
 * ۱۰ شرح وظیفه بحران (66/67/68)، ۵ درس‌آموخته (بخشنامه‌های IFDA بدون نام بیمار)،
 * ۶ نکته بالینی، ۱۲ قلم استوک جراحی با نقطه سفارش (بخش 004). بدون نام/تلفن/کدملی
 * حقیقی (قانون ۹). EXP ترالی عمداً null است چون در md خالی بود (صداقت: فیلد خالی
 * یعنی «ثبت نشده»، نه جعل تاریخ). idempotent با چک وجود. همه hospital_id دارند.
 * Run: npm run seed-md-missing-data
 */
const crypto = require('crypto');
function store() { return require('../src/config/database-sqlite'); }
function uid() { return crypto.randomUUID ? crypto.randomUUID() : ('id-' + Date.now() + '-' + Math.floor(Math.random() * 1e9)); }

const ANTIDOTES = [
  ['استامینوفن', 'ان‌استیل‌سیستئین', 'جنرال'],
  ['بتابلوکر', 'گلوکاگون', 'جنرال'],
  ['هیپوگلیسمی', 'گلوکز ۲۰/۵۰٪', 'جنرال'],
  ['هپارین', 'پروتامین سولفات', 'جنرال'],
  ['ضدافسردگی سه‌حلقه‌ای', 'بی‌کربنات سدیم', 'جنرال'],
  ['پتاسیم بالا', 'گلوکونات کلسیم', 'جنرال'],
  ['منیزیم بالا', 'گلوکونات کلسیم', 'جنرال'],
  ['اپیوئید', 'نالوکسان', 'ویژه'],
  ['بنزودیازپین', 'فلومازنیل', 'ویژه'],
  ['وارفارین', 'ویتامین K', 'ویژه'],
  ['آتراکوریوم', 'نئوستیگمین', 'ویژه'],
  ['دیگوکسین', 'فنی‌توئین / لیدوکائین', 'ویژه ICU'],
  ['آتروپین (مسمومیت)', 'فیزوستیگمین', 'ویژه ICU'],
];
const CART = [
  ['ترالی اورژانس', 'کشو ۱ (حیاتی)', 'اپی‌نفرین', 5, null],
  ['ترالی اورژانس', 'کشو ۱ (حیاتی)', 'آتروپین', 5, null],
  ['ترالی اورژانس', 'کشو ۲ (حیاتی)', 'لیدوکائین', 5, null],
  ['ترالی اورژانس', 'کشو ۲ (حیاتی)', 'بی‌کربنات سدیم', 3, null],
  ['ترالی اورژانس', 'کشو ۳ (تجهیز)', 'پد الکلی', 10, null],
  ['ترالی اورژانس', 'کشو ۴ (تجهیز)', 'ست سرم', 5, null],
  ['ترالی اورژانس', 'کشو ۵ (کیف نوزاد)', 'لوله تراشه نوزادی', 2, null],
  ['ترالی اورژانس', 'کشو ۵ (کیف نوزاد)', 'ماسک نوزادی', 2, null],
];
const CRISIS = [
  ['فرمانده حادثه', 'فرماندهی کل', 'مدیرعامل', 'مدیر داخلی'],
  ['مدیر عملیات', 'اجرای عملیات میدانی', 'فرمانده حادثه', 'سوپروایزر ارشد'],
  ['مدیر برنامه‌ریزی', 'برنامه شیفت و منابع', 'فرمانده حادثه', 'مسئول شیفت'],
  ['مدیر مالی', 'هزینه و تدارکات', 'فرمانده حادثه', 'مدیر مالی'],
  ['مدیر مراقبت پزشکی', 'تریاژ و درمان', 'فرمانده حادثه', 'سرپرستار'],
  ['مسئول امنیت', 'امنیت و ترافیک', 'فرمانده حادثه', 'حراست'],
  ['مسئول تاسیسات', 'برق/آب/گاز', 'مدیر عملیات', 'تاسیسات'],
  ['بهداشت روان بحران', 'حمایت روانی', 'مدیر مراقبت پزشکی', 'روانشناس'],
  ['مسئول بستری', 'تخت و پذیرش', 'مدیر عملیات', 'پذیرش'],
  ['رابط آتش‌نشانی', 'اطفا و تخلیه', 'مدیر عملیات', 'ایمنی'],
];
const LESSONS = [
  ['متوترکسات به‌جای متوکاربامول', 'بخشنامه IFDA', 'دقت نسخه الکترونیک + مشاوره داروساز برای هشداربالا', 'دابل‌چک داروساز'],
  ['کاردکس اشتباه فنی‌توئین', 'گزارش خطا', 'کنترل داروساز روی کاردکس + آموزش دوز', 'بازبینی کاردکس روزانه'],
  ['ثبت اشتباه انسولین', 'گزارش خطا', 'تفکیک NPH/رگولار + خوانش دوم', 'لیبل‌گذاری جدا'],
  ['۷ اصل تجویز', 'پوستر ایمنی', 'بیمار/دارو/دوز/زمان/راه/ثبت/حق سوال', 'راند سوپروایزری'],
  ['داروهای مشابه (LASA)', 'لیست مشابه', 'Tall Man + لیبل قرمز + نگهداری جدا', 'بازبینی فصلی لیست'],
];
const NOTES = [
  ['پیشگیری ترومبوآمبولی', 'ارزیابی خطر + تحرک زودهنگام + پروفیلاکسی دارویی با دستور'],
  ['ناشتایی الکتیو سنی', 'شفاف ۲-۴h، شیرمادر ۴h، جامد ۶-۸h بر اساس سن'],
  ['احیای نوزاد', 'گرما + ساکشن + تهویه + فشردن قفسه + اپی‌نفرین'],
  ['عفونت ادراری بارداری', 'کشت + درمان + پیگیری؛ پرهیز خوددرمانی'],
  ['مهار فیزیکی', 'فقط با دستور کتبی؛ ۴ اندام ممنوع؛ پایش مستمر'],
  ['تریاژ اورژانس', 'سطوح ۱ تا ۵؛ سکته ۷۲۴/قلبی ۲۴۷ مسیر سریع'],
];
const STOCK = [
  ['ST-APO', 'آمپول استامینوفن (آپوتل)', 'دارو', 10, 5, null],
  ['ST-CEF', 'آمپول سفتریاکسون', 'دارو', 10, 5, null],
  ['ST-ENX', 'آمپول انوکساپارین', 'دارو', 10, 5, null],
  ['ST-NOR', 'آمپول نوراپی‌نفرین', 'دارو', 5, 3, null],
  ['ST-NPH', 'انسولین NPH', 'یخچالی', 2, 2, null],
  ['ST-SET', 'ست سرم', 'تجهیزات', 10, 5, null],
  ['ST-GAU', 'گاز استریل', 'تجهیزات', 20, 10, null],
  ['ST-GLV', 'دستکش وینیل', 'تجهیزات', 100, 20, null],
  ['ST-MSK', 'ماسک', 'تجهیزات', 50, 10, null],
  ['ST-ANG', 'آنژیوکت (صورتی/آبی/سبز)', 'تجهیزات', 10, 5, null],
  ['ST-FOL', 'سوند فولی', 'تجهیزات', 10, 5, null],
  ['ST-PAD', 'پد الکلی', 'تجهیزات', 20, 10, null],
];

function run() {
  const { query } = store();
  let hospitals = [];
  try { hospitals = query('SELECT id FROM hospitals WHERE is_active = 1').rows; } catch (e) { hospitals = []; }
  if (!hospitals.length) { console.log('[Seed MissingData] no hospitals. 0 rows.'); return { added: 0 }; }
  let added = 0;
  const ins = (sql, params, checkSql, checkParams) => {
    try {
      if (query(checkSql, checkParams).rows[0]) return;
      query(sql, params); added++;
    } catch (e) { /* non-fatal */ }
  };
  for (const h of hospitals) {
    const hid = h.id;
    for (const [p, a, n] of ANTIDOTES)
      ins('INSERT INTO antidotes (id, hospital_id, poisoning, antidote, note) VALUES (?,?,?,?,?)',
        [uid(), hid, p, a, n], 'SELECT 1 x FROM antidotes WHERE hospital_id=? AND poisoning=?', [hid, p]);
    for (const [loc, dr, name, q, exp] of CART)
      ins('INSERT INTO crash_cart_stock (id, hospital_id, cart_location, drawer, item_name, qty, exp_date) VALUES (?,?,?,?,?,?,?)',
        [uid(), hid, loc, dr, name, q, exp], 'SELECT 1 x FROM crash_cart_stock WHERE hospital_id=? AND cart_location=? AND drawer=? AND item_name=?', [hid, loc, dr, name]);
    for (const [t, s, r, c] of CRISIS)
      ins('INSERT INTO crisis_roles (id, hospital_id, title, duty_scope, report_to, contact_role) VALUES (?,?,?,?,?,?)',
        [uid(), hid, t, s, r, c], 'SELECT 1 x FROM crisis_roles WHERE hospital_id=? AND title=?', [hid, t]);
    for (const [t, s, l, a] of LESSONS)
      ins('INSERT INTO incident_learning (id, hospital_id, title, source, lesson, action) VALUES (?,?,?,?,?,?)',
        [uid(), hid, t, s, l, a], 'SELECT 1 x FROM incident_learning WHERE hospital_id=? AND title=?', [hid, t]);
    for (const [t, s] of NOTES)
      ins('INSERT INTO clinical_notes (id, hospital_id, topic, summary) VALUES (?,?,?,?)',
        [uid(), hid, t, s], 'SELECT 1 x FROM clinical_notes WHERE hospital_id=? AND topic=?', [hid, t]);
    for (const [code, name, cat, q, rp, exp] of STOCK)
      ins('INSERT INTO stock_items (id, hospital_id, item_code, item_name, category, qty, reorder_point, exp_date) VALUES (?,?,?,?,?,?,?,?)',
        [uid(), hid, code, name, cat, q, rp, exp], 'SELECT 1 x FROM stock_items WHERE hospital_id=? AND item_code=?', [hid, code]);
  }
  console.log('[Seed MissingData] ' + added + ' rows (idempotent).');
  return { added };
}
module.exports = { run, runMigration: run };

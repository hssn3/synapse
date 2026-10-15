/**
 * Migration: شناسه‌ی یکتای ارسالِ فرمِ سمتِ کلاینت (client_token) + ایندکس یکتای جزئی
 * ===========================================================================
 * چرا این فایل وجود دارد: آزمون tests/w5-session-and-duplicate.test.js با شاهدِ اجرایی
 * نشان داد دو POSTِ یکسان به /api/forms/monthly-program/submit هر دو ۲۰۱ می‌گیرند و
 * **دو رکورد** می‌سازند؛ حتی هدرِ Idempotency-Key هم هیچ‌جای کد خوانده نمی‌شد.
 * پیامدِ واقعی روی کاربر: دوبار کلیک روی «ثبت»، یا بازفرستِ خودکارِ درخواست (retry شبکه،
 * تبِ دوم، دکمه‌ی back مرورگر) بی‌صدا یک پاسخِ تکراری در برنامه‌ی ماهانه/چک‌لیست و بقیه‌ی
 * فرم‌ها می‌ساخت و آمار همان بخش دو بار شمرده می‌شد.
 *
 * چرا گارد در لایه‌ی داده و نه فقط سمت کلاینت: کلاینت چند-تب و چند-دستگاهی است و کنترلِ
 * سمتِ مرورگر (غیرفعال کردن دکمه) قابل اتکا نیست؛ تنها جایی که «دومی» واقعاً متوقف می‌شود
 * جایی است که رکورد نوشته می‌شود. قیدِ یکتایی همان‌جاست.
 *
 * چرا *جزئی* (WHERE client_token IS NOT NULL) و نه کامل:
 * اول اینکه قید دقیقاً به همان چیزی حاکم می‌شود که معنا دارد: در SQLite داخل یک ایندکس
 * یکتای ساده هم چند NULL با هم تضاد ندارند، پس ایندکسِ کامل هم رفتارِ کلاینتِ بی‌توکن را
 * نمی‌شکست — ولی «بی‌توکن‌ها از قید بیرون‌اند» را صریح نمی‌گفت و بازبین نمی‌توانست از
 * اسکیما بفهمد گارد opt-in است. دوم اینکه ~کل ردیف‌های موجود و هر ثبتِ آینده‌ی بدونِ توکن
 * از ایندکس بیرون می‌مانند، پس ایندکس کوچک و بی‌هزینه می‌ماند. رفتارِ دومیِ هر دو حالت با
 * شاهدِ اجرایی در گزارش W9 آمده (دو ردیفِ NULL پذیرفته، دو ردیفِ هم‌توکن رد).
 *
 * Idempotent: هر دو گام پیش از اجرا با PRAGMA table_info / sqlite_master بررسی می‌شوند؛
 * اجرای دوباره صفر تغییر می‌گذارد (شاهدِ اجرای دوباره در گزارش W9: خروجی PRAGMA قبل و
 * بعد از اجرای دوم یکی است). روی هر بوت از src/app.js صدا زده می‌شود و اگر جدول هنوز
 * ساخته نشده باشد (ترتیبِ بوت) بی‌خطر رد می‌شود.
 *
 * مسیر بازگشت (rollback):
 *   DROP INDEX IF EXISTS uq_form_submissions_client_token;
 * ستون client_token عمداً باقی می‌ماند و خطری ندارد: یک ستونِ TEXT بدون ایندکس، هیچ اثری
 * روی کوئری/قیدِ موجود ندارد و همه‌ی ردیف‌های قدیمی‌اش NULL است (SQLite هم DROP COLUMN را
 * فقط با محدودیت و نسخه‌های تازه پشتیبانی می‌کند). کدِ سرویس هم تا وقتی کلاینت توکن
 * نفرستد هیچ‌گاه به این ستون دست نمی‌زند.
 */
'use strict';

const { db } = require('../src/config/database-sqlite');

const TABLE = 'form_submissions';
const COLUMN = 'client_token';
// نامِ ایندکس عمداً صریح است: در متنِ خطای قیدِ SQLite همین نام می‌آید و سرویس برای
// تشخیصِ «مسابقه‌ی ارسالِ تکراری» به آن تکیه می‌کند (نه به پیامِ مبهم).
const INDEX_NAME = 'uq_form_submissions_client_token';

function tableExists(name) {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
}

function columnExists(table, column) {
  try {
    return db.prepare(`PRAGMA table_info(${table})`).all().some((r) => r.name === column);
  } catch (e) {
    return false;
  }
}

function indexExists(name) {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?").get(name);
}

function runMigration() {
  if (!tableExists(TABLE)) {
    console.log(`[Migrate FormClientToken] ⏭ جدول ${TABLE} هنوز ساخته نشده — رد شد`);
    return;
  }

  if (columnExists(TABLE, COLUMN)) {
    console.log(`[Migrate FormClientToken] ✅ ستون ${COLUMN} از قبل هست`);
  } else {
    db.exec(`ALTER TABLE ${TABLE} ADD COLUMN ${COLUMN} TEXT`);
    console.log(`[Migrate FormClientToken] ✅ ستون ${COLUMN} به ${TABLE} اضافه شد`);
  }

  if (indexExists(INDEX_NAME)) {
    console.log(`[Migrate FormClientToken] ✅ ایندکس ${INDEX_NAME} از قبل هست`);
  } else {
    db.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS ${INDEX_NAME}
         ON ${TABLE} (hospital_id, form_id, ${COLUMN})
       WHERE ${COLUMN} IS NOT NULL`
    );
    console.log(`[Migrate FormClientToken] ✅ ایندکس یکتای جزئی ${INDEX_NAME} ساخته شد`);
  }
}

module.exports = { runMigration };
if (require.main === module) runMigration();

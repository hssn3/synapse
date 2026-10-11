/**
 * بکاپ خودکار روزانه دیتابیس — بدون نیاز به یادآوری ادمین
 *
 * چرا setInterval به‌جای node-cron: هیچ وابستگی زمان‌بندی در package.json موجود نیست و این نیاز
 * آن‌قدر ساده است (یک بار در روز) که افزودن یک وابستگی جدید توجیه ندارد. بررسی هر ساعت با ساعت
 * دیواری کافی است و در ری‌استارت مکرر هم بیش از یک بکاپ در روز نمی‌سازد (فایل با تاریخ روز، idempotent).
 *
 * الگوی گرفتن بکاپ همان API رسمی better-sqlite3 (.backup) است که پنل سوپرادمین
 * (src/routes/super.js: makeBackup) استفاده می‌کند — نه کپی خام فایل، چون در WAL mode ممکن است
 * نوشته‌های در حال انجام هنوز flush نشده باشند.
 *
 * قرارداد ایمنی: این ماژول هرگز نباید اپلیکیشن را از کار بیندازد — هر مرز اجرا try/catch دارد و
 * تایمر unref می‌شود تا خروج تمیز فرایند را بلوکه نکند.
 */
const fs = require('fs');
const path = require('path');
const { db } = require('../config/database-sqlite');

// کنار خود فایل دیتابیس (src/config/paths.js) — تا اگر دیتابیس روی والیوم ماندگار
// باشد، بکاپ‌ها هم همان‌جا بیفتند و نه روی دیسک موقتِ کانتینر.
const { dbBackupsDir: backupsDir } = require('../config/paths');
// سیاست نگهداری: فقط آخرین بکاپ روی دیسک می‌ماند (هر بکاپ کامل ~۴۵ مگابایت است و انباشت آن
// چند صد مگابایت هدر می‌داد). اگر لازم شد نسخه‌های بیشتری بماند، AUTO_BACKUP_KEEP_COUNT را بدهید.
const KEEP_COUNT = Math.max(1, parseInt(process.env.AUTO_BACKUP_KEEP_COUNT, 10) || 1);
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // هر ساعت چک می‌کند، اما فقط یک‌بار در روز واقعاً بکاپ می‌گیرد

function todayTag() {
  const now = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${now.getUTCFullYear()}-${p(now.getUTCMonth() + 1)}-${p(now.getUTCDate())}`;
}

async function runDailyBackup() {
  try {
    fs.mkdirSync(backupsDir, { recursive: true });
    const destPath = path.join(backupsDir, `auto-${todayTag()}.db`);
    if (fs.existsSync(destPath)) return; // امروز قبلاً گرفته شده — idempotent روی ری‌استارت مکرر
    await db.backup(destPath);
    console.log(`[BackupCron] بکاپ خودکار روزانه ساخته شد: ${path.basename(destPath)}`);
    cleanupOldAutoBackups();
  } catch (err) {
    console.error('[BackupCron] بکاپ خودکار ناموفق (نادیده گرفته شد):', err.message);
  }
}

function cleanupOldAutoBackups() {
  try {
    // جدیدترین‌ها اول، بر اساس زمان تغییر فایل — فقط KEEP_COUNT نسخه‌ی اول می‌ماند
    const sorted = fs.readdirSync(backupsDir)
      .filter(f => f.startsWith('auto-') && f.endsWith('.db'))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(backupsDir, f)).mtime.getTime() }))
      .sort((a, b) => b.mtime - a.mtime);
    sorted.slice(KEEP_COUNT).forEach(({ name }) => {
      try {
        fs.unlinkSync(path.join(backupsDir, name));
        console.log(`[BackupCron] بکاپ خودکار قدیمی حذف شد: ${name}`);
      } catch (e) { /* یک فایل خراب نباید بقیه را متوقف کند */ }
    });
  } catch (err) {
    console.error('[BackupCron] پاک‌سازی بکاپ‌های قدیمی ناموفق (نادیده گرفته شد):', err.message);
  }
}

function startAutoBackup() {
  try {
    runDailyBackup(); // بررسی/ساخت فوری در لحظه‌ی بوت (اگر امروز هنوز گرفته نشده)
    const iv = setInterval(runDailyBackup, CHECK_INTERVAL_MS);
    if (iv.unref) iv.unref();
    console.log(`[BackupCron] زمان‌بند بکاپ خودکار فعال شد (نگهداری ${KEEP_COUNT} نسخه‌ی آخر)`);
    return iv;
  } catch (err) {
    console.error('[BackupCron] راه‌اندازی ناموفق (نادیده گرفته شد):', err.message);
    return null;
  }
}

module.exports = { startAutoBackup, runDailyBackup };

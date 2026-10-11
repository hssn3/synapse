/**
 * Database & Files Restore Script — SQLite version
 *
 * الزام بخش ۳.۲ PROJECT_SPEC.md: «بتوانم با آخرین بک‌آپ همه‌چیز را دقیقاً مثل قبل برگردانم»
 *
 * Usage:
 *   npm run restore-db                    # بازگردانی از آخرین بک‌آپ (طبق last-backup.json)
 *   npm run restore-db -- --file=db-2026-08-10.db.gz   # بازگردانی از یک فایل مشخص
 *
 * ⚠️ هشدار: این عملیات دیتابیس فعلی را جایگزین می‌کند. یک نسخه پشتیبان از وضعیت فعلی
 * قبل از بازگردانی به‌صورت خودکار گرفته می‌شود (safety-net) تا در صورت اشتباه قابل بازگشت باشد.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const config = require('../src/config/app');

const { dbPath } = require('../src/config/paths');
const uploadDir = config.upload.dir;
const backupDir = config.backup.dir;

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    const m = arg.match(/^--(\w+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  });
  return args;
}

function findLatestBackup() {
  const manifestPath = path.join(backupDir, 'last-backup.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('فایل last-backup.json یافت نشد. آیا حداقل یک بار backup-db اجرا شده؟');
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function confirm(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
}

async function run() {
  console.log('========================================');
  console.log('  Database & Files Restore (SQLite)');
  console.log('========================================');

  const args = parseArgs();
  let dbBackupName = args.file;
  let filesBackupName;

  if (!dbBackupName) {
    const manifest = findLatestBackup();
    dbBackupName = manifest.db_file;
    filesBackupName = manifest.files_backup;
    console.log(`[Restore] استفاده از آخرین بک‌آپ: ${dbBackupName} (تاریخ: ${manifest.timestamp})`);
  } else {
    // اگر فایل db مشخص شده، فایل uploads متناظر را حدس بزن (همان timestamp)
    const ts = dbBackupName.match(/db-(.+)\.db\.gz$/)?.[1];
    filesBackupName = ts ? `uploads-${ts}.tar.gz` : null;
  }

  const dbBackupPath = path.join(backupDir, dbBackupName);
  if (!fs.existsSync(dbBackupPath)) {
    console.error(`[Restore] ❌ فایل بک‌آپ یافت نشد: ${dbBackupPath}`);
    process.exit(1);
  }

  const proceed = args.yes === 'true' || await confirm(
    `⚠️  این عملیات دیتابیس فعلی (${dbPath}) را با محتوای بک‌آپ جایگزین می‌کند.\n` +
    `یک نسخه پشتیبان ایمنی از وضعیت فعلی قبل از این کار گرفته می‌شود.\n` +
    `برای ادامه "yes" را تایپ کنید: `
  );
  if (!proceed) {
    console.log('[Restore] لغو شد.');
    process.exit(0);
  }

  // Safety-net: بک‌آپ از وضعیت فعلی قبل از بازنویسی
  if (fs.existsSync(dbPath)) {
    const safetyPath = `${dbPath}.before-restore-${Date.now()}.bak`;
    fs.copyFileSync(dbPath, safetyPath);
    console.log(`[Restore] نسخه ایمنی از دیتابیس فعلی ذخیره شد: ${safetyPath}`);
  }

  // استخراج و جایگزینی دیتابیس
  const tmpExtractPath = dbPath + '.restoring';
  execSync(`gunzip -c "${dbBackupPath}" > "${tmpExtractPath}"`);
  fs.renameSync(tmpExtractPath, dbPath);
  // حذف فایل‌های WAL/SHM قدیمی که ممکن است با دیتابیس جدید ناسازگار باشند
  ['-wal', '-shm'].forEach((suffix) => {
    const f = dbPath + suffix;
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
  console.log('[Restore] ✅ دیتابیس بازگردانی شد.');

  // بازگردانی فایل‌های آپلودی
  if (filesBackupName) {
    const filesBackupPath = path.join(backupDir, filesBackupName);
    if (fs.existsSync(filesBackupPath)) {
      if (fs.existsSync(uploadDir)) {
        const safetyUploadDir = `${uploadDir}-before-restore-${Date.now()}`;
        fs.renameSync(uploadDir, safetyUploadDir);
        console.log(`[Restore] نسخه ایمنی از uploads فعلی: ${safetyUploadDir}`);
      }
      execSync(`tar -xzf "${filesBackupPath}" -C "${path.dirname(uploadDir)}"`);
      console.log('[Restore] ✅ فایل‌های آپلودی بازگردانی شدند.');
    } else {
      console.warn(`[Restore] ⚠️ فایل بک‌آپ uploads یافت نشد: ${filesBackupPath} — رد شد`);
    }
  }

  console.log('\n[Restore] بازگردانی کامل شد. سرور را ری‌استارت کنید: npm run dev یا npm start');
}

run().catch((err) => {
  console.error('\n[Restore] ❌ خطا:', err.message);
  process.exit(1);
});

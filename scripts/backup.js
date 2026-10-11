/**
 * Database & Files Backup Script — SQLite version
 *
 * چرا SQLite (نه pg_dump): پروژه فعلاً روی better-sqlite3 اجرا می‌شود (نه PostgreSQL)،
 * پس بک‌آپ باید مستقیم از فایل دیتابیس SQLite گرفته شود.
 * این پیاده‌سازی الزام بخش ۳.۲ PROJECT_SPEC.md را برآورده می‌کند:
 * «باید بتوان با آخرین بک‌آپ کل داده (دیتابیس + فایل‌های آپلودی) را دقیقاً مثل قبل بازگرداند»
 *
 * Schedule with cron: 0 2 * * * (daily at 2 AM)
 * Run manually: npm run backup-db
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const config = require('../src/config/app');

const { dbPath } = require('../src/config/paths');

function backupDatabase(timestamp, backupDir) {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`فایل دیتابیس یافت نشد: ${dbPath} — آیا migrate اجرا شده؟`);
  }
  const dbBackupFile = path.join(backupDir, `db-${timestamp}.db`);

  // استفاده از VACUUM INTO برای بک‌آپ سازگار حتی وقتی دیتابیس در حال استفاده است
  // (کپی مستقیم فایل هنگام نوشتن هم‌زمان می‌تواند ناقص باشد؛ VACUUM INTO این ریسک را ندارد)
  try {
    const Database = require('better-sqlite3');
    const db = new Database(dbPath, { readonly: true });
    db.exec(`VACUUM INTO '${dbBackupFile.replace(/'/g, "''")}'`);
    db.close();
  } catch (err) {
    // fallback: کپی مستقیم فایل (کافی برای اکثر موارد چون WAL mode فعال است)
    console.warn('[Backup] VACUUM INTO ناموفق بود، fallback به کپی مستقیم:', err.message);
    fs.copyFileSync(dbPath, dbBackupFile);
  }

  // فشرده‌سازی
  execSync(`gzip -f "${dbBackupFile}"`);
  console.log(`[Backup] Database backup complete: ${dbBackupFile}.gz`);
  return `${dbBackupFile}.gz`;
}

function backupUploads(timestamp, backupDir) {
  const uploadDir = config.upload.dir;
  if (!fs.existsSync(uploadDir)) {
    console.log('[Backup] پوشه uploads وجود ندارد، رد شد');
    return null;
  }
  const filesBackupFile = path.join(backupDir, `uploads-${timestamp}.tar.gz`);
  execSync(`tar -czf "${filesBackupFile}" -C "${path.dirname(uploadDir)}" "${path.basename(uploadDir)}"`);
  console.log(`[Backup] Uploads backup complete: ${filesBackupFile}`);
  return filesBackupFile;
}

function cleanupOldBackups(backupDir) {
  const cutoff = Date.now() - config.backup.retentionDays * 24 * 60 * 60 * 1000;
  fs.readdirSync(backupDir).forEach((file) => {
    if (file === 'last-backup.json') return;
    const filePath = path.join(backupDir, file);
    const stat = fs.statSync(filePath);
    if (stat.mtime.getTime() < cutoff) {
      fs.unlinkSync(filePath);
      console.log(`[Backup] Cleaned up old backup: ${file}`);
    }
  });
}

function run() {
  console.log('========================================');
  console.log('  Database & Files Backup (SQLite)');
  console.log('========================================');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = config.backup.dir;
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  try {
    const dbFile = backupDatabase(timestamp, backupDir);
    const filesFile = backupUploads(timestamp, backupDir);
    cleanupOldBackups(backupDir);

    const manifest = {
      timestamp: new Date().toISOString(),
      db_file: path.basename(dbFile),
      files_backup: filesFile ? path.basename(filesFile) : null,
      retention_days: config.backup.retentionDays,
    };
    fs.writeFileSync(path.join(backupDir, 'last-backup.json'), JSON.stringify(manifest, null, 2));

    console.log('\n[Backup] ✅ Backup completed successfully!');
  } catch (err) {
    console.error('\n[Backup] ❌ Backup failed:', err.message);
    process.exit(1);
  }
}

run();

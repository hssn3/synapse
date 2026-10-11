/**
 * بازگرداندنِ «عکسِ نمایشی» روی این ماشین
 * ---------------------------------------------------------------------------
 * سناریو: سایت بالا نیست و باید همین حالا روی لپ‌تاپ (یا یک ریلویِ دیگر) نمایش
 * داده شود. سه فرمان کافی است:
 *
 *     npm install
 *     npm run demo-restore
 *     npm start
 *
 * چند تصمیم که این را از یک «کپیِ فایل» جدا می‌کند:
 *
 *  • اگر از قبل دیتابیسی هست، *پیش از* جایگزینی از آن نسخه‌ی پشتیبان گرفته
 *    می‌شود (کنارِ خودش، با مهر زمان). یعنی این فرمان هیچ‌وقت داده‌ی کسی را
 *    بی‌بازگشت نمی‌برد. برای همین هم بدون --force اجرا نمی‌شود وقتی دیتابیس
 *    موجود داده‌ی واقعی دارد.
 *
 *  • فایل‌های جانبیِ WAL و SHM هم حذف می‌شوند. اگر بمانند، SQLite آن‌ها را روی
 *    دیتابیسِ تازه اعمال می‌کند و نتیجه یک فایل خراب است — این تنها اشتباهِ
 *    ساکتِ این کار است.
 *
 *  • باز و بسته کردنِ آزمایشی در پایان، تا اگر فایل خراب بود همین‌جا معلوم شود
 *    نه وسط نمایش.
 *
 * مسیر مقصد از src/config/paths.js می‌آید، پس DATA_DIR هم رعایت می‌شود (روی
 * ریلوی: DATA_DIR=/data).
 *
 * اجرا:  npm run demo-restore          (اگر دیتابیس نیست یا خالی است)
 *        npm run demo-restore -- --force   (جایگزینیِ دیتابیسِ دارای داده)
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const Database = require('better-sqlite3');
const { dbPath, dbDir, uploadDir, REPO_ROOT, ensureDir } = require('../src/config/paths');

const SNAP_DIR = path.join(REPO_ROOT, 'database', 'demo-snapshot');
const SNAP_GZ = path.join(SNAP_DIR, 'hospital-demo.db.gz');
const SNAP_UPLOADS = path.join(SNAP_DIR, 'uploads');
const MANIFEST = path.join(SNAP_DIR, 'manifest.json');
const force = process.argv.includes('--force');

// «داده‌ی واقعی» یعنی چه: وجود فایل کافی نیست، چون یک دیتابیسِ تازه‌ساختهٔ خالی
// هم فایل دارد. معیار، وجود بیمارستان است.
function hasRealData(file) {
  try {
    const db = new Database(file, { readonly: true });
    const row = db.prepare("SELECT COUNT(*) c FROM sqlite_master WHERE type='table' AND name='hospitals'").get();
    const n = row.c ? db.prepare('SELECT COUNT(*) c FROM hospitals').get().c : 0;
    db.close();
    return n > 0;
  } catch (e) {
    return false;
  }
}

function run() {
  console.log('========================================');
  console.log('  بازگرداندن عکس نمایشی بیمارستان نمونه');
  console.log('========================================');

  if (!fs.existsSync(SNAP_GZ)) {
    console.error(`❌ فایل عکس پیدا نشد: ${SNAP_GZ}`);
    console.error('   آیا مخزن کامل clone شده؟');
    process.exit(1);
  }
  if (fs.existsSync(MANIFEST)) {
    const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    console.log(`عکس ساخته‌شده در : ${m.createdAt}`);
    console.log(`مرکز             : ${(m.hospitals || []).map((h) => h.name).join('، ')}`);
    console.log(`نمونه‌ای از داده : ${Object.entries(m.counts || {}).slice(0, 6).map(([k, v]) => `${k}=${v}`).join(' ')}`);
  }
  console.log(`مقصد             : ${dbPath}`);

  ensureDir(dbDir);

  if (fs.existsSync(dbPath) && hasRealData(dbPath) && !force) {
    console.error('\n❌ دیتابیسِ فعلی داده دارد و بدون --force جایگزین نمی‌شود.');
    console.error('   اگر مطمئنید:  npm run demo-restore -- --force');
    console.error('   (به‌هرحال پیش از جایگزینی، پشتیبان گرفته می‌شود.)');
    process.exit(1);
  }

  // پشتیبانِ ایمنی از وضعیت فعلی
  if (fs.existsSync(dbPath)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safety = path.join(dbDir, `hospital.before-demo-restore.${stamp}.db`);
    fs.copyFileSync(dbPath, safety);
    console.log(`پشتیبانِ ایمنی   : ${safety}`);
  }

  // WAL/SHM باید بروند، وگرنه روی دیتابیسِ تازه اعمال می‌شوند و خرابش می‌کنند
  for (const ext of ['-wal', '-shm']) {
    const f = dbPath + ext;
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }

  fs.writeFileSync(dbPath, zlib.gunzipSync(fs.readFileSync(SNAP_GZ)));

  // فایل‌های آپلودی (لوگوی سربرگ و ضمیمه‌ها). فایلِ هم‌نامِ موجود بازنویسی
  // نمی‌شود: اگر کسی روی همین نصب لوگوی خودش را گذاشته، بازگردانیِ نمایش نباید
  // آن را پاک کند.
  let placed = 0; let kept = 0;
  if (fs.existsSync(SNAP_UPLOADS)) {
    ensureDir(uploadDir);
    for (const f of fs.readdirSync(SNAP_UPLOADS)) {
      const dest = path.join(uploadDir, f);
      if (fs.existsSync(dest)) { kept++; continue; }
      fs.copyFileSync(path.join(SNAP_UPLOADS, f), dest);
      placed++;
    }
  }

  // بازکردنِ آزمایشی: خرابی باید همین‌جا معلوم شود، نه وسط نمایش
  const db = new Database(dbPath, { readonly: true });
  const hospitals = db.prepare('SELECT name FROM hospitals').all().map((h) => h.name);
  const users = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  const measures = db.prepare('SELECT COUNT(*) c FROM measure_status').get().c;
  db.close();

  console.log('\n✅ بازگردانی انجام شد.');
  console.log(`   مرکز    : ${hospitals.join('، ')}`);
  console.log(`   کاربران : ${users}   سنجه‌های وضعیت‌دار: ${measures}`);
  console.log(`   آپلودها : ${placed} فایل کپی شد${kept ? `، ${kept} فایلِ هم‌نامِ موجود دست‌نخورده ماند` : ''}`);
  console.log('\n   حالا:  npm start   →   http://localhost:3000');
}

if (require.main === module) run();
module.exports = { run };

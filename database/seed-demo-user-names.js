/**
 * Migration: rename demo users' full_name to a neutral role+hospital-number pattern
 * (e.g. "خانم مدیر پرستاری بیمارستان شماره یک") instead of fabricated realistic Persian
 * names, per user request. Idempotent — matches by username, safe to run every boot.
 */
const Database = require('better-sqlite3');
// مسیر از src/config/paths.js — نه path.join(__dirname,'hospital.db').
// آن مسیر ثابت تا وقتی دیتابیس داخل پوشه‌ی پروژه بود درست کار می‌کرد، ولی با
// انتقال دیتابیس به والیوم (DATA_DIR) به یک فایل خالیِ جداگانه اشاره می‌کرد و
// نتیجه‌ی این مهاجرت بی‌صدا روی دیتابیس واقعی اعمال نمی‌شد.
const { dbPath } = require('../src/config/paths');

// نگاشت صریح هر کاربر دمو (بر اساس username) — تا از حدس زدن جنسیت اجتناب شود
const RENAME_MAP = {
  hospital2_admin: 'آقای مدیر',
  'n.zarei': 'خانم کارشناس شیر مادر',
  's.ahmadi': 'خانم سوپروایزر بالینی',
  'a.mohammadi': 'آقای سوپروایزر آموزشی',
  'm.hosseini': 'خانم سوپروایزر کنترل عفونت',
  'z.karimi': 'خانم مدیر پرستاری',
  'f.rezaei': 'خانم مدیر بهبود کیفیت',
  'm.rostami': 'خانم پرستار',
  'r.kazemi': 'آقای پرستار',
  admin: 'مدیر',
  'test.user1': 'پرستار',
};

function runMigration() {
  const db = new Database(dbPath);
  try {
    // شماره‌ی هر بیمارستان بر اساس ترتیب ایجاد (اولین = شماره یک)
    const hospitals = db.prepare('SELECT id FROM hospitals ORDER BY created_at ASC').all();
    const ordinalFa = ['یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه', 'ده'];
    const numByHospital = {};
    hospitals.forEach((h, i) => { numByHospital[h.id] = ordinalFa[i] || String(i + 1); });

    const users = db.prepare('SELECT id, username, full_name, hospital_id FROM users').all();
    const upd = db.prepare('UPDATE users SET full_name = ? WHERE id = ?');
    let renamed = 0;
    for (const u of users) {
      const base = RENAME_MAP[u.username];
      if (!base) continue; // فقط کاربران دمو شناخته‌شده، کاربران واقعی/تستی جدید دست‌نخورده می‌مانند
      const num = numByHospital[u.hospital_id] || '؟';
      const newName = `${base} بیمارستان شماره ${num}`;
      if (u.full_name !== newName) { upd.run(newName, u.id); renamed++; }
    }
    console.log(`[Seed Demo Names] ✅ ${renamed} demo user name(s) normalized`);
  } finally {
    db.close();
  }
}

if (require.main === module) runMigration();
module.exports = { runMigration };

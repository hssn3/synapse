/**
 * Migration: پروفایل بیمارستان (ویزارد ورود اول)
 *
 * سوپرادمین هنگام ساخت بیمارستان فقط نام/کاربر/رمز را می‌سازد؛ اطلاعات کلیدی
 * (نوع، تعداد تخت، استان/شهر، مسئولان، تماس) از خودِ بیمارستان گرفته می‌شود.
 * این جدول همان اطلاعات را نگه می‌دارد و پرچم completed تعیین می‌کند ویزارد
 * «راه‌اندازی اولیه» دیگر نمایش داده شود یا نه.
 *
 * توجه: completed فقط وقتی ۱ می‌شود که فیلدهای کلیدی (نوع، تخت، استان، شهر،
 * رئیس بیمارستان) پر باشند — منطق آن در PUT /api/hospital/profile است، نه اینجا.
 * Run: node database/seed-hospital-profile.js — idempotent است و روی هر boot امن اجرا می‌شود.
 */
const { db } = require('../src/config/database-sqlite');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS hospital_profiles (
    hospital_id          TEXT PRIMARY KEY REFERENCES hospitals(id) ON DELETE CASCADE,
    hospital_type        TEXT,
    beds_count           INTEGER,
    province             TEXT,
    city                 TEXT,
    ceo_name             TEXT,
    quality_manager_name TEXT,
    phone                TEXT,
    established_year     INTEGER,
    website              TEXT,
    completed            INTEGER NOT NULL DEFAULT 0,
    updated_at           TEXT DEFAULT (datetime('now'))
  )`,
];

function runMigration() {
  TABLES.forEach((sql) => db.exec(sql));
  const { c } = db.prepare('SELECT COUNT(*) c FROM hospital_profiles WHERE completed = 1').get();
  console.log(`[Seed Hospital-Profile] ✅ table ready; ${c} completed profile(s)`);
}

if (require.main === module) runMigration();
module.exports = { runMigration };

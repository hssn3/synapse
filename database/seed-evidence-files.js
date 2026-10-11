/**
 * Migration: پرونده‌ی الکترونیکی شواهد — `evidence_files`
 *
 * چرا این جدول ساخته شد؟
 *  تا پیش از این، «شواهد» یک سنجه فقط یک متن آزاد در ستون measure_status.notes بود و
 *  کاربر در آن «محل نگهداری» مدرک کاغذی را می‌نوشت (مثلاً «بایگانی دفتر بهبود کیفیت،
 *  زونکن کنترل عفونت»). یعنی خودِ مدرک بیرون از سامانه می‌ماند و سامانه فقط یک آدرس
 *  نگه می‌داشت. الزام جدید: مدرک باید در همین سامانه بارگذاری/ثبت شود، نه ارجاع به جای دیگر.
 *
 * چرا یک جدول عمومی (entity_type + entity_id) و نه یک جدول به‌ازای هر ماژول؟
 *  همین الگو در سنجه، حسابرسی داخلی و مصوبه‌ی واکراند تکرار می‌شود. جدول‌های موازی یعنی
 *  سه مسیر آپلود موازی. اینجا فقط یک مسیر (storeUploadedFile/sendStoredFile مشترک در
 *  src/routes/api.js) و یک جدول داریم و ماژول بعدی فقط یک entity_type اضافه می‌کند.
 *
 * چرا hospital_id روی خود ردیف تکرار شده؟
 *  تا فیلترِ چنداجاره‌ای در همان WHERE اصلی انجام شود و دسترسی به فایل بیمارستان دیگر
 *  حتی با دانستن id فایل ممکن نباشد (بدون JOIN اضافه به جدول والد).
 *
 * Run: npm run seed-evidence-files — idempotent است و روی هر boot امن اجرا می‌شود.
 */
const { db } = require('../src/config/database-sqlite');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS evidence_files (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,       -- measure | audit | walkaround_resolution
    entity_id TEXT NOT NULL,         -- شناسه‌ی رکورد والد (سنجه/حسابرسی/مصوبه)
    file_path TEXT NOT NULL,         -- نام فایل ذخیره‌شده روی دیسک (uuid.webp | uuid.pdf)
    file_name TEXT,                  -- نام اصلی فایل هنگام آپلود، برای دانلود
    file_size_bytes INTEGER,
    title TEXT,                      -- «این فایل چه چیزی را نشان می‌دهد» (نه محل نگهداری)
    uploaded_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_evfiles_entity ON evidence_files(hospital_id, entity_type, entity_id)`,
];

function runMigration() {
  console.log('[Seed EvidenceFiles] Starting...');
  try {
    for (const sql of TABLES) db.exec(sql);
    console.log('[Seed EvidenceFiles] ✅ evidence_files ready');
  } catch (err) {
    console.error('[Seed EvidenceFiles] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };

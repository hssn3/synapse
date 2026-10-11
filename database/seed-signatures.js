// ============ مهاجرت: امضای الکترونیکی ============
// نمونه‌ی تصویری امضا، یا برای یک کاربر مشخص یا به‌عنوان «نمونه‌ی فعال بیمارستان».
// فایل تصویر مثل بقیه‌ی آپلودهای سامانه بیرون از public نگهداری می‌شود (uploads/) و فقط
// از مسیر احراز هویت‌شده سرو می‌شود؛ ستون file_name نام ذخیره‌شده (uuid.webp) است.
const { db } = require('../src/config/database-sqlite');

function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!cols.includes(column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`).run();
    console.log(`[Seed Signatures] ✅ ستون ${column} به ${table} اضافه شد`);
  }
}

function runMigration() {
  db.prepare(`CREATE TABLE IF NOT EXISTS electronic_signatures (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL,
    user_id TEXT,
    label TEXT,
    file_name TEXT NOT NULL,
    is_active INTEGER DEFAULT 0,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`).run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_esig_hospital ON electronic_signatures(hospital_id)').run();

  // تصویر امضای به‌کاررفته در لحظه‌ی امضای هر ردیف — اسنپ‌شات، نه ارجاع؛ حذف نمونه‌ی امضا
  // نباید امضای ثبت‌شده‌ی روی یک سند را از بین ببرد.
  ensureColumn('document_signoffs', 'signature_image', 'TEXT');

  console.log('[Seed Signatures] ✅ جدول electronic_signatures آماده است');
}

module.exports = { runMigration };

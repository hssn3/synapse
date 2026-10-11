/**
 * Migration: rename the display label of the base `admin` role (code stays `admin`,
 * permissions unchanged) from "ادمین سیستم" to "مدیر داخلی" — disambiguates the
 * hospital's data-entry admin from the "ریاست بیمارستان" leadership label (see
 * seed-management-hierarchy.js DEFAULT_LABELS / commit 577ec75).
 *
 * ROLE_DEFINITIONS in migrate-sqlite.js only seeds roles on a fresh database
 * (INSERT on first boot), so it never touches rows that already exist. This
 * migration explicitly UPDATEs the already-seeded row so the rename takes effect
 * on the live/current database too. Idempotent — safe to run on every boot.
 */
const Database = require('better-sqlite3');
// مسیر از src/config/paths.js — نه path.join(__dirname,'hospital.db').
// آن مسیر ثابت تا وقتی دیتابیس داخل پوشه‌ی پروژه بود درست کار می‌کرد، ولی با
// انتقال دیتابیس به والیوم (DATA_DIR) به یک فایل خالیِ جداگانه اشاره می‌کرد و
// نتیجه‌ی این مهاجرت بی‌صدا روی دیتابیس واقعی اعمال نمی‌شد.
const { dbPath } = require('../src/config/paths');

const OLD_LABEL = 'ادمین سیستم';
const NEW_LABEL = 'مدیر داخلی';

function runMigration() {
  const db = new Database(dbPath);
  try {
    const info = db.prepare(
      "UPDATE roles SET title_fa = ? WHERE code = 'admin' AND hospital_id IS NULL AND title_fa = ?"
    ).run(NEW_LABEL, OLD_LABEL);
    console.log(`[Seed AdminRoleRename] ✅ ${info.changes} role row(s) renamed to "${NEW_LABEL}"`);
  } finally {
    db.close();
  }
}

if (require.main === module) runMigration();
module.exports = { runMigration };

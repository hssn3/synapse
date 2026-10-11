/**
 * Migration: grant manage_roles to admin (needed for the custom-role builder + hospital
 * self-service role management). Idempotent — safe to run on every boot.
 */
const Database = require('better-sqlite3');
// مسیر از src/config/paths.js — نه path.join(__dirname,'hospital.db').
// آن مسیر ثابت تا وقتی دیتابیس داخل پوشه‌ی پروژه بود درست کار می‌کرد، ولی با
// انتقال دیتابیس به والیوم (DATA_DIR) به یک فایل خالیِ جداگانه اشاره می‌کرد و
// نتیجه‌ی این مهاجرت بی‌صدا روی دیتابیس واقعی اعمال نمی‌شد.
const { dbPath } = require('../src/config/paths');

function runMigration() {
  const db = new Database(dbPath);
  try {
    const rows = db.prepare("SELECT id, code, permissions FROM roles WHERE code IN ('admin','quality_control_manager')").all();
    let granted = 0;
    const upd = db.prepare('UPDATE roles SET permissions = ? WHERE id = ?');
    for (const r of rows) {
      const perms = typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || []);
      if (!perms.includes('manage_roles')) {
        perms.push('manage_roles');
        upd.run(JSON.stringify(perms), r.id);
        granted++;
      }
    }
    console.log(`[Seed Role-Mgmt] ✅ ${granted} role(s) granted manage_roles`);
  } finally {
    db.close();
  }
}

if (require.main === module) runMigration();
module.exports = { runMigration };

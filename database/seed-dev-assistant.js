/* =====================================================================
   دستیارِ توسعه‌ی سوپرادمین
   ---------------------------------------------------------------------
   کارفرما: می‌خواهد یک AI جدا (با کلید AvalAI خودش) در پنل سوپرادمین
   وصل کند تا خودِ پروژه را از داخل سایت توسعه بدهند — جدا از «دانا»یی که
   کاربرانِ بیمارستان می‌بینند.

   دو جدول:
     - superadmin_dev_settings: یک ردیفِ ثابت (id='default') — تنظیمِ AI
       دقیقاً هم‌شکلِ assistant_hospital_settings است تا از همان
       ai-provider.js استفاده کند، به‌علاوه‌ی تنظیمِ گیت‌هاب (owner/repo/
       branch/token) چون تنها راهِ ماندگارشدنِ تغییرِ کد همین است — فایل‌سیستمِ
       ریلوی موقت است، هر ادیتِ مستقیم روی دیسک با اولین ریدیپلوی می‌پرد.
     - dev_assistant_messages: تاریخچه‌ی گفت‌وگو، به سوپرادمین صاحبش
       محدود (هر سوپرادمین گفت‌وگوی خودش را می‌بیند، مثل بقیه‌ی چیزهای
       شخصی‌شده‌ی این پروژه).
   ===================================================================== */
const { query } = require('../src/config/database-sqlite');

function runMigration() {
  query(`CREATE TABLE IF NOT EXISTS superadmin_dev_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    provider TEXT DEFAULT 'avalai',
    model TEXT,
    api_key TEXT,
    base_url TEXT,
    monthly_token_budget INTEGER NOT NULL DEFAULT 500000,
    tokens_used_this_period INTEGER NOT NULL DEFAULT 0,
    period_start TEXT DEFAULT (date('now','start of month')),
    github_token TEXT,
    github_owner TEXT,
    github_repo TEXT,
    github_default_branch TEXT DEFAULT 'main',
    github_api_base TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  )`);
  query(`INSERT OR IGNORE INTO superadmin_dev_settings (id) VALUES ('default')`);

  query(`CREATE TABLE IF NOT EXISTS dev_assistant_messages (
    id TEXT PRIMARY KEY,
    super_admin_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  query(`CREATE INDEX IF NOT EXISTS idx_dev_msg_admin ON dev_assistant_messages(super_admin_id, created_at)`);
}

module.exports = { runMigration };
if (require.main === module) runMigration();

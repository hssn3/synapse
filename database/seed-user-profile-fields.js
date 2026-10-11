/**
 * Migration: فیلدهای اختیاری پروفایل شخصی کاربر — جنسیت، عکس پروفایل، بیو، نحوه‌ی تماس ترجیحی.
 *
 * هر کاربر فقط پروفایل خودش را ویرایش می‌کند (PUT /profile/me، POST /profile/avatar در api.js) —
 * برخلاف management_position_slots این‌ها اطلاعات شخصی‌اند نه سمت سازمانی، پس مالکیت‌شان با خودِ
 * فرد است نه ادمین بیمارستان یا سوپرادمین.
 *
 * سوییچ سراسری profile_fields_enabled (platform_settings، پیش‌فرض روشن) به سوپرادمین اجازه
 * می‌دهد این بخش را از صفحه‌ی «پروفایل من» همه‌ی بیمارستان‌ها مخفی/آشکار کند — هم‌شکل با سوییچ
 * require_password موجود (seed-platform-settings.js).
 *
 * عکس پروفایل مثل بقیه‌ی آپلودهای سامانه (امضا/شواهد) بیرون از public نگهداری می‌شود و فقط از
 * مسیر احراز هویت‌شده سرو می‌شود؛ ستون avatar_file نام ذخیره‌شده (uuid.webp) است، نه مسیر کامل.
 *
 * Run: idempotent است و روی هر boot امن اجرا می‌شود.
 */
const { db } = require('../src/config/database-sqlite');

function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!cols.includes(column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`).run();
    console.log(`[Seed UserProfileFields] ✅ ستون ${column} به ${table} اضافه شد`);
  }
}

function runMigration() {
  console.log('[Seed UserProfileFields] Starting...');
  try {
    ensureColumn('users', 'gender', 'TEXT');
    ensureColumn('users', 'title_prefix', 'TEXT');
    ensureColumn('users', 'avatar_file', 'TEXT');
    ensureColumn('users', 'bio', 'TEXT');
    ensureColumn('users', 'contact_method', 'TEXT');

    db.exec(`CREATE TABLE IF NOT EXISTS platform_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);
    const row = db.prepare('SELECT value FROM platform_settings WHERE key = ?').get('profile_fields_enabled');
    if (!row) {
      db.prepare('INSERT INTO platform_settings (key, value) VALUES (?, ?)').run('profile_fields_enabled', '1');
    }

    // انتساب خودکار پیشوند احترامی و جنسیت برای کاربران موجود
    const users = db.prepare('SELECT id, full_name, username, gender, title_prefix FROM users').all();
    const updUser = db.prepare('UPDATE users SET title_prefix = COALESCE(?, title_prefix), gender = COALESCE(?, gender) WHERE id = ?');
    for (const u of users) {
      let pfx = u.title_prefix;
      let g = u.gender;
      const fn = u.full_name || '';
      if (!pfx) {
        if (fn.startsWith('خانم ')) { pfx = 'خانم'; g = g || 'female'; }
        else if (fn.startsWith('سرکار خانم ')) { pfx = 'سرکار خانم'; g = g || 'female'; }
        else if (fn.startsWith('آقای ')) { pfx = 'آقای'; g = g || 'male'; }
        else if (fn.startsWith('جناب آقای ')) { pfx = 'جناب آقای'; g = g || 'male'; }
        else if (fn.startsWith('دکتر ')) { pfx = 'دکتر'; }
        else if (fn.startsWith('مهندس ')) { pfx = 'مهندس'; }
      }
      if (pfx || g) {
        updUser.run(pfx, g, u.id);
      }
    }

    // به‌روزرسانی کاربران پیش‌فرض مرکز ۳ با اسامی شکیل و پیشوند (اگر نام عمومی دارند)
    db.prepare("UPDATE users SET title_prefix = 'خانم', gender = 'female', full_name = 'زهرا رضایی' WHERE username = 'hosp3_nursing_dir' AND full_name LIKE '%مرکز%'").run();
    db.prepare("UPDATE users SET title_prefix = 'آقای', gender = 'male', full_name = 'حسین حسنی' WHERE username = 'hosp3_admin' AND full_name LIKE '%مرکز%'").run();
    db.prepare("UPDATE users SET title_prefix = 'دکتر', gender = 'male', full_name = 'امیر رضایی' WHERE username = 'hosp3_president' AND full_name LIKE '%مرکز%'").run();
    db.prepare("UPDATE users SET title_prefix = 'خانم', gender = 'female', full_name = 'مریم قاسمی' WHERE username = 'hosp3_accreditation' AND full_name LIKE '%مرکز%'").run();
    db.prepare("UPDATE users SET title_prefix = 'مهندس', gender = 'male', full_name = 'کیوان صادقی' WHERE username = 'hosp3_technical' AND full_name LIKE '%مرکز%'").run();

    console.log('[Seed UserProfileFields] ✅ فیلدهای پروفایل شخصی آماده‌اند');
  } catch (err) {
    console.error('[Seed UserProfileFields] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };

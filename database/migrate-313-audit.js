/**
 * migrate-313-audit.js — سیم‌کشی مهاجرت‌های بازبینی 313 در بوت
 * ---------------------------------------------------------------------------
 * چرا یک فایل جدا: شش اسکریپت زیر هنگام require اجرا می‌شوند (idempotent) و
 * هم از CLI (node database/xxx.js) و هم از بوت باید کار کنند. این ماژول همان
 * قرارداد runMigration پروژه را صادر می‌کند تا src/app.js مثل بقیه صدایش بزند.
 *
 * ترتیب مهم است:
 *   ۱) جدول‌های ابلاغیه (v1 → v2 → v3: ستون‌ها تکمیل می‌شوند)
 *   ۲) یکسان‌سازی نقش‌های تکراری (پیش‌نیاز: جدول roles از سیدهای هسته)
 *   ۳) ACL فرم‌ها (پیش‌نیاز: forms + roles)
 *   ۴) زنجیره‌ی سرپرستی (پیش‌نیاز: users)
 */
function runMigration() {
  require('./migrate-directives.js');
  require('./migrate-directives-v2.js');
  require('./migrate-directives-v3.js');
  require('./migrate-dedupe-roles.js');
  require('./seed-form-permissions.js');
  require('./build-org-chain.js');
}

module.exports = { runMigration };

if (require.main === module) runMigration();

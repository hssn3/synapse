/**
 * Migration: پاک‌سازی رکوردهای آزمایشیِ «متنِ فارسیِ نابودشده» (رشته‌های `????`)
 *
 * ⚠️ درس‌آموخته (لسون‌لرند) — علت ریشه‌ای:
 *   PowerShell / Git-Bash روی ویندوز، متن فارسی را وقتی به‌صورت **آرگومان خط فرمان**
 *   پاس داده شود از code page سیستم (cp1252) رد می‌کند و هر کاراکتر غیرقابل‌نگاشت را
 *   بی‌صدا به `?` (U+003F) تبدیل می‌کند. در جلسه‌ی توسعه، چند تست دستی با
 *   `curl -d '{"description":"تست ..."}'` از همین پوسته‌ها زده شد؛ نتیجه‌اش رکوردهایی
 *   شد که در دیتابیس واقعاً `????` ذخیره شده‌اند (charCode 63) — نه مشکل فونت،
 *   نه mojibake، نه U+FFFD. متن اصلی در هیچ جا باقی نمانده و **قابل بازیابی نیست**.
 *
 * تصمیم: این ردیف‌ها داده‌ی دموی عمدی نیستند (هیچ seed‌ای آن‌ها را نمی‌سازد؛
 *   ساخته‌شده با تست‌های ad-hoc از API). پس **حذف** می‌شوند، نه «بازنویسی» —
 *   متن فارسیِ جعلی جای داده‌ی از‌دست‌رفته گذاشته نمی‌شود.
 *
 * پیشگیری: هرگز متن فارسی را داخل آرگومان دستور پوسته (curl -d '...'، sqlite3 "..."،
 *   node -e "...") ننویس. به‌جایش بدنه‌ی JSON را در یک فایل بنویس
 *   (`curl -d @fixture.json`) یا اسکریپت `.js` با Edit/Write بساز — این ابزارها
 *   UTF-8 را درست می‌نویسند.
 *
 * idempotent است: اجرای دوباره صفر تغییر می‌دهد.
 * Run: node database/seed-cleanup-mangled-text.js
 */
const { db } = require('../src/config/database-sqlite');

// جدول → ستون‌های متنیِ کاربر-نوشته که اگر «???» داشته باشند یعنی رکورد خراب است.
// عمداً محدود و صریح است تا حذفِ ناخواسته رخ ندهد.
const TARGETS = {
  medical_error_reports: ['description', 'rca_text', 'error_ward', 'department', 'severity', 'error_category'],
  patient_complaints_suggestions: ['content', 'response'],
  internal_messages: ['subject', 'body'],
  user_shortcuts: ['label'],
};

// در LIKE سه علامت سؤالِ پشت‌سرهم، کاراکتر معمولی‌اند (wildcard نیستند)،
// پس این الگو دقیقاً «۳ تا ? پشت سر هم» را می‌گیرد.
const RUN = '%???%';

function tableExists(t) {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(t);
}

function runMigration() {
  console.log('[Seed CleanupMangledText] Starting...');
  try {
    let total = 0;
    const tx = db.transaction(() => {
      for (const [table, cols] of Object.entries(TARGETS)) {
        if (!tableExists(table)) continue;
        const present = db.prepare(`PRAGMA table_info(${table})`).all().map(r => r.name);
        const usable = cols.filter(c => present.includes(c));
        if (!usable.length) continue;
        const where = usable.map(c => `${c} LIKE ?`).join(' OR ');
        const params = usable.map(() => RUN);
        const n = db.prepare(`DELETE FROM ${table} WHERE ${where}`).run(...params).changes;
        if (n) { console.log(`[Seed CleanupMangledText] - ${table}: ${n} corrupted row(s) removed`); total += n; }
      }
    });
    tx();
    console.log(`[Seed CleanupMangledText] ✅ ${total} mangled row(s) removed`);
  } catch (err) {
    console.error('[Seed CleanupMangledText] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };

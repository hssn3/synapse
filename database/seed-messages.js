/**
 * Migration: پیام‌های داخلی (internal_messages) + میانبرهای شخصی (user_shortcuts)
 *
 * پیام داخلی عمداً «ایمیل» نیست: نه رونوشت دارد، نه پیوست، نه پوشه‌بندی دلخواه.
 * فقط سه صندوق (دریافتی/ارسالی/پیش‌نویس) و یک قلاب به جلسه‌ی کمیته، تا الگوی
 * «دعوت‌نامه‌ی جلسه» بدون ساختن ماژول دعوت‌نامه‌ی جدا کار کند.
 *
 * ایزولاسیون چندمستأجری: hospital_id روی خود ردیف نگه داشته می‌شود (مثل بقیه‌ی
 * ماژول‌ها) تا هر کوئری خواندن با hospital_id فیلتر شود؛ اعتبارسنجی «گیرنده کاربرِ
 * فعالِ همین بیمارستان است» در لایه‌ی route انجام می‌شود.
 *
 * پیش‌نویس (is_draft=1) ردیفی است که recipient_id می‌تواند NULL باشد — کاربر هنوز
 * گیرنده را انتخاب نکرده. با ارسال، is_draft=0 و recipient_id الزامی می‌شود.
 *
 * Run: node database/seed-messages.js — idempotent است و روی هر boot امن اجرا می‌شود.
 */
const { db } = require('../src/config/database-sqlite');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS internal_messages (
    id                      TEXT PRIMARY KEY,
    hospital_id             TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    sender_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id            TEXT REFERENCES users(id) ON DELETE CASCADE,
    subject                 TEXT NOT NULL,
    body                    TEXT,
    category                TEXT NOT NULL DEFAULT 'general',
    is_read                 INTEGER NOT NULL DEFAULT 0,
    is_draft                INTEGER NOT NULL DEFAULT 0,
    related_meeting_event_id TEXT REFERENCES calendar_events(id) ON DELETE SET NULL,
    read_at                 TEXT,
    sent_at                 TEXT,
    created_at              TEXT DEFAULT (datetime('now'))
  )`,
  // صندوق دریافتی: پرتکرارترین کوئری — (بیمارستان، گیرنده، پیش‌نویس‌نبودن)
  `CREATE INDEX IF NOT EXISTS idx_msg_inbox ON internal_messages(hospital_id, recipient_id, is_draft, is_read)`,
  `CREATE INDEX IF NOT EXISTS idx_msg_sent  ON internal_messages(hospital_id, sender_id, is_draft)`,

  /**
   * میانبرهای شخصی: کاربر صفحه‌های پرکاربردش را سنجاق می‌کند.
   * target_page همان کلید ناوبری SPA است (dash/inbox/messages/...) — در سرور
   * فقط طول و یکتایی کنترل می‌شود؛ اعتبارِ «این صفحه برای این نقش قابل دیدن است»
   * همان‌جایی اعمال می‌شود که برای خودِ منو اعمال می‌شود (فرانت‌اند از فهرست
   * صفحه‌های مجاز خودش انتخاب می‌دهد و کلیک روی صفحه‌ی غیرمجاز به هر حال ۴۰۳ می‌گیرد).
   */
  `CREATE TABLE IF NOT EXISTS user_shortcuts (
    id          TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_page TEXT NOT NULL,
    label       TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  )`,
  // یک صفحه دوبار سنجاق نشود (UNIQUE در سطح دیتابیس، نه فقط در UI)
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_shortcut_uniq ON user_shortcuts(user_id, target_page)`,
  `CREATE INDEX IF NOT EXISTS idx_shortcut_user ON user_shortcuts(hospital_id, user_id, sort_order)`,
];

function runMigration() {
  console.log('[Seed Messages] Starting...');
  try {
    for (const sql of TABLES) db.exec(sql);
    const { m } = db.prepare('SELECT COUNT(*) m FROM internal_messages').get();
    const { s } = db.prepare('SELECT COUNT(*) s FROM user_shortcuts').get();
    console.log(`[Seed Messages] ✅ internal_messages (${m}) + user_shortcuts (${s}) ready`);
  } catch (err) {
    console.error('[Seed Messages] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };

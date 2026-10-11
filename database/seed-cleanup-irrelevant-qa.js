/**
 * Migration: پاک‌سازی سؤالات نامربوط، ساختگی و داده‌های تستیِ دستیار از بانک دانش (assistant_knowledge)
 *
 * چرا این فایل ساخته شد:
 * در جلسات توسعه و تست دستی و خودکارِ دستیار هوشمند دانا، پرسش‌های نامربوط عمومی
 * (مثل «پایتخت فرانسه کجاست؟»، «پایتخت لهستان چیست؟»، پرسش‌های ناقص مثل «چرا؟»،
 * و پاسخ‌های تستِ بدلی «پاسخِ بدل — این متن از سرویس بیرونی نیامده...») به‌صورت پیش‌نویس
 * (draft) در جدول assistant_knowledge ذخیره شده بودند که هیچ ارتباطی به حوزه‌ی تخصصی
 * اعتباربخشی، کیفیت و مدیریت بیمارستان نداشتند.
 *
 * این اسکریپت رکوردهای نامربوط و تستی را حذف کرده و تنها ۳۳ سند بالینی و راهنمای معتبر
 * اعتباربخشی را در بانک دانش نگه می‌دارد.
 *
 * کاملاً idempotent است: اجرای دوباره تغییری نمی‌دهد.
 * اجرا: node database/seed-cleanup-irrelevant-qa.js
 */
const { db } = require('../src/config/database-sqlite');

function cleanDatabase(dbInstance, label = 'hospital.db') {
  const hasKnowledge = !!dbInstance.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='assistant_knowledge'").get();
  if (!hasKnowledge) return { deleted: 0 };

  const delStmt = dbInstance.prepare(`
    DELETE FROM assistant_knowledge
    WHERE source_type = 'ai_answer'
       OR content LIKE '%پاسخِ بدل%'
       OR title LIKE '%فرانسه%'
       OR title LIKE '%لهستان%'
       OR title LIKE '%نروژ%'
       OR title LIKE '%هلند%'
       OR title LIKE '%اسلواکی%'
       OR title = 'چرا؟'
       OR title LIKE 'برای همان موضوع%'
       OR trim(content) = 'سلام'
  `);
  const r = delStmt.run();
  console.log(`[Clean ${label}] Deleted ${r.changes} irrelevant / dummy rows from assistant_knowledge`);

  // پاک‌سازی گفت‌وگوها و پیام‌های تستیِ مرتبط با این سؤالات
  const hasMsgs = !!dbInstance.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='assistant_messages'").get();
  if (hasMsgs) {
    const delMsgs = dbInstance.prepare(`
      DELETE FROM assistant_messages
      WHERE content LIKE '%فرانسه%'
         OR content LIKE '%لهستان%'
         OR content LIKE '%پاسخِ بدل%'
    `);
    const rm = delMsgs.run();
    if (rm.changes) console.log(`[Clean ${label}] Deleted ${rm.changes} test rows from assistant_messages`);
  }

  const hasConvs = !!dbInstance.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='assistant_conversations'").get();
  if (hasConvs) {
    const delConvs = dbInstance.prepare(`
      DELETE FROM assistant_conversations
      WHERE title LIKE '%فرانسه%'
         OR title LIKE '%لهستان%'
    `);
    const rc = delConvs.run();
    if (rc.changes) console.log(`[Clean ${label}] Deleted ${rc.changes} test rows from assistant_conversations`);
  }

  return { deleted: r.changes };
}

if (require.main === module) {
  cleanDatabase(db);
}

module.exports = { cleanDatabase };

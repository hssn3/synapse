// ============ مهاجرت: تاریخ بازبینی بعدی روی مدارک کنترل‌شده ============
// last_review_date = آخرین بازنگریِ انجام‌شده (گذشته). این ستون تاریخِ بازبینیِ *بعدی*
// است (آینده) و مبنای هشدار «بازبینی معوق/نزدیک» و ریمایندر خودکار قرار می‌گیرد.
const { db } = require('../src/config/database-sqlite');

function runMigration() {
  const cols = db.prepare('PRAGMA table_info(controlled_documents)').all().map(c => c.name);
  if (!cols.includes('review_date')) {
    db.prepare('ALTER TABLE controlled_documents ADD COLUMN review_date TEXT').run();
    console.log('[Seed DocReviewDate] ✅ ستون review_date به controlled_documents اضافه شد');
  }
}

module.exports = { runMigration };

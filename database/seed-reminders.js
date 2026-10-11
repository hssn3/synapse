// ============ مهاجرت: ریمایندرهای خودکار ============
// آگاهانه هیچ جدول notifications و هیچ «زنگوله»ی جداگانه‌ای ساخته نمی‌شود: سامانه از قبل
// کارتابل (اقلام محاسبه‌شده در لحظه) و بج‌های منو را دارد. ریمایندرها فقط یک نوع قلم
// تازه در همان کارتابل‌اند. بنابراین اینجا فقط سه چیز لازم است:
//   ۱) reminder_rules      — قوانین قابل تنظیم توسط ادمین بیمارستان
//   ۲) reminder_dismissals — «انجام شد» / «بعداً یادآوری کن» به‌ازای هر کاربر و هر قلم
//   ۳) reminder_cron_logs  — لاگ اجرای زمان‌بند (فقط برای کانال‌های خروجی ایمیل/پیامک)
const crypto = require('crypto');
const { db } = require('../src/config/database-sqlite');

// قوانین پیش‌فرض هر بیمارستان — فقط اگر بیمارستان هیچ قانونی نداشته باشد
const DEFAULT_RULES = [
  ['بازبینی دوره‌ای مدارک کنترل‌شده', 'document_review', 7],
  ['پایان دوره اعتباربخشی', 'period_end', 30],
  ['انقضای گواهینامه/مجوز', 'certificate_expiry', 30],
  // days_before این‌جا استفاده نمی‌شود: بازه‌ی هشدارِ هر چک‌لیست از روی تناوبِ خودش
  // تعیین می‌شود (CADENCE_LEAD_DAYS در src/services/checklist-cadence.js) — چون
  // «۷ روز مانده» برای یک چک‌لیست روزانه بی‌معناست.
  ['چک‌لیست دوره‌ای سررسیدشده', 'checklist_due', 0],
];

// قوانینی که بعد از نسخه‌ی اول اضافه شده‌اند. شرطِ «بیمارستانِ بدون هیچ قانون» در
// runMigration فقط بیمارستان‌های تازه را پوشش می‌دهد، پس بیمارستان‌های موجود هرگز
// قانونِ جدید را نمی‌گرفتند و سررسیدِ چک‌لیست‌هایشان هیچ‌وقت در کارتابل ظاهر نمی‌شد.
const BACKFILL_RULES = ['checklist_due'];

function runMigration() {
  db.prepare(`CREATE TABLE IF NOT EXISTS reminder_rules (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL,
    name TEXT NOT NULL,
    rule_type TEXT NOT NULL,
    days_before INTEGER DEFAULT 7,
    channel TEXT DEFAULT 'inbox',
    enabled INTEGER DEFAULT 1,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT
  )`).run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_rrules_hospital ON reminder_rules(hospital_id)').run();

  // dedupe_key همان کلید پایدارِ قلم است (نوع + شناسه + تاریخ سررسید)، پس اگر تاریخ سند
  // عوض شود ریمایندر دوباره ظاهر می‌شود — که رفتار درست است.
  db.prepare(`CREATE TABLE IF NOT EXISTS reminder_dismissals (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    dedupe_key TEXT NOT NULL,
    state TEXT NOT NULL,
    snooze_until TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`).run();
  db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_rdismiss_uniq ON reminder_dismissals(user_id, dedupe_key)').run();

  db.prepare(`CREATE TABLE IF NOT EXISTS reminder_cron_logs (
    id TEXT PRIMARY KEY,
    ran_at TEXT NOT NULL,
    hospitals_checked INTEGER DEFAULT 0,
    items_found INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    sms_sent INTEGER DEFAULT 0,
    detail TEXT
  )`).run();

  let seeded = 0;
  for (const h of db.prepare('SELECT id FROM hospitals').all()) {
    if (db.prepare('SELECT COUNT(*) c FROM reminder_rules WHERE hospital_id = ?').get(h.id).c > 0) continue;
    for (const [name, type, days] of DEFAULT_RULES) {
      db.prepare(`INSERT INTO reminder_rules (id, hospital_id, name, rule_type, days_before, channel, enabled)
        VALUES (?, ?, ?, ?, ?, 'inbox', 1)`).run(crypto.randomUUID(), h.id, name, type, days);
      seeded++;
    }
  }
  // بک‌فیل: قوانینِ تازه‌اضافه‌شده را به بیمارستان‌هایی که از قبل قانون داشتند هم بده
  let backfilled = 0;
  for (const type of BACKFILL_RULES) {
    const def = DEFAULT_RULES.find(r => r[1] === type);
    if (!def) continue;
    for (const h of db.prepare('SELECT id FROM hospitals').all()) {
      const has = db.prepare('SELECT COUNT(*) c FROM reminder_rules WHERE hospital_id = ? AND rule_type = ?').get(h.id, type).c;
      if (has) continue;
      db.prepare(`INSERT INTO reminder_rules (id, hospital_id, name, rule_type, days_before, channel, enabled)
        VALUES (?, ?, ?, ?, ?, 'inbox', 1)`).run(crypto.randomUUID(), h.id, def[0], def[1], def[2]);
      backfilled++;
    }
  }

  console.log(`[Seed Reminders] ✅ جدول‌های ریمایندر آماده‌اند — ${seeded} قانون پیش‌فرض`
    + (backfilled ? `، ${backfilled} قانون بک‌فیل‌شده` : ''));
}

module.exports = { runMigration, DEFAULT_RULES };

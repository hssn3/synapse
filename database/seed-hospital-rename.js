/**
 * Migration: نام‌گذاری دوباره‌ی بیمارستان‌های موجود
 *
 * دو بیمارستانِ موجودِ سامانه نام‌های نمایشی/آزمایشی داشتند:
 *   «بیمارستان نمونه» → «بیمارستان یک»
 *   «بیمارستان حسن»  → «بیمارستان دو»   (نام ساختگیِ دمو، نباید هیچ‌جا دیده شود)
 *
 * این یک تغییرِ نامِ محض است: شناسه‌ی بیمارستان، کاربران، کمیته‌ها، مدارک و
 * هر داده‌ی دیگری دست‌نخورده باقی می‌ماند. تنها موارد زیر به‌روزرسانی می‌شوند:
 *   - hospitals.name
 *   - hospitals.subdomain  (hasan → h2)
 *   - hospitals.letterhead_config.header_text  (اگر نام قدیمی در آن نشسته بود)
 *   - نام کمیته‌هایی که نام بیمارستان در عنوانشان تکرار شده بود
 *   - نام کاربری ادمین دموی آن بیمارستان (hasan_admin → hospital2_admin)
 *
 * Idempotent: اجرای دوم هیچ ردیفی را تغییر نمی‌دهد (شرط‌ها روی نام قدیمی‌اند).
 * Run: node database/seed-hospital-rename.js
 */
const { query } = require('../src/config/database-sqlite');

const OLD_NEW = [
  { old: 'بیمارستان نمونه', neu: 'بیمارستان یک' },
  { old: 'بیمارستان حسن', neu: 'بیمارستان دو' },
];

function runMigration() {
  let renamed = 0, committees = 0, users = 0, subdomains = 0;

  for (const { old, neu } of OLD_NEW) {
    const h = query('SELECT id, name, letterhead_config FROM hospitals WHERE name = ?', [old]).rows[0];
    if (!h) continue;
    query('UPDATE hospitals SET name = ?, updated_at = ? WHERE id = ?', [neu, new Date().toISOString(), h.id]);
    renamed++;

    // سربرگ رسمی: اگر نام قدیمی داخلش نشسته بود، همان‌جا هم اصلاح شود
    if (h.letterhead_config && typeof h.letterhead_config === 'string' && h.letterhead_config.includes(old)) {
      query('UPDATE hospitals SET letterhead_config = ? WHERE id = ?',
        [h.letterhead_config.split(old).join(neu), h.id]);
    }

    // کمیته‌هایی که نام بیمارستان در عنوانشان بود
    const cs = query('SELECT id, name FROM committees WHERE hospital_id = ? AND name LIKE ?', [h.id, `%${old}%`]).rows;
    for (const c of cs) {
      query('UPDATE committees SET name = ? WHERE id = ?', [c.name.split(old).join(neu), c.id]);
      committees++;
    }
  }

  // زیردامنه‌ی دموی «hasan» → «h2» (seed مربوطه هم با همین مقدار هم‌راستا شده است)
  const hs = query("SELECT id FROM hospitals WHERE subdomain = 'hasan'").rows;
  for (const x of hs) { query("UPDATE hospitals SET subdomain = 'h2' WHERE id = ?", [x.id]); subdomains++; }

  // نام کاربریِ ادمینِ دمو که نام ساختگی را حمل می‌کرد
  const u = query("SELECT id FROM users WHERE username = 'hasan_admin'").rows[0];
  if (u && !query("SELECT id FROM users WHERE username = 'hospital2_admin'").rows[0]) {
    query("UPDATE users SET username = 'hospital2_admin' WHERE id = ?", [u.id]);
    users++;
  }

  console.log(`[Seed Hospital-Rename] ✅ ${renamed} hospital(s), ${committees} committee(s), ${subdomains} subdomain(s), ${users} username(s) updated`);
}

if (require.main === module) runMigration();
module.exports = { runMigration };

/**
 * زمان‌بند ریمایندر — فقط برای کانال‌های خروجی (ایمیل/پیامک)
 *
 * اقلام درون‌برنامه‌ای اصلاً به این زمان‌بند نیاز ندارند: کارتابل آن‌ها را در لحظه‌ی خواندن
 * محاسبه می‌کند (src/services/reminders.js). این فایل فقط قوانینی را که کانالشان email/sms/all
 * است اجرا می‌کند و یک لاگ اجرا می‌نویسد.
 *
 * قرارداد ایمنی: این ماژول تحت هیچ شرایطی نباید اپلیکیشن را از کار بیندازد — نبودِ SMTP/SMS،
 * نبودِ جدول، خطای کوئری: همه فقط لاگ می‌شوند. هر مرز اجرا داخل try/catch است و تایمر unref
 * می‌شود تا خروج تمیز فرایند را بلوکه نکند.
 */
const crypto = require('crypto');
const { query } = require('../config/database-sqlite');
const { sendEmail, sendSms, emailConfigured, smsConfigured } = require('../config/notify');
const { dueItems, recipientsFor, todayStr } = require('./reminders');

const OUTBOUND = ['email', 'sms', 'all'];

function runCycle() {
  const hospitals = query('SELECT id FROM hospitals').rows;
  let found = 0, emails = 0, sms = 0;
  const detail = [];
  for (const h of hospitals) {
    try {
      const rules = query('SELECT * FROM reminder_rules WHERE hospital_id = ? AND enabled = 1 AND channel IN (?, ?, ?)',
        [h.id, ...OUTBOUND]).rows;
      if (!rules.length) continue;
      const items = dueItems(h.id, rules);
      found += items.length;
      for (const item of items) {
        const channel = item.rule.channel;
        // یک بار در روز به ازای هر گیرنده و هر قلم — لاگ همان جدولِ نادیده‌گرفتن استفاده می‌شود
        for (const u of recipientsFor(h.id, item.type)) {
          const key = `sent:${item.dedupe_key}:${todayStr()}`;
          const already = query('SELECT id FROM reminder_dismissals WHERE user_id = ? AND dedupe_key = ?', [u.id, key]).rows[0];
          if (already) continue;
          query(`INSERT INTO reminder_dismissals (id, hospital_id, user_id, dedupe_key, state) VALUES (?, ?, ?, ?, 'sent')`,
            [crypto.randomUUID(), h.id, u.id, key]);
          const text = `${item.title} — سررسید: ${item.due_date}`;
          if ((channel === 'email' || channel === 'all') && sendEmail(u.email, item.title, text).delivered) emails++;
          if ((channel === 'sms' || channel === 'all') && sendSms(u.phone, text).delivered) sms++;
        }
      }
      if (items.length) detail.push(`${h.id}: ${items.length}`);
    } catch (err) {
      console.error('[ReminderCron] خطا در یک بیمارستان (نادیده گرفته شد):', err.message);
    }
  }
  try {
    query(`INSERT INTO reminder_cron_logs (id, ran_at, hospitals_checked, items_found, emails_sent, sms_sent, detail)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), new Date().toISOString(), hospitals.length, found, emails, sms, JSON.stringify(detail)]);
  } catch (err) { console.error('[ReminderCron] ثبت لاگ ناموفق:', err.message); }
  console.log(`[ReminderCron] اجرا شد — ${hospitals.length} بیمارستان | ${found} قلم | ${emails} ایمیل | ${sms} پیامک`);
  return { hospitals: hospitals.length, items: found, emails, sms };
}

function startCron() {
  try {
    const hours = Math.min(168, Math.max(1, parseInt(process.env.REMINDER_CRON_HOURS, 10) || 6));
    if (!emailConfigured() && !smsConfigured()) {
      // حالت عادیِ نصب لوکال: کانال خروجی تنظیم نشده. زمان‌بند بی‌فایده است و اجرا نمی‌شود؛
      // ریمایندرها همچنان در کارتابل دیده می‌شوند.
      console.log('[ReminderCron] ایمیل/پیامک پیکربندی نشده — زمان‌بند اجرا نشد (ریمایندرها در کارتابل فعال‌اند)');
      return null;
    }
    try { runCycle(); } catch (err) { console.error('[ReminderCron] اجرای اول ناموفق:', err.message); }
    const iv = setInterval(() => {
      try { runCycle(); } catch (err) { console.error('[ReminderCron] خطای چرخه:', err.message); }
    }, hours * 3600000);
    if (iv.unref) iv.unref();
    console.log(`[ReminderCron] زمان‌بند فعال شد (هر ${hours} ساعت)`);
    return iv;
  } catch (err) {
    console.error('[ReminderCron] راه‌اندازی ناموفق (نادیده گرفته شد):', err.message);
    return null;
  }
}

module.exports = { runCycle, startCron };

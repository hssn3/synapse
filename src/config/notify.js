/**
 * پل کانال‌های خروجی اعلان (ایمیل / پیامک) — ارسال واقعی
 * موارد ۹ و ۱۰ چک‌لیست: nodemailer برای SMTP، kavenegar برای پیامک.
 * قاعده: نبود پیکربندی هرگز throw نمی‌کند — فقط delivered:false.
 */
let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch (e) { /* وابستگی اختیاری */ }

function emailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function smsConfigured() {
  return !!(process.env.SMS_PROVIDER && process.env.SMS_API_KEY);
}

let transporter = null;
function getTransporter() {
  if (transporter || !nodemailer || !emailConfigured()) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: (process.env.SMTP_SECURE === 'true') || parseInt(process.env.SMTP_PORT || '587', 10) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

async function sendEmail(to, subject, text) {
  try {
    if (!to) return { delivered: false, reason: 'no_address' };
    if (!emailConfigured()) {
      console.log(`[Notify] ایمیل پیکربندی نشده — ارسال نشد: «${subject}» → ${to}`);
      return { delivered: false, reason: 'smtp_not_configured' };
    }
    const t = getTransporter();
    if (!t) return { delivered: false, reason: 'smtp_init_failed' };
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to, subject, text: String(text || ''),
    });
    console.log(`[Notify][SMTP] ارسال شد → ${to} | ${subject}`);
    return { delivered: true };
  } catch (err) {
    console.error('[Notify] خطای ارسال ایمیل:', err.message);
    return { delivered: false, reason: 'error' };
  }
}

async function sendSms(to, text) {
  try {
    if (!to) return { delivered: false, reason: 'no_number' };
    if (!smsConfigured()) {
      console.log(`[Notify] پیامک پیکربندی نشده — ارسال نشد → ${to}`);
      return { delivered: false, reason: 'sms_not_configured' };
    }
    if ((process.env.SMS_PROVIDER || '').toLowerCase() === 'kavenegar') {
      const Kavenegar = require('kavenegar');
      const api = Kavenegar.KavenegarApi({ apikey: process.env.SMS_API_KEY });
      const sender = process.env.SMS_FROM || '10004346';
      await new Promise((resolve, reject) => {
        api.Send({ message: String(text || ''), sender, receptor: String(to) }, (resp, status) => {
          if (status >= 200 && status < 300) resolve(resp);
          else reject(new Error('kavenegar status ' + status));
        });
      });
      console.log(`[Notify][SMS] ارسال شد → ${to}`);
      return { delivered: true };
    }
    console.log(`[Notify][SMS] provider ناشناخته: ${process.env.SMS_PROVIDER}`);
    return { delivered: false, reason: 'unknown_provider' };
  } catch (err) {
    console.error('[Notify] خطای ارسال پیامک:', err.message);
    return { delivered: false, reason: 'error' };
  }
}

module.exports = { sendEmail, sendSms, emailConfigured, smsConfigured };

/**
 * seed-assistant-key.js — آماده‌سازی کلید دستیار هوشمند «دانا»
 *
 * چرا این اسکریپت: قرارداد معماری می‌گوید provider/model/api_key/base_url دستیار
 * در ردیف assistant_hospital_settings هر بیمارستان نگه داشته می‌شود (نه هاردکد در
 * کد و نه فقط env). این اسکریپت همان ردیف را از کلید محیطی GEMINI_API_KEY پر
 * می‌کند تا «دانا» فعال شود — بی‌آنکه کلید در کد/کامیت لو برود.
 *
 * قواعد سخت:
 *  - idempotent است: اجرای دوباره همان وضعیت را بازمی‌سازد (upsert).
 *  - اگر GEMINI_API_KEY در .env خالی باشد، بی‌صدا no-op می‌کند و پیام روشن می‌دهد.
 *  - کلید هرگز کامل چاپ/لاگ نمی‌شود؛ فقط ماسک‌شده ('.XXXX') با الگوی maskKey.
 *  - مسیر چت دانا (src/services/assistant-chat.js) کلید را از همین جدول
 *    (assistant_hospital_settings) می‌خواند، نه از env؛ این اسکریپت همان منبع را پر می‌کند.
 *
 * اجرا: npm run assistant:key
 */
const path = require('path');
const dotenv = require('dotenv');

// .env ریشه‌ی پروژه را پیش از هر چیز بخوان (مسیر قطعی، مستقل از cwd).
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { db } = require('../src/config/database-sqlite');

// maskKey — ماسکِ کلید طبق الگوی مستندشده‌ی پروژه: '.' + چهار کاراکتر آخر.
// چرا اینجا inline شد: این اسکریپت قبلاً از '../agents/config' import می‌کرد که
// هیچ‌وقت به مخزن نیامده بود و اجرای «npm run assistant:key» را با MODULE_NOT_FOUND
// می‌شکست (دیده‌شده در ممیزی ۱۴۰۵-۰۷-۲۰). همان تابع ساده اینجا تعریف می‌شود تا
// اسکریپت خودبسنده باشد؛ هیچ کلیدی هرگز کامل چاپ نمی‌شود.
function maskKey(k) {
  const s = String(k == null ? '' : k);
  return s ? '.' + s.slice(-4) : '';
}

const PROVIDER = 'gemini';
const MODEL = 'gemini-3.5-flash';
const BASE_URL = null; // برای Gemini، آدرس پیش‌فرض داخل ai-provider.js کافی است.

function run() {
  const key = String(process.env.GEMINI_API_KEY || '').trim();

  // اگر کلید محیطی نیست: no-op بی‌صدا با پیام روشن.
  if (!key) {
    console.log('[assistant:key] GEMINI_API_KEY در .env خالی است — هیچ تغییری اعمال نشد (no-op).');
    console.log('[assistant:key] برای فعال‌سازی «دانا» کلید را در .env بگذارید و دوباره «npm run assistant:key» را اجرا کنید.');
    return { ok: false, updated: 0, masked: '' };
  }

  const masked = maskKey(key); // '.XXXX' — هرگز کلید کامل چاپ نمی‌شود.
  const hospitals = db.prepare('SELECT id, name FROM hospitals').all();

  const upsert = db.prepare(`
    INSERT INTO assistant_hospital_settings (hospital_id, provider, model, api_key, base_url)
    VALUES (@hospital_id, @provider, @model, @api_key, @base_url)
    ON CONFLICT(hospital_id) DO UPDATE SET
      provider   = excluded.provider,
      model      = excluded.model,
      api_key    = excluded.api_key,
      base_url   = excluded.base_url,
      updated_at = datetime('now')
  `);

  console.log(`[assistant:key] کلید محیطی یافت شد (mask=${masked}) provider=${PROVIDER} model=${MODEL}`);

  let updated = 0;
  for (const h of hospitals) {
    const r = upsert.run({
      hospital_id: h.id, provider: PROVIDER, model: MODEL, api_key: key, base_url: BASE_URL,
    });
    updated += r.changes;
    console.log(`[assistant:key] ✓ hospital=${h.id} (${h.name || '—'}) → provider=${PROVIDER} model=${MODEL} api_key=${masked} base_url=NULL`);
  }
  console.log(`[assistant:key] ${updated} ردیف به‌روزرسانی/درج شد.`);

  // گزارش سلامت (فقط ماسک‌شده) — هرگز کلید کامل.
  const rows = db.prepare(
    'SELECT hospital_id, provider, model, api_key, base_url, chat_enabled FROM assistant_hospital_settings ORDER BY hospital_id'
  ).all();
  for (const row of rows) {
    const k = row.api_key || '';
    console.log(
      `[assistant:key] health hospital=${row.hospital_id} provider=${row.provider} model=${row.model} `
      + `has_key=${!!k} key_mask=${k ? maskKey(k) : ''} `
      + `base_url=${row.base_url === null || row.base_url === undefined ? 'NULL' : row.base_url} chat_enabled=${row.chat_enabled}`
    );
  }

  return { ok: true, updated, masked };
}

if (require.main === module) {
  run();
  process.exit(0);
}

module.exports = { run, PROVIDER, MODEL };

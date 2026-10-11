/**
 * دستیار هوشمند بیمارستانی — «دانا»
 *
 * معماری دو لایه که کارفرما خواست، همان چیزی که این migration جدولش را می‌سازد:
 *
 *   ۱) ایجنت داخلی — چیزی که کاربر واقعاً با آن حرف می‌زند. اول همیشه در داده‌ی
 *      خودِ سامانه جست‌وجو می‌کند (سنجه‌ها، وظایف سمت، اسناد) — رایگان و فوری.
 *   ۲) کمکِ بیرونی (پنهان از کاربر) — فقط وقتی جست‌وجوی داخلی جواب کافی نداشت،
 *      به یک API بیرونی می‌رود. کاربر هرگز مستقیم با آن حرف نمی‌زند و اسم
 *      فروشنده (Gemini/OpenRouter/…) هیچ‌جای رابط کاربری دیده نمی‌شود.
 *
 * چرا این «آموزش‌دیدن روی داده‌ی هر مرکز» نیست: fine-tuning به‌ازای هر بیمارستان
 * گران و کند است و با هر داده‌ی تازه باید از نو تکرار شود. اینجا RAG است — هرچه
 * کاربر بارگذاری می‌کند یا از API بیرونی جواب می‌گیرد در assistant_knowledge
 * ذخیره می‌شود، و دفعه‌ی بعد جست‌وجوی داخلی همان را پیدا می‌کند. نتیجه از دید
 * کاربر «دستیار یاد گرفت» است، ولی فوری، رایگانِ به‌روزرسانی، و با senderِ منبع.
 *
 * ایمنی: assistant_hospital_settings هرگز کلید API را در پاسخ به فرانت
 * نمی‌فرستد (فقط masked). سقف توکن ماهانه از پنل سوپرادمین تعریف می‌شود —
 * چون این هزینه از منابع خودِ ما مصرف می‌شود، نه نامحدود.
 */
const { db } = require('../src/config/database-sqlite');

const DEFAULT_MONTHLY_TOKEN_BUDGET = 200000;

function runMigration() {
  console.log('[Seed Assistant] Starting...');
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS assistant_hospital_settings (
        hospital_id TEXT PRIMARY KEY REFERENCES hospitals(id) ON DELETE CASCADE,
        provider TEXT NOT NULL DEFAULT 'openrouter',   -- 'anthropic' | 'openrouter' | 'gemini' | 'custom'
        model TEXT,
        api_key TEXT,                                  -- فقط سوپرادمین می‌بیند/می‌نویسد
        monthly_token_budget INTEGER NOT NULL DEFAULT ${DEFAULT_MONTHLY_TOKEN_BUDGET},
        tokens_used_this_period INTEGER NOT NULL DEFAULT 0,
        period_start TEXT NOT NULL DEFAULT (date('now','start of month')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS assistant_conversations (
        id TEXT PRIMARY KEY,
        hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_assist_conv_user ON assistant_conversations(hospital_id, user_id);

      CREATE TABLE IF NOT EXISTS assistant_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES assistant_conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user','assistant')),
        content TEXT NOT NULL,
        source TEXT,                                   -- 'internal' | 'external' | NULL (برای پیام کاربر)
        tokens_used INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_assist_msg_conv ON assistant_messages(conversation_id, created_at);

      -- حافظه‌ی بازیابی (RAG): هم از فایل‌های بارگذاری‌شده پر می‌شود هم از جواب‌های
      -- تأییدشده‌ی API بیرونی. status='confirmed' یعنی یک انسان دیده و تأیید کرده؛
      -- 'draft' یعنی مستقیم از هوش مصنوعی آمده و هنوز کسی تأییدش نکرده — قاعده‌ی
      -- ایمنیِ صریحِ نقشه‌راه: خروجی هوش مصنوعی پیش‌نویس است تا وقتی انسان تأیید کند.
      CREATE TABLE IF NOT EXISTS assistant_knowledge (
        id TEXT PRIMARY KEY,
        hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        source_type TEXT NOT NULL DEFAULT 'manual',     -- 'manual' | 'upload' | 'ai_answer'
        status TEXT NOT NULL DEFAULT 'confirmed',       -- 'confirmed' | 'draft'
        created_by TEXT REFERENCES users(id),
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_assist_knowledge_hosp ON assistant_knowledge(hospital_id, status);
    `);

    // base_url: برای تصمیم تازه‌ی کارفرما — سوپرادمین باید بتواند هر API سازگار
    // با فرمت OpenAI (نشانی دلخواه) را وارد و تست کند، نه فقط دو فروشنده‌ی
    // از‌پیش‌تعریف‌شده. ستون بعداً به جدول اضافه شد، پس با الگوی استاندارد پروژه
    // (چک قبل از ALTER) اضافه می‌شود تا روی دیتابیس‌های قدیمی هم بدون خطا اجرا شود.
    const cols = db.prepare(`PRAGMA table_info(assistant_hospital_settings)`).all().map(r => r.name);
    if (!cols.includes('base_url')) {
      db.exec(`ALTER TABLE assistant_hospital_settings ADD COLUMN base_url TEXT`);
      console.log('[Seed Assistant] + assistant_hospital_settings.base_url');
    }
    // کلیدِ روشن/خاموشِ چتِ دانا — خواسته‌ی صریح کارفرما: «کلید وصل بودن یا نبودن
    // دانا برای چت بزار برای سوپر ادمین». پیش‌فرض ۱ است تا رفتار بیمارستان‌های
    // موجود عوض نشود؛ خاموش‌کردن هم دکمه‌ی چت را برمی‌دارد و هم خودِ روت را
    // می‌بندد (فقط پنهان‌کردن دکمه یعنی هرکسی با curl همچنان توکن خرج می‌کند).
    if (!cols.includes('chat_enabled')) {
      db.exec(`ALTER TABLE assistant_hospital_settings ADD COLUMN chat_enabled INTEGER NOT NULL DEFAULT 1`);
      console.log('[Seed Assistant] + assistant_hospital_settings.chat_enabled');
    }

    const hospitals = db.prepare('SELECT id FROM hospitals').all();
    const ins = db.prepare(
      `INSERT OR IGNORE INTO assistant_hospital_settings (hospital_id, monthly_token_budget)
       VALUES (?, ?)`);
    let seeded = 0;
    hospitals.forEach(h => { const r = ins.run(h.id, DEFAULT_MONTHLY_TOKEN_BUDGET); if (r.changes) seeded++; });

    console.log(`[Seed Assistant] ✅ جدول‌های دستیار آماده‌اند (${seeded} بیمارستان تنظیمات پیش‌فرض گرفت)`);
  } catch (err) {
    console.error('[Seed Assistant] ❌ Failed:', err.message);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}
module.exports = { runMigration, DEFAULT_MONTHLY_TOKEN_BUDGET };

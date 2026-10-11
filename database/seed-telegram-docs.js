/**
 * Seed: اسناد تلگرام (TG-001 تا TG-269) — پورت ساختاری طبق REPORT-MuseSpark-Final
 * چرا این سید ساخته شد: گزارش بیلد تمیز می‌گوید ۲۶۹ سند TG با hospital_id جدا و
 * وضعیت draft وارد controlled_documents شدند، ولی پوشه knowledge-base/telegram-docs
 * در این بکاپ نیست. جعل ۲۶۹ سند ممنوع است؛ پس این سید جدول/ایندکس را تضمین می‌کند،
 * اگر پوشه منبع پیدا شود همان‌ها را idempotent وارد می‌کند، وگرنه ۰ ردیف می‌سازد
 * و gap را صریح لاگ می‌کند. اجرای دوباره = صفر تغییر.
 * Run: npm run seed-telegram-docs
 */
const fs = require('fs');
const path = require('path');

function store() {
  return require('../src/config/database-sqlite');
}

function run() {
  const { query } = store();
  // جدول مقصد از قبل توسط seed-documents ساخته می‌شود؛ این‌جا فقط ستون کمکی و ایندکس.
  try {
    query(`CREATE TABLE IF NOT EXISTS controlled_documents (
      id TEXT PRIMARY KEY, hospital_id TEXT NOT NULL, title TEXT NOT NULL,
      doc_code TEXT, status TEXT DEFAULT 'draft', created_at TEXT DEFAULT (datetime('now'))
    )`);
  } catch (e) { /* اگر جدول کامل از seed-documents بیاید، این شاخه اجرا نمی‌شود */ }
  try {
    const cols = query(`PRAGMA table_info(controlled_documents)`).rows.map(r => r.name);
    if (!cols.includes('source')) query(`ALTER TABLE controlled_documents ADD COLUMN source TEXT`);
    if (!cols.includes('doc_code')) query(`ALTER TABLE controlled_documents ADD COLUMN doc_code TEXT`);
  } catch (e) { console.error('[Seed TelegramDocs] alter failed:', e.message); }
  try { query(`CREATE INDEX IF NOT EXISTS idx_controlled_docs_code ON controlled_documents(doc_code)`); } catch (e) { /* optional */ }
  try { query(`CREATE INDEX IF NOT EXISTS idx_controlled_docs_source ON controlled_documents(source)`); } catch (e) { /* optional */ }

  const candidates = [
    path.join(__dirname, '..', 'knowledge-base', 'telegram-docs'),
    path.join(__dirname, '..', '..', 'md', 'telegram-docs'),
  ];
  const srcDir = candidates.find(d => { try { return fs.existsSync(d); } catch (e) { return false; } });
  if (!srcDir) {
    console.log('[Seed TelegramDocs] source NOT FOUND (knowledge-base/telegram-docs). 0 rows. gap ثبت شد.');
    return { added: 0, updated: 0, note: 'source-missing' };
  }
  // اگر روزی پوشه برگردد: ورود idempotent بر اساس doc_code=TG-### با hospital_id جدا و draft.
  let files = [];
  try { files = fs.readdirSync(srcDir).filter(f => !f.startsWith('.')).sort().slice(0, 269); } catch (e) { files = []; }
  let hospitals = [];
  try { hospitals = query(`SELECT id FROM hospitals WHERE is_active = 1`).rows; } catch (e) { hospitals = []; }
  if (!hospitals.length || !files.length) { console.log('[Seed TelegramDocs] 0 rows (no hospitals/files).'); return { added: 0, updated: 0 }; }
  let added = 0;
  for (const h of hospitals) {
    files.forEach((f, i) => {
      const code = 'TG-' + String(i + 1).padStart(3, '0');
      try {
        const ex = query(`SELECT 1 AS x FROM controlled_documents WHERE hospital_id = ? AND doc_code = ?`, [h.id, code]).rows[0];
        if (ex) return;
        const id = 'tg-' + h.id.slice(0, 8) + '-' + code.toLowerCase();
        query(
          `INSERT INTO controlled_documents (id, hospital_id, title, doc_code, source, status) VALUES (?, ?, ?, ?, 'telegram', 'draft')`,
          [id, h.id, f, code]
        );
        added++;
      } catch (e) { /* یک ردیف خراب نباید کل سید را بخواباند */ }
    });
  }
  console.log(`[Seed TelegramDocs] ${added} rows (idempotent).`);
  return { added, updated: 0 };
}

module.exports = { run, runMigration: run };

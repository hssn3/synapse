/* =====================================================================
   دو جدول تازه: تصدی سمت‌ها، و ویرایشگرانِ مجازِ فرم‌ها
   ---------------------------------------------------------------------
   ۱) role_tenures — «چه کسی، چه سمتی، از کِی تا کِی»
      نگرانی کاربر: «اگر سال جدید مدیر عوض شد، اطلاعات مدیر قبلی بماند» و
      «اگر دو مدیر پرستاری عوض شدند، معلوم باشد کدام‌یک چه کاری کرده».

      خودِ داده از قبل امن است: هر رکورد created_by/recorded_by دارد و
      کاربر هرگز حذف نمی‌شود (is_active صفر می‌شود). چیزی که کم بود، «بازه‌ی
      زمانی» است: بدون آن نمی‌شود گفت فلان صورت‌جلسه مالِ دورهٔ کدام مدیر
      پرستاری بوده. این جدول همان بازه را نگه می‌دارد و با تطبیق تاریخِ رکورد
      با بازه، پاسخ روشن می‌شود.

   ۲) document_editors — «افراد خاصی که مدیر اعتباربخشی به آن‌ها اجازه‌ی
      ویرایش فرم‌ها می‌دهد»، بدون اینکه مجوز کاملِ manage_documents بگیرند.

   idempotent: جدول‌ها با IF NOT EXISTS ساخته می‌شوند و تصدیِ اولیه فقط
   برای کاربرانی درج می‌شود که هنوز ردیف باز ندارند.
   ===================================================================== */
'use strict';

const crypto = require('crypto');
const { query } = require('../src/config/database');

const uid = () => crypto.randomUUID();

function runMigration() {
  query(`CREATE TABLE IF NOT EXISTS role_tenures (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role_id TEXT,
    role_code TEXT,
    role_title TEXT,
    started_on TEXT NOT NULL,
    ended_on TEXT,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  query('CREATE INDEX IF NOT EXISTS idx_tenure_h ON role_tenures(hospital_id, role_code, started_on)');
  query('CREATE INDEX IF NOT EXISTS idx_tenure_u ON role_tenures(user_id, ended_on)');

  query(`CREATE TABLE IF NOT EXISTS document_editors (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    granted_by TEXT,
    granted_at TEXT NOT NULL DEFAULT (datetime('now')),
    revoked_at TEXT,
    note TEXT
  )`);
  query('CREATE INDEX IF NOT EXISTS idx_doceditor ON document_editors(hospital_id, user_id, revoked_at)');

  // تصدیِ فعلی برای کاربرانی که هنوز ردیف بازی ندارند — مبدأ، تاریخ ساخت
  // خودِ کاربر است؛ دقیق‌ترین چیزی که سامانه واقعاً می‌داند.
  const users = query(
    `SELECT u.id, u.hospital_id, u.role_id, u.created_at, r.code, r.title_fa
       FROM users u LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.hospital_id IS NOT NULL AND u.id IS NOT NULL AND u.is_active = 1`).rows;
  let opened = 0;
  for (const u of users) {
    const has = query(
      'SELECT 1 FROM role_tenures WHERE user_id = ? AND ended_on IS NULL', [u.id]).rows.length;
    if (has) continue;
    query(`INSERT INTO role_tenures
             (id, hospital_id, user_id, role_id, role_code, role_title, started_on, note)
           VALUES (?,?,?,?,?,?,?,?)`,
      [uid(), u.hospital_id, u.id, u.role_id, u.code, u.title_fa,
       String(u.created_at || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
       'ثبت خودکار — آغاز تصدی از تاریخ ایجاد کاربر']);
    opened++;
  }
  console.log(`[Seed Tenure] ✅ role_tenures و document_editors آماده‌اند (${opened} تصدی باز ثبت شد)`);
}

module.exports = { runMigration };
if (require.main === module) { runMigration(); }

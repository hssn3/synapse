/**
 * Seed: مجوزِ «گفت‌وگو با دانا» (assistant:chat:use) برای همه‌ی نقش‌های پایه
 * ============================================================================
 * چرا این فایل: مسیرهای چتِ دستیار تا امروز هیچ گاردِ مجوزی نداشتند — بندِ معلقِ
 * docs/DECISIONS.md #3 که به‌دلیلِ «کلید در JSON هیچ نقشی نیست» به تعویق افتاده بود.
 * با افزودنِ گاردِ دستیار، هر نقشی که این کلید را نداشته باشد ۴۰۳ می‌گیرد؛ اما
 * مسئله این بود که کلید فقط در NIST و فقط برای ۵ نقشِ بالینی + admin نگاشته شده
 * بود، درحالی‌که دانا طبق خواستِ محصول برای همه‌ی کارکنان است (کاشیِ وسط نوار پایین).
 *
 * راه‌حل: این سید کلید را — افزودنی، بدون دست‌زدن به بقیه‌ی مجوزها — به JSONِ همه‌ی
 * نقش‌های پایه (hospital_id IS NULL) جز anonymous_reporter اضافه می‌کند و نگاشتِ
 * NIST را هم مستقیم تضمین می‌کند. middleware/auth.js و مسیرِ NIST هر دو یک نتیجه
 * می‌دهند، مستقل از این‌که seed-rbac-nist-sync کجای زنجیره اجرا شود.
 *
 * چرا anonymous_reporter مستثناست: این نقش برای ثبت‌کننده‌ی ناشناسِ گزارش خطا در
 * فرم‌های عمومی است و نباید به دستیارِ داخلیِ سازمان دسترسی داشته باشد.
 *
 * چرا فقط نقش‌های پایه و نه نقشِ سفارشی: نقشِ سفارشی قراردادِ صریحِ همان بیمارستان
 * است که ادمین از پنل می‌بندد؛ کاتالوگِ پنل (overrides.routes.js → /roles/permissions/catalog)
 * از unionِ همین JSONها ساخته می‌شود، پس بعد از این سید این کلید هم در کاتالوگ دیده
 * می‌شود و نقشِ تازه می‌تواند آگاهانه آن را بگیرد. تزریقِ خاموشِ مجوز در بوتِ بعدی به
 * قراردادِ ادمین خلاف انتظار است (هم‌راستا با قاعده‌ی ادغامِ افزودنیِ seed-management-roles).
 *
 * Idempotent: کلید فقط اگر غایب باشد اضافه می‌شود؛ اجرای دوباره صفر تغییر.
 */
'use strict';

const crypto = require('crypto');
const { db } = require('../src/config/database-sqlite');
const { ensurePermissionRow } = require('../src/services/rbac-sync');

const PERM_KEY = 'assistant:chat:use';
const EXCLUDED_ROLES = new Set(['anonymous_reporter']);

function runMigration() {
  console.log('[Seed AssistantAccess] Starting...');
  try {
    const permId = ensurePermissionRow(PERM_KEY);
    const roles = db.prepare('SELECT id, code, permissions FROM roles WHERE hospital_id IS NULL').all();
    const upd = db.prepare('UPDATE roles SET permissions = ? WHERE id = ?');
    const ins = db.prepare('INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES (?, ?, ?)');
    let updated = 0, mapped = 0, skipped = 0;
    for (const r of roles) {
      if (EXCLUDED_ROLES.has(r.code)) { skipped++; continue; }
      let keys = [];
      try { keys = JSON.parse(r.permissions || '[]'); } catch (e) { keys = []; }
      if (!Array.isArray(keys)) keys = [];
      if (!keys.includes(PERM_KEY)) {
        keys.push(PERM_KEY);
        upd.run(JSON.stringify(keys), r.id);
        updated++;
      }
      if (ins.run(crypto.randomUUID(), r.id, permId).changes) mapped++;
    }
    console.log(`[Seed AssistantAccess] ✅ ${updated} نقشِ JSON به‌روز شد، ${mapped} نگاشت NIST افزوده، `
      + `${skipped} نقش مستثنا (anonymous_reporter)`);
  } catch (err) {
    console.error('[Seed AssistantAccess] ❌ Failed:', err.message);
  }
}

module.exports = { runMigration };
if (require.main === module) runMigration();

/**
 * Seed: سینکِ جداول NIST (permissions/role_permissions) با ستون roles.permissions
 * ============================================================================
 * چرا در بوت: مسیرِ NIST در هر اجرا خوانده می‌شود (getUserPermissionSet و
 * evaluatePolicy) و اگر فقط یک‌بار سینک شود، نقشِ سفارشیِ تازه ساخته‌شده یا مجوزِ
 * تازه‌ی ویرایش‌شده از میدان جا می‌ماند. سینک idempotent است (INSERT OR IGNORE +
 * بازخوانی) و روی دیتابیسِ از قبل همگام صفر تغییر می‌گذارد.
 *
 * منطق در src/services/rbac-sync.js است (نقش پایه=افزایشی، سفارشی=آینه) — پنل
 * نقش‌ها هم همان سرویس را صدا می‌زند تا رفتار بوت و رفتار ویرایشِ زنده یکی باشد.
 */
'use strict';

const { syncAllRoles } = require('../src/services/rbac-sync');

function runMigration() {
  console.log('[Seed RbacSync] Starting...');
  try {
    const res = syncAllRoles();
    console.log(`[Seed RbacSync] ✅ ${res.roles} نقش بررسی شد (${res.mirrored} سفارشی=آینه) — `
      + `${res.added} نگاشت افزوده، ${res.removed} نگاشت حذف‌شده`);
  } catch (err) {
    console.error('[Seed RbacSync] ❌ Failed:', err.message);
  }
}

module.exports = { runMigration };
if (require.main === module) runMigration();

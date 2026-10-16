/**
 * rbac-sync — همگام‌سازِ ستون roles.permissions (مرجع) با جداول NIST
 * ============================================================================
 * ریشه‌ی مشکل: سامانه دو مسیرِ مجوز دارد —
 *   ۱. ستون JSONِ roles.permissions: مرجعِ خطِ اصلی. requirePermission
 *      (src/middleware/auth.js:127) و پاسخِ ورود/UI از همین می‌خوانند
 *      (src/routes/entry.js:150 و auth.js:100).
 *   ۲. جدول‌های permissions/role_permissions (مدل NIST): getUserPermissionSet
 *      (/api/rbac/my-permissions و گاردِ فرانت `can()`) و evaluatePolicy
 *      (گاردِ authorize) از اینها می‌خوانند.
 *
 * این دو هرگز همگام نشده بودند: ۱۰۸ کلید در JSONِ ۲۶ نقش، در مقابل ۱۵ ردیف و فقط
 * ۶ نقشِ نگاشته‌شده در NIST. نتیجه روی رفتار واقعی: نقش‌های عملیاتی (مدیر اعتباربخشی،
 * ریاست، ایمنی بیمار …) در مسیرهای «authorize» همه‌جا ۴۰۳ می‌گرفتند و getUserPermissionSet
 * مجبور بود با «پلِ ناسازگاری» (src/modules/rbac/policy-engine.js:184-195) به JSON
 * برگردد — یعنی هر مصرف‌کننده‌ی تازه باید خودش می‌دانست مرجع اصلی کجاست.
 *
 * قرارداد این ماژول (تصمیم مستندشده): JSON مرجع است و NIST از آن سینک می‌شود.
 *   • نقش پایه (hospital_id IS NULL) → ادغامِ افزایشی (mirror:false):
 *     کلیدهای JSON به NIST اضافه می‌شوند، ولی نگاشت‌های NIST-only حذف نمی‌شوند.
 *     چرا حذف نمی‌شوند: کلیدهای form:*، assistant:chat:use و form_engine:* فقط در
 *     NIST تعریف شده‌اند (src/database/migrate-enterprise-core.js:139) و برای پرستار/
 *     سرپرستار/سوپروایزر تنها منبعِ همان دسترسی‌اند؛ بازنویسیِ آینه‌ای یعنی پس‌گرفتنِ
 *     خاموشِ پرکردن برنامه ماهانه و گزارش خطا از کادر بالینی.
 *   • نقش سفارشی (hospital_id NOT NULL) → آینه‌ی دقیق (mirror:true):
 *     فهرست مجوزهای نقش سفارشی قراردادِ صریحِ همان بیمارستان است که ادمین از پنل
 *     ویرایش می‌کند؛ نگاشتِ کهنه نباید بماند، وگرنه سلبِ مجوز از پنل هیچ اثری در
 *     مسیرِ NIST ندارد. (امروز صفر نقش سفارشی وجود دارد، ولی پنل می‌تواند بسازد.)
 *
 * کجاها صدا زده می‌شود:
 *   • database/seed-rbac-nist-sync.js در هر بوت (idempotent).
 *   • POST/PUT /roles در overrides.routes.js بعد از هر ویرایش نقش سفارشی.
 *   • grant/revoke در rbac.routes.js به‌صورت JSON-اول + همان نگاشت.
 */
'use strict';

const crypto = require('crypto');
const { db } = require('../config/database-sqlite');

// کلیدهای تخت (بدون ':') — مثل manage_users — در مدل domain:resource:action جا
// نمی‌گیرند؛ جدول permissions هر سه ستون را NOT NULL می‌خواهد. این‌ها فقط شناسه‌اند:
// هیچ مصرف‌کننده‌ای بر اساس domain/resource/action این ردیف‌ها تصمیم نمی‌گیرد
// (evaluatePolicy کلید را همیشه با دو نقطه می‌سازد). پس domain='legacy' صریح‌تر از
// جعلِ یک دسته‌ی معنادارِ نادرست است. پیشینه: manage_directives دستی با domain=
// 'collaboration' ثبت شده؛ برای ~۹۴ کلید تازه از الگوی تقلیدی پرهیز شده.
function splitKey(key) {
  if (key.includes(':')) {
    const parts = key.split(':');
    return {
      domain: parts[0] || 'legacy',
      resource: parts[1] || key,
      action: parts.slice(2).join(':') || 'use',
    };
  }
  return { domain: 'legacy', resource: key, action: 'use' };
}

// تضمین وجود ردیفِ مجوز در جدول permissions و برگرداندن id آن.
// INSERT OR IGNORE + بازخوانی: اگر نویسنده‌ی هم‌زمانی زودتر درج کرده باشد،
// همان id برمی‌گردد و خطای قید یکتا بالا نمی‌آید.
function ensurePermissionRow(key) {
  const k = String(key || '').trim();
  if (!k) return null;
  const existing = db.prepare('SELECT id FROM permissions WHERE key = ?').get(k);
  if (existing) return existing.id;
  const { domain, resource, action } = splitKey(k);
  db.prepare(`INSERT OR IGNORE INTO permissions (id, key, domain, resource, action, title_fa, description_fa)
              VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(crypto.randomUUID(), k, domain, resource, action, k,
      'سینک‌شده از ستون roles.permissions (rbac-sync)');
  const row = db.prepare('SELECT id FROM permissions WHERE key = ?').get(k);
  return row ? row.id : null;
}

// خواندنِ مجوزهای JSONِ یک نقش با تحمل خرابی: JSONِ نامعتبر = فهرست خالی، نه crash.
function parseRoleKeys(role) {
  let keys = [];
  try { keys = JSON.parse(role.permissions || '[]'); } catch (e) { keys = []; }
  if (!Array.isArray(keys)) keys = [];
  return Array.from(new Set(keys.filter(k => typeof k === 'string' && k.trim()).map(k => k.trim())));
}

/**
 * سینکِ یک نقش از JSON به NIST.
 * @param {string} roleId شناسه‌ی نقش
 * @param {{mirror?: boolean}} opts mirror=true برای نقش سفارشی: نگاشت‌های خارج از JSON حذف می‌شوند.
 * @returns {{code: string|null, added: number, removed: number, skipped: boolean}}
 */
function syncRoleFromJson(roleId, opts = {}) {
  const mirror = !!opts.mirror;
  const role = db.prepare('SELECT id, code, hospital_id, permissions FROM roles WHERE id = ?').get(roleId);
  if (!role) return { code: null, added: 0, removed: 0, skipped: true };

  const permIds = parseRoleKeys(role).map(ensurePermissionRow).filter(Boolean);
  let added = 0, removed = 0;

  const tx = db.transaction(() => {
    if (mirror) {
      const current = db.prepare('SELECT permission_id FROM role_permissions WHERE role_id = ?').all(role.id);
      const wanted = new Set(permIds);
      const del = db.prepare('DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?');
      for (const row of current) {
        if (!wanted.has(row.permission_id)) { del.run(role.id, row.permission_id); removed++; }
      }
    }
    const ins = db.prepare('INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES (?, ?, ?)');
    for (const pid of permIds) {
      if (ins.run(crypto.randomUUID(), role.id, pid).changes) added++;
    }
  });
  tx();

  return { code: role.code, added, removed, skipped: false };
}

// سینکِ همه‌ی نقش‌ها با انتخابِ خودکار پرچم: پایه=افزایشی، سفارشی=آینه.
// همین تابع را seed بوت صدا می‌زند؛ خروجی‌اش برای لاگِ بوت است.
function syncAllRoles() {
  const roles = db.prepare('SELECT id, code, hospital_id FROM roles ORDER BY code').all();
  let added = 0, removed = 0, mirrored = 0;
  for (const r of roles) {
    const isCustom = r.hospital_id !== null && r.hospital_id !== undefined;
    if (isCustom) mirrored++;
    const res = syncRoleFromJson(r.id, { mirror: isCustom });
    added += res.added;
    removed += res.removed;
  }
  return { roles: roles.length, mirrored, added, removed };
}

module.exports = { ensurePermissionRow, parseRoleKeys, syncRoleFromJson, syncAllRoles };

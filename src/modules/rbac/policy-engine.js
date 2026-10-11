/**
 * Enterprise Policy Engine — NIST RBAC / ABAC Hybrid Model
 * Fail-Closed by default.
 */
const { db } = require('../../config/database-sqlite');

/**
 * بررسی دسترسی کاربر به یک منبع و اقدام خاص
 * @param {Object} user کاربر احراز هویت شده (req.user)
 * @param {string} resource نام منبع (e.g. 'monthly_program' یا 'error_report')
 * @param {string} action اقدام (e.g. 'view', 'fill', 'edit', 'approve', 'delete')
 * @param {Object} context متغیرهای صفاتی ABAC (e.g. { ward: 'ICU', shift: 'morning' })
 * @returns {{ allowed: boolean, reason?: string, permissionKey?: string }}
 */
function evaluatePolicy(user, resource, action, context = {}) {
  // ۱. گارد اولیه کاربر
  if (!user || !user.id) {
    return { allowed: false, reason: 'کاربر احراز هویت نشده است' };
  }

  // ۲. سوپرادمین پلتفرم دسترسی کامل دارد
  if (user.is_super_admin || user.role_code === 'superadmin' || user.role === 'superadmin') {
    return { allowed: true, permissionKey: '*:*:*' };
  }

  // ادمین بیمارستان روی منابع داخلی بیمارستان خود مجاز است (مگر حذف سنجه‌های مرجع یا لاگ)
  if (user.role_code === 'admin' && action !== 'purge_system_audit') {
    return { allowed: true, permissionKey: `admin:*:${action}` };
  }

  const roleCode = user.role_code || user.role;
  if (!roleCode) {
    return { allowed: false, reason: 'نقش کاربری مشخص نیست' };
  }

  // نگاشت نام‌های مستعار نقش‌ها جهت سازگاری کامل
  const ROLE_ALIASES = {
    nurse: ['nurse', 'staff_nurse'],
    staff_nurse: ['staff_nurse', 'nurse'],
    supervisor_clinical: ['supervisor_clinical', 'clinical_supervisor'],
    clinical_supervisor: ['clinical_supervisor', 'supervisor_clinical'],
    head_nurse: ['head_nurse']
  };

  const candidateRoles = ROLE_ALIASES[roleCode] || [roleCode];

  // ۳. قالب استاندارد پرمیشن و نرمال‌سازی نام منبع
  let domain = 'form';
  let targetResource = resource;
  if (resource.includes(':')) {
    const parts = resource.split(':');
    domain = parts[0];
    targetResource = parts[1];
  }

  const resUnderscore = targetResource.replace(/-/g, '_');
  const resDash = targetResource.replace(/_/g, '-');

  const permKeys = [
    `${domain}:${resUnderscore}:${action}`,
    `${domain}:${resDash}:${action}`,
    `${domain}:${resUnderscore}:*`,
    `${domain}:${resDash}:*`
  ];

  // ۴. بررسی مجوز در جداول RBAC
  const placeholders = candidateRoles.map(() => '?').join(',');
  const userRoles = db.prepare(`SELECT id, code FROM roles WHERE code IN (${placeholders})`).all(...candidateRoles);
  if (!userRoles || userRoles.length === 0) {
    return { allowed: false, reason: `نقش ${roleCode} در سامانه یافت نشد`, permissionKey: permKeys[0] };
  }

  const roleIds = userRoles.map(r => r.id);
  const idPlaceholders = roleIds.map(() => '?').join(',');
  const permPlaceholders = permKeys.map(() => '?').join(',');

  const hasPerm = db.prepare(`
    SELECT rp.id FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    WHERE rp.role_id IN (${idPlaceholders}) AND p.key IN (${permPlaceholders})
  `).get(...roleIds, ...permKeys);

  if (!hasPerm) {
    // بررسی در form_permissions اگر فرم اختصاصی باشد
    const formAcl = db.prepare(`
      SELECT fp.* FROM form_permissions fp
      JOIN forms f ON fp.form_id = f.id
      WHERE (f.slug = ? OR f.slug = ? OR f.id = ?) AND fp.role_code IN (${placeholders})
    `).get(resUnderscore, resDash, targetResource, ...candidateRoles);

    if (formAcl) {
      const colMap = {
        view: formAcl.can_view,
        fill: formAcl.can_fill,
        edit: formAcl.can_edit,
        approve: formAcl.can_approve,
        delete: formAcl.can_delete
      };
      if (colMap[action] === 1) {
        return { allowed: true, permissionKey: permKeys[0] };
      }
    }

    return {
      allowed: false,
      reason: `نقش «${roleCode}» مجاز به انجام اقدام «${action}» روی منبع «${targetResource}» نیست.`,
      permissionKey: permKeys[0]
    };
  }

  // ۵. لایه بررسی شروط صفاتی (ABAC Rules)
  const policy = db.prepare(`
    SELECT conditions_json FROM resource_policies
    WHERE resource_type = ? AND action = ? AND (hospital_id = ? OR hospital_id IS NULL)
  `).get(targetResource, action, user.hospital_id || null);

  if (policy && policy.conditions_json) {
    try {
      const conditions = JSON.parse(policy.conditions_json);
      // شرط بخش/واحد (Ward/Department Match)
      if (conditions.require_same_ward && context.ward_id && user.ward_id) {
        if (context.ward_id !== user.ward_id) {
          return { allowed: false, reason: 'اقدام فقط در بخش اختصاصی کاربر مجاز است (ABAC Restriction)' };
        }
      }
    } catch (e) {
      console.error('[PolicyEngine] Error parsing conditions:', e.message);
    }
  }

  return { allowed: true, permissionKey: permKeys[0] };
}

/**
 * دریافت کلیه کلیدهای مجوز یک کاربر جهت ارسال به فرانت‌اند
 */
function getUserPermissionSet(user) {
  if (!user || (!user.role_code && !user.role)) return [];
  if (user.is_super_admin || user.role_code === 'superadmin' || user.role === 'superadmin') return ['*'];

  const roleCode = user.role_code || user.role;
  const ROLE_ALIASES = {
    nurse: ['nurse', 'staff_nurse'],
    staff_nurse: ['staff_nurse', 'nurse'],
    supervisor_clinical: ['supervisor_clinical', 'clinical_supervisor'],
    clinical_supervisor: ['clinical_supervisor', 'supervisor_clinical'],
    head_nurse: ['head_nurse']
  };
  const candidateRoles = ROLE_ALIASES[roleCode] || [roleCode];
  const placeholders = candidateRoles.map(() => '?').join(',');

  const roles = db.prepare(`SELECT id FROM roles WHERE code IN (${placeholders})`).all(...candidateRoles);
  if (!roles || roles.length === 0) return [];

  const roleIds = roles.map(r => r.id);
  const idPlaceholders = roleIds.map(() => '?').join(',');

  const perms = db.prepare(`
    SELECT p.key FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    WHERE rp.role_id IN (${idPlaceholders})
  `).all(...roleIds).map(r => r.key);

  // افزودن دسترسی فرم‌های اختصاصی
  const formAcls = db.prepare(`
    SELECT f.slug, fp.can_view, fp.can_fill, fp.can_edit, fp.can_approve, fp.can_delete
    FROM form_permissions fp
    JOIN forms f ON fp.form_id = f.id
    WHERE fp.role_code IN (${placeholders})
  `).all(...candidateRoles);

  formAcls.forEach(fa => {
    const slugUnderscore = fa.slug.replace(/-/g, '_');
    const slugDash = fa.slug.replace(/_/g, '-');
    [slugUnderscore, slugDash].forEach(s => {
      if (fa.can_view) perms.push(`form:${s}:view`);
      if (fa.can_fill) perms.push(`form:${s}:fill`);
      if (fa.can_edit) perms.push(`form:${s}:edit`);
      if (fa.can_approve) perms.push(`form:${s}:approve`);
      if (fa.can_delete) perms.push(`form:${s}:delete`);
    });
  });

  // پلِ ناسازگاری دو سیستم دسترسی
  // ---------------------------------------------------------------------------
  // جدول‌های NIST (permissions/role_permissions) فقط برای چند منبعِ فرم و
  // دستیار پر شده‌اند و برای نقش‌های عملیاتی (ریاست، سوپروایزر، پرستار …) خالی
  // می‌مانند. مرجعِ معتبرِ واقعیِ دسترسی‌ها ستون roles.permissions است که
  // خطِ لوله‌ی پاسخ لاگین و requirePermission از آن می‌خواند. اگر اینجا خالی
  // برگردانده شود، هر نویسنده‌ی جدیدِ گاردریل فکر می‌کند نقش هیچ صلاحیتی
  // ندارد و المان‌های [data-can] را بی‌دلیل غیرفعال می‌کند.
  // پس وقتی نگاشت NIST چیزی تولید نکرد، همان ستون معتبر را برمی‌گردانیم.
  if (perms.length === 0 && Array.isArray(user.permissions) && user.permissions.length) {
    return Array.from(new Set(user.permissions));
  }

  return Array.from(new Set(perms));
}

module.exports = {
  evaluatePolicy,
  getUserPermissionSet
};

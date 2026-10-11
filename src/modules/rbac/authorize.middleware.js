/**
 * Authorize Middleware — NIST RBAC / ABAC Enforcement
 * Fail-Closed (Denies with 403 on any permission resolution failure)
 */
const { evaluatePolicy } = require('./policy-engine');
const { db } = require('../../config/database-sqlite');
const crypto = require('crypto');

function authorize(resource, action, abacContextExtractor = null) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'احراز هویت الزامی است' });
    }

    const context = abacContextExtractor ? abacContextExtractor(req) : {
      ward_id: req.body?.ward_id || req.query?.ward_id,
      shift: req.body?.shift || req.query?.shift,
      ip: req.ip
    };

    // اگر resource تابعی باشد که نام منبع را از پارامترهای روت استخراج کند (مانند :slug)
    const targetResource = typeof resource === 'function' ? resource(req) : resource;

    const evaluation = evaluatePolicy(user, targetResource, action, context);

    if (!evaluation.allowed) {
      // ثبت در لاگ امنیتی (Audit Log)
      try {
        if (user?.id && user?.hospital_id) {
          db.prepare(`
            INSERT INTO audit_log (id, hospital_id, user_id, action, target_table, target_id, old_value, new_value, ip_address, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `).run(
            crypto.randomUUID(),
            user.hospital_id,
            user.id,
            `DENIED_${action.toUpperCase()}`,
            targetResource,
            req.params?.id || null,
            JSON.stringify({ reason: evaluation.reason, permissionKey: evaluation.permissionKey, url: req.originalUrl }),
            null,
            req.ip || null
          );
        }
      } catch (err) {
        console.error('[Authorize] Failed to log access denial:', err.message);
      }

      return res.status(403).json({
        error: 'دسترسی غیرمجاز',
        message: evaluation.reason || 'شما مجوز لازم برای انجام این اقدام را ندارید.',
        required_permission: evaluation.permissionKey
      });
    }

    // مجوز تأیید شد
    req.permissionContext = evaluation;
    next();
  };
}

module.exports = { authorize };

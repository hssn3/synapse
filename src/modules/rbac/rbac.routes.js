/**
 * RBAC Routes — Policy Matrix, User Permissions & Administration
 */
const express = require('express');
const router = express.Router();
const { authRequired } = require('../../middleware/auth');
const { authorize } = require('./authorize.middleware');
const { getUserPermissionSet } = require('./policy-engine');
const { db } = require('../../config/database-sqlite');
const crypto = require('crypto');

// ۱. استعلام کلیدهای مجوز کاربر جاری (جهت مصرف frontend guard can())
router.get('/my-permissions', authRequired, (req, res) => {
  const permissions = getUserPermissionSet(req.user);
  res.json({
    user_id: req.user.id,
    role_code: req.user.role_code || req.user.role,
    permissions
  });
});

// ۲. مشاهده ماتریس جامع دسترسی نقش‌ها (مخصوص مدیر / ادمین)
router.get('/matrix', authRequired, authorize('system:rbac', 'view'), (req, res) => {
  const roles = db.prepare('SELECT id, code, title_fa as name FROM roles ORDER BY title_fa').all();
  const permissions = db.prepare('SELECT id, key, domain, resource, action, title_fa FROM permissions ORDER BY domain, resource, action').all();
  const mappings = db.prepare('SELECT role_id, permission_id FROM role_permissions').all();

  const matrix = {};
  roles.forEach(r => {
    matrix[r.code] = {
      role_id: r.id,
      role_name: r.name,
      permissions: []
    };
  });

  const permMap = new Map(permissions.map(p => [p.id, p]));
  const roleCodeMap = new Map(roles.map(r => [r.id, r.code]));

  mappings.forEach(m => {
    const roleCode = roleCodeMap.get(m.role_id);
    const perm = permMap.get(m.permission_id);
    if (roleCode && perm && matrix[roleCode]) {
      matrix[roleCode].permissions.push(perm.key);
    }
  });

  res.json({
    roles,
    permissions,
    matrix
  });
});

// ۳. اعطای مجوز به یک نقش
// قرارداد مرجع‌بودنِ JSON (src/services/rbac-sync.js): اول ستون roles.permissions
// و بعد نگاشت NIST. چرا ترتیب مهم است: اگر فقط NIST را اضافه کنیم، سینکِ بعدی برای
// نقش سفارشی (آینه‌ی دقیق) آن را دوباره حذف می‌کند چون کلید در JSON نیست — یعنی
// «اعطا» مثل بازه‌ی موقت تا بوتِ بعدی می‌شد.
router.post('/grant', authRequired, authorize('system:rbac', 'manage'), (req, res) => {
  const { role_code, permission_key } = req.body;
  if (!role_code || !permission_key) {
    return res.status(400).json({ error: 'role_code و permission_key الزامی هستند' });
  }

  const role = db.prepare('SELECT id, hospital_id, permissions FROM roles WHERE code = ?').get(role_code);
  const perm = db.prepare('SELECT id FROM permissions WHERE key = ?').get(permission_key);
  if (!role || !perm) {
    return res.status(404).json({ error: 'نقش یا مجوز مورد نظر یافت نشد' });
  }

  let keys = [];
  try { keys = JSON.parse(role.permissions || '[]'); } catch (e) { keys = []; }
  if (!Array.isArray(keys)) keys = [];
  if (!keys.includes(permission_key)) {
    keys.push(permission_key);
    db.prepare('UPDATE roles SET permissions = ? WHERE id = ?').run(JSON.stringify(keys), role.id);
  }
  db.prepare(`
    INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
    VALUES (?, ?, ?)
  `).run(crypto.randomUUID(), role.id, perm.id);

  res.json({ success: true, message: `مجوز ${permission_key} به نقش ${role_code} اعطا شد.` });
});

// ۴. سلب مجوز از یک نقش
// آینه‌ی grant: هم از JSON حذف می‌شود (وگرنه سینکِ افزودنیِ بوت دوباره برش می‌گرداند)
// و هم نگاشت NIST — چون سینک فقط ADD می‌کند و بدون حذفِ صریح، اینجا مجوز «سلب‌شده»
// در مسیر evaluatePolicy/getUserPermissionSet باقی می‌ماند.
router.post('/revoke', authRequired, authorize('system:rbac', 'manage'), (req, res) => {
  const { role_code, permission_key } = req.body;
  if (!role_code || !permission_key) {
    return res.status(400).json({ error: 'role_code و permission_key الزامی هستند' });
  }

  const role = db.prepare('SELECT id, hospital_id, permissions FROM roles WHERE code = ?').get(role_code);
  const perm = db.prepare('SELECT id FROM permissions WHERE key = ?').get(permission_key);
  if (!role || !perm) {
    return res.status(404).json({ error: 'نقش یا مجوز مورد نظر یافت نشد' });
  }

  let keys = [];
  try { keys = JSON.parse(role.permissions || '[]'); } catch (e) { keys = []; }
  if (!Array.isArray(keys)) keys = [];
  const filtered = keys.filter(k => k !== permission_key);
  if (filtered.length !== keys.length) {
    db.prepare('UPDATE roles SET permissions = ? WHERE id = ?').run(JSON.stringify(filtered), role.id);
  }

  db.prepare(`
    DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?
  `).run(role.id, perm.id);

  res.json({ success: true, message: `مجوز ${permission_key} از نقش ${role_code} سلب شد.` });
});

module.exports = router;

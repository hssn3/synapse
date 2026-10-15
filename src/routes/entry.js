/**
 * ورود کاشی‌ای بدون فرم — کاربر روی «سمت» خودش کلیک می‌کند و مستقیم وارد می‌شود.
 * عمداً بیرون از /api/public/* مانده چون آن مسیر محدودکننده‌ی نرخ سخت‌گیرانه‌ای دارد
 * که برای فرم‌های ناشناس یک‌بارمصرف طراحی شده، نه برای ورود روزمره‌ی کل کارکنان.
 */
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database-sqlite');
const config = require('../config/app');
const { logAction } = require('../middleware/audit');

function isPasswordRequired() {
  const row = query('SELECT value FROM platform_settings WHERE key = ?', ['require_password']).rows[0];
  return row ? row.value === '1' : false;
}

// آیا ورود سریع (کلیک روی سمت) نیاز به رمز واقعی دارد؟ سراسری، از پنل سوپرادمین تنظیم می‌شود.
router.get('/require-password', (req, res) => {
  try { res.json({ require_password: isPasswordRequired() }); }
  catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// آیا تمِ روشن برای کاربران مجاز است؟ سراسری، از پنل سوپرادمین — پیش‌فرض خاموش
// (همیشه تمِ تیره)، عمداً بدون نیاز به ورود چون فرانت پیش از لاگین هم به آن نیاز
// دارد (صفحه‌ی انتخاب مرکز/سمت هم باید همین قاعده را رعایت کند).
router.get('/theme-policy', (req, res) => {
  try {
    const row = query('SELECT value FROM platform_settings WHERE key = ?', ['light_theme_enabled']).rows[0];
    res.json({ light_theme_enabled: row ? row.value === '1' : false });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// سمت‌های یک بیمارستان به‌همراه کاربران هر سمت — برای صفحه‌ی ورود کاشی‌ای (بدون فرم نام‌کاربری/رمز).
// ترتیب سمت‌ها از چارت سازمانی می‌آید (roles.hierarchy_order، قابل تغییر توسط سوپرادمین)؛ نام هیچ کاربری در سطح اول نمایش
// داده نمی‌شود، فقط پس از انتخاب سمت (اگر آن سمت چند کاربر داشت) نام برای تمایز لازم می‌شود.
//
// چرا username و full_name مشروط شدند (ممیزی امنیتی ۱۴۰۵/۰۷/۲۵): این مسیر عمداً بدون
// احراز هویت است و کاربران را با user_id برمی‌گرداند — و اگر require_password خاموش باشد
// (پیش‌فرض نصب تازه؛ همان چیزی که isPasswordRequired() پایین می‌خواند)، POST /role-login با
// همان user_id نشست کامل و بدون رمز می‌دهد. یعنی پاسخِ قبلی عملاً فهرستِ «نام کاربری + شناسه‌ی
// ورود بی‌رمز» بود. حالا username کلاً نمی‌آید (شناسه‌ی احراز هویت است و ورود کاشی‌ای فقط
// user_id می‌خواهد) و full_name تنها برای سمتی می‌آید که بیش از یک کاربر دارد — همان‌جایی که
// قرارداد بالا می‌گوید نام برای «تمایز» لازم است. مصرف‌کننده‌ی فرانت هم همین را می‌خواند:
// public/js/views/dashboard/catalog-part4.js:19-24 فقط users.length و id/full_name را استفاده
// می‌کند و کارتِ تک‌کاربره فقط users[0].id را برمی‌دارد (public/js/views/dashboard/catalog-part3.js:381).
router.get('/hospital/:id/roles', (req, res) => {
  try {
    const h = query('SELECT id FROM hospitals WHERE id = ? AND is_active = 1', [req.params.id]).rows[0];
    if (!h) return res.status(404).json({ error: 'بیمارستان یافت نشد' });
    const rows = query(
      `SELECT u.id as user_id, u.full_name, r.id as role_id, r.code as role_code,
              r.title_fa as role_title, COALESCE(r.hierarchy_level, 0) as role_level
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.hospital_id = ? AND u.is_active = 1
       ORDER BY COALESCE(r.hierarchy_order, 9999), r.rowid, u.full_name`,
      [req.params.id]
    ).rows;
    const byRole = {};
    const order = [];
    rows.forEach(r => {
      if (!byRole[r.role_id]) { byRole[r.role_id] = { role_id: r.role_id, role_code: r.role_code, role_title: r.role_title, level: r.role_level || 0, users: [] }; order.push(r.role_id); }
      byRole[r.role_id].users.push({ id: r.user_id, full_name: r.full_name });
    });
    // برای کارتِ چندکاربره فهرستِ کاربران کامل می‌ماند (موزاییکِ تمایز به نام نیاز دارد) و
    // طولش همان «تعداد کاربرانِ سمت» است؛ برای سمتِ تک‌کاربره فقط شناسه‌ی ورود می‌ماند تا نامِ
    // کارکنان روی یک مسیرِ بی‌احراز هویت نیفتد. قالبِ پاسخ عوض نمی‌شود (users همیشه آرایه است).
    const roles = order.map(id => {
      const role = byRole[id];
      if (role.users.length === 1) role.users = role.users.map(u => ({ id: u.id }));
      return role;
    });
    res.json({ require_password: isPasswordRequired(), roles });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// هشدارِ بوتِ همین قابلیت (عمداً fail-closed نیست): در production با require_password خاموش،
// /role-login با دانستنِ user_id بدون رمز نشست می‌دهد. خاموش‌بودنِ رمز انتخابِ مستندِ مالک است
// (AGENTS.md قاعده ۹)، پس بستنِ خودکارش غلط است — ولی سکوت هم غلط است: نصبِ واقعی نباید
// ناخواسته بی‌رمز بماند. خطای احتمالیِ دیتابیس در لحظه‌ی بوت نباید بالا آمدنِ سرور را بشکند.
try {
  if (config.isProduction && !isPasswordRequired()) {
    console.warn('[Entry] هشدار امنیتی: require_password خاموش است و سامانه در حالت production بالا آمده — '
      + 'ورود کاشی‌ای (POST /api/entry/role-login) با دانستنِ user_id بدون رمز نشست می‌دهد؛ '
      + 'برای استفاده‌ی واقعی آن را از پنل سوپرادمین روشن کنید.');
  }
} catch (e) { /* بوت نباید به‌خاطرِ این هشدار بشکند */ }

// ورود سریع با کلیک روی سمت — بدون فرم لاگین کلاسیک. اگر require_password روشن باشد رمز
// واقعی همان کاربر بررسی می‌شود؛ در غیر این صورت مثل ورود سریع dev قبلی، بدون رمز وارد می‌شود.
router.post('/role-login', [body('user_id').trim().notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'کاربر نامعتبر است' });
  try {
    const passwordRequired = isPasswordRequired();

    const user = query(
      `SELECT u.id, u.hospital_id, u.full_name, u.username, u.password_hash, u.is_active,
              r.code as role_code, r.title_fa as role_title, r.permissions
       FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
      [req.body.user_id]
    ).rows[0];
    if (!user || !user.is_active) return res.status(401).json({ error: 'کاربر یافت نشد' });

    if (passwordRequired) {
      if (!req.body.password) return res.status(401).json({ error: 'رمز عبور الزامی است' });
      // همان قفل حسابِ login کلاسیک — بدون این، حدس رمز روی user_id ممکن بود (BUG-01)
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const remaining = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
        return res.status(429).json({ error: `حساب قفل است. ${remaining} دقیقه` });
      }
      const match = await bcrypt.compare(req.body.password, user.password_hash);
      if (!match) {
        const newAttempts = (user.failed_login_attempts || 0) + 1;
        const shouldLock = newAttempts >= 5;
        query('UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?',
          [newAttempts, shouldLock ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null, user.id]);
        await logAction({ hospitalId: user.hospital_id, userId: user.id, action: 'user_login_failed', ipAddress: req.ip });
        return res.status(401).json({ error: 'رمز عبور اشتباه است' });
      }
    }

    query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = ? WHERE id = ?',
      [new Date().toISOString(), user.id]);
    const token = jwt.sign({ id: user.id }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
    // کوکی امن فقط روی https واقعی (همان فیکس auth.js) — وگرنه ورود کاشی‌ای روی http://IP:port می‌شکست.
    const _rhttps = !!(req.secure || (req.headers && req.headers['x-forwarded-proto'] === 'https'));
    res.cookie(config.jwt.cookieName, token, {
      httpOnly: true, secure: config.isProduction ? _rhttps : false, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000,
    });
    logAction({ hospitalId: user.hospital_id, userId: user.id, action: 'user_login_role_tile', ipAddress: req.ip });

    let hospitalName = null, hospitalHasLogo = false;
    try {
      const h = query('SELECT name, logo_url FROM hospitals WHERE id = ?', [user.hospital_id]).rows[0];
      hospitalName = h?.name || null;
      hospitalHasLogo = !!(h && h.logo_url);
    } catch (e) { /* non-fatal */ }

    res.json({
      user: {
        id: user.id, full_name: user.full_name, username: user.username,
        role_code: user.role_code, role_title: user.role_title,
        hospital_id: user.hospital_id, hospital_name: hospitalName,
        // مثل GET /me — تا سایدبار بعد از ورود کاشی‌ای، بدونِ درخواستِ کورِ لوگو
        // بداند بیمارستان لوگو دارد یا نه (کاشی سمت مسیر اصلی ورود کارکنان است).
        hospital_has_logo: hospitalHasLogo,
        permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions,
      }
    });
  } catch (err) { console.error('[Entry] role-login error:', err); res.status(500).json({ error: 'خطای سرور' }); }
});

module.exports = router;

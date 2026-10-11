/**
 * مسیرهای سوپرادمین پلتفرم — فقط مدیریت بیمارستان‌ها (بدون دسترسی به داده‌ی درون‌سازمانی هیچ بیمارستانی)
 */
const express = require('express');
const router = express.Router();
const { query, db } = require('../config/database-sqlite');
const { superAdminRequired } = require('../middleware/auth');
const { uuid } = require('../utils/db');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const config = require('../config/app');
const { tehranNow } = require('../config/jalali');
const { chatComplete, extractText, PRESETS: AI_PRESETS } = require('../services/ai-provider');
const Database = require('better-sqlite3');

// لاگ اقدامات سوپرادمین در سطح پلتفرم — جدول مستقل super_audit_log (نه audit_log که hospital_id
// و user_id را NOT NULL با FK می‌خواهد و برای عملیات پلتفرمی مثل بکاپ/بازگردانی معنا ندارد)
function logSuperAction({ superAdminId, action, targetTable = null, targetId = null, newValue = null, ipAddress = null }) {
  try {
    query(
      `INSERT INTO super_audit_log (id, super_admin_id, action, target_table, target_id, new_value, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuid(), superAdminId, action, targetTable, targetId, newValue ? JSON.stringify(newValue) : null, ipAddress]
    );
  } catch (err) { console.error('[Super] audit log failed:', err.message); }
}

const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');

// امکانات/پکیج هر بیمارستان (hospital_features) — مثل سایر seed های idempotent موجود، همین‌جا در
// زمان require شدن این فایل (که app.js همیشه در بوت انجام می‌دهد) اجرا می‌شود؛ جدول را می‌سازد و
// برای بیمارستان‌های موجود همه‌ی کلیدها را enabled=1 seed می‌کند (بدون تغییر در app.js).
const hospitalFeatures = require('../../database/seed-hospital-features');
try { hospitalFeatures.runMigration(); } catch (e) { console.error('[Super] seed-hospital-features failed:', e.message); }

router.use(superAdminRequired);

// لوگوی بیمارستان — مثل بقیه‌ی آپلودهای سامانه بیرون از public نگهداری می‌شود و از مسیر
// اختصاصی سرو می‌شود؛ ستون hospitals.logo_url نام فایل ذخیره‌شده (uuid.webp) را نگه می‌دارد.
const logoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

router.post('/hospitals/:id/logo', logoUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'فایل لوگو ارسال نشده' });
  if (!req.file.mimetype.startsWith('image/')) return res.status(400).json({ error: 'فقط تصویر مجاز است' });
  try {
    const h = query('SELECT id, logo_url FROM hospitals WHERE id = ?', [req.params.id]).rows[0];
    if (!h) return res.status(404).json({ error: 'بیمارستان یافت نشد' });
    const dir = config.upload.dir;
    fs.mkdirSync(dir, { recursive: true });
    const filename = `${uuid()}.webp`;
    // اگر محتوای فایل واقعاً تصویر نباشد، خطای کاربر است نه خرابی سرور
    // اندازه‌ی هدف برای سربرگ: داخل جعبه‌ی ۵۱۲×۵۱۲ جا شود، نسبت حفظ شود، و
    // بزرگ‌نمایی نکند. resize قبلی فقط عرض را ۶۰۰ می‌کرد؛ برای لوگوی عریض،
    // ارتفاعِ حاصل در سربرگ خیلی کوچک می‌شد. fit:'inside' هر دو بُعد را می‌بیند.
    // زمینه شفاف نگه داشته می‌شود تا روی سربرگ سفید و تیره هر دو بنشیند.
    try { await sharp(req.file.buffer)
            .resize(512, 512, { fit: 'inside', withoutEnlargement: true,
                                background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .webp({ quality: 90 }).toFile(path.join(dir, filename)); }
    catch (e) { return res.status(400).json({ error: 'محتوای فایل یک تصویر معتبر نیست' }); }
    query('UPDATE hospitals SET logo_url = ? WHERE id = ?', [filename, h.id]);
    if (h.logo_url) { try { fs.unlinkSync(path.join(dir, path.basename(h.logo_url))); } catch (e) { /* لوگوی قبلی موجود نبود */ } }
    res.json({ status: 'uploaded', logo: filename });
  } catch (err) { console.error('[Super] logo upload error:', err.message); res.status(500).json({ error: 'خطای سرور' }); }
});

// پیش‌نمایش لوگو در پنل سوپرادمین (کاربران بیمارستان از /api/hospital/logo می‌گیرند)
router.get('/hospitals/:id/logo', (req, res) => {
  const h = query('SELECT logo_url FROM hospitals WHERE id = ?', [req.params.id]).rows[0];
  if (!h || !h.logo_url) return res.status(404).json({ error: 'لوگو ثبت نشده' });
  const abs = path.join(config.upload.dir, path.basename(h.logo_url));
  if (!fs.existsSync(abs)) return res.status(404).json({ error: 'فایل روی سرور موجود نیست' });
  res.type('image/webp'); res.sendFile(abs);
});

/* ---------- سطل بازیافت ----------
   هیچ حذفی در سامانه واقعاً نابودکننده نیست: پیش از هر DELETE، ردیف در
   deleted_records اسنپ‌شات می‌شود (src/services/recycle-bin.js). این سه
   مسیر، دیدن و بازگرداندنش را به سوپرادمین می‌دهند. */
const recycleBin = require('../services/recycle-bin');

router.get('/recycle-bin', (req, res) => {
  try {
    res.json({
      items: recycleBin.list({
        hospitalId: req.query.hospital_id || null,
        table: req.query.table || null,
        q: req.query.q || null,
        includeRestored: req.query.include_restored === '1',
        limit: req.query.limit
      }),
      counts: recycleBin.counts()
    });
  } catch (err) { console.error('[RecycleBin]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/recycle-bin/:id/restore', (req, res) => {
  try {
    const r = recycleBin.restore(req.params.id, (req.superAdmin && req.superAdmin.id) || null);
    if (!r.ok) return res.status(409).json({ error: r.error });
    res.json(r);
  } catch (err) { console.error('[RecycleBin]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/recycle-bin/:id/restore-cascade', (req, res) => {
  try {
    const r = recycleBin.restoreCascade(req.params.id, (req.superAdmin && req.superAdmin.id) || null);
    if (!r.ok) return res.status(409).json({ error: r.error });
    res.json(r);
  } catch (err) { console.error('[RecycleBin]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

/* ---------- ضریب وزنی سطح سنجه ----------
   ضرایب رسمی هر دوره را وزارت اعلام می‌کند، پس باید بدون دیپلوی عوض شوند.
   پیش‌فرض ۱/۱/۱ است تا تغییرِ ضریب یک تصمیمِ آگاهانه باشد، نه اتفاقی که
   یک‌شبه درصد آمادگی همه‌ی بیمارستان‌ها را جابه‌جا کند. */
const scoringWeights = require('../../database/seed-scoring-weights');

router.get('/scoring', (req, res) => {
  try { res.json({ level_weights: scoringWeights.read() }); }
  catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.put('/scoring', (req, res) => {
  try {
    const w = scoringWeights.write((req.body && req.body.level_weights) || {});
    res.json({ ok: true, level_weights: w });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

/* ---------- چارت سلسله‌مراتب سمت‌ها ----------
   نقش‌ها در این سامانه سراسری‌اند، پس ترتیبشان هم یک تصمیم سراسری است و
   اینجا (پنل سوپرادمین) خانه‌ی درستش است، نه پنل بیمارستان. خروجی همان
   ترتیبی است که صفحه‌ی ورود کاشی‌ای هم از آن استفاده می‌کند. */
router.get('/role-hierarchy', (req, res) => {
  try {
    const roles = query(
      `SELECT r.id, r.code, r.title_fa,
              COALESCE(r.hierarchy_order, 9999) as hierarchy_order,
              COALESCE(r.hierarchy_level, 0) as hierarchy_level,
              (SELECT COUNT(*) FROM users u WHERE u.role_id = r.id AND u.is_active = 1) as user_count
         FROM roles r
        ORDER BY COALESCE(r.hierarchy_order, 9999), r.rowid`).rows;
    res.json({ roles });
  } catch (err) { console.error('[RoleHierarchy]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// کل چارت یکجا ذخیره می‌شود، نه ردیف‌به‌ردیف: کشیدن یک کارت جای همه‌ی
// کارت‌های پایین‌ترش را هم عوض می‌کند، و ذخیره‌ی جزئی یعنی چارتِ نیمه‌جابه‌جا.
router.put('/role-hierarchy', (req, res) => {
  try {
    const items = Array.isArray(req.body && req.body.roles) ? req.body.roles : null;
    if (!items || !items.length) return res.status(400).json({ error: 'فهرست سمت‌ها خالی است' });
    const known = new Set(query('SELECT id FROM roles').rows.map(r => r.id));
    let n = 0;
    items.forEach((it, i) => {
      if (!it || !known.has(it.id)) return;
      const lvl = Math.max(0, Math.min(4, parseInt(it.level, 10) || 0));
      query('UPDATE roles SET hierarchy_order = ?, hierarchy_level = ? WHERE id = ?', [(i + 1) * 10, lvl, it.id]);
      n++;
    });
    res.json({ ok: true, updated: n });
  } catch (err) { console.error('[RoleHierarchy]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.get('/hospitals', (req, res) => {
  const rows = query(`
    SELECT h.id, h.name, h.subdomain, h.is_active, h.subscription_status, h.created_at, h.logo_url,
      (SELECT COUNT(*) FROM users u WHERE u.hospital_id = h.id) as user_count,
      (SELECT COUNT(*) FROM committees c WHERE c.hospital_id = h.id) as committee_count
    FROM hospitals h ORDER BY h.created_at DESC
  `).rows;
  res.json({ hospitals: rows });
});

router.post('/hospitals', [
  body('name').trim().isLength({ min: 2 }).withMessage('نام بیمارستان الزامی است'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  try {
    const id = uuid();
    query(
      `INSERT INTO hospitals (id, name, subdomain, is_active, created_by_super_admin, subscription_status)
       VALUES (?, ?, ?, 1, ?, 'active')`,
      [id, req.body.name.trim(), req.body.subdomain || null, req.superAdmin.id]
    );
    // seed پیش‌فرض‌های بیمارستان جدید (کمیته‌های استاندارد) — همان مهاجرت idempotent که هر بار boot هم اجرا می‌شود
    // اینجا بلافاصله صدا زده می‌شود تا بیمارستان تازه بدون نیاز به ری‌استارت سرور آماده باشد
    try { require('../../database/seed-committees').runMigration(); } catch (e) { console.error('[Super] seed-committees on new hospital failed:', e.message); }
    // رکوردهای «نمونه فرم» هر ماژول. در این لحظه بیمارستان هنوز کاربری ندارد و این فراخوانی بی‌اثر است؛
    // فراخوانی مؤثر بلافاصله پس از ساخت اولین ادمین (مسیر پایین) انجام می‌شود. هر دو idempotent هستند.
    try { require('../../database/seed-examples').seedHospital(id); } catch (e) { console.error('[Super] seed-examples on new hospital failed:', e.message); }
    // پکیج پیش‌فرض بیمارستان تازه: همه‌ی بخش‌ها فعال (idempotent — همان تابعی که boot هم صدا می‌زند)
    try { hospitalFeatures.seedForHospital(id); } catch (e) { console.error('[Super] seed-hospital-features on new hospital failed:', e.message); }

    const h = query('SELECT id, name, subdomain, is_active, created_at FROM hospitals WHERE id = ?', [id]).rows[0];
    res.status(201).json({ hospital: h });
  } catch (err) {
    console.error('[Super] create hospital error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.put('/hospitals/:id', [
  body('is_active').optional().isBoolean(),
  body('name').optional().trim().isLength({ min: 2 }).withMessage('نام بیمارستان نمی‌تواند خالی باشد'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg || 'داده نامعتبر' });
  const h = query('SELECT id FROM hospitals WHERE id = ?', [req.params.id]).rows[0];
  if (!h) return res.status(404).json({ error: 'بیمارستان یافت نشد' });
  if (typeof req.body.is_active === 'boolean') {
    query('UPDATE hospitals SET is_active = ?, updated_at = ? WHERE id = ?',
      [req.body.is_active ? 1 : 0, new Date().toISOString(), req.params.id]);
  }
  if (typeof req.body.name === 'string' && req.body.name.trim()) {
    query('UPDATE hospitals SET name = ?, updated_at = ? WHERE id = ?', [req.body.name.trim(), new Date().toISOString(), req.params.id]);
  }
  const updated = query('SELECT id, name, subdomain, is_active FROM hospitals WHERE id = ?', [req.params.id]).rows[0];
  res.json({ hospital: updated });
});

// لاگ فعالیت یک بیمارستان — فقط فراداده‌ی عملیات (چه کسی، چه کاری، کِی)، نه محتوای درون‌سازمانی
router.get('/hospitals/:id/audit-log', (req, res) => {
  const h = query('SELECT id, name FROM hospitals WHERE id = ?', [req.params.id]).rows[0];
  if (!h) return res.status(404).json({ error: 'بیمارستان یافت نشد' });
  const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
  try {
    const rows = query(`
      SELECT a.id, a.action, a.target_table, a.target_id, a.ip_address, a.created_at,
             u.full_name AS actor_name, u.username AS actor_username
      FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
      WHERE a.hospital_id = ?
      ORDER BY a.created_at DESC, a.rowid DESC
      LIMIT ?`, [req.params.id, limit]).rows;
    res.json({ hospital: h, logs: rows });
  } catch (err) {
    console.error('[Super] audit-log error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// تعیین ادمین برای یک بیمارستان از سمت سوپرادمین.
// ادمین موجود هرگز بازنویسی یا غیرفعال نمی‌شود؛ این مسیر فقط ادمین *جدید* اضافه می‌کند.
router.post('/hospitals/:id/admin', [
  body('full_name').trim().isLength({ min: 2 }).withMessage('نام و نام خانوادگی الزامی است'),
  body('username').trim().isLength({ min: 3 }).withMessage('نام کاربری حداقل ۳ کاراکتر'),
  body('password').isLength({ min: 8 }).withMessage('رمز عبور حداقل ۸ کاراکتر'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  const h = query('SELECT id FROM hospitals WHERE id = ?', [req.params.id]).rows[0];
  if (!h) return res.status(404).json({ error: 'بیمارستان یافت نشد' });
  try {
    const username = req.body.username.trim();
    if (query('SELECT id FROM users WHERE username = ?', [username]).rows[0])
      return res.status(400).json({ error: 'نام کاربری تکراری است' });
    const role = query("SELECT id FROM roles WHERE code = 'admin' AND hospital_id IS NULL").rows[0];
    if (!role) return res.status(500).json({ error: 'نقش ادمین در سامانه یافت نشد' });
    const id = uuid();
    query(`INSERT INTO users (id, hospital_id, full_name, username, password_hash, role_id, is_active)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [id, h.id, req.body.full_name.trim(), username,
       bcrypt.hashSync(req.body.password, config.bcrypt.rounds), role.id]);
    // حالا که بیمارستان صاحب کاربر شد، نمونه‌های هر ماژول ساخته می‌شوند — بدون نیاز به ری‌استارت سرور
    let examples = 0;
    try { examples = require('../../database/seed-examples').seedHospital(h.id); }
    catch (e) { console.error('[Super] seed-examples after admin creation failed:', e.message); }
    res.status(201).json({ user: { id, username, full_name: req.body.full_name.trim() }, examples_seeded: examples });
  } catch (err) {
    console.error('[Super] assign admin error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// تنظیمات سراسری پلتفرم — فعلاً فقط «پسورد اجباری» برای ورود سریع با کلیک روی سمت.
// وقتی روشن است، فرانت به‌جای ورود مستقیم، رمز واقعی همان کاربر را می‌خواهد.
// ===== پست‌های حوزه‌ی مدیریت — database/seed-management-hierarchy.js =====
// فقط سوپرادمین پلتفرم می‌تواند نام/تعداد پست‌ها را تغییر دهد (طبق اسپک کاربر)؛ انتصاب فرد
// به یک پست موجود کار ادمین بیمارستان است (src/routes/api.js: GET/PUT /management/positions)
router.get('/hospitals/:id/management-positions', (req, res) => {
  const h = query('SELECT id FROM hospitals WHERE id = ?', [req.params.id]).rows[0];
  if (!h) return res.status(404).json({ error: 'بیمارستان یافت نشد' });
  try {
    const rows = query(
      `SELECT s.id, s.label, s.sort_order, s.user_id, u.full_name as user_name
       FROM management_position_slots s LEFT JOIN users u ON u.id = s.user_id
       WHERE s.hospital_id = ? ORDER BY s.sort_order, s.created_at`, [req.params.id]).rows;
    res.json({ positions: rows });
  } catch (err) { console.error('[Super] management-positions list error:', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/hospitals/:id/management-positions', [
  body('label').trim().isLength({ min: 1, max: 120 }).withMessage('عنوان پست الزامی است'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  const h = query('SELECT id FROM hospitals WHERE id = ?', [req.params.id]).rows[0];
  if (!h) return res.status(404).json({ error: 'بیمارستان یافت نشد' });
  try {
    const maxRow = query('SELECT MAX(sort_order) as m FROM management_position_slots WHERE hospital_id = ?', [req.params.id]).rows[0];
    const id = uuid();
    query(`INSERT INTO management_position_slots (id, hospital_id, label, sort_order, created_by) VALUES (?, ?, ?, ?, NULL)`,
      [id, req.params.id, req.body.label.trim(), (maxRow.m || 0) + 1]);
    logSuperAction({ superAdminId: req.superAdmin.id, action: 'management_position_created', targetTable: 'management_position_slots', targetId: id, ipAddress: req.ip });
    res.status(201).json({ item: { id } });
  } catch (err) { console.error('[Super] management-position create error:', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.put('/management-positions/:id', [
  body('label').optional().trim().isLength({ min: 1, max: 120 }),
  body('sort_order').optional().isInt(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  const ex = query('SELECT id FROM management_position_slots WHERE id = ?', [req.params.id]).rows[0];
  if (!ex) return res.status(404).json({ error: 'یافت نشد' });
  try {
    const label = req.body.label !== undefined ? String(req.body.label).trim() : null;
    const sortOrder = Number.isFinite(Number(req.body.sort_order)) ? Number(req.body.sort_order) : null;
    query(`UPDATE management_position_slots SET label = COALESCE(?, label), sort_order = COALESCE(?, sort_order), updated_at = datetime('now') WHERE id = ?`,
      [label || null, sortOrder, ex.id]);
    logSuperAction({ superAdminId: req.superAdmin.id, action: 'management_position_renamed', targetTable: 'management_position_slots', targetId: ex.id, ipAddress: req.ip });
    res.json({ status: 'updated' });
  } catch (err) { console.error('[Super] management-position update error:', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.delete('/management-positions/:id', (req, res) => {
  const ex = query('SELECT id FROM management_position_slots WHERE id = ?', [req.params.id]).rows[0];
  if (!ex) return res.status(404).json({ error: 'یافت نشد' });
  try {
    query('DELETE FROM management_position_slots WHERE id = ?', [ex.id]);
    logSuperAction({ superAdminId: req.superAdmin.id, action: 'management_position_deleted', targetTable: 'management_position_slots', targetId: ex.id, ipAddress: req.ip });
    res.json({ status: 'deleted' });
  } catch (err) { console.error('[Super] management-position delete error:', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.get('/settings', (req, res) => {
  const pw = query('SELECT value FROM platform_settings WHERE key = ?', ['require_password']).rows[0];
  const pf = query('SELECT value FROM platform_settings WHERE key = ?', ['profile_fields_enabled']).rows[0];
  const lt = query('SELECT value FROM platform_settings WHERE key = ?', ['light_theme_enabled']).rows[0];
  res.json({
    require_password: pw ? pw.value === '1' : false,
    profile_fields_enabled: pf ? pf.value === '1' : true,
    light_theme_enabled: lt ? lt.value === '1' : false,
  });
});

router.put('/settings', [body('require_password').optional().isBoolean(), body('profile_fields_enabled').optional().isBoolean(), body('light_theme_enabled').optional().isBoolean()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'مقدار نامعتبر است' });
  const out = {};
  if (req.body.require_password !== undefined) {
    query('UPDATE platform_settings SET value = ? WHERE key = ?', [req.body.require_password ? '1' : '0', 'require_password']);
    out.require_password = !!req.body.require_password;
  }
  if (req.body.profile_fields_enabled !== undefined) {
    query('UPDATE platform_settings SET value = ? WHERE key = ?', [req.body.profile_fields_enabled ? '1' : '0', 'profile_fields_enabled']);
    out.profile_fields_enabled = !!req.body.profile_fields_enabled;
  }
  if (req.body.light_theme_enabled !== undefined) {
    query('UPDATE platform_settings SET value = ? WHERE key = ?', [req.body.light_theme_enabled ? '1' : '0', 'light_theme_enabled']);
    out.light_theme_enabled = !!req.body.light_theme_enabled;
  }
  res.json(out);
});

// ============ بکاپ و بازگردانی دیتابیس (سطح پلتفرم — کل فایل SQLite همه‌ی بیمارستان‌ها) ============
const { dbPath, dbBackupsDir: backupsDir } = require('../config/paths');

function timestampTag() {
  const t = tehranNow();
  const p = n => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}-${p(t.getUTCHours())}${p(t.getUTCMinutes())}`;
}

// اسنپ‌شات سازگار از دیتابیس زنده با API رسمی better-sqlite3 (.backup) — نه کپی خام فایل،
// چون در WAL mode ممکن است نوشته‌های در حال انجام هنوز به فایل اصلی flush نشده باشند و کپی خام ناقص/خراب شود.
async function makeBackup(destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  await db.backup(destPath);
  return destPath;
}

router.get('/backup/download', async (req, res) => {
  try {
    fs.mkdirSync(backupsDir, { recursive: true });
    const tmpFile = path.join(backupsDir, `download-${timestampTag()}-${uuid()}.db`);
    await makeBackup(tmpFile);
    const filename = `hospital-backup-${timestampTag()}.db`;
    res.download(tmpFile, filename, async (err) => {
      try { fs.unlinkSync(tmpFile); } catch (e) { /* بی‌اهمیت */ }
      if (err) console.error('[Super] backup download stream error:', err.message);
      if (!err) logSuperAction({ superAdminId: req.superAdmin.id, action: 'platform_backup_download', ipAddress: req.ip });
    });
  } catch (err) {
    console.error('[Super] backup download error:', err.message);
    res.status(500).json({ error: 'خطا در تهیه‌ی بکاپ' });
  }
});

const restoreUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

router.post('/backup/restore', restoreUpload.single('file'), [
  body('confirm_phrase').equals('بازگردانی').withMessage('عبارت تأیید نادرست است'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  if (!req.file) return res.status(400).json({ error: 'فایل بکاپ ارسال نشده' });

  // ۱. اعتبارسنجی: امضای فایل SQLite + جدول hospitals باید موجود باشد — قبل از هرگونه عملیات مخرب
  const header = req.file.buffer.slice(0, 16).toString('utf8');
  if (!header.startsWith('SQLite format 3')) {
    return res.status(400).json({ error: 'فایل ارسال‌شده یک دیتابیس SQLite معتبر نیست' });
  }
  fs.mkdirSync(backupsDir, { recursive: true });
  const uploadedTmp = path.join(backupsDir, `upload-check-${uuid()}.db`);
  fs.writeFileSync(uploadedTmp, req.file.buffer);
  let checkDb;
  try {
    checkDb = new Database(uploadedTmp, { readonly: true, fileMustExist: true });
    const hasHospitals = checkDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='hospitals'").get();
    if (!hasHospitals) {
      return res.status(400).json({ error: 'فایل معتبر است اما ساختار این سامانه را ندارد (جدول hospitals یافت نشد)' });
    }
    // یک کوئری واقعی هم اجرا کن تا از سلامت فایل مطمئن شویم
    checkDb.prepare('SELECT COUNT(*) as c FROM hospitals').get();
  } catch (e) {
    return res.status(400).json({ error: 'فایل دیتابیس خراب یا ناسازگار است: ' + e.message });
  } finally {
    try { checkDb && checkDb.close(); } catch (e) {}
    try { fs.unlinkSync(uploadedTmp + '-wal'); } catch (e) {}
    try { fs.unlinkSync(uploadedTmp + '-shm'); } catch (e) {}
  }

  try {
    // ۲. اسنپ‌شات ایمنی از دیتابیس فعلی، پیش از بازنویسی — همیشه ساخته می‌شود حتی اگر ادمین بکاپ نگرفته باشد
    const safetyPath = path.join(backupsDir, `pre-restore-${timestampTag()}-${uuid()}.db`);
    await makeBackup(safetyPath);

    // ۳. ثبت لاگ پیش از بستن اتصال (بعد از بستن، هیچ query ای روی db قبلی کار نمی‌کند)
    logSuperAction({ superAdminId: req.superAdmin.id, action: 'platform_backup_restore', newValue: { safety_snapshot: path.basename(safetyPath) }, ipAddress: req.ip });

    // ۴. بستن اتصال فعلی و جایگزینی فایل
    db.close();
    fs.copyFileSync(uploadedTmp, dbPath);
    try { fs.unlinkSync(dbPath + '-wal'); } catch (e) {}
    try { fs.unlinkSync(dbPath + '-shm'); } catch (e) {}
    try { fs.unlinkSync(uploadedTmp); } catch (e) {}

    res.json({
      status: 'restored',
      message: 'دیتابیس جایگزین شد. برای اطمینان کامل از پایداری، فرآیند Node.js باید به‌صورت دستی ری‌استارت شود (اتصال قبلی سرور بسته شد و ممکن است بخشی از سرویس تا ری‌استارت پاسخ ندهد).',
      safety_snapshot: path.basename(safetyPath),
      restart_required: true,
    });
  } catch (err) {
    console.error('[Super] backup restore error:', err.message);
    try { fs.unlinkSync(uploadedTmp); } catch (e) {}
    res.status(500).json({ error: 'خطا در بازگردانی: ' + err.message });
  }
});

// ============ لاگ خطاهای سرور (error_log) — فقط سوپرادمین ============
// فیلتر تاریخ (from/to روی created_at، فرمت YYYY-MM-DD) و بیمارستان (hospital_id)
router.get('/error-log', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
    const conds = []; const params = [];
    if (req.query.hospital_id) { conds.push('e.hospital_id = ?'); params.push(req.query.hospital_id); }
    if (req.query.from) { conds.push("date(e.created_at) >= date(?)"); params.push(req.query.from); }
    if (req.query.to) { conds.push("date(e.created_at) <= date(?)"); params.push(req.query.to); }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const rows = query(`
      SELECT e.id, e.hospital_id, h.name AS hospital_name, e.user_id, u.full_name AS user_name,
             e.method, e.route, e.status_code, e.message, e.stack, e.ip_address, e.created_at
      FROM error_log e
      LEFT JOIN hospitals h ON h.id = e.hospital_id
      LEFT JOIN users u ON u.id = e.user_id
      ${where}
      ORDER BY e.created_at DESC, e.rowid DESC
      LIMIT ?`, [...params, limit]).rows;
    res.json({ errors: rows });
  } catch (err) {
    console.error('[Super] error-log list error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// ============ لاگ فعالیت کاربران — کراس-بیمارستان، از audit_log/super_audit_log موجود ============
// چیز جدیدی ردیابی نمی‌شود؛ فقط داده‌ی همین دو جدول (که از قبل در سراسر سامانه پر می‌شود) در یک نمای
// یکجا و قابل فیلتر به سوپرادمین نشان داده می‌شود. اقدامات ورود (موفق/ناموفق) هم در audit_log هست
// (auth.js: user_login, user_login_dev, user_login_failed).
router.get('/activity-log', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 300, 1000);
    const conds = []; const params = [];
    if (req.query.hospital_id) { conds.push('a.hospital_id = ?'); params.push(req.query.hospital_id); }
    if (req.query.from) { conds.push("date(a.created_at) >= date(?)"); params.push(req.query.from); }
    if (req.query.to) { conds.push("date(a.created_at) <= date(?)"); params.push(req.query.to); }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const rows = query(`
      SELECT a.id, a.hospital_id, h.name AS hospital_name, a.user_id,
             u.full_name AS actor_name, u.username AS actor_username, r.title_fa AS actor_role,
             a.action, a.target_table, a.target_id, a.ip_address, a.created_at
      FROM audit_log a
      LEFT JOIN hospitals h ON h.id = a.hospital_id
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN roles r ON r.id = u.role_id
      ${where}
      ORDER BY a.created_at DESC, a.rowid DESC
      LIMIT ?`, [...params, limit]).rows;
    res.json({ activity: rows });
  } catch (err) {
    console.error('[Super] activity-log error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// خلاصه‌ی آخرین ورود هر کاربر (کراس-بیمارستان) — برای فیلتر بیمارستان و نمایش جدول کاربران
router.get('/user-summary', (req, res) => {
  try {
    const conds = ['1=1']; const params = [];
    if (req.query.hospital_id) { conds.push('u.hospital_id = ?'); params.push(req.query.hospital_id); }
    const rows = query(`
      SELECT u.id, u.hospital_id, h.name AS hospital_name, u.full_name, u.username, u.is_active,
             u.last_login_at, u.failed_login_attempts, u.locked_until, r.title_fa AS role_title, r.code AS role_code
      FROM users u
      JOIN hospitals h ON h.id = u.hospital_id
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE ${conds.join(' AND ')}
      ORDER BY u.last_login_at DESC NULLS LAST, u.full_name`, params).rows;
    res.json({ users: rows });
  } catch (err) {
    console.error('[Super] user-summary error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// ============ «کنترل کامل» — قابلیت‌های واقعاً غایب که به‌عنوان اپراتور پلتفرم منطقی است داشته باشد ============
// همه‌ی این‌ها audit‌لاگ می‌شوند (super_audit_log) و پشت superAdminRequired هستند.

// ۱. بازنشانی رمز عبور هر کاربر در هر بیمارستان — بدون دانستن رمز فعلی (مثلاً کاربر قفل شده/رمز فراموشی بدون IT محلی)
router.put('/users/:id/reset-password', [
  body('new_password').isLength({ min: 8 }).withMessage('رمز جدید حداقل ۸ کاراکتر'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  const u = query('SELECT id, hospital_id, username FROM users WHERE id = ?', [req.params.id]).rows[0];
  if (!u) return res.status(404).json({ error: 'کاربر یافت نشد' });
  try {
    const hash = bcrypt.hashSync(req.body.new_password, config.bcrypt.rounds);
    query('UPDATE users SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL, updated_at = datetime(\'now\') WHERE id = ?', [hash, u.id]);
    logSuperAction({ superAdminId: req.superAdmin.id, action: 'user_password_reset', targetTable: 'users', targetId: u.id, ipAddress: req.ip });
    res.json({ status: 'reset' });
  } catch (err) { console.error('[Super] reset-password error:', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ۲. فعال/غیرفعال‌سازی هر کاربر (نه فقط کل بیمارستان) — مثلاً کارمند خاطی/خروجی بدون دسترسی به ادمین محلی
router.put('/users/:id/status', [
  body('is_active').isBoolean(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'مقدار نامعتبر' });
  const u = query('SELECT id FROM users WHERE id = ?', [req.params.id]).rows[0];
  if (!u) return res.status(404).json({ error: 'کاربر یافت نشد' });
  try {
    query('UPDATE users SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?', [req.body.is_active ? 1 : 0, u.id]);
    logSuperAction({ superAdminId: req.superAdmin.id, action: req.body.is_active ? 'user_activated' : 'user_deactivated', targetTable: 'users', targetId: u.id, ipAddress: req.ip });
    res.json({ status: 'updated' });
  } catch (err) { console.error('[Super] user-status error:', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ۳. تغییر نقش هر کاربر (فقط بین نقش‌های سراسری/همان بیمارستان) — مثلاً ارتقا/تنزل نقش وقتی ادمین محلی
// خودش دچار مشکل شده یا هیچ ادمینی روی آن بیمارستان فعال نیست
router.put('/users/:id/role', [
  body('role_id').isString().notEmpty(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'مقدار نامعتبر' });
  const u = query('SELECT id, hospital_id FROM users WHERE id = ?', [req.params.id]).rows[0];
  if (!u) return res.status(404).json({ error: 'کاربر یافت نشد' });
  const role = query('SELECT id, title_fa FROM roles WHERE id = ? AND (hospital_id IS NULL OR hospital_id = ?)', [req.body.role_id, u.hospital_id]).rows[0];
  if (!role) return res.status(400).json({ error: 'نقش نامعتبر برای این بیمارستان' });
  try {
    query('UPDATE users SET role_id = ?, updated_at = datetime(\'now\') WHERE id = ?', [role.id, u.id]);
    logSuperAction({ superAdminId: req.superAdmin.id, action: 'user_role_changed', targetTable: 'users', targetId: u.id, newValue: { role_id: role.id, role_title: role.title_fa }, ipAddress: req.ip });
    res.json({ status: 'updated' });
  } catch (err) { console.error('[Super] user-role error:', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// فهرست کاربران یک بیمارستان (پیش‌نیاز سه اقدام بالا) + نقش‌های قابل‌انتخاب برای آن بیمارستان
router.get('/hospitals/:id/users', (req, res) => {
  const h = query('SELECT id FROM hospitals WHERE id = ?', [req.params.id]).rows[0];
  if (!h) return res.status(404).json({ error: 'بیمارستان یافت نشد' });
  try {
    const users = query(`
      SELECT u.id, u.full_name, u.username, u.is_active, u.last_login_at, u.role_id,
             r.title_fa AS role_title
      FROM users u LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.hospital_id = ? ORDER BY u.full_name`, [req.params.id]).rows;
    const roles = query(`SELECT id, code, title_fa FROM roles WHERE hospital_id IS NULL OR hospital_id = ? ORDER BY title_fa`, [req.params.id]).rows;
    res.json({ users, roles });
  } catch (err) { console.error('[Super] hospital users list error:', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ============ امکانات و پکیج هر بیمارستان (hospital_features) — پایه‌ی مدل اشتراک/پکیج فروشی ============
// فهرست کانونی کلیدها + برچسب فارسی از database/seed-hospital-features.js می‌آید تا این‌جا و صفحه‌ی
// سوپرادمین دقیقاً یک منبع حقیقت داشته باشند (نه یک کپی جدا که ممکن است از هم جدا بیفتد).
// تنظیمات دستیار هوشمند برای یک بیمارستان — فقط سوپرادمین کلید API را می‌بیند/می‌نویسد.
// خودِ کلید هرگز کامل به فرانت برنمی‌گردد، فقط چند نویسه‌ی آخرش برای تشخیصِ
// «همان کلید قبلی است یا عوض شده».
router.get('/hospitals/:id/assistant', (req, res) => {
  const h = query('SELECT id FROM hospitals WHERE id = ?', [req.params.id]).rows[0];
  if (!h) return res.status(404).json({ error: 'بیمارستان یافت نشد' });
  try {
    let s = query('SELECT * FROM assistant_hospital_settings WHERE hospital_id = ?', [req.params.id]).rows[0];
    if (!s) {
      query('INSERT INTO assistant_hospital_settings (hospital_id) VALUES (?)', [req.params.id]);
      s = query('SELECT * FROM assistant_hospital_settings WHERE hospital_id = ?', [req.params.id]).rows[0];
    }
    res.json({
      provider: s.provider, model: s.model, base_url: s.base_url,
      chat_enabled: s.chat_enabled === undefined ? 1 : s.chat_enabled,
      api_key_set: !!s.api_key, api_key_hint: s.api_key ? '…' + s.api_key.slice(-4) : null,
      monthly_token_budget: s.monthly_token_budget,
      tokens_used_this_period: s.tokens_used_this_period,
      // پیش‌تنظیم‌ها به فرانت می‌روند تا انتخابِ فروشنده خودش نشانی و مدل
      // پیش‌فرض را پر کند؛ کاربر نباید نشانی z.ai یا AvalAI را حفظ باشد.
      presets: Object.fromEntries(Object.entries(AI_PRESETS).map(([k, v]) => [k, {
        label: v.label, base_url: v.baseUrl || null, model: v.model || null,
        needs_base_url: !!v.needsBaseUrl, key_hint: v.keyHint || null,
      }])),
    });
  } catch (err) { console.error('[Super] assistant settings get error:', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// فهرست فروشنده‌ها از خودِ آداپتور می‌آید، نه یک کپیِ دستی این‌جا — وگرنه افزودن
// فروشنده‌ی تازه یعنی دو جا را باید یادت باشد عوض کنی و یکی‌شان جا می‌ماند.
const ASSIST_PROVIDERS = Object.keys(AI_PRESETS);

router.put('/hospitals/:id/assistant', [
  body('provider').optional().isIn(ASSIST_PROVIDERS),
  body('model').optional({ nullable: true }).isString(),
  body('api_key').optional({ nullable: true }).isString(),
  body('base_url').optional({ nullable: true }).isString(),
  // بدون سقفِ بالا — کارفرما گفته می‌خواهد اعداد دلخواه (۲۰۰هزار، یک میلیارد، …) وارد و تست کند
  body('monthly_token_budget').optional().isInt({ min: 1000 }),
  body('chat_enabled').optional().isBoolean(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'مقدار نامعتبر' });
  const h = query('SELECT id FROM hospitals WHERE id = ?', [req.params.id]).rows[0];
  if (!h) return res.status(404).json({ error: 'بیمارستان یافت نشد' });
  try {
    query('INSERT OR IGNORE INTO assistant_hospital_settings (hospital_id) VALUES (?)', [req.params.id]);
    const sets = [], vals = [];
    if (req.body.provider !== undefined) { sets.push('provider = ?'); vals.push(req.body.provider); }
    if (req.body.model !== undefined) { sets.push('model = ?'); vals.push(req.body.model || null); }
    if (req.body.base_url !== undefined) { sets.push('base_url = ?'); vals.push(req.body.base_url || null); }
    // رشته‌ی خالی یعنی «کلید فعلی دست‌نخورده بماند»، نه پاک‌شدنش — فرانت کلید واقعی
    // را دوباره نمایش نمی‌دهد، پس فیلد خالی هرگز نباید یعنی «کاربر عمداً پاک کرد»
    if (req.body.api_key) { sets.push('api_key = ?'); vals.push(req.body.api_key); }
    if (req.body.monthly_token_budget !== undefined) { sets.push('monthly_token_budget = ?'); vals.push(req.body.monthly_token_budget); }
    if (req.body.chat_enabled !== undefined) { sets.push('chat_enabled = ?'); vals.push(req.body.chat_enabled ? 1 : 0); }
    if (sets.length) {
      sets.push("updated_at = datetime('now')");
      query(`UPDATE assistant_hospital_settings SET ${sets.join(', ')} WHERE hospital_id = ?`, [...vals, req.params.id]);
    }
    res.json({ ok: true });
  } catch (err) { console.error('[Super] assistant settings update error:', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// تستِ اتصال با مقادیرِ فعلیِ فرم — پیش از ذخیره. عمداً از خودِ مقادیرِ body
// استفاده می‌کند نه از ردیفِ ذخیره‌شده، تا کاربر بتواند لینک/مدل/توکنِ تازه را
// امتحان کند بدون اینکه اول مجبور باشد ذخیره کند. اگر api_key در فرم خالی باشد
// (یعنی کاربر می‌خواهد کلید ذخیره‌شده را تست کند)، همان کلیدِ دیتابیس برداشته می‌شود.
// تغییر رمز خودِ سوپرادمین. رمز پیش‌فرض (SuperAdmin@2026) در مخزن پیداست و تا
// امروز هیچ راهی برای عوض‌کردنش از داخل برنامه نبود — یعنی هرکسی که آدرس پنل را
// حدس می‌زد به کل پلتفرم و همه‌ی بیمارستان‌ها دسترسی کامل داشت.
// رمز فعلی دوباره پرسیده می‌شود: نشستِ باز روی یک کامپیوترِ رهاشده نباید برای
// قفل‌کردنِ حساب کافی باشد.
router.post('/change-password', [
  body('current_password').notEmpty().withMessage('رمز فعلی الزامی است'),
  body('new_password').isLength({ min: 10 }).withMessage('رمز تازه باید حداقل ۱۰ نویسه باشد'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  try {
    const me = query('SELECT id, password_hash FROM super_admins WHERE id = ?', [req.superAdmin.id]).rows[0];
    if (!me) return res.status(404).json({ error: 'حساب یافت نشد' });
    if (!await bcrypt.compare(req.body.current_password, me.password_hash)) {
      return res.status(401).json({ error: 'رمز فعلی درست نیست' });
    }
    // رمز تازه‌ای که همان رمز فعلی باشد یعنی کاربر فکر می‌کند عوضش کرده ولی نکرده
    if (await bcrypt.compare(req.body.new_password, me.password_hash)) {
      return res.status(400).json({ error: 'رمز تازه با رمز فعلی یکی است' });
    }
    const hash = await bcrypt.hash(req.body.new_password, config.bcrypt.rounds);
    query("UPDATE super_admins SET password_hash = ? WHERE id = ?", [hash, me.id]);
    // خودِ رمز هرگز لاگ نمی‌شود — فقط اینکه عوض شد
    logSuperAction({ superAdminId: me.id, action: 'super_password_changed', targetTable: 'super_admins',
      targetId: me.id, ipAddress: req.ip });
    res.json({ ok: true });
  } catch (err) { console.error('[Super] change-password error:', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/hospitals/:id/assistant/test', [
  body('provider').isIn(ASSIST_PROVIDERS).withMessage('فروشنده نامعتبر است'),
  body('model').optional({ nullable: true }).isString(),
  body('api_key').optional({ nullable: true }).isString(),
  body('base_url').optional({ nullable: true }).isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ ok: false, error: 'مقدار نامعتبر' });
  const h = query('SELECT id FROM hospitals WHERE id = ?', [req.params.id]).rows[0];
  if (!h) return res.status(404).json({ ok: false, error: 'بیمارستان یافت نشد' });
  try {
    const { provider, model, base_url } = req.body;
    let apiKey = req.body.api_key;
    if (!apiKey) {
      const s = query('SELECT api_key FROM assistant_hospital_settings WHERE hospital_id = ?', [req.params.id]).rows[0];
      apiKey = s && s.api_key;
    }
    const t0 = Date.now();
    const result = await chatComplete({
      provider, apiKey, model, baseUrl: base_url,
      systemPrompt: 'این یک پیام آزمایشیِ اتصال است. فقط با یک کلمه‌ی کوتاه (مثلاً «سلام») پاسخ بده.',
      userText: 'تست اتصال',
    });
    res.json({ ok: true, reply: result.text, tokens: result.tokens, ms: Date.now() - t0, model: result.model || null });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// لاگ کامل گفت‌وگوهای «دانا» — کارفرما صریح خواست: سوپرادمین بتواند پایش کند،
// از جمله وقتی سؤالی بیرون از حوزه‌ی نقشِ کاربر مسدود شده (roleBlocked/offTopic
// در assistant-chat.js). کاربران عادی همچنان فقط گفت‌وگوی خودشان را می‌بینند —
// GET /api/assistant/conversations با WHERE user_id فیلتر شده، این‌جا برعکس
// است: سوپرادمین به‌عمد بدون آن فیلتر، کل مرکز را می‌بیند.
router.get('/hospitals/:id/assistant/conversations', (req, res) => {
  const h = query('SELECT id FROM hospitals WHERE id = ?', [req.params.id]).rows[0];
  if (!h) return res.status(404).json({ error: 'بیمارستان یافت نشد' });
  try {
    const rows = query(
      `SELECT c.id, c.title, c.updated_at, u.full_name, u.username, r.title_fa AS role_title,
              (SELECT COUNT(*) FROM assistant_messages m WHERE m.conversation_id = c.id) AS message_count
       FROM assistant_conversations c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE c.hospital_id = ?
       ORDER BY c.updated_at DESC LIMIT 300`,
      [req.params.id]).rows;
    res.json({ conversations: rows });
  } catch (err) { console.error('[Super] assistant conversations log error:', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.get('/hospitals/:id/assistant/conversations/:cid/messages', (req, res) => {
  const c = query('SELECT c.id, u.full_name, u.username, r.title_fa AS role_title FROM assistant_conversations c ' +
    'JOIN users u ON u.id = c.user_id LEFT JOIN roles r ON r.id = u.role_id ' +
    'WHERE c.id = ? AND c.hospital_id = ?', [req.params.cid, req.params.id]).rows[0];
  if (!c) return res.status(404).json({ error: 'گفت‌وگو یافت نشد' });
  try {
    const messages = query(
      `SELECT role, content, source, tokens_used, created_at FROM assistant_messages
       WHERE conversation_id = ? ORDER BY created_at ASC`, [req.params.cid]).rows;
    res.json({ user: { full_name: c.full_name, username: c.username, role_title: c.role_title }, messages });
  } catch (err) { console.error('[Super] assistant messages log error:', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.get('/hospitals/:id/features', (req, res) => {
  const h = query('SELECT id FROM hospitals WHERE id = ?', [req.params.id]).rows[0];
  if (!h) return res.status(404).json({ error: 'بیمارستان یافت نشد' });
  try {
    hospitalFeatures.seedForHospital(req.params.id); // برای بیمارستانی که هنوز seed نشده (مثلاً از قبل migration ساخته شده) امن است
    const rows = query('SELECT feature_key, enabled FROM hospital_features WHERE hospital_id = ?', [req.params.id]).rows;
    const enabledByKey = {}; rows.forEach(r => { enabledByKey[r.feature_key] = !!r.enabled; });
    const features = hospitalFeatures.FEATURE_KEYS.map(f => ({
      key: f.key, label_fa: f.label_fa, enabled: enabledByKey[f.key] !== undefined ? enabledByKey[f.key] : true,
    }));
    res.json({ features });
  } catch (err) { console.error('[Super] hospital features list error:', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.put('/hospitals/:id/features', [
  body('feature_key').isString().notEmpty(),
  body('enabled').isBoolean(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'مقدار نامعتبر' });
  const h = query('SELECT id FROM hospitals WHERE id = ?', [req.params.id]).rows[0];
  if (!h) return res.status(404).json({ error: 'بیمارستان یافت نشد' });
  const key = req.body.feature_key;
  if (!hospitalFeatures.FEATURE_KEY_SET.has(key)) return res.status(400).json({ error: 'کلید بخش نامعتبر است' });
  try {
    hospitalFeatures.seedForHospital(req.params.id);
    query('UPDATE hospital_features SET enabled = ?, updated_at = datetime(\'now\') WHERE hospital_id = ? AND feature_key = ?',
      [req.body.enabled ? 1 : 0, req.params.id, key]);
    logSuperAction({
      superAdminId: req.superAdmin.id, action: req.body.enabled ? 'hospital_feature_enabled' : 'hospital_feature_disabled',
      targetTable: 'hospital_features', targetId: req.params.id, newValue: { feature: key, enabled: !!req.body.enabled }, ipAddress: req.ip,
    });
    res.json({ status: 'updated', feature_key: key, enabled: !!req.body.enabled });
  } catch (err) { console.error('[Super] hospital feature update error:', err); res.status(500).json({ error: 'خطای سرور' }); }
});

/* =====================================================================
   دستیارِ توسعه — سوپرادمین از داخل پنل خودش با یک AI جدا (کلیدِ خودش،
   مثلاً AvalAI) درباره‌ی کدِ پروژه گفت‌وگو می‌کند. مدل فایل‌های واقعی را
   می‌بیند (فقط خواندن، از دیسکِ همین کانتینر) و اگر پیشنهادِ تغییر داشت،
   محتوای کاملِ فایل را در یک بلوکِ کدِ برچسب‌دار می‌دهد؛ سوپرادمین آن را
   می‌بیند، لازم شد ویرایش می‌کند، و فقط با کلیکِ صریح به یک شاخه‌ی کاری
   روی گیت‌هاب کامیت می‌شود — هرگز مستقیم روی دیسک نمی‌نویسد (چون با
   ریدیپلوی می‌پرد) و هرگز مستقیم روی main نمی‌رود (github-commit.js این
   را قفل کرده).
   ===================================================================== */
try { require('../../database/seed-dev-assistant').runMigration(); } catch (e) { console.error('[Super] seed-dev-assistant failed:', e.message); }
const githubCommit = require('../services/github-commit');
const devContext = require('../services/dev-context');
const REPO_ROOT = path.join(__dirname, '..', '..');

function getDevSettings() {
  return query("SELECT * FROM superadmin_dev_settings WHERE id = 'default'").rows[0];
}

router.get('/dev/settings', (req, res) => {
  try {
    const s = getDevSettings();
    res.json({
      provider: s.provider, model: s.model, base_url: s.base_url,
      api_key_set: !!s.api_key, api_key_hint: s.api_key ? '…' + s.api_key.slice(-4) : null,
      monthly_token_budget: s.monthly_token_budget, tokens_used_this_period: s.tokens_used_this_period,
      github_owner: s.github_owner, github_repo: s.github_repo,
      github_default_branch: s.github_default_branch || 'main', github_api_base: s.github_api_base,
      github_token_set: !!s.github_token,
      presets: Object.fromEntries(Object.entries(AI_PRESETS).map(([k, v]) => [k, {
        label: v.label, base_url: v.baseUrl || null, model: v.model || null,
        needs_base_url: !!v.needsBaseUrl, key_hint: v.keyHint || null,
      }])),
    });
  } catch (err) { console.error('[Super] dev settings get error:', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.put('/dev/settings', [
  body('provider').optional().isIn(ASSIST_PROVIDERS),
  body('model').optional({ nullable: true }).isString(),
  body('api_key').optional({ nullable: true }).isString(),
  body('base_url').optional({ nullable: true }).isString(),
  body('monthly_token_budget').optional().isInt({ min: 1000 }),
  body('github_token').optional({ nullable: true }).isString(),
  body('github_owner').optional({ nullable: true }).isString(),
  body('github_repo').optional({ nullable: true }).isString(),
  body('github_default_branch').optional({ nullable: true }).isString(),
  body('github_api_base').optional({ nullable: true }).isString(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'مقدار نامعتبر' });
  try {
    const sets = [], vals = [];
    const b = req.body;
    if (b.provider !== undefined) { sets.push('provider = ?'); vals.push(b.provider); }
    if (b.model !== undefined) { sets.push('model = ?'); vals.push(b.model || null); }
    if (b.base_url !== undefined) { sets.push('base_url = ?'); vals.push(b.base_url || null); }
    if (b.api_key) { sets.push('api_key = ?'); vals.push(b.api_key); }
    if (b.monthly_token_budget !== undefined) { sets.push('monthly_token_budget = ?'); vals.push(b.monthly_token_budget); }
    if (b.github_token) { sets.push('github_token = ?'); vals.push(b.github_token); }
    if (b.github_owner !== undefined) { sets.push('github_owner = ?'); vals.push(b.github_owner || null); }
    if (b.github_repo !== undefined) { sets.push('github_repo = ?'); vals.push(b.github_repo || null); }
    if (b.github_default_branch !== undefined) { sets.push('github_default_branch = ?'); vals.push(b.github_default_branch || 'main'); }
    if (b.github_api_base !== undefined) { sets.push('github_api_base = ?'); vals.push(b.github_api_base || null); }
    if (sets.length) {
      sets.push("updated_at = datetime('now')");
      query(`UPDATE superadmin_dev_settings SET ${sets.join(', ')} WHERE id = 'default'`, vals);
    }
    logSuperAction({ superAdminId: req.superAdmin.id, action: 'dev_settings_updated', ipAddress: req.ip });
    res.json({ ok: true });
  } catch (err) { console.error('[Super] dev settings update error:', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/dev/test', [
  body('provider').isIn(ASSIST_PROVIDERS).withMessage('فروشنده نامعتبر است'),
  body('model').optional({ nullable: true }).isString(),
  body('api_key').optional({ nullable: true }).isString(),
  body('base_url').optional({ nullable: true }).isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ ok: false, error: 'مقدار نامعتبر' });
  try {
    const { provider, model, base_url } = req.body;
    let apiKey = req.body.api_key;
    if (!apiKey) apiKey = getDevSettings().api_key;
    const t0 = Date.now();
    const result = await chatComplete({
      provider, apiKey, model, baseUrl: base_url,
      systemPrompt: 'این یک پیام آزمایشیِ اتصال است. فقط با یک کلمه‌ی کوتاه (مثلاً «سلام») پاسخ بده.',
      userText: 'تست اتصال',
    });
    res.json({ ok: true, reply: result.text, tokens: result.tokens, ms: Date.now() - t0, model: result.model || null });
  } catch (err) { res.json({ ok: false, error: err.message }); }
});

// خواندنِ یک فایلِ واقعی از دیسکِ همین کانتینر — فقط خواندن، برای زمینه‌ی
// گفت‌وگو یا نمایشِ «قبل» پیش از کامیت. مسیر باید داخلِ ریشه‌ی مخزن بماند.
function safeRepoPath(rel) {
  const clean = String(rel || '').trim().replace(/^\/+/, '');
  if (!clean || clean.includes('..')) throw new Error('مسیر نامعتبر است');
  const full = path.join(REPO_ROOT, clean);
  if (!full.startsWith(REPO_ROOT + path.sep)) throw new Error('مسیر نامعتبر است');
  return full;
}

router.get('/dev/file', (req, res) => {
  try {
    const full = safeRepoPath(req.query.path);
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return res.status(404).json({ error: 'فایل یافت نشد' });
    const stat = fs.statSync(full);
    if (stat.size > 400 * 1024) return res.status(400).json({ error: 'فایل خیلی بزرگ است (بیش از ۴۰۰ کیلوبایت)' });
    res.json({ path: req.query.path, content: fs.readFileSync(full, 'utf8') });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.get('/dev/messages', (req, res) => {
  try {
    const rows = query(`SELECT id, role, content, created_at FROM dev_assistant_messages
      WHERE super_admin_id = ? ORDER BY created_at ASC LIMIT 200`, [req.superAdmin.id]).rows;
    res.json({ messages: rows });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// نقشه‌ی پروژه یک‌بار ساخته و کش می‌شود (کدها بین دو دیپلوی عوض نمی‌شوند).
// اولین درخواست کمی کندتر است، بقیه رایگان.
let _projectMap = null;
function projectMap() {
  if (_projectMap === null) {
    try { _projectMap = devContext.buildProjectMap(); }
    catch (e) { console.error('[Super] project map failed:', e.message); _projectMap = ''; }
  }
  return _projectMap;
}

const DEV_SYSTEM_PROMPT_BASE =
  'تو دستیارِ توسعه‌ی پروژه‌ی «پلتفرم اعتباربخشی بیمارستانی» هستی — یک اپلیکیشنِ Node.js/Express با ' +
  'SQLite (better-sqlite3) و فرانت‌اندِ vanilla JS بدون فریم‌ورک، رابطِ فارسی و راست‌به‌چپ. ' +
  'فقط با سوپرادمینِ پلتفرم صحبت می‌کنی، نه کاربرِ بیمارستان.\n\n' +
  'نقشه‌ی کاملِ ساختارِ پروژه پایین آمده و فایل‌هایی که به سؤال مربوط بوده‌اند خودکار ضمیمه شده‌اند. ' +
  'پس هرگز نگو «فایل را برایم بفرست» یا «ساختار پروژه را نمی‌دانم» — اگر فایلِ لازم ضمیمه نشده، ' +
  'صریح بگو دقیقاً کدام مسیر را لازم داری و چرا.\n\n' +
  'قواعدِ پاسخ:\n' +
  '۱) به فارسی و کوتاه توضیح بده؛ کدِ نمونه‌ی بی‌ربط ننویس.\n' +
  '۲) بر همان فایل‌های ضمیمه تکیه کن، حدس نزن. اگر مطمئن نیستی، بگو مطمئن نیستی.\n' +
  '۳) اگر پیشنهادِ تغییرِ کد داری، محتوای *کاملِ* فایلِ نهایی (نه دیف) را داخلِ یک بلوکِ کد با ' +
  'این فرمتِ دقیق بده تا مستقیم قابلِ کامیت باشد:\n' +
  '```file:مسیر/نسبیِ/فایل.js\n...محتوای کاملِ فایل...\n```\n' +
  'برای هر فایل یک بلوکِ جدا. اگر تغییر لازم نیست، هیچ بلوکی نده.\n' +
  '۴) سبکِ کدِ همین پروژه را نگه دار: کامنتِ فارسی که *چرا* را توضیح می‌دهد، نه *چه*.';

function devSystemPrompt() {
  const map = projectMap();
  return DEV_SYSTEM_PROMPT_BASE + (map ? '\n\n' + map : '');
}

function extractFileProposals(text) {
  const re = /```file:([^\n`]+)\n([\s\S]*?)```/g;
  const out = []; let m;
  while ((m = re.exec(text || ''))) out.push({ path: m[1].trim(), content: m[2].replace(/\n$/, '') });
  return out;
}

router.post('/dev/chat', [
  body('message').isString().isLength({ min: 1, max: 8000 }),
  body('context_paths').optional().isArray({ max: 6 }),
  body('attachment_text').optional({ nullable: true }).isString(),
  body('attachment_name').optional({ nullable: true }).isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'پیام نامعتبر است' });
  try {
    const s = getDevSettings();
    if (!s.api_key && s.provider !== 'custom') {
      return res.status(400).json({ error: 'کلید API دستیارِ توسعه تنظیم نشده — پایین همین صفحه تنظیم کنید' });
    }
    if (s.tokens_used_this_period >= s.monthly_token_budget) {
      return res.status(429).json({ error: 'سقفِ توکنِ ماهانه‌ی دستیارِ توسعه پر شده است' });
    }
    // فایل‌های مرتبط خودکار انتخاب می‌شوند؛ آنچه سوپرادمین صریح خواسته همیشه اول است.
    // پیش از این، اگر کاربر مسیری تایپ نمی‌کرد مدل هیچ فایلی نمی‌دید و جوابِ کلی می‌داد.
    let attached = [];
    try { attached = devContext.pickRelevantFiles(req.body.message, req.body.context_paths || [], 5); }
    catch (e) { console.error('[Super] pickRelevantFiles failed:', e.message); }
    let contextBlock = attached.map(f =>
      `\n\n--- فایل: ${f.path}  (${f.why}) ---\n${f.content}`).join('');
    // متنِ استخراج‌شده از عکس/PDFی که سوپرادمین آپلود کرده
    if (req.body.attachment_text) {
      contextBlock += `\n\n--- فایلِ پیوستِ سوپرادمین (${String(req.body.attachment_name || 'پیوست').slice(0, 120)}) ---\n`
        + String(req.body.attachment_text).slice(0, 20000);
    }
    const history = query(`SELECT role, content FROM dev_assistant_messages
      WHERE super_admin_id = ? ORDER BY created_at DESC LIMIT 16`, [req.superAdmin.id]).rows.reverse();

    query('INSERT INTO dev_assistant_messages (id, super_admin_id, role, content) VALUES (?, ?, ?, ?)',
      [uuid(), req.superAdmin.id, 'user', req.body.message]);

    const result = await chatComplete({
      provider: s.provider, apiKey: s.api_key, model: s.model, baseUrl: s.base_url,
      systemPrompt: devSystemPrompt(),
      userText: req.body.message + contextBlock,
      history,
    });

    query('INSERT INTO dev_assistant_messages (id, super_admin_id, role, content, tokens_used) VALUES (?, ?, ?, ?, ?)',
      [uuid(), req.superAdmin.id, 'assistant', result.text, result.tokens || 0]);
    if (result.tokens) {
      query(`UPDATE superadmin_dev_settings SET tokens_used_this_period = tokens_used_this_period + ? WHERE id = 'default'`, [result.tokens]);
    }
    res.json({ reply: result.text, tokens: result.tokens, model: result.model,
      proposals: extractFileProposals(result.text),
      used_files: attached.map(f => ({ path: f.path, why: f.why })) });
  } catch (err) { console.error('[Super] dev chat error:', err); res.status(400).json({ error: err.message || 'خطای سرور' }); }
});

// آپلودِ عکس/PDF در گفت‌وگوی دستیارِ توسعه.
// کارفرما خواست بتواند اسکرین‌شاتِ خطا یا یک PDF مشخصات را همان‌جا بگذارد.
// چون chatComplete این پروژه متنی است (و همه‌ی فروشنده‌ها vision ندارند)،
// فایل اول با همان مسیرِ extractText به متن تبدیل می‌شود و متنش به گفت‌وگو
// می‌رود — همان کاری که برای خواندنِ فرم‌ها از قبل ساخته شده بود؛ مسیرِ
// موازیِ تازه‌ای ساخته نشد.
const devUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });
router.post('/dev/attach', devUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'فایلی فرستاده نشد' });
  try {
    const s = getDevSettings();
    if (!s.api_key && s.provider !== 'custom') {
      return res.status(400).json({ error: 'کلید API دستیارِ توسعه تنظیم نشده' });
    }
    const out = await extractText({
      provider: s.provider, apiKey: s.api_key, model: s.model, baseUrl: s.base_url,
      buffer: req.file.buffer, mimeType: req.file.mimetype,
    });
    if (out.tokens) {
      query(`UPDATE superadmin_dev_settings SET tokens_used_this_period = tokens_used_this_period + ?
        WHERE id = 'default'`, [out.tokens]);
    }
    if (!out.text || !out.text.trim()) {
      return res.status(422).json({ error: 'متنی در این فایل پیدا نشد — اگر اسکرین‌شات است، کیفیتش را بالا ببرید' });
    }
    res.json({ name: req.file.originalname, text: out.text, tokens: out.tokens, pageCount: out.pageCount });
  } catch (err) {
    console.error('[Super] dev attach error:', err.message);
    res.status(400).json({ error: err.message || 'خطا در خواندن فایل' });
  }
});

// نقشه‌ی پروژه برای نمایش در رابط کاربری — تا سوپرادمین ببیند دستیار دقیقاً
// چه چیزی از پروژه می‌داند و لازم نباشد به آن اعتماد کور کند.
router.get('/dev/project-map', (req, res) => {
  try { res.json({ map: projectMap() }); }
  catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// کامیتِ نهایی — فقط با کلیکِ صریحِ سوپرادمین، هرگز خودکار. متنِ فایل از
// همان‌چیزی می‌آید که سوپرادمین در فرم دیده/ویرایش کرده، نه مستقیم از
// خروجیِ مدل.
router.post('/dev/commit', [
  body('path').isString().isLength({ min: 1 }),
  body('content').isString(),
  body('branch').isString().isLength({ min: 1 }),
  body('message').optional({ nullable: true }).isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'ورودی نامعتبر است' });
  try {
    const s = getDevSettings();
    const result = await githubCommit.commitFile({
      githubToken: s.github_token, owner: s.github_owner, repo: s.github_repo,
      apiBase: s.github_api_base, baseBranch: s.github_default_branch || 'main',
      branch: req.body.branch, path: req.body.path, content: req.body.content, message: req.body.message,
    });
    logSuperAction({
      superAdminId: req.superAdmin.id, action: 'dev_commit', targetTable: 'github',
      newValue: { path: result.path, branch: result.branch, commit: result.commitSha }, ipAddress: req.ip,
    });
    res.json(result);
  } catch (err) { console.error('[Super] dev commit error:', err); res.status(400).json({ error: err.message || 'خطای کامیت' }); }
});

module.exports = router;

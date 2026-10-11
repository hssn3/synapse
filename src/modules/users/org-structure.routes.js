/**
 * Users Org Structure & Divisions Routes
 * Part of Modular Monolith (Clean Architecture) — Project 313
 */
const express = require('express');
const router = express.Router();
const common = require('../common');
const {
  query, db, authRequired, requirePermission, requireAnyPermission,
  hospitalScope, requireFeature, scopeFor, axisCodeOf, measureAllowed,
  jalaliYearRange, jalaliMonthRange, safeYear, toGregorian, toJalali,
  todayJalali, JMONTHS, tehranNow, tehranTodayStr, TEHRAN_OFFSET_MS,
  logAction, uuid, parseJSON, safeArray, buildTrackingCode,
  bcrypt, config,
  applyYearFilter, loadOverrides, evaluatePolicy,
  upload, uploadSingle, uploadMultiple, compressImage,
  path, fs, RULE_TYPES, RULE_TYPE_FA, reminderItemsFor,
  timelineFor, dismissMilestone, snoozeMilestone, setMilestoneState,
  assistantNext, assistantReview, periodProgress,
  getSmartDecisions, myWork, assistantChat,
  extractText, classifyDocument, extractFlowchart,
  crudNormalize,
  crudHasUpdatedAt,
  TIME_RE,
  DATE_RE,
  statusYear,
  codeCmp,
  sortTree,
  canAssignRole,
  hasPerm,
  normFa,
  matchFa,
  truthy,
  MER_EVAL_STATUSES,
  merValidate,
  merInsert,
  originalName,
  storeUploadedFile,
  sendStoredFile,
  LIB_CATEGORIES,
  libSectionId,
  getChecklist,
  saveChecklistMeasurers,
  chkMeasurers,
  itemHasSubmissions,
  BSC_PERSPECTIVES,
  JMONTHS_FA,
  matchPerspective,
  currentJalaliYear,
  bscYear,
  bscData,
  IND_ASPECTS,
  IND_TYPES,
  IND_INTERVALS,
  IND_DESIRABILITY,
  IND_VALUE_STATUS,
  IND_TEXT_FIELDS,
  IND_NUM_FIELDS,
  IND_FLAG_FIELDS,
  indBody,
  nrsCanManage,
  nrsCanView,
  headNurseWardsOf,
  hnAccessWard,
  hnHeadPresentToday,
  SHIFT_STAFF_ORDER,
  SHIFT_STAFF_ORDER_W,
  SHIFT_SETTINGS_DEFAULT,
  shiftCellHours,
  daysInJalaliMonth,
  shiftAccessUnit,
  getWardShiftSettings,
  parseHolidays,
  docCodes,
  signatureImageFor,
  resolveRecipient,
  nrsUserOrNull,
  FMEA_STATUSES,
  fmeaBody,
  fmeaInsert,
  CL_ANSWER_VALUES,
  CL_ANSWER_LABELS,
  CL_NONCONFORMITY,
  isNonConformity,
  indJudge,
  indRow
} = common;

// Helper to bind mountCrud to this module router
const mountCrud = (prefix, ...args) => common.mountCrud(router, prefix, ...args);

// ===== ساختار سازمانی: گروه شغلی / واحد / پست سازمانی / ساختمان (database/seed-org-structure.js) =====
// چهار جدول مرجعِ هم‌شکل‌اند، پس به‌جای چهار بلوک CRUD تکراری یک توصیف‌گر جدول تعریف می‌شود.
// نام جدول هرگز از ورودی کاربر نمی‌آید — فقط از این نگاشت ثابت (جلوگیری از تزریق نام جدول).
const ORG_KINDS = {
  'job-groups': { table: 'job_groups', fa: 'گروه شغلی', fields: ['title', 'description'], nums: [] },
  'buildings': { table: 'buildings', fa: 'ساختمان', fields: ['title', 'description'], nums: ['floors'] },
  'org-units': { table: 'org_units', fa: 'واحد/بخش', fields: ['title', 'unit_type'], nums: ['bed_count'],
    refs: { parent_id: 'org_units', building_id: 'buildings' } },
  'post-titles': { table: 'post_titles', fa: 'پست سازمانی', fields: ['title'], nums: [],
    refs: { job_group_id: 'job_groups' }, flags: ['is_managerial'] },
};
const orgKind = k => Object.prototype.hasOwnProperty.call(ORG_KINDS, k) ? ORG_KINDS[k] : null;

// مقدار یک ستون ارجاعی فقط وقتی پذیرفته می‌شود که به ردیفی از همان بیمارستان اشاره کند
function orgRef(value, table, hospitalId) {
  if (!value) return null;
  const row = query(`SELECT id FROM ${table} WHERE id = ? AND hospital_id = ?`, [value, hospitalId]).rows[0];
  return row ? row.id : null;
}

function orgBody(kind, body, hospitalId, selfId) {
  const out = {};
  for (const f of kind.fields) out[f] = body[f] === undefined || body[f] === '' ? null : String(body[f]).trim();
  for (const f of kind.nums) {
    const n = Number(body[f]);
    out[f] = body[f] === undefined || body[f] === '' || !Number.isFinite(n) ? null : Math.round(n);
  }
  for (const f of kind.flags || []) out[f] = truthy(body[f]) ? 1 : 0;
  for (const [f, table] of Object.entries(kind.refs || {})) {
    out[f] = orgRef(body[f], table, hospitalId);
    // یک واحد نمی‌تواند والد خودش باشد (حلقه‌ی بی‌نهایت در درخت واحدها)
    if (f === 'parent_id' && selfId && out[f] === selfId) out[f] = null;
  }
  out.is_active = body.is_active === undefined ? 1 : (truthy(body.is_active) ? 1 : 0);
  return out;
}
const orgCols = kind => [...kind.fields, ...kind.nums, ...(kind.flags || []), ...Object.keys(kind.refs || {}), 'is_active'];

// همه‌ی چهار فهرست با هم — برای پر کردن dropdown های ماژول‌های دیگر با یک درخواست
router.get('/org-structure', authRequired, hospitalScope, (req, res) => {
  try {
    const out = {};
    for (const [key, kind] of Object.entries(ORG_KINDS)) {
      out[key.replace(/-/g, '_')] = query(
        `SELECT * FROM ${kind.table} WHERE hospital_id = ?${req.query.all ? '' : ' AND is_active = 1'} ORDER BY title`,
        [req.hospitalId]).rows;
    }
    res.json({ ...out, can_manage: (req.user.permissions || []).includes('manage_org_structure') });
  } catch (err) { console.error('[OrgStructure]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.get('/org-structure/:kind', authRequired, hospitalScope, (req, res) => {
  const kind = orgKind(req.params.kind);
  if (!kind) return res.status(404).json({ error: 'نوع نامعتبر' });
  try {
    res.json({ items: query(`SELECT * FROM ${kind.table} WHERE hospital_id = ? ORDER BY title`, [req.hospitalId]).rows });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/org-structure/:kind', authRequired, requirePermission('manage_org_structure'), hospitalScope, async (req, res) => {
  const kind = orgKind(req.params.kind);
  if (!kind) return res.status(404).json({ error: 'نوع نامعتبر' });
  const b = orgBody(kind, req.body, req.hospitalId, null);
  if (!b.title) return res.status(400).json({ error: `عنوان ${kind.fa} الزامی است` });
  try {
    const cols = orgCols(kind);
    const id = uuid();
    query(`INSERT INTO ${kind.table} (id, hospital_id, ${cols.join(', ')})
      VALUES (${new Array(cols.length + 2).fill('?').join(', ')})`, [id, req.hospitalId, ...cols.map(c => b[c])]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'org_structure_created', targetTable: kind.table, targetId: id, ipAddress: req.ip });
    res.json({ item: { id } });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(409).json({ error: `«${b.title}» از قبل ثبت شده است` });
    console.error('[OrgStructure]', err); res.status(500).json({ error: 'خطای سرور' });
  }
});

router.put('/org-structure/:kind/:id', authRequired, requirePermission('manage_org_structure'), hospitalScope, (req, res) => {
  const kind = orgKind(req.params.kind);
  if (!kind) return res.status(404).json({ error: 'نوع نامعتبر' });
  try {
    const ex = query(`SELECT id FROM ${kind.table} WHERE id = ? AND hospital_id = ?`, [req.params.id, req.hospitalId]).rows[0];
    if (!ex) return res.status(404).json({ error: `${kind.fa} یافت نشد` });
    const b = orgBody(kind, req.body, req.hospitalId, ex.id);
    if (!b.title) return res.status(400).json({ error: `عنوان ${kind.fa} الزامی است` });
    const cols = orgCols(kind);
    query(`UPDATE ${kind.table} SET ${cols.map(c => c + ' = ?').join(', ')} WHERE id = ? AND hospital_id = ?`,
      [...cols.map(c => b[c]), ex.id, req.hospitalId]);
    res.json({ status: 'updated' });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(409).json({ error: 'عنوان تکراری است' });
    console.error('[OrgStructure]', err); res.status(500).json({ error: 'خطای سرور' });
  }
});

router.delete('/org-structure/:kind/:id', authRequired, requirePermission('manage_org_structure'), hospitalScope, async (req, res) => {
  const kind = orgKind(req.params.kind);
  if (!kind) return res.status(404).json({ error: 'نوع نامعتبر' });
  try {
    const ex = query(`SELECT id FROM ${kind.table} WHERE id = ? AND hospital_id = ?`, [req.params.id, req.hospitalId]).rows[0];
    if (!ex) return res.status(404).json({ error: `${kind.fa} یافت نشد` });
    query(`DELETE FROM ${kind.table} WHERE id = ?`, [ex.id]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'org_structure_deleted', targetTable: kind.table, targetId: ex.id, ipAddress: req.ip });
    res.json({ status: 'deleted' });
  } catch (err) { console.error('[OrgStructure]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ===== حوزه‌های کلان سازمانی: مدیریت/پرستاری/پشتیبانی (database/seed-org-divisions.js) =====
// همیشه دقیقاً سه ردیف در هر بیمارستان (seed idempotent آن‌ها را می‌سازد)؛ این‌جا فقط
// خواندن و «تعیین/تعویض رئیس حوزه» است — نه CRUD کامل مثل org_units.
router.get('/org-divisions', authRequired, hospitalScope, (req, res) => {
  try {
    const rows = query(
      `SELECT d.id, d.code, d.title, d.head_user_id, u.full_name as head_name, u.username as head_username,
              r.title_fa as head_role_title
       FROM org_divisions d
       LEFT JOIN users u ON u.id = d.head_user_id
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE d.hospital_id = ? ORDER BY CASE d.code WHEN 'management' THEN 1 WHEN 'nursing' THEN 2 ELSE 3 END`,
      [req.hospitalId]).rows;
    const canManageAll = (req.user.permissions || []).includes('manage_org_divisions');
    res.json({
      divisions: rows.map(d => ({ ...d, can_assign: canManageAll || d.head_user_id === req.user.id })),
    });
  } catch (err) { console.error('[OrgDivisions]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// تعیین/تعویض رئیس حوزه: یا مجوز پلتفرمی manage_org_divisions (ادمین بیمارستان)، یا خودِ
// کسی که همین الان رئیس همین حوزه است (می‌تواند جانشین خودش را تعیین کند)
router.put('/org-divisions/:code', authRequired, hospitalScope, (req, res) => {
  try {
    const div = query('SELECT * FROM org_divisions WHERE hospital_id = ? AND code = ?', [req.hospitalId, req.params.code]).rows[0];
    if (!div) return res.status(404).json({ error: 'حوزه یافت نشد' });
    const canManageAll = (req.user.permissions || []).includes('manage_org_divisions');
    const isCurrentHead = div.head_user_id === req.user.id;
    if (!canManageAll && !isCurrentHead) return res.status(403).json({ error: 'دسترسی ندارید' });

    const headId = req.body && req.body.head_user_id ? String(req.body.head_user_id) : null;
    if (headId) {
      const u = query('SELECT id FROM users WHERE id = ? AND hospital_id = ? AND is_active = 1', [headId, req.hospitalId]).rows[0];
      if (!u) return res.status(400).json({ error: 'کاربر معتبر نیست' });
    }
    query('UPDATE org_divisions SET head_user_id = ?, updated_by = ?, updated_at = datetime(\'now\') WHERE id = ?',
      [headId, req.user.id, div.id]);
    logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'org_division_head_assigned', targetTable: 'org_divisions', targetId: div.id, ipAddress: req.ip });
    res.json({ status: 'updated' });
  } catch (err) { console.error('[OrgDivisions]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// مدیر داخلی (نقش admin) برای ردیف اول نمودار سازمانی یکپارچه — نقش است نه اسلات، پس مستقیم
// از users/roles خوانده می‌شود؛ فقط نام/شناسه (بدون داده‌ی حساس) و برای هر کاربر بیمارستانِ
// لاگین‌کرده در دسترس است، دقیقاً هم‌سطح GET /org-divisions (بدون نیاز به مجوز خاص)
router.get('/org-chart/admins', authRequired, hospitalScope, (req, res) => {
  try {
    const rows = query(
      `SELECT u.id, u.full_name FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.hospital_id = ? AND u.is_active = 1 AND r.code = 'admin' ORDER BY u.full_name`,
      [req.hospitalId]).rows;
    res.json({ admins: rows });
  } catch (err) { console.error('[OrgChart]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ===== زیرساختار حوزه‌ی مدیریت — database/seed-management-hierarchy.js =====
// برچسب/تعداد پست‌ها فقط توسط سوپرادمین پلتفرم قابل تغییر است (src/routes/super.js)؛
// این‌جا فقط خواندن و «انتصاب فرد به یک پست موجود» با همان مجوزی که رئیس حوزه‌ها را
// تعیین می‌کند (manage_org_divisions) — دقیقاً مطابق قانون GET/PUT /org-divisions بالا.
function mgmtIsDivisionHead(req) {
  try {
    const r = query(`SELECT 1 FROM org_divisions WHERE hospital_id = ? AND code = 'management' AND head_user_id = ?`,
      [req.hospitalId, req.user.id]).rows;
    return r.length > 0;
  } catch (e) { return false; }
}
function mgmtCanManage(req) {
  return (req.user.permissions || []).includes('manage_org_divisions') || mgmtIsDivisionHead(req);
}

router.get('/management/positions', authRequired, hospitalScope, (req, res) => {
  try {
    const rows = query(
      `SELECT s.id, s.label, s.sort_order, s.user_id, u.full_name as user_name
       FROM management_position_slots s LEFT JOIN users u ON u.id = s.user_id
       WHERE s.hospital_id = ? ORDER BY s.sort_order, s.created_at`, [req.hospitalId]).rows;
    res.json({ positions: rows, can_manage: mgmtCanManage(req) });
  } catch (err) { console.error('[ManagementHierarchy]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// فقط انتصاب/تعویض فرد — افزودن/حذف/تغییر نام پست از طریق پنل سوپرادمین است (src/routes/super.js)
router.put('/management/positions/:id', authRequired, requireFeature('management'), hospitalScope, (req, res) => {
  try {
    if (!mgmtCanManage(req)) return res.status(403).json({ error: 'دسترسی ندارید' });
    const ex = query('SELECT id FROM management_position_slots WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!ex) return res.status(404).json({ error: 'یافت نشد' });
    const b = req.body || {};
    let userId = null;
    if (b.user_id) {
      const u = query('SELECT id FROM users WHERE id = ? AND hospital_id = ? AND is_active = 1', [b.user_id, req.hospitalId]).rows[0];
      if (!u) return res.status(400).json({ error: 'کاربر معتبر نیست' });
      userId = u.id;
    }
    query(`UPDATE management_position_slots SET user_id = ?, updated_at = datetime('now') WHERE id = ?`, [userId, ex.id]);
    logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'management_position_assigned', targetTable: 'management_position_slots', targetId: ex.id, ipAddress: req.ip });
    res.json({ status: 'updated' });
  } catch (err) { console.error('[ManagementHierarchy]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ===== پیش‌نمایش داشبورد یک نقش (فقط ادمین بیمارستان — manage_org_divisions) =====
// نشست موقت (کوکی جدای pvid، ۱۵ دقیقه) که هویت را به کاربرِ واقعیِ همان پست تغییر می‌دهد؛
// نشست اصلی ادمین (sid) هرگز دست نمی‌خورد و به‌محض خروج از پیش‌نمایش دوباره فعال است.
// چون خیلی از endpoint ها داده را سمت سرور بر اساس مجوز/نقش واقعی فیلتر می‌کنند، شبیه‌سازی
// صرفاً سمت کلاینت نمایش واقع‌بینانه‌ای از داشبورد نقش هدف نمی‌داد — برای همین این مسیر (نشست
// واقعی اما کوتاه‌مدت/آدیت‌شده/بدون نیاز به رمز عبور فرد هدف) انتخاب شد.
const jwt = require('jsonwebtoken');
router.post('/preview/start/:userId', authRequired, hospitalScope, requirePermission('manage_org_divisions'), (req, res) => {
  try {
    const target = query(
      `SELECT u.id, u.full_name, r.title_fa as role_title FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.id = ? AND u.hospital_id = ? AND u.is_active = 1`,
      [req.params.userId, req.hospitalId]
    ).rows[0];
    if (!target) return res.status(404).json({ error: 'کاربر یافت نشد' });
    if (target.id === req.user.id) return res.status(400).json({ error: 'همین الان با همین حساب وارد هستید' });
    const token = jwt.sign({ id: target.id, adminId: req.user.id, type: 'preview' }, config.jwt.secret, { expiresIn: config.jwt.previewExpiresIn });
    res.cookie(config.jwt.previewCookieName, token, {
      httpOnly: true, secure: config.isProduction, sameSite: 'strict', maxAge: 15 * 60 * 1000,
    });
    logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'admin_preview_role_login', targetTable: 'users', targetId: target.id, ipAddress: req.ip });
    res.json({ status: 'started', preview_of: { full_name: target.full_name, role_title: target.role_title } });
  } catch (err) { console.error('[Preview]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/preview/exit', authRequired, (req, res) => {
  res.clearCookie(config.jwt.previewCookieName);
  res.json({ status: 'exited' });
});

// وضعیت فعلی پیش‌نمایش برای رسم بنر هشدار در فرانت — بدون گیت مجوز خاص (فقط باید نشست معتبر داشته باشد)
router.get('/preview/status', authRequired, (req, res) => {
  if (req.previewAdmin) {
    res.json({ active: true, viewing_as: { full_name: req.user.full_name, role_title: req.user.role_title }, real_admin: req.previewAdmin });
  } else {
    res.json({ active: false });
  }
});


module.exports = router;

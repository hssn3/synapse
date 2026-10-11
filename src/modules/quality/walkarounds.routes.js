/**
 * Quality Management Walkarounds Routes
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

// ===== بازدید میدانی مدیریتی (واکراند) — بازدید ساخت‌یافته از بخش‌ها که «مصوبه» تولید می‌کند =====
// ارزش اصلی ماژول، داشبورد درصد اجرای مصوبه‌هاست (به تفکیک بخش و مسئول) — database/seed-walkarounds.js
const WA_STATUSES = ['planned', 'done', 'closed'];
const RES_STATUSES = ['not_done', 'in_progress', 'done'];
const WA_FIELDS = ['title', 'visit_date', 'department', 'summary', 'status'];

function waBody(body) {
  const out = {};
  for (const f of WA_FIELDS) out[f] = body[f] === undefined || body[f] === '' ? null : String(body[f]);
  if (!WA_STATUSES.includes(out.status)) out.status = 'planned';
  // حاضران/غایبان فهرست سادهٔ نام‌اند (آرایه JSON) — درصد حضور از روی همین دو محاسبه می‌شود
  out.attendees = JSON.stringify(safeArray(body.attendees).map(x => String(x).trim()).filter(Boolean));
  out.absentees = JSON.stringify(safeArray(body.absentees).map(x => String(x).trim()).filter(Boolean));
  return out;
}

// جایگزینی یکجای مصوبه‌ها (همان الگوی حیطه/سؤالِ چک‌لیست) — در یک تراکنش تا مصوبهٔ نیمه‌ذخیره نماند
const saveResolutions = db.transaction((walkId, hospitalId, list) => {
  query('DELETE FROM walkaround_resolutions WHERE walkaround_id = ? AND hospital_id = ?', [walkId, hospitalId]);
  list.forEach((r, i) => {
    const desc = String(r.description || '').trim();
    if (!desc) return;
    const status = RES_STATUSES.includes(r.status) ? r.status : 'not_done';
    // مسئول باید کاربر همین بیمارستان باشد (جلوگیری از ارجاع متقاطع)
    let uid = r.responsible_user_id || null;
    if (uid && !query('SELECT id FROM users WHERE id = ? AND hospital_id = ?', [uid, hospitalId]).rows[0]) uid = null;
    query(`INSERT INTO walkaround_resolutions
      (id, walkaround_id, hospital_id, description, responsible_user_id, responsible_name, department, status, due_date, completed_at, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuid(), walkId, hospitalId, desc, uid, r.responsible_name || null, r.department || null,
       status, r.due_date || null, status === 'done' ? (r.completed_at || tehranTodayStr()) : null, i]);
  });
});

function walkResolutions(walkId, hospitalId) {
  return query(`SELECT r.*, u.full_name as responsible_full_name FROM walkaround_resolutions r
    LEFT JOIN users u ON r.responsible_user_id = u.id
    WHERE r.walkaround_id = ? AND r.hospital_id = ? ORDER BY r.sort_order, r.created_at`, [walkId, hospitalId]).rows;
}

router.get('/walkarounds', authRequired, requireAnyPermission('view_walkarounds', 'manage_walkarounds'), hospitalScope, (req, res) => {
  try {
    const where = ['w.hospital_id = ?'];
    const params = [req.hospitalId];
    if (req.query.status && WA_STATUSES.includes(req.query.status)) { where.push('w.status = ?'); params.push(req.query.status); }
    if (req.query.department) { where.push('w.department LIKE ?'); params.push('%' + req.query.department + '%'); }
    if (req.query.from) { where.push('w.visit_date >= ?'); params.push(req.query.from); }
    if (req.query.to) { where.push('w.visit_date <= ?'); params.push(req.query.to); }
    if (req.query.q) { where.push('(w.title LIKE ? OR IFNULL(w.summary, \'\') LIKE ?)'); params.push('%' + req.query.q + '%', '%' + req.query.q + '%'); }
    const rows = query(`SELECT w.*, u.full_name as conducted_by_name,
      (SELECT COUNT(*) FROM walkaround_resolutions r WHERE r.walkaround_id = w.id) as resolution_count,
      (SELECT COUNT(*) FROM walkaround_resolutions r WHERE r.walkaround_id = w.id AND r.status = 'done') as resolution_done_count
      FROM management_walkarounds w LEFT JOIN users u ON w.conducted_by = u.id
      WHERE ${where.join(' AND ')} ORDER BY IFNULL(w.visit_date, w.created_at) DESC`, params).rows;
    res.json({ walkarounds: rows });
  } catch (err) { console.error('[Walkarounds]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// داشبورد: درصد اجرای مصوبه‌ها به تفکیک بخش و به تفکیک مسئول (ارزش اصلی ماژول)
router.get('/walkarounds/summary', authRequired, requireAnyPermission('view_walkarounds', 'manage_walkarounds'), hospitalScope, (req, res) => {
  try {
    const params = [req.hospitalId];
    let dateWhere = '';
    if (req.query.from) { dateWhere += ' AND IFNULL(w.visit_date, w.created_at) >= ?'; params.push(req.query.from); }
    if (req.query.to) { dateWhere += ' AND IFNULL(w.visit_date, w.created_at) <= ?'; params.push(req.query.to); }
    const agg = `COUNT(*) as total,
      SUM(CASE WHEN r.status = 'done' THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN r.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN r.status = 'not_done' THEN 1 ELSE 0 END) as not_done,
      SUM(CASE WHEN r.status <> 'done' AND r.due_date IS NOT NULL AND r.due_date < date('now') THEN 1 ELSE 0 END) as overdue`;
    const base = `FROM walkaround_resolutions r
      JOIN management_walkarounds w ON r.walkaround_id = w.id
      LEFT JOIN users u ON r.responsible_user_id = u.id
      WHERE r.hospital_id = ?${dateWhere}`;

    // بخشِ مصوبه اگر خالی باشد، بخشِ خودِ بازدید ملاک است
    const byDepartment = query(`SELECT IFNULL(NULLIF(r.department, ''), IFNULL(NULLIF(w.department, ''), 'نامشخص')) as name, ${agg}
      ${base} GROUP BY name ORDER BY total DESC`, params).rows;
    const byResponsible = query(`SELECT IFNULL(NULLIF(u.full_name, ''), IFNULL(NULLIF(r.responsible_name, ''), 'تعیین‌نشده')) as name, ${agg}
      ${base} GROUP BY name ORDER BY total DESC`, params).rows;
    const totals = query(`SELECT ${agg} ${base}`, params).rows[0] || {};

    const pct = r => { r.completion_pct = r.total ? Math.round((r.done / r.total) * 100) : 0; return r; };
    // حضور/غیبت تیم بازدیدکننده روی همهٔ بازدیدهای بازه (همان شرط تاریخ)
    const walks = query(`SELECT attendees, absentees FROM management_walkarounds w
      WHERE w.hospital_id = ?${dateWhere}`, params).rows;
    let present = 0, absent = 0;
    for (const w of walks) { present += safeArray(w.attendees).length; absent += safeArray(w.absentees).length; }

    res.json({
      totals: pct({ ...totals, total: totals.total || 0, done: totals.done || 0,
        in_progress: totals.in_progress || 0, not_done: totals.not_done || 0, overdue: totals.overdue || 0 }),
      by_department: byDepartment.map(pct),
      by_responsible: byResponsible.map(pct),
      attendance: { present, absent, present_pct: (present + absent) ? Math.round(present / (present + absent) * 100) : 0 },
      walkaround_count: walks.length,
    });
  } catch (err) { console.error('[Walkaround summary]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.get('/walkarounds/:id', authRequired, requireAnyPermission('view_walkarounds', 'manage_walkarounds'), hospitalScope, (req, res) => {
  try {
    const walk = query(`SELECT w.*, u.full_name as conducted_by_name FROM management_walkarounds w
      LEFT JOIN users u ON w.conducted_by = u.id WHERE w.id = ? AND w.hospital_id = ?`, [req.params.id, req.hospitalId]).rows[0];
    if (!walk) return res.status(404).json({ error: 'بازدید یافت نشد' });
    res.json({ walkaround: walk, resolutions: walkResolutions(walk.id, req.hospitalId) });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/walkarounds', authRequired, requirePermission('manage_walkarounds'), hospitalScope, async (req, res) => {
  const w = waBody(req.body);
  if (!w.title) return res.status(400).json({ error: 'عنوان بازدید الزامی است' });
  try {
    const id = uuid();
    query(`INSERT INTO management_walkarounds (id, hospital_id, ${WA_FIELDS.join(', ')}, attendees, absentees, conducted_by, created_by)
      VALUES (${new Array(WA_FIELDS.length + 6).fill('?').join(', ')})`,
      [id, req.hospitalId, ...WA_FIELDS.map(f => w[f]), w.attendees, w.absentees,
       req.body.conducted_by || req.user.id, req.user.id]);
    saveResolutions(id, req.hospitalId, safeArray(req.body.resolutions));
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'walkaround_created', targetTable: 'management_walkarounds', targetId: id, ipAddress: req.ip });
    res.json({ walkaround: { id } });
  } catch (err) { console.error('[Walkarounds]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.put('/walkarounds/:id', authRequired, requirePermission('manage_walkarounds'), hospitalScope, async (req, res) => {
  try {
    const existing = query('SELECT id FROM management_walkarounds WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!existing) return res.status(404).json({ error: 'بازدید یافت نشد' });
    const w = waBody(req.body);
    if (!w.title) return res.status(400).json({ error: 'عنوان بازدید الزامی است' });
    query(`UPDATE management_walkarounds SET ${WA_FIELDS.map(f => f + ' = ?').join(', ')},
      attendees = ?, absentees = ?, updated_at = datetime('now') WHERE id = ? AND hospital_id = ?`,
      [...WA_FIELDS.map(f => w[f]), w.attendees, w.absentees, existing.id, req.hospitalId]);
    // مصوبه‌ها فقط وقتی جایگزین می‌شوند که در بدنه آمده باشند (به‌روزرسانی جزئی نباید پاکشان کند)
    if (req.body.resolutions !== undefined) saveResolutions(existing.id, req.hospitalId, safeArray(req.body.resolutions));
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'walkaround_updated', targetTable: 'management_walkarounds', targetId: existing.id, ipAddress: req.ip });
    res.json({ status: 'updated' });
  } catch (err) { console.error('[Walkarounds]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// به‌روزرسانی سریع وضعیت یک مصوبه (از داشبورد پیگیری، بدون بازکردن فرم بازدید)
router.put('/walkarounds/resolutions/:rid', authRequired, requirePermission('manage_walkarounds'), hospitalScope, async (req, res) => {
  try {
    const row = query('SELECT * FROM walkaround_resolutions WHERE id = ? AND hospital_id = ?', [req.params.rid, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'مصوبه یافت نشد' });
    if (!RES_STATUSES.includes(req.body.status)) return res.status(400).json({ error: 'وضعیت نامعتبر است' });
    query(`UPDATE walkaround_resolutions SET status = ?, completed_at = ? WHERE id = ?`,
      [req.body.status, req.body.status === 'done' ? (row.completed_at || tehranTodayStr()) : null, row.id]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'walkaround_resolution_updated', targetTable: 'walkaround_resolutions', targetId: row.id, ipAddress: req.ip });
    res.json({ status: 'updated' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.delete('/walkarounds/:id', authRequired, requirePermission('manage_walkarounds'), hospitalScope, async (req, res) => {
  try {
    const existing = query('SELECT id FROM management_walkarounds WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!existing) return res.status(404).json({ error: 'بازدید یافت نشد' });
    query('DELETE FROM walkaround_resolutions WHERE walkaround_id = ?', [existing.id]);
    query('DELETE FROM management_walkarounds WHERE id = ?', [existing.id]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'walkaround_deleted', targetTable: 'management_walkarounds', targetId: existing.id, ipAddress: req.ip });
    res.json({ status: 'deleted' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

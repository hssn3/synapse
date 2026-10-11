/**
 * Quality Internal Audits Routes
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

// ===== حسابرسی داخلی — یک «نمونهٔ حسابرسی» که یک چک‌لیست را به‌عنوان ابزار بازرسی ارجاع می‌دهد =====
// (پرسش‌نامهٔ بازرسی خودش ساخته نمی‌شود؛ از موتور چک‌لیست موجود استفاده می‌شود — database/seed-audits.js)
const AUD_STATUSES = ['planned', 'in_progress', 'completed', 'closed'];
const AUD_FIELDS = ['title', 'checklist_id', 'auditor_name', 'audited_department', 'audit_date',
  'finding_summary', 'corrective_action_text', 'follow_up_date', 'status'];

function audBody(body, hospitalId) {
  const out = {};
  for (const f of AUD_FIELDS) out[f] = body[f] === undefined || body[f] === '' ? null : String(body[f]);
  if (!AUD_STATUSES.includes(out.status)) out.status = 'planned';
  // چک‌لیستِ ابزار باید متعلق به همین بیمارستان باشد
  if (out.checklist_id && !getChecklist(out.checklist_id, hospitalId)) out.checklist_id = null;
  out.corrective_action_required = truthy(body.corrective_action_required) ? 1 : 0;
  return out;
}

router.get('/audits', authRequired, requireAnyPermission('view_audits', 'manage_audits'), hospitalScope, (req, res) => {
  try {
    const where = ['a.hospital_id = ?'];
    const params = [req.hospitalId];
    if (req.query.status && AUD_STATUSES.includes(req.query.status)) { where.push('a.status = ?'); params.push(req.query.status); }
    if (req.query.department) { where.push('a.audited_department LIKE ?'); params.push('%' + req.query.department + '%'); }
    if (req.query.from) { where.push('a.audit_date >= ?'); params.push(req.query.from); }
    if (req.query.to) { where.push('a.audit_date <= ?'); params.push(req.query.to); }
    // حسابرسی ممکن است هنوز audit_date نداشته باشد؛ در آن صورت تاریخ ثبت ملاک سال است (همان ستون مرتب‌سازی)
    {
      const y = safeYear(req.query.year);
      if (y) {
        const r = jalaliYearRange(y);
        where.push('date(IFNULL(a.audit_date, a.created_at)) >= ? AND date(IFNULL(a.audit_date, a.created_at)) < ?');
        params.push(r.start, r.end);
      }
    }
    if (req.query.q) { where.push('(a.title LIKE ? OR IFNULL(a.finding_summary, \'\') LIKE ?)'); params.push('%' + req.query.q + '%', '%' + req.query.q + '%'); }
    const rows = query(`SELECT a.*, c.title as checklist_title, u.full_name as auditor_full_name,
      s.score as submission_score, s.max_score as submission_max_score, s.submitted_at as submission_at
      FROM internal_audits a
      LEFT JOIN checklists c ON a.checklist_id = c.id
      LEFT JOIN users u ON a.auditor_user_id = u.id
      LEFT JOIN checklist_submissions s ON a.checklist_submission_id = s.id
      WHERE ${where.join(' AND ')} ORDER BY IFNULL(a.audit_date, a.created_at) DESC`, params).rows;
    res.json({ audits: rows });
  } catch (err) { console.error('[Audits]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.get('/audits/:id', authRequired, requireAnyPermission('view_audits', 'manage_audits'), hospitalScope, (req, res) => {
  try {
    const audit = query('SELECT * FROM internal_audits WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!audit) return res.status(404).json({ error: 'حسابرسی یافت نشد' });
    let submissions = [];
    if (audit.checklist_id) {
      submissions = query(`SELECT s.id, s.reference, s.score, s.max_score, s.submitted_at, u.full_name as submitted_by_name
        FROM checklist_submissions s LEFT JOIN users u ON s.submitted_by = u.id
        WHERE s.checklist_id = ? AND s.hospital_id = ? ORDER BY s.submitted_at DESC`, [audit.checklist_id, req.hospitalId]).rows;
    }
    res.json({ audit, submissions });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/audits', authRequired, requirePermission('manage_audits'), hospitalScope, async (req, res) => {
  const a = audBody(req.body, req.hospitalId);
  if (!a.title) return res.status(400).json({ error: 'عنوان حسابرسی الزامی است' });
  try {
    // حسابرس باید کاربر همین بیمارستان باشد (جلوگیری از IDOR/نشت نام کاربر بیمارستان دیگر)
    const wantedAuditor = req.body.auditor_user_id;
    const auditorId = wantedAuditor && query('SELECT id FROM users WHERE id = ? AND hospital_id = ?', [wantedAuditor, req.hospitalId]).rows[0]
      ? wantedAuditor : req.user.id;
    const id = uuid();
    query(`INSERT INTO internal_audits (id, hospital_id, ${AUD_FIELDS.join(', ')}, corrective_action_required, auditor_user_id, created_by)
      VALUES (${new Array(AUD_FIELDS.length + 5).fill('?').join(', ')})`,
      [id, req.hospitalId, ...AUD_FIELDS.map(f => a[f]), a.corrective_action_required,
       auditorId, req.user.id]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'audit_created', targetTable: 'internal_audits', targetId: id, ipAddress: req.ip });
    res.json({ audit: { id } });
  } catch (err) { console.error('[Audits]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.put('/audits/:id', authRequired, requirePermission('manage_audits'), hospitalScope, async (req, res) => {
  try {
    const existing = query('SELECT id FROM internal_audits WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!existing) return res.status(404).json({ error: 'حسابرسی یافت نشد' });
    const a = audBody(req.body, req.hospitalId);
    if (!a.title) return res.status(400).json({ error: 'عنوان حسابرسی الزامی است' });
    query(`UPDATE internal_audits SET ${AUD_FIELDS.map(f => f + ' = ?').join(', ')},
      corrective_action_required = ?, updated_at = datetime('now') WHERE id = ? AND hospital_id = ?`,
      [...AUD_FIELDS.map(f => a[f]), a.corrective_action_required, existing.id, req.hospitalId]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'audit_updated', targetTable: 'internal_audits', targetId: existing.id, ipAddress: req.ip });
    res.json({ status: 'updated' });
  } catch (err) { console.error('[Audits]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// پیوند پاسخ‌نامهٔ چک‌لیست (نتیجهٔ بازرسی) به حسابرسی — پاسخ‌نامه از همان صفحهٔ چک‌لیست پر می‌شود
router.post('/audits/:id/submission', authRequired, requirePermission('manage_audits'), hospitalScope, (req, res) => {
  try {
    const audit = query('SELECT * FROM internal_audits WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!audit) return res.status(404).json({ error: 'حسابرسی یافت نشد' });
    const sub = query('SELECT * FROM checklist_submissions WHERE id = ? AND hospital_id = ?',
      [req.body.submission_id, req.hospitalId]).rows[0];
    if (!sub) return res.status(404).json({ error: 'پاسخ‌نامه یافت نشد' });
    if (audit.checklist_id && sub.checklist_id !== audit.checklist_id) {
      return res.status(400).json({ error: 'این پاسخ‌نامه متعلق به چک‌لیست ابزار این حسابرسی نیست' });
    }
    query("UPDATE internal_audits SET checklist_submission_id = ?, status = CASE WHEN status = 'planned' THEN 'completed' ELSE status END, updated_at = datetime('now') WHERE id = ?",
      [sub.id, audit.id]);
    res.json({ status: 'linked' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.delete('/audits/:id', authRequired, requirePermission('manage_audits'), hospitalScope, async (req, res) => {
  try {
    const existing = query('SELECT id FROM internal_audits WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!existing) return res.status(404).json({ error: 'حسابرسی یافت نشد' });
    query('DELETE FROM internal_audits WHERE id = ?', [existing.id]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'audit_deleted', targetTable: 'internal_audits', targetId: existing.id, ipAddress: req.ip });
    res.json({ status: 'deleted' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

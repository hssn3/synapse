/**
 * Quality Certifications & Badges Routes
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

// ===== نشان‌ها و گواهینامه‌ها =====
const CERT_STATUSES = ['active', 'expired', 'pending_renewal'];
const CERT_FIELDS = ['title', 'issuing_body', 'issue_date', 'expiry_date', 'section_id', 'status', 'note'];
const CERT_NEAR_DAYS = 60; // آستانه «نزدیک به انقضا» برای چراغ راهنمای UI

function certBody(body) {
  const out = {};
  for (const f of CERT_FIELDS) out[f] = body[f] === undefined || body[f] === '' ? null : String(body[f]);
  if (!CERT_STATUSES.includes(out.status)) out.status = 'active';
  out.section_id = libSectionId(out.section_id);
  return out;
}

// وضعیت مؤثر از روی تاریخ انقضا محاسبه می‌شود تا بدون job زمان‌بندی‌شده هم به‌روز بماند
function certDecorate(row) {
  let days = null;
  if (row.expiry_date) {
    const d = Math.floor((Date.parse(row.expiry_date + 'T00:00:00Z') - Date.now()) / 86400000);
    days = Number.isFinite(d) ? d : null;
  }
  let effective = row.status || 'active';
  if (days !== null && days < 0) effective = 'expired';
  else if (days !== null && days <= CERT_NEAR_DAYS && effective === 'active') effective = 'near_expiry';
  return { ...row, days_to_expiry: days, effective_status: effective };
}

router.get('/certifications', authRequired, requireAnyPermission('view_certifications', 'manage_certifications'), hospitalScope, (req, res) => {
  try {
    const where = ['c.hospital_id = ?'];
    const params = [req.hospitalId];
    if (req.query.status && CERT_STATUSES.includes(req.query.status)) { where.push('c.status = ?'); params.push(req.query.status); }
    if (req.query.q) { where.push('(c.title LIKE ? OR IFNULL(c.issuing_body, \'\') LIKE ?)'); params.push('%' + req.query.q + '%', '%' + req.query.q + '%'); }
    const rows = query(`SELECT c.*, sec.title as section_title, sec.code as section_code, u.full_name as created_by_name
      FROM certifications c LEFT JOIN accreditation_sections sec ON c.section_id = sec.id
      LEFT JOIN users u ON c.created_by = u.id
      WHERE ${where.join(' AND ')} ORDER BY CASE WHEN c.expiry_date IS NULL THEN 1 ELSE 0 END, c.expiry_date ASC`, params).rows;
    res.json({ certifications: rows.map(certDecorate) });
  } catch (err) { console.error('[Certifications]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/certifications', authRequired, requirePermission('manage_certifications'), hospitalScope, async (req, res) => {
  const c = certBody(req.body);
  if (!c.title) return res.status(400).json({ error: 'عنوان گواهینامه الزامی است' });
  try {
    const id = uuid();
    query(`INSERT INTO certifications (id, hospital_id, ${CERT_FIELDS.join(', ')}, created_by)
      VALUES (${new Array(CERT_FIELDS.length + 3).fill('?').join(', ')})`,
      [id, req.hospitalId, ...CERT_FIELDS.map(f => c[f]), req.user.id]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'certification_created', targetTable: 'certifications', targetId: id, ipAddress: req.ip });
    res.json({ certification: { id } });
  } catch (err) { console.error('[Certifications]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.put('/certifications/:id', authRequired, requirePermission('manage_certifications'), hospitalScope, (req, res) => {
  try {
    const existing = query('SELECT id FROM certifications WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!existing) return res.status(404).json({ error: 'گواهینامه یافت نشد' });
    const c = certBody(req.body);
    if (!c.title) return res.status(400).json({ error: 'عنوان گواهینامه الزامی است' });
    query(`UPDATE certifications SET ${CERT_FIELDS.map(f => f + ' = ?').join(', ')},
      updated_at = datetime('now') WHERE id = ? AND hospital_id = ?`,
      [...CERT_FIELDS.map(f => c[f]), existing.id, req.hospitalId]);
    res.json({ status: 'updated' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.delete('/certifications/:id', authRequired, requirePermission('manage_certifications'), hospitalScope, async (req, res) => {
  try {
    const existing = query('SELECT id FROM certifications WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!existing) return res.status(404).json({ error: 'گواهینامه یافت نشد' });
    query('DELETE FROM certifications WHERE id = ?', [existing.id]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'certification_deleted', targetTable: 'certifications', targetId: existing.id, ipAddress: req.ip });
    res.json({ status: 'deleted' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/certifications/:id/file', authRequired, requirePermission('manage_certifications'), hospitalScope, uploadSingle('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'فایلی ارسال نشده' });
  try {
    const row = query('SELECT id FROM certifications WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'گواهینامه یافت نشد' });
    const saved = await storeUploadedFile(req.file);
    query('UPDATE certifications SET file_path = ?, file_name = ? WHERE id = ? AND hospital_id = ?',
      [saved.filename, req.file.originalname, row.id, req.hospitalId]);
    res.json({ file: { filename: saved.filename, original_name: req.file.originalname, size: saved.size } });
  } catch (err) {
    if (err.isUploadValidation) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'خطای سرور در آپلود' });
  }
});

router.get('/certifications/:id/file', authRequired, requireAnyPermission('view_certifications', 'manage_certifications'), hospitalScope, (req, res) => {
  try {
    const row = query('SELECT file_path, file_name FROM certifications WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!row || !row.file_path) return res.status(404).json({ error: 'فایلی یافت نشد' });
    sendStoredFile(res, row.file_path, row.file_name);
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

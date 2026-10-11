/**
 * Users Roles & Suggestions Routes
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

// ===== Complaints =====
router.get('/users/complaints/list', authRequired, requirePermission('manage_patient_complaints'), hospitalScope, (req, res) => {
  try {
    const result = query('SELECT * FROM patient_complaints_suggestions WHERE hospital_id = ? ORDER BY created_at DESC', [req.hospitalId]);
    res.json({ complaints: result.rows });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.put('/users/complaints/:id', authRequired, requirePermission('manage_patient_complaints'), hospitalScope, (req, res) => {
  const { status, response } = req.body;
  try {
    const existing = query('SELECT id FROM patient_complaints_suggestions WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'یافت نشد' });
    query('UPDATE patient_complaints_suggestions SET status = ?, response = ?, handled_by = ? WHERE id = ? AND hospital_id = ?', [status, response||null, req.user.id, req.params.id, req.hospitalId]);
    res.json({ status: 'updated' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// ===== Suggestions =====
router.get('/users/suggestions/list', authRequired, requirePermission('review_staff_suggestions'), hospitalScope, (req, res) => {
  try {
    const result = query(`SELECT s.*, u.full_name as submitter_name FROM staff_suggestions s JOIN users u ON s.submitted_by = u.id WHERE s.hospital_id = ? ORDER BY s.created_at DESC`, [req.hospitalId]);
    res.json({ suggestions: result.rows });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.put('/users/suggestions/:id', authRequired, requirePermission('review_staff_suggestions'), hospitalScope, (req, res) => {
  const { status, reviewer_notes } = req.body;
  try {
    const existing = query('SELECT id FROM staff_suggestions WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'یافت نشد' });
    query('UPDATE staff_suggestions SET status = ?, reviewer_notes = ? WHERE id = ? AND hospital_id = ?', [status, reviewer_notes||null, req.params.id, req.hospitalId]);
    res.json({ status: 'updated' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

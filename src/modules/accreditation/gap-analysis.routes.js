/**
 * Accreditation Gap Analysis Routes
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

// ===== Gap Analysis =====
const gapAnalysis = require('../../services/gap-analysis');

router.get('/gap-analysis', authRequired, hospitalScope, requireAnyPermission('view_accreditation_full_tree', 'view_measure_status_readonly'), (req, res) => {
  try {
    const year = safeYear(req.query.year) || String(todayJalali().jy);
    const analysis = gapAnalysis.analyzeGaps(req.hospitalId, year);
    res.json(analysis);
  } catch (err) {
    console.error('[GapAnalysis]', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.get('/gap-analysis/report', authRequired, hospitalScope, requireAnyPermission('view_accreditation_full_tree', 'view_measure_status_readonly'), (req, res) => {
  try {
    const year = safeYear(req.query.year) || String(todayJalali().jy);
    const report = gapAnalysis.priorityReport(req.hospitalId, year);
    res.json(report);
  } catch (err) {
    console.error('[GapAnalysis] Report', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.get('/gap-analysis/trends', authRequired, hospitalScope, requireAnyPermission('view_accreditation_full_tree', 'view_measure_status_readonly'), (req, res) => {
  try {
    const endYear = safeYear(req.query.endYear) || todayJalali().jy;
    const startYear = safeYear(req.query.startYear) || (endYear - 2);
    const trends = gapAnalysis.analyzeTrends(req.hospitalId, startYear, endYear);
    res.json({ trends });
  } catch (err) {
    console.error('[GapAnalysis] Trends', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/gap-analysis/save', authRequired, hospitalScope, requirePermission('edit_measure_status'), async (req, res) => {
  try {
    const year = safeYear(req.body.year) || String(todayJalali().jy);
    const result = gapAnalysis.saveAnalysis(req.hospitalId, year, req.user.id);
    await logAction({ hospitalId: req.hospitalId, userId: req.user.id, action: 'gap_analysis_saved', targetTable: 'gap_analysis_reports', targetId: result.id, ipAddress: req.ip });
    res.json(result);
  } catch (err) {
    console.error('[GapAnalysis] Save', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});


module.exports = router;

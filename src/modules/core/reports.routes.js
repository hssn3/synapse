/**
 * Core Audit & Mapping Routes
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

// ===== Audit Log =====
router.get('/users/audit-log', authRequired, requirePermission('view_audit_log'), hospitalScope, (req, res) => {
  try {
    const result = query(`SELECT a.*, u.full_name as user_name, u.username FROM audit_log a JOIN users u ON a.user_id = u.id WHERE a.hospital_id = ? ORDER BY a.created_at DESC LIMIT 50`, [req.hospitalId]);
    res.json({ logs: result.rows });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// ===== KPIs =====
// گاردِ مجوز (ممیزی AUDIT §9): این سه مسیر فقط خواندنی‌اند ولی داده‌ی شاخص‌ها/BSC را
// برمی‌گردانند. اتحاد چهارگانه، مصرف‌کننده‌های واقعی را پوشش می‌دهد (view/manage شاخص،
// BSC و داشبوردهای مدیریتی)؛ هیچ مصرف‌کننده‌ی فرانتی خارج از این مجموعه پیدا نشد.
const KPI_VIEW_UNION = ['view_bsc', 'view_indicators', 'manage_indicators', 'view_all_dashboards'];
router.get('/kpis', authRequired, requireAnyPermission(...KPI_VIEW_UNION), hospitalScope, (req, res) => {
  try {
    const result = query('SELECT * FROM hospital_kpis WHERE hospital_id = ? AND is_active = 1 ORDER BY category, title', [req.hospitalId]);
    res.json({ kpis: result.rows });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// جدول رتبه‌بندی نسل ۶ مرجعِ سراسری است (hospital_id ندارد) — hospitalScope فقط
// زمینه‌ی بیمارستان را تنظیم می‌کند و غیابِ آن را زودتر و با پیامِ صریح رد می‌کند.
router.get('/kpis/rankings', authRequired, requireAnyPermission(...KPI_VIEW_UNION), hospitalScope, (req, res) => {
  try {
    const result = query('SELECT * FROM gen6_rankings ORDER BY min_total_percent DESC');
    res.json({ rankings: result.rows });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.get('/kpis/dashboard', authRequired, requireAnyPermission(...KPI_VIEW_UNION), hospitalScope, (req, res) => {
  try {
    const kpis = query('SELECT * FROM hospital_kpis WHERE hospital_id = ? AND is_active = 1 ORDER BY category, title', [req.hospitalId]).rows;
    const grouped = {};
    for (const kpi of kpis) { if (!grouped[kpi.category]) grouped[kpi.category] = []; grouped[kpi.category].push(kpi); }
    const rankings = query('SELECT * FROM gen6_rankings ORDER BY min_total_percent DESC').rows;
    res.json({ kpis_by_category: grouped, total_kpis: kpis.length, rankings });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// ===== Activity ↔ Measure Mapping (قلب پلتفرم یکپارچه - بخش ۶.۵ PROJECT_SPEC.md) =====
router.get('/activities/mapping', authRequired, hospitalScope, (req, res) => {
  try {
    const result = query(`SELECT amm.*, at.title as activity_title, at.module, m.code as measure_code, m.statement as measure_statement
      FROM activity_measure_mapping amm
      JOIN activity_types at ON amm.activity_type_id = at.id
      JOIN accreditation_sections m ON amm.measure_id = m.id
      WHERE at.hospital_id = ? ORDER BY at.module, m.code`, [req.hospitalId]);
    res.json({ mappings: result.rows });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/activities/mapping', authRequired, requirePermission('manage_activity_measure_mapping'), hospitalScope, (req, res) => {
  const { activity_type_id, measure_id, auto_evidence } = req.body;
  if (!activity_type_id || !measure_id) return res.status(400).json({ error: 'نوع فعالیت و سنجه الزامی است' });
  try {
    const activityType = query('SELECT id FROM activity_types WHERE id = ? AND hospital_id = ?', [activity_type_id, req.hospitalId]);
    if (activityType.rows.length === 0) return res.status(404).json({ error: 'نوع فعالیت یافت نشد' });
    const id = uuid();
    query('INSERT INTO activity_measure_mapping (id, activity_type_id, measure_id, auto_evidence, created_by) VALUES (?, ?, ?, ?, ?)',
      [id, activity_type_id, measure_id, auto_evidence !== false ? 1 : 0, req.user.id]);
    res.json({ mapping: { id } });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

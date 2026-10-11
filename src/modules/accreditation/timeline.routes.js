/**
 * Accreditation Guide Timeline Routes
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

// ===== دوره‌ی سراسری اعتباربخشی =====
// خواندن برای همه‌ی کاربران بیمارستان (بنر داشبورد)، نوشتن فقط برای مدیر بهبود کیفیت یا
// دارنده‌ی manage_hospital_settings — چون یک سیاست کلی است که کار همه را قاب‌بندی می‌کند.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
function canEditPeriod(u) {
  return (u.permissions || []).includes('manage_hospital_settings') || u.role_code === 'quality_manager';
}

router.get('/policy/period', authRequired, hospitalScope, (req, res) => {
  try {
    const row = query('SELECT * FROM accreditation_periods WHERE hospital_id = ?', [req.hospitalId]).rows[0] || null;
    res.json({ period: row, can_edit: canEditPeriod(req.user) });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.put('/policy/period', authRequired, hospitalScope, async (req, res) => {
  if (!canEditPeriod(req.user)) return res.status(403).json({ error: 'فقط مدیر بهبود کیفیت یا مدیر سامانه می‌تواند دوره را تعیین کند' });
  const { title, start_date, end_date, note } = req.body || {};
  const is_active = req.body && req.body.is_active !== undefined ? (truthy(req.body.is_active) ? 1 : 0) : 1;
  if (start_date && !ISO_DATE.test(start_date)) return res.status(400).json({ error: 'تاریخ شروع نامعتبر است' });
  if (end_date && !ISO_DATE.test(end_date)) return res.status(400).json({ error: 'تاریخ پایان نامعتبر است' });
  if (start_date && end_date && end_date < start_date) return res.status(400).json({ error: 'تاریخ پایان باید بعد از تاریخ شروع باشد' });
  // سال شمسی‌ای که راهنمای مسیر اعتباربخشی از آن جدول‌زمانی می‌سازد (src/services/guide-timeline.js)
  let start_year = null;
  if (req.body && req.body.start_year !== undefined && req.body.start_year !== null && req.body.start_year !== '') {
    start_year = safeYear(req.body.start_year);
    if (start_year === null) return res.status(400).json({ error: 'سال شروع نامعتبر است' });
  }
  try {
    const existing = query('SELECT id, start_year FROM accreditation_periods WHERE hospital_id = ?', [req.hospitalId]).rows[0];
    const now = new Date().toISOString();
    const finalStartYear = start_year !== null ? start_year : (existing ? existing.start_year : null);
    if (existing) {
      query(`UPDATE accreditation_periods SET title = ?, start_date = ?, end_date = ?, note = ?, is_active = ?, start_year = ?, updated_at = ?
             WHERE hospital_id = ?`,
        [title || null, start_date || null, end_date || null, note || null, is_active, finalStartYear, now, req.hospitalId]);
    } else {
      query(`INSERT INTO accreditation_periods (id, hospital_id, title, start_date, end_date, note, is_active, start_year, created_by, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuid(), req.hospitalId, title || null, start_date || null, end_date || null, note || null, is_active, finalStartYear, req.user.id, now]);
    }
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'accreditation_period_updated', targetTable: 'accreditation_periods', targetId: req.hospitalId, ipAddress: req.ip });
    res.json({ status: 'saved' });
  } catch (err) { console.error('[Period]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ===== راهنمای مسیر اعتباربخشی (guide timeline) =====
router.get('/guide-timeline', authRequired, hospitalScope, (req, res) => {
  try {
    const out = timelineFor(req.user.id, req.hospitalId, req.user.permissions || []);
    res.json(out);
  } catch (err) { console.error('[GuideTimeline]', err); res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

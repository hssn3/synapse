/**
 * Core Dashboard Routes
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

// ===== دروازه‌ی «بخش خریداری‌شده» (پکیج/اشتراک) — src/middleware/auth.js#requireFeature =====
// هر بلوک زیر روی پیشوند مسیرهای همان «بخش» منوی کناری (public/js/app.js → go(p)) اعمال می‌شود؛
// یک‌بار authRequired اجرا می‌شود (برای پرکردن req.user لازم برای requireFeature) و بعد چک بخش —
// route اختصاصی هر مسیر پایین‌تر باز هم authRequired/مجوز خودش را دارد و این redundant اما بی‌ضرر است.
// مسیرهای بین‌ماژولی/مشترک (مثل /org-divisions، /management/positions با GET، /evidence عمومی،
// /signatures شخصی) عمداً اینجا نیستند چون بین چند صفحه مشترک‌اند و قفل‌شان یک بخش، بخش دیگر را
// هم می‌شکند؛ کنترل دسترسی آن‌ها همچنان با فرانت (پیام قفل روی صفحه) پوشش داده می‌شود.
router.use('/accreditation', authRequired, requireFeature('measures'));
router.use('/documents', authRequired, requireFeature('documents'));
router.use('/library', authRequired, requireFeature('documents'));
router.use('/certifications', authRequired, requireFeature('documents'));
// اقلام و نگهداشت دوره‌ای زیر همان بخشِ «مستندات» گذاشته شد و کلید بخشِ تازه‌ای
// نگرفت: هیچ مستأجری امروز چنین کلیدی در پکیجش ندارد و ساختنِ کلیدِ تازه یعنی
// ماژول برای همه خاموش متولد شود.
router.use(['/assets', '/assets-due'], authRequired, requireFeature('documents'));
router.use(['/pharmacy', '/pharmacy-temp', '/pharmacy-dashboard'], authRequired, requireFeature('documents'));
router.use(['/disaster', '/disaster-dashboard'], authRequired, requireFeature('documents'));
router.use(['/infection', '/infection-dashboard'], authRequired, requireFeature('documents'));
router.use(['/occhealth', '/occhealth-dashboard'], authRequired, requireFeature('documents'));
router.use(['/hrdev', '/hrdev-dashboard'], authRequired, requireFeature('documents'));
router.use(['/vendors', '/vendors-dashboard'], authRequired, requireFeature('documents'));
router.use(['/nsupervision', '/nsupervision-dashboard'], authRequired, requireFeature('documents'));
router.use(['/finance', '/finance-dashboard'], authRequired, requireFeature('documents'));
router.use(['/patientfocus', '/patientfocus-dashboard'], authRequired, requireFeature('documents'));
router.use(['/education', '/education-dashboard'], authRequired, requireFeature('documents'));
router.use('/checklists', authRequired, requireFeature('checklists'));
router.use('/audits', authRequired, requireFeature('audits'));
router.use('/walkarounds', authRequired, requireFeature('walkarounds'));
router.use('/users/medical-errors', authRequired, requireFeature('errors'));
router.use('/fmea', authRequired, requireFeature('fmea'));
router.use('/satisfaction', authRequired, requireFeature('satisfaction'));
router.use('/committees', authRequired, requireFeature('committees'));
router.use('/programs', authRequired, requireFeature('programs'));
router.use('/training-needs', authRequired, requireFeature('training'));
router.use('/bsc', authRequired, requireFeature('bsc'));
router.use('/org-structure', authRequired, requireFeature('orgstructure'));
router.use(['/nursing/hierarchy', '/nursing/supervisors', '/nursing/wards', '/nursing/roster'], authRequired, requireFeature('nursing'));
router.use(['/nursing/head', '/nursing/leave-requests'], authRequired, requireFeature('headnurse'));
router.use('/processes', authRequired, requireFeature('processes'));
router.use('/activities', authRequired, requireFeature('activities'));
router.use('/followup', authRequired, requireFeature('patient_followup'));
// توجه: PUT /management/positions/:id (انتصاب فرد به پست) پایین‌تر (زیر «زیرساختار حوزه‌ی مدیریت»)
// مستقیماً requireFeature('management') را در زنجیره‌ی خودش دارد — چون GET همین مسیر با
// /org-chart/admins و صفحه‌ی نمودار سازمانی مشترک است و نباید با قفل «management» بسته شود.

// ===== Dashboard =====
router.get('/dashboard', authRequired, hospitalScope, (req, res) => {
  try {
    const accredStats = query(`SELECT
      SUM(CASE WHEN ms.status = 'full_compliant' THEN 1 ELSE 0 END) as full_compliant,
      SUM(CASE WHEN ms.status = 'partial' THEN 1 ELSE 0 END) as partial,
      SUM(CASE WHEN ms.status = 'non_compliant' THEN 1 ELSE 0 END) as non_compliant,
      SUM(CASE WHEN ms.status IS NULL OR ms.status = 'not_reviewed' THEN 1 ELSE 0 END) as not_reviewed,
      SUM(CASE WHEN ms.status = 'not_applicable' THEN 1 ELSE 0 END) as not_applicable,
      -- سنجه‌ی غیرقابل ارزیابی در total نمی‌آید: مخرجِ درصد آمادگی باید فقط
      -- سنجه‌هایی باشد که این مرکز واقعاً می‌تواند رویشان ارزیابی شود.
      SUM(CASE WHEN ms.status = 'not_applicable' THEN 0 ELSE 1 END) as total
      FROM accreditation_sections m LEFT JOIN measure_status ms ON ms.measure_id = m.id AND ms.hospital_id = ? AND ms.year = ?
      WHERE m.level_type = 'measure'`, [req.hospitalId, statusYear(req)]).rows[0];

    const taskStats = query(`SELECT
      SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue
      FROM tasks WHERE hospital_id = ?`, [req.hospitalId]).rows[0];

    const upcomingEvents = query(`SELECT * FROM calendar_events WHERE hospital_id = ? AND event_date >= date('now') AND event_date <= date('now', '+30 days') ORDER BY event_date LIMIT 10`, [req.hospitalId]).rows;

    const recentActivities = query(`SELECT ar.id, ar.occurred_at, ar.status, at.title as type_title, at.module, u.full_name as recorder_name
      FROM activity_records ar JOIN activity_types at ON ar.activity_type_id = at.id
      JOIN users u ON ar.recorded_by = u.id WHERE ar.hospital_id = ? ORDER BY ar.created_at DESC LIMIT 10`, [req.hospitalId]).rows;

    const pendingComplaints = query("SELECT COUNT(*) as count FROM patient_complaints_suggestions WHERE hospital_id = ? AND status = 'new'", [req.hospitalId]).rows[0].count;
    const pendingSuggestions = query("SELECT COUNT(*) as count FROM staff_suggestions WHERE hospital_id = ? AND status = 'new'", [req.hospitalId]).rows[0].count;

    let activeResolutions = 0, totalResolutions = 0;
    try {
      const rRow = query("SELECT COUNT(*) as total, SUM(CASE WHEN status != 'completed' THEN 1 ELSE 0 END) as active FROM walkaround_resolutions WHERE hospital_id = ?", [req.hospitalId]).rows[0];
      if (rRow) { activeResolutions = rRow.active || 0; totalResolutions = rRow.total || 0; }
    } catch (e) {}

    res.json({
      accreditation: { full_compliant: accredStats.full_compliant||0, partial: accredStats.partial||0, non_compliant: accredStats.non_compliant||0, not_reviewed: accredStats.not_reviewed||0, not_applicable: accredStats.not_applicable||0, total: accredStats.total||0 },
      tasks: { assigned: taskStats.assigned||0, in_progress: taskStats.in_progress||0, completed: taskStats.completed||0, overdue: taskStats.overdue||0 },
      active_resolutions: activeResolutions,
      total_resolutions: totalResolutions,
      upcoming_events: upcomingEvents, recent_activities: recentActivities,
      pending_complaints: pendingComplaints, pending_suggestions: pendingSuggestions,
    });
  } catch (err) { console.error('[Dashboard]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// وضعیت سنجه‌ها دوره‌ای است. سالِ درخواست از کوئری/بدنه می‌آید (همان سالی که
// کاربر از نوار بالای صفحه انتخاب کرده)؛ اگر نیامد، سالِ دوره‌ی فعالِ همان
// بیمارستان، و در نهایت سال جاری شمسی.
function statusYear(req) {
  const q = safeYear(req.query && req.query.year) || safeYear(req.body && req.body.year);
  if (q) return String(q);
  try {
    const p = query(`SELECT start_year FROM accreditation_periods
                      WHERE hospital_id = ? AND is_active = 1 AND start_year IS NOT NULL LIMIT 1`,
      [req.hospitalId]).rows[0];
    if (p && p.start_year) return String(p.start_year);
  } catch (e) { /* دوره اختیاری است */ }
  return String(todayJalali().jy);
}

// مقایسه‌ی طبیعی کدهای سنجه: «الف-1-2» < «الف-1-10»
function codeCmp(a, b) {
  const pa = String(a || '').split('-'), pb = String(b || '').split('-');
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i], y = pb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const nx = parseInt(x, 10), ny = parseInt(y, 10);
    const bothNum = !Number.isNaN(nx) && !Number.isNaN(ny);
    if (bothNum) { if (nx !== ny) return nx - ny; }
    else if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
function sortTree(list) {
  list.sort((a, b) => codeCmp(a.code, b.code));
  for (const n of list) if (n.children && n.children.length) sortTree(n.children);
}


module.exports = router;

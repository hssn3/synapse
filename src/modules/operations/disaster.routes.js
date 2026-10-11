/**
 * Operations Disaster Management Routes
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

// ===== مدیریت خطر حوادث و بلایا (محور الف-۲) — database/seed-disaster-safety.js =====
const DR_RESOURCES = {
  assessments: {
    table: 'disaster_safety_assessments', fa: 'ارزیابی ایمنی',
    fields: ['jalali_year', 'assessed_date', 'structural_score', 'nonstructural_score',
      'functional_score', 'total_score', 'safety_level', 'team_members', 'findings', 'action_plan', 'note'],
    ints: ['jalali_year'], floats: ['structural_score', 'nonstructural_score', 'functional_score', 'total_score'],
    order: 'jalali_year DESC',
    // الف-۲-۱-۲ هر سه حیطه را جدا خواسته؛ ارزیابی با یکی از سه نمره‌ی خالی،
    // «شاخص ایمنی بیمارستان» را قابل محاسبه نمی‌کند.
    validate: (r) => {
      if (!r.jalali_year) return 'سال ارزیابی الزامی است';
      for (const [k, l] of [['structural_score', 'سازه‌ای'], ['nonstructural_score', 'غیرسازه‌ای'], ['functional_score', 'عملکردی']])
        if (r[k] === null) return `نمره‌ی حیطه‌ی ${l} الزامی است`;
      return null;
    },
  },
  hazards: {
    table: 'disaster_hazards', fa: 'عامل خطرآفرین',
    fields: ['title', 'category', 'likelihood', 'severity', 'risk_score', 'is_priority',
      'expected_impact', 'mitigation_plan', 'responsible', 'due_date', 'status', 'committee_ref', 'note'],
    ints: ['likelihood', 'severity', 'risk_score'], bools: ['is_priority'],
    order: 'is_priority DESC, risk_score DESC',
    enums: { category: ['طبیعی', 'انسان‌ساخت', 'تکنولوژیک', 'زیستی', 'اجتماعی'],
      status: ['planned', 'in_progress', 'done'] },
    validate: (r) => {
      if (!r.title) return 'عنوان عامل خطرآفرین الزامی است';
      for (const k of ['likelihood', 'severity'])
        if (!(r[k] >= 1 && r[k] <= 5)) return 'احتمال و شدت باید عددی بین ۱ تا ۵ باشند';
      // برآوردِ خطر از ضربِ همان دو عدد می‌آید، نه از عددی که کاربر می‌فرستد —
      // وگرنه اولویت‌بندی قابل دفاع در کمیته نیست.
      r.risk_score = r.likelihood * r.severity;
      if (r.status === 'done' && !r.mitigation_plan) return 'برای پایان‌یافته اعلام‌کردن، برنامه‌ی کاهش خطر باید ثبت شود';
      return null;
    },
  },
  drills: {
    table: 'disaster_drills', fa: 'مانور/تمرین',
    fields: ['title', 'drill_type', 'hazard_ref', 'drill_date', 'scenario', 'participants',
      'participant_count', 'duration_min', 'observers', 'performance_analysis', 'weaknesses',
      'corrective_action', 'status', 'note'],
    ints: ['participant_count', 'duration_min'],
    order: 'drill_date DESC',
    enums: { drill_type: ['مانور عملیاتی', 'مانور دورمیزی (TTX)', 'مانور اعلام خبر', 'تمرین تخلیه'],
      status: ['planned', 'done', 'analyzed'] },
    // الف-۲-۴-۴ سناریو را الزامی کرده و الف-۲-۵-۲ تحلیلِ پس از تمرین را؛ مانورِ
    // بدون تحلیل همان حلقه‌ی بازی است که در بازدید گرفته می‌شود.
    validate: (r) => {
      if (!r.title) return 'عنوان مانور الزامی است';
      if (!r.drill_date) return 'تاریخ مانور الزامی است';
      if (!r.scenario) return 'تدوین سناریو الزامی است';
      if (r.status === 'analyzed' && (!r.performance_analysis || !r.corrective_action))
        return 'برای ثبت «تحلیل‌شده»، تحلیل عملکرد و اقدام اصلاحی باید ثبت شود';
      return null;
    },
  },
  incidents: {
    table: 'disaster_incidents', fa: 'حادثه',
    fields: ['incident_date', 'incident_type', 'location', 'description', 'severity', 'injuries',
      'damage_estimate', 'immediate_response', 'root_cause', 'corrective_action', 'reported_by', 'status', 'note'],
    ints: ['injuries'],
    order: 'incident_date DESC',
    enums: { incident_type: ['آتش‌سوزی', 'قطع برق', 'قطع آب', 'نشت گاز/بخار', 'سیل/آبگرفتگی', 'زلزله', 'حادثه امنیتی', 'سقوط/آسیب محیطی', 'سایر'],
      severity: ['جزئی', 'متوسط', 'شدید', 'بحرانی'], status: ['open', 'investigated', 'closed'] },
    // الف-۲-۲-۶ چرخه را «گزارش، بررسی، تحلیل و اقدام اصلاحی» تعریف کرده.
    validate: (r) => {
      if (!r.incident_date) return 'تاریخ حادثه الزامی است';
      if (!r.description) return 'شرح حادثه الزامی است';
      if (r.status === 'closed' && (!r.root_cause || !r.corrective_action))
        return 'برای بستن پرونده، تحلیل ریشه‌ای و اقدام اصلاحی باید ثبت شود';
      return null;
    },
  },
};
mountCrud('disaster', DR_RESOURCES, 'view_disaster', 'manage_disaster', 'DisasterSafety');

router.get('/disaster-dashboard', authRequired, requireAnyPermission('view_disaster', 'manage_disaster'), hospitalScope, (req, res) => {
  try {
    const one = (sql) => (query(sql, [req.hospitalId]).rows[0] || {}).c || 0;
    const last = query(`SELECT * FROM disaster_safety_assessments WHERE hospital_id = ?
      ORDER BY jalali_year DESC LIMIT 1`, [req.hospitalId]).rows[0] || null;
    res.json({
      last_assessment: last,
      hazards_total: one('SELECT COUNT(*) c FROM disaster_hazards WHERE hospital_id = ?'),
      hazards_priority: one('SELECT COUNT(*) c FROM disaster_hazards WHERE hospital_id = ? AND is_priority = 1'),
      hazards_open: one("SELECT COUNT(*) c FROM disaster_hazards WHERE hospital_id = ? AND status != 'done'"),
      drills_year: one(`SELECT COUNT(*) c FROM disaster_drills WHERE hospital_id = ?
        AND drill_date >= date('now', '-1 year')`),
      drills_unanalyzed: one("SELECT COUNT(*) c FROM disaster_drills WHERE hospital_id = ? AND status = 'done'"),
      incidents_open: one("SELECT COUNT(*) c FROM disaster_incidents WHERE hospital_id = ? AND status != 'closed'"),
      incidents_year: one(`SELECT COUNT(*) c FROM disaster_incidents WHERE hospital_id = ?
        AND incident_date >= date('now', '-1 year')`),
    });
  } catch (err) { console.error('[DisasterSafety]', err); res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

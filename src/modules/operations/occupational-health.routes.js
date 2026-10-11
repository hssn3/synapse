/**
 * Operations Occupational Health Routes
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

// ===== سلامت حرفه‌ای (الف-۳-۵/۶/۷) — database/seed-occupational-health.js =====
const OH_KINDS = ['شیمیایی', 'فیزیکی', 'بیولوژیکی', 'ارگونومیک'];
const OH_RESOURCES = {
  hazards: {
    table: 'occ_hazards', fa: 'عامل زیان‌آور',
    fields: ['kind', 'title', 'ward', 'source', 'exposed_groups', 'exposed_count', 'limit_value',
      'limit_unit', 'control_measures', 'ppe_required', 'responsible', 'review_interval_months', 'is_active', 'note'],
    ints: ['exposed_count', 'review_interval_months'], floats: ['limit_value'], bools: ['is_active'],
    defaults: { is_active: 1, review_interval_months: 12 },
    order: 'is_active DESC, kind, title',
    enums: { kind: OH_KINDS },
    // «شناسایی» در متنِ سنجه یعنی معلوم‌بودنِ منبع و افرادِ در معرض، نه فقط یک
    // نامِ خالی. بدونِ این دو، ردیف در ممیزی مدرک نیست.
    validate: (r) => {
      if (!r.title) return 'عنوان عامل زیان‌آور الزامی است';
      if (!r.exposed_groups) return 'گروه‌های در معرض الزامی است — سنجه صریحاً «شناسایی» را همین می‌داند';
      if (r.limit_value !== null && !r.limit_unit) return 'وقتی حد مجاز عددی وارد می‌کنید، واحدش هم الزامی است';
      return null;
    },
  },
  measurements: {
    table: 'occ_measurements', fa: 'اندازه‌گیری',
    fields: ['hazard_id', 'measured_date', 'value', 'value_unit', 'method', 'lab_name',
      'within_limit', 'action_taken', 'note'],
    floats: ['value'], bools: ['within_limit'],
    order: 'measured_date DESC',
    validate: (r) => {
      if (!r.hazard_id) return 'عاملِ زیان‌آورِ مربوط الزامی است';
      if (!r.measured_date) return 'تاریخ اندازه‌گیری الزامی است';
      if (r.value === null) return 'مقدار اندازه‌گیری‌شده الزامی است';
      // «داخل/خارجِ حد مجاز» از مقایسه‌ی مقدار با حدِ مجازِ همان عامل حساب می‌شود،
      // نه از تیکِ دستی — وگرنه دو ستون می‌توانستند همدیگر را نقض کنند و عددِ
      // «موارد خارج از حد» در داشبورد بی‌اعتبار می‌شد. اگر عامل حد مجاز عددی
      // ثبت‌شده ندارد، قضاوت ممکن نیست و ستون خالی می‌ماند.
      const hz = query('SELECT limit_value FROM occ_hazards WHERE id = ?', [r.hazard_id]).rows[0];
      r.within_limit = hz && hz.limit_value !== null ? (r.value <= hz.limit_value ? 1 : 0) : null;
      return null;
    },
  },
  incidents: {
    table: 'occ_incidents', fa: 'حادثه/شبه‌حادثه شغلی',
    fields: ['incident_date', 'kind', 'category', 'ward', 'shift_code', 'person_name', 'job_title',
      'description', 'injury', 'lost_work_days', 'immediate_action', 'root_cause',
      'corrective_action', 'status', 'reported_by', 'note'],
    ints: ['lost_work_days'],
    order: "CASE status WHEN 'open' THEN 0 WHEN 'investigated' THEN 1 ELSE 2 END, incident_date DESC",
    enums: {
      kind: ['حادثه', 'شبه‌حادثه'],
      category: ['فرورفتن سوزن/جسم تیز', 'تماس با خون و ترشحات', 'مواجهه با ماده‌ی شیمیایی',
        'سقوط و لغزش', 'برق‌گرفتگی', 'سوختگی', 'آسیب ناشی از جابه‌جایی بیمار', 'خشونت محل کار', 'سایر'],
      status: ['open', 'investigated', 'closed'],
    },
    // «کنترل و مدیریت می‌شوند» یعنی بسته‌شدنِ حلقه. بستنِ یک حادثه بدونِ علتِ ریشه‌ای
    // و اقدام اصلاحی، همان ثبتِ خالی است که سنجه رد می‌کند.
    validate: (r) => {
      if (!r.incident_date) return 'تاریخ رخداد الزامی است';
      if (!r.description) return 'شرح رخداد الزامی است';
      if (r.status === 'closed' && (!r.root_cause || !r.corrective_action))
        return 'برای بستنِ رخداد، علت ریشه‌ای و اقدام اصلاحی هر دو باید ثبت شوند';
      return null;
    },
  },
  exams: {
    table: 'occ_exams', fa: 'معاینه‌ی شغلی',
    fields: ['person_name', 'personnel_code', 'job_group', 'ward', 'exposure', 'exam_type',
      'exam_date', 'next_due', 'result', 'findings', 'restrictions', 'follow_up', 'note'],
    order: 'next_due',
    enums: {
      exam_type: ['بدو استخدام', 'دوره‌ای', 'بازگشت به کار', 'خاتمه‌ی کار'],
      result: ['سالم', 'نیازمند پیگیری', 'محدودیت شغلی', 'بیماری شغلی'],
    },
    validate: (r) => {
      if (!r.person_name) return 'نام فرد الزامی است';
      if (!r.exam_date) return 'تاریخ معاینه الزامی است';
      // الف‑۳‑۷‑۲: بیماری شغلیِ شناسایی‌شده باید «مدیریت» شود، پس پیگیری اجباری است.
      if (r.result === 'بیماری شغلی' && !r.follow_up)
        return 'برای نتیجه‌ی «بیماری شغلی»، برنامه‌ی پیگیری الزامی است (الف-۳-۷-۲)';
      return null;
    },
  },
};
mountCrud('occhealth', OH_RESOURCES, 'view_occhealth', 'manage_occhealth', 'OccHealth');

router.get('/occhealth-dashboard', authRequired, requireAnyPermission('view_occhealth', 'manage_occhealth'), hospitalScope, (req, res) => {
  try {
    const one = (sql) => (query(sql, [req.hospitalId]).rows[0] || {}).c || 0;
    // پوششِ چهار نوعِ عاملِ زیان‌آور: چهار سنجه‌ی جدا (الف‑۳‑۵‑۲ تا ۵) و هرکدام
    // که خالی باشد یعنی یک سنجه‌ی بی‌مدرک — پس صفر بودنش خودش خبر است.
    const byKind = {};
    for (const k of OH_KINDS) {
      byKind[k] = query(`SELECT COUNT(*) c FROM occ_hazards WHERE hospital_id = ? AND kind = ? AND is_active = 1`,
        [req.hospitalId, k]).rows[0].c;
    }
    res.json({
      hazards_by_kind: byKind,
      hazards_total: one('SELECT COUNT(*) c FROM occ_hazards WHERE hospital_id = ? AND is_active = 1'),
      hazards_unmeasured: one(`SELECT COUNT(*) c FROM occ_hazards h WHERE h.hospital_id = ? AND h.is_active = 1
        AND NOT EXISTS (SELECT 1 FROM occ_measurements m WHERE m.hazard_id = h.id)`),
      measurements_year: one(`SELECT COUNT(*) c FROM occ_measurements WHERE hospital_id = ?
        AND measured_date >= date('now', '-1 year')`),
      measurements_out_of_limit: one(`SELECT COUNT(*) c FROM occ_measurements WHERE hospital_id = ?
        AND within_limit = 0 AND measured_date >= date('now', '-1 year')`),
      incidents_open: one("SELECT COUNT(*) c FROM occ_incidents WHERE hospital_id = ? AND status != 'closed'"),
      incidents_year: one(`SELECT COUNT(*) c FROM occ_incidents WHERE hospital_id = ?
        AND incident_date >= date('now', '-1 year')`),
      near_miss_year: one(`SELECT COUNT(*) c FROM occ_incidents WHERE hospital_id = ? AND kind = 'شبه‌حادثه'
        AND incident_date >= date('now', '-1 year')`),
      exams_overdue: one(`SELECT COUNT(*) c FROM occ_exams WHERE hospital_id = ?
        AND next_due IS NOT NULL AND date(next_due) < date('now')`),
      exams_due_soon: one(`SELECT COUNT(*) c FROM occ_exams WHERE hospital_id = ?
        AND next_due IS NOT NULL AND date(next_due) BETWEEN date('now') AND date('now', '+30 day')`),
      occupational_disease: one("SELECT COUNT(*) c FROM occ_exams WHERE hospital_id = ? AND result = 'بیماری شغلی'"),
    });
  } catch (err) { console.error('[OccHealth]', err); res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

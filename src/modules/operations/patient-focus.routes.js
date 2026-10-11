/**
 * Operations Patient Focus & Readmissions Routes
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

// ===== بیمارمحوری و علت‌کاوی (الف-۱-۷-۴، الف-۱-۸-۶، الف-۱-۸-۷) — database/seed-patient-focus.js =====
const PF_RESOURCES = {
  coi: {
    table: 'pf_coi_cases', fa: 'مورد تعارض منافع',
    fields: ['case_date', 'kind', 'title', 'involved_unit', 'reported_by', 'source', 'description',
      'patient_right_violated', 'staff_informed', 'preventive_measure', 'corrective_action',
      'ethics_committee_ref', 'status', 'closed_date', 'note'],
    bools: ['patient_right_violated', 'staff_informed'],
    order: "CASE status WHEN 'شناسایی‌شده' THEN 0 WHEN 'در حال بررسی' THEN 1 WHEN 'اقدام‌شده' THEN 2 ELSE 3 END, case_date DESC",
    enums: {
      kind: ['اخذ وجه غیرقانونی از بیمار', 'نقض محرمانگی یا حریم بیمار', 'خدمات القایی',
        'تبانی در دارو و تجهیزات', 'هدایت بیمار به مرکز دیگر', 'تعارض صنفی یا گروهی', 'سایر'],
      source: ['گزارش کارکنان', 'شکایت بیمار', 'بازدید مدیریتی', 'کمیته اخلاق بالینی', 'ممیزی داخلی'],
      status: ['شناسایی‌شده', 'در حال بررسی', 'اقدام‌شده', 'بسته'],
    },
    validate: (r) => {
      if (!r.title) return 'عنوان مورد الزامی است';
      if (!r.case_date) return 'تاریخ الزامی است';
      // «انجام اقدامات اصلاحی در صورت وقوع مصادیق» — پس وقوعِ نقضِ حقوق بیمار
      // بدون اقدام اصلاحی، خودِ عدمِ انطباق است.
      if (r.patient_right_violated && !r.corrective_action)
        return 'وقتی حقوق بیمار نقض شده، اقدام اصلاحی الزامی است — الف-۱-۷-۴';
      if (r.status === 'بسته' && !r.corrective_action)
        return 'بستن پرونده بدون اقدام اصلاحی ممکن نیست — الف-۱-۷-۴';
      if (r.status === 'بسته' && !r.closed_date) r.closed_date = r.case_date;
      return null;
    },
  },
  readmissions: {
    table: 'pf_readmissions', fa: 'بستری مجدد',
    fields: ['patient_code', 'age', 'sex', 'prev_discharge_date', 'prev_ward', 'prev_service',
      'prev_diagnosis', 'readmit_date', 'readmit_ward', 'readmit_diagnosis', 'days_gap',
      'unplanned', 'exclusion', 'countable', 'root_cause_done', 'root_cause',
      'discharge_safety_related', 'action_team', 'corrective_action', 'followup_result', 'note'],
    ints: ['age', 'days_gap'],
    bools: ['unplanned', 'countable', 'root_cause_done', 'discharge_safety_related'],
    defaults: { unplanned: 1, countable: 1 },
    order: 'readmit_date DESC',
    enums: {
      sex: ['زن', 'مرد'],
      exclusion: ['ندارد', 'بستری برنامه‌ریزی‌شده', 'روان‌پزشکی', 'شیمی‌درمانی', 'دیالیز'],
    },
    validate: (r) => {
      if (!r.patient_code) return 'کد پرونده الزامی است (نامِ بیمار ثبت نمی‌شود)';
      if (!r.prev_discharge_date || !r.readmit_date) return 'تاریخ ترخیص قبلی و بستری مجدد الزامی است';
      if (r.readmit_date < r.prev_discharge_date) return 'تاریخ بستری مجدد نباید پیش از ترخیص قبلی باشد';
      // فاصله را سرور حساب می‌کند؛ همین عدد است که «طی یک ماه» بودن را تعیین
      // می‌کند و تعیینِ دستی‌اش یعنی شمارشِ دلخواه.
      r.days_gap = Math.round(
        (Date.parse(r.readmit_date) - Date.parse(r.prev_discharge_date)) / 86400000);
      // تعریفِ خودِ سنجه: ناخواسته، ظرف ۳۰ روز، و بیرون از استثناها.
      r.countable = (r.unplanned && r.days_gap <= 30 && r.exclusion === 'ندارد') ? 1 : 0;
      if (r.countable && r.root_cause_done && !r.root_cause)
        return 'تحلیل ریشه‌ای علامت خورده ولی متنش خالی است — الف-۱-۸-۶';
      if (r.root_cause && !r.corrective_action)
        return 'پس از تحلیل ریشه‌ای، اقدام اصلاحی الزامی است — الف-۱-۸-۶';
      return null;
    },
  },
  ama: {
    table: 'pf_ama_discharges', fa: 'ترخیص با میل شخصی',
    fields: ['patient_code', 'discharge_date', 'kind', 'ward', 'service', 'cause_category',
      'cause_detail', 'preventable', 'corrective_action', 'consent_form_signed',
      'risk_explained', 'followup_call_done', 'followup_result', 'recorded_by', 'note'],
    bools: ['preventable', 'consent_form_signed', 'risk_explained', 'followup_call_done'],
    order: 'discharge_date DESC',
    enums: {
      kind: ['با میل شخصی', 'با رعایت'],
      cause_category: ['نارضایتی از کیفیت خدمات', 'برخورد کارکنان', 'هزینه و مسائل مالی',
        'طولانی‌شدن بستری', 'امکانات رفاهی و اقامتی', 'مشکل خانوادگی یا شغلی',
        'عدم پذیرش روند درمان', 'انتقال به مرکز دیگر', 'سایر'],
    },
    validate: (r) => {
      if (!r.patient_code) return 'کد پرونده الزامی است (نامِ بیمار ثبت نمی‌شود)';
      if (!r.discharge_date) return 'تاریخ ترخیص الزامی است';
      // متنِ سنجه می‌گوید علت «معمولاً به‌درستی ثبت نمی‌شود»؛ پس «سایر» بدونِ
      // شرح، همان ثبتِ ناقصی است که سنجه از آن شکایت دارد.
      if (r.cause_category === 'سایر' && !r.cause_detail)
        return 'برای علتِ «سایر» شرح دقیق الزامی است — الف-۱-۸-۷';
      if (r.preventable && !r.corrective_action)
        return 'وقتی این ترخیص قابل پیشگیری بوده، اقدام اصلاحی الزامی است — الف-۱-۸-۷';
      if (!r.consent_form_signed && !r.note)
        return 'نبودِ فرم رضایت‌نامه باید در توضیح دلیل داشته باشد';
      return null;
    },
  },
};
mountCrud('patientfocus', PF_RESOURCES, 'view_patientfocus', 'manage_patientfocus', 'PatientFocus');

router.get('/patientfocus-dashboard', authRequired, requireAnyPermission('view_patientfocus', 'manage_patientfocus'), hospitalScope, (req, res) => {
  try {
    const one = (sql) => (query(sql, [req.hospitalId]).rows[0] || {}).c || 0;
    const list = (sql) => query(sql, [req.hospitalId]).rows;
    res.json({
      coi_total: one('SELECT COUNT(*) c FROM pf_coi_cases WHERE hospital_id = ?'),
      coi_open: one("SELECT COUNT(*) c FROM pf_coi_cases WHERE hospital_id = ? AND status <> 'بسته'"),
      coi_violations: one('SELECT COUNT(*) c FROM pf_coi_cases WHERE hospital_id = ? AND patient_right_violated = 1'),
      coi_not_informed: one('SELECT COUNT(*) c FROM pf_coi_cases WHERE hospital_id = ? AND staff_informed = 0'),
      readmits_year: one(`SELECT COUNT(*) c FROM pf_readmissions WHERE hospital_id = ?
        AND countable = 1 AND readmit_date >= date('now','-1 year')`),
      readmits_no_rca: one('SELECT COUNT(*) c FROM pf_readmissions WHERE hospital_id = ? AND countable = 1 AND root_cause_done = 0'),
      readmits_discharge_related: one('SELECT COUNT(*) c FROM pf_readmissions WHERE hospital_id = ? AND discharge_safety_related = 1'),
      readmits_excluded: one('SELECT COUNT(*) c FROM pf_readmissions WHERE hospital_id = ? AND countable = 0'),
      ama_year: one(`SELECT COUNT(*) c FROM pf_ama_discharges WHERE hospital_id = ?
        AND discharge_date >= date('now','-1 year')`),
      ama_preventable: one('SELECT COUNT(*) c FROM pf_ama_discharges WHERE hospital_id = ? AND preventable = 1'),
      ama_no_action: one('SELECT COUNT(*) c FROM pf_ama_discharges WHERE hospital_id = ? AND preventable = 1 AND (corrective_action IS NULL OR corrective_action = \'\')'),
      ama_no_consent: one('SELECT COUNT(*) c FROM pf_ama_discharges WHERE hospital_id = ? AND consent_form_signed = 0'),
      // «تفسیر و تحلیلِ … روندِ تکرارِ علت‌ها» یعنی صفحه باید بگوید کدام علت
      // بیش از بقیه تکرار شده — همان چیزی که فهرستِ خام نمی‌گوید.
      ama_top_causes: list(`SELECT cause_category AS k, COUNT(*) AS n FROM pf_ama_discharges
        WHERE hospital_id = ? GROUP BY cause_category ORDER BY n DESC LIMIT 5`),
      coi_top_kinds: list(`SELECT kind AS k, COUNT(*) AS n FROM pf_coi_cases
        WHERE hospital_id = ? GROUP BY kind ORDER BY n DESC LIMIT 5`),
    });
  } catch (err) { console.error('[PatientFocus]', err); res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

/**
 * Operations Nursing Supervision Routes
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

// ===== نظارت مدیریت پرستاری (الف-۴-۱-۴/۵، الف-۴-۳-۲/۳/۴) — database/seed-nursing-supervision.js =====
const NSP_RESOURCES = {
  staffing: {
    table: 'nsp_staffing', fa: 'برآورد نیرو',
    fields: ['ward', 'shift_code', 'period', 'active_beds', 'patient_count', 'acuity_level',
      'required_staff', 'assigned_staff', 'gap', 'nurse_per_bed', 'skill_mix',
      'method', 'non_care_burden', 'action_plan', 'note'],
    ints: ['active_beds', 'patient_count', 'required_staff', 'assigned_staff', 'gap'],
    floats: ['nurse_per_bed'],
    order: 'period DESC, ward, shift_code',
    enums: { shift_code: ['M', 'E', 'N'], acuity_level: ['سبک', 'متوسط', 'سنگین', 'بحرانی'] },
    validate: (r) => {
      if (!r.ward) return 'بخش الزامی است';
      if (r.required_staff === null || r.assigned_staff === null)
        return 'نفرِ لازم و نفرِ چیده‌شده هر دو الزامی‌اند — «برآورد» یعنی مقایسه‌ی همین دو';
      // کسری/مازاد و نسبت در سرور حساب می‌شوند تا ستون‌ها همدیگر را نقض نکنند
      r.gap = r.assigned_staff - r.required_staff;
      r.nurse_per_bed = r.active_beds ? Math.round((r.assigned_staff / r.active_beds) * 100) / 100 : null;
      if (!r.method) return 'روش برآورد الزامی است — الف-۴-۱-۴ «روش‌های علمی» را می‌خواهد';
      return null;
    },
  },
  care_audits: {
    table: 'nsp_care_audits', fa: 'پایش مراقبت',
    fields: ['ward', 'audit_date', 'audit_focus', 'sample_size', 'compliance_pct', 'findings',
      'root_cause', 'corrective_action', 'recheck_date', 'status', 'auditor', 'note'],
    ints: ['sample_size'], floats: ['compliance_pct'],
    order: "CASE status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, audit_date DESC",
    enums: { status: ['open', 'in_progress', 'closed'] },
    validate: (r) => {
      if (!r.ward) return 'بخش الزامی است';
      if (!r.audit_date) return 'تاریخ پایش الزامی است';
      if (!r.audit_focus) return 'موضوع پایش الزامی است';
      // «در صورت نیاز اقدامات اصلاحی مؤثر» — بستنِ پایشِ ناموفق بدون اقدام،
      // همان حلقه‌ی بازی است که ارزیاب می‌گیرد.
      if (r.status === 'closed' && r.compliance_pct !== null && r.compliance_pct < 100 && !r.corrective_action)
        return 'پایش با انطباق کمتر از ۱۰۰٪ بدون اقدام اصلاحی بسته نمی‌شود (الف-۴-۳-۲)';
      return null;
    },
  },
  record_audits: {
    table: 'nsp_record_audits', fa: 'نظارت بر پرونده',
    fields: ['ward', 'audit_date', 'sample_size', 'complete_count', 'completeness_pct',
      'common_defects', 'corrective_action', 'auditor', 'note'],
    ints: ['sample_size', 'complete_count'], floats: ['completeness_pct'],
    order: 'audit_date DESC',
    validate: (r) => {
      if (!r.ward) return 'بخش الزامی است';
      if (!r.audit_date) return 'تاریخ پایش الزامی است';
      if (!r.sample_size) return 'تعداد پرونده‌ی بررسی‌شده الزامی است';
      if (r.complete_count === null) return 'تعداد پرونده‌ی کامل الزامی است';
      if (r.complete_count > r.sample_size) return 'تعداد کامل نمی‌تواند از حجم نمونه بیشتر باشد';
      r.completeness_pct = Math.round((r.complete_count / r.sample_size) * 10000) / 100;
      return null;
    },
  },
  referrals: {
    table: 'nsp_referrals', fa: 'اعزام و ارجاع',
    fields: ['referral_date', 'patient_reference', 'from_ward', 'destination', 'reason',
      'prior_coordination', 'escort', 'transport_mode', 'patient_condition',
      'safety_checklist_done', 'outcome', 'note'],
    bools: ['prior_coordination', 'safety_checklist_done'],
    order: 'referral_date DESC',
    enums: {
      reason: ['نبود تخت ویژه', 'نبود تخصص', 'نبود تجهیزات', 'درخواست بیمار/همراه', 'ادامه‌ی درمان تخصصی', 'سایر'],
      transport_mode: ['آمبولانس بیمارستان', 'آمبولانس ۱۱۵', 'آمبولانس خصوصی', 'خودروی شخصی'],
    },
    validate: (r) => {
      if (!r.referral_date) return 'تاریخ اعزام الزامی است';
      if (!r.destination) return 'مقصد اعزام الزامی است';
      // «برابر ضوابط مربوط و رعایت اصول ایمنی بیمار» — دو چیزی که ارزیاب
      // دقیقاً می‌پرسد: هماهنگیِ قبلی، و همراهِ حین انتقال.
      if (!r.prior_coordination) return 'اعزام بدون هماهنگی قبلی با مقصد، خلاف ضوابط است (الف-۴-۳-۴)';
      if (!r.escort) return 'همراهِ حین انتقال الزامی است — اصول ایمنی بیمار';
      return null;
    },
  },
};
mountCrud('nsupervision', NSP_RESOURCES, 'view_nsupervision', 'manage_nsupervision', 'NursingSupervision');

router.get('/nsupervision-dashboard', authRequired, requireAnyPermission('view_nsupervision', 'manage_nsupervision'), hospitalScope, (req, res) => {
  try {
    const one = (sql) => (query(sql, [req.hospitalId]).rows[0] || {}).c || 0;
    const row = (sql) => query(sql, [req.hospitalId]).rows[0] || {};
    res.json({
      staffing_rows: one('SELECT COUNT(*) c FROM nsp_staffing WHERE hospital_id = ?'),
      staffing_short: one('SELECT COUNT(*) c FROM nsp_staffing WHERE hospital_id = ? AND gap < 0'),
      staffing_worst: row(`SELECT ward || ' / ' || shift_code AS c FROM nsp_staffing
        WHERE hospital_id = ? AND gap < 0 ORDER BY gap LIMIT 1`).c || null,
      care_audits_year: one(`SELECT COUNT(*) c FROM nsp_care_audits WHERE hospital_id = ?
        AND audit_date >= date('now','-1 year')`),
      care_audits_open: one("SELECT COUNT(*) c FROM nsp_care_audits WHERE hospital_id = ? AND status <> 'closed'"),
      record_audits_year: one(`SELECT COUNT(*) c FROM nsp_record_audits WHERE hospital_id = ?
        AND audit_date >= date('now','-1 year')`),
      record_completeness: (row(`SELECT ROUND(AVG(completeness_pct),1) AS c FROM nsp_record_audits
        WHERE hospital_id = ? AND audit_date >= date('now','-1 year')`).c) || 0,
      referrals_year: one(`SELECT COUNT(*) c FROM nsp_referrals WHERE hospital_id = ?
        AND referral_date >= date('now','-1 year')`),
      referrals_unsafe: one(`SELECT COUNT(*) c FROM nsp_referrals WHERE hospital_id = ?
        AND safety_checklist_done = 0`),
    });
  } catch (err) { console.error('[NursingSupervision]', err); res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

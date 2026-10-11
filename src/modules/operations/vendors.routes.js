/**
 * Operations Vendors & Contractors Routes
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

// ===== پیمانکاران و تأمین‌کنندگان (الف-۱-۱۰) — database/seed-vendors.js =====
const VND_RESOURCES = {
  vendors: {
    table: 'vendors', fa: 'پیمانکار/تأمین‌کننده',
    fields: ['kind', 'title', 'service_scope', 'contact_person', 'phone', 'national_id',
      'contract_no', 'contract_start', 'contract_end', 'contract_amount',
      'responsible_unit', 'selection_criteria', 'is_active', 'note'],
    bools: ['is_active'], defaults: { is_active: 1 },
    order: 'is_active DESC, kind, title',
    enums: { kind: ['پیمانکار', 'تأمین‌کننده'] },
    validate: (r) => {
      if (!r.title) return 'نام پیمانکار/تأمین‌کننده الزامی است';
      if (!r.service_scope) return 'دامنه‌ی خدمت یا کالا الزامی است';
      // الف‑۱‑۱۰‑۱/۳ هر دو «معیار» را صریح گفته‌اند؛ بدونِ آن انتخاب مستند نیست.
      if (!r.selection_criteria) return 'معیارهای انتخاب الزامی است — الف-۱-۱۰-۱ و ۱۰-۳';
      if (r.contract_start && r.contract_end && r.contract_end < r.contract_start)
        return 'پایان قرارداد نباید پیش از شروع باشد';
      return null;
    },
  },
  evaluations: {
    table: 'vendor_evaluations', fa: 'ارزیابی',
    fields: ['vendor_id', 'eval_date', 'purpose', 'criteria', 'quality_score', 'price_score',
      'delivery_score', 'total_score', 'decision', 'committee_ref', 'evaluator', 'note'],
    floats: ['quality_score', 'price_score', 'delivery_score', 'total_score'],
    order: 'eval_date DESC',
    enums: { purpose: ['انتخاب اولیه', 'تمدید قرارداد', 'ارزیابی مجدد'],
      decision: ['تأیید', 'تأیید مشروط', 'رد'] },
    validate: (r) => {
      if (!r.vendor_id) return 'پیمانکار/تأمین‌کننده الزامی است';
      if (!r.eval_date) return 'تاریخ ارزیابی الزامی است';
      // امتیازِ کل از جمعِ سه معیار می‌آید، نه از عددِ دستی — همان قاعده‌ای که
      // برای برآوردِ خطر در ماژول حوادث و بلایا هم گذاشته شد.
      const parts = ['quality_score', 'price_score', 'delivery_score'].map(k => r[k]).filter(v => v !== null);
      if (!parts.length) return 'حداقل یکی از امتیازها الزامی است';
      r.total_score = Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100) / 100;
      if (r.decision === 'رد' && !r.note) return 'برای تصمیمِ «رد»، دلیل در توضیح الزامی است';
      return null;
    },
  },
  reviews: {
    table: 'vendor_reviews', fa: 'پایش عملکرد',
    fields: ['vendor_id', 'period', 'review_date', 'performance_score', 'complaints_count',
      'nonconformities', 'corrective_action', 'our_satisfaction',
      'vendor_willing_to_continue', 'reviewer', 'note'],
    floats: ['performance_score'], ints: ['complaints_count'],
    order: 'review_date DESC',
    enums: { our_satisfaction: ['راضی', 'نسبتاً راضی', 'ناراضی'],
      vendor_willing_to_continue: ['بله', 'مشروط', 'خیر', 'پرسیده نشده'] },
    validate: (r) => {
      if (!r.vendor_id) return 'پیمانکار/تأمین‌کننده الزامی است';
      if (!r.review_date) return 'تاریخ پایش الزامی است';
      // «نظارت مستمر … برای تحقق نتایج مطلوب» یعنی عدمِ انطباق باید اقدام بگیرد
      if (r.nonconformities && !r.corrective_action)
        return 'وقتی عدم انطباق ثبت شده، اقدام اصلاحی الزامی است — الف-۱-۱۰-۲';
      return null;
    },
  },
  // الف-۱-۱-۲ — ذینفعان. این‌جا نشست چون همین ماژول در عمل دفترِ «طرف‌های
  // بیرونیِ سازمان» است و پیمانکار و تأمین‌کننده خودشان دو دسته‌ی ذینفع‌اند.
  stakeholders: {
    table: 'stakeholders', fa: 'ذینفع',
    fields: ['title', 'category', 'contact_person', 'influence', 'interest', 'is_key',
      'needs_analysis', 'expectations', 'policy_communicated', 'communication_method',
      'communication_date', 'analysis_date', 'note'],
    bools: ['is_key', 'policy_communicated'],
    order: 'is_key DESC, category, title',
    enums: {
      category: ['بیماران و همراهان', 'کارکنان', 'پزشکان', 'سازمان‌های بیمه‌گر',
        'دانشگاه علوم پزشکی', 'وزارت بهداشت', 'تأمین‌کنندگان و پیمانکاران',
        'خیرین و مؤسسات خیریه', 'جامعه‌ی محلی', 'سایر'],
      influence: ['زیاد', 'متوسط', 'کم'],
      interest: ['زیاد', 'متوسط', 'کم'],
    },
    validate: (r) => {
      if (!r.title) return 'نام ذینفع الزامی است';
      // «شناسایی **و تحلیل** ذینفعان انجام...» — شناسایی بدون تحلیل، نصفِ سنجه است
      if (!r.needs_analysis)
        return 'تحلیل نیازها و انتظارات الزامی است — الف-۱-۱-۲ فقط شناسایی نخواسته';
      // «...و سیاست‌های اصلی به ذینفعان **کلیدی** ابلاغ شده است» — قید فقط
      // برای کلیدی‌هاست؛ اجباری‌کردنش برای همه، سنجه را سخت‌تر از متنش می‌کند.
      if (r.is_key && !r.policy_communicated)
        return 'برای ذینفعِ کلیدی، ابلاغ سیاست‌های اصلی الزامی است — الف-۱-۱-۲';
      if (r.policy_communicated && !r.communication_method)
        return 'روش ابلاغ را ثبت کنید';
      return null;
    },
  },
};
mountCrud('vendors', VND_RESOURCES, 'view_vendors', 'manage_vendors', 'Vendors');

router.get('/vendors-dashboard', authRequired, requireAnyPermission('view_vendors', 'manage_vendors'), hospitalScope, (req, res) => {
  try {
    const one = (sql) => (query(sql, [req.hospitalId]).rows[0] || {}).c || 0;
    res.json({
      contractors: one("SELECT COUNT(*) c FROM vendors WHERE hospital_id = ? AND kind = 'پیمانکار' AND is_active = 1"),
      suppliers: one("SELECT COUNT(*) c FROM vendors WHERE hospital_id = ? AND kind = 'تأمین‌کننده' AND is_active = 1"),
      no_criteria: one(`SELECT COUNT(*) c FROM vendors WHERE hospital_id = ? AND is_active = 1
        AND (selection_criteria IS NULL OR selection_criteria = '')`),
      contract_expired: one(`SELECT COUNT(*) c FROM vendors WHERE hospital_id = ? AND is_active = 1
        AND contract_end IS NOT NULL AND date(contract_end) < date('now')`),
      contract_soon: one(`SELECT COUNT(*) c FROM vendors WHERE hospital_id = ? AND is_active = 1
        AND contract_end IS NOT NULL AND date(contract_end) BETWEEN date('now') AND date('now','+60 day')`),
      // «نظارتِ مستمر» یعنی هیچ پیمانکارِ فعالی نباید بدونِ پایشِ امسال بماند
      unreviewed: one(`SELECT COUNT(*) c FROM vendors v WHERE v.hospital_id = ? AND v.is_active = 1
        AND NOT EXISTS (SELECT 1 FROM vendor_reviews r WHERE r.vendor_id = v.id
                        AND r.review_date >= date('now','-1 year'))`),
      reviews_year: one(`SELECT COUNT(*) c FROM vendor_reviews WHERE hospital_id = ?
        AND review_date >= date('now','-1 year')`),
      unhappy: one("SELECT COUNT(*) c FROM vendor_reviews WHERE hospital_id = ? AND our_satisfaction = 'ناراضی'"),
      vendor_unwilling: one("SELECT COUNT(*) c FROM vendor_reviews WHERE hospital_id = ? AND vendor_willing_to_continue = 'خیر'"),
      stakeholders: one('SELECT COUNT(*) c FROM stakeholders WHERE hospital_id = ?'),
      stakeholders_key: one('SELECT COUNT(*) c FROM stakeholders WHERE hospital_id = ? AND is_key = 1'),
      // الف-۱-۱-۲ ابلاغ را فقط برای کلیدی‌ها خواسته، پس شمارش هم همان‌جاست
      stakeholders_uninformed: one(`SELECT COUNT(*) c FROM stakeholders WHERE hospital_id = ?
        AND is_key = 1 AND policy_communicated = 0`),
    });
  } catch (err) { console.error('[Vendors]', err); res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

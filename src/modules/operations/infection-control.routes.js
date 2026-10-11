/**
 * Operations Infection Control Routes
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

// ===== پیشگیری و کنترل عفونت (محور ب-۵) — database/seed-infection-control.js =====
const IC_RESOURCES = {
  sterilizers: {
    table: 'sterilizers', fa: 'دستگاه استریل‌کننده',
    fields: ['title', 'device_type', 'location', 'serial_no', 'manufacturer', 'responsible', 'is_active'],
    bools: ['is_active'], defaults: { is_active: 1 },
    order: 'title',
    enums: { device_type: ['اتوکلاو بخار', 'پلاسما', 'اتیلن اکساید', 'فور (حرارت خشک)', 'شست‌وشوگر-ضدعفونی‌کننده'] },
    validate: (r) => r.title ? null : 'عنوان دستگاه الزامی است',
  },
  tests: {
    table: 'sterilizer_tests', fa: 'آزمون استریل‌کننده',
    fields: ['sterilizer_id', 'test_date', 'test_type', 'cycle_no', 'result', 'operator', 'action_taken', 'note'],
    order: 'test_date DESC',
    enums: { test_type: ['بیولوژیک', 'بوی-دیک (Bowie-Dick)', 'شیمیایی', 'آزمون نشتی خلأ'],
      result: ['pass', 'fail'] },
    // ب-۵-۲-۱ «اطمینان از عملکرد» می‌خواهد؛ آزمونِ مردودِ بدون اقدام یعنی
    // بارهای همان سیکل بی‌تکلیف مانده‌اند.
    validate: (r) => {
      if (!r.sterilizer_id) return 'انتخاب دستگاه الزامی است';
      if (!r.test_date) return 'تاریخ آزمون الزامی است';
      if (r.result === 'fail' && !r.action_taken) return 'برای آزمون مردود، ثبت اقدام انجام‌شده الزامی است';
      return null;
    },
  },
  batches: {
    table: 'sterile_batches', fa: 'بسته استریل',
    fields: ['sterilizer_id', 'batch_label', 'pack_content', 'cycle_no', 'sterilized_date',
      'expiry_date', 'operator', 'destination', 'chemical_indicator_ok', 'status', 'note'],
    bools: ['chemical_indicator_ok'], defaults: { chemical_indicator_ok: 1 },
    order: 'sterilized_date DESC',
    enums: { status: ['released', 'quarantined', 'recalled', 'used'] },
    // ب-۵-۲-۵ برچسب را «حاوی حداقل اطلاعات مورد نیاز برای فراخوان» خواسته؛ بدون
    // شماره سیکل و دستگاه، فراخوانِ یک بسته عملاً ممکن نیست.
    validate: (r) => {
      if (!r.batch_label) return 'برچسب بسته الزامی است';
      if (!r.pack_content) return 'محتوای بسته الزامی است';
      if (!r.sterilized_date) return 'تاریخ استریل الزامی است';
      if (r.status === 'released' && (!r.cycle_no || !r.sterilizer_id))
        return 'برای ترخیص بسته، شماره سیکل و دستگاه لازم است (الزام قابلیت فراخوان)';
      // ب-۵-۲-۲: پیش از استفاده باید از نتیجه‌ی آزمون شیمیایی اطمینان حاصل شود.
      if (r.status === 'released' && !r.chemical_indicator_ok)
        return 'بسته‌ای که اندیکاتور شیمیایی آن تأیید نشده، قابل ترخیص نیست';
      return null;
    },
  },
  handhygiene: {
    table: 'hand_hygiene_audits', fa: 'پایش بهداشت دست',
    fields: ['audit_date', 'ward', 'staff_group', 'moment', 'opportunities', 'compliant',
      'compliance_pct', 'auditor', 'corrective_action', 'note'],
    ints: ['opportunities', 'compliant'], floats: ['compliance_pct'],
    order: 'audit_date DESC',
    enums: { moment: ['هر پنج موقعیت', 'پیش از تماس با بیمار', 'پیش از اقدام آسپتیک',
      'پس از تماس با مایعات بدن', 'پس از تماس با بیمار', 'پس از تماس با محیط بیمار'] },
    // ب-۵-۴-۲ «میزان رعایت» خواسته، یعنی کسر. درصد از همین دو عدد حساب می‌شود نه
    // از عددی که کاربر می‌نویسد، وگرنه شاخص قابل دست‌کاری است.
    validate: (r) => {
      if (!r.audit_date) return 'تاریخ پایش الزامی است';
      if (!r.ward) return 'بخش الزامی است';
      if (!(r.opportunities > 0)) return 'تعداد فرصت‌های مشاهده‌شده باید بیشتر از صفر باشد';
      if (r.compliant === null || r.compliant < 0 || r.compliant > r.opportunities)
        return 'تعداد موارد رعایت‌شده نمی‌تواند از فرصت‌های مشاهده‌شده بیشتر باشد';
      r.compliance_pct = Math.round((r.compliant / r.opportunities) * 1000) / 10;
      return null;
    },
  },
  hai: {
    table: 'hai_cases', fa: 'مورد عفونت بیمارستانی',
    fields: ['detected_date', 'ward', 'infection_type', 'organism', 'patient_ref', 'device_related',
      'is_outbreak', 'reported_to_system', 'reported_date', 'control_measures', 'outcome', 'status', 'note'],
    bools: ['is_outbreak', 'reported_to_system'],
    order: 'detected_date DESC',
    enums: { infection_type: ['عفونت محل جراحی', 'پنومونی مرتبط با ونتیلاتور (VAP)',
      'عفونت ادراری مرتبط با سوند (CAUTI)', 'عفونت خونی مرتبط با کاتتر (CLABSI)', 'سایر'],
      status: ['open', 'controlled', 'closed'] },
    // ب-۵-۵-۴ طغیان را جدا حکم داده؛ طغیانِ بدون اقدام کنترلی ثبت‌شده، همان
    // چیزی است که در ممیزی به‌عنوان نبودِ پاسخ گرفته می‌شود.
    validate: (r) => {
      if (!r.detected_date) return 'تاریخ شناسایی الزامی است';
      if (!r.ward) return 'بخش الزامی است';
      if (r.is_outbreak && !r.control_measures) return 'برای مورد طغیان، ثبت اقدامات کنترلی الزامی است';
      if (r.status === 'closed' && !r.control_measures) return 'برای بستن پرونده، اقدامات کنترلی باید ثبت شود';
      return null;
    },
  },
  antibiograms: {
    table: 'antibiograms', fa: 'گزارش مقاومت میکروبی',
    fields: ['jalali_year', 'quarter', 'report_date', 'scope', 'key_findings', 'resistant_organisms',
      'prescribing_changes', 'restricted_antibiotics', 'approved_by', 'note'],
    ints: ['jalali_year', 'quarter'],
    order: 'jalali_year DESC, quarter DESC',
    // ب-۵-۶-۲: «نتایج آن در روند تجویز و مصرف منطقی آنتی‌بیوتیک اعمال شود» —
    // گزارشی که تغییری در تجویز ایجاد نکرده، این سنجه را پاسخ نمی‌دهد.
    validate: (r) => {
      if (!r.jalali_year) return 'سال گزارش الزامی است';
      if (!(r.quarter >= 1 && r.quarter <= 4)) return 'فصل باید عددی بین ۱ تا ۴ باشد';
      if (!r.key_findings) return 'یافته‌های کلیدی الزامی است';
      if (!r.prescribing_changes) return 'ثبت تغییرات اعمال‌شده در روند تجویز الزامی است';
      return null;
    },
  },
};
mountCrud('infection', IC_RESOURCES, 'view_infection', 'manage_infection', 'InfectionControl');

router.get('/infection-dashboard', authRequired, requireAnyPermission('view_infection', 'manage_infection'), hospitalScope, (req, res) => {
  try {
    const one = (sql) => (query(sql, [req.hospitalId]).rows[0] || {}).c || 0;
    // میانگینِ وزن‌دارِ بهداشت دست: مجموع رعایت‌ها بر مجموع فرصت‌ها، نه میانگینِ
    // درصدها — وگرنه یک پایشِ ۵ موردی همان وزنِ پایشِ ۲۰۰ موردی را می‌گیرد.
    const hh = query(`SELECT SUM(opportunities) o, SUM(compliant) c FROM hand_hygiene_audits
      WHERE hospital_id = ? AND audit_date >= date('now', '-90 day')`, [req.hospitalId]).rows[0] || {};
    res.json({
      sterilizers: one('SELECT COUNT(*) c FROM sterilizers WHERE hospital_id = ? AND is_active = 1'),
      failed_tests_90d: one(`SELECT COUNT(*) c FROM sterilizer_tests WHERE hospital_id = ?
        AND result = 'fail' AND test_date >= date('now', '-90 day')`),
      quarantined_batches: one("SELECT COUNT(*) c FROM sterile_batches WHERE hospital_id = ? AND status IN ('quarantined','recalled')"),
      hand_hygiene_pct: hh.o ? Math.round((hh.c / hh.o) * 1000) / 10 : null,
      hand_hygiene_opportunities: hh.o || 0,
      hai_open: one("SELECT COUNT(*) c FROM hai_cases WHERE hospital_id = ? AND status != 'closed'"),
      hai_outbreaks: one('SELECT COUNT(*) c FROM hai_cases WHERE hospital_id = ? AND is_outbreak = 1'),
      hai_unreported: one('SELECT COUNT(*) c FROM hai_cases WHERE hospital_id = ? AND reported_to_system = 0'),
      antibiograms: one('SELECT COUNT(*) c FROM antibiograms WHERE hospital_id = ?'),
    });
  } catch (err) { console.error('[InfectionControl]', err); res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

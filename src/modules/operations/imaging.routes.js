/**
 * Operations Imaging Services Routes
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

// ===== تصویربرداری و ایمنی پرتو (محور ب-۷) — database/seed-imaging.js =====
const IMG_MODALITIES = ['رادیوگرافی', 'CT', 'MRI', 'فلوروسکوپی', 'سونوگرافی', 'ماموگرافی', 'دانسیتومتری'];

// ساعتِ HH:MM → دقیقه؛ گذر از نیمه‌شب مثبت می‌ماند. همان قاعده‌ی ب-۸-۳-۲.
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
function minutesBetween(from, to) {
  const m = (t) => (+t.slice(0, 2)) * 60 + (+t.slice(3, 5));
  let d = m(to) - m(from);
  if (d < 0) d += 24 * 60;
  return d;
}

const IMG_RESOURCES = {
  devices: {
    table: 'imaging_devices', fa: 'دستگاه تصویربرداری',
    fields: ['title', 'modality', 'manufacturer', 'model', 'serial_no', 'install_date',
      'location', 'digital_output', 'pacs_connected', 'responsible', 'is_active', 'note'],
    bools: ['digital_output', 'pacs_connected', 'is_active'],
    defaults: { is_active: 1 },
    order: 'modality, title',
    enums: { modality: IMG_MODALITIES },
    validate: (r) => r.title ? null : 'عنوان دستگاه الزامی است',
  },
  qc: {
    table: 'imaging_qc', fa: 'کنترل کیفی / کالیبراسیون',
    fields: ['device_id', 'kind', 'performed_date', 'company', 'aeoi_approved', 'certificate_no',
      'valid_until', 'is_valid', 'result', 'findings', 'corrective_action', 'note'],
    bools: ['aeoi_approved', 'is_valid'],
    order: 'performed_date DESC',
    enums: { kind: ['کنترل کیفی سالانه', 'کالیبراسیون اختصاصی سازنده'], result: ['pass', 'fail'] },
    // ب-۷-۳-۶ دو الزامِ جدا دارد و این‌جا هر دو سنجیده می‌شود: تأییدیه باید
    // «حداقل سالانه» و «از شرکت‌های موردتأیید سازمان انرژی اتمی» باشد. تأییدیه‌ی
    // شرکتِ تأییدنشده هیچ‌چیز را اثبات نمی‌کند، پس اصلاً ثبت نمی‌شود.
    // اعتبارِ روز را هم سرور از تاریخ حساب می‌کند، نه با تیک.
    validate: (r) => {
      if (!r.device_id) return 'انتخاب دستگاه الزامی است';
      if (!r.performed_date) return 'تاریخ انجام الزامی است';
      if (r.kind === 'کنترل کیفی سالانه') {
        if (!r.company) return 'نام شرکت انجام‌دهنده الزامی است (ب-۷-۳-۶)';
        if (!r.aeoi_approved)
          return 'تأییدیه فقط از شرکت‌های موردتأیید سازمان انرژی اتمی معتبر است (ب-۷-۳-۶)';
        if (!r.certificate_no) return 'شماره تأییدیه الزامی است';
        if (!r.valid_until) return 'تاریخ اعتبار تأییدیه الزامی است';
        if (r.valid_until <= r.performed_date) return 'تاریخ اعتبار باید پس از تاریخ انجام باشد';
      }
      if (r.result === 'fail' && !r.corrective_action)
        return 'برای نتیجه‌ی مردود، ثبت اقدام اصلاحی الزامی است';
      const today = new Date().toISOString().slice(0, 10);
      r.is_valid = (r.valid_until && r.valid_until >= today) ? 1 : 0;
      return null;
    },
  },
  dosimetry: {
    table: 'radiation_dosimetry', fa: 'دزیمتری پرتوکاران',
    fields: ['staff_name', 'job_title', 'badge_no', 'period_from', 'period_to', 'dose_msv',
      'dose_limit_msv', 'over_limit', 'action_taken', 'reported_by', 'note'],
    floats: ['dose_msv', 'dose_limit_msv'], bools: ['over_limit'],
    order: 'period_to DESC, staff_name',
    // حدِ مجاز بر حسب دوره و نوعِ پرتوکار فرق می‌کند، پس ثابتِ برنامه نیست و روی
    // رکورد می‌نشیند؛ ولی «عبور از حد» را سرور تعیین می‌کند نه کاربر — دزی که
    // با یک تیک «مجاز» اعلام شود، همان چیزی است که پایش را بی‌معنا می‌کند.
    validate: (r) => {
      if (!r.staff_name) return 'نام پرتوکار الزامی است';
      if (!r.period_from || !r.period_to) return 'بازه‌ی دزیمتری الزامی است';
      if (r.period_to < r.period_from) return 'پایان بازه نمی‌تواند پیش از شروع آن باشد';
      if (r.dose_msv === null) return 'دز دریافتی (میلی‌سیورت) الزامی است';
      if (r.dose_limit_msv === null) return 'حد مجاز همان بازه الزامی است';
      r.over_limit = r.dose_msv > r.dose_limit_msv ? 1 : 0;
      if (r.over_limit && !r.action_taken)
        return 'دز از حد مجاز بیشتر است؛ ثبت اقدام انجام‌شده الزامی است (ب-۷-۱-۳)';
      return null;
    },
  },
  prep: {
    table: 'imaging_prep_forms', fa: 'فرم آمادگی پروسیجر',
    fields: ['procedure_name', 'modality', 'needs_prep', 'form_ready', 'available_to_wards',
      'prep_summary', 'approved_by', 'approved_date', 'note'],
    bools: ['needs_prep', 'form_ready', 'available_to_wards'],
    defaults: { needs_prep: 1 },
    order: 'modality, procedure_name',
    enums: { modality: [''].concat(IMG_MODALITIES) },
    uniqueHint: { msg: 'برای این پروسیجر قبلاً ردیفی ثبت شده است' },
    // ب-۷-۲-۲ سه گام دارد و «فرم آماده» با «در دسترسِ بخش‌ها» یکی نیست: فرمی که
    // در کشوی واحد تصویربرداری بماند، برای بخشِ بستری وجود ندارد.
    validate: (r) => {
      if (!r.procedure_name) return 'نام پروسیجر الزامی است';
      if (r.needs_prep && r.form_ready && !r.prep_summary)
        return 'خلاصه‌ی آمادگیِ لازم را بنویسید (متنِ همان فرم)';
      if (r.available_to_wards && !r.form_ready)
        return 'فرمی که هنوز تهیه نشده نمی‌تواند در دسترس بخش‌ها باشد';
      return null;
    },
  },
  criticalreports: {
    table: 'imaging_critical_reports', fa: 'گزارش یافته‌ی بحرانی',
    fields: ['report_date', 'modality', 'finding', 'patient_ref', 'ward', 'result_time',
      'reported_time', 'minutes_to_report', 'reported_by', 'receiver_name', 'read_back_done', 'note'],
    ints: ['minutes_to_report'], bools: ['read_back_done'],
    order: 'report_date DESC',
    enums: { modality: [''].concat(IMG_MODALITIES) },
    // ب-۷-۳-۵: «خط آزاد ارتباطی» و «ارتباط مؤثر و به‌موقع». مثل ب-۸-۳-۲،
    // به‌موقع‌بودن از دو ساعت حساب می‌شود نه از تیکِ کاربر.
    validate: (r) => {
      if (!r.report_date) return 'تاریخ الزامی است';
      if (!r.finding) return 'شرح یافته‌ی بحرانی الزامی است';
      if (!r.ward) return 'بخش دریافت‌کننده الزامی است';
      if (!r.receiver_name) return 'نام گیرنده‌ی گزارش الزامی است (ب-۷-۳-۵)';
      if (!r.read_back_done) return 'تأیید بازخوانی نتیجه توسط گیرنده الزامی است';
      if (!r.result_time || !HHMM.test(r.result_time)) return 'ساعت آماده‌شدن گزارش الزامی است (قالب HH:MM)';
      if (!r.reported_time || !HHMM.test(r.reported_time)) return 'ساعت اعلام به بخش الزامی است (قالب HH:MM)';
      r.minutes_to_report = minutesBetween(r.result_time, r.reported_time);
      return null;
    },
  },
  reviews: {
    table: 'imaging_quality_reviews', fa: 'بازبینی دوره‌ای کیفیت',
    fields: ['review_date', 'period_label', 'factors_found', 'priorities', 'corrective_action',
      'presented_to_leadership', 'presented_date', 'reviewer', 'note'],
    bools: ['presented_to_leadership'],
    order: 'review_date DESC',
    // ب-۷-۳-۴ سه چیز را با هم خواسته: بررسیِ حداقل ماهیانه، طراحی اقدام اصلاحی،
    // و ارائه‌ی راهکار به تیم رهبری. بازبینیِ بدون اقدام، فقط یک یادداشت است.
    validate: (r) => {
      if (!r.review_date) return 'تاریخ بازبینی الزامی است';
      if (!r.factors_found) return 'عوامل شناسایی‌شده الزامی است';
      if (!r.corrective_action) return 'اقدام اصلاحی/برنامه بهبود الزامی است (ب-۷-۳-۴)';
      if (r.presented_to_leadership && !r.presented_date)
        return 'تاریخ ارائه به تیم رهبری الزامی است';
      return null;
    },
  },
};
mountCrud('imaging', IMG_RESOURCES, 'view_imaging', 'manage_imaging', 'Imaging');

router.get('/imaging-dashboard', authRequired, requireAnyPermission('view_imaging', 'manage_imaging'), hospitalScope, (req, res) => {
  try {
    const one = (sql) => (query(sql, [req.hospitalId]).rows[0] || {}).c || 0;
    const cr = query(`SELECT COUNT(*) n, AVG(minutes_to_report) avg_min FROM imaging_critical_reports
      WHERE hospital_id = ? AND report_date >= date('now', '-90 day')`, [req.hospitalId]).rows[0] || {};
    // «دستگاهِ بدون تأییدیه‌ی معتبر» — یعنی هیچ کنترل کیفیِ سالانه‌ی معتبری ندارد.
    // این همان چیزی است که ارزیابِ ب-۷-۳-۶ اول از همه می‌پرسد.
    const noQc = query(`SELECT COUNT(*) c FROM imaging_devices d WHERE d.hospital_id = ? AND d.is_active = 1
      AND NOT EXISTS (SELECT 1 FROM imaging_qc q WHERE q.device_id = d.id
        AND q.kind = 'کنترل کیفی سالانه' AND q.is_valid = 1)`, [req.hospitalId]).rows[0] || {};
    res.json({
      devices: one('SELECT COUNT(*) c FROM imaging_devices WHERE hospital_id = ? AND is_active = 1'),
      devices_no_valid_qc: noQc.c || 0,
      qc_expiring_60d: one(`SELECT COUNT(*) c FROM imaging_qc WHERE hospital_id = ? AND is_valid = 1
        AND valid_until <= date('now', '+60 day')`),
      devices_no_pacs: one('SELECT COUNT(*) c FROM imaging_devices WHERE hospital_id = ? AND is_active = 1 AND pacs_connected = 0'),
      dosimetry_records: one('SELECT COUNT(*) c FROM radiation_dosimetry WHERE hospital_id = ?'),
      dosimetry_over_limit: one('SELECT COUNT(*) c FROM radiation_dosimetry WHERE hospital_id = ? AND over_limit = 1'),
      prep_missing_form: one('SELECT COUNT(*) c FROM imaging_prep_forms WHERE hospital_id = ? AND needs_prep = 1 AND form_ready = 0'),
      prep_not_available: one('SELECT COUNT(*) c FROM imaging_prep_forms WHERE hospital_id = ? AND form_ready = 1 AND available_to_wards = 0'),
      critical_reports_90d: cr.n || 0,
      critical_avg_minutes: cr.n ? Math.round(cr.avg_min) : null,
      reviews_90d: one(`SELECT COUNT(*) c FROM imaging_quality_reviews WHERE hospital_id = ?
        AND review_date >= date('now', '-90 day')`),
      reviews_not_presented: one('SELECT COUNT(*) c FROM imaging_quality_reviews WHERE hospital_id = ? AND presented_to_leadership = 0'),
    });
  } catch (err) { console.error('[Imaging]', err); res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

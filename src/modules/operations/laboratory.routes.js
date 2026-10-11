/**
 * Operations Laboratory Services Routes
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

// ===== خدمات آزمایشگاه (محور ب-۸) — database/seed-laboratory.js =====
// ب-۸-۲-۳ کنترل کیفیت را «در بخش‌های مختلف آزمایشگاه» خواسته، پس بخش جزء
// هویتِ رکوردِ کنترل کیفی است نه یک توضیح.
const LAB_SECTIONS = ['بیوشیمی', 'هماتولوژی', 'انعقاد', 'میکروب‌شناسی',
  'ایمونولوژی و سرولوژی', 'هورمون', 'ادرار و مدفوع', 'پاتولوژی'];

const LAB_RESOURCES = {
  samples: {
    table: 'lab_sample_checks', fa: 'کنترل نمونه‌ی ورودی',
    fields: ['check_date', 'ward', 'sample_type', 'patient_ref', 'two_identifiers',
      'collection_time_on_label', 'label_complete', 'sampler_name', 'accepted', 'reject_reason',
      'ward_notified', 'follow_up_owner', 'resampled', 'resample_date', 'checked_by', 'note'],
    bools: ['two_identifiers', 'collection_time_on_label', 'label_complete', 'accepted',
      'ward_notified', 'resampled'],
    defaults: { two_identifiers: 1, collection_time_on_label: 1, label_complete: 1, accepted: 1 },
    order: 'check_date DESC',
    enums: { sample_type: ['خون', 'ادرار', 'مدفوع', 'کشت/سواب', 'مایعات بدن', 'بافت', 'سایر'] },
    // ب-۸-۱-۲ سه چیز را جدا الزام کرده (دو شناسه، تاریخ/ساعت روی برچسب، برچسبِ
    // کامل)؛ نمونه‌ای که یکی از آن‌ها را ندارد طبق ب-۸-۱-۴ باید رد شود.
    // و ردکردن پایانِ کار نیست: کتاب «هماهنگی بلافاصله با بخش مربوطه و تجدید
    // نمونه» را خواسته، پس مسئول پیگیری اجباری است.
    validate: (r) => {
      if (!r.check_date) return 'تاریخ کنترل الزامی است';
      if (!r.ward) return 'بخش الزامی است';
      if (r.accepted && (!r.two_identifiers || !r.collection_time_on_label || !r.label_complete))
        return 'نمونه با برچسبِ ناقص، بدون دو شناسه یا بدون تاریخ/ساعت نمونه‌گیری قابل پذیرش نیست (ب-۸-۱-۲)';
      if (!r.accepted && !r.reject_reason) return 'برای نمونه‌ی ردشده، ثبت علت رد الزامی است';
      if (!r.accepted && !r.follow_up_owner)
        return 'برای نمونه‌ی ردشده، تعیین مسئول پیگیری الزامی است (ب-۸-۱-۴)';
      if (r.resampled && !r.resample_date) return 'تاریخ نمونه‌گیری مجدد الزامی است';
      return null;
    },
  },
  reference: {
    table: 'lab_reference', fa: 'جدول ابلاغی به بخش‌ها',
    fields: ['kind', 'item_name', 'category', 'limit_minutes', 'storage_condition',
      'announced_to_wards', 'announced_date', 'approved_by', 'note'],
    ints: ['limit_minutes'], bools: ['announced_to_wards'],
    order: 'kind, item_name',
    enums: { kind: ['زمان پاسخ‌دهی', 'پایداری نمونه'], category: ['', 'روتین', 'اورژانس'] },
    // هر دو سنجه (ب-۸-۲-۴ و ب-۸-۳-۳) «اطلاع‌رسانی به بخش‌های بستری و اورژانس»
    // را جزء الزام آورده‌اند؛ جدولی که ابلاغ نشده، برای بخش وجود ندارد.
    validate: (r) => {
      if (!r.item_name) return 'نام آزمایش/نوع نمونه الزامی است';
      if (!(r.limit_minutes > 0)) return 'سقف زمانی (دقیقه) باید بیشتر از صفر باشد';
      if (r.kind === 'زمان پاسخ‌دهی' && !r.category)
        return 'برای زمان پاسخ‌دهی، تعیین «روتین» یا «اورژانس» الزامی است (ب-۸-۳-۳)';
      if (r.kind === 'پایداری نمونه' && !r.storage_condition)
        return 'شرایط نگهداری نمونه الزامی است (ب-۸-۲-۴)';
      if (r.announced_to_wards && !r.announced_date) return 'تاریخ ابلاغ به بخش‌ها الزامی است';
      return null;
    },
  },
  qc: {
    table: 'lab_qc_records', fa: 'کنترل کیفیت',
    fields: ['kind', 'qc_date', 'shift', 'lab_section', 'test_name', 'control_level', 'lot_no',
      'result', 'interpretation', 'corrective_action', 'provider', 'round_no', 'performed_by', 'note'],
    order: 'qc_date DESC',
    enums: { kind: ['internal', 'external'], result: ['pass', 'fail'],
      shift: ['صبح', 'عصر', 'شب'], lab_section: LAB_SECTIONS },
    // ب-۸-۲-۳ «در هر نوبت کاری» است، پس نوبت جزء هویتِ رکورد است نه یک توضیح؛
    // و «اقدامات اصلاحی متناسب در صورت قابل قبول نبودن نتایج» یعنی نتیجه‌ی مردود
    // بدون اقدام، سابقه‌ی ناقص است.
    validate: (r) => {
      if (!r.qc_date) return 'تاریخ کنترل کیفیت الزامی است';
      if (!r.test_name) return 'نام آزمایش الزامی است';
      if (r.kind === 'internal' && !r.control_level)
        return 'سطح نمونه‌ی کنترل (نرمال/پاتولوژیک) الزامی است';
      if (r.kind === 'external' && !r.provider) return 'نام برگزارکننده‌ی ارزیابی خارجی الزامی است';
      if (r.result === 'fail' && !r.corrective_action)
        return 'برای نتیجه‌ی غیرقابل‌قبول، ثبت اقدام اصلاحی الزامی است (ب-۸-۲-۳)';
      return null;
    },
  },
  supervision: {
    table: 'lab_supervisions', fa: 'ارزیابی آزمایشگاه مرجع سلامت',
    fields: ['visit_date', 'assessor', 'score', 'max_score', 'min_required', 'passed',
      'findings', 'action_plan', 'action_due', 'note'],
    floats: ['score', 'max_score', 'min_required'], bools: ['passed'],
    order: 'visit_date DESC',
    // ب-۸-۲-۱ «کسب امتیاز قابل قبول» را می‌خواهد و خودش می‌گوید حدِ نصاب را
    // آزمایشگاه مرجع سلامت تعیین و ابلاغ می‌کند — پس عددش ثابتِ برنامه نیست و
    // روی رکورد می‌نشیند؛ ولی قضاوتِ «قبول شد» را سرور می‌کند، نه کاربر.
    validate: (r) => {
      if (!r.visit_date) return 'تاریخ بازدید الزامی است';
      if (r.score === null) return 'امتیاز کسب‌شده الزامی است';
      if (r.min_required === null) return 'حد نصاب ابلاغی آزمایشگاه مرجع سلامت الزامی است';
      if (r.max_score !== null && r.score > r.max_score)
        return 'امتیاز کسب‌شده نمی‌تواند از امتیاز کل بیشتر باشد';
      r.passed = r.score >= r.min_required ? 1 : 0;
      if (!r.passed && !r.action_plan)
        return 'امتیاز کمتر از حد نصاب است؛ ثبت برنامه‌ی اقدام اصلاحی الزامی است';
      return null;
    },
  },
  referrals: {
    table: 'lab_referrals', fa: 'آزمایشگاه طرف قرارداد',
    fields: ['lab_name', 'contract_no', 'contract_date', 'contract_expiry', 'scope',
      'packaging_standard', 'turnaround_agreed', 'competency_assessed', 'assessment_date',
      'assessment_result', 'is_active', 'note'],
    bools: ['packaging_standard', 'competency_assessed', 'is_active'],
    defaults: { is_active: 1 },
    order: 'lab_name',
    // ب-۸-۲-۶ دو چیز را با هم خواسته: قراردادِ مکتوب، و «انجام ارزیابی صلاحیت
    // دوره‌ای … و نگهداری سوابق آن». ارزیابیِ بدون تاریخ و نتیجه، سابقه نیست.
    validate: (r) => {
      if (!r.lab_name) return 'نام آزمایشگاه الزامی است';
      if (r.is_active && !r.contract_no) return 'شماره قرارداد مکتوب الزامی است (ب-۸-۲-۶)';
      if (r.contract_date && r.contract_expiry && r.contract_expiry < r.contract_date)
        return 'تاریخ اعتبار قرارداد نمی‌تواند پیش از تاریخ عقد آن باشد';
      if (r.competency_assessed && (!r.assessment_date || !r.assessment_result))
        return 'تاریخ و نتیجه‌ی ارزیابی صلاحیت الزامی است (ب-۸-۲-۶)';
      return null;
    },
  },
  critical: {
    table: 'lab_critical_values', fa: 'دامنه‌ی مقادیر بحرانی',
    fields: ['test_name', 'patient_group', 'low_value', 'high_value', 'unit',
      'approved_by', 'approved_date', 'posted_visible', 'note'],
    bools: ['posted_visible'],
    order: 'test_name, patient_group',
    enums: { patient_group: ['بزرگسال', 'نوزاد', 'کودک', 'بیمار دیالیزی', 'باردار'] },
    uniqueHint: { msg: 'برای این آزمایش و این گروه بیمار، دامنه‌ی بحرانی قبلاً ثبت شده است' },
    // ب-۸-۳-۱ «دامنه یا مقادیر بحرانی» می‌خواهد — دست‌کم یک کران. رکوردی بدون
    // هیچ کران، هیچ نتیجه‌ای را بحرانی نمی‌کند و فقط ردیف خالی است.
    validate: (r) => {
      if (!r.test_name) return 'نام آزمایش الزامی است';
      if (!r.low_value && !r.high_value)
        return 'دست‌کم یکی از کران پایین یا بالا الزامی است (ب-۸-۳-۱)';
      return null;
    },
  },
  criticalreports: {
    table: 'lab_critical_reports', fa: 'گزارش نتیجه‌ی بحرانی',
    fields: ['report_date', 'test_name', 'result_value', 'patient_ref', 'ward', 'result_time',
      'reported_time', 'minutes_to_report', 'reported_by', 'receiver_name', 'read_back_done',
      'repeat_test_done', 'repeat_result', 'note'],
    ints: ['minutes_to_report'], bools: ['read_back_done', 'repeat_test_done'],
    order: 'report_date DESC',
    // ب-۸-۳-۲ سه چیز را با هم خواسته و هر سه این‌جا سنجیده می‌شوند: اعلامِ آنی،
    // روشِ Repeat Back («کنترل مجدد نتیجه توسط گیرنده»)، و «کنترل مجدد نتایج
    // بحرانی پس از اعلام اضطراری نتیجه اولیه» یعنی تکرارِ خودِ آزمایش.
    // فاصله‌ی زمانی را سرور از دو ساعت حساب می‌کند؛ «آنی» با تیک اثبات نمی‌شود.
    validate: (r) => {
      if (!r.report_date) return 'تاریخ الزامی است';
      if (!r.test_name) return 'نام آزمایش الزامی است';
      if (!r.ward) return 'بخش دریافت‌کننده الزامی است';
      if (!r.receiver_name) return 'نام گیرنده‌ی گزارش در بخش الزامی است (ب-۸-۳-۲)';
      if (!r.read_back_done) return 'تأیید بازخوانی نتیجه توسط گیرنده الزامی است (Repeat Back — ب-۸-۳-۲)';
      const hhmm = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!r.result_time || !hhmm.test(r.result_time)) return 'ساعت آماده‌شدن نتیجه الزامی است (قالب HH:MM)';
      if (!r.reported_time || !hhmm.test(r.reported_time)) return 'ساعت اعلام به بخش الزامی است (قالب HH:MM)';
      const min = (t) => (+t.slice(0, 2)) * 60 + (+t.slice(3, 5));
      let d = min(r.reported_time) - min(r.result_time);
      if (d < 0) d += 24 * 60;   // اعلام پس از نیمه‌شب
      r.minutes_to_report = d;
      if (r.repeat_test_done && !r.repeat_result) return 'نتیجه‌ی آزمایش تکرارشده الزامی است';
      return null;
    },
  },
  tat: {
    table: 'lab_tat_audits', fa: 'پایش زمان پاسخ‌دهی',
    fields: ['audit_date', 'category', 'lab_section', 'samples_checked', 'within_target',
      'compliance_pct', 'auditor', 'corrective_action', 'note'],
    ints: ['samples_checked', 'within_target'], floats: ['compliance_pct'],
    order: 'audit_date DESC',
    enums: { category: ['روتین', 'اورژانس'], lab_section: [''].concat(LAB_SECTIONS) },
    // ب-۸-۳-۵ «اندازه‌گیری دوره‌ای شاخص‌ها» است، یعنی کسر. درصد از همین دو عدد
    // حساب می‌شود نه از عددی که کاربر می‌نویسد — همان قاعده‌ی بهداشت دست.
    validate: (r) => {
      if (!r.audit_date) return 'تاریخ پایش الزامی است';
      if (!(r.samples_checked > 0)) return 'تعداد نمونه‌های بررسی‌شده باید بیشتر از صفر باشد';
      if (r.within_target === null || r.within_target < 0 || r.within_target > r.samples_checked)
        return 'تعداد در مهلت نمی‌تواند از نمونه‌های بررسی‌شده بیشتر باشد';
      r.compliance_pct = Math.round((r.within_target / r.samples_checked) * 1000) / 10;
      if (r.compliance_pct < 90 && !r.corrective_action)
        return 'رعایت کمتر از ۹۰٪ است؛ ثبت اقدام اصلاحی الزامی است (ب-۸-۳-۵)';
      return null;
    },
  },
};
mountCrud('lab', LAB_RESOURCES, 'view_lab', 'manage_lab', 'Laboratory');

router.get('/lab-dashboard', authRequired, requireAnyPermission('view_lab', 'manage_lab'), hospitalScope, (req, res) => {
  try {
    const one = (sql) => (query(sql, [req.hospitalId]).rows[0] || {}).c || 0;
    // درصد رعایتِ زمان پاسخ‌دهی: میانگینِ وزن‌دار (مجموع در مهلت بر مجموع نمونه‌ها)،
    // نه میانگینِ درصدها — وگرنه پایشِ ده‌نمونه‌ای همان وزنِ پایشِ دویست‌نمونه‌ای را می‌گیرد.
    const tat = query(`SELECT SUM(samples_checked) n, SUM(within_target) ok FROM lab_tat_audits
      WHERE hospital_id = ? AND audit_date >= date('now', '-90 day')`, [req.hospitalId]).rows[0] || {};
    const cr = query(`SELECT COUNT(*) n, AVG(minutes_to_report) avg_min FROM lab_critical_reports
      WHERE hospital_id = ? AND report_date >= date('now', '-90 day')`, [req.hospitalId]).rows[0] || {};
    const sup = query(`SELECT * FROM lab_supervisions WHERE hospital_id = ?
      ORDER BY visit_date DESC LIMIT 1`, [req.hospitalId]).rows[0] || null;
    res.json({
      // ب-۸-۲-۵ «سه نوبت در سال». دوازده‌ماهِ گذشته گرفته شده نه سالِ تقویمی،
      // چون آنچه ارزیاب می‌پرسد «امسال چند نوبت شرکت کردید» در عمل همین است و
      // به تبدیلِ شمسی/میلادی گره نمی‌خورد.
      eqa_12m: one(`SELECT COUNT(*) c FROM lab_qc_records WHERE hospital_id = ? AND kind = 'external'
        AND qc_date >= date('now', '-365 day')`),
      qc_failed_90d: one(`SELECT COUNT(*) c FROM lab_qc_records WHERE hospital_id = ? AND result = 'fail'
        AND qc_date >= date('now', '-90 day')`),
      qc_internal_30d: one(`SELECT COUNT(*) c FROM lab_qc_records WHERE hospital_id = ? AND kind = 'internal'
        AND qc_date >= date('now', '-30 day')`),
      samples_rejected_open: one('SELECT COUNT(*) c FROM lab_sample_checks WHERE hospital_id = ? AND accepted = 0 AND resampled = 0'),
      samples_rejected_90d: one(`SELECT COUNT(*) c FROM lab_sample_checks WHERE hospital_id = ? AND accepted = 0
        AND check_date >= date('now', '-90 day')`),
      reference_unannounced: one('SELECT COUNT(*) c FROM lab_reference WHERE hospital_id = ? AND announced_to_wards = 0'),
      critical_values: one('SELECT COUNT(*) c FROM lab_critical_values WHERE hospital_id = ?'),
      critical_not_posted: one('SELECT COUNT(*) c FROM lab_critical_values WHERE hospital_id = ? AND posted_visible = 0'),
      critical_reports_90d: cr.n || 0,
      critical_avg_minutes: cr.n ? Math.round(cr.avg_min) : null,
      critical_no_repeat: one(`SELECT COUNT(*) c FROM lab_critical_reports WHERE hospital_id = ?
        AND repeat_test_done = 0`),
      tat_pct: tat.n ? Math.round((tat.ok / tat.n) * 1000) / 10 : null,
      tat_samples: tat.n || 0,
      // قراردادی که تاریخش گذشته، یا آزمایشگاهی که ارزیابی صلاحیتش نشده
      referrals_expired: one(`SELECT COUNT(*) c FROM lab_referrals WHERE hospital_id = ? AND is_active = 1
        AND contract_expiry IS NOT NULL AND contract_expiry < date('now')`),
      referrals_unassessed: one('SELECT COUNT(*) c FROM lab_referrals WHERE hospital_id = ? AND is_active = 1 AND competency_assessed = 0'),
      supervision_last: sup ? { visit_date: sup.visit_date, score: sup.score,
        min_required: sup.min_required, passed: !!sup.passed } : null,
    });
  } catch (err) { console.error('[Laboratory]', err); res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

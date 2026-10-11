/**
 * Operations Finance & Donations Routes
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

// ===== منابع مالی و مشارکت‌های مردمی (الف-۱-۹-۱، الف-۱-۹-۳) — database/seed-finance.js =====
const FIN_RESOURCES = {
  budget: {
    table: 'fin_budget_lines', fa: 'ردیف بودجه',
    fields: ['year', 'period', 'program_title', 'budget_code', 'source', 'allocated_amount',
      'spent_amount', 'variance', 'variance_pct', 'aligned_with_program', 'deviation_reason',
      'corrective_action', 'responsible', 'approved_by', 'note'],
    floats: ['allocated_amount', 'spent_amount', 'variance', 'variance_pct'],
    bools: ['aligned_with_program'], defaults: { aligned_with_program: 1 },
    order: 'year DESC, period DESC, program_title',
    enums: { source: ['ردیف بودجه‌ای', 'کمک برنامه‌ای وزارت', 'درآمد اختصاصی', 'خیرین و مشارکت مردمی', 'سایر'] },
    validate: (r) => {
      if (!r.program_title) return 'عنوان برنامه الزامی است — الف-۱-۹-۱ هزینه‌کرد را «مطابق اهداف برنامه» خواسته';
      if (!r.year) return 'سال الزامی است';
      if (r.allocated_amount == null) return 'مبلغ تخصیصی الزامی است';
      // انحراف در سرور حساب می‌شود؛ عددِ دستی با تخصیص و هزینه نمی‌خواند و
      // اولین چیزی است که ممیز می‌گیرد.
      const spent = r.spent_amount == null ? 0 : r.spent_amount;
      r.variance = Math.round((r.allocated_amount - spent) * 100) / 100;
      r.variance_pct = r.allocated_amount
        ? Math.round((r.variance / r.allocated_amount) * 1000) / 10 : 0;
      // «بررسی انحراف از بودجه و دلایل آنها و اقدامات لازم برای انطباق» — پس
      // انحرافِ بیش از ۱۰٪ بدون دلیل، خودِ عدمِ انطباقِ سنجه است.
      if (Math.abs(r.variance_pct) > 10 && !r.deviation_reason)
        return 'انحراف بیش از ۱۰٪ است؛ ثبت دلیل انحراف الزامی است — الف-۱-۹-۱';
      if (Math.abs(r.variance_pct) > 10 && !r.corrective_action)
        return 'انحراف بیش از ۱۰٪ است؛ ثبت اقدام اصلاحی الزامی است — الف-۱-۹-۱';
      if (!r.aligned_with_program && !r.deviation_reason)
        return 'وقتی هزینه‌کرد با برنامه منطبق نیست، ثبت دلیل الزامی است';
      return null;
    },
  },
  reports: {
    table: 'fin_reports', fa: 'گزارش مالی ماهانه',
    fields: ['year', 'month', 'total_allocated', 'total_spent', 'variance_pct', 'analysis',
      'deviations', 'actions', 'internal_control_done', 'internal_control_note',
      'submitted_to_leadership', 'leadership_review_date', 'leadership_decision', 'prepared_by', 'note'],
    floats: ['total_allocated', 'total_spent', 'variance_pct'],
    bools: ['internal_control_done', 'submitted_to_leadership'],
    order: 'year DESC, month DESC',
    validate: (r) => {
      if (!r.year || !r.month) return 'سال و ماه الزامی است';
      if (!r.analysis) return 'متن گزارش تفسیری و تحلیلی الزامی است — الف-۱-۹-۱';
      if (r.total_allocated) {
        r.variance_pct = Math.round(((r.total_allocated - (r.total_spent || 0)) / r.total_allocated) * 1000) / 10;
      }
      // متن سنجه: گزارش «در اختیار تیم رهبری و مدیریت قرار می‌گیرد» و آن تیم
      // «ضمن بررسی انحراف … اقدامات لازم را طراحی و ابلاغ می‌کند». پس گزارشی که
      // تحویلِ تیم رهبری شده ولی انحراف دارد و اقدامی ندارد، ناقص است.
      if (r.deviations && !r.actions)
        return 'وقتی انحراف ثبت شده، اقدام لازم هم باید ثبت شود — الف-۱-۹-۱';
      if (r.submitted_to_leadership && !r.leadership_review_date)
        return 'برای گزارشِ تحویل‌شده، تاریخ بررسی تیم رهبری الزامی است';
      return null;
    },
  },
  donations: {
    table: 'fin_donations', fa: 'کمک خیرین',
    fields: ['year', 'donation_date', 'donor_name', 'donor_kind', 'kind', 'amount', 'purpose',
      'target_program', 'patient_case_code', 'social_work_coordinated', 'leadership_approved',
      'receipt_no', 'recorded_in_accounting', 'note'],
    floats: ['amount'],
    bools: ['social_work_coordinated', 'leadership_approved', 'recorded_in_accounting'],
    order: 'donation_date DESC',
    enums: { donor_kind: ['خیّر حقیقی', 'مؤسسه خیریه', 'مجمع خیرین سلامت', 'سازمان/شرکت'],
      kind: ['نقدی', 'تجهیزات پزشکی', 'ساخت و توسعه', 'بازسازی و بهسازی', 'هزینه درمان مددجو', 'سایر'] },
    validate: (r) => {
      if (!r.donor_name) return 'نام خیّر یا مؤسسه الزامی است';
      if (!r.donation_date) return 'تاریخ کمک الزامی است';
      // دو قاعده‌ی صریحِ متنِ الف-۱-۹-۳، هرکدام برای نوعِ خودش:
      if (r.kind === 'هزینه درمان مددجو' && !r.social_work_coordinated)
        return 'تأمین هزینه‌ی درمان مددجو باید با هماهنگی مددکاری باشد — الف-۱-۹-۳';
      if (r.kind === 'هزینه درمان مددجو' && !r.patient_case_code)
        return 'کد پرونده‌ی مددجو الزامی است (نامِ بیمار ثبت نمی‌شود)';
      if (['ساخت و توسعه', 'بازسازی و بهسازی', 'تجهیزات پزشکی'].includes(r.kind) && !r.leadership_approved)
        return 'کمکِ عمرانی و تجهیزاتی نیاز به تأیید تیم رهبری و مدیریت دارد — الف-۱-۹-۳';
      return null;
    },
  },
  targets: {
    table: 'fin_donation_targets', fa: 'هدف‌گذاری جذب خیرین',
    fields: ['year', 'target_amount', 'achieved_amount', 'achieved_pct', 'share_of_budget_pct',
      'promotion_plan', 'meetings_held', 'approved_by', 'note'],
    floats: ['target_amount', 'achieved_amount', 'achieved_pct', 'share_of_budget_pct'],
    ints: ['meetings_held'],
    order: 'year DESC',
    validate: (r) => {
      if (!r.year) return 'سال الزامی است';
      if (!r.target_amount) return 'مبلغ هدف الزامی است — الف-۱-۹-۳ صریحاً هدف‌گذاری خواسته';
      if (!r.promotion_plan) return 'برنامه‌ی تبلیغی و ترویجی جذب خیرین الزامی است — الف-۱-۹-۳';
      r.achieved_pct = Math.round(((r.achieved_amount || 0) / r.target_amount) * 1000) / 10;
      return null;
    },
  },
  // الف-۱-۹-۴ (خدمات گلوبال) و الف-۱-۹-۵ (سهم هتلینگ از خدمات پرستاری).
  // یک منبع با ستونِ kind، چون متنِ هر دو یکی است و تنها موضوعشان فرق دارد.
  costs: {
    table: 'fin_cost_management', fa: 'مدیریت هزینه',
    fields: ['kind', 'title', 'ward', 'year', 'period', 'cases_count', 'tariff_amount',
      'actual_cost', 'variance', 'variance_pct', 'nursing_share_pct', 'regulation_ref',
      'quality_safety_reviewed', 'quality_safety_impact', 'deviation_reason',
      'corrective_action', 'responsible', 'note'],
    ints: ['cases_count'],
    floats: ['tariff_amount', 'actual_cost', 'variance', 'variance_pct', 'nursing_share_pct'],
    bools: ['quality_safety_reviewed'],
    order: 'year DESC, kind, title',
    enums: { kind: ['خدمات گلوبال', 'سهم هتلینگ خدمات پرستاری'] },
    validate: (r) => {
      if (!r.title) return 'عنوان خدمت یا بخش الزامی است';
      if (!r.year) return 'سال الزامی است';
      // «در چارچوب **ضوابط مربوط**» — هر دو سنجه این قید را دارند، پس ارجاع
      // به ضابطه ستون گرفت نه توضیح.
      if (!r.regulation_ref)
        return 'ارجاع به ضابطه/تعرفه‌ی مربوط الزامی است — الف-۱-۹-۴ و ۱-۹-۵';
      if (r.kind === 'سهم هتلینگ خدمات پرستاری' && r.nursing_share_pct == null)
        return 'سهم خدمات پرستاری (٪) الزامی است — الف-۱-۹-۵';
      if (r.tariff_amount != null) {
        r.variance = Math.round((r.tariff_amount - (r.actual_cost || 0)) * 100) / 100;
        r.variance_pct = r.tariff_amount
          ? Math.round((r.variance / r.tariff_amount) * 1000) / 10 : 0;
      }
      // قیدِ آخرِ هر دو سنجه: «و رعایت اصول کیفیت و ایمنی بیمار». یعنی
      // مدیریتِ هزینه بدون بررسیِ اثرش بر کیفیت، امتیازِ این سنجه نیست.
      if (!r.quality_safety_reviewed)
        return 'بررسی اثر بر کیفیت و ایمنی بیمار الزامی است — الف-۱-۹-۴ و ۱-۹-۵';
      if (r.quality_safety_impact && !r.corrective_action)
        return 'وقتی اثری بر کیفیت/ایمنی ثبت شده، اقدام اصلاحی الزامی است';
      return null;
    },
  },
  // الف-۱-۹-۷ — «هیچ موردی … مشاهده نمی‌شود». سنجه‌ای که نبودنِ رکورد خودش
  // مدرکِ آن است، پس دفتر باید وجود داشته باشد تا خالی‌بودنش معنا بدهد.
  disruptions: {
    table: 'service_disruptions', fa: 'اختلال یا تأخیر خدمت',
    fields: ['event_date', 'kind', 'ward', 'service', 'cause_category', 'description',
      'duration_minutes', 'patients_affected', 'harm_occurred', 'resolved', 'resolution',
      'corrective_action', 'reported_by', 'note'],
    ints: ['duration_minutes', 'patients_affected'],
    bools: ['harm_occurred', 'resolved'],
    order: 'event_date DESC',
    enums: {
      kind: ['تأخیر در ارائه خدمت', 'اختلال در ارائه خدمت', 'توقف موقت خدمت'],
      cause_category: ['کمبود تجهیزات', 'خرابی تجهیزات', 'کمبود دارو و ملزومات',
        'کمبود نیروی انسانی', 'کمبود فضای فیزیکی', 'قطع برق/آب/گاز', 'سایر'],
    },
    validate: (r) => {
      if (!r.event_date) return 'تاریخ الزامی است';
      if (!r.description) return 'شرح مورد الزامی است';
      // این سنجه سطح ۳ است و هدفش صفر شدن؛ پس هر رکورد باید تا اقدام اصلاحی
      // دنبال شود، وگرنه دفتر فقط فهرستِ شکایت می‌شود.
      if (!r.corrective_action)
        return 'اقدام اصلاحی الزامی است — هدفِ الف-۱-۹-۷ رساندنِ این موارد به صفر است';
      if (r.resolved && !r.resolution) return 'برای موردِ رفع‌شده، شرح رفع الزامی است';
      return null;
    },
  },
};
mountCrud('finance', FIN_RESOURCES, 'view_finance', 'manage_finance', 'Finance');

router.get('/finance-dashboard', authRequired, requireAnyPermission('view_finance', 'manage_finance'), hospitalScope, (req, res) => {
  try {
    const one = (sql) => (query(sql, [req.hospitalId]).rows[0] || {}).c || 0;
    const row = (sql) => query(sql, [req.hospitalId]).rows[0] || {};
    res.json({
      budget_lines: one('SELECT COUNT(*) c FROM fin_budget_lines WHERE hospital_id = ?'),
      // «بیش از ۱۰٪» همان آستانه‌ای است که در validate هم اجباری‌ساز است، تا
      // عددِ داشبورد و قاعده‌ی فرم یکی باشند.
      big_deviation: one('SELECT COUNT(*) c FROM fin_budget_lines WHERE hospital_id = ? AND ABS(variance_pct) > 10'),
      not_aligned: one('SELECT COUNT(*) c FROM fin_budget_lines WHERE hospital_id = ? AND aligned_with_program = 0'),
      overspent: one('SELECT COUNT(*) c FROM fin_budget_lines WHERE hospital_id = ? AND variance < 0'),
      // سالِ این ستون شمسی است، پس با strftime('%Y') مقایسه نمی‌شود — آن مقایسه
      // همیشه صفر می‌داد. آخرین سالِ ثبت‌شده مبناست.
      reports_year: one(`SELECT COUNT(*) c FROM fin_reports r WHERE r.hospital_id = ?
        AND r.year = (SELECT MAX(year) FROM fin_reports WHERE hospital_id = r.hospital_id)`),
      reports_not_submitted: one('SELECT COUNT(*) c FROM fin_reports WHERE hospital_id = ? AND submitted_to_leadership = 0'),
      no_internal_control: one('SELECT COUNT(*) c FROM fin_reports WHERE hospital_id = ? AND internal_control_done = 0'),
      donations_count: one('SELECT COUNT(*) c FROM fin_donations WHERE hospital_id = ?'),
      donations_sum: Math.round(row('SELECT COALESCE(SUM(amount),0) c FROM fin_donations WHERE hospital_id = ?').c || 0),
      donations_uncoordinated: one(`SELECT COUNT(*) c FROM fin_donations WHERE hospital_id = ?
        AND kind = 'هزینه درمان مددجو' AND social_work_coordinated = 0`),
      donations_unrecorded: one('SELECT COUNT(*) c FROM fin_donations WHERE hospital_id = ? AND recorded_in_accounting = 0'),
      targets: one('SELECT COUNT(*) c FROM fin_donation_targets WHERE hospital_id = ?'),
      target_gap: one('SELECT COUNT(*) c FROM fin_donation_targets WHERE hospital_id = ? AND achieved_pct < 100'),
      cost_rows: one('SELECT COUNT(*) c FROM fin_cost_management WHERE hospital_id = ?'),
      cost_overrun: one('SELECT COUNT(*) c FROM fin_cost_management WHERE hospital_id = ? AND variance < 0'),
      cost_quality_hit: one(`SELECT COUNT(*) c FROM fin_cost_management WHERE hospital_id = ?
        AND quality_safety_impact IS NOT NULL AND quality_safety_impact <> ''`),
      // الف-۱-۹-۷ برعکسِ بقیه است: صفر بودنش امتیاز است، نه کمبودِ داده.
      disruptions_year: one(`SELECT COUNT(*) c FROM service_disruptions WHERE hospital_id = ?
        AND event_date >= date('now','-1 year')`),
      disruptions_open: one('SELECT COUNT(*) c FROM service_disruptions WHERE hospital_id = ? AND resolved = 0'),
      disruptions_harm: one('SELECT COUNT(*) c FROM service_disruptions WHERE hospital_id = ? AND harm_occurred = 1'),
    });
  } catch (err) { console.error('[Finance]', err); res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

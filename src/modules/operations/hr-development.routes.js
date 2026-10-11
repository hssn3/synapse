/**
 * Operations HR Development Routes
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

// ===== ارزیابی و توسعه‌ی کارکنان (الف-۳-۱/۲-۳/۳/۴-۲، الف-۴-۱-۱/۲/۳) — database/seed-hr-development.js =====
const HRD_RESOURCES = {
  profiles: {
    table: 'hr_job_profiles', fa: 'شرح شغل',
    fields: ['title', 'job_group', 'unit', 'summary', 'duties', 'education_required',
      'experience_required', 'license_required', 'general_competencies', 'specific_competencies',
      'doc_code', 'approved_date', 'is_active', 'note'],
    bools: ['is_active'], defaults: { is_active: 1 },
    order: 'is_active DESC, title',
    // الف‑۳‑۱‑۲ صریحاً «توانمندی‌های عمومی *و اختصاصی*» را خواسته؛ شرحِ شغلی که
    // فقط وظایف دارد، شرایطِ احراز ندارد و استخدام نمی‌تواند به آن ارجاع دهد.
    validate: (r) => {
      if (!r.title) return 'عنوان شغل الزامی است';
      if (!r.education_required) return 'حداقل مدرک تحصیلی (شرط احراز) الزامی است';
      if (!r.general_competencies) return 'توانمندی‌های عمومی الزامی است — الف-۳-۱-۲';
      return null;
    },
  },
  hiring: {
    table: 'hr_hiring_checks', fa: 'احراز شرایط بکارگیری',
    fields: ['person_name', 'personnel_code', 'job_profile_id', 'unit', 'hire_date',
      'education_ok', 'experience_ok', 'license_ok', 'communication_skill_ok',
      'orientation_done', 'verdict', 'checked_by', 'note'],
    bools: ['education_ok', 'experience_ok', 'license_ok', 'communication_skill_ok', 'orientation_done'],
    order: 'hire_date DESC',
    enums: { verdict: ['در_بررسی', 'واجد شرایط', 'واجد شرایط با ملاحظه', 'فاقد شرایط'] },
    validate: (r) => {
      if (!r.person_name) return 'نام فرد الزامی است';
      if (!r.job_profile_id) return 'شغلِ مرجع الزامی است — «بر اساس شرح شغل» بدون ارجاع قابل اثبات نیست';
      // الف‑۳‑۱‑۳ مهارتِ ارتباطی را «پیش از بکارگیری» خواسته، پس بدونِ آن
      // نمی‌شود کسی را واجد شرایط اعلام کرد.
      if (r.verdict === 'واجد شرایط' && !r.communication_skill_ok)
        return 'برای «واجد شرایط»، احراز مهارت ارتباطی الزامی است (الف-۳-۱-۳)';
      return null;
    },
  },
  competencies: {
    table: 'hr_competencies', fa: 'مهارت/صلاحیت',
    fields: ['title', 'kind', 'job_group', 'unit', 'method', 'valid_months', 'is_active', 'note'],
    ints: ['valid_months'], bools: ['is_active'], defaults: { is_active: 1, valid_months: 12 },
    order: 'is_active DESC, kind, title',
    enums: { kind: ['عمومی بالینی', 'تخصصی بخش', 'ارتباطی'] },
    validate: (r) => (r.title ? null : 'عنوان مهارت الزامی است'),
  },
  records: {
    table: 'hr_competency_records', fa: 'احراز صلاحیت',
    fields: ['competency_id', 'person_name', 'personnel_code', 'unit', 'assessed_date',
      'expires_on', 'result', 'assessor', 'gap_action', 'note'],
    order: 'expires_on',
    enums: { result: ['احراز شد', 'نیازمند آموزش', 'احراز نشد'] },
    validate: (r) => {
      if (!r.competency_id) return 'مهارتِ مربوط الزامی است';
      if (!r.person_name) return 'نام فرد الزامی است';
      if (!r.assessed_date) return 'تاریخ ارزیابی الزامی است';
      if (r.result !== 'احراز شد' && !r.gap_action)
        return 'وقتی صلاحیت احراز نشده، اقدامِ جبرانی الزامی است';
      // تاریخِ انقضا از دوره‌ی اعتبارِ همان مهارت حساب می‌شود، نه دستی — وگرنه
      // «احرازِ منقضی» با «احرازِ معتبر» در یک فهرست قاطی می‌شد.
      if (!r.expires_on) {
        const c = query('SELECT valid_months FROM hr_competencies WHERE id = ?', [r.competency_id]).rows[0];
        const m = c && c.valid_months ? c.valid_months : 12;
        const d = new Date(r.assessed_date);
        if (!isNaN(d)) { d.setMonth(d.getMonth() + m); r.expires_on = d.toISOString().slice(0, 10); }
      }
      return null;
    },
  },
  appraisals: {
    table: 'hr_appraisals', fa: 'ارزشیابی سالیانه',
    fields: ['person_name', 'personnel_code', 'unit', 'jalali_year', 'appraised_date',
      'appraiser', 'score', 'grade', 'strengths', 'improvement_areas',
      'training_outcome', 'promotion_outcome', 'note'],
    ints: ['jalali_year'], floats: ['score'],
    order: 'jalali_year DESC, person_name',
    enums: { grade: ['عالی', 'خوب', 'قابل قبول', 'نیازمند بهبود'] },
    // الف‑۳‑۳‑۲ بندِ دومش این است که نتیجه «در طراحی برنامه آموزشی و ارتقا شغلی
    // استفاده می‌شود». ارزشیابیِ بدونِ خروجی، همان نمره‌ی بی‌مصرف است.
    validate: (r) => {
      if (!r.person_name) return 'نام فرد الزامی است';
      if (!r.jalali_year) return 'سال ارزشیابی الزامی است';
      if (!r.training_outcome) return 'خروجی آموزشی الزامی است — الف-۳-۳-۲ استفاده از نتیجه را می‌خواهد';
      return null;
    },
  },
  disciplinary: {
    table: 'hr_disciplinary', fa: 'اقدام انضباطی',
    fields: ['person_name', 'personnel_code', 'unit', 'action_date', 'reason',
      'based_on_appraisal_id', 'action_type', 'legal_reference', 'person_notified', 'follow_up', 'note'],
    bools: ['person_notified'],
    order: 'action_date DESC',
    enums: { action_type: ['تذکر شفاهی', 'تذکر کتبی', 'اخطار کتبی', 'کسر مزایا', 'ارجاع به کمیته انضباطی'] },
    validate: (r) => {
      if (!r.person_name) return 'نام فرد الزامی است';
      if (!r.reason) return 'علت اقدام الزامی است';
      // «با رعایت قوانین و مقررات مرتبط» در متنِ سنجه است، پس مستندِ قانونی
      // برای اقدامِ سنگین اجباری است.
      if (['اخطار کتبی', 'کسر مزایا', 'ارجاع به کمیته انضباطی'].includes(r.action_type) && !r.legal_reference)
        return 'برای اقدام انضباطی سنگین، مستند قانونی الزامی است (الف-۳-۳-۱)';
      return null;
    },
  },
  exemplary: {
    table: 'hr_exemplary', fa: 'کارمند نمونه',
    fields: ['person_name', 'personnel_code', 'unit', 'period', 'selected_date',
      'criteria', 'achievement', 'reward_type', 'announced', 'note'],
    bools: ['announced'],
    order: 'selected_date DESC',
    enums: { reward_type: ['لوح تقدیر', 'پاداش نقدی', 'مرخصی تشویقی', 'معرفی در تابلوی افتخارات', 'سایر'] },
    validate: (r) => {
      if (!r.person_name) return 'نام فرد الزامی است';
      // «بر اساس عوامل کلیدیِ **معین**» — انتخابِ بی‌معیار همان چیزی است که
      // ارزیاب رد می‌کند.
      if (!r.criteria) return 'معیار انتخاب الزامی است — الف-۳-۳-۴ «عوامل کلیدی معین» را می‌خواهد';
      return null;
    },
  },
  succession: {
    table: 'hr_succession', fa: 'جانشین‌پروری',
    fields: ['position_title', 'incumbent', 'successor1', 'successor2', 'readiness',
      'development_plan', 'knowledge_transfer', 'target_date', 'note'],
    order: 'position_title',
    enums: { readiness: ['در حال آماده‌سازی', 'آماده در کوتاه‌مدت', 'آماده', 'جانشین ندارد'] },
    validate: (r) => {
      if (!r.position_title) return 'عنوان سمت الزامی است';
      if (r.readiness !== 'جانشین ندارد' && !r.successor1) return 'نام جانشین اول الزامی است';
      return null;
    },
  },
  leaves: {
    table: 'hr_leave_register', fa: 'مرخصی',
    fields: ['person_name', 'personnel_code', 'unit', 'leave_type', 'start_date',
      'end_date', 'days', 'approved_by', 'replacement', 'note'],
    ints: ['days'],
    order: 'start_date DESC',
    enums: { leave_type: ['استحقاقی', 'استعلاجی', 'بدون حقوق', 'زایمان', 'تشویقی', 'ساعتی'] },
    validate: (r) => {
      if (!r.person_name) return 'نام فرد الزامی است';
      if (!r.unit) return 'بخش/واحد الزامی است — الف-۳-۴-۲ نگهداری «به تفکیک بخش‌ها» را می‌خواهد';
      if (!r.start_date || !r.end_date) return 'بازه‌ی مرخصی الزامی است';
      if (r.end_date < r.start_date) return 'تاریخ پایان نباید پیش از شروع باشد';
      // روزها از خودِ بازه حساب می‌شود تا با تاریخ‌ها نخواند نشود
      const a = new Date(r.start_date), b = new Date(r.end_date);
      if (!isNaN(a) && !isNaN(b)) r.days = Math.round((b - a) / 86400000) + 1;
      return null;
    },
  },
  // الف-۳-۴-۴ و الف-۳-۴-۵ — نظرسنجی رضایت کارکنان. (در کتاب «رضایت» بر اثر
  // خطای OCR «رعایت» تایپ شده؛ متنِ سنجه در seed-measure-text-fix.js تعمیر شد.)
  surveys: {
    table: 'staff_surveys', fa: 'نظرسنجی کارکنان',
    fields: ['year', 'round', 'survey_date', 'instrument', 'validity_checked', 'invited_count',
      'participants_count', 'response_rate', 'satisfaction_score', 'recommend_score',
      'prev_satisfaction_score', 'trend', 'top_issues', 'corrective_action',
      'action_owner', 'followup_result', 'note'],
    ints: ['invited_count', 'participants_count'],
    floats: ['response_rate', 'satisfaction_score', 'recommend_score', 'prev_satisfaction_score', 'trend'],
    bools: ['validity_checked'],
    order: 'year DESC, survey_date DESC',
    enums: { round: ['نوبت اول', 'نوبت دوم', 'نوبت فوق‌العاده'] },
    validate: (r) => {
      if (!r.year) return 'سال الزامی است';
      if (!r.survey_date) return 'تاریخ نظرسنجی الزامی است';
      if (r.satisfaction_score == null) return 'امتیاز رضایت الزامی است';
      // الف-۳-۴-۵ سنجه‌ی مستقلی است و متن می‌گوید ارزیابانِ وزارت جداگانه
      // امتیازش می‌دهند، پس ستونش اجباری است نه اختیاری.
      if (r.recommend_score == null)
        return 'امتیاز «توصیه‌ی اشتغال به دیگران» الزامی است — الف-۳-۴-۵';
      // «با پرسشنامه پایا و روا» — صریحِ متن، و بر عهده‌ی دفتر بهبود کیفیت
      if (!r.validity_checked)
        return 'تأیید پایایی و روایی پرسشنامه الزامی است — الف-۳-۴-۴';
      r.response_rate = r.invited_count
        ? Math.round(((r.participants_count || 0) / r.invited_count) * 1000) / 10 : null;
      if (r.prev_satisfaction_score != null)
        r.trend = Math.round((r.satisfaction_score - r.prev_satisfaction_score) * 100) / 100;
      // «بر اساس نتایج آن، اقدامات اصلاحی/برنامه بهبود مؤثر اجرا می‌شود»
      if (r.top_issues && !r.corrective_action)
        return 'وقتی مشکل ثبت شده، اقدام اصلاحی الزامی است — الف-۳-۴-۴';
      return null;
    },
  },
};
// «حداقل دو بار در سال و با فاصله شش ماه» — قیدِ فاصله را نمی‌شود با ستون
// نگه داشت، چون به رکوردهای دیگرِ همان سال نگاه می‌کند. پس یک بررسیِ جدا،
// بعد از mountCrud تا روی مسیرِ همان منبع بنشیند.
router.get('/hrdev/surveys-compliance', authRequired,
  requireAnyPermission('view_hrdev', 'manage_hrdev'), hospitalScope, (req, res) => {
    try {
      const rows = query(`SELECT year, survey_date FROM staff_surveys
        WHERE hospital_id = ? AND survey_date IS NOT NULL ORDER BY year DESC, survey_date`,
      [req.hospitalId]).rows;
      const byYear = {};
      for (const r of rows) (byYear[r.year] = byYear[r.year] || []).push(r.survey_date);
      const out = Object.entries(byYear).map(([year, dates]) => {
        // بیشترین فاصله‌ی بین دو نوبتِ متوالی؛ سنجه حداقل شش ماه خواسته و
        // ۱۷۰ روز همان شش ماهِ شمسی با کمی رواداری است.
        let maxGap = 0;
        for (let i = 1; i < dates.length; i++)
          maxGap = Math.max(maxGap, Math.round(
            (Date.parse(dates[i]) - Date.parse(dates[i - 1])) / 86400000));
        return { year, rounds: dates.length, max_gap_days: maxGap,
          compliant: dates.length >= 2 && maxGap >= 170 };
      });
      res.json({ items: out });
    } catch (err) { console.error('[HRDev surveys]', err); res.status(500).json({ error: 'خطای سرور' }); }
  });

mountCrud('hrdev', HRD_RESOURCES, 'view_hrdev', 'manage_hrdev', 'HRDev');

router.get('/hrdev-dashboard', authRequired, requireAnyPermission('view_hrdev', 'manage_hrdev'), hospitalScope, (req, res) => {
  try {
    const one = (sql) => (query(sql, [req.hospitalId]).rows[0] || {}).c || 0;
    res.json({
      profiles: one('SELECT COUNT(*) c FROM hr_job_profiles WHERE hospital_id = ? AND is_active = 1'),
      hiring_pending: one("SELECT COUNT(*) c FROM hr_hiring_checks WHERE hospital_id = ? AND verdict = 'در_بررسی'"),
      hiring_year: one(`SELECT COUNT(*) c FROM hr_hiring_checks WHERE hospital_id = ? AND hire_date >= date('now','-1 year')`),
      competencies: one('SELECT COUNT(*) c FROM hr_competencies WHERE hospital_id = ? AND is_active = 1'),
      competency_expired: one(`SELECT COUNT(*) c FROM hr_competency_records WHERE hospital_id = ?
        AND expires_on IS NOT NULL AND date(expires_on) < date('now')`),
      competency_failed: one("SELECT COUNT(*) c FROM hr_competency_records WHERE hospital_id = ? AND result <> 'احراز شد'"),
      appraisals_year: one(`SELECT COUNT(*) c FROM hr_appraisals WHERE hospital_id = ?
        AND appraised_date >= date('now','-1 year')`),
      appraisals_low: one("SELECT COUNT(*) c FROM hr_appraisals WHERE hospital_id = ? AND grade = 'نیازمند بهبود'"),
      disciplinary_year: one(`SELECT COUNT(*) c FROM hr_disciplinary WHERE hospital_id = ?
        AND action_date >= date('now','-1 year')`),
      exemplary_year: one(`SELECT COUNT(*) c FROM hr_exemplary WHERE hospital_id = ?
        AND selected_date >= date('now','-1 year')`),
      succession_gaps: one("SELECT COUNT(*) c FROM hr_succession WHERE hospital_id = ? AND readiness = 'جانشین ندارد'"),
      leaves_month: one(`SELECT COUNT(*) c FROM hr_leave_register WHERE hospital_id = ?
        AND start_date >= date('now','-30 day')`),
      surveys_total: one('SELECT COUNT(*) c FROM staff_surveys WHERE hospital_id = ?'),
      // «حداقل دو بار در سال»: سالی که کمتر از دو نوبت دارد، سنجه را برآورده
      // نکرده — حتی اگر امتیازش عالی باشد.
      survey_years_short: one(`SELECT COUNT(*) c FROM (
        SELECT year FROM staff_surveys WHERE hospital_id = ? GROUP BY year HAVING COUNT(*) < 2)`),
      surveys_no_action: one(`SELECT COUNT(*) c FROM staff_surveys WHERE hospital_id = ?
        AND top_issues IS NOT NULL AND top_issues <> ''
        AND (corrective_action IS NULL OR corrective_action = '')`),
      survey_last_recommend: (query(`SELECT recommend_score c FROM staff_surveys
        WHERE hospital_id = ? AND recommend_score IS NOT NULL
        ORDER BY year DESC, survey_date DESC LIMIT 1`, [req.hospitalId]).rows[0] || {}).c ?? null,
    });
  } catch (err) { console.error('[HRDev]', err); res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

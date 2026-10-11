/**
 * Operations Education & Effectiveness Routes
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

// ===== آموزش و اثربخشی (الف-۳-۲-۴، الف-۴-۲-۳/۴/۵) — database/seed-education.js =====
const EDU_RESOURCES = {
  policies: {
    table: 'edu_policies', fa: 'سیاست آموزشی',
    fields: ['title', 'audience', 'care_level', 'version', 'content', 'approved_by',
      'approved_date', 'communicated', 'communication_method', 'communication_date',
      'last_review_date', 'revision_basis', 'next_review_due', 'is_active', 'note'],
    bools: ['communicated', 'is_active'], defaults: { is_active: 1 },
    order: 'is_active DESC, audience, title',
    enums: { audience: ['بیماران', 'کارکنان پرستاری'] },
    validate: (r) => {
      if (!r.title) return 'عنوان سیاست الزامی است';
      if (!r.care_level)
        return 'سطح و نوع مراقبت الزامی است — الف-۴-۲-۳ سیاست را «متناسب با سطح و نوع مراقبت» خواسته';
      // «تدوین **و ابلاغ** شده است» — دو کار، نه یکی. سیاستِ تصویب‌شده‌ی
      // ابلاغ‌نشده در ممیزی نصفِ سنجه است.
      if (r.approved_date && !r.communicated)
        return 'سیاستِ تصویب‌شده باید ابلاغ هم شده باشد — الف-۴-۲-۳';
      if (r.communicated && !r.communication_method) return 'روش ابلاغ الزامی است';
      // الف-۴-۲-۵ — بازنگری باید بگوید بر پایه‌ی کدام نتیجه انجام شده،
      // وگرنه «بازنگری» فقط یک تاریخ است نه یک کار.
      if (r.last_review_date && !r.revision_basis)
        return 'مبنای بازنگری (نتایج اثربخشی) الزامی است — الف-۴-۲-۵';
      return null;
    },
  },
  sessions: {
    table: 'edu_sessions', fa: 'برنامه آموزشی',
    fields: ['policy_id', 'audience', 'title', 'topic', 'ward', 'target_group', 'session_date',
      'duration_hours', 'trainer', 'method', 'planned', 'participants_count', 'invited_count', 'note'],
    ints: ['participants_count', 'invited_count'], floats: ['duration_hours'],
    bools: ['planned'], defaults: { planned: 1 },
    order: 'session_date DESC',
    enums: { audience: ['کارکنان', 'بیماران و همراهان'],
      method: ['حضوری', 'کارگاه عملی', 'چهره‌به‌چهره کنار تخت', 'جزوه و پمفلت', 'مجازی'] },
    validate: (r) => {
      if (!r.title) return 'عنوان برنامه الزامی است';
      if (!r.session_date) return 'تاریخ برگزاری الزامی است';
      // الف-۴-۲-۴ «برنامه‌ریزی آموزشی بیماران **در چارچوب سیاست‌های** آموزشی
      // مدیریت پرستاری» — پس دوره‌ی بیمار باید به یک سیاست بچسبد.
      if (r.audience === 'بیماران و همراهان' && !r.policy_id)
        return 'برنامه‌ی آموزشِ بیمار باید به یک سیاست آموزشی متصل باشد — الف-۴-۲-۴';
      return null;
    },
  },
  effectiveness: {
    table: 'edu_effectiveness', fa: 'ارزیابی اثربخشی',
    fields: ['session_id', 'eval_date', 'target_pct', 'pre_test_score', 'post_test_score',
      'knowledge_gain', 'skill_method', 'skill_score', 'effective', 'evaluated_count',
      'corrective_action', 'used_in_policy_review', 'policy_review_ref', 'evaluator', 'note'],
    floats: ['target_pct', 'pre_test_score', 'post_test_score', 'knowledge_gain', 'skill_score'],
    ints: ['evaluated_count'],
    bools: ['effective', 'used_in_policy_review'],
    order: 'eval_date DESC',
    validate: (r) => {
      if (!r.session_id) return 'انتخاب برنامه‌ی آموزشی الزامی است';
      if (!r.eval_date) return 'تاریخ ارزیابی الزامی است';
      // «بر مبنای **شاخص‌های اثربخشی**» — هدف باید از پیش تعیین شده باشد،
      // وگرنه «اثربخش بود» یک نظر است نه یک سنجش.
      if (r.target_pct == null)
        return 'شاخص/هدف اثربخشی الزامی است — الف-۳-۲-۴ ارزیابی را «بر مبنای شاخص» خواسته';
      // متنِ سنجه هر دو حیطه را نام برده و روشِ هرکدام را هم گفته:
      // آگاهی با پیش‌آزمون و پس‌آزمون، مهارت با بررسی عملی.
      if (r.pre_test_score == null || r.post_test_score == null)
        return 'پیش‌آزمون و پس‌آزمون هر دو الزامی‌اند (حیطه‌ی آگاهی) — الف-۳-۲-۴';
      if (r.skill_score == null)
        return 'امتیاز حیطه‌ی مهارت الزامی است — الف-۳-۲-۴ هر دو حیطه را خواسته';
      if (!r.skill_method) return 'روش ارزیابی مهارت الزامی است (مثلاً ارزیابی میدانی)';
      r.knowledge_gain = Math.round((r.post_test_score - r.pre_test_score) * 100) / 100;
      // «اثربخش بودن» از مقایسه‌ی نتیجه با هدف درمی‌آید، نه از تیکِ دستی —
      // وگرنه هر دوره‌ای اثربخش اعلام می‌شود.
      r.effective = (r.post_test_score >= r.target_pct && r.skill_score >= r.target_pct) ? 1 : 0;
      // «بر اساس نتایج آن اقدامات اصلاحی مؤثر برنامه‌ریزی و اجرا می‌شوند»
      if (!r.effective && !r.corrective_action)
        return 'دوره به هدف نرسیده؛ اقدام اصلاحی الزامی است — الف-۳-۲-۴';
      if (r.used_in_policy_review && !r.policy_review_ref)
        return 'ارجاع به بازنگریِ سیاست الزامی است — الف-۴-۲-۵';
      return null;
    },
  },
};
mountCrud('education', EDU_RESOURCES, 'view_education', 'manage_education', 'Education');

router.get('/education-dashboard', authRequired, requireAnyPermission('view_education', 'manage_education'), hospitalScope, (req, res) => {
  try {
    const one = (sql) => (query(sql, [req.hospitalId]).rows[0] || {}).c || 0;
    res.json({
      policies: one('SELECT COUNT(*) c FROM edu_policies WHERE hospital_id = ? AND is_active = 1'),
      policies_uncommunicated: one(`SELECT COUNT(*) c FROM edu_policies WHERE hospital_id = ?
        AND is_active = 1 AND communicated = 0`),
      policies_stale: one(`SELECT COUNT(*) c FROM edu_policies WHERE hospital_id = ? AND is_active = 1
        AND next_review_due IS NOT NULL AND date(next_review_due) < date('now')`),
      sessions_year: one(`SELECT COUNT(*) c FROM edu_sessions WHERE hospital_id = ?
        AND session_date >= date('now','-1 year')`),
      patient_sessions: one("SELECT COUNT(*) c FROM edu_sessions WHERE hospital_id = ? AND audience = 'بیماران و همراهان'"),
      // دوره‌ای که برگزار شده ولی اثربخشی‌اش سنجیده نشده، همان حلقه‌ی بازی است
      // که الف-۳-۲-۴ می‌گیرد.
      sessions_unevaluated: one(`SELECT COUNT(*) c FROM edu_sessions s WHERE s.hospital_id = ?
        AND NOT EXISTS (SELECT 1 FROM edu_effectiveness e WHERE e.session_id = s.id)`),
      evals: one('SELECT COUNT(*) c FROM edu_effectiveness WHERE hospital_id = ?'),
      evals_ineffective: one('SELECT COUNT(*) c FROM edu_effectiveness WHERE hospital_id = ? AND effective = 0'),
      evals_no_action: one(`SELECT COUNT(*) c FROM edu_effectiveness WHERE hospital_id = ?
        AND effective = 0 AND (corrective_action IS NULL OR corrective_action = '')`),
      // الف-۴-۲-۵ — نتیجه‌ای که به بازنگری سیاست نرسیده، حلقه‌اش باز است
      evals_fed_back: one('SELECT COUNT(*) c FROM edu_effectiveness WHERE hospital_id = ? AND used_in_policy_review = 1'),
    });
  } catch (err) { console.error('[Education]', err); res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

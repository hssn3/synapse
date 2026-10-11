/**
 * Users Hospital Profile Routes
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

// ===== Settings =====
router.get('/users/settings', authRequired, requirePermission('manage_hospital_settings'), hospitalScope, (req, res) => {
  try {
    const result = query('SELECT id, name, logo_url, letterhead_config, signature_config FROM hospitals WHERE id = ?', [req.hospitalId]);
    res.json({ hospital: result.rows[0] });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.put('/users/settings', authRequired, requirePermission('manage_hospital_settings'), hospitalScope, (req, res) => {
  const { name, logo_url, letterhead_config, signature_config } = req.body;
  try {
    query('UPDATE hospitals SET name = COALESCE(?, name), logo_url = COALESCE(?, logo_url), letterhead_config = COALESCE(?, letterhead_config), signature_config = COALESCE(?, signature_config) WHERE id = ?',
      [name||null, logo_url||null, JSON.stringify(letterhead_config||{}), JSON.stringify(signature_config||{}), req.hospitalId]);
    res.json({ status: 'updated' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// ===== پروفایل بیمارستان (ویزارد راه‌اندازی اولیه) =====
// خواندن برای هر کاربرِ همان بیمارستان آزاد است (ویزارد باید بداند تکمیل شده یا نه)،
// اما نوشتن فقط با مجوز manage_hospital_settings — پروفایل، تنظیمات سطح بیمارستان است.
const PROFILE_FIELDS = ['hospital_type', 'beds_count', 'province', 'city', 'ceo_name',
  'quality_manager_name', 'phone', 'established_year', 'website'];
// فیلدهایی که برای «تکمیل‌شده» شمردن پروفایل الزامی‌اند — بدون این‌ها ویزارد باز می‌ماند
const PROFILE_REQUIRED = ['hospital_type', 'beds_count', 'province', 'city', 'ceo_name'];
const PROFILE_MAXLEN = { province: 60, city: 60, ceo_name: 120, quality_manager_name: 120, phone: 30, website: 200, hospital_type: 40 };

router.get('/hospital/profile', authRequired, hospitalScope, (req, res) => {
  try {
    const p = query('SELECT * FROM hospital_profiles WHERE hospital_id = ?', [req.hospitalId]).rows[0] || null;
    res.json({ profile: p, completed: !!(p && p.completed) });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// امکانات/پکیج بیمارستان جاری — فرانت با این نقشه تعیین می‌کند کدام آیتم منو را قفل نشان بدهد
// و پیش از رندر صفحه چک کند بخش خریداری شده یا نه (enforcement واقعی سمت سرور در requireFeature است،
// این فقط برای تجربه‌ی کاربری روان و بدون رفت‌وبرگشت بی‌مورد به سرور است).
router.get('/hospital/features', authRequired, hospitalScope, (req, res) => {
  try {
    const rows = query('SELECT feature_key, enabled FROM hospital_features WHERE hospital_id = ?', [req.hospitalId]).rows;
    const features = {}; rows.forEach(r => { features[r.feature_key] = !!r.enabled; });
    res.json({ features });
  } catch (err) {
    // اگر جدول هنوز موجود نیست (قبل از boot اول)، امن-به‌سمت-باز: یعنی همه چیز فعال است
    res.json({ features: {} });
  }
});

router.put('/hospital/profile', authRequired, requirePermission('manage_hospital_settings'), hospitalScope, async (req, res) => {
  const body = req.body || {};
  // فقط فیلدهای شناخته‌شده پذیرفته می‌شوند (whitelist) — نام ستون هرگز از ورودی کاربر نمی‌آید
  const p = {};
  for (const f of PROFILE_FIELDS) {
    if (body[f] !== undefined && body[f] !== null && String(body[f]).trim() !== '') p[f] = String(body[f]).trim();
  }
  if (p.beds_count !== undefined) {
    const n = parseInt(p.beds_count, 10);
    if (isNaN(n) || n < 0 || n > 100000) return res.status(400).json({ error: 'تعداد تخت نامعتبر است' });
    p.beds_count = n;
  }
  if (p.established_year !== undefined) {
    const y = parseInt(p.established_year, 10);
    if (isNaN(y) || y < 1300 || y > 1500) return res.status(400).json({ error: 'سال تأسیس نامعتبر است' });
    p.established_year = y;
  }
  for (const [f, max] of Object.entries(PROFILE_MAXLEN)) {
    if (p[f] !== undefined && String(p[f]).length > max) return res.status(400).json({ error: `مقدار فیلد «${f}» بیش از حد مجاز است` });
  }
  try {
    const existing = query('SELECT * FROM hospital_profiles WHERE hospital_id = ?', [req.hospitalId]).rows[0];
    // پرچم تکمیل بر پایه‌ی وضعیت نهایی رکورد محاسبه می‌شود (نه فقط چیزی که همین درخواست فرستاده)
    const merged = Object.assign({}, existing || {}, p);
    const completed = PROFILE_REQUIRED.every((f) => merged[f] !== undefined && merged[f] !== null && String(merged[f]).trim() !== '') ? 1 : 0;
    const now = new Date().toISOString();
    const cols = Object.keys(p);
    if (existing) {
      const sets = [...cols.map((f) => `${f} = ?`), 'completed = ?', 'updated_at = ?'].join(', ');
      query(`UPDATE hospital_profiles SET ${sets} WHERE hospital_id = ?`,
        [...cols.map((f) => p[f]), completed, now, req.hospitalId]);
    } else {
      const allCols = [...cols, 'hospital_id', 'completed', 'updated_at'];
      query(`INSERT INTO hospital_profiles (${allCols.join(', ')}) VALUES (${allCols.map(() => '?').join(', ')})`,
        [...cols.map((f) => p[f]), req.hospitalId, completed, now]);
    }
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'hospital_profile_updated', targetTable: 'hospital_profiles', targetId: req.hospitalId, ipAddress: req.ip });
    res.json({ status: 'updated', completed: !!completed });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

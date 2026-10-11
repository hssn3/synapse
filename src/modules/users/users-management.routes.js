/**
 * Users Management Routes
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

// ===== Users =====
router.get('/users', authRequired, requirePermission('manage_users'), hospitalScope, (req, res) => {
  try {
    const result = query(`SELECT u.id, u.full_name, u.username, u.email, u.phone, u.department, u.gender, u.title_prefix, u.is_active, u.last_login_at,
      r.code as role_code, r.title_fa as role_title FROM users u JOIN roles r ON u.role_id = r.id WHERE u.hospital_id = ? ORDER BY u.full_name`, [req.hospitalId]);
    res.json({ users: result.rows });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// ===== Update User =====
router.put('/users/:id', authRequired, requirePermission('manage_users'), hospitalScope, (req, res) => {
  const { full_name, email, phone, department, role_id, is_active, gender, title_prefix } = req.body;
  try {
    const existing = query('SELECT id FROM users WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'کاربر یافت نشد' });
    if (role_id) {
      // همان محدودیت نقش‌های سراسری/همین بیمارستان که در POST /users اعمال می‌شود (جلوگیری از IDOR روی roles)
      const role = query('SELECT id, code, permissions FROM roles WHERE id = ? AND (hospital_id IS NULL OR hospital_id = ?)', [role_id, req.hospitalId]).rows[0];
      if (!role) return res.status(400).json({ error: 'نقش نامعتبر است' });
      if (!canAssignRole(req.user, role)) return res.status(403).json({ error: 'اجازه تخصیص این نقش را ندارید' });
    }
    // تصدی سمت: اگر نقش عوض می‌شود، دوره‌ی قبلی بسته و دوره‌ی تازه باز می‌شود.
    // بدون این، بعد از جابه‌جایی مدیر معلوم نمی‌ماند کدام رکورد مالِ دوره‌ی
    // کدام متصدی بوده — همان چیزی که کاربر خواست.
    try {
      const before = query('SELECT role_id FROM users WHERE id = ?', [req.params.id]).rows[0];
      if (role_id && before && before.role_id !== role_id) {
        const today = new Date().toISOString().slice(0, 10);
        query("UPDATE role_tenures SET ended_on = ? WHERE user_id = ? AND ended_on IS NULL", [today, req.params.id]);
        const nr = query('SELECT id, code, title_fa FROM roles WHERE id = ?', [role_id]).rows[0];
        query(`INSERT INTO role_tenures (id, hospital_id, user_id, role_id, role_code, role_title, started_on, note)
               VALUES (?,?,?,?,?,?,?,?)`,
          [uuid(), req.hospitalId, req.params.id, role_id, nr && nr.code, nr && nr.title_fa, today,
           'تغییر سمت توسط ' + (req.user.full_name || '')]);
      }
    } catch (e) { console.error('[Tenure]', e.message); }

    query(`UPDATE users SET full_name = COALESCE(?, full_name), email = COALESCE(?, email), phone = COALESCE(?, phone),
      department = COALESCE(?, department), role_id = COALESCE(?, role_id), is_active = COALESCE(?, is_active),
      gender = COALESCE(?, gender), title_prefix = COALESCE(?, title_prefix) WHERE id = ?`,
      [full_name||null, email||null, phone||null, department||null, role_id||null, is_active !== undefined ? (is_active?1:0) : null,
       gender !== undefined ? (gender || null) : null, title_prefix !== undefined ? (title_prefix || null) : null, req.params.id]);
    res.json({ status: 'updated' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

/**
 * Quality Errors, Never Events & FMEA Routes
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
  CL_ANSWER_VALUES,
  CL_ANSWER_LABELS,
  CL_NONCONFORMITY,
  isNonConformity,
  indJudge,
  indRow
} = common;

// Helper to bind mountCrud to this module router
const mountCrud = (prefix, ...args) => common.mountCrud(router, prefix, ...args);

// ===== Medical Errors (گزارش خطا/واقعه با شاخهٔ تحلیل ریشه‌ای) =====
// ===== نرمال‌سازی متن فارسی برای مقایسه با فهرست‌های ثابت =====
// کیبورد عربی «ي/ك/أ/إ/ة» و نیم‌فاصله/فاصله‌های متفاوت باعث می‌شود متن تایپ‌شدهٔ کاربر با
// مقدارِ ثابتِ داخل کد برابر نشود. هر جایی که یک مقدار فارسیِ آزادِ کاربر با فهرست ثابت
// مقایسه می‌شود باید از matchFa استفاده کند، نه از includes خام.
function normFa(s) {
  return String(s == null ? '' : s)
    .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک')
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ؤ/g, 'و')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, ' ') // نیم‌فاصله و نشانه‌های جهت
    .replace(/[_\u2010-\u2015\u2212-]/g, ' ')                  // زیرخط/خط تیره در «در_حال_اجرا»
    .replace(/[\u064B-\u0652\u0670]/g, '')                     // اعراب
    .replace(/\s+/g, ' ').trim();
}
// مقدار متعارفِ داخل فهرست را برمی‌گرداند (نه ورودی کاربر)، وگرنه null
function matchFa(list, input) {
  if (input === null || input === undefined || input === '') return null;
  const n = normFa(input);
  return list.find(v => normFa(v) === n) || null;
}

const MER_EVAL_STATUSES = ['در انتظار بررسی', 'در حال بررسی', 'بسته‌شده'];

// اعتبارسنجی مشترک بین مسیر عمومی و مسیر احراز هویت‌شده
function merValidate(b) {
  if (!b.description) return 'توضیحات الزامی است';
  if (truthy(b.needs_rca) && !String(b.rca_text || '').trim())
    return 'در صورت نیاز به تحلیل ریشه‌ای، متن تحلیل ریشه‌ای الزامی است';
  if (b.evaluation_status) {
    // مقدار متعارف را روی همان شیء می‌نویسیم تا شکل عربی/نیم‌فاصله‌دار ذخیره نشود
    const canon = matchFa(MER_EVAL_STATUSES, b.evaluation_status);
    if (!canon) return 'وضعیت بررسی نامعتبر است';
    b.evaluation_status = canon;
  }
  return null;
}
function truthy(v) { return v === true || v === 1 || v === '1' || v === 'true' || v === 'بله'; }

// درج مشترک — tracking_code همیشه سمت سرور ساخته می‌شود (هرگز از کلاینت)
function merInsert(b, hospitalId, reportedBy, source) {
  const id = uuid();
  const code = buildTrackingCode(db, hospitalId);
  query(`INSERT INTO medical_error_reports
    (id, hospital_id, error_category, description, is_confidential, is_anonymous_submission, severity,
     reported_by, department, needs_rca, rca_text, tracking_code, error_ward, referred_to_secretariat,
     evaluation_status, is_self_declaration, source, never_event_code, sentinel_event, rca_lead)
    VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, hospitalId, b.error_category || null, b.description, b.is_anonymous !== false ? 1 : 0,
     b.severity || null, reportedBy || null, b.department || null,
     truthy(b.needs_rca) ? 1 : 0, truthy(b.needs_rca) ? String(b.rca_text).trim() : null,
     code, b.error_ward || null, truthy(b.referred_to_secretariat) ? 1 : 0,
     b.evaluation_status || 'در انتظار بررسی', truthy(b.is_self_declaration) ? 1 : 0,
     source === 'public' ? 'public' : 'internal',
     b.never_event_code || null, truthy(b.sentinel_event) ? 1 : 0, b.rca_lead || null]);
  return { id, tracking_code: code };
}

router.get('/users/medical-errors/list', authRequired, requirePermission('manage_medical_error_reports'), hospitalScope, (req, res) => {
  try {
    const params = [req.hospitalId];
    let sql = 'SELECT * FROM medical_error_reports WHERE hospital_id = ?';
    const qEval = matchFa(MER_EVAL_STATUSES, req.query.evaluation_status);
    if (qEval) { sql += ' AND evaluation_status = ?'; params.push(qEval); }
    if (req.query.needs_rca) { sql += ' AND needs_rca = ?'; params.push(truthy(req.query.needs_rca) ? 1 : 0); }
    if (req.query.is_self_declaration) { sql += ' AND is_self_declaration = ?'; params.push(truthy(req.query.is_self_declaration) ? 1 : 0); }
    if (req.query.never_events_only) { sql += " AND never_event_code IS NOT NULL AND never_event_code <> ''"; }
    sql += applyYearFilter(req, params, 'created_at');
    sql += ' ORDER BY created_at DESC';
    res.json({ reports: query(sql, params).rows, eval_statuses: MER_EVAL_STATUSES });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// ثبت گزارش توسط کاربر واردشده
router.post('/users/medical-errors', authRequired, requireAnyPermission('submit_medical_error_report', 'manage_medical_error_reports'), hospitalScope, (req, res) => {
  const bad = merValidate(req.body || {});
  if (bad) return res.status(400).json({ error: bad });
  try {
    const out = merInsert(req.body, req.hospitalId, req.body.is_anonymous === true ? null : req.user.id);
    logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'create_medical_error_report', targetTable: 'medical_error_reports', targetId: out.id, ipAddress: req.ip });
    res.json({ ...out, message: 'گزارش ثبت شد' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// بررسی/به‌روزرسانی گزارش (تحلیل ریشه‌ای، وضعیت بررسی، ارجاع به دبیرخانه)
router.put('/users/medical-errors/:id', authRequired, requirePermission('manage_medical_error_reports'), hospitalScope, (req, res) => {
  const b = req.body || {};
  if (b.evaluation_status) {
    const canon = matchFa(MER_EVAL_STATUSES, b.evaluation_status);
    if (!canon) return res.status(400).json({ error: 'وضعیت بررسی نامعتبر است' });
    b.evaluation_status = canon;
  }
  try {
    const cur = query('SELECT * FROM medical_error_reports WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!cur) return res.status(404).json({ error: 'یافت نشد' });
    const needsRca = b.needs_rca === undefined ? !!cur.needs_rca : truthy(b.needs_rca);
    const rcaText = b.rca_text === undefined ? cur.rca_text : String(b.rca_text || '').trim();
    if (needsRca && !rcaText) return res.status(400).json({ error: 'در صورت نیاز به تحلیل ریشه‌ای، متن تحلیل ریشه‌ای الزامی است' });
    query(`UPDATE medical_error_reports SET needs_rca = ?, rca_text = ?, error_ward = COALESCE(?, error_ward),
           referred_to_secretariat = ?, evaluation_status = COALESCE(?, evaluation_status), status = COALESCE(?, status),
           never_event_code = COALESCE(?, never_event_code), sentinel_event = COALESCE(?, sentinel_event), rca_lead = COALESCE(?, rca_lead) WHERE id = ?`,
      [needsRca ? 1 : 0, needsRca ? rcaText : null, b.error_ward || null,
       (b.referred_to_secretariat === undefined ? !!cur.referred_to_secretariat : truthy(b.referred_to_secretariat)) ? 1 : 0,
       b.evaluation_status || null, b.status || null,
       b.never_event_code || null, b.sentinel_event !== undefined ? (truthy(b.sentinel_event) ? 1 : 0) : null, b.rca_lead || null, req.params.id]);
    logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'update_medical_error_report', targetTable: 'medical_error_reports', targetId: req.params.id, ipAddress: req.ip });
    res.json({ status: 'updated' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// ===== FMEA — «عوامل تهدید کننده ایمنی بیمار» (تحلیل ریسک پیش‌نگر) =====
// عمداً از medical_error_reports جداست: آن گزارش رخدادِ رخ‌داده است، این تحلیل ریسکِ بالقوه.
const FMEA_STATUSES = ['new', 'in_review', 'closed'];
const FMEA_REQUIRED = ['subject', 'reporting_department', 'failure_modes', 'root_causes', 'effects', 'existing_controls'];
const FMEA_LABELS = {
  subject: 'موضوع', reporting_department: 'واحد گزارش‌دهنده', failure_modes: 'خطرات احتمالی',
  root_causes: 'علل خطا', effects: 'اثرات و تبعات', existing_controls: 'اقدامات کنترلی موجود',
};

function fmeaBody(b) {
  for (const f of FMEA_REQUIRED) {
    if (!String(b?.[f] || '').trim()) return { error: `${FMEA_LABELS[f]} الزامی است` };
  }
  if (b.status && !FMEA_STATUSES.includes(b.status)) return { error: 'وضعیت نامعتبر است' };
  return {
    value: {
      reporter_name: String(b.reporter_name || '').trim() || null,
      subject: String(b.subject).trim(),
      reporting_department: String(b.reporting_department).trim(),
      related_hazard_area: String(b.related_hazard_area || '').trim() || null,
      hazard_type: String(b.hazard_type || '').trim() || null,
      failure_modes: String(b.failure_modes).trim(),
      root_causes: String(b.root_causes).trim(),
      effects: String(b.effects).trim(),
      existing_controls: String(b.existing_controls).trim(),
      recommended_actions: String(b.recommended_actions || '').trim() || null,
    },
  };
}

function fmeaInsert(v, hospitalId, createdBy, source) {
  const id = uuid();
  query(`INSERT INTO fmea_records (id, hospital_id, reporter_name, subject, reporting_department,
    related_hazard_area, hazard_type, failure_modes, root_causes, effects, existing_controls,
    recommended_actions, source, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`,
    [id, hospitalId, v.reporter_name, v.subject, v.reporting_department, v.related_hazard_area,
     v.hazard_type, v.failure_modes, v.root_causes, v.effects, v.existing_controls,
     v.recommended_actions, source, createdBy || null]);
  return id;
}

router.get('/fmea', authRequired, requireAnyPermission('manage_fmea', 'submit_fmea'), hospitalScope, (req, res) => {
  try {
    const params = [req.hospitalId];
    let sql = 'SELECT * FROM fmea_records WHERE hospital_id = ?';
    if (req.query.status && FMEA_STATUSES.includes(req.query.status)) { sql += ' AND status = ?'; params.push(req.query.status); }
    if (req.query.q) { sql += ' AND (subject LIKE ? OR reporting_department LIKE ?)'; params.push('%' + req.query.q + '%', '%' + req.query.q + '%'); }
    sql += applyYearFilter(req, params, 'submitted_at');
    sql += ' ORDER BY submitted_at DESC';
    res.json({ records: query(sql, params).rows, statuses: FMEA_STATUSES });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.get('/fmea/:id', authRequired, requireAnyPermission('manage_fmea', 'submit_fmea'), hospitalScope, (req, res) => {
  try {
    const row = query('SELECT * FROM fmea_records WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'یافت نشد' });
    res.json({ record: row });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/fmea', authRequired, requireAnyPermission('manage_fmea', 'submit_fmea'), hospitalScope, (req, res) => {
  const p = fmeaBody(req.body || {});
  if (p.error) return res.status(400).json({ error: p.error });
  try {
    const id = fmeaInsert(p.value, req.hospitalId, req.user.id, 'internal');
    logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'create_fmea', targetTable: 'fmea_records', targetId: id, ipAddress: req.ip });
    res.json({ id, message: 'فرم FMEA ثبت شد' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.put('/fmea/:id', authRequired, requirePermission('manage_fmea'), hospitalScope, (req, res) => {
  const b = req.body || {};
  try {
    const cur = query('SELECT id FROM fmea_records WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!cur) return res.status(404).json({ error: 'یافت نشد' });
    // به‌روزرسانی فقط وضعیت (بررسی) — بدون بازنویسی محتوای ثبت‌شده
    if (b.status !== undefined && !FMEA_STATUSES.includes(b.status)) return res.status(400).json({ error: 'وضعیت نامعتبر است' });
    if (b.status === undefined) {
      const p = fmeaBody(b);
      if (p.error) return res.status(400).json({ error: p.error });
      const v = p.value;
      query(`UPDATE fmea_records SET reporter_name=?, subject=?, reporting_department=?, related_hazard_area=?,
             hazard_type=?, failure_modes=?, root_causes=?, effects=?, existing_controls=?, recommended_actions=? WHERE id=?`,
        [v.reporter_name, v.subject, v.reporting_department, v.related_hazard_area, v.hazard_type,
         v.failure_modes, v.root_causes, v.effects, v.existing_controls, v.recommended_actions, req.params.id]);
    } else {
      query('UPDATE fmea_records SET status = ? WHERE id = ? AND hospital_id = ?', [b.status, req.params.id, req.hospitalId]);
    }
    logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'update_fmea', targetTable: 'fmea_records', targetId: req.params.id, ipAddress: req.ip });
    res.json({ status: 'updated' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.delete('/fmea/:id', authRequired, requirePermission('manage_fmea'), hospitalScope, (req, res) => {
  try {
    const cur = query('SELECT id FROM fmea_records WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!cur) return res.status(404).json({ error: 'یافت نشد' });
    query('DELETE FROM fmea_records WHERE id = ?', [req.params.id]);
    logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'delete_fmea', targetTable: 'fmea_records', targetId: req.params.id, ipAddress: req.ip });
    res.json({ status: 'deleted' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

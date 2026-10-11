/**
 * Operations Facility Assets Routes
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

// ===== اقلام و نگهداشت دوره‌ای — database/seed-facility-assets.js =====
// چرخه‌ی مشترکِ محورهای الف-۶ (بهداشت محیط) و الف-۷ (تجهیزات پزشکی):
//   قلم → برنامه‌ی دوره‌ای → ثبت اجرا → اقدام اصلاحی.
// وضعیتِ سررسید مثل certifications موقع خواندن حساب می‌شود، نه با job زمان‌بندی‌شده.
const FA_CATEGORIES = ['تجهیزات پزشکی', 'تأسیسات', 'بهداشت محیط', 'ایمنی و آتش‌نشانی', 'خودرو', 'سایر'];
const FA_STATUSES = ['active', 'out_of_service', 'scrapped'];
const FA_RISK = ['بحرانی', 'زیاد', 'متوسط', 'کم'];
const FA_PLAN_KINDS = ['کالیبراسیون', 'نگهداشت پیشگیرانه', 'بازرسی', 'آزمون/نمونه‌برداری', 'تمدید مجوز', 'سرویس دوره‌ای'];
const FA_RESULTS = ['ok', 'needs_action', 'failed'];
const FA_NEAR_DAYS = 30;

const FA_ASSET_FIELDS = ['asset_code', 'title', 'category', 'location', 'manufacturer', 'model', 'serial_no',
  'purchase_date', 'install_date', 'warranty_end', 'risk_class', 'status', 'responsible', 'note', 'section_id'];
const FA_PLAN_FIELDS = ['asset_id', 'kind', 'title', 'interval_months', 'last_done_date', 'next_due_date',
  'responsible', 'vendor', 'note', 'is_active'];

function faAssetBody(b) {
  const out = {};
  for (const f of FA_ASSET_FIELDS) out[f] = b[f] === undefined || b[f] === '' ? null : String(b[f]);
  if (!FA_CATEGORIES.includes(out.category)) out.category = FA_CATEGORIES[0];
  if (!FA_STATUSES.includes(out.status)) out.status = 'active';
  if (!FA_RISK.includes(out.risk_class)) out.risk_class = 'متوسط';
  return out;
}

// افزودنِ ماه به یک تاریخ میلادیِ ISO. اگر روزِ مبدأ در ماهِ مقصد وجود نداشته باشد
// (۳۱ام + ۱ ماه → ۳۱ فروردینِ ناموجود در ماه ۳۰روزه) به آخرین روزِ همان ماه بسته
// می‌شود، نه سرریز به ماهِ بعد؛ وگرنه سررسیدها به‌مرور جلو می‌افتند.
function faAddMonths(iso, months) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m || !Number.isFinite(+months)) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  const total = (y * 12 + (mo - 1)) + Math.round(+months);
  const ny = Math.floor(total / 12), nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  const nd = Math.min(d, last);
  return `${ny}-${String(nm).padStart(2, '0')}-${String(nd).padStart(2, '0')}`;
}

function faPlanBody(b) {
  const out = {};
  for (const f of FA_PLAN_FIELDS) out[f] = b[f] === undefined || b[f] === '' ? null : String(b[f]);
  if (!FA_PLAN_KINDS.includes(out.kind)) out.kind = FA_PLAN_KINDS[1];
  const iv = parseInt(out.interval_months, 10);
  out.interval_months = Number.isFinite(iv) && iv > 0 ? iv : 12;
  out.is_active = b.is_active === 0 || b.is_active === '0' || b.is_active === false ? 0 : 1;
  // اگر سررسید داده نشده ولی آخرین اجرا هست، از تناوب حساب می‌شود.
  if (!out.next_due_date && out.last_done_date) out.next_due_date = faAddMonths(out.last_done_date, out.interval_months);
  return out;
}

function faDueDecorate(row) {
  let days = null;
  if (row.next_due_date) {
    const d = Math.floor((Date.parse(row.next_due_date + 'T00:00:00Z') - Date.now()) / 86400000);
    days = Number.isFinite(d) ? d : null;
  }
  let due = 'unknown';
  if (days !== null) due = days < 0 ? 'overdue' : (days <= FA_NEAR_DAYS ? 'due_soon' : 'ok');
  return { ...row, days_to_due: days, due_status: due };
}

router.get('/assets', authRequired, requireAnyPermission('view_facility_assets', 'manage_facility_assets'), hospitalScope, (req, res) => {
  try {
    const where = ['a.hospital_id = ?'];
    const params = [req.hospitalId];
    if (req.query.category && FA_CATEGORIES.includes(req.query.category)) { where.push('a.category = ?'); params.push(req.query.category); }
    if (req.query.status && FA_STATUSES.includes(req.query.status)) { where.push('a.status = ?'); params.push(req.query.status); }
    if (req.query.q) {
      where.push(`(a.title LIKE ? OR IFNULL(a.asset_code,'') LIKE ? OR IFNULL(a.serial_no,'') LIKE ? OR IFNULL(a.location,'') LIKE ?)`);
      const like = '%' + req.query.q + '%';
      params.push(like, like, like, like);
    }
    // نزدیک‌ترین سررسیدِ فعالِ هر قلم در همان کوئری می‌آید تا فهرست بدون N+1
    // بتواند چراغِ وضعیت نشان دهد.
    const rows = query(`SELECT a.*,
        (SELECT MIN(p.next_due_date) FROM asset_maintenance_plans p
           WHERE p.asset_id = a.id AND p.is_active = 1 AND p.next_due_date IS NOT NULL) AS next_due_date,
        (SELECT COUNT(*) FROM asset_maintenance_plans p WHERE p.asset_id = a.id AND p.is_active = 1) AS plan_count,
        (SELECT COUNT(*) FROM asset_maintenance_logs l WHERE l.asset_id = a.id) AS log_count
      FROM facility_assets a
      WHERE ${where.join(' AND ')}
      ORDER BY a.category, a.title`, params).rows;
    res.json({ assets: rows.map(faDueDecorate), categories: FA_CATEGORIES, risk_classes: FA_RISK, plan_kinds: FA_PLAN_KINDS });
  } catch (err) { console.error('[FacilityAssets]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/assets', authRequired, requirePermission('manage_facility_assets'), hospitalScope, async (req, res) => {
  const a = faAssetBody(req.body);
  if (!a.title) return res.status(400).json({ error: 'عنوان قلم الزامی است' });
  try {
    const id = uuid();
    query(`INSERT INTO facility_assets (id, hospital_id, ${FA_ASSET_FIELDS.join(', ')}, created_by)
      VALUES (${new Array(FA_ASSET_FIELDS.length + 3).fill('?').join(', ')})`,
      [id, req.hospitalId, ...FA_ASSET_FIELDS.map(f => a[f]), req.user.id]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'asset_created', targetTable: 'facility_assets', targetId: id, ipAddress: req.ip });
    res.json({ asset: { id } });
  } catch (err) {
    if (/idx_fassets_code|facility_assets\.asset_code/.test(String(err.message || ''))) return res.status(400).json({ error: 'این کد اموال قبلاً ثبت شده است' });
    console.error('[FacilityAssets]', err); res.status(500).json({ error: 'خطای سرور' });
  }
});

router.put('/assets/:id', authRequired, requirePermission('manage_facility_assets'), hospitalScope, (req, res) => {
  try {
    const existing = query('SELECT id FROM facility_assets WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!existing) return res.status(404).json({ error: 'قلم یافت نشد' });
    const a = faAssetBody(req.body);
    if (!a.title) return res.status(400).json({ error: 'عنوان قلم الزامی است' });
    query(`UPDATE facility_assets SET ${FA_ASSET_FIELDS.map(f => f + ' = ?').join(', ')},
      updated_at = datetime('now') WHERE id = ? AND hospital_id = ?`,
      [...FA_ASSET_FIELDS.map(f => a[f]), existing.id, req.hospitalId]);
    res.json({ status: 'updated' });
  } catch (err) {
    if (/idx_fassets_code|facility_assets\.asset_code/.test(String(err.message || ''))) return res.status(400).json({ error: 'این کد اموال قبلاً ثبت شده است' });
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.delete('/assets/:id', authRequired, requirePermission('manage_facility_assets'), hospitalScope, async (req, res) => {
  try {
    const existing = query('SELECT id FROM facility_assets WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!existing) return res.status(404).json({ error: 'قلم یافت نشد' });
    query('DELETE FROM facility_assets WHERE id = ?', [existing.id]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'asset_deleted', targetTable: 'facility_assets', targetId: existing.id, ipAddress: req.ip });
    res.json({ status: 'deleted' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// شناسنامه‌ی کامل یک قلم: خودش + برنامه‌های دوره‌ای + سوابق اجرا
router.get('/assets/:id', authRequired, requireAnyPermission('view_facility_assets', 'manage_facility_assets'), hospitalScope, (req, res) => {
  try {
    const asset = query('SELECT * FROM facility_assets WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!asset) return res.status(404).json({ error: 'قلم یافت نشد' });
    const plans = query(`SELECT * FROM asset_maintenance_plans WHERE asset_id = ? AND hospital_id = ?
      ORDER BY is_active DESC, CASE WHEN next_due_date IS NULL THEN 1 ELSE 0 END, next_due_date`,
      [asset.id, req.hospitalId]).rows.map(faDueDecorate);
    const logs = query(`SELECT l.*, p.kind as plan_kind, u.full_name as created_by_name
      FROM asset_maintenance_logs l
      LEFT JOIN asset_maintenance_plans p ON l.plan_id = p.id
      LEFT JOIN users u ON l.created_by = u.id
      WHERE l.asset_id = ? AND l.hospital_id = ? ORDER BY l.done_date DESC, l.created_at DESC`,
      [asset.id, req.hospitalId]).rows;
    res.json({ asset, plans, logs, plan_kinds: FA_PLAN_KINDS, results: FA_RESULTS });
  } catch (err) { console.error('[FacilityAssets]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// تقویمِ سررسید — همان چیزی که ممیز می‌پرسد: «چه چیزهایی عقب افتاده؟»
router.get('/assets-due', authRequired, requireAnyPermission('view_facility_assets', 'manage_facility_assets'), hospitalScope, (req, res) => {
  try {
    const rows = query(`SELECT p.*, a.title as asset_title, a.asset_code, a.category, a.location
      FROM asset_maintenance_plans p JOIN facility_assets a ON p.asset_id = a.id
      WHERE p.hospital_id = ? AND p.is_active = 1 AND a.status = 'active'
      ORDER BY CASE WHEN p.next_due_date IS NULL THEN 1 ELSE 0 END, p.next_due_date`,
      [req.hospitalId]).rows.map(faDueDecorate);
    const summary = { overdue: 0, due_soon: 0, ok: 0, unknown: 0 };
    for (const r of rows) summary[r.due_status]++;
    res.json({ plans: rows, summary });
  } catch (err) { console.error('[FacilityAssets]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/assets/:id/plans', authRequired, requirePermission('manage_facility_assets'), hospitalScope, (req, res) => {
  try {
    const asset = query('SELECT id FROM facility_assets WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!asset) return res.status(404).json({ error: 'قلم یافت نشد' });
    const p = faPlanBody({ ...req.body, asset_id: asset.id });
    const id = uuid();
    query(`INSERT INTO asset_maintenance_plans (id, hospital_id, ${FA_PLAN_FIELDS.join(', ')}, created_by)
      VALUES (${new Array(FA_PLAN_FIELDS.length + 3).fill('?').join(', ')})`,
      [id, req.hospitalId, ...FA_PLAN_FIELDS.map(f => p[f]), req.user.id]);
    res.json({ plan: { id } });
  } catch (err) { console.error('[FacilityAssets]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.put('/assets/plans/:planId', authRequired, requirePermission('manage_facility_assets'), hospitalScope, (req, res) => {
  try {
    const existing = query('SELECT * FROM asset_maintenance_plans WHERE id = ? AND hospital_id = ?', [req.params.planId, req.hospitalId]).rows[0];
    if (!existing) return res.status(404).json({ error: 'برنامه یافت نشد' });
    const p = faPlanBody({ ...req.body, asset_id: existing.asset_id });
    query(`UPDATE asset_maintenance_plans SET ${FA_PLAN_FIELDS.map(f => f + ' = ?').join(', ')},
      updated_at = datetime('now') WHERE id = ? AND hospital_id = ?`,
      [...FA_PLAN_FIELDS.map(f => p[f]), existing.id, req.hospitalId]);
    res.json({ status: 'updated' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.delete('/assets/plans/:planId', authRequired, requirePermission('manage_facility_assets'), hospitalScope, (req, res) => {
  try {
    const existing = query('SELECT id FROM asset_maintenance_plans WHERE id = ? AND hospital_id = ?', [req.params.planId, req.hospitalId]).rows[0];
    if (!existing) return res.status(404).json({ error: 'برنامه یافت نشد' });
    query('DELETE FROM asset_maintenance_plans WHERE id = ?', [existing.id]);
    res.json({ status: 'deleted' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// ثبت اجرا — و همین‌جا سررسیدِ بعدیِ برنامه جلو می‌رود. عمداً در یک درخواست، چون
// «انجام شد ولی سررسید بعدی ثبت نشد» دقیقاً همان حالتی است که در ممیزی مچ می‌شود.
router.post('/assets/:id/logs', authRequired, requirePermission('manage_facility_assets'), hospitalScope, async (req, res) => {
  try {
    const asset = query('SELECT id FROM facility_assets WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!asset) return res.status(404).json({ error: 'قلم یافت نشد' });
    const doneDate = String(req.body.done_date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(doneDate)) return res.status(400).json({ error: 'تاریخ اجرا الزامی است' });
    const result = FA_RESULTS.includes(req.body.result) ? req.body.result : 'ok';
    let plan = null;
    if (req.body.plan_id) {
      plan = query('SELECT * FROM asset_maintenance_plans WHERE id = ? AND hospital_id = ? AND asset_id = ?',
        [req.body.plan_id, req.hospitalId, asset.id]).rows[0];
      if (!plan) return res.status(400).json({ error: 'برنامه‌ی دوره‌ای متعلق به این قلم نیست' });
    }
    const cost = Number.isFinite(parseInt(req.body.cost, 10)) ? parseInt(req.body.cost, 10) : null;
    const id = uuid();
    query(`INSERT INTO asset_maintenance_logs
      (id, hospital_id, plan_id, asset_id, done_date, result, performed_by, cost, description, corrective_action, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.hospitalId, plan ? plan.id : null, asset.id, doneDate, result,
        req.body.performed_by || null, cost, req.body.description || null, req.body.corrective_action || null, req.user.id]);

    let nextDue = null;
    if (plan) {
      // سررسیدِ بعدی: اگر کاربر خودش تاریخ داده (قرارداد پیمانکار) همان؛ وگرنه از تناوب.
      nextDue = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body.next_due_date || ''))
        ? String(req.body.next_due_date) : faAddMonths(doneDate, plan.interval_months);
      query(`UPDATE asset_maintenance_plans SET last_done_date = ?, next_due_date = ?, updated_at = datetime('now')
        WHERE id = ? AND hospital_id = ?`, [doneDate, nextDue, plan.id, req.hospitalId]);
    }
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'asset_maintenance_logged', targetTable: 'asset_maintenance_logs', targetId: id, ipAddress: req.ip });
    res.json({ log: { id }, next_due_date: nextDue });
  } catch (err) { console.error('[FacilityAssets]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.delete('/assets/logs/:logId', authRequired, requirePermission('manage_facility_assets'), hospitalScope, (req, res) => {
  try {
    const existing = query('SELECT id FROM asset_maintenance_logs WHERE id = ? AND hospital_id = ?', [req.params.logId, req.hospitalId]).rows[0];
    if (!existing) return res.status(404).json({ error: 'سابقه یافت نشد' });
    query('DELETE FROM asset_maintenance_logs WHERE id = ?', [existing.id]);
    res.json({ status: 'deleted' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

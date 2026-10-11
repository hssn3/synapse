/**
 * Clinical Nursing Hierarchy Routes
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

// ===== زیرساختار حوزه‌ی پرستاری — database/seed-nursing-hierarchy.js =====
// سوپروایزرهای بالینی شماره‌دار (تعداد/نام/ترتیب دلخواه مدیر پرستاری) + پیوند سوپروایزر
// آموزشی/کنترل‌عفونت (که از قبل به‌عنوان نقش مستقل وجود دارند) + بخش‌ها (سرپرستار/جانشین).
function nrsCanManage(req) { return (req.user.permissions || []).includes('manage_nursing_hierarchy'); }
function nrsCanView(req) {
  const p = req.user.permissions || [];
  return p.includes('manage_nursing_hierarchy') || p.includes('view_nursing_hierarchy');
}

router.get('/nursing/hierarchy', authRequired, hospitalScope, (req, res) => {
  if (!nrsCanView(req)) return res.status(403).json({ error: 'دسترسی ندارید' });
  try {
    const supervisors = query(
      `SELECT s.id, s.label, s.sort_order, s.user_id, u.full_name as user_name
       FROM nursing_supervisor_slots s LEFT JOIN users u ON u.id = s.user_id
       WHERE s.hospital_id = ? ORDER BY s.sort_order, s.created_at`, [req.hospitalId]).rows;

    // سوپروایزرهای آموزشی/کنترل عفونت از روی نقش موجودشان — نه ردیف تازه
    const linkedSupervisors = query(
      `SELECT u.id as user_id, u.full_name as user_name, r.code as role_code, r.title_fa as role_title,
              c.can_cover_clinical, c.note
       FROM users u JOIN roles r ON r.id = u.role_id
       LEFT JOIN nursing_cross_cover c ON c.hospital_id = u.hospital_id AND c.user_id = u.id
       WHERE u.hospital_id = ? AND u.is_active = 1 AND r.code IN ('education_supervisor','infection_control_supervisor')
       ORDER BY r.code`, [req.hospitalId]).rows;

    const wards = query(
      `SELECT w.id, w.title, w.icon, w.sort_order,
              w.head_nurse_id, hn.full_name as head_nurse_name,
              w.deputy1_id, d1.full_name as deputy1_name,
              w.deputy2_id, d2.full_name as deputy2_name
       FROM nursing_wards w
       LEFT JOIN users hn ON hn.id = w.head_nurse_id
       LEFT JOIN users d1 ON d1.id = w.deputy1_id
       LEFT JOIN users d2 ON d2.id = w.deputy2_id
       WHERE w.hospital_id = ? ORDER BY w.sort_order, w.created_at`, [req.hospitalId]).rows;

    res.json({ supervisors, linked_supervisors: linkedSupervisors, wards, can_manage: nrsCanManage(req) });
  } catch (err) { console.error('[NursingHierarchy]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ---- سوپروایزر بالینی: افزودن/ویرایش/حذف اسلات ----
router.post('/nursing/supervisors', authRequired, requirePermission('manage_nursing_hierarchy'), hospitalScope, (req, res) => {
  try {
    const label = req.body && req.body.label ? String(req.body.label).trim() : '';
    if (!label) return res.status(400).json({ error: 'عنوان الزامی است' });
    const maxRow = query('SELECT MAX(sort_order) as m FROM nursing_supervisor_slots WHERE hospital_id = ?', [req.hospitalId]).rows[0];
    const id = uuid();
    query(`INSERT INTO nursing_supervisor_slots (id, hospital_id, label, sort_order, created_by) VALUES (?, ?, ?, ?, ?)`,
      [id, req.hospitalId, label, (maxRow.m || 0) + 1, req.user.id]);
    res.json({ item: { id } });
  } catch (err) { console.error('[NursingHierarchy]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.put('/nursing/supervisors/:id', authRequired, requirePermission('manage_nursing_hierarchy'), hospitalScope, (req, res) => {
  try {
    const ex = query('SELECT id FROM nursing_supervisor_slots WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!ex) return res.status(404).json({ error: 'یافت نشد' });
    const b = req.body || {};
    let userId = null;
    if (b.user_id) {
      const u = query('SELECT id FROM users WHERE id = ? AND hospital_id = ? AND is_active = 1', [b.user_id, req.hospitalId]).rows[0];
      if (!u) return res.status(400).json({ error: 'کاربر معتبر نیست' });
      userId = u.id;
    }
    const label = b.label !== undefined ? String(b.label).trim() : null;
    query(`UPDATE nursing_supervisor_slots SET
        label = COALESCE(?, label), user_id = ?, sort_order = COALESCE(?, sort_order), updated_at = datetime('now')
       WHERE id = ?`, [label || null, userId, Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : null, ex.id]);
    res.json({ status: 'updated' });
  } catch (err) { console.error('[NursingHierarchy]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.delete('/nursing/supervisors/:id', authRequired, requirePermission('manage_nursing_hierarchy'), hospitalScope, (req, res) => {
  try {
    const ex = query('SELECT id FROM nursing_supervisor_slots WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!ex) return res.status(404).json({ error: 'یافت نشد' });
    query('DELETE FROM nursing_supervisor_slots WHERE id = ?', [ex.id]);
    res.json({ status: 'deleted' });
  } catch (err) { console.error('[NursingHierarchy]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ---- پرچم پوشش موردی سوپروایزر آموزشی/کنترل عفونت روی شیفت بالینی ----
router.put('/nursing/cross-cover/:userId', authRequired, requirePermission('manage_nursing_hierarchy'), hospitalScope, (req, res) => {
  try {
    const u = query(
      `SELECT u.id, r.code as role_code FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.id = ? AND u.hospital_id = ?`, [req.params.userId, req.hospitalId]).rows[0];
    if (!u) return res.status(404).json({ error: 'کاربر یافت نشد' });
    if (!['education_supervisor', 'infection_control_supervisor'].includes(u.role_code)) {
      return res.status(400).json({ error: 'این پرچم فقط برای سوپروایزر آموزشی یا کنترل عفونت است' });
    }
    const b = req.body || {};
    const can = b.can_cover_clinical ? 1 : 0;
    const note = b.note ? String(b.note).trim() : null;
    const ex = query('SELECT id FROM nursing_cross_cover WHERE hospital_id = ? AND user_id = ?', [req.hospitalId, u.id]).rows[0];
    if (ex) {
      query(`UPDATE nursing_cross_cover SET can_cover_clinical = ?, note = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?`,
        [can, note, req.user.id, ex.id]);
    } else {
      query(`INSERT INTO nursing_cross_cover (id, hospital_id, user_id, can_cover_clinical, note, updated_by) VALUES (?, ?, ?, ?, ?, ?)`,
        [uuid(), req.hospitalId, u.id, can, note, req.user.id]);
    }
    res.json({ status: 'updated' });
  } catch (err) { console.error('[NursingHierarchy]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ---- بخش‌ها: نام/آیکون/سرپرستار/جانشین‌ها ----
router.post('/nursing/wards', authRequired, requirePermission('manage_nursing_hierarchy'), hospitalScope, async (req, res) => {
  try {
    const title = req.body && req.body.title ? String(req.body.title).trim() : '';
    if (!title) return res.status(400).json({ error: 'نام بخش الزامی است' });
    const icon = req.body && req.body.icon ? String(req.body.icon).trim().slice(0, 4) : '✚';
    const maxRow = query('SELECT MAX(sort_order) as m FROM nursing_wards WHERE hospital_id = ?', [req.hospitalId]).rows[0];
    const id = uuid();
    query(`INSERT INTO nursing_wards (id, hospital_id, title, icon, sort_order) VALUES (?, ?, ?, ?, ?)`,
      [id, req.hospitalId, title, icon, (maxRow.m || 0) + 1]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'nursing_ward_created', targetTable: 'nursing_wards', targetId: id, ipAddress: req.ip });
    res.json({ item: { id } });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(409).json({ error: 'این نام بخش قبلاً ثبت شده است' });
    console.error('[NursingHierarchy]', err); res.status(500).json({ error: 'خطای سرور' });
  }
});

function nrsUserOrNull(id, hospitalId) {
  if (!id) return null;
  const u = query('SELECT id FROM users WHERE id = ? AND hospital_id = ? AND is_active = 1', [id, hospitalId]).rows[0];
  return u ? u.id : null;
}

router.put('/nursing/wards/:id', authRequired, requirePermission('manage_nursing_hierarchy'), hospitalScope, (req, res) => {
  try {
    const ex = query('SELECT id FROM nursing_wards WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!ex) return res.status(404).json({ error: 'بخش یافت نشد' });
    const b = req.body || {};
    const title = b.title !== undefined ? String(b.title).trim() : null;
    if (b.title !== undefined && !title) return res.status(400).json({ error: 'نام بخش الزامی است' });
    const icon = b.icon !== undefined ? String(b.icon).trim().slice(0, 4) : null;
    const head = b.head_nurse_id !== undefined ? nrsUserOrNull(b.head_nurse_id, req.hospitalId) : undefined;
    const d1 = b.deputy1_id !== undefined ? nrsUserOrNull(b.deputy1_id, req.hospitalId) : undefined;
    const d2 = b.deputy2_id !== undefined ? nrsUserOrNull(b.deputy2_id, req.hospitalId) : undefined;
    query(`UPDATE nursing_wards SET
        title = COALESCE(?, title), icon = COALESCE(?, icon),
        head_nurse_id = CASE WHEN ? THEN ? ELSE head_nurse_id END,
        deputy1_id = CASE WHEN ? THEN ? ELSE deputy1_id END,
        deputy2_id = CASE WHEN ? THEN ? ELSE deputy2_id END,
        updated_at = datetime('now')
       WHERE id = ?`,
      [title, icon,
       head !== undefined ? 1 : 0, head,
       d1 !== undefined ? 1 : 0, d1,
       d2 !== undefined ? 1 : 0, d2,
       ex.id]);
    res.json({ status: 'updated' });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(409).json({ error: 'این نام بخش قبلاً ثبت شده است' });
    console.error('[NursingHierarchy]', err); res.status(500).json({ error: 'خطای سرور' });
  }
});

router.delete('/nursing/wards/:id', authRequired, requirePermission('manage_nursing_hierarchy'), hospitalScope, async (req, res) => {
  try {
    const ex = query('SELECT id FROM nursing_wards WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!ex) return res.status(404).json({ error: 'بخش یافت نشد' });
    query('DELETE FROM nursing_wards WHERE id = ?', [ex.id]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'nursing_ward_deleted', targetTable: 'nursing_wards', targetId: ex.id, ipAddress: req.ip });
    res.json({ status: 'deleted' });
  } catch (err) { console.error('[NursingHierarchy]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ---- روستر سوپروایزر بالینی: بخش‌به‌بخش، سرپرستار+جانشین‌ها+پرستاران (از روی users.department) ----
router.get('/nursing/roster', authRequired, hospitalScope, (req, res) => {
  if (!nrsCanView(req)) return res.status(403).json({ error: 'دسترسی ندارید' });
  try {
    const wards = query(
      `SELECT w.id, w.title, w.icon,
              w.head_nurse_id, hn.full_name as head_nurse_name,
              w.deputy1_id, d1.full_name as deputy1_name,
              w.deputy2_id, d2.full_name as deputy2_name
       FROM nursing_wards w
       LEFT JOIN users hn ON hn.id = w.head_nurse_id
       LEFT JOIN users d1 ON d1.id = w.deputy1_id
       LEFT JOIN users d2 ON d2.id = w.deputy2_id
       WHERE w.hospital_id = ? ORDER BY w.sort_order, w.created_at`, [req.hospitalId]).rows;
    const nurses = query(
      `SELECT u.id, u.full_name, u.department FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.hospital_id = ? AND u.is_active = 1 AND r.code = 'staff_nurse'`, [req.hospitalId]).rows;
    const out = wards.map(w => ({ ...w, staff_nurses: nurses.filter(n => n.department === w.title) }));
    res.json({ wards: out });
  } catch (err) { console.error('[NursingHierarchy]', err); res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

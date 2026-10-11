/**
 * Clinical Training Needs Routes
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

// ===== نیازسنجی آموزشی — database/seed-training.js =====
// یک جدول، سه نما: «درخواست‌های من» / «کارتابل مافوق» / «تأیید نهایی سازمان».
// ماشین وضعیت: ثبت_شده → بررسی_مافوق → تأییدشده|رد_شده. پرش از مرحله ممکن نیست (۴۰۰).
const TRN_TYPES = ['عمومی', 'اختصاصی', 'خارج از فهرست'];
const TRN_STATUSES = ['ثبت_شده', 'بررسی_مافوق', 'تأییدشده', 'رد_شده'];
const TRN_FIELDS = ['title', 'description', 'requested_course_type', 'job_group', 'department', 'year'];
const canReviewTraining = req => (req.user.permissions || []).includes('review_training_needs');
const canApproveTraining = req => (req.user.permissions || []).includes('approve_training');

function trnBody(body) {
  const out = {};
  for (const f of TRN_FIELDS) out[f] = body[f] === undefined || body[f] === '' ? null : String(body[f]);
  out.requested_course_type = matchFa(TRN_TYPES, out.requested_course_type) || 'عمومی';
  const y = parseInt(out.year, 10);
  out.year = Number.isFinite(y) && y >= 1390 && y <= 1450 ? String(y) : String(currentJalaliYear());
  return out;
}

const trnSelect = `SELECT t.*, eu.full_name AS employee_name, su.full_name AS superior_name,
    du.full_name AS decided_by_name
  FROM training_needs t
  LEFT JOIN users eu ON t.employee_id = eu.id
  LEFT JOIN users su ON t.superior_id = su.id
  LEFT JOIN users du ON t.decided_by = du.id`;

// «مافوقِ» یک درخواست: اگر users.supervisor_id پر باشد همان، وگرنه انتخابِ صریحِ ثبت‌کننده.
// اگر هیچ‌کدام نبود، NULL می‌ماند و درخواست در کارتابل همه‌ی دارندگان review_training_needs
// همان بیمارستان دیده می‌شود تا زمین نماند (بند «مسئله‌ی مافوق کیست؟» در seed-training.js).
function resolveSuperiorId(req, wanted) {
  const me = query('SELECT supervisor_id FROM users WHERE id = ?', [req.user.id]).rows[0];
  if (me && me.supervisor_id) return me.supervisor_id;
  if (!wanted) return null;
  const u = query('SELECT id FROM users WHERE id = ? AND hospital_id = ?', [String(wanted), req.hospitalId]).rows[0];
  return u ? u.id : null;
}

router.get('/training-needs', authRequired, hospitalScope, (req, res) => {
  try {
    const where = ['t.hospital_id = ?'];
    const params = [req.hospitalId];
    const stage = req.query.stage;
    if (stage === 'mine') {
      where.push('t.employee_id = ?'); params.push(req.user.id);
    } else if (stage === 'superior') {
      if (!canReviewTraining(req)) return res.status(403).json({ error: 'دسترسی به کارتابل مافوق ندارید' });
      where.push("t.status = 'ثبت_شده' AND (t.superior_id = ? OR t.superior_id IS NULL)");
      params.push(req.user.id);
    } else if (stage === 'org') {
      if (!canApproveTraining(req)) return res.status(403).json({ error: 'دسترسی به تأیید نهایی ندارید' });
      where.push("t.status = 'بررسی_مافوق'");
    }
    const fStatus = matchFa(TRN_STATUSES, req.query.status);
    if (fStatus) { where.push('t.status = ?'); params.push(fStatus); }
    if (req.query.year) { where.push('t.year = ?'); params.push(String(req.query.year)); }
    if (req.query.department) { where.push('t.department LIKE ?'); params.push('%' + req.query.department + '%'); }
    if (req.query.q) { where.push("(t.title LIKE ? OR IFNULL(t.description,'') LIKE ?)"); params.push('%' + req.query.q + '%', '%' + req.query.q + '%'); }
    const rows = query(`${trnSelect} WHERE ${where.join(' AND ')} ORDER BY t.created_at DESC`, params).rows;
    res.json({ needs: rows, can_review: canReviewTraining(req), can_approve: canApproveTraining(req) });
  } catch (err) { console.error('[Training]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.get('/training-needs/:id', authRequired, hospitalScope, (req, res) => {
  try {
    const need = query(`${trnSelect} WHERE t.id = ? AND t.hospital_id = ?`, [req.params.id, req.hospitalId]).rows[0];
    if (!need) return res.status(404).json({ error: 'نیاز آموزشی یافت نشد' });
    res.json({ need, can_review: canReviewTraining(req), can_approve: canApproveTraining(req) });
  } catch (err) { console.error('[Training]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ثبت نیاز آموزشی — هر کاربر احراز هویت‌شده. وضعیت اولیه همیشه «ثبت_شده» و از بدنه خوانده نمی‌شود.
router.post('/training-needs', authRequired, hospitalScope, async (req, res) => {
  const b = trnBody(req.body);
  if (!b.title) return res.status(400).json({ error: 'عنوان نیاز آموزشی الزامی است' });
  try {
    const id = uuid();
    query(`INSERT INTO training_needs (id, hospital_id, employee_id, superior_id, status, ${TRN_FIELDS.join(', ')})
      VALUES (${new Array(TRN_FIELDS.length + 5).fill('?').join(', ')})`,
      [id, req.hospitalId, req.user.id, resolveSuperiorId(req, req.body.superior_id), 'ثبت_شده', ...TRN_FIELDS.map(f => b[f])]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'training_need_submitted', targetTable: 'training_needs', targetId: id, ipAddress: req.ip });
    res.json({ need: { id } });
  } catch (err) { console.error('[Training]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ویرایش محتوا — فقط خودِ ثبت‌کننده و فقط تا وقتی مافوق نظر نداده است
router.put('/training-needs/:id', authRequired, hospitalScope, (req, res) => {
  try {
    const ex = query('SELECT * FROM training_needs WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!ex) return res.status(404).json({ error: 'نیاز آموزشی یافت نشد' });
    if (ex.employee_id !== req.user.id) return res.status(403).json({ error: 'دسترسی ندارید' });
    if (ex.status !== 'ثبت_شده') return res.status(400).json({ error: 'پس از بررسی مافوق، ویرایش ممکن نیست' });
    const b = trnBody(req.body);
    if (!b.title) return res.status(400).json({ error: 'عنوان نیاز آموزشی الزامی است' });
    query(`UPDATE training_needs SET ${TRN_FIELDS.map(f => f + ' = ?').join(', ')}, updated_at = datetime('now')
      WHERE id = ?`, [...TRN_FIELDS.map(f => b[f]), ex.id]);
    res.json({ status: 'updated' });
  } catch (err) { console.error('[Training]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// مرحله ۲ — نظر مافوق. تصمیم: تأیید (به سازمان می‌رود) یا رد (همین‌جا بسته می‌شود).
router.put('/training-needs/:id/superior-review', authRequired, requirePermission('review_training_needs'), hospitalScope, async (req, res) => {
  try {
    const ex = query('SELECT * FROM training_needs WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!ex) return res.status(404).json({ error: 'نیاز آموزشی یافت نشد' });
    if (ex.status !== 'ثبت_شده') return res.status(400).json({ error: 'این درخواست قبلاً توسط مافوق بررسی شده است' });
    if (ex.superior_id && ex.superior_id !== req.user.id) return res.status(403).json({ error: 'مافوق این درخواست شما نیستید' });
    const decision = matchFa(['تأیید', 'رد'], req.body.superior_decision);
    if (!decision) return res.status(400).json({ error: 'تصمیم مافوق باید «تأیید» یا «رد» باشد' });
    const status = decision === 'تأیید' ? 'بررسی_مافوق' : 'رد_شده';
    query(`UPDATE training_needs SET status = ?, superior_id = ?, superior_decision = ?, superior_comment = ?,
      superior_reviewed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      [status, req.user.id, decision, req.body.superior_comment ? String(req.body.superior_comment) : null, ex.id]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'training_need_superior_' + (decision === 'تأیید' ? 'approved' : 'rejected'), targetTable: 'training_needs', targetId: ex.id, ipAddress: req.ip });
    res.json({ status });
  } catch (err) { console.error('[Training]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// مرحله ۳ — تصمیم نهایی سازمان (دفتر آموزش). فقط از وضعیت «بررسی_مافوق»؛ پرش از مرحله = ۴۰۰.
router.put('/training-needs/:id/final-decision', authRequired, requirePermission('approve_training'), hospitalScope, async (req, res) => {
  try {
    const ex = query('SELECT * FROM training_needs WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!ex) return res.status(404).json({ error: 'نیاز آموزشی یافت نشد' });
    if (ex.status === 'ثبت_شده') return res.status(400).json({ error: 'تا پیش از بررسی مافوق، تصمیم نهایی ممکن نیست' });
    if (ex.status !== 'بررسی_مافوق') return res.status(400).json({ error: 'این درخواست قبلاً تعیین تکلیف شده است' });
    const decision = matchFa(['تأیید', 'رد'], req.body.org_decision);
    if (!decision) return res.status(400).json({ error: 'تصمیم نهایی باید «تأیید» یا «رد» باشد' });
    const status = decision === 'تأیید' ? 'تأییدشده' : 'رد_شده';
    query(`UPDATE training_needs SET status = ?, org_decision = ?, org_comment = ?, decided_by = ?,
      decided_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      [status, decision, req.body.org_comment ? String(req.body.org_comment) : null, req.user.id, ex.id]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'training_need_' + (decision === 'تأیید' ? 'approved' : 'rejected'), targetTable: 'training_needs', targetId: ex.id, ipAddress: req.ip });
    res.json({ status });
  } catch (err) { console.error('[Training]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.delete('/training-needs/:id', authRequired, hospitalScope, async (req, res) => {
  try {
    const ex = query('SELECT * FROM training_needs WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!ex) return res.status(404).json({ error: 'نیاز آموزشی یافت نشد' });
    if (!(ex.employee_id === req.user.id && ex.status === 'ثبت_شده') && !canApproveTraining(req)) {
      return res.status(403).json({ error: 'دسترسی ندارید' });
    }
    query('DELETE FROM training_needs WHERE id = ?', [ex.id]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'training_need_deleted', targetTable: 'training_needs', targetId: ex.id, ipAddress: req.ip });
    res.json({ status: 'deleted' });
  } catch (err) { console.error('[Training]', err); res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

/**
 * Quality Improvement Programs Routes
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

// ===== برنامه‌های بهبود/عملیاتی/استراتژیک — گردش‌کار «پیشنهاد → تأیید» (database/seed-programs.js) =====
// ساخت عمداً بدون مجوز است (الگوی پیشنهاد پایین‌به‌بالای طراحی اولیه حسن)؛ فقط تأیید/رد پشت approve_programs.
const PROG_TYPES = ['بهبود', 'عملیاتی', 'استراتژیک'];
const PROG_STATUSES = ['پیشنهاد_شده', 'تأییدشده', 'رد_شده', 'در_حال_اجرا', 'تکمیل‌شده'];
const PROG_FIELDS = ['title', 'program_type', 'description', 'strategic_goal', 'department', 'start_date', 'due_date'];

function progBody(body) {
  const out = {};
  for (const f of PROG_FIELDS) out[f] = body[f] === undefined || body[f] === '' ? null : String(body[f]);
  // مقدار متعارف را می‌نویسیم تا «عملياتي» با «ی/ک» عربی بی‌سروصدا به «بهبود» تبدیل نشود
  out.program_type = matchFa(PROG_TYPES, out.program_type) || 'بهبود';
  return out;
}
const progSelect = `SELECT p.*, pu.full_name as proposed_by_name, au.full_name as approved_by_name
  FROM improvement_programs p
  LEFT JOIN users pu ON p.proposed_by = pu.id
  LEFT JOIN users au ON p.approved_by = au.id`;
const canApprovePrograms = req => (req.user.permissions || []).includes('approve_programs');

router.get('/programs', authRequired, hospitalScope, (req, res) => {
  try {
    const where = ['p.hospital_id = ?'];
    const params = [req.hospitalId];
    const fType = matchFa(PROG_TYPES, req.query.type);
    if (fType) { where.push('p.program_type = ?'); params.push(fType); }
    const fStatus = matchFa(PROG_STATUSES, req.query.status);
    if (fStatus) { where.push('p.status = ?'); params.push(fStatus); }
    if (req.query.department) { where.push('p.department LIKE ?'); params.push('%' + req.query.department + '%'); }
    if (req.query.q) { where.push("(p.title LIKE ? OR IFNULL(p.strategic_goal,'') LIKE ?)"); params.push('%' + req.query.q + '%', '%' + req.query.q + '%'); }
    const rows = query(`${progSelect} WHERE ${where.join(' AND ')} ORDER BY p.created_at DESC`, params).rows;
    res.json({ programs: rows, can_approve: canApprovePrograms(req) });
  } catch (err) { console.error('[Programs]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.get('/programs/:id', authRequired, hospitalScope, (req, res) => {
  try {
    const program = query(`${progSelect} WHERE p.id = ? AND p.hospital_id = ?`, [req.params.id, req.hospitalId]).rows[0];
    if (!program) return res.status(404).json({ error: 'برنامه یافت نشد' });
    res.json({ program, can_approve: canApprovePrograms(req) });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// پیشنهاد برنامه — هر کاربر احراز هویت‌شده. وضعیت اولیه همیشه «پیشنهاد_شده» است و از بدنه خوانده نمی‌شود.
router.post('/programs', authRequired, hospitalScope, async (req, res) => {
  const p = progBody(req.body);
  if (!p.title) return res.status(400).json({ error: 'عنوان برنامه الزامی است' });
  try {
    const id = uuid();
    query(`INSERT INTO improvement_programs (id, hospital_id, ${PROG_FIELDS.join(', ')}, proposed_by, status, progress_percent)
      VALUES (${new Array(PROG_FIELDS.length + 5).fill('?').join(', ')})`,
      [id, req.hospitalId, ...PROG_FIELDS.map(f => p[f]), req.user.id, 'پیشنهاد_شده', 0]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'program_proposed', targetTable: 'improvement_programs', targetId: id, ipAddress: req.ip });
    res.json({ program: { id } });
  } catch (err) { console.error('[Programs]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ویرایش محتوای برنامه — پیشنهاددهنده تا وقتی تأیید نشده، یا هر تأییدکننده
router.put('/programs/:id', authRequired, hospitalScope, async (req, res) => {
  try {
    const ex = query('SELECT * FROM improvement_programs WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!ex) return res.status(404).json({ error: 'برنامه یافت نشد' });
    const approver = canApprovePrograms(req);
    if (!approver && !(ex.proposed_by === req.user.id && ex.status === 'پیشنهاد_شده')) {
      return res.status(403).json({ error: 'دسترسی ندارید' });
    }
    const p = progBody(req.body);
    if (!p.title) return res.status(400).json({ error: 'عنوان برنامه الزامی است' });
    query(`UPDATE improvement_programs SET ${PROG_FIELDS.map(f => f + ' = ?').join(', ')}, updated_at = datetime('now')
      WHERE id = ? AND hospital_id = ?`, [...PROG_FIELDS.map(f => p[f]), ex.id, req.hospitalId]);
    res.json({ status: 'updated' });
  } catch (err) { console.error('[Programs]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// گام دوم گردش‌کار: تأیید یا رد. فقط از وضعیت «پیشنهاد_شده» ممکن است تا تصمیم دوباره گرفته نشود.
function decideProgram(decision) {
  return async (req, res) => {
    try {
      const ex = query('SELECT * FROM improvement_programs WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
      if (!ex) return res.status(404).json({ error: 'برنامه یافت نشد' });
      if (ex.status !== 'پیشنهاد_شده') return res.status(400).json({ error: 'این برنامه قبلاً بررسی شده است' });
      query(`UPDATE improvement_programs SET status = ?, approved_by = ?, approved_at = datetime('now'),
        decision_note = ?, updated_at = datetime('now') WHERE id = ?`,
        [decision, req.user.id, req.body.decision_note ? String(req.body.decision_note) : null, ex.id]);
      await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: decision === 'تأییدشده' ? 'program_approved' : 'program_rejected',
        targetTable: 'improvement_programs', targetId: ex.id, ipAddress: req.ip });
      res.json({ status: decision });
    } catch (err) { console.error('[Programs]', err); res.status(500).json({ error: 'خطای سرور' }); }
  };
}
router.put('/programs/:id/approve', authRequired, requirePermission('approve_programs'), hospitalScope, decideProgram('تأییدشده'));
router.put('/programs/:id/reject', authRequired, requirePermission('approve_programs'), hospitalScope, decideProgram('رد_شده'));

// به‌روزرسانی درصد پیشرفت — فقط پیشنهاددهنده یا یک تأییدکننده، و فقط پس از تأیید
router.put('/programs/:id/progress', authRequired, hospitalScope, (req, res) => {
  try {
    const ex = query('SELECT * FROM improvement_programs WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!ex) return res.status(404).json({ error: 'برنامه یافت نشد' });
    if (ex.proposed_by !== req.user.id && !canApprovePrograms(req)) return res.status(403).json({ error: 'دسترسی ندارید' });
    if (ex.status === 'پیشنهاد_شده' || ex.status === 'رد_شده') {
      return res.status(400).json({ error: 'تا پیش از تأیید برنامه، ثبت پیشرفت ممکن نیست' });
    }
    let pct = Number(req.body.progress_percent);
    if (!Number.isFinite(pct)) return res.status(400).json({ error: 'درصد پیشرفت نامعتبر است' });
    pct = Math.max(0, Math.min(100, Math.round(pct)));
    // وضعیت خودش را از درصد پیشرفت می‌گیرد تا فهرست هرگز «تأییدشده ۱۰۰٪» نشان ندهد
    let status = ex.status;
    if (pct >= 100) status = 'تکمیل‌شده';
    else if (pct > 0) status = 'در_حال_اجرا';
    else if (status === 'تکمیل‌شده' || status === 'در_حال_اجرا') status = 'تأییدشده';
    const wantStatus = matchFa(PROG_STATUSES, req.body.status);
    if (wantStatus) status = wantStatus;
    query("UPDATE improvement_programs SET progress_percent = ?, status = ?, updated_at = datetime('now') WHERE id = ?", [pct, status, ex.id]);
    res.json({ status: 'updated', progress_percent: pct, program_status: status });
  } catch (err) { console.error('[Programs]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.delete('/programs/:id', authRequired, hospitalScope, async (req, res) => {
  try {
    const ex = query('SELECT * FROM improvement_programs WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!ex) return res.status(404).json({ error: 'برنامه یافت نشد' });
    if (!canApprovePrograms(req) && !(ex.proposed_by === req.user.id && ex.status === 'پیشنهاد_شده')) {
      return res.status(403).json({ error: 'دسترسی ندارید' });
    }
    query('DELETE FROM improvement_programs WHERE id = ?', [ex.id]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'program_deleted', targetTable: 'improvement_programs', targetId: ex.id, ipAddress: req.ip });
    res.json({ status: 'deleted' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

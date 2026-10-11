/**
 * Electronic Evidence Records Routes
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
  normFa,
  matchFa,
  truthy,
  MER_EVAL_STATUSES,
  merValidate,
  merInsert,
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

// ===== پرونده‌ی الکترونیکی شواهد (evidence_files) =====
// چرا: پیش از این «شواهد» یک سنجه فقط متن آزاد بود و کاربر در آن *محل نگهداری* مدرک کاغذی را
// می‌نوشت. حالا خود مدرک در سامانه بارگذاری می‌شود؛ متن فقط توضیح می‌دهد فایل چه چیزی را نشان می‌دهد.
// یک مسیر مشترک برای همه‌ی ماژول‌ها (نه آپلود موازی به‌ازای هر ماژول) — storeUploadedFile/sendStoredFile.
//
// هر نوع موجودیت: جدول والد + مجوز لازم برای بارگذاری/حذف.  خواندن با هر دسترسیِ ورود مجاز است،
// چون فایل به‌هرحال با hospital_id همان کاربر فیلتر می‌شود.
const EVIDENCE_ENTITIES = {
  // سنجه: والد در accreditation_sections است و دامنه‌ی نقش هم باید بررسی شود (مثل PUT status)
  measure: { perm: 'edit_measure_status' },
  audit: { table: 'internal_audits', perm: 'manage_audits' },
  // شاهد به خودِ بازدید بسته می‌شود نه به مصوبه: مصوبه‌ها در هر ذخیره‌ی بازدید حذف و دوباره
  // درج می‌شوند (DELETE+INSERT در updateResolutions)، پس id آن‌ها پایدار نیست و فایل یتیم می‌شد.
  walkaround: { table: 'management_walkarounds', perm: 'manage_walkarounds' },
  // پاسخ‌نامه‌ی چک‌لیست: بدون این، تنها ماژولی بود که هیچ مدرکی نمی‌شد به آن پیوست
  // کرد — در حالی که کتاب برای پایش‌ها شاهد می‌خواهد (عکس کنتور، برگه‌ی آزمایش،
  // تأییدیه‌ی تعمیر). شاهد به خودِ پاسخ‌نامه بسته می‌شود نه به تک‌تک پاسخ‌ها،
  // چون answers یک آرایه‌ی JSON است و id پایداری برای هر پاسخ وجود ندارد.
  checklist_submission: { table: 'checklist_submissions', perm: 'submit_checklists' },
};

// بررسی وجود موجودیت والد در همین بیمارستان + دامنه‌ی دسترسی. خروجی: null یعنی مجاز.
function evidenceGuard(req, entityType, entityId) {
  const def = EVIDENCE_ENTITIES[entityType];
  if (!def) return { code: 400, error: 'نوع شاهد نامعتبر است' };
  if (entityType === 'measure') {
    const m = query('SELECT id, code FROM accreditation_sections WHERE id = ?', [entityId]).rows[0];
    if (!m) return { code: 404, error: 'سنجه یافت نشد' };
    const scope = scopeFor(req.user.role_code, req.user.permissions);
    if (!measureAllowed(scope, m, loadOverrides(req.user.id))) {
      return { code: 403, error: 'این سنجه خارج از دامنه دسترسی شماست' };
    }
    return null;
  }
  const row = query(`SELECT id FROM ${def.table} WHERE id = ? AND hospital_id = ?`, [entityId, req.hospitalId]).rows[0];
  if (!row) return { code: 404, error: 'رکورد مرتبط یافت نشد' };
  return null;
}

// multer نام اصلی فایل را طبق RFC-7578 به‌صورت latin1 می‌خواند؛ نام فارسی بدون این تبدیل
// در پایگاه‌داده به‌شکل «Ú¯ÙØ§ÙÛ.pdf» ذخیره می‌شود.
function originalName(file) {
  try { return Buffer.from(file.originalname, 'latin1').toString('utf8'); }
  catch (e) { return file.originalname; }
}

function hasPerm(req, perm) {
  const p = req.user.permissions || [];
  return p.includes('*') || p.includes(perm);
}

// فهرست شواهد یک موجودیت
router.get('/evidence/:entityType/:entityId', authRequired, hospitalScope, (req, res) => {
  try {
    if (!EVIDENCE_ENTITIES[req.params.entityType]) return res.status(400).json({ error: 'نوع شاهد نامعتبر است' });
    const rows = query(`SELECT e.id, e.file_name, e.file_size_bytes, e.title, e.created_at, u.full_name AS uploaded_by_name
      FROM evidence_files e LEFT JOIN users u ON e.uploaded_by = u.id
      WHERE e.hospital_id = ? AND e.entity_type = ? AND e.entity_id = ?
      ORDER BY e.created_at DESC`, [req.hospitalId, req.params.entityType, req.params.entityId]);
    res.json({ files: rows.rows });
  } catch (err) { console.error('[Evidence]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// بارگذاری شاهد واقعی (تصویر فشرده‌شده یا PDF) — همان محدودیت‌های آپلود مشترک
router.post('/evidence/:entityType/:entityId', authRequired, hospitalScope, uploadSingle('file'), async (req, res) => {
  try {
    const def = EVIDENCE_ENTITIES[req.params.entityType];
    if (!def) return res.status(400).json({ error: 'نوع شاهد نامعتبر است' });
    if (!hasPerm(req, def.perm)) return res.status(403).json({ error: 'اجازه بارگذاری شاهد برای این بخش را ندارید' });
    const bad = evidenceGuard(req, req.params.entityType, req.params.entityId);
    if (bad) return res.status(bad.code).json({ error: bad.error });
    if (!req.file) return res.status(400).json({ error: 'فایلی ارسال نشده' });

    const saved = await storeUploadedFile(req.file);
    const id = uuid();
    query(`INSERT INTO evidence_files (id, hospital_id, entity_type, entity_id, file_path, file_name, file_size_bytes, title, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.hospitalId, req.params.entityType, req.params.entityId, saved.filename,
       originalName(req.file), saved.size, (req.body.title || '').trim() || null, req.user.id]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'file_uploaded', targetTable: 'evidence_files', targetId: id, ipAddress: req.ip });
    res.json({ file: { id, file_name: originalName(req.file), file_size_bytes: saved.size } });
  } catch (err) {
    if (err.isUploadValidation) return res.status(400).json({ error: err.message });
    console.error('[Evidence Upload]', err);
    res.status(500).json({ error: 'خطای سرور در آپلود' });
  }
});

// دانلود — فیلتر hospital_id تضمین می‌کند فایل بیمارستان دیگر حتی با دانستن id قابل دریافت نیست
router.get('/evidence/file/:id/download', authRequired, hospitalScope, (req, res) => {
  try {
    const row = query('SELECT file_path, file_name FROM evidence_files WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'فایلی یافت نشد' });
    sendStoredFile(res, row.file_path, row.file_name);
  } catch (err) { console.error('[Evidence]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.delete('/evidence/file/:id', authRequired, hospitalScope, (req, res) => {
  try {
    const row = query('SELECT * FROM evidence_files WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'فایلی یافت نشد' });
    const def = EVIDENCE_ENTITIES[row.entity_type];
    if (!def || !hasPerm(req, def.perm)) return res.status(403).json({ error: 'اجازه حذف این شاهد را ندارید' });
    query('DELETE FROM evidence_files WHERE id = ?', [req.params.id]);
    // فایل روی دیسک هم حذف می‌شود؛ نبودِ فایل خطا نیست (ممکن است قبلاً پاک شده باشد)
    try { fs.unlinkSync(path.join(config.upload.dir, path.basename(String(row.file_path)))); } catch (e) {}
    res.json({ status: 'deleted' });
  } catch (err) { console.error('[Evidence]', err); res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

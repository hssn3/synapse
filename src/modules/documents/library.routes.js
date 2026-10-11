/**
 * Digital Library Routes
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

// ===== کتابخانه دیجیتال — مخزن ساده فایل، بدون گردش‌کار امضا =====
const LIB_CATEGORIES = ['regulation', 'pamphlet', 'issued_form', 'booklet', 'training_handout'];

// نگهداری فایل آپلودشده با همان الگوی شواهد فعالیت/پیوست سند (فشرده‌سازی تصویر، PDF خام)
async function storeUploadedFile(file) {
  const isImage = file.mimetype.startsWith('image/');
  const filename = `${uuid()}.${isImage ? 'webp' : 'pdf'}`;
  const filePath = path.join(config.upload.dir, filename);
  if (isImage) await compressImage(file.buffer, filePath);
  else fs.writeFileSync(filePath, file.buffer);
  return { filename, size: fs.statSync(filePath).size };
}

// نام فایل ذخیره‌شده همیشه uuid است؛ basename برای اطمینان از عدم path traversal
function sendStoredFile(res, storedName, originalName) {
  const safe = path.basename(String(storedName));
  const abs = path.join(config.upload.dir, safe);
  if (!fs.existsSync(abs)) return res.status(404).json({ error: 'فایل روی سرور موجود نیست' });
  res.download(abs, originalName || safe);
}

function libSectionId(v) {
  if (!v) return null;
  return query('SELECT id FROM accreditation_sections WHERE id = ?', [v]).rows[0] ? String(v) : null;
}

router.get('/library', authRequired, requireAnyPermission('view_library', 'manage_library'), hospitalScope, (req, res) => {
  try {
    const where = ['l.hospital_id = ?'];
    const params = [req.hospitalId];
    if (req.query.category && LIB_CATEGORIES.includes(req.query.category)) { where.push('l.category = ?'); params.push(req.query.category); }
    if (req.query.q) { where.push('(l.title LIKE ? OR IFNULL(l.description, \'\') LIKE ?)'); params.push('%' + req.query.q + '%', '%' + req.query.q + '%'); }
    if (req.query.section_id) { where.push('l.section_id = ?'); params.push(req.query.section_id); }
    const rows = query(`SELECT l.*, u.full_name as uploaded_by_name, sec.title as section_title, sec.code as section_code
      FROM digital_library_items l LEFT JOIN users u ON l.uploaded_by = u.id
      LEFT JOIN accreditation_sections sec ON l.section_id = sec.id
      WHERE ${where.join(' AND ')} ORDER BY l.created_at DESC`, params).rows;
    res.json({ items: rows });
  } catch (err) { console.error('[Library]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/library', authRequired, requirePermission('manage_library'), hospitalScope, async (req, res) => {
  const title = String(req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'عنوان الزامی است' });
  const category = LIB_CATEGORIES.includes(req.body.category) ? req.body.category : 'regulation';
  try {
    const id = uuid();
    query(`INSERT INTO digital_library_items (id, hospital_id, category, title, description, section_id, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.hospitalId, category, title, req.body.description || null, libSectionId(req.body.section_id), req.user.id]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'library_item_created', targetTable: 'digital_library_items', targetId: id, ipAddress: req.ip });
    res.json({ item: { id } });
  } catch (err) { console.error('[Library]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.put('/library/:id', authRequired, requirePermission('manage_library'), hospitalScope, (req, res) => {
  try {
    const row = query('SELECT id FROM digital_library_items WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'مورد یافت نشد' });
    const title = String(req.body.title || '').trim();
    if (!title) return res.status(400).json({ error: 'عنوان الزامی است' });
    const category = LIB_CATEGORIES.includes(req.body.category) ? req.body.category : 'regulation';
    query(`UPDATE digital_library_items SET category = ?, title = ?, description = ?, section_id = ?,
      updated_at = datetime('now') WHERE id = ? AND hospital_id = ?`,
      [category, title, req.body.description || null, libSectionId(req.body.section_id), row.id, req.hospitalId]);
    res.json({ status: 'updated' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.delete('/library/:id', authRequired, requirePermission('manage_library'), hospitalScope, async (req, res) => {
  try {
    const row = query('SELECT * FROM digital_library_items WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'مورد یافت نشد' });
    query('DELETE FROM digital_library_items WHERE id = ?', [row.id]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'library_item_deleted', targetTable: 'digital_library_items', targetId: row.id, ipAddress: req.ip });
    res.json({ status: 'deleted' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/library/:id/file', authRequired, requirePermission('manage_library'), hospitalScope, uploadSingle('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'فایلی ارسال نشده' });
  try {
    const row = query('SELECT id FROM digital_library_items WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'مورد یافت نشد' });
    const saved = await storeUploadedFile(req.file);
    query('UPDATE digital_library_items SET file_path = ?, file_name = ?, file_size_bytes = ? WHERE id = ? AND hospital_id = ?',
      [saved.filename, req.file.originalname, saved.size, row.id, req.hospitalId]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'library_file_uploaded', targetTable: 'digital_library_items', targetId: row.id, ipAddress: req.ip });
    res.json({ file: { filename: saved.filename, original_name: req.file.originalname, size: saved.size } });
  } catch (err) {
    if (err.isUploadValidation) return res.status(400).json({ error: err.message });
    console.error('[Library upload]', err);
    res.status(500).json({ error: 'خطای سرور در آپلود' });
  }
});

router.get('/library/:id/file', authRequired, requireAnyPermission('view_library', 'manage_library'), hospitalScope, (req, res) => {
  try {
    const row = query('SELECT file_path, file_name FROM digital_library_items WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!row || !row.file_path) return res.status(404).json({ error: 'فایلی یافت نشد' });
    sendStoredFile(res, row.file_path, row.file_name);
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

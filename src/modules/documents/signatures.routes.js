/**
 * Digital Signatures Routes
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

// ===== امضای الکترونیکی =====
// نمونه‌ی تصویری امضا. دو کاربرد: (۱) امضای اختصاصی یک کاربر، (۲) «نمونه‌ی فعال بیمارستان»
// برای کاربرانی که امضای شخصی ندارند. در لحظه‌ی «امضای من» تصویر روی همان ردیف
// document_signoffs اسنپ‌شات می‌شود تا حذف بعدیِ نمونه، امضای ثبت‌شده را از بین نبرد.
// فایل‌ها زیر public سرو نمی‌شوند (مثل بقیه‌ی آپلودها) تا بین بیمارستان‌ها نشت نکنند.

// لوگوی بیمارستانِ خودِ کاربر (سایدبار و سربرگ چاپ). ۴۰۴ حالت عادی است — بیمارستان ممکن است
// لوگو نداشته باشد؛ سمت کلاینت تصویر بی‌سروصدا حذف می‌شود.
router.get('/hospital/logo', authRequired, hospitalScope, (req, res) => {
  try {
    const h = query('SELECT logo_url FROM hospitals WHERE id = ?', [req.hospitalId]).rows[0];
    if (!h || !h.logo_url) return res.status(404).json({ error: 'لوگو ثبت نشده' });
    const abs = path.join(config.upload.dir, path.basename(h.logo_url));
    if (!fs.existsSync(abs)) return res.status(404).json({ error: 'فایل روی سرور موجود نیست' });
    res.type('image/webp');
    res.sendFile(abs);
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.get('/signatures', authRequired, hospitalScope, (req, res) => {
  try {
    const rows = query(`SELECT s.id, s.user_id, s.label, s.file_name, s.is_active, s.created_at, u.full_name AS user_name
      FROM electronic_signatures s LEFT JOIN users u ON u.id = s.user_id
      WHERE s.hospital_id = ? ORDER BY s.is_active DESC, s.created_at DESC`, [req.hospitalId]).rows;
    res.json({ signatures: rows });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// نمایش درون‌خطی تصویر امضا — نام فایل باید متعلق به همین بیمارستان باشد (نمونه یا اسنپ‌شات روی سند)
router.get('/signatures/image/:filename', authRequired, hospitalScope, (req, res) => {
  try {
    const safe = path.basename(String(req.params.filename));
    const owned = query('SELECT 1 AS ok FROM electronic_signatures WHERE hospital_id = ? AND file_name = ?', [req.hospitalId, safe]).rows[0]
      || query('SELECT 1 AS ok FROM document_signoffs WHERE hospital_id = ? AND signature_image = ?', [req.hospitalId, safe]).rows[0];
    if (!owned) return res.status(404).json({ error: 'تصویر یافت نشد' });
    const abs = path.join(config.upload.dir, safe);
    if (!fs.existsSync(abs)) return res.status(404).json({ error: 'فایل روی سرور موجود نیست' });
    res.type(path.extname(safe) === '.webp' ? 'image/webp' : 'application/octet-stream');
    res.sendFile(abs);
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/signatures', authRequired, requirePermission('manage_hospital_settings'), hospitalScope, uploadSingle('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'فایل تصویر امضا ارسال نشده' });
  if (!req.file.mimetype.startsWith('image/')) return res.status(400).json({ error: 'فقط تصویر مجاز است (JPG/PNG/WEBP)' });
  try {
    // کاربر انتخابی باید عضو همین بیمارستان باشد؛ در غیر این صورت امضا «نمونه‌ی بیمارستان» می‌شود
    let userId = req.body.user_id || null;
    if (userId && !query('SELECT id FROM users WHERE id = ? AND hospital_id = ?', [userId, req.hospitalId]).rows[0]) userId = null;
    const { filename } = await storeUploadedFile(req.file);
    const id = uuid();
    query(`INSERT INTO electronic_signatures (id, hospital_id, user_id, label, file_name, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [id, req.hospitalId, userId, String(req.body.label || '').trim().slice(0, 80) || null, filename, req.user.id]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'signature_uploaded', targetTable: 'electronic_signatures', targetId: id, ipAddress: req.ip });
    res.json({ signature: { id, file_name: filename } });
  } catch (err) {
    if (err.isUploadValidation) return res.status(400).json({ error: err.message });
    console.error('[Signature upload]', err.message);
    res.status(500).json({ error: 'خطای سرور در آپلود' });
  }
});

// فقط یک «نمونه‌ی فعال بیمارستان» در هر لحظه
router.post('/signatures/:id/active', authRequired, requirePermission('manage_hospital_settings'), hospitalScope, (req, res) => {
  try {
    const row = query('SELECT id FROM electronic_signatures WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'امضا یافت نشد' });
    query('UPDATE electronic_signatures SET is_active = 0 WHERE hospital_id = ?', [req.hospitalId]);
    query('UPDATE electronic_signatures SET is_active = 1 WHERE id = ?', [row.id]);
    res.json({ status: 'activated' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.delete('/signatures/:id', authRequired, requirePermission('manage_hospital_settings'), hospitalScope, (req, res) => {
  try {
    const row = query('SELECT id, file_name FROM electronic_signatures WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'امضا یافت نشد' });
    query('DELETE FROM electronic_signatures WHERE id = ?', [row.id]);
    // فایل فقط وقتی حذف می‌شود که هیچ ردیف امضای ثبت‌شده‌ای به آن ارجاع ندهد
    const used = query('SELECT 1 AS ok FROM document_signoffs WHERE signature_image = ?', [row.file_name]).rows[0];
    if (!used) { try { fs.unlinkSync(path.join(config.upload.dir, path.basename(row.file_name))); } catch (e) { /* فایل از قبل نبوده */ } }
    res.json({ status: 'deleted' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// تصویر امضایی که هنگام «امضای من» باید استفاده شود: اول امضای اختصاصی کاربر، وگرنه نمونه‌ی فعال بیمارستان
function signatureImageFor(userId, hospitalId) {
  const mine = query(`SELECT file_name FROM electronic_signatures WHERE hospital_id = ? AND user_id = ?
    ORDER BY is_active DESC, created_at DESC LIMIT 1`, [hospitalId, userId]).rows[0];
  if (mine) return mine.file_name;
  const active = query(`SELECT file_name FROM electronic_signatures WHERE hospital_id = ? AND user_id IS NULL AND is_active = 1
    LIMIT 1`, [hospitalId]).rows[0];
  return active ? active.file_name : null;
}


module.exports = router;

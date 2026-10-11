/**
 * Core Evidence Upload & OCR Routes
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

router.post('/ocr/extract', authRequired, hospitalScope, uploadSingle('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'فایلی فرستاده نشد' });
  try {
    const s = assistantChat.getSettings(req.hospitalId);
    if (!s.api_key && s.provider !== 'custom') {
      return res.status(400).json({ error: 'کلید API تنظیم نشده — از پنل سوپرادمین تنظیم کنید' });
    }
    if (s.tokens_used_this_period >= s.monthly_token_budget) {
      return res.status(429).json({ error: 'سقف توکن ماهانه‌ی این بیمارستان پر شده است' });
    }
    const out = await extractText({
      provider: s.provider, apiKey: s.api_key, model: s.model, baseUrl: s.base_url,
      buffer: req.file.buffer, mimeType: req.file.mimetype,
    });
    if (out.tokens) {
      query(`UPDATE assistant_hospital_settings
             SET tokens_used_this_period = tokens_used_this_period + ?
             WHERE hospital_id = ?`, [out.tokens, req.hospitalId]);
    }
    if (!out.text) return res.status(422).json({ error: 'متنی در این فایل پیدا نشد' });
    res.json({ text: out.text, tokens: out.tokens, model: out.model });
  } catch (err) {
    console.error('[API] ocr/extract error:', err.message);
    res.status(400).json({ error: err.message || 'خطا در خواندن فایل' });
  }
});

// ---------- آپلود انبوه با تشخیصِ خودکار ----------
// کارفرما: انبوهِ خط‌مشی و فلوچارتِ PDF/عکس را یک‌جا بدهد و خودِ سامانه
// بفهمد کدام خط‌مشی است، کدام فرآیند، و فرم را از رویِ متن پر کند. این
// مسیر چیزی در دیتابیس نمی‌نویسد — فقط متن را می‌خواند و طبقه‌بندی
// می‌کند؛ ثبتِ نهایی از همان فرمِ سند/فرآیندِ موجود انجام می‌شود (بعد از
// اینکه کاربر پیشنهاد را دید و لازم بود ویرایش کرد) تا هیچ مسیرِ نوشتنِ
// تازه‌ای کنارِ مسیرهای همیشگی ساخته نشود.
router.post('/documents/bulk-extract', authRequired, requirePermission('manage_documents'), hospitalScope,
  uploadMultiple('files', 8), async (req, res) => {
  if (!req.files || !req.files.length) return res.status(400).json({ error: 'فایلی فرستاده نشد' });
  try {
    const s = assistantChat.getSettings(req.hospitalId);
    if (!s.api_key && s.provider !== 'custom') {
      return res.status(400).json({ error: 'کلید API تنظیم نشده — از پنل سوپرادمین تنظیم کنید' });
    }
    const results = [];
    for (const file of req.files) {
      // سقفِ توکن هر فایل جدا چک می‌شود — اگر وسطِ دسته پر شد، فایل‌های
      // باقی‌مانده «سقف پر شد» می‌گیرند نه اینکه کل درخواست قطع شود؛
      // کاربر همان‌جا می‌فهمد کدام فایل‌ها پردازش نشدند.
      const fresh = assistantChat.getSettings(req.hospitalId);
      if (fresh.tokens_used_this_period >= fresh.monthly_token_budget) {
        results.push({ filename: file.originalname, error: 'سقف توکن ماهانه‌ی این بیمارستان پر شده است' });
        continue;
      }
      try {
        const extracted = await extractText({
          provider: s.provider, apiKey: s.api_key, model: s.model, baseUrl: s.base_url,
          buffer: file.buffer, mimeType: file.mimetype,
        });
        let tokensSpent = extracted.tokens || 0;
        if (!extracted.text) {
          results.push({ filename: file.originalname, error: 'متنی در این فایل پیدا نشد' });
        } else {
          const { suggestion, tokens: classifyTokens } = await classifyDocument({
            provider: s.provider, apiKey: s.api_key, model: s.model, baseUrl: s.base_url,
            text: extracted.text,
          });
          tokensSpent += classifyTokens || 0;
          results.push({ filename: file.originalname, text: extracted.text, suggestion,
            pageCount: extracted.pageCount, scannedPages: extracted.scannedPages });
        }
        if (tokensSpent) {
          query(`UPDATE assistant_hospital_settings
                 SET tokens_used_this_period = tokens_used_this_period + ?
                 WHERE hospital_id = ?`, [tokensSpent, req.hospitalId]);
        }
      } catch (err) {
        results.push({ filename: file.originalname, error: err.message || 'خطا در پردازش فایل' });
      }
    }
    res.json({ results });
  } catch (err) {
    console.error('[API] documents/bulk-extract error:', err.message);
    res.status(400).json({ error: err.message || 'خطا در پردازش فایل‌ها' });
  }
});

// ---------- تشخیصِ فلوچارت از رویِ فایلِ فرآیند ----------
// کارفرما فایلِ PDFِ یک فرآیندِ تک‌صفحه‌ای را آپلود می‌کرد و انتظار داشت خودِ
// فلوچارت پر شود، ولی چنین مسیری وجود نداشت: آپلودِ فرآیند فقط «ضمیمه» بود و
// مسیرِ هوش مصنوعیِ موجود (bulk-extract) فیلدهای متنیِ سند را برمی‌گرداند و
// هیچ‌وقت گام و یال نمی‌داد. این مسیر همان کارِ گم‌شده را می‌کند.
//
// عمداً چیزی در دیتابیس نمی‌نویسد: پیشنهاد به فرمِ ویرایشِ فرآیند برمی‌گردد تا
// کاربر ببیند و اصلاح کند، بعد با همان دکمه‌ی ذخیره‌ی همیشگی ثبت شود — مدل
// ممکن است گامی را جا بیندازد و فلوچارتِ نیم‌بند نباید بی‌تأیید در پرونده بنشیند.
router.post('/processes/extract-flowchart', authRequired, requirePermission('manage_processes'),
  hospitalScope, uploadSingle('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'فایلی فرستاده نشد' });
  try {
    const s = assistantChat.getSettings(req.hospitalId);
    if (!s.api_key && s.provider !== 'custom') {
      return res.status(400).json({ error: 'کلید API تنظیم نشده — از پنل سوپرادمین تنظیم کنید' });
    }
    if (s.tokens_used_this_period >= s.monthly_token_budget) {
      return res.status(429).json({ error: 'سقف توکن ماهانه‌ی این بیمارستان پر شده است' });
    }
    const extracted = await extractText({
      provider: s.provider, apiKey: s.api_key, model: s.model, baseUrl: s.base_url,
      buffer: req.file.buffer, mimeType: req.file.mimetype,
    });
    let spent = extracted.tokens || 0;
    if (!extracted.text || extracted.text.trim().length < 20) {
      if (spent) query(`UPDATE assistant_hospital_settings SET tokens_used_this_period = tokens_used_this_period + ?
        WHERE hospital_id = ?`, [spent, req.hospitalId]);
      return res.status(422).json({ error: 'متنی در این فایل پیدا نشد — اگر فایل اسکن‌شده است، کیفیت تصویر را بالا ببرید' });
    }
    const { flow, tokens: flowTokens, model } = await extractFlowchart({
      provider: s.provider, apiKey: s.api_key, model: s.model, baseUrl: s.base_url, text: extracted.text,
    });
    spent += flowTokens || 0;
    if (spent) {
      query(`UPDATE assistant_hospital_settings SET tokens_used_this_period = tokens_used_this_period + ?
        WHERE hospital_id = ?`, [spent, req.hospitalId]);
    }
    if (!flow.steps.length) {
      return res.status(422).json({
        error: flow.parseError
          ? 'پاسخ مدل قابل خواندن نبود — یک‌بار دیگر تلاش کنید یا مدل دیگری در تنظیمات انتخاب کنید'
          : 'در این فایل گام‌های یک فرآیند تشخیص داده نشد. اگر فایل فقط تصویرِ نمودار است بدون متنِ خوانا، متنِ گام‌ها را دستی وارد کنید.',
        text: extracted.text.slice(0, 4000),
      });
    }
    res.json({ flow, text: extracted.text, tokens: spent, model,
      pageCount: extracted.pageCount, scannedPages: extracted.scannedPages });
  } catch (err) {
    console.error('[API] processes/extract-flowchart error:', err.message);
    res.status(400).json({ error: err.message || 'خطا در خواندن فایل' });
  }
});

router.post('/activities/records/:id/evidence', authRequired, hospitalScope, uploadSingle('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'فایلی ارسال نشده' });
  try {
    // تأیید مالکیت رکورد فعالیت در همین بیمارستان (جلوگیری از دسترسی متقاطع)
    const record = query('SELECT id FROM activity_records WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]);
    if (record.rows.length === 0) return res.status(404).json({ error: 'رکورد فعالیت یافت نشد' });

    const id = uuid();
    const isImage = req.file.mimetype.startsWith('image/');
    const ext = isImage ? 'webp' : 'pdf';
    const filename = `${id}.${ext}`;
    const filePath = path.join(config.upload.dir, filename);

    if (isImage) {
      // فشرده‌سازی خودکار سمت سرور طبق الزام بخش ۵.۵ PROJECT_SPEC.md - حداکثر عرض ۱۶۰۰px، کیفیت ۸۰٪ webp
      await compressImage(req.file.buffer, filePath);
    } else {
      fs.writeFileSync(filePath, req.file.buffer);
    }

    const fileSize = fs.statSync(filePath).size;
    query(`INSERT INTO activity_evidence_files (id, activity_record_id, file_path, file_type, original_filename, file_size_bytes, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.params.id, filename, isImage ? 'image' : 'pdf', req.file.originalname, fileSize, req.user.id]);

    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'file_uploaded', targetTable: 'activity_evidence_files', targetId: id, ipAddress: req.ip });

    res.json({ file: { id, filename, size: fileSize } });
  } catch (err) {
    // خطای ورودی کاربر (نوع/محتوای فایل) با استک کامل در لاگ سرور ثبت نمی‌شود
    if (err.isUploadValidation) return res.status(400).json({ error: err.message });
    console.error('[Evidence Upload]', err);
    res.status(500).json({ error: 'خطای سرور در آپلود' });
  }
});


module.exports = router;

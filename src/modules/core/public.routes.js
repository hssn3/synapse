/**
 * Core Public Survey & Complaints Routes
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

// ===== Public endpoints (no auth) =====
// همهٔ مسیرهای /api/public/ فقط «نوشتن» هستند و هیچ دادهٔ بیمارستان دیگری برنمی‌گردانند،
// و در src/middleware/security.js محدودکنندهٔ نرخ سخت‌گیرانه‌تری دارند.

// تنها استثنای «فقط نوشتن»: نام بیمارستان برای نمایش سرصفحه‌ی صفحات عمومی.
// عمداً فقط id و نام برمی‌گردد (نه فهرست بیمارستان‌ها، نه هیچ داده‌ی دیگری) و مثل
// بقیه‌ی /api/public/ زیر همان محدودکننده‌ی نرخ است.
router.get('/public/hospital/:id', (req, res) => {
  try {
    const h = query('SELECT id, name, logo_url FROM hospitals WHERE id = ? AND is_active = 1', [req.params.id]).rows[0];
    if (!h) return res.status(404).json({ error: 'بیمارستان یافت نشد' });
    res.json({ hospital: { id: h.id, name: h.name, has_logo: !!h.logo_url } });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// فهرست بیمارستان‌های فعال — برای صفحه‌ی «انتخاب مرکز» پیش از ورود. عمداً فقط شناسه/نام/
// وجودِ لوگو برمی‌گردد (نه شمار کاربران، نه وضعیت اشتراک، نه هیچ داده‌ی درون‌سازمانی).
// این همان چیزی است که کاربر برای یافتن مرکز خودش لازم دارد و بدون آن ورود چندمستأجری ممکن نیست.
router.get('/public/hospitals', (req, res) => {
  try {
    const rows = query('SELECT id, name, logo_url FROM hospitals WHERE is_active = 1 ORDER BY name').rows;
    res.json({ hospitals: rows.map(h => ({ id: h.id, name: h.name, has_logo: !!h.logo_url })) });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// لوگوی بیمارستان روی صفحات بدون ورود (انتخاب مرکز، صفحه‌ی ورودِ همان مرکز، فرم‌های همگانی).
// ۴۰۴ حالت عادی است — بیمارستان ممکن است لوگو نداشته باشد و کلاینت تصویر را بی‌سروصدا حذف می‌کند.
router.get('/public/hospital/:id/logo', (req, res) => {
  try {
    const h = query('SELECT logo_url FROM hospitals WHERE id = ? AND is_active = 1', [req.params.id]).rows[0];
    if (!h || !h.logo_url) return res.status(404).json({ error: 'لوگو ثبت نشده' });
    const abs = path.join(config.upload.dir, path.basename(h.logo_url));
    if (!fs.existsSync(abs)) return res.status(404).json({ error: 'فایل روی سرور موجود نیست' });
    res.type('image/webp');
    res.sendFile(abs);
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// درگاه عمومی FMEA — بدون ورود، فقط ثبت
router.post('/public/fmea', (req, res) => {
  const b = req.body || {};
  if (!b.hospital_id) return res.status(400).json({ error: 'بیمارستان الزامی است' });
  const p = fmeaBody(b);
  if (p.error) return res.status(400).json({ error: p.error });
  try {
    const h = query('SELECT id FROM hospitals WHERE id = ?', [b.hospital_id]).rows[0];
    if (!h) return res.status(400).json({ error: 'بیمارستان نامعتبر است' });
    const id = fmeaInsert(p.value, h.id, null, 'public');
    res.json({ id, message: 'فرم FMEA ثبت شد' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/public/complaint', (req, res) => {
  const { content, type, is_anonymous, submitter_contact, hospital_id } = req.body;
  if (!content || !type || !hospital_id) return res.status(400).json({ error: 'محتوا، نوع و بیمارستان الزامی است' });
  try {
    // بدون این بررسی، شناسه‌ی جعلی به خطای ۵۰۰ کلید خارجی می‌انجامید (مثل مسیر FMEA بررسی می‌شود)
    if (!query('SELECT id FROM hospitals WHERE id = ?', [hospital_id]).rows[0])
      return res.status(400).json({ error: 'بیمارستان نامعتبر است' });
    const id = uuid();
    query('INSERT INTO patient_complaints_suggestions (id, hospital_id, type, content, is_anonymous, submitter_contact, source) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, hospital_id, type, content, is_anonymous !== false ? 1 : 0, submitter_contact || null, 'public']);
    res.json({ id, message: 'ثبت شد' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/public/medical-error', (req, res) => {
  const b = req.body || {};
  if (!b.hospital_id) return res.status(400).json({ error: 'توضیحات و بیمارستان الزامی است' });
  const bad = merValidate(b);
  if (bad) return res.status(400).json({ error: bad });
  try {
    // بدون این بررسی، شناسه‌ی جعلی به خطای ۵۰۰ کلید خارجی می‌انجامید (مثل مسیر FMEA بررسی می‌شود)
    if (!query('SELECT id FROM hospitals WHERE id = ?', [b.hospital_id]).rows[0])
      return res.status(400).json({ error: 'بیمارستان نامعتبر است' });
    const out = merInsert(b, b.hospital_id, null, 'public');
    res.json({ id: out.id, tracking_code: out.tracking_code, message: 'گزارش ثبت شد' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// نظرسنجی رضایت بیمار — پرسشنامه‌ی رسمی ۱۰ بخشی، بدون ورود.
// scores = { admission: [5,4], medical: [...], ... } — هر مقدار عددی ۱ تا ۵.
// overall_score میانگین همه‌ی پاسخ‌های داده‌شده است (۱ رقم اعشار)؛ سوال‌های بی‌پاسخ در میانگین نمی‌آیند.
const SAT_SECTIONS = ['admission', 'medical', 'nursing', 'nutrition', 'discharge', 'facilities'];
const SAT_GENDERS = ['زن', 'مرد'];
router.post('/public/satisfaction', (req, res) => {
  const b = req.body || {};
  if (!b.hospital_id) return res.status(400).json({ error: 'بیمارستان الزامی است' });
  const gender = matchFa(SAT_GENDERS, b.patient_gender);
  if (!gender) return res.status(400).json({ error: 'جنسیت بیمار الزامی است' });

  const scores = {};
  let total = 0, answered = 0;
  if (b.scores && typeof b.scores === 'object' && !Array.isArray(b.scores)) {
    for (const key of SAT_SECTIONS) {
      const arr = b.scores[key];
      if (!Array.isArray(arr)) continue;
      const clean = [];
      for (const v of arr) {
        if (v === null || v === undefined || v === '') { clean.push(null); continue; }
        const n = parseInt(v, 10);
        if (isNaN(n) || n < 1 || n > 5) return res.status(400).json({ error: 'امتیازها باید بین ۱ تا ۵ باشد' });
        clean.push(n); total += n; answered++;
      }
      if (clean.length) scores[key] = clean;
    }
  }
  if (!answered) return res.status(400).json({ error: 'حداقل به یکی از سوالات امتیازدهی پاسخ دهید' });
  const overall = Math.round((total / answered) * 10) / 10;

  try {
    // مثل بقیه‌ی مسیرهای عمومی: شناسه‌ی جعلی باید ۴۰۰ بدهد نه ۵۰۰ کلید خارجی
    if (!query('SELECT id FROM hospitals WHERE id = ? AND is_active = 1', [b.hospital_id]).rows[0])
      return res.status(400).json({ error: 'بیمارستان نامعتبر است' });
    const id = uuid();
    const trim = (v, max) => (v === undefined || v === null || v === '' ? null : String(v).trim().slice(0, max));
    query(`INSERT INTO public_satisfaction_surveys
      (id, hospital_id, respondent_type, patient_gender, would_return, scores, overall_score, comment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, b.hospital_id, matchFa(['بستری', 'همراه'], b.respondent_type), gender,
       matchFa(['بله', 'خیر'], b.would_return), JSON.stringify(scores), overall, trim(b.comment, 2000)]);
    res.json({ id, overall_score: overall, message: 'نظرسنجی شما ثبت شد' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// نتایج نظرسنجی رضایت بیمار برای مدیر بهبود کیفیت — جدول + میانگین هر محور در بازه‌ی تاریخی انتخابی
router.get('/satisfaction/results', authRequired, requireAnyPermission('view_all_dashboards'), hospitalScope, (req, res) => {
  try {
    const params = [req.hospitalId];
    let sql = 'SELECT * FROM public_satisfaction_surveys WHERE hospital_id = ?';
    if (req.query.from) { sql += ' AND date(created_at) >= date(?)'; params.push(req.query.from); }
    if (req.query.to) { sql += ' AND date(created_at) <= date(?)'; params.push(req.query.to); }
    sql += ' ORDER BY created_at DESC';
    const rows = query(sql, params).rows;

    // میانگین هر محور و هر سوال داخل محور — از JSON ستون scores بازسازی می‌شود، مقدار فرضی تولید نمی‌شود
    const sectionSums = {}; // key -> { sums:[..], counts:[..] }
    let overallSum = 0, overallCount = 0;
    let returnYes = 0, returnNo = 0;
    rows.forEach(r => {
      let sc = {};
      try { sc = JSON.parse(r.scores || '{}'); } catch (e) { sc = {}; }
      for (const key of SAT_SECTIONS) {
        const arr = sc[key];
        if (!Array.isArray(arr)) continue;
        if (!sectionSums[key]) sectionSums[key] = { sums: [], counts: [] };
        arr.forEach((v, i) => {
          if (v === null || v === undefined) return;
          sectionSums[key].sums[i] = (sectionSums[key].sums[i] || 0) + v;
          sectionSums[key].counts[i] = (sectionSums[key].counts[i] || 0) + 1;
          overallSum += v; overallCount++;
        });
      }
      if (r.would_return === 'بله') returnYes++;
      else if (r.would_return === 'خیر') returnNo++;
    });
    const sectionAverages = {};
    for (const [key, { sums, counts }] of Object.entries(sectionSums)) {
      const questionAverages = sums.map((s, i) => counts[i] ? Math.round((s / counts[i]) * 10) / 10 : null);
      const validQ = questionAverages.filter(v => v !== null);
      sectionAverages[key] = {
        question_averages: questionAverages,
        section_average: validQ.length ? Math.round((validQ.reduce((a, b) => a + b, 0) / validQ.length) * 10) / 10 : null,
      };
    }

    res.json({
      surveys: rows,
      total: rows.length,
      overall_average: overallCount ? Math.round((overallSum / overallCount) * 10) / 10 : null,
      section_averages: sectionAverages,
      would_return: { yes: returnYes, no: returnNo },
      sections: SAT_SECTIONS,
    });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

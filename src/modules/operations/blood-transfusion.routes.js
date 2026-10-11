/**
 * Operations Blood Transfusion Routes
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

// ===== طب انتقال خون و هموویژیلانس (محور ب-۹) — database/seed-blood-transfusion.js =====
const BT_PRODUCTS = ['خون کامل', 'گلبول قرمز متراکم', 'پلاسمای تازه منجمد', 'پلاکت', 'کرایوپرسیپیتیت'];

const BT_RESOURCES = {
  units: {
    table: 'blood_storage_units', fa: 'محل نگهداری فرآورده',
    fields: ['title', 'unit_type', 'location', 'min_temp', 'max_temp', 'has_alarm', 'has_agitator',
      'on_emergency_power', 'thermometer_type', 'serial_no', 'responsible', 'is_active', 'note'],
    floats: ['min_temp', 'max_temp'],
    bools: ['has_alarm', 'has_agitator', 'on_emergency_power', 'is_active'],
    defaults: { is_active: 1 },
    order: 'title',
    enums: { unit_type: ['یخچال بانک خون', 'فریزر پلاسما/کرایو', 'شیکر-انکوباتور پلاکت', 'یخچال بخش/اتاق عمل'] },
    // ب-۹-۱-۲ برای پلاکت «تکان آرام با روتاتور» را جزء الزام آورده، پس شیکری که
    // آژیتاتور ندارد یعنی پلاکت در شرایط غیرمجاز نگهداری می‌شود.
    validate: (r) => {
      if (!r.title) return 'عنوان محل نگهداری الزامی است';
      if (r.min_temp === null || r.max_temp === null) return 'حد پایین و بالای دمای مجاز الزامی است';
      if (r.min_temp >= r.max_temp) return 'حد پایین دما باید کمتر از حد بالا باشد';
      if (r.unit_type === 'شیکر-انکوباتور پلاکت' && !r.has_agitator)
        return 'نگهداری پلاکت بدون آژیتاتور/روتاتور مجاز نیست (ب-۹-۱-۲)';
      return null;
    },
  },
  receipts: {
    table: 'blood_receipts', fa: 'تحویل فرآورده',
    fields: ['receipt_date', 'product_type', 'unit_count', 'courier_name', 'courier_cert_no',
      'courier_cert_expiry', 'dedicated_vehicle', 'box_has_datalogger', 'arrival_temp', 'temp_ok',
      'accepted', 'reject_reason', 'received_by', 'note'],
    ints: ['unit_count'], floats: ['arrival_temp'],
    bools: ['dedicated_vehicle', 'box_has_datalogger', 'temp_ok', 'accepted'],
    defaults: { dedicated_vehicle: 1, box_has_datalogger: 1, accepted: 1 },
    order: 'receipt_date DESC',
    enums: { product_type: BT_PRODUCTS },
    // ب-۹-۱-۱ سه چیز را هم‌زمان الزام کرده و هر سه در همین یک فرم سنجیده می‌شود:
    // گواهیِ *معتبر* حامل، محفظه‌ی ثبت‌کننده‌ی دما، و ثبتِ دما هنگام تحویل.
    // «معتبر» یعنی تاریخ‌دار و منقضی‌نشده — وگرنه شماره‌ی گواهی به‌تنهایی چیزی
    // را اثبات نمی‌کند.
    validate: (r) => {
      if (!r.receipt_date) return 'تاریخ تحویل الزامی است';
      if (!(r.unit_count > 0)) return 'تعداد واحد باید بیشتر از صفر باشد';
      if (r.arrival_temp === null) return 'ثبت دمای فرآورده هنگام تحویل الزامی است (ب-۹-۱-۱)';
      if (r.courier_cert_no && !r.courier_cert_expiry)
        return 'تاریخ اعتبار گواهی حامل الزامی است؛ گواهی بدون تاریخ، «معتبر» شمرده نمی‌شود';
      if (r.courier_cert_expiry && r.courier_cert_expiry < r.receipt_date)
        return 'گواهی حامل در تاریخ تحویل منقضی بوده است';
      if (!r.accepted && !r.reject_reason) return 'برای محموله‌ی پذیرفته‌نشده، ثبت علت الزامی است';
      // دمای پذیرش را سرور قضاوت می‌کند، نه فرستنده: زنجیره‌ی سرد ۱ تا ۱۰ درجه.
      r.temp_ok = (r.arrival_temp >= 1 && r.arrival_temp <= 10) ? 1 : 0;
      if (!r.temp_ok && r.accepted && !r.note)
        return 'دمای تحویل خارج از زنجیره‌ی سرد است؛ پذیرشِ آن بدون توضیح ثبت نمی‌شود';
      return null;
    },
  },
  bags: {
    table: 'blood_bags', fa: 'کیسه‌ی خون',
    fields: ['bag_code', 'product_type', 'blood_group', 'rh', 'volume_ml', 'collected_date',
      'expiry_date', 'storage_unit_id', 'status', 'crossmatch_patient', 'crossmatch_ward',
      'crossmatch_by', 'crossmatch_result', 'issued_ward', 'issued_date', 'note'],
    ints: ['volume_ml'],
    order: 'expiry_date',
    enums: { product_type: BT_PRODUCTS, blood_group: ['O', 'A', 'B', 'AB'], rh: ['+', '-'],
      status: ['available', 'crossmatched', 'issued', 'transfused', 'returned', 'discarded'],
      // مقدار خالی عمداً اولین گزینه است: enum نامعتبر را به گزینه‌ی اول برمی‌گرداند،
      // و اگر «سازگار» اول می‌بود کیسه‌ی آزمایش‌نشده خودبه‌خود «سازگار» ثبت می‌شد.
      crossmatch_result: ['', 'سازگار', 'ناسازگار'] },
    uniqueHint: { msg: 'کیسه‌ای با این کد قبلاً ثبت شده است' },
    // ب-۹-۲-۲ برچسبِ کراسمچ را «حداقل شامل نام، بخش بستری، شناسه‌ی بیمار و نامِ
    // انجام‌دهنده‌ی آزمایش سازگاری» خواسته. کیسه‌ای که وضعیتش کراسمچ‌شده است ولی
    // این‌ها را ندارد، همان کیسه‌ای است که سرِ بالین قابل تشخیص نیست.
    validate: (r) => {
      if (!r.bag_code) return 'کد کیسه الزامی است';
      if (!r.expiry_date) return 'تاریخ انقضا الزامی است (مبنای چیدمان و کنترل روزانه)';
      if (r.collected_date && r.expiry_date < r.collected_date)
        return 'تاریخ انقضا نمی‌تواند پیش از تاریخ اهدا باشد';
      if (['crossmatched', 'issued', 'transfused'].includes(r.status)) {
        if (!r.crossmatch_patient) return 'برای کیسه‌ی کراسمچ‌شده، شناسه‌ی بیمار الزامی است (ب-۹-۲-۲)';
        if (!r.crossmatch_ward) return 'برای کیسه‌ی کراسمچ‌شده، بخش بستری الزامی است (ب-۹-۲-۲)';
        if (!r.crossmatch_by) return 'نام انجام‌دهنده‌ی آزمایش سازگاری الزامی است (ب-۹-۲-۲)';
        if (r.crossmatch_result === 'ناسازگار' && r.status !== 'crossmatched')
          return 'کیسه‌ی ناسازگار قابل تحویل یا تزریق نیست';
      }
      if (['issued', 'transfused'].includes(r.status) && !r.issued_ward)
        return 'بخش دریافت‌کننده الزامی است';
      return null;
    },
  },
  samples: {
    table: 'blood_sample_checks', fa: 'کنترل نمونه‌ی بانک خون',
    fields: ['check_date', 'ward', 'patient_ref', 'label_complete', 'identity_verified',
      'sampler_name', 'accepted', 'reject_reason', 'resampled', 'resample_date', 'checked_by', 'note'],
    bools: ['label_complete', 'identity_verified', 'accepted', 'resampled'],
    defaults: { label_complete: 1, identity_verified: 1, accepted: 1 },
    order: 'check_date DESC',
    // ب-۹-۲-۱: «در صورت عدم انطباق، اخذ نمونه‌ی مجدد». پس ردکردنِ نمونه پایانِ کار
    // نیست؛ تا نمونه‌ی مجدد ثبت نشود، بیمار بی‌آزمایش مانده است.
    validate: (r) => {
      if (!r.check_date) return 'تاریخ کنترل الزامی است';
      if (!r.ward) return 'بخش الزامی است';
      if (!r.accepted && !r.reject_reason) return 'برای نمونه‌ی ردشده، ثبت علت رد الزامی است';
      if (r.resampled && !r.resample_date) return 'تاریخ نمونه‌گیری مجدد الزامی است';
      // برچسبِ ناقص یا هویتِ تأییدنشده یعنی نمونه نباید پذیرفته شود.
      if (r.accepted && (!r.label_complete || !r.identity_verified))
        return 'نمونه با برچسب ناقص یا هویتِ تأییدنشده قابل پذیرش نیست (ب-۹-۲-۱)';
      return null;
    },
  },
  qc: {
    table: 'blood_qc_records', fa: 'کنترل کیفیت بانک خون',
    fields: ['kind', 'qc_date', 'item_name', 'lot_no', 'expiry_date', 'result',
      'interpretation', 'corrective_action', 'provider', 'performed_by', 'note'],
    order: 'qc_date DESC',
    enums: { kind: ['internal', 'external'], result: ['pass', 'fail'] },
    // ب-۹-۳-۲: کنترل کیفیِ داخلی «بر اساس هر سری ساخت» است، پس شماره‌ی سری برای
    // آن اجباری است؛ و نتیجه‌ی مردود بدون اقدام اصلاحی، همان چیزی است که ممیز
    // به‌عنوان نبودِ چرخه‌ی کیفیت ثبت می‌کند.
    validate: (r) => {
      if (!r.qc_date) return 'تاریخ کنترل کیفیت الزامی است';
      if (!r.item_name) return 'نام آنتی‌سرم/آزمایش الزامی است';
      if (r.kind === 'internal' && !r.lot_no)
        return 'شماره سری ساخت برای کنترل کیفی داخلی الزامی است (ب-۹-۳-۲)';
      if (r.kind === 'external' && !r.provider) return 'نام برگزارکننده‌ی ارزیابی خارجی الزامی است';
      if (r.result === 'fail' && !r.corrective_action)
        return 'برای نتیجه‌ی مردود، ثبت اقدام اصلاحی الزامی است';
      return null;
    },
  },
  events: {
    table: 'blood_adverse_events', fa: 'عارضه‌ی ناخواسته‌ی تزریق',
    fields: ['event_date', 'ward', 'product_type', 'bag_code', 'patient_ref', 'reaction_type',
      'severity', 'description', 'standard_form_done', 'reported_date', 'reported_within_48h',
      'rca_done', 'rca_summary', 'committee_ref', 'corrective_action', 'status'],
    bools: ['standard_form_done', 'reported_within_48h', 'rca_done'],
    order: 'event_date DESC',
    enums: { product_type: BT_PRODUCTS,
      reaction_type: ['تب غیرهمولیتیک', 'آلرژیک', 'همولیتیک حاد', 'همولیتیک تأخیری',
        'TRALI (آسیب حاد ریه)', 'TACO (اضافه‌بار گردش خون)', 'عفونی/باکتریال', 'سایر'],
      severity: ['خفیف', 'متوسط', 'شدید', 'تهدیدکننده‌ی حیات'],
      status: ['open', 'reported', 'closed'] },
    // ب-۹-۴-۴ مهلت را عدد داده: «حداکثر ظرف ۴۸ ساعت». پس این را سرور از دو تاریخ
    // حساب می‌کند نه از تیکِ کاربر — وگرنه شاخصِ «در مهلت» قابلِ دست‌کاری بود.
    // ب-۹-۴-۱ هم تحلیل ریشه‌ای و طرح در کمیته را برای بستنِ پرونده لازم می‌داند.
    validate: (r) => {
      if (!r.event_date) return 'تاریخ عارضه الزامی است';
      if (!r.ward) return 'بخش الزامی است';
      if (!r.description) return 'شرح عارضه الزامی است';
      if (r.reported_date) {
        if (r.reported_date < r.event_date) return 'تاریخ گزارش نمی‌تواند پیش از تاریخ عارضه باشد';
        const days = Math.round((Date.parse(r.reported_date) - Date.parse(r.event_date)) / 86400000);
        r.reported_within_48h = days <= 2 ? 1 : 0;
      } else {
        r.reported_within_48h = 0;
      }
      if (r.status !== 'open' && !r.reported_date)
        return 'برای خروج از وضعیت «باز»، تاریخ گزارش به سازمان انتقال خون الزامی است (ب-۹-۴-۴)';
      if (r.status !== 'open' && !r.standard_form_done)
        return 'گزارش بدون تکمیل فرم استاندارد سازمان انتقال خون پذیرفته نیست (ب-۹-۴-۴)';
      if (r.status === 'closed' && (!r.rca_done || !r.rca_summary))
        return 'بستن پرونده بدون تحلیل ریشه‌ای ممکن نیست (ب-۹-۴-۱)';
      if (r.status === 'closed' && !r.committee_ref)
        return 'شماره‌ی صورت‌جلسه‌ی کمیته‌ی طب انتقال خون برای بستن پرونده الزامی است (ب-۹-۴-۱)';
      return null;
    },
  },
  returns: {
    table: 'blood_returns', fa: 'خون برگشتی',
    fields: ['return_date', 'ward', 'bag_code', 'product_type', 'unit_count', 'return_temp',
      'temp_acceptable', 'reusable', 'reason', 'corrective_action', 'reported_to_committee', 'note'],
    ints: ['unit_count'], floats: ['return_temp'],
    bools: ['temp_acceptable', 'reusable', 'reported_to_committee'],
    defaults: { unit_count: 1 },
    order: 'return_date DESC',
    enums: { product_type: BT_PRODUCTS,
      reason: ['عدم نیاز بیمار', 'ترخیص/فوت بیمار', 'لغو دستور پزشک', 'ناسازگاری', 'اشکال در فرآورده', 'سایر'] },
    // ب-۹-۴-۶: «ارزیابی دمای خون‌های برگشتی و اقدام اصلاحی در صورت لزوم». پس
    // قابلِ استفاده بودنِ کیسه از دما نتیجه می‌شود نه از نظر کاربر: بالای ۱۰ درجه
    // زنجیره‌ی سرد شکسته و کیسه دیگر قابل بازگشت به موجودی نیست.
    validate: (r) => {
      if (!r.return_date) return 'تاریخ برگشت الزامی است';
      if (!r.ward) return 'بخش برگشت‌دهنده الزامی است (مبنای پایش به تفکیک بخش)';
      if (r.return_temp === null) return 'ثبت دمای کیسه‌ی برگشتی الزامی است (ب-۹-۴-۶)';
      r.temp_acceptable = (r.return_temp >= 1 && r.return_temp <= 10) ? 1 : 0;
      if (!r.temp_acceptable) r.reusable = 0;
      if (!r.temp_acceptable && !r.corrective_action)
        return 'دمای برگشتی خارج از محدوده است؛ ثبت اقدام اصلاحی الزامی است (ب-۹-۴-۶)';
      return null;
    },
  },
};
mountCrud('blood', BT_RESOURCES, 'view_blood', 'manage_blood', 'BloodTransfusion');

// ثبت دمای محل نگهداری — مثل یخچال دارویی، عمداً بیرون از CRUD عمومی: «داخل/خارج
// محدوده» را باید سرور از روی دامنه‌ی همان دستگاه تعیین کند. اگر کاربر بتواند
// in_range را خودش بفرستد، انحرافِ دما با یک تیک پنهان می‌شود.
router.get('/blood-temp/:unitId', authRequired, requireAnyPermission('view_blood', 'manage_blood'), hospitalScope, (req, res) => {
  try {
    const u = query('SELECT * FROM blood_storage_units WHERE id = ? AND hospital_id = ?', [req.params.unitId, req.hospitalId]).rows[0];
    if (!u) return res.status(404).json({ error: 'محل نگهداری یافت نشد' });
    const logs = query(`SELECT * FROM blood_temp_logs WHERE unit_id = ? AND hospital_id = ?
      ORDER BY log_date DESC, slot LIMIT 200`, [u.id, req.hospitalId]).rows;
    res.json({ unit: u, logs, out_of_range: logs.filter(l => !l.in_range).length });
  } catch (err) { console.error('[BloodTransfusion]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/blood-temp/:unitId', authRequired, requirePermission('manage_blood'), hospitalScope, (req, res) => {
  try {
    const u = query('SELECT * FROM blood_storage_units WHERE id = ? AND hospital_id = ?', [req.params.unitId, req.hospitalId]).rows[0];
    if (!u) return res.status(404).json({ error: 'محل نگهداری یافت نشد' });
    const date = String(req.body.log_date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'تاریخ ثبت الزامی است' });
    const t = parseFloat(req.body.temperature);
    if (!Number.isFinite(t)) return res.status(400).json({ error: 'دما الزامی است' });
    const slot = ['صبح', 'عصر', 'شب'].includes(req.body.slot) ? req.body.slot : 'صبح';
    const inRange = (t >= u.min_temp && t <= u.max_temp) ? 1 : 0;
    const action = String(req.body.action_taken || '').trim();
    if (!inRange && !action) return res.status(400).json({ error: 'دما خارج از محدوده مجاز است؛ ثبت اقدام انجام‌شده الزامی است' });
    const id = uuid();
    query(`INSERT INTO blood_temp_logs (id, hospital_id, unit_id, log_date, slot, temperature, in_range, alarm_tested, action_taken, recorded_by, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.hospitalId, u.id, date, slot, t, inRange, truthy(req.body.alarm_tested) ? 1 : 0,
        action || null, req.body.recorded_by || null, req.user.id]);
    res.json({ log: { id }, in_range: !!inRange });
  } catch (err) {
    if (/UNIQUE constraint/.test(String(err.message || '')))
      return res.status(400).json({ error: 'برای این محل نگهداری، این تاریخ و نوبت قبلاً ثبت شده است' });
    console.error('[BloodTransfusion]', err); res.status(500).json({ error: 'خطای سرور' });
  }
});

// داشبورد: همان چیزهایی که ممیزِ محور ب-۹ اول از همه سراغشان می‌رود
router.get('/blood-dashboard', authRequired, requireAnyPermission('view_blood', 'manage_blood'), hospitalScope, (req, res) => {
  try {
    const one = (sql) => (query(sql, [req.hospitalId]).rows[0] || {}).c || 0;
    // نرخِ گزارشِ در مهلتِ ۴۸ ساعت: کسر، نه میانگینِ نظرها. مخرج فقط عارضه‌هایی
    // است که واقعاً رخ داده‌اند، پس مرکزی که عارضه‌ای نداشته «صفر درصد» نمی‌گیرد.
    const ae = query(`SELECT COUNT(*) n, SUM(reported_within_48h) ok FROM blood_adverse_events
      WHERE hospital_id = ?`, [req.hospitalId]).rows[0] || {};
    res.json({
      units: one('SELECT COUNT(*) c FROM blood_storage_units WHERE hospital_id = ? AND is_active = 1'),
      units_no_alarm: one('SELECT COUNT(*) c FROM blood_storage_units WHERE hospital_id = ? AND is_active = 1 AND has_alarm = 0'),
      temp_out_30d: one(`SELECT COUNT(*) c FROM blood_temp_logs WHERE hospital_id = ? AND in_range = 0
        AND log_date >= date('now', '-30 day')`),
      bags_available: one("SELECT COUNT(*) c FROM blood_bags WHERE hospital_id = ? AND status = 'available'"),
      // «کنترل روزانه از نظر تاریخ انقضا» (ب-۹-۱-۲) — کیسه‌ای که هنوز در موجودی
      // است ولی تاریخش گذشته، دقیقاً همان چیزی است که نباید در یخچال بماند.
      bags_expired: one(`SELECT COUNT(*) c FROM blood_bags WHERE hospital_id = ?
        AND status IN ('available','crossmatched') AND expiry_date < date('now')`),
      bags_expiring_7d: one(`SELECT COUNT(*) c FROM blood_bags WHERE hospital_id = ?
        AND status IN ('available','crossmatched') AND expiry_date >= date('now')
        AND expiry_date <= date('now', '+7 day')`),
      receipts_temp_bad: one('SELECT COUNT(*) c FROM blood_receipts WHERE hospital_id = ? AND temp_ok = 0'),
      samples_rejected_open: one('SELECT COUNT(*) c FROM blood_sample_checks WHERE hospital_id = ? AND accepted = 0 AND resampled = 0'),
      qc_failed_90d: one(`SELECT COUNT(*) c FROM blood_qc_records WHERE hospital_id = ? AND result = 'fail'
        AND qc_date >= date('now', '-90 day')`),
      qc_external: one("SELECT COUNT(*) c FROM blood_qc_records WHERE hospital_id = ? AND kind = 'external'"),
      events_open: one("SELECT COUNT(*) c FROM blood_adverse_events WHERE hospital_id = ? AND status != 'closed'"),
      events_total: ae.n || 0,
      events_within_48h_pct: ae.n ? Math.round(((ae.ok || 0) / ae.n) * 1000) / 10 : null,
      returns_30d: one(`SELECT COUNT(*) c FROM blood_returns WHERE hospital_id = ?
        AND return_date >= date('now', '-30 day')`),
      returns_temp_bad: one('SELECT COUNT(*) c FROM blood_returns WHERE hospital_id = ? AND temp_acceptable = 0'),
      units_list: query('SELECT * FROM blood_storage_units WHERE hospital_id = ? AND is_active = 1 ORDER BY title', [req.hospitalId]).rows,
      // ب-۹-۴-۶ پایش را «به تفکیک بخش‌ها» خواسته — همان چیزی که به کمیته گزارش می‌شود
      returns_by_ward: query(`SELECT ward, COUNT(*) n, SUM(unit_count) units,
        SUM(CASE WHEN temp_acceptable = 0 THEN 1 ELSE 0 END) bad_temp
        FROM blood_returns WHERE hospital_id = ? GROUP BY ward ORDER BY units DESC LIMIT 12`, [req.hospitalId]).rows,
    });
  } catch (err) { console.error('[BloodTransfusion]', err); res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

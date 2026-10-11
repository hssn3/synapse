/**
 * Operations Pharmacy & Drugs Routes
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

// ===== مدیریت دارویی (محور ب-۶) — database/seed-pharmacy.js =====
// هفت منبعِ این ماژول ساختارِ یکسانی دارند (چند فیلد، محدود به بیمارستان، یک
// مجوزِ مدیریت و یک مجوزِ مشاهده)، پس به‌جای هفت‌بار کپیِ همان CRUD یک سازنده
// نوشته شد. هرچه واقعاً منطقِ اختصاصی دارد — اعتبارسنجیِ سنجه‌محور — در
// normalize همان منبع می‌نشیند، نه در این سازنده.
const PH_RESOURCES = {
  formulary: {
    table: 'drug_formulary', fa: 'قلم فرمولاری',
    fields: ['generic_name', 'brand_name', 'local_code', 'dosage_form', 'strength', 'atc_code',
      'abc_class', 'is_vital', 'is_essential', 'is_high_alert', 'is_lasa', 'is_refrigerated',
      'is_narcotic', 'is_cytotoxic', 'reorder_point', 'storage_note', 'note', 'is_active', 'last_review_date'],
    bools: ['is_vital', 'is_essential', 'is_high_alert', 'is_lasa', 'is_refrigerated', 'is_narcotic', 'is_cytotoxic', 'is_active'],
    ints: ['reorder_point'],
    order: 'generic_name',
    // ب-۶-۴-۱ نامِ ژنریک را ستونِ هویتِ قلم می‌داند؛ بدونش ردیف بی‌معناست.
    defaults: { is_active: 1 },
    validate: (r) => r.generic_name ? null : 'نام ژنریک الزامی است',
    uniqueHint: { msg: 'این کد اختصاصی قبلاً ثبت شده است' },
  },
  fridges: {
    table: 'drug_fridges', fa: 'یخچال دارویی',
    fields: ['title', 'location', 'min_temp', 'max_temp', 'has_alarm', 'on_emergency_power', 'responsible', 'is_active'],
    bools: ['has_alarm', 'on_emergency_power', 'is_active'],
    floats: ['min_temp', 'max_temp'],
    order: 'title',
    defaults: { is_active: 1 },
    validate: (r) => {
      if (!r.title) return 'عنوان یخچال الزامی است';
      if (!(r.max_temp > r.min_temp)) return 'حد بالای دما باید از حد پایین بیشتر باشد';
      return null;
    },
  },
  recalls: {
    table: 'drug_recalls', fa: 'فراخوان',
    fields: ['item_name', 'item_kind', 'manufacturer', 'batch_no', 'production_date', 'expiry_date',
      'source_letter', 'announced_date', 'notified_wards', 'notified_date', 'collected_qty',
      'final_disposition', 'status', 'note'],
    order: 'announced_date DESC',
    enums: { status: ['announced', 'notified', 'collected', 'closed'], item_kind: ['دارو', 'تجهیزات مصرفی پزشکی'] },
    // ب-۶-۲-۳ صریح «روشن بودن سرنوشت نهایی» را خواسته؛ پس بستنِ پرونده‌ی فراخوان
    // بدون نوشتنِ سرنوشت، همان حلقه‌ی بازی است که ممیز می‌گیرد.
    validate: (r) => {
      if (!r.item_name) return 'نام قلم الزامی است';
      if (r.status === 'closed' && !r.final_disposition) return 'برای بستن فراخوان، سرنوشت نهایی باید ثبت شود';
      return null;
    },
  },
  disposals: {
    table: 'drug_disposals', fa: 'صورت‌جلسه انهدام',
    fields: ['minutes_no', 'disposal_date', 'item_name', 'item_kind', 'batch_no', 'expiry_date',
      'quantity', 'reason', 'method', 'attendees', 'note'],
    order: 'disposal_date DESC',
    enums: { item_kind: ['دارو', 'تجهیزات مصرفی پزشکی'] },
    // reason در جدول NOT NULL است؛ اگر کاربر خالی بگذارد باید همان پیش‌فرضِ
    // ستون بنشیند، نه null که درج را با خطای ۵۰۰ می‌شکند.
    defaults: { reason: 'تاریخ مصرف گذشته' },
    // ب-۶-۲-۶: «با تدوین صورت‌جلسه برای هر مورد با حضور مسئول فنی داروخانه» —
    // شماره صورت‌جلسه و حاضران اختیاری نیستند.
    validate: (r) => {
      if (!r.item_name) return 'نام قلم الزامی است';
      if (!r.minutes_no) return 'شماره صورت‌جلسه الزامی است';
      if (!r.disposal_date) return 'تاریخ انهدام الزامی است';
      if (!r.attendees) return 'نام حاضران (شامل مسئول فنی داروخانه) الزامی است';
      return null;
    },
  },
  events: {
    table: 'drug_adverse_events', fa: 'عارضه/خطای دارویی',
    fields: ['kind', 'event_date', 'ward', 'drug_name', 'patient_ref', 'patient_age', 'patient_gender',
      'description', 'severity', 'outcome', 'analysis', 'corrective_action', 'yellow_form_sent',
      'yellow_form_date', 'reported_by', 'status'],
    bools: ['yellow_form_sent'],
    order: 'event_date DESC',
    enums: { kind: ['adr', 'medication_error'], status: ['open', 'analyzed', 'closed'],
      severity: ['خفیف', 'متوسط', 'شدید', 'مرگ'] },
    // ب-۶-۳-۴ چرخه را «گزارش، تحلیل و اقدامات اصلاحی مؤثر» تعریف کرده؛ بستنِ
    // پرونده بدون تحلیل و اقدام یعنی همان چرخه نیمه‌کاره مانده.
    validate: (r) => {
      if (!r.drug_name) return 'نام دارو الزامی است';
      if (!r.event_date) return 'تاریخ رخداد الزامی است';
      if (!r.description) return 'شرح رخداد الزامی است';
      if (r.status === 'closed' && (!r.analysis || !r.corrective_action))
        return 'برای بستن پرونده، تحلیل و اقدام اصلاحی باید ثبت شود';
      return null;
    },
  },
  shortages: {
    table: 'drug_shortages', fa: 'کمبود دارو',
    fields: ['formulary_id', 'item_name', 'started_date', 'resolved_date', 'severity',
      'alternative', 'priority_rule', 'wards_notified', 'status', 'note'],
    order: 'status, started_date DESC',
    enums: { status: ['active', 'resolved'], severity: ['کم', 'متوسط', 'زیاد', 'بحرانی'] },
    validate: (r) => {
      if (!r.item_name) return 'نام قلم الزامی است';
      if (r.status === 'resolved' && !r.resolved_date) return 'برای پایان کمبود، تاریخ رفع باید ثبت شود';
      return null;
    },
  },
  offformulary: {
    table: 'drug_off_formulary', fa: 'تجویز خارج از فرمولاری',
    fields: ['request_date', 'item_name', 'prescriber', 'ward', 'patient_ref', 'justification',
      'in_idl', 'decision', 'decided_by', 'decided_date', 'decision_note'],
    bools: ['in_idl'],
    order: 'request_date DESC',
    enums: { decision: ['pending', 'approved', 'rejected'] },
    defaults: { in_idl: 1 },
    // ب-۶-۴-۲: «تجویز داروی خارج از فهرست رسمی داروهای ایران … مطلقاً ممنوع
    // است». پس تأییدِ قلمی که در IDL نیست، از سمتِ سرور بسته شد — نه فقط با
    // یک هشدار در رابط کاربری.
    validate: (r) => {
      if (!r.item_name) return 'نام قلم الزامی است';
      if (!r.justification) return 'توجیه تجویز الزامی است';
      if (r.decision === 'approved' && !r.in_idl)
        return 'تجویز قلم خارج از فهرست رسمی داروهای ایران (IDL) قابل تأیید نیست';
      return null;
    },
  },
};

// ===== ماژول‌های مرحله ۲ md (انبار/بحران/دانش/آموزش بیمار/اداری/شیفت/آموزش) =====
// چرا این‌جا (کنار بقیه mountCrud، نه وسط api.js): هر جدول تازه باید CRUD استاندارد
// با authRequired + requirePermission + hospitalScope بگیرد؛ موتور mountCrud دقیقاً همین را می‌دهد.
// قرارداد فرانت: کلید ماژول RPG برابر همین prefix است (مثلاً mdinv/stock).
const MD2_PHARM_RESOURCES = {
  stock: { table: 'stock_items', fa: 'اقلام انبار', fields: ['item_code', 'item_name', 'category', 'qty', 'reorder_point', 'exp_date'], order: 'created_at DESC',
    validate: (r) => (r.item_name ? null : 'نام قلم الزامی است') },
  stockmoves: { table: 'stock_moves', fa: 'ورود/خروج انبار', fields: ['item_id', 'move_type', 'qty', 'doc_no', 'move_date'], order: 'move_date DESC',
    validate: (r) => (r.item_id && r.qty ? null : 'قلم و مقدار الزامی است') },
  crashcart: { table: 'crash_cart_stock', fa: 'استوک ترالی احیا', fields: ['cart_location', 'drawer', 'item_name', 'qty', 'exp_date'], order: 'created_at DESC',
    validate: (r) => (r.item_name ? null : 'نام قلم الزامی است') },
  fridge: { table: 'fridge_logs', fa: 'لاگ یخچال', fields: ['ward', 'log_date', 'temp_morning', 'temp_evening', 'humidity', 'defrost_done', 'controller_role'], order: 'log_date DESC',
    validate: (r) => (r.ward && r.log_date ? null : 'بخش و تاریخ الزامی است') },
  antidotes: { table: 'antidotes', fa: 'آنتی‌دوت‌ها', fields: ['poisoning', 'antidote', 'note'], order: 'poisoning ASC',
    validate: (r) => (r.poisoning && r.antidote ? null : 'مسمومیت و پادزهر الزامی است') },
};
const MD2_CRISIS_RESOURCES = {
  crisis: { table: 'crisis_roles', fa: 'شرح وظایف بحران', fields: ['title', 'duty_scope', 'report_to', 'contact_role'], order: 'title ASC',
    validate: (r) => (r.title ? null : 'عنوان سمت الزامی است') },
};
const MD2_KNOW_RESOURCES = {
  learnings: { table: 'incident_learning', fa: 'درس‌آموخته‌ها', fields: ['title', 'source', 'lesson', 'action'], order: 'created_at DESC',
    validate: (r) => (r.title ? null : 'عنوان الزامی است') },
  clinotes: { table: 'clinical_notes', fa: 'نکات بالینی', fields: ['topic', 'summary'], order: 'created_at DESC',
    validate: (r) => (r.topic ? null : 'موضوع الزامی است') },
};
const MD2_EDU_RESOURCES = {
  patientedu: { table: 'patient_education', fa: 'آموزش بیمار', fields: ['disease', 'inpatient_content', 'discharge_content'], order: 'disease ASC',
    validate: (r) => (r.disease ? null : 'بیماری الزامی است') },
};
const MD2_ADMIN_RESOURCES = {
  adminforms: { table: 'admin_forms', fa: 'فرم‌های اداری', fields: ['form_code', 'title', 'category', 'fields_json', 'status'], order: 'title ASC',
    validate: (r) => (r.title ? null : 'عنوان فرم الزامی است') },
  formsubs: { table: 'admin_form_submissions', fa: 'ثبت‌های اداری', fields: ['form_id', 'data_json', 'submitted_by'], order: 'created_at DESC',
    validate: (r) => (r.form_id ? null : 'فرم الزامی است') },
};
const MD2_SHIFT_RESOURCES = {
  handovers: { table: 'shift_handovers', fa: 'تحویل شیفت', fields: ['ward', 'handover_date', 'from_shift', 'to_shift', 'summary', 'issues'], order: 'handover_date DESC',
    validate: (r) => (r.ward && r.handover_date ? null : 'بخش و تاریخ الزامی است') },
  loans: { table: 'equipment_loans', fa: 'امانت تجهیزات', fields: ['item_name', 'from_ward', 'to_ward', 'loan_date', 'return_date', 'status', 'receiver_role'], order: 'loan_date DESC',
    validate: (r) => (r.item_name ? null : 'نام وسیله الزامی است') },
};
const MD2_TRAIN_RESOURCES = {
  certs: { table: 'training_certs', fa: 'گواهی‌ها', fields: ['course_title', 'holder_role', 'score', 'issue_date', 'cert_no'], order: 'issue_date DESC',
    validate: (r) => (r.course_title ? null : 'عنوان دوره الزامی است') },
  needsassess: { table: 'training_needs_assessment', fa: 'نیازسنجی', fields: ['group_name', 'topic', 'priority', 'year'], order: 'year DESC',
    validate: (r) => (r.topic ? null : 'موضوع الزامی است') },
};
mountCrud('mdinv', MD2_PHARM_RESOURCES, 'view_pharmacy', 'manage_pharmacy', 'MDInv');
mountCrud('mdcrisis', MD2_CRISIS_RESOURCES, 'view_disaster', 'manage_disaster', 'MDCrisis');
mountCrud('mdknow', MD2_KNOW_RESOURCES, 'view_documents', 'manage_documents', 'MDKnow');
mountCrud('mdedu', MD2_EDU_RESOURCES, 'view_education', 'manage_education', 'MDEdu');
mountCrud('mdadmin', MD2_ADMIN_RESOURCES, 'view_hrdev', 'manage_hrdev', 'MDAdmin');
mountCrud('mdshift', MD2_SHIFT_RESOURCES, 'view_nsupervision', 'manage_nsupervision', 'MDShift');
mountCrud('mdtrain', MD2_TRAIN_RESOURCES, 'view_training', 'review_training_needs', 'MDTrain');

mountCrud('pharmacy', PH_RESOURCES, 'view_pharmacy', 'manage_pharmacy', 'Pharmacy');

// ثبت دمای یخچال — منبعِ جدا از CRUD بالا، چون منطقِ «داخل/خارج محدوده» را
// سرور باید تعیین کند نه فرستنده: اگر کاربر بتواند in_range را خودش بفرستد،
// انحرافِ دما با یک تیک پنهان می‌شود و همان چیزی که سنجه می‌خواهد از بین می‌رود.
router.get('/pharmacy-temp/:fridgeId', authRequired, requireAnyPermission('view_pharmacy', 'manage_pharmacy'), hospitalScope, (req, res) => {
  try {
    const f = query('SELECT * FROM drug_fridges WHERE id = ? AND hospital_id = ?', [req.params.fridgeId, req.hospitalId]).rows[0];
    if (!f) return res.status(404).json({ error: 'یخچال یافت نشد' });
    const logs = query(`SELECT * FROM drug_temp_logs WHERE fridge_id = ? AND hospital_id = ?
      ORDER BY log_date DESC, slot LIMIT 200`, [f.id, req.hospitalId]).rows;
    const out = logs.filter(l => !l.in_range).length;
    res.json({ fridge: f, logs, out_of_range: out });
  } catch (err) { console.error('[Pharmacy]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/pharmacy-temp/:fridgeId', authRequired, requirePermission('manage_pharmacy'), hospitalScope, (req, res) => {
  try {
    const f = query('SELECT * FROM drug_fridges WHERE id = ? AND hospital_id = ?', [req.params.fridgeId, req.hospitalId]).rows[0];
    if (!f) return res.status(404).json({ error: 'یخچال یافت نشد' });
    const date = String(req.body.log_date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'تاریخ ثبت الزامی است' });
    const t = parseFloat(req.body.temperature);
    if (!Number.isFinite(t)) return res.status(400).json({ error: 'دما الزامی است' });
    const slot = ['صبح', 'عصر', 'شب'].includes(req.body.slot) ? req.body.slot : 'صبح';
    const inRange = (t >= f.min_temp && t <= f.max_temp) ? 1 : 0;
    const action = String(req.body.action_taken || '').trim();
    if (!inRange && !action) return res.status(400).json({ error: 'دما خارج از محدوده مجاز است؛ ثبت اقدام انجام‌شده الزامی است' });
    const h = parseFloat(req.body.humidity);
    const id = uuid();
    query(`INSERT INTO drug_temp_logs (id, hospital_id, fridge_id, log_date, slot, temperature, humidity, in_range, action_taken, recorded_by, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.hospitalId, f.id, date, slot, t, Number.isFinite(h) ? h : null, inRange,
        action || null, req.body.recorded_by || null, req.user.id]);
    res.json({ log: { id }, in_range: !!inRange });
  } catch (err) {
    if (/UNIQUE constraint/.test(String(err.message || '')))
      return res.status(400).json({ error: 'برای این یخچال، این تاریخ و نوبت قبلاً ثبت شده است' });
    console.error('[Pharmacy]', err); res.status(500).json({ error: 'خطای سرور' });
  }
});

// داشبورد: همان چیزهایی که ممیزِ محور ب-۶ اول از همه می‌پرسد
router.get('/pharmacy-dashboard', authRequired, requireAnyPermission('view_pharmacy', 'manage_pharmacy'), hospitalScope, (req, res) => {
  try {
    const one = (sql, p) => query(sql, p || [req.hospitalId]).rows[0] || {};
    res.json({
      formulary_total: one('SELECT COUNT(*) c FROM drug_formulary WHERE hospital_id = ? AND is_active = 1').c || 0,
      high_alert: one('SELECT COUNT(*) c FROM drug_formulary WHERE hospital_id = ? AND is_active = 1 AND is_high_alert = 1').c || 0,
      vital: one('SELECT COUNT(*) c FROM drug_formulary WHERE hospital_id = ? AND is_active = 1 AND is_vital = 1').c || 0,
      active_shortages: one("SELECT COUNT(*) c FROM drug_shortages WHERE hospital_id = ? AND status = 'active'").c || 0,
      open_recalls: one("SELECT COUNT(*) c FROM drug_recalls WHERE hospital_id = ? AND status != 'closed'").c || 0,
      open_events: one("SELECT COUNT(*) c FROM drug_adverse_events WHERE hospital_id = ? AND status != 'closed'").c || 0,
      pending_off_formulary: one("SELECT COUNT(*) c FROM drug_off_formulary WHERE hospital_id = ? AND decision = 'pending'").c || 0,
      temp_out_30d: one(`SELECT COUNT(*) c FROM drug_temp_logs WHERE hospital_id = ? AND in_range = 0
        AND log_date >= date('now', '-30 day')`).c || 0,
      fridges: query('SELECT * FROM drug_fridges WHERE hospital_id = ? AND is_active = 1 ORDER BY title', [req.hospitalId]).rows,
    });
  } catch (err) { console.error('[Pharmacy]', err); res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

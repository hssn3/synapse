/**
 * Core Legacy Assistant Routes
 * Part of Modular Monolith (Clean Architecture) — Project 313
 */
const express = require('express');
const router = express.Router();
const common = require('../common');
// گاردِ NIST برای مسیرِ چت (پایین). چرا import مستقیم و نه از common: authorize فقط
// همین‌جا لازم است و common برای هر مصرف‌کننده‌ی تازه پهن‌تر از حدِ لازم می‌شود.
const { authorize } = require('../rbac/authorize.middleware');
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

// ===== دستیار هوشمند داخلی (دکمه‌ی شناور) — دو پرسش، دو مسیر =====
// همان داده‌ی guide-timeline را مصرف می‌کند (منبع حقیقت یکی است)، اما یکی «تصمیم» را
// برمی‌گرداند (چه کاری همین حالا در نوبت است) و دیگری «حسابرسی» را (چه چیزی انجام شده،
// چه چیزی مانده، چند از چند). هر دو با مجوزِ خودِ کاربر فیلتر می‌شوند، پس هر سمت فقط
// وظایف خودش را می‌بیند.
router.get('/assistant/next', authRequired, hospitalScope, (req, res) => {
  try {
    res.json(assistantNext(req.user.id, req.hospitalId, req.user.permissions || []));
  } catch (err) { console.error('[Assistant/next]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// درصد انجام کارها به تفکیک دوره — روزانه / هفتگی / ماهانه / فصلی / سالانه.
// pct=null یعنی در آن بازه وظیفه‌ای از آن جنس تعریف نشده؛ رابط باید «—» نشان دهد
// نه صفر درصد.
router.get('/duties/progress', authRequired, hospitalScope, (req, res) => {
  try {
    res.json(periodProgress(req.user.role_code, req.hospitalId, req.user.id));
  } catch (err) {
    console.error('[API] duties/progress error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// تصمیم‌گیرنده هوشمند اعتباربخشی و برنامه جامع وظایف سمتی (روزانه، هفتگی، ماهانه، سالانه)
router.get('/duties/smart-decisions', authRequired, hospitalScope, (req, res) => {
  try {
    const decisions = getSmartDecisions(
      req.user.role_code,
      req.hospitalId,
      (req.previewAdmin && req.previewAdmin.id) || req.user.id
    );
    res.json(decisions);
  } catch (err) {
    console.error('[API] duties/smart-decisions error:', err);
    res.status(500).json({ error: 'خطای سرور در موتور تصمیم‌گیرنده' });
  }
});

// «کار من» — امروز / این هفته / این ماه.
//
// این همان چیزی است که کارفرما خواست: «هر کاربر از رئیس بیمارستان تا منشی باید
// بداند روزانه چه کار کند و هفتگی و ماهانه چه کار کند.» خروجی از دو منبع می‌آید
// (سیگنالِ زنده‌ی ماژول‌ها + وظیفه‌ی دوره‌ایِ سمت) و هر سیگنال به مجوزِ ماژولِ
// خودش قفل است — پس هر کس فقط کارِ خودش را می‌بیند.
router.get('/my-work', authRequired, hospitalScope, (req, res) => {
  try {
    res.json(myWork({
      hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id,
      roleCode: req.user.role_code, perms: req.user.permissions || [],
    }));
  } catch (err) {
    console.error('[API] my-work error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// شرح وظایف قانونی سمتِ خودِ کاربر (منبع: دانشگاه علوم پزشکی ایران).
// بندهای اختصاصیِ همین بیمارستان بر بندهای پیش‌فرض سراسری اولویت دارند: اگر مرکز
// نسخه‌ی خودش را ثبت کرده باشد، همان نشان داده می‌شود و نه هر دو.
// دستیار هوشمند «دانا» — چت. کاربر همیشه با همین مسیر حرف می‌زند؛ اینکه پشتِ صحنه
// لایه‌ی داخلی جواب داده یا به کمکِ بیرونی رفته، فقط در فیلد source مشخص می‌شود
// و در رابط کاربری برچسبی از فروشنده‌ی بیرونی نشان داده نمی‌شود.
// کلیدِ روشن/خاموشِ چت، از پنل سوپرادمین. خاموش‌بودن هم باید دکمه را بردارد و هم
// همین روت را ببندد — اگر فقط دکمه پنهان شود، هر درخواستِ دستی همچنان توکن خرج
// می‌کند و «خاموش» عملاً معنایی ندارد.
function assistantChatEnabled(hospitalId) {
  try {
    const r = query('SELECT chat_enabled FROM assistant_hospital_settings WHERE hospital_id = ?',
      [hospitalId]).rows[0];
    return !r || r.chat_enabled === null || r.chat_enabled === undefined ? true : !!r.chat_enabled;
  } catch (e) { return true; }
}
  // ---------- بانک دانش دانا — گردش تأیید ----------
  // پاسخهای دانا بهشکل draft ذخیره میشوند و assistant-context فقط status='confirmed'
  // را به بازیابی میدهد — اما تا امروز هیچ مسیری برای همان بازبینی وجود نداشت و
  // منبع «دانش تأییدشده» عملاً مرده بود. دروازهی بازبینی: manage_documents —
  // بانک دانش سندِ قابل استنادِ مرکز است و مالکان مدارک همان بازبینها هستند.
  router.get('/assistant/knowledge', authRequired, requireAnyPermission('manage_documents'), hospitalScope, (req, res) => {
    try {
      const status = ['draft', 'confirmed', 'rejected'].includes(req.query.status) ? req.query.status : null;
      const rows = query(
        `SELECT k.id, k.title, k.content, k.status, k.created_at, u.full_name AS created_by_name
         FROM assistant_knowledge k LEFT JOIN users u ON u.id = k.created_by
         WHERE k.hospital_id = ? ${status ? 'AND k.status = ?' : ''}
         ORDER BY (k.status = 'draft') DESC, k.created_at DESC LIMIT 100`,
        status ? [req.hospitalId, status] : [req.hospitalId]).rows;
      const counts = { draft: 0, confirmed: 0, rejected: 0 };
      for (const c of query(`SELECT status, COUNT(*) c FROM assistant_knowledge WHERE hospital_id = ? GROUP BY status`, [req.hospitalId]).rows) counts[c.status] = c.c;
      res.json({ items: rows, counts });
    } catch (err) { console.error('[Knowledge]', err); res.status(500).json({ error: 'خطای سرور' }); }
  });

  router.post('/assistant/knowledge/:id/approve', authRequired, requireAnyPermission('manage_documents'), hospitalScope, (req, res) => {
    try {
      const row = query('SELECT id FROM assistant_knowledge WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
      if (!row) return res.status(404).json({ error: 'یافت نشد' });
      query("UPDATE assistant_knowledge SET status = 'confirmed' WHERE id = ?", [row.id]);
      logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'assistant_knowledge_approved', targetTable: 'assistant_knowledge', targetId: row.id, ipAddress: req.ip });
      res.json({ status: 'confirmed' });
    } catch (err) { console.error('[Knowledge]', err); res.status(500).json({ error: 'خطای سرور' }); }
  });

  router.post('/assistant/knowledge/:id/reject', authRequired, requireAnyPermission('manage_documents'), hospitalScope, (req, res) => {
    try {
      const row = query('SELECT id FROM assistant_knowledge WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
      if (!row) return res.status(404).json({ error: 'یافت نشد' });
      query("UPDATE assistant_knowledge SET status = 'rejected' WHERE id = ?", [row.id]);
      logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'assistant_knowledge_rejected', targetTable: 'assistant_knowledge', targetId: row.id, ipAddress: req.ip });
      res.json({ status: 'rejected' });
    } catch (err) { console.error('[Knowledge]', err); res.status(500).json({ error: 'خطای سرور' }); }
  });

  router.delete('/assistant/knowledge/:id', authRequired, requireAnyPermission('manage_documents'), hospitalScope, (req, res) => {
    try {
      const row = query('SELECT id FROM assistant_knowledge WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
      if (!row) return res.status(404).json({ error: 'یافت نشد' });
      query('DELETE FROM assistant_knowledge WHERE id = ? AND hospital_id = ?', [row.id, req.hospitalId]);
      logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'assistant_knowledge_deleted', targetTable: 'assistant_knowledge', targetId: row.id, ipAddress: req.ip });
      res.json({ status: 'deleted' });
    } catch (err) { console.error('[Knowledge]', err); res.status(500).json({ error: 'خطای سرور' }); }
  });

router.get('/assistant/status', authRequired, hospitalScope, (req, res) => {
  res.json({ chat_enabled: assistantChatEnabled(req.hospitalId) });
});

// گاردِ مجوز از امروز فعال است (بندِ معلقِ docs/DECISIONS.md #3). قبل از hospitalScope
// می‌آید تا ردِ بی‌مجوز حتی به واکشیِ نام بیمارستان هم نرسد؛ خودِ گارد بعد از رد،
// درخواست را در audit_log ثبت می‌کند.
router.post('/assistant/chat', authRequired, authorize('assistant:chat', 'use'), hospitalScope, async (req, res) => {
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  if (!text || text.length > 2000) return res.status(400).json({ error: 'متن نامعتبر است' });
  if (!assistantChatEnabled(req.hospitalId)) {
    return res.status(403).json({ error: 'گفت‌وگو با دانا برای این بیمارستان غیرفعال است' });
  }
  try {
    const hosp = query('SELECT name FROM hospitals WHERE id = ?', [req.hospitalId]).rows[0];
    // نامِ فارسیِ سمت به دستورِ سیستمی داده می‌شود تا دانا بداند با چه کسی حرف
    // می‌زند و جوابش را به وظایفِ همان سمت گره بزند. اگر نقش پیدا نشد، صرفاً
    // این جمله از prompt حذف می‌شود — چیزی نمی‌شکند.
    const roleRow = req.user.role_code
      ? query('SELECT title_fa FROM roles WHERE code = ? AND hospital_id = ?',
        [req.user.role_code, req.hospitalId]).rows[0] : null;
    const out = await assistantChat.handleMessage({
      hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id,
      conversationId: req.body.conversation_id || null,
      text, hospitalName: hosp && hosp.name,
      // ستونِ نامِ فارسیِ نقش title_fa است؛ roles اصلاً ستونِ name ندارد، پس
      // roleLabel همیشه undefined می‌شد و جمله‌ی «کاربری که الان می‌پرسد، «…»
      // است» هیچ‌وقت به دستورِ سیستمی نمی‌رفت — یعنی پاسخِ سمت‌محور عملاً خاموش بود.
      roleCode: req.user.role_code, roleLabel: roleRow && roleRow.title_fa,
      permissions: req.user.permissions || [],
    });
    res.json(out);
  } catch (err) {
    console.error('[API] assistant/chat error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.get('/assistant/conversations', authRequired, hospitalScope, (req, res) => {
  try { res.json({ conversations: assistantChat.listConversations(req.hospitalId, req.user.id) }); }
  catch (err) { console.error('[API] assistant/conversations error:', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.get('/assistant/conversations/:id/messages', authRequired, hospitalScope, (req, res) => {
  try {
    const messages = assistantChat.listMessages(req.hospitalId, req.user.id, req.params.id);
    if (messages === null) return res.status(404).json({ error: 'گفت‌وگو یافت نشد' });
    res.json({ messages });
  } catch (err) { console.error('[API] assistant/messages error:', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// وضعیت مصرف توکن همین بیمارستان — برای نشان‌دادن سقف باقی‌مانده به کاربر، بدون
// افشای کلید API
router.get('/assistant/usage', authRequired, hospitalScope, (req, res) => {
  try {
    const s = assistantChat.getSettings(req.hospitalId);
    res.json({
      configured: !!s.api_key,
      monthly_token_budget: s.monthly_token_budget,
      tokens_used_this_period: s.tokens_used_this_period,
    });
  } catch (err) { console.error('[API] assistant/usage error:', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.get('/legal-duties', authRequired, hospitalScope, (req, res) => {
  try {
    const role = req.user.role_code;
    const own = query(
      `SELECT duty_text, source, source_url, is_custom FROM role_legal_duties
       WHERE role_code = ? AND hospital_id = ? ORDER BY sort_order, id`,
      [role, req.hospitalId]
    ).rows;
    const rows = own.length ? own : query(
      `SELECT duty_text, source, source_url, is_custom FROM role_legal_duties
       WHERE role_code = ? AND hospital_id IS NULL ORDER BY sort_order, id`,
      [role]
    ).rows;
    res.json({ role_code: role, custom: own.length > 0, duties: rows });
  } catch (err) {
    console.error('[API] legal-duties error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.get('/assistant/review', authRequired, hospitalScope, (req, res) => {
  try {
    res.json(assistantReview(req.user.id, req.hospitalId, req.user.permissions || []));
  } catch (err) { console.error('[Assistant/review]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// «✅ انجام دادم» — کاربر خودش می‌گوید این گام را انجام داده؛ سرور همیشه دوباره done()
// واقعی را چک می‌کند، پس این کلیک هرگز نمی‌تواند یک گام واقعاً ناقص را «تمام‌شده» جا بزند
router.post('/guide-timeline/dismiss', authRequired, hospitalScope, (req, res) => {
  try {
    const key = (req.body || {}).key;
    if (!key) return res.status(400).json({ error: 'کلید گام الزامی است' });
    // وظایف سمت (duty_*) در buildMilestones نیستند و اغلب ردّ داده‌ای هم ندارند
    // (مثل «مرور امتیاز» یا «راند بالینی»)، پس تأیید دستی خودِ کاربر تنها راه بستنشان
    // است. برای وظیفه‌ی دوره‌ای این تأیید فقط تا پایان همان دوره اعتبار دارد — دستیار
    // با مقایسه‌ی created_at با ابتدای دوره این را اعمال می‌کند.
    if (String(key).startsWith('duty_')) setMilestoneState(req.user.id, req.hospitalId, key, 'done', null);
    else dismissMilestone(req.user.id, req.hospitalId, key);
    res.json({ status: 'done' });
  } catch (err) {
    if (err.code === 'NOT_FILLED') return res.status(400).json({ error: 'مورد پر نشده است' });
    console.error('[GuideTimeline]', err); res.status(500).json({ error: 'خطای سرور' });
  }
});

// «⏰ بعداً یادآوری کن» — برخلاف بالا، برای همیشه پنهان نمی‌شود؛ بعد از snooze_until دوباره
// در ویجت ظاهر می‌شود (البته فقط اگر داده‌ی واقعی هنوز نشان دهد گام انجام نشده است)
router.post('/guide-timeline/snooze', authRequired, hospitalScope, (req, res) => {
  try {
    const key = (req.body || {}).key;
    if (!key) return res.status(400).json({ error: 'کلید گام الزامی است' });
    const until = snoozeMilestone(req.user.id, req.hospitalId, key, (req.body || {}).days);
    res.json({ status: 'snoozed', until });
  } catch (err) { console.error('[GuideTimeline]', err); res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

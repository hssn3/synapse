/**
 * Collaboration Inbox & Messages Routes
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

// ===== کارتابل شخصی (kartabl) + کاربر جانشین =====
// کارتابل جدول ندارد: اقلامِ «در انتظار اقدام شما» در لحظه از جدول‌های موجود جمع می‌شوند.
// فقط اقلامی که مفهوم واقعی «معطل این کاربر» دارند وارد می‌شوند (وظیفه، امضای نشده، حسابرسی
// در دست همین ممیز، جلسه‌ی پیشِ‌روی کمیته‌ای که ریاستش با اوست) — نه هر ردیف بازِ بیمارستان.
function inboxItemsFor(userId, hospitalId) {
  const items = [];
  const today = tehranTodayStr();

  for (const t of query(`SELECT id, title, status, due_date, created_at FROM tasks
      WHERE hospital_id = ? AND assigned_to = ? AND status != 'completed' ORDER BY created_at DESC LIMIT 100`,
      [hospitalId, userId]).rows) {
    items.push({ type: 'task', type_fa: 'وظیفه', page: 'dash', target_id: t.id,
      title: t.title, detail_label: t.due_date ? 'مهلت' : null, detail_date: t.due_date || null, created_at: t.created_at });
  }

  for (const s of query(`SELECT s.id, s.signoff_role, s.created_at, d.id as document_id, d.title
      FROM document_signoffs s JOIN controlled_documents d ON s.document_id = d.id
      WHERE s.hospital_id = ? AND s.user_id = ? AND s.signed_at IS NULL ORDER BY s.created_at DESC LIMIT 100`,
      [hospitalId, userId]).rows) {
    items.push({ type: 'signoff', type_fa: 'امضای سند', page: 'documents', target_id: s.document_id,
      title: s.title, detail_label: 'نقش: ' + s.signoff_role, detail_date: null, created_at: s.created_at });
  }

  for (const a of query(`SELECT id, title, status, follow_up_date, created_at FROM internal_audits
      WHERE hospital_id = ? AND auditor_user_id = ? AND status NOT IN ('completed','closed')
      ORDER BY created_at DESC LIMIT 100`, [hospitalId, userId]).rows) {
    items.push({ type: 'audit', type_fa: 'حسابرسی داخلی', page: 'audits', target_id: a.id,
      title: a.title, detail_label: a.follow_up_date ? 'پیگیری' : null, detail_date: a.follow_up_date || null, created_at: a.created_at });
  }

  for (const m of query(`SELECT e.id, e.title, e.event_date, e.start_time, e.created_at, c.id as committee_id
      FROM calendar_events e JOIN committees c ON e.committee_id = c.id
      WHERE e.hospital_id = ? AND e.event_type = 'committee_meeting' AND c.chairperson_id = ?
        AND e.event_date >= ? ORDER BY e.event_date LIMIT 50`, [hospitalId, userId, today]).rows) {
    items.push({ type: 'meeting', type_fa: 'جلسه پیش‌رو', page: 'committees', target_id: m.committee_id,
      title: m.title, detail_label: 'ساعت ' + (m.start_time || '—'), detail_date: m.event_date, created_at: m.created_at });
  }

  // چک‌لیست فعالی که این کاربر «مسئول اندازه‌گیری» آن است و هنوز حتی یک‌بار آن را تکمیل نکرده
  for (const c of query(`SELECT c.id, c.title, c.checklist_code, c.created_at FROM checklist_measurers m
      JOIN checklists c ON m.checklist_id = c.id
      WHERE m.user_id = ? AND c.hospital_id = ? AND c.status = 'active'
        AND NOT EXISTS (SELECT 1 FROM checklist_submissions s WHERE s.checklist_id = c.id AND s.submitted_by = m.user_id)
      ORDER BY c.updated_at DESC LIMIT 100`, [userId, hospitalId]).rows) {
    items.push({ type: 'checklist', type_fa: 'چک‌لیست محول‌شده', page: 'checklists', target_id: c.id,
      title: c.title, detail_label: c.checklist_code ? 'شماره: ' + c.checklist_code : null, detail_date: null, created_at: c.created_at });
  }

  // ریمایندرهای سررسید (بازبینی سند، پایان دوره، انقضای گواهینامه) همان‌جا که بقیه‌ی
  // «چیزهایی که منتظر من است» نشان داده می‌شوند — نه در یک زنگوله‌ی موازی.
  items.push(...reminderItemsFor(userId, hospitalId));

  return items;
}

function activeDelegationsToMe(userId, hospitalId) {
  const today = tehranTodayStr();
  return query(`SELECT d.*, u.full_name as owner_name FROM user_delegates d JOIN users u ON d.user_id = u.id
    WHERE d.hospital_id = ? AND d.delegate_user_id = ? AND d.starts_at <= ? AND d.ends_at >= ?`,
    [hospitalId, userId, today, today]).rows;
}

router.get('/inbox', authRequired, hospitalScope, (req, res) => {
  try {
    const mine = inboxItemsFor(req.user.id, req.hospitalId).map(i => ({ ...i, on_behalf_of: null }));
    let all = mine;
    for (const d of activeDelegationsToMe(req.user.id, req.hospitalId)) {
      all = all.concat(inboxItemsFor(d.user_id, req.hospitalId).map(i => ({ ...i, on_behalf_of: d.owner_name })));
    }
    all.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    res.json({ items: all, own_count: mine.length, delegated_count: all.length - mine.length });
  } catch (err) { console.error('[Inbox]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// فهرست سبک همکاران برای انتخابگر جانشین — بدون نیاز به مجوز manage_users (خودسرویس است)
router.get('/users/colleagues', authRequired, hospitalScope, (req, res) => {
  try {
    const rows = query(`SELECT id, full_name, department FROM users
      WHERE hospital_id = ? AND is_active = 1 AND id != ? ORDER BY full_name`, [req.hospitalId, req.user.id]).rows;
    res.json({ users: rows });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// فهرست کارکنان برای انتخاب ارکان امضا و تدوین خط‌مشی‌ها (تدوین‌کننده، تاییدکننده، تصویب‌کننده)
router.get('/users/signers', authRequired, hospitalScope, (req, res) => {
  try {
    const rows = query(`SELECT u.id, u.full_name, u.department, r.code as role_code, r.title_fa as role_title
      FROM users u JOIN roles r ON u.role_id = r.id
      WHERE u.hospital_id = ? AND u.is_active = 1
      ORDER BY u.full_name`, [req.hospitalId]).rows;
    res.json({ users: rows });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.get('/users/delegates', authRequired, hospitalScope, (req, res) => {
  try {
    const mine = query(`SELECT d.*, u.full_name as delegate_name FROM user_delegates d
      JOIN users u ON d.delegate_user_id = u.id
      WHERE d.hospital_id = ? AND d.user_id = ? ORDER BY d.starts_at DESC`, [req.hospitalId, req.user.id]).rows;
    const to_me = query(`SELECT d.*, u.full_name as owner_name FROM user_delegates d
      JOIN users u ON d.user_id = u.id
      WHERE d.hospital_id = ? AND d.delegate_user_id = ? ORDER BY d.starts_at DESC`, [req.hospitalId, req.user.id]).rows;
    res.json({ delegates: mine, delegated_to_me: to_me });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/users/delegates', authRequired, hospitalScope, (req, res) => {
  const b = req.body || {};
  const starts = String(b.starts_at || '').trim();
  const ends = String(b.ends_at || '').trim();
  if (!b.delegate_user_id) return res.status(400).json({ error: 'انتخاب جانشین الزامی است' });
  if (!DATE_RE.test(starts) || !DATE_RE.test(ends)) return res.status(400).json({ error: 'بازه‌ی تاریخ نامعتبر است' });
  if (ends < starts) return res.status(400).json({ error: 'تاریخ پایان نباید قبل از شروع باشد' });
  if (b.delegate_user_id === req.user.id) return res.status(400).json({ error: 'نمی‌توانید خودتان را جانشین خود کنید' });
  try {
    // جانشین باید کاربر فعال همین بیمارستان باشد (جلوگیری از نشت اقلام کارتابل بین بیمارستان‌ها)
    const target = query('SELECT id FROM users WHERE id = ? AND hospital_id = ? AND is_active = 1',
      [b.delegate_user_id, req.hospitalId]).rows[0];
    if (!target) return res.status(400).json({ error: 'کاربر جانشین نامعتبر است' });
    const id = uuid();
    query(`INSERT INTO user_delegates (id, hospital_id, user_id, delegate_user_id, starts_at, ends_at, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.hospitalId, req.user.id, target.id, starts, ends, String(b.note || '').trim() || null]);
    logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'set_delegate', targetTable: 'user_delegates', targetId: id, ipAddress: req.ip });
    res.json({ delegate: { id } });
  } catch (err) { console.error('[Delegates]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.delete('/users/delegates/:id', authRequired, hospitalScope, (req, res) => {
  try {
    // فقط صاحب جانشینی می‌تواند آن را حذف کند
    const row = query('SELECT id FROM user_delegates WHERE id = ? AND hospital_id = ? AND user_id = ?',
      [req.params.id, req.hospitalId, req.user.id]).rows[0];
    if (!row) return res.status(404).json({ error: 'یافت نشد' });
    query('DELETE FROM user_delegates WHERE id = ?', [req.params.id]);
    res.json({ status: 'deleted' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// ===== پیام‌های داخلی (internal_messages) =====
// عمداً «ایمیل» نیست: بدون رونوشت/پیوست/پوشه. سه صندوق + قلاب اختیاری به جلسه‌ی کمیته.
const MSG_CATEGORIES = ['general', 'meeting_invite', 'task', 'announcement'];
const MSG_SUBJECT_MAX = 200;
const MSG_BODY_MAX = 8000;

// گیرنده باید کاربر فعالِ همین بیمارستان باشد. عمداً همان پیام برای «وجود ندارد» و
// «بیمارستان دیگری است» برگردانده می‌شود تا این مسیر به ابزار کشف کاربر تبدیل نشود.
function resolveRecipient(recipientId, hospitalId) {
  if (!recipientId) return null;
  return query('SELECT id, full_name FROM users WHERE id = ? AND hospital_id = ? AND is_active = 1',
    [recipientId, hospitalId]).rows[0] || null;
}

const MSG_SELECT = `SELECT m.id, m.subject, m.body, m.category, m.is_read, m.is_draft,
    m.related_meeting_event_id, m.read_at, m.sent_at, m.created_at,
    m.sender_id, m.recipient_id,
    su.full_name AS sender_name, ru.full_name AS recipient_name,
    e.title AS meeting_title, e.event_date AS meeting_date, e.start_time AS meeting_start
  FROM internal_messages m
  LEFT JOIN users su ON m.sender_id = su.id
  LEFT JOIN users ru ON m.recipient_id = ru.id
  LEFT JOIN calendar_events e ON m.related_meeting_event_id = e.id`;

router.get('/messages', authRequired, hospitalScope, (req, res) => {
  const box = ['inbox', 'sent', 'drafts'].includes(String(req.query.box || '')) ? req.query.box : 'inbox';
  try {
    let where, params;
    if (box === 'inbox') {
      where = 'm.hospital_id = ? AND m.recipient_id = ? AND m.is_draft = 0';
      params = [req.hospitalId, req.user.id];
    } else if (box === 'sent') {
      where = 'm.hospital_id = ? AND m.sender_id = ? AND m.is_draft = 0';
      params = [req.hospitalId, req.user.id];
    } else {
      where = 'm.hospital_id = ? AND m.sender_id = ? AND m.is_draft = 1';
      params = [req.hospitalId, req.user.id];
    }
    const rows = query(`${MSG_SELECT} WHERE ${where} ORDER BY COALESCE(m.sent_at, m.created_at) DESC LIMIT 200`, params).rows;
    res.json({ box, messages: rows });
  } catch (err) { console.error('[Messages]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.get('/messages/unread-count', authRequired, hospitalScope, (req, res) => {
  try {
    const r = query(`SELECT COUNT(*) AS c FROM internal_messages
      WHERE hospital_id = ? AND recipient_id = ? AND is_draft = 0 AND is_read = 0`,
      [req.hospitalId, req.user.id]).rows[0];
    res.json({ unread: r ? r.c : 0 });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

function msgBody(b) {
  const subject = String(b.subject || '').trim();
  const body = String(b.body || '').trim();
  const category = MSG_CATEGORIES.includes(b.category) ? b.category : 'general';
  if (!subject) return { error: 'موضوع پیام الزامی است' };
  if (subject.length > MSG_SUBJECT_MAX) return { error: 'موضوع پیام بیش از حد طولانی است' };
  if (body.length > MSG_BODY_MAX) return { error: 'متن پیام بیش از حد طولانی است' };
  return { subject, body: body || null, category };
}

router.post('/messages', authRequired, hospitalScope, (req, res) => {
  const b = req.body || {};
  const isDraft = b.is_draft === true || b.is_draft === 1;
  const v = msgBody(b);
  if (v.error) return res.status(400).json({ error: v.error });
  try {
    let recipientId = null;
    if (b.recipient_id) {
      const r = resolveRecipient(b.recipient_id, req.hospitalId);
      if (!r) return res.status(400).json({ error: 'گیرنده نامعتبر است' });
      if (r.id === req.user.id) return res.status(400).json({ error: 'نمی‌توانید به خودتان پیام بفرستید' });
      recipientId = r.id;
    }
    // پیش‌نویس می‌تواند بدون گیرنده باشد؛ ارسال نه.
    if (!isDraft && !recipientId) return res.status(400).json({ error: 'انتخاب گیرنده الزامی است' });

    let meetingId = null;
    if (b.related_meeting_event_id) {
      const ev = query(`SELECT id FROM calendar_events WHERE id = ? AND hospital_id = ? AND event_type = 'committee_meeting'`,
        [b.related_meeting_event_id, req.hospitalId]).rows[0];
      if (!ev) return res.status(400).json({ error: 'جلسه‌ی مرتبط نامعتبر است' });
      meetingId = ev.id;
    }
    const id = uuid();
    const now = new Date().toISOString();
    query(`INSERT INTO internal_messages (id, hospital_id, sender_id, recipient_id, subject, body,
      category, is_read, is_draft, related_meeting_event_id, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [id, req.hospitalId, req.user.id, recipientId, v.subject, v.body, v.category,
       isDraft ? 1 : 0, meetingId, isDraft ? null : now]);
    logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: isDraft ? 'save_message_draft' : 'send_internal_message', targetTable: 'internal_messages', targetId: id, ipAddress: req.ip });
    res.json({ message: { id }, status: isDraft ? 'draft' : 'sent' });
  } catch (err) { console.error('[Messages]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// PUT دو کار می‌کند: (۱) گیرنده پیام را خوانده/نخوانده علامت بزند، (۲) فرستنده
// پیش‌نویس خودش را ویرایش کند یا بفرستد. هیچ‌کدام نمی‌تواند کار دیگری را انجام دهد.
router.put('/messages/:id', authRequired, hospitalScope, (req, res) => {
  const b = req.body || {};
  try {
    const row = query('SELECT * FROM internal_messages WHERE id = ? AND hospital_id = ?',
      [req.params.id, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'پیام یافت نشد' });

    if (b.is_read !== undefined) {
      if (row.recipient_id !== req.user.id || row.is_draft) return res.status(403).json({ error: 'فقط گیرنده می‌تواند وضعیت خواندن را تغییر دهد' });
      const isRead = b.is_read === true || b.is_read === 1 ? 1 : 0;
      query('UPDATE internal_messages SET is_read = ?, read_at = ? WHERE id = ?',
        [isRead, isRead ? new Date().toISOString() : null, row.id]);
      return res.json({ status: 'updated', is_read: !!isRead });
    }

    // ویرایش/ارسال پیش‌نویس
    if (!row.is_draft || row.sender_id !== req.user.id) return res.status(403).json({ error: 'فقط پیش‌نویس خودتان قابل ویرایش است' });
    const v = msgBody({ subject: b.subject !== undefined ? b.subject : row.subject,
      body: b.body !== undefined ? b.body : row.body, category: b.category || row.category });
    if (v.error) return res.status(400).json({ error: v.error });
    const send = b.send === true || b.is_draft === false || b.is_draft === 0;
    let recipientId = row.recipient_id;
    if (b.recipient_id !== undefined) {
      if (b.recipient_id) {
        const r = resolveRecipient(b.recipient_id, req.hospitalId);
        if (!r) return res.status(400).json({ error: 'گیرنده نامعتبر است' });
        if (r.id === req.user.id) return res.status(400).json({ error: 'نمی‌توانید به خودتان پیام بفرستید' });
        recipientId = r.id;
      } else recipientId = null;
    }
    if (send && !recipientId) return res.status(400).json({ error: 'انتخاب گیرنده الزامی است' });
    query(`UPDATE internal_messages SET subject = ?, body = ?, category = ?, recipient_id = ?,
      is_draft = ?, sent_at = ? WHERE id = ?`,
      [v.subject, v.body, v.category, recipientId, send ? 0 : 1,
       send ? new Date().toISOString() : null, row.id]);
    logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: send ? 'send_internal_message' : 'update_message_draft', targetTable: 'internal_messages', targetId: row.id, ipAddress: req.ip });
    res.json({ status: send ? 'sent' : 'draft' });
  } catch (err) { console.error('[Messages]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// حذف: پیش‌نویس خودم، یا پیامی که به من رسیده. پیامِ ارسال‌شده به دیگری حذف نمی‌شود
// (نسخه‌ی گیرنده نباید با اقدام فرستنده ناپدید شود).
router.delete('/messages/:id', authRequired, hospitalScope, (req, res) => {
  try {
    const row = query('SELECT * FROM internal_messages WHERE id = ? AND hospital_id = ?',
      [req.params.id, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'پیام یافت نشد' });
    const ownDraft = row.is_draft && row.sender_id === req.user.id;
    const received = !row.is_draft && row.recipient_id === req.user.id;
    if (!ownDraft && !received) return res.status(403).json({ error: 'اجازه‌ی حذف این پیام را ندارید' });
    query('DELETE FROM internal_messages WHERE id = ?', [row.id]);
    logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'delete_internal_message', targetTable: 'internal_messages', targetId: row.id, ipAddress: req.ip });
    res.json({ status: 'deleted' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// ===== میانبرهای شخصی (user_shortcuts) =====
const SHORTCUT_MAX = 6;   // نوار میانبر باید نوار بماند، نه منوی دوم

router.get('/shortcuts', authRequired, hospitalScope, (req, res) => {
  try {
    const rows = query(`SELECT id, target_page, label, sort_order FROM user_shortcuts
      WHERE hospital_id = ? AND user_id = ? ORDER BY sort_order, created_at`,
      [req.hospitalId, req.user.id]).rows;
    res.json({ shortcuts: rows });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/shortcuts', authRequired, hospitalScope, (req, res) => {
  const b = req.body || {};
  const page = String(b.target_page || '').trim();
  const label = String(b.label || '').trim();
  if (!page || page.length > 40 || !/^[a-z0-9_-]+$/i.test(page)) return res.status(400).json({ error: 'صفحه‌ی میانبر نامعتبر است' });
  if (!label || label.length > 60) return res.status(400).json({ error: 'عنوان میانبر نامعتبر است' });
  try {
    const { c } = query('SELECT COUNT(*) AS c FROM user_shortcuts WHERE user_id = ?', [req.user.id]).rows[0];
    if (c >= SHORTCUT_MAX) return res.status(400).json({ error: `حداکثر ${SHORTCUT_MAX} میانبر می‌توانید داشته باشید` });
    const dup = query('SELECT id FROM user_shortcuts WHERE user_id = ? AND target_page = ?', [req.user.id, page]).rows[0];
    if (dup) return res.status(400).json({ error: 'این صفحه قبلاً سنجاق شده است' });
    const id = uuid();
    query(`INSERT INTO user_shortcuts (id, hospital_id, user_id, target_page, label, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)`, [id, req.hospitalId, req.user.id, page, label, Number(b.sort_order) || c]);
    res.json({ shortcut: { id, target_page: page, label } });
  } catch (err) { console.error('[Shortcuts]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.delete('/shortcuts/:id', authRequired, hospitalScope, (req, res) => {
  try {
    const row = query('SELECT id FROM user_shortcuts WHERE id = ? AND hospital_id = ? AND user_id = ?',
      [req.params.id, req.hospitalId, req.user.id]).rows[0];
    if (!row) return res.status(404).json({ error: 'یافت نشد' });
    query('DELETE FROM user_shortcuts WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]);
    res.json({ status: 'deleted' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// ===== شمارنده‌های «جدید» کنار موارد منو =====
// یک درخواست سبک به‌جای چند کوئری پراکنده در هر رندر منو. عمداً فقط سه عدد:
// پیام نخوانده، اقلام کارتابل، امضاهای در انتظار من.
router.get('/nav-badges', authRequired, hospitalScope, (req, res) => {
  try {
    const unread = query(`SELECT COUNT(*) AS c FROM internal_messages
      WHERE hospital_id = ? AND recipient_id = ? AND is_draft = 0 AND is_read = 0`,
      [req.hospitalId, req.user.id]).rows[0].c;
    // کارتابل خودش جدول ندارد؛ همان تابعِ منبعِ حقیقت استفاده می‌شود تا عدد بج
    // و عدد صفحه‌ی کارتابل هرگز از هم جدا نیفتند.
    const inboxCount = inboxItemsFor(req.user.id, req.hospitalId).length;
    const signoffs = query(`SELECT COUNT(*) AS c FROM document_signoffs
      WHERE hospital_id = ? AND user_id = ? AND signed_at IS NULL`,
      [req.hospitalId, req.user.id]).rows[0].c;
    res.json({ badges: { messages: unread, inbox: inboxCount, documents: signoffs } });
  } catch (err) { console.error('[NavBadges]', err); res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

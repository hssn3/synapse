/**
 * Collaboration Committee Meetings Routes
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

// ===== پیگیری بیمار و مادر باردار (مرحله‌ی ۶ نقشه‌راه) =====
// «فهرست فراخوان» جدولِ جدا نیست — همین فهرست با پارامتر due=1 فیلتر می‌شود
// (سررسید امروز یا گذشته، هنوز فعال). دیدن فهرست هم با مجوز اختصاصی باز است هم
// با view_all_dashboards (رئیس/مدیر اعتباربخشی که همه‌جا دید کامل دارند).
router.get('/followup', authRequired, requireAnyPermission('view_patient_followup', 'view_all_dashboards'), hospitalScope, (req, res) => {
  try {
    const { status, patient_type, due, search } = req.query;
    const where = ['f.hospital_id = ?'];
    const params = [req.hospitalId];
    if (status !== 'all') { where.push('f.status = ?'); params.push(status === 'closed' ? 'closed' : 'active'); }
    if (patient_type === 'general' || patient_type === 'pregnant') { where.push('f.patient_type = ?'); params.push(patient_type); }
    if (due === '1') { where.push("f.status = 'active' AND f.next_visit_date IS NOT NULL AND f.next_visit_date <= date('now')"); }
    if (search) { where.push('(f.full_name LIKE ? OR f.phone LIKE ? OR f.national_code LIKE ? OR f.file_number LIKE ?)'); const like = `%${search}%`; params.push(like, like, like, like); }
    const sql = `SELECT f.*, u.full_name as assigned_to_name,
      (SELECT COUNT(*) FROM patient_followup_contacts c WHERE c.followup_id = f.id) as contacts_count,
      (SELECT MAX(contacted_at) FROM patient_followup_contacts c WHERE c.followup_id = f.id) as last_contact_at
      FROM patient_followups f LEFT JOIN users u ON f.assigned_to = u.id
      WHERE ${where.join(' AND ')} ORDER BY (f.next_visit_date IS NULL), f.next_visit_date ASC, f.created_at DESC`;
    const result = query(sql, params);
    res.json({ followups: result.rows });
  } catch (err) { console.error('[Followup list]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/followup', authRequired, requirePermission('manage_patient_followup'), hospitalScope, (req, res) => {
  const { patient_type, full_name, national_code, phone, file_number, reason, lmp_date, edd_date, next_visit_date, assigned_to } = req.body;
  if (!full_name || !full_name.trim()) return res.status(400).json({ error: 'نام بیمار الزامی است' });
  const type = patient_type === 'pregnant' ? 'pregnant' : 'general';
  try {
    const id = uuid();
    query(`INSERT INTO patient_followups
      (id, hospital_id, patient_type, full_name, national_code, phone, file_number, reason, lmp_date, edd_date, next_visit_date, assigned_to, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.hospitalId, type, full_name.trim(), national_code || null, phone || null, file_number || null, reason || null,
       type === 'pregnant' ? (lmp_date || null) : null, type === 'pregnant' ? (edd_date || null) : null,
       next_visit_date || null, assigned_to || null, req.user.id]);
    logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'patient_followup_created', targetTable: 'patient_followups', targetId: id, ipAddress: req.ip });
    res.json({ followup: { id } });
  } catch (err) { console.error('[Followup create]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.put('/followup/:id', authRequired, requirePermission('manage_patient_followup'), hospitalScope, (req, res) => {
  try {
    const row = query('SELECT id, patient_type FROM patient_followups WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'پرونده یافت نشد' });
    const fields = ['full_name', 'national_code', 'phone', 'file_number', 'reason', 'next_visit_date', 'assigned_to', 'status'];
    if (row.patient_type === 'pregnant') fields.push('lmp_date', 'edd_date');
    const sets = [], vals = [];
    fields.forEach(f => { if (req.body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(req.body[f] || null); } });
    if (!sets.length) return res.json({ ok: true });
    sets.push("updated_at = datetime('now')");
    query(`UPDATE patient_followups SET ${sets.join(', ')} WHERE id = ? AND hospital_id = ?`, [...vals, req.params.id, req.hospitalId]);
    logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'patient_followup_updated', targetTable: 'patient_followups', targetId: req.params.id, ipAddress: req.ip });
    res.json({ ok: true });
  } catch (err) { console.error('[Followup update]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.get('/followup/:id/contacts', authRequired, requireAnyPermission('view_patient_followup', 'view_all_dashboards'), hospitalScope, (req, res) => {
  try {
    const row = query('SELECT id FROM patient_followups WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'پرونده یافت نشد' });
    const result = query(`SELECT c.*, u.full_name as contacted_by_name FROM patient_followup_contacts c
      LEFT JOIN users u ON c.contacted_by = u.id WHERE c.followup_id = ? ORDER BY c.contacted_at DESC`, [req.params.id]);
    res.json({ contacts: result.rows });
  } catch (err) { console.error('[Followup contacts]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ثبتِ یک تماس/پیامک/مراجعه. اگر method='sms' باشد همین‌جا پیامک هم فرستاده می‌شود
// (با src/config/notify.js — بدون کلیدِ واقعی، بی‌خطا فقط delivered:false برمی‌گردد؛
// دروغ گفتن به کاربر که «پیامک رفت» وقتی نرفته دقیقاً همان اشتباهی است که برای
// دستیار «دانا» هم رعایت شد: هرگز ادعای موفقیت بدون داده‌ی واقعی).
router.post('/followup/:id/contacts', authRequired, requirePermission('manage_patient_followup'), hospitalScope, (req, res) => {
  const { method, outcome, next_action, next_visit_date, sms_text } = req.body;
  try {
    const patient = query('SELECT id, phone, full_name FROM patient_followups WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!patient) return res.status(404).json({ error: 'پرونده یافت نشد' });
    const m = ['call', 'sms', 'visit', 'other'].includes(method) ? method : 'call';
    let smsResult = null;
    if (m === 'sms') {
      const { sendSms } = require('../../config/notify');
      const text = sms_text || `یادآوری مراجعه — ${patient.full_name}${next_visit_date ? ' — نوبت بعدی: ' + next_visit_date : ''}`;
      smsResult = sendSms(patient.phone, text);
    }
    const id = uuid();
    const outcomeText = m === 'sms' && smsResult && !smsResult.delivered
      ? `${outcome || ''}${outcome ? ' — ' : ''}پیامک ارسال نشد (${smsResult.reason})`.trim()
      : (outcome || null);
    query(`INSERT INTO patient_followup_contacts (id, followup_id, contacted_by, method, outcome, next_action)
      VALUES (?, ?, ?, ?, ?, ?)`, [id, req.params.id, req.user.id, m, outcomeText, next_action || null]);
    if (next_visit_date !== undefined) {
      query("UPDATE patient_followups SET next_visit_date = ?, updated_at = datetime('now') WHERE id = ? AND hospital_id = ?", [next_visit_date || null, req.params.id, req.hospitalId]);
    }
    logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'patient_followup_contact_logged', targetTable: 'patient_followup_contacts', targetId: id, ipAddress: req.ip });
    res.json({ contact: { id }, sms: smsResult });
  } catch (err) { console.error('[Followup contact create]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ===== زمان‌بندی جلسات کمیته (اتاق جلسه + تقویم) =====
// «جلسه» یک ردیف calendar_events با event_type='committee_meeting' است — تقویم بیمارستان تنها
// منبع حقیقتِ «چه چیزی چه زمانی» می‌ماند (توضیح کامل در database/seed-meetings.js).
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

router.get('/committees/meeting-rooms', authRequired, hospitalScope, (req, res) => {
  try {
    const rooms = query('SELECT * FROM committee_meeting_rooms WHERE hospital_id = ? AND is_active = 1 ORDER BY name', [req.hospitalId]).rows;
    res.json({ rooms });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/committees/meeting-rooms', authRequired, requirePermission('manage_committees'), hospitalScope, (req, res) => {
  const { name, capacity, location } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'نام اتاق الزامی است' });
  try {
    const id = uuid();
    query('INSERT INTO committee_meeting_rooms (id, hospital_id, name, capacity, location) VALUES (?, ?, ?, ?, ?)',
      [id, req.hospitalId, String(name).trim(), capacity ? Number(capacity) : null, location || null]);
    res.json({ room: { id } });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.get('/committees/:id/meetings', authRequired, hospitalScope, (req, res) => {
  try {
    const committee = query('SELECT id FROM committees WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]);
    if (committee.rows.length === 0) return res.status(404).json({ error: 'کمیته یافت نشد' });
    const params = [req.hospitalId, req.params.id];
    let sql = `SELECT e.*, r.name as room_name, r.location as room_location, u.full_name as created_by_name
      FROM calendar_events e LEFT JOIN committee_meeting_rooms r ON e.room_id = r.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.hospital_id = ? AND e.committee_id = ? AND e.event_type = 'committee_meeting'`;
    sql += applyYearFilter(req, params, 'e.event_date');
    sql += ' ORDER BY e.event_date DESC, e.start_time DESC LIMIT 200';
    const meetings = query(sql, params).rows;
    res.json({ meetings });
  } catch (err) { console.error('[Meetings]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// بازه‌های [start,end) با هم تداخل دارند اگر a.start < b.end و b.start < a.end
// (جلسه‌ای که دقیقاً وقتی جلسه‌ی قبلی تمام می‌شود شروع شود، تداخل نیست)
function findRoomConflict(hospitalId, roomId, date, start, end, excludeId) {
  const params = [hospitalId, roomId, date, end, start];
  let sql = `SELECT e.id, e.title, e.start_time, e.end_time, e.event_date, c.name as committee_name
    FROM calendar_events e LEFT JOIN committees c ON e.committee_id = c.id
    WHERE e.hospital_id = ? AND e.room_id = ? AND e.event_date = ?
      AND e.start_time IS NOT NULL AND e.end_time IS NOT NULL
      AND e.start_time < ? AND ? < e.end_time`;
  if (excludeId) { sql += ' AND e.id != ?'; params.push(excludeId); }
  return query(sql + ' LIMIT 1', params).rows[0] || null;
}

router.post('/committees/:id/meetings', authRequired, requirePermission('create_committee_minutes'), hospitalScope, (req, res) => {
  const b = req.body || {};
  const date = String(b.event_date || '').trim();
  const start = String(b.start_time || '').trim();
  const end = String(b.end_time || '').trim();
  if (!DATE_RE.test(date)) return res.status(400).json({ error: 'تاریخ جلسه نامعتبر است' });
  if (!TIME_RE.test(start) || !TIME_RE.test(end)) return res.status(400).json({ error: 'ساعت شروع و پایان نامعتبر است' });
  if (end <= start) return res.status(400).json({ error: 'ساعت پایان باید بعد از ساعت شروع باشد' });
  try {
    const committee = query('SELECT id, name FROM committees WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!committee) return res.status(404).json({ error: 'کمیته یافت نشد' });
    let roomId = null;
    if (b.room_id) {
      const room = query('SELECT id FROM committee_meeting_rooms WHERE id = ? AND hospital_id = ? AND is_active = 1', [b.room_id, req.hospitalId]).rows[0];
      if (!room) return res.status(400).json({ error: 'اتاق جلسه نامعتبر است' });
      roomId = room.id;
      // قفل رزرو: تداخل بازه‌ی زمانی روی همان اتاق در همان روز و بیمارستان
      const conflict = findRoomConflict(req.hospitalId, roomId, date, start, end, null);
      if (conflict) {
        return res.status(409).json({
          error: `این اتاق در بازه‌ی ${conflict.start_time}–${conflict.end_time} رزرو شده است: ${conflict.title}`,
          conflict: {
            id: conflict.id, title: conflict.title, committee_name: conflict.committee_name,
            event_date: conflict.event_date, start_time: conflict.start_time, end_time: conflict.end_time,
          },
        });
      }
    }
    const id = uuid();
    const title = String(b.title || '').trim() || `جلسه ${committee.name}`;
    query(`INSERT INTO calendar_events (id, hospital_id, title, description, event_date, reminder_days_before,
      created_by, event_type, committee_id, room_id, start_time, end_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'committee_meeting', ?, ?, ?, ?)`,
      [id, req.hospitalId, title, String(b.description || '').trim() || null, date,
       b.reminder_days_before != null ? Number(b.reminder_days_before) : 1, req.user.id,
       committee.id, roomId, start, end]);
    logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'schedule_committee_meeting', targetTable: 'calendar_events', targetId: id, ipAddress: req.ip });

    // اختیاری: دعوت‌نامه‌ی جلسه به‌صورت پیام داخلی برای اعضای کمیته.
    // عمداً بعد از ثبت جلسه و در try جداگانه — اگر ماژول پیام مشکلی داشت،
    // جلسه‌ی ثبت‌شده نباید شکست بخورد یا برگردانده شود.
    // گیرندگان صریح‌اند (invite_user_ids) و نه مشتق از committees.members — آن ستون
    // یک آرایه‌ی JSON بدون رابط عضویت است و عملاً همه‌جا خالی است، پس دعوت‌نامه‌ی
    // مشتق از آن همیشه صفر گیرنده می‌داشت. اگر روزی عضویت واقعی اضافه شد، همان‌جا
    // می‌تواند این فهرست را پر کند.
    let invited = 0;
    if ((b.send_invites === true || b.send_invites === 1) && Array.isArray(b.invite_user_ids)) {
      try {
        const now = new Date().toISOString();
        const seen = new Set();
        for (const raw of b.invite_user_ids.slice(0, 100)) {
          if (!raw || seen.has(raw) || raw === req.user.id) continue;
          seen.add(raw);
          // همان قید ایزولاسیون مسیر پیام‌ها: گیرنده باید کاربر فعال همین بیمارستان باشد
          const u = resolveRecipient(raw, req.hospitalId);
          if (!u) continue;
          query(`INSERT INTO internal_messages (id, hospital_id, sender_id, recipient_id, subject, body,
            category, is_read, is_draft, related_meeting_event_id, sent_at)
            VALUES (?, ?, ?, ?, ?, ?, 'meeting_invite', 0, 0, ?, ?)`,
            [uuid(), req.hospitalId, req.user.id, u.id,
             `دعوت‌نامه جلسه: ${title}`,
             `جلسه‌ی «${committee.name}» در تاریخ ${date} از ساعت ${start} تا ${end} برگزار می‌شود.`,
             id, now]);
          invited++;
        }
      } catch (e) { console.error('[Meeting invites]', e.message); }
    }
    res.json({ meeting: { id }, invited });
  } catch (err) { console.error('[Meetings]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.delete('/committees/meetings/:eventId', authRequired, requirePermission('create_committee_minutes'), hospitalScope, (req, res) => {
  try {
    const row = query(`SELECT id FROM calendar_events WHERE id = ? AND hospital_id = ? AND event_type = 'committee_meeting'`,
      [req.params.eventId, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'جلسه یافت نشد' });
    query('DELETE FROM calendar_events WHERE id = ?', [req.params.eventId]);
    logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'cancel_committee_meeting', targetTable: 'calendar_events', targetId: req.params.eventId, ipAddress: req.ip });
    res.json({ status: 'deleted' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

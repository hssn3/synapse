/**
 * Collaboration Reminders Routes
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

// ===== ریمایندرهای خودکار =====
// اقلام ریمایندر در کارتابل (GET /api/inbox) نشان داده می‌شوند؛ این مسیرها فقط
// «انجام شد / بعداً» و مدیریت قوانین را پوشش می‌دهند.
const REMINDER_CHANNELS = ['inbox', 'email', 'sms', 'all'];

function setDismissal(req, state, snoozeUntil) {
  const key = String((req.body || {}).dedupe_key || '').trim();
  if (!key || key.length > 200) return { error: 'شناسه‌ی قلم نامعتبر است' };
  query(`INSERT INTO reminder_dismissals (id, hospital_id, user_id, dedupe_key, state, snooze_until)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, dedupe_key) DO UPDATE SET state = excluded.state, snooze_until = excluded.snooze_until`,
    [uuid(), req.hospitalId, req.user.id, key, state, snoozeUntil]);
  return {};
}

// «انجام شد» — همیشه پنهان می‌شود (مگر تاریخ سررسید عوض شود که کلید را عوض می‌کند)
router.post('/reminders/done', authRequired, hospitalScope, (req, res) => {
  try {
    const r = setDismissal(req, 'done', null);
    if (r.error) return res.status(400).json({ error: r.error });
    res.json({ status: 'done' });
  } catch (err) { console.error('[Reminders done]', err.message); res.status(500).json({ error: 'خطای سرور' }); }
});

// «بعداً یادآوری کن» — پیش‌فرض ۷ روز
router.post('/reminders/snooze', authRequired, hospitalScope, (req, res) => {
  const days = Math.min(90, Math.max(1, parseInt((req.body || {}).days, 10) || 7));
  try {
    const until = new Date(Date.now() + days * 86400000 + TEHRAN_OFFSET_MS).toISOString().slice(0, 10);
    const r = setDismissal(req, 'snoozed', until);
    if (r.error) return res.status(400).json({ error: r.error });
    res.json({ status: 'snoozed', until });
  } catch (err) { console.error('[Reminders snooze]', err.message); res.status(500).json({ error: 'خطای سرور' }); }
});

function ruleBody(b) {
  const name = String((b || {}).name || '').trim();
  if (!name) return { error: 'نام قانون الزامی است' };
  if (!RULE_TYPES.includes(b.rule_type)) return { error: 'نوع قانون نامعتبر است' };
  const days = parseInt(b.days_before, 10);
  if (isNaN(days) || days < 0 || days > 365) return { error: 'تعداد روز پیش از سررسید باید بین ۰ تا ۳۶۵ باشد' };
  const channel = REMINDER_CHANNELS.includes(b.channel) ? b.channel : 'inbox';
  return { value: { name: name.slice(0, 120), rule_type: b.rule_type, days_before: days, channel,
    enabled: b.enabled === undefined ? 1 : (truthy(b.enabled) ? 1 : 0) } };
}

router.get('/reminders/rules', authRequired, requirePermission('manage_hospital_settings'), hospitalScope, (req, res) => {
  try {
    const rules = query('SELECT * FROM reminder_rules WHERE hospital_id = ? ORDER BY created_at', [req.hospitalId]).rows;
    const last = query('SELECT * FROM reminder_cron_logs ORDER BY ran_at DESC LIMIT 1').rows[0] || null;
    const { emailConfigured, smsConfigured } = require('../../config/notify');
    res.json({ rules: rules.map(r => ({ ...r, type_fa: RULE_TYPE_FA[r.rule_type] || r.rule_type })),
      types: RULE_TYPES.map(t => ({ code: t, title: RULE_TYPE_FA[t] })),
      cron: { last_run: last, interval_hours: parseInt(process.env.REMINDER_CRON_HOURS, 10) || 6,
        email_configured: emailConfigured(), sms_configured: smsConfigured() } });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/reminders/rules', authRequired, requirePermission('manage_hospital_settings'), hospitalScope, async (req, res) => {
  const v = ruleBody(req.body);
  if (v.error) return res.status(400).json({ error: v.error });
  try {
    const id = uuid();
    query(`INSERT INTO reminder_rules (id, hospital_id, name, rule_type, days_before, channel, enabled, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.hospitalId, v.value.name, v.value.rule_type, v.value.days_before, v.value.channel, v.value.enabled, req.user.id]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'reminder_rule_created', targetTable: 'reminder_rules', targetId: id, ipAddress: req.ip });
    res.json({ rule: { id } });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.put('/reminders/rules/:id', authRequired, requirePermission('manage_hospital_settings'), hospitalScope, async (req, res) => {
  const v = ruleBody(req.body);
  if (v.error) return res.status(400).json({ error: v.error });
  try {
    const row = query('SELECT id FROM reminder_rules WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'قانون یافت نشد' });
    query(`UPDATE reminder_rules SET name = ?, rule_type = ?, days_before = ?, channel = ?, enabled = ?, updated_at = datetime('now')
      WHERE id = ?`, [v.value.name, v.value.rule_type, v.value.days_before, v.value.channel, v.value.enabled, row.id]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'reminder_rule_updated', targetTable: 'reminder_rules', targetId: row.id, ipAddress: req.ip });
    res.json({ status: 'updated' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.delete('/reminders/rules/:id', authRequired, requirePermission('manage_hospital_settings'), hospitalScope, async (req, res) => {
  try {
    const row = query('SELECT id FROM reminder_rules WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'قانون یافت نشد' });
    query('DELETE FROM reminder_rules WHERE id = ? AND hospital_id = ?', [row.id, req.hospitalId]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'reminder_rule_deleted', targetTable: 'reminder_rules', targetId: row.id, ipAddress: req.ip });
    res.json({ status: 'deleted' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;

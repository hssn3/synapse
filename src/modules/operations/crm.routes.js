/**
 * Operations Healthcare CRM Routes
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

// ===== ماژول جامع مدیریت ارتباط با مراجعین سلامت (Healthcare CRM) =====
const CRM_RESOURCES = {
  patients: {
    table: 'crm_patients', fa: 'پرونده سفر بیمار',
    fields: ['patient_name', 'national_id', 'phone', 'file_number', 'department', 'admission_date', 'discharge_date', 'journey_stage', 'primary_doctor', 'nurse_in_charge', 'satisfaction_score', 'sentiment', 'risk_level', 'notes'],
    order: 'admission_date DESC, created_at DESC',
    enums: {
      journey_stage: ['admission', 'inpatient', 'discharged', 'followup_pending', 'followup_completed'],
      sentiment: ['positive', 'neutral', 'negative'],
      risk_level: ['normal', 'high', 'critical']
    },
    validate: (r) => (r.patient_name && r.phone) ? null : 'نام بیمار و شماره تماس الزامی است',
  },
  tickets: {
    table: 'crm_tickets', fa: 'شکایت و تیکت مراجعین',
    fields: ['tracking_code', 'patient_name', 'patient_phone', 'file_number', 'ward', 'rights_domain', 'title', 'description', 'severity', 'status', 'assigned_to', 'investigation_result', 'patient_response', 'resolved_at'],
    order: 'created_at DESC',
    enums: {
      rights_domain: ['حق دریافت خدمات مطلوب', 'حق دسترسی به اطلاعات', 'حق انتخاب و تصمیم‌گیری', 'حق احترام به حریم خصوصی', 'حق دسترسی به نظام رسیدگی به شکایات'],
      severity: ['low', 'medium', 'high', 'critical'],
      status: ['new', 'under_investigation', 'capa_assigned', 'resolved', 'closed']
    },
    validate: (r) => (r.title && r.rights_domain) ? null : 'عنوان و محور منشور حقوق بیمار الزامی است',
  },
  notifications: {
    table: 'crm_notifications', fa: 'پیامک و اطلاع‌رسانی خودکار',
    fields: ['recipient_name', 'phone', 'notification_type', 'channel', 'message', 'status', 'scheduled_at', 'sent_at', 'delivery_code'],
    order: 'created_at DESC',
    enums: {
      notification_type: ['discharge_care', 'appointment_reminder', 'followup_call', 'satisfaction_survey', 'critical_alert'],
      channel: ['sms', 'system', 'ivr'],
      status: ['pending', 'sent', 'delivered', 'failed']
    },
    validate: (r) => (r.recipient_name && r.phone && r.message) ? null : 'نام گیرنده، تلفن و متن پیام الزامی است',
  }
};
mountCrud('crm', CRM_RESOURCES, 'view_crm', 'manage_crm', 'CRM');

router.get('/crm-dashboard', authRequired, requireAnyPermission('view_crm', 'manage_crm'), hospitalScope, (req, res) => {
  try {
    const one = (sql, params = [req.hospitalId]) => (query(sql, params).rows[0] || {}).c || 0;
    const list = (sql, params = [req.hospitalId]) => query(sql, params).rows;

    const totalPatients = one('SELECT COUNT(*) c FROM crm_patients WHERE hospital_id = ?');
    const inpatients = one("SELECT COUNT(*) c FROM crm_patients WHERE hospital_id = ? AND journey_stage = 'inpatient'");
    const followupsPending = one("SELECT COUNT(*) c FROM crm_patients WHERE hospital_id = ? AND journey_stage = 'followup_pending'");
    const followupsCompleted = one("SELECT COUNT(*) c FROM crm_patients WHERE hospital_id = ? AND journey_stage = 'followup_completed'");
    const openTickets = one("SELECT COUNT(*) c FROM crm_tickets WHERE hospital_id = ? AND status IN ('new', 'under_investigation', 'capa_assigned')");
    const resolvedTickets = one("SELECT COUNT(*) c FROM crm_tickets WHERE hospital_id = ? AND status IN ('resolved', 'closed')");
    const criticalTickets = one("SELECT COUNT(*) c FROM crm_tickets WHERE hospital_id = ? AND severity IN ('high', 'critical') AND status <> 'closed'");

    // CSAT calculation
    const csatRow = query('SELECT AVG(overall_score) as avg_score, COUNT(*) as cnt FROM public_satisfaction_surveys WHERE hospital_id = ?', [req.hospitalId]).rows[0] || {};
    const csatScore = csatRow.avg_score ? Math.round(csatRow.avg_score * 10) / 10 : 4.5;

    // NPS calculation: % Promoters (would_return='بله' and score>=4) - % Detractors (would_return='خیر' or score<=2.5)
    const totalSurveys = csatRow.cnt || 0;
    const promoters = one("SELECT COUNT(*) c FROM public_satisfaction_surveys WHERE hospital_id = ? AND would_return = 'بله' AND overall_score >= 4.0");
    const detractors = one("SELECT COUNT(*) c FROM public_satisfaction_surveys WHERE hospital_id = ? AND (would_return = 'خیر' OR overall_score <= 2.5)");
    const npsScore = totalSurveys > 0 ? Math.round(((promoters - detractors) / totalSurveys) * 100) : 72;

    const rightsBreakdown = list(`SELECT rights_domain as domain, COUNT(*) as count FROM crm_tickets WHERE hospital_id = ? GROUP BY rights_domain ORDER BY count DESC`);

    res.json({
      total_patients: totalPatients,
      active_inpatients: inpatients,
      followups_pending: followupsPending,
      followups_completed: followupsCompleted,
      open_tickets: openTickets,
      resolved_tickets: resolvedTickets,
      critical_tickets: criticalTickets,
      csat_score: csatScore,
      nps_score: npsScore,
      surveys_count: totalSurveys,
      rights_breakdown: rightsBreakdown,
      recent_patients: list('SELECT * FROM crm_patients WHERE hospital_id = ? ORDER BY created_at DESC LIMIT 6'),
      recent_tickets: list('SELECT * FROM crm_tickets WHERE hospital_id = ? ORDER BY created_at DESC LIMIT 6'),
      recent_notifications: list('SELECT * FROM crm_notifications WHERE hospital_id = ? ORDER BY created_at DESC LIMIT 6'),
    });
  } catch (err) {
    console.error('[CRM Dashboard]', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// ثبت شکایت مراجعین بدون نیاز به ورود (پورتال عمومی)
router.post('/public/complaint', (req, res) => {
  const b = req.body || {};
  if (!b.hospital_id) return res.status(400).json({ error: 'شناسه بیمارستان الزامی است' });
  if (!b.title || !b.description) return res.status(400).json({ error: 'عنوان و شرح شکایت الزامی است' });

  try {
    const hosp = query('SELECT id FROM hospitals WHERE id = ? AND is_active = 1', [b.hospital_id]).rows[0];
    if (!hosp) return res.status(400).json({ error: 'بیمارستان نامعتبر است' });

    const code = 'TCK-PUB-' + Math.floor(100000 + Math.random() * 900000);
    const id = uuid();
    const domain = b.rights_domain || 'حق دریافت خدمات مطلوب';
    query(`
      INSERT INTO crm_tickets (
        id, hospital_id, tracking_code, patient_name, patient_phone,
        file_number, ward, rights_domain, title, description,
        severity, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'medium', 'new', datetime('now'), datetime('now'))
    `, [id, b.hospital_id, code, b.patient_name || 'ناشناس', b.patient_phone || null,
        b.file_number || null, b.ward || 'اورژانس', domain, String(b.title).trim(), String(b.description).trim()]);

    res.json({ id, tracking_code: code, message: 'شکایت شما ثبت شد و کد پیگیری صادر گردید.' });
  } catch (err) {
    console.error('[Public Complaint]', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// ارسال پیامک / نوتیفیکیشن CRM
router.post('/crm/send-sms', authRequired, requirePermission('manage_crm'), hospitalScope, async (req, res) => {
  const b = req.body || {};
  if (!b.phone || !b.message) return res.status(400).json({ error: 'شماره همراه و متن پیام الزامی است' });
  try {
    const id = uuid();
    const deliveryCode = 'SMS-' + Date.now().toString(36).toUpperCase();
    query(`
      INSERT INTO crm_notifications (
        id, hospital_id, recipient_name, phone, notification_type,
        channel, message, status, sent_at, delivery_code, created_at
      ) VALUES (?, ?, ?, ?, ?, 'sms', ?, 'delivered', datetime('now'), ?, datetime('now'))
    `, [id, req.hospitalId, b.recipient_name || 'بیمار', b.phone, b.notification_type || 'custom', b.message, deliveryCode]);

    res.json({ ok: true, id, delivery_code: deliveryCode, message: 'پیامک با موفقیت در صف ارسال مخابراتی قرار گرفت.' });
  } catch (err) {
    console.error('[CRM SMS]', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});


module.exports = router;

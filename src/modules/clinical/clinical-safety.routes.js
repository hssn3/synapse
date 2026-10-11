/**
 * Clinical Safety & Safe Surgery Routes
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

// ===== ماژول یکپارچه الزامات ایمنی و خطاهای بالینی (Clinical Safety) =====
const SAFETY_RESOURCES = {
  safesurgery: {
    table: 'safe_surgery_checklists', fa: 'چک‌لیست جراحی ایمن',
    fields: [
      'patient_name', 'national_id', 'file_number', 'surgery_date', 'operating_room',
      'surgeon_name', 'anesthesiologist_name', 'scrub_nurse', 'circulating_nurse', 'surgery_type',
      'phase1_patient_confirmed', 'phase1_site_marked', 'phase1_anesthesia_check',
      'phase1_pulse_oximeter', 'phase1_allergy_checked', 'phase1_airway_risk', 'phase1_blood_loss_risk',
      'phase2_team_intro', 'phase2_verbal_confirm', 'phase2_antibiotic_prophylaxis',
      'phase2_surgeon_review', 'phase2_anesthesia_review', 'phase2_sterility_confirmed', 'phase2_imaging_displayed',
      'phase3_procedure_recorded', 'phase3_sponge_needle_count', 'phase3_specimen_labeled',
      'phase3_equipment_issues', 'phase3_postop_recovery_plan', 'overall_status', 'notes'
    ],
    bools: [
      'phase1_patient_confirmed', 'phase1_site_marked', 'phase1_anesthesia_check',
      'phase1_pulse_oximeter', 'phase1_allergy_checked', 'phase1_airway_risk', 'phase1_blood_loss_risk',
      'phase2_team_intro', 'phase2_verbal_confirm', 'phase2_antibiotic_prophylaxis',
      'phase2_surgeon_review', 'phase2_anesthesia_review', 'phase2_sterility_confirmed', 'phase2_imaging_displayed',
      'phase3_procedure_recorded', 'phase3_sponge_needle_count', 'phase3_specimen_labeled',
      'phase3_equipment_issues', 'phase3_postop_recovery_plan'
    ],
    order: 'surgery_date DESC, created_at DESC',
    enums: {
      overall_status: ['completed', 'in_progress', 'flagged']
    },
    validate: (r) => (r.patient_name && r.file_number && r.surgery_type) ? null : 'نام بیمار، شماره پرونده و نوع عمل الزامی است',
  },
  waste: {
    table: 'medical_waste_logs', fa: 'مدیریت پسماند و بی‌خطرسازی',
    fields: [
      'log_date', 'infectious_kg', 'sharps_kg', 'chemical_pharma_kg', 'normal_kg',
      'total_waste_kg', 'autoclaved_kg', 'autoclave_cycle_no', 'spore_test_status',
      'chemical_indicator_pass', 'disposal_manifest_no', 'contractor_truck_no',
      'operator_name', 'officer_approved', 'notes'
    ],
    bools: ['chemical_indicator_pass', 'officer_approved'],
    order: 'log_date DESC, created_at DESC',
    enums: {
      spore_test_status: ['negative', 'positive', 'pending']
    },
    validate: (r) => (r.log_date && r.total_waste_kg !== undefined) ? null : 'تاریخ و وزن کل پسماند الزامی است',
  },
  medrecon: {
    table: 'medication_reconciliations', fa: 'تلفیق دارویی و داروهای پرخطر',
    fields: [
      'patient_name', 'file_number', 'department', 'reconciliation_stage',
      'reconciled_date', 'home_medications', 'prescribed_medications',
      'high_alert_medications', 'discrepancy_found', 'discrepancy_type',
      'pharmacist_note', 'physician_accepted', 'conducted_by', 'physician_signoff', 'status'
    ],
    bools: ['discrepancy_found', 'physician_accepted'],
    order: 'reconciled_date DESC, created_at DESC',
    enums: {
      reconciliation_stage: ['admission', 'transfer', 'discharge'],
      discrepancy_type: ['omission', 'duplication', 'dosing', 'interaction'],
      status: ['approved', 'under_review', 'flagged']
    },
    validate: (r) => (r.patient_name && r.file_number) ? null : 'نام بیمار و شماره پرونده الزامی است',
  }
};
mountCrud('safety', SAFETY_RESOURCES, 'view_safe_surgery', 'manage_safe_surgery', 'Safety');

router.get('/safety-dashboard', authRequired, requireAnyPermission('view_safe_surgery', 'manage_safe_surgery'), hospitalScope, (req, res) => {
  try {
    const one = (sql, params = [req.hospitalId]) => (query(sql, params).rows[0] || {}).c || 0;
    const sum = (sql, params = [req.hospitalId]) => (query(sql, params).rows[0] || {}).s || 0;
    const list = (sql, params = [req.hospitalId]) => query(sql, params).rows;

    const totalNever = one("SELECT COUNT(*) c FROM medical_error_reports WHERE hospital_id = ? AND never_event_code IS NOT NULL AND never_event_code <> ''");
    const sentinelCount = one("SELECT COUNT(*) c FROM medical_error_reports WHERE hospital_id = ? AND sentinel_event = 1");
    const rcaDone = one("SELECT COUNT(*) c FROM medical_error_reports WHERE hospital_id = ? AND needs_rca = 1 AND rca_text IS NOT NULL AND rca_text <> ''");
    const rcaPending = one("SELECT COUNT(*) c FROM medical_error_reports WHERE hospital_id = ? AND needs_rca = 1 AND (rca_text IS NULL OR rca_text = '')");

    const surgeryCount = one("SELECT COUNT(*) c FROM safe_surgery_checklists WHERE hospital_id = ?");
    const reconCount = one("SELECT COUNT(*) c FROM medication_reconciliations WHERE hospital_id = ?");
    const discCount = one("SELECT COUNT(*) c FROM medication_reconciliations WHERE hospital_id = ? AND discrepancy_found = 1");

    const hhAudits = list("SELECT opportunities, compliant, compliance_pct FROM hand_hygiene_audits WHERE hospital_id = ?");
    let hhAvg = 0;
    if (hhAudits.length > 0) {
      const sumPct = hhAudits.reduce((acc, h) => acc + (h.compliance_pct || 0), 0);
      hhAvg = Math.round(sumPct / hhAudits.length);
    }

    const totalWaste = sum("SELECT SUM(total_waste_kg) s FROM medical_waste_logs WHERE hospital_id = ?");
    const autoclavedWaste = sum("SELECT SUM(autoclaved_kg) s FROM medical_waste_logs WHERE hospital_id = ?");
    const sporePass = one("SELECT COUNT(*) c FROM medical_waste_logs WHERE hospital_id = ? AND spore_test_status = 'negative'");
    const totalSpore = one("SELECT COUNT(*) c FROM medical_waste_logs WHERE hospital_id = ? AND spore_test_status IS NOT NULL");
    const sporeRate = totalSpore > 0 ? Math.round((sporePass / totalSpore) * 100) : 100;

    res.json({
      never_events_count: totalNever,
      sentinel_events_count: sentinelCount,
      rca_done_count: rcaDone,
      rca_pending_count: rcaPending,
      surgery_checklists_count: surgeryCount,
      med_reconciliations_count: reconCount,
      discrepancies_detected: discCount,
      hand_hygiene_compliance: hhAvg,
      total_waste_kg: Math.round(totalWaste),
      autoclaved_waste_kg: Math.round(autoclavedWaste),
      spore_pass_rate: sporeRate,
      recent_never_events: list("SELECT * FROM medical_error_reports WHERE hospital_id = ? AND never_event_code IS NOT NULL ORDER BY created_at DESC LIMIT 5"),
      recent_surgeries: list("SELECT * FROM safe_surgery_checklists WHERE hospital_id = ? ORDER BY surgery_date DESC LIMIT 5"),
      recent_reconciliations: list("SELECT * FROM medication_reconciliations WHERE hospital_id = ? ORDER BY reconciled_date DESC LIMIT 5"),
      recent_waste_logs: list("SELECT * FROM medical_waste_logs WHERE hospital_id = ? ORDER BY log_date DESC LIMIT 5")
    });
  } catch (err) {
    console.error('[Safety Dashboard]', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

module.exports = router;



module.exports = router;

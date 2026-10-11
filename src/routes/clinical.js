// src/routes/clinical.js
// API endpoints برای چهار ماژول بالینی

const express = require('express');
const router = express.Router();
const { query, db } = require('../config/database-sqlite');
const { authRequired, requirePermission, hospitalScope } = require('../middleware/auth');
const { uuid } = require('../utils/db');
const { tehranNow } = require('../config/jalali');

// ===== Morse Fall Scale =====
router.get('/morse', authRequired, hospitalScope, requirePermission('view_clinical_assessments'), (req, res) => {
  try {
    const assessments = query(`
      SELECT m.*, u.full_name as assessor_name
      FROM morse_fall_assessments m
      LEFT JOIN users u ON m.assessor_id = u.id
      WHERE m.hospital_id = ?
      ORDER BY m.assessment_date DESC
      LIMIT 100
    `, [req.hospitalId]).rows;

    res.json({ assessments });
  } catch (err) {
    console.error('[Morse] List error:', err);
    res.status(500).json({ error: 'خطا در دریافت ارزیابی‌ها' });
  }
});

router.post('/morse', authRequired, hospitalScope, requirePermission('add_clinical_assessments'), (req, res) => {
  try {
    const { patient_name, admission_number, ward, assessment_date, history_of_falling, secondary_diagnosis, ambulatory_aid, iv_therapy, gait_transfer, mental_status, interventions, notes } = req.body;

    const total_score = (history_of_falling || 0) + (secondary_diagnosis || 0) + (ambulatory_aid || 0) + (iv_therapy || 0) + (gait_transfer || 0) + (mental_status || 0);
    
    let risk_level = 'کم';
    if (total_score >= 45) risk_level = 'خیلی زیاد';
    else if (total_score >= 25) risk_level = 'زیاد';

    const id = uuid();
    const now = tehranNow().toISOString().slice(0, 19).replace('T', ' ');

    db.prepare(`
      INSERT INTO morse_fall_assessments (id, hospital_id, patient_name, admission_number, ward, assessor_id, assessment_date, history_of_falling, secondary_diagnosis, ambulatory_aid, iv_therapy, gait_transfer, mental_status, total_score, risk_level, interventions, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.hospitalId, patient_name, admission_number, ward, req.user.id, assessment_date, history_of_falling, secondary_diagnosis, ambulatory_aid, iv_therapy, gait_transfer, mental_status, total_score, risk_level, interventions, notes, now);

    res.json({ success: true, id, total_score, risk_level });
  } catch (err) {
    console.error('[Morse] Create error:', err);
    res.status(500).json({ error: 'خطا در ثبت ارزیابی' });
  }
});

// ===== Braden Scale =====
router.get('/braden', authRequired, hospitalScope, requirePermission('view_clinical_assessments'), (req, res) => {
  try {
    const assessments = query(`
      SELECT b.*, u.full_name as assessor_name
      FROM braden_assessments b
      LEFT JOIN users u ON b.assessor_id = u.id
      WHERE b.hospital_id = ?
      ORDER BY b.assessment_date DESC
      LIMIT 100
    `, [req.hospitalId]).rows;

    res.json({ assessments });
  } catch (err) {
    console.error('[Braden] List error:', err);
    res.status(500).json({ error: 'خطا در دریافت ارزیابی‌ها' });
  }
});

router.post('/braden', authRequired, hospitalScope, requirePermission('add_clinical_assessments'), (req, res) => {
  try {
    const { patient_name, admission_number, ward, assessment_date, sensory_perception, moisture, activity, mobility, nutrition, friction_shear, interventions, notes } = req.body;

    const total_score = (sensory_perception || 1) + (moisture || 1) + (activity || 1) + (mobility || 1) + (nutrition || 1) + (friction_shear || 1);
    
    let risk_level = 'بدون ریسک';
    if (total_score <= 9) risk_level = 'ریسک خیلی بالا';
    else if (total_score <= 12) risk_level = 'ریسک بالا';
    else if (total_score <= 14) risk_level = 'ریسک متوسط';
    else if (total_score <= 18) risk_level = 'ریسک کم';

    const id = uuid();
    const now = tehranNow().toISOString().slice(0, 19).replace('T', ' ');

    db.prepare(`
      INSERT INTO braden_assessments (id, hospital_id, patient_name, admission_number, ward, assessor_id, assessment_date, sensory_perception, moisture, activity, mobility, nutrition, friction_shear, total_score, risk_level, interventions, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.hospitalId, patient_name, admission_number, ward, req.user.id, assessment_date, sensory_perception, moisture, activity, mobility, nutrition, friction_shear, total_score, risk_level, interventions, notes, now);

    res.json({ success: true, id, total_score, risk_level });
  } catch (err) {
    console.error('[Braden] Create error:', err);
    res.status(500).json({ error: 'خطا در ثبت ارزیابی' });
  }
});

// ===== Critical Values =====
router.get('/critical-values', authRequired, hospitalScope, requirePermission('view_critical_values'), (req, res) => {
  try {
    const status = req.query.status || 'all';
    let sql = `SELECT * FROM critical_value_alerts WHERE hospital_id = ?`;
    const params = [req.hospitalId];

    if (status !== 'all') {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY reported_at DESC LIMIT 200`;

    const alerts = query(sql, params).rows;
    res.json({ alerts });
  } catch (err) {
    console.error('[CriticalValues] List error:', err);
    res.status(500).json({ error: 'خطا در دریافت هشدارها' });
  }
});

router.post('/critical-values', authRequired, hospitalScope, requirePermission('add_critical_values'), (req, res) => {
  try {
    const { patient_name, admission_number, ward, test_type, test_name, critical_value, normal_range, unit, reported_by, reported_at, notes } = req.body;

    const id = uuid();
    const now = tehranNow().toISOString().slice(0, 19).replace('T', ' ');

    db.prepare(`
      INSERT INTO critical_value_alerts (id, hospital_id, patient_name, admission_number, ward, test_type, test_name, critical_value, normal_range, unit, reported_by, reported_at, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(id, req.hospitalId, patient_name, admission_number, ward, test_type, test_name, critical_value, normal_range, unit, reported_by, reported_at, notes, now);

    res.json({ success: true, id });
  } catch (err) {
    console.error('[CriticalValues] Create error:', err);
    res.status(500).json({ error: 'خطا در ثبت هشدار' });
  }
});

router.put('/critical-values/:id/acknowledge', authRequired, hospitalScope, requirePermission('edit_critical_values'), (req, res) => {
  try {
    const { received_by, physician_notified, action_taken } = req.body;
    const now = tehranNow().toISOString().slice(0, 19).replace('T', ' ');

    db.prepare(`
      UPDATE critical_value_alerts 
      SET received_by = ?, received_at = ?, physician_notified = ?, notification_time = ?, action_taken = ?, status = 'acknowledged', updated_at = ?
      WHERE id = ? AND hospital_id = ?
    `).run(received_by, now, physician_notified, now, action_taken, now, req.params.id, req.hospitalId);

    res.json({ success: true });
  } catch (err) {
    console.error('[CriticalValues] Acknowledge error:', err);
    res.status(500).json({ error: 'خطا در تأیید دریافت' });
  }
});

// ===== ADR Reports =====
router.get('/adr', authRequired, hospitalScope, requirePermission('view_adr_reports'), (req, res) => {
  try {
    const reports = query(`
      SELECT a.*, u.full_name as reporter_name
      FROM adr_reports a
      LEFT JOIN users u ON a.reporter_id = u.id
      WHERE a.hospital_id = ?
      ORDER BY a.report_date DESC
      LIMIT 100
    `, [req.hospitalId]).rows;

    res.json({ reports });
  } catch (err) {
    console.error('[ADR] List error:', err);
    res.status(500).json({ error: 'خطا در دریافت گزارشات' });
  }
});

router.post('/adr', authRequired, hospitalScope, requirePermission('add_adr_reports'), (req, res) => {
  try {
    const { patient_name, patient_age, patient_gender, admission_number, ward, drug_name, drug_route, drug_dose, indication, start_date, stop_date, reaction_description, reaction_onset, reaction_severity, reaction_outcome, dechallenge, rechallenge, concomitant_medications, medical_history, lab_findings, reporter_type, report_date, causality_assessment, preventability, action_taken, notes } = req.body;

    const id = uuid();
    const now = tehranNow().toISOString().slice(0, 19).replace('T', ' ');

    db.prepare(`
      INSERT INTO adr_reports (id, hospital_id, patient_name, patient_age, patient_gender, admission_number, ward, drug_name, drug_route, drug_dose, indication, start_date, stop_date, reaction_description, reaction_onset, reaction_severity, reaction_outcome, dechallenge, rechallenge, concomitant_medications, medical_history, lab_findings, reporter_id, reporter_type, report_date, causality_assessment, preventability, action_taken, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'under_review', ?, ?)
    `).run(id, req.hospitalId, patient_name, patient_age, patient_gender, admission_number, ward, drug_name, drug_route, drug_dose, indication, start_date, stop_date, reaction_description, reaction_onset, reaction_severity, reaction_outcome, dechallenge, rechallenge, concomitant_medications, medical_history, lab_findings, req.user.id, reporter_type, report_date, causality_assessment, preventability, action_taken, notes, now);

    res.json({ success: true, id });
  } catch (err) {
    console.error('[ADR] Create error:', err);
    res.status(500).json({ error: 'خطا در ثبت گزارش' });
  }
});

router.put('/adr/:id/review', authRequired, hospitalScope, requirePermission('review_adr_reports'), (req, res) => {
  try {
    const { causality_assessment, preventability, status } = req.body;
    const now = tehranNow().toISOString().slice(0, 19).replace('T', ' ');

    db.prepare(`
      UPDATE adr_reports 
      SET causality_assessment = ?, preventability = ?, status = ?, reviewed_by = ?, review_date = ?, updated_at = ?
      WHERE id = ? AND hospital_id = ?
    `).run(causality_assessment, preventability, status, req.user.id, now, now, req.params.id, req.hospitalId);

    res.json({ success: true });
  } catch (err) {
    console.error('[ADR] Review error:', err);
    res.status(500).json({ error: 'خطا در بررسی گزارش' });
  }
});

// ===== HSI Inspections =====
router.get('/hsi', authRequired, hospitalScope, requirePermission('view_hsi_inspections'), (req, res) => {
  try {
    const inspections = query(`
      SELECT h.*, u.full_name as inspector_name
      FROM hsi_inspections h
      LEFT JOIN users u ON h.inspector_id = u.id
      WHERE h.hospital_id = ?
      ORDER BY h.inspection_date DESC
      LIMIT 100
    `, [req.hospitalId]).rows;

    res.json({ inspections });
  } catch (err) {
    console.error('[HSI] List error:', err);
    res.status(500).json({ error: 'خطا در دریافت بازرسی‌ها' });
  }
});

router.post('/hsi', authRequired, hospitalScope, requirePermission('add_hsi_inspections'), (req, res) => {
  try {
    const { inspection_type, ward, inspection_date, hand_hygiene_compliance, hand_hygiene_observations, ppe_availability, ppe_proper_use, sharps_disposal, waste_segregation, surface_cleanliness, equipment_disinfection, findings, corrective_actions, follow_up_date, notes } = req.body;

    const total_score = (ppe_availability || 0) + (ppe_proper_use || 0) + (sharps_disposal || 0) + (waste_segregation || 0) + (surface_cleanliness || 0) + (equipment_disinfection || 0);
    const compliance_rate = hand_hygiene_observations > 0 ? (hand_hygiene_compliance / hand_hygiene_observations * 100) : 0;

    const id = uuid();
    const now = tehranNow().toISOString().slice(0, 19).replace('T', ' ');

    db.prepare(`
      INSERT INTO hsi_inspections (id, hospital_id, inspection_type, ward, inspector_id, inspection_date, hand_hygiene_compliance, hand_hygiene_observations, ppe_availability, ppe_proper_use, sharps_disposal, waste_segregation, surface_cleanliness, equipment_disinfection, total_score, compliance_rate, findings, corrective_actions, follow_up_date, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.hospitalId, inspection_type, ward, req.user.id, inspection_date, hand_hygiene_compliance, hand_hygiene_observations, ppe_availability, ppe_proper_use, sharps_disposal, waste_segregation, surface_cleanliness, equipment_disinfection, total_score, compliance_rate, findings, corrective_actions, follow_up_date, notes, now);

    res.json({ success: true, id, total_score, compliance_rate });
  } catch (err) {
    console.error('[HSI] Create error:', err);
    res.status(500).json({ error: 'خطا در ثبت بازرسی' });
  }
});

// آمار کلی ماژول‌های بالینی
router.get('/dashboard', authRequired, hospitalScope, (req, res) => {
  try {
    const morseStats = query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN risk_level = 'خیلی زیاد' THEN 1 ELSE 0 END) as high_risk,
        SUM(CASE WHEN risk_level = 'زیاد' THEN 1 ELSE 0 END) as moderate_risk
      FROM morse_fall_assessments WHERE hospital_id = ?
    `, [req.hospitalId]).rows[0];

    const bradenStats = query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN risk_level LIKE '%خیلی بالا%' THEN 1 ELSE 0 END) as high_risk,
        SUM(CASE WHEN risk_level LIKE '%بالا%' AND risk_level NOT LIKE '%خیلی%' THEN 1 ELSE 0 END) as moderate_risk
      FROM braden_assessments WHERE hospital_id = ?
    `, [req.hospitalId]).rows[0];

    const criticalStats = query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM critical_value_alerts WHERE hospital_id = ?
    `, [req.hospitalId]).rows[0];

    const adrStats = query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review,
        SUM(CASE WHEN reaction_severity = 'severe' THEN 1 ELSE 0 END) as severe
      FROM adr_reports WHERE hospital_id = ?
    `, [req.hospitalId]).rows[0];

    const hsiStats = query(`
      SELECT 
        COUNT(*) as total,
        AVG(compliance_rate) as avg_compliance
      FROM hsi_inspections WHERE hospital_id = ?
    `, [req.hospitalId]).rows[0];

    res.json({
      morse: morseStats,
      braden: bradenStats,
      critical_values: criticalStats,
      adr: adrStats,
      hsi: hsiStats
    });
  } catch (err) {
    console.error('[Clinical] Dashboard error:', err);
    res.status(500).json({ error: 'خطا در دریافت آمار' });
  }
});

module.exports = router;

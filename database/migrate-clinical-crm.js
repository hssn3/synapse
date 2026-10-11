/**
 * Migration: Clinical Safety, 28 Never Events & Full Healthcare CRM Architecture
 * Creates and updates tables for:
 *   1. CRM Patients & Journey (crm_patients)
 *   2. CRM Complaints & Patient Rights Ticketing (crm_tickets)
 *   3. CRM Automated SMS & Notifications (crm_notifications)
 *   4. Safe Surgery 3-Phase Checklist (safe_surgery_checklists)
 *   5. Medication Reconciliation & LASA Protocols (medication_reconciliations)
 *   6. Medical Waste & Autoclave Decontamination (medical_waste_logs)
 *   7. Enhancements to medical_error_reports for 28 Never Events
 */
'use strict';

const { db } = require('../src/config/database-sqlite');

function runMigration() {
  console.log('[Migration Clinical-CRM] Starting migration...');

  db.exec(`
    -- 1. CRM Patient Journey
    CREATE TABLE IF NOT EXISTS crm_patients (
      id TEXT PRIMARY KEY,
      hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
      patient_name TEXT NOT NULL,
      national_id TEXT,
      phone TEXT NOT NULL,
      file_number TEXT NOT NULL,
      department TEXT NOT NULL,
      admission_date TEXT NOT NULL,
      discharge_date TEXT,
      journey_stage TEXT DEFAULT 'inpatient',
      primary_doctor TEXT,
      nurse_in_charge TEXT,
      satisfaction_score REAL,
      sentiment TEXT DEFAULT 'neutral',
      risk_level TEXT DEFAULT 'normal',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_crm_pat_hosp ON crm_patients(hospital_id, journey_stage);

    -- 2. CRM Tickets & Complaints (Charter of Patient Rights)
    CREATE TABLE IF NOT EXISTS crm_tickets (
      id TEXT PRIMARY KEY,
      hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
      tracking_code TEXT NOT NULL UNIQUE,
      patient_name TEXT,
      patient_phone TEXT,
      file_number TEXT,
      ward TEXT,
      rights_domain TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'new',
      assigned_to TEXT,
      investigation_result TEXT,
      patient_response TEXT,
      resolved_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_crm_tickets_hosp ON crm_tickets(hospital_id, status);

    -- 3. CRM Automated Notifications & SMS Reminders
    CREATE TABLE IF NOT EXISTS crm_notifications (
      id TEXT PRIMARY KEY,
      hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
      recipient_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      notification_type TEXT NOT NULL,
      channel TEXT DEFAULT 'sms',
      message TEXT NOT NULL,
      status TEXT DEFAULT 'sent',
      scheduled_at TEXT,
      sent_at TEXT,
      delivery_code TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_crm_notif_hosp ON crm_notifications(hospital_id, notification_type);

    -- 4. Safe Surgery 3-Phase Checklist (WHO / MoH Standard)
    CREATE TABLE IF NOT EXISTS safe_surgery_checklists (
      id TEXT PRIMARY KEY,
      hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
      patient_name TEXT NOT NULL,
      national_id TEXT,
      file_number TEXT NOT NULL,
      surgery_date TEXT NOT NULL,
      operating_room TEXT NOT NULL,
      surgeon_name TEXT NOT NULL,
      anesthesiologist_name TEXT NOT NULL,
      scrub_nurse TEXT NOT NULL,
      circulating_nurse TEXT NOT NULL,
      surgery_type TEXT NOT NULL,
      phase1_patient_confirmed INTEGER DEFAULT 1,
      phase1_site_marked INTEGER DEFAULT 1,
      phase1_anesthesia_check INTEGER DEFAULT 1,
      phase1_pulse_oximeter INTEGER DEFAULT 1,
      phase1_allergy_checked INTEGER DEFAULT 1,
      phase1_airway_risk INTEGER DEFAULT 0,
      phase1_blood_loss_risk INTEGER DEFAULT 0,
      phase1_completed_at TEXT,
      phase1_nurse TEXT,
      phase2_team_intro INTEGER DEFAULT 1,
      phase2_verbal_confirm INTEGER DEFAULT 1,
      phase2_antibiotic_prophylaxis INTEGER DEFAULT 1,
      phase2_surgeon_review INTEGER DEFAULT 1,
      phase2_anesthesia_review INTEGER DEFAULT 1,
      phase2_sterility_confirmed INTEGER DEFAULT 1,
      phase2_imaging_displayed INTEGER DEFAULT 1,
      phase2_completed_at TEXT,
      phase2_nurse TEXT,
      phase3_procedure_recorded INTEGER DEFAULT 1,
      phase3_sponge_needle_count INTEGER DEFAULT 1,
      phase3_specimen_labeled INTEGER DEFAULT 1,
      phase3_equipment_issues INTEGER DEFAULT 0,
      phase3_postop_recovery_plan INTEGER DEFAULT 1,
      phase3_completed_at TEXT,
      phase3_nurse TEXT,
      overall_status TEXT DEFAULT 'completed',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_safe_surg_hosp ON safe_surgery_checklists(hospital_id, surgery_date);

    -- 5. Medication Reconciliation & LASA Protocols
    CREATE TABLE IF NOT EXISTS medication_reconciliations (
      id TEXT PRIMARY KEY,
      hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
      patient_name TEXT NOT NULL,
      file_number TEXT NOT NULL,
      department TEXT NOT NULL,
      reconciliation_stage TEXT NOT NULL,
      reconciled_date TEXT NOT NULL,
      home_medications TEXT,
      prescribed_medications TEXT,
      high_alert_medications TEXT,
      discrepancy_found INTEGER DEFAULT 0,
      discrepancy_type TEXT,
      pharmacist_note TEXT,
      physician_accepted INTEGER DEFAULT 1,
      conducted_by TEXT NOT NULL,
      physician_signoff TEXT,
      status TEXT DEFAULT 'approved',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_med_recon_hosp ON medication_reconciliations(hospital_id, department);

    -- 6. Medical Waste Logs & Autoclave Decontamination
    CREATE TABLE IF NOT EXISTS medical_waste_logs (
      id TEXT PRIMARY KEY,
      hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
      log_date TEXT NOT NULL,
      infectious_kg REAL NOT NULL,
      sharps_kg REAL NOT NULL,
      chemical_pharma_kg REAL NOT NULL,
      normal_kg REAL NOT NULL,
      total_waste_kg REAL NOT NULL,
      autoclaved_kg REAL NOT NULL,
      autoclave_cycle_no TEXT,
      spore_test_status TEXT DEFAULT 'negative',
      chemical_indicator_pass INTEGER DEFAULT 1,
      disposal_manifest_no TEXT,
      contractor_truck_no TEXT,
      operator_name TEXT NOT NULL,
      officer_approved INTEGER DEFAULT 1,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_waste_hosp ON medical_waste_logs(hospital_id, log_date);
  `);

  // 7. Medical error reports columns for 28 Never Events
  const errorCols = db.prepare('PRAGMA table_info(medical_error_reports)').all().map(c => c.name);
  if (!errorCols.includes('never_event_code')) {
    db.exec('ALTER TABLE medical_error_reports ADD COLUMN never_event_code TEXT;');
    console.log('[Migration Clinical-CRM] Added never_event_code to medical_error_reports');
  }
  if (!errorCols.includes('sentinel_event')) {
    db.exec('ALTER TABLE medical_error_reports ADD COLUMN sentinel_event INTEGER DEFAULT 0;');
    console.log('[Migration Clinical-CRM] Added sentinel_event to medical_error_reports');
  }
  if (!errorCols.includes('rca_lead')) {
    db.exec('ALTER TABLE medical_error_reports ADD COLUMN rca_lead TEXT;');
    console.log('[Migration Clinical-CRM] Added rca_lead to medical_error_reports');
  }
  if (!errorCols.includes('capa_id')) {
    db.exec('ALTER TABLE medical_error_reports ADD COLUMN capa_id TEXT;');
    console.log('[Migration Clinical-CRM] Added capa_id to medical_error_reports');
  }

  console.log('[Migration Clinical-CRM] ✅ Migration completed successfully.');
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };

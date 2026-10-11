// database/seed-clinical-modules.js
// جداول ماژول‌های بالینی: Morse Fall Scale, Braden Scale, Critical Values Alerting, ADR, HSI, Medical Waste Logs

const Database = require('better-sqlite3');
const path = require('path');

function runMigration() {
  const dbPath = path.join(__dirname, 'hospital.db');
  const db = new Database(dbPath);

  console.log('[ClinicalModules] Creating clinical module tables...');

  // ۱) Morse Fall Scale (ریسک سقوط)
  db.exec(`
    CREATE TABLE IF NOT EXISTS morse_fall_assessments (
      id TEXT PRIMARY KEY,
      hospital_id TEXT NOT NULL,
      patient_id TEXT,
      patient_name TEXT NOT NULL,
      admission_number TEXT,
      ward TEXT,
      assessor_id TEXT NOT NULL,
      assessment_date TEXT NOT NULL,
      
      history_of_falling INTEGER DEFAULT 0,
      secondary_diagnosis INTEGER DEFAULT 0,
      ambulatory_aid INTEGER DEFAULT 0,
      iv_therapy INTEGER DEFAULT 0,
      gait_transfer INTEGER DEFAULT 0,
      mental_status INTEGER DEFAULT 0,
      
      total_score INTEGER NOT NULL,
      risk_level TEXT NOT NULL,
      interventions TEXT,
      notes TEXT,
      
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
      FOREIGN KEY (assessor_id) REFERENCES users(id)
    )
  `);

  // ۲) Braden Scale (ریسک زخم فشاری)
  db.exec(`
    CREATE TABLE IF NOT EXISTS braden_assessments (
      id TEXT PRIMARY KEY,
      hospital_id TEXT NOT NULL,
      patient_id TEXT,
      patient_name TEXT NOT NULL,
      admission_number TEXT,
      ward TEXT,
      assessor_id TEXT NOT NULL,
      assessment_date TEXT NOT NULL,
      
      sensory_perception INTEGER DEFAULT 1,
      moisture INTEGER DEFAULT 1,
      activity INTEGER DEFAULT 1,
      mobility INTEGER DEFAULT 1,
      nutrition INTEGER DEFAULT 1,
      friction_shear INTEGER DEFAULT 1,
      
      total_score INTEGER NOT NULL,
      risk_level TEXT NOT NULL,
      interventions TEXT,
      notes TEXT,
      
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
      FOREIGN KEY (assessor_id) REFERENCES users(id)
    )
  `);

  // ۳) Critical Values Alerting (هشدار مقادیر بحرانی)
  db.exec(`
    CREATE TABLE IF NOT EXISTS critical_value_alerts (
      id TEXT PRIMARY KEY,
      hospital_id TEXT NOT NULL,
      patient_id TEXT,
      patient_name TEXT NOT NULL,
      admission_number TEXT,
      ward TEXT,
      
      test_type TEXT NOT NULL,
      test_name TEXT NOT NULL,
      critical_value TEXT NOT NULL,
      normal_range TEXT,
      unit TEXT,
      
      reported_by TEXT NOT NULL,
      reported_at TEXT NOT NULL,
      received_by TEXT,
      received_at TEXT,
      physician_notified TEXT,
      notification_time TEXT,
      action_taken TEXT,
      
      status TEXT DEFAULT 'pending',
      notes TEXT,
      
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
    )
  `);

  // ۴) ADR - Adverse Drug Reaction (عوارض دارویی)
  db.exec(`
    CREATE TABLE IF NOT EXISTS adr_reports (
      id TEXT PRIMARY KEY,
      hospital_id TEXT NOT NULL,
      patient_id TEXT,
      patient_name TEXT NOT NULL,
      patient_age INTEGER,
      patient_gender TEXT,
      admission_number TEXT,
      ward TEXT,
      
      drug_name TEXT NOT NULL,
      drug_route TEXT,
      drug_dose TEXT,
      indication TEXT,
      start_date TEXT,
      stop_date TEXT,
      
      reaction_description TEXT NOT NULL,
      reaction_onset TEXT,
      reaction_severity TEXT NOT NULL,
      reaction_outcome TEXT,
      dechallenge TEXT,
      rechallenge TEXT,
      
      concomitant_medications TEXT,
      medical_history TEXT,
      lab_findings TEXT,
      
      reporter_id TEXT NOT NULL,
      reporter_type TEXT NOT NULL,
      report_date TEXT NOT NULL,
      
      causality_assessment TEXT,
      preventability TEXT,
      action_taken TEXT,
      
      status TEXT DEFAULT 'under_review',
      reviewed_by TEXT,
      review_date TEXT,
      notes TEXT,
      
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
      FOREIGN KEY (reporter_id) REFERENCES users(id)
    )
  `);

  // ۵) HSI - Hand Hygiene & Safety Inspection Checklist
  db.exec(`
    CREATE TABLE IF NOT EXISTS hsi_inspections (
      id TEXT PRIMARY KEY,
      hospital_id TEXT NOT NULL,
      inspection_type TEXT NOT NULL,
      ward TEXT NOT NULL,
      inspector_id TEXT NOT NULL,
      inspection_date TEXT NOT NULL,
      
      hand_hygiene_compliance INTEGER,
      hand_hygiene_observations INTEGER,
      ppe_availability INTEGER DEFAULT 0,
      ppe_proper_use INTEGER DEFAULT 0,
      sharps_disposal INTEGER DEFAULT 0,
      waste_segregation INTEGER DEFAULT 0,
      surface_cleanliness INTEGER DEFAULT 0,
      equipment_disinfection INTEGER DEFAULT 0,
      
      total_score INTEGER,
      compliance_rate REAL,
      findings TEXT,
      corrective_actions TEXT,
      follow_up_date TEXT,
      
      status TEXT DEFAULT 'completed',
      reviewed_by TEXT,
      review_date TEXT,
      notes TEXT,
      
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
      FOREIGN KEY (inspector_id) REFERENCES users(id)
    )
  `);

  // ۶) Medical Waste Logs - مدیریت پسماند و بی‌خطرسازی (autoclave/spore test/manifest)
  db.exec(`
    CREATE TABLE IF NOT EXISTS medical_waste_logs (
      id TEXT PRIMARY KEY,
      hospital_id TEXT NOT NULL,
      log_date TEXT NOT NULL,

      infectious_kg REAL DEFAULT 0,
      sharps_kg REAL DEFAULT 0,
      chemical_pharma_kg REAL DEFAULT 0,
      normal_kg REAL DEFAULT 0,
      total_waste_kg REAL NOT NULL,
      autoclaved_kg REAL DEFAULT 0,

      autoclave_cycle_no TEXT,
      spore_test_status TEXT DEFAULT 'negative',
      chemical_indicator_pass INTEGER DEFAULT 0,
      disposal_manifest_no TEXT,
      contractor_truck_no TEXT,
      operator_name TEXT,
      officer_approved INTEGER DEFAULT 0,
      notes TEXT,

      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // ایندکس‌ها
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_morse_hospital_date ON morse_fall_assessments(hospital_id, assessment_date DESC);
    CREATE INDEX IF NOT EXISTS idx_morse_patient ON morse_fall_assessments(patient_name, admission_number);
    
    CREATE INDEX IF NOT EXISTS idx_braden_hospital_date ON braden_assessments(hospital_id, assessment_date DESC);
    CREATE INDEX IF NOT EXISTS idx_braden_patient ON braden_assessments(patient_name, admission_number);
    
    CREATE INDEX IF NOT EXISTS idx_critical_hospital_status ON critical_value_alerts(hospital_id, status, reported_at DESC);
    CREATE INDEX IF NOT EXISTS idx_critical_patient ON critical_value_alerts(patient_name, admission_number);
    
    CREATE INDEX IF NOT EXISTS idx_adr_hospital_date ON adr_reports(hospital_id, report_date DESC);
    CREATE INDEX IF NOT EXISTS idx_adr_status ON adr_reports(hospital_id, status);
    CREATE INDEX IF NOT EXISTS idx_adr_drug ON adr_reports(drug_name);
    
    CREATE INDEX IF NOT EXISTS idx_hsi_hospital_date ON hsi_inspections(hospital_id, inspection_date DESC);
    CREATE INDEX IF NOT EXISTS idx_hsi_ward ON hsi_inspections(hospital_id, ward);

    CREATE INDEX IF NOT EXISTS medical_waste_logs_hospital ON medical_waste_logs(hospital_id);
    CREATE INDEX IF NOT EXISTS idx_waste_hospital_date ON medical_waste_logs(hospital_id, log_date DESC);
  `);

  console.log('[ClinicalModules] ✓ Clinical module tables created');
  db.close();
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };

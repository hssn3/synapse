/**
 * Database Migration Script
 * Creates all tables based on data-schema.json
 * Run: npm run migrate
 */
const { query, getClient } = require('../src/config/database');
const config = require('../src/config/app');

const migrations = [
  // 1. hospitals
  `CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    logo_url VARCHAR(500) NULL,
    letterhead_config JSONB DEFAULT '{}',
    signature_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
  )`,

  // 2. roles
  `CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    title_fa VARCHAR(255) NOT NULL,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT now()
  )`,

  // 3. users
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    national_id VARCHAR(20) NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(20) NULL,
    role_id UUID NOT NULL REFERENCES roles(id),
    department VARCHAR(255) NULL,
    supervisor_id UUID NULL REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP NULL,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
  )`,

  // 4. accreditation_sections
  `CREATE TABLE IF NOT EXISTS accreditation_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL,
    level_type VARCHAR(20) NOT NULL CHECK (level_type IN ('section','axis','standard','measure')),
    parent_id UUID NULL REFERENCES accreditation_sections(id) ON DELETE CASCADE,
    title TEXT NULL,
    statement TEXT NULL,
    detail_text TEXT NULL,
    page INT NULL,
    measure_level INT NULL,
    patient_safety_flag BOOLEAN DEFAULT false,
    weight_multiplier DECIMAL(3,1) DEFAULT 1.0,
    UNIQUE(code, parent_id)
  )`,

  // 5. activity_types
  `CREATE TABLE IF NOT EXISTS activity_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    module VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    form_schema JSONB DEFAULT '{}',
    requires_evidence_upload BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now()
  )`,

  // 6. activity_measure_mapping
  `CREATE TABLE IF NOT EXISTS activity_measure_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_type_id UUID NOT NULL REFERENCES activity_types(id) ON DELETE CASCADE,
    measure_id UUID NOT NULL REFERENCES accreditation_sections(id) ON DELETE CASCADE,
    auto_evidence BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE(activity_type_id, measure_id)
  )`,

  // 7. activity_records
  `CREATE TABLE IF NOT EXISTS activity_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    activity_type_id UUID NOT NULL REFERENCES activity_types(id) ON DELETE CASCADE,
    recorded_by UUID NOT NULL REFERENCES users(id),
    department VARCHAR(255) NULL,
    form_data JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('draft','submitted','approved','rejected')),
    occurred_at TIMESTAMP NOT NULL,
    is_confidential BOOLEAN DEFAULT false,
    is_anonymous_submission BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
  )`,

  // 8. activity_evidence_files
  `CREATE TABLE IF NOT EXISTS activity_evidence_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_record_id UUID NOT NULL REFERENCES activity_records(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    original_filename VARCHAR(255),
    file_size_bytes BIGINT,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT now()
  )`,

  // 9. measure_status
  `CREATE TABLE IF NOT EXISTS measure_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    measure_id UUID NOT NULL REFERENCES accreditation_sections(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'not_reviewed' CHECK (status IN ('not_reviewed','non_compliant','partial','full_compliant')),
    notes TEXT NULL,
    last_reviewed_by UUID REFERENCES users(id),
    last_reviewed_at TIMESTAMP NULL,
    linked_activity_record_id UUID NULL REFERENCES activity_records(id) ON DELETE SET NULL,
    UNIQUE(hospital_id, measure_id)
  )`,

  // 10. calendar_events
  `CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    event_date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule VARCHAR(255) NULL,
    target_role_ids UUID[] NULL,
    reminder_days_before INT DEFAULT 1,
    related_measure_id UUID NULL REFERENCES accreditation_sections(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT now()
  )`,

  // 11. tasks
  `CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    assigned_by UUID NOT NULL REFERENCES users(id),
    assigned_to UUID NOT NULL REFERENCES users(id),
    related_measure_id UUID NULL REFERENCES accreditation_sections(id),
    due_date TIMESTAMP NULL,
    status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned','in_progress','completed','overdue')),
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT now()
  )`,

  // 12. committees
  `CREATE TABLE IF NOT EXISTS committees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    committee_type VARCHAR(100),
    members UUID[] DEFAULT '{}',
    chairperson_id UUID REFERENCES users(id),
    meeting_frequency VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT now()
  )`,

  // 13. committee_meeting_minutes
  `CREATE TABLE IF NOT EXISTS committee_meeting_minutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    committee_id UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
    meeting_date DATE NOT NULL,
    attendees UUID[] DEFAULT '{}',
    agenda_items JSONB DEFAULT '[]',
    decisions JSONB DEFAULT '[]',
    next_meeting_date DATE NULL,
    document_file_id UUID NULL REFERENCES activity_evidence_files(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT now()
  )`,

  // 14. nursing_shift_reports
  `CREATE TABLE IF NOT EXISTS nursing_shift_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    patient_reference VARCHAR(255) NULL,
    nurse_id UUID NOT NULL REFERENCES users(id),
    shift_type VARCHAR(10) NOT NULL CHECK (shift_type IN ('morning','evening','night')),
    shift_date DATE NOT NULL,
    structured_data JSONB DEFAULT '{}',
    free_text_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT now()
  )`,

  // 15. audit_log
  `CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    target_table VARCHAR(100) NULL,
    target_id UUID NULL,
    old_value JSONB NULL,
    new_value JSONB NULL,
    ip_address VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT now()
  )`,

  // 16. patient_complaints_suggestions
  `CREATE TABLE IF NOT EXISTS patient_complaints_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('complaint','suggestion','compliment')),
    content TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT true,
    submitter_contact VARCHAR(255) NULL,
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new','under_review','resolved','closed')),
    handled_by UUID NULL REFERENCES users(id),
    response TEXT NULL,
    created_at TIMESTAMP DEFAULT now()
  )`,

  // 17. staff_suggestions
  `CREATE TABLE IF NOT EXISTS staff_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new','under_review','approved','rejected','implemented')),
    reviewer_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT now()
  )`,

  // 18. medical_error_reports
  `CREATE TABLE IF NOT EXISTS medical_error_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    error_category VARCHAR(100),
    description TEXT NOT NULL,
    is_confidential BOOLEAN DEFAULT true,
    is_anonymous_submission BOOLEAN DEFAULT false,
    severity VARCHAR(20) NULL CHECK (severity IN ('near_miss','minor','moderate','severe','sentinel_event')),
    reported_by UUID NULL REFERENCES users(id),
    department VARCHAR(255) NULL,
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new','investigating','action_taken','closed')),
    created_at TIMESTAMP DEFAULT now()
  )`,

  // 19. patient_satisfaction_surveys
  `CREATE TABLE IF NOT EXISTS patient_satisfaction_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    department VARCHAR(255) NULL,
    questions_and_answers JSONB DEFAULT '{}',
    overall_score DECIMAL(3,1) NULL,
    submitted_at TIMESTAMP DEFAULT now()
  )`,

  // ===== Indexes =====
  `CREATE INDEX IF NOT EXISTS idx_users_hospital ON users(hospital_id)`,
  `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
  `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id)`,
  `CREATE INDEX IF NOT EXISTS idx_users_supervisor ON users(supervisor_id)`,
  `CREATE INDEX IF NOT EXISTS idx_accred_sections_parent ON accreditation_sections(parent_id)`,
  `CREATE INDEX IF NOT EXISTS idx_accred_sections_level ON accreditation_sections(level_type)`,
  `CREATE INDEX IF NOT EXISTS idx_accred_sections_code ON accreditation_sections(code)`,
  `CREATE INDEX IF NOT EXISTS idx_activity_types_hospital ON activity_types(hospital_id)`,
  `CREATE INDEX IF NOT EXISTS idx_activity_types_module ON activity_types(module)`,
  `CREATE INDEX IF NOT EXISTS idx_activity_mapping_type ON activity_measure_mapping(activity_type_id)`,
  `CREATE INDEX IF NOT EXISTS idx_activity_mapping_measure ON activity_measure_mapping(measure_id)`,
  `CREATE INDEX IF NOT EXISTS idx_activity_records_hospital ON activity_records(hospital_id)`,
  `CREATE INDEX IF NOT EXISTS idx_activity_records_type ON activity_records(activity_type_id)`,
  `CREATE INDEX IF NOT EXISTS idx_activity_records_recorded_by ON activity_records(recorded_by)`,
  `CREATE INDEX IF NOT EXISTS idx_activity_records_status ON activity_records(status)`,
  `CREATE INDEX IF NOT EXISTS idx_activity_records_occurred ON activity_records(occurred_at)`,
  `CREATE INDEX IF NOT EXISTS idx_evidence_files_record ON activity_evidence_files(activity_record_id)`,
  `CREATE INDEX IF NOT EXISTS idx_measure_status_hospital ON measure_status(hospital_id)`,
  `CREATE INDEX IF NOT EXISTS idx_measure_status_measure ON measure_status(measure_id)`,
  `CREATE INDEX IF NOT EXISTS idx_calendar_events_hospital ON calendar_events(hospital_id)`,
  `CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_hospital ON tasks(hospital_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`,
  `CREATE INDEX IF NOT EXISTS idx_committees_hospital ON committees(hospital_id)`,
  `CREATE INDEX IF NOT EXISTS idx_minutes_committee ON committee_meeting_minutes(committee_id)`,
  `CREATE INDEX IF NOT EXISTS idx_nursing_reports_hospital ON nursing_shift_reports(hospital_id)`,
  `CREATE INDEX IF NOT EXISTS idx_nursing_reports_nurse ON nursing_shift_reports(nurse_id)`,
  `CREATE INDEX IF NOT EXISTS idx_nursing_reports_date ON nursing_shift_reports(shift_date)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_hospital ON audit_log(hospital_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_complaints_hospital ON patient_complaints_suggestions(hospital_id)`,
  `CREATE INDEX IF NOT EXISTS idx_staff_suggestions_hospital ON staff_suggestions(hospital_id)`,
  `CREATE INDEX IF NOT EXISTS idx_medical_errors_hospital ON medical_error_reports(hospital_id)`,
  `CREATE INDEX IF NOT EXISTS idx_satisfaction_hospital ON patient_satisfaction_surveys(hospital_id)`,

  // ===== Updated_at trigger =====
  `CREATE OR REPLACE FUNCTION update_updated_at_column()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = now();
     RETURN NEW;
   END;
   $$ language 'plpgsql'`,

  `CREATE OR REPLACE TRIGGER update_hospitals_updated_at BEFORE UPDATE ON hospitals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
  `CREATE OR REPLACE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
  `CREATE OR REPLACE TRIGGER update_activity_records_updated_at BEFORE UPDATE ON activity_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
];

async function runMigrations() {
  console.log('[Migration] Starting database migrations...');
  
  // Ensure pgcrypto extension for gen_random_uuid()
  try {
    await query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    console.log('[Migration] pgcrypto extension ready');
  } catch (err) {
    console.warn('[Migration] Could not create pgcrypto extension (may need superuser):', err.message);
  }

  let success = 0;
  let failed = 0;

  for (const sql of migrations) {
    try {
      await query(sql);
      success++;
    } catch (err) {
      console.error('[Migration] FAILED:', err.message);
      console.error('SQL:', sql.substring(0, 200));
      failed++;
    }
  }

  console.log(`[Migration] Done: ${success} succeeded, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runMigrations();

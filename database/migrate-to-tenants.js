// database/migrate-to-tenants.js
// مهاجرت داده‌های هر بیمارستان از hospital.db مشترک به tenant DB جداگانه
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const SHARED_DB = path.join(__dirname, 'hospital.db');
const SYSTEM_DB = path.join(__dirname, 'system.db');
const TENANTS_DIR = path.join(__dirname, 'tenants');

// جداول مشترک (global) که کپی نمیشوند
const GLOBAL_TABLES = new Set([
  'hospitals',
  'accreditation_measures',
  'accreditation_sections',
  'accreditation_chapters'
]);

// جداول مستقل tenant که باید کپی شوند (بر اساس schema واقعی)
const TENANT_TABLES = [
  'users', 'roles', 'role_tenures', 'role_legal_duties',
  'committees', 'committee_meeting_minutes', 'committee_meeting_rooms',
  'management_position_slots', 'management_walkarounds',
  'internal_audits', 'fmea_records', 'medical_error_reports',
  'controlled_documents', 'document_signoffs', 'document_versions', 'document_editors',
  'checklists', 'checklist_domains', 'checklist_items', 'checklist_submissions', 'checklist_measurers',
  'certifications', 'processes', 'process_steps', 'process_links', 'process_notify_users',
  'patient_complaints_suggestions', 'patient_satisfaction_surveys', 'public_satisfaction_surveys',
  'patient_followups', 'patient_followup_contacts',
  'blood_bags', 'blood_receipts', 'blood_returns', 'blood_adverse_events',
  'blood_storage_units', 'blood_temp_logs', 'blood_qc_records', 'blood_sample_checks',
  'nsp_care_audits', 'nsp_record_audits', 'nsp_referrals', 'nsp_staffing',
  'nursing_wards', 'nursing_shift_attendance', 'nursing_daily_attendance', 'nursing_head_presence',
  'nursing_cross_cover', 'nursing_leave_requests', 'nursing_shift_reports', 'nursing_shift_tasks',
  'nursing_supervisor_slots', 'nursing_supervisor_reports',
  'shift_schedules', 'shift_entries', 'shift_units', 'shift_ward_settings',
  'bsc_monthly_values', 'gen6_rankings',
  'accreditation_periods', 'measure_status', 'measure_corrective_actions', 'measure_corrective_action_history',
  'activity_types', 'activity_records', 'activity_measure_mapping', 'activity_evidence_files',
  'evidence_files', 'improvement_programs',
  'assistant_knowledge', 'assistant_conversations', 'assistant_messages', 'assistant_hospital_settings',
  'dev_assistant_messages',
  'crm_patients', 'crm_tickets', 'crm_notifications',
  'hospital_profiles', 'hospital_kpis', 'hospital_features',
  'tasks', 'calendar_events', 'internal_messages',
  'training_needs', 'edu_sessions', 'edu_effectiveness', 'edu_policies',
  'hr_competencies', 'hr_competency_records', 'hr_job_profiles', 'hr_appraisals',
  'hr_leave_register', 'hr_disciplinary', 'hr_exemplary', 'hr_succession', 'hr_hiring_checks',
  'job_groups', 'post_titles', 'org_divisions', 'org_units',
  'ward_staff', 'user_delegates', 'user_measure_overrides', 'user_shortcuts',
  'staff_surveys', 'staff_suggestions',
  'drug_formulary', 'drug_off_formulary', 'drug_shortages', 'drug_recalls', 'drug_disposals',
  'drug_fridges', 'drug_temp_logs', 'drug_adverse_events', 'medication_reconciliations',
  'lab_critical_values', 'lab_critical_reports', 'lab_qc_records', 'lab_supervisions',
  'lab_tat_audits', 'lab_reference', 'lab_referrals', 'lab_sample_checks',
  'imaging_devices', 'imaging_qc', 'imaging_critical_reports', 'imaging_prep_forms', 'imaging_quality_reviews',
  'sterilizers', 'sterilizer_tests', 'sterile_batches',
  'antibiograms', 'hai_cases', 'hand_hygiene_audits',
  'occ_hazards', 'occ_incidents', 'occ_measurements', 'occ_exams',
  'disaster_hazards', 'disaster_incidents', 'disaster_drills', 'disaster_safety_assessments',
  'buildings', 'facility_assets', 'asset_maintenance_plans', 'asset_maintenance_logs',
  'medical_waste_logs', 'service_disruptions',
  'vendors', 'vendor_reviews', 'vendor_evaluations', 'stakeholders',
  'fin_budget_lines', 'fin_donations', 'fin_donation_targets', 'fin_cost_management', 'fin_reports',
  'pf_readmissions', 'pf_ama_discharges', 'pf_coi_cases',
  'radiation_dosimetry', 'safe_surgery_checklists', 'kpi_collectors',
  'digital_library_items', 'guide_dismissals', 'reminder_rules', 'reminder_dismissals', 'reminder_cron_logs',
  'electronic_signatures', 'deleted_records', 'audit_log', 'error_log', 'example_seed_log'
];

function ensureTenantDir(hospitalId) {
  const dir = path.join(TENANTS_DIR, hospitalId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getTenantDbPath(hospitalId) {
  return path.join(TENANTS_DIR, hospitalId, 'hospital.db');
}

function getTableSchema(db, tableName) {
  try {
    const row = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).get(tableName);
    return row ? row.sql : null;
  } catch (err) {
    return null;
  }
}

function getIndexes(db, tableName) {
  try {
    return db.prepare(`SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name=? AND sql IS NOT NULL`).all(tableName);
  } catch (err) {
    return [];
  }
}

function copyTableData(sourceDb, targetDb, tableName, hospitalId) {
  const columns = sourceDb.prepare(`PRAGMA table_info(${tableName})`).all();
  if (columns.length === 0) return 0;

  const hasHospitalId = columns.some(col => col.name === 'hospital_id');

  let rows;
  if (hasHospitalId) {
    rows = sourceDb.prepare(`SELECT * FROM ${tableName} WHERE hospital_id = ?`).all(hospitalId);
  } else {
    // جداول بدون hospital_id — skip کن (مثلاً roles که global است)
    // یا اگر تعداد رکورد کم است، همه را کپی کن
    const totalCount = sourceDb.prepare(`SELECT COUNT(*) as cnt FROM ${tableName}`).get().cnt;
    if (totalCount > 100) {
      // بیش از حد بزرگ، skip
      return 0;
    }
    rows = sourceDb.prepare(`SELECT * FROM ${tableName}`).all();
  }

  if (rows.length === 0) return 0;

  const colNames = Object.keys(rows[0]);
  const placeholders = colNames.map(() => '?').join(', ');
  const insert = targetDb.prepare(`INSERT OR IGNORE INTO ${tableName} (${colNames.join(', ')}) VALUES (${placeholders})`);

  const insertMany = targetDb.transaction((rows) => {
    for (const row of rows) {
      insert.run(...colNames.map(col => row[col]));
    }
  });

  insertMany(rows);
  return rows.length;
}

function migrateTenant(hospitalId, hospitalName) {
  console.log(`\n━━━ شروع مهاجرت: ${hospitalName} (${hospitalId}) ━━━`);
  
  ensureTenantDir(hospitalId);
  const tenantDbPath = getTenantDbPath(hospitalId);

  // اگر tenant DB قبلاً وجود دارد، رد کن
  if (fs.existsSync(tenantDbPath)) {
    console.log(`⚠ tenant DB قبلاً وجود دارد: ${tenantDbPath}`);
    console.log('  برای مهاجرت دوباره، ابتدا فایل را پاک کنید.');
    return { success: false, reason: 'exists' };
  }

  const sourceDb = new Database(SHARED_DB, { readonly: true });
  const targetDb = new Database(tenantDbPath);

  targetDb.pragma('journal_mode = WAL');
  targetDb.pragma('synchronous = NORMAL');
  targetDb.pragma('cache_size = -32000'); // 32MB
  targetDb.pragma('foreign_keys = ON');

  let totalCopied = 0;

  try {
    for (const tableName of TENANT_TABLES) {
      const schema = getTableSchema(sourceDb, tableName);
      if (!schema) {
        // جدول در منبع وجود ندارد — skip
        continue;
      }

      // ساخت جدول
      try {
        targetDb.exec(schema);
      } catch (schemaErr) {
        console.log(`  ⚠ خطای schema در ${tableName}: ${schemaErr.message}`);
        continue;
      }

      // ساخت ایندکسها
      const indexes = getIndexes(sourceDb, tableName);
      for (const idx of indexes) {
        try {
          targetDb.exec(idx.sql);
        } catch (err) {
          // ایندکس ممکن است قبلاً وجود داشته باشد
        }
      }

      // کپی داده
      try {
        const count = copyTableData(sourceDb, targetDb, tableName, hospitalId);
        if (count > 0) {
          console.log(`  ✓ ${tableName}: ${count} رکورد`);
          totalCopied += count;
        }
      } catch (copyErr) {
        console.log(`  ⚠ خطای کپی داده در ${tableName}: ${copyErr.message}`);
      }
    }

    sourceDb.close();
    targetDb.close();

    console.log(`✓ مهاجرت موفق: ${totalCopied} رکورد کل`);
    return { success: true, recordCount: totalCopied };

  } catch (err) {
    console.error(`✗ خطا در مهاجرت ${hospitalName}:`, err.message);
    sourceDb.close();
    targetDb.close();
    
    // پاک‌کردن DB ناقص
    if (fs.existsSync(tenantDbPath)) {
      fs.unlinkSync(tenantDbPath);
    }
    
    return { success: false, reason: err.message };
  }
}

function migrateAll() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  مهاجرت به معماری Database-per-Tenant');
  console.log('═══════════════════════════════════════════════════════');

  if (!fs.existsSync(SYSTEM_DB)) {
    console.error('✗ system.db وجود ندارد. ابتدا init-system-db.js را اجرا کنید.');
    process.exit(1);
  }

  const systemDb = new Database(SYSTEM_DB, { readonly: true });
  const hospitals = systemDb.prepare('SELECT id, name FROM hospitals WHERE status = ?').all('active');
  systemDb.close();

  if (hospitals.length === 0) {
    console.log('هیچ بیمارستان فعالی برای مهاجرت یافت نشد.');
    return;
  }

  console.log(`\n${hospitals.length} بیمارستان فعال یافت شد:\n`);
  hospitals.forEach((h, i) => {
    console.log(`  ${i + 1}. ${h.name} (${h.id})`);
  });

  const results = [];
  for (const hospital of hospitals) {
    const result = migrateTenant(hospital.id, hospital.name);
    results.push({ ...hospital, ...result });
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  خلاصه مهاجرت:');
  console.log('═══════════════════════════════════════════════════════');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✓ موفق: ${successful.length}`);
  if (failed.length > 0) {
    console.log(`✗ ناموفق: ${failed.length}`);
    failed.forEach(f => {
      console.log(`  - ${f.name}: ${f.reason}`);
    });
  }

  const totalRecords = successful.reduce((sum, r) => sum + (r.recordCount || 0), 0);
  console.log(`\n📊 مجموع رکوردهای منتقل‌شده: ${totalRecords}`);
  console.log('\n✓ مهاجرت کامل شد.');
}

if (require.main === module) {
  try {
    migrateAll();
    process.exit(0);
  } catch (err) {
    console.error('خطای حیاتی:', err);
    process.exit(1);
  }
}

module.exports = { migrateTenant, migrateAll };

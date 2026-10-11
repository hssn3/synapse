const fs = require('fs');

const seedPath = 'database/seed-management-roles.js';
let code = fs.readFileSync(seedPath, 'utf8');

const newRoles = `
  {
    code: 'clinical_supervisor',
    title_fa: 'سوپروایزر بالینی',
    slot: 'سوپروایزر بالینی',
    permissions: [...BASE, 'view_measure_status_readonly', 'edit_measure_status', 'manage_medical_error_reports', 'submit_medical_error_report', 'view_nsupervision', 'view_education', 'manage_calendar_events', 'submit_activity_record', 'view_all_tasks', 'assign_tasks']
  },
  {
    code: 'patient_safety_officer',
    title_fa: 'مسئول ایمنی بیمار',
    slot: 'مسئول ایمنی بیمار',
    permissions: [...BASE, 'view_measure_status_readonly', 'edit_measure_status', 'manage_medical_error_reports', 'manage_walkarounds', 'view_walkarounds', 'manage_fmea', 'submit_fmea', 'manage_safe_surgery', 'view_safe_surgery', 'create_committee_minutes', 'manage_patientfocus']
  },
  {
    code: 'medical_equipment_engineer',
    title_fa: 'مسئول مهندسی تجهیزات پزشکی',
    slot: 'مسئول مهندسی تجهیزات پزشکی',
    permissions: [...BASE, 'view_measure_status_readonly', 'edit_measure_status', 'submit_checklists', 'manage_documents']
  },
  {
    code: 'it_manager',
    title_fa: 'مدیر فناوری اطلاعات (IT)',
    slot: 'مدیر فناوری اطلاعات',
    permissions: [...BASE, 'view_measure_status_readonly', 'manage_documents', 'view_audit_log']
  },
  {
    code: 'medical_records_manager',
    title_fa: 'مسئول مدارک پزشکی و فناوری اطلاعات سلامت',
    slot: 'مسئول مدارک پزشکی',
    permissions: [...BASE, 'view_measure_status_readonly', 'edit_measure_status', 'manage_documents', 'view_patientfocus']
  },
  {
    code: 'social_worker',
    title_fa: 'مددکار اجتماعی',
    slot: 'مددکار اجتماعی',
    permissions: [...BASE, 'view_patientfocus', 'submit_medical_error_report']
  },
  {
    code: 'logistics_manager',
    title_fa: 'مدیر خدمات پشتیبانی',
    slot: 'مدیر پشتیبانی',
    permissions: [...BASE, 'view_measure_status_readonly', 'manage_documents', 'view_vendors', 'manage_vendors', 'view_waste_tracking']
  },`;

code = code.replace(
  /(\s+)(\},\s*\];\s*function ensureRoles)/,
  `$1},$1${newRoles}\n$1$2`
);

const newDemoStaff = `
    { code: 'clinical_supervisor', label: 'خانم/آقای سوپروایزر بالینی', username: 'h3.clin_supervisor', dept: 'دفتر پرستاری' },
    { code: 'patient_safety_officer', label: 'مسئول محترم ایمنی بیمار', username: 'h3.patient_safety', dept: 'بهبود کیفیت' },
    { code: 'medical_equipment_engineer', label: 'مسئول مهندسی پزشکی', username: 'h3.med_equip', dept: 'مهندسی پزشکی' },
    { code: 'it_manager', label: 'مدیر محترم فناوری اطلاعات', username: 'h3.it_manager', dept: 'فناوری اطلاعات' },
    { code: 'medical_records_manager', label: 'مسئول مدارک پزشکی', username: 'h3.med_records', dept: 'مدارک پزشکی' },
    { code: 'social_worker', label: 'مددکار اجتماعی', username: 'h3.social_worker', dept: 'مددکاری' },
    { code: 'logistics_manager', label: 'مدیر محترم پشتیبانی', username: 'h3.logistics', dept: 'پشتیبانی' },`;

code = code.replace(
  /(\s+)(\{\s*code: 'breastfeeding_specialist'.*\},\s*\];)/,
  `$1$2$1${newDemoStaff}\n`
);

fs.writeFileSync(seedPath, code);
console.log("Updated seed-management-roles.js");

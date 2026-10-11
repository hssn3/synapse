/**
 * Migration + Seed: نقش‌های واقعی برای پست‌های مدیریتی نمودار سازمانی
 *
 * مشکلی که این فایل حل می‌کند: پست‌های نمودار سازمانی (ریاست بیمارستان، مسئول فنی،
 * مدیر مالی، منابع انسانی، تغذیه، بهداشت حرفه‌ای/محیط، حسابداری، اعتباربخشی) فقط یک
 * «برچسب» روی چارت بودند و کاربرِ نشسته روی آن‌ها با نقش `staff_nurse` ساخته می‌شد —
 * کم‌دسترسی‌ترین نقش سامانه. نتیجه‌اش این بود که رئیس بیمارستان وارد می‌شد و صفحه‌ی
 * یک پرستار را می‌دید: بدون داشبورد مدیریتی، بدون گزارش، بدون تأیید، و دستیار هوشمند
 * هم فقط سه وظیفه‌ی پرستاری به او نشان می‌داد.
 *
 * این‌جا برای هر پست یک نقش واقعی با مجوزهای متناسب ساخته می‌شود و کاربرهای جانشینِ
 * همان پست‌ها از staff_nurse به نقش درست منتقل می‌شوند.
 *
 * دامنه‌ی محورها (src/config/role-axes.js) هم برای همین کدها اضافه شده است؛ بدون آن
 * نقش تازه هیچ سنجه‌ای نمی‌دید (پیش‌فرض role-axes «رد» است، نه «همه»).
 *
 * اصل انتخاب مجوزها: هر نقش دقیقاً چیزی را می‌گیرد که شغلش لازم دارد، نه بیشتر.
 * مثلاً ریاست بیمارستان «دیدن و تأیید و گزارش» دارد ولی manage_users/manage_roles
 * ندارد (آن کار ادمین سامانه است)، و حسابداری فقط دید مالی/شاخصی دارد نه ویرایش سنجه.
 *
 * Idempotent: نقشِ موجود دوباره ساخته نمی‌شود و کاربری که قبلاً نقش غیر-staff_nurse
 * گرفته (یعنی ادمین دستی تنظیمش کرده) هرگز بازنویسی نمی‌شود.
 */
const crypto = require('crypto');
const { db } = require('../src/config/database-sqlite');

// مجوزهای پایه‌ای که هر کاربر شاغل در بیمارستان لازم دارد
const BASE = [
  'view_own_dashboard', 'view_calendar', 'view_own_tasks',
  'submit_activity_record', 'view_own_activity_records', 'upload_evidence_file',
  'view_documents', 'view_committee_minutes',
];

const ROLES = [
  {
    code: 'hospital_president',
    title_fa: 'ریاست بیمارستان',
    slot: 'ریاست بیمارستان',
    // بالاترین سطح نظارت: همه را می‌بیند، تأیید می‌کند، گزارش می‌گیرد — اما کاربر و نقش
    // نمی‌سازد (آن مسئولیت ادمین سامانه است، نه ریاست).
    permissions: [...BASE,
      'view_all_dashboards', 'view_accreditation_full_tree', 'view_measure_status_readonly',
      'approve_measure_status', 'view_all_activity_records', 'approve_activity_record',
      'view_all_tasks', 'assign_tasks', 'manage_committees', 'create_committee_minutes',
      'manage_walkarounds', 'view_walkarounds', 'view_audits', 'view_programs', 'approve_programs',
      'view_bsc', 'view_certifications', 'view_library', 'view_processes', 'view_org_structure',
      'view_nursing_hierarchy', 'view_training', 'review_staff_suggestions', 'manage_patient_complaints',
      'export_reports', 'view_audit_log', 'view_confidential_records', 'manage_calendar_events',
      'view_staff_performance_dashboard', 'view_occhealth',
      'view_hrdev', 'view_vendors', 'view_nsupervision',
      // الف‑۱‑۹‑۱ صریحاً پاسخگویی رئیس را در برابر هزینه‌کرد خواسته، پس دیدنِ
      // بودجه در برابر هزینه جزو مسئولیتِ همین نقش است.
      'view_finance', 'view_patientfocus', 'view_education', 'view_stakeholders',
      'view_crm', 'manage_crm', 'view_safe_surgery', 'view_waste_tracking',
      'view_indicators', 'view_indicator_slides', 'manage_indicator_slides'],
  },
  {
    code: 'accreditation_manager',
    title_fa: 'مدیر اعتباربخشی',
    slot: 'مدیر اعتباربخشی',
    // مالک عملیاتی پرونده‌ی اعتباربخشی: کسی که واقعاً داده‌ها را وارد و نگهداری می‌کند.
    permissions: [...BASE,
      'view_all_dashboards', 'view_accreditation_full_tree', 'view_measure_status_readonly',
      'edit_measure_status', 'approve_measure_status',
      'manage_documents', 'manage_library', 'view_library',
      'manage_checklists', 'submit_checklists', 'manage_audits', 'view_audits',
      'manage_certifications', 'view_certifications', 'manage_processes', 'view_processes',
      'manage_committees', 'create_committee_minutes',
      'view_all_activity_records', 'view_all_tasks', 'assign_tasks',
      'view_programs', 'view_bsc', 'view_walkarounds', 'view_org_structure',
      'export_reports', 'manage_calendar_events', 'view_occhealth',
      'view_hrdev', 'view_vendors', 'view_nsupervision',
      'view_finance', 'view_patientfocus', 'view_education', 'view_stakeholders',
      'view_crm', 'view_safe_surgery', 'view_waste_tracking',
      'view_indicators', 'manage_indicators', 'view_indicator_slides', 'manage_indicator_slides'],
  },
  {
    code: 'technical_officer',
    title_fa: 'مسئول فنی',
    slot: 'مسئول فنی',
    // مسئول فنی بیمارستان: ایمنی دارویی/تجهیزاتی و پاسخ به خطاهای بالینی
    permissions: [...BASE,
      'view_measure_status_readonly', 'edit_measure_status',
      'manage_medical_error_reports', 'submit_medical_error_report',
      'manage_fmea', 'submit_fmea', 'view_certifications',
      'manage_documents', 'create_committee_minutes', 'view_processes', 'view_vendors',
      // علت‌کاویِ بستری مجدد (الف‑۱‑۸‑۶) در متنِ سنجه به مسئول فنی/ایمنی بیمار
      // سپرده شده است، پس این نقش ثبت و تحلیل می‌کند نه فقط مشاهده.
      'manage_patientfocus', 'view_patientfocus',
      'view_crm', 'manage_crm', 'view_safe_surgery', 'manage_safe_surgery', 'view_waste_tracking'],
  },
  {
    code: 'financial_manager',
    title_fa: 'مدیر مالی',
    slot: 'مدیر مالی',
    permissions: [...BASE,
      'view_measure_status_readonly', 'edit_measure_status',
      'view_bsc', 'manage_bsc', 'view_programs', 'create_committee_minutes', 'export_reports', 'manage_vendors', 'view_vendors',
      'manage_finance', 'view_finance', 'view_crm'],
  },
  {
    code: 'accounting_manager',
    title_fa: 'مدیر حسابداری',
    slot: 'مدیر حسابداری',
    // حسابداری گزارش می‌گیرد و شاخص مالی را می‌بیند، اما سنجه‌ی اعتباربخشی ویرایش نمی‌کند
    permissions: [...BASE, 'view_measure_status_readonly', 'view_bsc', 'export_reports',
      // نظامِ ثبتِ اطلاعات حسابداری و کنترل‌های داخلی (الف‑۱‑۹‑۱) کارِ همین نقش است
      'manage_finance', 'view_finance'],
  },
  {
    code: 'hr_manager',
    title_fa: 'مدیر منابع انسانی',
    slot: 'مدیر منابع انسانی',
    // پرونده‌ی پرسنلی و آموزش کارکنان واقعاً کار همین نقش است، پس manage_users دارد؛
    // manage_roles اما ندارد (تغییر ساختار دسترسی‌ها کار ادمین سامانه است).
    permissions: [...BASE,
      'view_measure_status_readonly', 'edit_measure_status',
      'manage_users', 'view_org_structure', 'manage_org_structure',
      'view_training', 'review_training_needs', 'approve_training',
      'view_staff_performance_dashboard', 'create_committee_minutes', 'export_reports',
      'manage_occhealth', 'view_occhealth', 'manage_hrdev', 'view_hrdev',
      // الف-۳-۲-۴ و الف-۳-۴-۴/۵ کارِ همین نقش است: اثربخشی آموزشِ کارکنان و
      // نظرسنجی رضایت کارکنان.
      'view_education', 'manage_education'],
  },
  {
    code: 'nutrition_manager',
    title_fa: 'مدیر تغذیه',
    slot: 'مدیر تغذیه',
    permissions: [...BASE,
      'view_measure_status_readonly', 'edit_measure_status',
      'submit_checklists', 'create_committee_minutes'],
  },
  {
    code: 'occupational_health_officer',
    title_fa: 'مسئول بهداشت حرفه‌ای',
    slot: 'مسئول بهداشت حرفه‌ای',
    permissions: [...BASE,
      'view_measure_status_readonly', 'edit_measure_status',
      'manage_documents',
      'submit_checklists', 'view_training', 'review_training_needs',
      'submit_fmea', 'view_walkarounds', 'create_committee_minutes',
      'manage_occhealth', 'view_occhealth'],
  },
  {
    code: 'environmental_health_officer',
    title_fa: 'مسئول بهداشت محیط',
    slot: 'مسئول بهداشت محیط',
    permissions: [...BASE,
      'view_measure_status_readonly', 'edit_measure_status',
      'manage_documents',
      'submit_checklists', 'submit_fmea', 'view_walkarounds', 'create_committee_minutes',
      'view_occhealth', 'view_waste_tracking', 'manage_waste_tracking'],
  },
  
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
  }
];

function ensureRoles() {
  const ins = db.prepare('INSERT INTO roles (id, hospital_id, code, title_fa, permissions) VALUES (?, NULL, ?, ?, ?)');
  const upd = db.prepare('UPDATE roles SET permissions = ? WHERE id = ?');
  let created = 0, updated = 0;
  for (const r of ROLES) {
    const existing = db.prepare('SELECT id, permissions FROM roles WHERE code = ? AND hospital_id IS NULL').get(r.code);
    if (!existing) { ins.run(crypto.randomUUID(), r.code, r.title_fa, JSON.stringify(r.permissions)); created++; continue; }
    // ادغام افزایشی (نه بازنویسی کامل): مجوزهای افزوده‌شده توسط سیدهای بعدی
    // (مثل seed-crm-roles) یا پنل سوپرادمین در بوت بعدی پاک نمی‌شود. حذف یک مجوز
    // فقط با حذف از همین فایل و پاک‌سازی دستی همان مجوز انجام می‌شود.
    let cur = [];
    try { cur = JSON.parse(existing.permissions || '[]'); } catch (e) { cur = []; }
    const merged = [...r.permissions];
    for (const p of cur) if (!merged.includes(p)) merged.push(p);
    const perms = JSON.stringify(merged);
    if (existing.permissions !== perms) { upd.run(perms, existing.id); updated++; }
  }
  return { created, updated };
}

// کاربرِ نشسته روی هر پست، اگر هنوز با نقشِ عمومیِ staff_nurse ساخته شده باشد، به نقش
// واقعی همان پست منتقل می‌شود. اگر ادمین قبلاً نقش دیگری برایش گذاشته، دست نمی‌خورد.
function reassignSlotHolders() {
  const staffNurse = db.prepare("SELECT id FROM roles WHERE code = 'staff_nurse' AND hospital_id IS NULL").get();
  if (!staffNurse) return 0;
  let moved = 0;
  for (const r of ROLES) {
    const role = db.prepare('SELECT id FROM roles WHERE code = ? AND hospital_id IS NULL').get(r.code);
    if (!role) continue;
    const holders = db.prepare(`SELECT u.id FROM management_position_slots s
      JOIN users u ON u.id = s.user_id
      WHERE s.label = ? AND u.role_id = ?`).all(r.slot, staffNurse.id);
    for (const h of holders) {
      db.prepare(`UPDATE users SET role_id = ?, updated_at = datetime('now') WHERE id = ?`).run(role.id, h.id);
      moved++;
    }
  }
  return moved;
}

// نقش‌های کلیدی بالینی/آموزشی که در بیمارستانِ نمونه هیچ کاربری نداشتند، پس نه در
// کاشی‌های ورود دیده می‌شدند و نه می‌شد وظایفشان را در دستیار نشان داد — درحالی‌که
// مدیر پرستاری و سوپروایزر آموزشی از پرکارترین سمت‌های واقعی یک بیمارستان‌اند.
const DEMO_STAFF = [
  { code: 'nursing_director', label: 'خانم/آقای مدیر پرستاری بیمارستان شماره یک', username: 'h3.nursing_director', dept: 'دفتر پرستاری' },
  { code: 'education_supervisor', label: 'خانم/آقای سوپروایزر آموزشی بیمارستان شماره یک', username: 'h3.edu_supervisor', dept: 'دفتر پرستاری' },
  { code: 'infection_control_supervisor', label: 'خانم/آقای سوپروایزر کنترل عفونت بیمارستان شماره یک', username: 'h3.ic_supervisor', dept: 'کنترل عفونت' },
  { code: 'nursing_office_assistant', label: 'خانم/آقای مسئول دفتر پرستاری بیمارستان شماره یک', username: 'h3.nursing_office', dept: 'دفتر پرستاری' },
  { code: 'breastfeeding_specialist', label: 'خانم/آقای کارشناس شیر مادر بیمارستان شماره یک', username: 'h3.breastfeeding', dept: 'زنان و زایمان' },
  { code: 'clinical_supervisor', label: 'خانم/آقای سوپروایزر بالینی', username: 'h3.clin_supervisor', dept: 'دفتر پرستاری' },
  { code: 'patient_safety_officer', label: 'مسئول محترم ایمنی بیمار', username: 'h3.patient_safety', dept: 'بهبود کیفیت' },
  { code: 'medical_equipment_engineer', label: 'مسئول مهندسی پزشکی', username: 'h3.med_equip', dept: 'مهندسی پزشکی' },
  { code: 'it_manager', label: 'مدیر محترم فناوری اطلاعات', username: 'h3.it_manager', dept: 'فناوری اطلاعات' },
  { code: 'medical_records_manager', label: 'مسئول مدارک پزشکی', username: 'h3.med_records', dept: 'مدارک پزشکی' },
  { code: 'social_worker', label: 'مددکار اجتماعی', username: 'h3.social_worker', dept: 'مددکاری' },
  { code: 'logistics_manager', label: 'مدیر محترم پشتیبانی', username: 'h3.logistics', dept: 'پشتیبانی' },
];


function seedDemoStaff() {
  const bcrypt = require('bcryptjs');
  const config = require('../src/config/app');
  // فقط برای بیمارستانِ نمونه — روی بیمارستان واقعیِ مشتری کاربر نمی‌سازیم
  const hospital = db.prepare('SELECT id FROM hospitals WHERE name = ?').get('بیمارستان نمونه شماره یک');
  if (!hospital) return 0;
  let n = 0;
  for (const p of DEMO_STAFF) {
    if (db.prepare('SELECT id FROM users WHERE username = ?').get(p.username)) continue;
    const role = db.prepare('SELECT id FROM roles WHERE code = ? AND hospital_id IS NULL').get(p.code);
    if (!role) continue;
    db.prepare(`INSERT INTO users (id, hospital_id, full_name, username, password_hash, role_id, department, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)`).run(
      crypto.randomUUID(), hospital.id, p.label, p.username,
      bcrypt.hashSync('Demo@2026', config.bcrypt.rounds), role.id, p.dept);
    n++;
  }
  return n;
}

function runMigration() {
  console.log('[Seed ManagementRoles] Starting...');
  try {
    const { created, updated } = ensureRoles();
    const moved = reassignSlotHolders();
    const staff = seedDemoStaff();
    if (staff) console.log(`[Seed ManagementRoles] ${staff} کاربر نمونه برای سمت‌های بالینی/آموزشی ساخته شد`);
    console.log(`[Seed ManagementRoles] ✅ ${created} نقش ساخته شد، ${updated} به‌روزرسانی شد، ${moved} کاربر به نقش واقعی سمت خود منتقل شد`);
  } catch (err) {
    console.error('[Seed ManagementRoles] ❌ Failed:', err.message);
  }
}

if (require.main === module) { runMigration(); process.exit(0); }

module.exports = { runMigration, ROLES };

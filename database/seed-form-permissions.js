/**
 * seed-form-permissions.js
 * ---------------------------------------------------------------------------
 * چرا: فقط برای «monthly-program» سطرهای ACL وجود داشت (۴ نقش) و هر ۱۱ فرم دیگر
 * هیچ ACL نداشتند؛ در نتیجه حتی «ریاست بیمارستان» روی همه‌ی فرم‌ها ۴۰۳ می‌گرفت
 * و «پرستار» هم نمی‌توانست چیزی ثبت کند. بدون این داده، موتور فرم کارکرد است
 * اما هیچ‌کس از آن استفاده نمی‌تواند کرد.
 *
 * چه می‌کند (idempotent): برای هر فرم، برای هر نقشِ مجاز یک سطر form_permissions
 * می‌سازد یا به‌روز می‌کند. نقش‌های تعریف‌نشده در نگاشت، سطر نمی‌گیرند (نه donate).
 */
const { db } = require('../src/config/database-sqlite');
const crypto = require('crypto');

// کدام نقش‌ها روی فرم‌ها چه می‌توانند. مدیر داخلی (admin) همیشه full.
// پرستار پر می‌کند، سرپرستار تأیید، سوپروایزرِ بالینی بازبینی/تأیید.
const ROLE_ACL = {
  staff_nurse: { can_view: 1, can_fill: 1, can_edit: 0, can_approve: 0, can_delete: 0 },
  nurse: { can_view: 1, can_fill: 1, can_edit: 0, can_approve: 0, can_delete: 0 },
  head_nurse: { can_view: 1, can_fill: 1, can_edit: 1, can_approve: 1, can_delete: 0 },
  clinical_supervisor: { can_view: 1, can_fill: 1, can_edit: 1, can_approve: 1, can_delete: 0 },
  nursing_director: { can_view: 1, can_fill: 1, can_edit: 1, can_approve: 1, can_delete: 0 },
  nursing_office_assistant: { can_view: 1, can_fill: 1, can_edit: 1, can_approve: 0, can_delete: 0 },
  education_supervisor: { can_view: 1, can_fill: 1, can_edit: 1, can_approve: 1, can_delete: 0 },
  infection_control_supervisor: { can_view: 1, can_fill: 1, can_edit: 1, can_approve: 1, can_delete: 0 },
  accreditation_manager: { can_view: 1, can_fill: 1, can_edit: 1, can_approve: 1, can_delete: 0 },
  quality_control_manager: { can_view: 1, can_fill: 1, can_edit: 1, can_approve: 1, can_delete: 0 },
  hospital_president: { can_view: 1, can_fill: 1, can_edit: 1, can_approve: 1, can_delete: 0 },
  technical_officer: { can_view: 1, can_fill: 1, can_edit: 1, can_approve: 1, can_delete: 0 },
  patient_safety_officer: { can_view: 1, can_fill: 1, can_edit: 0, can_approve: 0, can_delete: 0 },
  admin: { can_view: 1, can_fill: 1, can_edit: 1, can_approve: 1, can_delete: 1 },
};

function ensure(formId, roleCode, acl, fieldRules) {
  const existing = db.prepare('SELECT id FROM form_permissions WHERE form_id = ? AND role_code = ?').get(formId, roleCode);
  if (existing) {
    db.prepare(`
      UPDATE form_permissions SET can_view=?, can_fill=?, can_edit=?, can_approve=?, can_delete=?, field_rules_json=?
      WHERE id = ?
    `).run(acl.can_view, acl.can_fill, acl.can_edit, acl.can_approve, acl.can_delete,
      fieldRules ? JSON.stringify(fieldRules) : null, existing.id);
    return 'updated';
  }
  db.prepare(`
    INSERT INTO form_permissions (id, form_id, role_code, can_view, can_fill, can_edit, can_approve, can_delete, field_rules_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), formId, roleCode, acl.can_view, acl.can_fill, acl.can_edit,
    acl.can_approve, acl.can_delete, fieldRules ? JSON.stringify(fieldRules) : null);
  return 'inserted';
}

// فیلدهایی که برای نقش‌های خاص فقط‌خواندنی‌اند (Field-Level ACL).
// چرا: پرستار یادداشت سرپرستار را نمی‌نویسد. موتور فرم هنگام ثبت این فیلدها را
// از داده‌ی ارسالی حذف می‌کند تا پایین‌دست نتواند فیلدِ بالادست را تزریق کند.
const READ_ONLY_RULES = {
  'monthly-program': {
    nurse: { head_nurse_notes: 'read_only' },
    staff_nurse: { head_nurse_notes: 'read_only' },
    patient_safety_officer: { head_nurse_notes: 'read_only' },
  },
};

function fieldRulesOf(slug, roleCode) {
  const byForm = READ_ONLY_RULES[slug];
  return (byForm && byForm[roleCode]) ? byForm[roleCode] : null;
}

const forms = db.prepare('SELECT id, slug FROM forms').all();
let upserts = 0;
for (const f of forms) {
  for (const [roleCode, acl] of Object.entries(ROLE_ACL)) {
    ensure(f.id, roleCode, acl, fieldRulesOf(f.slug, roleCode));
    upserts++;
  }
  console.log('[form-acl]', f.slug.padEnd(30), '->', Object.keys(ROLE_ACL).length, 'نقش');
}

console.log('[form-acl] مجموع سطرهای تضمین‌شده:', upserts);
console.log('[form-acl] کل سطرهای form_permissions حالا:', db.prepare('SELECT COUNT(*) c FROM form_permissions').get().c);

const { db } = require('../src/config/database-sqlite');

console.log('=== CHECKLISTS COMPLETION ANALYSIS ===');
const checklists = db.prepare(`
  SELECT c.id, c.title, c.checklist_code, c.hospital_id, c.completion_type, c.status,
    (SELECT count(*) FROM checklist_domains d WHERE d.checklist_id = c.id) as domain_count,
    (SELECT count(*) FROM checklist_items i WHERE i.checklist_id = c.id) as item_count,
    (SELECT count(*) FROM checklist_submissions s WHERE s.checklist_id = c.id) as sub_count
  FROM checklists c
`).all();

const emptyChecklists = checklists.filter(c => c.item_count === 0);
const filledChecklists = checklists.filter(c => c.item_count > 0);

console.log(`Total Checklists: ${checklists.length}`);
console.log(`Checklists with items: ${filledChecklists.length}`);
console.log(`Checklists EMPTY (0 items): ${emptyChecklists.length}`);

console.log('\n--- Empty Checklists (ALL of them) ---');
emptyChecklists.forEach((c, i) => {
  console.log(`${i+1}. [${c.checklist_code || 'بدون کد'}] "${c.title}" (Type: ${c.completion_type || 'unspecified'}, Status: ${c.status})`);
});

console.log('\n=== FORMS TABLE (forms & form_versions) ===');
const forms = db.prepare(`
  SELECT f.id, f.title, f.slug, f.category, f.hospital_id,
    v.version_no, v.revision_no, v.schema_json
  FROM forms f
  LEFT JOIN form_versions v ON f.id = v.form_id
`).all();

console.log(`Total forms in 'forms' table: ${forms.length}`);
forms.forEach(f => {
  let fieldsCount = 0;
  try {
    const s = JSON.parse(f.schema_json || '{}');
    fieldsCount = Object.keys(s.properties || {}).length;
  } catch(e) {}
  console.log(`- [${f.slug}] "${f.title}" (Cat: ${f.category}) -> Fields: ${fieldsCount}, Version: ${f.version_no}.${f.revision_no}`);
});

console.log('\n=== ADMIN FORMS (admin_forms) ===');
const adminForms = db.prepare("SELECT * FROM admin_forms").all();
console.log(`Total admin_forms: ${adminForms.length}`);
adminForms.forEach(af => {
  let fieldCount = 0;
  try {
    const fields = JSON.parse(af.schema_json || '[]');
    fieldCount = Array.isArray(fields) ? fields.length : Object.keys(fields.properties || {}).length;
  } catch (e) {}
  console.log(`- ID: ${af.id} | "${af.title}" | Fields: ${fieldCount}`);
});

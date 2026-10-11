const { db } = require('../src/config/database-sqlite');

function printTable(tableName) {
  console.log(`\n=================== ${tableName} ===================`);
  const cols = db.prepare(`PRAGMA table_info("${tableName}")`).all();
  console.log('Columns:', cols.map(c => c.name).join(', '));
  const rows = db.prepare(`SELECT * FROM "${tableName}" LIMIT 5`).all();
  console.log(`Count: ${db.prepare(`SELECT count(*) as c FROM "${tableName}"`).get().c}`);
  console.log('Sample rows:', JSON.stringify(rows, null, 2));
}

['checklists', 'checklist_domains', 'checklist_items', 'checklist_submissions', 'forms', 'form_versions', 'form_submissions', 'admin_forms', 'safe_surgery_checklists'].forEach(t => {
  try {
    printTable(t);
  } catch (e) {
    console.log(`Error printing ${t}:`, e.message);
  }
});

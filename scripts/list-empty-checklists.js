const { db } = require('../src/config/database-sqlite');

const empty = db.prepare(`
  SELECT c.id, c.checklist_code, c.title, c.purpose, c.completion_type, c.hospital_id
  FROM checklists c
  WHERE (SELECT count(*) FROM checklist_items i WHERE i.checklist_id = c.id) = 0
`).all();

console.log('Total Empty Checklists:', empty.length);
empty.forEach((e, idx) => {
  console.log(`${idx+1}. ID: "${e.id}" | Code: "${e.checklist_code}" | Title: "${e.title}"`);
});

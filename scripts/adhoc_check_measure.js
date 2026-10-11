const { db } = require('../src/config/database-sqlite');

const procs = db.prepare(`
  SELECT id, title, process_code, category
  FROM processes
  WHERE title LIKE '%تریاژ%' OR title LIKE '%اورژانس%' OR title LIKE '%پذیرش%' OR process_code LIKE '%EM%'
`).all();

console.log('Processes related to triage/emergency:', procs);

const allChecklists = db.prepare(`
  SELECT id, title, checklist_code
  FROM checklists
  WHERE title LIKE '%تریاژ%' OR title LIKE '%اورژانس%' OR checklist_code LIKE '%EM%'
`).all();

console.log('Checklists related to triage/emergency:', allChecklists);

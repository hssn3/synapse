const db = require('better-sqlite3')('database/hospital.db');
const q = (s) => db.prepare(s).all();
const tables = q("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").map(r => r.name);
console.log('TOTAL_TABLES:', tables.length);
console.log('MEASURE_TABLES:', tables.filter(t => t.includes('measure')).join(', '));
console.log('DOC_TABLES:', tables.filter(t => t.includes('doc')).join(', '));
console.log('USER_TABLES:', tables.filter(t => t.includes('user')).join(', '));
console.log('ROLE_TABLES:', tables.filter(t => t.includes('role')).join(', '));
const stats = {};
const probes = {
  measures: 'accreditation_measures',
  docs: 'controlled_documents',
  users: 'users',
  roles: 'roles',
  sections: 'accreditation_sections',
  kpis: 'hospital_kpis',
  shift_entries: 'shift_entries',
  complaints: 'patient_complaints_suggestions',
  errors: 'medical_error_reports',
  checklists: 'checklists',
  audit_log: 'audit_log',
  deleted: 'deleted_records',
  hospitals: 'hospitals',
};
for (const [k, t] of Object.entries(probes)) {
  if (tables.includes(t)) stats[k] = db.prepare(`SELECT count(*) c FROM "${t}"`).get().c;
  else stats[k] = 'TABLE_MISSING';
}
stats.integrity = q('PRAGMA integrity_check')[0].integrity_check;
console.log('STATS:', JSON.stringify(stats, null, 2));
const empty = [];
for (const t of tables) {
  try { if (db.prepare(`SELECT count(*) c FROM "${t}"`).get().c === 0) empty.push(t); } catch (e) {}
}
console.log('EMPTY_TABLES(' + empty.length + '):', empty.join(', '));

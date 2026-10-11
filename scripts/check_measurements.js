const dbModule = require('../src/config/database');

const tables = dbModule.query("SELECT name FROM sqlite_master WHERE type='table'").rows.map(r => r.name);
console.log('Tables matching kpi or val or record:', tables.filter(t => t.includes('kpi') || t.includes('meas') || t.includes('val')));

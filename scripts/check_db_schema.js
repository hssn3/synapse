const dbModule = require('../src/config/database');

const tables = dbModule.query("SELECT name FROM sqlite_master WHERE type='table'").rows.map(r => r.name);
console.log('All tables count:', tables.length);
console.log('Indicator/Metric tables:', tables.filter(t => t.includes('indicat') || t.includes('metric') || t.includes('kpi') || t.includes('stat')));

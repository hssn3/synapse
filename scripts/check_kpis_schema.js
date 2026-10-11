const dbModule = require('../src/config/database');

['hospital_kpis', 'kpi_collectors', 'process_kpis'].forEach(tbl => {
  const info = dbModule.query(`PRAGMA table_info(${tbl})`).rows;
  console.log(`\nTable ${tbl}:`);
  info.forEach(col => console.log(`  ${col.name} (${col.type})`));
  const count = dbModule.query(`SELECT COUNT(*) as c FROM ${tbl}`).rows[0].c;
  console.log(`  Total rows: ${count}`);
});

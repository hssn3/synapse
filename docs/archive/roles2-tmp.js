const db = require('better-sqlite3')('database/hospital.db');
console.log(JSON.stringify(db.prepare("SELECT responsible_role, count(*) c FROM accreditation_sections WHERE level_type='measure' GROUP BY responsible_role ORDER BY c DESC").all(), null, 1));

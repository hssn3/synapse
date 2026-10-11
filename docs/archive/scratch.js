const db = require('better-sqlite3')('database/hospital.db');
const tables = ['medical_error_reports', 'fmea_records', 'committee_meeting_minutes', 'shift_schedules', 'nursing_leave_requests'];
tables.forEach(t => {
  console.log(t + ':\n' + db.prepare('SELECT sql FROM sqlite_master WHERE name = ?').get(t).sql);
});

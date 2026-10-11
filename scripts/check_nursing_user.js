const dbModule = require('../src/config/database');

const rows = dbModule.query(`
  SELECT u.id, u.username, u.full_name, u.role_id, r.code as role_code, r.title_fa, r.permissions
  FROM users u
  LEFT JOIN roles r ON r.id = u.role_id
  WHERE u.username LIKE '%nurs%' OR r.code LIKE '%nurs%' OR r.title_fa LIKE '%پرستار%'
`).rows;

console.log('Nursing users found:', rows.length);
rows.forEach(r => {
  console.log(`Username: "${r.username}" | FullName: "${r.full_name}" | RoleCode: "${r.role_code}" | Title: "${r.title_fa}"`);
});

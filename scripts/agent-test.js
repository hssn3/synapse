const BASE = process.env.TEST_BASE_URL || process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
async function post(p, body, cookie) {
  const r = await fetch(BASE + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
  const t = await r.text();
  return { code: r.status, body: t.slice(0, 300), headers: r.headers.get('set-cookie') };
}
async function get(p, cookie) {
  const r = await fetch(BASE + p, { headers: cookie ? { Cookie: cookie } : {} });
  return { code: r.status, body: (await r.text()).slice(0, 200) };
}
(async () => {
  const out = [];
  const login = await post('/api/auth/login', { username: 'hospital3_admin', password: 'Hospital3@Admin2026' });
  out.push('login_admin:' + login.code);
  const sid = (login.headers || '').split(';')[0];
  const me = await get('/api/auth/me', sid);
  out.push('me:' + me.code);
  const pub = await get('/api/public/hospitals');
  out.push('public_hospitals:' + pub.code);
  const evil = await fetch(BASE + '/api/auth/logout', { method: 'POST', headers: { Origin: 'https://evil.com', Cookie: sid } });
  out.push('evil_origin:' + evil.status);
  const j = require('../src/config/jalali');
  out.push('jalali_today:' + j.tehranTodayStr());
  out.push('jalali_greg:' + JSON.stringify(j.toGregorian(1405, 7, 2)));
  const { query } = require('../src/config/database-sqlite');
  out.push('db_checklists:' + query('SELECT COUNT(*) c FROM checklists').rows[0].c);
  out.push('db_docs:' + query('SELECT COUNT(*) c FROM controlled_documents').rows[0].c);
  out.push('db_processes:' + query('SELECT COUNT(*) c FROM processes').rows[0].c);
  out.push('db_kpis:' + query('SELECT COUNT(*) c FROM hospital_kpis').rows[0].c);
  out.push('db_blocklist:' + query('SELECT COUNT(*) c FROM jwt_blocklist').rows[0].c);
  console.log(out.join('\n'));
  process.exit(0);
})().catch(e => { console.error('AGENT_FAIL', e.message); process.exit(1); });

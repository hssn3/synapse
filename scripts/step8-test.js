const BASE = process.env.TEST_BASE_URL || process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const out = [];
async function J(url, opts) {
  const r = await fetch(BASE + url, opts);
  let j = null;
  try { j = await r.json(); } catch (e) { j = null; }
  return { code: r.status, json: j, headers: r.headers };
}
(async () => {
  // ۱) ناشناس: داشبورد + درخت + سوپر (با حالت نمایشی باید 200 شوند، نه 401)
  const anonDash = await J('/api/dashboard');
  out.push('anon_dashboard:' + anonDash.code);
  const anonTree = await J('/api/accreditation/tree');
  out.push('anon_tree:' + anonTree.code);
  const anonSuper = await J('/api/super/hospitals');
  out.push('anon_super:' + anonSuper.code);
  // ۲) هر ۱۸ سمت با ورود کاشی‌ای
  const pubs = await (await fetch(BASE + '/api/public/hospitals')).json();
  const hid = (pubs.hospitals || pubs.items || pubs)[0].id;
  const roles = await (await fetch(BASE + '/api/entry/hospital/' + hid + '/roles')).json();
  out.push('roles_count:' + roles.roles.length);
  for (const r of roles.roles) {
    const u = (r.users || [])[0];
    if (!u) { out.push(r.role_code + ':NO_USER'); continue; }
    const lr = await J('/api/entry/role-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: u.id }) });
    const sid = (lr.headers.get('set-cookie') || '').split(';')[0];
    const me = await J('/api/auth/me', { headers: { Cookie: sid } });
    out.push(r.role_code + ':' + lr.code + '/' + me.code);
  }
  console.log(out.join('\n'));
  process.exit(0);
})().catch(e => { console.error('STEP8_FAIL ' + e.message); process.exit(1); });

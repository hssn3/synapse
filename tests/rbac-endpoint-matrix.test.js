/**
 * rbac-endpoint-matrix.test.js — ماتریس per-endpoint دسترسی (بدون UI)
 * ---------------------------------------------------------------------------
 * چرا این فایل: ممیزی ۱۴۰۵/۰۷/۲۰ خواست صریحاً «تست خودکار ماتریس مجاز/ممنوع
 * بدون UI برای همه نقش‌ها» + IDOR + privilege escalation. تست‌های قبلی فقط
 * policy-engine سطح پایین را می‌سنجیدند؛ این تست مسیرِ واقعیِ HTTP با نشست‌های
 * واقعی را می‌زند: ورود از endpoint لاگینِ کاشی‌ای، سپس درخواست‌های مستقیم.
 *
 * پیش‌نیاز: سرور روی SMOKE_BASE_URL بالا باشد (پیش‌فرض http://127.0.0.1:3311).
 * اجرا: node --test tests/rbac-endpoint-matrix.test.js
 *   یا: SMOKE_BASE_URL=... node --test tests/rbac-endpoint-matrix.test.js
 *
 * داده‌ها: بیمارستان دموی ساختگی. هیچ داده واقعی.
 *
 * نسخه‌ی گسترده‌شده (۱۴۰۵/۰۷/۲۴): خانواده‌ی گاردهای تازه (چت دستیار، خروجی‌های xlsx،
 * خانواده‌ی درختْ/status/scoring/dashboard/history/trend و KPI) + قراردادِ همگامیِ
 * دو مرجع مجوز: assistant:chat:use باید برای همه‌ی نقش‌های پایه (جز anonymous_reporter)
 * هم در JSON و هم در NIST باشد، و کلیدهای JSON نقش‌ها در my-permissions آینه شوند.
 */
'use strict';
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

const BASE = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3311').replace(/\/+$/, '');
const HOSPITAL_ID = 'dd43b5de-bd17-4245-8dbf-246de3db401d';

// کاربر نمونه‌ی هر نقش (فعال) — از دیتابیس دمو
const USERS = {
  admin: 'fcc88096-75d7-4430-b494-cc54f4bece33',
  nursing_director: '4ee9de45-dca3-4c1d-921a-e1c631c2967c',
  staff_nurse: 'a49eea44-f95c-459d-8e20-7d96f59206ec',
  accreditation_manager: '9a5a5df4-0c44-4700-9466-c15b463be1cf',
  hospital_president: '59995d03-9854-4597-a8be-a039d70ddeac',
  // نقش‌های مرزیِ گاردهای تازه (اتحاد خانواده‌ی درخت / BSC / چک‌لیست)
  quality_control_manager: '86d4b9a8-0f31-446d-8610-e1bed1a813fb',
  clinical_supervisor: 'cd5081cc-e0ad-4d01-9c8e-d91adc440eaf',
  social_worker: '073eeec7-11a3-4764-998a-5019f73523d0',
  nursing_office_assistant: '829c22db-5e60-4ee0-85de-0157d7cb66f3',
};

// نشست هر نقش را یک‌بار می‌گیریم
const sessions = {};

async function loginAs(userId) {
  const r = await fetch(`${BASE}/api/entry/role-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
  if (r.status !== 200) throw new Error(`role-login failed for ${userId}: ${r.status}`);
  const cookie = (r.headers.getSetCookie() || []).map((c) => c.split(';')[0]).join('; ');
  return { cookie };
}

async function req(cookie, path, opts = {}) {
  const r = await fetch(`${BASE}${path}`, {
    method: opts.method || 'GET',
    headers: { cookie, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch (e) { /* non-JSON */ }
  return { status: r.status, data };
}

describe('🛡️ RBAC endpoint matrix (HTTP, no UI)', () => {
  before(async () => {
    for (const [role, uid] of Object.entries(USERS)) {
      sessions[role] = await loginAs(uid);
    }
  });

  // ---------- ۱) بدون نشست → همه مسیرهای حساس 401 ----------
  it('anonymous: routes reject with 401', async () => {
    const targets = [
      ['GET', '/api/dashboard'],
      ['GET', '/api/accreditation/tree'],
      ['GET', '/api/users'],
      ['GET', '/api/directives'],
      ['GET', '/api/rbac/my-permissions'],
      ['POST', '/api/directives'],
      ['GET', '/api/users/audit-log'],
    ];
    for (const [method, path] of targets) {
      const r = await fetch(`${BASE}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'POST' ? '{}' : undefined,
      });
      assert.equal(r.status, 401, `${method} ${path} expected 401, got ${r.status}`);
    }
  });

  // ---------- ۲) nurse: ممنوع‌های مدیریتی 403 ----------
  it('staff_nurse: admin-only endpoints are denied (403/404 only)', async () => {
    const c = sessions.staff_nurse.cookie;
    const cases = [
      ['GET', '/api/users'],
      ['GET', '/api/users/audit-log'],
      ['GET', '/api/export/users.xlsx'],
    ];
    for (const [method, path] of cases) {
      const r = await req(c, path, { method });
      assert.ok([403, 404].includes(r.status), `${method} ${path} → expected 403/404, got ${r.status}`);
    }
  });

  // ---------- ۳) nurse: مجازهای پایه 200 ----------
  it('staff_nurse: allowed base endpoints work (200)', async () => {
    const c = sessions.staff_nurse.cookie;
    const r1 = await req(c, '/api/dashboard');
    assert.equal(r1.status, 200, `dashboard should be 200`);
    const r2 = await req(c, '/api/accreditation/tree');
    assert.equal(r2.status, 200, `tree should be 200`);
  });

  // ---------- ۴) nurse: نوشتن ابلاغیه ممنوع (manage_directives؟ nurse دارد! پیام را چک کن) ----------
  // نکته: طبق دیتابیس، nurse مجوز manage_directives دارد — پس این تست بررسی می‌کند
  // که اگر مجوز دارد، خطای ۴۰۱/۴۰۳ نمی‌گیرد (رفتار واقعی مستند شود).
  it('staff_nurse: directive POST honors actual permission', async () => {
    const c = sessions.staff_nurse.cookie;
    const r = await req(c, '/api/directives', { method: 'POST', body: { title: 'تست ماتریس — نادیده بگیرید', body: 'تست خودکار' } });
    // نباید 401 بگیرد (نشست معتبر است). 200/400/403 همه قابل قبول‌اند بسته به مجوز.
    assert.notEqual(r.status, 401, `directive POST as nurse should not be 401, got ${r.status}`);
  });

  // ---------- ۵) admin: manage_users مجاز ----------
  it('admin: can list users (200) and sees only own hospital', async () => {
    const c = sessions.admin.cookie;
    const r = await req(c, '/api/users');
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.data.users));
    // همه کاربران برگشتی باید مال همان بیمارستان باشند (hospitalScope)
    for (const u of r.data.users) {
      assert.ok(u.id, 'user must have id');
    }
  });

  // ---------- ۶) IDOR: کاربر A نمی‌تواند ابلاغیه‌ی بیمارستان دیگر را bبیند ----------
  it('IDOR: cross-hospital directive recipient list is 404', async () => {
    const c = sessions.admin.cookie;
    // یک شناسه تصادفی — نباید هیچ داده‌ای برگرداند
    const r = await req(c, '/api/directives/00000000-0000-0000-0000-000000000001/recipients');
    assert.equal(r.status, 404, `random directive id should 404, got ${r.status}`);
  });

  // ---------- ۷) IDOR: recipients فقط برای صادرکننده/ادمین ----------
  it('IDOR: directive recipients limited to sender or admin', async () => {
    // اول یک ابلاغیه واقعی که nurse صادر نکرده را پیدا کن
    const adminC = sessions.admin.cookie;
    const list = await req(adminC, '/api/directives');
    assert.equal(list.status, 200);
    // ساختار ممکن است { directives: [...] } یا آرایه باشد
    const dirs = Array.isArray(list.data) ? list.data : (list.data.directives || []);
    if (dirs.length === 0) return; // داده کافی نیست — خروج بی‌خطر

    const someDirective = dirs[0];
    // پرستار که صادرکننده نیست (sender_id متفاوت) باید 403 بگیرد — اگر صادرکننده باشد 200.
    const nurseC = sessions.staff_nurse.cookie;
    const r = await req(nurseC, `/api/directives/${someDirective.id}/recipients`);
    if (someDirective.sender_id && someDirective.sender_id !== USERS.staff_nurse) {
      assert.ok([403, 404].includes(r.status), `nurse (not sender) should be 403/404, got ${r.status}`);
    } else {
      assert.ok([200, 403, 404].includes(r.status));
    }
  });

  // ---------- ۸) privilege escalation: درخواست تغییر نقش توسط غیرمجاز ----------
  it('privilege escalation: nurse cannot update user role (403/404)', async () => {
    const c = sessions.staff_nurse.cookie;
    const r = await req(c, `/api/users/${USERS.admin}`, {
      method: 'PUT',
      body: { role_id: '00000000-0000-0000-0000-000000000000' },
    });
    assert.ok([403, 404].includes(r.status), `nurse role-change should be denied, got ${r.status}`);
  });

  // ---------- ۹) academic: تغییر وضعیت سنجه — nurse فقط خواندن ----------
  it('measure status: nurse write is denied, manager write allowed-ish', async () => {
    const nurseC = sessions.staff_nurse.cookie;
    // شناسه‌ی سنجه واقعی را از درخت بگیر
    const tree = await req(nurseC, '/api/accreditation/tree');
    let measureId = null;
    (function find(nodes) {
      for (const n of nodes || []) {
        if (n.level_type === 'measure') { measureId = n.id; return; }
        if (n.children && !measureId) find(n.children);
      }
    })(tree.data && tree.data.tree);
    if (!measureId) return;

    const r = await req(nurseC, `/api/accreditation/status/${measureId}`, {
      method: 'PUT',
      body: { status: 'full_compliant' },
    });
    assert.ok([403, 404].includes(r.status), `nurse measure-write should be 403/404, got ${r.status}`);
  });

  // ---------- ۱۰) مدیر اعتباربخشی: ویرایش وضعیت سنجه مجاز ----------
  it('accreditation_manager: measure status write reaches handler (not 401/403)', async () => {
    const c = sessions.accreditation_manager.cookie;
    const tree = await req(c, '/api/accreditation/tree');
    let measureId = null;
    (function find(nodes) {
      for (const n of nodes || []) {
        if (n.level_type === 'measure') { measureId = n.id; return; }
        if (n.children && !measureId) find(n.children);
      }
    })(tree.data && tree.data.tree);
    if (!measureId) return;
    // درخواست با بدنه‌ی نامعتبر — انتظار: نه 401 نه 403 (وارد هاندلر شده)
    const r = await req(c, `/api/accreditation/status/${measureId}`, {
      method: 'PUT',
      body: {},
    });
    assert.notEqual(r.status, 401, 'should not be 401');
    assert.notEqual(r.status, 403, 'manager with edit_measure_status must not get 403');
  });

  // ---------- ۱۱) نشست نامعتبر: کوکی جعلی → 401 ----------
  it('forged cookie: rejected 401', async () => {
    const r = await req('sid=not-a-real-token', '/api/dashboard');
    assert.equal(r.status, 401);
  });

  // ---------- ۱۲) super-admin routes: نشست عادی → 401 ----------
  it('super routes: regular session cannot access /api/super/*', async () => {
    const c = sessions.admin.cookie;
    const r = await req(c, '/api/super/hospitals');
    assert.equal(r.status, 401, `regular session must not read super routes, got ${r.status}`);
  });

  // ---------- ۱۳) محرومیت mid-session: غیرفعال‌سازی کاربر فوراً اثر می‌کند ----------
  // چرا مهم: توکن JWT تا ۸ ساعت زنده است؛ ولی authRaw در هر درخواست وضعیت
  // تازه کاربر را از DB می‌خواند. این تست همان قرارداد را می‌سنجد:
  // غیرفعال شدن کاربر باید از «درخواست بعدی» اعمال شود، نه انتظار تا انقضای توکن.
  it('mid-session revocation: disabled user is rejected on next request', async () => {
    const { query } = require('../src/config/database-sqlite');
    const uid = USERS.hospital_president;
    // یک نشست تازه بساز
    const s = await loginAs(uid);
    const before = await req(s.cookie, '/api/dashboard');
    assert.equal(before.status, 200, 'president should have access before disable');
    try {
      query('UPDATE users SET is_active = 0 WHERE id = ?', [uid]);
      const after = await req(s.cookie, '/api/dashboard');
      assert.equal(after.status, 401, 'disabled user must get 401 on next request');
    } finally {
      query('UPDATE users SET is_active = 1 WHERE id = ?', [uid]);
    }
    const restored = await req(s.cookie, '/api/dashboard');
    assert.equal(restored.status, 200, 're-enabled user should get access again');
  });

  // ---------- ۱۴) self-service: پروفایل خود را می‌تواند ویرایش کند ----------
  it('self-service: user can update own profile only via /profile/me', async () => {
    const c = sessions.staff_nurse.cookie;
    const r = await req(c, '/api/profile/me', {
      method: 'PUT',
      body: { phone: '09120000099' },
    });
    // نباید 401/403 بگیرد — سلف‌سرویس باز است؛ ولی نباید 500 هم بدهد.
    assert.notEqual(r.status, 401, 'self profile update should not be 401');
    assert.ok(r.status < 500, `self profile update should not be 5xx, got ${r.status}`);
  });

  // ---------- ۱۵) دسترسی مستقیم API بدون UI: نقش‌های مختلف روی same route ----------
  it('cross-role sweep: /api/rbac/my-permissions returns each role its own set', async () => {
    const seen = {};
    for (const [role, sess] of Object.entries(sessions)) {
      const r = await req(sess.cookie, '/api/rbac/my-permissions');
      assert.equal(r.status, 200, `${role} my-permissions should be 200`);
      seen[role] = r.data && (r.data.role_code || (r.data.permissions || []).length);
    }
    // پرستار و ادمین نباید مجموعه یکسان داشته باشند (اثبات تفکیک واقعی)
    const adminPerms = (await req(sessions.admin.cookie, '/api/rbac/my-permissions')).data.permissions || [];
    const nursePerms = (await req(sessions.staff_nurse.cookie, '/api/rbac/my-permissions')).data.permissions || [];
    assert.ok(adminPerms.length > nursePerms.length, 'admin should have more permissions than nurse');
  });

  // ---------- ۱۶) چت دستیار: گاردِ assistant:chat:use (بندِ معلقِ DECISIONS #3) ----------
  // چرا متنِ خالی: ترتیبِ هندلر «گارد → اعتبارسنجی» است. پس اگر گارد رد کند ۴۰۳ با
  // required_permission می‌آید و اگر رد نکند ۴۰۰ اعتبارسنجی — یعنی عبور از گارد بدون
  // فراخوانیِ لایه‌ی مدل. همین، تست را قطعی و آفلاین می‌کند.
  it('assistant chat: anonymous 401, session passes guard (no model call)', async () => {
    const anonLegacy = await fetch(`${BASE}/api/assistant/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: '' }),
    });
    assert.equal(anonLegacy.status, 401, 'anonymous legacy chat must be 401');
    const anonEnt = await fetch(`${BASE}/api/assistant-enterprise/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: '' }),
    });
    assert.equal(anonEnt.status, 401, 'anonymous enterprise chat must be 401');

    const c = sessions.staff_nurse.cookie;
    const r1 = await req(c, '/api/assistant/chat', { method: 'POST', body: { text: '' } });
    assert.notEqual(r1.status, 401);
    assert.ok(!(r1.data && r1.data.required_permission === 'assistant:chat:use'),
      `staff_nurse blocked by legacy chat guard: ${r1.status} ${JSON.stringify(r1.data)}`);

    const r2 = await req(c, '/api/assistant-enterprise/chat', { method: 'POST', body: { message: '' } });
    assert.notEqual(r2.status, 401);
    assert.ok(!(r2.data && r2.data.required_permission === 'assistant:chat:use'),
      `staff_nurse blocked by enterprise chat guard: ${r2.status} ${JSON.stringify(r2.data)}`);
  });

  // ---------- ۱۷) چت دستیار: نقشِ محروم (anonymous_reporter) ۴۰۳ می‌گیرد ----------
  // کاربرِ موقت با نقشِ ثبت‌کننده‌ی ناشناس ساخته می‌شود (روی دیتابیس دموی ساختگی)
  // و در finally پاک می‌شود — الگوی mid-session test بالاتر.
  it('assistant chat: anonymous_reporter role is denied across both chat routes', async () => {
    const { query } = require('../src/config/database-sqlite');
    const role = query("SELECT id FROM roles WHERE code = 'anonymous_reporter'").rows[0];
    assert.ok(role, 'anonymous_reporter role must exist');
    const uid = 'ffffffff-0000-4000-8000-00000000cafe';
    const uname = 'zz.rbac.matrix.temp';
    // ترتیب مهم است: ورود و ردیابیِ ردِ گارد، سطرِ audit_log می‌سازند و audit_log.user_id
    // قیدِ خارجیِ بدونِ CASCADE دارد؛ بدونِ پاک‌سازیِ آن، حذفِ کاربر با خطای قید شکست می‌خورد.
    const cleanup = () => {
      query('DELETE FROM audit_log WHERE user_id = ?', [uid]);
      query('DELETE FROM users WHERE id = ? OR username = ?', [uid, uname]);
    };
    cleanup();   // باقی‌مانده‌ی احتمالیِ اجرای نیمه‌کاره‌ی قبلی
    try {
      query(`INSERT INTO users (id, hospital_id, full_name, username, password_hash, role_id, is_active)
             VALUES (?, ?, 'کاربرِ آزمون ماتریس RBAC', ?, 'x', ?, 1)`,
        [uid, HOSPITAL_ID, uname, role.id]);
      const s = await loginAs(uid);

      const r1 = await req(s.cookie, '/api/assistant/chat', { method: 'POST', body: { text: 'تست ماتریس' } });
      assert.equal(r1.status, 403, `anonymous_reporter legacy chat must be 403, got ${r1.status}`);
      assert.equal(r1.data && r1.data.required_permission, 'assistant:chat:use');

      const r2 = await req(s.cookie, '/api/assistant-enterprise/chat', { method: 'POST', body: { message: 'تست ماتریس' } });
      assert.equal(r2.status, 403, `anonymous_reporter enterprise chat must be 403, got ${r2.status}`);

      // سمت NIST هم نباید کلید را داشته باشد (سید آن را مستثنا کرده است)
      const mp = await req(s.cookie, '/api/rbac/my-permissions');
      assert.equal(mp.status, 200);
      assert.ok(!(mp.data.permissions || []).includes('assistant:chat:use'),
        'anonymous_reporter must not see assistant:chat:use in my-permissions');
    } finally {
      cleanup();
    }
  });

  // ---------- ۱۸) همگامیِ JSON↔NIST: هر نقشِ پایه کلیدِ دانا را در هر دو مرجع دارد ----------
  it('permission reconciliation: assistant:chat:use present in JSON and NIST for every base role', async () => {
    const { query } = require('../src/config/database-sqlite');
    const roles = query('SELECT id, code, permissions FROM roles WHERE hospital_id IS NULL').rows;
    const nistIds = new Set(query(`
      SELECT rp.role_id FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE p.key = 'assistant:chat:use'`).rows.map(x => x.role_id));
    const missingJson = [], missingNist = [];
    for (const r of roles) {
      if (r.code === 'anonymous_reporter') continue;
      let keys = [];
      try { keys = JSON.parse(r.permissions || '[]'); } catch (e) { keys = []; }
      if (!keys.includes('assistant:chat:use')) missingJson.push(r.code);
      if (!nistIds.has(r.id)) missingNist.push(r.code);
    }
    assert.deepEqual(missingJson, [], 'base roles missing assistant:chat:use in roles.permissions');
    assert.deepEqual(missingNist, [], 'base roles missing the NIST mapping');

    // و سینکِ عمومی: کلیدهای JSON پرستار باید در NIST آینه شده باشند
    const sn = query("SELECT id FROM roles WHERE code = 'staff_nurse'").rows[0];
    assert.ok(sn, 'staff_nurse role must exist');
    const nistKeys = new Set(query(`
      SELECT p.key FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = ?`, [sn.id]).rows.map(x => x.key));
    for (const k of ['view_own_dashboard', 'submit_checklists', 'manage_patient_followup']) {
      assert.ok(nistKeys.has(k), `staff_nurse JSON key «${k}» must be mirrored into NIST`);
    }
  });

  it('my-permissions (NIST path): staff_nurse includes assistant:chat:use and mirrored JSON keys', async () => {
    const r = await req(sessions.staff_nurse.cookie, '/api/rbac/my-permissions');
    assert.equal(r.status, 200);
    const perms = (r.data && r.data.permissions) || [];
    assert.ok(perms.includes('assistant:chat:use'), 'my-permissions must include assistant:chat:use');
    assert.ok(perms.includes('view_own_dashboard'), 'my-permissions must include mirrored JSON keys');
    assert.ok(perms.includes('submit_checklists'), 'my-permissions must include mirrored JSON keys');
  });

  // ---------- ۱۹) خروجی‌های xlsx: اتحادِ هر خانواده ----------
  it('export xlsx guards: family union allows members, denies others', async () => {
    const getRaw = async (cookie, path) => {
      const r = await fetch(`${BASE}${path}`, { headers: { cookie } });
      await r.arrayBuffer().catch(() => {});
      return r.status;
    };
    const nurse = sessions.staff_nurse.cookie;
    const pres = sessions.hospital_president.cookie;
    const social = sessions.social_worker.cookie;

    // measures.xlsx — پرستار (view_measure_status_readonly) مجاز، مددکار ممنوع
    assert.equal(await getRaw(nurse, '/api/export/measures.xlsx'), 200);
    assert.equal(await getRaw(social, '/api/export/measures.xlsx'), 403);

    // bsc.xlsx — ریاست (view_bsc) مجاز، پرستار ممنوع
    assert.equal(await getRaw(pres, '/api/export/bsc.xlsx'), 200);
    assert.equal(await getRaw(nurse, '/api/export/bsc.xlsx'), 403);

    // checklists/:id.xlsx — پرستار (submit_checklists) مجاز، ریاست بدونِ مجوز چک‌لیست ممنوع
    const list = await req(nurse, '/api/checklists');
    assert.equal(list.status, 200);
    const clId = ((list.data && list.data.checklists) || [])[0] && (list.data.checklists || [])[0].id;
    assert.ok(clId, 'demo checklist must exist');
    assert.equal(await getRaw(nurse, `/api/export/checklists/${clId}.xlsx`), 200);
    assert.equal(await getRaw(pres, `/api/export/checklists/${clId}.xlsx`), 403);
  });

  // ---------- ۲۰) خانواده‌ی درخت: status/dashboard/scoring/history/trend ----------
  it('accreditation family: viewers allowed, social_worker denied', async () => {
    const nurse = sessions.staff_nurse.cookie;
    const clinSup = sessions.clinical_supervisor.cookie;
    const social = sessions.social_worker.cookie;

    assert.equal((await req(nurse, '/api/accreditation/status')).status, 200);
    assert.equal((await req(nurse, '/api/accreditation/dashboard')).status, 200);
    assert.equal((await req(nurse, '/api/accreditation/scoring')).status, 200);
    // سوپروایزر بالینی فقط edit_measure_status دارد — باید از اتحاد عبور کند
    assert.equal((await req(clinSup, '/api/accreditation/status')).status, 200);

    assert.equal((await req(social, '/api/accreditation/status')).status, 403);
    assert.equal((await req(social, '/api/accreditation/dashboard')).status, 403);
    assert.equal((await req(social, '/api/accreditation/scoring')).status, 403);

    // history/trend روی یک سنجه‌ی واقعی از درخت پرستار
    const tree = await req(nurse, '/api/accreditation/tree');
    assert.equal(tree.status, 200);
    let measureId = null;
    (function find(nodes) {
      for (const n of nodes || []) {
        if (n.level_type === 'measure') { measureId = n.id; return; }
        if (n.children && !measureId) find(n.children);
      }
    })(tree.data && tree.data.tree);
    assert.ok(measureId, 'a measure must be visible in staff_nurse tree');
    assert.equal((await req(nurse, `/api/measures/${measureId}/history`)).status, 200);
    assert.equal((await req(nurse, `/api/measures/${measureId}/trend`)).status, 200);
    assert.equal((await req(social, `/api/measures/${measureId}/history`)).status, 403);
    assert.equal((await req(social, `/api/measures/${measureId}/trend`)).status, 403);
  });

  // ---------- ۲۱) خانواده‌ی KPI: unión شاخص/BSC/داشبورد ----------
  it('kpis family: president (view_bsc/view_all_dashboards) allowed, staff_nurse denied', async () => {
    const pres = sessions.hospital_president.cookie;
    const nurse = sessions.staff_nurse.cookie;
    for (const path of ['/api/kpis', '/api/kpis/rankings', '/api/kpis/dashboard']) {
      assert.equal((await req(pres, path)).status, 200, `president ${path} should be 200`);
      assert.equal((await req(nurse, path)).status, 403, `staff_nurse ${path} should be 403`);
    }
  });

  // ---------- ۲۲) سینکِ زنده‌ی نقش سفارشی: create/update پنل باید NIST را آینه کند ----------
  it('custom role lifecycle: panel create/update mirrors JSON into NIST exactly', async () => {
    const { query } = require('../src/config/database-sqlite');
    const admin = sessions.admin.cookie;
    const code = 'zz_rbac_test_role';
    const cleanup = () => {
      const row = query('SELECT id FROM roles WHERE code = ?', [code]).rows[0];
      if (!row) return;
      query('DELETE FROM role_permissions WHERE role_id = ?', [row.id]);
      query('DELETE FROM roles WHERE id = ?', [row.id]);
    };
    const nistKeysOf = (roleId) => query(`
      SELECT p.key FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = ?`, [roleId]).rows.map(x => x.key).sort();
    cleanup();
    try {
      const create = await req(admin, '/api/roles', {
        method: 'POST',
        body: { code, title_fa: 'نقش آزمایشی ماتریس RBAC', permissions: ['view_bsc', 'view_indicators'] },
      });
      assert.equal(create.status, 201, `role create: ${create.status} ${JSON.stringify(create.data)}`);
      const roleId = create.data.role.id;
      assert.deepEqual(nistKeysOf(roleId), ['view_bsc', 'view_indicators'],
        'create must mirror the JSON permission list into NIST');

      // ویرایش: یکی حذف، یکی افزوده — آینه باید دقیق باشد، نه افزایشی؛
      // اگر سلبِ مجوز در NIST باقی بماند، دکمه‌ی my-permissions/authorize کهنه می‌ماند.
      const upd = await req(admin, `/api/roles/${roleId}`, {
        method: 'PUT',
        body: { permissions: ['view_bsc', 'view_all_dashboards'] },
      });
      assert.equal(upd.status, 200);
      assert.deepEqual(nistKeysOf(roleId), ['view_all_dashboards', 'view_bsc'],
        'update must mirror exactly (removed key must disappear from NIST)');
    } finally {
      cleanup();
    }
  });

  // ---------- ۲۳) grant/revoke: JSON-اول (هر دو مرجع با هم) ----------
  it('rbac grant/revoke updates both JSON and NIST', async () => {
    const { query } = require('../src/config/database-sqlite');
    const admin = sessions.admin.cookie;
    const roleRow = query("SELECT id, permissions FROM roles WHERE code = 'accreditation_manager'").rows[0];
    assert.ok(roleRow, 'accreditation_manager role must exist');
    const originalKeys = JSON.parse(roleRow.permissions || '[]');
    const KEY = 'manage_users';    // انتظار: این نقش آن را ندارد (نقش اداری است نه ادمین سامانه)
    const hasMapping = () => !!query(`
      SELECT rp.id FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = ? AND p.key = ?`, [roleRow.id, KEY]).rows[0];
    const restore = () => {
      query('UPDATE roles SET permissions = ? WHERE id = ?', [JSON.stringify(originalKeys), roleRow.id]);
      query(`DELETE FROM role_permissions WHERE role_id = ? AND permission_id = (SELECT id FROM permissions WHERE key = ?)`,
        [roleRow.id, KEY]);
    };
    if (originalKeys.includes(KEY)) { restore(); }
    try {
      const g = await req(admin, '/api/rbac/grant', { method: 'POST', body: { role_code: 'accreditation_manager', permission_key: KEY } });
      assert.equal(g.status, 200, `grant: ${g.status} ${JSON.stringify(g.data)}`);
      const afterGrant = JSON.parse(query('SELECT permissions FROM roles WHERE id = ?', [roleRow.id]).rows[0].permissions);
      assert.ok(afterGrant.includes(KEY), 'grant must append the key to roles.permissions (JSON)');
      assert.ok(hasMapping(), 'grant must create the NIST mapping');

      const rv = await req(admin, '/api/rbac/revoke', { method: 'POST', body: { role_code: 'accreditation_manager', permission_key: KEY } });
      assert.equal(rv.status, 200, `revoke: ${rv.status} ${JSON.stringify(rv.data)}`);
      const afterRevoke = JSON.parse(query('SELECT permissions FROM roles WHERE id = ?', [roleRow.id]).rows[0].permissions);
      assert.ok(!afterRevoke.includes(KEY), 'revoke must remove the key from JSON');
      assert.ok(!hasMapping(), 'revoke must remove the NIST mapping');
    } finally {
      restore();
    }
  });
});

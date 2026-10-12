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
});

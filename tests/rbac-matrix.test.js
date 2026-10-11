/**
 * RBAC Matrix Self-Test Suite — NIST Model & Explicit Acceptance Criteria
 * Tests role × resource × action matrix
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { evaluatePolicy, getUserPermissionSet } = require('../src/modules/rbac/policy-engine');

describe('🛡️ RBAC / ABAC Matrix Enforcement Tests', () => {

  const nurseUser = { id: 'test-nurse-1', role_code: 'nurse', hospital_id: 'hosp-1' };
  const headNurseUser = { id: 'test-hn-1', role_code: 'head_nurse', hospital_id: 'hosp-1' };
  const supervisorUser = { id: 'test-sup-1', role_code: 'supervisor_clinical', hospital_id: 'hosp-1' };
  const adminUser = { id: 'test-adm-1', role_code: 'admin', hospital_id: 'hosp-1' };

  it('۱. پرستار: مشاهده فرم برنامه ماهانه مجاز است (view)', () => {
    const res = evaluatePolicy(nurseUser, 'monthly_program', 'view');
    assert.equal(res.allowed, true);
  });

  it('۲. پرستار: پر کردن فرم برنامه ماهانه مجاز است (fill)', () => {
    const res = evaluatePolicy(nurseUser, 'monthly_program', 'fill');
    assert.equal(res.allowed, true);
  });

  it('۳. پرستار: ویرایش برنامه ماهانه اکیداً ممنوع است (edit -> 403 / DENIED)', () => {
    const res = evaluatePolicy(nurseUser, 'monthly_program', 'edit');
    assert.equal(res.allowed, false, 'پرستار نباید مجوز edit برنامه ماهانه داشته باشد');
  });

  it('۴. پرستار: تایید برنامه ماهانه اکیداً ممنوع است (approve -> 403 / DENIED)', () => {
    const res = evaluatePolicy(nurseUser, 'monthly_program', 'approve');
    assert.equal(res.allowed, false, 'پرستار نباید مجوز approve برنامه ماهانه داشته باشد');
  });

  it('۵. پرستار: حذف برنامه ماهانه اکیداً ممنوع است (delete -> 403 / DENIED)', () => {
    const res = evaluatePolicy(nurseUser, 'monthly_program', 'delete');
    assert.equal(res.allowed, false, 'پرستار نباید مجوز delete برنامه ماهانه داشته باشد');
  });

  it('۶. سرپرستار: ویرایش برنامه ماهانه مجاز است (edit -> ALLOWED)', () => {
    const res = evaluatePolicy(headNurseUser, 'monthly_program', 'edit');
    assert.equal(res.allowed, true);
  });

  it('۷. سرپرستار: تایید برنامه ماهانه مجاز است (approve -> ALLOWED)', () => {
    const res = evaluatePolicy(headNurseUser, 'monthly_program', 'approve');
    assert.equal(res.allowed, true);
  });

  it('۸. سرپرستار: حذف برنامه ماهانه اکیداً ممنوع است (delete -> DENIED)', () => {
    const res = evaluatePolicy(headNurseUser, 'monthly_program', 'delete');
    assert.equal(res.allowed, false, 'سرپرستار نباید مجوز delete برنامه ماهانه داشته باشد');
  });

  it('۹. سوپروایزر بالینی: تایید برنامه ماهانه مجاز است (approve -> ALLOWED)', () => {
    const res = evaluatePolicy(supervisorUser, 'monthly_program', 'approve');
    assert.equal(res.allowed, true);
  });

  it('۱۰. مدیر / ادمین: دسترسی کامل مدیریتی دارد', () => {
    const res = evaluatePolicy(adminUser, 'monthly_program', 'edit');
    assert.equal(res.allowed, true);
  });

  it('۱۱. رفتار Fail-Closed: درخواست منبع تعریف‌نشده حتماً رد می‌شود', () => {
    const res = evaluatePolicy(nurseUser, 'unknown_secret_vault', 'read');
    assert.equal(res.allowed, false);
    assert.ok(res.reason);
  });

  it('۱۲. کاربر بدون لاگین: سریعاً رد می‌شود (Fail-Closed)', () => {
    const res = evaluatePolicy(null, 'monthly_program', 'view');
    assert.equal(res.allowed, false);
  });

  it('۱۳. دریافت کلیدهای مجوز پرستار (getUserPermissionSet): حاوی view و fill و فاقد edit و approve', () => {
    const perms = getUserPermissionSet(nurseUser);
    assert.ok(perms.includes('form:monthly_program:view') || perms.includes('form:monthly-program:view'));
    assert.ok(perms.includes('form:monthly_program:fill') || perms.includes('form:monthly-program:fill'));
    assert.equal(perms.includes('form:monthly_program:edit'), false);
    assert.equal(perms.includes('form:monthly_program:approve'), false);
  });

  it('۱۴. سوپرادمین: دریافت علامت وایلدکارد *', () => {
    const perms = getUserPermissionSet({ id: 'sa-1', role_code: 'superadmin', is_super_admin: 1 });
    assert.deepEqual(perms, ['*']);
  });
});


/**
 * Enterprise AI Assistant Guardrails & Persona Self-Test Suite
 * Tests: Persona resolution, Role-scope guardrail violations,
 * Explicit citations, and Audit log persistence.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const assistantService = require('../src/modules/assistant/assistant.service');
const { getPersonaForRole } = require('../src/modules/assistant/persona.registry');
const { db } = require('../src/config/database-sqlite');

describe('🤖 Enterprise AI Assistant — Guardrails & Persona Tests', () => {

  const nurseUser = { id: 'usr-nurse-ai', role_code: 'nurse', hospital_id: 'test-hosp' };
  const headNurseUser = { id: 'usr-hn-ai', role_code: 'head_nurse', hospital_id: 'test-hosp' };

  it('۱. تفکیک پرسونا بر اساس نقش (Persona Resolution)', () => {
    const nursePersona = getPersonaForRole('nurse');
    assert.ok(nursePersona.title.includes('پرستار بالینی'));
    assert.ok(nursePersona.allowed_tools.includes('search_forms'));

    const hnPersona = getPersonaForRole('head_nurse');
    assert.ok(hnPersona.title.includes('سرپرستار بخش'));

    const adminPersona = getPersonaForRole('admin');
    assert.ok(adminPersona.title.includes('مدیریت بیمارستان'));
  });

  it('۲. گاردریل عدم دسترسی: مسدودسازی تلاش پرستار برای «تایید برنامه ماهانه» با استناد صریح NIST RBAC', async () => {
    const res = await assistantService.processUserMessage(nurseUser, 'لطفاً تایید برنامه ماهانه را برای من انجام بده');

    assert.equal(res.guardrail_status, 'blocked_unauthorized_action');
    assert.ok(res.response.includes('صلاحیت «سرپرستار بخش»') || res.response.includes('اختیارات «سرپرستار بخش»'));
    assert.ok(res.citations.some(c => c.includes('NIST') || c.includes('RBAC')));
  });

  it('۳. گاردریل عدم دسترسی: مسدودسازی تلاش پرستار برای «ویرایش برنامه ماهانه»', async () => {
    const res = await assistantService.processUserMessage(nurseUser, 'من می‌خواهم اقدام به ویرایش برنامه ماهانه بخش کنم');

    assert.equal(res.guardrail_status, 'blocked_unauthorized_action');
    assert.ok(res.response.includes('مشاهده (view) و ثبت درخواست‌های فردی (fill)'));
  });

  it('۴. پاسخ مجاز به پرستار در حوزه اختیارات معتبر (ثبت و مشاهده شیفت)', async () => {
    const res = await assistantService.processUserMessage(nurseUser, 'وضعیت شیفت و برنامه ماهانه به چه صورت است؟');

    assert.equal(res.guardrail_status, 'allowed');
    assert.equal(res.persona, 'پرسونای پرستار بالینی');
    assert.ok(res.response.includes('درخواست‌های مرخصی و کشیک') || res.response.includes('برنامه ماهانه شیفت'));
    assert.ok(res.citations.length > 0);
  });

  it('۵. سرپرستار بخش: دریافت راهنمایی تخصصی جهت ویرایش و تدوین برنامه ماهانه (مجاز)', async () => {
    const res = await assistantService.processUserMessage(headNurseUser, 'راهنمایی در مورد برنامه ماهانه بخش');

    assert.equal(res.guardrail_status, 'allowed');
    assert.equal(res.persona, 'پرسونای سرپرستار بخش');
    assert.ok(res.response.includes('سرپرستار محترم') || res.response.includes('تدوین، ویرایش و تایید'));
  });

  it('۶. ثبت ممیزی تعاملات در جدول assistant_audit_log (Audit Trail)', async () => {
    const logs = assistantService.getAuditLogs('test-hosp');
    assert.ok(logs.length > 0, 'باید لاگ‌های گفتگو ثبت شده باشند');
    const lastLog = logs[0];
    assert.ok(lastLog.query);
    assert.ok(lastLog.response);
    assert.ok(lastLog.role_code);
  });
});

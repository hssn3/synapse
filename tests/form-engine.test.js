/**
 * Enterprise Form Engine Self-Test Suite
 * Tests: Schema generation, Ajv compilation, Dynamic Form Submission,
 * Field-level ACLs, and Immutable Versioning.
 */
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const formService = require('../src/modules/forms/form.service');
const { db } = require('../src/config/database-sqlite');

describe('📋 Enterprise Form Engine — Schema-Driven Tests', () => {
  let testHospitalId;
  const nurseUser = { id: 'usr-nurse-test', role_code: 'nurse', hospital_id: 'test-hosp' };
  const headNurseUser = { id: 'usr-hn-test', role_code: 'head_nurse', hospital_id: 'test-hosp' };

  before(() => {
    const hosp = db.prepare('SELECT id FROM hospitals LIMIT 1').get();
    testHospitalId = hosp ? hosp.id : 'hosp-default';
    nurseUser.hospital_id = testHospitalId;
    headNurseUser.hospital_id = testHospitalId;
  });

  it('۱. بازیابی ساختار فرم پیش‌فرض ماهانه (JSON Schema v7)', async () => {
    const form = await formService.getFormDetails(testHospitalId, 'monthly-program');
    assert.ok(form, 'فرم برنامه ماهانه باید موجود باشد');
    assert.equal(form.slug, 'monthly-program');
    assert.ok(form.version, 'فرم باید دارای نسخه فعال باشد');
    assert.equal(form.version.version_number, 1);
    assert.equal(form.version.schema.type, 'object');
    assert.ok(form.version.schema.properties.ward_name);
  });

  it('۲. ثبت موفق داده‌های معتبر در فرم برنامه ماهانه بر اساس اسکیما', async () => {
    const validData = {
      ward_name: 'ICU جنرال',
      month_jalali: 'مهر',
      year_jalali: 1405,
      head_nurse_notes: 'تنظیم شیفت بر اساس استاندارد نسبت بیمار به پرستار',
      has_night_oncall: true,
      oncall_contact: '09120000000'
    };

    const res = await formService.submitForm(testHospitalId, 'monthly-program', headNurseUser, validData);
    assert.ok(res.submissionId);
    assert.equal(res.status, 'submitted');
    assert.equal(res.version, 1);
  });

  it('۳. رد داده‌های نامعتبر توسط موتور اعتبارسنجی Ajv (Fail-Closed بر اساس اسکیما)', async () => {
    const invalidData = {
      // فاقد فیلدهای الزامی ward_name و month_jalali
      year_jalali: 'invalid_not_number'
    };

    await assert.rejects(
      async () => {
        await formService.submitForm(testHospitalId, 'monthly-program', nurseUser, invalidData);
      },
      /داده‌های ارسالی با ساختار استاندارد فرم همخوانی ندارند/
    );
  });

  it('۴. اعمال سطح دسترسی فیلدها (Field-Level ACL): فیلد سرپرستار برای پرستار محافظت می‌شود', async () => {
    const nurseSubmission = {
      ward_name: 'اورژانس',
      month_jalali: 'آبان',
      year_jalali: 1405,
      head_nurse_notes: 'تلاش غیرمجاز پرستار برای ثبت یادداشت سرپرستار'
    };

    const res = await formService.submitForm(testHospitalId, 'monthly-program', nurseUser, nurseSubmission);
    assert.ok(res.submissionId);

    // بررسی داده‌های ذخیره‌شده در دیتابیس
    const saved = db.prepare('SELECT data_json FROM form_submissions WHERE id = ?').get(res.submissionId);
    const parsedData = JSON.parse(saved.data_json);
    // فیلد head_nurse_notes برای نقش nurse به صورت read_only تنظیم شده و باید حذف/محافظت شده باشد
    assert.equal(parsedData.head_nurse_notes, undefined);
  });

  it('۵. ساخت فرم جدید بدون تغییر کد (JSON Schema Creation via API)', async () => {
    const testSlug = `custom-survey-${Date.now()}`;
    const dynamicSchema = {
      title: "پرسشنامه ایمنی بیمار بخش",
      type: "object",
      required: ["incident_date", "hazard_type"],
      properties: {
        incident_date: { type: "string", title: "تاریخ رخداد" },
        hazard_type: { type: "string", enum: ["سقوط", "دارویی", "تجهیزات", "زخم بستر"] },
        risk_score: { type: "number", minimum: 1, maximum: 5 }
      }
    };

    const newForm = await formService.createNewForm(testHospitalId, {
      slug: testSlug,
      title: "فرم ارزیابی خطرات ایمنی",
      description: "طراحی‌شده به صورت پویا با Schema Engine",
      category: "safety",
      createdBy: "admin",
      initial_schema: dynamicSchema
    });

    assert.ok(newForm);
    assert.equal(newForm.slug, testSlug);
    assert.equal(newForm.version.schema.title, "پرسشنامه ایمنی بیمار بخش");

    // ثبت یک نمونه در فرم جدید
    const subRes = await formService.submitForm(testHospitalId, testSlug, nurseUser, {
      incident_date: "1405-07-15",
      hazard_type: "دارویی",
      risk_score: 3
    });
    assert.ok(subRes.submissionId);
  });

  it('۶. مدیریت چرخه تایید فرم (Workflow: Submit -> Review -> Approve)', async () => {
    const validData = {
      ward_name: 'جراحی مردان',
      month_jalali: 'آذر',
      head_nurse_notes: 'آماده جهت تایید نهایی سوپروایزر'
    };

    const sub = await formService.submitForm(testHospitalId, 'monthly-program', headNurseUser, validData);
    const reviewRes = await formService.reviewSubmission('monthly-program', sub.submissionId, { id: 'usr-sup-test', hospital_id: testHospitalId }, {
      status: 'approved',
      rejection_reason: null
    });

    assert.equal(reviewRes.status, 'approved');
    const updated = db.prepare('SELECT status, reviewed_by FROM form_submissions WHERE id = ?').get(sub.submissionId);
    assert.equal(updated.status, 'approved');
    assert.equal(updated.reviewed_by, 'usr-sup-test');
  });
});

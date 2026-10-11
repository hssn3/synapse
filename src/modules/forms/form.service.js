/**
 * Form Engine Service — Business Logic & Schema Validation (Ajv)
 */
const formRepo = require('./form.repository');
const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true, coerceTypes: true });

class FormService {
  async listForms(hospitalId) {
    return formRepo.findFormsByHospital(hospitalId);
  }

  async getFormDetails(hospitalId, idOrSlug) {
    const form = formRepo.findFormByIdOrSlug(hospitalId, idOrSlug);
    if (!form) return null;

    const currentVersion = formRepo.getLatestPublishedVersion(form.id);
    const permissions = formRepo.getFormPermissions(form.id);

    return {
      ...form,
      version: currentVersion ? {
        version_number: currentVersion.version_number,
        schema: JSON.parse(currentVersion.schema_json),
        ui_schema: JSON.parse(currentVersion.ui_schema_json || '{}')
      } : null,
      permissions
    };
  }

  async createNewForm(hospitalId, { slug, title, description, category, version_no, revision_no, createdBy, initial_schema, initial_ui_schema }) {
    const existing = formRepo.findFormByIdOrSlug(hospitalId, slug);
    if (existing) {
      throw new Error(`فرمی با شناسه یکتای «${slug}» قبلاً در این بیمارستان ثبت شده است.`);
    }

    const formId = formRepo.createForm({
      hospitalId,
      slug,
      title,
      description,
      category,
      version_no: version_no || 1,
      revision_no: revision_no !== undefined ? revision_no : 0,
      createdBy
    });

    // ثبت نسخه اولیه در صورت ارسال
    if (initial_schema) {
      formRepo.createFormVersion({
        formId,
        versionNumber: 1,
        schema: initial_schema,
        uiSchema: initial_ui_schema || {},
        status: 'published',
        createdBy
      });
    }

    return this.getFormDetails(hospitalId, formId);
  }

  async publishNewVersion(formId, { schema, ui_schema, createdBy }) {
    // ۱. صحت‌سنجی سینتکس JSON Schema با Ajv
    try {
      ajv.compile(schema);
    } catch (err) {
      throw new Error(`خطای نحوی در ساختار JSON Schema: ${err.message}`);
    }

    const currentVersion = formRepo.getLatestPublishedVersion(formId);
    const nextVersionNumber = currentVersion ? currentVersion.version_number + 1 : 1;

    const versionId = formRepo.createFormVersion({
      formId,
      versionNumber: nextVersionNumber,
      schema,
      uiSchema: ui_schema,
      status: 'published',
      createdBy
    });

    return { versionId, versionNumber: nextVersionNumber };
  }

  async updateFormAcl(formId, permissionsList) {
    for (const p of permissionsList) {
      formRepo.upsertFormPermission({
        formId,
        roleCode: p.role_code,
        canView: p.can_view,
        canFill: p.can_fill,
        canEdit: p.can_edit,
        canApprove: p.can_approve,
        canDelete: p.can_delete,
        fieldRules: p.field_rules
      });
    }
    return formRepo.getFormPermissions(formId);
  }

  async submitForm(hospitalId, formIdOrSlug, user, submissionData) {
    const form = formRepo.findFormByIdOrSlug(hospitalId, formIdOrSlug);
    if (!form) throw new Error('فرم مورد نظر یافت نشد.');

    const activeVersion = formRepo.getLatestPublishedVersion(form.id);
    if (!activeVersion) throw new Error('این فرم هنوز هیچ نسخه منتشرشده‌ای ندارد.');

    const schema = JSON.parse(activeVersion.schema_json);

    // ۲. اعتبارسنجی داده ورودی در برابر اسکیمای نسخه فعال
    const validate = ajv.compile(schema);
    const valid = validate(submissionData);
    if (!valid) {
      const errorMsg = validate.errors.map(e => `${e.instancePath || 'ریشه'}: ${e.message}`).join('، ');
      throw new Error(`داده‌های ارسالی با ساختار استاندارد فرم همخوانی ندارند: ${errorMsg}`);
    }

    // ۳. بررسی دسترسی سطح فیلد (Field-Level Permissions)
    const roleCode = user.role_code || user.role;
    const permissions = formRepo.getFormPermissions(form.id);
    const userFormAcl = permissions.find(p => p.role_code === roleCode);

    if (userFormAcl && userFormAcl.field_rules_json) {
      const fieldRules = JSON.parse(userFormAcl.field_rules_json || '{}');
      for (const [fieldName, rule] of Object.entries(fieldRules)) {
        if (rule === 'read_only' && submissionData[fieldName] !== undefined) {
          // اگر فیلد فقط خواندنی است نباید توسط این نقش ویرایش شود
          delete submissionData[fieldName];
        }
      }
    }

    const submissionId = formRepo.createSubmission({
      hospitalId,
      formId: form.id,
      formVersionId: activeVersion.id,
      userId: user.id,
      data: submissionData
    });

    return {
      id: submissionId,
      submissionId,
      form_id: form.id,
      version: activeVersion.version_number,
      status: 'submitted'
    };
  }

  async listSubmissions(hospitalId, formIdOrSlug) {
    const form = formRepo.findFormByIdOrSlug(hospitalId, formIdOrSlug);
    if (!form) throw new Error('فرم یافت نشد');
    return formRepo.findSubmissions(hospitalId, form.id);
  }

  async reviewSubmission(submissionId, reviewerUser, { status, rejection_reason }) {
    const sub = formRepo.findSubmissionById(submissionId);
    if (!sub) throw new Error('پاسخ ثبت‌شده یافت نشد');

    formRepo.updateSubmissionReview({
      submissionId,
      reviewerId: reviewerUser.id,
      status,
      rejectionReason: rejection_reason
    });

    return { success: true, submissionId, status };
  }
}

module.exports = new FormService();

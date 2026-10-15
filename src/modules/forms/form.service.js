/**
 * Form Engine Service — Business Logic & Schema Validation (Ajv)
 */
const formRepo = require('./form.repository');
const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true, coerceTypes: true });

// ---------------------------------------------------------------------------
// گاردِ «ارسالِ تکراری فرم» — شناسه‌ی یکتای سمتِ کلاینت (client_token)
// ---------------------------------------------------------------------------
// چرا این‌جاست: آزمونِ W5 (tests/w5-session-and-duplicate.test.js) با شاهدِ اجرایی نشان
// داد دو POSTِ یکسان به /api/forms/<slug>/submit دو رکورد می‌سازد (هر دو ۲۰۱) و هدرِ
// Idempotency-Key هیچ‌جا خوانده نمی‌شد. گارد opt-in است: کلاینت اگر بخواهد برای هر
// «تلاشِ ارسال» یک توکن یکتا می‌فرستد؛ بارِ دوم به‌جای رکوردِ تازه همان رکوردِ اول
// برمی‌گردد (۲۰۰ + duplicate:true). کلاینتِ بدونِ توکن عیناً رفتار امروز را می‌بیند.
// تکیه‌گاهِ نهایی ایندکسِ یکتای جزئی در دیتابیس است (مهاجرت:
// database/migrate-form-submission-client-token.js) تا مسابقه‌ی دو درخواستِ همزمان هم
// رکوردِ دوم نسازد — یعنی گارد فقط سمتِ کلاینت نیست (قاعده‌ی ۶).
const CLIENT_TOKEN_KEY = 'client_token';
// قالب عمداً باریک است: UUID و شناسه‌های تولیدی جاوااسکریپت را می‌پذیرد و هر چیزِ دیگر
// (متن آزاد/طولِ زیاد) را رد می‌کند تا از ستون برای محتوای دلخواه استفاده نشود.
const CLIENT_TOKEN_RE = /^[A-Za-z0-9._:-]{1,64}$/;

function invalidClientTokenError() {
  const err = new Error('شناسه‌ی یکتای ارسال (client_token) نامعتبر است: باید رشته‌ی ۱ تا ۶۴ کاراکتری و فقط شامل حروف/ارقام انگلیسی و − . _ : باشد.');
  err.status = 400;   // میان‌افزارِ خطای انتهای src/app.js همین status را ۴۰۰ می‌کند
  return err;
}

/** undefined/null = «توکنی نیامده» → مسیرِ امروز. هر مقدارِ دیگر باید رشته‌ی مجاز باشد. */
function normalizeClientToken(raw) {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string' || !CLIENT_TOKEN_RE.test(raw)) throw invalidClientTokenError();
  return raw;
}

/** آیا خطای INSERT از قیدِ یکتای client_token آمده (مسابقه‌ی همزمان)؟ */
function isClientTokenConflict(err) {
  if (!err) return false;
  // SQLite نامِ ایندکس را در متنِ خطا می‌آورد؛ به همان تکیه می‌کنیم نه به پیامِ کلی.
  return /uq_form_submissions_client_token/i.test(String(err.message || ''));
}

/** پاسخِ «این ارسال قبلاً ثبت شده است» — همان شکلِ پاسخِ ثبت + duplicate:true. */
function duplicateResult(row, formId) {
  return {
    id: row.id,
    submissionId: row.id,
    form_id: formId,
    version: row.version_number || null,
    status: row.status || 'submitted',
    duplicate: true,
  };
}

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
    // تفکیکِ «لفافِ درخواست» از «داده‌ی فرم» پیش از هر اعتبارسنجی: client_token بخشی از
    // پاسخِ فرم نیست و نباید در data_json ذخیره شود — و اگر روزی فرمی فیلدی به همین نام
    // داشته باشد، توکن جای داده‌ی واقعی را نمی‌گیرد. این کلید فقط در سطحِ بدنه‌ی درخواست
    // معنا دارد (بدونِ توکن، هیچ‌چیزِ این مسیر تغییر نمی‌کند).
    let data = submissionData;
    let clientToken = null;
    if (data && typeof data === 'object' && !Array.isArray(data) &&
        Object.prototype.hasOwnProperty.call(data, CLIENT_TOKEN_KEY)) {
      clientToken = normalizeClientToken(data[CLIENT_TOKEN_KEY]);
      data = { ...data };
      delete data[CLIENT_TOKEN_KEY];
    }
    if (clientToken && !formRepo.hasClientTokenColumn()) {
      // به‌جای خطای مبهمِ «no such column: client_token»: یعنی مهاجرت اجرا نشده و بدونِ آن
      // توکن هیچ تضمینی در سطحِ داده ندارد (خطرِ بازگشتِ همان باگِ تکراری‌شدنِ w5).
      throw new Error('ستون client_token روی این دیتابیس ساخته نشده است؛ مهاجرت database/migrate-form-submission-client-token.js اجرا نشده.');
    }

    const form = formRepo.findFormByIdOrSlug(hospitalId, formIdOrSlug);
    if (!form) throw new Error('فرم مورد نظر یافت نشد.');

    // گاردِ تکرار عمداً *پیش از* اعتبارسنجی Ajv است: بازفرستِ شبکه همان بدنه را دارد و اگر
    // اسکیمای فعال در فاصله‌ی دو تلاش عوض شده باشد نباید ۴۰۰ بگیرد؛ پاسخِ ثبت‌شده مرجع است.
    // توکن یک «قابلیت» در محدوده‌ی همین فرم است: هر کس مجوزِ fill این فرم را دارد (همان
    // میان‌افزارِ مسیر) می‌تواند پاسخِ ثبت‌شده‌ی همان فرم را با توکنش ببیند.
    if (clientToken) {
      const existing = formRepo.findSubmissionByClientToken(hospitalId, form.id, clientToken);
      if (existing) return duplicateResult(existing, form.id);
    }

    const activeVersion = formRepo.getLatestPublishedVersion(form.id);
    if (!activeVersion) throw new Error('این فرم هنوز هیچ نسخه منتشرشده‌ای ندارد.');

    const schema = JSON.parse(activeVersion.schema_json);

    // ۲. اعتبارسنجی داده ورودی در برابر اسکیمای نسخه فعال
    const validate = ajv.compile(schema);
    const valid = validate(data);
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
        if (rule === 'read_only' && data[fieldName] !== undefined) {
          // اگر فیلد فقط خواندنی است نباید توسط این نقش ویرایش شود
          delete data[fieldName];
        }
      }
    }

    let submissionId;
    try {
      submissionId = formRepo.createSubmission({
        hospitalId,
        formId: form.id,
        formVersionId: activeVersion.id,
        userId: user.id,
        data,
        clientToken
      });
    } catch (err) {
      // مسابقه: بین بررسیِ بالا و همین INSERT، درخواستِ همزمانِ دیگری همان توکن را ثبت کرد
      // و ایندکسِ یکتا جلوی این یکی را گرفت. اینجا هم باید پاسخِ «قبلاً ثبت شده» برگردد، نه
      // ۵۰۰ — یعنی گارد واقعاً در سطحِ داده است، نه یک SELECTِ خوش‌بینانه.
      if (clientToken && isClientTokenConflict(err)) {
        const existing = formRepo.findSubmissionByClientToken(hospitalId, form.id, clientToken);
        if (existing) return duplicateResult(existing, form.id);
      }
      throw err;
    }

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

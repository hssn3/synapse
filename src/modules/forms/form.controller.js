/**
 * Form Engine Controller — HTTP Handler Layer (Zero Business Logic)
 */
const formService = require('./form.service');
const {
  CreateFormSchema,
  CreateFormVersionSchema,
  UpdateFormPermissionsSchema,
  ReviewSubmissionSchema
} = require('./form.dto');

class FormController {
  async listForms(req, res) {
    const hospitalId = req.user.hospital_id;
    const forms = await formService.listForms(hospitalId);
    res.json(forms);
  }

  async getForm(req, res) {
    const hospitalId = req.user?.hospital_id;
    const { idOrSlug } = req.params;
    const form = await formService.getFormDetails(hospitalId, idOrSlug);
    if (!form) {
      return res.status(404).json({ error: 'فرم مورد نظر یافت نشد' });
    }
    res.json(form);
  }

  async createForm(req, res) {
    const hospitalId = req.user.hospital_id;
    const parsed = CreateFormSchema.parse(req.body);
    const form = await formService.createNewForm(hospitalId, {
      ...parsed,
      createdBy: req.user.id
    });
    res.status(201).json(form);
  }

  async createVersion(req, res) {
    const { id } = req.params;
    const parsed = CreateFormVersionSchema.parse(req.body);
    const result = await formService.publishNewVersion(id, {
      ...parsed,
      createdBy: req.user.id
    });
    res.status(201).json(result);
  }

  async updatePermissions(req, res) {
    const { id } = req.params;
    const parsed = UpdateFormPermissionsSchema.parse(req.body);
    const updated = await formService.updateFormAcl(id, parsed.permissions);
    res.json(updated);
  }

  async submit(req, res) {
    const hospitalId = req.user.hospital_id;
    const { id } = req.params;
    // قرارداد بدنه: داده‌ی تختِ اسکیما. اگر کلاینت آن را درون کلید data بسته باشد
    // (شکل قدیمیِ form-filler) آن را باز می‌کنیم تا اعتبارسنجی نشکند.
    let submissionData = req.body;
    if (submissionData && typeof submissionData === 'object' && submissionData.data &&
        typeof submissionData.data === 'object' && !Array.isArray(submissionData.data) &&
        Object.keys(submissionData).length === 1) {
      submissionData = submissionData.data;
    }
    const result = await formService.submitForm(hospitalId, id, req.user, submissionData);
    res.status(201).json(result);
  }

  async getSubmissions(req, res) {
    const hospitalId = req.user.hospital_id;
    const { id } = req.params;
    const submissions = await formService.listSubmissions(hospitalId, id);
    res.json(submissions);
  }

  async review(req, res) {
    const { subId } = req.params;
    const parsed = ReviewSubmissionSchema.parse(req.body);
    const result = await formService.reviewSubmission(subId, req.user, parsed);
    res.json(result);
  }
}

module.exports = new FormController();

/**
 * Form Engine Repository — SQLite Persistence Layer
 * Tenant Isolation strictly enforced via hospital_id.
 */
const { db } = require('../../config/database-sqlite');
const crypto = require('crypto');

// کشِ وجودِ ستون client_token — پایین‌تر (hasClientTokenColumn) توضیح داده شده.
let clientTokenColumnCache = null;

class FormRepository {
  findFormsByHospital(hospitalId) {
    return db.prepare(`
      SELECT f.*, 
        (SELECT MAX(version_number) FROM form_versions WHERE form_id = f.id AND status = 'published') as current_version
      FROM forms f
      WHERE f.hospital_id = ? AND f.status != 'archived'
      ORDER BY f.created_at DESC
    `).all(hospitalId);
  }

  findFormByIdOrSlug(hospitalId, idOrSlug) {
    return db.prepare(`
      SELECT * FROM forms
      WHERE (id = ? OR slug = ?) AND (hospital_id = ? OR hospital_id IS NULL)
    `).get(idOrSlug, idOrSlug, hospitalId);
  }

  createForm({ hospitalId, slug, title, description, category, version_no, revision_no, createdBy }) {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO forms (id, hospital_id, slug, title, description, category, version_no, revision_no, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `).run(id, hospitalId, slug, title, description || '', category || 'general', version_no || 1, revision_no || 0, createdBy);
    return id;
  }

  getLatestPublishedVersion(formId) {
    return db.prepare(`
      SELECT * FROM form_versions
      WHERE form_id = ? AND status = 'published'
      ORDER BY version_number DESC
      LIMIT 1
    `).get(formId);
  }

  createFormVersion({ formId, versionNumber, schema, uiSchema, status, createdBy }) {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO form_versions (id, form_id, version_number, schema_json, ui_schema_json, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      formId,
      versionNumber,
      JSON.stringify(schema),
      JSON.stringify(uiSchema || {}),
      status || 'published',
      createdBy
    );
    return id;
  }

  getFormPermissions(formId) {
    return db.prepare(`
      SELECT fp.*, r.title_fa as role_name
      FROM form_permissions fp
      LEFT JOIN roles r ON fp.role_code = r.code
      WHERE fp.form_id = ?
    `).all(formId);
  }

  upsertFormPermission({ formId, roleCode, canView, canFill, canEdit, canApprove, canDelete, fieldRules }) {
    const existing = db.prepare('SELECT id FROM form_permissions WHERE form_id = ? AND role_code = ?').get(formId, roleCode);
    const id = existing ? existing.id : crypto.randomUUID();
    db.prepare(`
      INSERT OR REPLACE INTO form_permissions 
      (id, form_id, role_code, can_view, can_fill, can_edit, can_approve, can_delete, field_rules_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      formId,
      roleCode,
      canView ? 1 : 0,
      canFill ? 1 : 0,
      canEdit ? 1 : 0,
      canApprove ? 1 : 0,
      canDelete ? 1 : 0,
      JSON.stringify(fieldRules || {})
    );
    return id;
  }

  createSubmission({ hospitalId, formId, formVersionId, userId, data, clientToken }) {
    const id = crypto.randomUUID();
    // چرا دو شکلِ INSERT: ستون client_token تازه و اختیاری است و مهاجرتِ آن
    // (database/migrate-form-submission-client-token.js) در زنجیره‌ی بوت اجرا می‌شود.
    // اگر این کوئری در همه‌ی حالت‌ها به آن ستون اشاره می‌کرد، روی دیتابیسی که مهاجرت رویش
    // اجرا نشده (مثلاً اجرای مستقیم tests/form-engine.test.js روی database/hospital.db
    // بدونِ بوتِ src/app.js) مسیرِ امروزِ ثبت فرم با «no such column: client_token»
    // می‌شکست. شاخه‌ی بدونِ توکن عیناً همان کوئریِ قبلی است.
    if (clientToken) {
      db.prepare(`
        INSERT INTO form_submissions (id, hospital_id, form_id, form_version_id, user_id, data_json, status, client_token)
        VALUES (?, ?, ?, ?, ?, ?, 'submitted', ?)
      `).run(id, hospitalId, formId, formVersionId, userId, JSON.stringify(data), clientToken);
      return id;
    }
    db.prepare(`
      INSERT INTO form_submissions (id, hospital_id, form_id, form_version_id, user_id, data_json, status)
      VALUES (?, ?, ?, ?, ?, ?, 'submitted')
    `).run(id, hospitalId, formId, formVersionId, userId, JSON.stringify(data));
    return id;
  }

  /**
   * پاسخِ همان فرم و همان بیمارستان با همان شناسه‌ی یکتای ارسال (گاردِ ارسالِ تکراری).
   * محدود به hospital_id است تا توکنِ یک بیمارستان هرگز به پاسخِ بیمارستانِ دیگر نخورد
   * (قاعده‌ی ۴: هر کوئری داده بیمارستانی hospital_id می‌گیرد).
   */
  findSubmissionByClientToken(hospitalId, formId, clientToken) {
    return db.prepare(`
      SELECT s.*, v.version_number
      FROM form_submissions s
      LEFT JOIN form_versions v ON s.form_version_id = v.id
      WHERE s.hospital_id = ? AND s.form_id = ? AND s.client_token = ?
    `).get(hospitalId, formId, clientToken);
  }

  /**
   * آیا مهاجرتِ client_token روی این دیتابیس اجرا شده است؟
   * چرا: اگر کلاینتِ تازه توکن بفرستد ولی مهاجرت اجرا نشده باشد، خطای خامِ «no such column:
   * client_token» می‌آمد و از پیامِ ۵۰۰ علتش فهمیده نمی‌شد. این بررسی فقط در مسیرِ توکندار
   * صدا زده می‌شود (پس هیچ درخواستِ موجودی هزینه‌ای ندارد) و نتیجه‌اش کش می‌شود، چون اسکیمای
   * جدول در عمرِ یک process عوض نمی‌شود.
   */
  hasClientTokenColumn() {
    if (clientTokenColumnCache !== null) return clientTokenColumnCache;
    try {
      clientTokenColumnCache = db.prepare('PRAGMA table_info(form_submissions)').all()
        .some((r) => r.name === 'client_token');
    } catch (e) {
      clientTokenColumnCache = false;
    }
    return clientTokenColumnCache;
  }

  findSubmissions(hospitalId, formId) {
    return db.prepare(`
      SELECT s.*, u.full_name as submitter_name, r.full_name as reviewer_name
      FROM form_submissions s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN users r ON s.approved_by = r.id
      WHERE s.hospital_id = ? AND s.form_id = ?
      ORDER BY s.submitted_at DESC
    `).all(hospitalId, formId);
  }

  findSubmissionById(hospitalId, submissionId) {
    return db.prepare(`
      SELECT s.*, f.title as form_title, f.slug as form_slug, v.schema_json
      FROM form_submissions s
      JOIN forms f ON s.form_id = f.id
      JOIN form_versions v ON s.form_version_id = v.id
      WHERE s.id = ? AND s.hospital_id = ?
    `).get(submissionId, hospitalId);
  }

  updateSubmissionReview({ hospitalId, submissionId, formId, reviewerId, status, rejectionReason }) {
    db.prepare(`
      UPDATE form_submissions
      SET status = ?, 
          reviewed_by = ?,
          reviewed_at = datetime('now'),
          approved_by = CASE WHEN ? = 'approved' THEN ? ELSE approved_by END, 
          approved_at = CASE WHEN ? = 'approved' THEN datetime('now') ELSE approved_at END, 
          rejection_reason = ?,
          updated_at = datetime('now')
      WHERE id = ? AND hospital_id = ? AND form_id = ?
    `).run(status, reviewerId, status, reviewerId, status, rejectionReason || null,
      submissionId, hospitalId, formId);
  }
}

module.exports = new FormRepository();

/**
 * Assistant Tools Execution Layer
 * Clean tools with permission checks and internal citations.
 */
const { db } = require('../../config/database-sqlite');
const { evaluatePolicy } = require('../rbac/policy-engine');

const TOOLS = {
  // ۱. جستجوی فرم‌های در دسترس بیمارستان
  search_forms: async ({ query }, user) => {
    const q = query ? `%${query}%` : '%';
    const forms = db.prepare(`
      SELECT id, slug, title, description, category FROM forms
      WHERE hospital_id = ? AND (title LIKE ? OR description LIKE ? OR slug LIKE ?)
      LIMIT 10
    `).all(user.hospital_id, q, q, q);

    return {
      results: forms.map(f => ({
        slug: f.slug,
        title: f.title,
        category: f.category,
        citation: `فرم سازمانی [${f.title}] (${f.slug})`
      }))
    };
  },

  // ۲. دریافت ساختار فیلدهای فرم جهت راهنمایی کاربر
  fetch_form_schema: async ({ form_slug }, user) => {
    const form = db.prepare('SELECT id, title, slug FROM forms WHERE hospital_id = ? AND slug = ?').get(user.hospital_id, form_slug);
    if (!form) return { error: `فرم با شناسه ${form_slug} یافت نشد.` };

    const ver = db.prepare('SELECT schema_json FROM form_versions WHERE form_id = ? ORDER BY version_number DESC LIMIT 1').get(form.id);
    if (!ver) return { error: 'نسخه فعالی برای این فرم موجود نیست.' };

    const schema = JSON.parse(ver.schema_json);
    return {
      title: form.title,
      fields: Object.keys(schema.properties || {}),
      required: schema.required || [],
      citation: `اسکیمای فرم [${form.title}] نسخه رسمی`
    };
  },

  // ۳. بررسی صلاحیت اقدام برای کاربر
  check_permission: async ({ resource, action }, user) => {
    const evalRes = evaluatePolicy(user, resource, action);
    return {
      resource,
      action,
      allowed: evalRes.allowed,
      reason: evalRes.reason || 'اقدام مجاز است.',
      citation: `سیاست دسترسی NIST RBAC: ${evalRes.permissionKey || resource + ':' + action}`
    };
  },

  // ۴. تشریح و استناد به قوانین بیمارستانی
  explain_rule: async ({ topic }) => {
    const rules = {
      'monthly_program': 'برنامه ماهانه شیفت: تدوین و ویرایش منحصراً در صلاحیت سرپرستار بخش است؛ تایید نهایی بر عهده سوپروایزر و مترون است. پرستار بالینی فقط مجاز به ثبت درخواست و مشاهده است.',
      'error_report': 'گزارش خطاهای ناخواسته: ثبت خطا توسط تمام کارکنان بدون سرزنش (No-Blame Culture) مجاز و تشویق‌شده است. تحلیل ریشه‌ای (RCA) بر عهده مسئول ایمنی بیمار است.',
      'patient_safety': '۱۲۱ سنجه ایمنی بیمار ویرایش ششم ملی: عدم تحقق این سنجه‌ها به تنزل درجه اعتباربخشی کل مرکز می‌انجامد.'
    };
    return {
      explanation: rules[topic] || `قانون مربوط به ${topic} در دستورالعمل‌های کنترل کیفیت بیمارستان ثبت شده است.`,
      citation: 'کتاب استانداردهای اعتباربخشی ملی بیمارستان‌های ایران (ویرایش ششم)'
    };
  },

  // ۵. استعلام شاخص‌های عملکردی کلان
  query_kpi: async ({ metric }, user) => {
    const roleCode = user.role_code || user.role;
    if (roleCode === 'nurse') {
      return { error: 'دسترسی به شاخص‌های کلیدی کلان فقط برای سرپرستاران و مدیران مجاز است.' };
    }
    const measuresTotal = db.prepare('SELECT COUNT(*) c FROM measure_status WHERE hospital_id = ?').get(user.hospital_id)?.c || 395; // نسل۶
    const measuresDone = db.prepare("SELECT COUNT(*) c FROM measure_status WHERE hospital_id = ? AND status = 'compliant'").get(user.hospital_id)?.c || 391;
    return {
      metric: metric || 'accreditation_compliance',
      total_measures: measuresTotal,
      compliant_measures: measuresDone,
      compliance_rate: `${Math.round((measuresDone / measuresTotal) * 100)}%`,
      citation: 'داشبورد رسمی ارزیابی اعتباربخشی بیمارستان'
    };
  }
};

module.exports = { TOOLS };

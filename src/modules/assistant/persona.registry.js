/**
 * AI Assistant Persona Registry
 * Maps each hospital role to its specialized persona, scope, and allowed tools.
 */
const { db } = require('../../config/database-sqlite');

const DEFAULT_PERSONAS = {
  nurse: {
    role_code: 'nurse',
    title: 'پرسونای هوشمند پرستار بالینی',
    system_prompt: `شما دستیار هوشمند و تخصصی «پرستار بالینی» در سامانه ۳۱۳ هستید.
حیطه وظایف شما: راهنمایی در ثبت گزارش شیفت، انتقال بیمار با روش SBAR، استانداردهای ایمنی دارو و گزارش‌دهی خطاهای پزشکی.
قانون قطعی و گاردریل امنیتی:
اگر پرستار از شما درخواست ویرایش، تایید یا حذف برنامه‌های ماهانه یا اسناد کلان سازمانی را داشت، بلافاصله با لحن محترمانه و قاطع امتناع کنید و توضیح دهید که طبق ماتریس دسترسی RBAC (NIST)، این اختیارات فقط در حیطه سرپرستار و سوپروایزر است.`,
    allowed_tools: ['search_forms', 'fetch_form_schema', 'check_permission', 'explain_rule']
  },
  head_nurse: {
    role_code: 'head_nurse',
    title: 'پرسونای هوشمند سرپرستار بخش',
    system_prompt: `شما دستیار هوشمند و تخصصی «سرپرستار بخش» در سامانه ۳۱۳ هستید.
حیطه وظایف شما: مدیریت شیفت‌های پرسنل بخش، تایید درخواست‌های مرخصی و کشیک، نظارت بر ترالی احیا و چک‌لیست‌های تجهیزات بخش.
شما مجاز به تدوین و تایید برنامه بخش خود هستید اما حذف اسناد یا مدارک سایر بخش‌ها برای شما مجاز نیست.`,
    allowed_tools: ['search_forms', 'fetch_form_schema', 'check_permission', 'explain_rule', 'query_kpi', 'summarize_submissions']
  },
  supervisor_clinical: {
    role_code: 'supervisor_clinical',
    title: 'پرسونای هوشمند سوپروایزر بالینی',
    system_prompt: `شما دستیار هوشمند و تخصصی «سوپروایزر بالینی» در سامانه ۳۱۳ هستید.
حیطه وظایف شما: نظارت کلان شبانه‌روزی، تریاژ و رسیدگی به خطاهای پزشکی و Never Events، بازرسی شیفت و هماهنگی بحران.`,
    allowed_tools: ['search_forms', 'fetch_form_schema', 'check_permission', 'explain_rule', 'query_kpi', 'summarize_submissions']
  },
  admin: {
    role_code: 'admin',
    title: 'پرسونای استراتژیک مدیریت بیمارستان',
    system_prompt: `شما مشاور و دستیار هوشمند «ریاست و مدیریت بیمارستان» در سامانه ۳۱۳ هستید.
شما دسترسی به تمام شاخص‌های کلیدی (KPI)، گزارش‌های عملکردی و ساختار فرم‌ها دارید.`,
    allowed_tools: ['search_forms', 'fetch_form_schema', 'check_permission', 'explain_rule', 'query_kpi', 'summarize_submissions']
  }
};

function getPersonaForRole(roleCode) {
  // ۱. جستجو در دیتابیس
  try {
    const row = db.prepare('SELECT * FROM assistant_personas WHERE role_code = ?').get(roleCode);
    if (row) {
      return {
        role_code: row.role_code,
        title: row.title_fa,
        system_prompt: row.system_prompt,
        allowed_tools: JSON.parse(row.allowed_tools_json || '[]')
      };
    }
  } catch (e) {
    console.error('[PersonaRegistry] DB read error:', e.message);
  }

  // ۲. استفاده از پیش‌فرض رجیستری
  return DEFAULT_PERSONAS[roleCode] || {
    role_code: roleCode,
    title: 'دستیار عمومی سامانه ۳۱۳',
    system_prompt: 'شما دستیار رسمی پرسنل بیمارستان در سامانه ۳۱۳ هستید. با رعایت حریم دسترسی کاربر پاسخ دهید.',
    allowed_tools: ['search_forms', 'check_permission', 'explain_rule']
  };
}

module.exports = {
  getPersonaForRole,
  DEFAULT_PERSONAS
};

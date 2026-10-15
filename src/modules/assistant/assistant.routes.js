/**
 * Enterprise AI Assistant API Routes
 */
const express = require('express');
const router = express.Router();
const { authRequired } = require('../../middleware/auth');
const { authorize } = require('../rbac/authorize.middleware');
const assistantService = require('./assistant.service');
const { getPersonaForRole } = require('./persona.registry');

// سقف طول ورودی چت سازمانی. چرا لازم بود: پیش از این هیچ سقفی نبود و ورودیِ هر طولی (تا چند
// صد کیلوبایت) مستقیم به لایه‌ی بازیابی و — اگر کلید سرویس تنظیم باشد — به provider بیرونی
// می‌رفت؛ هر درخواستِ نامعتبر یعنی هزینه‌ی توکن و کندی برای همه. سقفِ ۴۰۰۰ از سقفِ ۲۰۰۰ مسیرِ
// قدیمی‌ترِ دانا (src/modules/core/assistant-legacy.routes.js:220) بازتر است، چون این مسیر متنِ
// context فرم (headers/fields) را هم می‌فرستد.
const MAX_MESSAGE_CHARS = 4000;
// مهلتِ provider بیرونی: chatComplete (src/services/ai-provider.js:379) و هر چهار fetch داخلش
// (خط ۱۳۸، ۱۶۲، ۲۴۲، ۲۵۸) هیچ timeout/AbortSignal ندارند؛ سرویسِ بیرونیِ گیرکرده درخواستِ کاربر
// را تا ابد باز می‌گذاشت. صداقتِ فنی: چون chatComplete سیگنال نمی‌گیرد و آن فایل خارج از دامنه‌ی
// این تغییر است، این abort خودِ درخواستِ HTTP بیرونی را نمی‌کُشد — تضمینِ واقعیِ این تغییر این است
// که «کاربر بیشتر از ۳۰ ثانیه منتظر نمی‌ماند و خطای خام نمی‌بیند». گامِ مکمل (خارج از این دامنه):
// افزودن signal به chatComplete و fetchهایش.
const PROVIDER_TIMEOUT_MS = 30000;

// گفتگوی هوشمند مقید به نقش با پرسونای متناظر
router.post('/chat', authRequired, async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'متن پیام الزامی است.' });
    }
    // اعتبارسنجی سمت سرور (قاعده ۶): فرانت هم می‌تواند بشمارد، ولی مرزِ واقعی همین‌جاست.
    if (typeof message !== 'string' || message.trim().length > MAX_MESSAGE_CHARS) {
      return res.status(400).json({
        error: `متن پیام بیش از حد مجاز است — حداکثر ${MAX_MESSAGE_CHARS} کاراکتر`,
        max_chars: MAX_MESSAGE_CHARS,
        message_chars: typeof message === 'string' ? message.trim().length : -1,
      });
    }

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), PROVIDER_TIMEOUT_MS);
    let result;
    try {
      result = await Promise.race([
        assistantService.processUserMessage(req.user, message, context),
        new Promise((_, reject) => {
          ac.signal.addEventListener('abort', () => {
            const e = new Error('PROVIDER_TIMEOUT');
            e.code = 'PROVIDER_TIMEOUT';
            reject(e);
          }, { once: true });
        }),
      ]);
    } finally {
      clearTimeout(timer);   // درخواستِ سریع نباید تایمرِ ۳۰ ثانیه‌ای را تا آخر نگه دارد
    }
    res.json(result);
  } catch (err) {
    if (err && err.code === 'PROVIDER_TIMEOUT') {
      // «پس‌افتِ امن» عمداً ۲۰۰ است نه ۵۰۴: پنلِ چت سازمانی res.ok را چک نمی‌کند و فقط
      // data.response را نشان می‌دهد (public/js/enterprise-assistant-panel.js:263-296)، پس
      // خطای خام برای کاربر یعنی حبابِ خطای بی‌توضیح — و خواسته‌ی صریح، پرهیز از ۵۰۰ خام بود.
      console.warn('[Assistant] provider timeout after', PROVIDER_TIMEOUT_MS, 'ms');
      return res.json({
        response: `سرویس کمکی بیش از ${PROVIDER_TIMEOUT_MS / 1000} ثانیه پاسخ نداد، پس این درخواست رها شد. `
          + 'لطفاً کوتاه‌تر بپرسید یا کمی بعد دوباره تلاش کنید؛ اگر تکرار شد، سوپرادمین باید وضعیت سرویس را بررسی کند.',
        persona: getPersonaForRole(req.user.role_code || req.user.role || 'user').title,
        citations: [],
        guardrail_status: 'provider_timeout',
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// دریافت پرسونای اختصاصی نقش جاری
router.get('/persona', authRequired, (req, res) => {
  const roleCode = req.user.role_code || req.user.role || 'user';
  const persona = getPersonaForRole(roleCode);
  res.json({
    role_code: roleCode,
    title: persona.title,
    system_prompt: persona.system_prompt,
    allowed_tools: persona.allowed_tools
  });
});

// ممیزی و مشاهده لاگ تعاملات دستیار
router.get('/audit', authRequired, authorize('assistant:audit', 'view'), (req, res) => {
  const logs = assistantService.getAuditLogs(req.user.hospital_id);
  res.json(logs);
});

module.exports = router;

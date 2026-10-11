/**
 * Enterprise AI Assistant API Routes
 */
const express = require('express');
const router = express.Router();
const { authRequired } = require('../../middleware/auth');
const { authorize } = require('../rbac/authorize.middleware');
const assistantService = require('./assistant.service');
const { getPersonaForRole } = require('./persona.registry');

// گفتگوی هوشمند مقید به نقش با پرسونای متناظر
router.post('/chat', authRequired, async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'متن پیام الزامی است.' });
    }

    const result = await assistantService.processUserMessage(req.user, message, context);
    res.json(result);
  } catch (err) {
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

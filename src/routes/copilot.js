// src/routes/copilot.js
// API endpoints برای Unified Copilot

const express = require('express');
const router = express.Router();
const { authRequired, hospitalScope } = require('../middleware/auth');
const copilot = require('../services/unified-copilot');
const { getAiProvider } = require('../services/ai-provider');

// شروع گفت‌وگوی جدید
router.post('/conversations/start', authRequired, hospitalScope, async (req, res) => {
  try {
    const { persona = 'guide', context = {} } = req.body;
    
    const conversation = copilot.startConversation(
      req.hospitalId,
      req.user.id,
      persona,
      context
    );

    res.json(conversation);
  } catch (err) {
    console.error('[Copilot] Start conversation error:', err);
    res.status(500).json({ error: 'خطا در شروع گفت‌وگو' });
  }
});

// ارسال پیام
router.post('/conversations/:id/message', authRequired, hospitalScope, async (req, res) => {
  try {
    const { message } = req.body;
    const conversationId = req.params.id;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'پیام نمی‌تواند خالی باشد' });
    }
    if (message.length > 4000) {
      return res.status(400).json({ error: 'متن پیام بیش از حد مجاز است (حداکثر ۴۰۰۰ نویسه)' });
    }

    const aiProvider = getAiProvider();
    const response = await copilot.sendMessage(conversationId, message, aiProvider,
      { hospitalId: req.hospitalId, userId: req.user.id });

    res.json(response);
  } catch (err) {
    if (err.message && err.message.includes('Session not found')) {
      return res.status(404).json({ error: 'گفت‌وگو یافت نشد' });
    }
    console.error('[Copilot] Send message error:', err);
    res.status(500).json({ error: 'خطا در ارسال پیام' });
  }
});

// تعویض پرسونا
router.post('/conversations/:id/persona', authRequired, hospitalScope, async (req, res) => {
  try {
    const { persona } = req.body;
    const conversationId = req.params.id;

    if (!persona) {
      return res.status(400).json({ error: 'پرسونا مشخص نشده است' });
    }

    const result = copilot.switchPersona(conversationId, persona,
      { hospitalId: req.hospitalId, userId: req.user.id });

    res.json(result);
  } catch (err) {
    if (err.message && err.message.includes('Session not found')) {
      return res.status(404).json({ error: 'گفت‌وگو یافت نشد' });
    }
    console.error('[Copilot] Switch persona error:', err);
    res.status(500).json({ error: 'خطا در تعویض پرسونا' });
  }
});

// لیست گفت‌وگوها
router.get('/conversations', authRequired, hospitalScope, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const conversations = copilot.listConversations(req.hospitalId, req.user.id, limit);

    res.json({ conversations });
  } catch (err) {
    console.error('[Copilot] List conversations error:', err);
    res.status(500).json({ error: 'خطا در دریافت لیست گفت‌وگوها' });
  }
});

// تاریخچه گفت‌وگو
router.get('/conversations/:id', authRequired, hospitalScope, (req, res) => {
  try {
    const conversationId = req.params.id;
    const history = copilot.getConversationHistory(conversationId, req.user.id);

    res.json(history);
  } catch (err) {
    if (err.message && err.message.includes('Session not found')) {
      return res.status(404).json({ error: 'گفت‌وگو یافت نشد' });
    }
    console.error('[Copilot] Get conversation error:', err);
    res.status(500).json({ error: 'خطا در دریافت تاریخچه گفت‌وگو' });
  }
});

// پاک‌کردن گفت‌وگو
router.delete('/conversations/:id', authRequired, hospitalScope, (req, res) => {
  try {
    const conversationId = req.params.id;
    copilot.deleteConversation(conversationId, req.user.id);

    res.json({ success: true });
  } catch (err) {
    console.error('[Copilot] Delete conversation error:', err);
    res.status(500).json({ error: 'خطا در پاک‌کردن گفت‌وگو' });
  }
});

// آمار استفاده
router.get('/stats', authRequired, hospitalScope, (req, res) => {
  try {
    const stats = copilot.getCopilotStats(req.hospitalId);

    res.json({ stats });
  } catch (err) {
    console.error('[Copilot] Stats error:', err);
    res.status(500).json({ error: 'خطا در دریافت آمار' });
  }
});

// لیست پرسوناها
router.get('/personas', authRequired, (req, res) => {
  res.json({ personas: Object.values(copilot.PERSONAS) });
});

module.exports = router;

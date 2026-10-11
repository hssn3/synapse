'use strict';
// روتر اعلان داخل اپ — مورد ۱۱
// GET /api/notifications — لیست ۵۰ تای اخیر کاربر جاری + شمار نخوانده
// POST /api/notifications — ساخت اعلان (با مجوز manage_users یا سیستمی)
// PATCH /api/notifications/:id/read — خوانده شد
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query } = require('../config/database-sqlite');
const { authRequired, requirePermission, hospitalScope } = require('../middleware/auth');

router.get('/notifications', authRequired, (req, res) => {
  try {
    const rows = query(`
      SELECT id, title, body, link, is_read, created_at
      FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
    `, [req.user.id]).rows;
    const unread = query('SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND is_read = 0', [req.user.id]).rows[0].c;
    res.json({ items: rows, unread });
  } catch (err) { console.error('[Notifications]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/notifications', authRequired, requirePermission('manage_users'), hospitalScope, (req, res) => {
  try {
    const { user_id, title, body, link } = req.body || {};
    if (!user_id || !title) return res.status(400).json({ error: 'user_id و title الزامی است' });
    const id = crypto.randomUUID();
    query('INSERT INTO notifications (id, hospital_id, user_id, title, body, link) VALUES (?,?,?,?,?,?)',
      [id, req.hospitalId || null, user_id, String(title).slice(0, 200), String(body || '').slice(0, 2000), link || null]);
    res.json({ id });
  } catch (err) { console.error('[Notifications]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.patch('/notifications/:id/read', authRequired, (req, res) => {
  try {
    query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) { console.error('[Notifications]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

module.exports = router;

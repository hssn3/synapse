'use strict';
/**
 * روتر «ابلاغیه و دستور» (Directives)
 * ---------------------------------------------------------------------------
 * GET    /api/directives            ابلاغیه‌هایی که من Getterام یا صادر کرده‌ام
 * POST   /api/directives            صدور ابلاغیه (مجوز manage_directives)
 * POST   /api/directives/:id/read   ثبت دریافت
 * POST   /api/directives/:id/ack    ثبت جوابیه/تأیید
 * GET    /api/directives/stats      آمار جوابیه برای صادرکننده
 *
 * قواعد امنیتیِ رعایت‌شده:
 *  - hospitalScope: فقط بیمارستان خودِ کاربر
 *  - leader→subordinate: گیرنده‌ها باید زیرمجموعه‌ی سمتِ صادرکننده باشند
 *    (از users.supervisor_id). اگر گیرنده در زیرمجموعه نباشد → 403.
 *  - خواندن/جوابیه فقط برای گیرنده‌ی همان سطر مجاز است.
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query } = require('../config/database-sqlite');
const { authRequired, requirePermission, hospitalScope } = require('../middleware/auth');

const VALID_CATEGORIES = ['directive', 'announcement', 'memo'];
const VALID_PRIORITIES = ['normal', 'high', 'urgent'];

// چه کسانی گیرنده‌ی مجازِ این کاربرند؟
// قاعده: «مدیر ارشدِ بیمارستان» (admin/ریاست) می‌تواند به همه‌ی بیمارستان
// ابلاغ کند؛ سایر مدیران فقط به زیرمجموعه‌های زنجیره‌ی supervisor_id خودشان.
// چرا این دوحالتی: build-org-chain زنجیره واقعیِ ساخته، ولی سطوحِ الویتِ
// نقش‌ها در این سامانه سنگین‌تر از فیلد خام supervisor_id است — و اگر فقط به
// زنجیره‌ی supervisor متکی بودیم، ریاستِ بیمارستان (کسی زیرش نیست چون مستقیماً
// به ریشه وصل نیست) نمی‌توانست به پرستارها ابلاغ کند، در حالی که کلِ نامِ
// «ریاست» همان مالکیتِ عملیاتیِ بیمارستان است.
function audienceOf(hospitalId, userId) {
  const myRole = query(`
    SELECT r.code, COALESCE(r.hierarchy_level, 99) AS lvl
    FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?
  `, [userId]).rows[0];

  const isLeader = myRole && (myRole.code === 'admin' || myRole.code === 'hospital_president' || Number(myRole.lvl) <= 1);
  if (isLeader) return { all: true, ids: new Set() };

  // سایر نقش‌ها: زنجیره‌ی supervisor_id (خودش + زیرمجموعه‌های واقعی)
  const out = new Set([userId]);
  let frontier = [userId];
  let guard = 0;
  while (frontier.length && guard++ < 10) {
    const mark = frontier.map(() => '?').join(',');
    const rows = query(`SELECT id FROM users WHERE supervisor_id IN (${mark})`, frontier).rows;
    const fresh = rows.map(r => r.id).filter(id => !out.has(id));
    fresh.forEach(id => out.add(id));
    frontier = fresh;
  }
  return { all: false, ids: out };
}

router.get('/directives', authRequired, hospitalScope, (req, res) => {
  try {
    // ابلاغیه‌هایی که من گیرنده‌ام یا صادر کرده‌ام
    const received = query(`
      SELECT d.*, dr.is_read, dr.read_at, dr.acknowledged_at, dr.ack_note,
             u.full_name AS sender_name, u.username AS sender_username,
             (SELECT COUNT(*) FROM directive_recipients x WHERE x.directive_id = d.id) AS audience_size
      FROM directive_recipients dr
      JOIN directives d ON d.id = dr.directive_id
      JOIN users u ON u.id = d.sender_id
      WHERE dr.user_id = ?
      ORDER BY d.created_at DESC LIMIT 200
    `, [req.user.id]).rows;

    const sent = query(`
      SELECT d.*, u.full_name AS sender_name,
             (SELECT COUNT(*) FROM directive_recipients x WHERE x.directive_id = d.id) AS audience_size,
             (SELECT COUNT(*) FROM directive_recipients x WHERE x.directive_id = d.id AND x.acknowledged_at IS NOT NULL) AS ack_count
      FROM directives d JOIN users u ON u.id = d.sender_id
      WHERE d.sender_id = ?
      ORDER BY d.created_at DESC LIMIT 200
    `, [req.user.id]).rows;

    const unread = received.filter(r => !r.is_read).length;

    // فهرست سمت‌های بیمارستان برای فرم صدور ابلاغیه — فقط سمت‌هایی که
    // دستِ‌کم یک کاربر فعال دارند (سمت بدون کاربر، گیرنده‌ی بی‌معنی است).
    const roles = query(`
      SELECT r.code, r.title_fa, COUNT(u.id) AS users
      FROM roles r JOIN users u ON u.role_id = r.id
      WHERE u.hospital_id = ? AND u.is_active = 1
      GROUP BY r.id ORDER BY COALESCE(r.hierarchy_order, 9999), r.title_fa
    `, [req.hospitalId]).rows;

    res.json({ received, sent, unread, roles });
  } catch (err) {
    console.error('[Directives] list:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/directives', authRequired, requirePermission('manage_directives'), hospitalScope, (req, res) => {
  try {
    const { title, body, category = 'directive', priority = 'normal',
            audience = 'roles', audience_ref = [], deadline, requires_ack = 1 } = req.body || {};

    if (!title || String(title).trim().length < 3) {
      return res.status(400).json({ error: 'عنوان ابلاغیه الزامی است (حداقل ۳ نویسه)' });
    }
    if (!VALID_CATEGORIES.includes(category)) return res.status(400).json({ error: 'نوع ابلاغیه نامعتبر است' });
    if (!VALID_PRIORITIES.includes(priority)) return res.status(400).json({ error: 'اولویت نامعتبر است' });
    if (!Array.isArray(audience_ref) || audience_ref.length === 0) {
      return res.status(400).json({ error: 'حداقل یک گیرنده باید انتخاب شود' });
    }

    // اعتبارسنجی گیرنده‌ها: باید همان بیمارستان و (بالادست یا زیرمجموعه) باشند
    let recipients = [];
    if (audience === 'roles') {
      const mark = audience_ref.map(() => '?').join(',');
      const rows = query(`
        SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id
        WHERE u.hospital_id = ? AND u.is_active = 1 AND r.code IN (${mark})
      `, [req.hospitalId, ...audience_ref]).rows;
      recipients = rows.map(r => r.id);
    } else {
      const mark = audience_ref.map(() => '?').join(',');
      const rows = query(`
        SELECT id FROM users WHERE hospital_id = ? AND is_active = 1 AND id IN (${mark})
      `, [req.hospitalId, ...audience_ref]).rows;
      recipients = rows.map(r => r.id);
    }

    if (!recipients.length) return res.status(400).json({ error: 'گیرنده‌ی معتبری پیدا نشد' });

    const scope = audienceOf(req.hospitalId, req.user.id);
    if (!scope.all) {
      const outside = recipients.filter(id => !scope.ids.has(id));
      if (outside.length) {
        return res.status(403).json({ error: 'فقط می‌توانید به زیرمجموعه‌های خودتان ابلاغ کنید' });
      }
    }

    const id = crypto.randomUUID();
    query(`INSERT INTO directives (id, hospital_id, sender_id, title, body, category, priority, audience, audience_ref, deadline, requires_ack, status)
           VALUES (?,?,?,?,?,?,?,?,?,?,?, 'sent')`,
      [id, req.hospitalId, req.user.id, String(title).slice(0, 250), body ? String(body).slice(0, 4000) : null,
       category, priority, audience, JSON.stringify(audience_ref), deadline || null, requires_ack ? 1 : 0]);

    for (const uid of recipients) {
      query('INSERT INTO directive_recipients (id, directive_id, user_id) VALUES (?,?,?)',
        [crypto.randomUUID(), id, uid]);
    }

    res.json({ id, recipients: recipients.length });
  } catch (err) {
    console.error('[Directives] create:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/directives/:id/read', authRequired, hospitalScope, (req, res) => {
  try {
    const r = query(
      'SELECT dr.id FROM directive_recipients dr JOIN directives d ON d.id = dr.directive_id WHERE dr.directive_id = ? AND dr.user_id = ? AND d.hospital_id = ?',
      [req.params.id, req.user.id, req.hospitalId]
    ).rows[0];
    if (!r) return res.status(404).json({ error: 'ابلاغیه برای شما یافت نشد' });
    query('UPDATE directive_recipients SET is_read = 1, read_at = ? WHERE id = ?', [new Date().toISOString(), r.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Directives] read:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/directives/:id/ack', authRequired, hospitalScope, (req, res) => {
  try {
    const { note } = req.body || {};
    const row = query(
      'SELECT dr.id FROM directive_recipients dr JOIN directives d ON d.id = dr.directive_id WHERE dr.directive_id = ? AND dr.user_id = ? AND d.hospital_id = ?',
      [req.params.id, req.user.id, req.hospitalId]
    ).rows[0];
    if (!row) return res.status(404).json({ error: 'ابلاغیه برای شما یافت نشد' });
    const now = new Date().toISOString();
    query('UPDATE directive_recipients SET is_read = 1, read_at = COALESCE(read_at, ?), acknowledged_at = ?, ack_note = ? WHERE id = ?',
      [now, now, note ? String(note).slice(0, 1000) : null, row.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Directives] ack:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

module.exports = router;

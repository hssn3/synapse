/**
 * Enterprise Core CRUD Engine (mountCrud)
 * Data-driven CRUD endpoint generator for hospital clinical and operational modules.
 */
const { query } = require('../../config/database-sqlite');
const { authRequired, requirePermission, requireAnyPermission, hospitalScope } = require('../../middleware/auth');
const { logAction } = require('../../middleware/audit');
const { uuid } = require('../../utils/db');

const _crudHasUpdatedAt = {};
function crudHasUpdatedAt(table) {
  if (_crudHasUpdatedAt[table] === undefined) {
    try {
      _crudHasUpdatedAt[table] = query(`PRAGMA table_info(${table})`).rows.some(r => r.name === 'updated_at');
    } catch (e) {
      _crudHasUpdatedAt[table] = false;
    }
  }
  return _crudHasUpdatedAt[table];
}

function crudNormalize(def, body) {
  const out = {};
  for (const f of def.fields) {
    let v = body[f];
    if ((def.bools || []).includes(f)) {
      if ((v === undefined || v === null || v === '') && def.defaults && def.defaults[f] !== undefined) {
        out[f] = def.defaults[f];
        continue;
      }
      out[f] = (v === 1 || v === '1' || v === true) ? 1 : 0;
      continue;
    }
    if ((def.ints || []).includes(f)) {
      const n = parseInt(v, 10);
      out[f] = Number.isFinite(n) ? n : null;
      continue;
    }
    if ((def.floats || []).includes(f)) {
      const n = parseFloat(v);
      out[f] = Number.isFinite(n) ? n : null;
      continue;
    }
    out[f] = v === undefined || v === null || v === '' ? null : String(v);
    if (out[f] === null && def.defaults && def.defaults[f] !== undefined) out[f] = def.defaults[f];
  }
  for (const [f, allowed] of Object.entries(def.enums || {})) {
    if (out[f] !== undefined && out[f] !== null && !allowed.includes(out[f])) {
      const e = new Error(def.fa + ': مقدار «' + f + '» نامعتبر است');
      e.httpStatus = 400;
      throw e;
    }
    if (!allowed.includes(out[f])) out[f] = allowed[0];
  }
  return out;
}

function mountCrud(router, prefix, RESOURCES, viewPerm, managePerm, tag) {
  const defOr404 = (req, res) => {
    const def = RESOURCES[req.params.res];
    if (!def) {
      res.status(404).json({ error: 'منبع نامعتبر' });
      return null;
    }
    return def;
  };

  router.get(`/${prefix}/:res`, authRequired, requireAnyPermission(viewPerm, managePerm), hospitalScope, (req, res) => {
    const def = defOr404(req, res);
    if (!def) return;
    try {
      const where = ['hospital_id = ?'];
      const params = [req.hospitalId];
      for (const f of def.fields) {
        if (req.query[f] !== undefined && req.query[f] !== '') {
          where.push(`${f} = ?`);
          params.push(String(req.query[f]));
        }
      }
      const whereClause = where.join(' AND ');

      const page = parseInt(req.query.page);
      const perPage = Math.min(parseInt(req.query.per_page) || 50, 200);

      if (Number.isFinite(page) && page >= 1) {
        const countResult = query(`SELECT COUNT(*) as c FROM ${def.table} WHERE ${whereClause}`, params).rows[0];
        const total = countResult ? countResult.c : 0;
        const offset = (page - 1) * perPage;
        const rows = query(`SELECT * FROM ${def.table} WHERE ${whereClause} ORDER BY ${def.order} LIMIT ? OFFSET ?`,
          [...params, perPage, offset]).rows;
        res.json({ items: rows, total, page, per_page: perPage, total_pages: Math.ceil(total / perPage) });
      } else {
        const rows = query(`SELECT * FROM ${def.table} WHERE ${whereClause} ORDER BY ${def.order}`, params).rows;
        res.json({ items: rows });
      }
    } catch (err) {
      console.error(`[${tag}]`, err);
      res.status(500).json({ error: 'خطای سرور' });
    }
  });

  router.post(`/${prefix}/:res`, authRequired, requirePermission(managePerm), hospitalScope, async (req, res) => {
    const def = defOr404(req, res);
    if (!def) return;
    let r;
    try {
      r = crudNormalize(def, req.body);
    } catch (err) {
      if (err && err.httpStatus) return res.status(err.httpStatus).json({ error: err.message });
      throw err;
    }
    const bad = def.validate ? def.validate(r) : null;
    if (bad) return res.status(400).json({ error: bad });
    try {
      const id = uuid();
      try {
        if (def.table === 'crm_tickets' && !(r.tracking_code && String(r.tracking_code).trim())) {
          const hs = String(req.hospitalId || 'HOSP').replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() || 'HOSP';
          const yr = new Date().getFullYear();
          let code = '';
          for (let i = 0; i < 5; i++) {
            code = 'TCK-' + hs + '-' + yr + '-' + Math.floor(100000 + Math.random() * 900000);
            const ex = query('SELECT 1 AS x FROM crm_tickets WHERE tracking_code = ?', [code]).rows[0];
            if (!ex) break;
          }
          r.tracking_code = code;
        }
      } catch (e) {
        if (!r.tracking_code) r.tracking_code = 'TCK-' + Date.now().toString(36).toUpperCase();
      }
      query(`INSERT INTO ${def.table} (id, hospital_id, ${def.fields.join(', ')}, created_by)
        VALUES (${new Array(def.fields.length + 3).fill('?').join(', ')})`,
        [id, req.hospitalId, ...def.fields.map(f => r[f]), req.user.id]);
      await logAction({
        hospitalId: req.hospitalId,
        userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id,
        action: `${prefix}_created`,
        targetTable: def.table,
        targetId: id,
        ipAddress: req.ip
      });
      res.json({ item: { id } });
    } catch (err) {
      if (def.uniqueHint && /UNIQUE constraint/.test(String(err.message || ''))) {
        return res.status(400).json({ error: def.uniqueHint.msg });
      }
      console.error(`[${tag}]`, err);
      res.status(500).json({ error: 'خطای سرور' });
    }
  });

  router.put(`/${prefix}/:res/:id`, authRequired, requirePermission(managePerm), hospitalScope, (req, res) => {
    const def = defOr404(req, res);
    if (!def) return;
    try {
      const cur = query(`SELECT * FROM ${def.table} WHERE id = ? AND hospital_id = ?`, [req.params.id, req.hospitalId]).rows[0];
      if (!cur) return res.status(404).json({ error: def.fa + ' یافت نشد' });
      let r;
      try {
        r = crudNormalize(def, req.body);
      } catch (err) {
        if (err && err.httpStatus) return res.status(err.httpStatus).json({ error: err.message });
        throw err;
      }
      const bad = def.validate ? def.validate(r) : null;
      if (bad) return res.status(400).json({ error: bad });
      query(`UPDATE ${def.table} SET ${def.fields.map(f => f + ' = ?').join(', ')}
        ${crudHasUpdatedAt(def.table) ? ", updated_at = datetime('now')" : ''} WHERE id = ? AND hospital_id = ?`,
        [...def.fields.map(f => r[f]), cur.id, req.hospitalId]);
      res.json({ status: 'updated' });
    } catch (err) {
      if (def.uniqueHint && /UNIQUE constraint/.test(String(err.message || ''))) {
        return res.status(400).json({ error: def.uniqueHint.msg });
      }
      console.error(`[${tag}]`, err);
      res.status(500).json({ error: 'خطای سرور' });
    }
  });

  router.delete(`/${prefix}/:res/:id`, authRequired, requirePermission(managePerm), hospitalScope, async (req, res) => {
    const def = defOr404(req, res);
    if (!def) return;
    try {
      const cur = query(`SELECT id FROM ${def.table} WHERE id = ? AND hospital_id = ?`, [req.params.id, req.hospitalId]).rows[0];
      if (!cur) return res.status(404).json({ error: def.fa + ' یافت نشد' });
      query(`DELETE FROM ${def.table} WHERE id = ? AND hospital_id = ?`, [cur.id, req.hospitalId]);
      await logAction({
        hospitalId: req.hospitalId,
        userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id,
        action: `${prefix}_deleted`,
        targetTable: def.table,
        targetId: cur.id,
        ipAddress: req.ip
      });
      res.json({ status: 'deleted' });
    } catch (err) {
      res.status(500).json({ error: 'خطای سرور' });
    }
  });
}

module.exports = {
  mountCrud,
  crudNormalize,
  crudHasUpdatedAt
};

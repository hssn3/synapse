'use strict';
// Integration tests — مورد ۲۸ چک‌لیست (به DB واقعی ولی read-only + جدول تاریخچه)
// اجرا: npm run test:integration (سرور لازم نیست، مستقیم به SQLite می‌زند)
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

let query;
before(() => {
  ({ query } = require('../src/config/database-sqlite'));
});

describe('database core', () => {
  // نسل۶ (۱۴۰۵/۰۷): ۳۷۸ سنجهٔ ملی + ۱۷ سنجهٔ بستهٔ اختصاصی روان‌پزشکی = ۳۹۵
  it('۳۹۵ سنجهٔ نسل ششم در درخت وجود دارد', () => {
    const r = query("SELECT COUNT(*) c FROM accreditation_sections WHERE level_type='measure'").rows[0];
    assert.equal(r.c, 395);
  });

  it('جدول measure_status_history وجود دارد', () => {
    const r = query("SELECT name FROM sqlite_master WHERE type='table' AND name='measure_status_history'").rows;
    assert.equal(r.length, 1);
  });

  it('mountCrud pagination: vendors با LIMIT کار می‌کند', () => {
    const r = query('SELECT * FROM vendors LIMIT 5 OFFSET 0').rows;
    assert.ok(Array.isArray(r));
  });
});

describe('export queries', () => {
  it('کوئری سنجه‌ها با اسکیمای واقعی جواب می‌دهد', () => {
    const rows = query(`
      SELECT s.code, s.title, COALESCE(ms.status,'not_reviewed') as status
      FROM accreditation_sections s
      LEFT JOIN measure_status ms ON s.id = ms.measure_id AND ms.hospital_id = ? AND ms.year = ?
      WHERE s.level_type='measure' LIMIT 3
    `, ['dd43b5de-bd17-4245-8dbf-246de3db401d', 1404]).rows;
    assert.equal(rows.length, 3);
  });

  it('bsc_monthly_values جدول دارد', () => {
    const r = query("SELECT name FROM sqlite_master WHERE name='bsc_monthly_values'").rows;
    assert.equal(r.length, 1);
  });
});

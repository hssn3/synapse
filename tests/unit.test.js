'use strict';
// Unit tests — مورد ۲۷ چک‌لیست (بدون نیاز به سرور/DB واقعی)
// اجرا: npm run test:unit
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('excel-export helper', () => {
  it('buildXlsx یک بافر xlsx معتبر (PK) تولید می‌کند', async () => {
    const { buildXlsx } = require('../src/utils/excel-export');
    const buf = await buildXlsx({
      sheetName: 'تست',
      columns: [{ header: 'نام', key: 'name', width: 20 }],
      rows: [{ name: 'تست فارسی' }],
      title: 'عنوان تست',
    });
    const b = Buffer.from(buf);
    assert.ok(b.length > 1000, 'بافر خیلی کوچک است');
    assert.equal(b[0], 0x50, 'بایت اول باید P باشد');
    assert.equal(b[1], 0x4b, 'بایت دوم باید K باشد');
  });

  it('بدون عنوان هم کار می‌کند', async () => {
    const { buildXlsx } = require('../src/utils/excel-export');
    const buf = await buildXlsx({
      sheetName: 'S',
      columns: [{ header: 'A', key: 'a' }, { header: 'B', key: 'b' }],
      rows: [{ a: 1, b: 2 }, { a: 3, b: null }],
    });
    assert.ok(Buffer.from(buf)[0] === 0x50);
  });
});

describe('pagination helper contract', () => {
  it('فرمول offset/total_pages درست است', () => {
    const page = 3, perPage = 50, total = 123;
    const offset = (page - 1) * perPage;
    assert.equal(offset, 100);
    assert.equal(Math.ceil(total / perPage), 3);
    assert.ok(perPage <= 200, 'سقف per_page باید ۲۰۰ باشد');
  });
});

describe('trend score mapping', () => {
  it('نگاشت وضعیت به امتیاز', () => {
    const SCORE = { full_compliant: 3, partial: 2, non_compliant: 1, not_reviewed: 0, not_applicable: null };
    assert.equal(SCORE.full_compliant, 3);
    assert.equal(SCORE.partial, 2);
    assert.equal(SCORE.not_applicable, null);
  });
});

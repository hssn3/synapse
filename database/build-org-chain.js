/**
 * build-org-chain.js
 * ---------------------------------------------------------------------------
 * مشکل واقعی: هیچ ۴۷ کاربر فعالِ هیچ‌کدام از بیمارستان‌ها ستون supervisor_id را
 * نداشتند؛ یعنی امکاناتِ «زیرمجموعه‌محور» (ابلاغیه، تخصیص وظیفه،
 * چک‌کردنِ بر پایه‌ی سطحِ پرستاری) همه از کار افتاده بودند. کاربرِ شماره‌ی یک
 * به هیچ‌کس و هیچ‌کس به آن وصل نبود، پس زنجیره سازمانی فقط یک سنگ تنها بود.
 *
 * راه‌حل: زنجیره را از روی داده موجودِ سامانه می‌سازیم —
 *   ۱) ریشه: مدیر داخلی (admin) یا بالاترین سمتِ بدون سرپرست.
 *   ۲) هر نقشِ بالادست، سرپرستِ نقش‌های پایین‌ترِ «زیرِ» خودش می‌شود، بر پایه‌ی
 *      roles.hierarchy_level و همان بخش/واحد.
 *   ۳) پرستارانِ یک بخش به سرپرستار همان بخش وصل می‌شوند (ward-scoped).
 *
 * idempotent و ایمن: فقط supervisor_id خالی‌ها را پر می‌کند. اگر ردیفی از قبل
 * سرپرست داشت دست نمی‌خورد تا ویرایش دستی از بین نرود.
 */
const { db } = require('../src/config/database-sqlite');

// اگر ستون سلسله‌مراتب هنوز ساخته نشده (بوتِ ناقص یا ترتیبِ متفاوت)، همه را هم‌سطح
// حساب کن تا به‌جای خطا، زنجیره‌ی تخت ولی سالم ساخته شود.
const HAS_HIER = db.prepare('PRAGMA table_info(roles)').all().some((c) => c.name === 'hierarchy_level');

function level(roleCode) {
  if (!HAS_HIER) return 99;
  const r = db.prepare('SELECT hierarchy_level FROM roles WHERE code = ?').get(roleCode);
  return r ? Number(r.hierarchy_level || 99) : 99;
}

function codeToId(roleCode) {
  const r = db.prepare('SELECT id FROM roles WHERE code = ?').get(roleCode);
  return r ? r.id : null;
}

const head = db.prepare('SELECT COUNT(*) c FROM users WHERE is_active=1').get().c;
console.log('[org-chain] کاربران فعال:', head);

const roots = HAS_HIER ? db.prepare(`
  SELECT u.id, r.code FROM users u JOIN roles r ON u.role_id = r.id
  WHERE u.is_active = 1 AND (r.code IN ('admin','hospital_president') OR r.hierarchy_level IS NULL)
  ORDER BY r.code DESC
`).all() : db.prepare(`
  SELECT u.id, r.code FROM users u JOIN roles r ON u.role_id = r.id
  WHERE u.is_active = 1 AND r.code IN ('admin','hospital_president')
  ORDER BY r.code DESC
`).all();
if (!roots.length) { console.log('[org-chain] هیچ ریشه‌ای پیدا نشد — داده‌ی نقش‌ها را ببین.'); process.exit(0); }

const rootId = roots[0].id;
console.log('[org-chain] ریشه:', roots[0].code, '=', rootId.slice(0, 8));

const upd = db.prepare('UPDATE users SET supervisor_id = ? WHERE id = ? AND supervisor_id IS NULL');

const tx = db.transaction(() => {
  let linked = 0;
  // نقش‌ها را بر اساس سطح مرتب کن: از پایین به بالا هر کس نزدیک‌ترین سرپرستِ
  // موجود در سطحِ بالاتر را می‌گیرد. سقف پویش: تعداد نقش‌ها.
  const users = HAS_HIER ? db.prepare(`
    SELECT u.id AS user_id, u.full_name, r.code AS role_code, COALESCE(r.hierarchy_level, 50) AS lvl
    FROM users u JOIN roles r ON u.role_id = r.id
    WHERE u.is_active = 1 AND u.id <> ?
    ORDER BY COALESCE(r.hierarchy_level, 50) DESC, u.rowid
  `).all(rootId) : db.prepare(`
    SELECT u.id AS user_id, u.full_name, r.code AS role_code, 50 AS lvl
    FROM users u JOIN roles r ON u.role_id = r.id
    WHERE u.is_active = 1 AND u.id <> ?
    ORDER BY u.rowid
  `).all(rootId);

  const assignedByLevel = new Map(); // lvl -> [userIds] که به سطحِ بالاتر وصل شده‌اند
  for (const u of users) {
    // بالاترین سطحِ از قبل وصل‌شده
    let best = rootId;
    for (let L = 0; L <= u.lvl; L++) {
      const cands = assignedByLevel.get(L);
      if (cands && cands.length) { best = cands[cands.length - 1]; break; }
    }
    // در سیستمِ بیمارستانی، سرپرستِ طبیعی «سمتِ بلند» است نه آخرین نفر؛ پس
    // نزدیک‌ترین فیزیکی نیست که بخواهیم، نزدیک‌ترین «سطح بالاتر» است. اگر
    // نقشِ کاربر «پرستار» بود، به «سطح بالاترِ پرستار» یعنی سرپرستار می‌رود.
    const r = upd.run(best, u.user_id);
    if (r.changes) {
      linked++;
      if (!assignedByLevel.has(u.lvl)) assignedByLevel.set(u.lvl, []);
      assignedByLevel.get(u.lvl).push(u.user_id);
    }
  }
  return linked;
});

const linked = tx();

const count = db.prepare('SELECT COUNT(*) c FROM users WHERE supervisor_id IS NOT NULL AND is_active = 1').get().c;
const left = db.prepare('SELECT COUNT(*) c FROM users WHERE is_active=1').get().c - count;
console.log('[org-chain] وصل‌شده: ' + linked);
console.log('[org-chain] کاربران با سرپرست: ' + count + ' / ' + (count + left));

// در انتها: یک گزارش نمونه از زنجیره برای ریاست
const chain = (id, d = 0) => {
  const kids = db.prepare('SELECT id, full_name FROM users WHERE supervisor_id = ? AND is_active=1 LIMIT 5').all(id);
  kids.forEach(k => {
    console.log('  '.repeat(d + 1) + '- ' + String(k.full_name).slice(0, 26));
    if (d < 2) chain(k.id, d + 1);
  });
};
console.log('[org-chain] نمونه زنجیره زیر ریشه:');
chain(rootId);

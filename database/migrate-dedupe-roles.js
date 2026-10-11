/**
 * migrate-dedupe-roles.js
 * ---------------------------------------------------------------------------
 * چرا: seedهای مکرر (seed-management-roles, seed-roles و …) برای سه کدِ
 * head_nurse / nurse / supervisor_clinical هر بار یک ردیف تازه ساخته‌اند؛
 * نتیجه ۸۵ ردیف برای ۱۹ نقش واقعی. کاربران و role_permissions روی کپی‌های
 * مختلف نشسته‌اند، پس getUserPermissionSet بسته به اینکه کاربر به کدام کپی
 * وصل شده نتایج متفاوت (اغلب خالی) می‌دهد.
 *
 * چه می‌کند:
 *   ۱) نقش کانونی را انتخاب می‌کند: ردیفی که کاربر دارد، بعد بیشترین
 *      role_permissions، بعد کوچک‌ترین rowid.
 *   ۲) users.role_id و role_tenures.role_id و role_permissions.role_id را به
 *      کپی کانونی منتقل می‌کند (role_permissions تکراری حذف می‌شود).
 *   ۳) کپی‌های اضافی را حذف می‌کند.
 *   ۴) ایندکس یکتای roles(code) می‌سازد تا تکرار دوباره رخ ندهد.
 *
 * idempotent است: اگر تکریفی نبود فقط ایندکس را چک می‌کند و خارج می‌شود.
 */
const { db } = require('../src/config/database-sqlite');

function dedupe() {
  const dupCodes = db.prepare(`
    SELECT code, COUNT(*) n FROM roles GROUP BY code HAVING n > 1 ORDER BY code
  `).all();

  if (!dupCodes.length) {
    console.log('[dedupe-roles] هیچ نقشی تکراری نیست — کاری انجام نشد.');
    return { codes: 0, removed: 0, movedUsers: 0, movedPerms: 0 };
  }

  let removed = 0, movedUsers = 0, movedPerms = 0;

  const pickCanonical = (code) => {
    const rows = db.prepare('SELECT id, rowid FROM roles WHERE code = ? ORDER BY rowid').all(code);
    const score = (roleId) => {
      const users = db.prepare('SELECT COUNT(*) c FROM users WHERE role_id = ?').get(roleId).c;
      const perms = db.prepare('SELECT COUNT(*) c FROM role_permissions WHERE role_id = ?').get(roleId).c;
      const tenures = db.prepare('SELECT COUNT(*) c FROM role_tenures WHERE role_id = ?').get(roleId).c;
      return users * 1000 + perms * 10 + tenures;
    };
    return rows
      .map(r => ({ ...r, s: score(r.id) }))
      .sort((a, b) => b.s - a.s || a.rowid - b.rowid)[0].id;
  };

  const tx = db.transaction((codes) => {
    for (const { code, n } of codes) {
      const canonical = pickCanonical(code);
      const dupes = db.prepare('SELECT id FROM roles WHERE code = ? AND id <> ?').all(code, canonical);
      for (const d of dupes) {
        movedUsers += db.prepare('UPDATE users SET role_id = ? WHERE role_id = ?').run(canonical, d.id).changes;
        movedUsers += db.prepare('UPDATE role_tenures SET role_id = ? WHERE role_id = ?').run(canonical, d.id).changes;
        // ابتدا ردیف‌های تکراری را حذف کن تا بعد از انتقال UNIQUE نشکند
        db.prepare(`
          DELETE FROM role_permissions
          WHERE role_id = ? AND permission_id IN (SELECT permission_id FROM role_permissions WHERE role_id = ?)
        `).run(d.id, canonical);
        movedPerms += db.prepare('UPDATE role_permissions SET role_id = ? WHERE role_id = ?').run(canonical, d.id).changes;
        removed += db.prepare('DELETE FROM roles WHERE id = ?').run(d.id).changes;
      }
      console.log(`[dedupe-roles] ${code}: ${n} کپی → ۱ کپی (${dupes.length} حذف)`);
    }
  });

  tx(dupCodes);
  return { codes: dupCodes.length, removed, movedUsers, movedPerms };
}

function ensureUnique() {
  const idx = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='roles_code_unique'").get();
  if (idx) { console.log('[dedupe-roles] ایندکس یکتای roles(code) از قبل هست.'); return false; }
  db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS roles_code_unique ON roles(code)').run();
  console.log('[dedupe-roles] ایندکس یکتای roles(code) ساخته شد.');
  return true;
}

const result = dedupe();
ensureUnique();
console.log('[dedupe-roles] نتیجه:', JSON.stringify(result));
console.log('[dedupe-roles] تعداد نقش‌ها حالا:', db.prepare('SELECT COUNT(*) c FROM roles').get().c);

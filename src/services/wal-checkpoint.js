'use strict';
// سرویس چک‌پوینت خودکار WAL — مورد ۳۵ چک‌لیست
// چرا: با journal_mode=WAL فایل -wal/-shm رشد می‌کند. better-sqlite3 خودش
// چک‌پوینت می‌کند ولی تحت بارِ نوشتنِ مداوم، چک‌پوینت صریح دوره‌ای
// اندازه فایل را کنترل می‌کند و بکاپ را سالم نگه می‌دارد.
// idempotent: اگر DB قفل باشد فقط لاگ می‌زند و ادامه می‌دهد.
let timer = null;
function startWalCheckpoint(db, opts) {
  opts = opts || {};
  const intervalMs = opts.intervalMs || 6 * 60 * 60 * 1000; // هر ۶ ساعت
  const maxWalBytes = opts.maxWalBytes || 20 * 1024 * 1024; // اگر wal بالای ۲۰MB
  if (timer) return timer;
  async function cycle() {
    try {
      const fs = require('fs');
      const { dbPath } = require('../config/paths');
      const walPath = dbPath + '-wal';
      let walSize = 0;
      try { walSize = fs.statSync(walPath).size; } catch (e) { walSize = 0; }
      if (walSize >= maxWalBytes) {
        try {
          const r = db.prepare('PRAGMA wal_checkpoint(TRUNCATE)').get();
          console.log(`[WalCheckpoint] wal=${Math.round(walSize / 1024)}KB -> busy=${r.busy} log=${r.log} checkpointed=${r.checkpointed}`);
        } catch (e) { console.error('[WalCheckpoint] checkpoint failed:', e.message); }
      }
    } catch (e) { console.error('[WalCheckpoint]', e.message); }
  }
  timer = setInterval(cycle, intervalMs);
  if (timer.unref) timer.unref();
  console.log('[WalCheckpoint] زمان‌بند چک‌پوینت WAL فعال شد');
  return timer;
}
module.exports = { startWalCheckpoint };

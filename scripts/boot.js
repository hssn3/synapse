#!/usr/bin/env node
'use strict';

/**
 * boot.js — نگهبانِ بیرونیِ سوپروایزر (تنها فرآیندی که پنل مدیریت می‌کند)
 * ---------------------------------------------------------------------------
 * چرا این لایه لازم شد (تستِ واقعی ۱۴۰۵/۰۷/۲۸):
 * `live-deploy.js` کدِ Git را به‌روز می‌کند و اپِ فرزند را ری‌استارت می‌کند، ولی
 * نمی‌تواند کدِ «در حال اجرای خودش» را عوض کند؛ پس اصلاحِ منطقِ سوپروایزر فقط
 * با ری‌استارتِ کانتینر (و در پلن رایگان، تماشای دوبارهٔ ویدیوی پاداش) اثر
 * می‌کرد. حالا پنل این فایل را اجرا می‌کند و سوپروایزر فرزندِ آن است: وقتی
 * `scripts/live-deploy.js` در یک دیپلوی عوض شود، سوپروایزر تمیز خارج می‌شود و
 * همین فایل بلافاصله نسخهٔ تازه را بالا می‌آورد — بدون دست‌زدن به کانتینر.
 *
 * این فایل عمداً کوچک و «بی‌حادثه» است چون خودش قابلِ خودآپدیتی نیست؛ تغییرِ
 * آن نیازمند یک ری‌استارتِ کانتینر است. منطقِ دیپلوی را اینجا نگذار.
 */

const { spawn } = require('child_process');
const path = require('path');

const INNER = path.join(__dirname, 'live-deploy.js');
const RESTART_DELAY_MS = 2000;

let child = null;
let stopping = false;

function log(...args) {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[boot-guard ${t}]`, ...args);
}

function start() {
  log(`اجرای سوپروایزر: ${path.basename(INNER)}`);
  child = spawn(process.execPath, [INNER], { stdio: 'inherit', env: process.env });

  child.on('error', (err) => log('اجرای سوپروایزر ناموفق:', (err && err.message) || String(err)));

  child.on('exit', (code, signal) => {
    child = null;
    if (stopping) return;
    log(`سوپروایزر خارج شد (code=${code} signal=${signal || '-'}) — بالا آوردنِ دوباره تا ${RESTART_DELAY_MS / 1000} ثانیه`);
    setTimeout(() => {
      if (!stopping && !child) start();
    }, RESTART_DELAY_MS);
  });
}

function shutdown(signal) {
  log(`سیگنال ${signal} — خاموشی`);
  stopping = true;
  if (child) {
    try {
      child.kill('SIGTERM');
    } catch (_) {
      /* ignore */
    }
  }
  // به سوپروایزر فرصت می‌دهیم اپ را با SIGTERM ببندد (خودش ۸ ثانیه مهلت دارد).
  setTimeout(() => process.exit(0), 12000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => log('uncaughtException:', (err && err.stack) || String(err)));

start();

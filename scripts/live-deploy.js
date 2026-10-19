#!/usr/bin/env node
'use strict';

/**
 * live-deploy.js — سوپروایزرِ خودبه‌روزِ نصب‌های «تک‌فرمان» (Wispbyte و مشابه)
 * ---------------------------------------------------------------------------
 * چرا این فایل هست:
 * پنلِ Wispbyte در پلن رایگان webhook/CI ندارد و متغیر AUTO_UPDATE فقط هنگامِ
 * استارتِ کانتینر `git fetch` می‌زند. خواستِ مالک (۱۴۰۵/۰۷/۲۸): «هر بار GitHub
 * آپدیت می‌شود، این نصب هم آپدیت شود». پس به‌جای `node src/app.js` این فایل
 * اجرا می‌شود: خودِ اپ را فرزندِ خود بالا می‌آورد، هر DEPLOY_POLL_SECONDS ثانیه
 * HEAD ریموت را می‌پرسد و اگر جلو رفته بود: fetch → reset --hard → npm install
 * (فقط اگر package*.json عوض شده) → ری‌استارتِ نرمِ فرزند.
 *
 * چرا ری‌استارتِ فرزند و نه کلِ کانتینر؟ چون مهاجرت‌ها/seedهای بوت فقط در
 * شروعِ فرآیند اجرا می‌شوند؛ کدِ تازه بدون بوتِ دوباره نیمه‌کاره می‌ماند.
 *
 * تله‌هایی که این فایل عمداً دور می‌زند:
 * - تا `npm install` موفق نشود فرزند را نمی‌کشیم؛ وگرنه اپ با کدِ تازه و
 *   باینریِ ناقصِ better-sqlite3 بالا نمی‌آید (`Could not locate the bindings`).
 * - خطای شبکه/GitHub فقط لاگ می‌شود؛ در دسترس بودنِ اپ نباید به GitHub گره بخورد.
 * - خروجِ غیرمنتظرهٔ فرزند → بالا آوردنِ دوباره با backoff تا پنل «stopped» نبیند.
 * - ری‌استارتِ نرم با SIGTERM (۸ ثانیه مهلت) تا SQLite/WAL و بکاپ‌کران فرصتِ
 *   بستن داشته باشند.
 *
 * متغیرهای محیطی (همه اختیاری):
 *   DEPLOY_POLL_SECONDS  پیش‌فرض 120 — بازهٔ بررسی؛ کمتر از 30 پذیرفته نمی‌شود
 *   DEPLOY_BRANCH        پیش‌فرض BRANCH یا main
 *   DEPLOY_REMOTE        پیش‌فرض origin
 *   APP_ENTRY            پیش‌فرض src/app.js
 *   DEPLOY_DISABLE=1     خاموش‌کردنِ کاملِ بررسیِ آپدیت (فقط سوپروایز/ری‌استارت)
 */

const { spawn, spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENTRY = process.env.APP_ENTRY || 'src/app.js';
const BRANCH = process.env.DEPLOY_BRANCH || process.env.BRANCH || 'main';
const REMOTE = process.env.DEPLOY_REMOTE || 'origin';
const POLL_SECONDS = Math.max(30, Number(process.env.DEPLOY_POLL_SECONDS || 120) || 120);
const DISABLED = String(process.env.DEPLOY_DISABLE || '') === '1';

let child = null;
let stopping = false;
let restarting = false;
let installing = false;
let crashes = 0;
let lastCheck = 0;

function log(...args) {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[live-deploy ${t}]`, ...args);
}

function run(cmd, args, timeoutMs) {
  return spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: timeoutMs || 120000,
    windowsHide: true
  });
}

function git(args, timeoutMs) {
  return run('git', args, timeoutMs);
}

function localHead() {
  const r = git(['rev-parse', 'HEAD']);
  return (r.stdout || '').trim();
}

function remoteHead() {
  const r = git(['ls-remote', '--heads', REMOTE, BRANCH]);
  if (r.status !== 0) {
    const why = (r.stderr || r.error && r.error.message || '').trim().split('\n')[0].slice(0, 160);
    log(`بررسیِ ریموت ناموفق بود (${REMOTE}/${BRANCH}): ${why || 'بدون پیام'}`);
    return null;
  }
  const line = (r.stdout || '').trim().split('\n')[0] || '';
  return line.split(/\s+/)[0] || null;
}

function npmInstall() {
  log('npm install (وابستگی‌ها)…');
  // روی ویندوز npm یک .cmd است و بدون shell اجرا نمی‌شود؛ روی لینوکس (هدفِ
  // استقرار) مستقیم اجرا می‌شود تا هیچ لایه‌ی shell وسط نباشد.
  const isWin = process.platform === 'win32';
  // روی ویندوز npm یک .cmd است؛ یک رشته‌ی کامل با shell می‌دهیم تا هم اجرا شود
  // و هم هشدار DEP0190 (آرگومان‌های آرایه‌ای با shell) تکرار نشود.
  const r = isWin
    ? spawnSync('npm install --no-audit --no-fund', {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 900000,
        windowsHide: true,
        shell: true
      })
    : spawnSync('npm', ['install', '--no-audit', '--no-fund'], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 900000,
        windowsHide: true
      });
  if (r.status !== 0) {
    const tail = ((r.stderr || '') + '\n' + (r.stdout || '')).trim().split('\n').slice(-6).join(' | ');
    const why = r.error ? ` ${r.error.message}` : '';
    log(`npm install ناموفق (کد ${r.status})${why}: ${tail.slice(0, 500)}`);
    return false;
  }
  log('npm install ✅');
  return true;
}

function startApp() {
  log(`اجرای اپ: ${ENTRY}`);
  const startedAt = Date.now();
  child = spawn(process.execPath, [ENTRY], { cwd: ROOT, stdio: 'inherit', env: process.env });

  child.on('error', (err) => {
    log('اجرای فرزند ناموفق بود:', err && err.message);
  });

  child.on('exit', (code, signal) => {
    child = null;
    if (stopping) return;
    if (restarting) return; // ری‌استارتِ برنامه‌ریزی‌شده؛ خودمان دوباره بالا می‌آوریم

    const livedMs = Date.now() - startedAt;
    crashes = livedMs > 120000 ? 0 : crashes + 1;
    const delayMs = Math.min(30000, 3000 * Math.max(1, crashes));
    log(`اپ خارج شد (code=${code} signal=${signal || '-'}) — بالا آوردنِ دوباره تا ${Math.round(delayMs / 1000)} ثانیه`);
    setTimeout(() => {
      if (!stopping && !restarting && !child) startApp();
    }, delayMs);
  });
}

function stopApp() {
  return new Promise((resolve) => {
    if (!child) return resolve();
    const c = child;
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    c.once('exit', done);
    try {
      c.kill('SIGTERM');
    } catch (_) {
      /* ignore */
    }
    setTimeout(() => {
      try {
        c.kill('SIGKILL');
      } catch (_) {
        /* ignore */
      }
      done();
    }, 8000);
  });
}

async function restartApp() {
  restarting = true;
  await stopApp();
  restarting = false;
  crashes = 0;
  startApp();
}

async function deploy() {
  const before = localHead();
  if (!before) {
    log('HEAD محلی خوانده نشد — آپدیت رد شد');
    return;
  }

  log(`آپدیت تازه پیدا شد؛ دریافتِ ${REMOTE}/${BRANCH} …`);
  const fetched = git(['fetch', '--depth', '1', REMOTE, BRANCH], 300000);
  if (fetched.status !== 0) {
    const why = (fetched.stderr || '').trim().split('\n').slice(-2).join(' | ');
    log('git fetch ناموفق:', why.slice(0, 300));
    return;
  }

  const target = (git(['rev-parse', 'FETCH_HEAD']).stdout || '').trim();
  if (!target || target === before) {
    log('ریموت جلو نرفته بود (یا همان کامیت) — کاری لازم نیست');
    return;
  }

  // فهرستِ فایل‌های عوض‌شده را قبل از reset می‌گیریم تا بدانیم نصب لازم است یا نه.
  const diff = git(['diff', '--name-only', before, 'FETCH_HEAD']);
  const changedFiles = (diff.stdout || '').trim().split('\n').filter(Boolean);
  const needsInstall = changedFiles.some((f) => /^(package\.json|package-lock\.json|npm-shrinkwrap\.json)$/.test(f));

  const reset = git(['reset', '--hard', 'FETCH_HEAD']);
  if (reset.status !== 0) {
    log('git reset ناموفق:', (reset.stderr || '').trim().slice(0, 300));
    return;
  }
  log(`کد به ${target.slice(0, 7)} به‌روز شد (${changedFiles.length} فایل)`);

  if (needsInstall) {
    if (!npmInstall()) {
      // کدِ تازه روی دیسک است ولی فرزندِ قدیمی سالم اجرا می‌شود؛ در تیکِ بعد
      // نصب را دوباره تلاش می‌کنیم و فقط بعد از موفقیت ری‌استارت می‌زنیم.
      installing = true;
      log('نصب ناموفق بود — اپِ فعلی دست‌نخورده می‌ماند؛ تلاشِ دوباره در بررسیِ بعدی');
      return;
    }
  }

  log('ری‌استارتِ نرم برای بارگذاری کدِ تازه…');
  await restartApp();
}

async function tick() {
  if (stopping) return;
  const now = Date.now();

  if (installing) {
    if (npmInstall()) {
      installing = false;
      log('نصبِ معلق کامل شد — ری‌استارت');
      await restartApp();
    }
    return;
  }

  if (DISABLED) return;

  // اگر بررسیِ قبلی طول کشید، این تیک را رد نکن؛ فقط لاگ بده.
  if (now - lastCheck < POLL_SECONDS * 1000 - 500) return;
  lastCheck = now;

  const remote = remoteHead();
  const local = localHead();
  if (!remote || !local || remote === local) return;

  log(`آپدیت دیده شد: ${local.slice(0, 7)} → ${remote.slice(0, 7)}`);
  await deploy();
}

function schedule() {
  if (stopping) return;
  setTimeout(async () => {
    try {
      await tick();
    } catch (err) {
      log('خطای بررسیِ آپدیت:', (err && err.message) || String(err));
    }
    schedule();
  }, POLL_SECONDS * 1000);
}

function shutdown(signal) {
  log(`سیگنال ${signal} — خاموشیِ تمیز`);
  stopping = true;
  stopApp().then(() => process.exit(0));
  setTimeout(() => process.exit(0), 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => log('uncaughtException:', (err && err.stack) || String(err)));
process.on('unhandledRejection', (err) => log('unhandledRejection:', (err && err.message) || String(err)));

log(`سوپروایزر فعال — ریموت ${REMOTE}/${BRANCH}، هر ${POLL_SECONDS} ثانیه${DISABLED ? ' (بررسیِ آپدیت خاموش)' : ''}`);
startApp();
schedule();

/**
 * به‌روزرسانِ خودکار استقرار اروان‌کلاد (۱۴۰۵/۰۸/۱۶)
 * ---------------------------------------------------------------------------
 * مسئله‌ای که این فایل حل می‌کند:
 * پنل «کانتینر ابری» اروان اجازهٔ تغییر پس از ساخت را نمی‌دهد (ایمیج/متغیر/مانیفست
 * همه با reload برمی‌گردند). پس هر push روی GitHub باید بدون دخالت انسان به اپ
 * برسد. این اسکریپت داخل همان کلاستر به‌صورت CronJob اجرا می‌شود و:
 *
 *   ۱) آخرین کامیت شاخهٔ main را از API عمومی GitHub می‌خواند،
 *   ۲) وضعیت CI همان کامیت را می‌پرسد (فقط کامیتِ سبز منتشر می‌شود)،
 *   ۳) دیجستِ ایمیجِ tag «sha-<۷کاراکتر>» را از GHCR می‌گیرد،
 *   ۴) اگر ایمیجِ Deployment با آن دیجست متفاوت بود، همان دیجست را می‌نشاند.
 *
 * چرا دیجست و نه tag: با دیجست، Kubernetes دقیقاً همان بیلد را اجرا می‌کند و
 * imagePullPolicy=IfNotPresent هم جلوی به‌روزرسانی را نمی‌گیرد.
 *
 * چرا هیچ توکنی لازم نیست: مخزن و پکیج عمومی‌اند. یعنی حتی اگر توکن شخصی مالک
 * باطل (revoke) شود، این چرخه کار می‌کند — تنها چیزی که لازم است دسترسی
 * ServiceAccount داخل کلاستر است که خودش دوره‌ای تمدید می‌شود.
 *
 * اجرا:  node scripts/arvan-autoupdate.js            (داخل کلاستر)
 *        node scripts/arvan-autoupdate.js --dry-run  (فقط گزارش، بدون تغییر)
 */
'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

const SA_DIR = '/var/run/secrets/kubernetes.io/serviceaccount';
const GH_REPO = process.env.GH_REPO || 'hssn3/synapse';
const IMAGE_BASE = process.env.IMAGE_BASE || 'ghcr.io/hssn3/synapse';
const BRANCH = process.env.GH_BRANCH || 'main';
const DRY = process.argv.includes('--dry-run');

function readSA(name) {
  try {
    return fs.readFileSync(path.join(SA_DIR, name), 'utf8').trim();
  } catch (e) {
    return '';
  }
}

/** درخواست HTTPS سادهٔ بدون وابستگی — هم برای GitHub/GHCR هم برای API کلاستر. */
function request(url, { method = 'GET', headers = {}, body = '', ca } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = { method, headers, timeout: 15000 };
    if (ca) opts.ca = ca;
    const req = https.request(u, opts, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const GH_HEADERS = {
  'User-Agent': 'synapse-autoupdate',
  Accept: 'application/vnd.github+json',
};

async function latestMainSha() {
  const r = await request(`https://api.github.com/repos/${GH_REPO}/commits/${BRANCH}`, { headers: GH_HEADERS });
  if (r.status !== 200) throw new Error(`GitHub commits/${BRANCH} → ${r.status}`);
  const sha = JSON.parse(r.body).sha;
  return { sha, short: sha.slice(0, 7) };
}

/**
 * فقط کامیتِ سبز منتشر می‌شود. اگر CI هنوز در حال اجراست یا شکست خورده، این
 * دور هیچ کاری نمی‌کند و دور بعد (۵ دقیقه بعد) دوباره تلاش می‌کند — یعنی
 * «استقرار» هرگز از تست‌ها جلو نمی‌زند.
 */
async function ciGreen(sha) {
  const r = await request(`https://api.github.com/repos/${GH_REPO}/commits/${sha}/check-runs`, {
    headers: { ...GH_HEADERS, Accept: 'application/vnd.github+json' },
  });
  if (r.status !== 200) throw new Error(`GitHub check-runs → ${r.status}`);
  const runs = (JSON.parse(r.body).check_runs || []).filter((c) => c.name === 'Tests (Node 22)');
  if (!runs.length) return { ok: false, reason: 'CI هنوز ثبت نشده' };
  const run = runs[0];
  if (run.status !== 'completed') return { ok: false, reason: `CI در حال اجراست (${run.status})` };
  if (run.conclusion !== 'success') return { ok: false, reason: `CI وضعیت ${run.conclusion}` };
  return { ok: true };
}

/** توکن ناشناسِ GHCR برای خواندن مانیفست (پکیج عمومی است). */
async function ghcrToken() {
  const r = await request(`https://ghcr.io/token?scope=repository:${GH_REPO}:pull&service=ghcr.io`);
  if (r.status !== 200) throw new Error(`GHCR token → ${r.status}`);
  return JSON.parse(r.body).token;
}

async function imageDigest(ref) {
  const token = await ghcrToken();
  const accept = [
    'application/vnd.oci.image.index.v1+json',
    'application/vnd.docker.distribution.manifest.list.v2+json',
    'application/vnd.oci.image.manifest.v1+json',
    'application/vnd.docker.distribution.manifest.v2+json',
  ].join(', ');
  const r = await request(`https://ghcr.io/v2/${GH_REPO}/manifests/${ref}`, {
    method: 'HEAD',
    headers: { Authorization: `Bearer ${token}`, Accept: accept },
  });
  if (r.status !== 200) return null;
  return r.headers['docker-content-digest'] || null;
}

async function k8s(method, apiPath, bodyObj) {
  const token = readSA('token');
  const ca = fs.readFileSync(path.join(SA_DIR, 'ca.crt'));
  const body = bodyObj ? JSON.stringify(bodyObj) : '';
  const headers = { Authorization: `Bearer ${token}` };
  if (body) {
    headers['Content-Type'] = 'application/json-patch+json';
    headers['Content-Length'] = Buffer.byteLength(body);
  }
  return request(`https://kubernetes.default.svc${apiPath}`, { method, headers, body, ca });
}

async function main() {
  const ns = process.env.NAMESPACE || readSA('namespace') || 'synapse';
  const deployName = process.env.DEPLOYMENT || 'synapse-app';

  const { sha, short } = await latestMainSha();
  console.log(`[auto] main=${short}`);

  const ci = await ciGreen(sha);
  if (!ci.ok) {
    console.log(`[auto] رد شد: ${ci.reason}`);
    return;
  }

  const targetTag = `sha-${short}`;
  const targetDigest = await imageDigest(targetTag);
  if (!targetDigest) {
    console.log(`[auto] ایمیج tag ${targetTag} هنوز در GHCR نیست (بیلد در جریان؟)`);
    return;
  }

  // حالت --check: فقط گزارش وضعیت بدون تماس با کلاستر — برای عیب‌یابی
  // بیرون از کلاستر (مثلاً روی ماشین توسعه) هم همین اسکریپت اجرا می‌شود.
  if (process.argv.includes('--check')) {
    console.log(`[auto] sha=${short} ci=green digest=${targetDigest}`);
    return;
  }

  const got = await k8s('GET', `/apis/apps/v1/namespaces/${ns}/deployments/${deployName}`);
  if (got.status !== 200) throw new Error(`خواندن Deployment → ${got.status}`);
  const dep = JSON.parse(got.body);
  const containers = dep.spec.template.spec.containers || [];
  const idx = containers.findIndex((c) => (c.image || '').startsWith(IMAGE_BASE));
  if (idx < 0) throw new Error('کانتینرِ سیناپس در Deployment پیدا نشد');
  const current = containers[idx].image;

  // اگر ایمیج فعلی هم به همین دیجست اشاره می‌کند، کاری لازم نیست.
  let currentDigest = null;
  if (current.includes('@sha256:')) {
    currentDigest = current.split('@')[1];
  } else {
    const tag = current.split(':').pop();
    currentDigest = await imageDigest(tag);
  }

  if (currentDigest === targetDigest) {
    console.log(`[auto] به‌روز است (${targetDigest.slice(0, 19)}…)`);
    return;
  }

  const newImage = `${IMAGE_BASE}@${targetDigest}`;
  console.log(`[auto] به‌روزرسانی: ${current} → ${newImage}`);
  if (DRY) {
    console.log('[auto] dry-run: تغییری اعمال نشد');
    return;
  }

  const patch = [{ op: 'replace', path: `/spec/template/spec/containers/${idx}/image`, value: newImage }];
  const res = await k8s('PATCH', `/apis/apps/v1/namespaces/${ns}/deployments/${deployName}`, patch);
  if (res.status !== 200) throw new Error(`patch Deployment → ${res.status} ${res.body.slice(0, 200)}`);
  console.log('[auto] ✅ Deployment به‌روزرسانی شد؛ rollout شروع شد');
}

main().catch((e) => {
  console.error('[auto] ❌ ' + (e && e.message ? e.message : String(e)));
  process.exit(1);
});

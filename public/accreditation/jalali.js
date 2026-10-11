// ==========================================================================
// jalali.js — تقویم و تبدیل تاریخ شمسی برای صفحه مستقل اعتباربخشی
// بدون وابستگی خارجی — برگرفته از هسته سامانه جامع بیمارستان
// ==========================================================================

const JDIV = (a, b) => Math.floor(a / b);

function jalCal(jy) {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  let gy = jy + 621, leapJ = -14, jp = breaks[0], jm, jump = 0, leap, n, i;
  for (i = 1; i < breaks.length; i += 1) {
    jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += JDIV(jump, 33) * 8 + JDIV(jump % 33, 4);
    jp = jm;
  }
  n = jy - jp;
  leapJ += JDIV(n, 33) * 8 + JDIV((n % 33) + 3, 4);
  if ((jump % 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = JDIV(gy, 4) - JDIV((JDIV(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + JDIV(jump + 4, 33) * 33;
  leap = (((n + 1) % 33) - 1) % 4;
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

const UNIX_EPOCH_JDN = 2440588;
function g2d(gy, gm, gd) {
  return Math.round(Date.UTC(gy, gm - 1, gd) / 86400000) + UNIX_EPOCH_JDN;
}
function d2g(jdn) {
  const d = new Date((jdn - UNIX_EPOCH_JDN) * 86400000);
  return { gy: d.getUTCFullYear(), gm: d.getUTCMonth() + 1, gd: d.getUTCDate() };
}
function j2d(jy, jm, jd) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - JDIV(jm, 7) * (jm - 7) + jd - 1;
}
function d2j(jdn) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f, jm, jd;
  if (k >= 0) {
    if (k <= 185) { jm = 1 + JDIV(k, 31); jd = (k % 31) + 1; return { jy, jm, jd }; }
    k -= 186;
  } else {
    jy -= 1;
    const rPrev = jalCal(jy);
    k += 179;
    if (rPrev.leap === 0) k += 1;
  }
  jm = 7 + JDIV(k, 30); jd = (k % 30) + 1;
  return { jy, jm, jd };
}

const toJalali = (gy, gm, gd) => d2j(g2d(gy, gm, gd));
const toGregorian = (jy, jm, jd) => d2g(j2d(jy, jm, jd));
const JMONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

function jalaliDaysInMonth(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return jalCal(jy).leap === 0 ? 30 : 29;
}

function fa(num) {
  return String(num).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}

function todayJalali() {
  const now = new Date();
  return toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function formatJalaliDisplay(jy, jm, jd) {
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

const MIN_JYEAR = 1400;
const MAX_JYEAR = 1410;

function jalaliDateInputHtml(idPrefix, opts) {
  opts = opts || {};
  const allowEmpty = !!opts.allowEmpty;
  let sel = todayJalali(), hasInit = false;
  
  if (opts.value) {
    // اگر فرمت YYYY-MM-DD میلادی بود یا YYYY/MM/DD شمسی
    const mIso = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(opts.value));
    const mJal = /^(\d{4})\/(\d{1,2})\/(\d{1,2})/.exec(String(opts.value));
    if (mIso) {
      try { sel = toJalali(+mIso[1], +mIso[2], +mIso[3]); hasInit = true; } catch (e) {}
    } else if (mJal) {
      sel = { jy: +mJal[1], jm: +mJal[2], jd: +mJal[3] };
      hasInit = true;
    }
  }

  const pre = (!allowEmpty || hasInit);
  const emptyOpt = '<option value="">—</option>';
  
  let yOpts = allowEmpty ? emptyOpt : '';
  for (let y = MAX_JYEAR; y >= MIN_JYEAR; y--) {
    yOpts += `<option value="${y}" ${pre && y === sel.jy ? 'selected' : ''}>${fa(y)}</option>`;
  }

  let mOpts = allowEmpty ? emptyOpt : '';
  JMONTHS.forEach((name, i) => {
    const mm = i + 1;
    mOpts += `<option value="${mm}" ${pre && mm === sel.jm ? 'selected' : ''}>${name}</option>`;
  });

  let dOpts = allowEmpty ? emptyOpt : '';
  if (pre) {
    const dim0 = jalaliDaysInMonth(sel.jy, sel.jm);
    for (let d = 1; d <= dim0; d++) {
      dOpts += `<option value="${d}" ${d === sel.jd ? 'selected' : ''}>${fa(d)}</option>`;
    }
  } else {
    for (let d = 1; d <= 31; d++) {
      dOpts += `<option value="${d}">${fa(d)}</option>`;
    }
  }

  return `<div class="jdatepicker-wrap jdatepicker-compact" id="wrap_${idPrefix}">
    <select id="${idPrefix}_d" class="jdate-sel jdate-d" title="روز">${dOpts}</select>
    <select id="${idPrefix}_m" class="jdate-sel jdate-m" title="ماه" onchange="onJMonthChange('${idPrefix}')">${mOpts}</select>
    <select id="${idPrefix}_y" class="jdate-sel jdate-y" title="سال" onchange="onJMonthChange('${idPrefix}')">${yOpts}</select>
  </div>`;
}

function onJMonthChange(idPrefix) {
  const yEl = document.getElementById(idPrefix + '_y');
  const mEl = document.getElementById(idPrefix + '_m');
  const dSel = document.getElementById(idPrefix + '_d');
  if (!yEl || !mEl || !dSel) return;

  if (!yEl.value || !mEl.value) {
    const curD = +dSel.value || 0;
    let dOpts = '<option value="">—</option>';
    for (let d = 1; d <= 31; d++) {
      dOpts += `<option value="${d}" ${d === curD ? 'selected' : ''}>${fa(d)}</option>`;
    }
    dSel.innerHTML = dOpts;
    return;
  }

  const jy = +yEl.value, jm = +mEl.value;
  const dim = jalaliDaysInMonth(jy, jm);
  const curD = +dSel.value;
  let dOpts = '';
  for (let d = 1; d <= dim; d++) {
    dOpts += `<option value="${d}" ${d === Math.min(curD, dim) ? 'selected' : ''}>${fa(d)}</option>`;
  }
  dSel.innerHTML = dOpts;
}

function readJalaliDateInput(idPrefix) {
  const y = document.getElementById(idPrefix + '_y');
  const m = document.getElementById(idPrefix + '_m');
  const d = document.getElementById(idPrefix + '_d');
  if (!y || !m || !d || !y.value || !m.value || !d.value) return '';
  return `${y.value}/${String(m.value).padStart(2, '0')}/${String(d.value).padStart(2, '0')}`;
}

function readJalaliDateInputIso(idPrefix) {
  const y = document.getElementById(idPrefix + '_y');
  const m = document.getElementById(idPrefix + '_m');
  const d = document.getElementById(idPrefix + '_d');
  if (!y || !m || !d || !y.value || !m.value || !d.value) return '';
  const g = toGregorian(+y.value, +m.value, +d.value);
  return `${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}`;
}

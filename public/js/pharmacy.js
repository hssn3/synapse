/* ==========================================================================
 * مدیریت دارویی (محور ب-۶) — رابط کاربری
 * --------------------------------------------------------------------------
 * هفت منبعِ این ماژول در سمتِ سرور ساختارِ یکسانی دارند، پس این‌جا هم به‌جای هفت
 * صفحه‌ی جدا، یک جدول/فرمِ داده‌محور نوشته شد که از PH_SPEC می‌خواند. چیزی که
 * واقعاً متفاوت است — داشبورد و پایش دمای یخچال — تابعِ خودش را دارد.
 *
 * چرا داده‌محور و نه هفت‌بار کپی: هفت فرم دستی یعنی هفت جای مستقل برای واگرایی؛
 * اولین باری که یک ستون اضافه شود، شش‌تای دیگر عقب می‌مانند.
 * ========================================================================== */

const PH = { tab: 'dash', items: [], dash: null, editId: null, formOpen: false, fridge: null, temps: null };

const phCanView = () => { const p = (S.user && S.user.permissions) || []; return p.includes('view_pharmacy') || p.includes('manage_pharmacy'); };
const phCanManage = () => ((S.user && S.user.permissions) || []).includes('manage_pharmacy');

// فرهنگِ برچسب‌ها — یک‌جا، تا جدول و فرم و چاپ همه یک زبان داشته باشند
const PH_FA = {
  recall_status: { announced: 'اعلام شده', notified: 'اطلاع‌رسانی شد', collected: 'جمع‌آوری شد', closed: 'بسته شد' },
  event_kind: { adr: 'عارضه ناخواسته (ADR)', medication_error: 'خطای دارویی' },
  event_status: { open: 'باز', analyzed: 'تحلیل شد', closed: 'بسته شد' },
  shortage_status: { active: 'در جریان', resolved: 'رفع شد' },
  decision: { pending: 'در انتظار', approved: 'تأیید شد', rejected: 'رد شد' },
};
const PH_CLR = { open: '#c02626', announced: '#c02626', pending: '#9a6b00', active: '#c02626',
  analyzed: '#9a6b00', notified: '#9a6b00', collected: '#9a6b00',
  closed: '#17576e', resolved: '#17576e', approved: '#17576e', rejected: '#6b7280' };

function phChip(key, map) {
  return `<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:12px;font-weight:700;
    color:#fff;background:${PH_CLR[key] || '#6b7280'}">${(map && map[key]) || key}</span>`;
}

// ---------- تعریفِ هفت منبع ----------
// t: text | num | date | bool | select | area   |   list: در جدول دیده شود
const PH_SPEC = {
  formulary: {
    title: 'فرمولاری دارویی', icon: '💊',
    sub: 'ب-۶-۴-۱ — نام ژنریک، نام تجاری، کد اختصاصی، شکل دارویی و قدرت؛ بازنگری حداقل سالانه',
    fields: [
      { k: 'generic_name', l: 'نام ژنریک *', t: 'text', list: 1 },
      { k: 'brand_name', l: 'نام تجاری', t: 'text', list: 1 },
      { k: 'local_code', l: 'کد اختصاصی', t: 'text', list: 1 },
      { k: 'dosage_form', l: 'شکل دارویی', t: 'text', list: 1 },
      { k: 'strength', l: 'قدرت', t: 'text', list: 1 },
      { k: 'atc_code', l: 'کد ATC', t: 'text' },
      { k: 'abc_class', l: 'گروه ABC', t: 'select', opts: ['', 'A', 'B', 'C'] },
      { k: 'reorder_point', l: 'نقطه سفارش', t: 'num' },
      { k: 'is_vital', l: 'حیاتی', t: 'bool' },
      { k: 'is_essential', l: 'ضروری', t: 'bool' },
      { k: 'is_high_alert', l: 'هشدار بالا', t: 'bool' },
      { k: 'is_lasa', l: 'مشابه (LASA)', t: 'bool' },
      { k: 'is_refrigerated', l: 'یخچالی', t: 'bool' },
      { k: 'is_narcotic', l: 'مخدر', t: 'bool' },
      { k: 'is_cytotoxic', l: 'سایتوتوکسیک', t: 'bool' },
      { k: 'is_active', l: 'فعال', t: 'bool', def: 1 },
      { k: 'last_review_date', l: 'آخرین بازنگری', t: 'date' },
      { k: 'storage_note', l: 'شرایط نگهداری', t: 'area' },
      { k: 'note', l: 'توضیح', t: 'area' },
    ],
    // برچسب‌های ایمنی در جدول به‌جای هفت ستونِ بله/خیر، یک ستونِ نشان می‌شوند
    extraCol: { l: 'برچسب‌های ایمنی', render: (r) => {
      const tags = [];
      if (r.is_vital) tags.push(['حیاتی', '#c02626']);
      if (r.is_essential) tags.push(['ضروری', '#9a6b00']);
      if (r.is_high_alert) tags.push(['هشدار بالا', '#c02626']);
      if (r.is_lasa) tags.push(['مشابه', '#9a6b00']);
      if (r.is_refrigerated) tags.push(['یخچالی', '#1550b8']);
      if (r.is_narcotic) tags.push(['مخدر', '#6b2fa8']);
      if (r.is_cytotoxic) tags.push(['سایتوتوکسیک', '#c02626']);
      return tags.length ? tags.map(t => `<span style="display:inline-block;margin:1px;padding:1px 7px;border-radius:20px;
        font-size:11px;color:#fff;background:${t[1]}">${t[0]}</span>`).join('') : '—';
    } },
  },
  recalls: {
    title: 'فراخوان دارو و تجهیزات', icon: '📢',
    sub: 'ب-۶-۲-۳ — سری ساخت، اطلاع‌رسانی به بخش‌ها، جمع‌آوری و سرنوشت نهایی',
    fields: [
      { k: 'item_name', l: 'نام قلم *', t: 'text', list: 1 },
      { k: 'item_kind', l: 'نوع', t: 'select', opts: ['دارو', 'تجهیزات مصرفی پزشکی'], list: 1 },
      { k: 'manufacturer', l: 'کارخانه سازنده', t: 'text', list: 1 },
      { k: 'batch_no', l: 'سری ساخت', t: 'text', list: 1 },
      { k: 'production_date', l: 'تاریخ تولید', t: 'date' },
      { k: 'expiry_date', l: 'تاریخ انقضا', t: 'date' },
      { k: 'source_letter', l: 'شماره نامه/مرجع فراخوان', t: 'text' },
      { k: 'announced_date', l: 'تاریخ اعلام', t: 'date', list: 1 },
      { k: 'notified_wards', l: 'بخش‌های اطلاع‌رسانی‌شده', t: 'text' },
      { k: 'notified_date', l: 'تاریخ اطلاع‌رسانی', t: 'date' },
      { k: 'collected_qty', l: 'مقدار جمع‌آوری‌شده', t: 'text' },
      { k: 'status', l: 'وضعیت', t: 'select', opts: ['announced', 'notified', 'collected', 'closed'], fa: 'recall_status', list: 1, chip: 1 },
      { k: 'final_disposition', l: 'سرنوشت نهایی', t: 'area' },
      { k: 'note', l: 'توضیح', t: 'area' },
    ],
  },
  disposals: {
    title: 'انهدام اقلام تاریخ‌گذشته', icon: '🗑',
    sub: 'ب-۶-۲-۶ — برای هر مورد صورت‌جلسه با حضور مسئول فنی داروخانه',
    fields: [
      { k: 'minutes_no', l: 'شماره صورت‌جلسه *', t: 'text', list: 1 },
      { k: 'disposal_date', l: 'تاریخ انهدام *', t: 'date', list: 1 },
      { k: 'item_name', l: 'نام قلم *', t: 'text', list: 1 },
      { k: 'item_kind', l: 'نوع', t: 'select', opts: ['دارو', 'تجهیزات مصرفی پزشکی'], list: 1 },
      { k: 'batch_no', l: 'سری ساخت', t: 'text' },
      { k: 'expiry_date', l: 'تاریخ انقضا', t: 'date' },
      { k: 'quantity', l: 'مقدار', t: 'text', list: 1 },
      { k: 'reason', l: 'علت', t: 'text' },
      { k: 'method', l: 'روش انهدام', t: 'text' },
      { k: 'attendees', l: 'حاضران (شامل مسئول فنی داروخانه) *', t: 'area', list: 1 },
      { k: 'note', l: 'توضیح', t: 'area' },
    ],
  },
  events: {
    title: 'عوارض ناخواسته و خطاهای دارویی', icon: '⚠️',
    sub: 'ب-۶-۳-۴ — گزارش، تحلیل و اقدام اصلاحی؛ ADR و خطای دارویی دو مقوله‌ی مستقل‌اند',
    fields: [
      { k: 'kind', l: 'نوع رخداد', t: 'select', opts: ['adr', 'medication_error'], fa: 'event_kind', list: 1 },
      { k: 'event_date', l: 'تاریخ رخداد *', t: 'date', list: 1 },
      { k: 'drug_name', l: 'نام دارو *', t: 'text', list: 1 },
      { k: 'ward', l: 'بخش', t: 'text', list: 1 },
      { k: 'patient_ref', l: 'شناسه بیمار (بدون نام)', t: 'text' },
      { k: 'patient_age', l: 'سن', t: 'text' },
      { k: 'patient_gender', l: 'جنسیت', t: 'select', opts: ['', 'زن', 'مرد'] },
      { k: 'severity', l: 'شدت', t: 'select', opts: ['خفیف', 'متوسط', 'شدید', 'مرگ'], list: 1 },
      { k: 'outcome', l: 'پیامد', t: 'text' },
      { k: 'reported_by', l: 'گزارش‌دهنده', t: 'text' },
      { k: 'yellow_form_sent', l: 'فرم زرد ADR ارسال شد', t: 'bool' },
      { k: 'yellow_form_date', l: 'تاریخ ارسال فرم زرد', t: 'date' },
      { k: 'status', l: 'وضعیت', t: 'select', opts: ['open', 'analyzed', 'closed'], fa: 'event_status', list: 1, chip: 1 },
      { k: 'description', l: 'شرح رخداد *', t: 'area' },
      { k: 'analysis', l: 'تحلیل', t: 'area' },
      { k: 'corrective_action', l: 'اقدام اصلاحی', t: 'area' },
    ],
  },
  shortages: {
    title: 'کمبود دارو', icon: '📉',
    sub: 'ب-۶-۱-۳ — شناسایی اقلام با سابقه کمبود، نقطه سفارش، جایگزین و اطلاع‌رسانی به بخش‌ها',
    fields: [
      { k: 'item_name', l: 'نام قلم *', t: 'text', list: 1 },
      { k: 'severity', l: 'شدت', t: 'select', opts: ['کم', 'متوسط', 'زیاد', 'بحرانی'], list: 1 },
      { k: 'started_date', l: 'تاریخ شروع', t: 'date', list: 1 },
      { k: 'resolved_date', l: 'تاریخ رفع', t: 'date', list: 1 },
      { k: 'status', l: 'وضعیت', t: 'select', opts: ['active', 'resolved'], fa: 'shortage_status', list: 1, chip: 1 },
      { k: 'alternative', l: 'جایگزین پیشنهادی', t: 'area' },
      { k: 'priority_rule', l: 'قاعده‌ی اولویت‌بندی مصرف', t: 'area' },
      { k: 'wards_notified', l: 'بخش‌های اطلاع‌رسانی‌شده', t: 'text' },
      { k: 'note', l: 'توضیح', t: 'area' },
    ],
  },
  offformulary: {
    title: 'تجویز خارج از فرمولاری', icon: '📝',
    sub: 'ب-۶-۴-۲ — ثبت سوابق و تصمیم؛ تجویز خارج از فهرست رسمی داروهای ایران (IDL) ممنوع است',
    fields: [
      { k: 'request_date', l: 'تاریخ درخواست *', t: 'date', list: 1 },
      { k: 'item_name', l: 'نام قلم *', t: 'text', list: 1 },
      { k: 'prescriber', l: 'پزشک تجویزکننده', t: 'text', list: 1 },
      { k: 'ward', l: 'بخش', t: 'text', list: 1 },
      { k: 'patient_ref', l: 'شناسه بیمار (بدون نام)', t: 'text' },
      { k: 'in_idl', l: 'در فهرست رسمی داروهای ایران (IDL) هست', t: 'bool', def: 1, list: 1 },
      { k: 'decision', l: 'تصمیم', t: 'select', opts: ['pending', 'approved', 'rejected'], fa: 'decision', list: 1, chip: 1 },
      { k: 'decided_by', l: 'تصمیم‌گیرنده', t: 'text' },
      { k: 'decided_date', l: 'تاریخ تصمیم', t: 'date' },
      { k: 'justification', l: 'توجیه تجویز *', t: 'area' },
      { k: 'decision_note', l: 'توضیح تصمیم', t: 'area' },
    ],
  },
};

const PH_TABS = [
  ['dash', 'داشبورد'], ['formulary', 'فرمولاری'], ['fridges', 'یخچال و دما'],
  ['recalls', 'فراخوان'], ['disposals', 'انهدام'], ['events', 'عوارض و خطا'],
  ['shortages', 'کمبود'], ['offformulary', 'خارج از فرمولاری'],
];

// ---------- ورودی ----------
async function renderPharmacy() {
  if (!phCanView()) {
    $('content').innerHTML = `<div class="panel g"><div class="pbody">برای دیدن این بخش دسترسی ندارید.</div></div>`;
    return;
  }
  $('ptitle').textContent = 'مدیریت دارویی';
  try {
    if (PH.tab === 'dash') { PH.dash = await API.phDashboard(); phDrawDash(); }
    else if (PH.tab === 'fridges') { PH.items = (await API.phList('fridges')).items || []; phDrawFridges(); }
    else { PH.items = (await API.phList(PH.tab)).items || []; phDrawResource(); }
  } catch (e) { toast(e.message, true); }
}
function phGo(t) { PH.tab = t; PH.editId = null; PH.formOpen = false; PH.fridge = null; renderPharmacy(); }

function phTabs() {
  return `<div style="display:flex;gap:6px;flex-wrap:wrap">${PH_TABS.map(([k, l]) =>
    `<button class="btn ${PH.tab === k ? 'btn-g' : 'btn-o'} btn-sm" onclick="phGo('${k}')">${l}</button>`).join('')}</div>`;
}

// ---------- داشبورد ----------
function phDrawDash() {
  const d = PH.dash || {};
  const card = (n, label, clr, tab) => `<div onclick="phGo('${tab}')" style="cursor:pointer;flex:1;min-width:135px;
    border:1px solid var(--bd);border-radius:12px;padding:12px;text-align:center">
    <div style="font-size:26px;font-weight:800;color:${clr}">${fa(n || 0)}</div>
    <div style="font-size:12.5px;color:var(--mut)">${label}</div></div>`;
  $('content').innerHTML = `
  <div class="panel g"><div class="phd"><div class="abadge">💊</div>
    <div style="flex:1"><h3>مدیریت دارویی — محور ب-۶</h3>
      <div class="sub">فرمولاری، انبارش و توزیع ایمن، فراخوان، انهدام، عوارض دارویی و مصرف منطقی</div></div>
    ${phTabs()}</div>
    <div class="pbody">
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        ${card(d.formulary_total, 'قلم فعال فرمولاری', '#17576e', 'formulary')}
        ${card(d.vital, 'داروی حیاتی', '#1550b8', 'formulary')}
        ${card(d.high_alert, 'داروی هشدار بالا', '#c02626', 'formulary')}
        ${card(d.temp_out_30d, 'انحراف دما (۳۰ روز)', d.temp_out_30d ? '#c02626' : '#17576e', 'fridges')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${card(d.active_shortages, 'کمبود در جریان', d.active_shortages ? '#9a6b00' : '#17576e', 'shortages')}
        ${card(d.open_recalls, 'فراخوان باز', d.open_recalls ? '#c02626' : '#17576e', 'recalls')}
        ${card(d.open_events, 'عارضه/خطای باز', d.open_events ? '#c02626' : '#17576e', 'events')}
        ${card(d.pending_off_formulary, 'درخواست خارج از فرمولاری', d.pending_off_formulary ? '#9a6b00' : '#17576e', 'offformulary')}
      </div>
      <div style="margin-top:16px;color:var(--mut);font-size:13px;line-height:2">
        هر کارت به تبِ مربوطش می‌رود. «انحراف دما» شمارشِ ثبت‌هایی است که خارج از محدوده‌ی
        مجازِ همان یخچال بوده‌اند — این عدد را سرور از روی دمای ثبت‌شده حساب می‌کند، نه از
        روی تیکِ کاربر.
      </div>
    </div></div>`;
}

// ---------- جدول و فرمِ داده‌محور برای شش منبع ----------
function phCell(f, r) {
  const v = r[f.k];
  if (f.t === 'bool') return v ? '✔' : '—';
  if (f.t === 'date') return faDateISO(v);
  if (f.chip) return phChip(v, PH_FA[f.fa]);
  if (f.fa) return esc((PH_FA[f.fa] || {})[v] || v || '—');
  if (v === null || v === undefined || v === '') return '—';
  return f.t === 'num' ? fa(v) : esc(String(v));
}

function phDrawResource() {
  const sp = PH_SPEC[PH.tab];
  const cols = sp.fields.filter(f => f.list);
  const rows = PH.items.map(r => `<tr>
    ${cols.map(f => `<td>${phCell(f, r)}</td>`).join('')}
    ${sp.extraCol ? `<td>${sp.extraCol.render(r)}</td>` : ''}
    ${phCanManage() ? `<td style="white-space:nowrap">
      <button class="btn btn-o btn-sm" onclick="phEdit('${r.id}')">ویرایش</button>
      <button class="btn btn-o btn-sm" onclick="phRemove('${r.id}')">حذف</button></td>` : ''}
  </tr>`).join('');
  $('content').innerHTML = `
  <div class="panel g"><div class="phd"><div class="abadge">${sp.icon}</div>
    <div style="flex:1"><h3>${sp.title}</h3><div class="sub">${sp.sub}</div></div>
    ${phTabs()}</div>
    <div class="pbody">
      ${phCanManage() ? `<div style="margin-bottom:12px">
        <button class="btn btn-g btn-sm" onclick="phEdit('')">+ ثبت جدید</button>
        <button class="btn btn-o btn-sm" onclick="phPrint()">🖨 چاپ فهرست</button></div>` : ''}
      <div id="ph_form"></div>
      ${rows ? `<div style="overflow-x:auto"><table><thead><tr>
        ${cols.map(f => `<th>${esc(f.l.replace(' *', ''))}</th>`).join('')}
        ${sp.extraCol ? `<th>${sp.extraCol.l}</th>` : ''}
        ${phCanManage() ? '<th></th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>`
        : `<div style="color:var(--mut);padding:20px 0">هنوز موردی ثبت نشده است.</div>`}
    </div></div>`;
  if (PH.formOpen) phDrawForm();
}

function phFieldHtml(f, r) {
  const id = 'phf_' + f.k;
  const v = r ? r[f.k] : (f.def !== undefined ? f.def : '');
  if (f.t === 'bool') return `<div class="fg"><label>${esc(f.l)}</label>
    <select id="${id}"><option value="1" ${v ? 'selected' : ''}>بله</option>
    <option value="0" ${v ? '' : 'selected'}>خیر</option></select></div>`;
  if (f.t === 'date') return `<div class="fg fg-date"><label>${esc(f.l)}</label>${jalaliDateInputHtml(id)}</div>`;
  if (f.t === 'select') return `<div class="fg"><label>${esc(f.l)}</label><select id="${id}">
    ${f.opts.map(o => `<option value="${esc(o)}" ${String(v || '') === o ? 'selected' : ''}>${
      esc(o === '' ? '—' : ((PH_FA[f.fa] || {})[o] || o))}</option>`).join('')}</select></div>`;
  if (f.t === 'area') return `<div class="fg" style="grid-column:1/-1"><label>${esc(f.l)}</label>
    <textarea id="${id}" rows="2">${esc(v == null ? '' : v)}</textarea></div>`;
  return `<div class="fg"><label>${esc(f.l)}</label>
    <input id="${id}" ${f.t === 'num' ? 'type="number"' : ''} value="${esc(v == null ? '' : v)}"></div>`;
}

function phEdit(id) { PH.editId = id || null; PH.formOpen = true; phDrawForm(); }

function phDrawForm() {
  const sp = PH_SPEC[PH.tab];
  const r = PH.editId ? PH.items.find(x => x.id === PH.editId) : null;
  const grid = sp.fields.filter(f => f.t !== 'area').map(f => phFieldHtml(f, r)).join('');
  const areas = sp.fields.filter(f => f.t === 'area').map(f => phFieldHtml(f, r)).join('');
  $('ph_form').innerHTML = `
  <div style="border:1px solid var(--bd);border-radius:12px;padding:14px;margin-bottom:14px">
    <b>${r ? 'ویرایش' : 'ثبت جدید'} — ${esc(sp.title)}</b>
    <div class="docgrid" style="margin-top:10px">${grid}</div>
    ${areas}
    <div style="margin-top:10px">
      <button class="btn btn-g btn-sm" onclick="phSave()">ذخیره</button>
      <button class="btn btn-o btn-sm" onclick="phCancel()">انصراف</button></div>
  </div>`;
  for (const f of sp.fields) if (f.t === 'date' && r) setJalaliDateInput('phf_' + f.k, r[f.k]);
  const box = $('ph_form'); if (box && box.scrollIntoView) box.scrollIntoView({ block: 'nearest' });
}
function phCancel() { PH.formOpen = false; PH.editId = null; $('ph_form').innerHTML = ''; }

async function phSave() {
  const sp = PH_SPEC[PH.tab];
  const b = {};
  for (const f of sp.fields) {
    const id = 'phf_' + f.k;
    if (f.t === 'date') { b[f.k] = readJalaliDateInput(id); continue; }
    const el = $(id); if (!el) continue;
    b[f.k] = f.t === 'bool' ? (el.value === '1' ? 1 : 0) : el.value.trim();
  }
  try {
    if (PH.editId) await API.phUpdate(PH.tab, PH.editId, b);
    else await API.phCreate(PH.tab, b);
    toast('ذخیره شد');
    PH.formOpen = false; PH.editId = null;
    renderPharmacy();
  } catch (e) { toast(e.message, true); }
}

async function phRemove(id) {
  if (!await BTN.confirmDanger('این مورد حذف شود؟')) return;
  try { await API.phDelete(PH.tab, id); toast('حذف شد'); renderPharmacy(); }
  catch (e) { toast(e.message, true); }
}

// ---------- یخچال و پایش دما ----------
function phDrawFridges() {
  if (PH.fridge) return phDrawTemps();
  const rows = PH.items.map(f => `<tr>
    <td>${esc(f.title)}</td><td>${esc(f.location || '—')}</td>
    <td>${fa(f.min_temp)} تا ${fa(f.max_temp)} °C</td>
    <td>${f.has_alarm ? '✔' : '—'}</td><td>${f.on_emergency_power ? '✔' : '—'}</td>
    <td>${esc(f.responsible || '—')}</td>
    <td style="white-space:nowrap"><button class="btn btn-g btn-sm" onclick="phOpenFridge('${f.id}')">ثبت و سوابق دما</button>
    ${phCanManage() ? `<button class="btn btn-o btn-sm" onclick="phFridgeForm('${f.id}')">ویرایش</button>
    <button class="btn btn-o btn-sm" onclick="phFridgeRemove('${f.id}')">حذف</button>` : ''}</td>
  </tr>`).join('');
  $('content').innerHTML = `
  <div class="panel g"><div class="phd"><div class="abadge">🌡</div>
    <div style="flex:1"><h3>یخچال دارویی و پایش دما</h3>
      <div class="sub">ب-۶-۲-۱ — کنترل دمای یخچال‌های دارویی با حد مجاز، سیستم هشدار و اتصال به برق اضطراری</div></div>
    ${phTabs()}</div>
    <div class="pbody">
      ${phCanManage() ? `<div style="margin-bottom:12px"><button class="btn btn-g btn-sm" onclick="phFridgeForm('')">+ یخچال جدید</button></div>` : ''}
      <div id="ph_form"></div>
      ${rows ? `<div style="overflow-x:auto"><table><thead><tr><th>عنوان</th><th>محل</th>
        <th>محدوده مجاز</th><th>هشداردهنده</th><th>برق اضطراری</th><th>مسئول</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div>`
        : `<div style="color:var(--mut);padding:20px 0">هنوز یخچالی ثبت نشده است.</div>`}
    </div></div>`;
}

function phFridgeForm(id) {
  const f = id ? PH.items.find(x => x.id === id) : null;
  const v = (k, d) => f ? (f[k] == null ? '' : f[k]) : (d === undefined ? '' : d);
  $('ph_form').innerHTML = `
  <div style="border:1px solid var(--bd);border-radius:12px;padding:14px;margin-bottom:14px">
    <b>${f ? 'ویرایش یخچال' : 'یخچال جدید'}</b>
    <div class="docgrid" style="margin-top:10px">
      <div class="fg"><label>عنوان *</label><input id="phg_title" value="${esc(v('title'))}" placeholder="مثال: یخچال داروخانه ۱"></div>
      <div class="fg"><label>محل</label><input id="phg_loc" value="${esc(v('location'))}"></div>
      <div class="fg"><label>حد پایین دما (°C)</label><input id="phg_min" type="number" step="0.1" value="${esc(v('min_temp', 2))}"></div>
      <div class="fg"><label>حد بالای دما (°C)</label><input id="phg_max" type="number" step="0.1" value="${esc(v('max_temp', 8))}"></div>
      <div class="fg"><label>سیستم هشداردهنده دارد</label><select id="phg_alarm">
        <option value="1" ${v('has_alarm') ? 'selected' : ''}>بله</option>
        <option value="0" ${v('has_alarm') ? '' : 'selected'}>خیر</option></select></div>
      <div class="fg"><label>به برق اضطراری متصل است</label><select id="phg_pow">
        <option value="1" ${v('on_emergency_power') ? 'selected' : ''}>بله</option>
        <option value="0" ${v('on_emergency_power') ? '' : 'selected'}>خیر</option></select></div>
      <div class="fg"><label>مسئول</label><input id="phg_resp" value="${esc(v('responsible'))}"></div>
    </div>
    <button class="btn btn-g btn-sm" onclick="phFridgeSave('${id || ''}')">ذخیره</button>
    <button class="btn btn-o btn-sm" onclick="document.getElementById('ph_form').innerHTML=''">انصراف</button>
  </div>`;
}

async function phFridgeSave(id) {
  const b = { title: $('phg_title').value.trim(), location: $('phg_loc').value.trim(),
    min_temp: $('phg_min').value, max_temp: $('phg_max').value,
    has_alarm: $('phg_alarm').value === '1' ? 1 : 0, on_emergency_power: $('phg_pow').value === '1' ? 1 : 0,
    responsible: $('phg_resp').value.trim(), is_active: 1 };
  try {
    if (id) await API.phUpdate('fridges', id, b); else await API.phCreate('fridges', b);
    toast('ذخیره شد'); renderPharmacy();
  } catch (e) { toast(e.message, true); }
}
async function phFridgeRemove(id) {
  if (!await BTN.confirmDanger('این یخچال با همه‌ی سوابق دمای آن حذف شود؟')) return;
  try { await API.phDelete('fridges', id); toast('حذف شد'); renderPharmacy(); }
  catch (e) { toast(e.message, true); }
}

async function phOpenFridge(id) {
  try { PH.temps = await API.phTemps(id); PH.fridge = PH.temps.fridge; phDrawTemps(); }
  catch (e) { toast(e.message, true); }
}

function phDrawTemps() {
  const f = PH.fridge, t = PH.temps || { logs: [] };
  const rows = (t.logs || []).map(l => `<tr>
    <td>${faDateISO(l.log_date)}</td><td>${esc(l.slot)}</td>
    <td style="color:${l.in_range ? '#17576e' : '#c02626'};font-weight:700">${fa(l.temperature)} °C</td>
    <td>${l.humidity == null ? '—' : fa(l.humidity) + '٪'}</td>
    <td>${l.in_range ? '<span style="color:#17576e">در محدوده</span>' : '<span style="color:#c02626;font-weight:700">خارج از محدوده</span>'}</td>
    <td style="text-align:right">${esc(l.action_taken || '—')}</td>
    <td>${esc(l.recorded_by || '—')}</td></tr>`).join('');
  $('ptitle').textContent = 'پایش دما — ' + f.title;
  $('content').innerHTML = `
  <div class="panel g"><div class="phd"><div class="abadge">🌡</div>
    <div style="flex:1"><h3>${esc(f.title)}</h3>
      <div class="sub">${esc(f.location || '')} — محدوده مجاز ${fa(f.min_temp)} تا ${fa(f.max_temp)} درجه؛
        ${fa(t.out_of_range || 0)} ثبتِ خارج از محدوده</div></div>
    <button class="btn btn-o btn-sm" onclick="phPrintTemps()">🖨 چاپ سوابق</button>
    <button class="btn btn-o btn-sm" onclick="phGo('fridges')">◂ بازگشت</button></div>
    <div class="pbody">
      ${phCanManage() ? `<div style="border:1px solid var(--bd);border-radius:12px;padding:14px;margin-bottom:14px">
        <b>ثبت دمای جدید</b>
        <div class="sub" style="margin:4px 0 10px">اگر دما خارج از محدوده باشد، ثبتِ اقدام انجام‌شده الزامی است.</div>
        <div class="docgrid">
          <div class="fg"><label>تاریخ *</label>${jalaliDateInputHtml('pht_date')}</div>
          <div class="fg"><label>نوبت</label><select id="pht_slot">
            <option>صبح</option><option>عصر</option><option>شب</option></select></div>
          <div class="fg"><label>دما (°C) *</label><input id="pht_temp" type="number" step="0.1"></div>
          <div class="fg"><label>رطوبت (٪)</label><input id="pht_hum" type="number" step="1"></div>
          <div class="fg"><label>ثبت‌کننده</label><input id="pht_by"></div>
        </div>
        <div class="fg"><label>اقدام انجام‌شده (در صورت انحراف)</label><textarea id="pht_act" rows="2"></textarea></div>
        <button class="btn btn-g btn-sm" onclick="phTempSave()">ثبت</button>
      </div>` : ''}
      ${rows ? `<div style="overflow-x:auto"><table><thead><tr><th>تاریخ</th><th>نوبت</th><th>دما</th>
        <th>رطوبت</th><th>وضعیت</th><th>اقدام</th><th>ثبت‌کننده</th></tr></thead><tbody>${rows}</tbody></table></div>`
        : `<div style="color:var(--mut);padding:20px 0">هنوز دمایی ثبت نشده است.</div>`}
    </div></div>`;
}

async function phTempSave() {
  const b = { log_date: readJalaliDateInput('pht_date'), slot: $('pht_slot').value,
    temperature: $('pht_temp').value, humidity: $('pht_hum').value,
    action_taken: $('pht_act').value.trim(), recorded_by: $('pht_by').value.trim() };
  if (!b.log_date) { toast('تاریخ الزامی است', true); return; }
  if (b.temperature === '') { toast('دما الزامی است', true); return; }
  try {
    const r = await API.phAddTemp(PH.fridge.id, b);
    toast(r.in_range ? 'ثبت شد — دما در محدوده است' : 'ثبت شد — دما خارج از محدوده بود');
    phOpenFridge(PH.fridge.id);
  } catch (e) { toast(e.message, true); }
}

// ---------- چاپ ----------
function phPrint() {
  const sp = PH_SPEC[PH.tab];
  const cols = sp.fields.filter(f => f.list);
  const body = `<h3 style="text-align:center;margin:0 0 4px">${esc(sp.title)}</h3>
    <div style="text-align:center;font-size:12px;margin-bottom:10px">${esc(sp.sub)}</div>
    <table style="width:100%"><thead><tr>${cols.map(f => `<th>${esc(f.l.replace(' *', ''))}</th>`).join('')}
      ${sp.extraCol ? `<th>${sp.extraCol.l}</th>` : ''}</tr></thead><tbody>
      ${PH.items.map(r => `<tr>${cols.map(f => `<td>${phCell(f, r)}</td>`).join('')}
        ${sp.extraCol ? `<td>${sp.extraCol.render(r)}</td>` : ''}</tr>`).join('')
        || `<tr><td colspan="${cols.length + 1}">موردی ثبت نشده است</td></tr>`}
    </tbody></table>`;
  fasDoPrint(printSheet(sp.title, body, 'مدیریت دارویی — محور ب-۶'), true);
}

function phPrintTemps() {
  const f = PH.fridge, t = PH.temps || { logs: [] };
  const body = `<h3 style="text-align:center;margin:0 0 4px">سوابق پایش دمای یخچال دارویی</h3>
    <div style="text-align:center;font-size:12px;margin-bottom:10px">${esc(f.title)}
      ${f.location ? ' — ' + esc(f.location) : ''} — محدوده مجاز ${fa(f.min_temp)} تا ${fa(f.max_temp)} درجه</div>
    <table style="width:100%"><thead><tr><th>تاریخ</th><th>نوبت</th><th>دما</th><th>رطوبت</th>
      <th>وضعیت</th><th>اقدام</th><th>ثبت‌کننده</th></tr></thead><tbody>
      ${(t.logs || []).map(l => `<tr><td>${faDateISO(l.log_date)}</td><td>${esc(l.slot)}</td>
        <td>${fa(l.temperature)}</td><td>${l.humidity == null ? '—' : fa(l.humidity)}</td>
        <td>${l.in_range ? 'در محدوده' : 'خارج از محدوده'}</td>
        <td style="text-align:right">${esc(l.action_taken || '—')}</td>
        <td>${esc(l.recorded_by || '—')}</td></tr>`).join('') || '<tr><td colspan="7">—</td></tr>'}
    </tbody></table>`;
  // از همان مسیرِ چاپِ ماژول اقلام استفاده می‌شود؛ دوباره‌سازی لازم نبود.
  fasDoPrint(printSheet('پایش دمای یخچال دارویی', body, 'مدیریت دارویی — ب-۶-۲-۱'), true);
}

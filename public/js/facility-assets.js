/* ==========================================================================
 * اقلام و نگهداشت دوره‌ای — رابط کاربری
 * --------------------------------------------------------------------------
 * محورهای الف-۶ (بهداشت محیط) و الف-۷ (مدیریت تجهیزات پزشکی) هر دو یک چیز
 * می‌خواهند: «شناسنامه‌ی قلم» + «برنامه‌ی دوره‌ای» + «سوابق اجرا با نتیجه و اقدام
 * اصلاحی». پس یک صفحه با سه نما ساخته شد، نه دو ماژول موازی:
 *   • تقویم سررسید (due)  — «چه چیزی عقب افتاده؟» همان اولین سؤال ممیز.
 *   • فهرست اقلام (list)  — با فیلتر دسته/وضعیت و جست‌وجو.
 *   • شناسنامه (detail)   — یک قلم، برنامه‌هایش، و تاریخچه‌ی اجراهایش.
 * مثل shift-schedule.js در فایل جدا نشسته تا app.js بیشتر باد نکند.
 * ========================================================================== */

const FAS = { view: 'due', list: [], due: null, detail: null, filters: { category: '', status: '', q: '' } };

const FAS_STATUS_FA = { active: 'فعال', out_of_service: 'خارج از سرویس', scrapped: 'اسقاط' };
const FAS_RESULT_FA = { ok: 'سالم / منطبق', needs_action: 'نیازمند اقدام', failed: 'مردود' };
const FAS_RESULT_CLR = { ok: '#17576e', needs_action: '#9a6b00', failed: '#c02626' };
const FAS_DUE_FA = { overdue: 'سررسید گذشته', due_soon: 'نزدیک سررسید', ok: 'در مهلت', unknown: 'بدون سررسید' };
const FAS_DUE_CLR = { overdue: '#c02626', due_soon: '#9a6b00', ok: '#17576e', unknown: '#6b7280' };
const FAS_CATEGORIES = ['تجهیزات پزشکی', 'تأسیسات', 'بهداشت محیط', 'ایمنی و آتش‌نشانی', 'خودرو', 'سایر'];
const FAS_RISK = ['بحرانی', 'زیاد', 'متوسط', 'کم'];
const FAS_KINDS = ['کالیبراسیون', 'نگهداشت پیشگیرانه', 'بازرسی', 'آزمون/نمونه‌برداری', 'تمدید مجوز', 'سرویس دوره‌ای'];

const fasCanView = () => { const p = (S.user && S.user.permissions) || []; return p.includes('view_facility_assets') || p.includes('manage_facility_assets'); };
const fasCanManage = () => ((S.user && S.user.permissions) || []).includes('manage_facility_assets');

function fasDueBadge(row) {
  const s = row.due_status || 'unknown';
  const d = row.days_to_due;
  let extra = '';
  if (s === 'overdue' && d !== null) extra = ` (${fa(Math.abs(d))} روز)`;
  else if (s === 'due_soon' && d !== null) extra = ` (${fa(d)} روز مانده)`;
  return `<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:12px;font-weight:700;
    color:#fff;background:${FAS_DUE_CLR[s]}">${FAS_DUE_FA[s]}${extra}</span>`;
}

async function renderFacilityAssets() {
  if (!fasCanView()) {
    $('content').innerHTML = `<div class="panel g"><div class="pbody">برای دیدن این بخش دسترسی ندارید.</div></div>`;
    return;
  }
  $('ptitle').textContent = 'اقلام و نگهداشت دوره‌ای';
  if (FAS.view === 'detail' && FAS.detail) return fasDrawDetail();
  try {
    if (FAS.view === 'due') { FAS.due = await API.assetsDue(); fasDrawDue(); }
    else {
      const qs = new URLSearchParams();
      if (FAS.filters.category) qs.set('category', FAS.filters.category);
      if (FAS.filters.status) qs.set('status', FAS.filters.status);
      if (FAS.filters.q) qs.set('q', FAS.filters.q);
      const r = await API.assets(qs.toString());
      FAS.list = r.assets || [];
      fasDrawList();
    }
  } catch (e) { toast(e.message, true); }
}

function fasTabs() {
  const t = (k, label) => `<button class="btn ${FAS.view === k ? 'btn-g' : 'btn-o'} btn-sm" onclick="fasGo('${k}')">${label}</button>`;
  return `<div style="display:flex;gap:8px;flex-wrap:wrap">${t('due', 'تقویم سررسید')}${t('list', 'فهرست اقلام')}</div>`;
}
function fasGo(v) { FAS.view = v; FAS.detail = null; renderFacilityAssets(); }

// ---------- نما ۱: تقویم سررسید ----------
function fasDrawDue() {
  const d = FAS.due || { plans: [], summary: {} };
  const sm = d.summary || {};
  const card = (k) => `<div style="flex:1;min-width:130px;border:1px solid var(--bd);border-radius:12px;padding:12px;text-align:center">
    <div style="font-size:26px;font-weight:800;color:${FAS_DUE_CLR[k]}">${fa(sm[k] || 0)}</div>
    <div style="font-size:13px;color:var(--mut)">${FAS_DUE_FA[k]}</div></div>`;
  const rows = (d.plans || []).map(p => `<tr>
    <td>${esc(p.asset_title)}${p.asset_code ? `<div style="font-size:11px;color:var(--mut)">${esc(p.asset_code)}</div>` : ''}</td>
    <td>${esc(p.category || '—')}</td>
    <td>${esc(p.location || '—')}</td>
    <td>${esc(p.kind)}</td>
    <td>${fa(p.interval_months)} ماه</td>
    <td>${faDateISO(p.last_done_date)}</td>
    <td>${faDateISO(p.next_due_date)}</td>
    <td>${fasDueBadge(p)}</td>
    <td><button class="btn btn-o btn-sm" onclick="fasOpen('${p.asset_id}')">شناسنامه</button></td>
  </tr>`).join('');
  $('content').innerHTML = `
  <div class="panel g"><div class="phd"><div class="abadge">🛠</div>
    <div style="flex:1"><h3>تقویم سررسید نگهداشت</h3>
      <div class="sub">کالیبراسیون، نگهداشت پیشگیرانه، بازرسی و نمونه‌برداری‌های دوره‌ای — «نزدیک سررسید» یعنی ۳۰ روز یا کمتر</div></div>
    ${fasTabs()}</div>
    <div class="pbody">
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">
        ${card('overdue')}${card('due_soon')}${card('ok')}${card('unknown')}</div>
      ${rows ? `<div style="overflow-x:auto"><table><thead><tr>
        <th>قلم</th><th>دسته</th><th>محل</th><th>نوع کار</th><th>تناوب</th>
        <th>آخرین اجرا</th><th>سررسید بعدی</th><th>وضعیت</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div>`
        : `<div style="color:var(--mut);padding:20px 0">هنوز هیچ برنامه‌ی دوره‌ای فعالی ثبت نشده است. از «فهرست اقلام» یک قلم بسازید و برایش برنامه تعریف کنید.</div>`}
      <div style="margin-top:12px"><button class="btn btn-o btn-sm" onclick="fasPrintDue()">🖨 چاپ تقویم سررسید</button></div>
    </div></div>`;
}

// ---------- نما ۲: فهرست اقلام ----------
function fasDrawList() {
  const opts = (arr, cur) => arr.map(x => `<option value="${esc(x)}" ${cur === x ? 'selected' : ''}>${esc(x)}</option>`).join('');
  const rows = FAS.list.map(a => `<tr>
    <td>${esc(a.asset_code || '—')}</td>
    <td>${esc(a.title)}</td>
    <td>${esc(a.category)}</td>
    <td>${esc(a.location || '—')}</td>
    <td>${esc(a.risk_class || '—')}</td>
    <td>${esc(FAS_STATUS_FA[a.status] || a.status)}</td>
    <td>${fa(a.plan_count || 0)}</td>
    <td>${a.next_due_date ? faDateISO(a.next_due_date) + '<br>' + fasDueBadge(a) : '<span style="color:var(--mut)">—</span>'}</td>
    <td style="white-space:nowrap">
      <button class="btn btn-o btn-sm" onclick="fasOpen('${a.id}')">شناسنامه</button>
      ${fasCanManage() ? `<button class="btn btn-o btn-sm" onclick="fasEdit('${a.id}')">ویرایش</button>
      <button class="btn btn-o btn-sm" onclick="fasRemove('${a.id}')">حذف</button>` : ''}
    </td></tr>`).join('');
  $('content').innerHTML = `
  <div class="panel g"><div class="phd"><div class="abadge">📋</div>
    <div style="flex:1"><h3>فهرست اقلام</h3>
      <div class="sub">تجهیزات پزشکی، تأسیسات، اقلام بهداشت محیط و ایمنی — هر قلم یک شناسنامه دارد</div></div>
    ${fasTabs()}</div>
    <div class="pbody">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:14px">
        <div class="fg" style="margin:0;min-width:170px"><label>دسته</label>
          <select id="fas_fcat" onchange="fasApplyFilters()"><option value="">همه</option>${opts(FAS_CATEGORIES, FAS.filters.category)}</select></div>
        <div class="fg" style="margin:0;min-width:150px"><label>وضعیت</label>
          <select id="fas_fst" onchange="fasApplyFilters()"><option value="">همه</option>
            ${Object.keys(FAS_STATUS_FA).map(k => `<option value="${k}" ${FAS.filters.status === k ? 'selected' : ''}>${FAS_STATUS_FA[k]}</option>`).join('')}</select></div>
        <div class="fg" style="margin:0;flex:1;min-width:180px"><label>جست‌وجو (عنوان، کد اموال، سریال، محل)</label>
          <input id="fas_fq" value="${esc(FAS.filters.q)}" onchange="fasApplyFilters()"></div>
        ${fasCanManage() ? `<button class="btn btn-g btn-sm" onclick="fasEdit('')">+ قلم جدید</button>` : ''}
      </div>
      ${rows ? `<div style="overflow-x:auto"><table><thead><tr>
        <th>کد اموال</th><th>عنوان</th><th>دسته</th><th>محل</th><th>رده‌ی خطر</th>
        <th>وضعیت</th><th>برنامه</th><th>نزدیک‌ترین سررسید</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div>`
        : `<div style="color:var(--mut);padding:20px 0">قلمی با این فیلترها یافت نشد.</div>`}
    </div></div>`;
}
function fasApplyFilters() {
  FAS.filters = { category: $('fas_fcat').value, status: $('fas_fst').value, q: $('fas_fq').value.trim() };
  renderFacilityAssets();
}

// ---------- فرم قلم ----------
function fasEdit(id) {
  const a = id ? FAS.list.find(x => x.id === id) : null;
  const v = (f) => a ? (a[f] || '') : '';
  const opts = (arr, cur) => arr.map(x => `<option value="${esc(x)}" ${cur === x ? 'selected' : ''}>${esc(x)}</option>`).join('');
  $('content').innerHTML = `
  <div class="panel g"><div class="phd"><div class="abadge">🧾</div>
    <div style="flex:1"><h3>${a ? 'ویرایش قلم' : 'قلم جدید'}</h3>
      <div class="sub">شناسنامه‌ی قلم — بعد از ذخیره می‌توانید برنامه‌ی دوره‌ای برایش تعریف کنید</div></div>
    <button class="btn btn-o btn-sm" onclick="fasGo('list')">◂ بازگشت</button></div>
    <div class="pbody">
      <div class="docgrid">
        <div class="fg" style="grid-column:span 2"><label>عنوان قلم *</label>
          <input id="fas_title" value="${esc(v('title'))}" placeholder="مثال: دستگاه ونتیلاتور اتاق عمل ۲"></div>
        <div class="fg"><label>کد اموال / شناسنامه</label><input id="fas_code" value="${esc(v('asset_code'))}"></div>
        <div class="fg"><label>دسته</label><select id="fas_cat">${opts(FAS_CATEGORIES, v('category') || FAS_CATEGORIES[0])}</select></div>
        <div class="fg"><label>محل استقرار</label><input id="fas_loc" value="${esc(v('location'))}" placeholder="مثال: اتاق عمل"></div>
        <div class="fg"><label>مسئول</label><input id="fas_resp" value="${esc(v('responsible'))}"></div>
        <div class="fg"><label>سازنده</label><input id="fas_man" value="${esc(v('manufacturer'))}"></div>
        <div class="fg"><label>مدل</label><input id="fas_model" value="${esc(v('model'))}"></div>
        <div class="fg"><label>شماره سریال</label><input id="fas_serial" value="${esc(v('serial_no'))}"></div>
        <div class="fg"><label>رده‌ی خطر</label><select id="fas_risk">${opts(FAS_RISK, v('risk_class') || 'متوسط')}</select></div>
        <div class="fg"><label>وضعیت</label><select id="fas_status">
          ${Object.keys(FAS_STATUS_FA).map(k => `<option value="${k}" ${(v('status') || 'active') === k ? 'selected' : ''}>${FAS_STATUS_FA[k]}</option>`).join('')}</select></div>
      </div>
      <div class="docdates">
        <div class="fg" style="margin:0"><label>تاریخ خرید</label>${jalaliDateInputHtml('fas_pd')}</div>
        <div class="fg" style="margin:0"><label>تاریخ نصب / راه‌اندازی</label>${jalaliDateInputHtml('fas_id')}</div>
        <div class="fg" style="margin:0"><label>پایان گارانتی</label>${jalaliDateInputHtml('fas_wd')}</div>
      </div>
      <div class="fg" style="margin-top:14px"><label>توضیح</label><textarea id="fas_note" rows="2">${esc(v('note'))}</textarea></div>
      <div style="margin-top:12px"><button class="btn btn-g" onclick="fasSave('${id || ''}')">ذخیره</button></div>
    </div></div>`;
  if (a) {
    setJalaliDateInput('fas_pd', a.purchase_date);
    setJalaliDateInput('fas_id', a.install_date);
    setJalaliDateInput('fas_wd', a.warranty_end);
  }
}

async function fasSave(id) {
  const b = {
    title: $('fas_title').value.trim(), asset_code: $('fas_code').value.trim(),
    category: $('fas_cat').value, location: $('fas_loc').value.trim(),
    responsible: $('fas_resp').value.trim(), manufacturer: $('fas_man').value.trim(),
    model: $('fas_model').value.trim(), serial_no: $('fas_serial').value.trim(),
    risk_class: $('fas_risk').value, status: $('fas_status').value,
    purchase_date: readJalaliDateInput('fas_pd'), install_date: readJalaliDateInput('fas_id'),
    warranty_end: readJalaliDateInput('fas_wd'), note: $('fas_note').value.trim(),
  };
  if (!b.title) { toast('عنوان قلم الزامی است', true); return; }
  try {
    if (id) await API.updateAsset(id, b); else await API.createAsset(b);
    toast(id ? 'قلم به‌روزرسانی شد' : 'قلم ثبت شد');
    fasGo('list');
  } catch (e) { toast(e.message, true); }
}

async function fasRemove(id) {
  if (!await BTN.confirmDanger('این قلم با همه‌ی برنامه‌ها و سوابقش حذف شود؟')) return;
  try { await API.deleteAsset(id); toast('قلم حذف شد'); renderFacilityAssets(); }
  catch (e) { toast(e.message, true); }
}

// ---------- نما ۳: شناسنامه‌ی یک قلم ----------
async function fasOpen(id) {
  try { FAS.detail = await API.asset(id); FAS.view = 'detail'; fasDrawDetail(); }
  catch (e) { toast(e.message, true); }
}

function fasDrawDetail() {
  const d = FAS.detail, a = d.asset;
  const info = (l, v) => `<div><span style="color:var(--mut);font-size:12px">${l}</span><br><b>${v}</b></div>`;
  const planRows = (d.plans || []).map(p => `<tr>
    <td>${esc(p.kind)}${p.title ? `<div style="font-size:11px;color:var(--mut)">${esc(p.title)}</div>` : ''}</td>
    <td>${fa(p.interval_months)} ماه</td>
    <td>${esc(p.responsible || '—')}</td>
    <td>${esc(p.vendor || '—')}</td>
    <td>${faDateISO(p.last_done_date)}</td>
    <td>${faDateISO(p.next_due_date)}</td>
    <td>${p.is_active ? fasDueBadge(p) : '<span style="color:var(--mut)">غیرفعال</span>'}</td>
    ${fasCanManage() ? `<td style="white-space:nowrap">
      <button class="btn btn-g btn-sm" onclick="fasLogForm('${p.id}')">ثبت اجرا</button>
      <button class="btn btn-o btn-sm" onclick="fasPlanForm('${p.id}')">ویرایش</button>
      <button class="btn btn-o btn-sm" onclick="fasPlanRemove('${p.id}')">حذف</button></td>` : ''}
  </tr>`).join('');
  const logRows = (d.logs || []).map(l => `<tr>
    <td>${faDateISO(l.done_date)}</td>
    <td>${esc(l.plan_kind || '—')}</td>
    <td><span style="color:${FAS_RESULT_CLR[l.result] || '#000'};font-weight:700">${FAS_RESULT_FA[l.result] || l.result}</span></td>
    <td>${esc(l.performed_by || '—')}</td>
    <td>${l.cost ? fa(l.cost) : '—'}</td>
    <td style="text-align:right">${esc(l.description || '—')}</td>
    <td style="text-align:right">${esc(l.corrective_action || '—')}</td>
    ${fasCanManage() ? `<td><button class="btn btn-o btn-sm" onclick="fasLogRemove('${l.id}')">حذف</button></td>` : ''}
  </tr>`).join('');
  $('ptitle').textContent = 'شناسنامه‌ی ' + a.title;
  $('content').innerHTML = `
  <div class="panel g"><div class="phd"><div class="abadge">🧾</div>
    <div style="flex:1"><h3>${esc(a.title)}</h3>
      <div class="sub">${esc(a.category)}${a.asset_code ? ' — کد ' + esc(a.asset_code) : ''}</div></div>
    <button class="btn btn-o btn-sm" onclick="fasPrintCard()">🖨 چاپ شناسنامه</button>
    <button class="btn btn-o btn-sm" onclick="fasGo('list')">◂ بازگشت</button></div>
    <div class="pbody">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px">
        ${info('محل استقرار', esc(a.location || '—'))}
        ${info('مسئول', esc(a.responsible || '—'))}
        ${info('سازنده', esc(a.manufacturer || '—'))}
        ${info('مدل', esc(a.model || '—'))}
        ${info('شماره سریال', esc(a.serial_no || '—'))}
        ${info('رده‌ی خطر', esc(a.risk_class || '—'))}
        ${info('وضعیت', esc(FAS_STATUS_FA[a.status] || a.status))}
        ${info('تاریخ خرید', faDateISO(a.purchase_date))}
        ${info('تاریخ نصب', faDateISO(a.install_date))}
        ${info('پایان گارانتی', faDateISO(a.warranty_end))}
      </div>
      ${a.note ? `<div style="margin-bottom:14px;color:var(--mut)">${esc(a.note)}</div>` : ''}

      <h4 style="margin:18px 0 8px">برنامه‌های دوره‌ای</h4>
      ${planRows ? `<div style="overflow-x:auto"><table><thead><tr>
        <th>نوع کار</th><th>تناوب</th><th>مسئول</th><th>پیمانکار</th><th>آخرین اجرا</th>
        <th>سررسید بعدی</th><th>وضعیت</th>${fasCanManage() ? '<th></th>' : ''}</tr></thead>
        <tbody>${planRows}</tbody></table></div>`
        : `<div style="color:var(--mut)">هنوز برنامه‌ی دوره‌ای تعریف نشده است.</div>`}
      ${fasCanManage() ? `<div style="margin-top:10px"><button class="btn btn-g btn-sm" onclick="fasPlanForm('')">+ برنامه‌ی دوره‌ای جدید</button></div>` : ''}
      <div id="fas_planbox"></div>

      <h4 style="margin:22px 0 8px">سوابق اجرا</h4>
      ${logRows ? `<div style="overflow-x:auto"><table><thead><tr>
        <th>تاریخ</th><th>نوع کار</th><th>نتیجه</th><th>مجری</th><th>هزینه (ریال)</th>
        <th>شرح</th><th>اقدام اصلاحی</th>${fasCanManage() ? '<th></th>' : ''}</tr></thead>
        <tbody>${logRows}</tbody></table></div>`
        : `<div style="color:var(--mut)">هنوز سابقه‌ای ثبت نشده است.</div>`}
      ${fasCanManage() ? `<div style="margin-top:10px"><button class="btn btn-o btn-sm" onclick="fasLogForm('')">+ ثبت اجرای موردی (بدون برنامه)</button></div>` : ''}
      <div id="fas_logbox"></div>
    </div></div>`;
}

// ---------- فرم برنامه‌ی دوره‌ای (درجا، زیر جدول) ----------
function fasPlanForm(planId) {
  const p = planId ? (FAS.detail.plans || []).find(x => x.id === planId) : null;
  const v = (f) => p ? (p[f] == null ? '' : p[f]) : '';
  $('fas_planbox').innerHTML = `
  <div style="border:1px solid var(--bd);border-radius:12px;padding:14px;margin-top:12px">
    <b>${p ? 'ویرایش برنامه‌ی دوره‌ای' : 'برنامه‌ی دوره‌ای جدید'}</b>
    <div class="docgrid" style="margin-top:10px">
      <div class="fg"><label>نوع کار</label><select id="fasp_kind">
        ${FAS_KINDS.map(k => `<option value="${esc(k)}" ${v('kind') === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></div>
      <div class="fg"><label>تناوب (ماه) *</label><input id="fasp_iv" type="number" min="1" value="${esc(v('interval_months') || 12)}"></div>
      <div class="fg"><label>عنوان دلخواه</label><input id="fasp_title" value="${esc(v('title'))}"></div>
      <div class="fg"><label>مسئول</label><input id="fasp_resp" value="${esc(v('responsible'))}"></div>
      <div class="fg"><label>پیمانکار / شرکت مجری</label><input id="fasp_vendor" value="${esc(v('vendor'))}"></div>
      <div class="fg"><label>فعال</label><select id="fasp_act">
        <option value="1" ${v('is_active') !== 0 ? 'selected' : ''}>بله</option>
        <option value="0" ${v('is_active') === 0 ? 'selected' : ''}>خیر</option></select></div>
    </div>
    <div class="docdates">
      <div class="fg" style="margin:0"><label>آخرین اجرا</label>${jalaliDateInputHtml('fasp_last')}</div>
      <div class="fg" style="margin:0"><label>سررسید بعدی (خالی = از تناوب حساب شود)</label>${jalaliDateInputHtml('fasp_next')}</div>
    </div>
    <div class="fg" style="margin-top:12px"><label>توضیح</label><textarea id="fasp_note" rows="2">${esc(v('note'))}</textarea></div>
    <button class="btn btn-g btn-sm" onclick="fasPlanSave('${planId || ''}')">ذخیره</button>
    <button class="btn btn-o btn-sm" onclick="document.getElementById('fas_planbox').innerHTML=''">انصراف</button>
  </div>`;
  if (p) { setJalaliDateInput('fasp_last', p.last_done_date); setJalaliDateInput('fasp_next', p.next_due_date); }
}

async function fasPlanSave(planId) {
  const b = {
    kind: $('fasp_kind').value, interval_months: parseInt($('fasp_iv').value, 10) || 12,
    title: $('fasp_title').value.trim(), responsible: $('fasp_resp').value.trim(),
    vendor: $('fasp_vendor').value.trim(), is_active: $('fasp_act').value === '1' ? 1 : 0,
    last_done_date: readJalaliDateInput('fasp_last'), next_due_date: readJalaliDateInput('fasp_next'),
    note: $('fasp_note').value.trim(),
  };
  try {
    if (planId) await API.updateAssetPlan(planId, b);
    else await API.createAssetPlan(FAS.detail.asset.id, b);
    toast('برنامه ذخیره شد');
    fasOpen(FAS.detail.asset.id);
  } catch (e) { toast(e.message, true); }
}

async function fasPlanRemove(planId) {
  if (!await BTN.confirmDanger('این برنامه‌ی دوره‌ای حذف شود؟ سوابقِ ثبت‌شده‌اش هم حذف می‌شوند.')) return;
  try { await API.deleteAssetPlan(planId); toast('برنامه حذف شد'); fasOpen(FAS.detail.asset.id); }
  catch (e) { toast(e.message, true); }
}

// ---------- فرم ثبت اجرا ----------
function fasLogForm(planId) {
  const plans = FAS.detail.plans || [];
  $('fas_logbox').innerHTML = `
  <div style="border:1px solid var(--bd);border-radius:12px;padding:14px;margin-top:12px">
    <b>ثبت اجرا</b>
    <div class="sub" style="margin:4px 0 10px">با ثبت اجرا، سررسید بعدیِ همان برنامه خودکار جلو می‌رود.</div>
    <div class="docgrid">
      <div class="fg"><label>برنامه‌ی دوره‌ای</label><select id="fasl_plan">
        <option value="">— اجرای موردی، بدون برنامه —</option>
        ${plans.map(p => `<option value="${p.id}" ${planId === p.id ? 'selected' : ''}>${esc(p.kind)}${p.title ? ' — ' + esc(p.title) : ''}</option>`).join('')}
      </select></div>
      <div class="fg"><label>نتیجه</label><select id="fasl_res">
        ${Object.keys(FAS_RESULT_FA).map(k => `<option value="${k}">${FAS_RESULT_FA[k]}</option>`).join('')}</select></div>
      <div class="fg"><label>مجری (فرد/شرکت)</label><input id="fasl_by"></div>
      <div class="fg"><label>هزینه (ریال)</label><input id="fasl_cost" type="number" min="0"></div>
    </div>
    <div class="docdates">
      <div class="fg" style="margin:0"><label>تاریخ اجرا *</label>${jalaliDateInputHtml('fasl_date')}</div>
      <div class="fg" style="margin:0"><label>سررسید بعدی (خالی = از تناوب)</label>${jalaliDateInputHtml('fasl_next')}</div>
    </div>
    <div class="fg" style="margin-top:12px"><label>شرح اقدام / نتیجه‌ی آزمون</label><textarea id="fasl_desc" rows="2"></textarea></div>
    <div class="fg"><label>اقدام اصلاحی (در صورت انحراف)</label><textarea id="fasl_ca" rows="2"></textarea></div>
    <button class="btn btn-g btn-sm" onclick="fasLogSave()">ثبت</button>
    <button class="btn btn-o btn-sm" onclick="document.getElementById('fas_logbox').innerHTML=''">انصراف</button>
  </div>`;
}

async function fasLogSave() {
  const b = {
    plan_id: $('fasl_plan').value || null, result: $('fasl_res').value,
    performed_by: $('fasl_by').value.trim(), cost: $('fasl_cost').value || null,
    done_date: readJalaliDateInput('fasl_date'), next_due_date: readJalaliDateInput('fasl_next'),
    description: $('fasl_desc').value.trim(), corrective_action: $('fasl_ca').value.trim(),
  };
  if (!b.done_date) { toast('تاریخ اجرا الزامی است', true); return; }
  // نتیجه‌ی «نیازمند اقدام» یا «مردود» بدون اقدام اصلاحی دقیقاً همان چیزی است که در
  // ممیزی به‌عنوان حلقه‌ی بازِ عدم‌انطباق گرفته می‌شود.
  if (b.result !== 'ok' && !b.corrective_action) { toast('برای نتیجه‌ی غیرمنطبق، ثبت اقدام اصلاحی الزامی است', true); return; }
  try {
    await API.createAssetLog(FAS.detail.asset.id, b);
    toast('سابقه ثبت شد');
    fasOpen(FAS.detail.asset.id);
  } catch (e) { toast(e.message, true); }
}

async function fasLogRemove(logId) {
  if (!await BTN.confirmDanger('این سابقه حذف شود؟')) return;
  try { await API.deleteAssetLog(logId); toast('سابقه حذف شد'); fasOpen(FAS.detail.asset.id); }
  catch (e) { toast(e.message, true); }
}

// ---------- چاپ ----------
function fasPrintDue() {
  const rows = ((FAS.due && FAS.due.plans) || []).map(p => `<tr>
    <td>${esc(p.asset_title)}</td><td>${esc(p.asset_code || '—')}</td><td>${esc(p.category || '—')}</td>
    <td>${esc(p.location || '—')}</td><td>${esc(p.kind)}</td><td>${fa(p.interval_months)} ماه</td>
    <td>${faDateISO(p.last_done_date)}</td><td>${faDateISO(p.next_due_date)}</td>
    <td>${FAS_DUE_FA[p.due_status]}</td></tr>`).join('');
  const body = `<h3 style="text-align:center;margin:0 0 10px">تقویم سررسید نگهداشت دوره‌ای</h3>
    <table style="width:100%"><thead><tr><th>قلم</th><th>کد اموال</th><th>دسته</th><th>محل</th>
    <th>نوع کار</th><th>تناوب</th><th>آخرین اجرا</th><th>سررسید بعدی</th><th>وضعیت</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="9">موردی ثبت نشده است</td></tr>'}</tbody></table>`;
  fasDoPrint(printSheet('تقویم سررسید نگهداشت', body, 'اقلام و نگهداشت دوره‌ای'), true);
}

function fasPrintCard() {
  const d = FAS.detail, a = d.asset;
  const row = (l, v) => `<tr><th style="width:22%">${l}</th><td>${v}</td></tr>`;
  const body = `<h3 style="text-align:center;margin:0 0 10px">شناسنامه‌ی قلم</h3>
    <table style="width:100%">
      ${row('عنوان', esc(a.title))}${row('کد اموال', esc(a.asset_code || '—'))}
      ${row('دسته', esc(a.category))}${row('محل استقرار', esc(a.location || '—'))}
      ${row('سازنده / مدل / سریال', esc([a.manufacturer, a.model, a.serial_no].filter(Boolean).join(' — ') || '—'))}
      ${row('رده‌ی خطر', esc(a.risk_class || '—'))}${row('وضعیت', esc(FAS_STATUS_FA[a.status] || a.status))}
      ${row('خرید / نصب / پایان گارانتی', faDateISO(a.purchase_date) + ' — ' + faDateISO(a.install_date) + ' — ' + faDateISO(a.warranty_end))}
      ${row('مسئول', esc(a.responsible || '—'))}
    </table>
    <h4 style="margin:14px 0 6px">برنامه‌های دوره‌ای</h4>
    <table style="width:100%"><thead><tr><th>نوع کار</th><th>تناوب</th><th>مسئول</th><th>پیمانکار</th>
      <th>آخرین اجرا</th><th>سررسید بعدی</th></tr></thead><tbody>
      ${(d.plans || []).map(p => `<tr><td>${esc(p.kind)}</td><td>${fa(p.interval_months)} ماه</td>
        <td>${esc(p.responsible || '—')}</td><td>${esc(p.vendor || '—')}</td>
        <td>${faDateISO(p.last_done_date)}</td><td>${faDateISO(p.next_due_date)}</td></tr>`).join('')
        || '<tr><td colspan="6">—</td></tr>'}</tbody></table>
    <h4 style="margin:14px 0 6px">سوابق اجرا</h4>
    <table style="width:100%"><thead><tr><th>تاریخ</th><th>نوع کار</th><th>نتیجه</th><th>مجری</th>
      <th>شرح</th><th>اقدام اصلاحی</th></tr></thead><tbody>
      ${(d.logs || []).map(l => `<tr><td>${faDateISO(l.done_date)}</td><td>${esc(l.plan_kind || '—')}</td>
        <td>${FAS_RESULT_FA[l.result] || esc(l.result)}</td><td>${esc(l.performed_by || '—')}</td>
        <td style="text-align:right">${esc(l.description || '—')}</td>
        <td style="text-align:right">${esc(l.corrective_action || '—')}</td></tr>`).join('')
        || '<tr><td colspan="6">—</td></tr>'}</tbody></table>`;
  fasDoPrint(printSheet('شناسنامه‌ی قلم — ' + a.title, body, 'اقلام و نگهداشت دوره‌ای'), false);
}

// برگه در یک ظرفِ اختصاصی زیر body می‌نشیند و بقیه‌ی اپ موقع چاپ پنهان می‌شود —
// همان الگویی که در برگه‌ی شیفت جواب داد و صفحه‌ی دومِ خالی را حذف کرد.
function fasDoPrint(html, landscape) {
  let root = document.getElementById('fasPrintRoot');
  if (!root) { root = document.createElement('div'); root.id = 'fasPrintRoot'; }
  if (root.parentNode !== document.body) document.body.appendChild(root);
  root.className = 'fas-print-root';
  root.innerHTML = html;
  setLandscape(!!landscape);
  document.body.classList.add('fas-printing');
  const cleanup = () => {
    document.body.classList.remove('fas-printing');
    setLandscape(false);
    root.innerHTML = '';
  };
  window.addEventListener('afterprint', cleanup, { once: true });
  window.print();
  setTimeout(cleanup, 3000);
}

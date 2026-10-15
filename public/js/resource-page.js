/* ==========================================================================
 * موتورِ صفحه‌ی داده‌محور — مشترکِ سه ماژولِ دارویی، حوادث و بلایا، کنترل عفونت
 * --------------------------------------------------------------------------
 * این سه ماژول روی هم ۱۷ «منبع» دارند که همه یک شکل‌اند: یک جدول با چند ستون،
 * یک فرم با همان فیلدها، و چاپ. نوشتنِ ۱۷ جدول و فرمِ دستی یعنی ۱۷ جای مستقل
 * برای واگرایی — اولین باری که ستونی اضافه شود، شانزده‌تای دیگر عقب می‌مانند.
 * پس یک موتور نوشته شد و هر ماژول فقط «توصیفِ» منابعش را می‌دهد.
 *
 * یک ماژول این شکلی توصیف می‌شود:
 *   RPG.define({
 *     key: 'pharmacy',              // پیشوندِ API و کلیدِ صفحه
 *     title: '…', icon: '💊',
 *     perms: ['view_x','manage_x'],
 *     tabs: [['dash','داشبورد'], ['formulary','فرمولاری'], …],
 *     spec: { formulary: {…}, … },  // همان شکلِ فیلدها که سرور هم دارد
 *     dashboard: (d) => htmlString,  // اختیاری
 *     custom: { fridges: () => {…} } // تب‌هایی که نمای اختصاصی دارند
 *   })
 * و بعد renderX = () => RPG.render('pharmacy').
 * ========================================================================== */

const RPG = {
  mods: {},
  st: {},   // وضعیتِ هر ماژول: { tab, items, dash, editId, formOpen }

  define(mod) {
    this.mods[mod.key] = mod;
    this.st[mod.key] = { tab: mod.tabs[0][0], items: [], dash: null, editId: null, formOpen: false };
    return mod;
  },

  canView(key) {
    const p = (S.user && S.user.permissions) || [];
    const m = this.mods[key];
    return p.includes(m.perms[0]) || p.includes(m.perms[1]);
  },
  canManage(key) { return ((S.user && S.user.permissions) || []).includes(this.mods[key].perms[1]); },

  async render(key) {
    const m = this.mods[key], st = this.st[key];
    if (!this.canView(key)) {
      $('content').innerHTML = `<div class="panel g"><div class="pbody">برای دیدن این بخش دسترسی ندارید.</div></div>`;
      return;
    }
    $('ptitle').textContent = m.title;
    try {
      if (st.tab === 'dash') {
        st.dash = await API.get('/' + key + '-dashboard');
        this.shell(key, m.title, m.sub, m.icon, m.dashboard(st.dash, key));
      } else if (m.custom && m.custom[st.tab]) {
        await m.custom[st.tab]();
      } else {
        st.items = (await API.get('/' + key + '/' + st.tab)).items || [];
        this.drawList(key);
      }
    } catch (e) { toast(e.message, true); }
  },

  go(key, tab) {
    const st = this.st[key];
    st.tab = tab; st.editId = null; st.formOpen = false;
    if (this.mods[key].onGo) this.mods[key].onGo(tab);
    this.render(key);
  },

  tabsHtml(key) {
    const st = this.st[key];
    return `<div style="display:flex;gap:6px;flex-wrap:wrap">${this.mods[key].tabs.map(([k, l]) =>
      `<button class="btn ${st.tab === k ? 'btn-g' : 'btn-o'} btn-sm" onclick="RPG.go('${key}','${k}')">${l}</button>`).join('')}</div>`;
  },

  // پوسته‌ی مشترکِ همه‌ی نماها: سربرگ + تب‌ها + بدنه
  shell(key, title, sub, icon, bodyHtml, extraBtns) {
    $('content').innerHTML = `
    <div class="panel g"><div class="phd"><div class="abadge">${icon}</div>
      <div style="flex:1"><h3>${title}</h3><div class="sub">${sub || ''}</div></div>
      ${extraBtns || ''}${this.tabsHtml(key)}</div>
      <div class="pbody">${bodyHtml}</div></div>`;
  },

  // ---------- نمایشِ یک سلول ----------
  cell(key, f, r) {
    const m = this.mods[key], v = r[f.k];
    if (f.render) return f.render(r);
    if (f.t === 'bool') return v ? '✔' : '—';
    if (f.t === 'date') return faDateISO(v);
    if (f.chip) return this.chip(v, (m.fa || {})[f.fa]);
    if (f.fa) return esc(((m.fa || {})[f.fa] || {})[v] || v || '—');
    if (v === null || v === undefined || v === '') return '—';
    return f.t === 'num' ? fa(v) : esc(String(v));
  },

  CLR: { open: '#c02626', announced: '#c02626', pending: '#9a6b00', active: '#c02626', planned: '#9a6b00',
    analyzed: '#17576e', notified: '#9a6b00', collected: '#9a6b00', in_progress: '#9a6b00',
    investigated: '#9a6b00', quarantined: '#9a6b00', recalled: '#c02626', fail: '#c02626',
    closed: '#17576e', resolved: '#17576e', approved: '#17576e', rejected: '#6b7280',
    done: '#17576e', pass: '#17576e', released: '#17576e', controlled: '#9a6b00', used: '#6b7280' },
  chip(v, map) {
    return `<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:12px;font-weight:700;
      color:#fff;background:${this.CLR[v] || '#6b7280'}">${(map && map[v]) || v || '—'}</span>`;
  },

  // ---------- جدول ----------
  drawList(key) {
    const m = this.mods[key], st = this.st[key], sp = m.spec[st.tab];
    const cols = sp.fields.filter(f => f.list);
    const manage = this.canManage(key);
    const rows = st.items.map(r => `<tr>
      ${cols.map(f => `<td data-l="${esc(f.l.replace(' *', ''))}">${this.cell(key, f, r)}</td>`).join('')}
      ${sp.extraCol ? `<td data-l="${esc(sp.extraCol.l || '')}">${sp.extraCol.render(r)}</td>` : ''}
      ${manage ? `<td style="white-space:nowrap">
        <button class="btn btn-o btn-sm" onclick="RPG.edit('${key}','${r.id}')">ویرایش</button>
        <button class="btn btn-o btn-sm" onclick="RPG.remove('${key}','${r.id}')">حذف</button></td>` : ''}
    </tr>`).join('');
    const body = `
      ${manage ? `<div style="margin-bottom:12px">
        <button class="btn btn-g btn-sm" onclick="RPG.edit('${key}','')">+ ثبت جدید</button>
        <button class="btn btn-o btn-sm" onclick="RPG.print('${key}')">🖨 چاپ فهرست</button></div>` : ''}
      <div id="rpg_form"></div>
      ${rows ? `<div style="overflow-x:auto"><table class="rpg-t"><thead><tr>
        ${cols.map(f => `<th>${esc(f.l.replace(' *', ''))}</th>`).join('')}
        ${sp.extraCol ? `<th>${sp.extraCol.l}</th>` : ''}
        ${manage ? '<th></th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>`
        : `<div class="rpg-empty" style="text-align:center;padding:36px 20px;color:var(--mut)">
          <div style="font-size:14px;margin-bottom:6px">هنوز موردی ثبت نشده است.</div>
          ${manage ? `<button class="btn btn-g btn-sm" onclick="RPG.edit('${key}','')">+ ثبت اولین مورد</button>` : ''}
        </div>`}`;
    this.shell(key, sp.title, sp.sub, sp.icon || m.icon, body);
    if (st.formOpen) this.drawForm(key);
  },

  // ---------- فرم ----------
  fieldHtml(key, f, r) {
    const m = this.mods[key], id = 'rpgf_' + f.k;
    const v = r ? r[f.k] : (f.def !== undefined ? f.def : '');
    const hintBadge = f.hint ? `<span class="rpg-fhint-ic" title="${esc(f.hint)}" style="cursor:help;margin-inline-start:5px;font-size:12px;opacity:.85">ℹ️</span>` : '';
    const hintSub = f.hint ? `<div class="rpg-fhint-txt" style="font-size:11px;color:var(--mut);margin-top:3px;line-height:1.4">${esc(f.hint)}</div>` : '';

    if (f.t === 'bool') {
      const isOutbreak = f.k === 'is_outbreak';
      return `<div class="fg"><label>${esc(f.l)}${hintBadge}</label>
        <select id="${id}" ${isOutbreak ? `onchange="const a=$('rpg_outbreak_alert');if(a)a.style.display=this.value==='1'?'block':'none'"` : ''}>
          <option value="1" ${v ? 'selected' : ''}>بله</option>
          <option value="0" ${v ? '' : 'selected'}>خیر</option>
        </select>${hintSub}</div>`;
    }
    if (f.t === 'date') return `<div class="fg fg-date"><label>${esc(f.l)}${hintBadge}</label>${jalaliDateInputHtml(id, { value: (v == null ? '' : String(v)) })}${hintSub}</div>`;
    if (f.t === 'select') {
      // گزینه‌ها یا ثابت‌اند یا از روی داده‌ی زنده ساخته می‌شوند (مثل «کدام دستگاه»)
      const opts = typeof f.opts === 'function' ? f.opts() : f.opts.map(o => [o, o]);
      return `<div class="fg"><label>${esc(f.l)}${hintBadge}</label><select id="${id}">
        ${opts.map(([val, lbl]) => `<option value="${esc(val)}" ${String(v || '') === String(val) ? 'selected' : ''}>${
          esc(val === '' ? '—' : (((m.fa || {})[f.fa] || {})[val] || lbl))}</option>`).join('')}</select>${hintSub}</div>`;
    }
    if (f.t === 'area') return `<div class="fg" style="grid-column:1/-1"><label>${esc(f.l)}${hintBadge}</label>
      <textarea id="${id}" rows="2" style="width:100%;box-sizing:border-box;min-height:54px">${esc(v == null ? '' : v)}</textarea>${hintSub}</div>`;
    // B-5: ورودی موبایل/کدملی با ارقام لاتین، چپ‌چین و طول محدود + سقف نمره‌ها.
    // چرا این‌جا (موتور مشترک): ۱۴ ماژول RPG از همین تابع فرم می‌سازند؛ اگر فقط در
    // crm.js درست شود، بقیه ماژول‌ها (ایمنی، آموزش، ...) همان باگ Number("۱۲۳")=NaN
    // و اسکرول اعداد را نگه می‌دارند. کلیدهای phone/national به‌صورت خودکار ltr می‌شوند.
    const _k = String(f.k || '');
    const _isPhone = /phone|mobile|tel/.test(_k);
    const _isNid = /national|nid|melli|code_melli/.test(_k);
    const _isScore = /score|rate|rating|percent|darsad|nomre|emtiyaz/.test(_k);
    const _dir = (_isPhone || _isNid) ? 'dir="ltr" style="text-align:left;direction:ltr"' : '';
    const _mode = _isPhone ? 'inputmode="tel" autocomplete="tel"' : (_isNid ? 'inputmode="numeric" autocomplete="off"' : (f.inputmode ? `inputmode="${esc(f.inputmode)}"` : ''));
    const _maxlen = f.maxlength ? `maxlength="${Number(f.maxlength)}"` : (_isPhone ? 'maxlength="15"' : (_isNid ? 'maxlength="10"' : ''));
    const _min = (f.min !== undefined) ? `min="${esc(String(f.min))}"` : (_isScore && f.t === 'num' ? 'min="0"' : '');
    const _max = (f.max !== undefined) ? `max="${esc(String(f.max))}"` : (_isScore && f.t === 'num' ? 'max="5"' : '');
    return `<div class="fg"><label>${esc(f.l)}${hintBadge}</label>
      <input id="${id}" ${_dir} ${_mode} ${_maxlen} ${f.t === 'num' ? 'type="number"' : ''} ${f.step ? `step="${f.step}"` : ''} ${_min} ${_max} value="${esc(v == null ? '' : v)}">${hintSub}</div>`;
  },

  edit(key, id) { const st = this.st[key]; st.editId = id || null; st.formOpen = true; this.drawForm(key); },
  openForm(key) { this.edit(key, ''); },

  drawForm(key) {
    const m = this.mods[key], st = this.st[key], sp = m.spec[st.tab];
    const r = st.editId ? st.items.find(x => x.id === st.editId) : null;
    // فیلدهای محاسبه‌شده‌ی سرور (مثل امتیاز خطر و درصد رعایت) در فرم نمی‌آیند —
    // اگر بیایند کاربر فکر می‌کند می‌تواند تغییرشان دهد و سرور بی‌صدا بازنویسی‌شان می‌کند.
    const shown = sp.fields.filter(f => !f.computed);

    let formBody = '';
    if (sp.sections && Array.isArray(sp.sections)) {
      formBody = sp.sections.map(sec => {
        const secFields = shown.filter(f => sec.fields.includes(f.k));
        if (!secFields.length) return '';
        const grid = secFields.filter(f => f.t !== 'area').map(f => this.fieldHtml(key, f, r)).join('');
        const areas = secFields.filter(f => f.t === 'area').map(f => this.fieldHtml(key, f, r)).join('');
        return `
        <div class="rpg-fsec" style="margin-bottom:14px;background:rgba(255,255,255,.03);border:1px solid var(--bd);border-radius:12px;padding:14px 16px">
          <div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:13px;color:var(--th);margin-bottom:12px;padding-bottom:7px;border-bottom:1px solid rgba(255,255,255,.06)">
            <span>${sec.icon || '▫️'}</span><span>${esc(sec.title)}</span>
          </div>
          ${grid ? `<div class="docgrid" style="gap:12px">${grid}</div>` : ''}
          ${areas ? `<div style="margin-top:10px;display:flex;flex-direction:column;gap:10px">${areas}</div>` : ''}
        </div>`;
      }).join('');
      const inSec = new Set(sp.sections.flatMap(s => s.fields));
      const rest = shown.filter(f => !inSec.has(f.k));
      if (rest.length) {
        const grid = rest.filter(f => f.t !== 'area').map(f => this.fieldHtml(key, f, r)).join('');
        const areas = rest.filter(f => f.t === 'area').map(f => this.fieldHtml(key, f, r)).join('');
        formBody += `
        <div class="rpg-fsec" style="margin-bottom:14px;background:rgba(255,255,255,.03);border:1px solid var(--bd);border-radius:12px;padding:14px 16px">
          ${grid ? `<div class="docgrid" style="gap:12px">${grid}</div>` : ''}
          ${areas ? `<div style="margin-top:10px;display:flex;flex-direction:column;gap:10px">${areas}</div>` : ''}
        </div>`;
      }
    } else {
      const grid = shown.filter(f => f.t !== 'area').map(f => this.fieldHtml(key, f, r)).join('');
      const areas = shown.filter(f => f.t === 'area').map(f => this.fieldHtml(key, f, r)).join('');
      formBody = `
        <div class="docgrid" style="margin-top:10px;gap:12px">${grid}</div>
        ${areas ? `<div style="margin-top:10px;display:flex;flex-direction:column;gap:10px">${areas}</div>` : ''}`;
    }

    const hasOutbreak = r ? !!r.is_outbreak : false;
    const outbreakAlert = `
      <div id="rpg_outbreak_alert" style="display:${hasOutbreak ? 'block' : 'none'};background:rgba(224,171,46,.12);border:1px solid var(--gd);border-radius:10px;padding:10px 14px;margin-bottom:14px;color:var(--gdl);font-size:12.5px;line-height:1.8">
        ⚠️ <b>هشدار طغیان (Outbreak Alert):</b> برای این مورد، اقدامات فوری ایزولاسیون و کوهورتینگ را در بخش «اقدامات کنترلی» وارد کنید و اطمینان یابید مورد به سامانه کشوری گزارش شده است.
      </div>`;

    $('rpg_form').innerHTML = `
    <div style="border:1px solid var(--bds);border-radius:14px;padding:16px 18px;margin-bottom:16px;background:rgba(12,25,52,.75);backdrop-filter:blur(10px)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div>
          <b style="font-size:14.5px;color:var(--th)">${r ? 'ویرایش' : 'ثبت جدید'} — ${esc(sp.title)}</b>
          ${sp.formHint ? `<div class="sub" style="margin:4px 0 0;font-size:12px">${sp.formHint}</div>` : ''}
        </div>
        <button class="btn btn-o btn-sm" onclick="RPG.cancel('${key}')" style="padding:4px 10px;font-size:11.5px">✕ انصراف</button>
      </div>
      ${outbreakAlert}
      ${formBody}
      <div style="margin-top:14px;display:flex;gap:10px;align-items:center" class="noprint">
        <button class="btn btn-g btn-sm" onclick="RPG.save('${key}')">💾 ذخیره اطلاعات</button>
        <button class="btn btn-o btn-sm" onclick="window.print()">🖨️ چاپ فرم</button>
        <button class="btn btn-o btn-sm" onclick="RPG.cancel('${key}')">انصراف</button>
      </div>
    </div>`;
    for (const f of shown) if (f.t === 'date' && r) setJalaliDateInput('rpgf_' + f.k, r[f.k]);
  },
  cancel(key) { const st = this.st[key]; st.formOpen = false; st.editId = null; $('rpg_form').innerHTML = ''; },

  async save(key) {
    const m = this.mods[key], st = this.st[key], sp = m.spec[st.tab];
    const b = {};
    for (const f of sp.fields) {
      if (f.computed) continue;
      const id = 'rpgf_' + f.k;
      if (f.t === 'date') { b[f.k] = readJalaliDateInput(id); continue; }
      const el = $(id); if (!el) continue;
      b[f.k] = f.t === 'bool' ? (el.value === '1' ? 1 : 0) : el.value.trim();
    }
    try {
      if (st.editId) await API.put('/' + key + '/' + st.tab + '/' + st.editId, b);
      else await API.post('/' + key + '/' + st.tab, b);
      toast('ذخیره شد');
      st.formOpen = false; st.editId = null;
      this.render(key);
    } catch (e) { toast(e.message, true); }
  },

  async remove(key, id) {
    // حذف با مودال فارسی دومرحله‌ای (BTN همیشه در index.html لود است).
    let ok = false;
    try {
      ok = await window.BTN.confirmDanger({ title: 'حذف مورد', text: 'این مورد حذف شود؟ این عمل قابل بازگشت نیست.', confirmText: 'بله، حذف شود', cancelText: 'انصراف' });
    } catch (e) { ok = false; }
    if (!ok) return;
    const st = this.st[key];
    try { await API.req('/' + key + '/' + st.tab + '/' + id, { method: 'DELETE' }); toast('حذف شد'); this.render(key); }
    catch (e) { toast(e.message, true); }
  },

  print(key) {
    const m = this.mods[key], st = this.st[key], sp = m.spec[st.tab];
    const cols = sp.fields.filter(f => f.list);
    const body = `<h3 style="text-align:center;margin:0 0 4px">${esc(sp.title)}</h3>
      <div style="text-align:center;font-size:12px;margin-bottom:10px">${esc(sp.sub || '')}</div>
      <table style="width:100%"><thead><tr>${cols.map(f => `<th>${esc(f.l.replace(' *', ''))}</th>`).join('')}
        ${sp.extraCol ? `<th>${sp.extraCol.l}</th>` : ''}</tr></thead><tbody>
        ${st.items.map(r => `<tr>${cols.map(f => `<td>${this.cell(key, f, r)}</td>`).join('')}
          ${sp.extraCol ? `<td>${sp.extraCol.render(r)}</td>` : ''}</tr>`).join('')
          || `<tr><td colspan="${cols.length + 1}">موردی ثبت نشده است</td></tr>`}
      </tbody></table>`;
    fasDoPrint(printSheet(sp.title, body, m.title), true);
  },

  // کارتِ شمارنده‌ی داشبورد — هر سه ماژول همین شکل را دارند
  card(key, n, label, clr, tab) {
    return `<div ${tab ? `onclick="RPG.go('${key}','${tab}')" style="cursor:pointer;` : 'style="'}flex:1;min-width:135px;
      border:1px solid var(--bd);border-radius:12px;padding:12px;text-align:center">
      <div style="font-size:26px;font-weight:800;color:${clr}">${n === null || n === undefined ? '—' : fa(n)}</div>
      <div style="font-size:12.5px;color:var(--mut)">${label}</div></div>`;
  },
};

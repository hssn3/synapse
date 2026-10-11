/**
 * «ابلاغیه و دستور» — نسخه‌ی ۲
 * - جدول سمت‌ها با شمار کاربران؛ کلیک = انتخاب (روشن می‌شود)؛ «ابلاغ به همه»
 * - پیوست فرم: مشخص است چه فرمی توسط چه کسی ابلاغ شده
 * - گزارش گیرندگان هر ابلاغیه: سین (خوانده) / جوابیه، با تاریخ شمسی
 */
function renderDirectives(){
  const c = $('content');
  if (!c) return;
  c.innerHTML = '<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';

  API.get('/directives').then(data => {
    const canManage = (S.user?.permissions || []).includes('manage_directives');
    const received = data.received || [];
    const sent = data.sent || [];
    const unread = data.unread || 0;
    const roles = data.roles || [];
    const forms = data.forms || [];
    window.DIR_ROLES = roles;

    const cat = { directive:'دستور', announcement:'ابلاغیه', memo:'یادداشت' };
    const prt = { normal:'عادی', high:'مهم', urgent:'فوری' };
    const formTag = (d) => d.form_title
      ? `<div class="sub">📎 فرم: ${esc(d.form_title)} <span style="color:var(--td)">(ابلاغ‌کننده: ${esc(d.sender_name || '—')})</span></div>` : '';

    const rowsRec = received.map(d => `
      <tr class="${d.is_read ? '' : 'unread-row'}">
        <td>${esc(cat[d.category] || d.category)}
            ${d.priority !== 'normal' ? ` <span class="badge ${d.priority==='urgent'?'bd':'bw'}">${esc(prt[d.priority])}</span>` : ''}</td>
        <td><b>${esc(d.title)}</b>${formTag(d)}${d.deadline ? `<div class="sub">مهلت: ${esc(faDateISO(d.deadline))}</div>` : ''}</td>
        <td>${esc(d.sender_name || '—')}</td>
        <td class="num">${esc(faDateISO(d.created_at))}</td>
        <td>${d.acknowledged_at
              ? '<span class="badge bg">جوابیه ثبت شد</span>'
              : d.is_read ? '<span class="badge bw">خوانده شد</span>' : '<span class="badge bd">جدید</span>'}</td>
        <td>${d.acknowledged_at
              ? (d.ack_note ? `<span class="sub">${esc(d.ack_note)}</span>` : '')
              : `<button class="btn btn-o btn-sm" data-open="${esc(d.id)}">مشاهده و جوابیه</button>`}</td>
      </tr>`).join('');

    const rowsSent = sent.map(d => {
      const size = Number(d.audience_size || 0);
      const acked = Number(d.ack_count || 0);
      const read = Number(d.read_count || 0);
      const pct = size ? Math.round(acked / size * 100) : 0;
      return `<tr class="dir-sent-row" data-sent="${esc(d.id)}" style="cursor:pointer" title="مشاهده‌ی وضعیت گیرندگان">
        <td>${esc(cat[d.category] || d.category)}</td>
        <td><b>${esc(d.title)}</b>${formTag(d)}${d.deadline ? `<div class="sub">مهلت: ${esc(faDateISO(d.deadline))}</div>` : ''}</td>
        <td class="num">👁 ${fa(read)} / ${fa(size)}</td>
        <td class="num">✓ ${fa(acked)} / ${fa(size)}</td>
        <td><div class="ackbar"><span style="width:${pct}%"></span></div><div class="sub num">${fa(pct)}٪</div></td>
        <td class="num">${esc(faDateISO(d.created_at))}</td>
      </tr>`;
    }).join('');

    // جدول سمت‌ها: هر سطر یک سمت با شمار کاربران؛ کلیک کل سطر = تیک
    const roleRows = roles.map(r => {
      const n = Number(r.users || 0);
      const empty = n === 0;
      return `<tr class="dir-role-row${empty ? ' dir-empty' : ''}" data-role="${esc(r.code)}"
          ${empty ? 'title="این سمت هنوز کاربری ندارد"' : ''} style="${empty ? 'opacity:.45' : 'cursor:pointer'}">
        <td style="width:34px;text-align:center"><input type="checkbox" value="${esc(r.code)}" ${empty ? 'disabled' : ''} tabindex="-1"></td>
        <td><b>${esc(r.title_fa || r.code)}</b></td>
        <td class="num">${empty ? 'بدون کاربر' : fa(n) + ' نفر'}</td>
      </tr>`;
    }).join('');

    const formOpts = forms.map(f =>
      `<option value="${esc(f.id)}">${esc(f.title)} <span>(${esc(f.slug)})</span></option>`).join('');

    c.innerHTML = `
    <style>
      .dir-role-row.sel{background:rgba(212,175,90,.14)!important;box-shadow:inset 3px 0 0 var(--gd,#d4af5a)}
      .dir-role-row:not(.dir-empty):hover{background:rgba(212,175,90,.07)}
      .dir-role-row input{pointer-events:none;width:17px;height:17px;accent-color:#d4af5a}
    </style>
    <div class="phd noprint">
      <div style="flex:1"><h3>ابلاغیه و دستور</h3>
        <div class="sub">${canManage ? 'صدور ابلاغیه برای زیرمجموعه‌ها و پیگیری جوابیه' : 'ابلاغیه‌های دریافتی و ثبت جوابیه'}</div></div>
      <button class="btn btn-o btn-sm" onclick="window.print()">${ic('print')} چاپ</button>
      ${canManage ? `<button class="btn btn-g btn-sm" id="dirNewBtn">+ ابلاغیه جدید</button>` : ''}
    </div>

    <div class="pbody">
      ${canManage ? `
      <div class="panel g2" id="dirForm" style="display:none">
        <div class="fg"><label>عنوان <span style="color:var(--dn)">*</span></label>
          <input id="d_title" maxlength="250" placeholder="مثلاً: بازبینی چک‌لیست ایمنی پیش از هر شیفت"></div>
        <div class="fg"><label>متن ابلاغیه</label>
          <textarea id="d_body" rows="4" maxlength="4000" placeholder="شرح کامل، مهلت و انتظار اجرایی…"></textarea></div>
        <div class="fg"><label>نوع</label>
          <select id="d_category"><option value="directive">دستور</option><option value="announcement">ابلاغیه</option><option value="memo">یادداشت</option></select></div>
        <div class="fg"><label>اولویت</label>
          <select id="d_priority"><option value="normal">عادی</option><option value="high">مهم</option><option value="urgent">فوری</option></select></div>
        <div class="fg"><label>پیوست فرم (اختیاری)</label>
          <select id="d_form"><option value="">— بدون فرم —</option>${formOpts}</select>
          <div class="sub">فرم انتخاب‌شده همراه ابلاغیه به گیرندگان نشان داده می‌شود و ثبت می‌ماند چه فرمی توسط چه کسی ابلاغ شده.</div></div>
        <div class="fg"><label>گیرندگان (سمت) — روی هر سطر کلیک کنید</label>
          <label class="chip" style="cursor:pointer;margin-bottom:8px;display:inline-flex">
            <input type="checkbox" id="d_allroles" style="margin-inline-end:5px"> ابلاغ به همه‌ی سمت‌ها</label>
          <div class="tblwrap"><table class="tbl" id="d_roles_tbl">
            <thead><tr><th style="width:34px"></th><th>سمت</th><th>کاربران</th></tr></thead>
            <tbody>${roleRows}</tbody></table></div></div>
        <div class="fg"><label>مهلت اجرا (اختیاری، شمسی)</label>${typeof jalaliDateInputHtml==='function'?jalaliDateInputHtml('d_deadline',{allowEmpty:true}):'<input id="d_deadline_fallback" class="num" style="direction:ltr" placeholder="1405/07/19">'}</div>
        <label class="fg"><input type="checkbox" id="d_ack" checked style="width:auto"> دریافت جوابیه اجباری باشد</label>
        <div style="display:flex;gap:8px">
          <button class="btn btn-g" id="d_submit">ثبت و ارسال</button>
          <button class="btn btn-o" id="d_cancel">انصراف</button>
        </div>
      </div>` : ''}

      <h4 style="margin:4px 0">دریافتی (${fa(received.length)})${unread ? ` — <span style="color:var(--gd)">${fa(unread)} خوانده‌نشده</span>` : ''}</h4>
      ${received.length ? `<div class="tblwrap"><table class="tbl">
        <thead><tr><th>نوع</th><th>عنوان</th><th>فرستنده</th><th>تاریخ</th><th>وضعیت</th><th>اقدام</th></tr></thead>
        <tbody>${rowsRec}</tbody></table></div>` : '<div class="dempty">ابلاغیه‌ای دریافت نکرده‌اید.</div>'}

      ${canManage ? `
      <h4 style="margin:16px 0 4px">صادرشده توسط من (${fa(sent.length)}) — برای دیدن وضعیت گیرندگان روی هر سطر کلیک کنید</h4>
      ${sent.length ? `<div class="tblwrap"><table class="tbl">
        <thead><tr><th>نوع</th><th>عنوان</th><th>سین (خوانده)</th><th>جوابیه</th><th>پیشرفت</th><th>تاریخ</th></tr></thead>
        <tbody>${rowsSent}</tbody></table></div>` : '<div class="dempty">هنوز ابلاغیه‌ای صادر نکرده‌اید.</div>'}` : ''}
    </div>`;

    if (canManage) {
      const box = $('dirForm');
      $('dirNewBtn').onclick = () => { box.style.display = box.style.display === 'none' ? 'block' : 'none'; };
      $('d_cancel').onclick = () => { box.style.display = 'none'; };
      $('d_submit').onclick = submitDirective;
      // کلیک روی سطر = تیک؛ هایلایت با کلاس sel
      c.querySelectorAll('.dir-role-row:not(.dir-empty)').forEach(tr => {
        tr.addEventListener('click', () => {
          const cb = tr.querySelector('input[type=checkbox]');
          cb.checked = !cb.checked;
          tr.classList.toggle('sel', cb.checked);
          syncAllRoles();
        });
      });
      $('d_allroles').addEventListener('change', (e) => {
        const on = e.target.checked;
        c.querySelectorAll('.dir-role-row:not(.dir-empty)').forEach(tr => {
          tr.querySelector('input[type=checkbox]').checked = on;
          tr.classList.toggle('sel', on);
        });
      });
    }
    c.querySelectorAll('[data-open]').forEach(b => { b.onclick = () => openDirective(b.getAttribute('data-open')); });
    c.querySelectorAll('[data-sent]').forEach(tr => { tr.onclick = () => openRecipients(tr.getAttribute('data-sent')); });
  }).catch(e => {
    c.innerHTML = `<div class="panel g"><div class="empty">خطا در دریافت ابلاغیه‌ها: ${esc(e.message)}</div></div>`;
  });
}

function syncAllRoles(){
  const boxes = [...document.querySelectorAll('.dir-role-row:not(.dir-empty) input[type=checkbox]')];
  const all = document.getElementById('d_allroles');
  if (!all || !boxes.length) return;
  const n = boxes.filter(b => b.checked).length;
  all.checked = n === boxes.length && n > 0;
  all.indeterminate = n > 0 && n < boxes.length;
}

// مودال مستقل این صفحه (تابع سراسری modal در پروژه وجود ندارد)
function openDirModal(html){
  closeDirModal();
  const back = document.createElement('div');
  back.id = 'dirModalBack';
  back.style.cssText = 'position:fixed;inset:0;background:rgba(4,10,8,.72);z-index:1200;display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(4px)';
  back.innerHTML = `<div class="panel g" style="max-width:760px;width:100%;max-height:88vh;overflow:auto" role="dialog" aria-modal="true">${html}</div>`;
  back.addEventListener('mousedown', (e) => { if (e.target === back) closeDirModal(); });
  document.body.appendChild(back);
  document.addEventListener('keydown', dirEsc);
}
function dirEsc(e){ if (e.key === 'Escape') closeDirModal(); }
function closeDirModal(){
  document.removeEventListener('keydown', dirEsc);
  document.getElementById('dirModalBack')?.remove();
}

async function submitDirective(){
  const title = $('d_title').value.trim();
  if (title.length < 3) return toast('عنوان ابلاغیه را کامل کنید.', true);
  const roles = [...document.querySelectorAll('.dir-role-row:not(.dir-empty) input[type=checkbox]:checked')].map(i => i.value);
  if (!roles.length) return toast('حداقل یک سمت گیرنده انتخاب کنید.', true);

  try {
    const r = await API.post('/directives', {
      title,
      body: $('d_body').value.trim() || null,
      category: $('d_category').value,
      priority: $('d_priority').value,
      audience: 'roles',
      audience_ref: roles,
      form_id: ($('d_form') && $('d_form').value) || null,
      deadline: (typeof readJalaliDateInputOpt==='function'?readJalaliDateInputOpt('d_deadline'):'') || null,
      requires_ack: $('d_ack').checked ? 1 : 0,
    });
    toast(`ابلاغیه برای ${fa(r.recipients)} گیرنده ارسال شد.`);
    renderDirectives();
  } catch (e) { toast('خطا در ثبت ابلاغیه: ' + e.message, true); }
}

async function openDirective(id){
  const data = await API.get('/directives');
  const item = (data.received || []).find(r => r.id === id);
  if (!item) return;
  openDirModal(`
    <div class="phd"><h3>${esc(item.title)}</h3>
      <div class="sub">${esc(item.sender_name || '')} · ${esc(faDateISO(item.created_at))}${item.deadline ? ' · مهلت: ' + esc(faDateISO(item.deadline)) : ''}</div>
      ${item.form_title ? `<div class="sub">📎 فرم پیوست: ${esc(item.form_title)}</div>` : ''}</div>
    <div class="pbody" style="white-space:pre-wrap;line-height:1.9">${esc(item.body || '—')}</div>
    <div class="pbody noprint" style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-o" onclick="closeDirModal()">بستن</button>
      ${item.acknowledged_at ? '' : `<button class="btn btn-g" id="ackBtn">ثبت دریافت و جوابیه</button>`}
    </div>`);
  if (!item.acknowledged_at) {
    await API.post(`/directives/${id}/read`, {}).catch(() => {});
    $('ackBtn').onclick = async () => {
      try {
        await API.post(`/directives/${id}/ack`, { note: 'متوجه شدم' });
        toast('جوابیه شما ثبت شد.');
        closeDirModal();
        renderDirectives();
      } catch (e) { toast('خطا در ثبت جوابیه: ' + e.message, true); }
    };
  }
}

// گزارش گیرندگان یک ابلاغیه: چه کسی سین کرده (خوانده + ساعت شمسی) و چه کسی جوابیه داده
async function openRecipients(id){
  let data;
  try {
    data = await API.get(`/directives/${id}/recipients`);
  } catch (e) { toast('خطا در دریافت وضعیت گیرندگان: ' + e.message, true); return; }
  const rows = (data.recipients || []).map(r => `
    <tr>
      <td><b>${esc(r.full_name)}</b><div class="sub">${esc(r.role_title || '')} · ${esc(r.username || '')}</div></td>
      <td>${r.read_at
        ? `<span class="badge bg">👁 سین ${esc(faDateTime(r.read_at))}</span>`
        : '<span class="badge bd">خوانده نشده</span>'}</td>
      <td>${r.acknowledged_at
        ? `<span class="badge bg">✓ ${esc(faDateTime(r.acknowledged_at))}</span>${r.ack_note ? `<div class="sub">${esc(r.ack_note)}</div>` : ''}`
        : '<span class="sub">—</span>'}</td>
    </tr>`).join('');
  openDirModal(`
    <div class="phd"><h3>وضعیت گیرندگان: ${esc(data.directive.title)}</h3>
      <div class="sub">👁 ${fa(data.read)} از ${fa(data.total)} سین · ✓ ${fa(data.acked)} جوابیه</div></div>
    <div class="tblwrap"><table class="tbl">
      <thead><tr><th>گیرنده</th><th>سین (خوانده)</th><th>جوابیه</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="3"><div class="dempty">گیرنده‌ای ثبت نشده</div></td></tr>'}</tbody>
    </table></div>
    <div class="pbody noprint" style="display:flex;justify-content:flex-end">
      <button class="btn btn-o" onclick="closeDirModal()">بستن</button>
    </div>`);
}

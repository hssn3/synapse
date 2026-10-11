/**
 * «ابلاغیه و دستور» — مدیر برای زیرمجموعه‌ها ابلاغ می‌کند و جوابیه می‌گیرد.
 * چرا جدا از notifications/tasks:
 *   notifications اعلانِ یک‌طرفه بدون مخاطب است؛ tasks وظیفه با وضعیت است.
 *   اینجا دو چیز تازه لازم است: مخاطبانِ سمت‌محور و رسید دریافت/جوابیه.
 * فارسی‌پسند: از varهای موجود پروژه، کلاس‌های btn/panel/tbl، و fa() برای اعداد.
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

    const cat = { directive:'دستور', announcement:'ابلاغیه', memo:'یادداشت' };
    const prt = { normal:'عادی', high:'مهم', urgent:'فوری' };

    const rowsRec = received.map(d => `
      <tr class="${d.is_read ? '' : 'unread-row'}">
        <td>${esc(cat[d.category] || d.category)}
            ${d.priority !== 'normal' ? ` <span class="badge ${d.priority==='urgent'?'bd':'bw'}">${esc(prt[d.priority])}</span>` : ''}</td>
        <td><b>${esc(d.title)}</b>${d.deadline ? `<div class="sub">مهلت: ${esc(faDateISO(d.deadline))}</div>` : ''}</td>
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
      const pct = size ? Math.round(acked / size * 100) : 0;
      return `<tr>
        <td>${esc(cat[d.category] || d.category)}</td>
        <td><b>${esc(d.title)}</b>${d.body ? `<div class="sub">${esc(String(d.body).slice(0,70))}</div>` : ''}${d.deadline ? `<div class="sub">مهلت: ${esc(faDateISO(d.deadline))}</div>` : ''}</td>
        <td class="num">${fa(acked)} / ${fa(size)}</td>
        <td><div class="ackbar"><span style="width:${pct}%"></span></div><div class="sub num">${fa(pct)}٪</div></td>
        <td class="num">${esc(faDateISO(d.created_at))}</td>
      </tr>`;
    }).join('');

    c.innerHTML = `
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
        <div class="fg"><label>گیرندگان (سمت)</label>
          <div id="d_roles" class="rolepick">
            ${(data.roles||[]).map(r => `<label class="chip"><input type="checkbox" value="${esc(r.code)}"> ${esc(r.title_fa || r.code)}</label>`).join('')}
          </div></div>
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
      <h4 style="margin:16px 0 4px">صادرشده توسط من (${fa(sent.length)})</h4>
      ${sent.length ? `<div class="tblwrap"><table class="tbl">
        <thead><tr><th>نوع</th><th>عنوان</th><th>جوابیه</th><th>پیشرفت</th><th>تاریخ</th></tr></thead>
        <tbody>${rowsSent}</tbody></table></div>` : '<div class="dempty">هنوز ابلاغیه‌ای صادر نکرده‌اید.</div>'}` : ''}
    </div>`;

    if (canManage) {
      const box = $('dirForm');
      $('dirNewBtn').onclick = () => { box.style.display = box.style.display === 'none' ? 'block' : 'none'; };
      $('d_cancel').onclick = () => { box.style.display = 'none'; };
      $('d_submit').onclick = submitDirective;
    }
    c.querySelectorAll('[data-open]').forEach(b => { b.onclick = () => openDirective(b.getAttribute('data-open')); });
  }).catch(e => {
    c.innerHTML = `<div class="panel g"><div class="empty">خطا در دریافت ابلاغیه‌ها: ${esc(e.message)}</div></div>`;
  });
}

async function submitDirective(){
  const title = $('d_title').value.trim();
  if (title.length < 3) return toast('عنوان ابلاغیه را کامل کنید.', true);
  const roles = [...document.querySelectorAll('#d_roles input:checked')].map(i => i.value);
  if (!roles.length) return toast('حداقل یک سمت گیرنده انتخاب کنید.', true);

  try {
    const r = await API.post('/directives', {
      title,
      body: $('d_body').value.trim() || null,
      category: $('d_category').value,
      priority: $('d_priority').value,
      audience: 'roles',
      audience_ref: roles,
      // مهلت شمسی از سلکت‌ها خوانده و به میلادی استاندارد (ISO) برای ذخیره برمی‌گردد؛
      // قرارداد پروژه: نمایش شمسی، ذخیره میلادی (مثل همه‌ی مهلت‌های دیگر).
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
  modal(`
    <div class="phd"><h3>${esc(item.title)}</h3>
      <div class="sub">${esc(item.sender_name || '')} · ${esc(faDateISO(item.created_at))}${item.deadline ? ' · مهلت: ' + esc(faDateISO(item.deadline)) : ''}</div></div>
    <div class="pbody" style="white-space:pre-wrap;line-height:1.9">${esc(item.body || '—')}</div>
    <div class="pbody noprint" style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-o" onclick="closeModal()">بستن</button>
      ${item.acknowledged_at ? '' : `<button class="btn btn-g" id="ackBtn">ثبت دریافت و جوابیه</button>`}
    </div>`);
  if (!item.acknowledged_at) {
    await API.post(`/directives/${id}/read`, {}).catch(() => {});
    $('ackBtn').onclick = async () => {
      try {
        await API.post(`/directives/${id}/ack`, { note: 'متوجه شدم' });
        toast('جوابیه شما ثبت شد.');
        closeModal();
        renderDirectives();
      } catch (e) { toast('خطا در ثبت جوابیه: ' + e.message, true); }
    };
  }
}

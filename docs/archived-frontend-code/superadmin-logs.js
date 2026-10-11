/**
 * Superadmin Error & Activity Logs
 * Modular Frontend Component — Project 313
 */
// ==================== سوپرادمین: لاگ خطاهای سرور ====================
async function renderSuperErrorsTab(){
  const box=$('superTabContent');
  box.innerHTML=`<div class="panel g"><div class="phd"><div class="abadge">⚠</div>
    <div><h3>لاگ خطاهای سرور</h3><div class="sub">خطاهایی که در پاسخ به کاربر فقط «خطای سرور» نشان داده شد؛ جزئیات واقعی اینجاست.</div></div></div>
    <div class="pbody">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
        <div class="fg fg-date"><label>از تاریخ</label>${jalaliDateInputHtml('errFrom',{allowEmpty:true})}</div>
        <div class="fg fg-date"><label>تا تاریخ</label>${jalaliDateInputHtml('errTo',{allowEmpty:true})}</div>
        <div class="fg"><label>بیمارستان</label><select id="errHospital"><option value="">همه</option></select></div>
        <div style="align-self:flex-end"><button class="btn btn-g btn-sm" onclick="loadSuperErrors()">اعمال فیلتر</button></div>
      </div>
      <div id="errList"><div class="empty">در حال بارگذاری…</div></div>
    </div></div>`;
  await superFillHospitalSelect('errHospital');
  loadSuperErrors();
}
async function loadSuperErrors(){
  const params={};
  const f=readJalaliDateInputOpt('errFrom'), t=readJalaliDateInputOpt('errTo'), h=$('errHospital').value;
  if(f) params.from=f; if(t) params.to=t; if(h) params.hospital_id=h;
  $('errList').innerHTML='<div class="empty">در حال بارگذاری…</div>';
  try{
    const {errors}=await API.superErrorLog(params);
    if(!errors.length){ $('errList').innerHTML='<div class="empty">خطایی در این بازه ثبت نشده است</div>'; return; }
    $('errList').innerHTML=`<div class="tbl-wrap" style="max-height:520px;overflow:auto"><table>
      <thead><tr><th>زمان</th><th>روش/مسیر</th><th>کد</th><th>بیمارستان</th><th>کاربر</th><th>پیام</th><th></th></tr></thead>
      <tbody>${errors.map((e,i)=>`<tr>
        <td style="font-size:11px;direction:ltr;text-align:right">${esc(e.created_at||'—')}</td>
        <td style="font-size:11px;direction:ltr;text-align:right">${esc(e.method||'')} ${esc(e.route||'')}</td>
        <td><span class="bdg b3">${fa(e.status_code||'')}</span></td>
        <td>${esc(e.hospital_name||'—')}</td>
        <td>${esc(e.user_name||'—')}</td>
        <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.message||'')}</td>
        <td><a href="javascript:void(0)" onclick="toggleErrStack(${i})" style="color:var(--gdl)">جزئیات</a></td>
      </tr><tr id="errstk_${i}" style="display:none"><td colspan="7"><pre style="white-space:pre-wrap;font-size:11px;direction:ltr;text-align:left;background:var(--subpanel-2);padding:10px;border-radius:8px;max-height:220px;overflow:auto">${esc(e.stack||'—')}</pre></td></tr>`).join('')}</tbody>
    </table></div>`;
  }catch(e){ $('errList').innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}
function toggleErrStack(i){ const r=$('errstk_'+i); if(r) r.style.display=r.style.display==='none'?'':'none'; }

// ==================== سوپرادمین: لاگ فعالیت کراس‌بیمارستان ====================
async function renderSuperActivityTab(){
  const box=$('superTabContent');
  box.innerHTML=`<div class="panel g"><div class="phd"><div class="abadge">▤</div>
    <div><h3>لاگ فعالیت کاربران — همه‌ی بیمارستان‌ها</h3>
    <div class="sub">از audit_log موجود (ورود موفق/ناموفق و همه‌ی عملیات ثبت‌شده در هر بیمارستان)؛ چیز جدیدی ردیابی نمی‌شود، فقط اینجا کنار هم دیده می‌شود.</div></div></div>
    <div class="pbody">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
        <div class="fg fg-date"><label>از تاریخ</label>${jalaliDateInputHtml('actFrom',{allowEmpty:true})}</div>
        <div class="fg fg-date"><label>تا تاریخ</label>${jalaliDateInputHtml('actTo',{allowEmpty:true})}</div>
        <div class="fg"><label>بیمارستان</label><select id="actHospital"><option value="">همه</option></select></div>
        <div style="align-self:flex-end"><button class="btn btn-g btn-sm" onclick="loadSuperActivity()">اعمال فیلتر</button></div>
      </div>
      <div id="actList"><div class="empty">در حال بارگذاری…</div></div>
    </div></div>`;
  await superFillHospitalSelect('actHospital');
  loadSuperActivity();
}
async function loadSuperActivity(){
  const params={};
  const f=readJalaliDateInputOpt('actFrom'), t=readJalaliDateInputOpt('actTo'), h=$('actHospital').value;
  if(f) params.from=f; if(t) params.to=t; if(h) params.hospital_id=h;
  $('actList').innerHTML='<div class="empty">در حال بارگذاری…</div>';
  try{
    const {activity}=await API.superActivityLog(params);
    if(!activity.length){ $('actList').innerHTML='<div class="empty">رویدادی ثبت نشده است</div>'; return; }
    $('actList').innerHTML=`<div class="tbl-wrap" style="max-height:520px;overflow:auto"><table>
      <thead><tr><th>زمان</th><th>بیمارستان</th><th>کاربر</th><th>نقش</th><th>عملیات</th><th>موضوع</th></tr></thead>
      <tbody>${activity.map(a=>{
        const isLogin=(a.action||'').startsWith('user_login');
        const failed=a.action==='user_login_failed';
        return `<tr>
          <td style="font-size:11px;direction:ltr;text-align:right">${esc(a.created_at||'—')}</td>
          <td>${esc(a.hospital_name||'—')}</td>
          <td>${esc(a.actor_name||a.actor_username||'—')}</td>
          <td style="font-size:11px;color:var(--td)">${esc(a.actor_role||'—')}</td>
          <td>${isLogin?`<span class="bdg ${failed?'b3':'b1'}">${failed?'ورود ناموفق':'ورود موفق'}</span>`:esc(a.action)}</td>
          <td style="font-size:11px;color:var(--td)">${esc(a.target_table||'—')}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  }catch(e){ $('actList').innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}

// گزینه‌های select بیمارستان — مشترک بین چند تب
async function superFillHospitalSelect(selectId){
  try{
    const {hospitals}=await API.superHospitals();
    const sel=$(selectId); if(!sel) return;
    hospitals.forEach(h=>{ const o=document.createElement('option'); o.value=h.id; o.textContent=h.name; sel.appendChild(o); });
  }catch(e){ /* غیرمهم */ }
}

// ==================== سوپرادمین: مدیریت کاربران («کنترل کامل») ====================
async function renderSuperUsersTab(){
  const box=$('superTabContent');
  box.innerHTML=`<div class="panel g"><div class="phd"><div class="abadge">✦</div>
    <div><h3>مدیریت کاربران هر بیمارستان</h3>
    <div class="sub">بازنشانی رمز عبور، فعال/غیرفعال‌سازی، و تغییر نقش هر کاربر — بدون نیاز به دسترسی ادمین محلی همان بیمارستان.</div></div></div>
    <div class="pbody">
      <div class="fg" style="max-width:360px"><label>بیمارستان</label><select id="umHospital" onchange="loadSuperUserMgmt()"><option value="">— انتخاب کنید —</option></select></div>
      <div id="umList" style="margin-top:14px"></div>
    </div></div>`;
  await superFillHospitalSelect('umHospital');
}
async function loadSuperUserMgmt(){
  const hid=$('umHospital').value;
  const list=$('umList');
  if(!hid){ list.innerHTML=''; return; }
  list.innerHTML='<div class="empty">در حال بارگذاری…</div>';
  try{
    const {users,roles}=await API.superHospitalUsers(hid);
    if(!users.length){ list.innerHTML='<div class="empty">این بیمارستان هنوز کاربری ندارد</div>'; return; }
    list.innerHTML=`<div class="tbl-wrap"><table>
      <thead><tr><th>نام</th><th>نام کاربری</th><th>نقش</th><th>وضعیت</th><th>آخرین ورود</th><th>عملیات</th></tr></thead>
      <tbody>${users.map(u=>`<tr id="umrow_${u.id}">
        <td style="color:var(--th)">${esc(u.full_name)}</td>
        <td style="direction:ltr;text-align:right">${esc(u.username)}</td>
        <td><select onchange="superChangeUserRole('${u.id}',this.value)">${roles.map(r=>`<option value="${r.id}" ${r.id===u.role_id?'selected':''}>${esc(r.title_fa)}</option>`).join('')}</select></td>
        <td>${u.is_active?'<span class="bdg b1">فعال</span>':'<span class="bdg b3">غیرفعال</span>'}</td>
        <td style="font-size:11px;direction:ltr;text-align:right">${esc(u.last_login_at||'—')}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-o btn-sm" onclick="superToggleUserStatus('${u.id}',${u.is_active?0:1})">${u.is_active?'غیرفعال کردن':'فعال کردن'}</button>
          <button class="btn btn-o btn-sm" onclick="superResetPwForm('${u.id}')">بازنشانی رمز</button>
        </td></tr>
        <tr id="umpw_${u.id}" style="display:none"><td colspan="6">
          <div style="display:flex;gap:8px;align-items:center">
            <input id="umpwval_${u.id}" type="text" placeholder="رمز جدید (حداقل ۸ کاراکتر)" style="direction:ltr">
            <button class="btn btn-g btn-sm" onclick="superDoResetPw('${u.id}')">ثبت رمز جدید</button>
            <button class="btn btn-o btn-sm" onclick="document.getElementById('umpw_${u.id}').style.display='none'">انصراف</button>
          </div>
        </td></tr>`).join('')}</tbody>
    </table></div>`;
  }catch(e){ list.innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}
function superResetPwForm(uid){
  const row=$('umpw_'+uid); if(row) row.style.display=row.style.display==='none'?'':'none';
}
async function superDoResetPw(uid){
  const v=($('umpwval_'+uid).value||'').trim();
  if(v.length<8){ toast('رمز جدید حداقل ۸ کاراکتر',true); return; }
  try{ await API.superResetUserPassword(uid,v); toast('رمز عبور بازنشانی شد'); $('umpw_'+uid).style.display='none'; }
  catch(e){ toast(e.message,true); }
}
async function superToggleUserStatus(uid,active){
  try{ await API.superSetUserStatus(uid,!!active); toast(active?'کاربر فعال شد':'کاربر غیرفعال شد'); loadSuperUserMgmt(); }
  catch(e){ toast(e.message,true); }
}
async function superChangeUserRole(uid,roleId){
  try{ await API.superSetUserRole(uid,roleId); toast('نقش کاربر تغییر کرد'); }
  catch(e){ toast(e.message,true); loadSuperUserMgmt(); }
}

// ==================== سوپرادمین: راهنمای کامل سامانه ====================

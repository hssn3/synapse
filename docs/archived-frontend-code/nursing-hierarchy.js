/**
 * Clinical Nursing Supervisors Hierarchy
 * Modular Frontend Component — Project 313
 */
// ==================== سلسله‌مراتب پرستاری (زیر کارت «پرستاری» در org_divisions) ====================
// database/seed-nursing-hierarchy.js — سوپروایزرهای بالینی شماره‌دار + پیوند سوپروایزر
// آموزشی/کنترل‌عفونت + بخش‌ها (سرپرستار/جانشین). دو نما: مدیر پرستاری (مدیریت کامل) و
// سوپروایزر بالینی (روستر فقط‌خواندنی).
const canManageNursing = () => (S.user?.permissions||[]).includes('manage_nursing_hierarchy');
const canViewNursing = () => { const p=S.user?.permissions||[]; return p.includes('manage_nursing_hierarchy')||p.includes('view_nursing_hierarchy'); };
const NRS_ICONS=['✚','☤','⚕','♡','◈','⌘','☾','❖','⬡','⬢','◆','●','▲','■','★','☘','⚚','⚛','⌂','⎈'];
let NRS={data:null, colleagues:null, roster:null, newWardIcon:'✚', directorName:null};

// مدیر پرستاری (بالای زیرچارت پرستاری، طبق درخواست کاربر) — همان «رئیس حوزه‌ی پرستاری»ی
// org_divisions (کد nursing) است؛ ردیف تازه‌ای ساخته نمی‌شود، فقط از همان داده خوانده می‌شود
async function nrsLoadDirector(){
  try{ const r=await API.orgDivisions(); const d=(r.divisions||[]).find(x=>x.code==='nursing'); NRS.directorName=d?d.head_name:null; }
  catch(e){ NRS.directorName=null; }
}
async function renderNursing(){
  $('ptitle').textContent='سلسله‌مراتب پرستاری';
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    await nrsLoadDirector();
    if(canManageNursing()){
      if(!NRS.colleagues) NRS.colleagues=(await API.colleagues()).users||[];
      NRS.data=await API.nursingHierarchy();
      drawNursingManage();
    } else {
      NRS.roster=(await API.nursingRoster()).wards||[];
      drawNursingRoster();
    }
    nrsFillLiveShift();
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}
function nrsDirectorBanner(){
  return `<div class="panel g gold" style="margin-bottom:16px">
    <div class="phd"><div class="abadge">✚</div><div><h3>مدیر پرستاری</h3>
      <div class="v" style="font-size:15px;margin-top:4px">${NRS.directorName?esc(NRS.directorName):'بدون مسئول'}</div>
      <div class="sub">از «حوزه‌های اصلی نمودار سازمانی» قابل‌تغییر است</div></div></div>
  </div>`;
}

/* کارتِ «الان سرِ شیفت» — خواسته‌ی صریح مدیر پرستاری: «چک کند چند نفر در سازمان
   در حال شیفت‌دادن هستند». ظرف همگام رندر می‌شود و محتوا بعداً پر می‌شود، تا اگر
   این پرس‌وجو کند یا ۴۰۳ بود، بقیه‌ی صفحه معطل نماند.
   عددِ «ثبت‌نشده» هم‌اندازه‌ی بقیه دیده می‌شود: بدون آن، عددِ «سرِ شیفت» فقط
   می‌گوید چند نفر تیک خورده‌اند، نه چند نفر واقعاً آمده‌اند. */
function nrsLiveShiftSlot(){ return '<div id="nrsLiveShift"></div>'; }
async function nrsFillLiveShift(){
  const box=$('nrsLiveShift'); if(!box) return;
  let d; try{ d=await API.saLive(); }catch(e){ box.innerHTML=''; return; }
  const t=d.totals||{};
  const cell=(label,val,cls,sub)=>`<div class="st g sa-stat ${cls||''}">
    <div class="l">${esc(label)}</div><div class="v">${fa(val||0)}</div>
    ${sub?`<div class="sub">${esc(sub)}</div>`:''}</div>`;
  box.innerHTML=`<div class="panel g gold" style="margin-bottom:16px">
    <div class="phd"><div class="abadge">◉</div><div style="flex:1">
      <h3>الان سرِ شیفت — شیفت ${esc(d.shift_fa)}</h3>
      <div class="sub">${faDateISO(d.date)}${d.supervisors_on_duty&&d.supervisors_on_duty.length
        ? ' · سوپروایزر کشیک: '+d.supervisors_on_duty.map(esc).join('، ') : ''}</div></div>
      <button class="btn btn-o btn-sm" onclick="go('shiftatt')">فهرست کامل</button>
    </div>
    <div class="pbody" style="padding-top:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px">
      ${cell('سرِ شیفت',t.on_duty,'sa-big sa-ok','از '+fa(t.expected||0)+' نفرِ برنامه')}
      ${cell('غایب',t['غایب'],'sa-no')}
      ${cell('ثبت‌نشده',t['ثبت‌نشده'],'sa-unset','بخش هنوز تیک نزده')}
    </div>
    ${!d.wards||!d.wards.length?'':`<div class="pbody" style="padding-top:0">
      <div class="tbl-wrap"><table><thead><tr><th>بخش</th><th>برنامه</th><th>حاضر</th><th>غایب</th><th>ثبت‌نشده</th></tr></thead><tbody>
      ${d.wards.map(w=>`<tr><td>${esc(w.ward)}</td><td>${fa(w.expected)}</td>
        <td class="sa-ok">${fa(w.counts['حاضر']+w.counts['تأخیر']+w.counts['جانشین'])}</td>
        <td class="${w.counts['غایب']?'sa-no':''}">${fa(w.counts['غایب'])}</td>
        <td class="${w.counts['ثبت‌نشده']?'sa-unset':'sa-ok'}">${fa(w.counts['ثبت‌نشده'])}</td></tr>`).join('')}
      </tbody></table></div></div>`}
  </div>`;
}

function nrsUserOpts(selId){
  return `<option value="">— تعیین‌نشده —</option>` +
    (NRS.colleagues||[]).map(u=>`<option value="${u.id}" ${u.id===selId?'selected':''}>${esc(u.full_name)}</option>`).join('');
}

function drawNursingManage(){
  const d=NRS.data||{supervisors:[], linked_supervisors:[], wards:[]};
  $('content').innerHTML=`
  ${nrsDirectorBanner()}
  ${nrsLiveShiftSlot()}
  <div class="panel g" style="margin-bottom:16px">
    <div class="phd"><div class="abadge">✚</div><div><h3>حوزه‌ی پرستاری</h3>
      <div class="sub">میانبرهای مدیر پرستاری</div></div></div>
    <div class="pbody" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
      <div class="st g gold" style="cursor:pointer" onclick="go('dash')">
        <div class="l" style="font-size:14px">◈ اعتباربخشی</div>
        <div class="v" style="font-size:13px;color:var(--td)">ورود به داشبورد اعتباربخشی</div>
      </div>
      <div class="st g" style="cursor:pointer" onclick="go('staffshift')">
        <div class="l" style="font-size:14px">🗓 پرسنل و برنامه‌ی شیفت</div>
        <div class="v" style="font-size:13px;color:var(--td)">چیدن برنامه‌ی ماهانه‌ی M/E/N هر بخش</div>
      </div>
      <div class="st g" style="cursor:pointer" onclick="go('shiftatt')">
        <div class="l" style="font-size:14px">✔ حضور شیفت و گزارش ۲۴ ساعته</div>
        <div class="v" style="font-size:13px;color:var(--td)">سنجه‌ی الف‑۴‑۳‑۱</div>
      </div>
    </div>
  </div>

  <div class="panel g" style="margin-bottom:16px">
    <div class="phd"><div class="abadge">◆</div><div style="flex:1"><h3>سوپروایزرهای بالینی</h3>
      <div class="sub">تعداد و نام‌گذاری با شماست — از صفر شروع می‌شود</div></div>
      <button class="btn btn-g btn-sm" onclick="nrsAddSupervisor()">+ افزودن سوپروایزر</button>
    </div>
    <div class="pbody">
      ${!d.supervisors.length?'<div class="empty"><div class="ei">◆</div>هنوز سوپروایزر بالینی تعریف نشده است</div>':`
      <div class="tbl-wrap"><table><thead><tr><th>عنوان</th><th>کاربر منصوب</th><th>عملیات</th></tr></thead><tbody>
      ${d.supervisors.map(s=>`<tr>
        <td><input value="${esc(s.label)}" style="min-width:160px" onchange="nrsRenameSupervisor('${s.id}',this.value)"></td>
        <td><select style="min-width:180px" onchange="nrsAssignSupervisor('${s.id}',this.value)">${nrsUserOpts(s.user_id)}</select></td>
        <td><button class="tgl dngr" onclick="nrsDeleteSupervisor('${s.id}')">حذف</button></td>
      </tr>`).join('')}
      </tbody></table></div>`}

      <div class="docsl" style="margin-top:16px">سوپروایزر آموزشی و کنترل عفونت</div>
      <div class="sub" style="margin-bottom:8px">این دو نقش از قبل مستقل تعریف شده‌اند؛ اینجا فقط پرچم «گاهی شیفت سوپروایزر بالینی را هم می‌پوشانند» تنظیم می‌شود</div>
      ${!d.linked_supervisors.length?'<div class="empty">کاربر فعالی با این دو نقش یافت نشد</div>':`
      <div class="tbl-wrap"><table><thead><tr><th>نقش</th><th>کاربر</th><th>پوشش شیفت بالینی</th><th>یادداشت</th></tr></thead><tbody>
      ${d.linked_supervisors.map(u=>`<tr>
        <td>${esc(u.role_title)}</td><td>${esc(u.user_name)}</td>
        <td><input type="checkbox" ${u.can_cover_clinical?'checked':''} onchange="nrsSetCrossCover('${u.user_id}',this.checked)"></td>
        <td><input value="${esc(u.note||'')}" placeholder="یادداشت اختیاری" style="min-width:160px" onchange="nrsSetCrossCoverNote('${u.user_id}',this.value)"></td>
      </tr>`).join('')}
      </tbody></table></div>`}
    </div>
  </div>

  <div class="panel g">
    <div class="phd"><div class="abadge">⚕</div><div style="flex:1"><h3>بخش‌ها</h3>
      <div class="sub">هر بخش یک سرپرستار + دو جانشین — نام و آیکون را مدیر پرستاری/مترون تعیین می‌کند</div></div>
      <button class="btn btn-g btn-sm" onclick="nrsAddWardForm()">+ افزودن بخش</button>
    </div>
    <div class="pbody">
      <div id="nrs_ward_form"></div>
      ${!d.wards.length?'<div class="empty"><div class="ei">⚕</div>هنوز بخشی تعریف نشده است</div>':`
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px">
      ${d.wards.map(w=>`<div class="st g">
        <div class="l" style="display:flex;align-items:center;gap:6px;font-size:14px;justify-content:space-between">
          <span><span style="font-size:16px;color:var(--gdl)">${esc(w.icon||'✚')}</span> ${esc(w.title)}</span>
          <button class="tgl dngr" onclick="nrsDeleteWard('${w.id}')">حذف</button>
        </div>
        <div style="margin-top:6px;font-size:12.5px;line-height:2">
          <div>سرپرستار: <b style="color:var(--gdl)">${w.head_nurse_name?esc(w.head_nurse_name):'تعیین‌نشده'}</b></div>
          <div>جانشین ۱: <b>${w.deputy1_name?esc(w.deputy1_name):'تعیین‌نشده'}</b></div>
          <div>جانشین ۲: <b>${w.deputy2_name?esc(w.deputy2_name):'تعیین‌نشده'}</b></div>
        </div>
        <div style="margin-top:8px;font-size:12px">
          <div class="fg" style="margin:0 0 6px 0"><label style="font-size:11px">سرپرستار ${help('ward_head')}</label>
            <select onchange="nrsSetWardRole('${w.id}','head_nurse_id',this.value)">${nrsUserOpts(w.head_nurse_id)}</select></div>
          <div class="fg" style="margin:0 0 6px 0"><label style="font-size:11px">جانشین ۱ ${help('ward_dep1')}</label>
            <select onchange="nrsSetWardRole('${w.id}','deputy1_id',this.value)">${nrsUserOpts(w.deputy1_id)}</select></div>
          <div class="fg" style="margin:0"><label style="font-size:11px">جانشین ۲ ${help('ward_dep2')}</label>
            <select onchange="nrsSetWardRole('${w.id}','deputy2_id',this.value)">${nrsUserOpts(w.deputy2_id)}</select></div>
        </div>
      </div>`).join('')}
      </div>`}
    </div>
  </div>`;
}

async function nrsAddSupervisor(){
  const label=await BTN.prompt('عنوان سوپروایزر (مثلاً «سوپروایزر بالینی ۱»)'); if(!label) return;
  try{ await API.addNursingSupervisor(label.trim()); toast('افزوده شد'); renderNursing(); }
  catch(e){ toast(e.message,true); }
}
async function nrsRenameSupervisor(id,label){
  try{ await API.updateNursingSupervisor(id,{label}); toast('ذخیره شد'); }
  catch(e){ toast(e.message,true); renderNursing(); }
}
async function nrsAssignSupervisor(id,userId){
  try{ await API.updateNursingSupervisor(id,{user_id:userId||null}); toast('ذخیره شد'); }
  catch(e){ toast(e.message,true); renderNursing(); }
}
async function nrsDeleteSupervisor(id){
  if(!await BTN.confirmDanger('این اسلات سوپروایزر حذف شود؟')) return;
  try{ await API.deleteNursingSupervisor(id); toast('حذف شد'); renderNursing(); }
  catch(e){ toast(e.message,true); }
}
async function nrsSetCrossCover(userId,checked){
  try{ await API.setNursingCrossCover(userId,{can_cover_clinical:checked}); toast('ذخیره شد'); }
  catch(e){ toast(e.message,true); renderNursing(); }
}
async function nrsSetCrossCoverNote(userId,note){
  try{ await API.setNursingCrossCover(userId,{note}); toast('ذخیره شد'); }
  catch(e){ toast(e.message,true); renderNursing(); }
}
function nrsAddWardForm(){
  NRS.newWardIcon='✚';
  $('nrs_ward_form').innerHTML=`<div class="orgform">
    <div class="docsl">افزودن بخش</div>
    <div class="docgrid">
      <div class="fg" style="margin:0"><label>نام بخش *</label><input id="nrs_wtitle" placeholder="مثلاً بخش زنان"></div>
      <div class="fg" style="margin:0"><label>آیکون</label>
        <div id="nrs_icon_pick" style="display:flex;flex-wrap:wrap;gap:4px">
          ${NRS_ICONS.map(i=>`<span onclick="nrsPickIcon('${i}')" style="cursor:pointer;padding:4px 7px;border:1px solid var(--bd);border-radius:6px;${i==='✚'?'border-color:var(--gdl)':''}" data-icon="${i}">${i}</span>`).join('')}
        </div></div>
    </div>
    <div style="margin-top:12px;display:flex;gap:8px">
      <button class="btn btn-g btn-sm" onclick="nrsSaveWard()">ذخیره</button>
      <button class="btn btn-o btn-sm" onclick="$('nrs_ward_form').innerHTML=''">انصراف</button>
    </div></div>`;
}
function nrsPickIcon(i){
  NRS.newWardIcon=i;
  document.querySelectorAll('#nrs_icon_pick span').forEach(s=>{ s.style.borderColor = s.dataset.icon===i?'var(--gdl)':'var(--bd)'; });
}
async function nrsSaveWard(){
  const title=($('nrs_wtitle').value||'').trim();
  if(!title){ toast('نام بخش الزامی است',true); return; }
  try{ await API.addNursingWard({title, icon:NRS.newWardIcon}); toast('بخش افزوده شد'); renderNursing(); }
  catch(e){ toast(e.message,true); }
}
async function nrsSetWardRole(id,field,userId){
  try{ await API.updateNursingWard(id,{[field]:userId||null}); toast('ذخیره شد'); }
  catch(e){ toast(e.message,true); renderNursing(); }
}
async function nrsDeleteWard(id){
  if(!await BTN.confirmDanger('این بخش از سلسله‌مراتب پرستاری حذف شود؟')) return;
  try{ await API.deleteNursingWard(id); toast('حذف شد'); renderNursing(); }
  catch(e){ toast(e.message,true); }
}


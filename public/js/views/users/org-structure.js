/**
 * Hospital Org Structure & Nursing Hierarchy
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
async function indSave(id){
  const v=i=>{ const e=$(i); return e?e.value.trim():''; };
  const c=i=>{ const e=$(i); return e?e.checked:false; };
  const body={
    title:v('ifTitle'), code:v('ifCode'), ward_name:v('ifWard'), category:v('ifWard'),
    definition:v('ifDef'), logical_reasons:v('ifLogic'), basis:v('ifBasis'),
    aspect:v('ifAspect'), indicator_type:v('ifType'), desirability:v('ifDesir'),
    unit:v('ifUnit'), report_type:v('ifReport'), measure_interval:v('ifInterval'),
    delivery_respite:v('ifDelivery'), year:v('ifYear'), source:v('ifSource'),
    upper_limit:v('ifUpper'), lower_limit:v('ifLower'), target_value:v('ifTarget'),
    quality_dimension:Array.from(document.querySelectorAll('.ifQ:checked')).map(e=>e.value),
    safety_related:c('ifSafety'), is_mandatory:c('ifMand'),
    send_to_kartabl:c('ifKartabl'), see_bsc:c('ifBsc'), is_active:true,
  };
  if(!body.title){ toast('عنوان شاخص الزامی است',true); return; }
  try{
    if(id){ await API.updateIndicator(id, body); toast('شناسنامه ذخیره شد'); IND.view='detail'; IND.detail=id; }
    else { const r=await API.createIndicator(body); toast('شاخص ساخته شد'); IND.view='detail'; IND.detail=r.id; }
    renderIndicators();
  }catch(e){ toast(e.message,true); }
}

async function indDeactivate(id){
  if(!await BTN.confirm('این شاخص غیرفعال شود؟\nداده‌های دوره‌ای حذف نمی‌شوند و با فیلتر «همه» دوباره دیده می‌شود.')) return;
  try{ await API.deleteIndicator(id); toast('شاخص غیرفعال شد'); indGo('list'); }
  catch(e){ toast(e.message,true); }
}

// ---- چاپ فهرست ----
function indPrint(){
  const d=IND.data; if(!d) return;
  printListSheet({
    page:'indicators', title:'فهرست شاخص‌های بیمارستان', code:'IND-LIST',
    intro:'شاخص‌های تعریف‌شده‌ی این مرکز به تفکیک بخش، جنبه و دوره‌ی اندازه‌گیری.',
    meta:[['تعداد شاخص', fa(d.total)], ['سال', fa(S.year||'')]],
    headers:['#','عنوان شاخص','بخش','جنبه','نوع','واحد','جهت مطلوب','دوره','هدف','ایمنی'],
    rows:d.indicators.map((k,i)=>[fa((d.page-1)*d.per_page+i+1), k.title, k.ward_name||'—',
      k.aspect||'—', k.indicator_type||'—', k.unit||'—', k.desirability||'—',
      k.measure_interval||'—',
      k.target_value===null||k.target_value===undefined?'—':fa(k.target_value),
      k.safety_related?'بله':'خیر']),
    foot:'منبع: شناسنامه‌ی شاخص‌های ثبت‌شده در سامانه',
  });
}

// ==================== ساختار سازمانی (گروه شغلی / واحد / پست / ساختمان) ====================
// یک صفحه با چهار زبانه. چون هر چهار جدول هم‌شکل‌اند، فرم و جدول از یک توصیف‌گر ساخته می‌شوند
// و چهار بار کد تکراری نوشته نمی‌شود.
const ORG_TABS=[
  {k:'org-units',   key:'org_units',   i:'⌂', t:'واحدها و بخش‌ها',
   cols:[['title','عنوان واحد'],['unit_type','نوع'],['building_id','ساختمان'],['parent_id','واحد بالادست'],['bed_count','تخت']]},
  {k:'job-groups',  key:'job_groups',  i:'⛭', t:'گروه‌های شغلی',
   cols:[['title','عنوان گروه شغلی'],['description','توضیح']]},
  {k:'post-titles', key:'post_titles', i:'✦', t:'پست‌های سازمانی',
   cols:[['title','عنوان پست'],['job_group_id','گروه شغلی'],['is_managerial','مدیریتی']]},
  {k:'buildings',   key:'buildings',   i:'▣', t:'ساختمان‌ها',
   cols:[['title','عنوان ساختمان'],['floors','طبقه'],['description','توضیح']]},
];
const ORG_UNIT_TYPES=['بخش بالینی','بخش ویژه','بخش سرپایی','واحد پاراکلینیک','واحد پشتیبانی','واحد اداری'];

let ORG={data:null, tab:'org-units', canManage:false, editId:null};
const canViewOrg = () => { const p=S.user?.permissions||[]; return p.includes('view_org_structure')||p.includes('manage_org_structure'); };
const orgTab = k => ORG_TABS.find(t=>t.k===k)||ORG_TABS[0];
const orgList = k => (ORG.data?.[orgTab(k).key])||[];
const orgTitleOf = (k,id) => { const r=orgList(k).find(x=>x.id===id); return r?r.title:''; };

async function renderOrg(){
  $('ptitle').textContent='ساختار سازمانی';
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const d=await API.orgStructure(true);
    ORG.data=d; ORG.canManage=!!d.can_manage;
    drawOrg();
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}
function setOrgTab(k){ ORG.tab=k; ORG.editId=null; drawOrg(); }

function orgCellValue(tab,row,col){
  if(col==='building_id')  return esc(orgTitleOf('buildings',row.building_id)||'—');
  if(col==='parent_id')    return esc(orgTitleOf('org-units',row.parent_id)||'—');
  if(col==='job_group_id') return esc(orgTitleOf('job-groups',row.job_group_id)||'—');
  if(col==='is_managerial')return row.is_managerial?'<span class="bdg b1">مدیریتی</span>':'—';
  const v=row[col];
  return v===null||v===undefined||v===''?'—':esc(typeof v==='number'?fa(v):v);
}

function drawOrg(){
  const tab=orgTab(ORG.tab);
  const rows=orgList(ORG.tab);
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">⌸</div>
      <div style="flex:1"><h3>ساختار سازمانی بیمارستان</h3>
      <div class="sub">جدول‌های مرجع واحد، گروه شغلی، پست و ساختمان — جایگزین بخشِ متن آزاد در فرم‌های جدید</div></div>
      ${ORG.canManage?`<button class="btn btn-g btn-sm" onclick="orgNew()">+ افزودن ${tab.t.replace(/ها$/,'')}</button>`:''}
    </div>
    <div class="pbody">
      <div class="orgtabs">
        ${ORG_TABS.map(t=>`<button class="orgtab ${t.k===ORG.tab?'on':''}" onclick="setOrgTab('${t.k}')">
          <span class="ic">${t.i}</span>${t.t}<span class="cnt">${fa(orgList(t.k).length)}</span></button>`).join('')}
      </div>
      <div id="org_form"></div>
      ${!rows.length?`<div class="empty"><div class="ei">${tab.i}</div>موردی ثبت نشده است</div>`:`
      <div class="tbl-wrap"><table>
        <thead><tr>${tab.cols.map(([,l])=>`<th>${l}</th>`).join('')}<th>وضعیت</th>${ORG.canManage?'<th>عملیات</th>':''}</tr></thead>
        <tbody>${rows.map(r=>`<tr>
          ${tab.cols.map(([c],idx)=>`<td${idx===0?' style="color:var(--th)"':''}>${orgCellValue(tab,r,c)}</td>`).join('')}
          <td>${r.is_active?'<span class="bdg b1">فعال</span>':'<span class="bdg b3">غیرفعال</span>'}</td>
          ${ORG.canManage?`<td style="white-space:nowrap">
            <button class="tgl prim" onclick="orgEdit('${r.id}')">ویرایش</button>
            <button class="tgl dngr" onclick="orgDelete('${r.id}')">حذف</button></td>`:''}
        </tr>`).join('')}</tbody></table></div>`}
    </div>
  </div>`;
  if(ORG.editId!==null) drawOrgForm();
}

function orgSelect(id,kind,label,sel,extraBlank){
  return `<div class="fg" style="margin:0"><label>${label}</label>
    <select id="${id}"><option value="">${extraBlank}</option>
      ${orgList(kind).map(o=>`<option value="${o.id}" ${sel===o.id?'selected':''}>${esc(o.title)}</option>`).join('')}
    </select></div>`;
}
function orgNew(){ ORG.editId=''; drawOrg(); }
function orgEdit(id){ ORG.editId=id; drawOrg(); }
function orgCancel(){ ORG.editId=null; drawOrg(); }

function drawOrgForm(){
  const tab=orgTab(ORG.tab);
  const r=ORG.editId?orgList(ORG.tab).find(x=>x.id===ORG.editId)||{}:{};
  const v=f=>esc(r[f]===null||r[f]===undefined?'':String(r[f]));
  let fields=`<div class="fg" style="margin:0"><label>عنوان *</label><input id="of_title" value="${v('title')}"></div>`;
  if(ORG.tab==='org-units'){
    fields+=`<div class="fg" style="margin:0"><label>نوع واحد</label><select id="of_unit_type">
      ${ORG_UNIT_TYPES.map(t=>`<option value="${t}" ${r.unit_type===t?'selected':''}>${t}</option>`).join('')}</select></div>`
      +orgSelect('of_building_id','buildings','ساختمان',r.building_id,'— بدون ساختمان —')
      +orgSelect('of_parent_id','org-units','واحد بالادست',r.parent_id,'— بدون واحد بالادست —')
      +`<div class="fg" style="margin:0"><label>تعداد تخت</label><input id="of_bed_count" type="number" min="0" value="${v('bed_count')}"></div>`;
  } else if(ORG.tab==='post-titles'){
    fields+=orgSelect('of_job_group_id','job-groups','گروه شغلی',r.job_group_id,'— بدون گروه شغلی —')
      +`<div class="fg" style="margin:0"><label>پست مدیریتی؟</label><select id="of_is_managerial">
        <option value="0" ${r.is_managerial?'':'selected'}>خیر</option>
        <option value="1" ${r.is_managerial?'selected':''}>بله</option></select></div>`;
  } else if(ORG.tab==='buildings'){
    fields+=`<div class="fg" style="margin:0"><label>تعداد طبقه</label><input id="of_floors" type="number" min="0" value="${v('floors')}"></div>`
      +`<div class="fg" style="margin:0"><label>توضیح</label><input id="of_description" value="${v('description')}"></div>`;
  } else {
    fields+=`<div class="fg" style="margin:0"><label>توضیح</label><input id="of_description" value="${v('description')}"></div>`;
  }
  fields+=`<div class="fg" style="margin:0"><label>وضعیت ${help('flt_status')}</label><select id="of_is_active">
    <option value="1" ${r.is_active===0?'':'selected'}>فعال</option>
    <option value="0" ${r.is_active===0?'selected':''}>غیرفعال</option></select></div>`;

  $('org_form').innerHTML=`<div class="orgform">
    <div class="docsl">${ORG.editId?'ویرایش':'افزودن'} — ${tab.t}</div>
    <div class="docgrid">${fields}</div>
    <div style="margin-top:12px;display:flex;gap:8px">
      <button class="btn btn-g btn-sm" onclick="orgSave()">ذخیره</button>
      <button class="btn btn-o btn-sm" onclick="orgCancel()">انصراف</button>
    </div></div>`;
}

async function orgSave(){
  const g=id=>$(id)?$(id).value:undefined;
  const b={title:(g('of_title')||'').trim(), is_active:g('of_is_active'),
    unit_type:g('of_unit_type'), building_id:g('of_building_id'), parent_id:g('of_parent_id'),
    bed_count:g('of_bed_count'), job_group_id:g('of_job_group_id'),
    is_managerial:g('of_is_managerial'), floors:g('of_floors'), description:g('of_description')};
  if(!b.title){ toast('عنوان الزامی است',true); return; }
  try{
    if(ORG.editId) await API.updateOrgItem(ORG.tab, ORG.editId, b);
    else await API.createOrgItem(ORG.tab, b);
    toast('ذخیره شد'); ORG.editId=null; renderOrg();
  }catch(e){ toast(e.message,true); }
}
async function orgDelete(id){
  if(!await BTN.confirmDanger('این مورد از ساختار سازمانی حذف شود؟')) return;
  try{ await API.deleteOrgItem(ORG.tab, id); toast('حذف شد'); ORG.editId=null; renderOrg(); }
  catch(e){ toast(e.message,true); }
}

// ---- پر کردن فهرست انتخابی واحدها در فرم‌های دیگر (فعلاً فرم پیشنهاد برنامه) ----
// عمداً datalist است نه select: ستون department متن آزاد می‌ماند تا داده‌ی قدیمی از بین نرود،
// ولی کاربر جدید از واحدهای واقعی انتخاب می‌کند و املای متفرقه تولید نمی‌شود.
let ORG_STRUCT_CACHE=null;
// kind: 'unit' (پیش‌فرض، واحد/بخش) یا 'job_group' (گروه شغلی)
async function fillOrgDatalist(listId, kind){
  const el=$(listId); if(!el) return;
  try{
    if(!ORG_STRUCT_CACHE) ORG_STRUCT_CACHE=await API.orgStructure();
    const rows=(kind==='job_group'?ORG_STRUCT_CACHE.job_groups:ORG_STRUCT_CACHE.org_units)||[];
    el.innerHTML=rows.map(u=>`<option value="${esc(u.title)}"></option>`).join('');
  }catch(e){ /* بی‌صدا: نبودِ فهرست واحدها نباید ثبت برنامه را متوقف کند */ }
}

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

// ==================== داشبورد سرپرستار/جانشین بخش — database/seed-head-nurse.js ====================
// خودِ فرد (نه پنل ادمین سلسله‌مراتب): حضور‌غیاب، مرخصی، چک‌لیست شیفت — برای بخش‌هایی
// که این کاربر در nursing_wards.head_nurse_id/deputy1_id/deputy2_id دیده می‌شود.
let HN={wards:[], wardId:null, roster:null, attendance:null, leaves:null, myLeaves:null, shifts:null};

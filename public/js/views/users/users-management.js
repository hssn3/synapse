/**
 * Users Management & Role Duties
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
function printSatisfaction(){
  const d=SATR.data;
  if(!d||!d.total){ toast('در این بازه پاسخی برای چاپ نیست',true); return; }
  const retTotal=(d.would_return.yes||0)+(d.would_return.no||0);
  const meta=[['میانگین کلی رضایت', (d.overall_average!=null?d.overall_average:'—')+' از ۵'],
    ['تعداد پاسخ‌ها', String(d.total)],
    ['انتخاب مجدد بیمارستان', retTotal?Math.round(d.would_return.yes/retTotal*100)+'٪':'—']];
  // میانگین محورها از همان منبعی که صفحه استفاده می‌کند (SURVEY_SECTIONS)، تا
  // ترتیب و عنوان‌ها روی کاغذ با آنچه کاربر دیده یکی باشد
  for(const sec of (typeof SURVEY_SECTIONS!=='undefined'?SURVEY_SECTIONS:[])){
    const avg=(d.section_averages||{})[sec.key]?.section_average;
    if(avg!=null) meta.push([sec.title, String(avg)+' از ۵']);
  }
  printListSheet({
    page:'satisfaction', title:'گزارش نظرسنجی رضایت گیرندگان خدمت', code:'RPT-SAT',
    intro:'میانگین هر محور و متن پاسخ‌های ثبت‌شده. هویت پاسخ‌دهنده ثبت و چاپ نمی‌شود.',
    meta,
    headers:['تاریخ','وضعیت پاسخ‌دهنده','جنسیت','انتخاب مجدد','امتیاز کلی','توضیحات'],
    rows:(d.surveys||[]).map(s=>[
      esc(s.created_at?faDateISO(s.created_at.slice(0,10)):'—'), esc(s.respondent_type||'—'),
      esc(s.patient_gender||'—'), esc(s.would_return||'—'),
      s.overall_score!=null?fa(s.overall_score):'—', esc(s.comment||'—')]),
    foot:'نظرسنجی رضایت',
  });
}

// ==================== USERS ====================
async function renderUsers(){
  $('ptitle').textContent='مدیریت کاربران';
  EDIT_ROLE_ID=null;
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const [{users},{roles}] = await Promise.all([API.users(), API.rolesList().catch(()=>({roles:[]}))]);
    $('content').innerHTML=`
    <div class="panel g">
      <div class="phd"><div class="abadge">✦</div><div><h3>کاربران بیمارستان</h3>
        <div class="sub">هر نقش فقط به محورهای مربوط به خود دسترسی دارد</div></div></div>
      <div class="pbody"><div class="tbl-wrap"><table>
        <thead><tr><th>نام</th><th>نام کاربری</th><th>نقش</th><th>بخش</th><th>محورهای در دسترس</th><th>دسترسی موردی</th></tr></thead>
        <tbody>${[...users].sort((a,b)=>(b.is_active?1:0)-(a.is_active?1:0)).map(u=>{
          // پیش‌فرض «رد» — همانند roleScope در سرور؛ پیش از این ?? '*' بود و نقش ناشناخته «همه محورها» نشان داده می‌شد
          const sc=ROLE_AXES[u.role_code] ?? [];
          const inactive=!u.is_active;
          const pfx = u.title_prefix || (u.gender==='female'||u.gender==='زن'?'خانم':(u.gender==='male'||u.gender==='مرد'?'آقای':''));
          return `<tr style="${inactive?'opacity:.55':''}"><td style="color:var(--th)">${pfx?`<span class="bdg b1" style="margin-left:6px;font-size:11px">${esc(pfx)}</span>`:''}${esc(u.full_name)}${inactive?' <span class="bdg b3">غیرفعال</span>':''}</td><td style="color:var(--gdl)">${esc(u.username)}</td>
          <td>${esc(ROLE_FA[u.role_code]||u.role_title||'')}</td><td>${esc(u.department||'—')}</td>
          <td style="font-size:11px">${sc==='*'?'همه محورها':(sc.length?sc.join('، '):'—')}</td>
          <td><button class="btn btn-o btn-sm" onclick="openOverrides('${u.id}','${jsArg(u.full_name)}')">مدیریت</button></td></tr>`;
        }).join('')}</tbody></table></div>
        <div class="sub" style="margin-top:8px">کاربرانِ «غیرفعال» متصدیان پیشینِ همین سمت‌ها هستند — برای حفظ سابقه‌ی کاری‌شان نگه داشته شده‌اند و امکان ورود ندارند.</div>
        <div id="ov_box"></div>
        <div style="margin-top:18px;padding:16px 18px;border-radius:12px;background:var(--subpanel);border:1px solid var(--bd)">
          <div style="font-size:12.5px;color:var(--gdl);font-weight:700;margin-bottom:12px">افزودن کاربر جدید</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="fg"><label>پیشوند احترامی</label>
              <select id="nu_prefix" class="sel" style="width:100%">
                <option value="">— بدون پیشوند —</option>
                <option value="خانم">خانم</option>
                <option value="آقای">آقای</option>
                <option value="دکتر">دکتر</option>
                <option value="مهندس">مهندس</option>
                <option value="سرکار خانم">سرکار خانم</option>
                <option value="جناب آقای">جناب آقای</option>
                <option value="استاد">استاد</option>
              </select>
            </div>
            <div class="fg"><label>جنسیت</label>
              <select id="nu_gender" class="sel" style="width:100%">
                <option value="female">زن (خانم)</option>
                <option value="male">مرد (آقا)</option>
              </select>
            </div>
            <div class="fg"><label>نام و نام خانوادگی</label><input id="nu_name" placeholder="مثال: رضایی"></div>
            <div class="fg"><label>نام کاربری ${help('note')}</label><input id="nu_user" placeholder="f.rezaei" style="direction:ltr"></div>
            <div class="fg"><label>رمز عبور اولیه</label><input id="nu_pass" type="text" placeholder="حداقل ۸ کاراکتر"></div>
            <div class="fg"><label>نقش سازمانی ${help('role')}</label>
              <select id="nu_role">${roles.map(r=>`<option value="${r.id}">${esc(ROLE_FA[r.code]||r.title_fa)}</option>`).join('')}</select></div>
            <div class="fg"><label>بخش/واحد</label><input id="nu_dept" placeholder="پرستاری"></div>
          </div>
          <button class="btn btn-g" style="margin-top:12px" onclick="addUser()">ایجاد کاربر</button>
        </div>
        ${S.user?.permissions?.includes('manage_roles') ? `
        <div style="margin-top:18px;padding:16px 18px;border-radius:12px;background:var(--subpanel);border:1px solid var(--bd)">
          <div style="font-size:12.5px;color:var(--gdl);font-weight:700;margin-bottom:8px">نقش‌های موجود</div>
          <div class="tbl-wrap"><table>
            <thead><tr><th>نقش</th><th>نوع</th><th>تعداد مجوز</th><th></th></tr></thead>
            <tbody>${roles.map(r=>{
              const pl=(typeof r.permissions==='string'?JSON.parse(r.permissions||'[]'):(r.permissions||[]));
              return `<tr><td style="color:var(--th)">${esc(ROLE_FA[r.code]||r.title_fa||r.code)}</td>
              <td>${r.hospital_id?'<span class="bdg b2">سفارشی</span>':'<span class="bdg b1">پایه سیستم</span>'}</td>
              <td>${fa(pl.length)}</td>
              <td>${r.hospital_id?`<button class="btn btn-o btn-sm" onclick="startEditRole('${r.id}')">ویرایش</button>`:'<span style="color:var(--td);font-size:11px">غیرقابل ویرایش</span>'}</td></tr>`;
            }).join('')}</tbody></table></div>
          <div id="nr_form_title" style="font-size:12.5px;color:var(--gdl);font-weight:700;margin:16px 0 10px">ساخت نقش سفارشی</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px">
            <div class="fg"><label>کد نقش (لاتین)</label><input id="nr_code" placeholder="ward_supervisor" style="direction:ltr"></div>
            <div class="fg"><label>عنوان فارسی</label><input id="nr_title" placeholder="سرپرست بخش"></div>
          </div>
          <div id="nr_perms" style="max-height:260px;overflow:auto;border:1px solid var(--bd);border-radius:9px;padding:10px;font-size:12.5px">در حال بارگذاری مجوزها…</div>
          <button class="btn btn-g btn-sm" id="nr_submit" style="margin-top:10px" onclick="addCustomRole()">ساخت نقش</button>
          <button class="btn btn-o btn-sm" id="nr_cancel" style="margin-top:10px;display:none" onclick="cancelEditRole()">انصراف</button>
        </div>` : ''}
      </div>
    </div>`;
    if(S.user?.permissions?.includes('manage_roles')) loadPermCatalog();
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}
// ---------- دسترسی موردی کاربر ↔ سنجه (فقط ادمین / دارنده manage_users) ----------
// لایه‌ی دوم روی دسترسی نقش/محور: «این کاربر خاص، به این سنجه‌ی خاص دسترسی داشته/نداشته باشد».
let OV_USER=null, OV_NAME='', OV_PICK=null;
async function openOverrides(uid, name){
  OV_USER=uid; OV_NAME=name; OV_PICK=null;
  const box=$('ov_box'); if(!box) return;
  box.innerHTML='<div style="margin-top:18px;padding:16px 18px;border-radius:12px;background:var(--subpanel);border:1px solid var(--bd)">در حال بارگذاری…</div>';
  let list=[];
  try{ list=(await API.userOverrides(uid)).overrides||[]; }catch(e){ toast(e.message); }
  box.innerHTML=`<div style="margin-top:18px;padding:16px 18px;border-radius:12px;background:var(--subpanel);border:1px solid var(--bd)">
    <div style="font-size:12.5px;color:var(--gdl);font-weight:700;margin-bottom:4px">دسترسی موردی — ${esc(name)}</div>
    <div style="font-size:11px;color:var(--td);margin-bottom:12px">این تنظیمات روی دسترسی نقش سوار می‌شود؛ «افزودن» سنجه‌ای خارج از محورهای نقش را باز می‌کند و «سلب» سنجه‌ای داخل محورهای نقش را می‌بندد. سلب بر دسترسی نقش اولویت دارد.</div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>سنجه</th><th>عنوان</th><th>نوع</th><th>ثبت‌کننده</th><th></th></tr></thead>
      <tbody>${list.length?list.map(o=>`<tr>
        <td style="direction:ltr;color:var(--th)">${esc(o.measure_code)}</td>
        <td style="font-size:11px">${esc(fixText(o.measure_title).slice(0,90))}</td>
        <td>${o.access_type==='grant'?'<span class="bdg b1">افزودن دسترسی</span>':'<span class="bdg b2">سلب دسترسی</span>'}</td>
        <td style="font-size:11px">${esc(o.granted_by_name||'—')}</td>
        <td><button class="btn btn-o btn-sm" onclick="delOverride('${o.id}')">حذف</button></td></tr>`).join('')
        :'<tr><td colspan="5" style="color:var(--td);font-size:12px">موردی ثبت نشده است.</td></tr>'}</tbody>
    </table></div>
    <div style="display:grid;grid-template-columns:2fr 1fr auto;gap:12px;align-items:end;margin-top:14px">
      <div class="fg"><label>جست‌وجوی سنجه (کد یا متن)</label>
        <input id="ov_q" placeholder="مثال: ب-5-1 یا بهداشت دست" oninput="ovSearch()"></div>
      <div class="fg"><label>نوع دسترسی</label>
        <select id="ov_type"><option value="grant">افزودن دسترسی</option><option value="deny">سلب دسترسی</option></select></div>
      <button class="btn btn-g btn-sm" onclick="addOverride()">ثبت</button>
    </div>
    <div id="ov_res" style="font-size:12px"></div>
  </div>`;
}
let OV_T=null;
function ovSearch(){
  clearTimeout(OV_T);
  OV_T=setTimeout(async()=>{
    const q=($('ov_q')||{}).value||''; const res=$('ov_res'); if(!res) return;
    if(q.trim().length<2){ res.innerHTML=''; OV_PICK=null; return; }
    try{
      const {measures}=await API.searchMeasures(q.trim());
      res.innerHTML=measures.length?measures.map(m=>`<div style="padding:6px 8px;border-bottom:1px solid var(--bd);cursor:pointer"
        onclick="ovPick('${m.id}','${esc(m.code)}')"><span style="direction:ltr;color:var(--gdl)">${esc(m.code)}</span> — ${esc(fixText(m.title).slice(0,80))}</div>`).join('')
        :'<div style="color:var(--td);padding:6px">موردی یافت نشد</div>';
    }catch(e){ res.innerHTML=`<div style="color:var(--dn);padding:6px">${esc(e.message)}</div>`; }
  }, 250);
}
function ovPick(id, code){ OV_PICK=id; $('ov_q').value=code; $('ov_res').innerHTML=`<div style="color:var(--ok);padding:6px">سنجه انتخاب شد: ${esc(code)}</div>`; }
async function addOverride(){
  if(!OV_USER) return;
  if(!OV_PICK) return toast('ابتدا یک سنجه را از فهرست انتخاب کنید');
  try{
    await API.setUserOverride(OV_USER,{measure_id:OV_PICK, access_type:$('ov_type').value});
    toast('دسترسی موردی ثبت شد'); openOverrides(OV_USER, OV_NAME);
  }catch(e){ toast(e.message); }
}
async function delOverride(id){
  try{ await API.deleteUserOverride(OV_USER,id); toast('حذف شد'); openOverrides(OV_USER,OV_NAME); }
  catch(e){ toast(e.message); }
}

// چک‌باکس‌های مجوز با برچسب فارسی، گروه‌بندی‌شده بر اساس ماژول.
// checked: فهرست مجوزهایی که باید از پیش تیک‌خورده باشند (حالت ویرایش نقش)
async function loadPermCatalog(checked){
  const box=$('nr_perms'); if(!box) return;
  const on=new Set(checked||[]);
  try{
    const {permissions}=await API.permissionCatalog();
    const avail=new Set(permissions);
    let html='';
    PERM_GROUPS.forEach(([title,list])=>{
      const items=list.filter(([k])=>avail.has(k));
      if(!items.length) return;
      html+=`<div style="margin:2px 0 12px">
        <div style="font-size:11.5px;font-weight:700;color:var(--gdl);margin-bottom:5px">${esc(title)}</div>
        ${items.map(([k,fa])=>`<label style="display:inline-flex;align-items:center;gap:5px;margin:3px 12px 3px 0">
          <input type="checkbox" class="nr_perm_cb" value="${k}"${on.has(k)?' checked':''}>${esc(fa)}</label>`).join('')}
      </div>`;
    });
    // هر مجوزی که در نقشه‌ی فارسی نیست (مجوز تازه‌ی بک‌اند) حذف نمی‌شود — با کد خام نمایش داده می‌شود
    const known=new Set(Object.keys(PERM_FA));
    const rest=permissions.filter(p=>!known.has(p));
    if(rest.length) html+=`<div style="margin:2px 0 4px">
      <div style="font-size:11.5px;font-weight:700;color:var(--gdl);margin-bottom:5px">سایر</div>
      ${rest.map(p=>`<label style="display:inline-flex;align-items:center;gap:5px;margin:3px 12px 3px 0">
        <input type="checkbox" class="nr_perm_cb" value="${p}"${on.has(p)?' checked':''}>${esc(p)}</label>`).join('')}</div>`;
    box.innerHTML=html||'—';
  }catch(e){ box.textContent='—'; }
}
// null = حالت ساخت؛ در غیر این صورت شناسه‌ی نقشی که در حال ویرایش است
let EDIT_ROLE_ID=null;
async function addCustomRole(){
  const title_fa=$('nr_title').value.trim();
  const permissions=[...document.querySelectorAll('.nr_perm_cb:checked')].map(c=>c.value);
  if(EDIT_ROLE_ID){
    if(!title_fa){ toast('عنوان نقش الزامی است',true); return; }
    try{ await API.updateRole(EDIT_ROLE_ID,{title_fa,permissions}); EDIT_ROLE_ID=null; toast('نقش به‌روزرسانی شد'); renderUsers(); }
    catch(e){ toast(e.message,true); }
    return;
  }
  const code=$('nr_code').value.trim();
  if(!code||!title_fa){ toast('کد و عنوان نقش الزامی است',true); return; }
  try{ await API.createRole({code,title_fa,permissions}); toast('نقش ساخته شد'); renderUsers(); }
  catch(e){ toast(e.message,true); }
}
// ویرایش نقش سفارشی: همان فرم ساخت را با مقادیر فعلی نقش پر می‌کند
// (نقش‌های پایه‌ی سیستم hospital_id=null اصلاً دکمه‌ی ویرایش نمی‌گیرند و بک‌اند هم آن‌ها را رد می‌کند)
async function startEditRole(id){
  try{
    const {roles}=await API.rolesList();
    const r=roles.find(x=>x.id===id); if(!r){ toast('نقش یافت نشد',true); return; }
    EDIT_ROLE_ID=id;
    const perms=typeof r.permissions==='string'?JSON.parse(r.permissions||'[]'):(r.permissions||[]);
    $('nr_code').value=r.code; $('nr_code').disabled=true;
    $('nr_title').value=r.title_fa||'';
    $('nr_form_title').textContent=`ویرایش نقش سفارشی — ${r.title_fa||r.code}`;
    $('nr_submit').textContent='ذخیره تغییرات';
    $('nr_cancel').style.display='';
    await loadPermCatalog(perms);
    $('nr_title').scrollIntoView({behavior:'smooth',block:'center'});
  }catch(e){ toast(e.message,true); }
}
function cancelEditRole(){ EDIT_ROLE_ID=null; renderUsers(); }
async function addUser(){
  const b={
    full_name:$('nu_name').value.trim(),
    username:$('nu_user').value.trim(),
    password:$('nu_pass').value,
    role_id:$('nu_role').value,
    department:$('nu_dept').value.trim(),
    title_prefix:($('nu_prefix')?$('nu_prefix').value:''),
    gender:($('nu_gender')?$('nu_gender').value:'')
  };
  if(!b.full_name||!b.username||!b.password){ toast('نام، نام کاربری و رمز الزامی است',true); return; }
  try{ await API.createUser(b); toast('کاربر ایجاد شد'); renderUsers(); }
  catch(e){ toast(e.message,true); }
}

// ==================== راهنمای نقش («راهنمای من») ====================
// این راهنما مکملِ دو سازوکار موجود است و جایگزین هیچ‌کدام نیست:
//   ۱) FIELD_GUIDES — راهنمای «این فیلد یعنی چه»
//   ۲) TOUR — گردش عمومی محصول (برای همه یکسان)
// آنچه کم بود: «شغل من در این سامانه چیست؟» — پاسخِ نقش‌به‌نقش، با زبان ساده و فونت بزرگ،
// برای کسی که هیچ آشنایی‌ای با اعتباربخشی ندارد و تازه پشت سیستم نشسته است.
// داده‌محور است (نه HTML ثابت برای هر نقش) و فهرست محورها را در لحظه از myAxes() می‌گیرد
// تا با src/config/role-axes.js از هم دور نیفتد.

// معنای چهار وضعیت سنجه — برای همه نقش‌ها یکسان است، چون قاعده‌ی ارزیابی یکی است.
// «شواهد» هر سطح بر پایه‌ی همان قاعده‌ای است که در docs/GUIDE_FORMS_AND_TABLES.md آمده:
// مدرکِ الکترونیکیِ بارگذاری‌شده در خود سامانه + توضیحِ قابل‌ردیابی (نوع مدرک + شماره + تاریخ +
// مسئول). ارجاع به بایگانی کاغذی بیرونی («محل نگهداری: زونکن فلان») دیگر شاهد محسوب نمی‌شود.
const RG_STATUS = [
  {k:'unchecked', c:'', t:'بررسی‌نشده',
   d:'یعنی هنوز به این سنجه نرسیده‌اید. حالت پیش‌فرض همه سنجه‌هاست و «بد» نیست — فقط یعنی کار هنوز شروع نشده.',
   e:'شواهد لازم: هیچ. اما اگر تا روز ارزیابی «بررسی‌نشده» بماند، عملاً مثل «عدم انطباق» امتیاز می‌گیرد.'},
  {k:'non', c:'dn', t:'عدم انطباق',
   d:'یعنی کاری که این سنجه می‌خواهد اصلاً انجام نشده، یا انجام شده ولی هیچ مدرکی برایش وجود ندارد.',
   e:'شواهد لازم: هیچ مدرکی نیاز نیست، ولی در توضیحات بنویسید چرا انجام نشده و برنامه‌تان چیست. ثبت صادقانه‌ی «عدم انطباق» به شما اجازه می‌دهد آن را در «برنامه‌های بهبود» پیگیری کنید.'},
  {k:'partial', c:'wr', t:'انطباق نسبی',
   d:'یعنی بخشی از کار انجام شده: یا همه‌ی اقدامات «راهنمای تکمیل» انجام نشده، یا مدرک هست ولی ناقص/قدیمی/بدون امضا است.',
   e:'شواهد لازم: همان مدرکِ ناقص را معرفی کنید و صریح بنویسید چه چیزی کم است. مثال: «روش اجرایی موجود است اما امضای تصویب‌کننده ندارد و از سال گذشته بازنگری نشده».'},
  {k:'full', c:'ok', t:'انطباق کامل',
   d:'یعنی همه‌ی اقدامات فهرست‌شده در «◈ راهنمای تکمیل» همان سنجه انجام شده و برای هرکدام مدرک واقعی و به‌روز در دست دارید.',
   e:'شواهد لازم: <b>فایل واقعی مدرک را در کادر «ثبت مدرک» همین سنجه بارگذاری کنید</b> (تصویر سند امضاشده، فرم تکمیل‌شده یا PDF). سپس در توضیح بنویسید فایل چه چیزی را ثابت می‌کند: «[نوع مدرک] شماره [عدد] مورخ [تاریخ] — مسئول اجرا: [سمت]». ارجاع به بایگانی بیرونی («در زونکن فلان») یا جمله‌هایی مثل «انجام می‌شود» پذیرفته نیست.'},
];

// نکته‌های مشترک برای همه نقش‌ها (خلاصه‌ی چیزی که یک تازه‌وارد باید بداند)
const RG_ABC = [
  {t:'اعتباربخشی یعنی چه؟', x:'یعنی وزارت بهداشت هر سال با یک کتاب استاندارد می‌آید و می‌سنجد که بیمارستان کارهایش را درست و <b>مستند</b> انجام می‌دهد یا نه. نتیجه، رتبه‌ی بیمارستان می‌شود. این سامانه همان کتاب است، به‌شکل قابل پرکردن.'},
  {t:'محور، استاندارد، سنجه چه فرقی دارند؟', x:'کتاب سه لایه دارد: <b>محور</b> = یک حوزه‌ی کاری بزرگ (مثلاً «مدیریت خدمات پرستاری»)؛ <b>استاندارد</b> = یک انتظار کلی درون آن حوزه؛ <b>سنجه</b> = دقیق‌ترین لایه، یعنی همان چیز مشخصی که ارزیاب می‌آید و می‌پرسد. کار روزانه‌ی شما در سطح <b>سنجه</b> است.'},
  {t:'سنجه‌های ایمنی بیمار چرا نشان‌دار شده‌اند؟', x:'این سنجه‌ها وزن بیشتری دارند و در دور ششم علاوه بر امتیاز کل، یک حداقلِ جداگانه هم برایشان تعیین شده. یعنی ضعف در آن‌ها را نمی‌شود با امتیاز جاهای دیگر جبران کرد. اول سراغ همین‌ها بروید.'},
  {t:'اگر چیزی را اشتباه ثبت کنم چه می‌شود؟', x:'هیچ اتفاق بدی نمی‌افتد؛ هر وضعیت و هر توضیحی قابل ویرایش است و تاریخچه‌ی تغییرات نگه داشته می‌شود. تنها اشتباهِ پرهزینه، زدنِ «انطباق کامل» بدون مدرک واقعی است.'},
];

// هر نقش: نقش شما / چرا این‌ها را می‌بینید / اولین قدم‌ها / یک نمونه‌ی شواهدِ درست برای همین نقش / اگر گیر کردید
const ROLE_GUIDES = {
  hospital_president:{
    who:'شما ریاست بیمارستان هستید. شما سنجه‌ها را ثبت نمی‌کنید — کار شما در این سامانه سه چیز است: بازدید میدانی ماهانه از بخش‌ها، تصویب برنامه‌های بهبودی که واحدها پیشنهاد می‌دهند، و مرور دوره‌ای امتیاز و رتبه‌ی تخمینی بیمارستان تا اگر جایی عقب افتاده، همان‌جا دستور پیگیری بدهید. در روز ارزیابی، ارزیاب معمولاً با یک دیدار کوتاه از شما شروع می‌کند تا ببیند رهبری بیمارستان از وضعیت واقعی خبر دارد یا نه.',
    why:'دسترسی شما به همه‌ی محورهای کتاب باز است، چون امضای نهایی خیلی از مصوبات و برنامه‌ها با شماست و باید بتوانید هر بخشی را در صورت نیاز بازبینی کنید.',
    steps:[
      {p:'walkarounds', t:'بازدید میدانی این ماه را ثبت کنید', x:'طبق سنجه‌های محور «رهبری و مدیریت»، بازدید ماهانه‌ی مستند از بخش‌ها وظیفه‌ی مستقیم ریاست است؛ برای هر یافته یک مسئول و یک مهلت ثبت کنید.'},
      {p:'programs', t:'برنامه‌های بهبود پیشنهادی واحدها را تصویب کنید', x:'برنامه‌ای که تصویب ریاست را نداشته باشد، در ارزیابی رسمی به‌عنوان برنامه‌ی معتبر پذیرفته نمی‌شود.'},
      {p:'dash', t:'امتیاز وزنی و رتبه‌ی تخمینی را مرور کنید', x:'به‌خصوص کارت سنجه‌های ایمنی بیمارِ تکمیل‌نشده را ببینید — این‌ها بیشترین اثر را روی رتبه‌ی نهایی دارند.'},
      {p:'committees', t:'مصوبات کمیته‌هایی که عضوشان هستید را پیگیری کنید', x:'برای کمیته‌ی پایش و سنجش کیفیت و کمیته‌ی اعتباربخشی، صورت‌جلسه باید مسئول و مهلت مشخص داشته باشد.'},
    ],
    ev:'فایل بارگذاری‌شده: تصویر فرم بازدید مدیریتی ایمنی بیمار مورخ ۱۴۰۳/۰۳/۱۰ به‌همراه امضای ریاست — توضیح: یافته‌ها و مسئول پیگیری هرکدام در متن فرم آمده',
    help:'برای گزارش وضعیت کلی و آماده‌سازی پیش از ارزیابی، از مدیر بهبود کیفیت و مدیر اعتباربخشی بخواهید خلاصه بدهند. برای مسائل فنی/دسترسی سامانه، به مدیر داخلی پیام بدهید.'},

  accreditation_manager:{
    who:'شما مدیر اعتباربخشی بیمارستان هستید — راهبرِ مستقیمِ کل فرایند. کار شما هماهنگی بین همه‌ی واحدها برای تکمیل و مستندسازی سنجه‌هاست: پیگیری وضعیت هر سنجه، بارگذاری/بازبینی شواهد، به‌روز نگه‌داشتن خط‌مشی‌ها و روش‌های اجرایی، و اجرای حسابرسی داخلی دوره‌ای پیش از اینکه ارزیاب بیرونی برسد.',
    why:'دسترسی شما به همه‌ی محورهای کتاب باز است، چون باید تصویر کامل بیمارستان را داشته باشید و بتوانید کار هر واحد را با واحد دیگر مقایسه و هماهنگ کنید.',
    steps:[
      {p:'measures', t:'وضعیت سنجه‌ها را به‌روز نگه دارید', x:'سنجه‌های ایمنی بیمار (ضریب ۲) را در اولویت بگذارید — بیشترین اثر را روی رتبه‌ی نهایی دارند.'},
      {p:'measures', t:'برای هر ادعای «انطباق کامل» شاهد بارگذاری کنید', x:'ارزیاب برای هر ادعای انطباق مدرک می‌خواهد؛ سنجه‌ی بدون شاهدِ ثبت‌شده در ارزیابی رسمی رد می‌شود.'},
      {p:'documents', t:'خط‌مشی‌ها و روش‌های اجرایی سررسیدشده را بازنگری کنید', x:'در «مدارک کنترل‌شده»، سندی که تاریخ بازنگری‌اش گذشته امتیاز منفی دارد.'},
      {p:'audits', t:'حسابرسی داخلی دوره‌ای اجرا کنید', x:'یافته‌های هر حسابرسی را با مسئول و مهلت مشخص در همان صفحه پیگیری کنید — همین یافته‌ها پایه‌ی برنامه‌های بهبود بعدی است.'},
    ],
    ev:'فایل بارگذاری‌شده: گزارش خودارزیابی سه‌ماهه شماره ۲ مورخ ۱۴۰۳/۰۴/۰۵ (PDF) — توضیح: برگرفته از پاسخ‌نامه‌های همین سامانه، ارائه‌شده در کمیته‌ی اعتباربخشی، مسئول: مدیر اعتباربخشی',
    help:'برای تصویب برنامه‌های بهبود و تصمیم‌های راهبردی، موضوع را به ریاست بیمارستان یا کمیته‌ی پایش و سنجش کیفیت ببرید. برای مشکلات دسترسی و کاربران، به مدیر داخلی پیام بدهید.'},

  admin:{
    who:'شما مدیرِ فنیِ سامانه هستید. کار اصلی شما پرکردن سنجه‌ها نیست — کار شما این است که هر کارمند بتواند سهم خودش را پر کند: ساخت کاربر، دادن نقش درست، تنظیم مشخصات بیمارستان و رفع گره‌ها. دسترسی کامل شما یک ابزار پشتیبانی است، نه دلیلی برای اینکه همه‌چیز را خودتان بنویسید.',
    why:'شما همه‌ی محورهای کتاب را می‌بینید تا بتوانید هر مشکلی را از هر بخشی بررسی کنید. علاوه بر آن، «مدیریت کاربران» و «تنظیمات بیمارستان» فقط برای شما باز است.',
    steps:[
      {p:'settings', t:'اول مشخصات بیمارستان را کامل کنید', x:'نام رسمی، نوع و تعداد تخت را در «تنظیمات بیمارستان» ثبت کنید؛ این‌ها روی سربرگ اسناد و خروجی‌ها می‌نشیند.'},
      {p:'users', t:'برای هر سمت واقعی بیمارستان یک کاربر بسازید', x:'نقش هرکس را دقیقاً مطابق سمت واقعی‌اش بگذارید. دادن نقش بالاتر «برای راحتی» یعنی آن فرد می‌تواند داده‌های بخش‌های دیگر را هم تغییر دهد.'},
      {p:'measures', t:'یک بار درخت سنجه‌ها را باز کنید', x:'تا ببینید هر محور مال چه سمتی است و اگر کسی می‌گوید «محور من را نمی‌بینم»، بدانید کجا را نگاه کنید.'},
    ],
    ev:'فایل بارگذاری‌شده: تصویر خط‌مشی امضاشده شماره ۳ مورخ ۱۴۰۳/۰۱/۲۰ (PDF) — توضیح: مصوب کمیته مدیریت اجرایی، مسئول اجرا: ریاست بیمارستان',
    help:'شما معمولاً کسی هستید که بقیه از او می‌پرسند. برای سؤال‌های محتوایی اعتباربخشی (نه فنی) از «پیام‌های داخلی» به مدیر بهبود کیفیت پیام بدهید.'},

  quality_control_manager:{
    who:'شما راهبرِ اعتباربخشی بیمارستان هستید. سنجه‌ها را تک‌تک خودتان پر نمی‌کنید؛ کار شما این است که ببینید هر واحد سهم خودش را پر کرده یا نه، کیفیت شواهدِ ثبت‌شده را بازبینی کنید، و برای هرچه ناقص است برنامه‌ی بهبود و اقدام اصلاحی تعریف کنید. در روز ارزیابی، ارزیاب اول سراغ شما می‌آید.',
    why:'شما همه‌ی محورهای کتاب را می‌بینید، چون باید تصویر کلی بیمارستان را داشته باشید و بتوانید بین واحدها مقایسه کنید. ماژول‌های کیفیت (چک‌لیست، حسابرسی داخلی، برنامه‌های بهبود، FMEA، گزارش خطا) هم زیر دست شماست.',
    steps:[
      {p:'dash', t:'از داشبورد شروع کنید', x:'کارت «سنجه‌های ایمنی بیمار تکمیل‌نشده» و رتبه‌ی تخمینی، وضعیت واقعی امروز بیمارستان را نشان می‌دهد. همین دو عدد، اولویت هفته‌ی شما را تعیین می‌کند.'},
      {p:'measures', t:'سنجه‌های ثبت‌شده را بازبینی کنید', x:'روی سنجه‌هایی که «انطباق کامل» خورده‌اند تمرکز کنید و توضیحات‌شان را بخوانید. هر توضیحی که نگوید مدرک کجاست، در روز ارزیابی رد می‌شود.'},
      {p:'programs', t:'برای هر «عدم انطباق» یک برنامه‌ی بهبود بسازید', x:'با مسئول و مهلت مشخص. عدم انطباقِ بدون برنامه، همان عدم انطباق سال بعد است.'},
      {p:'committees', t:'صورت‌جلسات کمیته‌ها را به‌روز نگه دارید', x:'هر مصوبه باید «چه کاری، چه کسی، تا چه تاریخی» داشته باشد؛ ارزیاب دقیقاً همین را بررسی می‌کند.'},
    ],
    ev:'فایل بارگذاری‌شده: گزارش پایش شاخص شماره ۹ مورخ ۱۴۰۳/۰۳/۰۵ (PDF) — توضیح: برگرفته از پاسخ‌نامه‌های همین سامانه، ارائه‌شده در کمیته پایش و سنجش کیفیت، مسئول: کارشناس بهبود کیفیت',
    help:'برای مشکلات دسترسی و کاربران، به مدیر داخلی پیام بدهید. برای اختلاف‌نظر درباره‌ی تفسیر یک سنجه، موضوع را به کمیته‌ی پایش و سنجش کیفیت ببرید و مصوبه‌اش را ثبت کنید.'},

  nursing_director:{
    who:'شما مدیر خدمات پرستاری (مترون) هستید. در این سامانه، بزرگ‌ترین سهم کتاب اعتباربخشی — همه‌ی مراقبت‌های بالینی و محور اختصاصی مدیریت پرستاری — روی دوش شماست. کار شما هم ثبت مستقیم است و هم توزیع کار بین سوپروایزرها و سرپرستارها و پیگیری آن‌ها.',
    why:'شما محور اختصاصی مدیریت خدمات پرستاری، محورهای مراقبت‌های بالینی، منابع انسانی و حمایت از گیرنده خدمت را می‌بینید؛ چون سنجه‌های این محورها در کتاب رسماً به مدیریت پرستاری نسبت داده شده‌اند.',
    steps:[
      {p:'measures', t:'از محور مدیریت خدمات پرستاری شروع کنید', x:'شما مالک تجمیع این محور هستید، نه تنها ثبت‌کننده‌اش: سوپروایزرها و سرپرستارها سهم خودشان را ثبت می‌کنند و شما کامل‌بودن کل محور، کیفیت شواهد و بستن موارد ناقص را پیگیری می‌کنید. تا وقتی این محور ناقص است، سراغ بقیه نروید.'},
      {p:'measures', t:'بعد سراغ سنجه‌های نشان‌دارِ ایمنی بیمار بروید', x:'این‌ها وزن مضاعف دارند و حداقل امتیاز جداگانه؛ ضعف در آن‌ها با هیچ محور دیگری جبران نمی‌شود.'},
      {p:'messages', t:'کار را بین سوپروایزرها تقسیم کنید', x:'با «پیام‌های داخلی» برای هر سوپروایزر بنویسید کدام محور را تا چه تاریخی باید تکمیل کند؛ پیگیری بعدی از همان‌جا انجام می‌شود.'},
    ],
    ev:'فایل بارگذاری‌شده: برنامه توانمندسازی کارکنان پرستاری شماره ۷ مورخ ۱۴۰۳/۰۲/۱۰ به‌همراه تصویر صفحه امضاها — توضیح: مسئول اجرا: مدیر خدمات پرستاری',
    help:'برای تفسیر سنجه‌ها و اولویت‌بندی، با مدیر بهبود کیفیت هماهنگ کنید. برای مشکل دسترسی یا نقش کاربران زیرمجموعه، به مدیر داخلی پیام بدهید.'},

  clinical_supervisor:{
    who:'شما سوپروایزر بالینی هستید. کار شما در این سامانه، مستندکردنِ همان چیزی است که هر شیفت در بالین انجام می‌دهید: مراقبت عمومی بالینی، پذیرش و انتقال بیمار، و پایش کار پرستاری در بخش‌ها. شما بیشتر از هر نقش دیگری «شاهدِ عینی» دارید — کار سخت، تبدیل آن مشاهده به مدرکِ مکتوب است.',
    why:'شما محورهای مراقبت عمومی بالینی و حوزه‌های بالینی مرتبط را می‌بینید، چون سنجه‌های این محورها در کتاب به سوپروایزر بالینی سپرده شده است. محورهای اداری و پشتیبانی به شما نشان داده نمی‌شود تا فهرست کارتان شلوغ نشود.',
    steps:[
      {p:'measures', t:'محور مراقبت عمومی بالینی را باز کنید و «راهنمای تکمیل» چند سنجه را بخوانید', x:'پیش از هر ثبتی، ببینید ارزیاب دقیقاً چه مدرکی می‌خواهد؛ اغلب چیزی است که در بخش وجود دارد ولی جایی ثبت نشده.'},
      {p:'errors', t:'گزارش خطاهای شیفت را در همین سامانه ثبت کنید', x:'گزارش خطا مچ‌گیری نیست؛ نبودِ گزارش خطا در روز ارزیابی به‌معنای «نظام گزارش‌دهی نداریم» تفسیر می‌شود که امتیاز بدتری دارد.'},
      {p:'checklists', t:'چک‌لیست‌های پایش بخش‌ها را تکمیل کنید', x:'نتیجه‌ی همین چک‌لیست‌ها، شاهدِ آماده برای چند سنجه‌ی مختلف است.'},
    ],
    ev:'فایل بارگذاری‌شده: تصویر فرم تکمیل‌شده راند بالینی مورخ ۱۴۰۳/۰۲/۲۸ — توضیح: یافته‌ها و اقدام اصلاحی هر بند در متن فرم آمده، مسئول: سوپروایزر بالینی',
    help:'در صورت تردید درباره‌ی یک سنجه، از مدیر خدمات پرستاری بپرسید. اگر محوری را که فکر می‌کنید مال شماست نمی‌بینید، از «پیام‌های داخلی» به مدیر داخلی اطلاع دهید — نقش خودتان را نمی‌توانید تغییر دهید و این محدودیت عمدی است.'},

  education_supervisor:{
    who:'شما سوپروایزر آموزشی هستید. در اعتباربخشی، «آموزش» یعنی اثبات اینکه کارکنان صلاحیت کارشان را دارند و این صلاحیت مستند شده است. کار شما ثبت نیازسنجی، برنامه‌ی آموزشی، اجرا و — مهم‌تر از همه — سنجش اثربخشی آموزش است.',
    why:'شما محورهای منابع انسانی، مدیریت خدمات پرستاری و مراقبت عمومی بالینی را می‌بینید، چون سنجه‌های مربوط به آموزش و صلاحیت کارکنان در همین محورها پخش شده‌اند.',
    steps:[
      {p:'measures', t:'سنجه‌های مربوط به آموزش و توجیه بدو ورود را پیدا و مرور کنید', x:'برای هرکدام، ببینید مدرکِ خواسته‌شده کدام است: نیازسنجی، تقویم آموزشی، لیست حضور، یا آزمون اثربخشی.'},
      {p:'documents', t:'مدارک آموزشی موجود را در سامانه بارگذاری کنید', x:'جزوه‌ها و پمفلت‌ها در «کتابخانه دیجیتال» و خط‌مشی/روش اجرایی آموزشی در «مدارک کنترل‌شده» ثبت می‌شوند.'},
      {p:'activities', t:'هر دوره‌ی برگزارشده را به‌عنوان یک فعالیت ثبت کنید', x:'با تاریخ واقعی برگزاری؛ اینها بعداً گزارش عملکرد سالانه‌ی شما را خودکار می‌سازند.'},
    ],
    ev:'فایل بارگذاری‌شده: صورت‌جلسه دوره بازآموزی بهداشت دست مورخ ۱۴۰۳/۰۲/۱۵ + اسکن لیست حضور و نتایج پیش‌آزمون/پس‌آزمون — توضیح: مسئول برگزاری: سوپروایزر آموزشی',
    help:'برای اولویت‌بندی دوره‌ها با مدیر خدمات پرستاری و مدیر بهبود کیفیت هماهنگ کنید؛ اثربخشی آموزش معمولاً باید در کمیته گزارش شود.'},

  infection_control_supervisor:{
    who:'شما مسئول پیشگیری و کنترل عفونت هستید. کار شما در این سامانه دو لایه دارد: مستندکردن نظام کنترل عفونت (خط‌مشی، کمیته، آموزش) و ثبت اعدادِ پایش (بهداشت دست، عفونت بیمارستانی). در ارزیابی، جدی‌ترین سؤال‌ها معمولاً از این حوزه پرسیده می‌شود.',
    why:'شما محورهای پیشگیری و کنترل عفونت، بهداشت محیط و مراقبت عمومی بالینی را می‌بینید؛ چون سنجه‌های کنترل عفونت بین این محورها تقسیم شده‌اند.',
    steps:[
      {p:'measures', t:'محور پیشگیری و کنترل عفونت را کامل مرور کنید', x:'این محور خانه‌ی اصلی شماست؛ سنجه‌های نشان‌دار ایمنی بیمار در آن را اول بزنید.'},
      {p:'committees', t:'صورت‌جلسات کمیته کنترل عفونت را ثبت کنید', x:'کمیته‌ای که صورت‌جلسه‌ی مصوبه‌دار و پیگیری‌شده ندارد، از نظر ارزیاب تشکیل نشده است.'},
      {p:'checklists', t:'چک‌لیست پایش بهداشت دست را دوره‌ای تکمیل کنید', x:'عدد پایش، شاهدِ مستقیم چند سنجه است و بدون آن «انطباق کامل» قابل دفاع نیست.'},
    ],
    ev:'فایل بارگذاری‌شده: گزارش پایش بهداشت دست سه‌ماهه اول شماره ۴ مورخ ۱۴۰۳/۰۴/۰۱ (PDF) — توضیح: در کمیته کنترل عفونت ارائه و مصوبه‌اش در همین سامانه ثبت شده، مسئول: کارشناس کنترل عفونت',
    help:'موارد نیازمند تصمیم را در کمیته کنترل عفونت مطرح و مصوبه‌اش را همین‌جا ثبت کنید. برای هماهنگی بین‌بخشی از «پیام‌های داخلی» استفاده کنید.'},

  breastfeeding_specialist:{
    who:'شما کارشناس ترویج تغذیه با شیر مادر هستید. دامنه‌ی کار شما در این سامانه کوچک اما بسیار مشخص است: محور مراقبت مادر و نوزاد. کار شما اثبات این است که برنامه‌ی ترویج شیر مادر واقعاً اجرا می‌شود — آموزش مادران، حمایت پس از زایمان و مستندات آن.',
    why:'فقط محور مربوط به مادر و نوزاد به شما نشان داده می‌شود، چون سنجه‌های شیر مادر در کتاب دقیقاً زیر همین محور آمده است. محدود بودن فهرست شما یک محدودیت نیست، تمرکز است.',
    steps:[
      {p:'measures', t:'همه‌ی سنجه‌های محور خود را یک‌بار بخوانید', x:'تعدادشان کم است؛ می‌توانید در یک نشست همه را مرور و وضعیت واقعی هرکدام را ثبت کنید.'},
      {p:'documents', t:'مواد آموزشی مادران را در کتابخانه دیجیتال بارگذاری کنید', x:'پمفلت و محتوای آموزشی، شاهدِ آماده‌ی چند سنجه است.'},
      {p:'activities', t:'جلسات آموزش مادران را ثبت کنید', x:'با تاریخ و تعداد شرکت‌کننده، تا گزارش دوره‌ای‌تان خودکار ساخته شود.'},
    ],
    ev:'فایل بارگذاری‌شده: پمفلت آموزش تغذیه با شیر مادر ویرایش ۱۴۰۳ + اسکن لیست آموزش مادران بستری — توضیح: مسئول آموزش: کارشناس شیر مادر',
    help:'برای موضوعات مشترک با بخش زایمان و نوزادان، به مدیر خدمات پرستاری پیام بدهید. اگر سنجه‌ای مربوط به کار شماست ولی آن را نمی‌بینید، به مدیر داخلی اطلاع دهید.'},

  staff_nurse:{
    who:'شما پرستار بالینی هستید. لازم نیست چیزی از اعتباربخشی بدانید تا بتوانید با این سامانه کار کنید. سهم شما ساده است: سنجه‌های مربوط به مراقبت بخش خودتان را <b>ببینید</b> تا بدانید از شما چه انتظاری می‌رود، و هر خطا یا اتفاق نزدیک‌به‌خطا را گزارش کنید. ثبت و تأیید وضعیت سنجه‌ها کار سرپرستار و سوپروایزر است، نه شما.',
    why:'شما محورهای مراقبت عمومی بالینی و پیشگیری و کنترل عفونت را <b>فقط برای مطالعه</b> می‌بینید — یعنی همان چیزهایی که مستقیماً به کار بالینی شما ربط دارد. اینکه دکمه‌ی ثبت وضعیت را ندارید یک ایراد نیست؛ عمدی است تا مسئولیت ثبت روشن بماند.',
    steps:[
      {p:'measures', t:'چند سنجه‌ی مراقبت بالینی را باز کنید و «◈ راهنمای تکمیل» را بخوانید', x:'همان‌جا نوشته ارزیاب در روز بازدید از پرستار بخش چه می‌پرسد و چه چیزی را در پرونده نگاه می‌کند. این مفیدترین ده دقیقه‌ی کار شما با این سامانه است.'},
      {p:'errors', t:'اگر خطایی دیدید یا مرتکب شدید، همین‌جا ثبت کنید', x:'می‌توانید بدون نام ثبت کنید. هدف سامانه پیدا کردن مقصر نیست؛ خطاهایی که گزارش نمی‌شوند دوباره تکرار می‌شوند.'},
      {p:'inbox', t:'کارتابل خود را ببینید', x:'اگر سرپرستار یا سوپروایزر کاری را به شما ارجاع داده باشد، آنجا ظاهر می‌شود.'},
    ],
    ev:'برای شما لازم نیست شواهد ثبت کنید. اما اگر سرپرستارتان از شما مدرکی خواست، تصویر خودِ مدرک را تحویل دهید تا در سامانه بارگذاری شود — مثلاً اسکن «فرم مراقبت روزانه بیمار تخت ۷ مورخ ۱۴۰۳/۰۲/۱۹»، نه فقط نشانی پرونده.',
    help:'اولین نفر برای هر سؤالی، سرپرستار بخش شماست و بعد سوپروایزر بالینی. برای سؤال درباره‌ی خودِ سامانه (رمز، دسترسی، خطای صفحه) از «پیام‌های داخلی» به مدیر داخلی پیام بدهید.'},

  anonymous_reporter:{
    who:'شما فقط برای ثبت گزارش خطا وارد این سامانه شده‌اید. به کتاب سنجه‌ها و سایر بخش‌ها دسترسی ندارید و لازم هم نیست داشته باشید.',
    why:'به‌جز فرم گزارش خطا چیزی نمی‌بینید؛ این عمدی است تا گزارش‌دهی ساده و بی‌دغدغه بماند.',
    steps:[{p:'errors', t:'فرم گزارش خطا را باز کنید', x:'فقط آنچه دیده‌اید را بنویسید: چه چیزی، کجا، چه زمانی. نام بردن از افراد لازم نیست.'}],
    ev:'شواهدی از شما خواسته نمی‌شود.',
    help:'نیازی به پیگیری از سوی شما نیست؛ کمیته ایمنی بیمار گزارش را بررسی می‌کند.'},

  _default:{
    who:'برای نقش شما هنوز راهنمای اختصاصی نوشته نشده است (این نقش، نقشی سفارشی است که در همین بیمارستان تعریف شده). اما قاعده‌ی کار برای همه یکسان است: سامانه فقط بخش‌هایی از کتاب اعتباربخشی را به شما نشان می‌دهد که مسئولش هستید؛ کار شما این است که وضعیت واقعی هر سنجه را ثبت کنید و بگویید مدرکش کجاست.',
    why:'فهرست محورهای شما را مدیر سامانه هنگام ساخت این نقش تعیین کرده است. اگر محوری را می‌بینید که به کار شما ربط ندارد — یا برعکس، محوری که مال شماست را نمی‌بینید — این یک تنظیم قابل اصلاح است، نه خطای سامانه.',
    steps:[
      {p:'measures', t:'فهرست محورهای خود را در «سنجه‌ها و ارزیابی» ببینید', x:'اولین کار: بخوانید که چه چیزی به شما سپرده شده. پرکردن بعد از فهمیدن می‌آید.'},
      {p:'measures', t:'برای یک سنجه، «◈ راهنمای تکمیل» را باز کنید', x:'آنجا فهرست اقدامات و مدارکی که ارزیاب می‌خواهد نوشته شده؛ همین متن، شرح وظیفه‌ی عملی شماست.'},
      {p:'messages', t:'اگر دامنه‌ی کارتان درست نیست، اطلاع دهید', x:'از «پیام‌های داخلی» به مدیر بهبود کیفیت یا مدیر داخلی پیام بدهید تا نقش‌تان اصلاح شود.'},
    ],
    ev:'فایل بارگذاری‌شده: [نوع مدرک] شماره [عدد] مورخ [تاریخ] (تصویر/PDF امضاشده) — توضیح: مسئول اجرا: [سمت]',
    help:'مدیر بهبود کیفیت مرجع سؤال‌های محتوایی است و مدیر داخلی مرجع مشکلات دسترسی و ورود. هر دو از «پیام‌های داخلی» در دسترس‌اند.'},
};
// کدهای هم‌معنا (جدول roles در بیمارستان‌های مختلف ممکن است هرکدام را داشته باشد)
ROLE_GUIDES.hospital_admin = ROLE_GUIDES.admin;
ROLE_GUIDES.quality_manager = ROLE_GUIDES.quality_control_manager;
ROLE_GUIDES.infection_supervisor = ROLE_GUIDES.infection_control_supervisor;
ROLE_GUIDES.breastfeeding = ROLE_GUIDES.breastfeeding_specialist;
ROLE_GUIDES.head_nurse = ROLE_GUIDES.clinical_supervisor;

function roleGuide(){ return ROLE_GUIDES[S.user && S.user.role_code] || ROLE_GUIDES._default; }
function rgKey(){ return 'roleguide_seen_'+((S.user&&S.user.role_code)||'x'); }
function rgSeen(){ try{ return !!localStorage.getItem(rgKey()); }catch(e){ return false; } }
function rgDismiss(){
  try{ localStorage.setItem(rgKey(),'1'); }catch(e){}
  toast('راهنما دیگر خودکار باز نمی‌شود — هر وقت خواستید از منوی «راهنمای نقش من» برگردید');
  renderRoleGuide(true);   // روی همان بخش آخر بمان، از اول شروع نکن
}

// راهنما به‌جای یک صفحه‌ی بلندِ اسکرول‌شونده، بخش‌به‌بخش نشان داده می‌شود.
// این شماره‌ی بخشِ جاری است (۰ تا ۵)؛ ورود دوباره از منو آن را صفر می‌کند.
let rgStep=0;
function rgGo(i){
  const n=rgSections().length;
  rgStep=Math.max(0,Math.min(n-1,i));
  renderRoleGuide(true);
  try{ window.scrollTo({top:0,behavior:'smooth'}); }catch(e){ window.scrollTo(0,0); }
}

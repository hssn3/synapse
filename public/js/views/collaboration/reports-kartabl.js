/**
 * Reports, Trends & Kartabl
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
function renderReports(){
  $('ptitle').textContent='گزارش و خروجی';
  const mine=myAxes(); const ms=[];
  mine.forEach(({sec,ax})=>ax.measures.forEach(m=>ms.push({...m,_sec:sec.title,_ax:ax.title})));
  const st=calc(ms); const byRole={};
  ms.forEach(m=>{ const r=ROLE_FA[m.responsible_role]||'—'; byRole[r]=byRole[r]||{t:0,f:0}; byRole[r].t++;
    if(statusOf(m.id)==='full_compliant') byRole[r].f++; });

  // گزارش هم روی کاغذ رسمی چاپ می‌شود؛ سربرگ در thead می‌نشیند تا روی
  // هر صفحه تکرار شود (فهرست اقدامات باقی‌مانده معمولاً چندصفحه‌ای است).
  $('content').innerHTML=`
  <table class="psheet">
  <thead><tr><td>${docLetterhead(`گزارش آمادگی اعتباربخشی — سال ${fa(S.year||todayJalali().jy)}`)}</td></tr></thead>
  <tfoot><tr><td><div class="psheet-foot"><span>${esc((S.user&&S.user.hospital_name)||'')}</span>
    <span>گزارش آمادگی اعتباربخشی</span></div></td></tr></tfoot>
  <tbody><tr><td>
  <div class="stats">
    <div class="st g gold"><div class="l">آمادگی کلی برای بازرسی</div><div class="v">${fa(st.wpct)}٪</div>
      <div class="bar"><i class="bf-gd" style="width:${st.wpct}%"></i></div></div>
    <div class="st g"><div class="l">تکمیل‌شده بدون مدرک ثبتی</div>
      <div class="v">${fa(ms.filter(m=>statusOf(m.id)==='full_compliant'&&!S.notesMap[m.id]).length)}</div></div>
    <div class="st g"><div class="l">نیازمند اقدام</div><div class="v" style="color:var(--dn)">${fa(st.n+st.u)}</div></div>
  </div>
  <div class="panel g">
    <div class="phd"><div class="abadge">▤</div><div><h3>عملکرد به تفکیک مسئول</h3>
      <div class="sub">برای پیگیری از هر نقش</div></div>
      <div style="margin-right:auto;display:flex;gap:8px">
        <button class="btn btn-o btn-sm" onclick="exportCSV()">⤓ خروجی CSV</button>
        <a class="btn btn-o btn-sm" href="/api/export/measures.xlsx?year=${S.year||todayJalali().jy}" download="measures.xlsx">⤓ خروجی xlsx</a>
        <button class="btn btn-g btn-sm" onclick="dpPrint()">⎙ چاپ</button></div></div>
    <div class="pbody"><div class="tbl-wrap"><table>
      <thead><tr><th>نقش مسئول</th><th>سنجه</th><th>تکمیل</th><th>درصد</th><th></th></tr></thead>
      <tbody>${Object.entries(byRole).sort((a,b)=>b[1].t-a[1].t).map(([r,v])=>{
        const p=Math.round(v.f/v.t*100);
        return `<tr><td style="color:var(--th)">${esc(r)}</td><td>${fa(v.t)}</td><td>${fa(v.f)}</td>
        <td style="color:var(--gdl);font-weight:700">${fa(p)}٪</td>
        <td><span class="mini-bar" style="width:80px;display:inline-block"><i style="width:${p}%"></i></span></td></tr>`;
      }).join('')}</tbody></table></div></div>
  </div>
  <div class="panel g">
    <div class="phd"><div class="abadge">!</div><div><h3>اقدامات باقی‌مانده</h3>
      <div class="sub">آنچه پیش از بازرسی باید تکمیل شود</div></div></div>
    <div class="pbody"><div class="tbl-wrap"><table>
      <thead><tr><th>کد</th><th>محور</th><th>سنجه</th><th>مسئول</th><th>سطح</th></tr></thead>
      <tbody>${ms.filter(m=>statusOf(m.id)!=='full_compliant').slice(0,60).map(m=>
        `<tr><td style="color:var(--gdl);white-space:nowrap">${esc(m.code)}</td><td style="white-space:nowrap">${esc(m._ax)}</td>
        <td>${esc(fixText(m.statement)).slice(0,70)}…</td><td style="white-space:nowrap">${ROLE_FA[m.responsible_role]||'—'}</td>
        <td><span class="bdg b${m.measure_level||1}">${fa(m.measure_level||1)}</span>${m.patient_safety_flag?' <span class="bdg bsf">✦</span>':''}</td></tr>`).join('')}
      </tbody></table></div>
      <div style="margin-top:12px;font-size:11px;color:var(--td)">نمایش ۶۰ مورد اول — فهرست کامل در خروجی CSV.</div></div>
  </div>
  <div class="panel g" id="trendPanel"><div class="empty">در حال بارگذاری نمودار روند…</div></div>
  </td></tr></tbody></table>`;
  loadTrend();
}

// ==================== نمودار روند ثبت‌ها ====================
// بدون کتابخانه: میله‌ها روی canvas رسم می‌شوند + جدول اعداد کامل زیر نمودار (برای خواندن دقیق و چاپ).
// سال اصلی طلایی، سال مقایسه خاکستری.
const TREND = { period:'month', year:null, compare:'', metric:'all', data:null };
const TREND_METRICS = [
  ['minutes','صورت‌جلسه'],['meetings','جلسه کمیته'],['checklists','تکمیل چک‌لیست'],
  ['activities','ثبت فعالیت'],['errors','گزارش خطا'],['fmea','FMEA'],['audits','حسابرسی'],
];
const TREND_PERIOD_FA = { month:'ماهانه', quarter:'سه‌ماهه', year:'سالانه' };

async function loadTrend(){
  if(TREND.year===null) TREND.year = S.year || todayJalali().jy;
  try{ TREND.data = await API.reportsTrend(TREND.period, TREND.year, TREND.compare||null); }
  catch(e){ const el=$('trendPanel'); if(el) el.innerHTML='<div class="empty">خطا در دریافت نمودار: '+esc(e.message)+'</div>'; return; }
  drawTrend();
}
// تغییر «متریک» فقط روی داده‌ی موجود اثر دارد و نیازی به رفت‌وبرگشت سرور ندارد
function trendSet(k,v){ TREND[k] = (k==='year') ? +v : v; if(k==='metric') drawTrend(); else loadTrend(); }

function trendSum(b){ return TREND_METRICS.reduce((a,[k])=>a+(b[k]||0),0); }
function trendVal(b){ return TREND.metric!=='all' ? (b[TREND.metric]||0) : trendSum(b); }

function drawTrend(){
  const el=$('trendPanel'); if(!el||!TREND.data) return;
  const d=TREND.data, main=d.buckets||[], cmp=(d.compare&&d.compare.buckets)||null;
  const cur=todayJalali().jy;
  let yOpts=''; for(let y=cur+1;y>=cur-4;y--) yOpts+='<option value="'+y+'"'+(y===TREND.year?' selected':'')+'>'+fa(y)+'</option>';
  let cOpts='<option value="">بدون مقایسه</option>';
  for(let y=cur+1;y>=cur-4;y--) if(y!==TREND.year) cOpts+='<option value="'+y+'"'+(String(y)===String(TREND.compare)?' selected':'')+'>'+fa(y)+'</option>';
  let pOpts=''; Object.entries(TREND_PERIOD_FA).forEach(([k,v])=>{ pOpts+='<option value="'+k+'"'+(k===TREND.period?' selected':'')+'>'+v+'</option>'; });
  let mOpts='<option value="all"'+(TREND.metric==='all'?' selected':'')+'>همه‌ی ثبت‌ها</option>';
  TREND_METRICS.forEach(([k,t])=>{ mOpts+='<option value="'+k+'"'+(k===TREND.metric?' selected':'')+'>'+t+'</option>'; });

  const total=main.reduce((a,b)=>a+trendVal(b),0);
  const cmpTotal=cmp?cmp.reduce((a,b)=>a+trendVal(b),0):null;

  el.innerHTML =
   '<div class="phd"><div class="abadge">📈</div><div><h3>نمودار روند ثبت‌ها</h3>'+
     '<div class="sub">'+TREND_PERIOD_FA[TREND.period]+' — سال '+fa(TREND.year)+' · مجموع '+fa(total)+' ثبت'+
     (cmpTotal!==null?' (سال '+fa(d.compare.year)+': '+fa(cmpTotal)+')':'')+'</div></div>'+
     '<div style="margin-right:auto;display:flex;gap:8px;flex-wrap:wrap">'+
       '<select onchange="trendSet(\'period\',this.value)">'+pOpts+'</select>'+
       '<select onchange="trendSet(\'year\',this.value)">'+yOpts+'</select>'+
       '<select onchange="trendSet(\'compare\',this.value)">'+cOpts+'</select>'+
       '<select onchange="trendSet(\'metric\',this.value)">'+mOpts+'</select>'+
     '</div></div>'+
   '<div class="pbody">'+
     '<div style="display:flex;gap:16px;font-size:11.5px;color:var(--td);margin-bottom:8px">'+
       '<span><i style="display:inline-block;width:11px;height:11px;background:var(--gd,#c9a227);border-radius:2px;vertical-align:-1px"></i> سال '+fa(TREND.year)+'</span>'+
       (cmp?'<span><i style="display:inline-block;width:11px;height:11px;background:#9aa0a6;border-radius:2px;vertical-align:-1px"></i> سال '+fa(d.compare.year)+'</span>':'')+
     '</div>'+
     '<div style="overflow-x:auto"><canvas id="trendCv" height="260" style="width:100%;min-width:560px;display:block"></canvas></div>'+
     ((total===0&&!cmpTotal)?'<div class="empty">در این بازه ثبتی وجود ندارد</div>':'')+
     '<div class="tbl-wrap" style="margin-top:14px"><table><thead><tr><th>بازه</th>'+
       TREND_METRICS.map(([,t])=>'<th>'+t+'</th>').join('')+'<th>جمع</th>'+
       (cmp?'<th style="color:#9aa0a6">جمع '+fa(d.compare.year)+'</th>':'')+'</tr></thead><tbody>'+
       main.map((b,i)=>'<tr><td style="white-space:nowrap;color:var(--gdl)">'+esc(b.label)+'</td>'+
         TREND_METRICS.map(([k])=>'<td>'+fa(b[k]||0)+'</td>').join('')+
         '<td><b>'+fa(trendSum(b))+'</b></td>'+
         (cmp?'<td style="color:#9aa0a6">'+fa(cmp[i]?trendSum(cmp[i]):0)+'</td>':'')+
         '</tr>').join('')+
     '</tbody></table></div></div>';

  paintTrendCanvas(main, cmp);
}

// رسم دستی میله‌ها (بدون کتابخانه). اندازه‌ی بوم با devicePixelRatio بالا می‌رود تا روی صفحه‌ی رتینا تار نشود.
function paintTrendCanvas(main, cmp){
  const cv=$('trendCv'); if(!cv) return;
  const dpr=window.devicePixelRatio||1;
  const cssW=cv.clientWidth||600, cssH=260;
  cv.width=Math.round(cssW*dpr); cv.height=Math.round(cssH*dpr);
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0);
  g.clearRect(0,0,cssW,cssH);

  const padL=34, padR=10, padT=14, padB=34;
  const W=cssW-padL-padR, H=cssH-padT-padB;
  const vals=main.map(trendVal), cvals=cmp?cmp.map(trendVal):null;
  const max=Math.max(1, ...vals, ...(cvals||[0]));
  // سقف محور را به مضرب گرد بالا می‌بریم تا برچسب خطوط راهنما همیشه عدد صحیح باشد
  const stepV=Math.max(1, Math.ceil(max/4)), top=stepV*4;

  const css=getComputedStyle(document.body);
  const gold=(css.getPropertyValue('--gd')||'').trim()||'#c9a227';
  const grid='rgba(128,128,128,.22)';
  const txt=(css.getPropertyValue('--td')||'').trim()||'#888';

  g.font='10px Tahoma, sans-serif'; g.textBaseline='middle';
  for(let i=0;i<=4;i++){
    const v=stepV*i, y=padT+H-(v/top)*H;
    g.strokeStyle=grid; g.beginPath(); g.moveTo(padL,y); g.lineTo(padL+W,y); g.stroke();
    g.fillStyle=txt; g.textAlign='right'; g.fillText(fa(v), padL-5, y);
  }

  const n=main.length||1, slot=W/n;
  const pair=!!cmp, bw=Math.min(pair?slot*0.30:slot*0.52, 30);
  for(let i=0;i<n;i++){
    // چیدمان راست‌به‌چپ: اولین بازه (فروردین / سه‌ماهه ۱) سمت راست می‌نشیند
    const center=padL+W-(i+0.5)*slot;
    const bar=(v,cx,color)=>{ const h=(v/top)*H; if(h>0){ g.fillStyle=color; g.fillRect(cx-bw/2, padT+H-h, bw, h); } };
    if(pair){ bar(vals[i], center-bw*0.6, gold); bar(cvals[i], center+bw*0.6, '#9aa0a6'); }
    else bar(vals[i], center, gold);
    g.fillStyle=txt; g.textAlign='center';
    g.fillText(main[i].label, center, padT+H+12);
  }
}
function exportCSV(){
  const rows=[['کد','بخش','محور','استاندارد','سنجه','سطح','ایمنی بیمار','مسئول','وضعیت','مدرک','صفحه']];
  const FAST={not_reviewed:'بررسی‌نشده',non_compliant:'عدم انطباق',partial:'انطباق نسبی',full_compliant:'انطباق کامل'};
  myAxes().forEach(({sec,ax})=>ax.measures.forEach(m=>{
    rows.push([m.code,sec.title,ax.title,m._std,fixText(m.statement),m.measure_level||1,
      m.patient_safety_flag?'بله':'خیر',ROLE_FA[m.responsible_role]||'—',
      FAST[statusOf(m.id)],(S.notesMap[m.id]||'').replace(/\n/g,' '),m.page||'']);
  }));
  const csv='\uFEFF'+rows.map(r=>r.map(c=>`"${String(c==null?'':c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  a.download='گزارش-اعتباربخشی.csv'; a.click();
  toast('فایل CSV دانلود شد');
}

// ==================== کارتابل من (kartabl) ====================
// اقلامِ «در انتظار اقدام شما» از /api/inbox می‌آید (وظیفه، امضای سند، حسابرسی، جلسه پیش‌رو)
// و اگر جانشین کسی باشید، اقلام او هم با برچسب «به‌جای …» در همین فهرست می‌آید.
const INBOX_ICON={task:'✔', signoff:'✍', audit:'⚖', meeting:'🗓', reminder:'⏰', checklist:'☑'};
async function renderInbox(){
  $('ptitle').textContent='کارتابل من';
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const [inb, del, col] = await Promise.all([API.inbox(), API.delegates(), API.colleagues()]);
    const items=inb.items||[];
    $('content').innerHTML=`
    <div class="panel g">
      <div class="phd"><div class="abadge">✉</div><div><h3>در انتظار اقدام شما</h3>
        <div class="sub">${fa(inb.own_count||0)} مورد شخصی${inb.delegated_count?` · ${fa(inb.delegated_count)} مورد به‌عنوان جانشین`:''}</div></div></div>
      <div class="pbody">
        ${!items.length?'<div class="empty"><div class="ei">✓</div>کارتابل شما خالی است</div>':`
        <div class="tbl-wrap"><table><thead><tr><th>نوع</th><th>عنوان</th><th>توضیح</th><th>تاریخ</th><th></th></tr></thead><tbody>
        ${items.map(it=>`<tr>
          <td style="white-space:nowrap">${INBOX_ICON[it.type]||'•'} ${esc(it.type_fa)}</td>
          <td>${esc(it.title||'—')}${it.on_behalf_of?` <span class="bdg b2">به‌جای ${esc(it.on_behalf_of)}</span>`:''}</td>
          <td style="color:var(--td)">${esc(it.detail_label||'')}${it.detail_date?' '+faDateISO(it.detail_date):''}${!it.detail_label&&!it.detail_date?'—':''}</td>
          <td style="white-space:nowrap;color:var(--gdl)">${faDateTime(it.created_at)}</td>
          <td style="white-space:nowrap"><button class="btn btn-sm" onclick="go('${it.page}')">مشاهده</button>
            ${it.type==='reminder'?`<button class="tgl" onclick="reminderDone('${esc(it.dedupe_key)}')" title="این یادآوری دیگر نمایش داده نشود">انجام شد ✓</button>
              <button class="tgl" onclick="reminderSnooze('${esc(it.dedupe_key)}')" title="۷ روز دیگر دوباره یادآوری شود">بعداً ◷</button>`:''}
          </td></tr>`).join('')}
        </tbody></table></div>`}
      </div>
    </div>
    <div class="panel gs">
      <div class="phd"><div class="abadge">⇄</div><div><h3>جانشین من</h3>
        <div class="sub">در بازه‌ی مرخصی/مأموریت، اقلام کارتابل شما برای همکار انتخابی هم دیده می‌شود</div></div></div>
      <div class="pbody">
        ${!(del.delegates||[]).length?'<div class="empty">جانشینی تعریف نشده</div>':`
        <div class="tbl-wrap"><table><thead><tr><th>جانشین</th><th>از</th><th>تا</th><th></th></tr></thead><tbody>
        ${del.delegates.map(d=>`<tr><td>${esc(d.delegate_name)}</td><td style="color:var(--gdl)">${faDateISO(d.starts_at)}</td>
          <td style="color:var(--gdl)">${faDateISO(d.ends_at)}</td>
          <td><button class="btn btn-sm" onclick="removeDelegate('${d.id}')">حذف</button></td></tr>`).join('')}
        </tbody></table></div>`}
        <div style="margin-top:16px;padding:16px 18px;border-radius:12px;background:var(--subpanel);border:1px solid var(--bd)">
          <div style="font-size:12.5px;color:var(--gdl);font-weight:700;margin-bottom:12px">تعیین جانشین جدید</div>
          <div style="display:grid;grid-template-columns:1.6fr 1.4fr 1.4fr;gap:12px">
            <div class="fg"><label>همکار جانشین</label><select id="dg_user" class="sel">
              ${(col.users||[]).map(u=>`<option value="${u.id}">${esc(u.full_name)}${u.department?' — '+esc(u.department):''}</option>`).join('')}</select></div>
            <div class="fg"><label>از تاریخ</label>${jalaliDateInputHtml('dg_from')}</div>
            <div class="fg"><label>تا تاریخ</label>${jalaliDateInputHtml('dg_to')}</div>
          </div>
          <button class="btn btn-g" onclick="addDelegate()">ثبت جانشین</button>
        </div>
        ${(del.delegated_to_me||[]).length?`<div style="margin-top:14px;font-size:12px;color:var(--td)">
          شما جانشین این افراد هستید: ${del.delegated_to_me.map(d=>esc(d.owner_name)+' ('+faDateISO(d.starts_at)+' تا '+faDateISO(d.ends_at)+')').join('، ')}</div>`:''}
      </div>
    </div>`;
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}
// «انجام شد» / «بعداً» روی اقلام یادآوری — بج منو هم بلافاصله به‌روز می‌شود چون
// همان اقلام کارتابل را می‌شمارد
async function reminderDone(key){
  try{ await API.reminderDone(key); toast('یادآوری بسته شد'); renderInbox(); refreshNavBadges(); }
  catch(e){ toast(e.message,true); }
}
async function reminderSnooze(key){
  try{ const r=await API.reminderSnooze(key,7); toast('تا '+faDateISO(r.until)+' یادآوری نمی‌شود'); renderInbox(); refreshNavBadges(); }
  catch(e){ toast(e.message,true); }
}

async function addDelegate(){
  const body={delegate_user_id:$('dg_user').value, starts_at:readJalaliDateInput('dg_from'), ends_at:readJalaliDateInput('dg_to')};
  if(!body.delegate_user_id){ toast('همکاری برای جانشینی انتخاب کنید',true); return; }
  try{ await API.createDelegate(body); toast('جانشین ثبت شد'); renderInbox(); }
  catch(e){ toast(e.message,true); }
}
async function removeDelegate(id){
  try{ await API.deleteDelegate(id); toast('جانشین حذف شد'); renderInbox(); }
  catch(e){ toast(e.message,true); }
}

// ==================== تنظیمات بیمارستان ====================
// همان فیلدهای ویزارد راه‌اندازی اولیه، این‌بار برای ویرایش بعد از تکمیل — تا اطلاعاتی
// که یک‌بار در ویزارد وارد شده در سامانه «قفل» نشود.
const HOSP_TYPES=['عمومی','خصوصی','تخصصی','فوق‌تخصصی','آموزشی-درمانی','بهداشتی-درمانی'];
// ==================== پروفایل من ====================
// صفحه‌ی کوچک شخصی: نمایش نام/نقش/بیمارستان کاربر واردشده + تغییر رمز عبور خودش.
// اطلاعات کاربر از S.user (همان‌که در ورود گرفته شده) — درخواست شبکه‌ی جدید لازم نیست.
function renderProfile(){
  $('ptitle').textContent='پروفایل من';
  const u=S.user||{};
  const initial=(u.full_name||'؟').replace(/^(دکتر|خانم|آقای|مهندس)\s+/,'').charAt(0);
  const avatarHtml=u.avatar_file?`<img src="/api/profile/avatar/${encodeURIComponent(u.avatar_file)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:esc(initial);
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge" style="overflow:hidden;padding:0">${avatarHtml}</div><div><h3>${esc(u.full_name||'')}</h3>
      <div class="sub">${esc(ROLE_FA[u.role_code]||u.role_title||'')} — ${esc(u.hospital_name||'')}</div></div></div>
    <div class="pbody">
      <div class="docgrid">
        <div class="fg"><label>نام و نام‌خانوادگی</label><input value="${esc(u.full_name||'')}" disabled></div>
        <div class="fg"><label>نام کاربری</label><input value="${esc(u.username||'')}" disabled dir="ltr" style="text-align:left"></div>
        <div class="fg"><label>نقش</label><input value="${esc(ROLE_FA[u.role_code]||u.role_title||'')}" disabled></div>
      </div>
    </div>
  </div>
  ${u.profile_fields_enabled?`
  <div class="panel g" style="margin-top:16px">
    <div class="phd"><div class="abadge">◎</div><div><h3>اطلاعات شخصی پروفایل</h3>
      <div class="sub">این اطلاعات اختیاری‌اند و فقط توسط خودتان قابل ویرایش‌اند</div></div></div>
    <div class="pbody">
      <div class="fg"><label>عکس پروفایل</label>
        <input id="pf_avatar" type="file" accept="image/png,image/jpeg,image/webp" onchange="submitAvatarUpload(this.files[0])">
      </div>
      <div class="docgrid">
        <div class="fg"><label>پیشوند احترامی</label><select id="pf_prefix" class="sel">
          <option value="">— بدون پیشوند —</option>
          <option value="خانم"${u.title_prefix==='خانم'?' selected':''}>خانم</option>
          <option value="آقای"${u.title_prefix==='آقای'?' selected':''}>آقای</option>
          <option value="دکتر"${u.title_prefix==='دکتر'?' selected':''}>دکتر</option>
          <option value="مهندس"${u.title_prefix==='مهندس'?' selected':''}>مهندس</option>
          <option value="سرکار خانم"${u.title_prefix==='سرکار خانم'?' selected':''}>سرکار خانم</option>
          <option value="جناب آقای"${u.title_prefix==='جناب آقای'?' selected':''}>جناب آقای</option>
          <option value="استاد"${u.title_prefix==='استاد'?' selected':''}>استاد</option>
        </select></div>
        <div class="fg"><label>جنسیت</label><select id="pf_gender" class="sel">
          <option value="">— تعیین‌نشده —</option>
          <option value="male"${u.gender==='male'?' selected':''}>آقا</option>
          <option value="female"${u.gender==='female'?' selected':''}>خانم</option>
        </select></div>
        <div class="fg"><label>نحوه‌ی تماس ترجیحی</label><input id="pf_contact" maxlength="200" value="${esc(u.contact_method||'')}" placeholder="مثلاً: تلفن داخلی ۱۲۳ یا ایمیل"></div>
      </div>
      <div class="fg"><label>بیو</label><textarea id="pf_bio" maxlength="500" rows="3" style="width:100%;padding:11px 15px;border-radius:10px;background:var(--subpanel-2);border:1px solid var(--bd);color:var(--th)">${esc(u.bio||'')}</textarea></div>
      <button class="btn btn-g" onclick="submitProfileInfo()">ذخیره اطلاعات شخصی</button>
    </div>
  </div>`:''}
  <div class="panel g" style="margin-top:16px">
    <div class="phd"><div class="abadge">⚿</div><div><h3>تغییر رمز عبور</h3>
      <div class="sub">رمز عبور فعلی و رمز جدید خود را وارد کنید</div></div></div>
    <div class="pbody">
      <div class="docgrid">
        <div class="fg"><label>رمز فعلی</label><input id="pf_cur" type="password" dir="ltr" style="text-align:left"></div>
        <div class="fg"><label>رمز جدید</label><input id="pf_new" type="password" dir="ltr" style="text-align:left" minlength="6"></div>
        <div class="fg"><label>تکرار رمز جدید</label><input id="pf_new2" type="password" dir="ltr" style="text-align:left" minlength="6"></div>
      </div>
      <button class="btn btn-g" onclick="submitChangePassword()">ثبت رمز جدید</button>
    </div>
  </div>`;
}
async function submitProfileInfo(){
  const gender=$('pf_gender').value,
        title_prefix=$('pf_prefix')?$('pf_prefix').value:'',
        bio=$('pf_bio').value,
        contact_method=$('pf_contact').value;
  try{
    const {profile}=await API.updateMyProfile({gender, title_prefix, bio, contact_method});
    Object.assign(S.user, profile);
    toast('اطلاعات شخصی ذخیره شد');
    const pt = $('ptitle');
    if(pt && S.page === 'dash') pt.textContent = getUserDashboardTitle();
    const un = document.querySelector('.uchip .un');
    if(un){
      const pfx = getUserTitlePrefix(S.user);
      un.textContent = pfx && !S.user.full_name.startsWith(pfx) ? `${pfx} ${S.user.full_name}` : S.user.full_name;
    }
  }catch(e){ toast(e.message,true); }
}
async function submitAvatarUpload(file){
  if(!file) return;
  try{
    const {avatar_file}=await API.uploadAvatar(file);
    S.user.avatar_file=avatar_file;
    toast('عکس پروفایل به‌روزرسانی شد');
    renderProfile();
  }catch(e){ toast(e.message,true); }
}
async function submitChangePassword(){
  const cur=$('pf_cur').value, n1=$('pf_new').value, n2=$('pf_new2').value;
  if(!cur||!n1){ toast('رمز فعلی و رمز جدید را وارد کنید',true); return; }
  if(n1!==n2){ toast('رمز جدید و تکرار آن یکسان نیستند',true); return; }
  if(n1.length<6){ toast('رمز جدید باید حداقل ۶ کاراکتر باشد',true); return; }
  try{
    await API.changePassword(cur,n1);
    toast('رمز عبور با موفقیت تغییر کرد');
    $('pf_cur').value=''; $('pf_new').value=''; $('pf_new2').value='';
  }catch(e){ toast(e.message,true); }
}

// ==================== بانک دانش دانا ====================
// گردش تأیید پاسخهای دانا: draft → تأییدِ صاحبِ مدارک → confirmed (سرو به دانا).
// جای آن اینجا است نه پنل سوپرادمین: بازبینِ درست، مالکِ مدارکِ همان مرکز است
// (ادمین/مدیر اعتباربخشی/مدیر کنترل کیفیت — همه manage_documents دارند).
let KNF='confirmed';
function renderKnowledge(){
  $('ptitle').textContent='بانک دانش دانا';
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  API.knowledgeList(KNF).then(kn=>{
    const items=kn.items||[], counts=kn.counts||{};
    $('content').innerHTML=`
    <div class="panel g">
      <div class="phd"><div class="abadge">📚</div><div><h3>بانک دانش دانا</h3>
        <div class="sub">پاسخهای دانا تا تأییدِ انسان سرو نمیشوند؛ تأییدشدهها به منبع «دانش تأییدشده» میروند</div></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${[['confirmed','تأییدشده'],['draft','در انتظار تأیید'],['rejected','ردشده']].map(([k,l])=>
            `<button class="btn btn-sm ${KNF===k?'btn-g':'btn-o'}" onclick="knFilter('${k}')">${l} (${fa(counts[k]||0)})</button>`).join('')}
        </div></div>
      <div class="pbody">
        ${items.length?items.map(k=>`
          <div style="border:1px solid var(--bd);border-radius:10px;padding:10px 12px;margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap">
              <b>${esc(k.title)}</b>
              <span class="bdg ${k.status==='draft'?'b2':''}">${k.status==='draft'?'در انتظار تأیید':k.status==='confirmed'?'تأییدشده':'ردشده'}</span></div>
            <div style="font-size:12.5px;color:var(--td);margin-top:6px;white-space:pre-wrap">${esc(String(k.content||'').slice(0,420))}${String(k.content||'').length>420?'…':''}</div>
            <div style="font-size:11.5px;color:var(--mut);margin-top:6px">${esc(k.created_by_name||'—')} · ${faDateTime(k.created_at)}</div>
            <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
              ${k.status!=='confirmed'?`<button class="btn btn-g btn-sm" onclick="knDecide('${k.id}','approve')">✓ تأیید</button>`:''}
              ${k.status!=='rejected'?`<button class="btn btn-o btn-sm" onclick="knDecide('${k.id}','reject')">✕ رد</button>`:''}
              <button class="btn btn-o btn-sm" onclick="knDecide('${k.id}','delete')">🗑 حذف کامل</button>
            </div>
          </div>`).join(''):'<div class="empty">موردی در این وضعیت نیست. پاسخهای مفیدِ دانا (بالای ۸۰ نویسه) خودکار همینجاdraft میشوند تا بازبینی شوند.</div>'}
      </div></div>`;
  }).catch(e=>{ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; });
}
function knFilter(f){ KNF=f; renderKnowledge(); }
async function knDecide(id, action){
  try{
    if(action==='approve') await API.knowledgeApprove(id);
    else if(action==='reject') await API.knowledgeReject(id);
    else { if(!await BTN.confirmDanger('این دانش برای همیشه حذف شود؟')) return; await API.knowledgeDelete(id); }
    toast(action==='approve'?'تأیید شد — از این پس به دانا سرو میشود':action==='reject'?'رد شد':'حذف شد');
    renderKnowledge();
  }catch(e){ toast(e.message,true); }
}

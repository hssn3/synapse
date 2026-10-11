/**
 * Core Data Loader & Features Matrix
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
async function enterApp(){
  const hospName = (S.user && S.user.hospital_name) ? S.user.hospital_name : 'بیمارستان نمونه شماره یک';
  const logoSrc = (S.user && S.user.hospital_has_logo) ? '/api/hospital/logo' : '/img/hospital-logo-sample.svg';

  $('root').innerHTML = `
    <div class="lux-boot-screen" id="bootScreen">
      <div class="lux-boot-card">
        <div class="lux-boot-logo-wrap">
          <img src="${logoSrc}" alt="نشان مرکز درمانی" class="lux-boot-logo-img" onerror="this.src='/img/hospital-logo-sample.svg'">
        </div>
        <div class="lux-boot-brand">سامانه نوین جامع اطلاعات بیمارستانی و اعتباربخشی</div>
        <div class="lux-boot-sub">در حال بروزرسانی و دریافت داده‌ها از سرور…</div>

        <div class="lux-boot-prog-row">
          <span class="lux-boot-pct" id="bootPct">35%</span>
          <div class="lux-boot-track">
            <div class="lux-boot-bar" id="bootBar" style="width: 35%"></div>
          </div>
        </div>

        <div class="lux-boot-steps">
          <div class="lux-boot-step done" id="bootStep1">
            <div class="lux-boot-step-icon">✓</div>
            <span class="lux-boot-step-label">اتصال به سرور</span>
          </div>
          <div class="lux-boot-step active" id="bootStep2">
            <div class="lux-boot-step-icon">⬇</div>
            <span class="lux-boot-step-label">دریافت داده‌ها</span>
          </div>
          <div class="lux-boot-step" id="bootStep3">
            <div class="lux-boot-step-icon">↻</div>
            <span class="lux-boot-step-label">به‌روزرسانی اطلاعات</span>
          </div>
        </div>

        <div class="lux-boot-info-pill">
          <span>ℹ</span>
          <span>از خاموش بودن فیلترشکن و پایداری شبکه مطمئن شوید</span>
        </div>

        <div class="lux-boot-bottom">
          <div class="lux-boot-spinner"></div>
          <span id="bootStatusText">لطفاً چند لحظه صبر کنید…</span>
        </div>
      </div>
    </div>
  `;

  function setBootProgress(pct, statusText, stepNum) {
    const pEl = $('bootPct');
    const bEl = $('bootBar');
    const sEl = $('bootStatusText');
    if (pEl) pEl.textContent = fa(pct) + '٪';
    if (bEl) bEl.style.width = pct + '%';
    if (sEl && statusText) sEl.textContent = statusText;
    if (stepNum >= 2) {
      const s2 = $('bootStep2'); if (s2) { s2.classList.add('done'); s2.classList.remove('active'); s2.querySelector('.lux-boot-step-icon').textContent = '✓'; }
      const s3 = $('bootStep3'); if (s3 && stepNum === 2) { s3.classList.add('active'); }
    }
    if (stepNum >= 3) {
      const s3 = $('bootStep3'); if (s3) { s3.classList.add('done'); s3.classList.remove('active'); s3.querySelector('.lux-boot-step-icon').textContent = '✓'; }
    }
  }

  try{
    // شبیه‌سازی گام‌های بارگذاری برای نمایش پیشرفت روان
    setTimeout(() => setBootProgress(68, 'دریافت سنجه‌ها و درخت اعتباربخشی…', 2), 200);

    // درخت سنجه‌ها فقط برای نقش‌های دارای مجوز سنجه واکشی می‌شود تا برای نقش‌های
    // با دسترسی محدود (مثل مسئول دفتر) خطای ۴۰۳ در کنسول ثبت نشود
    const uPerms = (S.user && S.user.permissions) || [];
    const canSeeTree = uPerms.includes('view_accreditation_full_tree') || uPerms.includes('edit_measure_status') || uPerms.includes('view_measure_status_readonly');
    const [t, st, ov, ft, sc] = await Promise.all([
      canSeeTree ? API.tree().catch(()=>({tree:[]})) : Promise.resolve({tree:[]}),
      API.statuses().catch(()=>({statuses:[]})),
      API.myOverrides().catch(()=>({grants:[],denies:[]})),
      API.hospitalFeatures().catch(()=>({features:{}})),
      API.scoring().catch(()=>({level_weights:{1:1,2:1,3:1}}))
    ]);

    setBootProgress(92, 'پیکربندی هوشمند دسترسی‌ها و کارتابل…', 3);

    // کلیدِ چتِ دانا از سوپرادمین می‌آید
    try{ DANA_CHAT_ENABLED = !!(await API.assistantStatus()).chat_enabled; }catch(e){ DANA_CHAT_ENABLED=false; }
    S.levelW = sc.level_weights || {1:1,2:1,3:1};
    S.ovGrants=new Set((ov.grants||[]).map(x=>x.id)); S.ovDenies=new Set((ov.denies||[]).map(x=>x.id));
    S.features=ft.features||{};
    buildIndex(t.tree||[]);
    (st.statuses||[]).forEach(x=>{ S.statusMap[x.measure_id]=x.status;
      if(x.notes) S.notesMap[x.measure_id]=x.notes;
      if(x.na_reason) S.naMap[x.measure_id]=x.na_reason;
      if(x.internal_status||x.external_status)
        S.revMap[x.measure_id]={i:x.internal_status||'', e:x.external_status||''}; });

    setBootProgress(100, 'ورود به سامانه…', 3);
    await new Promise(r => setTimeout(r, 220));

    renderGlobalHeader(); renderGlobalFooter();
    renderApp();
    startNumObserver();      // از این‌جا به بعد هر رقمِ رندرشده فارسی می‌شود
    maybeShowOnboarding();   // ویزارد راه‌اندازی اولیه — اگر پروفایل بیمارستان ناقص باشد
  }catch(e){
    $('root').innerHTML=`<div style="display:flex;align-items:center;justify-content:center;height:100vh">
      <div class="lcard g" style="max-width:420px;text-align:center">
        <div style="font-size:34px;margin-bottom:12px;color:var(--dn)">!</div>
        <div style="color:var(--th);margin-bottom:8px">خطا در بارگذاری داده‌ها</div>
        <div style="font-size:12px;color:var(--td);margin-bottom:16px">${esc(e.message)}</div>
        <button class="btn btn-o" onclick="logout()">بازگشت به ورود</button>
      </div></div>`;
  }
}

// درخت تخت -> ساختار بخش/محور/استاندارد/سنجه
function buildIndex(roots){
  S.tree=roots; S.byId={}; S.sections=[];
  const walk=(n,parent)=>{ S.byId[n.id]=n; n._parent=parent; (n.children||[]).forEach(c=>walk(c,n)); };
  roots.forEach(r=>walk(r,null));

  S.sections = roots.map(sec=>({
    id:sec.id, code:sec.code, title:fixText(sec.title||sec.code),
    axes:(sec.children||[]).map(ax=>{
      const standards=(ax.children||[]).filter(c=>c.level_type==='standard');
      const measures=[];
      standards.forEach(std=>{
        (std.children||[]).filter(c=>c.level_type==='measure').forEach(m=>measures.push({...m, _std:std.code}));
      });
      // سنجه‌هایی که مستقیم زیر محور آمده‌اند
      (ax.children||[]).filter(c=>c.level_type==='measure').forEach(m=>{
        const p=(m.code||'').split('-'); const guess=p.slice(0,-1).join('-');
        measures.push({...m, _std: standards.some(s=>s.code===guess)?guess:(standards[0]?.code||ax.code)});
      });
      return { id:ax.id, code:ax.code, title:fixText(ax.title||ax.code),
               standards:standards.map(s=>({id:s.id,code:s.code,title:fixText(s.statement||s.title||'')})),
               measures };
    })
  }));
}

// ---------- خواندن متن از عکس یا PDF ----------
// کارفرما: «کاربر عکس بگیره از یه صفحه، متن رو بخونه، بعد بذاره توی قسمت مورد
// نظر — مثلاً خط‌مشی». سند کاغذیِ موجود بزرگ‌ترین مانعِ شروع است؛ تایپِ دوباره‌ی
// یک خط‌مشیِ ده‌صفحه‌ای کاری است که هیچ‌کس انجام نمی‌دهد.
//
// متن **خودکار درج نمی‌شود**: اول نشان داده می‌شود و کاربر تصمیم می‌گیرد. سندِ
// نیمه‌خوانده‌شده نباید بی‌اجازه در پرونده بنشیند، و مدل ممکن است بخشی را
// [ناخوانا] برگردانده باشد که باید دیده شود.
let OCR_TARGET=null;
function ocrBar(targetId){
  return `<div class="ocrbar noprint">
    <div class="ocrhd">
      <span class="ocric">${ic('sparkle')}</span>
      <div style="flex:1">
        <b>خواندن متن از عکس یا PDF</b>
        <span class="gwid-sub" style="display:block">از سندِ کاغذی عکس بگیرید یا فایل PDF را بدهید؛
        متنش خوانده می‌شود و بعد از بازبینی، در همین فرم درج می‌شود.</span>
      </div>
      <input type="file" id="ocr_file_${targetId}" accept="image/jpeg,image/png,image/webp,application/pdf"
             style="display:none" onchange="ocrRun('${targetId}',this)">
      <button type="button" class="btn btn-o btn-sm"
              onclick="document.getElementById('ocr_file_${targetId}').click()">انتخاب فایل</button>
    </div>
    <div id="ocr_out_${targetId}"></div>
  </div>`;
}
async function ocrRun(targetId, input){
  const f=input.files&&input.files[0]; input.value='';
  const out=$('ocr_out_'+targetId); if(!f||!out) return;
  out.innerHTML='<div class="gwid-sub" style="padding:8px 0">در حال خواندن متن… (بسته به حجم فایل چند ثانیه طول می‌کشد)</div>';
  try{
    const r=await API.ocrExtract(f);
    OCR_TARGET={id:targetId, text:r.text};
    out.innerHTML=`<div class="ocrres">
      <div class="ocrmeta">${fa(r.text.length)} نویسه خوانده شد${r.tokens?` · ${fa(r.tokens)} توکن`:''}${r.model?` · ${esc(r.model)}`:''}</div>
      <textarea id="ocr_txt_${targetId}" rows="9" spellcheck="false">${esc(r.text)}</textarea>
      <div class="ocract">
        <button type="button" class="btn btn-g btn-sm" onclick="ocrInsert('${targetId}',false)">درج در انتهای فیلد</button>
        <button type="button" class="btn btn-o btn-sm" onclick="ocrInsert('${targetId}',true)">جایگزینی کل فیلد</button>
        <button type="button" class="btn btn-o btn-sm" onclick="$('ocr_out_${targetId}').innerHTML=''">بستن</button>
      </div>
      <div class="gwid-sub">متن را پیش از درج بازبینی کنید — مدل ممکن است بخشی را «[ناخوانا]» گذاشته باشد.</div>
    </div>`;
  }catch(e){
    out.innerHTML=`<div style="color:var(--dn);font-size:12px;padding:8px 0">${esc(e.message)}</div>`;
  }
}
// درج در textarea. اگر ویرایشگرِ شبیه‌ورد رویش سوار باشد، همان textarea منبع
// حقیقت است (توضیح در drawDocForm) ولی باید به ویرایشگر خبر داد تا نمایش هم
// به‌روز شود — وگرنه کاربر متن را نمی‌بیند و فکر می‌کند کار نکرده.
// متنِ استخراج‌شده ساده است ولی مقصد ممکن است فیلدِ ویرایشگرِ شبیه‌ورد باشد که
// HTML نگه می‌دارد. اگر متن خام را همان‌طور بگذاریم، مرورگر خطوط را جمع می‌کند و
// کلِ سند یک پاراگرافِ درهم می‌شود. پس برای فیلدِ rich، هر خط یک <p> می‌شود.
function ocrToHtml(t){
  return String(t||'').split(/\n{2,}/).map(block=>{
    const lines=block.split('\n').map(l=>esc(l.trim())).filter(Boolean);
    return lines.length?'<p>'+lines.join('<br>')+'</p>':'';
  }).filter(Boolean).join('') || '<p><br></p>';
}
// ویرایشگر برای «خالی» مقدارِ <p><br></p> می‌گذارد؛ آن را نباید متنِ موجود شمرد
const ocrIsEmpty = v => !String(v||'').replace(/<p>\s*(<br\s*\/?>)?\s*<\/p>/gi,'').replace(/<[^>]*>/g,'').trim();

function ocrInsert(targetId, replace){
  const src=$('ocr_txt_'+targetId), dst=$(targetId);
  if(!src||!dst) return;
  const t=src.value;
  const rich=dst.dataset && dst.dataset.rich==='1';
  const piece=rich?ocrToHtml(t):t;
  const empty=rich?ocrIsEmpty(dst.value):!String(dst.value||'').trim();
  dst.value = (replace||empty) ? piece
    : (rich ? dst.value + piece : dst.value.replace(/\s*$/,'') + '\n\n' + t);
  dst.dispatchEvent(new Event('input',{bubbles:true}));
  dst.dispatchEvent(new Event('change',{bubbles:true}));
  if(window.RichEditor&&typeof RichEditor.sync==='function'){ try{ RichEditor.sync(dst); }catch(e){} }
  $('ocr_out_'+targetId).innerHTML='';
  toast(replace?'متن جایگزین شد':'متن به انتهای فیلد افزوده شد');
  dst.scrollIntoView({behavior:'smooth',block:'center'});
}

// ---------- مسیرِ سنجه: بخش ← محور ← استاندارد ← سنجه ----------
// کارفرما: «هر سنجه که می‌زنیم از بالاش مسیرش مشخص باشه… اینا رو به صورت کارت با
// فلش به هم وصل بشه». کاربری که مستقیم روی یک چک‌لیست یا سنجه می‌آید هیچ نشانه‌ای
// نداشت که کجای کتاب ایستاده است.
//
// مسیر از همان درختی می‌آید که در buildIndex ساخته شده (_parent روی هر گره)، نه
// از حدس‌زدنِ کد — کدها همیشه سلسله‌مراتب را درست نشان نمی‌دهند (سنجه‌هایی هستند
// که مستقیم زیر محور آمده‌اند و استاندارد میانی ندارند).
const PATH_LEVEL_FA={section:'بخش', axis:'محور', standard:'استاندارد', measure:'سنجه'};
function nodePath(id){
  const out=[]; let n=S.byId&&S.byId[id];
  while(n){ out.unshift(n); n=n._parent; }
  return out;
}
// عنوانِ کوتاهِ خوانا برای هر گره — استاندارد متنِ بلند دارد و روی کارت جا نمی‌شود
function pathLabel(n){
  const t=fixText(n.statement||n.title||n.code||'');
  return t.length>54?t.slice(0,52)+'…':t;
}
function pathLevelOf(n,i,total){
  if(n.level_type) return n.level_type;
  return ['section','axis','standard','measure'][Math.min(i,3)];
}
// کارت‌های مسیر با فلش. هر کارت — جز آخری که خودِ صفحه‌ی جاری است — کلیک‌پذیر است
// و به همان جای درخت می‌برد.
function pathCards(id, opts){
  opts=opts||{};
  const nodes=nodePath(id);
  if(!nodes.length) return '';
  return `<nav class="pathbar noprint" aria-label="مسیر سنجه">
    ${nodes.map((n,i)=>{
      const last=i===nodes.length-1;
      const lvl=pathLevelOf(n,i,nodes.length);
      const clickable=!last&&(lvl==='section'||lvl==='axis');
      return `<div class="pathcard${last?' on':''}"${clickable?` role="link" tabindex="0" onclick="pathGo('${n.id}','${lvl}')"`:''}>
        <span class="pathlvl">${PATH_LEVEL_FA[lvl]||''}</span>
        <span class="pathcode">${escn(n.code||'')}</span>
        <span class="pathttl">${esc(pathLabel(n))}</span>
      </div>${last?'':'<span class="patharr" aria-hidden="true">‹</span>'}`;
    }).join('')}
  </nav>`;
}
function pathGo(id, lvl){
  if(lvl==='axis'){ selAxis(id); }
  else if(lvl==='section'){ openSection(id); }
}

// لایه‌ی دوم دسترسی: grant/deny موردی روی یک سنجه‌ی مشخص برای یک کاربر مشخص.
// grant همیشه اجازه می‌دهد، deny همیشه رد می‌کند و بر دسترسی نقش می‌چربد.
// (سرور همین قاعده را در src/config/role-axes.js#measureAllowed اعمال می‌کند — این‌جا فقط برای UI.)
function measureVisible(m, axCode){
  if(S.ovGrants && S.ovGrants.has(m.id)) return true;
  if(S.ovDenies && S.ovDenies.has(m.id)) return false;
  const scope=roleScope();
  return scope==='*'||scope.includes(axCode);
}
function myAxes(){
  const scope = roleScope();
  const out=[];
  S.sections.forEach(sec=>sec.axes.forEach(ax=>{
    const inScope = scope==='*'||scope.includes(ax.code);
    const measures=(ax.measures||[]).filter(m=>measureVisible(m, ax.code));
    if(!measures.length && !inScope) return;      // نه در دامنه نقش، نه سنجه‌ی grant‌شده‌ای دارد
    if(!measures.length) return;                  // محورِ در دامنه ولی کاملاً deny‌شده
    out.push({sec, ax: measures.length===(ax.measures||[]).length ? ax : {...ax, measures}});
  }));
  return out;
}
function canEdit(axCode){
  const perms=S.user.permissions||[];
  if(!perms.includes('edit_measure_status')&&!perms.includes('view_all_dashboards')&&S.user.role_code!=='admin') return false;
  const scope = roleScope();
  return scope==='*'||scope.includes(axCode);
}
// ویرایش در سطح سنجه: grant موردی حق ویرایش می‌دهد، deny موردی آن را می‌گیرد.
function canEditMeasure(m, axCode){
  const perms=S.user.permissions||[];
  if(!perms.includes('edit_measure_status')&&!perms.includes('view_all_dashboards')&&S.user.role_code!=='admin') return false;
  if(S.ovGrants && S.ovGrants.has(m.id)) return true;
  if(S.ovDenies && S.ovDenies.has(m.id)) return false;
  return canEdit(axCode);
}

// ---------- بخش جمع‌شونده‌ی فرم (افشای تدریجی) ----------
// نکته: محتوای بسته فقط با display:none پنهان می‌شود و از DOM حذف نمی‌شود،
// بنابراین توابع جمع‌آوری مقادیر فرم دقیقاً مثل قبل کار می‌کنند.
let __fsecN=0;
function fsec(title, bodyHtml, opts){
  const o=opts||{}; const id='fsec'+(++__fsecN); const open=!!o.open;
  return `<div class="fsec" id="${id}">
    <div class="fsec-hd ${open?'on':''}" onclick="toggleFsec('${id}')">
      <span class="ngt">${title}</span>${o.hint?`<span class="cnt">${o.hint}</span>`:''}<span class="chev">◂</span></div>
    <div class="fsec-bd ${open?'':'hide'}">${bodyHtml}</div></div>`;
}
function toggleFsec(id){
  const el=$(id); if(!el) return;
  const bd=el.querySelector('.fsec-bd'), open=bd.classList.contains('hide');
  bd.classList.toggle('hide',!open);
  el.querySelector('.fsec-hd').classList.toggle('on',open);
}

// ==================== امکانات/پکیج (hospital_features) ====================
// دقیقاً هم‌راستا با FEATURE_KEYS در database/seed-hospital-features.js و بلوک requireFeature در
// src/routes/api.js — کلیدها همان کلید صفحه‌ی go(p) هستند. هر کلید که اینجا نیست (دشبورد، کارتابل،
// پیام‌ها، تقویم، گزارش‌ها، کاربران، تنظیمات، پروفایل، راهنما) همیشه باز است، چون بخشی از بدنه‌ی
// اصلی سامانه است نه یک «امکان» جداگانه‌ی قابل‌فروش.
const GATED_FEATURES=new Set(['measures','documents','checklists','audits','walkarounds','errors','fmea',
  'satisfaction','orgchart','committees','programs','training','bsc','orgstructure','nursing','support',
  'management','headnurse','processes','activities']);
// پیش‌فرض امن-به‌سمت-باز: اگر S.features هنوز نیامده یا کلید در آن نیست، فعال فرض می‌شود
// (دقیقاً همان قاعده‌ی سمت سرور در requireFeature — یک تغییر جدید نباید چیزی را بی‌جهت قفل کند)
function featureEnabled(pageKey){
  if(!GATED_FEATURES.has(pageKey)) return true;
  if(!S.features || S.features[pageKey]===undefined) return true;
  return !!S.features[pageKey];
}
// صفحه‌ی قفل — به‌جای محتوای واقعی، وقتی کاربر روی یک بخش غیرفعال کلیک می‌کند یا مستقیم لینکش را باز می‌کند
function renderFeatureGate(pageKey){
  const label=(shortcutCandidates().find(c=>c.k===pageKey)||{}).t || 'این بخش';
  $('ptitle').textContent=label;
  $('content').innerHTML=`<div class="panel g gold" style="max-width:560px;margin:40px auto;text-align:center">
    <div class="pbody" style="padding:40px 24px">
      <div style="font-size:44px;margin-bottom:14px">🔒</div>
      <h3 style="margin-bottom:10px">${esc(label)} در پکیج فعلی شما نیست</h3>
      <div class="sub" style="line-height:2;margin-bottom:22px">برای فعال‌سازی این بخش خرید کنید.<br>با پشتیبانی سامانه یا سوپرادمین پلتفرم تماس بگیرید تا این بخش برای بیمارستان شما فعال شود.</div>
      <button class="btn btn-g" onclick="go('dash')">بازگشت به داشبورد</button>
    </div>
  </div>`;
}

// ==================== APP SHELL ====================
// وضعیت باز/بسته‌ی گروه‌های ناوبری (در localStorage نگه‌داشته می‌شود)
let NAV_GROUPS=[];
function navGroupState(){ try{ return JSON.parse(localStorage.getItem('navgroups')||'{}'); }catch(e){ return {}; } }
function navGroupOpen(g){
  const st=navGroupState();
  if(st[g]!==undefined) return !!st[g];
  // پیش‌فرض: گروهی که صفحه‌ی جاری در آن است باز باشد
  const grp=NAV_GROUPS.find(x=>x.g===g);
  return !!(grp&&grp.items.some(i=>i.k===S.page));
}
function toggleNavGroup(g){
  const st=navGroupState(); st[g]=!navGroupOpen(g);
  localStorage.setItem('navgroups',JSON.stringify(st));
  const el=document.querySelector(`.navgroup[data-g="${g}"]`);
  if(el){ el.querySelector('.navgroup-hd').classList.toggle('on',st[g]);
          el.querySelector('.navgroup-bd').classList.toggle('on',st[g]); }
}
// اگر صفحه‌ی فعال درون گروهی بسته است، آن گروه را باز کن (هیچ صفحه‌ای پنهان نمی‌ماند)
function revealNavGroup(p){
  const grp=NAV_GROUPS.find(x=>x.g&&x.items.some(i=>i.k===p));
  if(!grp) return;
  const el=document.querySelector(`.navgroup[data-g="${grp.g}"]`);
  if(el&&!el.querySelector('.navgroup-bd').classList.contains('on')){
    const st=navGroupState(); st[grp.g]=true; localStorage.setItem('navgroups',JSON.stringify(st));
    el.querySelector('.navgroup-hd').classList.add('on');
    el.querySelector('.navgroup-bd').classList.add('on');
  }
}
// صفحهی فرود هر کاربر بعد از ورود باید «داشبوردِ» خودش باشد، نه هاب اعتباربخشی.
// داشبورد عمومی (dash) سمت سرور بر اساس مجوز همان نقش فیلتر میشود، پس برای هر
// سمتی همان دادههایی را نشان میدهد که به او میرسد؛ سرپرستار/جانشین بخش که
// داشبورد اختصاصی دارد مستقیم به آن میرود. تور و راهنمای اولیه بعد از همین فرود
// باز میشوند (منطق خودشان انتهای renderApp است) و مسیر کاربر تازه را نشان میدهند.
function defaultLanding(){
  return 'acc';
}

// ==================== مسیریابی عمیق و حفظ موقعیت صفحه و سطوح زیرین (SPA Deep Router & History) ====================
// طبق خواست کاربر: صفحه اصلی همیشه «اعتباربخشی» است و کلید بازگشت مرورگر نباید به اول بپرد.
const ALL_APP_PAGES = new Set([
  'acc', 'knowledge', 'duties', 'dash', 'inbox', 'messages', 'settings', 'measures',
  'reports', 'reviewgaps', 'users', 'committees', 'documents', 'checklists', 'audits',
  'walkarounds', 'processes', 'programs', 'training', 'bsc', 'indicators', 'indicator_slides', 'calendar',
  'orgstructure', 'orgchart', 'nursing', 'support', 'management', 'headnurse',
  'staffshift', 'shiftatt', 'assets', 'pharmacy', 'disaster', 'infection', 'occhealth',
  'hrdev', 'vendors', 'nsupervision', 'finance', 'patientfocus', 'education', 'blood',
  'lab', 'imaging', 'errors', 'fmea', 'activities', 'guide', 'profile', 'satisfaction',
  'followup', 'doccodes', 'tenures', 'crm', 'safesurgery', 'medrecon', 'waste',
  'patientrights', 'maternal', 'outpatient', 'directives'
]);

function isValidAppPage(p){
  return typeof p === 'string' && ALL_APP_PAGES.has(p);
}

window.__navigatingViaGo = false;

function saveCurrentRouteState(p){
  p = p || S.page;
  if(!p) return;
  try {
    sessionStorage.setItem('p_last_page', p);
  } catch(e){}
}

function saveMeasuresSubState(){
  try {
    sessionStorage.setItem('p_measures_state', JSON.stringify({
      openSec: S.openSec,
      axis: S.axis,
      accDepth: S.accDepth,
      accCurrentTab: S.accCurrentTab
    }));
  } catch(e){}
}

function parseHashRoute(){
  const raw = (window.location.hash || '').replace(/^#[/]?/, '').trim();
  if(!raw) return null;
  const [pathPart, queryPart] = raw.split('?');
  const segments = pathPart.split('/').map(s => decodeURIComponent(s).trim()).filter(Boolean);
  const page = segments[0] || '';
  const subPath = segments.slice(1).join('/');
  const params = {};
  if(queryPart){
    queryPart.split('&').forEach(pair => {
      const idx = pair.indexOf('=');
      if(idx > -1){
        params[decodeURIComponent(pair.slice(0, idx))] = decodeURIComponent(pair.slice(idx + 1));
      }
    });
  }
  return { raw, page, segments, subPath, params };
}

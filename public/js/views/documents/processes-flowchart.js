/**
 * Clinical Processes & Flowchart
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
function drawProcKpisModal(){
  const selectedIds=new Set(PROC.kpi_ids||[]);
  const kpis=PROC.catalogKpis||[];
  const modalHtml=`
  <div id="procKpiModal" class="modal-backdrop" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px">
    <div class="modal-box" style="background:var(--bg,#fff);border-radius:12px;width:100%;max-width:1100px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 12px 36px rgba(0,0,0,0.3);overflow:hidden">
      <div style="background:#1d4ed8;color:#fff;padding:14px 20px;display:flex;align-items:center;justify-content:space-between">
        <h3 style="margin:0;font-size:16px;font-weight:700">شاخص‌های مربوط به فرآیند</h3>
        <button type="button" onclick="closeProcKpisModal()" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer">✕</button>
      </div>
      <div style="padding:16px;border-bottom:1px solid var(--bdr,#e2e8f0)">
        <div style="max-width:480px;margin:0 auto">
          <input type="text" id="proc_kpi_search" placeholder="نام شاخص را وارد کنید..." style="width:100%;padding:10px 16px;border-radius:24px;border:1px solid var(--bdr,#cbd5e1);text-align:center" onkeydown="if(event.key==='Enter')searchProcKpis()">
        </div>
      </div>
      <div style="flex:1;overflow-y:auto;padding:16px">
        <div class="tbl-wrap">
          <table style="width:100%;border-collapse:collapse;text-align:center;font-size:13px">
            <thead>
              <tr style="background:#2563eb;color:#fff">
                <th style="padding:10px 6px">ردیف</th>
                <th style="padding:10px 12px;text-align:right">عنوان شاخص</th>
                <th style="padding:10px 8px">نوع شاخص</th>
                <th style="padding:10px 8px">مطلوبیت شاخص</th>
                <th style="padding:10px 8px">دوره تناوب</th>
                <th style="padding:10px 8px">حد بالا</th>
                <th style="padding:10px 8px">حد پایین</th>
                <th style="padding:10px 8px">تارگت</th>
              </tr>
            </thead>
            <tbody>
              ${!kpis.length?'<tr><td colspan="8" style="padding:24px;color:var(--tsub,#64748b)">شاخصی با این عنوان یافت نشد</td></tr>':
                kpis.map((k,idx)=>{
                  const isChecked=selectedIds.has(k.id);
                  const bg=idx%2===0?'background:#fff':'background:#f8fafc';
                  return `
                    <tr style="${bg};border-bottom:1px solid var(--bdr,#f1f5f9)">
                      <td style="padding:8px 6px">
                        <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer">
                          <input type="checkbox" ${isChecked?'checked':''} onchange="toggleProcKpi('${k.id}')">
                          <span>${fa(idx+1)}</span>
                        </label>
                      </td>
                      <td style="padding:8px 12px;text-align:right;font-weight:600;color:var(--th,#0f172a)">${esc(k.title)}</td>
                      <td style="padding:8px 8px"><span class="bdg b2">${esc(k.indicator_type||'—')}</span></td>
                      <td style="padding:8px 8px"><span class="bdg b1">${esc(k.desirability||'—')}</span></td>
                      <td style="padding:8px 8px">${esc(k.measure_interval||'ماهانه')}</td>
                      <td style="padding:8px 8px">${k.upper_limit!=null?fa(k.upper_limit):'—'}</td>
                      <td style="padding:8px 8px">${k.lower_limit!=null?fa(k.lower_limit):'—'}</td>
                      <td style="padding:8px 8px;font-weight:bold">${k.target_value!=null?fa(k.target_value):'—'}</td>
                    </tr>`;
                }).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div style="padding:12px 20px;border-top:1px solid var(--bdr,#e2e8f0);display:flex;justify-content:space-between;align-items:center;background:var(--bg2,#f8fafc)">
        <div class="sub">${fa((PROC.kpi_ids||[]).length)} شاخص انتخاب شده است</div>
        <button type="button" class="btn btn-g btn-sm" onclick="closeProcKpisModal()">تأیید و بستن</button>
      </div>
    </div>
  </div>`;
  const existing=$('procKpiModal');
  if(existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function searchProcKpis(){
  const val=$('proc_kpi_search')?$('proc_kpi_search').value.trim():'';
  openProcKpisModal(val);
}

function toggleProcKpi(id){
  PROC.kpi_ids=PROC.kpi_ids||[];
  PROC.kpis=PROC.kpis||[];
  const idx=PROC.kpi_ids.indexOf(id);
  if(idx>=0){
    PROC.kpi_ids.splice(idx,1);
    PROC.kpis=PROC.kpis.filter(k=>k.id!==id);
  }else{
    PROC.kpi_ids.push(id);
    const found=(PROC.catalogKpis||[]).find(k=>k.id===id);
    if(found) PROC.kpis.push(found);
  }
  updateSelectedKpisDisplay();
}

function removeProcKpi(id){
  PROC.kpi_ids=(PROC.kpi_ids||[]).filter(i=>i!==id);
  PROC.kpis=(PROC.kpis||[]).filter(k=>k.id!==id);
  updateSelectedKpisDisplay();
}

function updateSelectedKpisDisplay(){
  const box=$('pf_kpis_selected');
  if(!box) return;
  if(!PROC.kpis.length){
    box.innerHTML='<span class="tsub">هنوز شاخصی به این فرآیند متصل نشده است.</span>';
  }else{
    box.innerHTML=PROC.kpis.map(k=>`
      <span class="bdg b1" style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px">
        ${esc(k.title)} <button type="button" onclick="removeProcKpi('${k.id}')" style="background:none;border:none;color:inherit;cursor:pointer;font-weight:bold">✕</button>
      </span>`).join('');
  }
}

function closeProcKpisModal(){
  const modal=$('procKpiModal');
  if(modal) modal.remove();
  updateSelectedKpisDisplay();
}

/* ---------- آپلود فایلِ فرآیند و ساختِ فلوچارت با هوش مصنوعی ----------
   کارفرما فایلِ PDFِ تک‌صفحه‌ایِ فرآیند را آپلود می‌کرد و انتظار داشت فلوچارت پر
   شود؛ ولی آپلودِ فرآیند تا امروز فقط «ضمیمه» بود و هیچ‌جا از مدل «گام» خواسته
   نمی‌شد. حالا مسیر /processes/extract-flowchart گام و یال برمی‌گرداند.

   نتیجه عمداً مستقیم ذخیره نمی‌شود: در همین فرم می‌نشیند تا کاربر ببیند و اصلاح
   کند، بعد با دکمه‌ی ذخیره‌ی همیشگی ثبت شود. اگر گام‌هایی از قبل هست، پرسیده
   می‌شود جایگزین شوند یا نه — وگرنه یک کلیک کارِ نیم‌ساعتِ کاربر را پاک می‌کرد. */
async function procExtractFlow(){
  const f = $('pf_aifile')?.files?.[0];
  const msg = $('pf_aimsg');
  if(!f){ if(msg) msg.textContent='اول یک فایل انتخاب کنید'; return; }
  if((PROC.steps||[]).some(s=>String(s.text||'').trim())
     && !await BTN.confirmDanger('گام‌های فعلیِ این فرآیند با نتیجه‌ی تشخیص جایگزین شوند؟')) return;
  if(msg) msg.textContent='در حال خواندن و تحلیل فایل…';
  $('pf_aiout').innerHTML='';
  try{
    const r = await API.processExtractFlow(f);
    const flow = r.flow||{};
    // شناسه‌ها به فرمتِ داخلیِ ویرایشگر بازنویسی می‌شوند تا با گام‌های دستی قاطی نشود
    const map = {};
    PROC.steps = (flow.steps||[]).map(s=>{ const id=procStepUid(); map[s.id]=id;
      return { id, step_type:s.step_type, text:s.text, owner:s.owner||'' }; });
    PROC.links = (flow.links||[]).filter(l=>map[l.from]&&map[l.to])
      .map(l=>({ uid:procStepUid(), from:map[l.from], to:map[l.to], label:l.label||'' }));
    if(flow.title && !$('pf_title').value.trim()) $('pf_title').value = flow.title;
    if(flow.description && !$('pf_desc').value.trim()) $('pf_desc').value = flow.description;
    drawProcSteps();
    if(msg) msg.textContent = `${fa(PROC.steps.length)} گام و ${fa(PROC.links.length)} مسیر ساخته شد`
      + (r.model?` (${r.model})`:'');
    $('pf_aiout').innerHTML = `<div class="rg-warn" style="margin-top:8px">نتیجه‌ی تشخیص در فرم گذاشته شد.
      پیش از ذخیره یک‌بار گام‌ها و شاخه‌های «بله/خیر» را بررسی کنید — مدل ممکن است گامی را جا انداخته باشد.</div>`;
  }catch(e){
    if(msg) msg.textContent = e.message;
    // اگر متن خوانده شد ولی گام تشخیص داده نشد، دست‌کم متن را نشان بده تا
    // کاربر بتواند از رویش گام‌ها را دستی بنویسد و کارش زمین نماند.
    if(e.text) $('pf_aiout').innerHTML = `<div class="fg" style="margin-top:8px">
      <label>متنِ خوانده‌شده از فایل — می‌توانید از رویش گام‌ها را دستی بسازید</label>
      <textarea rows="6">${esc(e.text)}</textarea></div>`;
  }
}

// ---------- ویرایشگر گام‌های فلوچارت ----------
// شناسه‌ی هر گام سمت کلاینت ساخته می‌شود و پایدار می‌ماند، چون شاخه‌ی «خیر» به
// همان شناسه ارجاع می‌دهد؛ اگر با هر ذخیره id عوض می‌شد، ارجاع‌ها می‌شکستند.
const PROC_STEP_FA={start:'شروع', action:'اقدام', decision:'تصمیم (بله/خیر)', document:'سند / فرم', end:'پایان'};
const procStepUid=()=>'s'+Math.random().toString(36).slice(2,10);

function drawProcSteps(){
  const box=$('pf_steps'); if(!box) return;
  const st=PROC.steps||[];
  if(!st.length){
    box.innerHTML='<div class="sub" style="padding:10px 0">هنوز گامی اضافه نشده است. با «افزودن گام» شروع کنید — معمولاً اولین گام از نوع «شروع» است.</div>';
    return;
  }
  PROC.links=PROC.links||[];
  const num=id=>st.findIndex(x=>x.id===id)+1;
  const optList=(fromId,sel)=>st.filter(x=>x.id!==fromId)
    .map(x=>`<option value="${x.id}" ${sel===x.id?'selected':''}>گام ${fa(num(x.id))} — ${esc((x.text||'بدون متن').slice(0,26))}</option>`).join('');

  box.innerHTML=st.map((s,i)=>{
    const outs=PROC.links.filter(l=>l.from===s.id);
    const isEnd=s.step_type==='end';
    return `
    <div class="pstep">
      <div class="pstep-n">${fa(i+1)}</div>
      <div class="pstep-b">
        <div class="pstep-r">
          <select onchange="setProcStep('${s.id}','step_type',this.value)">
            ${Object.entries(PROC_STEP_FA).map(([k,v])=>`<option value="${k}" ${s.step_type===k?'selected':''}>${v}</option>`).join('')}
          </select>
          <input value="${esc(s.text||'')}" placeholder="متن گام — مثال: بیمار به واحد پذیرش مراجعه می‌کند"
            oninput="setProcStep('${s.id}','text',this.value)">
          <input value="${esc(s.owner||'')}" placeholder="صاحب گام (سمت)" style="max-width:145px"
            oninput="setProcStep('${s.id}','owner',this.value)">
        </div>
        ${isEnd?'<div class="sub" style="margin-top:6px">گام پایان، مسیر خروجی ندارد.</div>':`
        <div class="plinks">
          ${outs.length?outs.map(l=>`
            <div class="plink">
              <span class="plink-i">←</span>
              <input value="${esc(l.label||'')}" placeholder="برچسب (مثلاً بله / خیر)" style="max-width:145px"
                oninput="setProcLink('${l.uid}','label',this.value)">
              <select onchange="setProcLink('${l.uid}','to',this.value)">
                <option value="">— انتخاب مقصد —</option>${optList(s.id,l.to)}
              </select>
              <button type="button" class="tgl dngr" onclick="delProcLink('${l.uid}')" title="حذف مسیر" aria-label="حذف مسیر">✕</button>
            </div>`).join('')
          :'<div class="sub" style="padding:2px 0 4px">مسیر خروجی ندارد — این گام بن‌بست است.</div>'}
          <button type="button" class="tgl" onclick="addProcLink('${s.id}')">+ افزودن مسیر خروجی</button>
        </div>`}
      </div>
      <div class="pstep-a">
        <button type="button" class="tgl" onclick="moveProcStep(${i},-1)" ${i===0?'disabled':''} title="بالا" aria-label="انتقال به بالا">▲</button>
        <button type="button" class="tgl" onclick="moveProcStep(${i},1)" ${i===st.length-1?'disabled':''} title="پایین" aria-label="انتقال به پایین">▼</button>
        <button type="button" class="tgl dngr" onclick="delProcStep('${s.id}')" title="حذف" aria-label="حذف گام">✕</button>
      </div>
    </div>`;
  }).join('');
}

// ---- مسیرهای خروجی (یال‌ها) ----
// uid فقط برای شناسایی ردیف در فرم است و ذخیره نمی‌شود؛ سرور خودش id می‌سازد.
function addProcLink(fromId){
  PROC.links=PROC.links||[];
  const st=PROC.steps||[];
  const idx=st.findIndex(x=>x.id===fromId);
  const from=st[idx];
  const outs=PROC.links.filter(l=>l.from===fromId);
  // پیش‌فرضِ کمک‌کننده: تصمیم اولین مسیرش «بله» و دومی «خیر»؛ بقیه بی‌برچسب.
  // مقصد پیش‌فرض گام بعدی است چون در عمل بیشتر مسیرها همان‌جا می‌روند.
  const lbl=from&&from.step_type==='decision'?(outs.length===0?'بله':outs.length===1?'خیر':''):'';
  PROC.links.push({uid:procStepUid(), from:fromId, to:(st[idx+1]||{}).id||'', label:lbl});
  drawProcSteps();
}
function setProcLink(uid,k,v){
  const l=(PROC.links||[]).find(x=>x.uid===uid); if(!l) return;
  l[k]=v;
  if(k==='to') drawProcSteps();   // برچسبِ مقصد در فهرست باید تازه شود
}
function delProcLink(uid){
  PROC.links=(PROC.links||[]).filter(x=>x.uid!==uid);
  drawProcSteps();
}
function addProcStep(){
  PROC.steps=PROC.steps||[]; PROC.links=PROC.links||[];
  const st=PROC.steps;
  // اولین گام پیش‌فرض «شروع» است، بقیه «اقدام» — همان چیزی که کاربر معمولاً می‌خواهد
  const prev=st[st.length-1];
  const s={id:procStepUid(), step_type:st.length?'action':'start', text:'', owner:''};
  st.push(s);
  // گامِ قبلی اگر بن‌بست بود، خودکار به گام تازه وصل می‌شود — کاربر معمولاً
  // فلوچارت را خطی می‌نویسد و نباید مجبور باشد هر بار مسیر دستی بسازد.
  if(prev && prev.step_type!=='end' && !PROC.links.some(l=>l.from===prev.id)){
    PROC.links.push({uid:procStepUid(), from:prev.id, to:s.id, label:''});
  }
  drawProcSteps();
}
function setProcStep(id,k,v){
  const s=(PROC.steps||[]).find(x=>x.id===id); if(!s) return;
  s[k]=v;
  // نوعِ «پایان» مسیرهای خروجی را بی‌معنا می‌کند؛ پاکشان کن تا فلوچارت متناقض نشود
  if(k==='step_type'&&v==='end') PROC.links=(PROC.links||[]).filter(l=>l.from!==id);
  if(k==='step_type'||k==='text') drawProcSteps();
}
function delProcStep(id){
  PROC.steps=(PROC.steps||[]).filter(x=>x.id!==id);
  // یال‌هایی که به گامِ حذف‌شده می‌رسند یا از آن می‌آیند باید بروند، وگرنه پیکانِ
  // بی‌مقصد می‌ماند و سرور هم آن را کنار می‌گذارد (ناهمخوانی بین فرم و خروجی)
  PROC.links=(PROC.links||[]).filter(l=>l.from!==id&&l.to!==id);
  drawProcSteps();
}
function moveProcStep(i,d){
  const st=PROC.steps||[]; const j=i+d;
  if(j<0||j>=st.length) return;
  const t=st[i]; st[i]=st[j]; st[j]=t;
  // یال‌ها به شناسه بسته‌اند نه ترتیب، پس جابه‌جایی مسیرها را نمی‌شکند —
  // فقط شماره‌ی نمایشیِ گام‌ها عوض می‌شود.
  drawProcSteps();
}

function backToProcList(){ PROC.view='list'; PROC.current=null; PROC.editId=null; PROC.notify=[]; PROC.steps=[]; PROC.links=[]; renderProcesses(); }

async function saveProcess(){
  const b={ title:$('pf_title').value.trim(), domain:$('pf_domain').value,
    process_code:$('pf_code').value.trim(), referring_user_id:$('pf_ref_user').value,
    referring_person:$('pf_ref_name').value.trim(), description:$('pf_desc').value.trim(),
    section_id:$('pf_section_id').value, compiled_date:readJalaliDateInput('pf_compiled'),
    next_review_date:readJalaliDateInput('pf_next_review'),
    version_no: parseInt($('pf_version_no')?.value, 10) || 1,
    revision_no: parseInt($('pf_revision_no')?.value, 10) || 0,
    kpi_ids:PROC.kpi_ids||[],
    notify_user_ids:[...$('pf_notify').selectedOptions].map(o=>o.value),
    steps:(PROC.steps||[]).filter(s=>String(s.text||'').trim()),
    links:(PROC.links||[]).filter(l=>l.from&&l.to).map(l=>({from:l.from,to:l.to,label:l.label||''})) };
  if(!b.title){ toast('عنوان فرآیند الزامی است',true); return; }
  try{
    let id=PROC.editId;
    if(id) await API.updateProcess(id,b);
    else { const r=await API.createProcess(b); id=r.process.id; }
    const fi=$('pf_file');
    if(fi&&fi.files&&fi.files[0]) await API.uploadProcessFile(id, fi.files[0]);
    toast(PROC.editId?'فرآیند به‌روزرسانی شد':'فرآیند ثبت شد');
    backToProcList();
  }catch(e){ toast(e.message,true); }
}
// ---------- نمای فلوچارت (همان چیزی که چاپ و روی دیوار می‌رود) ----------
// کتاب: «تدوین فرآیند … با ذکر نام صاحبان فرایند به صورت فلوچارت ساده و قابل فهم»
// و «نصب فرآیند مذکور … در معرض دید گیرندگان خدمت» (ج-۲-۳-۱).
// پس این صفحه باید هم روی نمایشگر خوانا باشد و هم روی A4 تمیز چاپ شود.
async function viewProcessChart(id){
  PROC.view='chart';
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const r=await API.process(id);
    PROC.current=r.process; PROC.steps=r.steps||[]; PROC.links=r.links||[];
    drawProcChart(r.process, r.steps||[], r.notify_users||[], r.links||[]);
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}

const PROC_ST_FA={draft:'پیش‌نویس', approved:'ابلاغ‌شده', archived:'بایگانی'};
const PROC_ST_BDG={draft:'b2', approved:'b1', archived:'b3'};

/* ---------- چاپِ برگه‌ی فلوچارت روی *یک* صفحه‌ی A4 ----------
   کارفرما گزارش داد چاپِ «فرآیند پذیرش بیمار بستری» چند صفحه شد. اندازه‌گیری با
   PDF واقعی نشان داد سه صفحه می‌شود و دو علتِ جدا داشت:

   ۱) موقع چاپ، پوسته‌ی اپ (#root با min-height) زیر برگه می‌ماند و خودش
      صفحه‌های خالیِ اضافه می‌ساخت — همان چیزی که در برگه‌ی شیفت هم دیده شد.
   ۲) سقفِ CSSی max-height:145mm روی خودِ SVG. مرورگر نسبتِ viewBox را حفظ
      می‌کند، پس محدودکردنِ ارتفاع، *عرض* را هم می‌شکست: اندازه‌گیری نشان داد
      نمودار به نوارِ ۴۲ میلی‌متری تبدیل می‌شد — هم ناخوانا، هم بی‌فایده.

   راه‌حل همان چیزی است که برای برگه‌ی شیفت جواب داد و آن‌جا با PDF واقعی تأیید
   شد: برگه از دلِ اپ بیرون کشیده می‌شود، اندازه‌ی طبیعی‌اش اندازه‌گیری و با یک
   transform: scale به بودجه‌ی واقعیِ A4 کوچک می‌شود. چون مقیاسِ یکنواخت است،
   نسبت‌ها و خوانایی حفظ می‌شوند و فقط کوچک‌تر چاپ می‌شود. */
function procMeasureMm(mm){
  const probe=document.createElement('div');
  probe.style.cssText=`position:absolute;visibility:hidden;width:${mm}mm;height:0`;
  document.body.appendChild(probe);
  const px=probe.offsetWidth; probe.remove(); return px;
}

function procPrintChart(){
  const sheet=document.querySelector('.fcsheet');
  if(!sheet){ window.print(); return; }
  let root=document.getElementById('fcPrintRoot');
  if(!root){ root=document.createElement('div'); root.id='fcPrintRoot'; }
  if(root.parentNode!==document.body) document.body.appendChild(root);
  const home=sheet.parentNode, mark=document.createComment('fc');
  home.insertBefore(mark, sheet);

  const box=document.createElement('div'); box.className='fc-print-fit';
  const inner=document.createElement('div'); inner.className='fc-print-inner';
  inner.appendChild(sheet);
  box.appendChild(inner);
  root.innerHTML=''; root.appendChild(box);
  document.body.classList.add('fc-printing');

  // بودجه‌ی واقعیِ کاغذ از روی @page خودِ سامانه حساب می‌شود، نه فرضِ حاشیه‌ی
  // پیش‌فرضِ مرورگر. حالا @page حاشیه ندارد (تا مرورگر عنوان و ساعتش را روی
  // برگه نکشد) و حاشیه‌ی ۱۲mm را خودِ #fcPrintRoot می‌گذارد، پس روی A4 عمودی
  // فضای چاپ ۱۸۶×۲۷۳ است. ۲mm برای گِردکردنِ زیرپیکسلیِ مرورگر کنار می‌رود.
  const availW=procMeasureMm(184), availH=procMeasureMm(271);
  inner.style.width=availW+'px';        // اول عرضِ واقعی را بده تا چیدمان همان چاپ باشد
  const natW=inner.scrollWidth, natH=inner.scrollHeight;
  const scale=Math.min(1, availW/natW, availH/natH);
  inner.style.transform=`scale(${scale})`;
  inner.style.transformOrigin='top right';
  box.style.width=availW+'px';
  box.style.height=Math.floor(natH*scale)+'px';
  root.dataset.scale=String(scale);

  const cleanup=()=>{
    document.body.classList.remove('fc-printing');
    if(mark.parentNode) mark.parentNode.insertBefore(sheet, mark);
    if(mark.parentNode) mark.parentNode.removeChild(mark);
    inner.style.transform=''; inner.style.width='';
    root.innerHTML='';
  };
  window.addEventListener('afterprint', cleanup, { once:true });
  window.print();
  setTimeout(cleanup, 3000);
}

function drawProcChart(p, steps, notify, links){
  $('ptitle').textContent='فلوچارت — '+p.title;
  const approved=p.status==='approved';
  const svg=(window.Flowchart&&steps.length)?Flowchart.render(steps, links||[], {title:p.title}):'';
  $('content').innerHTML=`
  <div class="panel g docprint">
    <div class="phd noprint"><div class="abadge">⟳</div>
      <div style="flex:1"><h3>${esc(p.title)}</h3>
        <div class="sub">${esc(p.process_code||'بدون کد')} · نسخه ${fa(p.version_no||1)} · ${revisionBadge(p.revision_no)} ·
          <span class="bdg ${PROC_ST_BDG[p.status]||'b2'}">${PROC_ST_FA[p.status]||'پیش‌نویس'}</span></div></div>
      <button class="btn btn-o btn-sm" onclick="backToProcList()">◂ فهرست</button>
      ${steps.length?`<button class="btn btn-g btn-sm" onclick="procPrintChart()">${ic('print')} چاپ برای نصب</button>`:''}
      ${canManageProcesses()?`<button class="btn btn-o btn-sm" onclick="editProcess('${p.id}')">✎ ویرایش</button>`:''}
      ${canManageProcesses()?`<button class="btn ${approved?'btn-o':'btn-g'} btn-sm" onclick="toggleProcApproval('${p.id}',${!approved})">
        ${approved?'لغو ابلاغ':'✓ ابلاغ فرآیند'}</button>`:''}
    </div>
    <div class="pbody">
      ${exBanner(p)}
      ${!approved?`<div class="rg-warn noprint">این فرآیند هنوز ابلاغ نشده است. طبق سنجه الف‑۱‑۴‑۲ فرآیند باید «کدگذاری شده و پس از تصویب تیم رهبری» به کار رود — تا پیش از ابلاغ، این برگه نسخه‌ی رسمی نیست و نباید روی دیوار نصب شود.</div>`:''}

      <table class="psheet fcsheet">
      <thead><tr><td>${docLetterhead(`فلوچارت فرآیند — ${esc(p.process_code||'بدون کد')}`)}</td></tr></thead>
      <tfoot><tr><td><div class="psheet-foot">
        <span>${esc((S.user&&S.user.hospital_name)||'')}</span>
        <span>${esc(p.process_code||'')} · نسخه ${fa(p.version_no||1)}${approved?' · ابلاغ‌شده '+faDateISO(p.approved_at):' · پیش‌نویس'}</span>
      </div></td></tr></tfoot>
      <tbody><tr><td>
        <h3 style="margin:0 0 4px">${esc(p.title)}</h3>
        ${p.description?`<div style="font-size:12px;color:var(--td);margin-bottom:10px;line-height:1.9">${esc(p.description)}</div>`:''}

        <div class="doc-dates">
          <div><span>کد فرآیند</span><b class="${p.process_code?'':'over'}">${esc(p.process_code||'ثبت نشده')}</b></div>
          <div><span>حوزه</span><b>${PROC_DOMAIN_FA[p.domain]||esc(p.domain||'')}</b></div>
          <div><span>شماره نسخه</span><b>${fa(p.version_no||1)}</b></div>
          <div><span>شماره ویرایش</span><b style="color:var(--gdl)">${revisionLabel(p.revision_no)}</b></div>
          <div><span>وضعیت</span><b class="${approved?'':'over'}">${PROC_ST_FA[p.status]||'پیش‌نویس'}</b></div>
        </div>
        <div class="doc-dates" style="margin-top:8px">
          <div><span>تاریخ تدوین</span><b>${p.compiled_date?faDateISO(p.compiled_date):'—'}</b></div>
          <div><span>ارجاع‌دهنده</span><b>${esc(p.referring_full_name||p.referring_person||'—')}</b></div>
          <div><span>تصویب‌کننده</span><b>${esc(p.approved_by_name||'—')}</b></div>
          <div><span>تاریخ ابلاغ</span><b>${p.approved_at?faDateISO(p.approved_at):'—'}</b></div>
        </div>

        ${svg?`<div class="fcwrap" style="margin-top:16px">${svg}</div>
          <div class="fclegend">
            <span><i class="s"></i> شروع / پایان</span>
            <span><i></i> اقدام</span>
            <span><i class="d"></i> تصمیم (بله / خیر)</span>
            <span><i class="f"></i> سند / فرم</span>
          </div>`
        :`<div class="empty" style="margin-top:14px"><div class="ei">⟳</div>برای این فرآیند هنوز گامی تعریف نشده است
          ${canManageProcesses()?'<div style="margin-top:10px"><button class="btn btn-o btn-sm noprint" onclick="editProcess(\''+p.id+'\')">افزودن گام‌های فلوچارت</button></div>':''}</div>`}

        ${notify.length?`<div style="margin-top:14px;font-size:11.5px;color:var(--td);line-height:1.9">
          <b style="color:var(--gdl)">مسئولین آگاهی:</b> ${notify.map(u=>esc(u.full_name)).join('، ')}</div>`:''}

        <div class="chksign">
          <div><span>نام و امضای تدوین‌کننده</span><i></i></div>
          <div><span>نام و امضای تصویب‌کننده (تیم رهبری)</span><i></i></div>
        </div>
      </td></tr></tbody></table>
    </div>
  </div>`;
}

/**
 * Collaboration Dana Knowledge Base
 * Modular Frontend Component — Project 313
 */
// ==================== بانک دانش دانا ====================
// گردش تأیید پاسخهای دانا: draft → تأییدِ صاحبِ مدارک → confirmed (سرو به دانا).
// جای آن اینجا است نه پنل سوپرادمین: بازبینِ درست، مالکِ مدارکِ همان مرکز است
// (ادمین/مدیر اعتباربخشی/مدیر کنترل کیفیت — همه manage_documents دارند).
let KNF='draft';
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
          ${[['draft','در انتظار تأیید'],['confirmed','تأییدشده'],['rejected','ردشده']].map(([k,l])=>
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

async function renderSettings(){
  // BUG-09: نقشهای بیمجوز با URL مستقیم بهجای خطای خام، حالت خالی دوستانه ببینند
  if(!((S.user.permissions||[]).includes('manage_hospital_settings'))){
    $('ptitle').textContent='تنظیمات بیمارستان';
    $('content').innerHTML='<div class="panel g"><div class="empty"><div class="ei">⚙</div><b>این بخش در حوزهی نقش شما نیست</b><div style="margin-top:8px;color:var(--mut)">تنظیمات بیمارستان فقط برای مدیر سیستم است. <a href="javascript:void(0)" onclick="go(\'guide\')">راهنمای نقش من</a></div></div></div>';
    return;
  }
  $('ptitle').textContent='تنظیمات بیمارستان';
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const [st, pr, per, sig, col]=await Promise.all([API.settings(), API.hospitalProfile(),
      API.accreditationPeriod().catch(()=>({})), API.signatures().catch(()=>({signatures:[]})), API.colleagues().catch(()=>({users:[]}))]);
    const rem=await API.reminderRules().catch(()=>({rules:[],types:[],cron:{}}));
    const p=pr.profile||{}, v=f=>esc(p[f]!=null?p[f]:'');
    $('content').innerHTML=`
    <div class="panel g">
      <div class="phd"><div class="abadge">⚙</div><div><h3>مشخصات بیمارستان</h3>
        <div class="sub">${pr.completed?'پروفایل تکمیل شده است — می‌توانید مقادیر را به‌روز کنید':'پروفایل هنوز کامل نیست؛ فیلدهای ستاره‌دار را پر کنید'}</div></div></div>
      <div class="pbody">
        <div class="fg"><label>نام بیمارستان</label><input id="se_name" maxlength="120" value="${esc((st.hospital||{}).name||'')}"></div>
        <div class="docgrid">
          <div class="fg"><label>نوع بیمارستان ✱</label><select id="se_type" class="sel">
            <option value="">— انتخاب کنید —</option>
            ${HOSP_TYPES.map(t=>`<option${p.hospital_type===t?' selected':''}>${t}</option>`).join('')}</select></div>
          <div class="fg"><label>تعداد تخت فعال ✱</label><input id="se_beds" type="number" min="0" max="100000" value="${v('beds_count')}"></div>
          <div class="fg"><label>سال تأسیس</label><input id="se_year" type="number" min="1300" max="1500" value="${v('established_year')}"></div>
        </div>
        <div class="docgrid">
          <div class="fg"><label>استان ✱</label><input id="se_prov" maxlength="60" value="${v('province')}"></div>
          <div class="fg"><label>شهر ✱</label><input id="se_city" maxlength="60" value="${v('city')}"></div>
          <div class="fg"><label>وب‌سایت</label><input id="se_web" dir="ltr" style="text-align:left" maxlength="200" value="${v('website')}"></div>
        </div>
        <div class="docgrid">
          <div class="fg"><label>رئیس بیمارستان ✱</label><input id="se_ceo" maxlength="120" value="${v('ceo_name')}"></div>
          <div class="fg"><label>مدیر بهبود کیفیت</label><input id="se_qm" maxlength="120" value="${v('quality_manager_name')}"></div>
          <div class="fg"><label>تلفن تماس</label><input id="se_phone" dir="ltr" style="text-align:left" maxlength="30" value="${v('phone')}"></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:14px">
          <button class="btn btn-g" onclick="saveSettings()">ذخیره تغییرات</button>
          <button class="btn btn-o" onclick="maybeShowOnboarding(true)">نمایش دوباره ویزارد راه‌اندازی</button>
        </div>
      </div>
    </div>
    ${periodPanelHtml(per)}
    ${signaturePanelHtml(sig, col)}
    ${reminderPanelHtml(rem)}`;
    if((per||{}).can_edit) fillPeriodInputs(per.period||{});
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}

// ---- دوره‌ی سراسری اعتباربخشی ----
// یک بازه‌ی رسمی برای کل بیمارستان: در تنظیمات تعیین می‌شود، در داشبورد همه‌ی کاربران دیده می‌شود.
function periodPanelHtml(per){
  const d=(per||{}).period||{}, can=(per||{}).can_edit;
  const ro=!can;
  return `
  <div class="panel g">
    <div class="phd"><div class="abadge">◷</div><div><h3>دوره‌ی سراسری اعتباربخشی</h3>
      <div class="sub">${can?'بازه‌ی رسمی ورود اطلاعات — برای همه‌ی کاربران بیمارستان نمایش داده می‌شود':'فقط مدیر بهبود کیفیت یا مدیر سامانه می‌تواند این بازه را تغییر دهد'}</div></div></div>
    <div class="pbody">
      ${ro?`<div class="dpairs">
        ${dp('عنوان دوره', esc(d.title||'—'))}${dp('از تاریخ', faDateISO(d.start_date))}
        ${dp('تا تاریخ', faDateISO(d.end_date))}${dp('توضیح', esc(d.note||'—'))}</div>`:`
      <div class="fg"><label>عنوان دوره</label><input id="pd_title" maxlength="120" placeholder="مثال: دور ششم اعتباربخشی ۱۴۰۴" value="${esc(d.title||'')}"></div>
      <div class="docgrid">
        <div class="fg"><label>از تاریخ</label>${jalaliDateInputHtml('pd_from')}</div>
        <div class="fg"><label>تا تاریخ</label>${jalaliDateInputHtml('pd_to')}</div>
        <div class="fg"><label>وضعیت</label><select id="pd_active" class="sel">
          <option value="1"${d.is_active!==0?' selected':''}>فعال — بنر به همه نمایش داده شود</option>
          <option value="0"${d.is_active===0?' selected':''}>غیرفعال</option></select></div>
      </div>
      <div class="fg"><label>توضیح</label><input id="pd_note" maxlength="250" value="${esc(d.note||'')}"></div>
      <button class="btn btn-g" onclick="savePeriod()">ذخیره دوره</button>`}
    </div>
  </div>`;
}
// مقداردهی سلکت‌های تاریخ جلالی از مقدار ذخیره‌شده (میلادی ISO)
function fillPeriodInputs(d){
  const set=(pre,iso)=>{
    if(!iso) return; const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(iso); if(!m) return;
    const j=toJalali(+m[1],+m[2],+m[3]);
    const y=$(pre+'_y'); if(y){ y.value=j.jy; onJMonthChange(pre); }
    const mo=$(pre+'_m'); if(mo){ mo.value=j.jm; onJMonthChange(pre); }
    const dd=$(pre+'_d'); if(dd) dd.value=j.jd;
  };
  set('pd_from', d.start_date); set('pd_to', d.end_date);
}
async function savePeriod(){
  try{
    await API.saveAccreditationPeriod({title:($('pd_title').value||'').trim(), start_date:readJalaliDateInput('pd_from'),
      end_date:readJalaliDateInput('pd_to'), note:($('pd_note').value||'').trim(), is_active:$('pd_active').value==='1'});
    toast('دوره‌ی اعتباربخشی ذخیره شد'); renderSettings();
  }catch(e){ toast(e.message,true); }
}
// ---- امضای الکترونیکی ----
// نمونه‌ی امضا یا برای یک همکار مشخص است یا «نمونه‌ی فعال بیمارستان» (برای کسانی که امضای شخصی ندارند).
function sigImgTag(fileName, h){
  return `<img src="/api/signatures/image/${encodeURIComponent(fileName)}" alt="امضا"
    style="height:${h||34}px;max-width:150px;object-fit:contain;background:#fff;border-radius:4px;padding:2px">`;
}
function signaturePanelHtml(sig, col){
  const rows=(sig||{}).signatures||[];
  return `
  <div class="panel g">
    <div class="phd"><div class="abadge">✍</div><div><h3>امضای الکترونیکی</h3>
      <div class="sub">تصویر امضا هنگام «امضای من» روی مدارک کنترل‌شده درج می‌شود — امضای اختصاصی کاربر، وگرنه نمونه‌ی فعال بیمارستان</div></div></div>
    <div class="pbody">
      ${!rows.length?'<div class="empty"><div class="ei">✍</div>هنوز نمونه‌ی امضایی بارگذاری نشده است</div>':`
      <div class="tbl-wrap"><table><thead><tr><th>تصویر</th><th>برچسب</th><th>مسئول</th><th>وضعیت</th><th></th></tr></thead>
      <tbody>${rows.map(s=>`<tr>
        <td>${sigImgTag(s.file_name)}</td><td>${esc(s.label||'—')}</td>
        <td>${s.user_name?esc(s.user_name):'<span style="color:var(--td)">نمونه‌ی بیمارستان</span>'}</td>
        <td>${s.is_active?'<span class="bdg b1">نمونه‌ی فعال</span>':''}</td>
        <td style="white-space:nowrap">
          ${(s.is_active||s.user_id)?'':`<button class="tgl" onclick="activateSig('${s.id}')">فعال‌کردن</button>`}
          <button class="tgl" onclick="delSig('${s.id}')">حذف</button></td></tr>`).join('')}</tbody></table></div>`}
      <div class="docgrid" style="margin-top:12px">
        <div class="fg" style="margin:0"><label>تصویر امضا (JPG/PNG/WEBP)</label><input id="sg_file" type="file" accept="image/*"></div>
        <div class="fg" style="margin:0"><label>برچسب</label><input id="sg_label" maxlength="80" placeholder="مثال: امضای رئیس بیمارستان"></div>
        <div class="fg" style="margin:0"><label>مسئول امضا</label><select id="sg_user" class="sel">
          <option value="">— نمونه‌ی عمومی بیمارستان —</option>
          ${((col||{}).users||[]).map(u=>`<option value="${u.id}">${esc(u.full_name)}</option>`).join('')}</select></div>
        <button class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px" onclick="uploadSig()">⇧ بارگذاری امضا</button>
      </div>
    </div>
  </div>`;
}
async function uploadSig(){
  const f=$('sg_file').files[0];
  if(!f){ toast('یک فایل تصویر انتخاب کنید',true); return; }
  try{ await API.uploadSignature(f, ($('sg_label').value||'').trim(), $('sg_user').value||''); toast('امضا بارگذاری شد'); renderSettings(); }
  catch(e){ toast(e.message,true); }
}
async function activateSig(id){
  try{ await API.activateSignature(id); toast('نمونه‌ی فعال بیمارستان تعیین شد'); renderSettings(); }
  catch(e){ toast(e.message,true); }
}
async function delSig(id){
  try{ await API.deleteSignature(id); toast('امضا حذف شد'); renderSettings(); }
  catch(e){ toast(e.message,true); }
}

// ---- قوانین یادآوری خودکار ----
// خروجی این قوانین در «کارتابل من» ظاهر می‌شود (نه یک زنگوله‌ی جدا)، پس بج منو هم شاملش می‌شود.
const REM_CHANNEL_FA={inbox:'فقط کارتابل', email:'کارتابل + ایمیل', sms:'کارتابل + پیامک', all:'کارتابل + ایمیل + پیامک'};
function reminderPanelHtml(rem){
  const rules=(rem||{}).rules||[], types=(rem||{}).types||[], cron=(rem||{}).cron||{};
  const chOpts=(v)=>Object.entries(REM_CHANNEL_FA).map(([k,l])=>`<option value="${k}"${v===k?' selected':''}>${l}</option>`).join('');
  return `
  <div class="panel g">
    <div class="phd"><div class="abadge">⏰</div><div><h3>قوانین یادآوری خودکار</h3>
      <div class="sub">یادآوری‌ها در «کارتابل من» همه‌ی کاربران مرتبط ظاهر می‌شوند — ایمیل و پیامک اختیاری‌اند</div></div></div>
    <div class="pbody">
      ${!rules.length?'<div class="empty"><div class="ei">⏰</div>قانونی تعریف نشده است</div>':`
      <div class="tbl-wrap"><table><thead><tr><th>نام</th><th>موضوع</th><th>چند روز قبل</th><th>کانال</th><th>وضعیت</th><th></th></tr></thead>
      <tbody>${rules.map(r=>`<tr>
        <td style="color:var(--th)">${esc(r.name)}</td><td>${esc(r.type_fa||r.rule_type)}</td>
        <td><input id="rr_d_${r.id}" type="number" min="0" max="365" value="${r.days_before}" style="width:74px;padding:5px 8px;border-radius:7px;background:var(--subpanel-2);border:1px solid var(--bd);color:var(--th);font-family:inherit"></td>
        <td><select id="rr_c_${r.id}" class="sel" style="min-width:150px">${chOpts(r.channel)}</select></td>
        <td><span class="bdg ${r.enabled?'b1':'b3'}">${r.enabled?'فعال':'غیرفعال'}</span></td>
        <td style="white-space:nowrap">
          <button class="tgl" onclick="saveRule('${r.id}','${esc(r.name)}','${r.rule_type}',${r.enabled?1:0})">ذخیره</button>
          <button class="tgl" onclick="saveRule('${r.id}','${esc(r.name)}','${r.rule_type}',${r.enabled?0:1})">${r.enabled?'غیرفعال‌کردن':'فعال‌کردن'}</button>
          <button class="tgl dngr" onclick="delRule('${r.id}')">حذف</button></td></tr>`).join('')}</tbody></table></div>`}
      <div class="docgrid" style="margin-top:12px">
        <div class="fg" style="margin:0"><label>نام قانون جدید</label><input id="rr_name" maxlength="120" placeholder="مثال: بازبینی مدارک بخش اورژانس"></div>
        <div class="fg" style="margin:0"><label>موضوع</label><select id="rr_type" class="sel">
          ${types.map(t=>`<option value="${t.code}">${esc(t.title)}</option>`).join('')}</select></div>
        <div class="fg" style="margin:0"><label>چند روز قبل از سررسید</label><input id="rr_days" type="number" min="0" max="365" value="7"></div>
        <div class="fg" style="margin:0"><label>کانال</label><select id="rr_ch" class="sel">${chOpts('inbox')}</select></div>
        <button class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px" onclick="addRule()">+ افزودن قانون</button>
      </div>
      <div style="margin-top:12px;font-size:11.5px;color:var(--td)">
        وضعیت زمان‌بند: ایمیل ${cron.email_configured?'پیکربندی شده':'پیکربندی نشده'} ·
        پیامک ${cron.sms_configured?'پیکربندی شده':'پیکربندی نشده'} ·
        بازه‌ی اجرا هر ${fa(cron.interval_hours||6)} ساعت
        ${cron.last_run?` · آخرین اجرا: ${faDateTime(cron.last_run.ran_at)} (${fa(cron.last_run.items_found||0)} قلم)`:' · هنوز اجرا نشده'}
        <br>تا وقتی ایمیل/پیامک پیکربندی نشده باشد، یادآوری‌ها فقط در کارتابل نمایش داده می‌شوند.
      </div>
    </div>
  </div>`;
}
function ruleFormBody(id, name, type, enabled){
  return {name, rule_type:type, days_before:+($('rr_d_'+id).value||7), channel:$('rr_c_'+id).value, enabled:!!enabled};
}
async function saveRule(id, name, type, enabled){
  try{ await API.updateReminderRule(id, ruleFormBody(id,name,type,enabled)); toast('قانون به‌روزرسانی شد'); renderSettings(); }
  catch(e){ toast(e.message,true); }
}
async function addRule(){
  const name=($('rr_name').value||'').trim();
  if(!name){ toast('نام قانون الزامی است',true); return; }
  try{ await API.createReminderRule({name, rule_type:$('rr_type').value, days_before:+($('rr_days').value||7),
    channel:$('rr_ch').value, enabled:true}); toast('قانون افزوده شد'); renderSettings(); }
  catch(e){ toast(e.message,true); }
}
async function delRule(id){
  try{ await API.deleteReminderRule(id); toast('قانون حذف شد'); renderSettings(); }
  catch(e){ toast(e.message,true); }
}

// بنر داشبورد — بی‌صدا شکست می‌خورد؛ نبودِ دوره نباید داشبورد را خراب کند
async function loadPeriodBanner(){
  const box=$('periodBanner'); if(!box) return;
  try{
    const r=await API.accreditationPeriod();
    const d=r.period; if(!d || d.is_active===0 || (!d.start_date && !d.end_date)){ box.innerHTML=''; return; }
    let left=null;
    if(d.end_date){ left=Math.ceil((new Date(d.end_date+'T00:00:00Z')-new Date(todayISO()+'T00:00:00Z'))/86400000); }
    const cls=left===null?'':(left<0?'b3':(left<=30?'b2':'b1'));
    box.innerHTML=`<div class="panel g"><div class="pbody" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <span class="bdg ${cls}">◷ دوره‌ی اعتباربخشی</span>
      <b>${escn(d.title||'دوره‌ی جاری')}</b>
      <span style="color:var(--gdl)">${faDateISO(d.start_date)} تا ${faDateISO(d.end_date)}</span>
      ${left===null?'':(left<0?`<span style="color:var(--dn)">مهلت به پایان رسیده است</span>`
        :`<span style="color:var(--td)">${fa(left)} روز تا پایان مهلت</span>`)}
      ${d.note?`<span style="color:var(--td);font-size:12px">${escn(d.note)}</span>`:''}
    </div></div>`;
  }catch(e){ box.innerHTML=''; }
}
async function saveSettings(){
  const g=id=>($(id).value||'').trim();
  const prof={hospital_type:g('se_type'), beds_count:g('se_beds'), established_year:g('se_year'),
    province:g('se_prov'), city:g('se_city'), website:g('se_web'),
    ceo_name:g('se_ceo'), quality_manager_name:g('se_qm'), phone:g('se_phone')};
  try{
    // نام بیمارستان روی جدول hospitals است و پروفایل روی hospital_profiles — دو مسیر جدا
    if(g('se_name')) await API.updateSettings({name:g('se_name')});
    const r=await API.saveHospitalProfile(prof);
    if(g('se_name')) S.user.hospital_name=g('se_name');
    toast(r.completed?'تنظیمات ذخیره شد':'ذخیره شد — پروفایل هنوز کامل نیست');
    renderSettings();
  }catch(e){ toast(e.message,true); }
}


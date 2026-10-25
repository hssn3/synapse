/**
 * Dana Knowledge Base & Internal Messages
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
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
          <button class="tgl" data-rule-id="${esc(r.id)}" data-rule-name="${esc(r.name)}" data-rule-type="${esc(r.rule_type)}" data-enabled="1" onclick="saveRuleFromBtn(this)">ذخیره</button>
          <button class="tgl" data-rule-id="${esc(r.id)}" data-rule-name="${esc(r.name)}" data-rule-type="${esc(r.rule_type)}" data-enabled="0" onclick="saveRuleFromBtn(this)">${r.enabled?'غیرفعال‌کردن':'فعال‌کردن'}</button>
          <button class="tgl dngr" data-rule-id="${esc(r.id)}" onclick="delRuleFromBtn(this)">حذف</button></td></tr>`).join('')}</tbody></table></div>`}
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
// نام/نوع قانون از data-* خوانده می‌شود، نه از رشتهٔ onclick؛ در غیر این صورت
// موجودیت‌های HTML داخل ویژگیِ رویداد پیش از اجرای JS برمی‌گردند و نامِ شامل
// کوتیشن می‌تواند کد اجرا کند.
function saveRuleFromBtn(btn){
  const d=btn.dataset;
  return saveRule(d.ruleId, d.ruleName, d.ruleType, d.enabled==='1'?1:0);
}
function delRuleFromBtn(btn){
  return delRule(btn.dataset.ruleId);
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

// ==================== پیام‌های داخلی ====================
// عمداً کلاینت ایمیل نیست: سه صندوق، یک فرم نوشتن، بدون پوشه/رونوشت/پیوست.
const MSG={box:'inbox', compose:false, editId:null, colleagues:[]};
const MSG_CAT_FA={general:'عمومی', meeting_invite:'دعوت‌نامه جلسه', task:'دستور کار', announcement:'اطلاعیه'};
const MSG_CAT_IC={general:'✉', meeting_invite:'❖', task:'✔', announcement:'◈'};
const MSG_BOXES=[['inbox','📥 دریافتی'],['sent','📤 ارسالی'],['drafts','📝 پیش‌نویس']];

function setMsgBox(b){ MSG.box=b; MSG.compose=false; MSG.editId=null; renderMessages(); }
function openCompose(){ MSG.compose=true; MSG.editId=null; renderMessages(); }
function closeCompose(){ MSG.compose=false; MSG.editId=null; renderMessages(); }

async function renderMessages(){
  $('ptitle').textContent='پیام‌های داخلی';
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const [res, col]=await Promise.all([API.messages(MSG.box), API.colleagues()]);
    MSG.colleagues=col.users||[];
    const rows=res.messages||[];
    const editing=MSG.editId?rows.find(m=>m.id===MSG.editId):null;
    const isInbox=MSG.box==='inbox', isDrafts=MSG.box==='drafts';
    // ستون «طرف مقابل» بسته به صندوق معنای متفاوتی دارد؛ دو جدول جدا نمی‌سازیم
    const peerHd=isInbox?'فرستنده':'گیرنده';

    $('content').innerHTML=`
    <div class="panel g">
      <div class="phd"><div class="abadge">✉</div><div><h3>پیام‌های داخلی</h3>
        <div class="sub">پیام‌رسانی بین همکاران همین بیمارستان — بدون خروج از سامانه</div></div>
        <button class="btn btn-g btn-sm" onclick="openCompose()">✎ نوشتن پیام</button></div>
      <div class="pbody">
        <div class="doctabs">${MSG_BOXES.map(([k,l])=>
          `<button class="btn btn-sm ${MSG.box===k?'btn-g':'btn-o'}" onclick="setMsgBox('${k}')">${l}</button>`).join('')}</div>
        ${(MSG.compose||editing)?msgComposeHtml(editing):''}
        ${!rows.length?`<div class="empty"><div class="ei">✉</div>
          <div style="margin-top:6px">${isDrafts
            ? 'پیشنویسی ذخیره نشده — بنویسید و هر وقت کامل شد بفرستید.'
            : (isInbox ? 'پیامی دریافت نکردهاید. به همکاران همین بیمارستان بدون خروج از سامانه پیام بدهید.' : 'هنوز پیامی نفرستادید.')}</div>
          <div style="margin-top:10px"><button class="btn btn-g btn-sm" onclick="openCompose()">✎ نوشتن پیام</button></div></div>`:`
        <div class="tbl-wrap"><table><thead><tr>
          <th>نوع</th><th>موضوع</th><th>${peerHd}</th><th>تاریخ</th><th></th></tr></thead><tbody>
        ${rows.map(m=>{
          const unread=isInbox&&!m.is_read;
          const peer=isInbox?m.sender_name:(m.recipient_name||'—');
          return `<tr style="${unread?'background:rgba(212,175,90,.07)':''}">
            <td style="white-space:nowrap">${MSG_CAT_IC[m.category]||'✉'} ${esc(MSG_CAT_FA[m.category]||'عمومی')}</td>
            <td><span style="${unread?'font-weight:800;color:var(--gdl)':''}">${esc(m.subject)}</span>
              ${unread?' <span class="bdg b2">جدید</span>':''}
              ${m.meeting_title?`<div style="font-size:11.5px;color:var(--td);margin-top:3px">❖ ${esc(m.meeting_title)}${m.meeting_date?' — '+faDateISO(m.meeting_date):''}${m.meeting_start?' ساعت '+esc(m.meeting_start):''}</div>`:''}
              ${m.body?`<div style="font-size:12px;color:var(--td);margin-top:3px">${esc(String(m.body).slice(0,110))}${String(m.body).length>110?'…':''}</div>`:''}</td>
            <td>${esc(peer)}</td>
            <td style="white-space:nowrap;color:var(--gdl)">${faDateTime(m.sent_at||m.created_at)}</td>
            <td style="white-space:nowrap">
              ${isInbox?`<button class="btn btn-sm" onclick="toggleMsgRead('${m.id}',${m.is_read?0:1})">${m.is_read?'نخوانده':'خوانده شد'}</button>`:''}
              ${isDrafts?`<button class="btn btn-sm" onclick="editDraft('${m.id}')">ویرایش</button>`:''}
              ${(isInbox||isDrafts)?`<button class="btn btn-sm btn-o" onclick="removeMessage('${m.id}')">حذف</button>`:''}
            </td></tr>`;
        }).join('')}
        </tbody></table></div>`}
      </div>
    </div>`;
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}

function msgComposeHtml(d){
  const v=f=>esc((d&&d[f])||'');
  return `<div style="margin-bottom:16px;padding:16px 18px;border-radius:12px;background:var(--subpanel);border:1px solid var(--bd)">
    <div style="font-size:12.5px;color:var(--gdl);font-weight:700;margin-bottom:12px">${d?'ویرایش پیش‌نویس':'پیام جدید'}</div>
    <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:12px">
      <div class="fg"><label>گیرنده</label><select id="mg_to" class="sel">
        <option value="">— انتخاب همکار —</option>
        ${MSG.colleagues.map(u=>`<option value="${u.id}"${d&&d.recipient_id===u.id?' selected':''}>${esc(u.full_name)}${u.department?' — '+esc(u.department):''}</option>`).join('')}
      </select></div>
      <div class="fg"><label>دسته‌بندی</label><select id="mg_cat" class="sel">
        ${Object.entries(MSG_CAT_FA).map(([k,l])=>`<option value="${k}"${d&&d.category===k?' selected':''}>${l}</option>`).join('')}
      </select></div>
    </div>
    <div class="fg"><label>موضوع</label><input id="mg_sub" maxlength="200" value="${v('subject')}" placeholder="موضوع پیام"></div>
    <div class="fg"><label>متن پیام</label><textarea id="mg_body" rows="4" maxlength="8000" placeholder="متن پیام…">${v('body')}</textarea></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-g" onclick="submitMessage(false)">ارسال</button>
      <button class="btn btn-o" onclick="submitMessage(true)">ذخیره پیش‌نویس</button>
      <button class="btn btn-o" onclick="closeCompose()">انصراف</button>
    </div>
  </div>`;
}

async function submitMessage(asDraft){
  const body={recipient_id:$('mg_to').value||null, category:$('mg_cat').value,
    subject:$('mg_sub').value.trim(), body:$('mg_body').value.trim()};
  if(!body.subject){ toast('موضوع پیام را وارد کنید',true); return; }
  if(!asDraft&&!body.recipient_id){ toast('گیرنده را انتخاب کنید',true); return; }
  try{
    if(MSG.editId) await API.updateMessage(MSG.editId, Object.assign({}, body, {send:!asDraft}));
    else await API.sendMessage(Object.assign({}, body, {is_draft:asDraft}));
    toast(asDraft?'پیش‌نویس ذخیره شد':'پیام ارسال شد');
    MSG.compose=false; MSG.editId=null;
    MSG.box=asDraft?'drafts':'sent';
    renderMessages(); refreshNavBadges();
  }catch(e){ toast(e.message,true); }
}
function editDraft(id){ MSG.editId=id; MSG.compose=true; renderMessages(); }
async function toggleMsgRead(id,val){
  try{ await API.updateMessage(id,{is_read:!!val}); renderMessages(); refreshNavBadges(); }
  catch(e){ toast(e.message,true); }
}
async function removeMessage(id){
  if(!await BTN.confirmDanger('این پیام حذف شود؟')) return;
  try{ await API.deleteMessage(id); toast('پیام حذف شد'); renderMessages(); refreshNavBadges(); }
  catch(e){ toast(e.message,true); }
}

// ==================== COMMITTEES ====================
let COMS=[]; let openCommitteeId=null;
const FA_FREQ={weekly:'هفتگی',monthly:'ماهانه',quarterly:'فصلی'};
async function renderCommittees(){
  $('ptitle').textContent='کمیته‌های بیمارستان';
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const {committees}=await API.committees();
    COMS=committees||[];
    drawCommittees();
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}
function drawCommittees(){
  const canManage=(S.user.permissions||[]).includes('manage_committees');
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd noprint"><div class="abadge">❖</div><div><h3>کمیته‌های الزامی بیمارستان</h3>
      <div class="sub">${fa(COMS.length)} کمیته — روی هر کارت کلیک کنید تا صورت‌جلسات آن باز شود</div></div>
      <button class="btn btn-o btn-sm noprint" onclick="printCommitteesRegister()">${ic('print')} چاپ فهرست</button></div>
    <div class="pbody">
      ${!COMS.length?'<div class="empty"><div class="ei">❖</div>کمیته‌ای ثبت نشده</div>':`
      <div style="display:flex;flex-wrap:wrap;gap:11px">
        ${COMS.map(c=>`<div class="ccard g" style="--ccolor:${esc(c.theme_color||'#d4af5a')}" onclick="toggleCommittee('${c.id}')">
          <span class="cdot"></span>
          <div style="flex:1"><div style="color:var(--th);font-weight:600">${esc(c.name)}</div>
          <div style="font-size:10px;color:var(--td);margin-top:3px">${esc(FA_FREQ[c.meeting_frequency]||c.meeting_frequency||'—')} · ${fa(c.meetings_count||0)} صورت‌جلسه${c.chairperson_name?' · رئیس: '+esc(c.chairperson_name):''}</div></div>
        </div>`).join('')}
      </div>`}
    </div>
  </div>
  <div id="comDetail"></div>
  ${canManage?`
  <div class="panel g">
    <div class="phd"><div class="abadge">+</div><div><h3>افزودن کمیته اختصاصی</h3>
      <div class="sub">برای نیازهای خاص این بیمارستان، جدای ۱۷ کمیته الزامی استاندارد</div></div></div>
    <div class="pbody">
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px">
        <div class="fg"><label>نام کمیته</label><input id="nc_name" placeholder="مثال: کمیته دارو و درمان تخصصی"></div>
        <div class="fg"><label>تناوب جلسات</label>
          <select id="nc_freq"><option value="monthly">ماهانه</option><option value="quarterly">فصلی</option><option value="weekly">هفتگی</option></select></div>
      </div>
      <button class="btn btn-g" onclick="addCommittee()">ایجاد کمیته</button>
    </div>
  </div>`:''}`;
  if(openCommitteeId) loadCommitteeDetail(openCommitteeId);
}

// چاپ فهرست کمیته‌ها — برای پرونده‌ی اعتباربخشی (الف-۱-۵-۲) و جلسات ماهانه
function printCommitteesRegister(){
  if(!COMS.length){ toast('کمیته‌ای برای چاپ نیست',true); return; }
  printListSheet({
    page:'committees', title:'فهرست کمیته‌های بیمارستان', code:'RPT-COM',
    intro:'کمیته‌های الزامی و اختصاصی همراه با مسئول و تناوب جلسات.',
    meta:[['تعداد کمیته‌ها', fa(COMS.length)]],
    headers:['نام کمیته','تناوب جلسات','رئیس/مسئول','تعداد صورت‌جلسه'],
    rows:COMS.map(c=>[esc(c.name),
      FA_FREQ[c.meeting_frequency]||esc(c.meeting_frequency||'—'),
      esc(c.chairperson_name||'—'),
      fa(c.meetings_count||0)]),
    foot:'کمیته‌های بیمارستان',
  });
}
async function toggleCommittee(id){
  openCommitteeId = openCommitteeId===id ? null : id;
  if(!openCommitteeId){ $('comDetail').innerHTML=''; return; }
  await loadCommitteeDetail(id);
}
async function loadCommitteeDetail(id){
  const c=COMS.find(x=>x.id===id); if(!c) return;
  const box=$('comDetail'); if(!box) return;
  box.innerHTML=`${committeeContentHtml(c)}
    <div class="panel gs"><div class="phd"><div class="abadge" style="background:${esc(c.theme_color)};border-color:${esc(c.theme_color)}">🗓</div>
    <div><h3>زمان‌بندی جلسات</h3><div class="sub">رزرو اتاق جلسه — تداخل رزرو در سرور رد می‌شود</div></div></div>
    <div class="pbody" id="comMeetings"><div class="empty">در حال بارگذاری…</div></div></div>
    <div class="panel gs"><div class="phd"><div class="abadge" style="background:${esc(c.theme_color)};border-color:${esc(c.theme_color)}">❖</div>
    <div><h3>${esc(c.name)}</h3><div class="sub">صورت‌جلسات ثبت‌شده — طبق حداقل‌های سنجه‌ی الف-۱-۵-۲</div></div></div>
    <div class="pbody" id="comMinutes"><div class="empty">در حال بارگذاری…</div></div></div>`;
  loadCommitteeMeetings(id);
  try{
    const {minutes,required}=await API.committeeMinutes(id);
    CM_REQUIRED=required||CM_REQUIRED;
    const canCreate=(S.user.permissions||[]).includes('create_committee_minutes');
    if(!MSG.colleagues.length){ try{ MSG.colleagues=(await API.colleagues()).users||[]; }catch(e){} }
    $('comMinutes').innerHTML=`
      ${!minutes.length?'<div class="empty">هنوز صورت‌جلسه‌ای ثبت نشده</div>':`
      ${exBanner(minutes.find(m=>m.is_example))}
      <div class="tbl-wrap"><table><thead><tr><th>تاریخ جلسه</th><th>ساعت و محل</th><th>حاضر / غایب</th>
        <th>دستور کار</th><th>مصوبات</th><th>کامل بودن</th><th></th></tr></thead><tbody>
      ${minutes.map(m=>`<tr${m.is_example?' class="exrow"':''}>
        <td style="white-space:nowrap;color:var(--gdl)">${faDateISO(m.meeting_date)}${exBdg(m)}</td>
        <td style="white-space:nowrap">${m.start_time?fa(m.start_time+(m.end_time?' - '+m.end_time:'')):'—'}${m.location?'<br><span style="font-size:10.5px;color:var(--td)">'+esc(m.location)+'</span>':''}</td>
        <td style="white-space:nowrap">${fa(m.attendees.length)} / ${fa(m.absentees.length)}</td>
        <td>${fa(m.agenda_items.length)} بند</td>
        <td>${fa(m.decisions.length)} مصوبه${m.decisions.filter(d=>d.task_status==='completed').length?` <span class="bdg b1">${fa(m.decisions.filter(d=>d.task_status==='completed').length)} انجام‌شده</span>`:''}</td>
        <td>${cmCompleteBadge(m)}</td>
        <td style="white-space:nowrap"><button class="btn btn-o btn-sm" onclick="openMinute('${id}','${m.id}')">مشاهده و چاپ</button></td></tr>`).join('')}
      </tbody></table></div>`}
      ${canCreate?`<button class="btn btn-g" style="margin-top:16px" onclick="startMinute('${id}')">+ ثبت صورت‌جلسه جدید</button>
        <div id="cmForm"></div>`:''}`;
    applyFieldGuides();
  }catch(e){ $('comMinutes').innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}

// ---------- صورت‌جلسه طبق شش بندِ الف-۱-۵-۲ ----------
// کتاب: «حداقل‌های مورد انتظار فرم صورتجلسه کمیته شامل ۱. تاریخ، ساعت و محل برگزاری
// جلسه ۲. دستور کار جلسه، فهرست افراد حاضر و غایب ۳. نتایج پیگیری مصوبات جلسات قبل
// ۴. شرح مباحث/ مذاکرات مطرح شده در جلسه ۵. مصوبات جلسه، مسئول پیگیری مصوبات، مهلت
// زمانی اجرای مصوبات ۶. امضای اعضای حاضر و ذکر اسامی اعضای غایب جلسه و اخذ امضای
// غایبین پس از جلسه». هر بندی که پر نشده باشد همین‌جا هشدار می‌گیرد — نه در روز ارزیابی.
let CM_REQUIRED=[];
let CM={cid:null, mid:null, agenda:[], dec:[], att:[], abs:[], prev:[], prevOf:null};
const CM_FOLLOW=[['done','انجام شد'],['partial','در حال اجرا'],['not_done','انجام نشد'],['dropped','منتفی شد']];
const CM_FOLLOW_FA=Object.fromEntries(CM_FOLLOW);
const CM_TASK_FA={assigned:'ارجاع‌شده', in_progress:'در حال اجرا', completed:'انجام شد', overdue:'معوق'};
function cmCompleteBadge(m){
  const miss=m.missing||[];
  if(!miss.length) return '<span class="bdg b1">کامل</span>';
  const names=miss.map(k=>(CM_REQUIRED.find(r=>r[0]===k)||[,k])[1]).join('، ');
  return `<span class="bdg b3" title="${esc(names)}">${fa(miss.length)} بند ناقص</span>`;
}
const cmName=(p)=>typeof p==='string'?p:((p&&(p.name||p.full_name))||'');

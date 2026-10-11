/**
 * Collaboration Committee Minutes & Decisions
 * Modular Frontend Component — Project 313
 */
    <div style="font-size:12px;color:var(--gdl);font-weight:700;margin:18px 0 8px">۵. مصوبات جلسه</div>
    <div style="font-size:11.5px;color:var(--td);line-height:1.9;margin-bottom:8px">
      مصوبه‌ای که مسئول و مهلت داشته باشد، خودکار به کارتابل همان شخص می‌رود و وضعیتش روی صورت‌جلسه دیده می‌شود.</div>
    <div id="cmDecRows"></div>
    <div style="display:grid;grid-template-columns:2fr 1.3fr 1.1fr 1.4fr auto;gap:8px;margin-top:8px;align-items:end">
      <div class="fg" style="margin:0"><label>چه کاری</label><input id="cm_dec_what" placeholder="آموزش شست‌وشوی دست"></div>
      <div class="fg" style="margin:0"><label>مسئول پیگیری</label><select id="cm_dec_resp" class="sel"><option value="">— انتخاب همکار —</option>${opts}</select></div>
      <div class="fg" style="margin:0"><label>یا نام مسئول</label><input id="cm_dec_resp_txt" placeholder="خارج از سامانه"></div>
      <div class="fg" style="margin:0"><label>مهلت (شمسی)</label>${jalaliDateInputHtml('cm_dec_dl')}</div>
      <button class="btn btn-o btn-sm" style="margin-bottom:1px" onclick="addDecRow()">+ افزودن مصوبه</button>
    </div>

    <div class="fg" style="margin-top:16px"><label>تاریخ جلسه‌ی بعدی (اختیاری)</label>${jalaliDateInputHtml('cm_next')}</div>

    <div style="display:flex;gap:8px;margin-top:16px">
      <button class="btn btn-g" onclick="saveMinutes()">${CM.mid?'ذخیره‌ی تغییرات':'ثبت صورت‌جلسه'}</button>
      <button class="btn btn-o" onclick="$('cmForm').innerHTML=''">انصراف</button>
    </div>
  </div>`;
  if(m.meeting_date) setJalaliDateInput('cm_date', m.meeting_date);
  if(m.next_meeting_date) setJalaliDateInput('cm_next', m.next_meeting_date);
  drawAgendaRows(); drawAttRows(); drawPrevRows(); drawDecRows();
  applyFieldGuides();
  box.scrollIntoView({behavior:'smooth', block:'start'});
}
function drawAttRows(){
  const box=$('cmAttRows'); if(!box) return;
  const rows=[...CM.att.map((a,i)=>({a,i,abs:0})), ...CM.abs.map((a,i)=>({a,i,abs:1}))];
  box.innerHTML=rows.length?`<div class="tbl-wrap"><table><thead><tr><th>نام</th><th>وضعیت</th><th>علت غیبت</th><th></th></tr></thead>
    <tbody>${rows.map(r=>`<tr><td style="color:var(--th)">${esc(cmName(r.a))}</td>
      <td>${r.abs?'<span class="bdg b2">غایب</span>':'<span class="bdg b1">حاضر</span>'}</td>
      <td>${esc((r.a&&r.a.reason)||'—')}</td>
      <td><button class="tgl" onclick="removeAttRow(${r.abs},${r.i})">حذف</button></td></tr>`).join('')}</tbody></table></div>`
    :'<div style="font-size:12px;color:var(--td)">هنوز حاضر یا غایبی ثبت نشده است.</div>';
}
function addAttRow(isAbsent){
  const sel=$('cm_att_sel'), txt=$('cm_att_txt').value.trim();
  const uid=sel.value||null;
  const name=uid?sel.options[sel.selectedIndex].text:txt;
  if(!name){ toast('یک همکار انتخاب کنید یا نام را دستی بنویسید',true); return; }
  const row={user_id:uid, name};
  if(isAbsent && uid && txt) row.reason=txt;   // با همکارِ انتخاب‌شده، متنِ آزاد یعنی علت غیبت
  (isAbsent?CM.abs:CM.att).push(row);
  sel.value=''; $('cm_att_txt').value='';
  drawAttRows();
}
function removeAttRow(isAbsent,i){ (isAbsent?CM.abs:CM.att).splice(i,1); drawAttRows(); }
function drawPrevRows(){
  const box=$('cmPrevRows'); if(!box) return;
  if(!CM.prev.length){
    box.innerHTML=`<div style="font-size:12px;color:var(--td)">${CM.mid
      ?'برای این صورت‌جلسه پیگیری مصوبه‌ی قبلی ثبت نشده است.'
      :'جلسه‌ی قبلی‌ای با مصوبه پیدا نشد — این بند برای اولین جلسه موضوعاً منتفی است.'}</div>`;
    return;
  }
  box.innerHTML=`${CM.prevOf?`<div style="font-size:11.5px;color:var(--td);margin-bottom:6px">مصوبات جلسه‌ی ${faDateISO(CM.prevOf)}</div>`:''}
    <div class="tbl-wrap"><table><thead><tr><th>مصوبه</th><th>مسئول</th><th>نتیجه‌ی پیگیری</th><th>توضیح</th></tr></thead>
    <tbody>${CM.prev.map((p,i)=>`<tr><td style="color:var(--th)">${esc(p.what||'')}</td>
      <td>${esc(p.responsible_name||'—')}</td>
      <td><select class="sel" onchange="CM.prev[${i}].result=this.value">
        <option value="">— انتخاب —</option>
        ${CM_FOLLOW.map(([k,v])=>`<option value="${k}" ${p.result===k?'selected':''}>${v}</option>`).join('')}</select></td>
      <td><input value="${esc(p.note||'')}" oninput="CM.prev[${i}].note=this.value" placeholder="توضیح"></td></tr>`).join('')}
    </tbody></table></div>`;
}
function safeArr(v){ if(Array.isArray(v)) return v; try{ const p=JSON.parse(v); return Array.isArray(p)?p:[]; }catch{ return []; } }
// یک مصوبه ممکن است داده‌ی قدیمی (رشته‌ی ساده) یا داده‌ی جدید (شیء ساختاریافته) باشد — هر دو را نمایش می‌دهیم
function decisionText(d){
  if(typeof d==='string') return d;
  if(d && typeof d==='object'){
    let t=d.what||'';
    if(d.responsible_name) t+=' — مسئول: '+d.responsible_name;
    if(d.deadline) t+=' — مهلت: '+faDateISO(d.deadline);
    return t;
  }
  return String(d||'');
}
// ---------- ردیف‌های دستور کار و مصوبات صورت‌جلسه (افزودن/حذف، بدون کاما) ----------
function drawAgendaRows(){
  const box=$('cmAgendaRows'); if(!box) return;
  box.innerHTML=CM.agenda.length?`<div class="tbl-wrap"><table><thead><tr><th>#</th><th>بند دستور کار</th><th></th></tr></thead>
    <tbody>${CM.agenda.map((a,i)=>`<tr><td style="color:var(--td)">${fa(i+1)}</td><td style="color:var(--th)">${esc(a)}</td>
      <td><button class="tgl" onclick="removeAgendaRow(${i})">حذف</button></td></tr>`).join('')}</tbody></table></div>`
    :'<div style="font-size:12px;color:var(--td)">هنوز بندی افزوده نشده است.</div>';
}
function addAgendaRow(){
  const v=$('cm_agenda_new').value.trim();
  if(!v){ toast('متن بند دستور کار الزامی است',true); return; }
  CM.agenda.push(v); $('cm_agenda_new').value=''; drawAgendaRows(); $('cm_agenda_new').focus();
}
function removeAgendaRow(i){ CM.agenda.splice(i,1); drawAgendaRows(); }
function drawDecRows(){
  const box=$('cmDecRows'); if(!box) return;
  box.innerHTML=CM.dec.length?`<div class="tbl-wrap"><table><thead><tr><th>#</th><th>چه کاری</th><th>مسئول</th><th>مهلت</th><th>وضعیت</th><th></th></tr></thead>
    <tbody>${CM.dec.map((d,i)=>`<tr><td style="color:var(--td)">${fa(i+1)}</td><td style="color:var(--th)">${esc(d.what)}</td>
      <td>${esc(d.responsible_name||'—')}</td><td>${d.deadline?faDateISO(d.deadline):'—'}</td>
      <td>${d.task_id?`<span class="bdg ${d.task_status==='completed'?'b1':'b2'}">${esc(CM_TASK_FA[d.task_status]||'در کارتابل')}</span>`:'<span style="color:var(--td);font-size:11px">هنوز ارجاع نشده</span>'}</td>
      <td><button class="tgl" onclick="removeDecRow(${i})">حذف</button></td></tr>`).join('')}</tbody></table></div>`
    :'<div style="font-size:12px;color:var(--td)">هنوز مصوبه‌ای افزوده نشده است.</div>';
}
function addDecRow(){
  const what=$('cm_dec_what').value.trim();
  if(!what){ toast('شرح مصوبه («چه کاری») الزامی است',true); return; }
  const sel=$('cm_dec_resp'); const uid=sel.value||null;
  const txt=($('cm_dec_resp_txt').value||'').trim();
  const uname=uid?sel.options[sel.selectedIndex].text:txt;
  if(!uname){ toast('مصوبه باید مسئول پیگیری داشته باشد (بند ۵ سنجه‌ی الف-۱-۵-۲)',true); return; }
  const deadline=readJalaliDateInput('cm_dec_dl');
  CM.dec.push({what, responsible_user_id:uid, responsible_name:uname, deadline});
  $('cm_dec_what').value=''; sel.value=''; $('cm_dec_resp_txt').value='';
  drawDecRows(); $('cm_dec_what').focus();
}
function removeDecRow(i){ CM.dec.splice(i,1); drawDecRows(); }

// ---------- زمان‌بندی جلسه (رزرو اتاق) ----------
// جلسه = ردیف calendar_events با event_type='committee_meeting' (تقویم، منبع واحد حقیقت)
let MEETING_ROOMS=[];
function timeOptions(sel){
  let o='';
  for(let h=7;h<=20;h++) for(const m of ['00','30']){
    const v=String(h).padStart(2,'0')+':'+m;
    o+=`<option value="${v}" ${v===sel?'selected':''}>${fa(v)}</option>`;
  }
  return o;
}
async function loadCommitteeMeetings(id){
  const box=$('comMeetings'); if(!box) return;
  try{
    if(!MEETING_ROOMS.length){ const {rooms}=await API.meetingRooms(); MEETING_ROOMS=rooms||[]; }
    // فهرست همکاران برای انتخابگر «دعوت‌نامه» — همان کشِ صفحه‌ی پیام‌ها، یک‌بار برای هر نشست
    if(!MSG.colleagues.length){ try{ MSG.colleagues=(await API.colleagues()).users||[]; }catch(e){} }
    const {meetings}=await API.committeeMeetings(id);
    const canCreate=(S.user.permissions||[]).includes('create_committee_minutes');
    const today=todayISO();
    box.innerHTML=`
      ${!meetings.length?'<div class="empty">جلسه‌ای زمان‌بندی نشده</div>':`
      <div class="tbl-wrap"><table><thead><tr><th>تاریخ</th><th>ساعت</th><th>اتاق</th><th>عنوان</th><th></th></tr></thead><tbody>
      ${meetings.map(m=>`<tr>
        <td style="white-space:nowrap;color:var(--gdl)">${faDateISO(m.event_date)}${m.event_date>=today?' <span class="bdg b1">پیش‌رو</span>':''}</td>
        <td style="white-space:nowrap">${fa((m.start_time||'—')+' - '+(m.end_time||'—'))}</td>
        <td>${esc(m.room_name||'—')}</td><td>${esc(m.title||'—')}</td>
        <td>${canCreate?`<button class="btn btn-sm" onclick="cancelMeeting('${m.id}','${id}')">لغو</button>`:''}</td></tr>`).join('')}
      </tbody></table></div>`}
      ${canCreate?`<div style="margin-top:16px;padding:16px 18px;border-radius:12px;background:var(--subpanel);border:1px solid var(--bd)">
        <div style="font-size:12.5px;color:var(--gdl);font-weight:700;margin-bottom:12px">زمان‌بندی جلسه جدید</div>
        <div style="display:grid;grid-template-columns:1.6fr 1fr 1fr 1.4fr;gap:12px">
          <div class="fg"><label>تاریخ جلسه (شمسی)</label>${jalaliDateInputHtml('mt_date')}</div>
          <div class="fg"><label>ساعت شروع</label><select id="mt_start" class="sel">${timeOptions('08:00')}</select></div>
          <div class="fg"><label>ساعت پایان</label><select id="mt_end" class="sel">${timeOptions('09:00')}</select></div>
          <div class="fg"><label>اتاق جلسه</label><select id="mt_room" class="sel"><option value="">— بدون اتاق —</option>
            ${MEETING_ROOMS.map(r=>`<option value="${r.id}">${esc(r.name)}${r.capacity?' ('+fa(r.capacity)+' نفر)':''}</option>`).join('')}</select></div>
        </div>
        <div class="fg"><label>عنوان جلسه (اختیاری)</label><input id="mt_title" placeholder="مثال: جلسه ماهانه بررسی شاخص‌ها"></div>
        <div class="fg"><label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="mt_invite" style="width:auto;margin:0" onchange="$('mt_invitees').style.display=this.checked?'':'none'">
          و پیام دعوت هم بفرست</label>
          <select id="mt_invitees" class="sel" multiple size="4" style="display:none;margin-top:8px">
            ${(MSG.colleagues||[]).map(u=>`<option value="${u.id}">${esc(u.full_name)}${u.department?' — '+esc(u.department):''}</option>`).join('')}
          </select></div>
        <button class="btn btn-g" onclick="scheduleMeeting('${id}')">ثبت زمان‌بندی</button>
      </div>`:''}`;
  }catch(e){ box.innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}
async function scheduleMeeting(committeeId){
  const body={ event_date:readJalaliDateInput('mt_date'), start_time:$('mt_start').value,
               end_time:$('mt_end').value, room_id:$('mt_room').value||null, title:$('mt_title').value.trim() };
  // دعوت‌نامه کاملاً اختیاری است: اگر تیک نخورده باشد، بدنه‌ی درخواست دقیقاً مثل قبل است
  if($('mt_invite')?.checked){
    const ids=[...$('mt_invitees').selectedOptions].map(o=>o.value);
    if(!ids.length){ toast('برای ارسال دعوت‌نامه، دست‌کم یک همکار را انتخاب کنید',true); return; }
    body.send_invites=true; body.invite_user_ids=ids;
  }
  try{
    const r=await API.scheduleCommitteeMeeting(committeeId, body);
    toast(r.invited?`جلسه زمان‌بندی شد — ${fa(r.invited)} دعوت‌نامه ارسال شد`:'جلسه زمان‌بندی شد');
    loadCommitteeMeetings(committeeId);
  }catch(e){ toast(e.message,true); }
}
async function cancelMeeting(eventId, committeeId){
  try{ await API.cancelCommitteeMeeting(eventId); toast('جلسه لغو شد'); loadCommitteeMeetings(committeeId); }
  catch(e){ toast(e.message,true); }
}

// اهداف کلی و شرح وظایف کمیته — فقط اگر ثبت شده باشد (بیشتر کمیته‌ها هنوز خالی‌اند)
function committeeContentHtml(c){
  const st=(c.statement||'').trim(), pr=(c.program||'').trim();
  if(!st && !pr) return '';
  const blk=(label,txt)=>!txt?'':`<div style="margin-bottom:14px">
    <div style="font-size:12.5px;color:var(--gdl);font-weight:700;margin-bottom:6px">${label}</div>
    <div style="font-size:12.5px;line-height:2;white-space:pre-wrap">${esc(txt)}</div></div>`;
  return `<div class="panel gs"><div class="phd"><div class="abadge">≡</div>
    <div><h3>اهداف و شرح وظایف</h3><div class="sub">${esc(c.name)}</div></div></div>
    <div class="pbody">${blk('اهداف کلی کمیته',st)}${blk('شرح وظایف',pr)}</div></div>`;
}

// ---------- ویجت انتخاب تاریخ شمسی (روز/ماه/سال) — جایگزین input type=date میلادی ----------
function jalaliDateInputHtml(idPrefix, opts){
  opts=opts||{};
  // allowEmpty: برای فیلترها و مهلت‌های اختیاری — گزینه‌ی خالی «—» و بدون پیش‌انتخابِ امروز.
  // value: مقدار اولیه‌ی میلادی «YYYY-MM-DD» (مثلاً در فرم ویرایش) که به شمسی برگردانده می‌شود.
  const allowEmpty=!!opts.allowEmpty;
  let sel=todayJalali(), hasInit=false;
  const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(opts.value||''));
  if(m){ try{ sel=toJalali(+m[1],+m[2],+m[3]); hasInit=true; }catch(e){} }
  // پیش‌انتخاب: همیشه، مگر در حالت خالیِ بدون مقدار اولیه (فیلترها).
  // (چرا؟) اگر فرم ویرایش مقدار قبلی را پیش‌انتخاب نکند، کاربر با ذخیره، مهلت را ناخواسته پاک می‌کند.
  const pre=(!allowEmpty||hasInit);
  const emptyOpt='<option value="">—</option>';
  let yOpts=allowEmpty?emptyOpt:''; for(let y=MAX_JYEAR;y>=MIN_JYEAR;y--) yOpts+=`<option value="${y}" ${pre&&y===sel.jy?'selected':''}>${fa(y)}</option>`;
  let mOpts=allowEmpty?emptyOpt:''; JMONTHS.forEach((name,i)=>{ const mm=i+1; mOpts+=`<option value="${mm}" ${pre&&mm===sel.jm?'selected':''}>${name}</option>`; });
  let dOpts=allowEmpty?emptyOpt:'';
  if(pre){ const dim0=jalaliDaysInMonth(sel.jy,sel.jm); for(let d=1;d<=dim0;d++) dOpts+=`<option value="${d}" ${d===sel.jd?'selected':''}>${fa(d)}</option>`; }
  else { for(let d=1;d<=31;d++) dOpts+=`<option value="${d}">${fa(d)}</option>`; }
  return `<div class="jdatepicker-wrap" style="display:grid;grid-template-columns:56px 1fr 78px;gap:6px;width:100%;min-width:235px;align-items:center">
    <select id="${idPrefix}_d" class="sel jdate-d" title="روز">${dOpts}</select>
    <select id="${idPrefix}_m" class="sel jdate-m" title="ماه" onchange="onJMonthChange('${idPrefix}')">${mOpts}</select>
    <select id="${idPrefix}_y" class="sel jdate-y" title="سال" onchange="onJMonthChange('${idPrefix}')">${yOpts}</select>
  </div>`;
}
function onJMonthChange(idPrefix){
  const yEl=$(idPrefix+'_y'), mEl=$(idPrefix+'_m'), dSel=$(idPrefix+'_d');
  if(!yEl||!mEl||!dSel) return;
  // حالت فیلترِ خالی (allowEmpty): تا سال و ماه هر دو انتخاب نشده‌اند، فقط ۱ تا ۳۱ را نگه دار.
  if(!yEl.value||!mEl.value){ const curD=+dSel.value||0; let dOpts='<option value="">—</option>'; for(let d=1;d<=31;d++) dOpts+=`<option value="${d}" ${d===curD?'selected':''}>${fa(d)}</option>`; dSel.innerHTML=dOpts; return; }
  const jy=+yEl.value, jm=+mEl.value;
  const dim=jalaliDaysInMonth(jy,jm);
  const curD=+dSel.value;
  let dOpts=''; for(let d=1;d<=dim;d++) dOpts+=`<option value="${d}" ${d===Math.min(curD,dim)?'selected':''}>${fa(d)}</option>`;
  dSel.innerHTML=dOpts;
}
function readJalaliDateInput(idPrefix){
  const jy=+$(idPrefix+'_y').value, jm=+$(idPrefix+'_m').value, jd=+$(idPrefix+'_d').value;
  const g=toGregorian(jy,jm,jd);
  return `${g.gy}-${String(g.gm).padStart(2,'0')}-${String(g.gd).padStart(2,'0')}`;
}
// نسخه‌ی امن برای فیلترها و فیلدهای اختیاری: اگر کاربر تاریخی انتخاب نکرده (گزینه‌ی «—»)
// یا عنصرها هنوز در DOM نیستند، رشته‌ی خالی برمی‌گرداند تا فیلتر اعمال نشود.
// (چرا جدا؟) readJalaliDateInput قدیمی فرض می‌کند هر سه select همیشه مقدار دارند؛
// برای فیلترهای «از/تا تاریخ» که خالیِ پیش‌فرض‌اند، NaN تولید می‌کرد و فیلتر سرور می‌شکست.
function readJalaliDateInputOpt(idPrefix){
  const y=$(idPrefix+'_y'), m=$(idPrefix+'_m'), d=$(idPrefix+'_d');
  if(!y||!m||!d||!y.value||!m.value||!d.value) return '';
  const g=toGregorian(+y.value,+m.value,+d.value);
  return `${g.gy}-${String(g.gm).padStart(2,'0')}-${String(g.gd).padStart(2,'0')}`;
}
async function saveMinutes(){
  const date=readJalaliDateInput('cm_date');
  if(!CM.agenda.length){ toast('دست‌کم یک بند دستور کار لازم است',true); return; }
  // مصوبه‌ی بدون مسئول و مهلت از نگاه بند ۵ کتاب مصوبه نیست — جلوی ثبتش گرفته می‌شود،
  // ولی صورت‌جلسه‌ی بدون هیچ مصوبه‌ای (جلسه‌ی صرفاً گزارشی) مجاز است.
  const loose=CM.dec.filter(d=>(!d.responsible_user_id&&!(d.responsible_name||'').trim())||!d.deadline);
  if(loose.length){ toast('هر مصوبه باید مسئول پیگیری و مهلت داشته باشد (بند ۵ سنجه‌ی الف-۱-۵-۲)',true); return; }
  const body={
    meeting_date:date, start_time:$('cm_start').value, end_time:$('cm_end').value,
    location:$('cm_loc').value.trim(), minutes_code:$('cm_code').value.trim(),
    discussion:$('cm_disc').value.trim(), next_meeting_date:readJalaliDateInput('cm_next'),
    agenda_items:CM.agenda, decisions:CM.dec, attendees:CM.att, absentees:CM.abs,
    previous_followup:CM.prev.filter(p=>p.result||p.note),
  };
  try{
    if(CM.mid) await API.updateCommitteeMinute(CM.cid, CM.mid, body);
    else await API.addCommitteeMinutes(CM.cid, body);
    toast(CM.mid?'صورت‌جلسه به‌روز شد':'صورت‌جلسه ثبت شد');
    const mid=CM.mid;
    CM={cid:CM.cid, mid:null, agenda:[], dec:[], att:[], abs:[], prev:[], prevOf:null};
    if(mid) return openMinute(CM.cid, mid);
    const {committees}=await API.committees(); COMS=committees||[];
    drawCommittees();
  }catch(e){ toast(e.message,true); }
}
async function addCommittee(){
  const name=$('nc_name').value.trim(), freq=$('nc_freq').value;
  if(!name){ toast('نام کمیته الزامی است',true); return; }
  try{ await API.createCommittee({name, meeting_frequency:freq}); toast('کمیته ایجاد شد'); renderCommittees(); }
  catch(e){ toast(e.message,true); }
}


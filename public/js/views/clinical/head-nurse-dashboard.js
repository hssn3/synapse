/**
 * Head Nurse Ward Dashboard
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
async function renderHeadNurse(){
  $('ptitle').textContent='داشبورد سرپرستار بخش';
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const r=await API.hnMyWards();
    HN.wards=r.wards||[];
    if(!HN.wards.length){
      // این داشبورد مرجعمحور است: فقط برای کسی فعال میشود که در جدول بخشهای پرستاری
      // سرپرستار یا جانشینِ آن ثبت شده باشد. بنبستِ یکخطی نقض قاعدهی «صفحهی خالی ممنوع»
      // است — کاربر باید بفهمد چرا خالی است و چه کسی میتواند آن را پر کند، نه اینکه
      // با یک جمله رها شود.
      const canManageNursing=((S.user&&S.user.permissions)||[]).includes('manage_nursing_hierarchy');
      $('content').innerHTML=`
      <div class="panel g">
        <div class="phd"><div class="abadge">⚕</div><div><h3>داشبورد سرپرستار بخش</h3>
          <div class="sub">ابزار روزمرهی سرپرستار و جانشین هر بخش</div></div></div>
        <div class="pbody">
          <div class="empty"><div class="ei">🏥</div>
            <b>هنوز سرپرستار یا جانشین هیچ بخشی نیستید</b>
            <div style="margin-top:8px;color:var(--mut);font-size:13px;line-height:2;max-width:560px">
              این صفحه مدیریتِ روزمرهی یک بخش است: حضور و غیاب شیفت، درخواستهای مرخصی،
              چکلیست شیفت و وظایف. دسترسیاش «مرجعمحور» است — یعنی فقط وقتی روشن میشود
              که مدیر پرستاری شما را در تعریف یکی از بخشها بهعنوان سرپرستار یا جانشین ثبت کرده باشد.
            </div>
            <div style="margin-top:14px">${canManageNursing
              ? `<button class="btn btn-g btn-sm" onclick="go('nursing')">⚙ تعیین سرپرستار و جانشین بخشها</button>`
              : `<span style="color:var(--mut);font-size:12.5px">برای فعالشدن این داشبورد، از مدیر پرستاری بخواهید شما را در بخش مربوطه ثبت کند.</span>`}</div>
          </div>
        </div>
      </div>`;
      return; }
    if(!HN.wardId || !HN.wards.some(w=>w.id===HN.wardId)) HN.wardId=HN.wards[0].id;
    await hnLoadAll();
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}
async function hnSelectWard(id){ HN.wardId=id; await hnLoadAll(); }
async function hnLoadAll(){
  const wardId=HN.wardId;
  const [roster, att, leaves, myLeaves, shifts] = await Promise.all([
    API.hnRoster(wardId), API.hnGetAttendance(wardId), API.hnLeaveReview(wardId),
    API.hnLeaveMine(), API.hnShiftTasks(wardId),
  ]);
  HN.roster=roster; HN.attendance=att; HN.leaves=leaves.items||[]; HN.myLeaves=myLeaves.items||[]; HN.shifts=shifts.shifts||[];
  drawHeadNurse();
}
const HN_LV_FA={'در_انتظار':'در انتظار بررسی','تأییدشده':'تأیید شده','ردشده':'رد شده'};
function drawHeadNurse(){
  const w=HN.roster.ward, canEdit=HN.roster.can_edit;
  $('content').innerHTML=`
  <div class="panel g" style="margin-bottom:16px">
    <div class="phd"><div class="abadge">${esc(w.icon||'⚕')}</div><div><h3>بخش‌های من</h3>
      <div class="sub">هر بخشی که سرپرستار یا جانشینِ آن هستید</div></div></div>
    <div class="pbody" style="display:flex;gap:8px;flex-wrap:wrap">
      ${HN.wards.map(x=>`<button class="btn ${x.id===HN.wardId?'btn-g':'btn-o'} btn-sm" onclick="hnSelectWard('${x.id}')">${esc(x.title)}</button>`).join('')}
    </div>
  </div>

  <div class="panel g" style="margin-bottom:16px">
    <div class="phd"><div class="abadge">👤</div><div style="flex:1"><h3>جانشین‌های بخش «${esc(w.title)}»</h3>
      <div class="sub">فقط سرپرستار می‌تواند جانشین‌ها را تغییر دهد</div></div></div>
    <div class="pbody" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="fg" style="margin:0"><label>جانشین ۱</label>
        <select id="hn_d1" class="sel" ${w.head_nurse_id===S.user.id?'':'disabled'}>${nrsUserOpts2(w.deputy1_id)}</select></div>
      <div class="fg" style="margin:0"><label>جانشین ۲</label>
        <select id="hn_d2" class="sel" ${w.head_nurse_id===S.user.id?'':'disabled'}>${nrsUserOpts2(w.deputy2_id)}</select></div>
    </div>
    ${w.head_nurse_id===S.user.id?`<div class="pbody" style="padding-top:0"><button class="btn btn-g btn-sm" onclick="hnSaveDeputies()">ذخیره جانشین‌ها</button></div>`:''}
  </div>

  <div class="panel g" style="margin-bottom:16px">
    <div class="phd"><div class="abadge">◷</div><div style="flex:1"><h3>حضور سرپرستار امروز</h3>
      <div class="sub">تعیین می‌کند چه کسی امروز مسئول ثبت حضور‌غیاب و چک‌لیست شیفت است</div></div></div>
    <div class="pbody">
      <label style="display:flex;align-items:center;gap:8px;font-size:13px">
        <input type="checkbox" id="hn_head_present" ${HN.attendance.head_present?'checked':''} onchange="hnSetPresence(this.checked)">
        سرپرستار بخش امروز حاضر است
      </label>
    </div>
  </div>

  <div class="panel g" style="margin-bottom:16px">
    <div class="phd"><div class="abadge">✔</div><div><h3>حضور‌غیاب امروز</h3>
      <div class="sub">${faDateISO(HN.attendance.date)}</div></div></div>
    <div class="pbody">
      ${!HN.attendance.nurses.length?'<div class="empty">پرستاری در این بخش یافت نشد (فیلد department کاربران باید با نام بخش یکی باشد)</div>':`
      <div class="tbl-wrap"><table><thead><tr><th>پرستار</th><th>وضعیت</th><th>یادداشت</th></tr></thead><tbody>
      ${HN.attendance.nurses.map(n=>`<tr>
        <td>${esc(n.full_name)}</td>
        <td style="white-space:nowrap">
          <button class="tgl ${n.present===true?'on':''}" onclick="hnMarkAttendance('${n.id}',true)">حاضر</button>
          <button class="tgl ${n.present===false?'dngr on':''}" onclick="hnMarkAttendance('${n.id}',false)">غایب</button>
        </td>
        <td><input value="${esc(n.note||'')}" placeholder="یادداشت" onchange="hnAttendanceNote('${n.id}',this.value)"></td>
      </tr>`).join('')}
      </tbody></table></div>`}
    </div>
  </div>

  <div class="panel g" style="margin-bottom:16px">
    <div class="phd"><div class="abadge">☑</div><div><h3>فهرست‌کار شیفت</h3>
      <div class="sub">امروز — اگر سرپرستار حاضر است فقط خودِ او، وگرنه هر جانشین می‌تواند پر کند</div></div></div>
    <div class="pbody">
      ${HN.shifts.map(s=>`<div style="margin-bottom:14px">
        <div style="font-size:12.5px;color:var(--gdl);font-weight:700;margin-bottom:6px">شیفت ${esc(s.shift_type)}
          ${s.filled_by_name?`<span style="color:var(--td);font-weight:400"> — پر شده توسط ${esc(s.filled_by_name)}</span>`:''}</div>
        <textarea id="hn_shift_${esc(s.shift_type)}" rows="2" style="width:100%" placeholder="فهرست‌کار این شیفت را بنویسید">${esc(s.task_list||'')}</textarea>
        <button class="btn btn-o btn-sm" style="margin-top:6px" onclick="hnSaveShiftTask('${esc(s.shift_type)}')">ذخیره</button>
      </div>`).join('')}
    </div>
  </div>

  <div class="panel g" style="margin-bottom:16px">
    <div class="phd"><div class="abadge">✍</div><div><h3>ثبت درخواست مرخصی من</h3></div></div>
    <div class="pbody">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="fg" style="margin:0"><label>از تاریخ</label>${jalaliDateInputHtml('hn_lv_from')}</div>
        <div class="fg" style="margin:0"><label>تا تاریخ</label>${jalaliDateInputHtml('hn_lv_to')}</div>
      </div>
      <div class="fg"><label>دلیل (اختیاری)</label><input id="hn_lv_reason" placeholder="دلیل مرخصی"></div>
      <button class="btn btn-g btn-sm" onclick="hnSubmitLeave()">ثبت درخواست</button>
      ${!HN.myLeaves.length?'':`<div class="tbl-wrap" style="margin-top:14px"><table><thead><tr><th>از</th><th>تا</th><th>وضعیت</th></tr></thead><tbody>
      ${HN.myLeaves.map(l=>`<tr><td>${faDateISO(l.start_date)}</td><td>${faDateISO(l.end_date)}</td><td>${esc(HN_LV_FA[l.status]||l.status)}</td></tr>`).join('')}
      </tbody></table></div>`}
    </div>
  </div>

  <div class="panel g">
    <div class="phd"><div class="abadge">📋</div><div style="flex:1"><h3>بررسی مرخصی‌های بخش</h3></div>
      ${HN.leaves.length?`<button class="btn btn-o btn-sm" onclick="printHnLeaves()">${ic('print')} چاپ فهرست</button>`:''}</div>
    <div class="pbody">
      ${!HN.leaves.length?'<div class="empty">درخواستی ثبت نشده است</div>':`
      <div class="tbl-wrap"><table><thead><tr><th>پرستار</th><th>از</th><th>تا</th><th>دلیل</th><th>وضعیت</th><th></th></tr></thead><tbody>
      ${HN.leaves.map(l=>`<tr>
        <td>${esc(l.nurse_name)}</td><td>${faDateISO(l.start_date)}</td><td>${faDateISO(l.end_date)}</td>
        <td style="color:var(--td)">${esc(l.reason||'—')}</td><td>${esc(HN_LV_FA[l.status]||l.status)}</td>
        <td style="white-space:nowrap">${l.status==='در_انتظار'?`
          <button class="btn btn-sm btn-g" onclick="hnDecideLeave('${l.id}','تأییدشده')">تأیید</button>
          <button class="tgl dngr" onclick="hnDecideLeave('${l.id}','ردشده')">رد</button>`:'—'}</td>
      </tr>`).join('')}
      </tbody></table></div>`}
    </div>
  </div>`;
}
// فهرست مرخصی‌های بخش روی کاغذ — همان برگه‌ای که سرپرستار برای بایگانیِ بخش و
// تحویل به مدیر پرستاری امضا می‌کند.
function printHnLeaves(){
  if(!HN.leaves||!HN.leaves.length){ toast('درخواست مرخصی‌ای برای چاپ نیست',true); return; }
  const ward=(HN.wards||[]).find(w=>w.id===HN.wardId);
  const pending=HN.leaves.filter(l=>l.status==='در_انتظار').length;
  printListSheet({
    page:'headnurse', title:'فهرست درخواست‌های مرخصی بخش', code:'RPT-LV',
    intro:'درخواست‌های مرخصیِ ثبت‌شده در این بخش با بازه، دلیل و وضعیت بررسی.',
    meta:[['بخش', (ward&&ward.name)||'—'], ['در انتظار بررسی', String(pending)]],
    headers:['پرستار','از تاریخ','تا تاریخ','دلیل','وضعیت'],
    rows:HN.leaves.map(l=>[esc(l.nurse_name||'—'), faDateISO(l.start_date), faDateISO(l.end_date),
      esc(l.reason||'—'), esc(HN_LV_FA[l.status]||l.status||'—')]),
    foot:'مرخصی بخش',
  });
}
function nrsUserOpts2(selId){ return `<option value="">— تعیین‌نشده —</option>` +
  (HN.roster.nurses||[]).map(u=>`<option value="${u.id}" ${u.id===selId?'selected':''}>${esc(u.full_name)}</option>`).join(''); }
async function hnSaveDeputies(){
  try{ await API.hnSetDeputies(HN.wardId, {deputy1_id:$('hn_d1').value||null, deputy2_id:$('hn_d2').value||null});
    toast('ذخیره شد'); renderHeadNurse(); }
  catch(e){ toast(e.message,true); }
}
async function hnSetPresence(checked){
  try{ await API.hnSetPresence({ward_id:HN.wardId, head_present:checked}); toast('ذخیره شد'); renderHeadNurse(); }
  catch(e){ toast(e.message,true); }
}
async function hnMarkAttendance(nurseId, present){
  try{ await API.hnSetAttendance({ward_id:HN.wardId, nurse_id:nurseId, present}); toast('ثبت شد'); renderHeadNurse(); }
  catch(e){ toast(e.message,true); }
}
async function hnAttendanceNote(nurseId, note){
  const n=HN.attendance.nurses.find(x=>x.id===nurseId);
  try{ await API.hnSetAttendance({ward_id:HN.wardId, nurse_id:nurseId, present:n?n.present!==false:true, note}); toast('ذخیره شد'); }
  catch(e){ toast(e.message,true); }
}
async function hnSaveShiftTask(shiftType){
  const val=$('hn_shift_'+shiftType).value;
  try{ await API.hnSetShiftTask({ward_id:HN.wardId, shift_type:shiftType, task_list:val}); toast('ذخیره شد'); renderHeadNurse(); refreshNavBadges(); }
  catch(e){ toast(e.message,true); }
}
async function hnSubmitLeave(){
  const start_date=readJalaliDateInput('hn_lv_from'), end_date=readJalaliDateInput('hn_lv_to');
  try{ await API.hnLeaveSubmit({start_date, end_date, reason:$('hn_lv_reason').value}); toast('درخواست ثبت شد'); renderHeadNurse(); }
  catch(e){ toast(e.message,true); }
}
async function hnDecideLeave(id, status){
  try{ await API.hnLeaveDecide(id, {status}); toast('ثبت شد'); renderHeadNurse(); }
  catch(e){ toast(e.message,true); }
}

// ---- روستر سوپروایزر بالینی: بخش‌به‌بخش، فقط‌خواندنی ----
function drawNursingRoster(){
  const wards=NRS.roster||[];
  $('content').innerHTML=`
  ${nrsDirectorBanner()}
  ${nrsLiveShiftSlot()}
  <div class="panel g" style="margin-bottom:16px">
    <div class="phd"><div class="abadge">☰</div><div><h3>روستر پرسنل بخش‌به‌بخش</h3>
      <div class="sub">سرپرستار، جانشین‌ها و پرستاران هر بخش</div></div></div>
    <div class="pbody">
      ${!wards.length?'<div class="empty"><div class="ei">⚕</div>هنوز بخشی توسط مدیر پرستاری تعریف نشده است</div>':`
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px">
      ${wards.map(w=>`<div class="st g">
        <div class="l" style="font-size:14px"><span style="font-size:16px;color:var(--gdl)">${esc(w.icon||'✚')}</span> ${esc(w.title)}</div>
        <div style="margin-top:8px;font-size:12.5px;line-height:2">
          <div>سرپرستار: <b>${w.head_nurse_name?esc(w.head_nurse_name):'—'}</b></div>
          <div>جانشین ۱: ${w.deputy1_name?esc(w.deputy1_name):'—'}</div>
          <div>جانشین ۲: ${w.deputy2_name?esc(w.deputy2_name):'—'}</div>
          <div style="margin-top:6px;padding-top:6px;border-top:1px dashed var(--bd)">
            پرستاران: ${w.staff_nurses&&w.staff_nurses.length?w.staff_nurses.map(n=>esc(n.full_name)).join('، '):'—'}
          </div>
        </div>
      </div>`).join('')}
      </div>`}
    </div>
  </div>
  <div class="panel g">
    <div class="phd"><div class="abadge">◎</div><div><h3>ابزارهای شیفت</h3>
      <div class="sub">ثبت حضورِ شیفتِ جاری روی همه‌ی بخش‌ها، و گزارش ۲۴ ساعته (سنجه‌ی الف‑۴‑۳‑۱)</div></div></div>
    <div class="pbody" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
      <button class="btn btn-g" onclick="go('shiftatt')">${ic('check')} ثبت حضور شیفت</button>
      <button class="btn btn-o" onclick="go('shiftatt')">${ic('docs')} گزارش ۲۴ ساعته</button>
      <button class="btn btn-o" onclick="go('staffshift')">${ic('calendar')} برنامه‌ی ماهانه‌ی شیفت</button>
    </div>
  </div>`;
}


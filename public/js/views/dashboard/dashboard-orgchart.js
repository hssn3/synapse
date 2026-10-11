/**
 * Dashboard Integrated Org Chart
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
async function toggleDivisionCard(code){
  const wasOpen=ORGDIV.openCode===code;
  ORGDIV.openCode=wasOpen?null:code;
  if(!wasOpen && !ORGDIV.colleagues){
    try{ ORGDIV.colleagues=(await API.colleagues()).users||[]; }catch(e){ ORGDIV.colleagues=[]; }
  }
  drawDivisionsPanel();
}
async function saveDivisionHead(code){
  const sel=$('divsel_'+code); if(!sel) return;
  try{
    await API.setOrgDivisionHead(code, sel.value||null);
    toast('مسئول حوزه بروزرسانی شد');
    ORGDIV.openCode=null;
    await loadDivisionsPanel();
  }catch(e){ toast(e.message,true); }
}

// ==================== نمودار سازمانی یکپارچه (جایگزین ۳ کارت جداگانه‌ی حوزه‌ها روی داشبورد) ====================
// سه ردیف ثابت طبق درخواست کاربر: ردیف۱ ریاست‌بیمارستان/مسئول‌فنی/مدیرداخلی، ردیف۲
// پرستاری(ورودی به زیرچارت)/مدیربهبودکیفیت/مدیرمالی/مدیرمنابع‌انسانی، ردیف۳
// مدیرتغذیه/مسئول‌بهداشت‌حرفه‌ای/مسئول‌بهداشت‌محیط. داده از management_position_slots (برچسب‌ها،
// database/seed-management-hierarchy.js + seed-org-chart-positions.js) و نقش admin (مدیر داخلی).
const OCHART={positions:null, admins:null, canManage:false, colleagues:null};
async function renderOrgChart(){
  $('ptitle').textContent='نمودار سازمانی';
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const [pos, adm] = await Promise.all([API.managementPositions(), API.orgChartAdmins()]);
    OCHART.positions=pos.positions||[]; OCHART.canManage=!!pos.can_manage; OCHART.admins=adm.admins||[];
    if(OCHART.canManage && !OCHART.colleagues) OCHART.colleagues=(await API.colleagues()).users||[];
    drawOrgChart();
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}
function ocPosByLabel(label){ return (OCHART.positions||[]).find(p=>p.label===label); }
function ocUserOpts(selId){
  return `<option value="">— تعیین‌نشده —</option>` +
    (OCHART.colleagues||[]).map(u=>`<option value="${u.id}" ${u.id===selId?'selected':''}>${esc(u.full_name)}</option>`).join('');
}
// یک کارت پست (از management_position_slots) — اگر پست هنوز برای این بیمارستان تعریف نشده،
// کارتِ «تعریف‌نشده» با راهنمای مسیر سوپرادمین نشان داده می‌شود، نه اینکه کلاً حذف شود
// نام سمت روی کارت، خودِ عنوانِ کارت است؛ پس تکرارِ همان عبارت داخل نام شخص فقط کارت را
// شلوغ و سرریز می‌کند («مدیر مالی» → «خانم/آقای مدیر مالی بیمارستان شماره سه»). برای
// کاربرانِ جانشینِ عمومی (که نامشان عملاً همان عنوان سمت است) پیشوند/پسوندِ تکراری از
// نمایش حذف می‌شود — دادهٔ ذخیره‌شده دست‌نخورده می‌ماند، فقط نمایش کوتاه می‌شود.
function ocShortName(name){
  if(!name) return '';
  // فقط پسوندِ «… بیمارستان شماره X» حذف می‌شود: کارت خودش داخل نمودارِ همین بیمارستان
  // است، پس این پسوند هیچ اطلاعاتی اضافه نمی‌کند و تنها باعث شکستن و سرریز نام می‌شد.
  // بیش از این کوتاه نمی‌کنیم — حذفِ خودِ عنوان سمت (چون با تیتر کارت یکی است) نتیجه‌اش
  // نمایشِ بی‌معنیِ «خانم/آقای» تنها بود. نام کاملِ اصلی در tooltip کارت باقی می‌ماند.
  return String(name).replace(/\s*بیمارستان\s+شماره\s+\S+\s*$/,'').trim();
}
function ocPositionCard(label, icon){
  const p=ocPosByLabel(label);
  if(!p){
    return `<div class="st g oc-card oc-card-undef">
      <div class="oc-card-l">${icon} ${esc(label)}</div>
      <div class="oc-card-empty">هنوز از پنل سوپرادمین تعریف نشده</div>
    </div>`;
  }
  const shown = p.user_name ? ocShortName(p.user_name) : '';
  return `<div class="st g oc-card">
    <div class="oc-card-l">${icon} ${esc(label)}</div>
    <div class="oc-card-v ${p.user_name?'':'oc-card-none'}" title="${esc(p.user_name||'')}">${p.user_name?esc(shown):'بدون مسئول'}${ocPreviewBtn(p.user_id)}</div>
    ${OCHART.canManage?`<div class="oc-card-sel"><select onchange="ocAssign('${p.id}',this.value)">${ocUserOpts(p.user_id)}</select></div>`:''}
  </div>`;
}
// دکمه‌ی کوچک «بررسی داشبورد» کنار نام هر مسئول — فقط وقتی ادمین اجازه‌ی مدیریت نمودار سازمانی
// را دارد و پست پرشده است؛ عمداً یک آیکون ریز است نه دکمه‌ی بزرگ، تا تمرکز کارت روی «چه کسی
// مسئول است» بماند، نه روی این قابلیت جانبی.
function ocPreviewBtn(userId){
  if(!OCHART.canManage || !userId) return '';
  return `<button type="button" title="بررسی داشبورد این سمت" onclick="event.stopPropagation();startRolePreview('${userId}')" style="border:none;background:none;cursor:pointer;font-size:13px;opacity:.65;vertical-align:middle;margin-inline-start:4px" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=.65">🔎</button>`;
}
function ocAdminsCard(){
  const list=OCHART.admins||[];
  return `<div class="st g">
    <div class="l" style="font-size:13.5px">◆ مدیر داخلی</div>
    <div class="v" style="font-size:14.5px">${list.length?list.map(a=>esc(a.full_name)+ocPreviewBtn(a.id)).join('، '):'بدون مسئول'}</div>
    <div style="margin-top:6px;font-size:11px;color:var(--td)">نقش سازمانی — از «مدیریت کاربران» تغییر می‌کند</div>
  </div>`;
}
function ocNursingCard(){
  return `<div class="st g gold" style="cursor:pointer" onclick="go('nursing')">
    <div class="l" style="font-size:13.5px">✚ پرستاری</div>
    <div class="v" style="font-size:12.5px;color:var(--td)">مدیر پرستاری، سوپروایزرها و بخش‌ها ›</div>
  </div>`;
}
function drawOrgChart(){
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">⌂</div><div style="flex:1"><h3>نمودار سازمانی بیمارستان</h3>
      <div class="sub">${OCHART.canManage?'برای هر پست، فرد مسئول را از فهرست انتخاب کنید':'فهرست پست‌های اصلی بیمارستان و مسئول هرکدام'}</div></div></div>
    <div class="pbody">
      <div class="docsl">ریاست و مدیریت ارشد</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:20px">
        ${ocPositionCard('ریاست بیمارستان',ic('badge'))}
        ${ocPositionCard('مسئول فنی',ic('shield'))}
        ${ocAdminsCard()}
      </div>

      <div class="docsl">حوزه‌های اصلی</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:20px">
        ${ocNursingCard()}
        ${ocPositionCard('مدیر بهبود کیفیت',ic('target'))}
        ${ocPositionCard('مدیر اعتباربخشی',ic('clipboard'))}
        ${ocPositionCard('مدیر مالی',ic('chart'))}
        ${ocPositionCard('مدیر حسابداری',ic('scale'))}
        ${ocPositionCard('مدیر منابع انسانی',ic('users'))}
      </div>

      <div class="docsl">تغذیه و بهداشت</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
        ${ocPositionCard('مدیر تغذیه',ic('heart'))}
        ${ocPositionCard('مسئول بهداشت حرفه‌ای',ic('shield'))}
        ${ocPositionCard('مسئول بهداشت محیط',ic('flag'))}
      </div>
    </div>
  </div>`;
}
async function ocAssign(id,userId){
  try{ await API.updateManagementPosition(id,{user_id:userId||null}); toast('ذخیره شد'); renderOrgChart(); }
  catch(e){ toast(e.message,true); renderOrgChart(); }
}

// ==================== جدول‌های فشرده (ردیف جزئیات جمع‌شونده) ====================
// مشکل: چند جدول ۸ تا ۱۰ ستون داشتند و عملاً همیشه اسکرول افقی می‌خوردند؛ ستون‌های
// کم‌اهمیت (نام حسابرس، بارگذاری‌کننده، محور مرتبط، …) هم‌وزنِ ستون‌های کلیدی دیده می‌شدند.
// راه‌حل: فقط ستون‌های تصمیم‌ساز در جدول می‌مانند، بقیه در یک ردیف بازشوندهٔ زیر هر سطر.
// هیچ داده‌ای حذف نمی‌شود — فقط یک کلیک عقب‌تر می‌رود.
let __drowN = 0;
function drowNext(){ return 'drow' + (++__drowN); }
function toggleDrow(id){
  const el = $(id); if (!el) return;
  const hidden = el.classList.toggle('hide');
  const b = document.querySelector(`[data-drow="${id}"]`);
  if (b) b.textContent = hidden ? '▾' : '▴';
}
function drowBtn(id){
  return `<button class="tgl drow-t" data-drow="${id}" onclick="toggleDrow('${id}')" title="جزئیات بیشتر">▾</button>`;
}
// یک جفت برچسب/مقدار در ردیف جزئیات — مقادیر خالی به‌طور خودکار حذف می‌شوند
function dp(label, val){
  if (val === null || val === undefined || val === '' || val === '—') return '';
  return `<div class="dpair"><span>${label}:</span><b>${val}</b></div>`;
}
// ردیف جزئیات کامل. cols = تعداد ستون‌های جدول (برای colspan)
function drowRow(id, cols, pairs, actions){
  const body = pairs.filter(Boolean).join('');
  if (!body && !actions) return '';
  return `<tr class="drow hide" id="${id}"><td colspan="${cols}">
    <div class="dpairs">${body}</div>
    ${actions ? `<div class="dacts">${actions}</div>` : ''}</td></tr>`;
}
// نشان «نمونه» برای رکوردهای الگو که با seed ساخته شده‌اند و کاربر می‌تواند آزادانه حذفشان کند
function exBdg(row){
  return row && row.is_example ? ' <span class="bdg b-ex" title="رکورد نمونه — می‌توانید آن را حذف کنید">نمونه</span>' : '';
}

// ==================== MEASURES & STACKED 3-AXIS NAVIGATION ====================
function detectDocType(text){
  if(!text) return 'guideline';
  if(text.includes('خط‌مشی') || text.includes('خط مشی') || text.includes('بیمارستان دارای خط‌مشی') || text.includes('تدوین خط‌مشی')) return 'policy';
  if(text.includes('روش اجرایی') || text.includes('روش‌های اجرایی') || text.includes('روش اجرا') || text.includes('فرآیند')) return 'procedure';
  if(text.includes('چک‌لیست') || text.includes('چک لیست') || text.includes('فرم') || text.includes('ممیزی')) return 'checklist';
  return 'guideline';
}

function docTypeLabel(text){
  const t = detectDocType(text);
  if(t === 'policy') return 'خط‌مشی الزامی';
  if(t === 'procedure') return 'روش اجرایی (SOP)';
  if(t === 'checklist') return 'چک‌لیست / فرم';
  return 'دستورالعمل استاندارد';
}

function selectRootAxis(secCode){
  S.openSec = secCode;
  S.accDepth = 1;
  const mine = myAxes();
  const firstAx = (mine.find(x => x.sec.code === secCode) || {}).ax;
  if(firstAx) S.axis = firstAx.code;
  saveMeasuresSubState();
  if (secCode === 'ب') {
    if (window.history && history.pushState) history.pushState(null, '', '#acc/care');
    else location.hash = '#acc/care';
  } else if (secCode === 'الف') {
    if (window.history && history.pushState) history.pushState(null, '', '#acc/management');
    else location.hash = '#acc/management';
  } else if (secCode === 'ج') {
    if (window.history && history.pushState) history.pushState(null, '', '#acc/support');
    else location.hash = '#acc/support';
  }
  renderTree();
  renderMeasures();
  try{ window.scrollTo({top:0,behavior:'smooth'}); }catch(e){ window.scrollTo(0,0); }
}

function selectSubAxis(axisCode){
  S.axis = axisCode;
  S.accDepth = 2;
  const owner = S.sections.find(sec => (sec.axes || []).some(a => a.code === axisCode));
  if(owner) S.openSec = owner.code;
  saveMeasuresSubState();
  if (window.history && history.pushState) {
    history.pushState(null, '', '#measures?sec=' + encodeURIComponent(S.openSec || '') + '&axis=' + encodeURIComponent(axisCode) + '&depth=2');
  } else {
    syncRouteHash('measures');
  }
  renderTree();
  renderMeasures();
  try{ window.scrollTo({top:0,behavior:'smooth'}); }catch(e){ window.scrollTo(0,0); }
}

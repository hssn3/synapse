/**
 * Controlled Documents Registry
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
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

// ==================== مدارک کنترل‌شده ====================
// قالب مشترک خط‌مشی/روش اجرایی/دستورالعمل
const DOC_TYPE_FA={policy:'خط‌مشی', procedure:'روش اجرایی', instruction:'دستورالعمل'};
// «approved» در داده‌ی seed وجود دارد ولی در این نگاشت نبود، پس روی نشانِ سند
// انگلیسیِ خام چاپ می‌شد (۱۲ سند از ۱۳ سند نمونه). حالتِ درستی است — سند امضا
// شده ولی هنوز ابلاغ نشده — پس برچسب می‌گیرد، نه اینکه داده عوض شود.
const DOC_STATUS_FA={draft:'پیش‌نویس', approved:'تأییدشده', active:'جاری/ابلاغ‌شده', archived:'بایگانی'};
const DOC_STATUS_BDG={draft:'b2', approved:'b2', active:'b1', archived:'b3'};
const SIGN_ROLE_FA={preparer:'تهیه‌کننده', approver:'تأییدکننده', ratifier:'تصویب/ابلاغ‌کننده'};
// برچسب‌های متفاوت خط‌مشی نسبت به دو نوع دیگر
const DOC_LABELS={
  purpose:{policy:'بیانیه (هدف و سیاست)', _:'هدف'},
  definitions:{policy:'تعاریف', _:'اصطلاحات و تعاریف'},
  related_staff:{policy:'ذینفعان', _:'کارکنان مرتبط'},
};
const docLabel=(f,t)=>DOC_LABELS[f][t]||DOC_LABELS[f]._;

// وضعیت تاریخ بازبینی بعدی: معوق / نزدیک (۳۰ روز) / دور — مبنای بج فهرست و ریبون هشدار
function docReviewState(iso){
  if(!iso) return null;
  const days=Math.ceil((new Date(iso+'T00:00:00Z')-new Date(todayISO()+'T00:00:00Z'))/86400000);
  if(days<0) return {days, cls:'b3', txt:'⏰ بازبینی معوق'};
  if(days<=30) return {days, cls:'b2', txt:`⏰ ${fa(days)} روز تا بازبینی`};
  return {days, cls:'b1', txt:'بازبینی بعدی: '+faDateISO(iso)};
}
function docReviewBadge(iso){
  const s=docReviewState(iso);
  return s && s.days<=30 ? ` <span class="bdg ${s.cls}" title="تاریخ بازبینی بعدی: ${faDateISO(iso)}">${s.txt}</span>` : '';
}

let DOCS={list:[], view:'list', tab:'docs', layout:'cards', current:null, signoffs:[], versions:[], dist:[], editId:null,
          filters:{doc_type:'', status:'', q:''}};
const canViewDocs = () => { const p=S.user?.permissions||[]; return p.includes('view_documents')||p.includes('manage_documents'); };
const canManageDocs = () => (S.user?.permissions||[]).includes('manage_documents');

// نوار زبانه‌ها: «مدارک کنترل‌شده» و «کتابخانه دیجیتال» زیر یک ورودی ناوبری جمع می‌شوند
// (کتابخانه یک مخزن فایل ساده است و ورودی مستقل در منو، ناوبری را بی‌دلیل تکه‌تکه می‌کرد)
function docTabs(active){
  const t=[];
  if(canViewDocs()) t.push(['docs','📁 مدارک کنترل‌شده']);
  if(canViewLibrary()) t.push(['library','📚 کتابخانه دیجیتال']);
  if(canViewCerts()) t.push(['certs','🏅 نشان‌ها و گواهینامه‌ها']);
  if(t.length<2) return '';
  return `<div class="doctabs">${t.map(([k,l])=>
    `<button class="btn btn-sm ${active===k?'btn-g':'btn-o'}" onclick="setDocTab('${k}')">${l}</button>`).join('')}</div>`;
}
function setDocTab(k){ DOCS.tab=k; DOCS.view='list'; LIB.view='list'; CERT.view='list'; renderDocuments(); }
function setDocLayout(lay){ DOCS.layout=lay; drawDocList(); }

async function renderDocuments(){
  if(!canViewDocs()){ if(canViewLibrary()) DOCS.tab='library'; else if(canViewCerts()) DOCS.tab='certs'; }
  if(DOCS.tab==='library') return renderLibrary();
  if(DOCS.tab==='certs') return renderCertifications();
  $('ptitle').textContent='مدیریت مدارک کنترل‌شده';
  if(DOCS.view==='form') return drawDocForm();
  if(DOCS.view==='detail' && DOCS.editId) return loadDocDetail(DOCS.editId);
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const qs=Object.entries(DOCS.filters).filter(([,v])=>v).map(([k,v])=>k+'='+encodeURIComponent(v)).join('&');
    const {documents}=await API.documents(qs);
    DOCS.list=documents||[];
    // اگر کاربر در فاصله‌ی رفت‌وبرگشت شبکه «سند جدید» یا یک سند را باز کرده باشد،
    // این پاسخِ دیرهنگام نباید فرمِ باز (و متنی که تایپ کرده) را پاک کند.
    if(DOCS.view!=='list') return;
    drawDocList();
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}

// فهرست مدارک کنترل‌شده روی کاغذ. ارزیاب این را به‌عنوان «فهرست اصلی مدارک»
// می‌خواهد: چه سندی با چه کدی، چه نسخه‌ای، امضا کامل شده یا نه، و بازبینی بعدی کی
// است (الف-۱-۴-۱). ستون بازبینی عمداً هست چون سندِ ازتاریخ‌گذشته همان‌جا دیده شود.
function printDocRegister(){
  if(!DOCS.list.length){ toast('سندی با این فیلتر برای چاپ نیست',true); return; }
  const approved=DOCS.list.filter(d=>d.status==='approved').length;
  printListSheet({
    page:'documents', title:'فهرست مدارک کنترل‌شده', code:'RPT-DOC',
    intro:'مدارک ثبت‌شده با کد، نوع، نسخه، وضعیت گردش امضا، تاریخ ابلاغ و بازبینی بعدی.',
    meta:[...activeFilters(DOCS.filters,{doc_type:'نوع سند',status:'وضعیت',q:'جست‌وجو'}),
      ['تأییدشده', String(approved)+' از '+DOCS.list.length]],
    headers:['کد مدرک','عنوان سند','نوع','نسخه','وضعیت','امضاها','تاریخ ابلاغ','بازبینی بعدی','مسئول اجرا'],
    rows:DOCS.list.map(d=>[esc(d.doc_code||'—'), esc(d.title),
      DOC_TYPE_FA[d.doc_type]||esc(d.doc_type||'—'), fa(d.version_no||1),
      DOC_STATUS_FA[d.status]||esc(d.status||'—'),
      fa(d.signed_count||0)+' از '+fa(d.signoff_count||0),
      d.issue_date?faDateISO(d.issue_date):'—',
      d.review_date?faDateISO(d.review_date):'—',
      esc(d.responsible_person||'—')]),
    foot:'مدارک کنترل‌شده',
  });
}

function getDocBranch(d){
  const code = (d.doc_code || '').toUpperCase();
  const title = (d.title || '').toLowerCase();
  if (code.includes('-IC-') || code.startsWith('IC-') || title.includes('عفونت') || title.includes('ایزولاسیون') || title.includes('طغیان') || title.includes('استریل') || title.includes('ضدعفونی') || title.includes('لوازم لنژری')) {
    return { key: 'infection', code: 'ب-5', title: 'پیشگیری و کنترل عفونت‌های بیمارستانی', icon: '🛡️', color: '#0284c7' };
  }
  if (code.includes('-LAB-') || code.startsWith('LAB-') || title.includes('آزمایشگاه') || title.includes('پاتولوژی') || title.includes('کشت') || title.includes('بیوشیمی') || title.includes('هماتولوژی')) {
    return { key: 'lab', code: 'ب-8', title: 'خدمات آزمایشگاه تشخیص طبی و آسیب‌شناسی', icon: '🧪', color: '#059669' };
  }
  if (code.includes('-BT-') || code.startsWith('BT-') || title.includes('انتقال خون') || title.includes('بانک خون') || title.includes('هموویژیلانس')) {
    return { key: 'blood', code: 'ب-9', title: 'بانک خون و طب انتقال خون', icon: '🩸', color: '#e11d48' };
  }
  if (code.includes('-IMG-') || code.startsWith('IMG-') || title.includes('تصویربرداری') || title.includes('رادیولوژی') || title.includes('سی‌تی') || title.includes('سونوگرافی') || title.includes('پرتو')) {
    return { key: 'imaging', code: 'ب-7', title: 'تصویربرداری پزشکی و پرتوپزشکی', icon: '📷', color: '#7c3aed' };
  }
  if (code.includes('-EMG-') || code.startsWith('EMG-') || title.includes('اورژانس') || title.includes('تریاژ') || title.includes('احیا') || title.includes('کد 99') || title.includes('کد ۹۹')) {
    return { key: 'emergency', code: 'ب-2', title: 'اورژانس، تریاژ و مراقبت‌های حاد', icon: '🚨', color: '#dc2626' };
  }
  if (code.includes('-SUR-') || code.startsWith('SUR-') || title.includes('اتاق عمل') || title.includes('جراحی') || title.includes('بیهوشی') || title.includes('ریکاوری')) {
    return { key: 'surgery', code: 'ب-3', title: 'جراحی، بیهوشی و اتاق عمل', icon: '🔪', color: '#d97706' };
  }
  if (code.includes('-PID-') || code.startsWith('PID-') || title.includes('زایمان') || title.includes('مادر') || title.includes('نوزاد') || title.includes('شیر مادر') || title.includes('nicu')) {
    return { key: 'maternal', code: 'ب-4', title: 'سلامت مادر، نوزاد و ترویج زایمان طبیعی', icon: '👶', color: '#db2777' };
  }
  if (code.includes('-PTS-') || code.startsWith('PTS-') || title.includes('حقوق بیمار') || title.includes('منشور') || title.includes('رضایت') || title.includes('شکایات') || title.includes('تکریم') || title.includes('اطلاعات به بیمار')) {
    return { key: 'patientrights', code: 'ج-2', title: 'احترام به حقوق بیمار و منشور حقوق گیرنده خدمت', icon: '⚖️', color: '#2563eb' };
  }
  if (code.includes('-OPT-') || code.startsWith('OPT-') || title.includes('سرپایی') || title.includes('درمانگاه') || title.includes('کلینیک') || title.includes('نوبت')) {
    return { key: 'outpatient', code: 'ب-10', title: 'خدمات سرپایی و کلینیک‌های تخصصی', icon: '🏥', color: '#0891b2' };
  }
  if (code.includes('-NUT-') || code.startsWith('NUT-') || title.includes('تغذیه') || title.includes('رژیم') || title.includes('آشپزخانه')) {
    return { key: 'nutrition', code: 'ب-1', title: 'تغذیه بالینی و خدمات رژیم‌درمانی', icon: '🥗', color: '#16a34a' };
  }
  if (code.includes('-CLN-') || code.startsWith('CLN-') || title.includes('دارو') || title.includes('سقوط') || title.includes('زخم') || title.includes('بستری') || title.includes('پرستار') || title.includes('پرونده') || title.includes('مراقبت')) {
    return { key: 'clinical', code: 'ب-1', title: 'مراقبت‌های عمومی بالینی و خدمات درمانی', icon: '🩺', color: '#4f46e5' };
  }
  if (code.startsWith('QI-') || code.startsWith('QM-') || code.startsWith('HR-') || code.startsWith('IT-') || code.startsWith('NR-') || code.startsWith('PR-') || title.includes('کیفیت') || title.includes('مدیریت') || title.includes('منابع انسانی') || title.includes('اطلاعات سلامت')) {
    return { key: 'governance', code: 'الف-1', title: 'رهبری کیفیت، مدیریت منابع، پرستاری و فناوری اطلاعات', icon: '🏛️', color: '#d97706' };
  }
  return { key: 'general', code: 'عام', title: 'سایر مدارک و فرآیندهای عمومی بیمارستان', icon: '📑', color: '#64748b' };
}

function drawDocList(){
  const f = DOCS.filters;
  const isCards = DOCS.layout === 'cards';
  DOCS.activeBranch = DOCS.activeBranch || 'all';

  // دسته‌بندی مدارک بر اساس شاخه‌های تخصصی
  const branchMap = {};
  const branchOrder = [];
  DOCS.list.forEach(d => {
    const br = getDocBranch(d);
    if (!branchMap[br.key]) {
      branchMap[br.key] = { branch: br, docs: [] };
      branchOrder.push(br.key);
    }
    branchMap[br.key].docs.push(d);
  });

  const branchPillsHtml = `
    <div class="lux-doc-branch-bar">
      <div class="lux-doc-branch-pill ${DOCS.activeBranch === 'all' ? 'active' : ''}" onclick="DOCS.activeBranch='all'; drawDocList();">
        <span>📁 همه شاخه‌ها</span>
        <span class="pill-count">${fa(DOCS.list.length)}</span>
      </div>
      ${branchOrder.map(k => {
        const item = branchMap[k];
        const active = DOCS.activeBranch === k;
        return `
          <div class="lux-doc-branch-pill ${active ? 'active' : ''}" ${active ? `style="border-color:${item.branch.color};background:${item.branch.color}22"` : ''} onclick="DOCS.activeBranch='${k}'; drawDocList();">
            <span>${item.branch.icon}</span>
            <span>${esc(item.branch.title)}</span>
            <span class="pill-count">${fa(item.docs.length)}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // رندر کارت‌های لوکس هر شاخه با کنتراست بالا و اصل Zero Deletion
  const renderCard = (d) => {
    const br = getDocBranch(d);
    const typeKey = d.doc_type || 'procedure';
    const typeIcon = d.doc_type === 'policy' ? '📜' : (d.doc_type === 'instruction' ? '📋' : (d.doc_type === 'procedure' ? '📑' : '🗂️'));
    const typeFa = DOC_TYPE_FA[d.doc_type] || d.doc_type;

    return `
      <div class="lux-doc-card type-${typeKey}" style="border-top:3px solid ${br.color}" onclick="openDocument('${d.id}')">
        <div class="lux-card-top">
          <div style="display:flex;align-items:center;gap:6px">
            <span class="lux-type-tag">${typeIcon} ${typeFa}</span>
            <span class="lux-doc-code">${esc(d.doc_code || '—')}</span>
          </div>
          <span class="bdg ${DOC_STATUS_BDG[d.status]||'b2'}">${DOC_STATUS_FA[d.status]||d.status}</span>
        </div>

        <h4 class="lux-doc-title">${esc(d.title)}</h4>

        <div style="font-size:11.5px;margin-bottom:8px;display:inline-flex;align-items:center;gap:6px;background:${br.color}1f;color:${br.color};border:1px solid ${br.color}55;border-radius:20px;padding:3px 10px;font-weight:700">
          <span>${br.icon} ${esc(br.code)} · ${esc(br.title)}</span>
          <span style="opacity:0.85">· نسخه ${fa(d.version_no || 1)}</span>
          <span style="opacity:0.95;background:rgba(255,255,255,0.15);padding:1px 6px;border-radius:10px">· ${revisionLabel(d.revision_no)}</span>
        </div>

        <div class="lux-doc-meta">
          <div class="lux-meta-row">
            <span class="lbl">نوع مدرک:</span>
            <span class="val">${typeFa}</span>
          </div>
          <div class="lux-meta-row">
            <span class="lbl">امضاهای الکترونیکی:</span>
            <span class="val">${fa(d.signed_count||0)} از ${fa(d.signoff_count||0)}</span>
          </div>
          ${d.responsible_person ? `
          <div class="lux-meta-row">
            <span class="lbl">مسئول اجرا / پاسخگو:</span>
            <span class="val" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(d.responsible_person)}</span>
          </div>` : ''}
          ${d.issue_date || d.review_date ? `
          <div class="lux-meta-row" style="font-size:10.5px;opacity:0.85">
            <span>ابلاغ: ${d.issue_date ? faDateISO(d.issue_date) : '—'}</span>
            <span>بازبینی: ${d.review_date ? faDateISO(d.review_date) : '—'}</span>
          </div>` : ''}
        </div>

        <div class="lux-card-actions" onclick="event.stopPropagation()">
          <button class="btn btn-g btn-sm" style="flex:1" onclick="openDocument('${d.id}')">👁️ مشاهده متن کامل سند</button>
          ${canManageDocs() ? `<button class="btn btn-o btn-sm" onclick="editDocument('${d.id}')">✏️ ویرایش</button>` : ''}
        </div>
      </div>
    `;
  };

  let cardsContentHtml = '';
  if (DOCS.activeBranch === 'all') {
    cardsContentHtml = branchOrder.map(k => {
      const item = branchMap[k];
      return `
        <div class="lux-branch-section" style="border-inline-start:4px solid ${item.branch.color}">
          <div class="lux-branch-header">
            <div class="lux-branch-title-wrap">
              <div class="lux-branch-icon" style="background:${item.branch.color}1f;border:1px solid ${item.branch.color}55">${item.branch.icon}</div>
              <div>
                <h3 class="lux-branch-title">${esc(item.branch.title)}</h3>
                <div class="lux-branch-sub">محور اعتباربخشی ${esc(item.branch.code)} · ${fa(item.docs.length)} سند مصوب و فعال</div>
              </div>
            </div>
            <span class="bdg b1" style="font-size:11px;padding:4px 10px">شامل خط‌مشی‌ها، دستورالعمل‌ها و SOPها</span>
          </div>
          <div class="lux-doc-grid">
            ${item.docs.map(renderCard).join('')}
          </div>
        </div>
      `;
    }).join('');
  } else {
    const item = branchMap[DOCS.activeBranch];
    if (item) {
      cardsContentHtml = `
        <div class="lux-branch-section" style="border-inline-start:4px solid ${item.branch.color}">
          <div class="lux-branch-header">
            <div class="lux-branch-title-wrap">
              <div class="lux-branch-icon" style="background:${item.branch.color}1f;border:1px solid ${item.branch.color}55">${item.branch.icon}</div>
              <div>
                <h3 class="lux-branch-title">${esc(item.branch.title)}</h3>
                <div class="lux-branch-sub">محور اعتباربخشی ${esc(item.branch.code)} · ${fa(item.docs.length)} سند</div>
              </div>
            </div>
            <button class="btn btn-o btn-sm" onclick="DOCS.activeBranch='all'; drawDocList();">◂ نمایش همه شاخه‌ها</button>
          </div>
          <div class="lux-doc-grid">
            ${item.docs.map(renderCard).join('')}
          </div>
        </div>
      `;
    }
  }

  $('content').innerHTML = `
  <div class="panel g">
    <div class="phd"><div class="abadge">📁</div>
      <div style="flex:1"><h3>مدارک کنترل‌شده بیمارستان</h3>
      <div class="sub">${fa(DOCS.list.length)} سند — تفکیک‌شده بر اساس شاخه‌های استانداردهای اعتباربخشی ملی با گردش امضا</div></div>
      <div style="display:flex;gap:5px;align-items:center">
        <button class="btn btn-sm ${isCards?'btn-g':'btn-o'}" title="نمای کارتی شاخه‌محور" onclick="setDocLayout('cards')">⊞ کارت‌های شاخه‌بندی</button>
        <button class="btn btn-sm ${!isCards?'btn-g':'btn-o'}" title="نمای جدولی" onclick="setDocLayout('table')">≡ جدول</button>
      </div>
      <button class="btn btn-o btn-sm" onclick="printDocRegister()">${ic('print')} چاپ فهرست</button>
      ${canManageDocs()?`<button class="btn btn-o btn-sm" onclick="renderBulkUpload()">⇪ آپلود انبوه با هوش مصنوعی</button>`:''}
      ${canManageDocs()?`<button class="btn btn-g btn-sm" onclick="newDocument()">+ ثبت سند جدید</button>`:''}
    </div>
    <div class="pbody">
      ${docTabs('docs')}

      <!-- بنر راهنمای طلایی شاخص‌های مستندات -->
      <div style="text-align:center;margin:12px 0 18px 0">
        <div style="display:inline-block;background:linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);border:2px solid #f59e0b;padding:10px 24px;border-radius:18px;box-shadow:0 4px 14px rgba(245,158,11,0.18)">
          <div style="font-size:22px;line-height:1;margin-bottom:2px">🪧</div>
          <h3 style="margin:0;color:#92400e;font-size:16px;font-weight:800">
            ${f.doc_type==='instruction'?'دستورالعمل‌های استاندارد کیفیت و ایمنی':(f.doc_type==='policy'?'خط‌مشی‌های استاندارد رهبری و مدیریت':'نظام جامع اسناد و مدارک کنترل‌شده')}
          </h3>
          <div style="color:#b45309;font-size:11.5px;margin-top:3px">
            سازمان‌دهی یکپارچه مستندات بر اساس شاخه‌های بالینی و اداری اعتباربخشی بیمارستان
          </div>
        </div>
      </div>

      <div class="docfilters">
        <div class="fg" style="margin:0"><label>نوع سند ${help('flt_doctype')}</label>
          <select onchange="setDocFilter('doc_type',this.value)">
            <option value="">همه انواع</option>
            ${Object.entries(DOC_TYPE_FA).map(([k,v])=>`<option value="${k}" ${f.doc_type===k?'selected':''}>${v}</option>`).join('')}
          </select></div>
        <div class="fg" style="margin:0"><label>وضعیت ${help('flt_status')}</label>
          <select onchange="setDocFilter('status',this.value)">
            <option value="">همه وضعیت‌ها</option>
            ${Object.entries(DOC_STATUS_FA).map(([k,v])=>`<option value="${k}" ${f.status===k?'selected':''}>${v}</option>`).join('')}
          </select></div>
        <div class="fg" style="margin:0;flex:1.6"><label>جستجو در عنوان یا کد مدرک</label>
          <input id="doc_q" value="${esc(f.q)}" placeholder="مثال: کنترل عفونت، زایمان یا INS-01"
            onkeydown="if(event.key==='Enter')setDocFilter('q',this.value)"></div>
        <button class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px" onclick="setDocFilter('q',$('doc_q').value)">⌕ اعمال فیلتر</button>
      </div>

      ${!DOCS.list.length?'<div class="empty"><div class="ei">📁</div>سندی با این فیلترها یافت نشد</div>':
        isCards ? `
        <!-- نوار افقی انتخاب شاخه‌ها -->
        ${branchPillsHtml}
        <!-- فهرست شاخه‌ها و کارت‌های تفکیک‌شده -->
        <div>
          ${cardsContentHtml}
        </div>
        ` : `
        <!-- نمای جدولی فشرده -->
        <div class="tbl-wrap"><table>
          <thead><tr><th>کد مدرک</th><th>عنوان سند</th><th>نوع</th><th>وضعیت</th><th>عملیات</th></tr></thead>
          <tbody>${DOCS.list.map(d=>{ const did=drowNext(); return `<tr>
            <td style="color:var(--gdl);white-space:nowrap">${esc(d.doc_code||'—')}</td>
            <td style="color:var(--th)">${esc(d.title)}${exBdg(d)}${docReviewBadge(d.review_date)}
              <span class="tsub">${d.section_id?esc(fixText(d.section_title||d.section_code||'')):'بدون محور مرتبط'}</span></td>
            <td style="white-space:nowrap">${DOC_TYPE_FA[d.doc_type]||d.doc_type}</td>
            <td><span class="bdg ${DOC_STATUS_BDG[d.status]||'b2'}">${DOC_STATUS_FA[d.status]||d.status}</span></td>
            <td style="white-space:nowrap">
              <button class="tgl prim" onclick="openDocument('${d.id}')">مشاهده</button>
              ${drowBtn(did)}
            </td></tr>
            ${drowRow(did, 5, [
              dp('محور اعتباربخشی مرتبط', d.section_id?esc(fixText(d.section_title||d.section_code||'')):''),
              dp('شماره نسخه', fa(d.version_no||1)),
              dp('شماره ویرایش', revisionLabel(d.revision_no)),
              dp('امضاهای تکمیل‌شده', `${fa(d.signed_count||0)} از ${fa(d.signoff_count||0)}`),
              dp('تاریخ ابلاغ', d.issue_date?faDateISO(d.issue_date):''),
              dp('تاریخ بازبینی بعدی', d.review_date?faDateISO(d.review_date):''),
              dp('مسئول اجرا', esc(d.responsible_person||'')),
              dp('ثبت‌کننده', esc(d.created_by_name||'')),
            ], canManageDocs()?`<button class="tgl" onclick="editDocument('${d.id}')">ویرایش</button>
              <button class="tgl dngr" onclick="removeDocument('${d.id}')">حذف سند</button>`:'')}`;
          }).join('')}</tbody></table></div>`}
    </div>
  </div>`;
}
function setDocFilter(k,v){ DOCS.filters[k]=v; DOCS.view='list'; renderDocuments(); }

// ==================== آپلود انبوه با تشخیص خودکار ====================
// کارفرما: انبوهِ خط‌مشی و فلوچارتِ PDF/عکس را یک‌جا بدهد و سامانه با کمکِ
// همان کلیدِ AvalAI که در پنل سوپرادمین تنظیم کرده، خودش تشخیص بدهد سند
// است یا فرآیند و فرم را پر کند. کاربر فقط پیشنهاد را می‌بیند، لازم شد
// ویرایش می‌کند، و «ثبت» می‌زند — هیچ نوشتنی بدون تأییدِ صریح انجام
// نمی‌شود.
let BULK={files:[], results:[], busy:false, done:{}};

function renderBulkUpload(){
  BULK={files:[], results:[], busy:false, done:{}};
  $('ptitle').textContent='آپلود انبوه اسناد';
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">⇪</div>
      <div style="flex:1"><h3>آپلود انبوه اسناد با هوش مصنوعی</h3>
      <div class="sub">چند فایل PDF یا عکس را هم‌زمان بده — متن هر فایل خوانده و نوعِ سند (خط‌مشی/روش اجرایی/دستورالعمل یا فرآیند) پیشنهاد می‌شود</div></div>
      <button class="btn btn-o btn-sm" onclick="go('documents')">◂ بازگشت</button>
    </div>
    <div class="pbody">
      <div class="rg-warn noprint" style="margin-bottom:14px">هر فایل با همان فروشنده‌ی هوش مصنوعیِ تنظیم‌شده در پنل سوپرادمین خوانده می‌شود و از سقفِ توکنِ ماهانه‌ی همین بیمارستان کم می‌شود. PDF تایپی رایگان است — فقط PDFِ اسکن‌شده یا عکس توکن مصرف می‌کند.</div>
      <div class="fg" style="max-width:520px"><label>فایل‌ها (حداکثر ۸ فایل — PDF / JPG / PNG / WEBP)</label>
        <input type="file" id="bulk_files" multiple accept=".pdf,image/*" onchange="bulkFilesPicked(this.files)"></div>
      <div id="bulkFileList" style="margin:10px 0"></div>
      <button class="btn btn-g btn-sm" id="bulkRunBtn" onclick="bulkRunExtract()" disabled>استخراج و پیشنهاد</button>
      <div id="bulkResults" style="margin-top:18px"></div>
    </div>
  </div>`;
}
function bulkFilesPicked(fileList){
  BULK.files=[...fileList];
  $('bulkFileList').innerHTML=BULK.files.length
    ?`<ul style="margin:0;padding-inline-start:18px;font-size:12.5px;color:var(--td)">${BULK.files.map(f=>`<li>${esc(f.name)} — ${fa(Math.round(f.size/1024))} کیلوبایت</li>`).join('')}</ul>`
    :'';
  $('bulkRunBtn').disabled=!BULK.files.length;
}
async function bulkRunExtract(){
  if(!BULK.files.length||BULK.busy) return;
  BULK.busy=true;
  $('bulkRunBtn').disabled=true; $('bulkRunBtn').textContent='در حال پردازش…';
  $('bulkResults').innerHTML='<div class="empty">در حال خواندن و طبقه‌بندیِ فایل‌ها — بسته به تعداد و حجم، چند لحظه طول می‌کشد…</div>';
  try{
    const r=await API.bulkExtractDocuments(BULK.files);
    BULK.results=r.results||[];
    bulkDrawResults();
  }catch(e){
    $('bulkResults').innerHTML=`<div class="empty">${esc(e.message)}</div>`;
  }finally{
    BULK.busy=false;
    $('bulkRunBtn').disabled=false; $('bulkRunBtn').textContent='استخراج و پیشنهاد';
  }
}

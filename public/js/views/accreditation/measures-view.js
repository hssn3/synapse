/**
 * Accreditation Measures & 3-Axis Tree
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
function renderMeasures(){
  const mine = myAxes();
  if(!mine.length){
    $('content').innerHTML = '<div class="panel g"><div class="empty">محوری در دسترس نیست</div></div>';
    return;
  }

  // بررسی سوئیچ به سایر ابزارهای سامانه جامع اعتباربخشی
  const curSuiteTab = S.accCurrentTab || 'measures';
  if(typeof renderAccSuiteNav === 'function' && curSuiteTab !== 'measures'){
    let tabHtml = '';
    if(curSuiteTab === 'indicators'){
      $('ptitle').textContent = 'شناسنامه شاخص‌های بیمارستانی (Indicator Passport)';
      tabHtml = renderAccIndicators();
    } else if(curSuiteTab === 'committees'){
      $('ptitle').textContent = 'کمیته‌های بیمارستانی و مدیریت مصوبات';
      tabHtml = renderAccCommittees();
    } else if(curSuiteTab === 'errors'){
      $('ptitle').textContent = 'ثبت خطاهای پزشکی و وقایع ۲۸گانه (Never Events)';
      tabHtml = renderAccErrors();
    } else if(curSuiteTab === 'checklists'){
      $('ptitle').textContent = 'چک‌لیست‌های پایش، ارزیابی بالینی و EOP';
      tabHtml = renderAccChecklists();
    } else if(curSuiteTab === 'reminders'){
      $('ptitle').textContent = 'پایش نواقص و یادآورهای سنجه‌ها';
      tabHtml = renderAccReminders();
    }
    $('content').innerHTML = renderAccSuiteNav() + tabHtml;
    return;
  }

  // تعیین عمق ناوبری پشته‌ای (۰: سه شاخه اصلی، ۱: زیرمحورها، ۲: سنجه‌ها)
  if(S.accDepth === undefined){
    if(S.axis) S.accDepth = 2;
    else if(S.openSec) S.accDepth = 1;
    else S.accDepth = 0;
  }
  saveMeasuresSubState();
  syncRouteHash('measures');

  // ----------------------------------------------------
  // سطح ۰: نمای ۳ شاخه اصلی از راست به چپ (Layered Stacking Level 0)
  // ----------------------------------------------------
  if(S.accDepth === 0){
    $('ptitle').textContent = 'محورهای اصلی اعتباربخشی ملی';
    const SEC_ICONS = { 'الف': '🏛️', 'ب': '🩺', 'ج': '🤝' };
    const SEC_SUBTITLES = {
      'الف': '۷ محور فرعی (رهبری کیفیت، بلایا EOP، منابع انسانی، پرستاری، فناوری اطلاعات، بهداشت محیط، تجهیزات)',
      'ب': '۱۰ محور فرعی (مراقبت عمومی، اورژانس و تریاژ، جراحی و بیهوشی، مادر و نوزاد، کنترل عفونت، دارو، تصویربرداری، آزمایشگاه، انتقال خون، سرپایی)',
      'ج': '۲ محور فرعی (تسهیلات مراجعین، احترام به حقوق بیمار و منشور حقوق)'
    };

    let totalAllDone = 0, totalAllMeasures = 0;
    const cardsHtml = (S.sections || []).map((sec, si) => {
      const p = secProgress(sec.code);
      totalAllDone += p.done;
      totalAllMeasures += p.total;
      const axesCount = (sec.axes || []).length;
      return `
        <div class="acc-root-card acc-stagger ${S.openSec === sec.code ? 'selected' : ''}" style="animation-delay:${si * 110}ms" role="button" tabindex="0" onclick="selectRootAxis('${esc(sec.code)}')">
          <div class="acc-root-top">
            <span class="acc-root-badge">${SEC_ICONS[sec.code] || '📋'}</span>
            <span class="acc-root-code">بخش کلان ${esc(sec.code)}</span>
          </div>
          <div class="acc-root-title">${esc(sec.title)}</div>
          <div class="acc-root-desc">${SEC_SUBTITLES[sec.code] || ''}</div>
          <div class="acc-root-stats">
            <span><b>${fa(axesCount)}</b> محور فرعی · <b>${fa(p.total)}</b> سنجه</span>
            <span style="color:var(--ok);font-weight:700">${fa(p.pct)}٪ تکمیل</span>
          </div>
          <div class="acc-root-progress"><i style="width:${p.pct}%"></i></div>
        </div>
      `;
    }).join('');

    const overallPct = totalAllMeasures ? Math.round(totalAllDone * 100 / totalAllMeasures) : 0;

    $('content').innerHTML = (typeof renderAccSuiteNav==='function'?renderAccSuiteNav():'') + `
      <div class="acc-stack-viewport">
        <div class="panel g" style="margin-bottom:18px;border-color:rgba(212,175,90,0.3)">
          <div class="phd">
            <div class="abadge">🏛️</div>
            <div style="flex:1">
              <h3>سامانه جامع استانداردهای اعتباربخشی ملی بیمارستان</h3>
              <div class="sub">ارزیابی بر اساس آخرین کتاب استانداردهای وزارت بهداشت (ویرایش ششم · دور ششم) · ۳۹۵ سنجه ملی و بستهٔ تخصصی</div>
            </div>
            <div style="min-width:140px;text-align:left">
              <div class="bar"><i class="bf-gd" style="width:${overallPct}%"></i></div>
              <div style="font-size:11px;color:var(--gdl);text-align:center;margin-top:5px">پیشرفت کل بیمارستان: <b>${fa(overallPct)}٪</b></div>
            </div>
          </div>
        </div>

        <div style="margin-bottom:12px;font-size:13px;font-weight:700;color:var(--tm)">
          جهت ورود به زیرشاخه‌ها و سنجه‌ها، یکی از ۳ محور اصلی زیر را انتخاب نمایید:
        </div>

        <div class="acc-root-grid">
          ${cardsHtml}
        </div>
      </div>
    `;
    return;
  }

  // یافتن بخش والد انتخاب‌شده برای عمق‌های ۱ و ۲
  let activeSec = (S.sections || []).find(s => s.code === S.openSec);
  if(!activeSec && S.axis){
    activeSec = (S.sections || []).find(s => (s.axes || []).some(a => a.code === S.axis));
    if(activeSec) S.openSec = activeSec.code;
  }
  if(!activeSec) activeSec = (S.sections || [])[0];

  // ----------------------------------------------------
  // سطح ۱: نمایش زیرمحورهای بخش انتخاب‌شده (Layered Stacking Level 1)
  // ----------------------------------------------------
  if(S.accDepth === 1){
    $('ptitle').textContent = activeSec ? activeSec.title : 'زیرمحورها';

    // رندر هاب‌های کارتی طراحی اولیه حسن منطبق بر اسکرین‌شات‌های مرجع (media_1789657297009.png و 12_36_54 و 12_37_09)
    if((typeof renderHassanCareHub === 'function' || typeof renderHassanCareHub === 'function') && S.hassanCleanMode !== false){
      const clearGlobalCrumb = () => { const nb = $('navcrumb'); if (nb) nb.innerHTML = ''; };
      if(activeSec && activeSec.code === 'ب'){
        $('content').innerHTML = (typeof renderHassanDynamic === 'function' ? renderHassanDynamic('care') : renderHassanCareHub());
        clearGlobalCrumb();
        return;
      }
      if(activeSec && activeSec.code === 'الف'){
        $('content').innerHTML = (typeof renderHassanDynamic === 'function' ? renderHassanDynamic('management') : renderHassanManagementHub());
        clearGlobalCrumb();
        return;
      }
      if(activeSec && activeSec.code === 'ج'){
        $('content').innerHTML = (typeof renderHassanDynamic === 'function' ? renderHassanDynamic('support') : renderHassanSupportHub());
        clearGlobalCrumb();
        return;
      }
    }

    const p = activeSec ? secProgress(activeSec.code) : { total:0, done:0, pct:0 };

    const subAxesCards = ((activeSec && activeSec.axes) || []).map((ax, ai) => {
      const st = calc(ax.measures);
      return `
        <div class="acc-subaxis-card acc-stagger ${S.axis === ax.code ? 'selected' : ''}" style="animation-delay:${Math.min(ai, 12) * 70}ms" role="button" tabindex="0" onclick="selectSubAxis('${esc(ax.code)}')">
          <div class="acc-subaxis-icon">${esc(ax.code)}</div>
          <div class="acc-subaxis-info">
            <div class="acc-subaxis-code">محور فرعی ${esc(ax.code)}</div>
            <div class="acc-subaxis-title">${esc(ax.title)}</div>
            <div class="acc-subaxis-meta">${fa(ax.standards.length)} استاندارد · ${fa(ax.measures.length)} سنجه</div>
            <div class="acc-root-progress" style="margin-top:8px"><i style="width:${st.pct}%"></i></div>
          </div>
          <div style="align-self:center;font-size:12px;font-weight:700;color:var(--ok);min-width:38px;text-align:left">${fa(st.pct)}٪</div>
        </div>
      `;
    }).join('');

    $('content').innerHTML = (typeof renderAccSuiteNav==='function'?renderAccSuiteNav():'') + `
      <div class="acc-stack-viewport">
        <!-- لایه عقب: کارت ۳ شاخه اصلی به صورت کوچک و پشته‌ای در عمق پشت -->
        <div class="acc-back-card" role="button" tabindex="0" onclick="S.accDepth=0; renderMeasures();">
          <span class="back-tag">◂ بازگشت به نمای ۳ شاخه اصلی</span>
          <span>محور والد: <b>بخش ${esc(activeSec.code)} - ${esc(activeSec.title)}</b></span>
          <span style="font-size:11px;color:var(--gd)">کلیک برای تغییر شاخه اصلی ▴</span>
        </div>

        <div class="panel g acc-layer is-active" style="margin-bottom:18px">
          <div class="phd">
            <div class="abadge">${esc(activeSec.code)}</div>
            <div style="flex:1">
              <h3>زیرمحورهای ${esc(activeSec.title)}</h3>
              <div class="sub">${fa(activeSec.axes.length)} محور فرعی · ${fa(p.total)} سنجه · پیشرفت کلی: ${fa(p.pct)}٪</div>
            </div>
          </div>
          <div class="pbody">
            <div style="margin-bottom:14px;font-size:12.5px;color:var(--tm)">
              محور مورد نظر خود را برای مشاهده استانداردها، سنجه‌ها و مستندات رسمی کتاب انتخاب نمایید:
            </div>
            <div class="acc-subaxes-grid">
              ${subAxesCards}
            </div>
          </div>
        </div>
      </div>
    `;
    return;
  }

  // ----------------------------------------------------
  // سطح ۲: نمایش جزئیات سنجه‌ها و استانداردها (Layered Stacking Level 2)
  // ----------------------------------------------------
  if(!S.axis || !mine.find(x => x.ax.code === S.axis)) S.axis = mine[0]?.ax.code;
  const found = mine.find(x => x.ax.code === S.axis);
  if(!found){ $('content').innerHTML = '<div class="panel g"><div class="empty">محوری در دسترس نیست</div></div>'; return; }
  const ax = found.ax, st = calc(ax.measures);
  $('ptitle').textContent = ax.title;
  const grp = {}; ax.measures.forEach(m => { (grp[m._std] = grp[m._std] || []).push(m); });

  $('content').innerHTML = (typeof renderAccSuiteNav==='function'?renderAccSuiteNav():'') + `
    <div class="acc-stack-viewport">
      <!-- لایه عقب ۱: برگشت به ۳ شاخه اصلی -->
      <div class="acc-back-card" role="button" tabindex="0" onclick="S.accDepth=0; renderMeasures();">
        <span class="back-tag">◂ لایه ۱: سه شاخه اصلی</span>
        <span>بخش ${esc(activeSec.code)}: <b>${esc(activeSec.title)}</b></span>
        <span style="font-size:11px;color:var(--gd)">بازگشت ▴</span>
      </div>

      <!-- لایه عقب ۲: برگشت به زیرمحورها -->
      <div class="acc-back-card" style="margin-top:-6px;border-color:rgba(63,172,191,0.3)" role="button" tabindex="0" onclick="S.accDepth=1; renderMeasures();">
        <span class="back-tag" style="background:rgba(63,172,191,0.15);color:#4ecae0">◂ لایه ۲: فهرست زیرمحورها</span>
        <span>محور فعال: <b>${esc(ax.code)} - ${esc(ax.title)}</b></span>
        <span style="font-size:11px;color:#4ecae0">انتخاب زیرمحور دیگر ▴</span>
      </div>

      ${pathCards(ax.id)}

      <div class="panel g acc-layer is-active">
        <div class="phd">
          <div class="abadge">${esc(ax.code)}</div>
          <div style="flex:1">
            <h3>${esc(ax.title)}</h3>
            <div class="sub">${fa(ax.standards.length)} استاندارد · ${fa(ax.measures.length)} سنجه · تکمیل: ${fa(st.f)}</div>
          </div>
          ${!canEdit(ax.code) ? `<span class="bdg brole">فقط مشاهده — خارج از حوزه نقش شما ${help('role')}</span>` : ''}
          <div style="min-width:110px">
            <div class="bar"><i class="bf-gd" style="width:${st.pct}%"></i></div>
            <div style="font-size:10.5px;color:var(--gdl);text-align:center;margin-top:5px">${fa(st.pct)}٪ تکمیل</div>
          </div>
        </div>
        <div class="pbody">
          ${canViewDocs() ? `<div class="stdblk">
            <div class="stdhd" onclick="toggleAxisDocs('${ax.id}')">
              <span class="stdc">📁</span><span class="stdt">اسناد مرتبط با این محور</span>
              <span class="stdmeta"><span class="cnt" id="axdc">—</span><span class="chev">◂</span></span>
            </div>
            <div class="stdbody" id="axdocs"><div class="empty" style="padding:18px">در حال بارگذاری…</div></div>
          </div>` : ''}
          ${canViewIndicators() ? `<div class="stdblk">
            <div class="stdhd" onclick="toggleAxisKpis('${esc(ax.code)}')">
              <span class="stdc">◈</span><span class="stdt">شاخص‌های پایشِ این محور</span>
              <span class="stdmeta"><span class="cnt" id="axkc">—</span><span class="chev">◂</span></span>
            </div>
            <div class="stdbody" id="axkpis"><div class="empty" style="padding:18px">در حال بارگذاری…</div></div>
          </div>` : ''}
          ${ax.standards.map((std, i) => {
            const list = grp[std.code] || [];
            const ss = calc(list);
            return `<div class="stdblk acc-stagger" style="animation-delay:${Math.min(i, 10) * 80}ms">
              <div class="stdhd" onclick="toggleStd(${i})">
                <span class="stdc">${esc(std.code)}</span><span class="stdt">${esc(std.title)}</span>
                <span class="stdmeta"><span class="cnt">${fa(ss.f)}/${fa(list.length)}</span>
                <span class="mini-bar"><i style="width:${ss.pct}%"></i></span><span class="chev">◂</span></span>
              </div>
              <div class="stdbody${i === 0 ? ' on' : ''}" id="sb${i}">
                ${list.map(m => mCard(m, canEditMeasure(m, ax.code))).join('') || '<div class="empty" style="padding:20px">سنجه‌ای ثبت نشده</div>'}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  `;
  ensureMeasureDetails(ax.measures);
}
// جزئیات کتاب هر محور تنبل واکشی میشود: درختِ بوت بدون detail_text است (۶۴۳KB
// صرفهجویی در پاسخ) — بهمحض رندرِ محور، متن کامل سنجههای همان محور میآید و
// کارتها کامل میشوند. بازچینی بدون بستنِ برگههای بازِ کاربر انجام میشود.
let __detailBusy = false;
async function ensureMeasureDetails(list){
  if(__detailBusy) return;
  const ids=(list||[]).filter(m=>m.detail_text===undefined).map(m=>m.id).slice(0,60);
  if(!ids.length) return;
  __detailBusy=true;
  try{
    const r=await API.measureDetails(ids);
    // merge باید روی خودِ آبجکتهای ax.measures هم اعمال شود — آنها کپی هستند نه
    // ارجاع به S.byId (بازتولید: پس از واکشی، کارتها همچنان — نشان میدادند).
    const dm={}; (r.measures||[]).forEach(row=>{ dm[row.id]=row.detail_text; const bn=S.byId[row.id]; if(bn) bn.detail_text=row.detail_text; });
    (list||[]).forEach(m=>{ if(dm[m.id]!==undefined) m.detail_text=dm[m.id]; });
    const open=[...document.querySelectorAll('.drop.on')].map(d=>d.id);
    renderMeasures();
    open.forEach(id=>{ const el=$(id); if(el) el.classList.add('on'); });
  }catch(e){ /* بیصدا: بازکردن دوبارهی محور دوباره تلاش میکند */ }
  finally{ __detailBusy=false; }
}
function toggleStd(i){ const e=$('sb'+i); if(e) e.classList.toggle('on'); }

// ---- پل «محور درخت اعتباربخشی ↔ مدارک کنترل‌شده» ----
// اسناد فقط هنگام باز کردن بخش واکشی می‌شوند (lazy) و در SECDOCS کش می‌مانند
let SECDOCS={};
// شاخص‌های پایشِ همین محور — سمتِ دیگرِ همان پیوندی که در صفحه‌ی شاخص‌ها ساخته شد.
// کارفرما گفت شاخص‌ها باید با سنجه‌ها «ارتباط» داشته باشند و «بشه استفاده کرد»؛
// پیوندِ یک‌طرفه نصفِ کار است: کسی که روی محورِ «کنترل عفونت» ایستاده هم باید
// ببیند چه شاخص‌هایی این محور را پایش می‌کنند و مقدارشان چند است.
const AXKPIS={};
function toggleAxisKpis(axisCode){
  const box=$('axkpis'); if(!box) return;
  box.classList.toggle('on');
  if(box.classList.contains('on')) loadAxisKpis(axisCode);
}
async function loadAxisKpis(axisCode){
  const box=$('axkpis'); if(!box) return;
  try{
    if(!AXKPIS[axisCode]){
      const r=await API.indicators('per_page=200&active=1&axis='+encodeURIComponent(axisCode));
      AXKPIS[axisCode]=r.indicators||[];
    }
    drawAxisKpis(AXKPIS[axisCode]);
  }catch(e){ box.innerHTML=`<div class="empty" style="padding:18px">${esc(e.message)}</div>`; }
}
function drawAxisKpis(list){
  const box=$('axkpis'), cnt=$('axkc'); if(!box) return;
  if(cnt) cnt.textContent=fa(list.length);
  box.innerHTML=!list.length
    ?`<div class="empty" style="padding:22px"><div class="ei">◈</div>شاخصی به این محور متصل نشده است
       <div style="margin-top:10px"><button class="btn btn-o btn-sm" onclick="go('indicators')">رفتن به شاخص‌ها</button></div></div>`
    :`<div class="tbl-wrap"><table>
        <thead><tr><th>کد</th><th>عنوان شاخص</th><th>دسته</th><th>واحد</th><th>هدف</th><th>دوره</th><th></th></tr></thead>
        <tbody>${list.map(k=>`<tr>
          <td style="color:var(--gdl);white-space:nowrap">${esc(k.code||'—')}</td>
          <td style="color:var(--th)">${esc(k.title)}</td>
          <td>${esc(k.category||'—')}</td>
          <td>${esc(k.unit||'—')}</td>
          <td>${k.target_value===null||k.target_value===undefined?'—':fa(k.target_value)}</td>
          <td>${esc(k.measure_interval||'—')}</td>
          <td><button class="tgl" onclick="indOpenFrom('${esc(k.id)}')">شناسنامه</button></td>
        </tr>`).join('')}</tbody></table></div>`;
}
// از صفحه‌ی سنجه‌ها مستقیم به شناسنامه‌ی شاخص — بدون اینکه کاربر مجبور شود اول
// به صفحه‌ی شاخص‌ها برود و دوباره همان را پیدا کند.
function indOpenFrom(id){ IND.view='detail'; IND.detail=id; go('indicators'); }

function toggleAxisDocs(sectionId){
  const box=$('axdocs'); if(!box) return;
  box.classList.toggle('on');
  if(box.classList.contains('on')) loadAxisDocs(sectionId);
}
async function loadAxisDocs(sectionId){
  const box=$('axdocs'); if(!box) return;
  try{
    if(!SECDOCS[sectionId]){
      const {documents}=await API.sectionDocuments(sectionId);
      SECDOCS[sectionId]=documents||[];
    }
    drawAxisDocs(SECDOCS[sectionId]);
  }catch(e){ box.innerHTML=`<div class="empty" style="padding:18px">${esc(e.message)}</div>`; }
}
function drawAxisDocs(list){
  const box=$('axdocs'), cnt=$('axdc'); if(!box) return;
  if(cnt) cnt.textContent=fa(list.length);
  box.innerHTML=!list.length
    ?`<div class="empty" style="padding:22px"><div class="ei">📁</div>سندی به این محور متصل نشده است
       ${canManageDocs()?'<div style="margin-top:10px"><button class="btn btn-o btn-sm" onclick="go(\'documents\')">رفتن به مدارک کنترل‌شده</button></div>':''}</div>`
    :`<div class="tbl-wrap"><table>
        <thead><tr><th>کد مدرک</th><th>عنوان سند</th><th>نوع</th><th>وضعیت</th><th>نسخه</th><th></th></tr></thead>
        <tbody>${list.map(d=>`<tr>
          <td style="color:var(--gdl);white-space:nowrap">${esc(d.doc_code||'—')}</td>
          <td style="color:var(--th)">${esc(d.title)}</td>
          <td style="white-space:nowrap">${DOC_TYPE_FA[d.doc_type]||d.doc_type}</td>
          <td><span class="bdg ${DOC_STATUS_BDG[d.status]||'b2'}">${DOC_STATUS_FA[d.status]||d.status}</span></td>
          <td>${fa(d.version_no||1)}</td>
          <td><button class="tgl" onclick="openDocument('${d.id}')">مشاهده</button></td>
        </tr>`).join('')}</tbody></table></div>`;
}

// ==================== پرونده‌ی الکترونیکی شواهد (مشترک بین ماژول‌ها) ====================
// چرا اینجا و نه در هر ماژول جدا: تا پیش از این «شواهد» فقط یک متن آزاد بود که کاربر در آن
// *محل نگهداری* مدرک کاغذی را می‌نوشت. حالا خودِ مدرک در سامانه بارگذاری می‌شود. همین یک
// کامپوننت روی سنجه، حسابرسی داخلی و مصوبه‌ی واکراند سوار می‌شود (روت مشترک /evidence/…).
function evidenceBox(type, id, editable){
  const k = type + '_' + id;
  return `<div class="evbox" id="evb_${k}" data-evtype="${type}" data-evid="${esc(id)}">
    <div class="evlist" id="evl_${k}"><span style="font-size:10.5px;color:var(--td)">در حال بارگذاری فایل‌ها…</span></div>
    ${editable?`<div class="evup">
      <input type="file" id="evf_${k}" accept="image/jpeg,image/png,image/webp,application/pdf" style="font-size:10.5px;color:var(--tm)">
      <button class="btn btn-o btn-sm" onclick="uploadEvidence('${type}','${id}')">⭱ بارگذاری فایل مدرک</button>
      <span style="font-size:10px;color:var(--td)">JPG/PNG/WEBP/PDF — حداکثر ۵ مگابایت</span>
    </div>`:''}
  </div>`;
}
// فایل‌ها بعد از رندر شدن DOM واکشی می‌شوند (تا mCard همچنان یک تابع رشته‌ساز بماند)
async function loadEvidence(type, id){
  const box=$('evl_'+type+'_'+id); if(!box) return;
  try{
    const {files}=await API.evidenceFiles(type,id);
    box.innerHTML = files.length ? files.map(f=>`<div class="evfile">
        <a href="${API.evidenceDownloadUrl(f.id)}" target="_blank">⇩ ${esc(f.file_name||'فایل')}</a>
        ${f.title?`<span class="evft">${esc(f.title)}</span>`:''}
        <span class="evfm">${fa(Math.max(1,Math.round((f.file_size_bytes||0)/1024)))} کیلوبایت · ${esc(f.uploaded_by_name||'')}</span>
        <button class="tgl" onclick="deleteEvidence('${type}','${id}','${f.id}')" title="حذف فایل" aria-label="حذف فایل">✕</button>
      </div>`).join('')
      : `<div style="font-size:10.5px;color:var(--wr)">هنوز هیچ مدرکی بارگذاری نشده — بدون فایل، ${type==='measure'?'این سنجه':'این رکورد'} در روز ارزیابی مستند محسوب نمی‌شود.</div>`;
  }catch(e){ box.innerHTML=`<span style="font-size:10.5px;color:var(--dn)">${esc(e.message)}</span>`; }
}
// همه‌ی کادرهای شواهدِ داخل صفحه‌ی جاری را یک‌جا پر می‌کند
function loadAllEvidence(){
  document.querySelectorAll('.evbox').forEach(el=>loadEvidence(el.dataset.evtype, el.dataset.evid));
}
async function uploadEvidence(type, id){
  const fi=$('evf_'+type+'_'+id);
  if(!fi||!fi.files||!fi.files[0]) return toast('ابتدا فایل را انتخاب کنید', true);
  const title = $('nt_'+id) ? $('nt_'+id).value.slice(0,120) : '';
  try{ await API.uploadEvidenceFile(type, id, fi.files[0], title); fi.value=''; toast('مدرک بارگذاری شد'); loadEvidence(type,id); }
  catch(e){ toast(e.message,true); }
}
async function deleteEvidence(type, id, fileId){
  if(!await BTN.confirmDanger('این فایل مدرک حذف شود؟')) return;
  try{ await API.deleteEvidenceFile(fileId); toast('فایل حذف شد'); loadEvidence(type,id); }
  catch(e){ toast(e.message,true); }
}

// سه قضاوت روی یک سنجه، در یک ردیف: خودارزیابی (بالا، در mctl)، و اینجا
// نمره‌ی ارزیاب داخلی دانشگاه و ارزیاب بیرونی وزارت. اگر کاربر مجوز
// approve_measure_status نداشته باشد فقط می‌بیندشان.
const canReview = () => (S.user?.permissions||[]).includes('approve_measure_status');
const REV_FA = {'':'—', non_compliant:'عدم انطباق', partial:'انطباق نسبی',
                full_compliant:'انطباق کامل', not_applicable:'غیرقابل ارزیابی'};
const REV_CLS = {non_compliant:'s-n', partial:'s-p', full_compliant:'s-f', not_applicable:'s-na'};
function revOpts(v){
  return ['','non_compliant','partial','full_compliant','not_applicable']
    .map(k=>`<option value="${k}" ${v===k?'selected':''}>${k===''?'ثبت‌نشده':REV_FA[k]}</option>`).join('');
}
function reviewRow(m){
  const r=S.revMap[m.id]||{i:'',e:''};
  const mine=statusOf(m.id);
  // اختلاف فقط وقتی معنا دارد که هر دو نمره‌ی مقایسه‌پذیر باشند
  const rank={non_compliant:0,partial:1,full_compliant:2};
  const other=r.e||r.i, gap=(rank[mine]!==undefined&&rank[other]!==undefined&&rank[mine]!==rank[other])
    ? (rank[mine]>rank[other]?'over':'under') : null;
  const one=(kind,label,val)=>canReview()
    ? `<label class="rev-f"><span>${label}</span>
        <select class="sel sm ${REV_CLS[val]||''}" onchange="setRev('${kind}','${m.id}',this.value,this)">${revOpts(val)}</select></label>`
    : `<span class="rev-ro"><span>${label}</span><b>${REV_FA[val]||'—'}</b></span>`;
  if(!canReview() && !r.i && !r.e) return '';   // چیزی برای نشان دادن نیست
  return `<div class="revrow">
    ${one('internal','ارزیابی داخلی دانشگاه', r.i)}
    ${one('external','ارزیابی بیرونی وزارت', r.e)}
    ${gap?`<span class="rev-gap ${gap}">${gap==='over'
      ? 'خودارزیابی از نمره‌ی ارزیاب بالاتر است'
      : 'ارزیاب نمره‌ی بالاتری داده است'}</span>`:''}
  </div>`;
}

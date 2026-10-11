/**
 * Checklists Submissions & Print
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */

// محاسبه نمره و درصد انطباق لحظه‌ای (Live Score & Audit Progress)
function chkCalcLiveAuditScore(){
  const c = CHK.current;
  const groups = typeof chkAllGroups === 'function' ? chkAllGroups() : (CHK.domains || []).map(d => ({ title: d.title, items: d.items || [] }));
  let allItems = [];
  groups.forEach(g => { allItems = allItems.concat(g.items || []); });
  if (CHK.items && CHK.items.length && typeof chkAllGroups !== 'function') {
    allItems = allItems.concat(CHK.items);
  }

  let answered = 0, score = 0, maxScore = 0, nc = 0;
  allItems.forEach(it => {
    const val = CHK.answers[it.id];
    const w = Number(it.weight) || 1;
    const isYesNo = it.answer_type === 'yes_no';
    const top = isYesNo ? 1 : 4;
    maxScore += top * w;

    if (val !== undefined && val !== null && val !== '') {
      answered++;
      const valNum = isYesNo ? (val === 'yes' ? 1 : 0) : ({empty:0, low:1, medium:2, good:3, excellent:4}[val] || 0);
      score += valNum * w;
      if (isYesNo ? val === 'no' : (val === 'empty' || val === 'low')) {
        nc++;
      }
    }
  });

  const total = allItems.length;
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const progressPct = total > 0 ? Math.round((answered / total) * 100) : 0;

  // Update Live Scorebar DOM
  const barEl = $('chkLiveScoreBar');
  if (barEl) {
    $('chkLiveProgress').textContent = fa(answered) + ' از ' + fa(total) + ' سؤال (' + fa(progressPct) + '٪)';
    $('chkLiveScore').textContent = fa(score) + ' از ' + fa(maxScore) + (maxScore > 0 ? ' (' + fa(pct) + '٪)' : '');
    const stEl = $('chkLiveStatus');
    if (stEl) {
      if (answered === 0) {
        stEl.className = 'bdg b2';
        stEl.textContent = 'در انتظار ثبت پاسخ‌ها';
      } else if (nc > 0) {
        stEl.className = 'bdg b3';
        stEl.textContent = '⚠ ' + fa(nc) + ' مورد عدم انطباق';
      } else {
        stEl.className = 'bdg b1';
        stEl.textContent = '✓ انطباق کامل';
      }
    }
    const progFill = $('chkLiveProgFill');
    if (progFill) progFill.style.width = progressPct + '%';
  }
}

function drawChkFill(wardPref){
  const c = CHK.current;
  const d = c && c.due;
  const wards = CHK.hospitalWards || ['اورژانس', 'مراقبت‌های ویژه (ICU)', 'قلب (CCU)', 'اتاق عمل جنرال', 'جراحی عمومی', 'داخلی', 'اطفال', 'زنان و زایمان', 'دیالیز', 'نوزادان (NICU)', 'آزمایشگاه', 'تصویربرداری', 'داروخانه', 'استریلیزاسیون (CSR)', 'بهداشت محیط', 'لاندری (رختشویخانه)', 'تغذیه و آشپزخانه', 'تأسیسات و مهندسی پزشکی'];

  $('ptitle').textContent = 'ثبت ارزیابی میدانی — ' + c.title;

  let n = 0;
  const qRow = it => {
    n++;
    const opts = CL_OPTIONS[it.answer_type] || CL_OPTIONS.likert5;
    return `
    <tr id="ansrow_${it.id}">
      <td style="text-align:center;color:var(--td)">${fa(n)}</td>
      <td>
        <div style="color:var(--th);font-weight:600;line-height:1.7">${esc(it.question_text)}</div>
      </td>
      <td style="text-align:center">${it.weight ? fa(it.weight) : '۱'}</td>
      <td>
        <div class="mctl" style="justify-content:center">
          ${opts.map(([k,v]) => `
            <button type="button" class="tgl" data-v="${k}" onclick="setChkAnswer('${it.id}','${k}')">${v}</button>
          `).join('')}
        </div>
      </td>
      <td>
        <input class="sel" style="width:100%" id="ansnote_${it.id}" placeholder="توضیح یا مشاهده عینی (اختیاری)">
      </td>
    </tr>`;
  };

  $('content').innerHTML = `
  ${pathCards(c.section_id)}

  <div class="panel g">
    <div class="phd">
      <div class="abadge">✎</div>
      <div style="flex:1">
        <h3>ثبت ارزیابی: ${esc(c.title)}</h3>
        <div class="sub">
          کد: ${esc(c.checklist_code || 'بدون کد')} ·
          تناوب: ${CL_CADENCE_FA[c.cadence] || 'موردی'}
          ${d && d.period_start ? ` — دوره‌ی جاری: ${faDateISO(d.period_start)} تا ${faDateISO(d.period_end)}` : ''}
        </div>
      </div>
      <button class="btn btn-o btn-sm" onclick="openChecklist('${c.id}')">◂ بازگشت به هاب پایش</button>
    </div>
    <div class="pbody">

      <!-- نوار شناور و زنده نمره، پیشرفت و وضعیت عدم انطباق (Live Audit Scorebar) -->
      <div id="chkLiveScoreBar" style="position:sticky;top:10px;z-index:9;background:rgba(20,24,33,0.96);backdrop-filter:blur(8px);border:1px solid var(--gd);border-radius:10px;padding:12px 18px;margin-bottom:16px;box-shadow:0 6px 18px rgba(0,0,0,0.3)">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <span style="font-size:11.5px;color:var(--td)">پیشرفت ارزیابی:</span>
            <b id="chkLiveProgress" style="color:var(--gdl);margin-right:6px">۰ سؤال</b>
          </div>
          <div>
            <span style="font-size:11.5px;color:var(--td)">نمره زنده مکتسبه:</span>
            <b id="chkLiveScore" style="color:var(--th);margin-right:6px">۰</b>
          </div>
          <div>
            <span style="font-size:11.5px;color:var(--td);margin-left:6px">وضعیت انطباق:</span>
            <span id="chkLiveStatus" class="bdg b2">در انتظار ثبت پاسخ‌ها</span>
          </div>
        </div>
        <div style="background:rgba(255,255,255,0.08);height:5px;border-radius:3px;margin-top:10px;overflow:hidden">
          <div id="chkLiveProgFill" style="background:var(--gd);height:100%;width:0%;transition:width 0.25s ease"></div>
        </div>
      </div>

      <!-- انتخابگر ساخت‌یافته بخش‌های بیمارستان و موقعیت ارزیابی -->
      <div class="docsec" style="margin-bottom:16px">
        <div class="docsl" style="font-weight:700">مشخصات محل و مورد ارزیابی</div>
        <div class="docsv">
          <div class="docgrid">
            <div class="fg" style="margin:0">
              <label>بخش / واحد ارزیابی‌شونده *</label>
              <select id="sub_ward">
                <option value="">— انتخاب بخش بیمارستان —</option>
                ${wards.map(w => `<option value="${esc(w)}" ${wardPref === w ? 'selected' : ''}>${esc(w)}</option>`).join('')}
              </select>
            </div>
            <div class="fg" style="margin:0">
              <label>مورد ارزیابی (تخت / اتاق / نام پرونده یا پرسنل)</label>
              <input id="sub_detail" placeholder="مثال: تخت شماره ۴ یا شیفت عصر">
            </div>
          </div>
        </div>
      </div>

      ${c.baseline_info ? `<div class="dsec book"><div class="dl">◈ اطلاعات پایه‌ای و راهنما</div>
        <div style="font-size:12.5px;color:var(--tm)">${esc(c.baseline_info)}</div></div>` : ''}

      <!-- جدول‌بندی ساخت‌یافته سنجه‌های ارزیابی بر اساس حیطه‌ها -->
      ${chkAllGroups().map(g => `
        <div class="dsec" style="margin-top:16px">
          <div class="dl" style="color:var(--gdl);font-weight:700">◂ ${g.title ? esc(g.title) : 'سؤالات ارزیابی'}</div>
          <div class="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style="width:36px;text-align:center">#</th>
                  <th>شرح سنجه / سؤال ارزیابی</th>
                  <th style="width:50px;text-align:center">وزن</th>
                  <th style="width:280px;text-align:center">گزینه‌های ارزیابی</th>
                  <th style="width:200px">یادداشت و شواهد عینی</th>
                </tr>
              </thead>
              <tbody>
                ${g.items.map(qRow).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `).join('') || '<div class="empty">این چک‌لیست سؤالی ندارد</div>'}

      <div class="fg" style="margin-top:16px">
        <label>توضیح و جمع‌بندی کلی ارزیاب</label>
        <textarea id="sub_note" rows="2" placeholder="توضیحات کلی درباره وضعیت این بخش..."></textarea>
      </div>

      <div style="margin-top:14px;display:flex;gap:10px">
        <button class="btn btn-g" onclick="submitChecklistAnswers()">✓ ثبت نهایی پاسخ‌ها و نمره‌دهی</button>
        <button class="btn btn-o" onclick="openChecklist('${c.id}')">انصراف و بازگشت</button>
      </div>
    </div>
  </div>`;
  applyFieldGuides();
  chkCalcLiveAuditScore();
}

function setChkAnswer(itemId, val){
  CHK.answers[itemId] = val;
  const row = $('ansrow_' + itemId);
  if (row) {
    row.querySelectorAll('button.tgl').forEach(b => {
      const on = b.dataset.v === val;
      b.style.background = on ? 'rgba(212,175,90,.25)' : '';
      b.style.borderColor = on ? 'var(--gd)' : '';
      b.style.fontWeight = on ? '700' : '';
    });
  }
  chkCalcLiveAuditScore();
}

async function submitChecklistAnswers(){
  const ward = ($('sub_ward')?.value || '').trim();
  const detail = ($('sub_detail')?.value || '').trim();
  if (!ward && !detail) {
    return toast('لطفاً بخش ارزیابی‌شونده را انتخاب کنید', true);
  }
  const ref = ward ? (ward + (detail ? ' — ' + detail : '')) : detail;

  const answers = Object.entries(CHK.answers).map(([item_id, answer]) => ({
    item_id,
    answer,
    note: ($('ansnote_' + item_id)?.value || '').trim() || null
  }));

  if (!answers.length) {
    return toast('حداقل به یک سؤال پاسخ دهید', true);
  }

  try {
    const r = await API.submitChecklist(CHK.current.id, {
      reference: ref,
      note: ($('sub_note')?.value || '').trim(),
      answers
    });
    const pct = r.submission.max_score ? Math.round((r.submission.score / r.submission.max_score) * 100) : 0;
    toast('ارزیابی ثبت شد — امتیاز ' + fa(r.submission.score) + ' از ' + fa(r.submission.max_score) + ' (' + fa(pct) + '٪)');
    CHK.answers = {};
    openChecklist(CHK.current.id);
  } catch(e) {
    toast(e.message, true);
  }
}


function exportChecklistCsv(id){ window.open(API.checklistExportUrl(id), '_blank'); }

// ---- یافته‌های عدم انطباق و اقدام اصلاحی ----
// کتاب فقط پر شدن چک‌لیست را نمی‌خواهد، اصلاحِ یافته‌ها را می‌خواهد:
// «چک لیستی … و بررسی دوره‌ای آن … انجام و موارد عدم انطباق اصلاح شود» (الف-۲-۲-۵).
// تا پیش از این، پاسخِ «خیر»/«کم» فقط یک عدد در امتیاز بود و هیچ‌جا پیگیری نمی‌شد.
const CL_TASK_ST_FA={assigned:'محول‌شده', in_progress:'در حال انجام', completed:'انجام‌شده', overdue:'معوق'};
const CL_TASK_ST_BDG={assigned:'b2', in_progress:'b2', completed:'b1', overdue:'b3'};

function chkNcPanel(s){
  const nc=(s.answers||[]).filter(a=>a.is_nonconformity);
  const acts=s.corrective_actions||[];
  if(!nc.length && !acts.length){
    return `<div class="docsec" style="margin-top:12px"><div class="docsl">یافته‌های عدم انطباق</div>
      <div class="docsv"><span class="bdg b1">موردی یافت نشد</span>
      <span style="font-size:11.5px;color:var(--td);margin-right:8px">همه‌ی پاسخ‌ها در محدوده‌ی قابل‌قبول‌اند.</span></div></div>`;
  }
  const labelOf=(t,v)=>((CL_OPTIONS[t]||CL_OPTIONS.likert5).find(o=>o[0]===v)||[,v])[1];
  return `<div class="docsec ncsec" style="margin-top:12px">
    <div class="docsl">یافته‌های عدم انطباق ${nc.length?`<span class="bdg b3">${fa(nc.length)} مورد</span>`:''}</div>
    <div class="docsv">
      ${nc.length?`<ul class="nclist">${nc.map(a=>
        `<li><b>${esc(a.question_text||'—')}</b>
          <span class="bdg b3">${esc(labelOf(a.answer_type,a.answer))}</span>
          ${a.note?`<i>${esc(a.note)}</i>`:''}</li>`).join('')}</ul>`:''}

      ${acts.length?`<div style="margin-top:12px">
        <div style="font-size:11.5px;color:var(--gdl);font-weight:700;margin-bottom:6px">اقدامات اصلاحی ثبت‌شده</div>
        <div class="tbl-wrap"><table><thead><tr><th>عنوان</th><th>مسئول پیگیری</th><th>مهلت</th><th>وضعیت</th></tr></thead>
        <tbody>${acts.map(t=>`<tr><td style="color:var(--th)">${esc(t.title)}</td>
          <td>${esc(t.assigned_to_name||'—')}</td><td style="white-space:nowrap">${t.due_date?faDateISO(t.due_date):'—'}</td>
          <td><span class="bdg ${CL_TASK_ST_BDG[t.status]||'b2'}">${CL_TASK_ST_FA[t.status]||t.status}</span></td>
        </tr>`).join('')}</tbody></table></div></div>`
      :(nc.length?`<div class="rg-warn noprint" style="margin-top:10px">برای این یافته‌ها هنوز اقدام اصلاحی ثبت نشده است. کتاب اصلاحِ موارد عدم انطباق را الزامی می‌داند — بدون آن، پایشِ انجام‌شده ناقص شمرده می‌شود.</div>`:'')}

      ${nc.length&&!canAssignTasks()?`<div class="noprint" style="margin-top:10px;font-size:11.5px;color:var(--td);line-height:1.95">
        ثبت اقدام اصلاحی یعنی محول کردن وظیفه به یک نفر، و این کار در دسترس مدیرانِ چک‌لیست
        (مدیر داخلی و مدیر بهبود کیفیت) و سمت‌های دارای اختیار ارجاع وظیفه است. یافته‌های بالا را به یکی از
        این سمت‌ها اطلاع دهید تا پیگیری ثبت شود.</div>`:''}

      ${nc.length&&canAssignTasks()?`<div class="noprint" style="margin-top:12px">
        <button class="btn btn-o btn-sm" onclick="toggleChkCa()">+ ثبت اقدام اصلاحی</button>
        <div id="chkCaForm" class="hide" style="margin-top:10px">
          <div class="docgrid">
            <div class="fg" style="grid-column:span 2"><label>عنوان اقدام اصلاحی *</label>
              <input id="ca_title" placeholder="مثال: تعویض باتری شماره ۳ ژنراتور"></div>
            <div class="fg"><label>مسئول پیگیری *</label>
              <select id="ca_user"><option value="">— انتخاب کنید —</option>
                ${(CHK.colleagues||[]).map(u=>`<option value="${u.id}">${esc(u.full_name)}${u.department?' — '+esc(u.department):''}</option>`).join('')}
              </select></div>
            <div class="fg fg-date"><label>مهلت انجام</label>${jalaliDateInputHtml('ca_due',{allowEmpty:true})}</div>
          </div>
          <div class="fg"><label>شرح اقدام</label>
            <textarea id="ca_desc" rows="2" placeholder="چه کاری باید انجام شود؟"></textarea></div>
          <button class="btn btn-g btn-sm" onclick="saveChkCorrectiveAction('${s.id}')">ثبت اقدام اصلاحی</button>
        </div></div>`:''}
    </div></div>`;
}
function toggleChkCa(){ const e=$('chkCaForm'); if(e) e.classList.toggle('hide'); }
async function saveChkCorrectiveAction(sid){
  const title=($('ca_title')?.value||'').trim();
  const assigned_to=$('ca_user')?.value||'';
  if(!title) return toast('عنوان اقدام اصلاحی را بنویسید', true);
  if(!assigned_to) return toast('مسئول پیگیری را انتخاب کنید', true);
  try{
    await API.checklistCorrectiveAction(sid, { title, assigned_to,
      due_date:readJalaliDateInputOpt('ca_due')||null, description:($('ca_desc')?.value||'').trim()||null });
    toast('اقدام اصلاحی ثبت شد و به کارتابل مسئول رفت');
    loadChkSubmission(sid);
  }catch(e){ toast(e.message, true); }
}

function openChkSubmission(sid){ CHK.view='sub'; CHK.subId=sid; loadChkSubmission(sid); }
async function loadChkSubmission(sid){
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    // فهرست همکاران برای انتخابگرِ «مسئول پیگیریِ» اقدام اصلاحی. فقط وقتی لازم است که
    // کاربر اجازه‌ی ارجاع وظیفه دارد — برای بقیه یک درخواست بی‌مصرف است.
    if(canAssignTasks()) await loadChkColleagues();
    const {submission:s, checklist}=await API.checklistSubmission(sid);
    const labelOf=(t,v)=>((CL_OPTIONS[t]||CL_OPTIONS.likert5).find(o=>o[0]===v)||[,v])[1];
    $('ptitle').textContent='پاسخ‌نامه — '+(checklist?checklist.title:'');
    const code=(checklist&&checklist.checklist_code)||'بدون کد';
    const pct=s.max_score?Math.round((s.score/s.max_score)*100):null;
    // سربرگ در thead و پانویس در tfoot می‌نشینند تا مرورگر روی «هر» صفحه‌ی کاغذ
    // تکرارشان کند — همان الگوی مدارک کنترل‌شده (توضیح کامل بالای printSheet).
    $('content').innerHTML=`
    <div class="panel g docprint">
      <div class="phd noprint"><div class="abadge">▤</div>
        <div style="flex:1"><h3>${esc(s.reference||'پاسخ‌نامه')}</h3>
        <div class="sub">${esc(checklist?checklist.title:'')} · امتیاز ${fa(s.score||0)} از ${fa(s.max_score||0)}</div></div>
        <button class="btn btn-o btn-sm" onclick="openChecklist('${s.checklist_id}')">◂ بازگشت به چک‌لیست</button>
        <button class="btn btn-g btn-sm" onclick="dpPrint()">${ic('print')} چاپ برگه</button>
      </div>
      <div class="pbody">
        ${exBanner(s)}
        <table class="psheet">
        <thead><tr><td>${docLetterhead(`پاسخ‌نامه چک‌لیست — ${esc(code)}`)}</td></tr></thead>
        <tfoot><tr><td><div class="psheet-foot">
          <span>${esc((S.user&&S.user.hospital_name)||'')}</span>
          <span>${esc(code)} · ${esc(checklist?checklist.title:'')}</span>
        </div></td></tr></tfoot>
        <tbody><tr><td>
          <h3 style="margin:0 0 4px">${esc(checklist?checklist.title:'پاسخ‌نامه')}</h3>
          <div style="font-size:12px;color:var(--td);margin-bottom:12px">${esc(checklist&&checklist.purpose?checklist.purpose:'')}</div>

          <div class="doc-dates">
            <div><span>تکمیل‌کننده</span><b>${esc(s.submitted_by_name||'—')}</b></div>
            <div><span>سمت</span><b>${esc(s.submitted_by_role||'—')}</b></div>
            <div><span>مورد بررسی / محل</span><b>${esc(s.reference||'—')}</b></div>
            <div><span>تاریخ و ساعت تکمیل</span><b>${faDateTime(s.submitted_at)}</b></div>
          </div>
          <div class="doc-dates" style="margin-top:8px">
            <div><span>کد چک‌لیست</span><b>${esc(code)}</b></div>
            <div><span>نسخه</span><b>${fa((checklist&&checklist.version_no)||1)}</b></div>
            <div><span>تناوب پایش</span><b>${CL_CADENCE_SHORT[checklist&&checklist.cadence]||'موردی'}</b></div>
            <div><span>امتیاز</span><b>${fa(s.score||0)} از ${fa(s.max_score||0)}${pct!=null?` (${fa(pct)}٪)`:''}</b></div>
          </div>
          ${checklist&&checklist.parent_document?`<div style="margin-top:8px;font-size:11px;color:var(--td)">
            ذیل سند مادر: <b style="color:var(--gdl)">${esc((checklist.parent_document.doc_code?checklist.parent_document.doc_code+' — ':'')+checklist.parent_document.title)}</b></div>`:''}

          ${s.note?`<div class="docsec" style="margin-top:12px"><div class="docsl">توضیح کلی</div><div class="docsv">${esc(s.note)}</div></div>`:''}

          ${chkNcPanel(s)}

          <div class="tbl-wrap" style="margin-top:12px"><table>
            <thead><tr><th>#</th><th>حیطه</th><th>سؤال</th><th>پاسخ</th><th>توضیح</th></tr></thead>
            <tbody>${s.answers.map((a,i)=>`<tr${a.is_nonconformity?' class="ncrow"':''}><td>${fa(i+1)}</td><td>${esc(a.domain_title||'—')}</td>
              <td style="color:var(--th)">${esc(a.question_text||'—')}</td>
              <td><span class="bdg ${a.is_nonconformity?'b3':'b1'}">${esc(labelOf(a.answer_type,a.answer))}</span></td>
              <td>${esc(a.note||'—')}</td></tr>`).join('')}</tbody></table></div>

          <div class="chksign">
            <div><span>نام و امضای تکمیل‌کننده</span><i></i></div>
            <div><span>نام و امضای تأییدکننده / مسئول واحد</span><i></i></div>
          </div>
        </td></tr></tbody></table>

        <div class="docsec noprint" style="margin-top:16px">
          <div class="docsl">مدارک و شواهد این پایش</div>
          <div class="docsv" style="font-size:11.5px;color:var(--td);line-height:1.95;margin-bottom:8px">
            عکس، برگه‌ی آزمایش، تأییدیه‌ی تعمیر و هر مدرکی که این پایش را مستند می‌کند.
            بدون فایل، این پاسخ‌نامه در روز ارزیابی «خوداظهاری بدون شاهد» شمرده می‌شود.</div>
          ${evidenceBox('checklist_submission', s.id, canSubmitChecklists())}
        </div>
      </div>
    </div>`;
    loadAllEvidence();
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}

// ==================== برگه‌ی چاپیِ فهرست ====================
// بازبینیِ سراسری نشان داد شش ماژول (برنامه‌های بهبود، ممیزی داخلی، خطاها، FMEA،
// آموزش و کارت امتیازی) مدل داده‌ی کاملی دارند ولی هیچ خروجی کاغذی ندارند — در
// حالی که ارزیاب سرِ میز کاغذ می‌خواهد، نه اسکرول کردنِ صفحه. ساختنِ برگه‌ی
// جداگانه برای هر کدام یعنی شش‌بار تکرارِ همان سربرگ/پانویس/شناسنامه؛ پس یک
// سازنده‌ی مشترک نوشته شد و هر ماژول فقط ستون‌ها و سطرهایش را می‌دهد.
//
// چرا «فهرست» و نه «برگه‌ی تک‌رکورد»: خواسته‌ی کتاب در این شش ماژول گزارشِ دوره‌ای
// است، نه فرمِ تکی — «تهیه گزارشات تحلیلی حاصل از نتایج پایش و ارائه به تیم
// رهبری» (الف-۱-۱۰-۲). فیلترهای فعالِ صفحه هم روی برگه نوشته می‌شوند، وگرنه
// معلوم نیست این فهرست از کجا آمده و کدام بازه را پوشش می‌دهد.
let PRINTV=null;   // {back:'programs'} — برای بازگشت به همان صفحه
// گزارشِ ۱۱ ستونی روی A4 عمودی از کاغذ بیرون می‌زند — در رندر واقعی دیده شد که
// دو ستون آخر (وضعیت و تأییدکننده) بریده می‌شدند. `overflow-x:auto` فقط روی
// صفحه‌ی نمایش کار می‌کند و روی کاغذ هیچ کاری نمی‌کند. راه‌حل همان کاری است که
// هر کسی در اکسل می‌کند: کاغذ افقی. `@page` را نمی‌شود به یک عنصر محدود کرد، پس
// همان لحظه‌ای که برگه‌ی پهن ساخته می‌شود یک استایل تزریق و موقع خروج برداشته
// می‌شود — بدون این، بقیه‌ی چاپ‌های سامانه هم افقی می‌شدند.
function setLandscape(on){
  const id='plLandscape';
  const cur=document.getElementById(id);
  if(!on){ if(cur) cur.remove(); return; }
  if(cur) return;
  const st=document.createElement('style');
  // حاشیه صفر، به همان دلیلِ @page اصلی: هر حاشیه‌ای که به مرورگر بدهیم، عنوانِ
  // صفحه و تاریخ/ساعت را داخلش چاپ می‌کند. حاشیه‌ی واقعی را برگه خودش می‌گذارد.
  st.id=id; st.textContent='@media print{@page{size:A4 landscape;margin:0}}';
  document.head.appendChild(st);
}
/* برگه‌ی رسمی هنگام چاپ از دلِ پوسته‌ی اپ بیرون کشیده می‌شود.
   ---------------------------------------------------------------------------
   کارفرما گزارش داد صفحه‌ی اولِ چاپ سفید درمی‌آید. با رندر واقعیِ PDF بازتولید و
   با حذفِ تک‌تکِ قاعده‌ها ریشه‌یابی شد: هیچ‌کدام از حاشیه‌ها و padding‌ها مقصر
   نبودند — تنها آزمایشی که صفحه‌ی اول را از «صفر نویسه» درآورد، بلوکی‌کردنِ
   پوسته بود. یعنی علت این است که برگه یک flex item است، و کروم یک flex item را
   وسطِ خودش نمی‌شکند؛ وقتی برگه بلندتر از یک صفحه باشد، کل آن را به صفحه‌ی بعد
   هل می‌دهد و صفحه‌ی اول خالی می‌ماند.

   همان درمانی که برای برنامه‌ی شیفت جواب داد این‌جا هم به‌کار می‌رود و به‌جای
   جنگیدن با ارث‌بریِ CSS، ریشه‌ی مشکل را برمی‌دارد: برگه مستقیم زیر <body>
   می‌رود و #root پنهان می‌شود. با این کار هیچ ظرفِ میانی‌ای — نه flex، نه
   position، نه عرضِ پنجره — روی صفحه‌بندی اثر ندارد.

   خروج هم روی afterprint بسته می‌شود، وگرنه بعد از بستنِ پنجره‌ی چاپ کاربر یک
   صفحه‌ی خالی می‌دید. beforeprint هم گوش داده می‌شود تا Ctrl+P هم همین مسیر را
   برود، نه فقط دکمه‌ی چاپِ خودمان. */
let DP_MOVED = null, DP_MARK = null;
function dpEnter(){
  if(DP_MOVED) return;
  if(document.body.classList.contains('ss-printing')||document.body.classList.contains('fc-printing')) return;
  const el=document.querySelector('#content .docprint');
  if(!el||el.parentNode===document.body) return;
  DP_MARK=document.createComment('docprint');
  el.parentNode.insertBefore(DP_MARK,el);
  document.body.appendChild(el);
  DP_MOVED=el;
  document.body.classList.add('dp-printing');
}
function dpExit(){
  if(!DP_MOVED) return;
  if(DP_MARK&&DP_MARK.parentNode) DP_MARK.parentNode.insertBefore(DP_MOVED,DP_MARK);
  if(DP_MARK) DP_MARK.remove();
  DP_MOVED=null; DP_MARK=null;
  document.body.classList.remove('dp-printing');
}
function dpPrint(){ dpEnter(); window.print(); setTimeout(dpExit,400); }
window.addEventListener('beforeprint',dpEnter);
window.addEventListener('afterprint',dpExit);

function printListSheet({page, title, code, intro, meta, headers, rows, foot}){
  PRINTV={page};
  // آستانه‌ی ۸ ستون تجربی است: تا هفت ستون روی A4 عمودی خوانا می‌ماند
  const wide=headers.length>=8;
  setLandscape(wide);
  $('ptitle').textContent=title;
  $('content').innerHTML=`
  <div class="panel g docprint${wide?' pl-wide':''}">
    <div class="phd noprint"><div class="abadge">▤</div>
      <div style="flex:1"><h3>${esc(title)}</h3><div class="sub">${fa(rows.length)} ردیف — آماده‌ی چاپ</div></div>
      <button class="btn btn-o btn-sm" onclick="go('${page}')">◂ بازگشت</button>
      <button class="btn btn-g btn-sm" onclick="dpPrint()">${ic('print')} چاپ</button>
    </div>
    <div class="pbody">
      <table class="psheet">
      <thead><tr><td>${docLetterhead(`${esc(title)} — ${esc(code)}`)}</td></tr></thead>
      <tfoot><tr><td><div class="psheet-foot">
        <span>${esc((S.user&&S.user.hospital_name)||'')}</span>
        <span>${esc(code)} · ${esc(foot||title)}</span>
      </div></td></tr></tfoot>
      <tbody><tr><td>
        <h3 style="margin:0 0 4px">${esc(title)}</h3>
        ${intro?`<div class="psheet-intro">${esc(intro)}</div>`:''}
        <div class="doc-dates">
          <div><span>تاریخ تهیه گزارش</span><b>${faDateISO(todayISO())}</b></div>
          <div><span>تهیه‌کننده</span><b>${esc((S.user&&S.user.full_name)||'—')}</b></div>
          <div><span>سال کاری</span><b>${fa(S.year)}</b></div>
          <div><span>تعداد ردیف</span><b>${fa(rows.length)}</b></div>
        </div>
        ${meta&&meta.length?`<div class="doc-dates" style="margin-top:8px">
          ${meta.map(([l,v])=>`<div><span>${esc(l)}</span><b>${esc(fa(v))}</b></div>`).join('')}</div>`:''}
        ${!rows.length?'<div class="empty">ردیفی برای چاپ نیست</div>':`
        <div class="tbl-wrap" style="margin-top:12px"><table>
          <thead><tr><th>#</th>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead>
          <tbody>${rows.map((r,i)=>`<tr><td>${fa(i+1)}</td>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>`}
        <div class="chksign">
          <div><span>نام و امضای تهیه‌کننده</span><i></i></div>
          <div><span>نام و امضای تأییدکننده</span><i></i></div>
        </div>
      </td></tr></tbody></table>
    </div>
  </div>`;
}
// فیلترهای فعالِ صفحه، برای نوشتن روی برگه. فیلترِ خالی روی کاغذ نمی‌آید.
function activeFilters(filters, labels){
  return Object.entries(filters||{}).filter(([k,v])=>v&&labels[k]).map(([k,v])=>[labels[k], String(v)]);
}

function printPrograms(){
  printListSheet({
    page:'programs', title:'گزارش برنامه‌های بهبود، عملیاتی و استراتژیک', code:'RPT-PRG',
    intro:'فهرست برنامه‌های ثبت‌شده با پیشنهاددهنده، درصد پیشرفت، مهلت و وضعیت تأیید.',
    meta:activeFilters(PRG.filters,{type:'نوع برنامه',status:'وضعیت',department:'بخش/واحد',q:'جست‌وجو'}),
    headers:['عنوان برنامه','نوع','بخش/واحد','پیشنهاددهنده','هدف استراتژیک','شروع','مهلت','پیشرفت','وضعیت','تأییدکننده'],
    rows:PRG.list.map(p=>[esc(p.title), esc(p.program_type||'—'), esc(p.department||'—'),
      esc(p.proposed_by_name||'—'), esc(p.strategic_goal||'—'),
      p.start_date?faDateISO(p.start_date):'—', p.due_date?faDateISO(p.due_date):'—',
      fa(p.progress_percent||0)+'٪', PROG_STATUS_FA[p.status]||esc(p.status||'—'),
      esc(p.approved_by_name||'—')]),
    foot:'برنامه‌های بهبود',
  });
}
function printAudits(){
  printListSheet({
    page:'audits', title:'گزارش ممیزی‌های داخلی', code:'RPT-AUD',
    intro:'فهرست ممیزی‌های داخلی با بخش ممیزی‌شده، تاریخ، نتیجه و وضعیت پیگیری.',
    meta:activeFilters(AUD.filters,{status:'وضعیت',department:'بخش ممیزی‌شده',q:'جست‌وجو'}),
    headers:['عنوان ممیزی','بخش ممیزی‌شده','تاریخ','نتیجه','وضعیت'],
    rows:AUD.list.map(a=>[esc(a.title), esc(a.audited_department||'—'),
      a.audit_date?faDateISO(a.audit_date):'—',
      String(audScore(a)).replace(/<[^>]*>/g,''), AUD_STATUS_FA[a.status]||esc(a.status||'—')]),
    foot:'ممیزی داخلی',
  });
}
function printErrors(){
  printListSheet({
    page:'errors', title:'گزارش خطاها و وقایع ناخواسته', code:'RPT-ERR',
    intro:'فهرست خطاهای گزارش‌شده با کد رهگیری، بخش، شدت و وضعیت بررسی. هویت گزارش‌دهنده روی این برگه نمی‌آید.',
    meta:activeFilters(MER.filters,{evaluation_status:'وضعیت بررسی'}),
    headers:['کد رهگیری','شرح خطا','بخش','شدت','وضعیت بررسی','تاریخ ثبت'],
    rows:MER.list.map(r=>[esc(r.tracking_code||'—'), esc(r.description||'—'),
      esc(r.error_ward||'—'), esc(r.severity||'—'), esc(r.evaluation_status||'—'),
      r.created_at?faDateISO(r.created_at):'—']),
    foot:'خطاها و وقایع',
  });
}
function printFmea(){
  printListSheet({
    page:'fmea', title:'گزارش عوامل تهدیدکننده ایمنی بیمار (FMEA)', code:'RPT-FMEA',
    intro:'تحلیل ریسکِ پیش‌نگر — خطر بالقوه، نه رخداد واقع‌شده.',
    meta:activeFilters(FME.filters,{status:'وضعیت',q:'جست‌وجو'}),
    headers:['موضوع','واحد گزارش‌دهنده','حیطه خطر','دسته‌بندی','منبع ثبت','وضعیت'],
    rows:FME.list.map(r=>[esc(r.subject), esc(r.reporting_department||'—'),
      esc(r.related_hazard_area||'—'), esc(r.hazard_type||'—'),
      r.source==='public'?'فرم عمومی':'داخلی', FMEA_ST_FA[r.status]||esc(r.status||'—')]),
    foot:'FMEA',
  });
}
function printTraining(){
  printListSheet({
    page:'training', title:'گزارش نیازسنجی آموزشی کارکنان', code:'RPT-TRN',
    intro:'فهرست نیازهای آموزشی ثبت‌شده با نظر مافوق و تصمیم سازمان.',
    meta:activeFilters(TRN.filters,{status:'وضعیت',department:'بخش/واحد',q:'جست‌وجو'}),
    headers:['عنوان نیاز آموزشی','نوع','بخش/واحد','سال','درخواست‌دهنده','مافوق','وضعیت'],
    rows:TRN.list.map(n=>[esc(n.title), esc(n.requested_course_type||'—'),
      esc(n.department||'—'), fa(n.year||'—'), esc(n.employee_name||'—'),
      esc(n.superior_name||'تعیین‌نشده'), TRN_STATUS_FA[n.status]||esc(n.status||'—')]),
    foot:'نیازسنجی آموزشی',
  });
}
// کارت امتیازی درختِ «وجه ← شاخص ← دوازده ماه» است، نه فهرستِ ساده. ستون‌های
// ماهانه روی کاغذ می‌مانند چون همان چیزی‌اند که تیم رهبری در جلسه نگاه می‌کند؛
// وجه به‌جای سرستونِ جداگانه، ستونِ اول هر سطر می‌شود تا یک جدول بماند و روی A4
// نشکند.
function printBsc(){
  const d=BSC.data;
  if(!d){ toast('اول کارت امتیازی را باز کنید',true); return; }
  const months=d.months_fa||[];
  const rows=[];
  for(const p of (d.perspectives||[])){
    for(const i of (p.indicators||[])){
      rows.push([esc(p.perspective), esc(i.title), esc(i.unit||'—'),
        i.target===null?'—':fa(i.target),
        ...months.map((m,mi)=>{ const v=(i.months||[])[mi]; return v==null?'—':fa(v); }),
        i.average==null?'—':fa(i.average),
        i.higher_is_better?'بیشتر بهتر':'کمتر بهتر']);
    }
  }
  printListSheet({
    page:'bsc', title:`گزارش کارت امتیازی متوازن — سال ${fa(d.year||BSC.year||S.year)}`, code:'RPT-BSC',
    intro:'شاخص‌های کارت امتیازی متوازن به تفکیک وجه، با تارگت، مقدار هر ماه و میانگین سال.',
    meta:[['سال گزارش', String(d.year||BSC.year||S.year)],
          ['تعداد وجه', String((d.perspectives||[]).length)],
          ['تعداد شاخص', String(rows.length)]],
    headers:['وجه','عنوان شاخص','واحد','تارگت', ...months, 'میانگین','جهت مطلوب'],
    rows, foot:'کارت امتیازی متوازن',
  });
}

function printWalkarounds(){
  const s=WA.sum||{}, t=s.totals||{};
  printListSheet({
    page:'walkarounds', title:'گزارش بازدیدهای میدانی مدیریتی', code:'RPT-WLK',
    intro:'فهرست بازدیدهای میدانی با بخش بازدیدشده، بازدیدکننده، و درصد اجرای مصوبه‌های هر بازدید.',
    meta:[...activeFilters(WA.filters,{status:'وضعیت بازدید',department:'بخش بازدیدشده',q:'جست‌وجو'}),
      ['کل مصوبه‌ها', String(t.total||0)],
      ['درصد اجرای مصوبه‌ها', (t.completion_pct||0)+'٪'],
      ['معوق', String(t.overdue||0)]],
    headers:['عنوان بازدید','بخش بازدیدشده','تاریخ','بازدیدکننده','حاضران','مصوبه‌ها','اجراشده','درصد اجرا','وضعیت'],
    rows:WA.list.map(w=>{
      const pct=w.resolution_count?Math.round(w.resolution_done_count/w.resolution_count*100):0;
      return [esc(w.title), esc(w.department||'—'),
        w.visit_date?faDateISO(w.visit_date):'—', esc(w.conducted_by_name||'—'),
        esc(safeList(w.attendees).join('، ')||'—'),
        fa(w.resolution_count||0), fa(w.resolution_done_count||0),
        w.resolution_count?fa(pct)+'٪':'—',
        WA_STATUS_FA[w.status]||esc(w.status||'—')];
    }),
    foot:'بازدید میدانی',
  });
}


// چاپ برگه‌ی خام ارزیابی میدانی — برای ارزیابی کاغذی در بخش‌ها و روز اعتباربخشی
async function printBlankChecklist(id){
  try {
    let c = CHK.current && CHK.current.id === id ? CHK.current : null;
    if (!c || !CHK.domains || !CHK.items) {
      const r = await API.checklist(id);
      c = r.checklist;
      CHK.current = c;
      CHK.domains = (r.domains || []).map(d => ({ id: d.id, title: d.title, items: d.items || [] }));
      CHK.items = r.items || [];
    }
    const code = c.checklist_code || 'بدون کد';
    const groups = typeof chkAllGroups === 'function' ? chkAllGroups() : (CHK.domains || []).map(d => ({ title: d.title, items: d.items || [] }));
    if (CHK.items && CHK.items.length && typeof chkAllGroups !== 'function') {
      groups.push({ title: null, items: CHK.items });
    }
    const pd = c.parent_document;

    $('ptitle').textContent = 'برگه خام ارزیابی — ' + c.title;
    $('content').innerHTML = `
    <div class="panel g docprint">
      <div class="phd noprint"><div class="abadge">✓</div>
        <div style="flex:1"><h3>برگه خام ارزیابی میدانی: ${esc(c.title)}</h3>
        <div class="sub">${esc(code)} · آماده چاپ جهت تکمیل دستی و ارزیابی میدانی</div></div>
        <button class="btn btn-o btn-sm" onclick="openChecklist('${c.id}')">◂ بازگشت</button>
        <button class="btn btn-g btn-sm" onclick="dpPrint()">${ic('print')} چاپ برگه خام</button>
      </div>
      <div class="pbody">
        <table class="psheet">
        <thead><tr><td>${docLetterhead(`برگه ارزیابی میدانی (خام) — ${esc(code)}`)}</td></tr></thead>
        <tfoot><tr><td><div class="psheet-foot">
          <span>${esc((S.user && S.user.hospital_name) || '')}</span>
          <span>${esc(code)} · ${esc(c.title)}</span>
        </div></td></tr></tfoot>
        <tbody><tr><td>
          <h3 style="margin:0 0 6px;text-align:center">${esc(c.title)}</h3>
          ${c.purpose ? `<div style="font-size:12px;color:var(--td);margin-bottom:12px;text-align:center">${esc(c.purpose)}</div>` : ''}

          <!-- شناسنامه و کنترل سند -->
          <div class="doc-dates" style="margin-bottom:10px">
            <div><span>کد چک‌لیست</span><b>${esc(code)}</b></div>
            <div><span>نسخه سند</span><b>${fa(c.version_no || 1)}</b></div>
            <div><span>تناوب پایش</span><b>${CL_CADENCE_SHORT[c.cadence] || 'موردی'}</b></div>
            <div><span>سند مادر</span><b>${pd ? esc((pd.doc_code ? pd.doc_code + ' — ' : '') + pd.title) : 'ثبت نشده'}</b></div>
          </div>

          <!-- کادر مشخصات ارزیابی میدانی -->
          <div style="border:1px solid var(--bdr);border-radius:6px;padding:10px 14px;margin-bottom:14px;background:rgba(255,255,255,0.02)">
            <div style="font-weight:700;font-size:12px;color:var(--gdl);margin-bottom:8px">مشخصات ارزیابی میدانی:</div>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;font-size:12px">
              <div>تاریخ ارزیابی: <span style="display:inline-block;border-bottom:1px dotted var(--td);width:160px">&nbsp;</span></div>
              <div>بخش / واحد ارزیابی‌شونده: <span style="display:inline-block;border-bottom:1px dotted var(--td);width:160px">&nbsp;</span></div>
              <div>نام و سمت ارزیاب: <span style="display:inline-block;border-bottom:1px dotted var(--td);width:160px">&nbsp;</span></div>
              <div>مورد بررسی (بیمار / تجهیز / شیفت): <span style="display:inline-block;border-bottom:1px dotted var(--td);width:160px">&nbsp;</span></div>
            </div>
          </div>

          ${c.baseline_info ? `
          <div style="border:1px dashed var(--bdr);border-radius:6px;padding:8px 12px;margin-bottom:14px;font-size:11.5px;color:var(--td)">
            <b style="color:var(--th)">اطلاعات پایه‌ای و راهنما:</b> ${esc(c.baseline_info)}
          </div>` : ''}

          <!-- جدول سوالات با چک‌باکس‌های چاپی -->
          ${groups.map(g => `
            <div style="margin-top:14px">
              <div style="font-weight:700;font-size:12.5px;color:var(--gdl);margin-bottom:6px;padding-right:4px;border-right:3px solid var(--gd)">
                ${g.title ? esc(g.title) : 'سؤالات ارزیابی'}
              </div>
              <div class="tbl-wrap">
                <table style="width:100%;border-collapse:collapse;font-size:11.5px">
                  <thead>
                    <tr style="background:rgba(212,175,90,0.08)">
                      <th style="width:36px;text-align:center">#</th>
                      <th>شرح سنجه / سؤال ارزیابی</th>
                      <th style="width:45px;text-align:center">وزن</th>
                      <th style="width:190px;text-align:center">گزینه‌های ارزیابی میدانی</th>
                      <th style="width:140px;text-align:center">شواهد و توضیحات</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${g.items.map((it, idx) => `
                      <tr>
                        <td style="text-align:center">${fa(idx + 1)}</td>
                        <td style="color:var(--th);font-weight:500;line-height:1.7">${esc(it.question_text)}</td>
                        <td style="text-align:center">${it.weight ? fa(it.weight) : '۱'}</td>
                        <td style="text-align:center;white-space:nowrap;font-size:11px">
                          ${it.answer_type === 'yes_no' ? `
                            <span style="display:inline-block;margin:0 4px">☐ بله</span>
                            <span style="display:inline-block;margin:0 4px">☐ خیر</span>
                            <span style="display:inline-block;margin:0 4px">☐ ندارد</span>
                          ` : `
                            <span style="display:inline-block;margin:0 2px">☐ عالی</span>
                            <span style="display:inline-block;margin:0 2px">☐ خوب</span>
                            <span style="display:inline-block;margin:0 2px">☐ متوسط</span>
                            <span style="display:inline-block;margin:0 2px">☐ کم</span>
                            <span style="display:inline-block;margin:0 2px">☐ خالی</span>
                          `}
                        </td>
                        <td style="border-bottom:1px dotted var(--bdr)">&nbsp;</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `).join('')}

          <!-- خلاصه ارزیابی و امضاها -->
          <div style="border:1px solid var(--bdr);border-radius:6px;padding:10px 14px;margin-top:16px;background:rgba(255,255,255,0.02)">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px">
              <div>جمع امتیاز مکتسبه: <span style="display:inline-block;border-bottom:1px dotted var(--td);width:80px">&nbsp;</span> از <span style="display:inline-block;border-bottom:1px dotted var(--td);width:80px">&nbsp;</span> ( _____ ٪)</div>
              <div>نتیجه کلی پایش: <span style="margin-right:10px">☐ انطباق کامل</span> <span style="margin-right:10px">☐ عدم انطباق نیازمند CAPA</span></div>
            </div>
          </div>

          <div class="chksign" style="margin-top:20px">
            <div><span>نام و امضای ارزیاب</span><i></i></div>
            <div><span>نام و امضای سرپرستار / مسئول بخش</span><i></i></div>
            <div><span>تأییدیه دفتر بهبود کیفیت و ایمنی</span><i></i></div>
          </div>
        </td></tr></tbody>
        </table>
      </div>
    </div>`;
  } catch(e) {
    toast('خطا در آماده‌سازی برگه خام: ' + e.message, true);
  }
}

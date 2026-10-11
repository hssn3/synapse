/**
 * Upgrade Frontend Checklist Audit Hub and Live Audit Form
 * Preserves UTF-8 cleanly without Windows CLI codepage issues.
 */
const fs = require('fs');
const path = require('path');

// ==========================================
// 1. UPGRADE public/js/views/quality/checklists-bank.js
// ==========================================
const bankPath = path.join(__dirname, '../public/js/views/quality/checklists-bank.js');
let bankContent = fs.readFileSync(bankPath, 'utf8');

// Replace table action buttons to make "مشاهده و پایش" primary
const oldBtnRegex = /<td style="white-space:nowrap">\s*\$\{canSubmitChecklists\(\)\s*\?`<button class="tgl prim" onclick="fillChecklist\('\$\{c\.id\}'\)">تکمیل<\/button>`\s*:`<button class="tgl prim" onclick="openChecklist\('\$\{c\.id\}'\)">مشاهده<\/button>`\}\s*\$\{drowBtn\(did\)\}\s*<\/td>/;

const newBtnCode = `<td style="white-space:nowrap">
            <button class="tgl prim" onclick="openChecklist('\${c.id}')">مشاهده و پایش</button>
            \${canSubmitChecklists()?\`<button class="tgl" onclick="fillChecklist('\${c.id}')">✎ ثبت ارزیابی</button>\`:''}
            \${drowBtn(did)}
          </td>`;

if (oldBtnRegex.test(bankContent)) {
  bankContent = bankContent.replace(oldBtnRegex, newBtnCode);
  console.log('✓ Updated bank table action buttons to prioritize Checklist Hub');
}

// Make checklist title clickable
const oldTitleRegex = /<td style="color:var\(--th\)">\$\{esc\(c\.title\)\}\$\{exBdg\(c\)\}/;
const newTitleCode = `<td style="color:var(--th);cursor:pointer" onclick="openChecklist('\${c.id}')"><span style="font-weight:700;color:var(--gdl)">\${esc(c.title)}</span>\${exBdg(c)}`;

if (oldTitleRegex.test(bankContent)) {
  bankContent = bankContent.replace(oldTitleRegex, newTitleCode);
  console.log('✓ Made checklist title directly clickable to open Checklist Hub');
}

// Update loadChkDetail signature to accept wardPref
const oldLoadSig = `async function loadChkDetail(id, view){`;
const newLoadSig = `async function loadChkDetail(id, view, wardPref){`;
if (bankContent.includes(oldLoadSig)) {
  bankContent = bankContent.replace(oldLoadSig, newLoadSig);
}

// In loadChkDetail, store hospitalWards and pass wardPref
const oldLoadBody = `    CHK.current=r.checklist; CHK.editId=id;
    CHK.domains=(r.domains||[]).map(d=>({id:d.id, title:d.title, items:d.items||[]}));
    CHK.items=r.items||[];
    CHK.measurerRows=r.measurers||[]; CHK.measurers=CHK.measurerRows.map(u=>u.user_id);
    if(view==='fill') return drawChkFill();`;

const newLoadBody = `    CHK.current=r.checklist; CHK.editId=id;
    CHK.domains=(r.domains||[]).map(d=>({id:d.id, title:d.title, items:d.items||[]}));
    CHK.items=r.items||[];
    CHK.measurerRows=r.measurers||[]; CHK.measurers=CHK.measurerRows.map(u=>u.user_id);
    CHK.hospitalWards=r.hospital_wards||['اورژانس', 'مراقبت‌های ویژه (ICU)', 'قلب (CCU)', 'اتاق عمل جنرال', 'جراحی عمومی', 'داخلی', 'اطفال', 'زنان و زایمان', 'دیالیز', 'نوزادان (NICU)', 'آزمایشگاه', 'تصویربرداری', 'داروخانه', 'استریلیزاسیون (CSR)', 'بهداشت محیط', 'لاندری (رختشویخانه)', 'تغذیه و آشپزخانه', 'تأسیسات و مهندسی پزشکی'];
    if(view==='fill') return drawChkFill(wardPref);`;

if (bankContent.includes(oldLoadBody)) {
  bankContent = bankContent.replace(oldLoadBody, newLoadBody);
}

// Update chkGoto and fillChecklist
const oldGoto = `function chkGoto(view,id){ CHK.view=view; CHK.editId=id; S.page='checklists';
  document.querySelectorAll('.nitem[data-p]').forEach(n=>n.classList.toggle('on', n.dataset.p==='checklists'));
  loadChkDetail(id,view); }
function openChecklist(id){ chkGoto('detail',id); }
function fillChecklist(id){ CHK.answers={}; chkGoto('fill',id); }`;

const newGoto = `function chkGoto(view,id,wardPref){ CHK.view=view; CHK.editId=id; S.page='checklists';
  document.querySelectorAll('.nitem[data-p]').forEach(n=>n.classList.toggle('on', n.dataset.p==='checklists'));
  loadChkDetail(id,view,wardPref); }
function openChecklist(id){ chkGoto('detail',id); }
function fillChecklist(id,wardPref){ CHK.answers={}; chkGoto('fill',id,wardPref); }`;

if (bankContent.includes(oldGoto)) {
  bankContent = bankContent.replace(oldGoto, newGoto);
}

// Replace drawChkDetail with the complete Checklist Audit Hub
const drawChkDetailStart = `function drawChkDetail(){`;
const drawChkDetailEndMarker = `function drawChkFill`; // In other files, or EOF in bank

const newDrawChkDetail = `// هاب پایش و ارزیابی جامع چک‌لیست (Checklist Audit Hub)
function drawChkDetail(){
  const c = CHK.current;
  const d = c && c.due;
  const subs = CHK.subs || [];
  const wards = CHK.hospitalWards || ['اورژانس', 'مراقبت‌های ویژه (ICU)', 'قلب (CCU)', 'اتاق عمل جنرال', 'جراحی عمومی', 'داخلی', 'اطفال', 'زنان و زایمان', 'دیالیز', 'نوزادان (NICU)', 'آزمایشگاه', 'تصویربرداری', 'داروخانه', 'استریلیزاسیون (CSR)', 'بهداشت محیط', 'لاندری (رختشویخانه)', 'تغذیه و آشپزخانه', 'تأسیسات و مهندسی پزشکی'];

  // تحلیل آماری پاسخ‌نامه‌ها
  let totalScore = 0, totalMax = 0, ncCount = 0;
  subs.forEach(s => {
    totalScore += (s.score || 0);
    totalMax += (s.max_score || 0);
    if ((s.max_score || 0) > 0 && ((s.score / s.max_score) < 0.75)) ncCount++;
  });
  const avgPct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : null;

  // تفکیک بخش‌های پایش‌شده در دوره جاری
  const periodStart = d && d.period_start ? d.period_start : null;
  const periodEnd = d && d.period_end ? d.period_end : null;
  const currentPeriodSubs = subs.filter(s => {
    if (!periodStart || !periodEnd) return true;
    const dt = s.submitted_at ? s.submitted_at.slice(0, 10) : '';
    return dt >= periodStart && dt <= periodEnd;
  });

  const auditedWardsMap = {};
  currentPeriodSubs.forEach(s => {
    const ref = (s.reference || '').trim();
    wards.forEach(w => {
      if (ref.includes(w) || w.includes(ref)) {
        auditedWardsMap[w] = s;
      }
    });
  });

  $('ptitle').textContent = 'هاب پایش و ارزیابی — ' + c.title;
  $('content').innerHTML = \`
  \${pathCards(c.section_id)}

  <!-- ۱. شناسنامه سند و نوار ناوبری اصلی هاب -->
  <div class="panel g">
    <div class="phd">
      <div class="abadge">◈</div>
      <div style="flex:1">
        <h3 style="font-size:16px">\${esc(c.title)}</h3>
        <div class="sub">
          کد: <b style="color:var(--gdl)">\${esc(c.checklist_code || 'بدون کد')}</b> ·
          تناوب پایش: <b style="color:var(--gdl)">\${CL_CADENCE_FA[c.cadence] || 'موردی'}</b> ·
          وضعیت: <span class="bdg \${CL_STATUS_BDG[c.status] || 'b2'}">\${CL_STATUS_FA[c.status] || c.status}</span>
        </div>
      </div>
      <button class="btn btn-o btn-sm" onclick="backToChkList()">◂ فهرست چک‌لیست‌ها</button>
      \${canSubmitChecklists() ? \`<button class="btn btn-g btn-sm" onclick="fillChecklist('\${c.id}')">✎ + ثبت ارزیابی جدید</button>\` : ''}
      <button class="btn btn-o btn-sm" onclick="printBlankChecklist('\${c.id}')">\${ic('print')} چاپ برگه خام ارزیابی</button>
      \${subs.length ? \`<button class="btn btn-o btn-sm" onclick="exportChecklistCsv('\${c.id}')">⤓ خروجی CSV</button>\` : ''}
      \${canManageChecklists() ? \`<button class="btn btn-o btn-sm" onclick="editChecklist('\${c.id}')">✎ ویرایش</button>\` : ''}
    </div>
    <div class="pbody">
      \${exBanner(c)}

      <!-- شناسنامه استاندارد و کنترل سند -->
      \${chkDocControlPanel(c)}

      <!-- ۲. تقویم سنجه و موتور سررسید پایش بعدی -->
      <div class="docsec \${d && d.previous_period_missed ? 'ncsec' : ''}" style="margin-top:12px;background:rgba(212,175,90,0.04);border:1px solid var(--gd)">
        <div class="docsl" style="color:var(--gdl);font-weight:700">تقویم سنجه اعتباربخشی و سررسید پایش</div>
        <div class="docsv">
          <div class="doc-dates">
            <div><span>تناوب مصوب سنجه</span><b>\${CL_CADENCE_FA[c.cadence] || 'موردی'}</b></div>
            <div><span>دوره‌ی جاری شمسی</span><b>\${d && d.period_start ? faDateISO(d.period_start) + ' تا ' + faDateISO(d.period_end) : 'موردی'}</b></div>
            <div><span>مهلت باقی‌مانده</span><b>\${d && d.days_left !== undefined ? (d.days_left <= 0 ? 'امروز پایان مهلت است' : fa(d.days_left) + ' روز') : '—'}</b></div>
            <div><span>سررسید دوره بعدی</span><b style="color:var(--gdl)">\${d && d.next_period_start ? faDateISO(d.next_period_start) + ' تا ' + faDateISO(d.next_period_end) : 'پس از اتمام دوره جاری'}</b></div>
          </div>
          <div style="margin-top:10px;font-size:12px;display:flex;align-items:center;gap:12px">
            <div>وضعیت دوره جاری: \${chkDueBadge(d)}</div>
            \${d && d.last_submitted_at ? \`<div style="color:var(--td)">آخرین ارزیابی ثبت‌شده در این چک‌لیست: <b style="color:var(--th)">\${faDateISO(d.last_submitted_at)}</b></div>\` : '<div style="color:var(--wr)">در دوره جاری هنوز هیچ ارزیابی ثبت نشده است.</div>'}
          </div>
          \${d && d.previous_period_missed ? \`<div class="rg-warn" style="margin-top:8px">دوره‌ی قبل بدون تکمیل گذشت — طبق سنجه‌های اعتباربخشی، وقفه در پایش ادواری یک عدم انطباق مدیریتی محسوب می‌شود.</div>\` : ''}
        </div>
      </div>

      <!-- ۳. کارت‌های آماری افقی عملکرد (قاعده ۱۱ - Horizontal Flow) -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin-top:14px">
        <div class="panel g" style="margin:0;padding:12px 14px;border:1px solid var(--bdr);background:rgba(255,255,255,0.02)">
          <div style="font-size:11.5px;color:var(--td)">کل ارزیابی‌های ثبت‌شده</div>
          <div style="font-size:20px;font-weight:700;color:var(--th);margin-top:4px">\${fa(subs.length)} <span style="font-size:12px;font-weight:400">مورد</span></div>
        </div>
        <div class="panel g" style="margin:0;padding:12px 14px;border:1px solid var(--bdr);background:rgba(255,255,255,0.02)">
          <div style="font-size:11.5px;color:var(--td)">میانگین نمره بیمارستان</div>
          <div style="font-size:20px;font-weight:700;color:\${avgPct && avgPct >= 80 ? 'var(--ok)' : (avgPct && avgPct >= 65 ? 'var(--gdl)' : 'var(--wr)')};margin-top:4px">
            \${avgPct !== null ? fa(avgPct) + '٪' : '—'}
          </div>
        </div>
        <div class="panel g" style="margin:0;padding:12px 14px;border:1px solid var(--bdr);background:rgba(255,255,255,0.02)">
          <div style="font-size:11.5px;color:var(--td)">پوشش بخش‌ها در دوره جاری</div>
          <div style="font-size:20px;font-weight:700;color:var(--th);margin-top:4px">
            \${fa(Object.keys(auditedWardsMap).length)} <span style="font-size:12px;font-weight:400">از \${fa(wards.length)} بخش</span>
          </div>
        </div>
        <div class="panel g" style="margin:0;padding:12px 14px;border:1px solid var(--bdr);background:rgba(255,255,255,0.02)">
          <div style="font-size:11.5px;color:var(--td)">ارزیابی‌های دارای افت نمره (زیر ۷۵٪)</div>
          <div style="font-size:20px;font-weight:700;color:\${ncCount ? 'var(--wr)' : 'var(--ok)'};margin-top:4px">
            \${fa(ncCount)} <span style="font-size:12px;font-weight:400">\${ncCount ? 'نیازمند CAPA' : 'وضعیت مطلوب'}</span>
          </div>
        </div>
      </div>

      <!-- ۴. ماتریس پایش بخش‌های بیمارستان در دوره جاری (Ward Compliance Grid) -->
      <div class="docsec" style="margin-top:16px">
        <div class="docsl" style="color:var(--gdl);font-weight:700">ماتریس وضعیت پایش بخش‌های بیمارستان در دوره‌ی جاری</div>
        <div class="docsv">
          <div style="font-size:11.5px;color:var(--td);margin-bottom:10px">
            ارزیابی هر بخش را در دوره‌ی جاری پایش کنید. با کلیک بر روی «+ ثبت ارزیابی»، فرم مستقیماً برای آن بخش باز می‌شود:
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));gap:8px">
            \${wards.map(w => {
              const sub = auditedWardsMap[w];
              const pct = sub && sub.max_score ? Math.round((sub.score / sub.max_score) * 100) : null;
              return \`
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:6px;border:1px solid \${sub ? 'rgba(76,175,80,0.3)' : 'var(--bdr)'};background:\${sub ? 'rgba(76,175,80,0.06)' : 'rgba(255,255,255,0.01)'}">
                <div>
                  <div style="font-size:12px;font-weight:600;color:\${sub ? 'var(--th)' : 'var(--td)'}">\${esc(w)}</div>
                  <div style="font-size:10.5px;color:\${sub ? 'var(--ok)' : 'var(--td)'}">
                    \${sub ? \`✓ انجام‌شده (نمره \${fa(pct)}٪)\` : '⏳ در انتظار ارزیابی'}
                  </div>
                </div>
                <div>
                  \${sub ? \`<button class="tgl" style="font-size:11px" onclick="openChkSubmission('\${sub.id}')">مشاهده</button>\`
                        : (canSubmitChecklists() ? \`<button class="tgl prim" style="font-size:11px" onclick="fillChecklist('\${c.id}','\${esc(w)}')">+ ارزیابی</button>\` : '')}
                </div>
              </div>\`;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- ۵. هدف و مسئولین اندازه‌گیری -->
      \${c.purpose ? \`<div class="docsec"><div class="docsl">هدف از ساخت چک‌لیست</div><div class="docsv">\${esc(c.purpose)}</div></div>\` : ''}
      <div class="docsec"><div class="docsl">مسئولین اندازه‌گیری</div>
        <div class="docsv">\${(CHK.measurerRows || []).length
          ? (CHK.measurerRows || []).map(u => \`<span class="bdg b1" style="margin-left:6px">\${esc(u.full_name)}\${u.department ? ' — ' + esc(u.department) : ''}</span>\`).join('')
          : '<span style="color:var(--td)">تعیین نشده است</span>'}</div></div>
      \${c.baseline_info ? \`<div class="docsec"><div class="docsl">اطلاعات پایه‌ای</div><div class="docsv">\${esc(c.baseline_info)}</div></div>\` : ''}

      <!-- ۶. جدول سنجه‌ها و سؤالات ارزیابی -->
      <div class="docsec" style="margin-top:14px">
        <div class="docsl" style="color:var(--gdl);font-weight:700">سؤالات و سنجه‌های مصوب چک‌لیست</div>
        <div class="docsv">
          \${chkAllGroups().map(g => \`<div class="dsec" style="margin-bottom:12px">
            <div class="dl" style="color:var(--gdl)">◂ \${g.title ? esc(g.title) : 'سؤالات بدون حیطه'}</div>
            <div class="tbl-wrap"><table><thead><tr><th style="width:36px">#</th><th>متن سؤال / سنجه</th><th style="width:120px">نوع پاسخ</th><th style="width:60px">وزن</th></tr></thead>
            <tbody>\${g.items.map((it, i) => \`<tr><td>\${fa(i + 1)}</td><td style="color:var(--th)">\${esc(it.question_text)}</td>
              <td>\${CL_TYPE_FA[it.answer_type] || it.answer_type}</td><td>\${it.weight ? fa(it.weight) : '۱'}</td></tr>\`).join('')}</tbody></table></div>
          </div>\`).join('') || '<div class="empty">هنوز سؤالی تعریف نشده است</div>'}
        </div>
      </div>
    </div>
  </div>

  <!-- ۷. جدول پاسخ‌نامه‌های ثبت‌شده و سوابق پایش -->
  <div class="panel g">
    <div class="phd">
      <div class="abadge">▤</div>
      <div style="flex:1">
        <h3>سوابق و پاسخ‌نامه‌های ثبت‌شده</h3>
        <div class="sub">\${fa(subs.length)} مورد ارزیابی تکمیل‌شده در سامانه</div>
      </div>
      \${subs.length ? \`<button class="btn btn-o btn-sm" onclick="exportChecklistCsv('\${c.id}')">⤓ خروجی CSV</button>\` : ''}
    </div>
    <div class="pbody">
      \${!subs.length ? '<div class="empty">هنوز هیچ ارزیابی برای این چک‌لیست ثبت نشده است. از دکمه «+ ثبت ارزیابی جدید» نخستین مورد را ثبت کنید.</div>' : \`
      <div class="tbl-wrap"><table>
        <thead>
          <tr>
            <th style="width:36px">#</th>
            <th>بخش / مورد بررسی</th>
            <th style="width:120px">امتیاز مکتسبه</th>
            <th style="width:90px">درصد انطباق</th>
            <th style="width:140px">وضعیت کیفیت</th>
            <th>ارزیاب / تکمیل‌کننده</th>
            <th style="width:130px">تاریخ ثبت</th>
            <th style="width:120px">عملیات</th>
          </tr>
        </thead>
        <tbody>\${subs.map((s, idx) => {
          const pct = s.max_score ? Math.round((s.score / s.max_score) * 100) : 0;
          const isGood = pct >= 80;
          const isWarning = pct >= 65 && pct < 80;
          const isDanger = pct < 65;
          return \`<tr\${s.is_example ? ' class="exrow"' : ''}>
            <td>\${fa(idx + 1)}</td>
            <td style="color:var(--th);font-weight:600">\${esc(s.reference || '—')}\${exBdg(s)}</td>
            <td>\${fa(s.score || 0)} از \${fa(s.max_score || 0)}</td>
            <td><b>\${fa(pct)}٪</b></td>
            <td>
              <span class="bdg \${isGood ? 'b1' : (isWarning ? 'b2' : 'b3')}">
                \${isGood ? 'انطباق مطلوب' : (isWarning ? 'نیازمند بهبود' : 'عدم انطباق - CAPA')}
              </span>
            </td>
            <td>\${esc(s.submitted_by_name || '—')}</td>
            <td style="white-space:nowrap">\${faDateTime(s.submitted_at)}</td>
            <td style="white-space:nowrap">
              <button class="tgl prim" onclick="openChkSubmission('\${s.id}')">مشاهده</button>
            </td>
          </tr>\`;
        }).join('')}</tbody>
      </table></div>\`}
    </div>
  </div>\`;
}
`;

// Replace drawChkDetail in checklists-bank.js
const bankStartIdx = bankContent.indexOf(drawChkDetailStart);
if (bankStartIdx !== -1) {
  bankContent = bankContent.slice(0, bankStartIdx) + newDrawChkDetail;
  fs.writeFileSync(bankPath, bankContent, 'utf8');
  console.log('✓ Re-architected drawChkDetail in checklists-bank.js into Checklist Audit Hub');
}

// ==========================================
// 2. UPGRADE public/js/views/quality/checklists-submissions.js
// ==========================================
const subPath = path.join(__dirname, '../public/js/views/quality/checklists-submissions.js');
let subContent = fs.readFileSync(subPath, 'utf8');

const newDrawChkFill = `
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
    return \`
    <tr id="ansrow_\${it.id}">
      <td style="text-align:center;color:var(--td)">\${fa(n)}</td>
      <td>
        <div style="color:var(--th);font-weight:600;line-height:1.7">\${esc(it.question_text)}</div>
      </td>
      <td style="text-align:center">\${it.weight ? fa(it.weight) : '۱'}</td>
      <td>
        <div class="mctl" style="justify-content:center">
          \${opts.map(([k,v]) => \`
            <button type="button" class="tgl" data-v="\${k}" onclick="setChkAnswer('\${it.id}','\${k}')">\${v}</button>
          \`).join('')}
        </div>
      </td>
      <td>
        <input class="sel" style="width:100%" id="ansnote_\${it.id}" placeholder="توضیح یا مشاهده عینی (اختیاری)">
      </td>
    </tr>\`;
  };

  $('content').innerHTML = \`
  \${pathCards(c.section_id)}

  <div class="panel g">
    <div class="phd">
      <div class="abadge">✎</div>
      <div style="flex:1">
        <h3>ثبت ارزیابی: \${esc(c.title)}</h3>
        <div class="sub">
          کد: \${esc(c.checklist_code || 'بدون کد')} ·
          تناوب: \${CL_CADENCE_FA[c.cadence] || 'موردی'}
          \${d && d.period_start ? \` — دوره‌ی جاری: \${faDateISO(d.period_start)} تا \${faDateISO(d.period_end)}\` : ''}
        </div>
      </div>
      <button class="btn btn-o btn-sm" onclick="openChecklist('\${c.id}')">◂ بازگشت به هاب پایش</button>
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
                \${wards.map(w => \`<option value="\${esc(w)}" \${wardPref === w ? 'selected' : ''}>\${esc(w)}</option>\`).join('')}
              </select>
            </div>
            <div class="fg" style="margin:0">
              <label>مورد ارزیابی (تخت / اتاق / نام پرونده یا پرسنل)</label>
              <input id="sub_detail" placeholder="مثال: تخت شماره ۴ یا شیفت عصر">
            </div>
          </div>
        </div>
      </div>

      \${c.baseline_info ? \`<div class="dsec book"><div class="dl">◈ اطلاعات پایه‌ای و راهنما</div>
        <div style="font-size:12.5px;color:var(--tm)">\${esc(c.baseline_info)}</div></div>\` : ''}

      <!-- جدول‌بندی ساخت‌یافته سنجه‌های ارزیابی بر اساس حیطه‌ها -->
      \${chkAllGroups().map(g => \`
        <div class="dsec" style="margin-top:16px">
          <div class="dl" style="color:var(--gdl);font-weight:700">◂ \${g.title ? esc(g.title) : 'سؤالات ارزیابی'}</div>
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
                \${g.items.map(qRow).join('')}
              </tbody>
            </table>
          </div>
        </div>
      \`).join('') || '<div class="empty">این چک‌لیست سؤالی ندارد</div>'}

      <div class="fg" style="margin-top:16px">
        <label>توضیح و جمع‌بندی کلی ارزیاب</label>
        <textarea id="sub_note" rows="2" placeholder="توضیحات کلی درباره وضعیت این بخش..."></textarea>
      </div>

      <div style="margin-top:14px;display:flex;gap:10px">
        <button class="btn btn-g" onclick="submitChecklistAnswers()">✓ ثبت نهایی پاسخ‌ها و نمره‌دهی</button>
        <button class="btn btn-o" onclick="openChecklist('\${c.id}')">انصراف و بازگشت</button>
      </div>
    </div>
  </div>\`;
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
`;

// Replace drawChkFill and related in checklists-submissions.js
const subStartIdx = subContent.indexOf('function drawChkFill');
const subEndIdx = subContent.indexOf('function exportChecklistCsv');

if (subStartIdx !== -1 && subEndIdx !== -1) {
  subContent = subContent.slice(0, subStartIdx) + newDrawChkFill + '\n\n' + subContent.slice(subEndIdx);
  fs.writeFileSync(subPath, subContent, 'utf8');
  console.log('✓ Re-architected drawChkFill in checklists-submissions.js with Live Scoring, Ward Selector and Structured Table');
}

// Keep checklists-form.js in sync if present
const formPath = path.join(__dirname, '../public/js/views/quality/checklists-form.js');
if (fs.existsSync(formPath)) {
  fs.writeFileSync(formPath, subContent, 'utf8');
  console.log('✓ Synchronized checklists-form.js');
}

console.log('Frontend checklist audit hub & live audit form upgraded successfully!');

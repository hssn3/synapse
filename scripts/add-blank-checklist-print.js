/**
 * Adds printBlankChecklist to checklists views.
 * Preserves UTF-8 cleanly without CLI codepage issues.
 */
const fs = require('fs');
const path = require('path');

const printBlankChecklistCode = `
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
    $('content').innerHTML = \`
    <div class="panel g docprint">
      <div class="phd noprint"><div class="abadge">✓</div>
        <div style="flex:1"><h3>برگه خام ارزیابی میدانی: \${esc(c.title)}</h3>
        <div class="sub">\${esc(code)} · آماده چاپ جهت تکمیل دستی و ارزیابی میدانی</div></div>
        <button class="btn btn-o btn-sm" onclick="openChecklist('\${c.id}')">◂ بازگشت</button>
        <button class="btn btn-g btn-sm" onclick="dpPrint()">\${ic('print')} چاپ برگه خام</button>
      </div>
      <div class="pbody">
        <table class="psheet">
        <thead><tr><td>\${docLetterhead(\`برگه ارزیابی میدانی (خام) — \${esc(code)}\`)}</td></tr></thead>
        <tfoot><tr><td><div class="psheet-foot">
          <span>\${esc((S.user && S.user.hospital_name) || '')}</span>
          <span>\${esc(code)} · \${esc(c.title)}</span>
        </div></td></tr></tfoot>
        <tbody><tr><td>
          <h3 style="margin:0 0 6px;text-align:center">\${esc(c.title)}</h3>
          \${c.purpose ? \`<div style="font-size:12px;color:var(--td);margin-bottom:12px;text-align:center">\${esc(c.purpose)}</div>\` : ''}

          <!-- شناسنامه و کنترل سند -->
          <div class="doc-dates" style="margin-bottom:10px">
            <div><span>کد چک‌لیست</span><b>\${esc(code)}</b></div>
            <div><span>نسخه سند</span><b>\${fa(c.version_no || 1)}</b></div>
            <div><span>تناوب پایش</span><b>\${CL_CADENCE_SHORT[c.cadence] || 'موردی'}</b></div>
            <div><span>سند مادر</span><b>\${pd ? esc((pd.doc_code ? pd.doc_code + ' — ' : '') + pd.title) : 'ثبت نشده'}</b></div>
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

          \${c.baseline_info ? \`
          <div style="border:1px dashed var(--bdr);border-radius:6px;padding:8px 12px;margin-bottom:14px;font-size:11.5px;color:var(--td)">
            <b style="color:var(--th)">اطلاعات پایه‌ای و راهنما:</b> \${esc(c.baseline_info)}
          </div>\` : ''}

          <!-- جدول سوالات با چک‌باکس‌های چاپی -->
          \${groups.map(g => \`
            <div style="margin-top:14px">
              <div style="font-weight:700;font-size:12.5px;color:var(--gdl);margin-bottom:6px;padding-right:4px;border-right:3px solid var(--gd)">
                \${g.title ? esc(g.title) : 'سؤالات ارزیابی'}
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
                    \${g.items.map((it, idx) => \`
                      <tr>
                        <td style="text-align:center">\${fa(idx + 1)}</td>
                        <td style="color:var(--th);font-weight:500;line-height:1.7">\${esc(it.question_text)}</td>
                        <td style="text-align:center">\${it.weight ? fa(it.weight) : '۱'}</td>
                        <td style="text-align:center;white-space:nowrap;font-size:11px">
                          \${it.answer_type === 'yes_no' ? \`
                            <span style="display:inline-block;margin:0 4px">☐ بله</span>
                            <span style="display:inline-block;margin:0 4px">☐ خیر</span>
                            <span style="display:inline-block;margin:0 4px">☐ ندارد</span>
                          \` : \`
                            <span style="display:inline-block;margin:0 2px">☐ عالی</span>
                            <span style="display:inline-block;margin:0 2px">☐ خوب</span>
                            <span style="display:inline-block;margin:0 2px">☐ متوسط</span>
                            <span style="display:inline-block;margin:0 2px">☐ کم</span>
                            <span style="display:inline-block;margin:0 2px">☐ خالی</span>
                          \`}
                        </td>
                        <td style="border-bottom:1px dotted var(--bdr)">&nbsp;</td>
                      </tr>
                    \`).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          \`).join('')}

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
    </div>\`;
  } catch(e) {
    toast('خطا در آماده‌سازی برگه خام: ' + e.message, true);
  }
}
`;

// 1. Update public/js/views/quality/checklists-bank.js
const bankPath = path.join(__dirname, '../public/js/views/quality/checklists-bank.js');
let bankContent = fs.readFileSync(bankPath, 'utf8');

const bankTargetBtn = `<button class="btn btn-o btn-sm" onclick="backToChkList()">◂ فهرست</button>`;
const bankNewBtn = `<button class="btn btn-o btn-sm" onclick="backToChkList()">◂ فهرست</button>
      <button class="btn btn-o btn-sm" onclick="printBlankChecklist('\${c.id}')">\${ic('print')} چاپ برگه خام ارزیابی</button>`;

if (!bankContent.includes('printBlankChecklist')) {
  bankContent = bankContent.replace(bankTargetBtn, bankNewBtn);
  fs.writeFileSync(bankPath, bankContent, 'utf8');
  console.log('✓ Added printBlankChecklist button to checklists-bank.js');
}

// 2. Update public/js/views/quality/checklists-submissions.js
const subPath = path.join(__dirname, '../public/js/views/quality/checklists-submissions.js');
let subContent = fs.readFileSync(subPath, 'utf8');

if (!subContent.includes('function printBlankChecklist')) {
  subContent += '\n' + printBlankChecklistCode;
  fs.writeFileSync(subPath, subContent, 'utf8');
  console.log('✓ Added printBlankChecklist function to checklists-submissions.js');
}

// 3. Update public/js/views/quality/checklists-form.js
const formPath = path.join(__dirname, '../public/js/views/quality/checklists-form.js');
if (fs.existsSync(formPath)) {
  let formContent = fs.readFileSync(formPath, 'utf8');
  if (!formContent.includes('printBlankChecklist')) {
    formContent = formContent.replace(bankTargetBtn, bankNewBtn);
    formContent += '\n' + printBlankChecklistCode;
    fs.writeFileSync(formPath, formContent, 'utf8');
    console.log('✓ Added printBlankChecklist to checklists-form.js');
  }
}

// 4. Update public/js/views/quality/checklists-print.js
const printPath = path.join(__dirname, '../public/js/views/quality/checklists-print.js');
if (fs.existsSync(printPath)) {
  let printContent = fs.readFileSync(printPath, 'utf8');
  if (!printContent.includes('function printBlankChecklist')) {
    printContent += '\n' + printBlankChecklistCode;
    fs.writeFileSync(printPath, printContent, 'utf8');
    console.log('✓ Added printBlankChecklist to checklists-print.js');
  }
}

console.log('All checklist print components updated successfully!');

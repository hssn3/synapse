const fs = require('fs');

const file = 'public/js/views/documents/processes-flowchart.js';
let content = fs.readFileSync(file, 'utf8');

// 1. In saveProcess: include version_no and revision_no
const saveProcTarget = `next_review_date:readJalaliDateInput('pf_next_review'),`;
const saveProcReplacement = `next_review_date:readJalaliDateInput('pf_next_review'),
    version_no: parseInt($('pf_version_no')?.value, 10) || 1,
    revision_no: parseInt($('pf_revision_no')?.value, 10) || 0,`;

if (content.includes(saveProcTarget) && !content.includes("revision_no: parseInt($('pf_revision_no')")) {
  content = content.replace(saveProcTarget, saveProcReplacement);
  console.log('[processes-flowchart] Added version_no and revision_no to saveProcess');
}

// 2. In drawProcChart: subtitle & dates bar
const chartSubTarget = `<div class="sub">\${esc(p.process_code||'بدون کد')} · نسخه \${fa(p.version_no||1)} ·`;
const chartSubReplacement = `<div class="sub">\${esc(p.process_code||'بدون کد')} · نسخه \${fa(p.version_no||1)} · \${revisionBadge(p.revision_no)} ·`;
if (content.includes(chartSubTarget)) {
  content = content.replace(chartSubTarget, chartSubReplacement);
  console.log('[processes-flowchart] Added revisionBadge to drawProcChart subtitle');
}

const chartDatesTarget = `<div><span>نسخه</span><b>\${fa(p.version_no||1)}</b></div>`;
const chartDatesReplacement = `<div><span>شماره نسخه</span><b>\${fa(p.version_no||1)}</b></div>
          <div><span>شماره ویرایش</span><b style="color:var(--gdl)">\${revisionLabel(p.revision_no)}</b></div>`;
if (content.includes(chartDatesTarget)) {
  content = content.replace(chartDatesTarget, chartDatesReplacement);
  console.log('[processes-flowchart] Added distinct version and revision to chart dates bar');
}

fs.writeFileSync(file, content, 'utf8');
console.log('✅ processes-flowchart.js successfully updated!');

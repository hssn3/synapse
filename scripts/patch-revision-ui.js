const fs = require('fs');

const revisionCode = `// ============ گزینه‌های استاندارد شماره ویرایش اسناد (نسخه اولیه تا ویرایش ۲۰) ============
const DOC_REVISION_OPTIONS = [
  { val: 0, label: 'نسخه اولیه' },
  { val: 1, label: 'ویرایش یک' },
  { val: 2, label: 'ویرایش دو' },
  { val: 3, label: 'ویرایش سه' },
  { val: 4, label: 'ویرایش چهار' },
  { val: 5, label: 'ویرایش پنج' },
  { val: 6, label: 'ویرایش شش' },
  { val: 7, label: 'ویرایش هفت' },
  { val: 8, label: 'ویرایش هشت' },
  { val: 9, label: 'ویرایش نه' },
  { val: 10, label: 'ویرایش ده' },
  { val: 11, label: 'ویرایش یازده' },
  { val: 12, label: 'ویرایش دوازده' },
  { val: 13, label: 'ویرایش سیزده' },
  { val: 14, label: 'ویرایش چهارده' },
  { val: 15, label: 'ویرایش پانزده' },
  { val: 16, label: 'ویرایش شانزده' },
  { val: 17, label: 'ویرایش هفده' },
  { val: 18, label: 'ویرایش هجده' },
  { val: 19, label: 'ویرایش نوزده' },
  { val: 20, label: 'ویرایش بیست' },
];

function revisionLabel(revNo) {
  const n = parseInt(revNo, 10);
  if (isNaN(n) || n <= 0) return 'نسخه اولیه';
  const opt = DOC_REVISION_OPTIONS.find(o => o.val === n);
  return opt ? opt.label : ('ویرایش ' + fa(n));
}

function revisionBadge(revNo) {
  const n = parseInt(revNo, 10);
  const txt = revisionLabel(n);
  const cls = (!n || n === 0) ? 'b1' : 'b2';
  return '<span class="bdg ' + cls + '">' + esc(txt) + '</span>';
}

function revisionSelectHtml(id, currentVal) {
  const cur = parseInt(currentVal, 10) || 0;
  return '<select id="' + id + '" class="sel" style="width:100%">' +
    DOC_REVISION_OPTIONS.map(o => '<option value="' + o.val + '" ' + (o.val === cur ? 'selected' : '') + '>' + esc(o.label) + ' (' + (o.val === 0 ? '۰' : fa(o.val)) + ')</option>').join('') +
  '</select>';
}

// نوار تاریخ: ایجاد / آخرین ویرایش / بازنگری بعدی / نسخه / ویرایش
function docDatesBar(d){
  const nr = nextReviewISO(d);
  const st = nr ? docReviewState(nr) : null;
  const cls = st ? (st.days < 0 ? 'over' : (st.days <= 30 ? 'due' : '')) : '';
  return '<div class="doc-dates">' +
    '<div><span>تاریخ ایجاد</span><b>' + faDateISO(d.created_at || d.prepared_date) + '</b></div>' +
    '<div><span>آخرین ویرایش</span><b>' + faDateISO(d.updated_at || d.last_review_date || d.created_at) + '</b></div>' +
    '<div><span>بازنگری بعدی' + (d.review_date ? '' : ' (خودکار — یک سال بعد)') + '</span>' +
      '<b class="' + cls + '">' + faDateISO(nr) + '</b></div>' +
    '<div><span>شماره نسخه</span><b>' + fa(d.version_no || 1) + '</b></div>' +
    '<div><span>شماره ویرایش</span><b style="color:var(--gdl)">' + revisionLabel(d.revision_no) + '</b></div>' +
  '</div>';
}`;

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  const targetOld = content.match(/\/\/ نوار تاریخ: ایجاد \/ آخرین ویرایش \/ بازنگری بعدی\r?\nfunction docDatesBar\(d\)\{[\s\S]*?return `<div class="doc-dates">[\s\S]*?<\/div>`;\r?\n\}/);
  if (targetOld) {
    content = content.replace(targetOld[0], revisionCode.trim());
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully patched: ' + filePath);
  } else {
    console.log('Target docDatesBar pattern not found in ' + filePath);
  }
}

patchFile('public/js/core/02-visual-theme.js');
patchFile('public/js/core/core-datetime-part1.js');

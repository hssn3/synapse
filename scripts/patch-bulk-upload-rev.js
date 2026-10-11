const fs = require('fs');

const file = 'public/js/views/documents/bulk-upload.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Add df_version_no and df_revision_no right after df_status
const statusBlockRegex = /<div class="fg"><label>وضعیت<\/label>\s*<select id="df_status">[\s\S]*?<\/select><\/div>/;
const matchStatus = content.match(statusBlockRegex);

if (matchStatus && !content.includes('id="df_revision_no"')) {
  const replacement = matchStatus[0] + `
        <div class="fg"><label>شماره نسخه (Version)</label>
          <input type="number" id="df_version_no" min="1" max="99" value="\${esc(docVal('version_no') || 1)}" style="direction:ltr;text-align:center" placeholder="1"></div>
        <div class="fg">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <label>شماره ویرایش (Revision)</label>
            \${DOCS.editId ? \`<a href="javascript:void(0)" onclick="const sel=$('df_revision_no');if(sel&&sel.selectedIndex<sel.options.length-1){sel.selectedIndex++;toast('ویرایش به '+sel.options[sel.selectedIndex].text+' ارتقا یافت')}" style="font-size:11px;color:var(--gdl);text-decoration:none">⮯ ویرایش بعدی (سالانه)</a>\` : ''}
          </div>
          \${typeof revisionSelectHtml === 'function' ? revisionSelectHtml('df_revision_no', docVal('revision_no') || 0) : \`<select id="df_revision_no"><option value="0">نسخه اولیه</option></select>\`}
        </div>`;
  content = content.replace(matchStatus[0], replacement);
  console.log('[patchBulkUpload] Successfully injected version_no and revision_no inputs');
}

// 2. Add version_no and revision_no to collectDocBody
const collectRegex = /section_id:v\('df_section_id'\),/;
if (content.match(collectRegex) && !content.includes("revision_no: parseInt(v('df_revision_no')")) {
  content = content.replace(collectRegex, `section_id:v('df_section_id'),
    version_no: parseInt(v('df_version_no'), 10) || 1,
    revision_no: parseInt(v('df_revision_no'), 10) || 0,`);
  console.log('[patchBulkUpload] Successfully added version_no and revision_no to collectDocBody');
}

// 3. Update toast message in saveDocument
const toastRegex = /toast\(r\.code_changed[\s\S]*?:\s*'نسخه '\+fa\(r\.version_no\)\+' ذخیره شد'\);/;
if (content.match(toastRegex)) {
  content = content.replace(toastRegex, `toast(r.code_changed ? ('نسخه ' + fa(r.version_no) + ' · ' + revisionLabel(r.revision_no) + ' ذخیره شد — کد مدرک به ' + r.doc_code + ' استاندارد شد') : ('نسخه ' + fa(r.version_no) + ' · ' + revisionLabel(r.revision_no) + ' ذخیره شد'));`);
  console.log('[patchBulkUpload] Successfully updated toast message in saveDocument');
}

fs.writeFileSync(file, content, 'utf8');
console.log('✅ bulk-upload.js updated completely!');

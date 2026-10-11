const fs = require('fs');

// 1. Patch bulk-upload.js (Document form & detail)
function patchBulkUpload() {
  const file = 'public/js/views/documents/bulk-upload.js';
  let content = fs.readFileSync(file, 'utf8');

  // Add version_no and revision_no fields in drawDocForm
  const formStatusTarget = `<div class="fg"><label>وضعیت</label>
          <select id="df_status">\${Object.entries(DOC_STATUS_FA).map(([k,v])=>\`<option value="\${k}" \${docVal('status')===k?'selected':''}>\${v}</option>\`).join('')}</select></div>`;

  const formRevisionFields = `<div class="fg"><label>وضعیت</label>
          <select id="df_status">\${Object.entries(DOC_STATUS_FA).map(([k,v])=>\`<option value="\${k}" \${docVal('status')===k?'selected':''}>\${v}</option>\`).join('')}</select></div>
        <div class="fg"><label>شماره نسخه (Version)</label>
          <input type="number" id="df_version_no" min="1" max="99" value="\${esc(docVal('version_no') || 1)}" style="direction:ltr;text-align:center" placeholder="1"></div>
        <div class="fg">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <label>شماره ویرایش (Revision)</label>
            \${DOCS.editId ? \`<a href="javascript:void(0)" onclick="const sel=$('df_revision_no');if(sel&&sel.selectedIndex<sel.options.length-1){sel.selectedIndex++;toast('ویرایش به '+sel.options[sel.selectedIndex].text+' ارتقا یافت')}" style="font-size:11px;color:var(--gdl);text-decoration:none">⮯ ویرایش بعدی (سالانه)</a>\` : ''}
          </div>
          \${typeof revisionSelectHtml === 'function' ? revisionSelectHtml('df_revision_no', docVal('revision_no') || 0) : \`<select id="df_revision_no"><option value="0">نسخه اولیه</option></select>\`}
        </div>`;

  if (content.includes(formStatusTarget) && !content.includes('df_revision_no')) {
    content = content.replace(formStatusTarget, formRevisionFields);
    console.log('[patchBulkUpload] Added version_no and revision_no inputs to drawDocForm');
  }

  // Update collectDocBody to include version_no and revision_no
  const collectTarget = `return {
    doc_type:v('df_doc_type'), title:v('df_title'), doc_code:v('df_doc_code'), decree_text:v('df_decree_text'),
    status:v('df_status'), section_id:v('df_section_id'),`;

  const collectReplacement = `return {
    doc_type:v('df_doc_type'), title:v('df_title'), doc_code:v('df_doc_code'), decree_text:v('df_decree_text'),
    status:v('df_status'), section_id:v('df_section_id'),
    version_no: parseInt(v('df_version_no'), 10) || 1,
    revision_no: parseInt(v('df_revision_no'), 10) || 0,`;

  if (content.includes(collectTarget) && !content.includes("revision_no: parseInt(v('df_revision_no')")) {
    content = content.replace(collectTarget, collectReplacement);
    console.log('[patchBulkUpload] Updated collectDocBody with version_no and revision_no');
  }

  // Update saveDocument toast message
  content = content.replace(
    /toast\(r\.code_changed\s*\?\s*'نسخه '\+fa\(r\.version_no\)\+' ذخیره شد — کد مدرک به '\+r\.doc_code\+' استاندارد شد'\s*:\s*'نسخه '\+fa\(r\.version_no\)\+' ذخیره شد'\);/,
    "toast(r.code_changed ? ('نسخه ' + fa(r.version_no) + ' · ' + revisionLabel(r.revision_no) + ' ذخیره شد — کد مدرک به ' + r.doc_code + ' استاندارد شد') : ('نسخه ' + fa(r.version_no) + ' · ' + revisionLabel(r.revision_no) + ' ذخیره شد'));"
  );

  // Update drawDocDetail subtitle & letterhead
  const detailSubTarget = `<div class="sub">\${DOC_TYPE_FA[t]||t} · نسخه \${fa(d.version_no||1)} · <span class="bdg \${DOC_STATUS_BDG[d.status]||'b2'}">\${DOC_STATUS_FA[d.status]||d.status}</span></div>`;
  const detailSubReplacement = `<div class="sub">\${DOC_TYPE_FA[t]||t} · نسخه \${fa(d.version_no||1)} · \${revisionBadge(d.revision_no)} · <span class="bdg \${DOC_STATUS_BDG[d.status]||'b2'}">\${DOC_STATUS_FA[d.status]||d.status}</span></div>`;

  if (content.includes(detailSubTarget)) {
    content = content.replace(detailSubTarget, detailSubReplacement);
    console.log('[patchBulkUpload] Updated drawDocDetail subtitle badge');
  }

  const letterheadTarget = `docLetterhead(\`\${DOC_TYPE_FA[t]||t} — \${esc(d.doc_code||'')}\${d.doc_code?' · ':''}نسخه \${fa(d.version_no||1)}\`)`;
  const letterheadReplacement = `docLetterhead(\`\${DOC_TYPE_FA[t]||t} — \${esc(d.doc_code||'')}\${d.doc_code?' · ':''}نسخه \${fa(d.version_no||1)} · \${revisionLabel(d.revision_no)}\`)`;

  if (content.includes(letterheadTarget)) {
    content = content.replace(letterheadTarget, letterheadReplacement);
    console.log('[patchBulkUpload] Updated docLetterhead with revisionLabel');
  }

  // Update history sub in drawDocDetail
  const histSubTarget = `<div class="sub">روند ویرایش‌ها و بازبینی‌ها در طول سال — نسخه فعلی: \${fa(d.version_no||1)}</div>`;
  const histSubReplacement = `<div class="sub">روند ویرایش‌ها و بازبینی‌ها در طول سال — نسخه فعلی: \${fa(d.version_no||1)} (\${revisionLabel(d.revision_no)})</div>`;

  if (content.includes(histSubTarget)) {
    content = content.replace(histSubTarget, histSubReplacement);
    console.log('[patchBulkUpload] Updated docHistoryPanel sub');
  }

  // Update version history table
  const verTableHeaders = `<thead><tr><th>ردیف</th><th>نسخه</th><th>تاریخ ویرایش</th><th>ویرایش‌کننده</th><th>شرح عملیات / تغییر</th><th>عملیات</th></tr></thead>`;
  const verTableHeadersNew = `<thead><tr><th>ردیف</th><th>نسخه</th><th>وضعیت ویرایش</th><th>تاریخ ویرایش</th><th>ویرایش‌کننده</th><th>شرح عملیات / تغییر</th><th>عملیات</th></tr></thead>`;

  if (content.includes(verTableHeaders)) {
    content = content.replace(verTableHeaders, verTableHeadersNew);
  }

  const verRowTarget = `<td style="color:var(--gdl)">نسخه \${fa(v.version_no)}</td>
        <td style="white-space:nowrap">\${faDateTime(v.created_at)}</td>`;
  const verRowNew = `<td style="color:var(--gdl)">نسخه \${fa(v.version_no)}</td>
        <td>\${revisionBadge(v.revision_no)}</td>
        <td style="white-space:nowrap">\${faDateTime(v.created_at)}</td>`;

  if (content.includes(verRowTarget)) {
    content = content.replace(verRowTarget, verRowNew);
    console.log('[patchBulkUpload] Updated version history table rows');
  }

  fs.writeFileSync(file, content, 'utf8');
}

// 2. Patch controlled-docs.js (Cards & Table view)
function patchControlledDocs() {
  const file = 'public/js/views/documents/controlled-docs.js';
  let content = fs.readFileSync(file, 'utf8');

  // In renderCard:
  const cardVerTarget = `\${d.version_no ? \`<span style="opacity:0.75">· نسخه \${fa(d.version_no)}</span>\` : ''}`;
  const cardVerNew = `<span style="opacity:0.85">· نسخه \${fa(d.version_no || 1)}</span>
          <span style="opacity:0.95;background:rgba(255,255,255,0.15);padding:1px 6px;border-radius:10px">· \${revisionLabel(d.revision_no)}</span>`;

  if (content.includes(cardVerTarget)) {
    content = content.replace(cardVerTarget, cardVerNew);
    console.log('[patchControlledDocs] Updated renderCard version and revision tags');
  }

  // In drawDocList table view drowRow:
  const tableVerTarget = `dp('نسخه', fa(d.version_no||1)),`;
  const tableVerNew = `dp('شماره نسخه', fa(d.version_no||1)),
              dp('شماره ویرایش', revisionLabel(d.revision_no)),`;

  if (content.includes(tableVerTarget)) {
    content = content.replace(tableVerTarget, tableVerNew);
    console.log('[patchControlledDocs] Updated drawDocList table drowRow');
  }

  fs.writeFileSync(file, content, 'utf8');
}

// 3. Patch admin-form-builder.js & form-filler.js
function patchForms() {
  const fbFile = 'public/js/views/users/admin-form-builder.js';
  if (fs.existsSync(fbFile)) {
    let fbContent = fs.readFileSync(fbFile, 'utf8');
    const titleInput = `<div class="fg"><label>نام فرم</label><input id="fb_title" placeholder="مثلاً: فرم تست خودکار - Gemini"></div>`;
    const titleGrid = `<div class="docgrid" style="margin-bottom:14px">
        <div class="fg" style="grid-column:span 2"><label>نام فرم *</label><input id="fb_title" placeholder="مثلاً: فرم ارزیابی و ممیزی بالینی"></div>
        <div class="fg"><label>شماره نسخه (Version)</label><input type="number" id="fb_version_no" min="1" value="1" style="direction:ltr;text-align:center"></div>
        <div class="fg"><label>شماره ویرایش (Revision)</label>\${typeof revisionSelectHtml === 'function' ? revisionSelectHtml('fb_revision_no', 0) : '<select id=\"fb_revision_no\"><option value=\"0\">نسخه اولیه</option></select>'}</div>
      </div>`;
    if (fbContent.includes(titleInput)) {
      fbContent = fbContent.replace(titleInput, titleGrid);
      fs.writeFileSync(fbFile, fbContent, 'utf8');
      console.log('[patchForms] Added version and revision fields to admin-form-builder.js');
    }
  }

  const ffFile = 'public/js/views/users/form-filler.js';
  if (fs.existsSync(ffFile)) {
    let ffContent = fs.readFileSync(ffFile, 'utf8');
    const ffSubTarget = `<div class="sub">\${esc(formDef.description || '')}</div>`;
    const ffSubNew = `<div class="sub">\${esc(formDef.description || '')} · نسخه \${fa(formDef.version_no || 1)} · \${typeof revisionBadge === 'function' ? revisionBadge(formDef.revision_no || 0) : 'نسخه اولیه'}</div>`;
    if (ffContent.includes(ffSubTarget)) {
      ffContent = ffContent.replace(ffSubTarget, ffSubNew);
      fs.writeFileSync(ffFile, ffContent, 'utf8');
      console.log('[patchForms] Added version and revision badges to form-filler.js');
    }
  }
}

// 4. Patch processes-view.js
function patchProcesses() {
  const pFile = 'public/js/views/documents/processes-view.js';
  if (fs.existsSync(pFile)) {
    let pContent = fs.readFileSync(pFile, 'utf8');

    // In drawProcList:
    const procVerTarget = `<span class="tsub">نسخه \${fa(p.version_no||1)}</span>`;
    const procVerNew = `<span class="tsub">نسخه \${fa(p.version_no||1)} · \${revisionLabel(p.revision_no)}</span>`;
    if (pContent.includes(procVerTarget)) {
      pContent = pContent.replace(procVerTarget, procVerNew);
    }

    // In drawProcForm:
    const docdatesTarget = `<div class="docdates">
        <div class="fg" style="margin:0"><label>تاریخ تدوین</label>\${jalaliDateInputHtml('pf_compiled')}</div>
        <div class="fg" style="margin:0"><label>تاریخ بازنگری بعدی</label>\${jalaliDateInputHtml('pf_next_review')}</div>
      </div>`;
    const docdatesNew = `<div class="docdates">
        <div class="fg" style="margin:0"><label>تاریخ تدوین</label>\${jalaliDateInputHtml('pf_compiled')}</div>
        <div class="fg" style="margin:0"><label>تاریخ بازنگری بعدی</label>\${jalaliDateInputHtml('pf_next_review')}</div>
        <div class="fg" style="margin:0"><label>شماره نسخه (Version)</label><input type="number" id="pf_version_no" min="1" value="\${esc(procVal('version_no') || 1)}" style="direction:ltr;text-align:center"></div>
        <div class="fg" style="margin:0"><label>شماره ویرایش (Revision)</label>\${typeof revisionSelectHtml === 'function' ? revisionSelectHtml('pf_revision_no', procVal('revision_no') || 0) : '<select id=\"pf_revision_no\"><option value=\"0\">نسخه اولیه</option></select>'}</div>
      </div>`;
    if (pContent.includes(docdatesTarget)) {
      pContent = pContent.replace(docdatesTarget, docdatesNew);
    }

    fs.writeFileSync(pFile, pContent, 'utf8');
    console.log('[patchProcesses] Updated processes-view.js with version and revision');
  }
}

patchBulkUpload();
patchControlledDocs();
patchForms();
patchProcesses();
console.log('✅ All document views patched with distinct Version and Revision!');

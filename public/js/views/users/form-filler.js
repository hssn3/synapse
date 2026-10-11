/**
 * Generic Form Filler UI using EnterpriseFormEngine
 */
async function renderFormFiller(paramSlug) {
  $('content').innerHTML = '<div class="panel g"><div class="empty">در حال بارگذاری فرم...</div></div>';
  
  // Extract slug from argument, router params, subpath, or hash
  const r = typeof parseHashRoute === 'function' ? parseHashRoute() : null;
  const hash = window.location.hash || '';
  const match = hash.match(/slug=([^&]+)/);
  const slug = paramSlug || (r && r.params && r.params.slug) || (r && r.subPath) || (match ? match[1] : null) || window.currentFormSlug;

  if (!slug) {
    $('content').innerHTML = '<div class="panel g"><div class="empty">خطا: شناسه فرم نامشخص است.</div></div>';
    return;
  }

  try {
    const formDef = await API.get(`/forms/${slug}`);
    
    $('content').innerHTML = `
      <div class="panel g">
        <div class="phd noprint">
          <div style="flex:1">
            <h3>${esc(formDef.title)}</h3>
            <div class="sub">${esc(formDef.description || '')} · نسخه ${fa(formDef.version_no || 1)} · ${typeof revisionBadge === 'function' ? revisionBadge(formDef.revision_no || 0) : 'نسخه اولیه'}</div>
          </div>
          <button class="btn btn-o btn-sm" onclick="window.print()">${ic('print')} چاپ فرم</button>
        </div>
        <div class="pbody">
          <div class="print-only-letterhead" style="display:none;margin-bottom:14px">
            ${typeof docLetterhead === 'function' ? docLetterhead(`${esc(formDef.title)} — نسخه ${fa(formDef.version_no || 1)}`) : ''}
          </div>
          <div id="formEngineContainer">
            <!-- Form Engine Will Mount Here -->
          </div>
        </div>
        <div class="pbody noprint">
          <button id="formEngineSubmit" class="btn btn-g">ذخیره و ثبت</button>
        </div>
      </div>
    `;

    // Instance engine
    window.currentFormEngine = new EnterpriseFormEngine({
      container: 'formEngineContainer',
      schema: (formDef.version && formDef.version.schema) || formDef.current_schema || formDef.schema,
      uiSchema: (formDef.version && formDef.version.ui_schema) || formDef.current_ui_schema || {},
      onSubmit: async (data) => {
        try {
          // قرارداد بدنه: اسکیما روی خودِ داده اعتبارسنجی می‌شود (نه روی {data:{...}}).
          await API.post(`/forms/${formDef.id}/submit`, data);
          toast('اطلاعات با موفقیت ذخیره شد.');
          if (typeof renderFormFiller === 'function') { /* فرم سالم می‌ماند */ }
        } catch (e) {
          toast('خطا در ذخیره اطلاعات: ' + e.message, true);
        }
      }
    });

    window.currentFormEngine.render();

    // Wire up save button
    document.getElementById('formEngineSubmit').onclick = () => {
      const data = window.currentFormEngine.getData();
      window.currentFormEngine.onSubmit(data);
    };

  } catch (err) {
    $('content').innerHTML = '<div class="panel g"><div class="empty">خطا در بارگذاری فرم: ' + esc(err.message) + '</div></div>';
  }
}

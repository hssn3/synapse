/**
 * Admin Form Builder
 */
function renderFormBuilder() {
  $('content').innerHTML = `
    <div class="panel g">
      <div class="sec-h"><h1>فرم‌ساز پیشرفته (Form Builder)</h1></div>
      <div class="docgrid" style="margin-bottom:14px">
        <div class="fg" style="grid-column:span 2"><label>نام فرم *</label><input id="fb_title" placeholder="مثلاً: فرم ارزیابی و ممیزی بالینی"></div>
        <div class="fg"><label>شماره نسخه (Version)</label><input type="number" id="fb_version_no" min="1" value="1" style="direction:ltr;text-align:center"></div>
        <div class="fg"><label>شماره ویرایش (Revision)</label>${typeof revisionSelectHtml === 'function' ? revisionSelectHtml('fb_revision_no', 0) : '<select id="fb_revision_no"><option value="0">نسخه اولیه</option></select>'}</div>
      </div>
      
      <div id="fb_fields" style="margin:20px 0; padding:15px; border:1px solid #ccc; min-height:100px;">
         <!-- Fields will be added here -->
      </div>

      <div style="margin-bottom: 20px;">
        <button class="btn btn-o btn-sm" onclick="fbAddField('text')">+ متن</button>
        <button class="btn btn-o btn-sm" onclick="fbAddField('number')">+ عدد</button>
        <button class="btn btn-o btn-sm" onclick="fbAddField('jalali-date')">+ تاریخ</button>
        <button class="btn btn-o btn-sm" onclick="fbAddField('select')">+ لیست</button>
        <button class="btn btn-o btn-sm" onclick="fbAddField('textarea')">+ متن بلند</button>
        <button class="btn btn-o btn-sm" onclick="fbAddField('checkbox')">+ چک‌باکس</button>
      </div>

      <button class="btn btn-g" onclick="fbSaveForm()">ذخیره و انتشار</button>
    </div>
  `;
  window.FB_FIELDS = [];
}

function fbAddField(type) {
  const id = 'f_' + Date.now();
  window.FB_FIELDS.push({ id, type, title: 'فیلد ' + type });
  fbRenderFields();
}

function fbRenderFields() {
  const box = $('fb_fields');
  box.innerHTML = window.FB_FIELDS.map((f, i) => `
    <div style="display:flex; gap:10px; margin-bottom:10px; align-items:center;">
      <span>نوع: ${f.type}</span>
      <input type="text" value="${f.title}" onchange="window.FB_FIELDS[${i}].title=this.value" placeholder="عنوان فیلد">
      <label><input type="checkbox" onchange="window.FB_FIELDS[${i}].required=this.checked"> اجباری</label>
      <button class="btn btn-r btn-sm" onclick="window.FB_FIELDS.splice(${i},1);fbRenderFields()">حذف</button>
    </div>
  `).join('');
}

async function fbSaveForm() {
  const title = $('fb_title').value.trim();
  if (!title) return alert('نام فرم را وارد کنید');
  
  const schema = {
    title,
    type: 'object',
    properties: {},
    required: []
  };

  const uiSchema = {};

  for (const f of window.FB_FIELDS) {
    let propType = 'string';
    if (f.type === 'number') propType = 'number';
    if (f.type === 'checkbox') propType = 'boolean';
    
    schema.properties[f.id] = { type: propType, title: f.title };
    
    if (f.type === 'textarea') uiSchema[f.id] = { 'ui:widget': 'textarea' };
    if (f.type === 'jalali-date') uiSchema[f.id] = { 'ui:widget': 'jalali-date' };
    if (f.type === 'select') {
      schema.properties[f.id].enum = ['گزینه ۱', 'گزینه ۲', 'گزینه ۳'];
      uiSchema[f.id] = { 'ui:widget': 'select' };
    }
    
    if (f.required) schema.required.push(f.id);
  }

  try {
    const res = await API.post('/forms', {
      title,
      slug: 'form_' + Date.now(),
      description: 'ساخته شده با Form Builder',
      initial_schema: schema,
      initial_ui_schema: uiSchema
    });
    alert('فرم با موفقیت ذخیره شد!');
  } catch (e) {
    alert('خطا در ذخیره فرم: ' + e.message);
  }
}

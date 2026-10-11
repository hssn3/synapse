/**
 * Documents Digital Library Repository
 * Modular Frontend Component — Project 313
 */
// ==================== کتابخانه دیجیتال ====================
// مخزن ساده فایل — بدون گردش‌کار امضا و نسخه‌بندی
const LIB_CAT_FA={regulation:'آیین‌نامه', pamphlet:'پمفلت', issued_form:'فرم ابلاغی',
  booklet:'کتابچه', training_handout:'جزوه آموزشی'};
const LIB_CAT_ICON={regulation:'§', pamphlet:'✧', issued_form:'▤', booklet:'▣', training_handout:'✎'};

let LIB={list:[], view:'list', current:null, editId:null, filters:{category:'', q:''}};
const canViewLibrary = () => { const p=S.user?.permissions||[]; return p.includes('view_library')||p.includes('manage_library'); };
const canManageLibrary = () => (S.user?.permissions||[]).includes('manage_library');

async function renderLibrary(){
  $('ptitle').textContent='کتابخانه دیجیتال';
  if(LIB.view==='form') return drawLibForm();
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const qs=Object.entries(LIB.filters).filter(([,v])=>v).map(([k,v])=>k+'='+encodeURIComponent(v)).join('&');
    const {items}=await API.library(qs);
    LIB.list=items||[];
    // پاسخِ دیرهنگامِ شبکه نباید فرمی را که کاربر در همین فاصله باز کرده
    // (و شاید داخلش تایپ کرده) پاک کند — همان ایرادی که در مدارک دیده شد.
    if(LIB.view!=='list') return;
    drawLibList();
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}

function drawLibList(){
  const f=LIB.filters;
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">📚</div>
      <div style="flex:1"><h3>کتابخانه دیجیتال بیمارستان</h3>
      <div class="sub">${fa(LIB.list.length)} مورد — آیین‌نامه، پمفلت، فرم ابلاغی، کتابچه و جزوه آموزشی (بدون گردش امضا)</div></div>
      ${canManageLibrary()?`<button class="btn btn-g btn-sm" onclick="newLibItem()">+ افزودن مورد</button>`:''}
    </div>
    <div class="pbody">
      ${docTabs('library')}
      <div class="docfilters">
        <div class="fg" style="margin:0"><label>دسته‌بندی</label>
          <select onchange="setLibFilter('category',this.value)">
            <option value="">همه دسته‌ها</option>
            ${Object.entries(LIB_CAT_FA).map(([k,v])=>`<option value="${k}" ${f.category===k?'selected':''}>${v}</option>`).join('')}
          </select></div>
        <div class="fg" style="margin:0;flex:1.6"><label>جستجو در عنوان یا توضیح</label>
          <input id="lib_q" value="${esc(f.q)}" placeholder="مثال: پمفلت بهداشت دست"
            onkeydown="if(event.key==='Enter')setLibFilter('q',this.value)"></div>
        <button class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px" onclick="setLibFilter('q',$('lib_q').value)">⌕ اعمال فیلتر</button>
      </div>
      ${!LIB.list.length?'<div class="empty"><div class="ei">📚</div>موردی با این فیلترها یافت نشد</div>':`
      <div class="tbl-wrap"><table>
        <thead><tr><th>دسته</th><th>عنوان</th><th>فایل</th><th>عملیات</th></tr></thead>
        <tbody>${LIB.list.map(it=>{ const did=drowNext(); return `<tr>
          <td style="white-space:nowrap"><span class="bdg b2">${LIB_CAT_ICON[it.category]||'▤'} ${LIB_CAT_FA[it.category]||esc(it.category)}</span></td>
          <td style="color:var(--th)">${esc(it.title)}${exBdg(it)}
            <span class="tsub">${esc((it.description||'').slice(0,80))||'بدون توضیح'}</span></td>
          <td style="white-space:nowrap">${it.file_path?`<a href="/api/library/${it.id}/file" target="_blank" style="color:var(--gdl)">⤓ ${esc(it.file_name||'دریافت')}</a>`:'—'}</td>
          <td style="white-space:nowrap">${drowBtn(did)}</td></tr>
          ${drowRow(did, 4, [
            exBanner(it,'inrow'),
            dp('توضیح', esc(it.description||'')),
            dp('محور اعتباربخشی مرتبط', it.section_id?esc(fixText(it.section_title||it.section_code||'')):''),
            dp('بارگذاری‌کننده', esc(it.uploaded_by_name||'')),
            dp('تاریخ افزودن', faDateTime(it.created_at)),
          ], canManageLibrary()?`<button class="tgl" onclick="editLibItem('${it.id}')">ویرایش</button>
            <button class="tgl dngr" onclick="removeLibItem('${it.id}')">حذف مورد</button>`:'')}`;
        }).join('')}</tbody></table></div>`}
    </div>
  </div>`;
}
function setLibFilter(k,v){ LIB.filters[k]=v; LIB.view='list'; renderLibrary(); }

function newLibItem(){ LIB.view='form'; LIB.editId=null; LIB.current=null; drawLibForm(); }
function editLibItem(id){
  LIB.current=LIB.list.find(x=>x.id===id)||null; LIB.editId=id; LIB.view='form'; drawLibForm();
}
function libVal(f){ return LIB.current? (LIB.current[f]||'') : ''; }

function drawLibForm(){
  $('ptitle').textContent=LIB.editId?'ویرایش مورد کتابخانه':'افزودن به کتابخانه دیجیتال';
  const cur=LIB.current;
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">📚</div>
      <div style="flex:1"><h3>${LIB.editId?'ویرایش مورد':'مورد جدید کتابخانه'}</h3>
      <div class="sub">فقط دسته‌بندی، عنوان و فایل — این مخزن نیازی به گردش امضا ندارد</div></div>
      <button class="btn btn-o btn-sm" onclick="backToLibList()">◂ بازگشت به فهرست</button>
    </div>
    <div class="pbody">
      ${exBanner(cur)}
      <div class="docgrid">
        <div class="fg"><label>دسته‌بندی *</label>
          <select id="lf_category">${Object.entries(LIB_CAT_FA).map(([k,v])=>
            `<option value="${k}" ${libVal('category')===k?'selected':''}>${v}</option>`).join('')}</select></div>
        <div class="fg" style="grid-column:span 2"><label>عنوان *</label>
          <input id="lf_title" value="${esc(libVal('title'))}" placeholder="مثال: آیین‌نامه داخلی بخش اورژانس"></div>
        <div class="fg" style="grid-column:span 3"><label>توضیح (اختیاری)</label>
          <textarea id="lf_description" rows="2" placeholder="توضیح کوتاه درباره این مورد">${esc(libVal('description'))}</textarea></div>
        <div class="fg" style="grid-column:span 3"><label>محور مرتبط در درخت اعتباربخشی (اختیاری)</label>
          <select id="lf_section_id">
            <option value="">— بدون اتصال به محور —</option>
            ${S.sections.map(sec=>`<optgroup label="${esc(sec.title)}">${sec.axes.map(ax=>
              `<option value="${ax.id}" ${libVal('section_id')===ax.id?'selected':''}>${esc(ax.code)} — ${esc(ax.title)}</option>`).join('')}</optgroup>`).join('')}
          </select></div>
      </div>
      <div class="docsec"><div class="docsl">فایل (JPG/PNG/WEBP/PDF — حداکثر ۵ مگابایت)</div>
        <div class="docsv">
          ${cur&&cur.file_path?`<div style="margin-bottom:6px"><a href="/api/library/${cur.id}/file" target="_blank" style="color:var(--gdl)">⤓ ${esc(cur.file_name||'فایل فعلی')}</a></div>`:''}
          <input type="file" id="lf_file" accept=".jpg,.jpeg,.png,.webp,.pdf">
          <div class="sub" style="margin-top:4px">${LIB.editId?'انتخاب فایل جدید، فایل قبلی را جایگزین می‌کند':'فایل پس از ذخیره مورد بارگذاری می‌شود'}</div>
        </div></div>
      <div style="margin-top:12px"><button class="btn btn-g" onclick="saveLibItem()">ذخیره</button></div>
    </div>
  </div>`;
  applyFieldGuides({editing:!!LIB.editId});
}
function backToLibList(){ LIB.view='list'; LIB.current=null; LIB.editId=null; renderLibrary(); }

async function saveLibItem(){
  const b={ category:$('lf_category').value, title:$('lf_title').value.trim(),
            description:$('lf_description').value.trim(), section_id:$('lf_section_id').value };
  if(!b.title){ toast('عنوان الزامی است',true); return; }
  try{
    let id=LIB.editId;
    if(id) await API.updateLibraryItem(id,b);
    else { const r=await API.createLibraryItem(b); id=r.item.id; }
    const fi=$('lf_file');
    if(fi&&fi.files&&fi.files[0]) await API.uploadLibraryFile(id, fi.files[0]);
    toast(LIB.editId?'مورد به‌روزرسانی شد':'مورد به کتابخانه افزوده شد');
    backToLibList();
  }catch(e){ toast(e.message,true); }
}
async function removeLibItem(id){
  if(!await BTN.confirmDanger('این مورد از کتابخانه حذف شود؟')) return;
  try{ await API.deleteLibraryItem(id); toast('مورد حذف شد'); renderLibrary(); }
  catch(e){ toast(e.message,true); }
}


/**
 * Collaboration Kartabl & User Profile
 * Modular Frontend Component — Project 313
 */
// ==================== کارتابل من (kartabl) ====================
// اقلامِ «در انتظار اقدام شما» از /api/inbox می‌آید (وظیفه، امضای سند، حسابرسی، جلسه پیش‌رو)
// و اگر جانشین کسی باشید، اقلام او هم با برچسب «به‌جای …» در همین فهرست می‌آید.
const INBOX_ICON={task:'✔', signoff:'✍', audit:'⚖', meeting:'🗓', reminder:'⏰', checklist:'☑'};
async function renderInbox(){
  $('ptitle').textContent='کارتابل من';
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const [inb, del, col] = await Promise.all([API.inbox(), API.delegates(), API.colleagues()]);
    const items=inb.items||[];
    $('content').innerHTML=`
    <div class="panel g">
      <div class="phd"><div class="abadge">✉</div><div><h3>در انتظار اقدام شما</h3>
        <div class="sub">${fa(inb.own_count||0)} مورد شخصی${inb.delegated_count?` · ${fa(inb.delegated_count)} مورد به‌عنوان جانشین`:''}</div></div></div>
      <div class="pbody">
        ${!items.length?'<div class="empty"><div class="ei">✓</div>کارتابل شما خالی است</div>':`
        <div class="tbl-wrap"><table><thead><tr><th>نوع</th><th>عنوان</th><th>توضیح</th><th>تاریخ</th><th></th></tr></thead><tbody>
        ${items.map(it=>`<tr>
          <td style="white-space:nowrap">${INBOX_ICON[it.type]||'•'} ${esc(it.type_fa)}</td>
          <td>${esc(it.title||'—')}${it.on_behalf_of?` <span class="bdg b2">به‌جای ${esc(it.on_behalf_of)}</span>`:''}</td>
          <td style="color:var(--td)">${esc(it.detail_label||'')}${it.detail_date?' '+faDateISO(it.detail_date):''}${!it.detail_label&&!it.detail_date?'—':''}</td>
          <td style="white-space:nowrap;color:var(--gdl)">${faDateTime(it.created_at)}</td>
          <td style="white-space:nowrap"><button class="btn btn-sm" onclick="go('${it.page}')">مشاهده</button>
            ${it.type==='reminder'?`<button class="tgl" onclick="reminderDone('${esc(it.dedupe_key)}')" title="این یادآوری دیگر نمایش داده نشود">انجام شد ✓</button>
              <button class="tgl" onclick="reminderSnooze('${esc(it.dedupe_key)}')" title="۷ روز دیگر دوباره یادآوری شود">بعداً ◷</button>`:''}
          </td></tr>`).join('')}
        </tbody></table></div>`}
      </div>
    </div>
    <div class="panel gs">
      <div class="phd"><div class="abadge">⇄</div><div><h3>جانشین من</h3>
        <div class="sub">در بازه‌ی مرخصی/مأموریت، اقلام کارتابل شما برای همکار انتخابی هم دیده می‌شود</div></div></div>
      <div class="pbody">
        ${!(del.delegates||[]).length?'<div class="empty">جانشینی تعریف نشده</div>':`
        <div class="tbl-wrap"><table><thead><tr><th>جانشین</th><th>از</th><th>تا</th><th></th></tr></thead><tbody>
        ${del.delegates.map(d=>`<tr><td>${esc(d.delegate_name)}</td><td style="color:var(--gdl)">${faDateISO(d.starts_at)}</td>
          <td style="color:var(--gdl)">${faDateISO(d.ends_at)}</td>
          <td><button class="btn btn-sm" onclick="removeDelegate('${d.id}')">حذف</button></td></tr>`).join('')}
        </tbody></table></div>`}
        <div style="margin-top:16px;padding:16px 18px;border-radius:12px;background:var(--subpanel);border:1px solid var(--bd)">
          <div style="font-size:12.5px;color:var(--gdl);font-weight:700;margin-bottom:12px">تعیین جانشین جدید</div>
          <div style="display:grid;grid-template-columns:1.6fr 1.4fr 1.4fr;gap:12px">
            <div class="fg"><label>همکار جانشین</label><select id="dg_user" class="sel">
              ${(col.users||[]).map(u=>`<option value="${u.id}">${esc(u.full_name)}${u.department?' — '+esc(u.department):''}</option>`).join('')}</select></div>
            <div class="fg"><label>از تاریخ</label>${jalaliDateInputHtml('dg_from')}</div>
            <div class="fg"><label>تا تاریخ</label>${jalaliDateInputHtml('dg_to')}</div>
          </div>
          <button class="btn btn-g" onclick="addDelegate()">ثبت جانشین</button>
        </div>
        ${(del.delegated_to_me||[]).length?`<div style="margin-top:14px;font-size:12px;color:var(--td)">
          شما جانشین این افراد هستید: ${del.delegated_to_me.map(d=>esc(d.owner_name)+' ('+faDateISO(d.starts_at)+' تا '+faDateISO(d.ends_at)+')').join('، ')}</div>`:''}
      </div>
    </div>`;
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}
// «انجام شد» / «بعداً» روی اقلام یادآوری — بج منو هم بلافاصله به‌روز می‌شود چون
// همان اقلام کارتابل را می‌شمارد
async function reminderDone(key){
  try{ await API.reminderDone(key); toast('یادآوری بسته شد'); renderInbox(); refreshNavBadges(); }
  catch(e){ toast(e.message,true); }
}
async function reminderSnooze(key){
  try{ const r=await API.reminderSnooze(key,7); toast('تا '+faDateISO(r.until)+' یادآوری نمی‌شود'); renderInbox(); refreshNavBadges(); }
  catch(e){ toast(e.message,true); }
}

async function addDelegate(){
  const body={delegate_user_id:$('dg_user').value, starts_at:readJalaliDateInput('dg_from'), ends_at:readJalaliDateInput('dg_to')};
  if(!body.delegate_user_id){ toast('همکاری برای جانشینی انتخاب کنید',true); return; }
  try{ await API.createDelegate(body); toast('جانشین ثبت شد'); renderInbox(); }
  catch(e){ toast(e.message,true); }
}
async function removeDelegate(id){
  try{ await API.deleteDelegate(id); toast('جانشین حذف شد'); renderInbox(); }
  catch(e){ toast(e.message,true); }
}

// ==================== تنظیمات بیمارستان ====================
// همان فیلدهای ویزارد راه‌اندازی اولیه، این‌بار برای ویرایش بعد از تکمیل — تا اطلاعاتی
// که یک‌بار در ویزارد وارد شده در سامانه «قفل» نشود.
const HOSP_TYPES=['عمومی','خصوصی','تخصصی','فوق‌تخصصی','آموزشی-درمانی','بهداشتی-درمانی'];
// ==================== پروفایل من ====================
// صفحه‌ی کوچک شخصی: نمایش نام/نقش/بیمارستان کاربر واردشده + تغییر رمز عبور خودش.
// اطلاعات کاربر از S.user (همان‌که در ورود گرفته شده) — درخواست شبکه‌ی جدید لازم نیست.
function renderProfile(){
  $('ptitle').textContent='پروفایل من';
  const u=S.user||{};
  const initial=(u.full_name||'؟').replace(/^(دکتر|خانم|آقای|مهندس)\s+/,'').charAt(0);
  const avatarHtml=u.avatar_file?`<img src="/api/profile/avatar/${encodeURIComponent(u.avatar_file)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:esc(initial);
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge" style="overflow:hidden;padding:0">${avatarHtml}</div><div><h3>${esc(u.full_name||'')}</h3>
      <div class="sub">${esc(ROLE_FA[u.role_code]||u.role_title||'')} — ${esc(u.hospital_name||'')}</div></div></div>
    <div class="pbody">
      <div class="docgrid">
        <div class="fg"><label>نام و نام‌خانوادگی</label><input value="${esc(u.full_name||'')}" disabled></div>
        <div class="fg"><label>نام کاربری</label><input value="${esc(u.username||'')}" disabled dir="ltr" style="text-align:left"></div>
        <div class="fg"><label>نقش</label><input value="${esc(ROLE_FA[u.role_code]||u.role_title||'')}" disabled></div>
      </div>
    </div>
  </div>
  ${u.profile_fields_enabled?`
  <div class="panel g" style="margin-top:16px">
    <div class="phd"><div class="abadge">◎</div><div><h3>اطلاعات شخصی پروفایل</h3>
      <div class="sub">این اطلاعات اختیاری‌اند و فقط توسط خودتان قابل ویرایش‌اند</div></div></div>
    <div class="pbody">
      <div class="fg"><label>عکس پروفایل</label>
        <input id="pf_avatar" type="file" accept="image/png,image/jpeg,image/webp" onchange="submitAvatarUpload(this.files[0])">
      </div>
      <div class="docgrid">
        <div class="fg"><label>پیشوند احترامی</label><select id="pf_prefix" class="sel">
          <option value="">— بدون پیشوند —</option>
          <option value="خانم"${u.title_prefix==='خانم'?' selected':''}>خانم</option>
          <option value="آقای"${u.title_prefix==='آقای'?' selected':''}>آقای</option>
          <option value="دکتر"${u.title_prefix==='دکتر'?' selected':''}>دکتر</option>
          <option value="مهندس"${u.title_prefix==='مهندس'?' selected':''}>مهندس</option>
          <option value="سرکار خانم"${u.title_prefix==='سرکار خانم'?' selected':''}>سرکار خانم</option>
          <option value="جناب آقای"${u.title_prefix==='جناب آقای'?' selected':''}>جناب آقای</option>
          <option value="استاد"${u.title_prefix==='استاد'?' selected':''}>استاد</option>
        </select></div>
        <div class="fg"><label>جنسیت</label><select id="pf_gender" class="sel">
          <option value="">— تعیین‌نشده —</option>
          <option value="male"${u.gender==='male'?' selected':''}>آقا</option>
          <option value="female"${u.gender==='female'?' selected':''}>خانم</option>
        </select></div>
        <div class="fg"><label>نحوه‌ی تماس ترجیحی</label><input id="pf_contact" maxlength="200" value="${esc(u.contact_method||'')}" placeholder="مثلاً: تلفن داخلی ۱۲۳ یا ایمیل"></div>
      </div>
      <div class="fg"><label>بیو</label><textarea id="pf_bio" maxlength="500" rows="3" style="width:100%;padding:11px 15px;border-radius:10px;background:var(--subpanel-2);border:1px solid var(--bd);color:var(--th)">${esc(u.bio||'')}</textarea></div>
      <button class="btn btn-g" onclick="submitProfileInfo()">ذخیره اطلاعات شخصی</button>
    </div>
  </div>`:''}
  <div class="panel g" style="margin-top:16px">
    <div class="phd"><div class="abadge">⚿</div><div><h3>تغییر رمز عبور</h3>
      <div class="sub">رمز عبور فعلی و رمز جدید خود را وارد کنید</div></div></div>
    <div class="pbody">
      <div class="docgrid">
        <div class="fg"><label>رمز فعلی</label><input id="pf_cur" type="password" dir="ltr" style="text-align:left"></div>
        <div class="fg"><label>رمز جدید</label><input id="pf_new" type="password" dir="ltr" style="text-align:left" minlength="6"></div>
        <div class="fg"><label>تکرار رمز جدید</label><input id="pf_new2" type="password" dir="ltr" style="text-align:left" minlength="6"></div>
      </div>
      <button class="btn btn-g" onclick="submitChangePassword()">ثبت رمز جدید</button>
    </div>
  </div>`;
}
async function submitProfileInfo(){
  const gender=$('pf_gender').value,
        title_prefix=$('pf_prefix')?$('pf_prefix').value:'',
        bio=$('pf_bio').value,
        contact_method=$('pf_contact').value;
  try{
    const {profile}=await API.updateMyProfile({gender, title_prefix, bio, contact_method});
    Object.assign(S.user, profile);
    toast('اطلاعات شخصی ذخیره شد');
    const pt = $('ptitle');
    if(pt && S.page === 'dash') pt.textContent = getUserDashboardTitle();
    const un = document.querySelector('.uchip .un');
    if(un){
      const pfx = getUserTitlePrefix(S.user);
      un.textContent = pfx && !S.user.full_name.startsWith(pfx) ? `${pfx} ${S.user.full_name}` : S.user.full_name;
    }
  }catch(e){ toast(e.message,true); }
}
async function submitAvatarUpload(file){
  if(!file) return;
  try{
    const {avatar_file}=await API.uploadAvatar(file);
    S.user.avatar_file=avatar_file;
    toast('عکس پروفایل به‌روزرسانی شد');
    renderProfile();
  }catch(e){ toast(e.message,true); }
}
async function submitChangePassword(){
  const cur=$('pf_cur').value, n1=$('pf_new').value, n2=$('pf_new2').value;
  if(!cur||!n1){ toast('رمز فعلی و رمز جدید را وارد کنید',true); return; }
  if(n1!==n2){ toast('رمز جدید و تکرار آن یکسان نیستند',true); return; }
  if(n1.length<6){ toast('رمز جدید باید حداقل ۶ کاراکتر باشد',true); return; }
  try{
    await API.changePassword(cur,n1);
    toast('رمز عبور با موفقیت تغییر کرد');
    $('pf_cur').value=''; $('pf_new').value=''; $('pf_new2').value='';
  }catch(e){ toast(e.message,true); }
}


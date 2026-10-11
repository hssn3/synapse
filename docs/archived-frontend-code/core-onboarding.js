/**
 * Core Hospital Onboarding Wizard
 * Modular Frontend Component — Project 313
 */
// ==================== ویزارد راه‌اندازی اولیه (Onboarding) ====================
// سوپرادمین هنگام ساخت بیمارستان فقط نام/کاربر/رمز می‌سازد؛ بقیه‌ی اطلاعات کلیدی را
// مدیر بیمارستان در اولین ورود این‌جا وارد می‌کند. با «بعداً» رد می‌شود ولی چون چیزی
// ذخیره نشده، ورود بعدی دوباره یادآوری می‌شود.
const ONB_STEPS=[
 {t:'معرفی بیمارستان', d:'نوع و ابعاد بیمارستان را مشخص کنید تا گزارش‌ها و سنجه‌ها متناسب تنظیم شوند.'},
 {t:'موقعیت جغرافیایی', d:'استان و شهر محل استقرار بیمارستان را وارد کنید.'},
 {t:'مدیریت و تماس', d:'مسئولان کلیدی و راه‌های ارتباطی را ثبت کنید.'},
 {t:'از کدام سال شروع می‌کنید؟', d:'سالی که از آن به‌طور جدی وارد ثبت داده‌های اعتباربخشی می‌شوید را انتخاب کنید — بر اساس همین سال، یک جدول‌زمانی ساده از کارهای پیشنهادی برای شما و همکارانتان ساخته می‌شود.'},
];
// فیلدهای هر گام: [id عنصر, نام فیلد سرور] — همین نگاشت هم برای رندر و هم برای
// جمع‌آوری مقدارها استفاده می‌شود تا از هم جدا نیفتند.
const ONB_FIELDS=[
 [['ob_type','hospital_type'],['ob_beds','beds_count'],['ob_year','established_year']],
 [['ob_prov','province'],['ob_city','city'],['ob_web','website']],
 [['ob_ceo','ceo_name'],['ob_qm','quality_manager_name'],['ob_phone','phone']],
 [['ob_start_year','start_year']],
];
const ONB_REQUIRED=['hospital_type','beds_count','province','city','ceo_name'];
let onbStep=0;
// مقادیر واردشده این‌جا نگهداری می‌شوند چون بدنه‌ی هر گام دوباره رندر می‌شود و
// عناصر گام قبلی از DOM حذف می‌شوند (اگر مستقیم از DOM می‌خواندیم، با رفتن به گام
// بعد همه‌چیز خالی می‌شد و فقط گام آخر ذخیره می‌شد).
let onbData={};
function onbCapture(){
  (ONB_FIELDS[onbStep]||[]).forEach(([id,f])=>{ const el=$(id); if(el) onbData[f]=(el.value||'').trim(); });
}
// prof: پروفایل موجود (اگر باشد). بدون این، ویزارد همیشه خالی باز می‌شد — چه وقتی
// پروفایل نیمه‌کاره بود و چه وقتی از «تنظیمات» دوباره باز می‌شد — و اعتبارسنجی
// فیلدهای الزامی هم مقدارهای قبلاً ذخیره‌شده را نمی‌دید و بی‌خود خطا می‌داد.
function renderOnboarding(prof){
  // اولین ورودِ یک بیمارستان جدید هر دو را با هم باز می‌کرد: تور گام‌به‌گام و ویزارد،
  // دو پوشش روی هم. راه‌اندازی اولیه مقدم است؛ تور بعداً از منو در دسترس است.
  closeTour();
  onbStep=0; onbData={};
  if(prof) ONB_FIELDS.flat().forEach(([,f])=>{ if(prof[f]!=null&&prof[f]!=='') onbData[f]=String(prof[f]); });
  $('root').insertAdjacentHTML('beforeend',`
  <div class="ovl" id="onbOvl">
    <div class="ocard g">
      <div class="obody">
        <div class="oeb">✦ راه‌اندازی اولیه · ${esc(S.user?.hospital_name||'')}</div>
        <h2 id="onbTitle"></h2>
        <p id="onbDesc" style="margin-bottom:18px"></p>
        <div id="onbBody"></div>
      </div>
      <div class="odots" id="onbDots"></div>
      <div class="ofoot">
        <button class="btn btn-o btn-sm" id="onbPrev" onclick="onbNav(-1)">‹ قبلی</button>
        <div style="display:flex;gap:8px">
          <button class="btn btn-o btn-sm" onclick="closeOnboarding()">بعداً</button>
          <button class="btn btn-g btn-sm" id="onbNext" onclick="onbNav(1)">بعدی ›</button>
        </div>
      </div>
    </div>
  </div>`);
  onbDraw();
}
function onbDraw(){
  const st=ONB_STEPS[onbStep], v=f=>esc(onbData[f]||'');
  $('onbTitle').textContent=`گام ${fa(onbStep+1)} از ${fa(ONB_STEPS.length)} — ${st.t}`;
  $('onbDesc').textContent=st.d;
  $('onbDots').innerHTML=ONB_STEPS.map((_,i)=>`<i class="${i===onbStep?'on':''}"></i>`).join('');
  $('onbPrev').style.visibility=onbStep===0?'hidden':'visible';
  $('onbNext').textContent=onbStep===ONB_STEPS.length-1?'ثبت و شروع کار ✓':'بعدی ›';
  const TYPES=['عمومی','خصوصی','تخصصی','فوق‌تخصصی','آموزشی-درمانی','بهداشتی-درمانی'];
  $('onbBody').innerHTML = onbStep===0 ? `
    <div class="fg"><label>نوع بیمارستان</label><select id="ob_type">
      <option value="">— انتخاب کنید —</option>
      ${TYPES.map(t=>`<option${onbData.hospital_type===t?' selected':''}>${t}</option>`).join('')}
    </select></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="fg"><label>تعداد تخت فعال</label><input id="ob_beds" type="number" min="0" max="100000" value="${v('beds_count')}" placeholder="مثلاً ۲۵۰"></div>
      <div class="fg"><label>سال تأسیس (اختیاری)</label><input id="ob_year" type="number" min="1300" max="1500" value="${v('established_year')}" placeholder="مثلاً ۱۳۹۰"></div>
    </div>`
  : onbStep===1 ? `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="fg"><label>استان</label><input id="ob_prov" value="${v('province')}" placeholder="مثلاً تهران"></div>
      <div class="fg"><label>شهر</label><input id="ob_city" value="${v('city')}" placeholder="مثلاً تهران"></div>
    </div>
    <div class="fg"><label>وب‌سایت (اختیاری)</label><input id="ob_web" dir="ltr" style="text-align:left" value="${v('website')}" placeholder="https://…"></div>`
  : onbStep===2 ? `
    <div class="fg"><label>رئیس بیمارستان</label><input id="ob_ceo" value="${v('ceo_name')}" placeholder="نام و نام خانوادگی"></div>
    <div class="fg"><label>مدیر بهبود کیفیت (اختیاری)</label><input id="ob_qm" value="${v('quality_manager_name')}" placeholder="نام و نام خانوادگی"></div>
    <div class="fg"><label>تلفن تماس (اختیاری)</label><input id="ob_phone" dir="ltr" style="text-align:left" value="${v('phone')}" placeholder="۰۲۱-XXXXXXX"></div>`
  : (()=>{
      const cur=todayJalali().jy;
      let opts='<option value="">— انتخاب کنید —</option>';
      for(let y=cur;y>=cur-5;y--) opts+=`<option value="${y}"${onbData.start_year==String(y)?' selected':''}>${fa(y)}</option>`;
      return `<div class="fg"><label>سال شروع فعال کار اعتباربخشی</label><select id="ob_start_year">${opts}</select></div>
      <p style="font-size:12px;color:var(--td);margin-top:6px">امروز به تقویم شمسی: ${fa(todayJalali().jd)} ${JMONTHS_FA[todayJalali().jm-1]} ${fa(cur)}</p>`;
    })();
}
async function onbNav(delta){
  onbCapture();                                  // پیش از تعویض گام، مقدارها را نگه دار
  if(delta>0 && onbStep===ONB_STEPS.length-1){ await onbSave(); return; }
  onbStep=Math.min(ONB_STEPS.length-1, Math.max(0, onbStep+delta));
  onbDraw();
}
function closeOnboarding(){ const o=$('onbOvl'); if(o) o.remove(); }
async function onbSave(){
  const miss=ONB_REQUIRED.filter(f=>!onbData[f]);
  if(miss.length){ toast('برای تکمیل، فیلدهای الزامی گام‌های قبل را پر کنید', true); return; }
  const btn=$('onbNext'); btn.disabled=true; btn.textContent='در حال ثبت…';
  try{
    const { start_year, ...profileFields } = onbData;
    await API.saveHospitalProfile(profileFields);
    // سال شروع، فیلد پروفایل بیمارستان نیست — روی «دوره‌ی سراسری اعتباربخشی» ذخیره می‌شود
    // تا src/services/guide-timeline.js جدول‌زمانی را از همان‌جا بسازد
    if(start_year) await API.saveAccreditationPeriod({ start_year }).catch(()=>{});
    toast('اطلاعات بیمارستان ثبت شد — به سامانه خوش آمدید ✦');
    closeOnboarding();
    if(S.page==='settings') renderSettings();   // مقدارهای تازه در فرم تنظیمات دیده شوند
    renderGuideWidget();
  }catch(e){
    btn.disabled=false; btn.textContent='ثبت و شروع کار ✓';
    toast('خطا: '+e.message, true);
  }
}

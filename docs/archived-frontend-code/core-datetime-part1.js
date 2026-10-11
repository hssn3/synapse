/**
 * Core Tehran Timezone & Jalali Math
 * Modular Frontend Component — Project 313
 */
// ============ منطقه‌ی زمانی تهران (Asia/Tehran, UTC+3:30) ============
// قرارداد ذخیره‌سازی: همه‌ی مُهرهای زمانی در دیتابیس UTC هستند — چه
// `new Date().toISOString()` («2026-08-14T14:55:01.123Z») و چه SQLite
// `datetime('now')` («2026-08-14 14:55:01»، بدون Z ولی باز هم UTC).
// قرارداد نمایش: هیچ‌جا UTC خام نشان داده نمی‌شود؛ همیشه از این توابع رد می‌شود.
// ایران از ۱۴۰۱ تغییر ساعت تابستانی ندارد، پس افست ثابت +۳:۳۰ درست است.
const TEHRAN_OFFSET_MS = 3.5*3600000;

// ---- هم‌زمانی با ساعتِ سرور ----
// ساعتِ دستگاهِ کاربر قابل اعتماد نیست: یک ویندوزِ بدونِ همگام‌سازی می‌تواند روزها
// جلو/عقب باشد و آن‌وقت «امروز»، پیش‌فرضِ تاریخ‌گزین‌ها و شمارش معکوسِ مهلت‌ها همه
// غلط می‌شوند. پس یک‌بار در بوت، اختلافِ ساعتِ ما با سرور را می‌گیریم و از آن به بعد
// هر «حالا» با همین اختلاف تصحیح می‌شود (بدون رفت‌وبرگشت شبکه در هر فراخوانی).
let SRV_SKEW_MS = 0;      // serverNow - clientNow ؛ صفر یعنی هنوز/هرگز همگام نشده
let SRV_SYNCED = false;
async function syncServerTime(){
  try{
    const t0=Date.now();
    const r=await fetch('/api/server-time',{cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const d=await r.json();
    const t1=Date.now();
    const srv=Date.parse(d.utc);
    if(!isFinite(srv)) throw new Error('پاسخ نامعتبر');
    // نیمی از زمانِ رفت‌وبرگشت را جبران می‌کنیم تا تأخیر شبکه به‌حساب انحراف گذاشته نشود
    SRV_SKEW_MS = srv - (t0 + (t1-t0)/2);
    SRV_SYNCED = true;
    if(Math.abs(SRV_SKEW_MS)>120000)
      console.warn('[زمان] ساعت این دستگاه '+Math.round(SRV_SKEW_MS/60000)+' دقیقه با سرور اختلاف دارد؛ تصحیح شد.');
    return true;
  }catch(e){
    // شکست همگام‌سازی نباید برنامه را بشکند — به ساعت خام دستگاه برمی‌گردیم
    console.warn('[زمان] همگام‌سازی با ساعت سرور ناموفق بود؛ فعلاً از ساعت همین دستگاه استفاده می‌شود:', e.message);
    return false;
  }
}
// هر ۴۵ دقیقه یک‌بار تازه‌سازی — نه پایش دائم، فقط جلوگیری از دررفتنِ تدریجی ساعت
function startServerTimeSync(){
  if(!startServerTimeSync._t) startServerTimeSync._t=setInterval(syncServerTime, 45*60*1000);
}
// «حالا»ی واقعی (UTC) — ساعتِ دستگاه، تصحیح‌شده با اختلافِ سرور
function nowMs(){ return Date.now()+SRV_SKEW_MS; }

// «حالا» به وقت تهران — به‌شکل Date‌ای که گِتِرهای UTC آن ساعتِ دیواری تهران را می‌دهند
function tehranNow(){ return new Date(nowMs()+TEHRAN_OFFSET_MS); }
// امروز به وقت تهران، به‌صورت YYYY-MM-DD میلادی (برای مقایسه با ستون‌های تاریخِ دیتابیس)
function todayISO(){ return tehranNow().toISOString().slice(0,10); }
function todayJalali(){ const t=tehranNow(); return toJalali(t.getUTCFullYear(),t.getUTCMonth()+1,t.getUTCDate()); }

// یک رشته‌ی تاریخ/زمان را می‌شکافد.
// - «YYYY-MM-DD» تاریخِ تقویمی است (تاریخ ابلاغ، تاریخ جلسه، …) و نباید جابه‌جا شود.
// - هرچه جزء ساعت دارد یک مُهر زمانیِ UTC است و به وقت تهران منتقل می‌شود.
function parseStamp(s){
  const str=String(s||'');
  const t=/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(str);
  if(t){
    const d=new Date(Date.UTC(+t[1],+t[2]-1,+t[3],+t[4],+t[5],+t[6]||0)+TEHRAN_OFFSET_MS);
    return {...toJalali(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate()),
      hh:d.getUTCHours(), mi:d.getUTCMinutes(), hasTime:true};
  }
  const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if(!m) return null;
  return {...toJalali(+m[1],+m[2],+m[3]), hh:0, mi:0, hasTime:false};
}
const jStr = j => fa(j.jy)+'/'+fa(String(j.jm).padStart(2,'0'))+'/'+fa(String(j.jd).padStart(2,'0'));

// تاریخ شمسی خوانا. مُهرهای زمانیِ UTC خودکار به تاریخِ تهران تبدیل می‌شوند
// (یعنی «۲۰۲۶-۰۸-۱۴T۲۱:۳۰Z» روزِ بعد را نشان می‌دهد، همان‌طور که در تهران هست).
// نوار تاریخ‌های ثابتِ زیر سربرگ — در همه‌ی فرم‌ها یکسان است (خواسته‌ی کاربر).
// «بازنگری بعدی» اگر روی سند ثبت نشده باشد، خودکار یک سال شمسی بعد از آخرین
// ویرایش (یا تاریخ ایجاد) حساب می‌شود — قاعده‌ی رایج اسناد کنترل‌شده.
function nextReviewISO(d){
  if(d && d.review_date) return d.review_date;
  const base = (d && (d.updated_at || d.issue_date || d.prepared_date || d.created_at)) || null;
  if(!base) return null;
  const j = parseStamp(base); if(!j) return null;
  // ۳۰ اسفند فقط در سال کبیسه هست؛ برای امنیت به ۲۹ محدود می‌شود.
  const day = (j.jm === 12 && j.jd > 29) ? 29 : j.jd;
  const gg = toGregorian(j.jy + 1, j.jm, day);
  return gg.gy + '-' + String(gg.gm).padStart(2,'0') + '-' + String(gg.gd).padStart(2,'0');
}
// ---- سربرگی که در چاپ روی «هر» صفحه تکرار می‌شود ----
// کاربر گزارش داد سربرگ فقط روی صفحه‌ی اول چاپ می‌افتد. علتش ساده است: سربرگ
// یک <div> در جریان عادی صفحه بود و مثل هر بلوک دیگری فقط یک‌بار چاپ می‌شود.
// تنها ساختاری که مرورگرها واقعاً روی هر صفحه‌ی کاغذ تکرار می‌کنند
// <thead> یک جدول است (position:fixed در کروم فقط صفحه‌ی اول را می‌گیرد و
// margin box های @page هم پشتیبانی کاملی ندارند).
// پس محتوای قابل‌چاپ داخل یک جدول تک‌ستونه می‌رود: سربرگ در thead، محتوا در
// tbody، و پانویس در tfoot. روی نمایشگر همه‌ی این‌ها با display:block دقیقاً
// مثل قبل چیده می‌شوند — یعنی ظاهر صفحه تغییری نمی‌کند و فقط چاپ درست می‌شود.
function docLetterhead(subtitle){
  // تصویر لوگو فقط وقتی درخواست می‌شود که سرور گفته باشد بیمارستان لوگو دارد
  // (hospital_has_logo در /me و /session). قبلاً این تصویر بی‌قید درخواست می‌شد و برای
  // بیمارستانِ بدونِ‌لوگو هر صفحه‌ی چاپی یک ۴۰۴ در کنسول مرورگر می‌گذاشت؛ رویه‌ی فعلی
  // (نبودِ تصویر = حالتی که onerror با remove() می‌ساخت) عیناً حفظ می‌شود.
  const logo = (S.user && S.user.hospital_has_logo) ? '<img src="/api/hospital/logo" alt="" onerror="this.remove()">' : '';
  return `<div class="docletterhead">
    ${logo}
    <div><b>${esc((S.user&&S.user.hospital_name)||'')}</b>
      <span>${subtitle||''}</span></div>
  </div>`;
}
// bodyHtml داخل tbody می‌نشیند؛ head و foot روی هر صفحه‌ی کاغذ تکرار می‌شوند.
function printSheet(subtitle, bodyHtml, footNote){
  return `<table class="psheet">
    <thead><tr><td>${docLetterhead(subtitle)}</td></tr></thead>
    <tbody><tr><td>${bodyHtml}</td></tr></tbody>
    <tfoot><tr><td><div class="psheet-foot">
      <span>${esc((S.user&&S.user.hospital_name)||'')}</span>
      <span>${esc(footNote||'')}</span>
    </div></td></tr></tfoot>
  </table>`;
}

// ============ گزینه‌های استاندارد شماره ویرایش اسناد (نسخه اولیه تا ویرایش ۲۰) ============
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
}
// محتوای فیلدهای متنیِ سند ممکن است HTML باشد (ویرایشگر شبیه ورد) یا متن ساده
// (رکوردهای قدیمی و seed). هر دو باید درست دیده شوند:
//  • HTML قبل از درج، با همان allow-list ویرایشگر پاک‌سازی می‌شود؛
//  • متن ساده مثل قبل escape می‌شود و فقط خطوطش حفظ می‌شود.
// هرگز innerHTML خام از دیتابیس درج نمی‌شود.
function docHtml(v){
  const raw = String(v == null ? '' : v);
  if(!raw.trim()) return '—';
  const looksHtml = /<(p|div|table|ul|ol|h[1-4]|br|span|strong|b|em|i)\b/i.test(raw);
  if(looksHtml && window.RichEditor) return `<div class="re-out">${RichEditor.sanitize(raw)}</div>`;
  return `<div class="re-out" style="white-space:pre-wrap">${esc(raw)}</div>`;
}
function faDateISO(iso){
  if(!iso) return '—';
  const j=parseStamp(iso); if(!j) return esc(String(iso));
  return jStr(j);
}
// تاریخ شمسی + ساعتِ تهران. برای created_at/submitted_at/signed_at و هر مُهر زمانی
function faDateTime(iso){
  if(!iso) return '—';
  const j=parseStamp(iso); if(!j) return esc(String(iso));
  if(!j.hasTime) return jStr(j);
  return jStr(j)+' ساعت '+fa(String(j.hh).padStart(2,'0'))+':'+fa(String(j.mi).padStart(2,'0'));
}
// فاصله‌ی زمانی نسبت به «حالا»ی تهران — «۲ ساعت پیش»، «دیروز»، …
function faSince(iso){
  const str=String(iso||'');
  const t=/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(str);
  if(!t) return faDateISO(iso);
  const diff=nowMs()-Date.UTC(+t[1],+t[2]-1,+t[3],+t[4],+t[5],+t[6]||0);
  if(diff<0) return faDateTime(iso);
  const min=Math.floor(diff/60000);
  if(min<1) return 'همین حالا';
  if(min<60) return fa(min)+' دقیقه پیش';
  const hr=Math.floor(min/60);
  if(hr<24) return fa(hr)+' ساعت پیش';
  const day=Math.floor(hr/24);
  if(day===1) return 'دیروز';
  if(day<7) return fa(day)+' روز پیش';
  return faDateTime(iso);
}
function jalaliDaysInMonth(jy,jm){
  if(jm<=6) return 31;
  if(jm<=11) return 30;
  return jalCal(jy).leap===0 ? 30 : 29;
}

const MIN_JYEAR=1395;
const MAX_JYEAR=1406;
function initialYear(){
  const cur=todayJalali().jy;
  const saved=+localStorage.getItem('sel_year');
  if(saved && saved>=MIN_JYEAR && saved<=cur+1) return saved;
  return cur;
}
let S = { user:null, page:'acc', axis:null, openSec:null, tree:null, byId:{}, sections:[], statusMap:{}, notesMap:{}, naMap:{}, revMap:{}, evalMap:{}, levelW:{1:1,2:1,3:1}, year:initialYear(), features:null };
window.S = S;
function yearSelectHtml(){
  const cur=todayJalali().jy;
  let opts='';
  for(let y=cur+1; y>=MIN_JYEAR; y--) opts+=`<option value="${y}" ${y===S.year?'selected':''}>${fa(y)}</option>`;
  return `<select onchange="setYear(this.value)">${opts}</select>`;
}
// وضعیت سنجه‌ها دوره‌ای است، پس با عوض شدن سال باید دوباره از سرور خوانده
// شود — وگرنه نقشه‌ی وضعیتِ سالِ قبلی روی صفحه‌ی سال جدید می‌ماند و کاربر
// خودارزیابیِ یک دوره را به اسم دوره‌ی دیگر می‌بیند.
async function setYear(v){
  S.year=+v; localStorage.setItem('sel_year', v);
  S.statusMap={}; S.notesMap={}; S.naMap={}; S.revMap={};
  try{
    const st=await API.statuses();
    (st.statuses||[]).forEach(x=>{ S.statusMap[x.measure_id]=x.status;
      if(x.notes) S.notesMap[x.measure_id]=x.notes;
      if(x.na_reason) S.naMap[x.measure_id]=x.na_reason;
      if(x.internal_status||x.external_status)
        S.revMap[x.measure_id]={i:x.internal_status||'', e:x.external_status||''}; });
  }catch(e){ /* اگر نشد، نقشه خالی می‌ماند: «بررسی‌نشده» — نه دادهٔ سال دیگر */ }
  toast('سال '+fa(v)+' انتخاب شد');
  go(S.page);
}

function toast(t, err){
  const d=document.createElement('div'); d.className='toast'; d.textContent=t;
  if(err) d.style.borderColor='var(--dn)', d.style.color='var(--dn)';
  document.body.appendChild(d); setTimeout(()=>d.remove(),2400);
}

// ---------- تفکیک راهنما از متن رسمی کتاب ----------
const BULLET='\uf076';
const TEXT_FIX=[['صالحیت','صلاحیت'],['صالح','صلاح'],['تملیل','تحلیل'],['اصالحی','اصلاحی'],['اطالع','اطلاع'],
['ممهدود','محدود'],['ممدودیت','محدودیت'],['ممدود','محدود'],['ممتوا','محتوا'],['مملول','محلول'],
['تسهیالت','تسهیلات'],['عروری','ضروری'],['عرایب','ضرایب'],['وععیت','وضعیت'],['پا سازی','پاکسازی'],
['عدعفونی','ضدعفونی'],['ترشمات','ترشحات'],['لماظ','لحاظ'],['مالحظه','ملاحظه'],['اصالح','اصلاح'],
['سالمت','سلامت'],['اسالمی','اسلامی'],['بهداشهت','بهداشت'],['مموری','محوری'],['عمن ','ضمن '],
['پرسهتاری','پرستاری'],['مشهارکت','مشارکت'],['سهوپروایزر','سوپروایزر'],['آموزشهی','آموزشی'],
['مههارت','مهارت'],['برنامهه','برنامه'],['بکهارگیری','بکارگیری'],['تعیهین','تعیین'],
// خطای رایج OCR کتاب: لیگاتور «لا» به‌صورت «ال» استخراج شده. هر جفت روی کل متن
// کتاب صحت‌سنجی شده تا واژه درستی مثل «بالینی/انتقال/فعال/سال» را خراب نکند.
['الزم','لازم'],['ابالغ','ابلاغ'],['اخالق','اخلاق'],['مسئوال','مسئولا'],['باال','بالا'],
['بالیا','بلایا'],['مشکالت','مشکلات'],['مداخالت','مداخلات'],['اقالم','اقلام'],
['عالئم','علائم'],['عالیم','علایم'],['مالقات','ملاقات'],['اختالل','اختلال'],
['عالوه','علاوه'],['مالحظات','ملاحظات'],['فرموالری','فرمولاری'],['بالفاصله','بلافاصله'],
['خالصه','خلاصه'],['مبتال','مبتلا'],['دالیل','دلایل'],['اتصاالت','اتصالات'],
['معموال','معمولا'],['تعامالت','تعاملات'],['اعالم','اعلام'],['اطالق','اطلاق'],['کاال','کالا']];

function fixText(t){
  if(!t) return '';
  let s=t; TEXT_FIX.forEach(([a,b])=>{ s=s.split(a).join(b); });
  return s.replace(/\s+/g,' ').trim();
}
const EXPL=/(?:^|\s)((?:منظور از|مقصود|مالک ارزیابی|ملاک ارزیابی|توجه|تبصره|این استاندارد|مستندات|شواهد)\b[\s\S]*)$/;

function parseGuide(raw){
  if(!raw) return {acts:[], note:''};
  let s=raw.split('\uf0a7').join(BULLET).split('\uf0b7').join(BULLET);
  if(s.indexOf(BULLET)===-1) return {acts:[], note:fixText(s)};
  const segs=s.split(BULLET).map(x=>x.trim()).filter(Boolean);
  const acts=[]; let note='';
  segs.forEach((seg,i)=>{
    if(i===segs.length-1 && seg.length>200){
      const m=EXPL.exec(seg);
      if(m){ acts.push(fixText(seg.slice(0,m.index))); note=fixText(m[1]); return; }
      let sp=null; const re=/\.\s+/g; let mm;
      while((mm=re.exec(seg))){ if(seg.length-re.lastIndex>=80){ sp=re.lastIndex; break; } }
      if(sp){ acts.push(fixText(seg.slice(0,sp))); note=fixText(seg.slice(sp)); }
      else note=fixText(seg);
    } else acts.push(fixText(seg));
  });

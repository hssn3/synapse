/* ==========================================================================
 * ماژول جامع مدیریت ارتباط با مراجعین سلامت (Healthcare CRM)
 * ردیابی سفر بیمار، سامانه شکایات منشور حقوق بیمار، پیامک و سنجش رضایت (CSAT & NPS)
 * ========================================================================== */

const crmSentimentBadge = (r) => {
  const map = {
    positive: '<span class="chip" style="background:rgba(0,229,153,.15);color:#00e599;border:1px solid rgba(0,229,153,.3)">رضایت‌بخش 😊</span>',
    neutral: '<span class="chip" style="background:rgba(212,175,90,.15);color:#d4af5a;border:1px solid rgba(212,175,90,.3)">متوسط 😐</span>',
    negative: '<span class="chip" style="background:rgba(255,56,96,.15);color:#ff3860;border:1px solid rgba(255,56,96,.3)">ناراضی ⚠️</span>'
  };
  return map[r.sentiment] || '<span class="chip">—</span>';
};

const crmStageBadge = (r) => {
  const map = {
    admission: '<span class="chip" style="background:rgba(94,194,230,.15);color:#5ec2e6">پذیرش</span>',
    inpatient: '<span class="chip" style="background:rgba(63,191,143,.15);color:#3fbf8f">بستری در بخش</span>',
    discharged: '<span class="chip" style="background:rgba(141,107,255,.15);color:#8d6bff">ترخیص‌شده</span>',
    followup_pending: '<span class="chip" style="background:rgba(224,143,60,.15);color:#e08f3c">نیازمند تماس پیگیری</span>',
    followup_completed: '<span class="chip" style="background:rgba(0,229,153,.15);color:#00e599">پیگیری انجام شد</span>'
  };
  return map[r.journey_stage] || esc(r.journey_stage);
};

const crmTicketStatusBadge = (r) => {
  const map = {
    new: '<span class="chip" style="background:rgba(255,56,96,.15);color:#ff3860">جدید</span>',
    under_investigation: '<span class="chip" style="background:rgba(224,143,60,.15);color:#e08f3c">در حال بررسی</span>',
    capa_assigned: '<span class="chip" style="background:rgba(141,107,255,.15);color:#8d6bff">اقدام اصلاحی صادر شد</span>',
    resolved: '<span class="chip" style="background:rgba(0,229,153,.15);color:#00e599">پاسخ داده شده</span>',
    closed: '<span class="chip" style="background:rgba(127,127,127,.15);color:var(--mut)">مختومه</span>'
  };
  return map[r.status] || esc(r.status);
};

const crmSeverityBadge = (r) => {
  const map = {
    low: '<span class="chip" style="color:#3fbf8f">عادی</span>',
    medium: '<span class="chip" style="color:#d4af5a">متوسط</span>',
    high: '<span class="chip" style="color:#e08f3c">فوری</span>',
    critical: '<span class="chip" style="color:#ff3860;font-weight:700">بحرانی</span>'
  };
  return map[r.severity] || esc(r.severity);
};

RPG.define({
  key: 'crm',
  title: 'مدیریت ارتباط با مراجعین (CRM سلامت)',
  sub: 'ردیابی سفر بیمار، رسیدگی به شکایات منشور حقوق بیمار، پیامک و پایش رضایت CSAT / NPS',
  icon: '🤝',
  perms: ['view_crm', 'manage_crm'],
  tabs: [
    ['dash', 'داشبورد مدیریتی CRM'],
    ['patients', 'سفر مراجعین و ترخیص'],
    ['tickets', 'شکایات و حقوق بیمار'],
    ['notifications', 'پیامک و اطلاع‌رسانی خودکار']
  ],
  dashboard: (d, key) => {
    if (!d) return '<div class="empty">داده‌ای یافت نشد</div>';
    const csatPct = Math.round((d.csat_score / 5) * 100);
    const npsColor = d.nps_score >= 50 ? '#00e599' : (d.nps_score >= 0 ? '#d4af5a' : '#ff3860');

    return `
      <div class="kpi-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin-bottom:20px">
        <!-- CSAT Card -->
        <div class="panel g" style="padding:18px;border-radius:14px;background:rgba(18,24,38,0.7);backdrop-filter:blur(10px);border:1px solid rgba(0,240,255,0.2)">
          <div style="font-size:12px;color:var(--td);margin-bottom:6px">شاخص رضایت مراجعین (CSAT)</div>
          <div style="display:flex;align-items:baseline;justify-content:space-between">
            <span style="font-size:32px;font-weight:900;color:#00f0ff">${fa(d.csat_score)} <span style="font-size:14px;color:var(--mut)">/ ۵</span></span>
            <span class="chip" style="background:rgba(0,240,255,.12);color:#00f0ff;font-weight:700">${fa(csatPct)}٪</span>
          </div>
          <div class="bar" style="height:6px;margin-top:10px;background:rgba(255,255,255,0.06);border-radius:4px"><i style="background:#00f0ff;width:${csatPct}%"></i></div>
          <div style="font-size:11px;color:var(--mut);margin-top:6px">${fa(d.surveys_count)} نظرسنجی ثبت‌شده</div>
        </div>

        <!-- NPS Card -->
        <div class="panel g" style="padding:18px;border-radius:14px;background:rgba(18,24,38,0.7);backdrop-filter:blur(10px);border:1px solid rgba(0,229,153,0.2)">
          <div style="font-size:12px;color:var(--td);margin-bottom:6px">شاخص خالص ترویج‌کنندگان (NPS)</div>
          <div style="display:flex;align-items:baseline;justify-content:space-between">
            <span style="font-size:32px;font-weight:900;color:${npsColor}">+${fa(d.nps_score)}</span>
            <span class="chip" style="background:rgba(0,229,153,.12);color:#00e599;font-weight:700">عالی (World Class)</span>
          </div>
          <div class="bar" style="height:6px;margin-top:10px;background:rgba(255,255,255,0.06);border-radius:4px"><i style="background:#00e599;width:${Math.max(10, Math.min(100, d.nps_score))}%"></i></div>
          <div style="font-size:11px;color:var(--mut);margin-top:6px">نرخ وفاداری و معرفی مرکز به دیگران</div>
        </div>

        <!-- Inpatients & Journeys -->
        <div class="panel g" style="padding:18px;border-radius:14px;background:rgba(18,24,38,0.7);backdrop-filter:blur(10px);border:1px solid rgba(212,175,90,0.2)">
          <div style="font-size:12px;color:var(--td);margin-bottom:6px">بستری فعال در بخش‌ها</div>
          <div style="display:flex;align-items:baseline;justify-content:space-between">
            <span style="font-size:32px;font-weight:900;color:#d4af5a">${fa(d.active_inpatients)}</span>
            <span class="chip" style="background:rgba(212,175,90,.12);color:#d4af5a">از ${fa(d.total_patients)} پرونده</span>
          </div>
          <div style="font-size:12px;color:var(--td);margin-top:12px">
            پیگیری ترخیص معوق: <b style="color:#e08f3c">${fa(d.followups_pending)}</b> مورد
          </div>
        </div>

        <!-- Complaints & Rights -->
        <div class="panel g" style="padding:18px;border-radius:14px;background:rgba(18,24,38,0.7);backdrop-filter:blur(10px);border:1px solid rgba(255,56,96,0.2)">
          <div style="font-size:12px;color:var(--td);margin-bottom:6px">شکایات و حقوق بیمار</div>
          <div style="display:flex;align-items:baseline;justify-content:space-between">
            <span style="font-size:32px;font-weight:900;color:#ff3860">${fa(d.open_tickets)}</span>
            <span class="chip" style="background:rgba(0,229,153,.12);color:#00e599">${fa(d.resolved_tickets)} پاسخ‌داده</span>
          </div>
          <div style="font-size:12px;color:var(--td);margin-top:12px">
            شکایات با اولویت فوری/بحرانی: <b style="color:#ff3860">${fa(d.critical_tickets)}</b>
          </div>
        </div>
      </div>

      <!-- Quick Action Toolbar -->
      <div class="panel g" style="padding:14px 18px;margin-bottom:20px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;border-radius:14px;background:rgba(26,32,48,0.5)">
        <b style="color:var(--th);font-size:13px">اقدامات سریع CRM:</b>
        <button type="button" class="btn-g" style="padding:8px 16px;border-radius:10px;font-size:12px;cursor:pointer" onclick="RPG.go('${key}','patients');RPG.edit('${key}','')">+ ثبت سفر بیمار جدید</button>
        <button type="button" class="tgl gold" style="padding:8px 16px;border-radius:10px;font-size:12px;cursor:pointer" onclick="RPG.go('${key}','tickets');RPG.edit('${key}','')">+ ثبت تیکت / شکایت مراجع</button>
        <button type="button" class="tgl" style="padding:8px 16px;border-radius:10px;font-size:12px;cursor:pointer" onclick="crmOpenSendSmsModal()">📱 ارسال سریع پیامک اطلاع‌رسانی / مراقبت ترخیص</button>
        <button type="button" class="tgl" style="padding:8px 16px;border-radius:10px;font-size:12px;cursor:pointer" onclick="go('satisfaction')">📊 مشاهده جزئیات نتایج نظرسنجی بیمار</button>
      </div>

      <!-- 2 Columns: Rights Breakdown & Recent Activity -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px">
        <!-- Charter of Patient Rights Analysis -->
        <div class="panel g" style="border-radius:14px">
          <div class="phd"><b>تحلیل شکایات بر اساس ۵ محور منشور حقوق بیمار</b></div>
          <div class="pbody" style="padding:16px">
            ${(d.rights_breakdown && d.rights_breakdown.length) ? d.rights_breakdown.map(rb => `
              <div style="margin-bottom:12px">
                <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px">
                  <span>${esc(rb.domain)}</span>
                  <b style="color:#00f0ff">${fa(rb.count)} مورد</b>
                </div>
                <div class="bar" style="height:6px"><i style="background:linear-gradient(90deg,#00f0ff,#00e599);width:${Math.min(100, rb.count * 25)}%"></i></div>
              </div>
            `).join('') : '<div class="empty">شکایتی ثبت نشده است</div>'}
          </div>
        </div>

        <!-- Recent Tickets & Followups -->
        <div class="panel g" style="border-radius:14px">
          <div class="phd"><b>آخرین تیکت‌های مراجعین و شکایات</b></div>
          <div class="pbody" style="padding:16px">
            ${(d.recent_tickets && d.recent_tickets.length) ? `
              <div style="display:flex;flex-direction:column;gap:10px">
                ${d.recent_tickets.map(t => `
                  <div style="padding:10px 14px;background:rgba(255,255,255,0.03);border-radius:10px;border-right:3px solid ${t.severity==='critical'?'#ff3860':(t.severity==='high'?'#e08f3c':'#3fbf8f')}">
                    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
                      <b style="color:var(--th)">${esc(t.title)}</b>
                      ${crmTicketStatusBadge(t)}
                    </div>
                    <div style="font-size:11.5px;color:var(--mut)">بیمار: ${esc(t.patient_name||'ناشناس')} | بخش: ${esc(t.ward||'—')} | کد: ${esc(t.tracking_code)}</div>
                  </div>
                `).join('')}
              </div>
            ` : '<div class="empty">موردی ثبت نشده است</div>'}
          </div>
        </div>
      </div>
    `;
  },
  spec: {
    patients: {
      title: 'پرونده سفر مراجعین و ترخیص', icon: '👤',
      sub: 'ردیابی مسیر مراقبت بیمار از پذیرش تا پیگیری ۳ و ۷ روز پس از ترخیص',
      fields: [
        { k: 'patient_name', l: 'نام و نام خانوادگی بیمار *', t: 'text', list: 1 },
        { k: 'national_id', l: 'کد ملی', t: 'text', maxlength: 10, inputmode: 'numeric' },
        { k: 'phone', l: 'شماره تماس همراه *', t: 'text', list: 1, maxlength: 15, inputmode: 'tel' },
        { k: 'file_number', l: 'شماره پرونده *', t: 'text', list: 1 },
        { k: 'department', l: 'بخش مربوطه *', t: 'text', list: 1 },
        { k: 'admission_date', l: 'تاریخ پذیرش *', t: 'date', list: 1 },
        { k: 'discharge_date', l: 'تاریخ ترخیص', t: 'date', list: 1 },
        { k: 'journey_stage', l: 'مرحله سفر بیمار', t: 'select', list: 1, chip: 1, render: crmStageBadge,
          opts: [
            ['admission', 'پذیرش'],
            ['inpatient', 'بستری در بخش'],
            ['discharged', 'ترخیص‌شده'],
            ['followup_pending', 'نیازمند تماس پیگیری'],
            ['followup_completed', 'پیگیری انجام شد']
          ] },
        { k: 'primary_doctor', l: 'پزشک معالج', t: 'text', list: 1 },
        { k: 'nurse_in_charge', l: 'پرستار مسئول', t: 'text' },
        { k: 'satisfaction_score', l: 'امتیاز رضایت (۱ تا ۵)', t: 'num', min: 0, max: 5, step: '0.5' },
        { k: 'sentiment', l: 'وضعیت حس بیمار', t: 'select', list: 1, chip: 1, render: crmSentimentBadge,
          opts: [
            ['positive', 'رضایت‌بخش 😊'],
            ['neutral', 'متوسط 😐'],
            ['negative', 'ناراضی ⚠️']
          ] },
        { k: 'risk_level', l: 'سطح ریسک بالینی/رضایتمندی', t: 'select',
          opts: [
            ['normal', 'عادی'],
            ['high', 'پرخطر (نیازمند پیگیری ویژه)'],
            ['critical', 'بحرانی']
          ] },
        { k: 'notes', l: 'یادداشت مراقبتی و پیگیری ترخیص', t: 'area' }
      ]
    },
    tickets: {
      title: 'شکایات، انتقادات و منشور حقوق بیمار', icon: '⚖️',
      sub: 'ثبت، کدگذاری و رسیدگی به شکایات بیماران مطابق ۵ محور استاندارد منشور حقوق بیمار',
      fields: [
        { k: 'tracking_code', l: 'کد پیگیری *', t: 'text', list: 1 },
        { k: 'patient_name', l: 'نام بیمار / مراجع', t: 'text', list: 1 },
        { k: 'patient_phone', l: 'شماره تماس مراجع', t: 'text' },
        { k: 'ward', l: 'بخش مربوطه', t: 'text', list: 1 },
        { k: 'rights_domain', l: 'محور منشور حقوق بیمار *', t: 'select', list: 1, chip: 1,
          opts: [
            'حق دریافت خدمات مطلوب',
            'حق دسترسی به اطلاعات',
            'حق انتخاب و تصمیم‌گیری',
            'حق احترام به حریم خصوصی',
            'حق دسترسی به نظام رسیدگی به شکایات'
          ] },
        { k: 'title', l: 'عنوان شکایت / موضوع *', t: 'text', list: 1 },
        { k: 'severity', l: 'اولویت رسیدگی', t: 'select', list: 1, chip: 1, render: crmSeverityBadge,
          opts: [
            ['low', 'عادی'],
            ['medium', 'متوسط'],
            ['high', 'فوری'],
            ['critical', 'بحرانی']
          ] },
        { k: 'status', l: 'وضعیت رسیدگی', t: 'select', list: 1, chip: 1, render: crmTicketStatusBadge,
          opts: [
            ['new', 'جدید'],
            ['under_investigation', 'در حال بررسی'],
            ['capa_assigned', 'اقدام اصلاحی صادر شد'],
            ['resolved', 'پاسخ داده شده'],
            ['closed', 'مختومه']
          ] },
        { k: 'assigned_to', l: 'کارشناس / مسئول رسیدگی', t: 'text' },
        { k: 'description', l: 'شرح کامل شکایت مراجع', t: 'area' },
        { k: 'investigation_result', l: 'نتیجه بررسی و تحلیل علت ریشه‌ای', t: 'area' },
        { k: 'patient_response', l: 'پاسخ مکتوب/پیامکی به اطلاع بیمار', t: 'area' }
      ]
    },
    notifications: {
      title: 'پیامک و اطلاع‌رسانی خودکار مراجعین', icon: '📱',
      sub: 'سامانه ارسال هوشمند پیامک نوبت‌دهی، دستورالعمل مراقبت ترخیص و لینک نظرسنجی',
      fields: [
        { k: 'recipient_name', l: 'نام گیرنده *', t: 'text', list: 1 },
        { k: 'phone', l: 'شماره همراه *', t: 'text', list: 1 },
        { k: 'notification_type', l: 'نوع پیام *', t: 'select', list: 1, chip: 1,
          opts: [
            ['discharge_care', 'دستورالعمل مراقبت ترخیص'],
            ['appointment_reminder', 'یادآوری نوبت ویزیت'],
            ['followup_call', 'هماهنگی تماس پیگیری'],
            ['satisfaction_survey', 'لینک نظرسنجی رضایت'],
            ['critical_alert', 'اطلاعیه ویژه']
          ] },
        { k: 'message', l: 'متن پیامک ارسالی *', t: 'area', list: 1 },
        { k: 'status', l: 'وضعیت تحویل مخابراتی', t: 'select', list: 1, chip: 1,
          opts: [
            ['sent', 'ارسال‌شده'],
            ['delivered', 'تحویل به گوشی (Delivered)'],
            ['pending', 'در صف ارسال'],
            ['failed', 'ناموفق']
          ] },
        { k: 'delivery_code', l: 'کد پیگیری مخابراتی', t: 'text', list: 1 }
      ]
    }
  }
});

// مودال ارسال پیامک سریع
function crmOpenSendSmsModal() {
  const modalHtml = `
    <div id="crmSmsModal" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px)">
      <div class="panel g" style="width:480px;max-width:90vw;padding:24px;border-radius:16px;background:#181e2b;border:1px solid rgba(0,240,255,0.3);box-shadow:0 12px 36px rgba(0,0,0,0.6)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <b style="font-size:15px;color:var(--th)">📱 ارسال پیامک و دستور مراقبت ترخیص</b>
          <button type="button" class="tgl" onclick="$('crmSmsModal').remove()">✕</button>
        </div>
        <div class="fg"><label>نام بیمار / گیرنده</label><input type="text" id="crm_sms_name" class="inp" placeholder="مثال: آقای حسینی"></div>
        <div class="fg"><label>شماره همراه گیرنده *</label><input type="tel" id="crm_sms_phone" class="inp" placeholder="09xxxxxxxxx"></div>
        <div class="fg"><label>الگوی پیامک</label>
          <select class="sel" id="crm_sms_template" onchange="crmApplySmsTemplate()">
            <option value="">انتخاب الگوی آماده...</option>
            <option value="discharge">دستورالعمل مراقبت پس از ترخیص و تعویض پانسمان</option>
            <option value="appointment">یادآوری نوبت ویزیت مجدد در درمانگاه تخصصی</option>
            <option value="survey">درخواست تکمیل فرم نظرسنجی رضایت ترخیص</option>
          </select>
        </div>
        <div class="fg"><label>متن پیامک *</label><textarea id="crm_sms_text" class="inp" rows="4" placeholder="متن پیامک را اینجا بنویسید..."></textarea></div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">
          <button type="button" class="tgl" onclick="$('crmSmsModal').remove()">انصراف</button>
          <button type="button" class="btn-g" style="padding:9px 22px;border-radius:10px" onclick="crmSubmitSendSms()">ارسال پیامک</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function crmApplySmsTemplate() {
  const t = $('crm_sms_template').value;
  const area = $('crm_sms_text');
  if (t === 'discharge') {
    area.value = 'مراجع گرامی، با آرزوی سلامتی شما. لطفاً داروها را طبق دستور مصرف نموده و در صورت تب یا ترشح غیرعادی فوراً به اورژانس مرکز مراجعه فرمایید. نوبت ویزیت مجدد شما: ۴ روز پس از ترخیص.';
  } else if (t === 'appointment') {
    area.value = 'مراجع گرامی، یادآوری نوبت ویزیت تخصصی شما در کلینیک بیمارستان فردا ساعت ۱۰:۰۰ می‌باشد. لطفاً مدارک قبلی را همراه داشته باشید.';
  } else if (t === 'survey') {
    area.value = 'مراجع گرامی، نظر شما برای ارتقای خدمات سلامت ما حیاتی است. لطفاً نظرسنجی ترخیص را در این آدرس تکمیل فرمایید: https://platform.ir/h2/survey';
  }
}

async function crmSubmitSendSms() {
  const name = $('crm_sms_name').value.trim();
  const phone = $('crm_sms_phone').value.trim();
  const msg = $('crm_sms_text').value.trim();
  if (!phone || !msg) {
    toast('شماره همراه و متن پیام الزامی است', true);
    return;
  }
  try {
    const res = await API.post('/crm/send-sms', { recipient_name: name, phone, message: msg });
    toast(res.message || 'پیامک با موفقیت ارسال شد');
    $('crmSmsModal').remove();
    if (RPG.st.crm && RPG.st.crm.tab === 'notifications') {
      RPG.render('crm');
    }
  } catch (err) {
    toast(err.message || 'خطا در ارسال پیامک', true);
  }
}

// تابع رندر renderCrm در app.js با تنظیم تب پیش‌فرض تعریف شده است.
const crmCanView = () => (typeof RPG !== 'undefined' && RPG.canView ? RPG.canView('crm') : true);


/* ==========================================================================
 * پیمانکاران و تأمین‌کنندگان — استاندارد الف‑۱‑۱۰ (چهار سنجه).
 * فقط «توصیف»، موتورش RPG است. بک‌اند: src/routes/api.js بخش Vendors.
 * ========================================================================== */

const VNS = { vendors: [] };
const vndLabel = (r, id) => {
  const v = VNS.vendors.find(x => x.id === id);
  return v ? esc(`${v.kind} — ${v.title}`) : '<span style="color:var(--td)">—</span>';
};

RPG.define({
  key: 'vendors',
  title: 'پیمانکاران و تأمین‌کنندگان',
  sub: 'انتخاب با معیار کیفی، ارزیابی امتیازی، و نظارت مستمر بر عملکرد',
  icon: '🤝',
  perms: ['view_vendors', 'manage_vendors'],
  tabs: [['dash', 'داشبورد'], ['vendors', 'پیمانکار و تأمین‌کننده'],
    ['evaluations', 'ارزیابی و انتخاب'], ['reviews', 'پایش دوره‌ای عملکرد'],
    ['stakeholders', 'ذینفعان']],
  fa: {},
  spec: {
    vendors: {
      title: 'فهرست پیمانکاران و تأمین‌کنندگان', icon: '🏢',
      sub: 'الف-۱-۱۰-۱ و الف-۱-۱۰-۳ — انتخاب با معیارهای کیفی و معین، به‌صورت مدون',
      formHint: '«معیارهای انتخاب» اجباری است؛ هر دو سنجه صریحاً معیار را خواسته‌اند و بدون آن انتخاب مستند نیست. قراردادِ منقضی در ممیزی همان «بدون قرارداد» است.',
      fields: [
        { k: 'kind', l: 'نوع', t: 'select', opts: ['پیمانکار', 'تأمین‌کننده'], list: 1, chip: 1 },
        { k: 'title', l: 'نام *', t: 'text', list: 1 },
        { k: 'service_scope', l: 'دامنه‌ی خدمت / کالا *', t: 'text', list: 1 },
        { k: 'responsible_unit', l: 'واحد ناظر', t: 'text', list: 1 },
        { k: 'contract_no', l: 'شماره قرارداد', t: 'text', list: 1 },
        { k: 'contract_start', l: 'شروع قرارداد', t: 'date' },
        { k: 'contract_end', l: 'پایان قرارداد', t: 'date', list: 1,
          render: (r) => {
            if (!r.contract_end) return '<span style="color:var(--td)">—</span>';
            const d = new Date(r.contract_end), now = new Date();
            const soon = new Date(now.getTime() + 60 * 86400000);
            const clr = d < now ? '#c02626' : (d < soon ? '#9a6b00' : 'inherit');
            return `<span style="color:${clr};font-weight:${d < soon ? 700 : 400}">${faDateISO(r.contract_end)}</span>`;
          } },
        { k: 'contract_amount', l: 'مبلغ قرارداد', t: 'text' },
        { k: 'contact_person', l: 'نماینده', t: 'text' },
        { k: 'phone', l: 'تلفن', t: 'text' },
        { k: 'national_id', l: 'شناسه ملی / کد اقتصادی', t: 'text' },
        { k: 'is_active', l: 'فعال', t: 'bool', list: 1 },
        { k: 'selection_criteria', l: 'معیارهای انتخاب *', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    evaluations: {
      title: 'ارزیابی و انتخاب', icon: '📊',
      sub: 'الف-۱-۱۰-۱ و الف-۱-۱۰-۳ — امتیازدهی مستند در لحظه‌ی انتخاب یا تمدید',
      formHint: 'امتیاز کل از میانگینِ امتیازهای واردشده در سرور حساب می‌شود، نه دستی — تا امتیازِ نهایی با اجزایش نخواند نشود.',
      fields: [
        { k: 'vendor_id', l: 'پیمانکار/تأمین‌کننده *', t: 'select',
          opts: () => VNS.vendors.map(v => [v.id, `${v.kind} — ${v.title}`]),
          list: 1, render: (r) => vndLabel(r, r.vendor_id) },
        { k: 'eval_date', l: 'تاریخ ارزیابی *', t: 'date', list: 1 },
        { k: 'purpose', l: 'هدف', t: 'select', opts: ['انتخاب اولیه', 'تمدید قرارداد', 'ارزیابی مجدد'], list: 1, chip: 1 },
        { k: 'quality_score', l: 'امتیاز کیفیت', t: 'num', step: '0.1', list: 1 },
        { k: 'price_score', l: 'امتیاز قیمت', t: 'num', step: '0.1', list: 1 },
        { k: 'delivery_score', l: 'امتیاز تحویل/زمان', t: 'num', step: '0.1', list: 1 },
        { k: 'total_score', l: 'امتیاز کل', t: 'num', computed: 1, list: 1,
          render: (r) => `<b>${r.total_score == null ? '—' : fa(r.total_score)}</b>` },
        { k: 'decision', l: 'تصمیم', t: 'select', opts: ['تأیید', 'تأیید مشروط', 'رد'], list: 1, chip: 1 },
        { k: 'committee_ref', l: 'ارجاع به صورت‌جلسه', t: 'text' },
        { k: 'evaluator', l: 'ارزیاب', t: 'text' },
        { k: 'criteria', l: 'شرح معیارها و وزنشان', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    reviews: {
      title: 'پایش دوره‌ای عملکرد', icon: '🔍',
      sub: 'الف-۱-۱۰-۲ و الف-۱-۱۰-۴ — نظارت مستمر، و تمایل طرف مقابل به تداوم همکاری',
      formHint: 'وقتی عدم انطباق ثبت کنید، اقدام اصلاحی اجباری می‌شود. «تمایل به تداوم» را باید از خودِ پیمانکار پرسید — الف-۱-۱۰-۴ از او می‌پرسد، نه از ما.',
      fields: [
        { k: 'vendor_id', l: 'پیمانکار/تأمین‌کننده *', t: 'select',
          opts: () => VNS.vendors.map(v => [v.id, `${v.kind} — ${v.title}`]),
          list: 1, render: (r) => vndLabel(r, r.vendor_id) },
        { k: 'period', l: 'دوره (مثلاً بهار ۱۴۰۵)', t: 'text', list: 1 },
        { k: 'review_date', l: 'تاریخ پایش *', t: 'date', list: 1 },
        { k: 'performance_score', l: 'امتیاز عملکرد', t: 'num', step: '0.1', list: 1 },
        { k: 'complaints_count', l: 'تعداد شکایت', t: 'num', list: 1 },
        { k: 'our_satisfaction', l: 'رضایت ما', t: 'select', opts: ['راضی', 'نسبتاً راضی', 'ناراضی'], list: 1, chip: 1 },
        { k: 'vendor_willing_to_continue', l: 'تمایل او به تداوم (الف-۱-۱۰-۴)', t: 'select',
          opts: ['پرسیده نشده', 'بله', 'مشروط', 'خیر'], list: 1, chip: 1 },
        { k: 'reviewer', l: 'پایشگر', t: 'text' },
        { k: 'nonconformities', l: 'عدم انطباق‌های مشاهده‌شده', t: 'area' },
        { k: 'corrective_action', l: 'اقدام اصلاحی', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    stakeholders: {
      title: 'شناسایی و تحلیل ذینفعان', icon: '🧭',
      sub: 'الف-۱-۱-۲ — تحلیل ذینفعان، و ابلاغ سیاست‌های اصلی به ذینفعان کلیدی',
      formHint: 'سنجه دو کار خواسته، نه یکی: «شناسایی و تحلیل» برای همه، و «ابلاغ سیاست‌ها» فقط برای ذینفعانِ کلیدی. پس تحلیلِ نیازها همیشه اجباری است ولی ابلاغ فقط وقتی «کلیدی» را تیک بزنید.',
      fields: [
        { k: 'title', l: 'نام ذینفع *', t: 'text', list: 1 },
        { k: 'category', l: 'دسته', t: 'select', list: 1, chip: 1,
          opts: ['بیماران و همراهان', 'کارکنان', 'پزشکان', 'سازمان‌های بیمه‌گر',
            'دانشگاه علوم پزشکی', 'وزارت بهداشت', 'تأمین‌کنندگان و پیمانکاران',
            'خیرین و مؤسسات خیریه', 'جامعه‌ی محلی', 'سایر'] },
        { k: 'is_key', l: 'ذینفع کلیدی', t: 'bool', list: 1 },
        { k: 'influence', l: 'میزان تأثیر', t: 'select', opts: ['زیاد', 'متوسط', 'کم'], list: 1 },
        { k: 'interest', l: 'میزان علاقه', t: 'select', opts: ['زیاد', 'متوسط', 'کم'], list: 1 },
        { k: 'contact_person', l: 'نماینده', t: 'text' },
        { k: 'policy_communicated', l: 'سیاست‌ها ابلاغ شد', t: 'bool', list: 1 },
        { k: 'communication_method', l: 'روش ابلاغ', t: 'text', list: 1 },
        { k: 'communication_date', l: 'تاریخ ابلاغ', t: 'date', list: 1 },
        { k: 'analysis_date', l: 'تاریخ تحلیل', t: 'date' },
        { k: 'needs_analysis', l: 'تحلیل نیازها *', t: 'area' },
        { k: 'expectations', l: 'انتظارات', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
  },
  dashboard(d, key) {
    const c = (n, l, clr, tab) => RPG.card(key, n, l, clr, tab);
    return `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        ${c(d.contractors, 'پیمانکار فعال', d.contractors ? '#17576e' : '#c02626', 'vendors')}
        ${c(d.suppliers, 'تأمین‌کننده فعال', d.suppliers ? '#17576e' : '#c02626', 'vendors')}
        ${c(d.no_criteria, 'بدون معیار انتخاب', d.no_criteria ? '#c02626' : '#17576e', 'vendors')}
        ${c(d.contract_expired, 'قراردادِ منقضی‌شده', d.contract_expired ? '#c02626' : '#17576e', 'vendors')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        ${c(d.contract_soon, 'قراردادِ رو به انقضا (۶۰ روز)', d.contract_soon ? '#9a6b00' : '#17576e', 'vendors')}
        ${c(d.unreviewed, 'بدون پایش در ۱۲ ماه گذشته', d.unreviewed ? '#c02626' : '#17576e', 'reviews')}
        ${c(d.reviews_year, 'پایش در ۱۲ ماه گذشته', d.reviews_year ? '#17576e' : '#c02626', 'reviews')}
        ${c(d.unhappy, 'پایشِ با نتیجه‌ی «ناراضی»', d.unhappy ? '#9a6b00' : '#17576e', 'reviews')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${c(d.vendor_unwilling, 'بی‌تمایل به تداوم همکاری', d.vendor_unwilling ? '#c02626' : '#17576e', 'reviews')}
        ${c(d.stakeholders, 'ذینفعِ شناسایی‌شده', d.stakeholders ? '#17576e' : '#c02626', 'stakeholders')}
        ${c(d.stakeholders_key, 'ذینفعِ کلیدی', d.stakeholders_key ? '#1550b8' : '#9a6b00', 'stakeholders')}
        ${c(d.stakeholders_uninformed, 'کلیدیِ بدون ابلاغ سیاست', d.stakeholders_uninformed ? '#c02626' : '#17576e', 'stakeholders')}
      </div>
      <div style="margin-top:16px;color:var(--mut);font-size:13px;line-height:2">
        عددِ «بدون پایش در ۱۲ ماه گذشته» مهم‌ترین عددِ این صفحه است: الف‑۱‑۱۰‑۲ صریحاً
        <b>نظارت مستمر</b> خواسته، و پیمانکارِ فعالی که یک سال پایش نشده، همان حلقه‌ی
        بازی است که ارزیاب می‌گیرد.
      </div>`;
  },
  onGo() { RPG.__vndLoadVendors(); },
});

RPG.__vndLoadVendors = async function () {
  // پیش از هر درخواست، مجوز چک می‌شود: بدون این، کاربرِ بی‌دسترسی که مستقیم به
  // آدرس صفحه می‌رفت یک ۴۰۳ بی‌فایده در کنسول می‌ساخت.
  if (!RPG.canView('vendors')) return;
  try { VNS.vendors = (await API.get('/vendors/vendors')).items || []; } catch (e) { /* کشویی خالی می‌ماند */ }
};

const renderVendors = async () => { await RPG.__vndLoadVendors(); return RPG.render('vendors'); };
const vendorsCanView = () => RPG.canView('vendors');

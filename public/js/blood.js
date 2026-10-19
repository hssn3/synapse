/* ==========================================================================
 * طب انتقال خون و هموویژیلانس (نسل۶: ذیل محور ب-۸ — خدمات آزمایشگاه و طب انتقال خون) — فقط «توصیف»، موتورش RPG است.
 * ========================================================================== */

// فهرستِ محل‌های نگهداری برای کشوییِ «کدام یخچال/فریزر». مثل ماژول کنترل عفونت
// جدا نگه داشته می‌شود، چون تبِ فعال فقط آیتم‌های خودش را دارد.
const BTS = { units: [] };

const BT_PRODUCTS = ['خون کامل', 'گلبول قرمز متراکم', 'پلاسمای تازه منجمد', 'پلاکت', 'کرایوپرسیپیتیت'];

RPG.define({
  key: 'blood',
  title: 'طب انتقال خون و هموویژیلانس',
  sub: 'زنجیره‌ی سرد، موجودی و انقضا، کنترل کیفیت، عوارض تزریق و خون‌های برگشتی',
  icon: '🩸',
  perms: ['view_blood', 'manage_blood'],
  tabs: [['dash', 'داشبورد'], ['units', 'محل نگهداری'], ['receipts', 'تحویل فرآورده'],
    ['bags', 'موجودی کیسه‌ها'], ['samples', 'کنترل نمونه'], ['qc', 'کنترل کیفیت'],
    ['events', 'عوارض تزریق'], ['returns', 'خون برگشتی']],
  fa: {
    qc_kind: { internal: 'کنترل کیفی داخلی', external: 'ارزیابی خارجی کیفیت' },
    qc_result: { pass: 'قبول', fail: 'مردود' },
    bag_status: { available: 'موجود', crossmatched: 'کراسمچ‌شده', issued: 'تحویل بخش',
      transfused: 'تزریق‌شده', returned: 'برگشتی', discarded: 'معدوم' },
    ev_status: { open: 'باز', reported: 'گزارش‌شده', closed: 'بسته شد' },
  },
  spec: {
    units: {
      title: 'محل نگهداری فرآورده‌های خونی', icon: '❄️',
      sub: 'ب-8-4-2 — یخچال بانک خون ۲٫۵ تا ۵٫۵ درجه با سیستم هشدار، و پلاکت ۲۰ تا ۲۴ درجه با روتاتور',
      formHint: 'دامنه‌ی مجاز روی خودِ دستگاه ثبت می‌شود، نه ثابتِ برنامه — دمایی که برای پلاسما مجاز است، برای خون کامل انحراف است.',
      fields: [
        { k: 'title', l: 'عنوان دستگاه *', t: 'text', list: 1 },
        { k: 'unit_type', l: 'نوع', t: 'select',
          opts: ['یخچال بانک خون', 'فریزر پلاسما/کرایو', 'شیکر-انکوباتور پلاکت', 'یخچال بخش/اتاق عمل'], list: 1 },
        { k: 'location', l: 'محل', t: 'text', list: 1 },
        { k: 'min_temp', l: 'حداقل دمای مجاز *', t: 'num', def: 2.5, list: 1 },
        { k: 'max_temp', l: 'حداکثر دمای مجاز *', t: 'num', def: 5.5, list: 1 },
        { k: 'has_alarm', l: 'سیستم هشداردهنده دارد', t: 'bool', list: 1 },
        { k: 'has_agitator', l: 'آژیتاتور/روتاتور دارد (ویژه‌ی پلاکت)', t: 'bool', list: 1 },
        { k: 'on_emergency_power', l: 'روی برق اضطراری', t: 'bool' },
        { k: 'thermometer_type', l: 'نوع دماسنج', t: 'text' },
        { k: 'serial_no', l: 'شماره سریال', t: 'text' },
        { k: 'responsible', l: 'مسئول', t: 'text', list: 1 },
        { k: 'is_active', l: 'فعال', t: 'bool', def: 1, list: 1 },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    receipts: {
      title: 'تحویل فرآورده از سازمان انتقال خون', icon: '🚚',
      sub: 'ب-8-4-1 — ماشین مخصوص، گواهیِ معتبرِ حامل، محفظه‌ی ثبت‌کننده‌ی دما، و ثبت دما هنگام تحویل',
      formHint: 'گواهی حامل بدون تاریخ اعتبار «معتبر» شمرده نمی‌شود؛ دمای پذیرش را سرور با زنجیره‌ی سرد (۱ تا ۱۰ درجه) می‌سنجد.',
      fields: [
        { k: 'receipt_date', l: 'تاریخ تحویل *', t: 'date', list: 1 },
        { k: 'product_type', l: 'نوع فرآورده', t: 'select', opts: BT_PRODUCTS, list: 1 },
        { k: 'unit_count', l: 'تعداد واحد *', t: 'num', def: 1, list: 1 },
        { k: 'arrival_temp', l: 'دمای هنگام تحویل *', t: 'num', list: 1 },
        { k: 'temp_ok', l: 'زنجیره‌ی سرد', t: 'bool', computed: 1, list: 1,
          render: (r) => r.temp_ok ? '<span style="color:#17576e">سالم</span>' : '<b style="color:#c02626">شکسته</b>' },
        { k: 'courier_name', l: 'نام حامل', t: 'text', list: 1 },
        { k: 'courier_cert_no', l: 'شماره گواهی حامل', t: 'text' },
        { k: 'courier_cert_expiry', l: 'تاریخ اعتبار گواهی حامل', t: 'date' },
        { k: 'dedicated_vehicle', l: 'ماشین مخصوص حمل', t: 'bool', def: 1 },
        { k: 'box_has_datalogger', l: 'محفظه ثبت‌کننده‌ی دما داشت', t: 'bool', def: 1 },
        { k: 'accepted', l: 'پذیرفته شد', t: 'bool', def: 1, list: 1 },
        { k: 'reject_reason', l: 'علت عدم پذیرش', t: 'area' },
        { k: 'received_by', l: 'تحویل‌گیرنده', t: 'text' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    bags: {
      title: 'موجودی کیسه‌های خون', icon: '🧊',
      sub: 'ب-8-4-2 چیدمان و کنترل روزانه‌ی انقضا — ب-8-5-1 برچسب کراسمچ',
      formHint: 'کیسه‌ی کراسمچ‌شده بدون شناسه‌ی بیمار، بخش و نامِ انجام‌دهنده‌ی آزمایش سازگاری ثبت نمی‌شود؛ سرِ بالین قابل تشخیص نیست.',
      fields: [
        { k: 'bag_code', l: 'کد کیسه *', t: 'text', list: 1 },
        { k: 'product_type', l: 'فرآورده', t: 'select', opts: BT_PRODUCTS, list: 1 },
        { k: 'blood_group', l: 'گروه', t: 'select', opts: ['O', 'A', 'B', 'AB'], list: 1 },
        { k: 'rh', l: 'RH', t: 'select', opts: ['+', '-'], list: 1 },
        { k: 'expiry_date', l: 'تاریخ انقضا *', t: 'date', list: 1,
          render: (r) => {
            const today = new Date().toISOString().slice(0, 10);
            const soon = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
            const live = ['available', 'crossmatched'].includes(r.status);
            const clr = !live ? '' : (r.expiry_date < today ? '#c02626' : (r.expiry_date <= soon ? '#9a6b00' : ''));
            const txt = faDateISO(r.expiry_date);
            return clr ? `<b style="color:${clr}">${txt}</b>` : txt;
          } },
        { k: 'status', l: 'وضعیت', t: 'select', opts: ['available', 'crossmatched', 'issued', 'transfused', 'returned', 'discarded'],
          fa: 'bag_status', list: 1, chip: 1 },
        { k: 'storage_unit_id', l: 'محل نگهداری', t: 'select',
          opts: () => [['', '—']].concat(BTS.units.map(u => [u.id, u.title])), list: 1,
          render: (r) => esc((BTS.units.find(u => u.id === r.storage_unit_id) || {}).title || '—') },
        { k: 'volume_ml', l: 'حجم (میلی‌لیتر)', t: 'num' },
        { k: 'collected_date', l: 'تاریخ اهدا', t: 'date' },
        { k: 'crossmatch_patient', l: 'شناسه بیمار (کراسمچ)', t: 'text' },
        { k: 'crossmatch_ward', l: 'بخش بستری (کراسمچ)', t: 'text' },
        { k: 'crossmatch_by', l: 'انجام‌دهنده‌ی آزمایش سازگاری', t: 'text' },
        { k: 'crossmatch_result', l: 'نتیجه‌ی سازگاری', t: 'select', opts: ['', 'سازگار', 'ناسازگار'] },
        { k: 'issued_ward', l: 'بخش دریافت‌کننده', t: 'text' },
        { k: 'issued_date', l: 'تاریخ تحویل به بخش', t: 'date' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    samples: {
      title: 'کنترل نمونه‌ی بانک خون', icon: '🧪',
      sub: 'ب-8-1-2 — معیارهای پذیرش و رد نمونه، و اخذ نمونه‌ی مجدد در صورت عدم انطباق',
      formHint: 'نمونه‌ی ردشده تا وقتی نمونه‌ی مجددش ثبت نشود کارِ نیمه‌تمام است — بیمار بی‌آزمایش مانده.',
      fields: [
        { k: 'check_date', l: 'تاریخ کنترل *', t: 'date', list: 1 },
        { k: 'ward', l: 'بخش *', t: 'text', list: 1 },
        { k: 'patient_ref', l: 'شناسه بیمار (بدون نام)', t: 'text', list: 1 },
        { k: 'label_complete', l: 'برچسب کامل بود', t: 'bool', def: 1, list: 1 },
        { k: 'identity_verified', l: 'هویت بیمار تأیید شد', t: 'bool', def: 1, list: 1 },
        { k: 'accepted', l: 'پذیرفته شد', t: 'bool', def: 1, list: 1 },
        { k: 'reject_reason', l: 'علت رد', t: 'area' },
        { k: 'resampled', l: 'نمونه‌ی مجدد گرفته شد', t: 'bool', list: 1 },
        { k: 'resample_date', l: 'تاریخ نمونه‌گیری مجدد', t: 'date' },
        { k: 'sampler_name', l: 'نمونه‌گیر', t: 'text' },
        { k: 'checked_by', l: 'کنترل‌کننده', t: 'text' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    qc: {
      title: 'کنترل کیفیت بانک خون', icon: '🔬',
      sub: 'ب-8-2-3 و ب-8-2-4 — کنترل کیفی روزانه‌ی آنتی‌سرم‌ها بر اساس هر سری ساخت، و ارزیابی خارجی کیفیت',
      formHint: 'برای کنترل کیفی داخلی شماره‌ی سری ساخت اجباری است؛ کتاب صریح گفته «بر اساس هر سری ساخت».',
      fields: [
        { k: 'kind', l: 'نوع', t: 'select', opts: ['internal', 'external'], fa: 'qc_kind', list: 1, chip: 1 },
        { k: 'qc_date', l: 'تاریخ *', t: 'date', list: 1 },
        { k: 'item_name', l: 'آنتی‌سرم / آزمایش *', t: 'text', list: 1 },
        { k: 'lot_no', l: 'شماره سری ساخت (Lot)', t: 'text', list: 1 },
        { k: 'expiry_date', l: 'تاریخ انقضای کیت', t: 'date' },
        { k: 'result', l: 'نتیجه', t: 'select', opts: ['pass', 'fail'], fa: 'qc_result', list: 1, chip: 1 },
        { k: 'provider', l: 'برگزارکننده (ارزیابی خارجی)', t: 'text', list: 1 },
        { k: 'interpretation', l: 'تفسیر نتیجه', t: 'area' },
        { k: 'corrective_action', l: 'اقدام اصلاحی (در صورت مردودی)', t: 'area' },
        { k: 'performed_by', l: 'انجام‌دهنده', t: 'text' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    events: {
      title: 'عوارض ناخواسته‌ی تزریق خون', icon: '⚠️',
      sub: 'ب-8-6-4 گزارش حداکثر ظرف ۴۸ ساعت — ب-8-6-6 تحلیل ریشه‌ای و طرح در کمیته',
      formHint: '«در مهلت ۴۸ ساعت» را سرور از فاصله‌ی تاریخ عارضه تا تاریخ گزارش حساب می‌کند، نه از تیکِ کاربر.',
      fields: [
        { k: 'event_date', l: 'تاریخ عارضه *', t: 'date', list: 1 },
        { k: 'ward', l: 'بخش *', t: 'text', list: 1 },
        { k: 'reaction_type', l: 'نوع واکنش', t: 'select',
          opts: ['تب غیرهمولیتیک', 'آلرژیک', 'همولیتیک حاد', 'همولیتیک تأخیری',
            'TRALI (آسیب حاد ریه)', 'TACO (اضافه‌بار گردش خون)', 'عفونی/باکتریال', 'سایر'], list: 1 },
        { k: 'severity', l: 'شدت', t: 'select', opts: ['خفیف', 'متوسط', 'شدید', 'تهدیدکننده‌ی حیات'], list: 1 },
        { k: 'product_type', l: 'فرآورده', t: 'select', opts: BT_PRODUCTS, list: 1 },
        { k: 'bag_code', l: 'کد کیسه', t: 'text' },
        { k: 'patient_ref', l: 'شناسه بیمار (بدون نام)', t: 'text' },
        { k: 'description', l: 'شرح عارضه *', t: 'area' },
        { k: 'standard_form_done', l: 'فرم استاندارد سازمان انتقال خون تکمیل شد', t: 'bool', list: 1 },
        { k: 'reported_date', l: 'تاریخ گزارش به سازمان', t: 'date', list: 1 },
        { k: 'reported_within_48h', l: 'در مهلت ۴۸ ساعت', t: 'bool', computed: 1, list: 1,
          render: (r) => !r.reported_date ? '<span style="color:#c02626">گزارش نشده</span>'
            : (r.reported_within_48h ? '<span style="color:#17576e">بله</span>' : '<b style="color:#c02626">خیر</b>') },
        { k: 'status', l: 'وضعیت', t: 'select', opts: ['open', 'reported', 'closed'], fa: 'ev_status', list: 1, chip: 1 },
        { k: 'rca_done', l: 'تحلیل ریشه‌ای انجام شد', t: 'bool' },
        { k: 'rca_summary', l: 'خلاصه‌ی تحلیل ریشه‌ای', t: 'area' },
        { k: 'committee_ref', l: 'شماره صورت‌جلسه‌ی کمیته‌ی طب انتقال خون', t: 'text' },
        { k: 'corrective_action', l: 'اقدام اصلاحی', t: 'area' },
      ],
    },
    returns: {
      title: 'خون‌های برگشتی به بانک خون', icon: '↩️',
      sub: 'ب-8-6-5 — پایش به تفکیک بخش، ارزیابی دمای برگشتی و اقدام اصلاحی',
      formHint: 'قابل‌استفاده بودنِ کیسه از دما نتیجه می‌شود نه از نظر کاربر: بالای ۱۰ درجه زنجیره‌ی سرد شکسته و کیسه به موجودی برنمی‌گردد.',
      fields: [
        { k: 'return_date', l: 'تاریخ برگشت *', t: 'date', list: 1 },
        { k: 'ward', l: 'بخش برگشت‌دهنده *', t: 'text', list: 1 },
        { k: 'product_type', l: 'فرآورده', t: 'select', opts: BT_PRODUCTS, list: 1 },
        { k: 'unit_count', l: 'تعداد واحد', t: 'num', def: 1, list: 1 },
        { k: 'bag_code', l: 'کد کیسه', t: 'text', list: 1 },
        { k: 'return_temp', l: 'دمای کیسه هنگام برگشت *', t: 'num', list: 1 },
        { k: 'temp_acceptable', l: 'دما قابل قبول', t: 'bool', computed: 1, list: 1,
          render: (r) => r.temp_acceptable ? '<span style="color:#17576e">بله</span>' : '<b style="color:#c02626">خیر</b>' },
        { k: 'reusable', l: 'قابل بازگشت به موجودی', t: 'bool', list: 1 },
        { k: 'reason', l: 'علت برگشت', t: 'select',
          opts: ['عدم نیاز بیمار', 'ترخیص/فوت بیمار', 'لغو دستور پزشک', 'ناسازگاری', 'اشکال در فرآورده', 'سایر'], list: 1 },
        { k: 'corrective_action', l: 'اقدام اصلاحی', t: 'area' },
        { k: 'reported_to_committee', l: 'به کمیته گزارش شد', t: 'bool', list: 1 },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
  },
  dashboard(d, key) {
    const c = (n, l, clr, tab) => RPG.card(key, n, l, clr, tab);
    const p48 = d.events_within_48h_pct;
    const wardRows = (d.returns_by_ward || []).map(w => `<tr>
      <td>${esc(w.ward)}</td><td>${fa(w.units || 0)}</td><td>${fa(w.n || 0)}</td>
      <td style="color:${w.bad_temp ? '#c02626' : ''}">${fa(w.bad_temp || 0)}</td></tr>`).join('');
    return `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        ${c(d.bags_expired, 'کیسه‌ی منقضی در موجودی', d.bags_expired ? '#c02626' : '#17576e', 'bags')}
        ${c(d.bags_expiring_7d, 'انقضا تا ۷ روز آینده', d.bags_expiring_7d ? '#9a6b00' : '#17576e', 'bags')}
        ${c(d.bags_available, 'کیسه‌ی موجود', '#1550b8', 'bags')}
        ${c(d.temp_out_30d, 'انحراف دما (۳۰ روز)', d.temp_out_30d ? '#c02626' : '#17576e', 'units')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        ${c(d.units_no_alarm, 'دستگاه بدون سیستم هشدار', d.units_no_alarm ? '#c02626' : '#17576e', 'units')}
        ${c(d.receipts_temp_bad, 'تحویل با زنجیره‌ی سرد شکسته', d.receipts_temp_bad ? '#c02626' : '#17576e', 'receipts')}
        ${c(d.samples_rejected_open, 'نمونه‌ی ردشده بدون نمونه‌ی مجدد', d.samples_rejected_open ? '#c02626' : '#17576e', 'samples')}
        ${c(d.qc_failed_90d, 'کنترل کیفی مردود (۹۰ روز)', d.qc_failed_90d ? '#c02626' : '#17576e', 'qc')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${c(d.qc_external, 'شرکت در ارزیابی خارجی کیفیت', d.qc_external ? '#17576e' : '#c02626', 'qc')}
        ${c(d.events_open, 'عارضه‌ی باز', d.events_open ? '#c02626' : '#17576e', 'events')}
        ${c(p48 == null ? '—' : p48, 'گزارش در مهلت ۴۸ ساعت (٪)',
          p48 == null ? '#6b7280' : (p48 >= 90 ? '#17576e' : (p48 >= 70 ? '#9a6b00' : '#c02626')), 'events')}
        ${c(d.returns_temp_bad, 'برگشتی با دمای نامناسب', d.returns_temp_bad ? '#c02626' : '#17576e', 'returns')}
      </div>
      ${wardRows ? `<div class="tbl-wrap" style="margin-top:18px"><table>
        <thead><tr><th>بخش</th><th>واحد برگشتی</th><th>دفعات</th><th>دمای نامناسب</th></tr></thead>
        <tbody>${wardRows}</tbody></table></div>
        <div style="margin-top:6px;color:var(--mut);font-size:12.5px">
          همین جدول است که ب-8-6-5 می‌خواهد به کمیته‌ی طب انتقال خون گزارش شود.
        </div>` : ''}
      <div style="margin-top:16px;color:var(--mut);font-size:13px;line-height:2">
        «در مهلت ۴۸ ساعت» و «زنجیره‌ی سرد» و «قابل بازگشت بودن کیسه» هر سه در سرور از روی تاریخ و دما
        حساب می‌شوند، نه از روی تیکِ کاربر — وگرنه همان چیزی که سنجه دنبالش است با یک کلیک پنهان می‌شد.
        گواهیِ استقرار هموویژیلانس (ب-8-6-1) در ماژول «گواهینامه‌ها» و دوره‌های آموزشی (ب-8-6-2) در
        ماژول «آموزش» ثبت می‌شوند؛ این‌جا دوباره ساخته نشدند تا دو جای ثبتِ موازی به‌وجود نیاید.
      </div>`;
  },
  onGo() { RPG.__btLoadUnits(); },
});

RPG.__btLoadUnits = async function () {
  try { BTS.units = (await API.get('/blood/units')).items || []; } catch (e) { /* بی‌صدا: کشویی خالی می‌ماند */ }
};

const renderBlood = async () => { await RPG.__btLoadUnits(); return RPG.render('blood'); };
const bloodCanView = () => RPG.canView('blood');

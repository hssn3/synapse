/* ==========================================================================
 * ماژول‌های مرحله ۲ md — انبار/بحران/دانش/آموزش بیمار/اداری/شیفت/آموزش
 * --------------------------------------------------------------------------
 * چرا فایل جدا: هر جدول تازه باید صفحه RPG (جدول/فرم/چاپ) بگیرد؛ موتور مشترک
 * resource-page.js همان را از «توصیف» می‌سازد پس فقط define لازم است.
 * قرارداد بک‌اند: کلید ماژول = prefix مسیر mountCrud در api.js.
 * همه متن نمایشی با esc() رندر می‌شود (موتور)؛ این فایل فقط توصیف است.
 * ========================================================================== */

/* ---------- ۱) انبار و دارو (pharmacy) ---------- */
RPG.define({
  key: 'mdinv', title: 'انبار و دارو', sub: 'موجودی، ورود/خروج، ترالی احیا، یخچال و آنتی‌دوت', icon: '📦',
  perms: ['view_pharmacy', 'manage_pharmacy'],
  tabs: [['stock', 'موجودی'], ['stockmoves', 'ورود/خروج'], ['crashcart', 'ترالی احیا'], ['fridge', 'یخچال'], ['antidotes', 'آنتی‌دوت']],
  spec: {
    stock: { title: 'اقلام انبار', sub: 'کد کالا، موجودی و نقطه سفارش', fields: [
      { k: 'item_code', l: 'کد کالا', t: 'text', list: 1 },
      { k: 'item_name', l: 'نام قلم *', t: 'text', list: 1 },
      { k: 'category', l: 'دسته', t: 'select', list: 1, opts: [['دارو', 'دارو'], ['یخچالی', 'یخچالی'], ['تجهیزات', 'تجهیزات']] },
      { k: 'qty', l: 'موجودی', t: 'num', list: 1, min: 0 },
      { k: 'reorder_point', l: 'نقطه سفارش', t: 'num', min: 0 },
      { k: 'exp_date', l: 'انقضا', t: 'date' } ] },
    stockmoves: { title: 'ورود و خروج انبار', sub: 'رسید و حواله با شماره سند', fields: [
      { k: 'item_id', l: 'شناسه قلم *', t: 'text', list: 1 },
      { k: 'move_type', l: 'نوع *', t: 'select', list: 1, opts: [['in', 'ورود (رسید)'], ['out', 'خروج (حواله)']] },
      { k: 'qty', l: 'مقدار *', t: 'num', list: 1, min: 0 },
      { k: 'doc_no', l: 'شماره سند', t: 'text', list: 1 },
      { k: 'move_date', l: 'تاریخ', t: 'date', list: 1 } ] },
    crashcart: { title: 'استوک ترالی احیا', sub: 'کشو، دارو، تعداد و انقضا', fields: [
      { k: 'cart_location', l: 'محل ترالی', t: 'text', list: 1 },
      { k: 'drawer', l: 'کشو', t: 'text', list: 1 },
      { k: 'item_name', l: 'نام قلم *', t: 'text', list: 1 },
      { k: 'qty', l: 'تعداد', t: 'num', list: 1, min: 0 },
      { k: 'exp_date', l: 'انقضا', t: 'date', list: 1 } ] },
    fridge: { title: 'لاگ روزانه یخچال', sub: 'دما، رطوبت و برفک‌زدایی هفتگی', fields: [
      { k: 'ward', l: 'بخش *', t: 'text', list: 1 },
      { k: 'log_date', l: 'تاریخ *', t: 'date', list: 1 },
      { k: 'temp_morning', l: 'دمای صبح', t: 'num', step: '0.1' },
      { k: 'temp_evening', l: 'دمای عصر', t: 'num', step: '0.1' },
      { k: 'humidity', l: 'رطوبت', t: 'num', min: 0, max: 100 },
      { k: 'defrost_done', l: 'برفک‌زدایی', t: 'bool' },
      { k: 'controller_role', l: 'کنترل‌کننده', t: 'text' } ] },
    antidotes: { title: 'آنتی‌دوت‌ها', sub: 'مسمومیت و پادزهر', fields: [
      { k: 'poisoning', l: 'مسمومیت *', t: 'text', list: 1 },
      { k: 'antidote', l: 'پادزهر *', t: 'text', list: 1 },
      { k: 'note', l: 'توضیح', t: 'text' } ] },
  }
});
const renderMdinv = () => RPG.render('mdinv');

/* ---------- ۲) بحران (disaster) ---------- */
RPG.define({
  key: 'mdcrisis', title: 'فرماندهی بحران', sub: 'شرح وظایف ستادی و HICS', icon: '🚨',
  perms: ['view_disaster', 'manage_disaster'],
  tabs: [['crisis', 'شرح وظایف']],
  spec: {
    crisis: { title: 'شرح وظایف بحران', sub: 'سمت، حوزه و گزارش‌دهی', fields: [
      { k: 'title', l: 'عنوان سمت *', t: 'text', list: 1 },
      { k: 'duty_scope', l: 'حوزه وظیفه', t: 'area' },
      { k: 'report_to', l: 'گزارش به', t: 'text', list: 1 },
      { k: 'contact_role', l: 'سمت رابط', t: 'text' } ] },
  }
});
const renderMdcrisis = () => RPG.render('mdcrisis');

/* ---------- ۳) دانش (documents) ---------- */
RPG.define({
  key: 'mdknow', title: 'دانش ایمنی', sub: 'درس‌آموخته‌ها و نکات بالینی', icon: '📚',
  perms: ['view_documents', 'manage_documents'],
  tabs: [['learnings', 'درس‌آموخته'], ['clinotes', 'نکات بالینی']],
  spec: {
    learnings: { title: 'درس‌آموخته‌ها', sub: 'RCA/FMEA بدون نام بیمار', fields: [
      { k: 'title', l: 'عنوان *', t: 'text', list: 1 },
      { k: 'source', l: 'منبع', t: 'text', list: 1 },
      { k: 'lesson', l: 'درس', t: 'area' },
      { k: 'action', l: 'اقدام', t: 'area' } ] },
    clinotes: { title: 'نکات بالینی', sub: 'خلاصه کاربردی', fields: [
      { k: 'topic', l: 'موضوع *', t: 'text', list: 1 },
      { k: 'summary', l: 'خلاصه', t: 'area' } ] },
  }
});
const renderMdknow = () => RPG.render('mdknow');

/* ---------- ۴) آموزش بیمار (education) ---------- */
RPG.define({
  key: 'mdedu', title: 'آموزش بیمار', sub: 'پمفلت حین بستری و پس از ترخیص', icon: '🎓',
  perms: ['view_education', 'manage_education'],
  tabs: [['patientedu', 'پمفلت‌ها']],
  spec: {
    patientedu: { title: 'پمفلت‌های آموزشی', sub: 'مراقبت در بخش و منزل', fields: [
      { k: 'disease', l: 'بیماری *', t: 'text', list: 1 },
      { k: 'inpatient_content', l: 'حین بستری', t: 'area' },
      { k: 'discharge_content', l: 'پس از ترخیص', t: 'area' } ] },
  }
});
const renderMdedu = () => RPG.render('mdedu');

/* ---------- ۵) اداری (hrdev) ---------- */
RPG.define({
  key: 'mdadmin', title: 'فرم‌های اداری', sub: 'فرم‌های کددار و ثبت‌ها', icon: '🗂',
  perms: ['view_hrdev', 'manage_hrdev'],
  tabs: [['adminforms', 'فرم‌ها'], ['formsubs', 'ثبت‌ها']],
  spec: {
    adminforms: { title: 'فرم‌های اداری کددار', sub: 'مرخصی، اموال، آموزش، آمبولانس', fields: [
      { k: 'form_code', l: 'کد فرم', t: 'text', list: 1 },
      { k: 'title', l: 'عنوان *', t: 'text', list: 1 },
      { k: 'category', l: 'دسته', t: 'select', list: 1, opts: [['پرسنلی', 'پرسنلی'], ['اموال', 'اموال'], ['آموزش', 'آموزش'], ['پرستاری', 'پرستاری'], ['پیگیری', 'پیگیری'], ['اداری', 'اداری']] },
      { k: 'status', l: 'وضعیت', t: 'select', opts: [['active', 'فعال'], ['archived', 'بایگانی']] } ] },
    formsubs: { title: 'ثبت‌های اداری', sub: 'پاسخ‌های ثبت‌شده فرم‌ها', fields: [
      { k: 'form_id', l: 'شناسه فرم *', t: 'text', list: 1 },
      { k: 'data_json', l: 'داده (JSON)', t: 'area' },
      { k: 'submitted_by', l: 'ثبت‌کننده', t: 'text', list: 1 } ] },
  }
});
const renderMdadmin = () => RPG.render('mdadmin');

/* ---------- ۶) شیفت و امانت (nsupervision) ---------- */
RPG.define({
  key: 'mdshift', title: 'تحویل و امانت', sub: 'تحویل شیفت SBAR و امانت بین‌بخشی', icon: '🔄',
  perms: ['view_nsupervision', 'manage_nsupervision'],
  tabs: [['handovers', 'تحویل شیفت'], ['loans', 'امانت تجهیزات']],
  spec: {
    handovers: { title: 'تحویل شیفت', sub: 'خلاصه و مسائل باز', fields: [
      { k: 'ward', l: 'بخش *', t: 'text', list: 1 },
      { k: 'handover_date', l: 'تاریخ *', t: 'date', list: 1 },
      { k: 'from_shift', l: 'از شیفت', t: 'select', list: 1, opts: [['صبح', 'صبح'], ['عصر', 'عصر'], ['شب', 'شب']] },
      { k: 'to_shift', l: 'به شیفت', t: 'select', opts: [['صبح', 'صبح'], ['عصر', 'عصر'], ['شب', 'شب']] },
      { k: 'summary', l: 'خلاصه', t: 'area' },
      { k: 'issues', l: 'مسائل باز', t: 'area' } ] },
    loans: { title: 'امانت تجهیزات', sub: 'خروج، عودت و وضعیت', fields: [
      { k: 'item_name', l: 'وسیله *', t: 'text', list: 1 },
      { k: 'from_ward', l: 'از بخش', t: 'text', list: 1 },
      { k: 'to_ward', l: 'به بخش', t: 'text', list: 1 },
      { k: 'loan_date', l: 'تاریخ خروج', t: 'date', list: 1 },
      { k: 'return_date', l: 'تاریخ عودت', t: 'date' },
      { k: 'status', l: 'وضعیت', t: 'select', list: 1, opts: [['active', 'فعال'], ['returned', 'عودت شد']] },
      { k: 'receiver_role', l: 'سمت گیرنده', t: 'text' } ] },
  }
});
const renderMdshift = () => RPG.render('mdshift');

/* ---------- ۷) آموزش و گواهی (training) ---------- */
RPG.define({
  key: 'mdtrain', title: 'گواهی و نیازسنجی', sub: 'کارنامه آموزشی و نیازسنجی رسمی', icon: '🏅',
  perms: ['view_training', 'review_training_needs'],
  tabs: [['certs', 'گواهی‌ها'], ['needsassess', 'نیازسنجی']],
  spec: {
    certs: { title: 'گواهی‌های آموزشی', sub: 'دوره، سمت دارنده و نمره', fields: [
      { k: 'course_title', l: 'دوره *', t: 'text', list: 1 },
      { k: 'holder_role', l: 'سمت دارنده', t: 'text', list: 1 },
      { k: 'score', l: 'نمره', t: 'num', min: 0, max: 100 },
      { k: 'issue_date', l: 'تاریخ صدور', t: 'date', list: 1 },
      { k: 'cert_no', l: 'شماره گواهی', t: 'text', list: 1 } ] },
    needsassess: { title: 'نیازسنجی رسمی', sub: 'گروه، موضوع و اولویت سالانه', fields: [
      { k: 'group_name', l: 'گروه', t: 'text', list: 1 },
      { k: 'topic', l: 'موضوع *', t: 'text', list: 1 },
      { k: 'priority', l: 'اولویت', t: 'select', list: 1, opts: [['بالا', 'بالا'], ['متوسط', 'متوسط'], ['پایین', 'پایین']] },
      { k: 'year', l: 'سال', t: 'num', list: 1, min: 1400, max: 1450 } ] },
  }
});
const renderMdtrain = () => RPG.render('mdtrain');

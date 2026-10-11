/**
 * «کار من» — چه کاری، امروز، این هفته، این ماه
 * =====================================================================
 * خواسته‌ی صریح کارفرما: «هر کاربر از رئیس بیمارستان تا منشی‌ها باید بداند
 * روزانه چه کار کند، و به او بگوید هفتگی و ماهانه چه کار کند.»
 *
 * چرا فایلِ تازه و نه گسترشِ role-duties.js: آن فایل یک *کاتالوگ* است — «شغلِ
 * این سمت چیست». چیزی که کم بود «امروزِ این آدم چه شکلی است» بود، و آن از
 * کاتالوگ درنمی‌آید؛ از داده‌ی زنده‌ی خودِ مرکز درمی‌آید. دو منبعِ متفاوت با دو
 * عمر متفاوت، پس دو فایل.
 *
 * دو منبع با هم ترکیب می‌شوند:
 *
 *   ۱) وظایفِ دوره‌ایِ همان سمت از role-duties (آن‌هایی که در دوره‌ی جاری هنوز
 *      انجام نشده‌اند). این «کارِ برنامه‌ریزی‌شده» است.
 *
 *   ۲) سیگنال‌های زنده از خودِ ماژول‌ها — کیسه‌ی خونِ منقضی، دمای یخچالِ خارج از
 *      محدوده، تأییدیه‌ی تصویربرداریِ رو به انقضا، نمونه‌ی ردشده‌ی بی‌پیگیری،
 *      مصوبه‌ی کمیته با مهلتِ گذشته. این «کارِ پیش‌آمده» است و مهم‌تر از اولی،
 *      چون همان چیزی است که ارزیاب روی میز می‌بیند.
 *
 * سه قاعده که این را از یک فهرستِ تزئینی جدا می‌کند:
 *
 *   • هر سیگنال به مجوزِ ماژولِ خودش قفل است. منشیِ بخش نباید «کنترل کیفی
 *     آزمایشگاه» را در کارهای امروزش ببیند — نه چون محرمانه است، چون کارِ او
 *     نیست و فهرستی که کارِ دیگران را نشان می‌دهد، خوانده نمی‌شود.
 *
 *   • هیچ عددی ساخته نمی‌شود. هر سیگنال یک COUNT روی داده‌ی واقعی است و اگر صفر
 *     باشد اصلاً در فهرست نمی‌آید. فهرستِ خالی یعنی واقعاً کاری نیست — و همین
 *     پیام، خودش ارزش دارد.
 *
 *   • سطلِ زمانی از جنسِ کار می‌آید نه از سلیقه: چیزی که *گذشته* است امروز است،
 *     چیزی که تا هفت روز دیگر سررسید می‌شود این هفته است، و کارِ دوره‌ایِ ماه
 *     این ماه. یک قلم هرگز در دو سطل نمی‌افتد.
 */
const { query } = require('../config/database-sqlite');
const { dutiesFor, CADENCE_FA } = require('./role-duties');
const { reminderItemsFor } = require('./reminders');
const { todayJalali, jalaliMonthRange } = require('../config/jalali');

// شمارشِ امن: جدولی که هنوز مهاجرتش اجرا نشده نباید کلِ صفحه را بترکاند.
function c(sql, params) {
  try { return query(sql, params).rows[0].c || 0; } catch (e) { return 0; }
}

/* ---------------------------------------------------------------------
 * کاتالوگ سیگنال‌ها
 * هر سیگنال: کلید، سطل، مجوزهای لازم، عنوان (با عدد)، چرا، صفحه‌ی مقصد.
 * `n(hid)` عددِ واقعی را برمی‌گرداند؛ صفر یعنی این کار وجود ندارد.
 * در عنوان، «{n}» جای عدد است و رابط آن را با رقمِ فارسی پر می‌کند — عدد عمداً
 * سمت سرور در متن جا نمی‌افتد، وگرنه «۳ مورد» با رقم لاتین چاپ می‌شد.
 * ------------------------------------------------------------------- */
const SIGNALS = [
  // ---------- کارتابل و مسئولیت شخصی (همه‌ی نقش‌ها) ----------
  // موتورِ ریمایندر از قبل هست و خودش تعویق/انجام‌شده و گیرنده‌ی مجازِ هر قلم را
  // می‌داند؛ پس این‌جا دوباره SQL نوشته نمی‌شود — همان تابع صدا زده می‌شود.
  // چک‌لیستِ سررسیدشده هم از همان مسیر می‌آید (نوع checklist_due).
  { key: 'reminders_due', bucket: 'today', perms: null, page: 'inbox',
    title: '{n} یادآور سررسیدشده در کارتابل',
    why: 'سررسیدشان رسیده و هنوز بسته نشده‌اند',
    n: (h, u) => { try { return reminderItemsFor(u, h).length; } catch (e) { return 0; } } },

  { key: 'my_measures_empty', bucket: 'month', perms: null, page: 'measures',
    title: '{n} سنجه‌ی زیر مسئولیت شما هنوز وضعیت ندارد',
    why: 'هر سنجه‌ی بی‌وضعیت در ارزیابی «رعایت‌نشده» حساب می‌شود',
    n: (h, u, ctx) => !ctx.roleCode ? 0 : c(
      `SELECT COUNT(*) c FROM accreditation_sections m
       WHERE m.level_type = 'measure' AND m.responsible_role = ?
         AND NOT EXISTS (SELECT 1 FROM measure_status s
           WHERE s.measure_id = m.id AND s.hospital_id = ?)`, [ctx.roleCode, h]) },

  { key: 'committee_actions_overdue', bucket: 'today', perms: ['view_committees', 'manage_committees'], page: 'committees',
    title: '{n} مصوبه‌ی کمیته با مهلتِ گذشته',
    why: 'الف-۱-۵-۲ پیگیری مصوبات جلسه‌ی قبل را الزام کرده',
    n: (h) => c(`SELECT COUNT(*) c FROM committee_meeting_minutes m
        JOIN committees k ON k.id = m.committee_id
        WHERE k.hospital_id = ? AND COALESCE(m.is_example,0) = 0
          AND m.decisions IS NOT NULL AND TRIM(m.decisions) <> ''
          AND m.next_meeting_date IS NOT NULL AND date(m.next_meeting_date) < date('now')`, [h]) },

  { key: 'measure_ca_overdue', bucket: 'today', perms: ['manage_measure_status', 'view_measures'], page: 'measures',
    title: '{n} اقدام اصلاحیِ سنجه با مهلتِ گذشته',
    why: 'چرخه‌ی عدم انطباق تا بسته‌نشدن اقدام، باز می‌ماند',
    n: (h) => c(`SELECT COUNT(*) c FROM measure_corrective_actions
        WHERE hospital_id = ? AND status <> 'closed'
          AND due_date IS NOT NULL AND date(due_date) < date('now')`, [h]) },

  // ---------- اقلام و نگهداشت (الف-۶، الف-۷) ----------
  { key: 'assets_maint_overdue', bucket: 'today', perms: ['view_facility_assets', 'manage_facility_assets'], page: 'assets',
    title: '{n} نگهداشتِ دوره‌ای سررسیدشده',
    why: 'الف-۷ نگهداشت پیشگیرانه‌ی به‌موقع را الزام کرده',
    n: (h) => c(`SELECT COUNT(*) c FROM asset_maintenance_plans
        WHERE hospital_id = ? AND COALESCE(is_active,1) = 1
          AND next_due_date IS NOT NULL AND date(next_due_date) < date('now')`, [h]) },

  // ---------- دارویی (ب-۶) ----------
  { key: 'drug_temp_out', bucket: 'today', perms: ['view_pharmacy', 'manage_pharmacy'], page: 'pharmacy',
    title: '{n} انحراف دمای یخچال دارویی در هفته‌ی گذشته',
    why: 'ب-۶-۲-۱ — انحراف باید فوراً اقدام بگیرد',
    n: (h) => c(`SELECT COUNT(*) c FROM drug_temp_logs WHERE hospital_id = ? AND in_range = 0
        AND date(log_date) >= date('now','-7 day')`, [h]) },
  { key: 'drug_recall_open', bucket: 'today', perms: ['view_pharmacy', 'manage_pharmacy'], page: 'pharmacy',
    title: '{n} فراخوان دارویی بازِ بی‌تکلیف',
    why: 'ب-۶-۲-۳ «سرنوشت نهایی» هر فراخوان باید روشن باشد',
    n: (h) => c(`SELECT COUNT(*) c FROM drug_recalls WHERE hospital_id = ? AND status <> 'closed'`, [h]) },
  { key: 'drug_shortage', bucket: 'week', perms: ['view_pharmacy', 'manage_pharmacy'], page: 'pharmacy',
    title: '{n} کمبود داروییِ فعال',
    why: 'ب-۶-۱-۳ — جایگزین و اطلاع‌رسانی به بخش‌ها',
    n: (h) => c(`SELECT COUNT(*) c FROM drug_shortages WHERE hospital_id = ? AND status = 'active'`, [h]) },
  { key: 'drug_offform_pending', bucket: 'week', perms: ['view_pharmacy', 'manage_pharmacy'], page: 'pharmacy',
    title: '{n} درخواست تجویز خارج از فرمولاری منتظر تصمیم',
    why: 'ب-۶-۴-۲ — تصمیم باید طبق فرایند مصوب کمیته ثبت شود',
    n: (h) => c(`SELECT COUNT(*) c FROM drug_off_formulary WHERE hospital_id = ? AND decision = 'pending'`, [h]) },

  // ---------- کنترل عفونت (ب-۵) ----------
  { key: 'ic_test_fail', bucket: 'today', perms: ['view_infection', 'manage_infection'], page: 'infection',
    title: '{n} آزمون استریل مردود در ماه گذشته',
    why: 'ب-۵-۲-۱ — بارهای همان سیکل بی‌تکلیف می‌مانند',
    n: (h) => c(`SELECT COUNT(*) c FROM sterilizer_tests WHERE hospital_id = ? AND result = 'fail'
        AND date(test_date) >= date('now','-30 day')`, [h]) },
  { key: 'ic_batch_quarantine', bucket: 'today', perms: ['view_infection', 'manage_infection'], page: 'infection',
    title: '{n} بسته‌ی استریل در قرنطینه یا فراخوان',
    why: 'ب-۵-۲-۵ — تا تعیین تکلیف قابل استفاده نیست',
    n: (h) => c(`SELECT COUNT(*) c FROM sterile_batches WHERE hospital_id = ? AND status IN ('quarantined','recalled')`, [h]) },
  { key: 'ic_hai_open', bucket: 'week', perms: ['view_infection', 'manage_infection'], page: 'infection',
    title: '{n} پرونده‌ی عفونت بیمارستانی باز',
    why: 'ب-۵-۵ — تا ثبت اقدام کنترلی بسته نمی‌شود',
    n: (h) => c(`SELECT COUNT(*) c FROM hai_cases WHERE hospital_id = ? AND status <> 'closed'`, [h]) },
  { key: 'ic_hh_month', bucket: 'month', perms: ['view_infection', 'manage_infection'], page: 'infection',
    title: 'پایش بهداشت دست این ماه هنوز ثبت نشده',
    why: 'ب-۵-۴-۲ — اندازه‌گیری میزان رعایت با روش استاندارد',
    zeroMeans: 'todo',
    n: (h, u, ctx) => c(`SELECT COUNT(*) c FROM hand_hygiene_audits WHERE hospital_id = ?
        AND date(audit_date) >= date(?)`, [h, ctx.monthStart]) },

  // ---------- طب انتقال خون (ب-۹) ----------
  { key: 'blood_expired', bucket: 'today', perms: ['view_blood', 'manage_blood'], page: 'blood',
    title: '{n} کیسه‌ی خونِ منقضی هنوز در موجودی',
    why: 'ب-۹-۱-۲ — کنترل روزانه‌ی تاریخ انقضا',
    n: (h) => c(`SELECT COUNT(*) c FROM blood_bags WHERE hospital_id = ?
        AND status IN ('available','crossmatched') AND date(expiry_date) < date('now')`, [h]) },
  { key: 'blood_expiring', bucket: 'week', perms: ['view_blood', 'manage_blood'], page: 'blood',
    title: '{n} کیسه‌ی خون تا هفت روز دیگر منقضی می‌شود',
    why: 'ب-۹-۱-۲ — تنظیم مصرف پیش از انقضا',
    n: (h) => c(`SELECT COUNT(*) c FROM blood_bags WHERE hospital_id = ?
        AND status IN ('available','crossmatched') AND date(expiry_date) >= date('now')
        AND date(expiry_date) <= date('now','+7 day')`, [h]) },
  { key: 'blood_temp_out', bucket: 'today', perms: ['view_blood', 'manage_blood'], page: 'blood',
    title: '{n} انحراف دمای بانک خون در هفته‌ی گذشته',
    why: 'ب-۹-۱-۲ — دامنه‌ی ۲٫۵ تا ۵٫۵ درجه',
    n: (h) => c(`SELECT COUNT(*) c FROM blood_temp_logs WHERE hospital_id = ? AND in_range = 0
        AND date(log_date) >= date('now','-7 day')`, [h]) },
  { key: 'blood_sample_open', bucket: 'today', perms: ['view_blood', 'manage_blood'], page: 'blood',
    title: '{n} نمونه‌ی بانک خونِ ردشده بدون نمونه‌ی مجدد',
    why: 'ب-۹-۲-۱ — بیمار بی‌آزمایش مانده',
    n: (h) => c(`SELECT COUNT(*) c FROM blood_sample_checks WHERE hospital_id = ? AND accepted = 0 AND resampled = 0`, [h]) },
  { key: 'blood_event_open', bucket: 'today', perms: ['view_blood', 'manage_blood'], page: 'blood',
    title: '{n} عارضه‌ی تزریق خونِ باز',
    why: 'ب-۹-۴-۴ — مهلت گزارش ۴۸ ساعت است',
    n: (h) => c(`SELECT COUNT(*) c FROM blood_adverse_events WHERE hospital_id = ? AND status <> 'closed'`, [h]) },

  // ---------- آزمایشگاه (ب-۸) ----------
  { key: 'lab_qc_fail', bucket: 'today', perms: ['view_lab', 'manage_lab'], page: 'lab',
    title: '{n} کنترل کیفیِ غیرقابل‌قبول در ماه گذشته',
    why: 'ب-۸-۲-۳ — اقدام اصلاحی و نگهداری سابقه',
    n: (h) => c(`SELECT COUNT(*) c FROM lab_qc_records WHERE hospital_id = ? AND result = 'fail'
        AND date(qc_date) >= date('now','-30 day')`, [h]) },
  { key: 'lab_sample_open', bucket: 'today', perms: ['view_lab', 'manage_lab'], page: 'lab',
    title: '{n} نمونه‌ی ردشده‌ی آزمایشگاه بدون نمونه‌ی مجدد',
    why: 'ب-۸-۱-۴ — پیگیری و تجدید نمونه',
    n: (h) => c(`SELECT COUNT(*) c FROM lab_sample_checks WHERE hospital_id = ? AND accepted = 0 AND resampled = 0`, [h]) },
  { key: 'lab_ref_unannounced', bucket: 'week', perms: ['view_lab', 'manage_lab'], page: 'lab',
    title: '{n} جدول آزمایشگاه هنوز به بخش‌ها ابلاغ نشده',
    why: 'ب-۸-۲-۴ و ب-۸-۳-۳ — جدولِ ابلاغ‌نشده برای بخش وجود ندارد',
    n: (h) => c(`SELECT COUNT(*) c FROM lab_reference WHERE hospital_id = ? AND announced_to_wards = 0`, [h]) },
  { key: 'lab_referral_expired', bucket: 'week', perms: ['view_lab', 'manage_lab'], page: 'lab',
    title: '{n} قرارداد آزمایشگاه ارجاع منقضی شده',
    why: 'ب-۸-۲-۶ — قرارداد مکتوب معتبر',
    n: (h) => c(`SELECT COUNT(*) c FROM lab_referrals WHERE hospital_id = ? AND is_active = 1
        AND contract_expiry IS NOT NULL AND date(contract_expiry) < date('now')`, [h]) },
  { key: 'lab_eqa', bucket: 'month', perms: ['view_lab', 'manage_lab'], page: 'lab',
    title: 'ارزیابی خارجی کیفیت: {n} نوبت در ۱۲ ماه گذشته (نیاز: ۳)',
    why: 'ب-۸-۲-۵ — سه نوبت در سال',
    below: 3,
    n: (h) => c(`SELECT COUNT(*) c FROM lab_qc_records WHERE hospital_id = ? AND kind = 'external'
        AND date(qc_date) >= date('now','-365 day')`, [h]) },

  // ---------- تصویربرداری (ب-۷) ----------
  { key: 'img_no_qc', bucket: 'today', perms: ['view_imaging', 'manage_imaging'], page: 'imaging',
    title: '{n} دستگاه تصویربرداری بدون تأییدیه‌ی معتبر',
    why: 'ب-۷-۳-۶ — تأییدیه‌ی حداقل سالانه از شرکت موردتأیید انرژی اتمی',
    n: (h) => c(`SELECT COUNT(*) c FROM imaging_devices d WHERE d.hospital_id = ? AND d.is_active = 1
        AND NOT EXISTS (SELECT 1 FROM imaging_qc q WHERE q.device_id = d.id
          AND q.kind = 'کنترل کیفی سالانه' AND q.is_valid = 1)`, [h]) },
  { key: 'img_qc_expiring', bucket: 'month', perms: ['view_imaging', 'manage_imaging'], page: 'imaging',
    title: '{n} تأییدیه‌ی تصویربرداری تا ۶۰ روز دیگر منقضی می‌شود',
    why: 'ب-۷-۳-۶ — تمدید پیش از انقضا',
    n: (h) => c(`SELECT COUNT(*) c FROM imaging_qc WHERE hospital_id = ? AND is_valid = 1
        AND date(valid_until) <= date('now','+60 day')`, [h]) },
  { key: 'img_dose_over', bucket: 'today', perms: ['view_imaging', 'manage_imaging'], page: 'imaging',
    title: '{n} پرتوکار با دز بیش از حد مجاز',
    why: 'ب-۷-۱-۳ — از وظایف مسئول فیزیک بهداشت',
    n: (h) => c(`SELECT COUNT(*) c FROM radiation_dosimetry WHERE hospital_id = ? AND over_limit = 1`, [h]) },
  { key: 'img_review_month', bucket: 'month', perms: ['view_imaging', 'manage_imaging'], page: 'imaging',
    title: 'بازبینی کیفیت تصویربرداری این ماه هنوز ثبت نشده',
    why: 'ب-۷-۳-۴ — حداقل ماهیانه',
    zeroMeans: 'todo',
    n: (h, u, ctx) => c(`SELECT COUNT(*) c FROM imaging_quality_reviews WHERE hospital_id = ?
        AND date(review_date) >= date(?)`, [h, ctx.monthStart]) },

  // ---------- حوادث و بلایا (الف-۲) ----------
  { key: 'dis_hazard_open', bucket: 'week', perms: ['view_disaster', 'manage_disaster'], page: 'disaster',
    title: '{n} مخاطره‌ی اولویت‌دار بدون اقدام کامل',
    why: 'الف-۲ — برنامه‌ی کاهش خطر برای مخاطرات اولویت‌دار',
    n: (h) => c(`SELECT COUNT(*) c FROM disaster_hazards WHERE hospital_id = ? AND is_priority = 1 AND status <> 'done'`, [h]) },

  // ---------- گواهینامه‌ها ----------
  { key: 'cert_expiring', bucket: 'month', perms: ['view_certifications', 'manage_certifications'], page: 'documents',
    title: '{n} گواهینامه تا ۶۰ روز دیگر منقضی می‌شود',
    why: 'تمدید پیش از انقضا',
    n: (h) => c(`SELECT COUNT(*) c FROM certifications WHERE hospital_id = ? AND COALESCE(is_example,0) = 0
        AND expiry_date IS NOT NULL AND date(expiry_date) >= date('now')
        AND date(expiry_date) <= date('now','+60 day')`, [h]) },
  { key: 'cert_expired', bucket: 'today', perms: ['view_certifications', 'manage_certifications'], page: 'documents',
    title: '{n} گواهینامه‌ی منقضی‌شده',
    why: 'گواهیِ منقضی در ارزیابی، نداشتنِ گواهی است',
    n: (h) => c(`SELECT COUNT(*) c FROM certifications WHERE hospital_id = ? AND COALESCE(is_example,0) = 0
        AND expiry_date IS NOT NULL AND date(expiry_date) < date('now')`, [h]) },

  // ---------- سلامت حرفه‌ای (الف-۳-۵/۶/۷) ----------
  // برای این چهار، «نبودنِ رکورد» خودش کار است — دقیقاً مثل یخچالِ بدون دمای
  // امروز. سنجه چهار نوعِ عاملِ زیان‌آور را جدا خواسته، پس نوعِ خالی یک سنجه‌ی
  // بی‌مدرک است، نه یک فهرستِ کوتاه.
  { key: 'occ_kind_missing', bucket: 'month', perms: ['manage_occhealth'], page: 'occhealth',
    title: '{n} نوع از عوامل زیان‌آور هنوز هیچ ردیفی ندارد',
    why: 'الف-۳-۵-۲ تا ۵ — شیمیایی، فیزیکی، بیولوژیکی و ارگونومیک هرکدام سنجه‌ی جداست',
    n: (h) => c(`SELECT COUNT(*) c FROM (
        SELECT 'شیمیایی' k UNION ALL SELECT 'فیزیکی' UNION ALL SELECT 'بیولوژیکی' UNION ALL SELECT 'ارگونومیک') x
      WHERE NOT EXISTS (SELECT 1 FROM occ_hazards z
        WHERE z.hospital_id = ? AND z.kind = x.k AND z.is_active = 1)`, [h]) },

  { key: 'occ_unmeasured', bucket: 'month', perms: ['manage_occhealth'], page: 'occhealth',
    title: '{n} عاملِ زیان‌آور بدون هیچ اندازه‌گیری',
    why: 'شناسایی بدون اندازه‌گیری دوره‌ای، در ممیزی مدرک شمرده نمی‌شود',
    n: (h) => c(`SELECT COUNT(*) c FROM occ_hazards z WHERE z.hospital_id = ? AND z.is_active = 1
      AND NOT EXISTS (SELECT 1 FROM occ_measurements m WHERE m.hazard_id = z.id)`, [h]) },

  { key: 'occ_incidents_open', bucket: 'week', perms: ['manage_occhealth'], page: 'occhealth',
    title: '{n} حادثه/شبه‌حادثه‌ی شغلیِ باز',
    why: 'الف-۳-۶-۲ — حلقه با علت ریشه‌ای و اقدام اصلاحی بسته می‌شود',
    n: (h) => c("SELECT COUNT(*) c FROM occ_incidents WHERE hospital_id = ? AND status != 'closed'", [h]) },

  { key: 'occ_exams_overdue', bucket: 'today', perms: ['manage_occhealth'], page: 'occhealth',
    title: '{n} معاینه‌ی شغلیِ سررسیدگذشته',
    why: 'الف-۳-۷-۱ — پایش دوره‌ای گروه‌های در معرض',
    n: (h) => c(`SELECT COUNT(*) c FROM occ_exams WHERE hospital_id = ?
      AND next_due IS NOT NULL AND date(next_due) < date('now')`, [h]) },

  // ---------- منابع مالی و مشارکت مردمی (الف-۱-۹) ----------
  { key: 'fin_deviation_open', bucket: 'today', perms: ['manage_finance'], page: 'finance',
    title: '{n} ردیف بودجه با انحرافِ بیش از ۱۰٪ و بدون اقدام اصلاحی',
    why: 'الف-۱-۹-۱ — انحراف باید دلیل و اقدامِ انطباق داشته باشد',
    n: (h) => c(`SELECT COUNT(*) c FROM fin_budget_lines WHERE hospital_id = ?
      AND ABS(variance_pct) > 10 AND (corrective_action IS NULL OR corrective_action = '')`, [h]) },

  { key: 'fin_report_unsubmitted', bucket: 'week', perms: ['manage_finance'], page: 'finance',
    title: '{n} گزارش مالیِ تحویلِ تیم رهبری نشده',
    why: 'الف-۱-۹-۱ — گزارشی که به تیم رهبری نرسیده، مدرک شمرده نمی‌شود',
    n: (h) => c('SELECT COUNT(*) c FROM fin_reports WHERE hospital_id = ? AND submitted_to_leadership = 0', [h]) },

  { key: 'fin_donation_unrecorded', bucket: 'week', perms: ['manage_finance'], page: 'finance',
    title: '{n} کمکِ خیّر که در سامانه‌ی حسابداری ثبت نشده',
    why: 'الف-۱-۹-۳ — «تمامی رخدادهای مالی در سامانه حسابداری درج می‌شود»',
    n: (h) => c('SELECT COUNT(*) c FROM fin_donations WHERE hospital_id = ? AND recorded_in_accounting = 0', [h]) },

  // ---------- بیمارمحوری و علت‌کاوی (الف-۱-۷-۴، الف-۱-۸-۶/۷) ----------
  { key: 'pf_coi_open', bucket: 'today', perms: ['manage_patientfocus'], page: 'patientfocus',
    title: '{n} پرونده‌ی تعارض منافعِ باز',
    why: 'الف-۱-۷-۴ — مصداقِ شناسایی‌شده باید تا اقدام اصلاحی دنبال شود',
    n: (h) => c("SELECT COUNT(*) c FROM pf_coi_cases WHERE hospital_id = ? AND status <> 'بسته'", [h]) },

  { key: 'pf_readmit_no_rca', bucket: 'week', perms: ['manage_patientfocus'], page: 'patientfocus',
    title: '{n} بستری مجددِ بدون تحلیل ریشه‌ای',
    why: 'الف-۱-۸-۶ — بررسی علل و تحلیل ریشه‌ای توسط تیم‌های مربوط',
    n: (h) => c(`SELECT COUNT(*) c FROM pf_readmissions WHERE hospital_id = ?
      AND countable = 1 AND root_cause_done = 0`, [h]) },

  { key: 'pf_ama_no_action', bucket: 'week', perms: ['manage_patientfocus'], page: 'patientfocus',
    title: '{n} ترخیصِ قابل پیشگیری بدون اقدام اصلاحی',
    why: 'الف-۱-۸-۷ — اقدام اصلاحی برای عواملی که به این ترخیص می‌انجامد',
    n: (h) => c(`SELECT COUNT(*) c FROM pf_ama_discharges WHERE hospital_id = ?
      AND preventable = 1 AND (corrective_action IS NULL OR corrective_action = '')`, [h]) },

  // ---------- آموزش و اثربخشی (الف-۳-۲-۴، الف-۴-۲-۳/۴/۵) ----------
  { key: 'edu_policy_uncommunicated', bucket: 'week', perms: ['manage_education'], page: 'education',
    title: '{n} سیاستِ آموزشیِ تصویب‌شده که ابلاغ نشده',
    why: 'الف-۴-۲-۳ — سنجه «تدوین **و ابلاغ**» را خواسته، نه فقط تدوین',
    n: (h) => c(`SELECT COUNT(*) c FROM edu_policies WHERE hospital_id = ?
      AND is_active = 1 AND approved_date IS NOT NULL AND communicated = 0`, [h]) },

  { key: 'edu_session_unevaluated', bucket: 'week', perms: ['manage_education'], page: 'education',
    title: '{n} دوره‌ی برگزارشده بدون سنجشِ اثربخشی',
    why: 'الف-۳-۲-۴ — برگزاری امتیاز نیست، سنجشِ اثربخشی امتیاز است',
    n: (h) => c(`SELECT COUNT(*) c FROM edu_sessions s WHERE s.hospital_id = ?
      AND s.session_date <= date('now','-14 day')
      AND NOT EXISTS (SELECT 1 FROM edu_effectiveness e WHERE e.session_id = s.id)`, [h]) },

  { key: 'edu_ineffective_no_action', bucket: 'today', perms: ['manage_education'], page: 'education',
    title: '{n} دوره‌ای که به هدف نرسیده و اقدام اصلاحی ندارد',
    why: 'الف-۳-۲-۴ — «بر اساس نتایج آن اقدامات اصلاحی مؤثر برنامه‌ریزی و اجرا می‌شوند»',
    n: (h) => c(`SELECT COUNT(*) c FROM edu_effectiveness WHERE hospital_id = ?
      AND effective = 0 AND (corrective_action IS NULL OR corrective_action = '')`, [h]) },

  { key: 'edu_policy_review_due', bucket: 'month', perms: ['manage_education'], page: 'education',
    title: '{n} سیاستِ آموزشی با سررسیدِ بازنگریِ گذشته',
    why: 'الف-۴-۲-۵ — بازنگری بر پایه‌ی نتایج اثربخشی',
    n: (h) => c(`SELECT COUNT(*) c FROM edu_policies WHERE hospital_id = ? AND is_active = 1
      AND next_review_due IS NOT NULL AND date(next_review_due) < date('now')`, [h]) },

  // ---------- سه سنجه‌ی پراکنده روی ماژول‌های موجود ----------
  { key: 'fin_disruption_open', bucket: 'today', perms: ['manage_finance'], page: 'finance',
    title: '{n} اختلال/تأخیرِ خدمت که هنوز رفع نشده',
    why: 'الف-۱-۹-۷ — سنجه می‌گوید هیچ موردی نباید دیده شود',
    n: (h) => c('SELECT COUNT(*) c FROM service_disruptions WHERE hospital_id = ? AND resolved = 0', [h]) },

  { key: 'staff_survey_due', bucket: 'month', perms: ['manage_hrdev'], page: 'hrdev',
    title: '{n} سالِ با کمتر از دو نظرسنجیِ کارکنان',
    why: 'الف-۳-۴-۴ — «حداقل دو بار در سال و با فاصله شش ماه»',
    n: (h) => c(`SELECT COUNT(*) c FROM (
      SELECT year FROM staff_surveys WHERE hospital_id = ? GROUP BY year HAVING COUNT(*) < 2)`, [h]) },

  { key: 'stakeholder_uninformed', bucket: 'week', perms: ['manage_stakeholders'], page: 'vendors',
    title: '{n} ذینفعِ کلیدی که سیاست‌های اصلی به او ابلاغ نشده',
    why: 'الف-۱-۱-۲ — ابلاغ سیاست‌ها به ذینفعان کلیدی',
    n: (h) => c(`SELECT COUNT(*) c FROM stakeholders WHERE hospital_id = ?
      AND is_key = 1 AND policy_communicated = 0`, [h]) },

  // ---------- حلقه‌ی تأیید ریاست (توافق داوری پرستاری/ریاست) ----------
  // این سه «کارِ در انتظار تصمیم» است نه «کارِ انجام‌نشده». مجوزها عمداً سطحِ
  // دیدِ ماژول است تا ریاست با همان مجوزهای نظارتی‌اش ببیند و مالکِ ماژول هم با
  // مجوزِ خودش؛ عدد همیشه COUNT واقعی است و صفر یعنی نیامدن در فهرست.
  { key: 'program_proposed', bucket: 'week', perms: ['view_programs', 'approve_programs'], page: 'programs',
    title: '{n} برنامه‌ی بهبود پیشنهادشده در انتظار تصویب',
    why: 'برنامه‌ی بدون تصویب ریاست در ارزیابی پذیرفته نمی‌شود',
    n: (h) => c(`SELECT COUNT(*) c FROM improvement_programs WHERE hospital_id = ? AND status = 'پیشنهاد_شده'`, [h]) },

  { key: 'doc_draft_pending', bucket: 'week', perms: ['view_documents', 'manage_documents'], page: 'documents',
    title: '{n} مدرک پیش‌نویس در انتظار تأیید و ابلاغ',
    why: 'سندِ پیش‌نویسِ بی‌تصمیم، در ممیزی مدرک شمرده نمی‌شود',
    n: (h) => c(`SELECT COUNT(*) c FROM controlled_documents WHERE hospital_id = ? AND status = 'draft'`, [h]) },

  // triage مالکِ خطا، نه ریاست: ریاست مجوزِ خطا ندارد پس سیگنالِ او از آمارِ زنده‌ی
  // دانا می‌آید؛ این سیگنال حلقه‌ی «reported بی‌بررسی» را برای مسئول فنی می‌بندد.
  { key: 'error_triage_pending', bucket: 'today', perms: ['manage_medical_error_reports'], page: 'errors',
    title: '{n} گزارش خطای تازه/گزارش‌شده در انتظار بررسی',
    why: 'گزارشِ بررسی‌نشده نه اقدام می‌گیرد نه تحلیل ریشه‌ای',
    n: (h) => c(`SELECT COUNT(*) c FROM medical_error_reports WHERE hospital_id = ? AND status IN ('new','reported')`, [h]) },

  // ---------- برنامه‌ی شیفت (سرپرستار) ----------
  // نامِ مجوزها قبلاً `manage_nursing`/`view_nursing` بود که در هیچ نقشی وجود
  // ندارد، پس این سیگنال هرگز روشن نمی‌شد. نام‌های واقعیِ جدولِ roles این‌هاست.
  { key: 'shift_month', bucket: 'month', perms: ['manage_nursing_hierarchy', 'view_nursing_hierarchy'], page: 'staffshift',
    title: 'برنامه‌ی شیفت ماه جاری هنوز ثبت نشده',
    why: 'الف-۴ — برنامه‌ی ماهانه‌ی پرسنل پرستاری',
    zeroMeans: 'todo',
    n: (h, u, ctx) => c(`SELECT COUNT(*) c FROM shift_schedules
        WHERE hospital_id = ? AND jalali_year = ? AND jalali_month = ?`, [h, ctx.jy, ctx.jm]) },

  // ---------- گزارش ۲۴ ساعته‌ی سوپروایزر — سنجه‌ی الف‑۴‑۳‑۱ ----------
  // سنجه دو طرف دارد و هر طرف سیگنالِ خودش را می‌گیرد: سوپروایزر باید بنویسد،
  // تیم رهبری باید *روزانه* بررسی کند. «روزانه» یعنی معوق‌شدنش کارِ امروز است.
  { key: 'shift_report_unreviewed', bucket: 'today',
    perms: ['manage_nursing_hierarchy', 'view_all_dashboards'], page: 'shiftatt',
    title: '{n} گزارش ۲۴ ساعته‌ی سوپروایزر، بررسی‌نشده',
    why: 'الف-۴-۳-۱ — بررسی روزانه توسط تیم رهبری و اقدام اصلاحی',
    n: (h) => c(`SELECT COUNT(*) c FROM nursing_supervisor_reports
        WHERE hospital_id = ? AND status = 'ثبت‌شده'`, [h]) },

  { key: 'shift_report_missing', bucket: 'today',
    perms: ['manage_nursing_hierarchy', 'view_nursing_hierarchy'], page: 'shiftatt',
    title: '{n} شیفتِ دیروز بدون گزارش ۲۴ ساعته',
    why: 'الف-۴-۳-۱ — گزارش هر شیفت باید همان روز ثبت شود',
    n: (h) => c(`SELECT COUNT(*) c FROM (SELECT 'M' s UNION ALL SELECT 'E' UNION ALL SELECT 'N') x
        WHERE EXISTS (SELECT 1 FROM nursing_shift_attendance a
                      WHERE a.hospital_id = ? AND a.att_date = date('now','-1 day') AND a.shift_code = x.s)
          AND NOT EXISTS (SELECT 1 FROM nursing_supervisor_reports r
                      WHERE r.hospital_id = ? AND r.report_date = date('now','-1 day')
                        AND r.shift_code = x.s AND r.status <> 'پیش‌نویس')`, [h, h]) },
];

/**
 * فهرست کارهای یک کاربر، در سه سطل.
 * perms = آرایه‌ی مجوزهای کاربر؛ roleCode برای سنجه‌های زیر مسئولیت او.
 */
function myWork({ hospitalId, userId, roleCode, perms }) {
  const has = (need) => !need || need.some(p => (perms || []).includes(p));
  const t = todayJalali();
  const ctx = { roleCode, jy: t.jy, jm: t.jm, monthStart: jalaliMonthRange(t.jy, t.jm).start };

  const buckets = { today: [], week: [], month: [] };

  // ---- ۱. سیگنال‌های زنده ----
  for (const s of SIGNALS) {
    if (!has(s.perms)) continue;
    let n = 0;
    try { n = s.n(hospitalId, userId, ctx) || 0; } catch (e) { continue; }
    // «zeroMeans: todo» یعنی سیگنال وارونه است: نبودِ رکورد خودش کار است.
    if (s.zeroMeans === 'todo') { if (n > 0) continue; }
    else if (s.below !== undefined) { if (n >= s.below) continue; }
    else if (n === 0) continue;
    buckets[s.bucket].push({
      key: s.key, kind: 'signal', count: s.zeroMeans === 'todo' ? null : n,
      title: s.title, why: s.why, page: s.page,
    });
  }

  // ---- ۲. وظایفِ دوره‌ایِ همان سمت که هنوز انجام نشده‌اند ----
  //
  // فصلی و سالانه هم به سطلِ «این ماه» می‌روند، نه اینکه حذف شوند. آزمونِ همه‌ی
  // سمت‌ها نشان داد بدون این، هفت سمت — از جمله مدیر اعتباربخشی با ۳۵ مجوز —
  // فهرستِ کاملاً خالی می‌گرفتند، چون همه‌ی وظایفشان فصلی/سالانه است و هیچ
  // سیگنالِ زنده‌ای هم ندارند. فهرستِ خالی برای سمتی که واقعاً کار دارد، همان
  // «دستیار همه‌ی مسئولیت‌ها را پوشش نمی‌دهد» است.
  // برچسبِ تناوب کنارِ هر قلم می‌آید، پس کاربر گمراه نمی‌شود: «فصلی» یعنی تا
  // پایان فصل وقت دارد، ولی امروز می‌داند که هست.
  const CAD_BUCKET = { daily: 'today', weekly: 'week', monthly: 'month',
    quarterly: 'month', yearly: 'month' };
  let duties = [];
  try { duties = dutiesFor(roleCode, hospitalId, userId) || []; } catch (e) { duties = []; }
  for (const d of duties) {
    const b = CAD_BUCKET[d.cadence];
    if (!b || d.done) continue;
    buckets[b].push({
      key: d.key, kind: 'duty', count: null,
      title: d.title, why: d.desc, page: d.page, cadence: CADENCE_FA[d.cadence] || '',
    });
  }

  // ---- ۳. کارهای همین دوره که *انجام شده‌اند* ----
  //
  // آزمونِ همه‌ی سمت‌ها نشان داد پنج سمت فهرستِ خالی می‌گیرند — و بررسی معلوم کرد
  // این صادقانه است: کارشان واقعاً انجام شده. ولی صفحه‌ی خالی به کاربر نمی‌گوید
  // «مسئولیتِ تو چیست»، فقط می‌گوید «چیزی نیست»، و همان چیزی است که کارفرما
  // «پوشش نمی‌دهد» خواند. پس وقتی کاری باقی نمانده، همان کارهای انجام‌شده‌ی این
  // دوره برگردانده می‌شوند تا فهرست هرگز واقعاً خالی نباشد.
  const done = duties.filter(d => d.done).map(d => ({
    key: d.key, title: d.title, page: d.page, cadence: CADENCE_FA[d.cadence] || '',
  }));

  return {
    today: buckets.today, week: buckets.week, month: buckets.month,
    done,
    total: buckets.today.length + buckets.week.length + buckets.month.length,
  };
}

module.exports = { myWork, SIGNALS };

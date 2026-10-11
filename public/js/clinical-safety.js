/* ==========================================================================
 * ماژول الزامات بالینی و ایمنی بیمار (Clinical Safety & Never Events)
 * چک‌لیست ۳ مرحله‌ای جراحی ایمن (WHO)، تلفیق دارویی، خطاهای ۲۸ گانه و پسماند
 * ========================================================================== */

const safetyStatusBadge = (r) => {
  const map = {
    completed: '<span class="chip" style="background:rgba(0,229,153,.15);color:#00e599">تکمیل و تأیید شد ✓</span>',
    in_progress: '<span class="chip" style="background:rgba(212,175,90,.15);color:#d4af5a">در حال اجرا</span>',
    flagged: '<span class="chip" style="background:rgba(255,56,96,.15);color:#ff3860">نیازمند مداخله ⚠️</span>',
    approved: '<span class="chip" style="background:rgba(0,229,153,.15);color:#00e599">تأیید پزشک معالج</span>',
    negative: '<span class="chip" style="background:rgba(0,229,153,.15);color:#00e599">منفی (پاس استاندارد) ✓</span>',
    positive: '<span class="chip" style="background:rgba(255,56,96,.15);color:#ff3860">مثبت (آلوده - اخطار) ⚠️</span>'
  };
  return map[r.overall_status || r.status || r.spore_test_status] || esc(r.overall_status || r.status);
};

const safetyDiscBadge = (r) => {
  return r.discrepancy_found
    ? '<span class="chip" style="background:rgba(255,56,96,.15);color:#ff3860;font-weight:700">مغایرت شناسایی شد (' + esc(r.discrepancy_type||'عدم انطباق') + ')</span>'
    : '<span class="chip" style="color:#00e599">بدون مغایرت دارویی</span>';
};

RPG.define({
  key: 'safety',
  title: 'ایمنی بالینی، جراحی و خطاهای ۲۸ گانه',
  sub: 'چک‌لیست ۳ مرحله‌ای جراحی ایمن سازمان جهانی بهداشت، تلفیق دارویی، ممیزی بهداشت دست و پسماند',
  icon: '🛡️',
  perms: ['view_safe_surgery', 'manage_safe_surgery'],
  tabs: [
    ['dash', 'داشبورد ایمنی بالینی'],
    ['safesurgery', 'جراحی ایمن (۳ مرحله‌ای)'],
    ['medrecon', 'تلفیق دارویی و LASA'],
    ['waste', 'پسماند پزشکی و اتوکلاو']
  ],
  dashboard: (d, key) => {
    if (!d) return '<div class="empty">داده‌ای یافت نشد</div>';

    return `
      <div class="kpi-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin-bottom:20px">
        <!-- Never Events -->
        <div class="panel g" style="padding:18px;border-radius:14px;background:rgba(18,24,38,0.7);backdrop-filter:blur(10px);border:1px solid rgba(255,56,96,0.25)">
          <div style="font-size:12px;color:var(--td);margin-bottom:6px">خطاهای ۲۸ گانه بیمارستانی (Never Events)</div>
          <div style="display:flex;align-items:baseline;justify-content:space-between">
            <span style="font-size:32px;font-weight:900;color:#ff3860">${fa(d.never_events_count)}</span>
            <span class="chip" style="background:rgba(255,56,96,.15);color:#ff3860">${fa(d.sentinel_events_count)} وقایع سنتینل</span>
          </div>
          <div style="font-size:12px;color:var(--td);margin-top:10px">
            تحلیل ریشه‌ای (RCA) انجام‌شده: <b style="color:#00e599">${fa(d.rca_done_count)}</b> / در حال اقدام: <b style="color:#e08f3c">${fa(d.rca_pending_count)}</b>
          </div>
        </div>

        <!-- Safe Surgery -->
        <div class="panel g" style="padding:18px;border-radius:14px;background:rgba(18,24,38,0.7);backdrop-filter:blur(10px);border:1px solid rgba(0,240,255,0.2)">
          <div style="font-size:12px;color:var(--td);margin-bottom:6px">چک‌لیست ۳ مرحله‌ای جراحی ایمن (WHO)</div>
          <div style="display:flex;align-items:baseline;justify-content:space-between">
            <span style="font-size:32px;font-weight:900;color:#00f0ff">${fa(d.surgery_checklists_count)}</span>
            <span class="chip" style="background:rgba(0,240,255,.12);color:#00f0ff">انطباق ۱۰۰٪</span>
          </div>
          <div style="font-size:12px;color:var(--td);margin-top:10px">
            مراحل Sign In, Time Out, Sign Out با امضای اتاق عمل
          </div>
        </div>

        <!-- Medication Reconciliation -->
        <div class="panel g" style="padding:18px;border-radius:14px;background:rgba(18,24,38,0.7);backdrop-filter:blur(10px);border:1px solid rgba(212,175,90,0.2)">
          <div style="font-size:12px;color:var(--td);margin-bottom:6px">تلفیق دارویی و رهگیری LASA</div>
          <div style="display:flex;align-items:baseline;justify-content:space-between">
            <span style="font-size:32px;font-weight:900;color:#d4af5a">${fa(d.med_reconciliations_count)}</span>
            <span class="chip" style="background:rgba(212,175,90,.12);color:#d4af5a">${fa(d.discrepancies_detected)} مداخله داروساز</span>
          </div>
          <div style="font-size:12px;color:var(--td);margin-top:10px">
            پیشگیری از تداخلات و خطای دوز داروهای پرخطر
          </div>
        </div>

        <!-- Waste & Sterilization -->
        <div class="panel g" style="padding:18px;border-radius:14px;background:rgba(18,24,38,0.7);backdrop-filter:blur(10px);border:1px solid rgba(0,229,153,0.2)">
          <div style="font-size:12px;color:var(--td);margin-bottom:6px">پسماند عفونی و بی‌خطرسازی</div>
          <div style="display:flex;align-items:baseline;justify-content:space-between">
            <span style="font-size:32px;font-weight:900;color:#00e599">${fa(d.autoclaved_waste_kg)} <span style="font-size:14px;color:var(--mut)">کیلوگرم</span></span>
            <span class="chip" style="background:rgba(0,229,153,.12);color:#00e599">اسپور منفی: ${fa(d.spore_pass_rate)}٪</span>
          </div>
          <div style="font-size:12px;color:var(--td);margin-top:10px">
            انطباق بهداشت دست بخش‌ها: <b style="color:#00f0ff">${fa(d.hand_hygiene_compliance)}٪</b>
          </div>
        </div>
      </div>

      <!-- Quick Action Toolbar -->
      <div class="panel g" style="padding:14px 18px;margin-bottom:20px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;border-radius:14px;background:rgba(26,32,48,0.5)">
        <b style="color:var(--th);font-size:13px">اقدامات بالینی و ایمنی:</b>
        <button type="button" class="btn-g" style="padding:8px 16px;border-radius:10px;font-size:12px;cursor:pointer" onclick="RPG.go('${key}','safesurgery');RPG.edit('${key}','')">+ ثبت چک‌لیست جراحی ایمن (اتاق عمل)</button>
        <button type="button" class="tgl gold" style="padding:8px 16px;border-radius:10px;font-size:12px;cursor:pointer" onclick="RPG.go('${key}','medrecon');RPG.edit('${key}','')">+ ثبت فرم تلفیق دارویی بالینی</button>
        <button type="button" class="tgl" style="padding:8px 16px;border-radius:10px;font-size:12px;cursor:pointer" onclick="RPG.go('${key}','waste');RPG.edit('${key}','')">+ ثبت رکورد پسماند و تست اتوکلاو</button>
        <button type="button" class="tgl" style="padding:8px 16px;border-radius:10px;font-size:12px;cursor:pointer" onclick="go('errors')">⚠️ مشاهده و مدیریت کارتابل خطاهای ۲۸ گانه</button>
      </div>

      <!-- 2 Columns: Safe Surgery & Recent Never Events -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px">
        <!-- Safe Surgery Checklists List -->
        <div class="panel g" style="border-radius:14px">
          <div class="phd"><b>آخرین چک‌لیست‌های جراحی ایمن در اتاق عمل</b></div>
          <div class="pbody" style="padding:16px">
            ${(d.recent_surgeries && d.recent_surgeries.length) ? `
              <div style="display:flex;flex-direction:column;gap:10px">
                ${d.recent_surgeries.map(s => `
                  <div style="padding:10px 14px;background:rgba(255,255,255,0.03);border-radius:10px;border-right:3px solid #00f0ff">
                    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
                      <b style="color:var(--th)">${esc(s.patient_name)} (${esc(s.surgery_type)})</b>
                      <span class="chip" style="background:rgba(0,229,153,.15);color:#00e599">Sign In/Out ✓</span>
                    </div>
                    <div style="font-size:11.5px;color:var(--mut)">اتاق عمل: ${esc(s.operating_room)} | جراح: ${esc(s.surgeon_name)} | تاریخ: ${esc(s.surgery_date)}</div>
                  </div>
                `).join('')}
              </div>
            ` : '<div class="empty">موردی ثبت نشده است</div>'}
          </div>
        </div>

        <!-- Never Events & RCA -->
        <div class="panel g" style="border-radius:14px">
          <div class="phd"><b>ثبت و تحلیل ریشه‌ای خطاهای ۲۸ گانه (RCA)</b></div>
          <div class="pbody" style="padding:16px">
            ${(d.recent_never_events && d.recent_never_events.length) ? `
              <div style="display:flex;flex-direction:column;gap:10px">
                ${d.recent_never_events.map(ne => `
                  <div style="padding:10px 14px;background:rgba(255,255,255,0.03);border-radius:10px;border-right:3px solid #ff3860">
                    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
                      <b style="color:#ff3860">${esc(ne.never_event_code)}: ${esc(ne.error_category)}</b>
                      <span class="chip" style="background:rgba(255,56,96,.15);color:#ff3860">${ne.needs_rca ? 'تحلیل RCA فعال' : 'ثبت‌شده'}</span>
                    </div>
                    <div style="font-size:11.5px;color:var(--mut)">بخش: ${esc(ne.error_ward||'—')} | شرح: ${esc((ne.description||'').slice(0, 60))}...</div>
                  </div>
                `).join('')}
              </div>
            ` : '<div class="empty">خطای ۲۸ گانه‌ای ثبت نشده است</div>'}
          </div>
        </div>
      </div>
    `;
  },
  spec: {
    safesurgery: {
      title: 'چک‌لیست ۳ مرحله‌ای جراحی ایمن (WHO)', icon: '🔪',
      sub: 'الزام ملی و بین‌المللی ایمنی جراحی: قبل از بیهوشی (Sign In)، قبل از برش (Time Out)، قبل از خروج (Sign Out)',
      fields: [
        { k: 'patient_name', l: 'نام و نام خانوادگی بیمار *', t: 'text', list: 1 },
        { k: 'file_number', l: 'شماره پرونده *', t: 'text', list: 1 },
        { k: 'surgery_date', l: 'تاریخ عمل *', t: 'text', list: 1 },
        { k: 'operating_room', l: 'شماره اتاق عمل *', t: 'text', list: 1 },
        { k: 'surgeon_name', l: 'جراح مسئول *', t: 'text', list: 1 },
        { k: 'anesthesiologist_name', l: 'متخصص بیهوشی *', t: 'text' },
        { k: 'surgery_type', l: 'نوع عمل جراحی *', t: 'text', list: 1 },
        // Phase 1
        { k: 'phase1_patient_confirmed', l: 'مرحله ۱: هویت، رضایت و موضع عمل تأیید شد', t: 'bool', list: 1 },
        { k: 'phase1_site_marked', l: 'مرحله ۱: علامت‌گذاری محل جراحی انجام شد', t: 'bool' },
        { k: 'phase1_pulse_oximeter', l: 'مرحله ۱: پالس‌اکسی‌متر متصل و فعال است', t: 'bool' },
        { k: 'phase1_allergy_checked', l: 'مرحله ۱: آلرژی و حساسیت دارویی بررسی شد', t: 'bool' },
        // Phase 2
        { k: 'phase2_team_intro', l: 'مرحله ۲ (Time Out): معرفی حضوری اعضای تیم جراحی', t: 'bool' },
        { k: 'phase2_verbal_confirm', l: 'مرحله ۲: تأیید شفاهی نام بیمار، موضع و نوع عمل', t: 'bool', list: 1 },
        { k: 'phase2_antibiotic_prophylaxis', l: 'مرحله ۲: آنتی‌بیوتیک پیشگیرانه ظرف ۶۰ دقیقه تزریق شد', t: 'bool' },
        { k: 'phase2_sterility_confirmed', l: 'مرحله ۲: اندیکاتورهای استریلیزاسیون ست تأیید شد', t: 'bool' },
        // Phase 3
        { k: 'phase3_sponge_needle_count', l: 'مرحله ۳ (Sign Out): شمارش گاز، سوزن و وسایل دقیق و کامل است', t: 'bool', list: 1 },
        { k: 'phase3_specimen_labeled', l: 'مرحله ۳: نمونه پاتولوژی با برچسب و مشخصات بیمار تطبیق یافت', t: 'bool' },
        { k: 'phase3_postop_recovery_plan', l: 'مرحله ۳: دستورات مراقبتی ریکاوری توسط جراح و بیهوشی ثبت شد', t: 'bool' },
        { k: 'overall_status', l: 'وضعیت تکمیل چک‌لیست', t: 'select', list: 1, chip: 1, render: safetyStatusBadge,
          opts: [
            ['completed', 'تکمیل و تأیید شد ✓'],
            ['in_progress', 'در حال اجرا'],
            ['flagged', 'نیازمند مداخله ⚠️']
          ] },
        { k: 'notes', l: 'توضیحات و موارد خاص اتاق عمل', t: 'area' }
      ]
    },
    medrecon: {
      title: 'تلفیق دارویی و داروهای پرخطر (High-Alert / LASA)', icon: '💊',
      sub: 'تلفیق داروها در بدو پذیرش، انتقال و ترخیص و پیشگیری از خطاهای داروهای با اسامی و اشکال مشابه',
      fields: [
        { k: 'patient_name', l: 'نام بیمار *', t: 'text', list: 1 },
        { k: 'file_number', l: 'شماره پرونده *', t: 'text', list: 1 },
        { k: 'department', l: 'بخش مربوطه *', t: 'text', list: 1 },
        { k: 'reconciliation_stage', l: 'مرحله تلفیق *', t: 'select', list: 1, chip: 1,
          opts: [
            ['admission', 'بدو پذیرش بیمار'],
            ['transfer', 'انتقال بین بخشی (مثلاً ICU به بخش)'],
            ['discharge', 'هنگام ترخیص']
          ] },
        { k: 'reconciled_date', l: 'تاریخ تلفیق *', t: 'text', list: 1 },
        { k: 'discrepancy_found', l: 'مغایرت شناسایی شد', t: 'bool', list: 1, render: safetyDiscBadge },
        { k: 'discrepancy_type', l: 'نوع مغایرت', t: 'select', chip: 1,
          opts: [
            ['omission', 'حذف داروی ضروری بیمار'],
            ['duplication', 'تجویز تکراری و ناخواسته'],
            ['dosing', 'خطای دوز یا زمان‌بندی مصرف'],
            ['interaction', 'تداخل دارویی شدید']
          ] },
        { k: 'pharmacist_note', l: 'گزارش مداخله داروساز بالینی', t: 'area', list: 1 },
        { k: 'conducted_by', l: 'انجام‌دهنده تلفیق', t: 'text' },
        { k: 'physician_signoff', l: 'پزشک تأییدکننده', t: 'text', list: 1 },
        { k: 'status', l: 'وضعیت پرونده', t: 'select', list: 1, chip: 1, render: safetyStatusBadge,
          opts: [
            ['approved', 'تأیید پزشک معالج'],
            ['under_review', 'در انتظار بازبینی'],
            ['flagged', 'هشدار تداخل']
          ] }
      ]
    },
    waste: {
      title: 'مدیریت پسماند و بی‌خطرسازی اتوکلاو', icon: '♻️',
      sub: 'پایش تفکیک در مبدأ، وزن‌کشی روزانه پسماندهای عفونی، تیز و شیمیایی، آزمون بیولوژیک اسپور و مانیفست حمل',
      fields: [
        { k: 'log_date', l: 'تاریخ *', t: 'text', list: 1 },
        { k: 'infectious_kg', l: 'پسماند عفونی (کیلوگرم) *', t: 'num', list: 1 },
        { k: 'sharps_kg', l: 'تیز و برنده - Safety Box (کیلوگرم) *', t: 'num', list: 1 },
        { k: 'chemical_pharma_kg', l: 'شیمیایی و دارویی (کیلوگرم)', t: 'num' },
        { k: 'normal_kg', l: 'عادی / شبه‌خانگی (کیلوگرم)', t: 'num', list: 1 },
        { k: 'total_waste_kg', l: 'مجموع کل پسماند (کیلوگرم) *', t: 'num', list: 1 },
        { k: 'autoclaved_kg', l: 'بی‌خطرسازی‌شده توسط اتوکلاو (کیلوگرم) *', t: 'num', list: 1 },
        { k: 'autoclave_cycle_no', l: 'شماره سیکل اتوکلاو', t: 'text' },
        { k: 'spore_test_status', l: 'نتیجه تست بیولوژیک اسپور *', t: 'select', list: 1, chip: 1, render: safetyStatusBadge,
          opts: [
            ['negative', 'منفی (پاس استاندارد) ✓'],
            ['positive', 'مثبت (آلوده - اخطار) ⚠️'],
            ['pending', 'در حال انکوباسیون']
          ] },
        { k: 'chemical_indicator_pass', l: 'اندیکاتور شیمیایی کلاس ۶ پاس شد', t: 'bool' },
        { k: 'disposal_manifest_no', l: 'شماره مانیفست شهرداری / پیمانکار', t: 'text', list: 1 },
        { k: 'operator_name', l: 'نام اپراتور امحا', t: 'text' },
        { k: 'officer_approved', l: 'تأیید کارشناس بهداشت محیط', t: 'bool', list: 1 },
        { k: 'notes', l: 'توضیحات فرآیندی', t: 'area' }
      ]
    }
  }
});

const renderSafety = () => RPG.render('safety');
const safetyCanView = () => RPG.canView('safety');


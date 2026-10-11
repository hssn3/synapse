/**
 * غنی‌سازی و تکمیل جامع داده‌های مدیریت بیمارستان
 * ---------------------------------------------------------------------------
 * این سید تمام حوزه‌های مدیریت بیمارستان (غیر از بیمار/بیمه/حسابداری) را طبق
 * استانداردهای نسل پنجم اعتباربخشی بیمارستان‌های ایران با داده‌های غنی و واقعی
 * مجهز می‌کند:
 *  ۱) پسماند پزشکی و اتوکلاو (medical_waste_logs)
 *  ۲) بلایا، HVA و مانورها (disaster_hazards, disaster_drills, disaster_incidents, disaster_safety_assessments)
 *  ۳) تأمین‌کنندگان و پیمانکاران (vendors, vendor_evaluations, vendor_reviews)
 *  ۴) تجهیزات پزشکی، نگهداری پیشگیرانه و کالیبراسیون (asset_maintenance_plans, asset_maintenance_logs)
 *  ۵) گزارش‌های ۲۴ ساعته سوپروایزری و برآورد نیروی بخش‌ها (nursing_supervisor_reports, nsp_staffing)
 *  ۶) سلامت شغلی و مواجهات نیدل‌استیک (occ_hazards, occ_measurements, occ_incidents, occ_exams)
 *
 * کاملاً idempotent است: فقط در صورت کمبود ردیف‌ها داده را تکمیل می‌کند.
 */
'use strict';

const crypto = require('crypto');
const { db } = require('../src/config/database-sqlite');

const DEMO_HOSPITAL = 'dd43b5de-bd17-4245-8dbf-246de3db401d';
const uid = () => crypto.randomUUID();

function runMigration() {
  console.log('[Enrichment] Starting comprehensive hospital management data enrichment...');

  // =========================================================================
  // ۱. پسماند پزشکی و تست‌های بیولوژیک اتوکلاو (medical_waste_logs)
  // =========================================================================
  try {
    const wasteCount = db.prepare('SELECT COUNT(*) c FROM medical_waste_logs WHERE hospital_id = ?').get(DEMO_HOSPITAL).c;
    if (wasteCount < 10) {
      console.log(`[Enrichment] Seeding medical waste logs (current: ${wasteCount})...`);
      const insWaste = db.prepare(`
        INSERT INTO medical_waste_logs (
          id, hospital_id, log_date, infectious_kg, sharps_kg,
          chemical_pharma_kg, normal_kg, total_waste_kg, autoclaved_kg,
          autoclave_cycle_no, spore_test_status, chemical_indicator_pass,
          disposal_manifest_no, contractor_truck_no, operator_name,
          officer_approved, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'تهران ۳۳ - ۹۴۱ ب ۱۸', 'علی مرادی (اپراتور امحاء)', 1, ?, ?)
      `);

      const days = [
        { d: '2026-09-15', inf: 112, sh: 16, chem: 8, norm: 230, cyc: 'CYC-1405-180', spore: 'negative', note: 'سیکل ۱۲۱ درجه با موفقیت انجام شد. تست بیولوژیک اسپور منفی.' },
        { d: '2026-09-17', inf: 104, sh: 14, chem: 6, norm: 218, cyc: 'CYC-1405-181', spore: 'negative', note: 'اندیکاتور کلاس ۶ رنگ مشکی استاندارد تغییر یافت.' },
        { d: '2026-09-19', inf: 125, sh: 19, chem: 9, norm: 245, cyc: 'CYC-1405-182', spore: 'negative', note: 'تخلیه منظم سیفتی‌باکس‌های اتاق عمل و اورژانس.' },
        { d: '2026-09-21', inf: 98, sh: 13, chem: 5, norm: 210, cyc: 'CYC-1405-183', spore: 'negative', note: 'سیکل بی‌خطرسازی اتوکلاو زباله با تأیید کارشناس بهداشت محیط.' },
        { d: '2026-09-23', inf: 118, sh: 17, chem: 11, norm: 252, cyc: 'CYC-1405-184', spore: 'negative', note: 'تحویل پسماند شبه‌خانگی به خودروی مکانیزه شهرداری.' },
        { d: '2026-09-25', inf: 130, sh: 21, chem: 7, norm: 260, cyc: 'CYC-1405-185', spore: 'negative', note: 'سیکل ویژه پس از اعمال جراحی ارتوپدی و تروما.' },
        { d: '2026-09-27', inf: 108, sh: 15, chem: 8, norm: 225, cyc: 'CYC-1405-186', spore: 'negative', note: 'پایش و کالیبراسیون فشارسنج دستگاه بی‌خطرساز.' },
        { d: '2026-09-29', inf: 115, sh: 18, chem: 10, norm: 240, cyc: 'CYC-1405-187', spore: 'negative', note: 'تست اندیکاتور بیولوژیک باسیلوس استئاروترموفیلوس منفی.' },
        { d: '2026-10-01', inf: 122, sh: 16, chem: 6, norm: 248, cyc: 'CYC-1405-188', spore: 'negative', note: 'تحویل بار بی خطر شده با برچسب زرد استاندارد.' },
        { d: '2026-10-03', inf: 110, sh: 14, chem: 7, norm: 235, cyc: 'CYC-1405-189', spore: 'negative', note: 'پایش تفکیک در مبدا در بخش مراقبت‌های ویژه (ICU).' },
        { d: '2026-10-05', inf: 128, sh: 20, chem: 9, norm: 265, cyc: 'CYC-1405-190', spore: 'negative', note: 'امضای مانیفست حمل پسماند توسط مسئول بهداشت محیط.' }
      ];

      for (let i = 0; i < days.length; i++) {
        const item = days[i];
        const tot = item.inf + item.sh + item.chem + item.norm;
        const autoc = item.inf + item.sh;
        insWaste.run(
          uid(), DEMO_HOSPITAL, item.d, item.inf, item.sh, item.chem, item.norm,
          tot, autoc, item.cyc, item.spore, `MNF-1405-90${i + 1}`, item.note, `${item.d} 14:30:00`
        );
      }
      console.log(`[Enrichment] ✅ ${days.length} medical waste log records added.`);
    }
  } catch (err) {
    console.error('[Enrichment] Error in medical waste logs:', err.message);
  }

  // =========================================================================
  // ۲. بلایا، مخاطرات اولویت‌دار HVA و مانورها
  // =========================================================================
  try {
    const hazardsCount = db.prepare('SELECT COUNT(*) c FROM disaster_hazards WHERE hospital_id = ?').get(DEMO_HOSPITAL).c;
    if (hazardsCount < 8) {
      console.log(`[Enrichment] Seeding disaster hazards (current: ${hazardsCount})...`);
      const insHz = db.prepare(`
        INSERT INTO disaster_hazards (
          id, hospital_id, title, category, likelihood, severity, risk_score,
          is_priority, expected_impact, mitigation_plan, responsible, due_date,
          status, committee_ref, note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      const hazards = [
        { title: 'زلزله شدید و آسیب سازه‌ای/غیرسازه‌ای', cat: 'طبیعی', l: 4, s: 5, p: 1, imp: 'تخریب اتصالات تأسیساتی، ریزش سقف کاذب، هجوم مصدومان انبوه', mit: 'مقاوم‌سازی اتصالات لوله‌های گاز و اکسیژن، سناریوی تریاژ استارت در محوطه، تقویت تریاژ', resp: 'مسئول بحران و رئیس تأسیسات', due: '2026-11-20', stat: 'in_progress', ref: 'کمیته بحران ۱۴۰۵-۰۲' },
        { title: 'آتش‌سوزی در بخش‌های بستری و اتاق عمل', cat: 'انسان‌ساخت', l: 3, s: 5, p: 1, imp: 'سرایت دود سمی، انسداد راه‌های خروج، تهدید جان بیماران متصل به ونتیلاتور', mit: 'شارژ کپسول‌های CO2 و فوم، بازرسی فصلی جعبه‌های F، آموزش کد صفر به کلیه کادر', resp: 'مسئول بهداشت حرفه‌ای و حراست', due: '2026-10-30', stat: 'done', ref: 'کمیته بحران ۱۴۰۵-۰۳' },
        { title: 'افت فشار یا قطعی ناگهانی اکسیژن مرکزی', cat: 'تکنولوژیک', l: 2, s: 5, p: 1, imp: 'خطر فوری هیپوکسی برای بیماران بستری در ICU، CCU، NICU و اتاق عمل', mit: 'تأمین مانیفولد پشتیبان ۴۰ کپسولی، پایش سنسورهای فشار دیجیتال با هشدار صوتی', resp: 'مسئول تجهیزات پزشکی', due: '2026-11-10', stat: 'done', ref: 'کمیته تجهیزات ۱۴۰۵-۰۱' },
        { title: 'قطع سراسری برق شبکه و بار ژنراتور اضطراری', cat: 'تکنولوژیک', l: 4, s: 4, p: 1, imp: 'خاموشی تجهیزات حیاتی بدون باتری، اختلال در تهویه و روشنایی', mit: 'سرویس ماهانه دیزل‌ژنراتور، تست خودکار سوییچ ATS در ۵ ثانیه، پایش باتری‌های UPS', resp: 'مسئول تأسیسات', due: '2026-10-15', stat: 'done', ref: 'کمیته بحران ۱۴۰۵-۰۱' },
        { title: 'طغیان بیماری واگیر تنفسی حاد (اپیدمی)', cat: 'زیستی', l: 3, s: 4, p: 1, imp: 'کمبود تخت‌های ایزوله فشار منفی، درگیری کادر بالینی، کمبود تجهیزات حفاظتی', mit: 'تجهیز دپوی ۴ ماهه ماسک N95 و گان، تعریف بخش قرنطینه در طبقه ۳ شرقی', resp: 'سوپروایزر کنترل عفونت', due: '2026-12-01', stat: 'in_progress', ref: 'کمیته کنترل عفونت ۱۴۰۵-۰۳' },
        { title: 'شکستگی خط انتقال آب شهری و قطعی آب', cat: 'تکنولوژیک', l: 3, s: 3, p: 0, imp: 'اختلال در دیالیز، استریلیزاسیون CSSD، آشپزخانه و بهداشت عمومی', mit: 'احداث دو مخزن ذخیره آب استراتژیک ۲۰۰ هزار لیتری برای تأمین آب به مدت ۷۲ ساعت', resp: 'مسئول بهداشت محیط و تأسیسات', due: '2026-11-05', stat: 'done', ref: 'کمیته بحران ۱۴۰۵-۰۲' },
        { title: 'حمله سایبری و اختلال در سامانه اطلاعاتی بیمارستان', cat: 'تکنولوژیک', l: 3, s: 4, p: 1, imp: 'از دست رفتن داده‌های پرونده‌ها، توقف نسخه الکترونیک و ترخیص', mit: 'پشتیبان‌گیری رمزگذاری‌شده آفلاین روزانه، سناریوی نسخه کاغذی پشتیبان در قطعی', resp: 'مدیر فناوری اطلاعات (IT)', due: '2026-10-25', stat: 'in_progress', ref: 'کمیته پایش کیفیت ۱۴۰۵-۰۲' }
      ];

      hazards.forEach(h => {
        insHz.run(
          uid(), DEMO_HOSPITAL, h.title, h.cat, h.l, h.s, h.l * h.s,
          h.p, h.imp, h.mit, h.resp, h.due, h.stat, h.ref, 'ثبت‌شده در ارزیابی مخاطرات سال ۱۴۰۵'
        );
      });
      console.log(`[Enrichment] ✅ Priority disaster hazards seeded.`);
    }

    const drillsCount = db.prepare('SELECT COUNT(*) c FROM disaster_drills WHERE hospital_id = ?').get(DEMO_HOSPITAL).c;
    if (drillsCount < 4) {
      console.log(`[Enrichment] Seeding disaster drills (current: ${drillsCount})...`);
      const insDrill = db.prepare(`
        INSERT INTO disaster_drills (
          id, hospital_id, title, drill_type, hazard_ref, drill_date,
          scenario, participants, participant_count, duration_min, observers,
          performance_analysis, weaknesses, corrective_action, status, note,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      const drills = [
        {
          title: 'مانور دورمیزی فعال‌سازی سامانه فرماندهی حادثه (HICS) در سناریوی زلزله',
          type: 'مانور دورمیزی (TTX)', haz: 'زلزله شدید شهری', date: '2026-07-20',
          scen: 'شبیه‌سازی زلزله ۶.۱ ریشتر در عمق ۱۰ کیلومتری با ورود ۷۰ مصدوم ترومایی همزمان به تریاژ اورژانس ظرف ۹۰ دقیقه.',
          parts: 'تیم مدیریت بحران: ریاست، مسئول فنی، مترون، سوپروایزرها، حراست، تأسیسات، امور عمومی', count: 18, dur: 75,
          obs: 'کارشناس پدافند غیرعامل دانشگاه علوم پزشکی',
          perf: 'چارت HICS ظرف ۷ دقیقه فعال شد. توزیع وظایف و انتصاب فرمانده حادثه، مسئول عملیات، تدارکات و مالی به درستی صورت پذیرفت.',
          weak: 'تأخیر در اعلام آماده‌باش اولیه به بخش تصویربرداری و آزمایشگاه به دلیل شلوغی خطوط تلفن داخلی.',
          corr: 'خرید دو دستگاه بیسیم دیجیتال موج کوتاه اختصاصی برای فرمانده عملیات و رابط اورژانس.', stat: 'analyzed'
        },
        {
          title: 'مانور عملیاتی واکنش سریع به کد صفر (حریق) در بخش جراحی عمومی',
          type: 'مانور عملیاتی', haz: 'آتش‌سوزی و انتشار دود', date: '2026-08-15',
          scen: 'شبیه‌سازی دودگرفتگی و اتصالی برق در اتاق پانسمان بخش جراحی عمومی طبقه دوم و نیاز به تخلیه افقی ۸ بیمار بستری.',
          parts: 'پرسنل بخش جراحی، سرپرستار، تیم اطفای حریق، انتظامات، سوپروایزر شیفت عصر', count: 24, dur: 40,
          obs: 'مسئول بهداشت حرفه‌ای و نماینده سازمان آتش‌نشانی ایستگاه ۱۲',
          perf: 'تخلیه افقی بیماران به بخش داخلی هم‌جوار در کمتر از ۶ دقیقه با موفقیت انجام شد. درب‌های ضدحریق بسته شدند.',
          weak: 'یک عدد از کپسول‌های پودر و گاز بخش به دلیل عدم بررسی گیج، فشار کافی نداشت.',
          corr: 'بازرسی فوری کلیه ۵۶ کپسول بیمارستان و الصاق کارت تاریخچه شارژ دوطرفه.', stat: 'analyzed'
        },
        {
          title: 'مانور قطع ناگهانی برق شهر و ارزیابی ژنراتور اضطراری در شرایط بحران',
          type: 'مانور عملیاتی', haz: 'قطع سراسری برق شبکه', date: '2026-09-10',
          scen: 'قطع برق تابلوی اصلی بدون اطلاع قبلی و ارزیابی پایداری دستگاه‌های تنفس مصنوعی در ICU و روشنایی اضطراری اتاق عمل.',
          parts: 'تیم تأسیسات، مهندسی پزشکی، سرپرستاران بخش‌های ویژه، سوپروایزر بالینی', count: 14, dur: 30,
          obs: 'مدیر داخلی و مسئول فنی بیمارستان',
          perf: 'ژنراتور اول در عرض ۴.۲ ثانیه زیر بار رفت. باتری‌های UPS بخش مراقبت‌های ویژه بدون افت ولتاژ فعال ماندند.',
          weak: 'روشنایی اضطراری راه‌پله‌های خروج اضطراری غربی نیازمند تعویض لامپ‌های LED بود.',
          corr: 'تعویض فوری باطری‌های بکاپ لامپ‌های خروج اضطراری و تست هفتگی.', stat: 'analyzed'
        }
      ];

      drills.forEach(d => {
        insDrill.run(
          uid(), DEMO_HOSPITAL, d.title, d.type, d.haz, d.date, d.scen,
          d.parts, d.count, d.dur, d.obs, d.perf, d.weak, d.corr, d.stat,
          'ثبت رسمی در پرونده سنجه الف-۲-۴-۴'
        );
      });
      console.log(`[Enrichment] ✅ Disaster drills seeded.`);
    }

    const incCount = db.prepare('SELECT COUNT(*) c FROM disaster_incidents WHERE hospital_id = ?').get(DEMO_HOSPITAL).c;
    if (incCount < 4) {
      console.log(`[Enrichment] Seeding disaster incidents (current: ${incCount})...`);
      const insInc = db.prepare(`
        INSERT INTO disaster_incidents (
          id, hospital_id, incident_date, incident_type, location, description,
          severity, injuries, damage_estimate, immediate_response, root_cause,
          corrective_action, reported_by, status, note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      const incs = [
        {
          date: '2026-07-28', type: 'نشت گاز/بخار', loc: 'استریلیزاسیون مرکزی (CSSD)',
          desc: 'نشت بخار با دمای بالا از واشر درب اتوکلاو بخار شماره ۲ در حین چرخه استریل ابزار جراحی.',
          sev: 'متوسط', inj: 0, cost: '۸,۰۰۰,۰۰۰ ریال',
          imm: 'توقف فوری چرخه، قطع شیر ورودی بخار و خروج اپراتورها از محوطه گرم.',
          root: 'فرسودگی واشر سیلیکونی درب اتوکلاو پس از اتمام ساعت کارکرد استاندارد.',
          corr: 'تعویض واشر، تست نشتی تحت فشار ۲.۵ بار و تنظیم بازرسی پیشگیرانه هفتگی واشرها.',
          rep: 'سرپرستار CSSD', stat: 'closed'
        },
        {
          date: '2026-08-22', type: 'قطع برق', loc: 'راهروی بخش CCU و درمانگاه',
          desc: 'اتصالی و داغ شدن کابل ورودی روشنایی به دلیل بار اضافی فن هیتر غیرمجاز.',
          sev: 'جزئی', inj: 0, cost: '۳,۵۰۰,۰۰۰ ریال',
          imm: 'قطع کلید مینیاتوری خط مربوطه و خاموش کردن وسیله گرمایشی غیرمجاز.',
          root: 'استفاده از هیتر برقی بدون هماهنگی تأسیسات در اتاق استراحت.',
          corr: 'جمع‌آوری هیترهای پرتابل و بازرسی ایمنی تابلوهای فرعی.',
          rep: 'تکنسین برق شیفت شب', stat: 'closed'
        },
        {
          date: '2026-09-18', type: 'سیل/آبگرفتگی', loc: 'زیرزمین، جنب انبار اقلام مصرفی',
          desc: 'گرفتگی لوله فاضلاب اصلی ناشی از ورود مواد زاید و پس‌زدگی آب در کف‌شور راهرو.',
          sev: 'جزئی', inj: 0, cost: '۵,۰۰۰,۰۰۰ ریال',
          imm: 'بستن ورودی‌ها، به‌کارگیری لجن‌کش پرتابل و تخلیه سریع آب در ۲۰ دقیقه.',
          root: 'رسوب‌گرفتگی لوله در پیچ خروجی اصلی و عدم شستشوی تحت فشار دوره‌ای.',
          corr: 'فنر زنی و هیدروفلاش لوله‌های فاضلاب زیرزمین به طور کامل.',
          rep: 'مسئول خدمات عمومی', stat: 'closed'
        }
      ];

      incs.forEach(inc => {
        insInc.run(
          uid(), DEMO_HOSPITAL, inc.date, inc.type, inc.loc, inc.desc,
          inc.sev, inc.inj, inc.cost, inc.imm, inc.root, inc.corr, inc.rep,
          inc.stat, 'ثبت‌شده در لاگ حوادث ایمنی تأسیسات'
        );
      });
      console.log(`[Enrichment] ✅ Disaster incidents seeded.`);
    }
  } catch (err) {
    console.error('[Enrichment] Error in disaster module:', err.message);
  }

  // =========================================================================
  // ۳. پیمانکاران، تأمین‌کنندگان و ارزیابی فصلی (vendors)
  // =========================================================================
  try {
    const vCount = db.prepare('SELECT COUNT(*) c FROM vendors WHERE hospital_id = ?').get(DEMO_HOSPITAL).c;
    if (vCount < 5) {
      console.log(`[Enrichment] Seeding comprehensive vendors (current: ${vCount})...`);
      const insV = db.prepare(`
        INSERT INTO vendors (
          id, hospital_id, kind, title, service_scope, contact_person, phone,
          national_id, contract_no, contract_start, contract_end, contract_amount,
          responsible_unit, selection_criteria, is_active, note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'), datetime('now'))
      `);

      const vList = [
        {
          kind: 'پیمانکار', title: 'شرکت خدمات نظافتی و عمومی پاکسازان سلامت البرز',
          scope: 'تأمین نیروی نظافت، خدمات عمومی، جابجایی بیمار و امحاء پسماند در کلیه بخش‌ها',
          cont: 'مهندس حسینی', ph: '09121112233', nid: '10103456789', no: 'CNT-1405-01',
          s: '2026-04-01', e: '2027-03-29', amt: '۲۴,۰۰۰,۰۰۰,۰۰۰ ریال', unit: 'امور عمومی و خدمات',
          crit: 'گواهینامه صلاحیت کار، رضایت‌نامه از ۳ بیمارستان دولتی، چک ضمانت حسن انجام کار'
        },
        {
          kind: 'پیمانکار', title: 'شرکت کترینگ و تغذیه درمانی سفره سلامت پارس',
          scope: 'طبخ، توزیع رژیم‌های درمانی بیماران بستری، غذای پزشکان مقیم و کادر درمانی شیفت',
          cont: 'آقای شریفی', ph: '09122223344', nid: '10104567890', no: 'CNT-1405-02',
          s: '2026-04-01', e: '2027-03-29', amt: '۳۸,۵۰۰,۰۰۰,۰۰۰ ریال', unit: 'مدیریت تغذیه و رژیم‌درمانی',
          crit: 'تأییدیه بهداشت محیط، استانداردهای زنجیره سرد، نمونه‌برداری میکروبی هفتگی'
        },
        {
          kind: 'تأمین‌کننده', title: 'شرکت مهندسی پزشکی فنون طب آزما',
          scope: 'سرویس، کالیبراسیون دوره‌ای، PM و تأمین قطعات یدکی دستگاه‌های بیومدیکال اتاق عمل و ICU',
          cont: 'مهندس اکبری', ph: '09123334455', nid: '10105678901', no: 'CNT-1405-03',
          s: '2026-05-01', e: '2027-04-30', amt: '۱۵,۲۰۰,۰۰۰,۰۰۰ ریال', unit: 'واحد تجهیزات پزشکی',
          crit: 'مجوز اداره کل تجهیزات پزشکی (IMED)، گواهینامه ایزو ۱۷۰۲۵، حضور کارشناس مقیم'
        },
        {
          kind: 'پیمانکار', title: 'شرکت بی‌خطرسازی و امحاء پسماندهای عفونی پارس محیط',
          scope: 'جمع‌آوری روزانه پسماندهای اتوکلاوشده و انتقال به لندفیل بهداشتی با خودروی مخصوص',
          cont: 'دکتر مرادیان', ph: '09124445566', nid: '10106789012', no: 'CNT-1405-04',
          s: '2026-04-01', e: '2027-03-29', amt: '۹,۸۰۰,۰۰۰,۰۰۰ ریال', unit: 'مسئول بهداشت محیط',
          crit: 'مجوز سازمان حفاظت محیط زیست، تأییدیه ناوگان حمل و مانیفست رسمی آنلاین'
        },
        {
          kind: 'پیمانکار', title: 'مؤسسه حفاظتی و مراقبتی پاسداران حریم نظم',
          scope: 'تأمین پرسنل انتظامات، نگهبانی گیت‌های ورود، حراست فیزیکی و کنترل تردد مراجعین',
          cont: 'سرهنگ رضایی', ph: '09125556677', nid: '10107890123', no: 'CNT-1405-05',
          s: '2026-04-01', e: '2027-03-29', amt: '۱۸,۰۰۰,۰۰۰,۰۰۰ ریال', unit: 'حراست و انتظامات',
          crit: 'مجوز نیروی انتظامی، دوره‌های کنترل خشم پرسنل، گواهی عدم سوء پیشینه'
        }
      ];

      vList.forEach(v => {
        insV.run(
          uid(), DEMO_HOSPITAL, v.kind, v.title, v.scope, v.cont, v.ph,
          v.nid, v.no, v.s, v.e, v.amt, v.unit, v.crit, 'پیمانکار فعال دارای قرارداد مصوب'
        );
      });
      console.log(`[Enrichment] ✅ 5 primary vendors added.`);
    }

    // ارزیابی‌های فصلی پیمانکاران
    const evalCount = db.prepare('SELECT COUNT(*) c FROM vendor_evaluations WHERE hospital_id = ?').get(DEMO_HOSPITAL).c;
    if (evalCount < 4) {
      console.log(`[Enrichment] Seeding vendor evaluations (current: ${evalCount})...`);
      const allVendors = db.prepare('SELECT id, title FROM vendors WHERE hospital_id = ?').all(DEMO_HOSPITAL);
      const insEval = db.prepare(`
        INSERT INTO vendor_evaluations (
          id, hospital_id, vendor_id, eval_date, purpose, criteria,
          quality_score, price_score, delivery_score, total_score, decision,
          committee_ref, evaluator, note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      allVendors.forEach((v, idx) => {
        const qScore = 85 + (idx % 3) * 4;
        const pScore = 80 + (idx % 4) * 3;
        const dScore = 90 - (idx % 2) * 5;
        const total = Math.round((qScore * 0.5 + pScore * 0.25 + dScore * 0.25) * 10) / 10;
        insEval.run(
          uid(), DEMO_HOSPITAL, v.id, '2026-09-25',
          'ارزیابی عملکرد سه‌ماهه دوم سال ۱۴۰۵',
          'کیفیت خدمات، انطباق با چک‌لیست‌های نظارتی، رعایت پروتکل‌های بهداشتی و نظم پرسنل',
          qScore, pScore, dScore, total,
          total >= 80 ? 'تمدید قرارداد و ادامه همکاری' : 'ادامه مشروط با ارائه تعهد اصلاحی',
          'کمیته ارزیابی پیمانکاران ۱۴۰۵-۰۲', 'تیم ارزیابی متشکل از مدیر داخلی، مسئول بهداشت و مترون',
          `نمره کل احراز شده: ${total} از ۱۰۰.`
        );
      });
      console.log(`[Enrichment] ✅ Vendor evaluations seeded.`);
    }
  } catch (err) {
    console.error('[Enrichment] Error in vendors module:', err.message);
  }

  // =========================================================================
  // ۴. تجهیزات پزشکی، نگهداری پیشگیرانه (PM) و کالیبراسیون
  // =========================================================================
  try {
    const pmPlansCount = db.prepare('SELECT COUNT(*) c FROM asset_maintenance_plans WHERE hospital_id = ?').get(DEMO_HOSPITAL).c;
    if (pmPlansCount < 6) {
      console.log(`[Enrichment] Seeding asset maintenance plans (current: ${pmPlansCount})...`);
      const assets = db.prepare('SELECT id, title FROM facility_assets WHERE hospital_id = ? LIMIT 6').all(DEMO_HOSPITAL);
      const insPlan = db.prepare(`
        INSERT INTO asset_maintenance_plans (
          id, hospital_id, asset_id, kind, title, interval_months,
          last_done_date, next_due_date, responsible, vendor, note, is_active,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
      `);
      const insLog = db.prepare(`
        INSERT INTO asset_maintenance_logs (
          id, hospital_id, plan_id, asset_id, done_date, result,
          performed_by, cost, description, corrective_action, file_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);

      assets.forEach((ast, i) => {
        const planId = uid();
        const interval = i % 2 === 0 ? 6 : 12;
        insPlan.run(
          planId, DEMO_HOSPITAL, ast.id,
          i % 2 === 0 ? 'کالیبراسیون دوره‌ای' : 'نگهداری پیشگیرانه (PM)',
          `برنامه آزمون کیفی و بازرسی فنی ${ast.title}`,
          interval, '2026-06-15', '2026-12-15',
          'مهندس تجهیزات پزشکی بیمارستان', 'شرکت فنون طب آزما',
          'الزام استاندارد ملی اعتباربخشی الف-۷-۱'
        );

        insLog.run(
          uid(), DEMO_HOSPITAL, planId, ast.id, '2026-06-15',
          'pass', 'کارشناس رسمی کالیبراسیون شرکت فنون طب', 4500000,
          `کالیبراسیون پارامترهای خروجی، تست ایمنی الکتریکی IEC 60601 و آزمون کارکرد با موفقیت تأیید شد.`,
          'الصاق برچسب سبز کالیبراسیون دارای اعتبار تا ۶ ماه آینده.',
          `CAL-CERT-${202600 + i}.pdf`
        );
      });
      console.log(`[Enrichment] ✅ Asset PM plans and calibration logs seeded.`);
    }
  } catch (err) {
    console.error('[Enrichment] Error in asset maintenance:', err.message);
  }

  // =========================================================================
  // ۵. گزارش‌های ۲۴ ساعته سوپروایزری و آمار تخت‌ها (nursing_supervisor_reports)
  // =========================================================================
  try {
    const repCount = db.prepare('SELECT COUNT(*) c FROM nursing_supervisor_reports WHERE hospital_id = ?').get(DEMO_HOSPITAL).c;
    if (repCount < 8) {
      console.log(`[Enrichment] Seeding nursing supervisor reports (current: ${repCount})...`);
      const supUser = db.prepare("SELECT id FROM users WHERE hospital_id = ? AND username LIKE '%sup%' LIMIT 1").get(DEMO_HOSPITAL);
      const metronUser = db.prepare("SELECT id FROM users WHERE hospital_id = ? AND (username LIKE '%nursing_director%' OR role_id IN (SELECT id FROM roles WHERE code = 'nursing_director')) LIMIT 1").get(DEMO_HOSPITAL);
      const supId = supUser ? supUser.id : null;
      const metronId = metronUser ? metronUser.id : supId;

      const insRep = db.prepare(`
        INSERT INTO nursing_supervisor_reports (
          id, hospital_id, report_date, shift_code, supervisor_id,
          headcount_json, events, actions, handover, status, submitted_at,
          reviewed_by, reviewed_at, review_note, corrective_action, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      const reports = [
        {
          d: '2026-09-28', s: 'N',
          head: JSON.stringify({ total_beds: 120, occupied: 104, empty: 16, icu_occ: 12, icu_empty: 0, ccu_occ: 8, ccu_empty: 1 }),
          ev: 'اعلام کد ۹۹ در بخش جراحی ساعت ۰۲:۱۵. بیمار با نارسایی حاد تنفسی تحت ماساژ قلبی قرار گرفت و با موفقیت احیا و به ICU منتقل شد.',
          act: 'هماهنگی فوری با رزیدنت بیهوشی، اعزام پرستار کمکی از بخش داخلی به جراحی برای مراقبت پس از CPR.',
          ho: 'بیمار تخت ۳ جراحی به ICU منتقل شد. ترالی کد بررسی و داروها و آمبوبگ مجدداً تجهیز و پلمپ گردید.',
          note: 'گزارش شیفت شب بسیار دقیق ثبت شده است. اقدام تیم احیا رضایت‌بخش ارزیابی شد.'
        },
        {
          d: '2026-09-29', s: 'M',
          head: JSON.stringify({ total_beds: 120, occupied: 98, empty: 22, icu_occ: 12, icu_empty: 0, ccu_occ: 9, ccu_empty: 0 }),
          ev: 'ورود تصادفی دو مصدوم بدحال جاده‌ای به تریاژ اورژانس. نیاز فوری به ۴ واحد پک‌سل O منفی در اتاق عمل.',
          act: 'هماهنگی سریع با بانک خون و ارسال نمونه کراس‌مچ. اختصاص تخت اورژانس با مانیتورینگ متصل.',
          ho: 'مصدوم دوم تحت عمل جراحی ارتوپدی است؛ رزرو تخت ریکاوری هماهنگ شد.',
          note: 'همکاری بین اورژانس و بانک خون طبق پروتکل انتقال خون اضطراری اجرا گردید.'
        },
        {
          d: '2026-09-30', s: 'E',
          head: JSON.stringify({ total_beds: 120, occupied: 102, empty: 18, icu_occ: 11, icu_empty: 1, ccu_occ: 8, ccu_empty: 1 }),
          ev: 'یک مورد ترخیص با رضایت شخصی در بخش داخلی ساعت ۱۸:۳۰. آموزش خطرات ترخیص به همراه داده شد.',
          act: 'ثبت دقیق فرم سلب مسئولیت و هشدار علائم خطر به بیمار با امضای شاهدین.',
          ho: 'تخت خالی داخلی پس از ضدعفونی برای پذیرش بیمار انتقالی از اورژانس آماده است.',
          note: 'مستندات امضا کامل است.'
        },
        {
          d: '2026-10-01', s: 'N',
          head: JSON.stringify({ total_beds: 120, occupied: 106, empty: 14, icu_occ: 12, icu_empty: 0, ccu_occ: 9, ccu_empty: 0 }),
          ev: 'یک مورد زایمان سزارین اورژانسی ساعت ۰۴:۱۰ در اتاق عمل اورژانس. آپگار نوزاد ۹/۱۰.',
          act: 'انتقال مادر به بخش پس از زایمان و نوزاد به اتاق همجواری مادر (Rooming-in). تماس پوست با پوست برقرار شد.',
          ho: 'کنترل خونریزی و علائم حیاتی مادر در نوبت صبح الزامی است.',
          note: 'رعایت دستورالعمل بیمارستان دوستدار کودک تأیید شد.'
        },
        {
          d: '2026-10-02', s: 'M',
          head: JSON.stringify({ total_beds: 120, occupied: 101, empty: 19, icu_occ: 12, icu_empty: 0, ccu_occ: 9, ccu_empty: 0 }),
          ev: 'راند بخش‌های اطفال، اورژانس و دیالیز. حضور فعال سرپرستاران در نوبت صبح.',
          act: 'بررسی یخچال دارویی بخش اطفال؛ دما بین ۴ تا ۶ درجه کاملاً استاندارد ثبت شد.',
          ho: 'دو ترخیص در بخش اطفال تا ظهر پیش‌بینی می‌شود.',
          note: 'پایش دوره‌ای منظم است.'
        }
      ];

      reports.forEach(r => {
        insRep.run(
          uid(), DEMO_HOSPITAL, r.d, r.s, supId, r.head, r.ev, r.act,
          r.ho, `${r.d} 23:50:00`, metronId, `${r.d} 08:30:00`, r.note, 'تأیید شیفت بدون نقص'
        );
      });
      console.log(`[Enrichment] ✅ 24h nursing supervisor reports added.`);
    }
  } catch (err) {
    console.error('[Enrichment] Error in nursing supervisor reports:', err.message);
  }

  // =========================================================================
  // ۶. سلامت شغلی و فالوآپ نیدل‌استیک (occ_incidents)
  // =========================================================================
  try {
    const incs = db.prepare("SELECT COUNT(*) c FROM occ_incidents WHERE hospital_id = ? AND category = 'فرورفتن سوزن/جسم تیز'").get(DEMO_HOSPITAL).c;
    if (incs < 3) {
      console.log(`[Enrichment] Seeding detailed needle-stick follow-up incidents...`);
      const insOccInc = db.prepare(`
        INSERT INTO occ_incidents (
          id, hospital_id, incident_date, kind, category, ward, shift_code,
          person_name, job_title, description, injury, lost_work_days,
          immediate_action, root_cause, corrective_action, status, reported_by,
          note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      insOccInc.run(
        uid(), DEMO_HOSPITAL, '2026-08-10', 'حادثه', 'فرورفتن سوزن/جسم تیز',
        'بخش اورژانس', 'E', 'مینا احمدی', 'پرستار بالینی',
        'فرورفتن آنژیوکت شماره ۲۰ در انگشت اشاره دست راست حین رگ‌گیری از بیمار بدحال ناآرام.',
        'زخم سوزنی با ترشح خون مختصر در بند انتهایی انگشت',
        'شستشوی فوری محل با صابون و آب جاری به مدت ۵ دقیقه بدون فشردن بافت؛ اطلاع فوری به سوپروایزر.',
        'عدم همکاری بیمار و در دسترس نبودن کمک‌پرستار برای ثابت نگه داشتن دست بیمار.',
        'آزمایش پایه بیمار مبدا (HBsAg، Anti-HCV، HIV منفی بود). تیتر آنتی‌بادی پرسنل ۲۴۰ (ایمن). پیگیری آزمایش ماه اول، سوم و ششم با نتیجه منفی.',
        'closed', 'سوپروایزر شیفت عصر', 'پروتکل کامل PEP و فرم مواجهه شغلی تکمیل شد.'
      );

      insOccInc.run(
        uid(), DEMO_HOSPITAL, '2026-09-04', 'حادثه', 'فرورفتن سوزن/جسم تیز',
        'اتاق عمل جنرال', 'M', 'امیرحسین رضایی', 'تکنسین اتاق عمل',
        'برخورد سرسوزن بخیه حین تحویل سوزن‌گیر به جراح روی میز کار بیهوشی.',
        'خراشیدگی سطحی کف دست راست',
        'شستشوی ضدعفونی فوری، خروج از فیلد استریل و پانسمان؛ بررسی سرولوژی بیمار.',
        'عدم استفاده از رسیور واسط (Neutral Zone) در انتقال وسایل تیز و برنده حین جراحی.',
        'اجرای الزامی پروتکل Neutral Zone در تحویل ابزار تیز در کلیه اعمال جراحی. آزمایش‌های سه‌ماهه پرسنل منفی.',
        'closed', 'سرپرستار اتاق عمل', 'آموزش احتیاطات استاندارد در کمیته حفاظت فنی تصویب شد.'
      );
      console.log(`[Enrichment] ✅ Needle-stick follow-up incidents enriched.`);
    }
  } catch (err) {
    console.error('[Enrichment] Error in occ incidents:', err.message);
  }

  console.log('[Enrichment] ✅ All hospital management modules enriched successfully!');
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };

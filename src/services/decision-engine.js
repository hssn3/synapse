/**
 * موتور هوشمند تصمیم‌گیرنده اعتباربخشی و برنامه‌ریز وظایف سمتی
 * =========================================================================
 * این سرویس بر اساس ۵۲۰ سنجه ملی اعتباربخشی بیمارستان‌های ایران،
 * وضعیت برخط پایگاه داده مرکز درمانی (شواهد سنجه‌ها، چک‌لیست‌ها، خطاها،
 * صورت‌جلسات، بازدیدها و شاخص‌ها) را تحلیل کرده و برای هر سمت:
 *
 *   ۱) «اولویت فوری امروز» (Top Priority Action) را جهت تصمیم‌گیری لحظه‌ای تعیین می‌کند.
 *   ۲) برنامه جامع وظایف دوره‌ای (روزانه، هفتگی، ماهانه، سالانه) را همراه با وضعیت واقعی ارائه می‌دهد.
 *   ۳) سنجه‌های در معرض خطر تحت حوزه آن سمت را مشخص می‌کند.
 */
'use strict';

const { query } = require('../config/database-sqlite');
const { todayJalali, jalaliYearRange, jalaliMonthRange, tehranNow, tehranTodayStr } = require('../config/jalali');

// کمک‌تابع‌های شمارش امن
function countSafe(sql, params) {
  try {
    const r = query(sql, params);
    return (r && r.rows && r.rows[0]) ? (r.rows[0].c || 0) : 0;
  } catch (e) {
    return 0;
  }
}

// ابتدای دوره‌ها بر اساس تقویم جلالی رسمی
function getPeriodStarts() {
  const t = todayJalali();
  const now = tehranNow();
  const backToSat = (now.getUTCDay() + 1) % 7; // شنبه=۰
  const satDate = new Date(now.getTime() - backToSat * 86400000);

  const mRange = jalaliMonthRange(t.jy, t.jm);
  const qStartMonth = Math.floor((t.jm - 1) / 3) * 3 + 1;
  const qRange = jalaliMonthRange(t.jy, qStartMonth);
  const yRange = jalaliYearRange(t.jy);

  return {
    daily: tehranTodayStr(),
    weekly: satDate.toISOString().slice(0, 10),
    monthly: mRange.start,
    quarterly: qRange.start,
    yearly: yRange.start
  };
}

// کاتالوگ نقشه‌برداری سنجه‌های اعتباربخشی به ۱۸ سمت بیمارستان
const ROLE_ACCREDITATION_MAP = {
  admin: {
    title: 'مدیر داخلی',
    primaryAxes: ['الف-1', 'الف-2', 'الف-6'],
    keyMeasures: ['الف-1-1', 'الف-1-2', 'الف-2-1', 'الف-6-1', 'ج-3-1'],
    dailyDuties: [
      {
        key: 'adm_daily_triage',
        title: 'مرور کارتابل خطاهای بحرانی و هشدارهای فعال',
        desc: 'بررسی وقایع ناخواسته ۲۴ ساعت گذشته بخش‌ها و تعیین تکلیف ارجاعات فوری (سنجه الف-۲-۱).',
        page: 'errors',
        measureCode: 'الف-2-1',
        priority: 'critical'
      },
      {
        key: 'adm_daily_shift_check',
        title: 'پایش حضور پرسنل و پوشش بخش‌های عملیاتی',
        desc: 'اطمینان از کفایت نیروهای شیفت جاری و جبران کمبودهای پشتیبانی (سنجه الف-۳-۱).',
        page: 'staffshift',
        measureCode: 'الف-3-1',
        priority: 'high'
      }
    ],
    weeklyDuties: [
      {
        key: 'adm_weekly_walkaround',
        title: 'اجرای بازدید مدیریتی ایمنی بیمار از یک بخش',
        desc: 'مشارکت در راند مدیریتی هفتگی، ثبت یافته‌ها، تخصیص مسئول اقدام و مهلت پیگیری (سنجه الف-۲-۲).',
        page: 'walkarounds',
        measureCode: 'الف-2-2',
        priority: 'high'
      },
      {
        key: 'adm_weekly_errors_review',
        title: 'جلسه بازبینی خطاهای هفته و پیشگیری از تکرار',
        desc: 'بررسی و ریشه‌یابی علل ریشه‌ای خطاهای ثبت‌شده در طول هفته (سنجه الف-۲-۳).',
        page: 'errors',
        measureCode: 'الف-2-3',
        priority: 'high'
      }
    ],
    monthlyDuties: [
      {
        key: 'adm_monthly_committee_track',
        title: 'پیگیری مصوبات معوق کمیته‌های بیمارستانی',
        desc: 'بررسی مصوباتی که سررسید اقدام آن‌ها گذشته است و اخذ گزارش اجرای مسئولین (سنجه الف-۱-۱).',
        page: 'committees',
        measureCode: 'الف-1-1',
        priority: 'high'
      },
      {
        key: 'adm_monthly_measure_audit',
        title: 'ممیزی دوره‌ای سنجه‌های بلاتکلیف محورهای پشتیبانی',
        desc: 'بررسی سنجه‌های «بررسی‌نشده» در حوزه‌های مدیریت و پشتیبانی و انتصاب متولی (سنجه الف-۱-۲).',
        page: 'measures',
        measureCode: 'الف-1-2',
        priority: 'medium'
      }
    ],
    yearlyDuties: [
      {
        key: 'adm_yearly_risk_plan',
        title: 'تصویب و بازنگری برنامه مدیریت خطر و ایمنی بیمار',
        desc: 'مشارکت در بازنگری سالانه شناسنامه خطرات و حوادث غیرمترقبه بیمارستان (سنجه الف-۲-۱).',
        page: 'fmea',
        measureCode: 'الف-2-1',
        priority: 'critical'
      }
    ]
  },

  hospital_president: {
    title: 'ریاست بیمارستان',
    primaryAxes: ['الف-1', 'الف-2', 'ج-1'],
    keyMeasures: ['الف-1-1', 'الف-2-1', 'الف-2-2', 'ج-1-1'],
    dailyDuties: [
      {
        key: 'pres_daily_brief',
        title: 'مرور رخدادهای بحرانی و گزارش وقایع ناخواسته',
        desc: 'اطلاع از هرگونه واقعه تهدیدکننده ایمنی بیمار و صدور دستور پیگیری فوری (سنجه الف-۲-۱).',
        page: 'errors',
        measureCode: 'الف-2-1',
        priority: 'critical'
      }
    ],
    weeklyDuties: [
      {
        key: 'pres_weekly_round',
        title: 'راند هفتگی ایمنی و گفتگوی مستقیم با کارکنان و بیماران',
        desc: 'پایش میدانی فرهنگ ایمنی بیمار در بخش‌های بالینی و دریافت بازخورد گیرندگان خدمت (سنجه الف-۲-۲).',
        page: 'walkarounds',
        measureCode: 'الف-2-2',
        priority: 'high'
      }
    ],
    monthlyDuties: [
      {
        key: 'pres_monthly_committee',
        title: 'ریاست جلسه کمیته‌های راهبردی و کیفیت',
        desc: 'حضور و امضای صورت‌جلسه کمیته پایش کیفیت و اعتباربخشی مرکز (سنجه الف-۱-۱).',
        page: 'committees',
        measureCode: 'الف-1-1',
        priority: 'critical'
      },
      {
        key: 'pres_monthly_score_eval',
        title: 'ارزیابی وضعیت امتیاز وزنی و رتبه اعتباربخشی',
        desc: 'بررسی درصد پیشرفت محورها و تخصیص منابع برای سنجه‌های نیازمند انطباق (سنجه الف-۱-۲).',
        page: 'dash',
        measureCode: 'الف-1-2',
        priority: 'high'
      }
    ],
    yearlyDuties: [
      {
        key: 'pres_yearly_plan_sign',
        title: 'تصویب برنامه جامع ارتقای کیفیت و ایمنی سالانه',
        desc: 'امضای برنامه عملیاتی سال و ابلاغ به کلیه گروه‌ها و بخش‌های درمانی (سنجه الف-۱-۱).',
        page: 'programs',
        measureCode: 'الف-1-1',
        priority: 'critical'
      }
    ]
  },

  nursing_director: {
    title: 'مدیر پرستاری (مترون)',
    primaryAxes: ['الف-4', 'ب-1', 'ب-2'],
    keyMeasures: ['الف-4-1', 'ب-1-1', 'ب-1-2', 'ب-2-1'],
    dailyDuties: [
      {
        key: 'nd_daily_handover',
        title: 'پایش گزارش ۲۴ ساعته و تحویل شیفت پرستاری',
        desc: 'بررسی ضریب اشغال تخت، بیماران بدحال و گزارش حوادث شیفت شب (سنجه الف-۴-۱ و ب-۱-۱).',
        page: 'nursing',
        measureCode: 'الف-4-1',
        priority: 'critical'
      }
    ],
    weeklyDuties: [
      {
        key: 'nd_weekly_coverage',
        title: 'پایش حضور بالینی و تناسب نسبت پرستار به تخت',
        desc: 'بررسی برنامه‌های شیفت هفته، توزیع متوازن پرسنل در بخش‌های ویژه و اورژانس (سنجه الف-۴-۱).',
        page: 'staffshift',
        measureCode: 'الف-4-1',
        priority: 'high'
      }
    ],
    monthlyDuties: [
      {
        key: 'nd_monthly_round',
        title: 'راند تخصصی مراقبت بالینی و ایمنی دارویی',
        desc: 'ممیزی نحوه تلفیق دارویی، ثبت پرونده‌ها و استانداردهای ب-۱-۱ در بخش‌ها (سنجه ب-۱-۱).',
        page: 'checklists',
        measureCode: 'ب-1-1',
        priority: 'high'
      },
      {
        key: 'nd_monthly_head_meeting',
        title: 'برگزاری جلسه ماهانه سرپرستاران و ثبت مصوبات',
        desc: 'بررسی شاخص‌های پرستاری، زخم بستر، سقوط و خطاهای دارویی با سرپرستاران (سنجه الف-۴-۱).',
        page: 'committees',
        measureCode: 'الف-4-1',
        priority: 'high'
      }
    ],
    yearlyDuties: [
      {
        key: 'nd_yearly_skills',
        title: 'ارزیابی صلاحیت بالینی سالانه کادر پرستاری',
        desc: 'تکمیل فرم‌های سنجش مهارت‌های تخصصی و آموزش‌های احیا و کنترل عفونت (سنجه الف-۴-۱).',
        page: 'training',
        measureCode: 'الف-4-1',
        priority: 'critical'
      }
    ]
  },

  quality_control_manager: {
    title: 'مدیر بهبود کیفیت',
    primaryAxes: ['الف-1', 'الف-2', 'ج-4'],
    keyMeasures: ['الف-1-2', 'الف-2-1', 'الف-2-2', 'ج-4-1'],
    dailyDuties: [
      {
        key: 'qc_daily_indicators',
        title: 'پایش شاخص‌های کلیدی و اخطارهای خطاهای پزشکی',
        desc: 'بررسی فوری خطاهای ارسالی و طبقه‌بندی آن‌ها بر اساس شدت آسیب (سنجه الف-۲-۱).',
        page: 'errors',
        measureCode: 'الف-2-1',
        priority: 'critical'
      }
    ],
    weeklyDuties: [
      {
        key: 'qc_weekly_gap_check',
        title: 'پیگیری شواهد و مدارک سنجه‌های دارای شکاف',
        desc: 'ارتباط با مسئولین سنجه‌هایی که شاهد بارگذاری‌نشده یا نقص مستند دارند (سنجه الف-۱-۲).',
        page: 'measures',
        measureCode: 'الف-1-2',
        priority: 'high'
      }
    ],
    monthlyDuties: [
      {
        key: 'qc_monthly_committee',
        title: 'تنظیم دستور کار و برگزاری کمیته پایش کیفیت و سنجش عملکرد',
        desc: 'ثبت صورت‌جلسه ماهانه، رصد شاخص‌های کشوری و ارزیابی مداخلات بهبود (سنجه الف-۱-۲).',
        page: 'committees',
        measureCode: 'الف-1-2',
        priority: 'critical'
      },
      {
        key: 'qc_monthly_kpi_entry',
        title: 'تحلیل داده‌های آماری و کارت امتیازی متوازن (BSC)',
        desc: 'ثبت مقادیر شاخص‌های دوره و رسم نمودارهای روند برای مدیریت (سنجه الف-۱-۲).',
        page: 'bsc',
        measureCode: 'الف-1-2',
        priority: 'high'
      }
    ],
    yearlyDuties: [
      {
        key: 'qc_yearly_program',
        title: 'تدوین و ارزشیابی برنامه جامع ارتقای کیفیت بیمارستان',
        desc: 'سنجش تحقق اهداف اختصاصی، تحلیل فاصله و تعریف پروژه‌های بهبود برای سال آتی (سنجه الف-۱-۲).',
        page: 'programs',
        measureCode: 'الف-1-2',
        priority: 'critical'
      }
    ]
  },

  infection_control_supervisor: {
    title: 'سوپروایزر کنترل عفونت',
    primaryAxes: ['ب-5'],
    keyMeasures: ['ب-5-1', 'ب-5-2', 'ب-5-3'],
    dailyDuties: [
      {
        key: 'ic_daily_surveillance',
        title: 'راند روزانه پایش عفونت‌های بیمارستانی (HAI)',
        desc: 'پایش بیماران دارای کاتتر ورید مرکزی، ونتیلاتور و سوند ادراری در بخش‌های ویژه (سنجه ب-۵-۱).',
        page: 'activities',
        measureCode: 'ب-5-1',
        priority: 'critical'
      }
    ],
    weeklyDuties: [
      {
        key: 'ic_weekly_hand_audit',
        title: 'ممیزی ۵ موقعیت بهداشت دست کارکنان بر بالین',
        desc: 'ثبت مشاهدات انطباق بهداشت دست طبق استانداردهای WHO در بخش‌های فعال (سنجه ب-۵-۲).',
        page: 'checklists',
        measureCode: 'ب-5-2',
        priority: 'high'
      }
    ],
    monthlyDuties: [
      {
        key: 'ic_monthly_committee',
        title: 'ثبت صورت‌جلسه و آمار کمیته کنترل عفونت',
        desc: 'ارائه گزارش تحلیلی کشت‌های میکروبی و مقاومت‌های آنتی‌بیوتیکی به کمیته (سنجه ب-۵-۱).',
        page: 'committees',
        measureCode: 'ب-5-1',
        priority: 'critical'
      },
      {
        key: 'ic_monthly_cssd_audit',
        title: 'ممیزی دوره‌ای فرآیند استریلیزاسیون و CSSD',
        desc: 'بررسی تست‌های بیولوژیک و شیمیایی اتوکلاوها و بسته‌بندی پک‌های جراحی (سنجه ب-۵-۳).',
        page: 'checklists',
        measureCode: 'ب-5-3',
        priority: 'high'
      }
    ],
    yearlyDuties: [
      {
        key: 'ic_yearly_antibiogram',
        title: 'تحلیل سالانه الگوی مقاومت آنتی‌بیوتیکی و پروتکل مصرف',
        desc: 'به‌روزرسانی راهنمای بالینی مصرف آنتی‌بیوتیک‌ها با همکاری متخصص عفونی (سنجه ب-۵-۱).',
        page: 'documents',
        measureCode: 'ب-5-1',
        priority: 'critical'
      }
    ]
  },

  environmental_health_officer: {
    title: 'کارشناس بهداشت محیط',
    primaryAxes: ['الف-6'],
    keyMeasures: ['الف-6-1', 'الف-6-2', 'الف-6-3', 'الف-6-4'],
    dailyDuties: [
      {
        key: 'env_daily_water_waste',
        title: 'کلرسنجی روزانه آب و پایش تفکیک پسماندهای عفونی',
        desc: 'ثبت غلظت کلر باقیمانده و نظارت بر جمع‌آوری ایمن کیسه‌های پسماند زرد و قرمز (سنجه الف-۶-۳ و الف-۶-۴).',
        page: 'waste',
        measureCode: 'الف-6-3',
        priority: 'critical'
      }
    ],
    weeklyDuties: [
      {
        key: 'env_weekly_kitchen_audit',
        title: 'بازرسی بهداشت آشپزخانه و فرآیند آماده‌سازی غذا',
        desc: 'کنترل دمای یخچال‌ها، برچسب‌گذاری مواد خام و گواهی سلامت پرسنل تغذیه (سنجه الف-۶-۲).',
        page: 'checklists',
        measureCode: 'الف-6-2',
        priority: 'high'
      }
    ],
    monthlyDuties: [
      {
        key: 'env_monthly_autoclave_test',
        title: 'آزمایش میکروبی دستگاه بی‌خطرساز پسماند و آب مصرفی',
        desc: 'بارگذاری نتایج کشت‌های پایش بیولوژیک هیدروکلاو/اتوکلاو پسماند (سنجه الف-۶-۴).',
        page: 'measures',
        measureCode: 'الف-6-4',
        priority: 'high'
      }
    ],
    yearlyDuties: [
      {
        key: 'env_yearly_contract_renew',
        title: 'پایش مجوزهای زیست‌محیطی و معاینات ادواری پرسنل خدمات',
        desc: 'بررسی تمدید قراردادهای امحای پسماند و تأییدیه‌های بهداشتی مرکز (سنجه الف-۶-۱).',
        page: 'documents',
        measureCode: 'الف-6-1',
        priority: 'critical'
      }
    ]
  }
};

// دریافت تصمیم‌های هوشمند برای یک سمت در بیمارستان
function getSmartDecisions(roleCode, hospitalId, userId) {
  const periodStarts = getPeriodStarts();
  const roleCfg = ROLE_ACCREDITATION_MAP[roleCode] || ROLE_ACCREDITATION_MAP.admin;

  // ۱. بررسی وضعیت سنجه‌های مرتبط در این بیمارستان
  const primaryAxes = roleCfg.primaryAxes || ['الف-1'];
  const axisFilters = primaryAxes.map(a => `m.code LIKE '${a}-%'`).join(' OR ');

  // سنجه‌های نیازمند اقدام در حوزه سمت (فاقد شاهد، عدم انطباق یا بررسی‌نشده)
  const measuresAtRisk = [];
  try {
    const riskQuery = `
      SELECT m.id, m.code, COALESCE(m.statement, m.title, m.code) as title, COALESCE(ms.status, 'not_reviewed') as status,
             (SELECT COUNT(*) FROM evidence_files ef WHERE ef.entity_type = 'measure' AND ef.entity_id = m.id AND ef.hospital_id = ?) as evidence_count
      FROM accreditation_sections m
      LEFT JOIN measure_status ms ON ms.measure_id = m.id AND ms.hospital_id = ?
      WHERE (${axisFilters}) AND m.level_type = 'measure'
      ORDER BY 
        CASE 
          WHEN ms.status = 'non_compliant' THEN 1
          WHEN ms.status = 'not_reviewed' OR ms.status IS NULL THEN 2
          WHEN ms.status = 'compliant' AND (SELECT COUNT(*) FROM evidence_files ef WHERE ef.entity_type = 'measure' AND ef.entity_id = m.id AND ef.hospital_id = ?) = 0 THEN 3
          ELSE 4 
        END,
        m.code ASC
      LIMIT 6
    `;
    const rows = query(riskQuery, [hospitalId, hospitalId, hospitalId]).rows || [];
    rows.forEach(r => {
      let riskLabel = 'بررسی‌نشده';
      let riskClass = 'warn';
      if (r.status === 'non_compliant') {
        riskLabel = 'عدم انطباق';
        riskClass = 'danger';
      } else if (r.status === 'compliant' && r.evidence_count === 0) {
        riskLabel = 'فاقد مدرک شاهد';
        riskClass = 'warn';
      }
      measuresAtRisk.push({
        id: r.id,
        code: r.code,
        title: r.title,
        status: r.status,
        evidenceCount: r.evidence_count,
        riskLabel,
        riskClass
      });
    });
  } catch (e) {
    // در صورت بروز خطا در دیتابیس داده خالی برگردد
  }

  // ۲. بررسی انجام وظایف دوره‌ای در بازه‌های جاری
  // بررسی انجام تسک روزانه
  const dailyDoneCount = countSafe(
    `SELECT COUNT(*) c FROM activity_records 
     WHERE hospital_id = ? AND recorded_by = ? AND date(COALESCE(occurred_at, created_at)) >= date(?)`,
    [hospitalId, userId, periodStarts.daily]
  );

  // بررسی خطاها یا وقایع هفته
  const weeklyErrorsCount = countSafe(
    `SELECT COUNT(*) c FROM medical_error_reports 
     WHERE hospital_id = ? AND date(created_at) >= date(?)`,
    [hospitalId, periodStarts.weekly]
  );

  // بررسی واک‌اراند یا چک‌لیست ماهانه
  const monthlyWalksCount = countSafe(
    `SELECT COUNT(*) c FROM management_walkarounds 
     WHERE hospital_id = ? AND date(visit_date) >= date(?)`,
    [hospitalId, periodStarts.monthly]
  );

  const monthlyMinutesCount = countSafe(
    `SELECT COUNT(*) c FROM committee_meeting_minutes m
     JOIN committees c ON c.id = m.committee_id
     WHERE c.hospital_id = ? AND date(m.meeting_date) >= date(?)`,
    [hospitalId, periodStarts.monthly]
  );

  // آماده‌سازی برنامه‌های دوره‌ای همراه با وضعیت زنده
  const dailyDuties = (roleCfg.dailyDuties || []).map((d, i) => ({
    ...d,
    cadence: 'daily',
    cadenceLabel: 'امروز / روزانه',
    done: dailyDoneCount > i
  }));

  const weeklyDuties = (roleCfg.weeklyDuties || []).map((d, i) => ({
    ...d,
    cadence: 'weekly',
    cadenceLabel: 'هفتگی',
    done: (weeklyErrorsCount > 0 && d.page === 'errors') || (dailyDoneCount >= 3)
  }));

  const monthlyDuties = (roleCfg.monthlyDuties || []).map((d, i) => ({
    ...d,
    cadence: 'monthly',
    cadenceLabel: 'ماهانه',
    done: (d.page === 'committees' && monthlyMinutesCount > 0) ||
          (d.page === 'walkarounds' && monthlyWalksCount > 0)
  }));

  const yearlyDuties = (roleCfg.yearlyDuties || []).map(d => ({
    ...d,
    cadence: 'yearly',
    cadenceLabel: 'سالانه',
    done: false
  }));

  // ۳. تصمیم‌گیری موتور هوشمند برای تعیین اولویت طلایی امروز
  let topPriority = dailyDuties.find(d => !d.done);
  if (!topPriority) {
    topPriority = weeklyDuties.find(d => !d.done);
  }
  if (!topPriority) {
    topPriority = monthlyDuties.find(d => !d.done);
  }
  if (!topPriority && dailyDuties.length > 0) {
    topPriority = {
      ...dailyDuties[0],
      isCompletedRecheck: true
    };
  }

  // توصیه تصمیم‌گیرنده
  const topAction = topPriority ? {
    key: topPriority.key,
    title: topPriority.title,
    desc: topPriority.desc,
    measureCode: topPriority.measureCode,
    page: topPriority.page,
    priority: topPriority.priority || 'critical',
    cadenceLabel: topPriority.cadenceLabel,
    done: !!topPriority.done,
    aiRecommendation: `بر اساس ارزیابی هوشمند سنجه ${topPriority.measureCode}، انجام این اقدام در شیفت جاری بیشترین اثر را بر حفظ ایمنی بیمار و رتبه اعتباربخشی دارد.`
  } : null;

  return {
    roleCode,
    roleTitle: roleCfg.title,
    primaryAxes,
    topAction,
    roadmap: {
      daily: dailyDuties,
      weekly: weeklyDuties,
      monthly: monthlyDuties,
      yearly: yearlyDuties
    },
    measuresAtRisk,
    stats: {
      totalDaily: dailyDuties.length,
      doneDaily: dailyDuties.filter(d => d.done).length,
      totalWeekly: weeklyDuties.length,
      doneWeekly: weeklyDuties.filter(d => d.done).length,
      totalMonthly: monthlyDuties.length,
      doneMonthly: monthlyDuties.filter(d => d.done).length
    }
  };
}

module.exports = {
  getSmartDecisions,
  ROLE_ACCREDITATION_MAP
};

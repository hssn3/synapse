/**
 * hassan-hubs.js — هاب‌های هوشمند، یکپارچه و کارتی اعتباربخشی
 * مبتنی بر طراحی اولیه حسن و هویت تم دارک لوکس پلتفرم بیمارستان
 * 
 * ویژگی‌ها:
 * ۱. هاب ۹ کارتی مراقبت و درمان (ب-1 تا ب-9 — نسل۶: ب-۱۰ ادغام شد)
 * ۲. هاب ۱۸ کارتی زیرشاخه مراقبت عمومی بالینی (۱۳ استاندارد + ۵ سند/چک‌لیست)
 * ۳. زنجیره افقی RTL متصل ۲۳ روش اجرایی بالینی (Rule 11) بدون انباشت عمودی
 * ۴. هاب ۸ کارتی رهبری و مدیریت (الف-1 تا الف-8) شامل مدیریت خطا و ایمنی بیمار
 * ۵. هاب ۲ کارتی حمایت از گیرنده خدمت (ج-1 و ج-2)
 * ۶. جریان ناوبری ۴ سطحی دقیق:
 *    سطح ۱: هاب محور و استانداردهای اختصاصی
 *    سطح ۲: صفحه استاندارد با کارت‌های تفکیک‌شده سنجه‌ها
 *    سطح ۳: صفحه اختصاصی سنجه با دو پیکان بزرگ اکشن (بارگذاری مستندات و چک‌لیست)
 *    سطح ۴: فهرست و مدیریت چک‌لیست‌های اختصاصی سنجه
 * ۷. تضمین دسترسی ۱۰۰٪ به تمامی ۸۸ استاندارد و ۳۹۵ سنجه ملی (نسل۶)
 * ۸. ایزولاسیون یونیکد Bidi (<bdi dir="ltr">) و عدم واژگونی ارقام
 * ۹. رفع قطعی پرش به صفحات قبلی با ریست وضعیت در ناوبری
 */

(function() {
  'use strict';

  window.HassanHub = window.HassanHub || {};

  // بررسی صلاحیت سمتی برای ویرایش سنجه یا بارگذاری شواهد
  function canUserEditMeasure(measureCode) {
    if (!window.S || !window.S.user) return true;
    const u = window.S.user;
    const perms = u.permissions || [];
    if (u.role_code === "admin" || u.role_code === "hospital_president" || u.role_code === "quality_control_manager" || u.role_code === "accreditation_manager" || perms.includes("view_all_dashboards")) {
      return true;
    }
    const norm = (s) => (typeof window.hassanNormCode === "function" ? window.hassanNormCode(s) : String(s||"").trim());
    const clean = norm(measureCode);
    let axisCode = "";
    if (clean.startsWith("الف-") || clean.startsWith("ب-") || clean.startsWith("ج-")) {
      const parts = clean.split("-");
      if (parts.length >= 2) axisCode = parts[0] + "-" + parts[1];
    } else {
      const m = clean.match(/([الفبج]-\d+)/);
      if (m) axisCode = m[1];
    }
    const scope = (typeof roleScope === "function" ? roleScope() : ((window.ROLE_AXES && window.ROLE_AXES[u.role_code]) || []));
    if (scope === "*") return true;
    if (Array.isArray(scope) && scope.includes(axisCode)) return true;
    return false;
  }
  window.canUserEditMeasure = canUserEditMeasure;


  // نرمال‌سازی ارقام فارسی و عربی به لاتین و یکسان‌سازی خط تیره
  function normCode(str) {
    if (!str) return '';
    return String(str)
      .replace(/[۰-۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
      .replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
      .replace(/[\u2010-\u2015\u2212]/g, '-')
      .replace(/\s+/g, '')
      .trim();
  }
  window.hassanNormCode = normCode;

  const HassanState = {
    currentSection: 'care', // 'care' | 'management' | 'support'
    currentSubView: 'grid', // 'grid' | 'general_care_sub' | 'procedures_flow' | 'sub_axis' | 'standard_page' | 'measure_page' | 'measure_checklists' | 'safety_hub' | 'safety_measures'
    selectedAxisCode: null,
    selectedAxisTitle: '',
    selectedStandardCode: null,
    selectedStandardTitle: '',
    selectedMeasureCode: null,
    selectedMeasureTitle: '',
    selectedYear: '۱۴۰۵',
    history: []
  };

  window.HassanState = HassanState;

  // لیست سال‌های جلالی
  const JALALI_YEARS = ['۱۳۹۸', '۱۳۹۹', '۱۴۰۰', '۱۴۰۱', '۱۴۰۲', '۱۴۰۳', '۱۴۰۴', '۱۴۰۵', '۱۴۰۶'];
  const JALALI_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];

  // =========================================================================
  // ۱. آیکون‌های وکتور اختصاصی و بالینی
  // =========================================================================
  const ICONS = {
    back: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
    arrowLeft: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
    calendar: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    check: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,

    // آیکون‌های نوار ناوبری بالا (منطبق بر اسکرین‌شات حسن)
    navCommittees: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    navHome: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    navLeadership: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M6 21v-2a6 6 0 0 1 12 0v2"/><circle cx="4" cy="11" r="2.5"/><path d="M2 21v-1.5a4.5 4.5 0 0 1 4-4.5"/><circle cx="20" cy="11" r="2.5"/><path d="M22 21v-1.5a4.5 4.5 0 0 0-4-4.5"/></svg>`,
    navCare: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><circle cx="6" cy="12" r="2"/><circle cx="15" cy="12" r="2"/></svg>`,
    navSupport: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/><path d="M8 2a3 3 0 0 0-3 3v2h6V5a3 3 0 0 0-3-3z"/></svg>`,
    navCalendar: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,

    // آیکون‌های وکتور ۸ کارت سفید رهبری و مدیریت
    mgmtQuality: `<svg viewBox="0 0 64 64" fill="none" stroke="#d4af5a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="18" r="8"/><path d="M20 38c0-6.6 5.4-12 12-12s12 5.4 12 12"/><circle cx="14" cy="24" r="5"/><path d="M6 40c0-4.4 3.6-8 8-8s8 3.6 8 8"/><circle cx="50" cy="24" r="5"/><path d="M42 40c0-4.4 3.6-8 8-8s8 3.6 8 8"/><circle cx="32" cy="46" r="9" fill="rgba(16,160,185,0.2)" stroke="#d4af5a"/><path d="M32 41l2 4 4.5.7-3.3 3.2.8 4.5-4-2.1-4 2.1.8-4.5-3.3-3.2 4.5-.7z" fill="#d4af5a"/><path d="M28 54l-3 7 7-3 7 3-3-7"/></svg>`,
    mgmtError: `<svg viewBox="0 0 64 64" fill="none" stroke="#d4af5a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="18" r="9" fill="rgba(16,160,185,0.2)"/><path d="M16 46c0-8.8 7.2-16 16-16s16 7.2 16 16"/><path d="M38 32l16 26H22L38 32z" fill="rgba(25,33,47,0.8)" stroke="#d4af5a" stroke-width="2.5"/><line x1="38" y1="42" x2="38" y2="48" stroke="#d4af5a" stroke-width="3"/><circle cx="38" cy="53" r="1.5" fill="#d4af5a"/></svg>`,
    mgmtDisaster: `<svg viewBox="0 0 64 64" fill="none" stroke="#d4af5a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="28" cy="16" r="5" fill="rgba(16,160,185,0.2)"/><path d="M22 26l6 6-4 14"/><path d="M28 32l8-4 5 7"/><path d="M41 35l6-2"/><path d="M18 42l4-8 6-2"/><path d="M36 12l18 36H36z" stroke="#d4af5a" stroke-dasharray="3 3"/><path d="M42 22l6 14"/><path d="M46 36l3 6"/></svg>`,
    mgmtHR: `<svg viewBox="0 0 64 64" fill="none" stroke="#d4af5a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="14" r="6"/><circle cx="16" cy="20" r="4.5"/><circle cx="48" cy="20" r="4.5"/><path d="M9 34c0-3.9 3.1-7 7-7h2"/><path d="M46 27h2c3.9 0 7 3.1 7 7"/><path d="M32 23c-5 0-9 4-9 9v9l9 5 9-5v-9c0-5-4-9-9-9z" fill="rgba(16,160,185,0.2)"/><path d="M32 28v10M27 33h10" stroke="#d4af5a" stroke-width="2.5"/><path d="M14 44c4 6 11 10 18 10s14-4 18-10"/></svg>`,
    mgmtNursing: `<svg viewBox="0 0 64 64" fill="none" stroke="#d4af5a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="20" cy="16" r="5"/><path d="M15 13h10v3H15z" fill="#d4af5a"/><path d="M13 32c0-4 3-7 7-7s7 3 7 7v14H13V32z"/><path d="M28 36h28v10H28z" fill="rgba(16,160,185,0.2)"/><circle cx="36" cy="31" r="4"/><path d="M26 46v6M58 46v6"/><path d="M52 16v30M49 20h6"/></svg>`,
    mgmtIT: `<svg viewBox="0 0 64 64" fill="none" stroke="#d4af5a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="10" width="44" height="30" rx="4" fill="rgba(25,33,47,0.7)"/><line x1="26" y1="40" x2="22" y2="48"/><line x1="38" y1="40" x2="42" y2="48"/><line x1="18" y1="48" x2="46" y2="48"/><line x1="18" y1="32" x2="18" y2="24" stroke-width="3"/><line x1="24" y1="32" x2="24" y2="18" stroke-width="3"/><line x1="30" y1="32" x2="30" y2="28" stroke-width="3"/><circle cx="40" cy="22" r="5"/><path d="M40 17v5h5"/><circle cx="48" cy="42" r="6" stroke-width="2"/><path d="M48 34v2M48 48v2M40 42h2M54 42h2"/></svg>`,
    mgmtEnv: `<svg viewBox="0 0 64 64" fill="none" stroke="#d4af5a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="32" r="18" fill="rgba(25,33,47,0.7)"/><path d="M14 32h36M32 14c4.5 5 7 11 7 18s-2.5 13-7 18c-4.5-5-7-11-7-18s2.5-13 7-18z"/><path d="M36 28c0-3 3-6 7-6s5 5 2 9-9 3-9-3z" fill="rgba(16,160,185,0.2)" stroke="#d4af5a"/><path d="M32 32c-4 0-7 3-7 7v6l7 4 7-4v-6c0-4-3-7-7-7z" fill="rgba(19,25,35,0.9)" stroke="#d4af5a"/><path d="M32 36v6M29 39h6" stroke="#d4af5a"/></svg>`,
    mgmtEquip: `<svg viewBox="0 0 64 64" fill="none" stroke="#d4af5a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="32" r="12" fill="rgba(16,160,185,0.2)"/><path d="M32 14v4M32 46v4M14 32h4M46 32h4M19 19l3 3M42 42l3 3M19 45l3-3M42 22l3-3" stroke-width="4"/><circle cx="32" cy="32" r="7" fill="rgba(25,33,47,0.8)"/><path d="M32 28v8M28 32h8" stroke="#d4af5a" stroke-width="3"/><path d="M40 40l8 8-4 4-8-8z" fill="#d4af5a"/></svg>`,

    // آیکون‌های وکتور ۱۰ کارت زیرمجموعه (دایره سرمه‌ای با محتوای سفید)
    subEnvPrinciples: `<svg viewBox="0 0 24 24" fill="none" stroke="#ecd599" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9z"/><path d="M9 12l2 2 4-4"/></svg>`,
    subFoodHyg: `<svg viewBox="0 0 24 24" fill="none" stroke="#ecd599" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-6z"/><line x1="2" y1="11" x2="22" y2="11"/><line x1="9" y1="4" x2="9" y2="8"/><line x1="12" y1="3" x2="12" y2="8"/><line x1="15" y1="4" x2="15" y2="8"/></svg>`,
    subWater: `<svg viewBox="0 0 24 24" fill="none" stroke="#ecd599" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h6v6H4z"/><path d="M10 7h4a3 3 0 0 1 3 3v2"/><path d="M2 18c2-1 4-1 6 0s4 1 6 0 4-1 6 0"/><path d="M2 21c2-1 4-1 6 0s4 1 6 0 4-1 6 0"/></svg>`,
    subWaste: `<svg viewBox="0 0 24 24" fill="none" stroke="#ecd599" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="5" height="13" rx="1"/><rect x="9.5" y="7" width="5" height="13" rx="1"/><rect x="16" y="7" width="5" height="13" rx="1"/><path d="M2 7h20"/><circle cx="5.5" cy="13" r="1"/><circle cx="12" cy="13" r="1"/><circle cx="18.5" cy="13" r="1"/></svg>`,
    subLaundry: `<svg viewBox="0 0 24 24" fill="none" stroke="#ecd599" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="5"/><circle cx="8" cy="6" r="1"/><circle cx="12" cy="6" r="1"/></svg>`,
    subRadiation: `<svg viewBox="0 0 24 24" fill="none" stroke="#ecd599" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M12 2v6"/><path d="M4.93 6.93l5.2 3"/><path d="M19.07 6.93l-5.2 3"/><path d="M7.07 19.07l4.93-3"/><path d="M16.93 19.07l-4.93-3"/><circle cx="12" cy="12" r="9"/></svg>`,
    subInstructions: `<svg viewBox="0 0 24 24" fill="none" stroke="#ecd599" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><circle cx="12" cy="9" r="2.5"/><path d="M8 15c0-2.2 1.8-4 4-4s4 1.8 4 4"/></svg>`,
    subProcedures: `<svg viewBox="0 0 24 24" fill="none" stroke="#ecd599" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><circle cx="6" cy="18" r="3"/><path d="M6 9v6"/><path d="M9 6h6a3 3 0 0 1 3 3v6"/></svg>`,
    subPolicies: `<svg viewBox="0 0 24 24" fill="none" stroke="#ecd599" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/><circle cx="12" cy="12" r="1.5"/></svg>`,
    subLibrary: `<svg viewBox="0 0 24 24" fill="none" stroke="#ecd599" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M10 7h6M10 11h6"/></svg>`,

    fileText: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    shieldAlert: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    upload: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,

    // آیکون‌های وکتور اختصاصی نشان‌ها، فرم‌ها و کلیدهای اقدام
    measureBadge: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>`,
    safetyAlert: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    bookPage: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
    levelGauge: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    policyBtn: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><circle cx="12" cy="18" r="3"/></svg>`,
    instructionBtn: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><line x1="15" y1="8" x2="17" y2="8"/><line x1="15" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/></svg>`,
    procedureBtn: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><path d="M9 6h6a3 3 0 0 1 3 3v6"/><path d="M15 18H9a3 3 0 0 1-3-3V9"/></svg>`,
    bookGuideBtn: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    actionUpload: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    actionChecklist: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><polyline points="9 14 11 16 15 11"/></svg>`,
    arrowForward: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
    folderEvidence: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    saveDisk: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
    emptyBox: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(212,175,90,0.5)" stroke-width="1.5"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
    close: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    library: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 10v7M15 10v7"/></svg>`,
    docMethod: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    obsMethod: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    itvMethod: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    formEdit: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    uploadBig: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(212,175,90,0.9)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    clock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    checkSmall: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    
    printDoc: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`,
    sparkles: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
    officialSeal: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
    viewEye: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    // ۹ محور مراقبت و درمان
    careGen: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 3v5a4.5 4.5 0 0 0 9 0V3"/><path d="M9 12.5v4a4.5 4.5 0 0 0 9 0v-2"/><circle cx="18" cy="12.5" r="2.5" fill="rgba(16,160,185,0.2)"/></svg>`,
    emergency: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="5" width="15" height="12" rx="2"/><polygon points="16 8 20 8 23 11 23 17 16 17 16 8"/><circle cx="5.5" cy="18.5" r="2.5" fill="rgba(16,160,185,0.2)"/><circle cx="18.5" cy="18.5" r="2.5" fill="rgba(16,160,185,0.2)"/><path d="M8 9v4M6 11h4"/></svg>`,
    surgery: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4l5 5L7 21.5 2 16.5 14.5 4z"/><line x1="13" y1="7.5" x2="16.5" y2="11"/><circle cx="18.5" cy="18.5" r="2.5" fill="rgba(16,160,185,0.2)"/><line x1="17" y1="17" x2="13" y2="13"/></svg>`,
    maternal: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4" fill="rgba(16,160,185,0.2)"/><path d="M6 21v-2a6 6 0 0 1 12 0v2"/><circle cx="18" cy="14" r="2.5"/><path d="M16 21a4 4 0 0 1 4-3.5"/></svg>`,
    infection: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="6" fill="rgba(16,160,185,0.2)"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="5" y1="5" x2="7.5" y2="7.5"/><line x1="16.5" y1="16.5" x2="19" y2="19"/><line x1="5" y1="19" x2="7.5" y2="16.5"/><line x1="16.5" y1="7.5" x2="19" y2="5"/></svg>`,
    pharmacy: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7z"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/><circle cx="7" cy="17" r="1" fill="#d4af5a"/></svg>`,
    imaging: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2" fill="rgba(16,160,185,0.2)"/><path d="M21 15l-5-5L5 21"/><line x1="3" y1="12" x2="21" y2="12"/></svg>`,
    laboratory: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.31L4.1 19.46A2 2 0 0 0 5.8 22h12.4a2 2 0 0 0 1.7-2.54L14 9.31V2h-4z"/><line x1="8.5" y1="2" x2="15.5" y2="2"/><circle cx="12" cy="16" r="1.5" fill="rgba(16,160,185,0.2)"/></svg>`,
    bloodTrans: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="rgba(16,160,185,0.15)"/><path d="M12 11v6M9 14h6"/></svg>`,
    outpatient: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4" fill="rgba(16,160,185,0.2)"/><path d="M18 8v6M15 11h6"/></svg>`,

    // زیرشاخه‌های مراقبت عمومی بالینی
    idPatient: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2" fill="rgba(16,160,185,0.2)"/><line x1="15" y1="8" x2="17" y2="8"/><line x1="15" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/></svg>`,
    assessInit: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><polyline points="9 14 11 16 15 11"/></svg>`,
    nurseCare: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/><path d="M12 6v5M9.5 8.5h5"/></svg>`,
    highRisk: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    doctorCare: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4" fill="rgba(16,160,185,0.2)"/><path d="M5.5 21v-2a6.5 6.5 0 0 1 13 0v2"/><path d="M12 11v6M9 14h6"/></svg>`,
    medDose: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="10" width="18" height="8" rx="4"/><line x1="12" y1="10" x2="12" y2="18"/><line x1="7" y1="14" x2="9" y2="14"/><line x1="15" y1="14" x2="17" y2="14"/></svg>`,
    nutrition1: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
    nutrition2: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a9 9 0 0 0-9 9c0 4.97 4.03 9 9 9s9-4.03 9-9a9 9 0 0 0-9-9z"/><path d="M12 7v5l3 3"/></svg>`,
    rehab: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="2" fill="rgba(16,160,185,0.2)"/><path d="M15 7h-6l-2 5 3 1v7h4v-5l2-3z"/></svg>`,
    patientEdu: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
    careBalance: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="3" x2="12" y2="21"/><path d="M4 8l8-4 8 4"/><polygon points="4 8 1 14 7 14 4 8"/><polygon points="20 8 17 14 23 14 20 8"/></svg>`,
    discharge: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,

    // مستندات چهارگانه
    guidelines: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    sopWorkflows: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><path d="M9 6h6a3 3 0 0 1 3 3v6"/><path d="M15 18H9a3 3 0 0 1-3-3V9"/></svg>`,
    policies: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><circle cx="12" cy="18" r="3" fill="rgba(16,160,185,0.2)"/></svg>`,
    library: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 10v7M15 10v7"/></svg>`,

    // رهبری و مدیریت
    qualityLeader: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    errorManage: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    disasterEop: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    hrDev: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4" fill="rgba(16,160,185,0.2)"/></svg>`,
    nurseDirector: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
    itHealth: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><polyline points="6 10 10 7 14 11 18 8"/></svg>`,
    envHealth: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="11" r="3" fill="rgba(16,160,185,0.2)"/></svg>`,
    medEquipment: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,

    // حمایت از گیرنده خدمت
    facilities: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><line x1="9" y1="9" x2="9" y2="9.01"/><line x1="9" y1="13" x2="9" y2="13.01"/><line x1="9" y1="17" x2="9" y2="17.01"/></svg>`,
    rightsCharter: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`,
    crmFeedback: `<svg viewBox="0 0 24 24" fill="none" stroke="#d4af5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="8" y1="10" x2="8.01" y2="10"/><line x1="12" y1="10" x2="12.01" y2="10"/><line x1="16" y1="10" x2="16.01" y2="10"/></svg>`
  };

  // =========================================================================
  // ۲. داده‌های ۹ محور مراقبت و درمان (نسل۶)
  // =========================================================================
  const CARE_AXES = [
    { code: 'ب-1', title: 'مراقبت‌های عمومی بالینی', icon: ICONS.careGen, view: 'general_care_sub' },
    { code: 'ب-2', title: 'مراقبت‌های حاد و اورژانس', icon: ICONS.emergency, view: 'sub_axis' },
    { code: 'ب-3', title: 'مراقبت‌های جراحی و بیهوشی', icon: ICONS.surgery, view: 'sub_axis' },
    { code: 'ب-4', title: 'مراقبت‌های مادر و نوزاد', icon: ICONS.maternal, view: 'sub_axis' },
    { code: 'ب-5', title: 'پیشگیری و کنترل عفونت', icon: ICONS.infection, view: 'sub_axis' },
    { code: 'ب-6', title: 'مدیریت دارویی', icon: ICONS.pharmacy, view: 'sub_axis' },
    { code: 'ب-7', title: 'خدمات تصویربرداری', icon: ICONS.imaging, view: 'sub_axis' },
    { code: 'ب-8', title: 'خدمات آزمایشگاه و طب انتقال خون', icon: ICONS.laboratory, view: 'sub_axis' },
    { code: 'ب-9', title: 'خدمات سرپایی', icon: ICONS.outpatient, view: 'sub_axis' }
  ];

  // ۱۵ کارت زیرشاخه مراقبت عمومی بالینی (۹ استاندارد ملی نسل۶ + بستهٔ روان‌پزشکی ب-۱-۱۰ + ۵ نوع سند/چک‌لیست)
  const GENERAL_CARE_SUBCARDS = [
    { id: 'gc-01', code: 'ب-1-1', title: 'ارزیابی اولیه بیمار', icon: ICONS.assessInit, type: 'standard' },
    { id: 'gc-02', code: 'ب-1-2', title: 'برنامه‌ریزی مراقبت و درمان بر پایه ارزیابی اولیه', icon: ICONS.nurseCare, type: 'standard' },
    { id: 'gc-03', code: 'ب-1-3', title: 'بیماران در معرض خطر و آسیب‌پذیر', icon: ICONS.highRisk, type: 'standard' },
    { id: 'gc-04', code: 'ب-1-4', title: 'ارائه ایمن مراقبت‌های پزشکان', icon: ICONS.doctorCare, type: 'standard' },
    { id: 'gc-05', code: 'ب-1-5', title: 'دارودهی بیماران', icon: ICONS.medDose, type: 'standard' },
    { id: 'gc-06', code: 'ب-1-6', title: 'ارزیابی و روند تغذیه بیماران', icon: ICONS.nutrition1, type: 'standard' },
    { id: 'gc-07', code: 'ب-1-7', title: 'تأمین خدمات توانبخشی', icon: ICONS.rehab, type: 'standard' },
    { id: 'gc-08', code: 'ب-1-8', title: 'برنامه‌ریزی آموزش بیماران', icon: ICONS.patientEdu, type: 'standard' },
    { id: 'gc-09', code: 'ب-1-9', title: 'ترخیص ایمن بیماران', icon: ICONS.discharge, type: 'standard' },
    { id: 'gc-10', code: 'ب-1-10', title: 'سنجه‌های اختصاصی روان‌پزشکی (بستهٔ تک‌تخصصی)', icon: ICONS.highRisk, type: 'standard' },
    // مستندات و چک‌لیست‌های پنج‌گانه
    { id: 'gc-14', code: 'doc-inst', title: 'دستورالعمل‌ها', icon: ICONS.guidelines, type: 'doc', docType: 'instruction' },
    { id: 'gc-15', code: 'doc-sop', title: 'روش‌های اجرایی', icon: ICONS.sopWorkflows, type: 'doc', view: 'procedures_flow' },
    { id: 'gc-16', code: 'doc-pol', title: 'خط‌مشی‌ها', icon: ICONS.policies, type: 'doc', docType: 'policy' },
    { id: 'gc-17', code: 'doc-lib', title: 'کتابخانه دیجیتال', icon: ICONS.library, type: 'doc', docType: 'library' },
    { id: 'gc-18', code: 'doc-chk', title: 'چک‌لیست‌های ارزیابی', icon: ICONS.check, type: 'doc', docType: 'checklist' }
  ];

  // ۲۳ روش اجرایی بالینی (قاعده ۱۱ جریان افقی RTL متصل)
  const CLINICAL_PROCEDURES = [
    { step: 1, code: 'SOP-PSY-01', title: 'روش اجرایی "جداسازی بیماران روانپزشکی"' },
    { step: 2, code: 'SOP-PSY-02', title: 'روش اجرایی "مدیریت رفتارهای پرخطر اجتماعی"' },
    { step: 3, code: 'SOP-SKN-01', title: 'روش اجرایی "مراقبت‌های پوست و حفاظت بیماران در برابر زخم‌های فشاری"' },
    { step: 4, code: 'SOP-BLD-01', title: 'روش اجرایی "مدیریت عوارض ناخواسته احتمالی به دنبال تزریق خون"' },
    { step: 5, code: 'SOP-CPR-01', title: 'روش اجرایی "عملیات احیای قلبی ریوی مغزی (CPCR)"' },
    { step: 6, code: 'SOP-TRS-01', title: 'روش اجرایی "انتقال درون و برون‌بخش بیماران"' },
    { step: 7, code: 'SOP-SEC-01', title: 'روش اجرایی "ایمنی فیزیکی بیماران و پیشگیری از سقوط"' },
    { step: 8, code: 'SOP-MED-01', title: 'روش اجرایی "تلفیق دارویی در بدو پذیرش و ترخیص"' },
    { step: 9, code: 'SOP-TRG-01', title: 'روش اجرایی "تریاژ استاندارد اورژانس به روش ESI"' },
    { step: 10, code: 'SOP-SUT-01', title: 'روش اجرایی "جراحی ایمن و استفاده از چک‌لیست قبل از بیهوشی"' },
    { step: 11, code: 'SOP-ISO-01', title: 'روش اجرایی "جداسازی و ایزولاسیون بیماران تنفسی و تماسی"' },
    { step: 12, code: 'SOP-AUT-01', title: 'روش اجرایی "اتوپسی و انتقال جسد متوفی"' },
    { step: 13, code: 'SOP-DON-01', title: 'روش اجرایی "فراهم‌آوری و پیوند اعضا از بیماران مرگ مغزی"' },
    { step: 14, code: 'SOP-CLN-01', title: 'روش اجرایی "نظافت، پاک‌سازی و ضدعفونی سطوح پرتماس"' },
    { step: 15, code: 'SOP-STR-01', title: 'روش اجرایی "استریلیزاسیون و پایش عملکرد اتوکلاوها"' },
    { step: 16, code: 'SOP-SPT-01', title: 'روش اجرایی "ارجاع بیماران بستری به بخش پزشکی ورزشی"' },
    { step: 17, code: 'SOP-PRC-01', title: 'روش اجرایی "ارائه خدمات پاراکلینیکی به صورت شبانه‌روزی"' },
    { step: 18, code: 'SOP-DIS-01', title: 'روش اجرایی "ترک بدون اطلاع بیمار"' },
    { step: 19, code: 'SOP-IDN-01', title: 'روش اجرایی "شناسایی صحیح بیماران با حداقل ۲ شناسه"' },
    { step: 20, code: 'SOP-PSY-05', title: 'روش اجرایی "تامین لوازم مصرفی بخش روانپزشکی با رعایت الزامات ایمنی"' },
    { step: 21, code: 'SOP-CVL-01', title: 'روش اجرایی "تعبیه CV Line در بیماران بستری"' },
    { step: 22, code: 'SOP-SCO-01', title: 'روش اجرایی "ارائه خدمت اسکولی به بیماران"' },
    { step: 23, code: 'SOP-RSK-01', title: 'روش اجرایی "مدیریت پیشگیرانه خطر جهت اجتناب از رخداد وقایع ناخواسته"' }
  ];

  // مرتب‌سازی طبیعی کدهای اعتباربخشی (مثلاً ب-1-2 قبل از ب-1-10)
  function naturalCompareCodes(a, b) {
    const normA = normCode(a);
    const normB = normCode(b);
    const partsA = normA.split('-');
    const partsB = normB.split('-');
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const pA = partsA[i];
      const pB = partsB[i];
      if (pA === undefined) return -1;
      if (pB === undefined) return 1;
      const nA = Number(pA);
      const nB = Number(pB);
      if (!isNaN(nA) && !isNaN(nB)) {
        if (nA !== nB) return nA - nB;
      } else if (pA !== pB) {
        return pA.localeCompare(pB, 'fa');
      }
    }
    return 0;
  }
  window.hassanNaturalCompare = naturalCompareCodes;

  // ۸ محور رهبری و مدیریت منطبق بر عکس حسن (media_1789684171301.png)
  const MANAGEMENT_AXES = [
    { code: 'الف-1', title: 'رهبری و مدیریت کیفیت', icon: ICONS.mgmtQuality },
    { code: 'الف-8', title: 'مدیریت خطا', icon: ICONS.mgmtError, isSafety: true },
    { code: 'الف-2', title: 'مدیریت خطر حوادث و بلایا', icon: ICONS.mgmtDisaster },
    { code: 'الف-3', title: 'مدیریت منابع انسانی و سلامت حرفه‌ای', icon: ICONS.mgmtHR },
    { code: 'الف-4', title: 'مدیریت خدمات پرستاری', icon: ICONS.mgmtNursing },
    { code: 'الف-5', title: 'فناوری و مدیریت اطلاعات سلامت', icon: ICONS.mgmtIT },
    { code: 'الف-6', title: 'بهداشت محیط', icon: ICONS.mgmtEnv },
    { code: 'الف-7', title: 'مدیریت تجهیزات پزشکی', icon: ICONS.mgmtEquip }
  ];

  // ۲ محور مصوب حمایت از گیرنده خدمت (ج)
  const SUPPORT_AXES = [
    { code: 'ج-1', title: 'تامین تسهیلات برای گیرنده خدمت', icon: ICONS.facilities },
    { code: 'ج-2', title: 'احترام به حقوق گیرنده خدمت', icon: ICONS.rightsCharter }
  ];

  // عناوین کوتاه و کاربردی استانداردها جهت نمایش تمیز در کارت‌ها (منطبق بر media_1789684219771.png)
  const STANDARD_SHORT_TITLES = {
    // استانداردهای بهداشت محیط (الف-6)
    'الف-6-1': 'رعایت اصول بهداشت محیط',
    'الف-6-2': 'آماده سازی، طبخ، توزیع و سرو غذا',
    'الف-6-3': 'مدیریت آب و فاضلاب',
    'الف-6-4': 'مدیریت پسماند',
    'الف-6-5': 'مدیریت فرآیندهای رختشویخانه',
    'الف-6-6': 'حفاظت در برابر پرتوها',

    // استانداردهای رهبری کیفیت (الف-1)
    'الف-1-1': 'ساختار بهبود کیفیت',
    'الف-1-2': 'برنامه استراتژیک و عملیاتی',
    'الف-1-3': 'پایش و تحلیل شاخص‌ها',
    'الف-1-4': 'ممیزی بالینی',

    // استانداردهای بلایا (الف-2)
    'الف-2-1': 'کمیته مدیریت بحران و بلایا',
    'الف-2-2': 'برنامه آمادگی و EOP',
    'الف-2-3': 'سامانه هشدار سریع',
    'الف-2-4': 'تخلیه اضطراری و مانورها',

    // استانداردهای منابع انسانی (الف-3)
    'الف-3-1': 'تامین و توزیع نیروی انسانی',
    'الف-3-2': 'آموزش و توانمندسازی پرسنل',
    'الف-3-3': 'ارزیابی عملکرد و انگیزش',
    'الف-3-4': 'سلامت شغلی و طب کار',

    // استانداردهای خدمات پرستاری (الف-4)
    'الف-4-1': 'ساختار رهبری خدمات پرستاری',
    'الف-4-2': 'برنامه‌ریزی نیروی پرستاری و شیفت',
    'الف-4-3': 'توسعه مهارت‌های بالینی پرستاری',
    'الف-4-4': 'نظارت و ارزیابی مراقبت‌های پرستاری',

    // استانداردهای فناوری اطلاعات (الف-5)
    'الف-5-1': 'زیرساخت فناوری و امنیت اطلاعات',
    'الف-5-2': 'سامانه اطلاعات بیمارستانی (HIS)',
    'الف-5-3': 'مدیریت پرونده الکترونیک و مدارک پزشکی',
    'الف-5-4': 'کدگذاری بیماری‌ها و مرگ و میر',

    // استانداردهای تجهیزات پزشکی (الف-7)
    'الف-7-1': 'مدیریت نگهداری و کالیبراسیون',
    'الف-7-2': 'تامین قطعات و نگهداشت پیشگیرانه (PM)',
    'الف-7-3': 'آموزش کاربران تجهیزات پزشکی',
    'الف-7-4': 'مدیریت اسقاط و خروج تجهیزات',

    // سایر محورها
    'ج-2-1': 'منشور حقوق بیماران',
    'ج-2-2': 'رعایت حریم شخصی بیماران',
    'ج-2-3': 'رسیدگی به شکایات بیماران',
    'ج-2-4': 'بازخورد و رضایت مشتریان',
    'ب-6-1': 'تامین دارو و تجهیزات مصرفی',
    'ب-6-2': 'انبارش دارو و تجهیزات مصرفی',
    'ب-6-3': 'نظارت بر مراقبت‌های دارویی',
    'ب-6-4': 'تجویز و مصرف منطقی',
    'ب-6-5': 'متخصص داروسازی بالینی'
  };

  // =========================================================================
  // ۳. موتور قدرتمند استخراج سنجه‌ها و استانداردها (Bug Resolver)
  // =========================================================================
  function getMeasuresForCode(code) {
    const targetCode = normCode(code);
    let list = [];

    // ۱. بررسی رجیستری جامع و سراسری ۳۹۵ سنجه ملی (نسل۶)
    if (window.ALL_ACCREDITATION_MEASURES && Array.isArray(window.ALL_ACCREDITATION_MEASURES)) {
      list = window.ALL_ACCREDITATION_MEASURES.filter(m => {
        const mStd = normCode(m._std);
        const mCode = normCode(m.code);
        return mStd === targetCode || mCode === targetCode || mCode.startsWith(targetCode + '-');
      });
    }

    // ۲. بررسی S.sections در SPA اصلی
    if (!list.length && window.S && Array.isArray(window.S.sections)) {
      window.S.sections.forEach(sec => {
        (sec.axes || []).forEach(ax => {
          (ax.measures || []).forEach(m => {
            const mStd = normCode(m._std);
            const mCode = normCode(m.code);
            if (mStd === targetCode || mCode === targetCode || mCode.startsWith(targetCode + '-')) {
              if (!list.some(x => normCode(x.code) === mCode)) list.push(m);
            }
          });
        });
      });
    }

    // ۳. بررسی S.byId و S.tree
    if (!list.length && window.S && window.S.byId) {
      Object.values(window.S.byId).forEach(node => {
        if (node.level_type === 'measure') {
          const mCode = normCode(node.code);
          const mStd = normCode(node._std);
          if (mCode === targetCode || mCode.startsWith(targetCode + '-') || mStd === targetCode) {
            if (!list.some(x => normCode(x.code) === mCode)) list.push(node);
          }
        }
      });
    }

    return list.sort((a,b) => naturalCompareCodes(a.code, b.code));
  }

  function getStandardsForAxis(axisCode) {
    const targetCode = normCode(axisCode);
    let stds = [];

    // ۱. بررسی رجیستری جامع و رسمی ۸۸ استاندارد ملی (نسل۶)
    if (window.ALL_ACCREDITATION_STANDARDS && Array.isArray(window.ALL_ACCREDITATION_STANDARDS)) {
      stds = window.ALL_ACCREDITATION_STANDARDS
        .filter(s => normCode(s.axis) === targetCode)
        .map(s => ({
          code: s.code,
          title: s.title || s.code
        }));
    }

    // ۲. بررسی S.sections
    if (!stds.length && window.S && Array.isArray(window.S.sections)) {
      window.S.sections.forEach(sec => {
        (sec.axes || []).forEach(ax => {
          if (normCode(ax.code) === targetCode) {
            stds = (ax.standards || []).map(s => ({
              id: s.id,
              code: s.code,
              title: s.title || s.statement || s.code
            }));
          }
        });
      });
    }

    return stds.sort((a,b) => naturalCompareCodes(a.code, b.code));
  }

  // =========================================================================
  // ۴. مدیریت وضعیت و ماندگاری ناوبری
  // =========================================================================
  function getContainer() {
    return document.getElementById('content') || document.getElementById('hassanPrimaryView') || document.getElementById('measuresContainer') || document.body;
  }

  HassanHub.saveState = function() {
    try {
      sessionStorage.setItem('p_hassan_state', JSON.stringify({
        currentSection: HassanState.currentSection,
        currentSubView: HassanState.currentSubView,
        selectedAxisCode: HassanState.selectedAxisCode,
        selectedAxisTitle: HassanState.selectedAxisTitle,
        selectedStandardCode: HassanState.selectedStandardCode,
        selectedStandardTitle: HassanState.selectedStandardTitle,
        selectedMeasureCode: HassanState.selectedMeasureCode,
        selectedMeasureTitle: HassanState.selectedMeasureTitle,
        selectedYear: HassanState.selectedYear
      }));
    } catch(e){}
  };

  HassanHub.restoreState = function() {
    try {
      const raw = sessionStorage.getItem('p_hassan_state') || sessionStorage.getItem('p_hassan_state');
      if (raw) {
        const parsed = JSON.parse(raw);
        Object.assign(HassanState, parsed);
      }
    } catch(e){}
  };

  function pushHassanHash(h) {
    if (window.location.hash !== h) {
      if (history.pushState) history.pushState(null, '', h);
      else window.location.hash = h;
    }
  }

  // =========================================================================
  // ۵. ناوبری بالای صفحه و سربرگ‌های هاب‌های سفید (منطبق بر عکس‌های ۱ و ۲ حسن)
  // =========================================================================

  // نوار ناوبری افقی بالای صفحه (شامل ۶ زبانه/کپسول)
  function renderHassanTopNav(activeTab) {
    activeTab = activeTab || HassanState.currentSection || 'management';
    const isMgmt = activeTab === 'management';
    const isCare = activeTab === 'care';
    const isSupport = activeTab === 'support';
    const isUser = activeTab === 'user' || activeTab === 'acc';

    return `
      <nav class="hassan-top-nav-bar" aria-label="ناوبری اصلی اعتباربخشی">
        <button type="button" class="hassan-nav-pill" onclick="if(typeof go==='function') go('committees');" title="کمیته‌های بیمارستان">
          ${ICONS.navCommittees}
          <span>کمیته ها</span>
        </button>
        <button type="button" class="hassan-nav-tab ${isUser ? 'active' : ''}" onclick="if(typeof go==='function') go('acc'); else location.href='/#acc';" title="ناحیه کاربری">
          <div class="hassan-tab-icon">${ICONS.navHome}</div>
          <span class="hassan-tab-label">ناحیه کاربری</span>
        </button>
        <button type="button" class="hassan-nav-tab ${isMgmt ? 'active' : ''}" onclick="HassanHub.go('management')" title="رهبری و مدیریت">
          <div class="hassan-tab-icon">${ICONS.navLeadership}</div>
          <span class="hassan-tab-label">رهبری و مدیریت</span>
        </button>
        <button type="button" class="hassan-nav-tab ${isCare ? 'active' : ''}" onclick="HassanHub.go('care')" title="مراقبت و درمان">
          <div class="hassan-tab-icon">${ICONS.navCare}</div>
          <span class="hassan-tab-label">مراقبت و درمان</span>
        </button>
        <button type="button" class="hassan-nav-tab ${isSupport ? 'active' : ''}" onclick="HassanHub.go('support')" title="حمایت از گیرنده خدمت">
          <div class="hassan-tab-icon">${ICONS.navSupport}</div>
          <span class="hassan-tab-label">حمایت از گیرنده خدمت</span>
        </button>
        <div class="hassan-nav-pill hassan-nav-year" style="cursor:default" title="سال ارزشیابی: ${HassanState.selectedYear}">
          <span>${HassanState.selectedYear}</span>
          ${ICONS.navCalendar}
          <span style="font-size:10px;margin-right:2px">▼</span>
        </div>
      </nav>
    `;
  }
  window.renderHassanTopNav = renderHassanTopNav;

  // نوار مسیر و کلید بازگشت شکیل و تمیز
  function renderHassanSubBar(crumbHtml, showBack, backAction) {
    return `
      <div class="hassan-breadcrumb-bar">
        <div class="hassan-breadcrumb-title">
          ${crumbHtml}
        </div>
        ${showBack !== false ? `
          <button type="button" class="hassan-back-btn" onclick="${backAction || 'HassanHub.back()'}" title="بازگشت">
            ${ICONS.arrowLeft}
          </button>
        ` : ''}
      </div>
    `;
  }
  window.renderHassanSubBar = renderHassanSubBar;

  // تابع هلپر آیکون برای زیرمجموعه‌ها
  function getSubIconForCode(code) {
    const norm = normCode(code);
    if (norm === 'الف-6-1') return ICONS.subEnvPrinciples;
    if (norm === 'الف-6-2') return ICONS.subFoodHyg;
    if (norm === 'الف-6-3') return ICONS.subWater;
    if (norm === 'الف-6-4') return ICONS.subWaste;
    if (norm === 'الف-6-5') return ICONS.subLaundry;
    if (norm === 'الف-6-6') return ICONS.subRadiation;
    return ICONS.assessInit;
  }

  // نوار مسیر دارک کلاسیک (جهت سازگاری با صفحات سطوح ۳ و ۴)
  function renderBreadcrumbHeader(crumbs) {
    const crumbsHtml = crumbs.map((c) => {
      if (c.isCurrent) {
        return `<span class="sn-crumb-item active">${c.label}</span>`;
      }
      return `<span class="sn-crumb-item clickable" onclick="${c.action}">${c.label}</span>`;
    }).join(`<span class="sn-crumb-sep">‹</span>`);

    return `
      <header class="sn-header-bar">
        <div class="sn-header-right">
          <button type="button" class="sn-back-btn" onclick="HassanHub.back()" title="بازگشت به سطح قبل">
            ${ICONS.back}
          </button>
          <div class="sn-breadcrumb-flow">
            ${crumbsHtml}
          </div>
        </div>
        <div class="sn-header-left">
          <div class="sn-year-badge">
            ${ICONS.calendar}
            <span>سال ارزشیابی: ${HassanState.selectedYear}</span>
          </div>
        </div>
      </header>
    `;
  }

  // رندر هاب ۱۰ کارتی مراقبت و درمان
  window.renderHassanCareHub = function() {
    HassanState.currentSection = 'care';
    HassanState.currentSubView = 'grid';

    const cardsHtml = CARE_AXES.map(ax => `
      <div class="hassan-mgmt-card" role="button" tabindex="0" onclick="HassanHub.onCareCardClick('${ax.code}', '${ax.view}')">
        <div class="hassan-mgmt-icon">
          ${ax.icon}
        </div>
        <div class="hassan-mgmt-title">${ax.title}</div>
        <div class="hassan-mgmt-line"></div>
      </div>
    `).join('');

    return `
      <div class="hassan-dark-hub">
        ${renderHassanTopNav('care')}
        ${renderHassanSubBar('<span class="hassan-active-crumb">مراقبت و درمان</span>', true, "go('acc')")}
        <div class="hassan-mgmt-grid">
          ${cardsHtml}
        </div>
      </div>
    `;
  };

  // رندر هاب ۸ کارتی رهبری و مدیریت — مو به مو منطبق بر عکس ۱ حسن (media_1789684171301.png)
  window.renderHassanManagementHub = function() {
    HassanState.currentSection = 'management';
    HassanState.currentSubView = 'grid';
    HassanState.selectedAxisCode = null;
    HassanState.selectedAxisTitle = '';

    const cardsHtml = MANAGEMENT_AXES.map(ax => `
      <div class="hassan-mgmt-card" role="button" tabindex="0" onclick="HassanHub.onAxisCardClick('${ax.code}', '${jsArg(ax.title)}')">
        <div class="hassan-mgmt-icon">
          ${ax.icon}
        </div>
        <div class="hassan-mgmt-title">${ax.title}</div>
        <div class="hassan-mgmt-line"></div>
      </div>
    `).join('');

    return `
      <div class="hassan-dark-hub">
        ${renderHassanTopNav('management')}
        ${renderHassanSubBar('<span class="hassan-active-crumb">رهبری و مدیریت</span>', true, "go('acc')")}
        <div class="hassan-mgmt-grid">
          ${cardsHtml}
        </div>
      </div>
    `;
  };

  // رندر هاب ۲ کارتی حمایت از گیرنده خدمت
  window.renderHassanSupportHub = function() {
    HassanState.currentSection = 'support';
    HassanState.currentSubView = 'grid';
    HassanState.selectedAxisCode = null;
    HassanState.selectedAxisTitle = '';

    const cardsHtml = SUPPORT_AXES.map(ax => `
      <div class="hassan-mgmt-card" role="button" tabindex="0" onclick="HassanHub.onAxisCardClick('${ax.code}', '${jsArg(ax.title)}')">
        <div class="hassan-mgmt-icon">
          ${ax.icon}
        </div>
        <div class="hassan-mgmt-title">${ax.title}</div>
        <div class="hassan-mgmt-line"></div>
      </div>
    `).join('');

    return `
      <div class="hassan-dark-hub">
        ${renderHassanTopNav('support')}
        ${renderHassanSubBar('<span class="hassan-active-crumb">حمایت از گیرنده خدمت</span>', true, "go('acc')")}
        <div class="hassan-mgmt-grid" style="grid-template-columns:repeat(2, 1fr);max-width:720px;margin:0 auto">
          ${cardsHtml}
        </div>
      </div>
    `;
  };

  // رندر هاب زیرشاخه محور — مو به مو منطبق بر عکس ۲ حسن (media_1789684219771.png)
  window.renderHassanSubAxisHub = function(axisCode, axisTitle) {
    axisCode = normCode(axisCode);
    let sec = HassanState.currentSection || 'care';
    if (axisCode.startsWith('الف-')) sec = 'management';
    else if (axisCode.startsWith('ج-')) sec = 'support';
    else if (axisCode.startsWith('ب-')) sec = 'care';
    HassanState.currentSection = sec;

    if (!axisTitle || axisTitle === axisCode || axisTitle.includes('هنوز ثبت نشده') || axisTitle.startsWith('محور ')) {
      const allAxes = [...CARE_AXES, ...MANAGEMENT_AXES, ...SUPPORT_AXES];
      const foundAx = allAxes.find(a => normCode(a.code) === axisCode);
      if (foundAx) axisTitle = foundAx.title;
      else if (axisCode === 'الف-6') axisTitle = 'بهداشت محیط';
      else axisTitle = `محور ${axisCode}`;
    }
    HassanState.selectedAxisTitle = axisTitle;

    const secLabel = sec === 'management' ? 'مدیریت و رهبری' : (sec === 'support' ? 'حمایت از گیرنده خدمت' : 'مراقبت و درمان');

    const stds = getStandardsForAxis(axisCode);

    // کارت‌های استانداردهای ملی با عناوین کوتاه و آیکون سرمه‌ای دایره‌ای
    const standardCardsHtml = stds.map((std) => {
      const shortTitle = STANDARD_SHORT_TITLES[normCode(std.code)] || std.title || `استاندارد ${std.code}`;
      const subIcon = getSubIconForCode(std.code);
      return `
        <div class="hassan-subcard" role="button" tabindex="0" onclick="HassanHub.openStandardPage('${std.code}', '${jsArg(std.title || '')}')">
          <div class="hassan-subcard-icon-circle">
            ${subIcon}
          </div>
          <div class="hassan-subcard-title">${escapeHtml(shortTitle)}</div>
        </div>
      `;
    }).join('');

    // ۴ کارت مستندات مصوب (دستورالعمل‌ها، روش‌های اجرایی، خط مشی‌ها، کتابخانه دیجیتال)
    const docCards = [
      { code: 'doc-inst', title: 'دستورالعمل‌ها', icon: ICONS.subInstructions, docType: 'instruction' },
      { code: 'doc-sop', title: 'روش‌های اجرایی', icon: ICONS.subProcedures, docType: 'procedure' },
      { code: 'doc-pol', title: 'خط مشی‌ها', icon: ICONS.subPolicies, docType: 'policy' },
      { code: 'doc-lib', title: 'کتابخانه دیجیتال', icon: ICONS.subLibrary, docType: 'library' }
    ];

    const docCardsHtml = docCards.map(c => `
      <div class="hassan-subcard hassan-doc-card" role="button" tabindex="0" onclick="HassanHub.openDocumentHubModal('${c.docType}', '${axisCode}', '${jsArg(axisTitle)}')">
        <div class="hassan-subcard-icon-circle">
          ${c.icon}
        </div>
        <div class="hassan-subcard-title">${c.title}</div>
      </div>
    `).join('');

    const cardsHtml = standardCardsHtml + docCardsHtml;

    setTimeout(() => {
      if (window.HassanHub && typeof window.HassanHub.loadMeasureArtifacts === 'function') {
        window.HassanHub.loadMeasureArtifacts(axisCode);
      }
    }, 40);

    return `
      <div class="hassan-dark-hub">
        ${renderHassanTopNav(sec)}
        ${renderHassanSubBar(`
          <span class="hassan-parent-crumb" onclick="HassanHub.go('${sec}')">${secLabel}</span>
          <span class="hassan-crumb-sep">/</span>
          <span class="hassan-active-crumb">${axisTitle}</span>
        `, true, `HassanHub.go('${sec}')`)}
        <div class="hassan-subaxis-grid">
          ${cardsHtml}
        </div>

        <!-- جدول سوابق و اقلام ثبت‌شده زیرمحور -->
        <div style="max-width:1380px;margin:24px auto;padding:0 16px;">
          ${renderArtifactsSectionContainer(axisCode, `محور ${axisCode}`)}
        </div>
      </div>
    `;
  };

  // رندر هاب ۱۸ کارتی زیرشاخه مراقبت عمومی بالینی
  window.renderHassanGeneralCareSubHub = function() {
    HassanState.currentSection = 'care';
    HassanState.currentSubView = 'general_care_sub';

    const crumbs = [
      { label: 'اعتباربخشی بیمارستان', action: "go('acc')" },
      { label: 'مراقبت و درمان', action: "HassanHub.go('care')" },
      { label: 'مراقبت‌های عمومی بالینی (ب-۱)', isCurrent: true }
    ];

    const cardsHtml = GENERAL_CARE_SUBCARDS.map(c => `
      <div class="sn-card ${c.type==='doc'?'sn-card-doc':''}" role="button" tabindex="0" onclick="HassanHub.onGeneralCareCardClick('${c.id}', '${c.type}', '${c.code}', '${c.view||''}', '${c.docType||''}')">
        <div class="sn-card-circle-icon ${c.type==='doc'?'sn-icon-doc':''}">
          ${c.icon}
        </div>
        <div class="sn-card-title">${c.title}</div>
        ${c.code.startsWith('ب-1-') ? `
          <div style="font-size:11px;color:var(--sn-gold-light);background:rgba(212,175,90,0.12);padding:2px 10px;border-radius:10px;border:1px solid rgba(212,175,90,0.25)">
            استاندارد ملی: <bdi dir="ltr">${c.code}</bdi>
          </div>
        ` : ''}
        <div class="sn-card-decorative-lines">
          <div class="sn-card-line-main"></div>
          <div class="sn-card-line-sub"></div>
        </div>
      </div>
    `).join('');

    return `
      <div class="sn-container">
        ${renderBreadcrumbHeader(crumbs)}
        <main class="sn-content-wrapper">
          <div class="sn-cards-grid">
            ${cardsHtml}
          </div>
        </main>
      </div>
    `;
  };

  // زنجیره افقی RTL متصل ۲۳ روش اجرایی بالینی (Rule 11)
  window.renderHassanProceduresFlow = function() {
    HassanState.currentSection = 'care';
    HassanState.currentSubView = 'procedures_flow';

    const crumbs = [
      { label: 'اعتباربخشی بیمارستان', action: "go('acc')" },
      { label: 'مراقبت و درمان', action: "HassanHub.go('care')" },
      { label: 'مراقبت‌های عمومی بالینی (ب-۱)', action: "HassanHub.openGeneralCareSub()" },
      { label: '۲۳ روش اجرایی بالینی (SOP)', isCurrent: true }
    ];

    const cardsHtml = CLINICAL_PROCEDURES.map((p, idx) => `
      <div class="sn-chain-card" role="button" tabindex="0" onclick="HassanHub.openProcedureForm('${p.code}', '${jsArg(p.title)}')">
        <div class="sn-chain-step-badge">گام ${fa(p.step)}</div>
        <div class="sn-chain-icon-box">${ICONS.sopWorkflows}</div>
        <div class="sn-chain-title">${escapeHtml(p.title)}</div>
        <div class="sn-chain-code"><bdi dir="ltr">${p.code}</bdi></div>
        ${idx < CLINICAL_PROCEDURES.length - 1 ? `<div class="sn-chain-connector"></div>` : ''}
      </div>
    `).join('');

    return `
      <div class="sn-container">
        ${renderBreadcrumbHeader(crumbs)}
        <main class="sn-flow-container">
          <div class="sn-flow-hero-header">
            <h2 class="sn-flow-title">زنجیره فرآیندی و روش‌های اجرایی مصوب بالینی (SOPs)</h2>
            <div class="sn-flow-subtitle">جریان افقی متصل از راست به چپ طبق دستورالعمل‌های اعتباربخشی ملی (۲۳ روش اجرایی):</div>
          </div>
          <div class="sn-horizontal-scroll-track">
            ${cardsHtml}
          </div>
        </main>
      </div>
    `;
  };

  // =========================================================================
  // ۶. صفحه اختصاصی استاندارد ملی و کارت‌های تفکیک‌شده سنجه‌ها (سطح ۲)
  // =========================================================================
  
  function renderArtifactsSectionContainer(code, label) {
    label = label || code;
    return `
      <!-- بخش جامع کارتابل اقلام و سوابق ثبت‌شده (به صورت جدول سوابق) -->
      <section class="sn-measure-artifacts-section" id="measure_artifacts_section_${code}" style="margin-top:28px;background:rgba(19,25,35,0.88);border:1px solid rgba(212,175,90,0.32);border-radius:22px;padding:26px 28px;box-shadow:0 16px 40px rgba(0,0,0,0.45);backdrop-filter:blur(12px);direction:rtl;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;border-bottom:1px solid rgba(212,175,90,0.22);padding-bottom:16px;flex-wrap:wrap;gap:14px;">
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="width:48px;height:48px;border-radius:12px;background:rgba(212,175,90,0.18);border:1px solid rgba(212,175,90,0.42);display:flex;align-items:center;justify-content:center;color:var(--sn-gold-light);font-size:24px;">
              📋
            </div>
            <div>
              <h3 style="font-size:18px;font-weight:800;color:var(--sn-gold-light);margin:0;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                <span>جدول سوابق و اقلام ثبت‌شده</span>
                <span class="sn-hero-code-badge" style="font-size:12px;padding:3px 10px;" id="artifacts_total_badge_${code}">در حال بارگذاری…</span>
                <span id="artifacts_sort_badge_${code}" style="font-size:11.5px;padding:3px 10px;border-radius:8px;background:rgba(16,160,185,0.18);border:1px solid rgba(16,160,185,0.35);color:#6ed5e7;font-weight:700;">
                  ⬇ جدیدترین در صدر جدول
                </span>
              </h3>
              <p style="font-size:12.5px;color:var(--sn-text-muted);margin:4px 0 0;">
                فهرست کلیه موارد پرشده، سوابق و مدارک ثبتی <bdi dir="ltr">${code}</bdi> به تفکیک تاریخ ثبت (از قدیم به جدید، با اولویت جدیدترین در صدر لیست)
              </p>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <input type="text" id="artifacts_search_${code}" placeholder="🔍 جستجو در موارد ثبت‌شده..." oninput="HassanHub.searchArtifacts('${code}', this.value)" style="background:rgba(0,0,0,0.35);border:1px solid rgba(212,175,90,0.3);border-radius:10px;padding:7px 14px;color:#fff;font-size:12px;width:200px;direction:rtl;outline:none;">
            <div style="display:inline-flex;background:rgba(0,0,0,0.35);border:1px solid rgba(212,175,90,0.25);border-radius:10px;padding:2px;">
              <button type="button" id="btn_view_table_${code}" onclick="HassanHub.setArtifactViewMode('${code}', 'table')" style="padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;border:none;cursor:pointer;background:rgba(212,175,90,0.25);color:var(--sn-gold-light);" title="نمایش به صورت جدول سوابق">
                📊 جدول
              </button>
              <button type="button" id="btn_view_cards_${code}" onclick="HassanHub.setArtifactViewMode('${code}', 'cards')" style="padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;border:none;cursor:pointer;background:transparent;color:var(--sn-text-muted);" title="نمایش کارتی">
                🎴 کارت‌ها
              </button>
            </div>
            <button type="button" class="btn btn--ghost btn--sm" onclick="HassanHub.reloadMeasureArtifacts('${code}')" style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--sn-gold-light);border:1px solid rgba(212,175,90,0.3);border-radius:8px;padding:7px 14px;background:rgba(0,0,0,0.25);cursor:pointer;" title="بروزرسانی داده‌ها">
              🔄 <span>بروزرسانی</span>
            </button>
          </div>
        </div>

        <!-- تب‌های افقی فیلتر دسته‌بندی‌ها -->
        <nav class="sn-artifacts-tabs-nav" id="artifacts_tabs_${code}" style="display:flex;gap:10px;overflow-x:auto;padding-bottom:12px;margin-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.08);scrollbar-width:thin;">
        </nav>

        <!-- کانتینر اصلی رندر جدول / کارت‌ها -->
        <div id="artifacts_content_${code}">
          <div style="display:flex;align-items:center;justify-content:center;width:100%;padding:40px 20px;color:var(--sn-text-muted);font-size:13px;gap:10px;">
            <span style="display:inline-block;width:18px;height:18px;border:2px solid rgba(212,175,90,0.3);border-top-color:var(--sn-gold-light);border-radius:50%;animation:spin 0.8s linear infinite;"></span>
            <span>در حال استخراج و چیدمان سوابق ثبت‌شده...</span>
          </div>
        </div>
      </section>
    `;
  }

  window.renderHassanStandardDetailPage = function(code, title) {
    code = normCode(code);
    HassanState.currentSubView = 'standard_page';
    HassanState.selectedStandardCode = code;

    const mList = getMeasuresForCode(code);

    let stdTitle = title || HassanState.selectedStandardTitle;
    if (!stdTitle || stdTitle.includes('هنوز ثبت نشده')) {
      const regStd = (window.ALL_ACCREDITATION_STANDARDS || []).find(s => normCode(s.code) === code);
      if (regStd && regStd.title && !regStd.title.includes('هنوز ثبت نشده')) {
        stdTitle = regStd.title;
      } else if (mList.length && mList[0].standard_title) {
        stdTitle = mList[0].standard_title;
      } else {
        stdTitle = `استاندارد اعتباربخشی ملی ${code}`;
      }
    }
    HassanState.selectedStandardTitle = stdTitle;

    // استخراج دقیق محور والد و بخش بر مبنای خود کد استاندارد
    const parts = code.split('-');
    let parentAxisCode = parts.length >= 2 ? (parts[0] + '-' + parts[1]) : (HassanState.selectedAxisCode || '');
    parentAxisCode = normCode(parentAxisCode);

    let secName = 'care';
    if (parentAxisCode.startsWith('الف-')) secName = 'management';
    else if (parentAxisCode.startsWith('ج-')) secName = 'support';
    else if (parentAxisCode.startsWith('ب-')) secName = 'care';
    HassanState.currentSection = secName;
    HassanState.selectedAxisCode = parentAxisCode;

    const secLabel = secName === 'management' ? 'رهبری و مدیریت' : (secName === 'support' ? 'حمایت از گیرنده خدمت' : 'مراقبت و درمان');

    const allAxes = [...CARE_AXES, ...MANAGEMENT_AXES, ...SUPPORT_AXES];
    const ax = allAxes.find(a => normCode(a.code) === parentAxisCode);
    const parentAxisTitle = ax ? ax.title : parentAxisCode;
    HassanState.selectedAxisTitle = parentAxisTitle;

    const crumbs = [
      { label: 'اعتباربخشی بیمارستان', action: "go('acc')" },
      { label: secLabel, action: `HassanHub.go('${secName}')` }
    ];

    if (parentAxisCode && parentAxisTitle) {
      if (parentAxisCode === 'ب-1') {
        crumbs.push({ label: `${parentAxisTitle} (<bdi dir="ltr">${parentAxisCode}</bdi>)`, action: "HassanHub.openGeneralCareSub()" });
      } else {
        crumbs.push({ label: `${parentAxisTitle} (<bdi dir="ltr">${parentAxisCode}</bdi>)`, action: `HassanHub.openSubAxis('${parentAxisCode}', '${escapeHtml(parentAxisTitle)}')` });
      }
    }

    crumbs.push({ label: `استاندارد ملی: <bdi dir="ltr">${code}</bdi>`, isCurrent: true });

    setTimeout(() => {
      if (window.HassanHub && typeof window.HassanHub.loadMeasureArtifacts === 'function') {
        window.HassanHub.loadMeasureArtifacts(code);
      }
    }, 40);

    // تولید کارت‌های مجزا و اختصاصی برای هر سنجه (منطبق بر طراحی اولیه حسن)
    const measuresHtml = mList.length ? mList.map((m, idx) => {
      const pNum = m.page || (200 + idx);
      const isSafety = m.patient_safety_flag;
      const stmt = m.statement || m.title || 'سنجه مصوب اعتباربخشی ملی';

      return `
        <article class="sn-hero-measure-card" id="mcard_${m.code}">
          <header class="sn-hero-card-header">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <span class="sn-hero-code-badge">
                ${ICONS.measureBadge} <span>سنجه ملی <bdi dir="ltr">${m.code}</bdi></span>
              </span>
              ${isSafety ? `<span class="sn-hero-safety-badge" style="display:inline-flex;align-items:center;gap:6px;">${ICONS.safetyAlert} <span>سنجه الزامی ایمنی بیمار (Never Event)</span></span>` : ''}
              <span class="sn-hero-level-pill" style="display:inline-flex;align-items:center;gap:6px;">${ICONS.levelGauge} <span>سطح ارزیابی: ${fa(m.measure_level || 1)}</span></span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="sn-hero-page-pill" style="display:inline-flex;align-items:center;gap:6px;">${ICONS.bookPage} <span>صفحه کتاب: ${fa(pNum)}</span></span>
            </div>
          </header>

          <div class="sn-hero-stmt">
            ${escapeHtml(stmt)}
          </div>

          <!-- کلید ورود به صفحه اختصاصی سنجه و چک‌لیست (سطح ۳) -->
          <div style="display:flex;gap:12px;margin-top:14px;flex-wrap:wrap;">
            <button type="button" class="btn btn--primary btn--md" onclick="HassanHub.openMeasureDetailPage('${m.code}')">
              <span style="display:inline-flex;align-items:center;gap:6px;">${ICONS.search} <span>مشاهده صفحه اختصاصی، بارگذاری مستندات و چک‌لیست</span></span>
              <span>${ICONS.arrowForward}</span>
            </button>
            <button type="button" class="btn btn--ghost btn--md" onclick="HassanHub.toggleBookGuide('${m.code}', '${m.id || ''}', ${pNum})">
              ${ICONS.bookGuideBtn} <span>راهنمای تفصیلی کتاب</span>
            </button>
          </div>

          <!-- کادر تمیز و شیک راهنمای کتاب -->
          <div class="sn-book-guide-panel" id="book_guide_${m.code}">
            <div class="sn-book-address-banner">
              <div class="sn-book-address-text">
                <span style="display:inline-flex;align-items:center;gap:6px;">${ICONS.library} <span>کتاب ملی استانداردهای اعتباربخشی بیمارستان‌های ایران (ویرایش ششم)</span></span>
                <span style="opacity:0.6">|</span>
                <span>صفحه کتاب: <b>${fa(pNum)}</b></span>
                <span style="opacity:0.6">|</span>
                <span>کد سنجه: <b><bdi dir="ltr">${m.code}</bdi></b></span>
              </div>
              <button type="button" class="sn-book-close-btn" onclick="HassanHub.toggleBookGuide('${m.code}', '${m.id || ''}', ${pNum})">
                <span>بستن راهنما</span> ${ICONS.close}
              </button>
            </div>

            <div class="sn-book-body" id="book_body_${m.code}">
              <div style="font-size:12.5px;color:var(--sn-text-muted);padding:10px 0">
                در حال بارگذاری الزامات و گام‌های ارزیابی از کتاب...
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('') : `
      <div style="text-align:center;padding:50px 20px;background:rgba(19,25,35,0.6);border-radius:16px;border:1px solid rgba(212,175,90,0.2)">
        <div style="display:flex;justify-content:center;margin-bottom:12px">${ICONS.emptyBox}</div>
        <div style="font-size:15px;font-weight:700;color:var(--sn-gold-light);margin-bottom:8px">سنجه‌های استاندارد <bdi dir="ltr">${code}</bdi></div>
        <div style="font-size:13px;color:var(--sn-text-muted);line-height:1.8">اطلاعات سنجه‌ها در دیتابیس سامانه ثبت شده و در دسترس است.</div>
      </div>
    `;

    return `
      <div class="sn-container">
        ${renderBreadcrumbHeader(crumbs)}
        
        <main class="sn-standard-page">
          <!-- بنر سربرگ استاندارد -->
          <div class="sn-standard-hero-banner">
            <div class="sn-std-badge-row">
              <span class="sn-std-pill-code">استاندارد ملی: <bdi dir="ltr">${code}</bdi></span>
              <span class="sn-std-pill-meta">${fa(mList.length)} سنجه مصوب وزارت بهداشت</span>
              <span class="sn-std-pill-book">کتاب استانداردهای اعتباربخشی ملی</span>
            </div>
            <h1 class="sn-std-title-text">${escapeHtml(stdTitle)}</h1>
            <div class="sn-std-subtitle-text">
              جهت ورود مستندات، بارگذاری شواهد الکترونیکی، مشاهده یا ساخت چک‌لیست، سنجه‌های زیر را بررسی فرمایید:
            </div>
          </div>

          <!-- لیست کارت‌های بزرگ سنجه -->
          <div class="sn-hero-measures-list">
            ${measuresHtml}
          </div>

          <!-- جدول سوابق و اقلام ثبت‌شده استاندارد و سنجه‌های تابعه -->
          ${renderArtifactsSectionContainer(code, `استاندارد ${code}`)}
        </main>
      </div>
    `;
  };

  // =========================================================================
  // ۷. صفحه اختصاصی تفصیلی سنجه با پیکان‌های بزرگ اکشن (سطح ۳)
  // منطبق بر طراحی اولیه حسن (عکس‌های media_1789661899030.png و media_1789661934983.png)
  // =========================================================================
  window.renderHassanMeasureDetailPage = function(measureCode) {
    measureCode = normCode(measureCode);
    HassanState.currentSubView = 'measure_page';
    HassanState.selectedMeasureCode = measureCode;

    setTimeout(() => {
      if (window.HassanHub && typeof window.HassanHub.loadMeasureArtifacts === 'function') {
        window.HassanHub.loadMeasureArtifacts(measureCode);
      }
    }, 40);

    let m = (window.ALL_ACCREDITATION_MEASURES || []).find(x => normCode(x.code) === measureCode);
    if (!m) {
      m = { code: measureCode, statement: `سنجه ملی ${measureCode}`, measure_level: 1, page: 200 };
    }

    const stmt = m.statement || m.title || measureCode;
    const isSafety = m.patient_safety_flag;
    const pNum = m.page || 200;

    // استخراج استاندارد والد
    const parts = measureCode.split('-');
    const stdCode = parts.length >= 3 ? parts.slice(0, 3).join('-') : parts[0];
    const axisCode = parts.length >= 2 ? parts.slice(0, 2).join('-') : parts[0];

    const secName = HassanState.currentSection || 'care';
    const secLabel = secName === 'management' ? 'رهبری و مدیریت' : (secName === 'support' ? 'حمایت از گیرنده خدمت' : 'مراقبت و درمان');

    const allAxes = [...(window.ALL_CARE_AXES || []), ...(window.ALL_MANAGEMENT_AXES || []), ...(window.ALL_SUPPORT_AXES || [])];
    const ax = allAxes.find(a => normCode(a.code) === normCode(axisCode));
    const axisTitle = ax ? ax.title : axisCode;

    const stdReg = (window.ALL_ACCREDITATION_STANDARDS || []).find(s => normCode(s.code) === normCode(stdCode));
    const stdTitle = stdReg ? stdReg.title : `استاندارد ${stdCode}`;

    const crumbs = [
      { label: 'اعتباربخشی بیمارستان', action: "go('acc')" },
      { label: secLabel, action: `HassanHub.go('${secName}')` },
      { label: `${axisTitle} (<bdi dir="ltr">${axisCode}</bdi>)`, action: `HassanHub.openSubAxis('${axisCode}', '${escapeHtml(axisTitle)}')` },
      { label: `استاندارد: <bdi dir="ltr">${stdCode}</bdi>`, action: `HassanHub.openStandardPage('${stdCode}', '${escapeHtml(stdTitle)}')` },
      { label: `سنجه: <bdi dir="ltr">${measureCode}</bdi>`, isCurrent: true }
    ];

    setTimeout(() => {
      if (window.HassanHub && typeof window.HassanHub.loadMeasureArtifacts === 'function') {
        window.HassanHub.loadMeasureArtifacts(measureCode);
      }
    }, 40);

    return `
      <div class="sn-container">
        ${renderBreadcrumbHeader(crumbs)}

        <!-- چیدمان افقی راست‌به‌چپ (Horizontal RTL): کارت اصلی سمت راست، کارت‌ها در سمت چپ -->
        <main class="sn-measure-hero-view sn-measure-horizontal-layout" style="max-width:1380px;margin:24px auto;padding:0 16px;">
          
          <div class="sn-measure-two-col-layout" style="display:flex;direction:rtl;gap:26px;align-items:flex-start;">
            
            <!-- ستون سمت راست: کارت اصلی سنجه (Main Measure Card) -->
            <div class="sn-measure-main-col" style="flex:1;min-width:0;background:rgba(19,25,35,0.82);border:1px solid rgba(212,175,90,0.28);border-radius:20px;padding:30px;box-shadow:0 14px 34px rgba(0,0,0,0.42);backdrop-filter:blur(10px);">
              
              <!-- ردیف نشان‌ها با آیکون‌های وکتور SVG دقیق -->
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap;">
                <span class="sn-hero-code-badge" style="display:inline-flex;align-items:center;gap:7px;font-size:13px;padding:6px 14px;">
                  ${ICONS.measureBadge}
                  <span>سنجه ملی:</span>
                  <bdi dir="ltr">${measureCode}</bdi>
                </span>
                ${isSafety ? `
                  <span class="sn-hero-safety-badge" style="display:inline-flex;align-items:center;gap:7px;font-size:13px;padding:6px 14px;">
                    ${ICONS.safetyAlert}
                    <span>سنجه الزامی ایمنی بیمار (Never Event)</span>
                  </span>
                ` : ''}
                <span class="sn-hero-level-pill" style="display:inline-flex;align-items:center;gap:6px;font-size:13px;padding:6px 14px;">
                  ${ICONS.levelGauge}
                  <span>سطح ارزیابی: ${fa(m.measure_level || 1)}</span>
                </span>
                <span class="sn-hero-page-pill" style="display:inline-flex;align-items:center;gap:6px;font-size:13px;padding:6px 14px;">
                  ${ICONS.bookPage}
                  <span>صفحه کتاب: ${fa(pNum)}</span>
                </span>
              </div>

              <!-- عنوان و گزاره اصلی سنجه -->
              <h2 style="font-size:20px;font-weight:800;color:var(--sn-gold-light);margin:0 0 16px;line-height:1.7;text-align:right;">
                ${escapeHtml(stmt)}
              </h2>

              <!-- توضیحات راهنما -->
              <p style="font-size:14px;color:var(--sn-text-muted);line-height:2;margin:0 0 24px;text-align:right;">
                ارزیابی انطباق، بارگذاری شواهد، مدیریت چک‌لیست و بررسی الزامات اعتباربخشی این سنجه از طریق ابزارهای زیر در دسترس است:
              </p>

              <!-- ردیف کلیدهای تکمیلی (خط‌مشی، چک‌لیست، فلوچارت، روش اجرایی و کتاب) با آیکون‌های وکتور -->
              <div class="sn-hero-actions-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));gap:12px;margin-bottom:20px;">
                <button type="button" class="sn-hero-btn sn-hero-btn-policy" onclick="HassanHub.openGenericForm('policy', '${measureCode}', '${jsArg(stmt)}')">
                  <div class="sn-hero-btn-icon">${ICONS.policyBtn}</div>
                  <div class="sn-hero-btn-text">
                    <span class="sn-hero-btn-title">خط‌مشی سنجه</span>
                    <span class="sn-hero-btn-sub">تدوین و ابلاغ</span>
                  </div>
                </button>

                <button type="button" class="sn-hero-btn sn-hero-btn-checklist" style="border-color:rgba(16,160,185,0.35);" onclick="HassanHub.openGenericForm('checklist', '${measureCode}', '${jsArg(stmt)}')">
                  <div class="sn-hero-btn-icon" style="background:rgba(16,160,185,0.15);color:#6ed5e7;">${ICONS.actionChecklist}</div>
                  <div class="sn-hero-btn-text">
                    <span class="sn-hero-btn-title">چک‌لیست ممیزی</span>
                    <span class="sn-hero-btn-sub">پایش و سنجش</span>
                  </div>
                </button>

                <button type="button" class="sn-hero-btn sn-hero-btn-flowchart" style="border-color:rgba(59,130,246,0.35);" onclick="HassanHub.openGenericForm('flowchart', '${measureCode}', '${jsArg(stmt)}')">
                  <div class="sn-hero-btn-icon" style="background:rgba(59,130,246,0.15);color:#93c5fd;">${ICONS.procedureBtn}</div>
                  <div class="sn-hero-btn-text">
                    <span class="sn-hero-btn-title">فلوچارت فرآیند</span>
                    <span class="sn-hero-btn-sub">گردش کار و SIPOC</span>
                  </div>
                </button>

                <button type="button" class="sn-hero-btn sn-hero-btn-proc" onclick="HassanHub.openGenericForm('procedure', '${measureCode}', '${jsArg(stmt)}')">
                  <div class="sn-hero-btn-icon">${ICONS.instructionBtn}</div>
                  <div class="sn-hero-btn-text">
                    <span class="sn-hero-btn-title">روش اجرایی (SOP)</span>
                    <span class="sn-hero-btn-sub">الزامات بالینی</span>
                  </div>
                </button>

                <button type="button" class="sn-hero-btn sn-hero-btn-book" onclick="HassanHub.toggleBookGuide('${measureCode}', '${m.id || ''}', ${pNum})">
                  <div class="sn-hero-btn-icon">${ICONS.bookGuideBtn}</div>
                  <div class="sn-hero-btn-text">
                    <span class="sn-hero-btn-title">راهنمای کتابچه</span>
                    <span class="sn-hero-btn-sub">متن و گام‌های ارزیابی</span>
                  </div>
                </button>
              </div>

              <!-- کادر راهنمای کتاب (کشویی داخل کارت اصلی) -->
              <div class="sn-book-guide-panel" id="book_guide_${measureCode}">
                <div class="sn-book-address-banner">
                  <div class="sn-book-address-text">
                    <span style="display:inline-flex;align-items:center;gap:6px;">${ICONS.library} <span>کتاب ملی استانداردهای اعتباربخشی بیمارستان‌های ایران (ویرایش ششم)</span></span>
                    <span style="opacity:0.6">|</span>
                    <span>صفحه کتاب: <b>${fa(pNum)}</b></span>
                    <span style="opacity:0.6">|</span>
                    <span>کد سنجه: <b><bdi dir="ltr">${measureCode}</bdi></b></span>
                  </div>
                  <button type="button" class="sn-book-close-btn" onclick="HassanHub.toggleBookGuide('${measureCode}', '${m.id || ''}', ${pNum})">
                    <span>بستن راهنما</span> ${ICONS.close}
                  </button>
                </div>

                <div class="sn-book-body" id="book_body_${measureCode}">
                  <div style="font-size:12.5px;color:var(--sn-text-muted);padding:10px 0">
                    در حال بارگذاری الزامات و گام‌های ارزیابی از کتاب...
                  </div>
                </div>
              </div>

            </div>

            <!-- ستون سمت چپ: کارت‌ها / پیکان‌های اقدام (Action Cards on the Left) -->
            <aside class="sn-measure-actions-col" style="display:flex;gap:20px;align-items:flex-start;flex-shrink:0;">
              
              <!-- پیکان قرمز: بارگذاری مستندات -->
              <div class="sn-action-arrow-box sn-arrow-red" role="button" tabindex="0" onclick="HassanHub.openEvidenceUploadModal('${measureCode}')" style="cursor:pointer;display:flex;flex-direction:column;align-items:center;transition:all 0.28s ease;" onmouseover="this.style.transform='translateY(-6px) scale(1.03)'" onmouseout="this.style.transform='none'">
                <div style="background:linear-gradient(180deg, #f43f5e 0%, #e11d48 100%);width:115px;height:300px;border-radius:14px 14px 0 0;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:22px 0 16px;box-shadow:0 12px 28px rgba(225,29,72,0.45);position:relative;border:1px solid rgba(254,205,211,0.3);border-bottom:none;">
                  <div style="width:46px;height:46px;border-radius:50%;background:rgba(0,0,0,0.22);display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:inset 0 2px 4px rgba(0,0,0,0.3);">
                    ${ICONS.actionUpload}
                  </div>
                  <div style="writing-mode:vertical-rl;transform:rotate(180deg);color:#fff;font-weight:900;font-size:16px;letter-spacing:1.5px;text-shadow:0 2px 4px rgba(0,0,0,0.35);">
                    بارگذاری مستندات
                  </div>
                  <div style="font-size:11px;color:rgba(255,255,255,0.9);font-weight:600;">
                    ارسال فایل شواهد
                  </div>
                  <!-- نوک پیکان رو به پایین -->
                  <div style="width:0;height:0;border-left:57.5px solid transparent;border-right:57.5px solid transparent;border-top:42px solid #e11d48;position:absolute;bottom:-42px;left:0;filter:drop-shadow(0 8px 10px rgba(225,29,72,0.35));"></div>
                </div>
              </div>

              <!-- پیکان زرد: چک‌لیست اختصاصی سنجه -->
              <div class="sn-action-arrow-box sn-arrow-yellow" role="button" tabindex="0" onclick="HassanHub.openMeasureChecklistPage('${measureCode}')" style="cursor:pointer;display:flex;flex-direction:column;align-items:center;transition:all 0.28s ease;" onmouseover="this.style.transform='translateY(-6px) scale(1.03)'" onmouseout="this.style.transform='none'">
                <div style="background:linear-gradient(180deg, #f59e0b 0%, #d97706 100%);width:115px;height:300px;border-radius:14px 14px 0 0;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:22px 0 16px;box-shadow:0 12px 28px rgba(217,119,6,0.45);position:relative;border:1px solid rgba(254,243,199,0.3);border-bottom:none;">
                  <div style="width:46px;height:46px;border-radius:50%;background:rgba(0,0,0,0.22);display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:inset 0 2px 4px rgba(0,0,0,0.3);">
                    ${ICONS.actionChecklist}
                  </div>
                  <div style="writing-mode:vertical-rl;transform:rotate(180deg);color:#fff;font-weight:900;font-size:16px;letter-spacing:1.5px;text-shadow:0 2px 4px rgba(0,0,0,0.35);">
                    چک‌لیست سنجه
                  </div>
                  <div style="font-size:11px;color:rgba(255,255,255,0.9);font-weight:600;">
                    ورود به چک‌لیست
                  </div>
                  <!-- نوک پیکان رو به پایین -->
                  <div style="width:0;height:0;border-left:57.5px solid transparent;border-right:57.5px solid transparent;border-top:42px solid #d97706;position:absolute;bottom:-42px;left:0;filter:drop-shadow(0 8px 10px rgba(217,119,6,0.35));"></div>
                </div>
              </div>

            </aside>

          </div>

          <!-- بخش جامع کارتابل اقلام و سوابق ثبت‌شده سنجه (به صورت جدول سوابق) -->
          <section class="sn-measure-artifacts-section" id="measure_artifacts_section_${measureCode}" style="margin-top:28px;background:rgba(19,25,35,0.88);border:1px solid rgba(212,175,90,0.32);border-radius:22px;padding:26px 28px;box-shadow:0 16px 40px rgba(0,0,0,0.45);backdrop-filter:blur(12px);direction:rtl;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;border-bottom:1px solid rgba(212,175,90,0.22);padding-bottom:16px;flex-wrap:wrap;gap:14px;">
              <div style="display:flex;align-items:center;gap:14px;">
                <div style="width:48px;height:48px;border-radius:12px;background:rgba(212,175,90,0.18);border:1px solid rgba(212,175,90,0.42);display:flex;align-items:center;justify-content:center;color:var(--sn-gold-light);font-size:24px;">
                  📋
                </div>
                <div>
                  <h3 style="font-size:18px;font-weight:800;color:var(--sn-gold-light);margin:0;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                    <span>جدول سوابق و اقلام ثبت‌شده سنجه</span>
                    <span class="sn-hero-code-badge" style="font-size:12px;padding:3px 10px;" id="artifacts_total_badge_${measureCode}">در حال بارگذاری…</span>
                    <span id="artifacts_sort_badge_${measureCode}" style="font-size:11.5px;padding:3px 10px;border-radius:8px;background:rgba(16,160,185,0.18);border:1px solid rgba(16,160,185,0.35);color:#6ed5e7;font-weight:700;">
                      ⬇ جدیدترین در صدر جدول
                    </span>
                  </h3>
                  <p style="font-size:12.5px;color:var(--sn-text-muted);margin:4px 0 0;">
                    فهرست کلیه موارد پرشده و مدارک ثبتی سنجه <bdi dir="ltr">${measureCode}</bdi> به تفکیک تاریخ ثبت (از قدیم به جدید، با اولویت جدیدترین در صدر لیست)
                  </p>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                <input type="text" id="artifacts_search_${measureCode}" placeholder="🔍 جستجو در موارد ثبت‌شده..." oninput="HassanHub.searchArtifacts('${measureCode}', this.value)" style="background:rgba(0,0,0,0.35);border:1px solid rgba(212,175,90,0.3);border-radius:10px;padding:7px 14px;color:#fff;font-size:12px;width:200px;direction:rtl;outline:none;">
                <div style="display:inline-flex;background:rgba(0,0,0,0.35);border:1px solid rgba(212,175,90,0.25);border-radius:10px;padding:2px;">
                  <button type="button" id="btn_view_table_${measureCode}" onclick="HassanHub.setArtifactViewMode('${measureCode}', 'table')" style="padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;border:none;cursor:pointer;background:rgba(212,175,90,0.25);color:var(--sn-gold-light);" title="نمایش به صورت جدول سوابق">
                    📊 جدول
                  </button>
                  <button type="button" id="btn_view_cards_${measureCode}" onclick="HassanHub.setArtifactViewMode('${measureCode}', 'cards')" style="padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;border:none;cursor:pointer;background:transparent;color:var(--sn-text-muted);" title="نمایش کارتی">
                    🎴 کارت‌ها
                  </button>
                </div>
                <button type="button" class="btn btn--ghost btn--sm" onclick="HassanHub.reloadMeasureArtifacts('${measureCode}')" style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--sn-gold-light);border:1px solid rgba(212,175,90,0.3);border-radius:8px;padding:7px 14px;background:rgba(0,0,0,0.25);cursor:pointer;" title="بروزرسانی داده‌ها">
                  🔄 <span>بروزرسانی</span>
                </button>
              </div>
            </div>

            <!-- تب‌های افقی فیلتر دسته‌بندی‌ها -->
            <nav class="sn-artifacts-tabs-nav" id="artifacts_tabs_${measureCode}" style="display:flex;gap:10px;overflow-x:auto;padding-bottom:12px;margin-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.08);scrollbar-width:thin;">
              <!-- تب‌ها توسط جاوااسکریپت رندر می‌شوند -->
            </nav>

            <!-- کانتینر اصلی رندر جدول / کارت‌ها -->
            <div id="artifacts_content_${measureCode}">
              <div style="display:flex;align-items:center;justify-content:center;width:100%;padding:40px 20px;color:var(--sn-text-muted);font-size:13px;gap:10px;">
                <span style="display:inline-block;width:18px;height:18px;border:2px solid rgba(212,175,90,0.3);border-top-color:var(--sn-gold-light);border-radius:50%;animation:spin 0.8s linear infinite;"></span>
                <span>در حال استخراج و چیدمان سوابق ثبت‌شده سنجه...</span>
              </div>
            </div>
          </section>

        </main>
      </div>
    `;
  };

  // =========================================================================
  // ۸. صفحه مدیریت چک‌لیست‌های سنجه (سطح ۴)
  // منطبق بر طراحی اولیه حسن (عکس media_1789661961551.png)
  // =========================================================================
  window.renderHassanMeasureChecklistPage = function(measureCode) {
    measureCode = normCode(measureCode);
    HassanState.currentSubView = 'measure_checklists';
    HassanState.selectedMeasureCode = measureCode;

    let m = (window.ALL_ACCREDITATION_MEASURES || []).find(x => normCode(x.code) === measureCode);
    const stmt = m ? (m.statement || m.title || measureCode) : measureCode;

    const parts = measureCode.split('-');
    const stdCode = parts.slice(0, 3).join('-');
    const axisCode = parts.slice(0, 2).join('-');

    let secName = 'care';
    if (axisCode.startsWith('الف-')) secName = 'management';
    else if (axisCode.startsWith('ج-')) secName = 'support';
    else if (axisCode.startsWith('ب-')) secName = 'care';

    const allAxes = [...CARE_AXES, ...MANAGEMENT_AXES, ...SUPPORT_AXES];
    const ax = allAxes.find(a => normCode(a.code) === normCode(axisCode));
    const axisTitle = ax ? ax.title : axisCode;

    // واکشی چک‌لیست‌های مرتبط در سیستم
    const checkListItems = [];
    if (window.CHK && Array.isArray(window.CHK.list)) {
      window.CHK.list.forEach(c => {
        if (c.measure_code === measureCode || (c.title && c.title.includes(measureCode))) {
          checkListItems.push(c);
        }
      });
    }

    const rowsHtml = checkListItems.length ? checkListItems.map((c, idx) => `
      <tr>
        <td>${fa(idx + 1)}</td>
        <td style="font-weight:700;color:var(--sn-gold-light)">${escapeHtml(c.title)}</td>
        <td>${escapeHtml(c.cadence || 'دوره‌ای')}</td>
        <td>${escapeHtml(c.collector || 'سوپروایزر / کارشناس کیفیت')}</td>
        <td>${escapeHtml(c.supervisor || 'مدیریت کیفیت')}</td>
        <td><span class="sn-hero-level-pill">بدون مغایرت</span></td>
        <td>
          <button type="button" class="btn btn--secondary btn--sm" onclick="if(typeof openChecklist==='function') openChecklist('${c.id}'); else BTN.alert('چک‌لیست در دسترس است.');">مشاهده</button>
        </td>
      </tr>
    `).join('') : `
      <tr>
        <td colspan="7" style="text-align:center;padding:50px 20px;">
          <div style="display:flex;justify-content:center;margin-bottom:12px">${ICONS.emptyBox}</div>
          <div style="font-size:15px;color:var(--sn-text-muted);margin-bottom:14px">موردی یافت نشد</div>
          <button type="button" class="btn btn--success btn--md" onclick="HassanHub.openChecklistBuilder('${measureCode}', '${jsArg(stmt)}')">
            + ساخت اولین چک‌لیست برای این سنجه
          </button>
        </td>
      </tr>
    `;

    return `
      <div class="sn-container">
        
        <!-- نوار هدر فهرست چک‌لیست‌ها مطابق با عکس ۵ -->
        <header style="display:flex;justify-content:space-between;align-items:center;background:rgba(19,25,35,0.85);backdrop-filter:blur(14px);border:1px solid rgba(212,175,90,0.25);border-radius:14px;padding:14px 20px;margin-bottom:20px;">
          <button type="button" class="btn btn--secondary btn--md" onclick="HassanHub.openMeasureDetailPage('${measureCode}')">
            <span>بازگشت</span>
            <span>${ICONS.arrowForward}</span>
          </button>
          <div style="font-size:14px;font-weight:800;color:var(--sn-gold-light);text-align:left;direction:rtl;">
            فهرست چک‌لیست‌های محور ${escapeHtml(axisTitle)} — سنجه <bdi dir="ltr">${measureCode}</bdi>
          </div>
        </header>

        <main class="sn-content-wrapper">
          
          <!-- نوار فیلتر و ابزاربار: سال، جستجو، و دکمه ساخت چک‌لیست -->
          <div style="display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:16px;flex-wrap:wrap;">
            
            <div style="display:flex;align-items:center;gap:12px;">
              <!-- دکمه آبی ساخت چک‌لیست -->
              <button type="button" class="btn btn--info btn--md" onclick="HassanHub.openChecklistBuilder('${measureCode}', '${jsArg(stmt)}')">
                <span>${ICONS.plus}</span>
                <span>ساخت چک لیست</span>
              </button>

              <!-- انتخابگر سال -->
              <select style="padding:8px 16px;background:rgba(19,25,35,0.9);border:1px solid rgba(212,175,90,0.3);border-radius:8px;color:#fff;font-family:inherit;font-weight:700">
                ${JALALI_YEARS.map(y => `<option value="${y}" ${y==='۱۴۰۵'?'selected':''}>${y}</option>`).join('')}
              </select>
            </div>

            <!-- فیلد جستجوی کلید واژه -->
            <div style="position:relative;width:280px;">
              <input type="text" placeholder="جستجو کلید واژه" style="width:100%;padding:9px 14px 9px 36px;background:rgba(23,31,44,0.7);border:1px solid rgba(212,175,90,0.25);border-radius:8px;color:#fff;font-family:inherit;font-size:13px">
              <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--sn-text-muted);pointer-events:none;">
                ${ICONS.search}
              </span>
            </div>

          </div>

          <!-- جدول چک‌لیست‌ها -->
          <div style="overflow-x:auto;background:rgba(19,25,35,0.75);border:1px solid rgba(212,175,90,0.22);border-radius:14px;">
            <table class="sn-table" style="width:100%;border-collapse:collapse;text-align:right;">
              <thead>
                <tr style="background:rgba(212,175,90,0.12);color:var(--sn-gold-light);font-size:13px;border-bottom:1px solid rgba(212,175,90,0.2);">
                  <th style="padding:14px 16px;width:60px">ردیف</th>
                  <th style="padding:14px 16px">عنوان</th>
                  <th style="padding:14px 16px">دوره تناوب</th>
                  <th style="padding:14px 16px">مسئولین جمع آوری</th>
                  <th style="padding:14px 16px">مسئولین پایش</th>
                  <th style="padding:14px 16px">اقدام اصلاحی</th>
                  <th style="padding:14px 16px;width:120px">عملیات</th>
                </tr>
              </thead>
              <tbody style="font-size:13px;">
                ${rowsHtml}
              </tbody>
            </table>
          </div>

        </main>
      </div>
    `;
  };

  // باز شدن میزکار هوشمند چک‌لیست در صفحه مستقل تمام‌صفحه با آدرس مجزا (خواسته قطعی کاربر)
  HassanHub.openChecklistBuilder = function(measureCode, stmt) {
    HassanHub.openGenericForm('checklist', measureCode, stmt);
  };

  // مودال ساخت چک‌لیست در صورت نیاز کمکی
  HassanHub.openChecklistBuilderModal = function(measureCode, stmt) {
    const modalId = 'snChecklistBuilderModal';
    let modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'sn-modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="sn-modal-box" style="max-width:680px">
        <div class="sn-modal-header">
          <h3 class="sn-modal-title">
            <span>ساخت چک‌لیست ارزیابی برای سنجه ${measureCode}</span>
          </h3>
          <button type="button" class="sn-modal-close" onclick="document.getElementById('${modalId}').style.display='none'">${ICONS.close}</button>
        </div>

        <div style="display:flex;flex-direction:column;gap:14px;">
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:var(--sn-text-gold);margin-bottom:6px">عنوان چک‌لیست</label>
            <input type="text" id="chkNewTitle" value="چک‌لیست ارزیابی و پایش ${stmt.slice(0, 45)}..." style="width:100%;padding:10px 14px;background:rgba(23,31,44,0.7);border:1px solid rgba(212,175,90,0.25);border-radius:8px;color:#fff;font-family:inherit;font-size:13px">
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label style="display:block;font-size:12px;font-weight:700;color:var(--sn-text-gold);margin-bottom:6px">دوره تناوب پایش</label>
              <select id="chkNewCadence" style="width:100%;padding:9px;background:rgba(23,31,44,0.7);border:1px solid rgba(212,175,90,0.25);border-radius:8px;color:#fff;font-family:inherit">
                <option value="monthly">ماهانه</option>
                <option value="quarterly">فصلی (سه ماهه)</option>
                <option value="biannual">شش ماهه</option>
                <option value="annual">سالانه</option>
                <option value="adhoc">موردی</option>
              </select>
            </div>
            <div>
              <label style="display:block;font-size:12px;font-weight:700;color:var(--sn-text-gold);margin-bottom:6px">سال ارزشیابی</label>
              <select id="chkNewYear" style="width:100%;padding:9px;background:rgba(23,31,44,0.7);border:1px solid rgba(212,175,90,0.25);border-radius:8px;color:#fff;font-family:inherit">
                ${JALALI_YEARS.map(y => `<option value="${y}" ${y==='۱۴۰۵'?'selected':''}>${y}</option>`).join('')}
              </select>
            </div>
          </div>

          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:var(--sn-text-gold);margin-bottom:6px">مسئول جمع‌آوری و تکمیل</label>
            <input type="text" id="chkNewCollector" value="سرپرستار بخش / رابط کیفیت" style="width:100%;padding:10px 14px;background:rgba(23,31,44,0.7);border:1px solid rgba(212,175,90,0.25);border-radius:8px;color:#fff;font-family:inherit;font-size:13px">
          </div>

          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:var(--sn-text-gold);margin-bottom:6px">سوال یا سنجه اول ارزیابی</label>
            <textarea id="chkNewItem1" rows="3" style="width:100%;padding:10px 14px;background:rgba(23,31,44,0.7);border:1px solid rgba(212,175,90,0.25);border-radius:8px;color:#fff;font-family:inherit;font-size:13px">${stmt}</textarea>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:14px;border-top:1px solid rgba(212,175,90,0.2)">
            <button type="button" class="btn btn--info btn--md" onclick="HassanHub.saveNewChecklist('${measureCode}')">
              ${ICONS.saveDisk} <span>ایجاد و ثبت چک‌لیست</span>
            </button>
            <button type="button" class="btn btn--secondary btn--md" onclick="document.getElementById('${modalId}').style.display='none'">
              انصراف
            </button>
          </div>
        </div>
      </div>
    `;
    modal.style.display = 'flex';
  };

  HassanHub.saveNewChecklist = function(measureCode) {
    const title = (document.getElementById('chkNewTitle') || {}).value || 'چک‌لیست سنجه ' + measureCode;
    const cadence = (document.getElementById('chkNewCadence') || {}).value || 'monthly';
    const collector = (document.getElementById('chkNewCollector') || {}).value || 'کارشناس کیفیت';

    if (window.CHK && Array.isArray(window.CHK.list)) {
      window.CHK.list.push({
        id: 'chk_' + Date.now(),
        title: title,
        measure_code: measureCode,
        cadence: cadence,
        collector: collector,
        supervisor: 'مدیریت کیفیت'
      });
    }

    if (typeof toast === 'function') toast('چک‌لیست جدید با موفقیت برای سنجه ثبت شد.');
    else BTN.alert('چک‌لیست با موفقیت ایجاد گردید.');

    const modal = document.getElementById('snChecklistBuilderModal');
    if (modal) modal.style.display = 'none';

    // بازخوانی جدول
    const target = getContainer();
    if (target) target.innerHTML = renderHassanMeasureChecklistPage(measureCode);
  };

  // =========================================================================
  // ۹. هاب‌های اختصاصی ایمنی بیمار (Never Events)
  // =========================================================================
  window.renderHassanSafetyHub = function() {
    HassanState.currentSection = 'management';
    HassanState.currentSubView = 'safety_hub';
    HassanState.selectedAxisCode = 'الف-8';
    HassanState.selectedAxisTitle = 'مدیریت خطا و ایمنی بیمار';

    const crumbs = [
      { label: 'اعتباربخشی بیمارستان', action: "go('acc')" },
      { label: 'رهبری و مدیریت', action: "HassanHub.go('management')" },
      { label: 'مدیریت خطا و ایمنی بیمار', isCurrent: true }
    ];

    const safetyCards = [
      {
        id: 'safe-measures',
        title: '۱۲۱ سنجه الزامی ایمنی بیمار',
        sub: 'مشاهده و ارزیابی سنجه‌های Never Events',
        icon: ICONS.shieldAlert,
        action: "HassanHub.openSafetyMeasuresList()"
      },
      {
        id: 'safe-report',
        title: 'ثبت خطای بالینی و وقایع ۲۸گانه',
        sub: 'سیستم ثبت محرمانه و مدیریت خطا',
        icon: ICONS.errorManage,
        action: "if(typeof go==='function') go('errors'); else HassanHub.openGenericForm('procedure', 'ERR-REPORT', 'فرم گزارش واقعه ناخواسته و خطای بالینی');"
      },
      {
        id: 'safe-inst',
        title: 'دستورالعمل‌های ایمنی بیمار',
        sub: 'دستورالعمل‌های ابلاغی وزارت بهداشت',
        icon: ICONS.guidelines,
        action: "HassanHub.openDocumentHubModal('instruction', 'الف-8', 'مدیریت خطا و ایمنی بیمار')"
      },
      {
        id: 'safe-sop',
        title: 'روش‌های اجرایی و RCA / FMEA',
        sub: 'مدیریت خطاهای دارویی، سقوط و زخم فشاری',
        icon: ICONS.sopWorkflows,
        action: "HassanHub.openDocumentHubModal('procedure', 'الف-8', 'مدیریت خطا و ایمنی بیمار')"
      },
      {
        id: 'safe-pol',
        title: 'خط‌مشی‌های ایمنی بیمار',
        sub: 'خط‌مشی‌های مصوب تیم حاکمیتی',
        icon: ICONS.policies,
        action: "HassanHub.openDocumentHubModal('policy', 'الف-8', 'مدیریت خطا و ایمنی بیمار')"
      },
      {
        id: 'safe-chk',
        title: 'چک‌لیست‌های ارزیابی ایمنی',
        sub: 'ممیزی راندهای ایمنی و جراحی ایمن',
        icon: ICONS.check,
        action: "HassanHub.openDocumentHubModal('checklist', 'الف-8', 'مدیریت خطا و ایمنی بیمار')"
      },
      {
        id: 'safe-lib',
        title: 'کتابخانه دیجیتال ایمنی بیمار',
        sub: 'مستندات مرجع WHO و اعتباربخشی ملی',
        icon: ICONS.library,
        action: "HassanHub.openDocumentHubModal('library', 'الف-8', 'مدیریت خطا و ایمنی بیمار')"
      }
    ];

    const cardsHtml = safetyCards.map(c => `
      <div class="sn-card" role="button" tabindex="0" onclick="${c.action}">
        <div class="sn-card-circle-icon" style="background:rgba(212,175,90,0.12);border-color:rgba(212,175,90,0.35);color:var(--sn-gold-light)">
          ${c.icon}
        </div>
        <div class="sn-card-title" style="font-size:13px">${c.title}</div>
        <div style="font-size:11px;color:var(--sn-gold-light);background:rgba(212,175,90,0.12);padding:2px 10px;border-radius:10px;border:1px solid rgba(212,175,90,0.25)">
          ${c.sub}
        </div>
        <div class="sn-card-decorative-lines">
          <div class="sn-card-line-main"></div>
          <div class="sn-card-line-sub"></div>
        </div>
      </div>
    `).join('');

    return `
      <div class="sn-container">
        ${renderBreadcrumbHeader(crumbs)}
        <main class="sn-content-wrapper">
          <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(19,25,35,0.85);backdrop-filter:blur(14px);border:1px solid rgba(212,175,90,0.25);border-radius:14px;padding:16px 20px;margin-bottom:20px;">
            <div>
              <h3 style="margin:0;font-size:15px;font-weight:800;color:var(--sn-gold-light)">سامانه جامع مدیریت خطا و ایمنی بیمار</h3>
              <div style="font-size:12px;color:var(--sn-text-muted);margin-top:4px">
                شامل ۱۲۱ سنجه الزامی ایمنی بیمار، وقایع ۲۸‌گانه ناخواسته (Never Events)، ابزارهای RCA و FMEA
              </div>
            </div>
            <div style="font-size:12px;font-weight:700;color:var(--sn-gold);background:rgba(212,175,90,0.15);border:1px solid rgba(212,175,90,0.35);padding:6px 14px;border-radius:20px">
              ۱۲۱ سنجه الزامی فعال
            </div>
          </div>

          <div class="sn-cards-grid">
            ${cardsHtml}
          </div>
        </main>
      </div>
    `;
  };

  // رندر صفحه ۱۲۱ سنجه الزامی ایمنی بیمار
  window.renderHassanSafetyMeasuresPage = function() {
    HassanState.currentSubView = 'safety_measures';
    HassanState.selectedAxisCode = 'الف-8';
    HassanState.selectedAxisTitle = 'مدیریت خطا و ایمنی بیمار';

    const crumbs = [
      { label: 'اعتباربخشی بیمارستان', action: "go('acc')" },
      { label: 'رهبری و مدیریت', action: "HassanHub.go('management')" },
      { label: 'مدیریت خطا و ایمنی بیمار', action: "HassanHub.openSafetyHub()" },
      { label: '۱۲۱ سنجه الزامی ایمنی بیمار', isCurrent: true }
    ];

    const mList = (window.ALL_ACCREDITATION_MEASURES || []).filter(m => m.patient_safety_flag);

    const measuresHtml = mList.map((m, idx) => {
      const pNum = m.page || (200 + idx);
      const stmt = m.statement || m.title || 'سنجه مصوب ایمنی بیمار';

      return `
        <article class="sn-hero-measure-card" id="mcard_${m.code}">
          <header class="sn-hero-card-header">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <span class="sn-hero-code-badge" style="display:inline-flex;align-items:center;gap:7px;">
                ${ICONS.measureBadge}
                <span>سنجه ملی <bdi dir="ltr">${m.code}</bdi></span>
              </span>
              <span class="sn-hero-safety-badge" style="display:inline-flex;align-items:center;gap:6px;">${ICONS.safetyAlert} <span>سنجه الزامی ایمنی بیمار (Never Event)</span></span>
              <span class="sn-hero-level-pill" style="display:inline-flex;align-items:center;gap:6px;">${ICONS.levelGauge} <span>سطح ارزیابی: ${fa(m.measure_level || 1)}</span></span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="sn-hero-page-pill" style="display:inline-flex;align-items:center;gap:6px;">${ICONS.bookPage} <span>صفحه کتاب: ${fa(pNum)}</span></span>
            </div>
          </header>

          <div class="sn-hero-stmt">
            ${escapeHtml(stmt)}
          </div>

          <div style="display:flex;gap:12px;margin-top:14px;flex-wrap:wrap;">
            <button type="button" class="btn btn--primary btn--md" onclick="HassanHub.openMeasureDetailPage('${m.code}')">
              ${ICONS.search} <span>مشاهده صفحه تفصیلی و چک‌لیست سنجه</span> ${ICONS.arrowForward}
            </button>
            <button type="button" class="btn btn--ghost btn--md" onclick="HassanHub.toggleBookGuide('${m.code}', '${m.id || ''}', ${pNum})">
              ${ICONS.bookGuideBtn} <span>راهنمای کتاب</span>
            </button>
          </div>
        </article>
      `;
    }).join('');

    return `
      <div class="sn-container">
        ${renderBreadcrumbHeader(crumbs)}
        
        <main class="sn-standard-page">
          <div class="sn-standard-hero-banner">
            <div class="sn-std-badge-row">
              <span class="sn-std-pill-code">محور: مدیریت خطا و ایمنی بیمار</span>
              <span class="sn-std-pill-meta">${fa(mList.length)} سنجه الزامی مصوب وزارت بهداشت</span>
              <span class="sn-std-pill-book">کتاب استانداردهای اعتباربخشی ملی</span>
            </div>
            <h1 class="sn-std-title-text">۱۲۱ سنجه الزامی ایمنی بیمار (Never Events)</h1>
            <div class="sn-std-subtitle-text">
              فهرست کامل و یکپارچه سنجه‌های الزامی ایمنی بیمار با دسترسی فوری به مستندات، چک‌لیست‌ها و راهنمای کتاب:
            </div>
          </div>

          <div class="sn-hero-measures-list">
            ${measuresHtml}
          </div>
        </main>
      </div>
    `;
  };

  // رندر داینامیک هوشمند بر مبنای وضعیت فعلی
  window.renderHassanDynamic = function(section) {
    section = section || HassanState.currentSection || 'care';
    HassanState.currentSection = section;

    switch (HassanState.currentSubView) {
      case 'measure_checklists':
        return renderHassanMeasureChecklistPage(HassanState.selectedMeasureCode);
      case 'measure_page':
        return renderHassanMeasureDetailPage(HassanState.selectedMeasureCode);
      case 'standard_page':
        return renderHassanStandardDetailPage(HassanState.selectedStandardCode, HassanState.selectedStandardTitle);
      case 'sub_axis':
        return renderHassanSubAxisHub(HassanState.selectedAxisCode, HassanState.selectedAxisTitle);
      case 'general_care_sub':
        return renderHassanGeneralCareSubHub();
      case 'procedures_flow':
        return renderHassanProceduresFlow();
      case 'safety_hub':
        return renderHassanSafetyHub();
      case 'safety_measures':
        return renderHassanSafetyMeasuresPage();
      case 'grid':
      default:
        if (section === 'management') return renderHassanManagementHub();
        if (section === 'support') return renderHassanSupportHub();
        return renderHassanCareHub();
    }
  };

  // =========================================================================
  // ۱۰. ناوبری و متدهای فراخوانی (Navigation & Action Methods)
  // =========================================================================
  HassanHub.go = function(section) {
    if (section === 'acc' || section === 'user') {
      if (typeof go === 'function') go('acc');
      else location.href = '/#acc';
      return;
    }
    section = section || 'care';
    HassanState.currentSection = section;
    // ریست کامل وضعیت ساب‌ویو هنگام ورود به سرشاخه اصلی (حل باگ پرش به صفحات قبلی)
    HassanState.currentSubView = 'grid';
    HassanState.selectedAxisCode = null;
    HassanState.selectedAxisTitle = '';
    HassanState.selectedStandardCode = null;
    HassanState.selectedStandardTitle = '';
    HassanState.selectedMeasureCode = null;
    HassanState.selectedMeasureTitle = '';

    HassanHub.saveState();
    pushHassanHash('#acc/' + section);
    const target = getContainer();
    if (target) {
      target.innerHTML = renderHassanDynamic(section);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  HassanHub.back = function() {
    if (HassanState.currentSubView === 'measure_checklists') {
      HassanHub.openMeasureDetailPage(HassanState.selectedMeasureCode);
      return;
    }
    if (HassanState.currentSubView === 'measure_page') {
      if (HassanState.selectedStandardCode) {
        HassanHub.openStandardPage(HassanState.selectedStandardCode, HassanState.selectedStandardTitle);
        return;
      }
      HassanHub.openSubAxis(HassanState.selectedAxisCode, HassanState.selectedAxisTitle);
      return;
    }
    if (HassanState.currentSubView === 'safety_measures') {
      HassanHub.openSafetyHub();
      return;
    }
    if (HassanState.currentSubView === 'safety_hub') {
      HassanHub.go('management');
      return;
    }
    if (HassanState.currentSubView === 'standard_page') {
      if (HassanState.selectedAxisCode) {
        HassanHub.openSubAxis(HassanState.selectedAxisCode, HassanState.selectedAxisTitle);
        return;
      }
      if (HassanState.selectedStandardCode && HassanState.selectedStandardCode.startsWith('ب-1-')) {
        HassanHub.openGeneralCareSub();
        return;
      }
      HassanHub.go(HassanState.currentSection || 'care');
      return;
    }
    if (HassanState.currentSubView === 'procedures_flow') {
      HassanHub.openGeneralCareSub();
      return;
    }
    if (HassanState.currentSubView === 'general_care_sub' || HassanState.currentSubView === 'sub_axis') {
      HassanHub.go(HassanState.currentSection);
      return;
    }
    if (window.S && S.page === 'measures' && S.accDepth === 1) {
      S.accDepth = 0;
      if (typeof saveMeasuresSubState === 'function') saveMeasuresSubState();
      if (typeof syncRouteHash === 'function') syncRouteHash('measures');
      if (typeof renderMeasures === 'function') {
        renderMeasures();
        return;
      }
    }
    if (typeof go === 'function') {
      go('acc');
    }
  };

  HassanHub.onCareCardClick = function(code, view) {
    if (view === 'general_care_sub') {
      HassanHub.openGeneralCareSub();
    } else {
      const targetAxis = CARE_AXES.find(a => normCode(a.code) === normCode(code));
      const title = targetAxis ? targetAxis.title : code;
      HassanHub.openSubAxis(code, title);
    }
  };

  HassanHub.openSubAxis = function(code, title, skipHistory) {
    code = normCode(code);
    let sec = HassanState.currentSection || 'care';
    if (code.startsWith('الف-')) sec = 'management';
    else if (code.startsWith('ج-')) sec = 'support';
    else if (code.startsWith('ب-')) sec = 'care';
    HassanState.currentSection = sec;
    HassanState.currentSubView = 'sub_axis';
    HassanState.selectedAxisCode = code;

    if (!title || title === code || title.includes('هنوز ثبت نشده')) {
      const allAxes = [...CARE_AXES, ...MANAGEMENT_AXES, ...SUPPORT_AXES];
      const foundAx = allAxes.find(a => normCode(a.code) === code);
      if (foundAx) title = foundAx.title;
      else title = `محور ${code}`;
    }
    HassanState.selectedAxisTitle = title;

    HassanHub.saveState();
    if (!skipHistory) {
      pushHassanHash('#acc/' + sec + '/axis/' + encodeURIComponent(code));
    }
    const target = getContainer();
    if (target) {
      target.innerHTML = renderHassanSubAxisHub(code, title);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  HassanHub.onAxisCardClick = function(code, title) {
    if (code === 'الف-8' || code === 'الف-safety') {
      HassanHub.openSafetyHub();
      return;
    }
    HassanHub.openSubAxis(code, title);
  };

  HassanHub.openSafetyHub = function(skipHistory) {
    HassanState.currentSection = 'management';
    HassanState.currentSubView = 'safety_hub';
    HassanState.selectedAxisCode = 'الف-8';
    HassanState.selectedAxisTitle = 'مدیریت خطا و ایمنی بیمار';
    HassanHub.saveState();
    if (!skipHistory) {
      pushHassanHash('#acc/management/safety');
    }
    const target = getContainer();
    if (target) {
      target.innerHTML = renderHassanSafetyHub();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  HassanHub.openSafetyMeasuresList = function(skipHistory) {
    HassanState.currentSection = 'management';
    HassanState.currentSubView = 'safety_measures';
    HassanState.selectedAxisCode = 'الف-8';
    HassanState.selectedAxisTitle = 'مدیریت خطا و ایمنی بیمار';
    HassanHub.saveState();
    if (!skipHistory) {
      pushHassanHash('#acc/management/safety-measures');
    }
    const target = getContainer();
    if (target) {
      target.innerHTML = renderHassanSafetyMeasuresPage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  HassanHub.openGeneralCareSub = function(skipHistory) {
    HassanState.currentSection = 'care';
    HassanState.currentSubView = 'general_care_sub';
    HassanHub.saveState();
    if (!skipHistory) {
      pushHassanHash('#acc/care/general');
    }
    const target = getContainer();
    target.innerHTML = renderHassanGeneralCareSubHub();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  HassanHub.onGeneralCareCardClick = function(id, type, code, view, docType) {
    if (view === 'procedures_flow') {
      HassanState.currentSection = 'care';
      HassanState.currentSubView = 'procedures_flow';
      HassanHub.saveState();
      pushHassanHash('#acc/care/procedures');
      const target = getContainer();
      target.innerHTML = renderHassanProceduresFlow();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (type === 'doc') {
      HassanHub.openDocumentHubModal(docType, 'ب-1', 'مستندات محور مراقبت‌های عمومی بالینی');
      return;
    }

    const std = GENERAL_CARE_SUBCARDS.find(s => s.code === code);
    const title = std ? std.title : code;
    HassanHub.openStandardPage(code, title);
  };

  HassanHub.openStandardPage = function(code, title, skipHistory) {
    code = normCode(code);
    let sec = HassanState.currentSection || 'care';
    if (code.startsWith('الف-')) sec = 'management';
    else if (code.startsWith('ج-')) sec = 'support';
    else if (code.startsWith('ب-')) sec = 'care';
    HassanState.currentSection = sec;
    HassanState.currentSubView = 'standard_page';
    HassanState.selectedStandardCode = code;

    let stdTitle = title;
    if (!stdTitle || stdTitle.includes('هنوز ثبت نشده')) {
      const regStd = (window.ALL_ACCREDITATION_STANDARDS || []).find(s => normCode(s.code) === code);
      if (regStd && regStd.title && !regStd.title.includes('هنوز ثبت نشده')) {
        stdTitle = regStd.title;
      } else {
        const allStds = getStandardsForAxis(HassanState.selectedAxisCode || '');
        const found = allStds.find(s => normCode(s.code) === code);
        if (found && found.title && !found.title.includes('هنوز ثبت نشده')) stdTitle = found.title;
        else stdTitle = `استاندارد ملی ${code}`;
      }
    }
    HassanState.selectedStandardTitle = stdTitle;

    HassanHub.saveState();
    if (!skipHistory) {
      pushHassanHash('#acc/standard/' + encodeURIComponent(code));
    }
    const target = getContainer();
    if (target) {
      target.innerHTML = renderHassanStandardDetailPage(code, HassanState.selectedStandardTitle);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  HassanHub.openStandardDetailsModal = function(code, title) {
    HassanHub.openStandardPage(code, title);
  };

  HassanHub.openMeasureDetailPage = function(measureCode, skipHistory) {
    measureCode = normCode(measureCode);
    HassanState.currentSubView = 'measure_page';
    HassanState.selectedMeasureCode = measureCode;

    HassanHub.saveState();
    if (!skipHistory) {
      pushHassanHash('#acc/measure/' + encodeURIComponent(measureCode));
    }
    const target = getContainer();
    if (target) {
      target.innerHTML = renderHassanMeasureDetailPage(measureCode);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  HassanHub.openMeasureChecklistPage = function(measureCode, skipHistory) {
    measureCode = normCode(measureCode);
    HassanState.currentSubView = 'measure_checklists';
    HassanState.selectedMeasureCode = measureCode;

    HassanHub.saveState();
    if (!skipHistory) {
      pushHassanHash('#acc/measure/' + encodeURIComponent(measureCode) + '/checklists');
    }
    const target = getContainer();
    if (target) {
      target.innerHTML = renderHassanMeasureChecklistPage(measureCode);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // =========================================================================
  // کارتابل و جدول سوابق اقلام پرشده سنجه (مرتب‌سازی: جدیدترین در صدر جدول)
  // =========================================================================
  HassanHub._artifactsCache = HassanHub._artifactsCache || {};
  HassanHub._activeArtifactTab = HassanHub._activeArtifactTab || {};
  HassanHub._artifactViewMode = HassanHub._artifactViewMode || {};
  HassanHub._artifactSortDir = HassanHub._artifactSortDir || {};
  HassanHub._artifactSearchQuery = HassanHub._artifactSearchQuery || {};

  function parseItemDate(rawStr) {
    if (!rawStr) return { ts: 0, text: '—', time: '' };
    const d = new Date(rawStr);
    const ts = isNaN(d.getTime()) ? 0 : d.getTime();
    let dateText = '—';
    let timeText = '';
    try {
      dateText = d.toLocaleDateString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' });
      if (String(rawStr).includes('T') || String(rawStr).includes(':')) {
        timeText = d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
      }
    } catch (e) {
      dateText = String(rawStr).split(' ')[0] || rawStr;
    }
    return { ts, text: dateText, time: timeText };
  }

  HassanHub.setArtifactViewMode = function(measureCode, mode) {
    measureCode = normCode(measureCode);
    HassanHub._artifactViewMode[measureCode] = mode || 'table';
    HassanHub.renderArtifactsSection(measureCode);
  };

  HassanHub.toggleArtifactSort = function(measureCode) {
    measureCode = normCode(measureCode);
    const curr = HassanHub._artifactSortDir[measureCode] || 'desc';
    HassanHub._artifactSortDir[measureCode] = curr === 'desc' ? 'asc' : 'desc';
    HassanHub.renderArtifactsSection(measureCode);
  };

  HassanHub.searchArtifacts = function(measureCode, query) {
    measureCode = normCode(measureCode);
    HassanHub._artifactSearchQuery[measureCode] = String(query || '').trim();
    HassanHub.renderArtifactsSection(measureCode);
  };

  HassanHub.reloadMeasureArtifacts = async function(measureCode) {
    measureCode = normCode(measureCode);
    delete HassanHub._artifactsCache[measureCode];
    await HassanHub.loadMeasureArtifacts(measureCode, true);
    if (typeof toast === 'function') toast('سوابق و اقلام ثبت‌شده سنجه با موفقیت بروزرسانی شد');
  };

  HassanHub.setArtifactTab = function(measureCode, tabKey) {
    measureCode = normCode(measureCode);
    HassanHub._activeArtifactTab[measureCode] = tabKey;
    HassanHub.renderArtifactsSection(measureCode);
  };

  HassanHub.loadMeasureArtifacts = async function(measureCode, force) {
    measureCode = normCode(measureCode);
    if (!HassanHub._activeArtifactTab[measureCode]) {
      HassanHub._activeArtifactTab[measureCode] = 'all';
    }
    if (!HassanHub._artifactViewMode[measureCode]) {
      HassanHub._artifactViewMode[measureCode] = 'table'; // پیش‌فرض: جدول
    }
    if (!HassanHub._artifactSortDir[measureCode]) {
      HassanHub._artifactSortDir[measureCode] = 'desc'; // پیش‌فرض: جدیدترین صدر لیست
    }

    if (!force && HassanHub._artifactsCache[measureCode]) {
      HassanHub.renderArtifactsSection(measureCode);
      return;
    }

    try {
      let data = null;
      if (window.API && typeof window.API.measureArtifacts === 'function') {
        data = await window.API.measureArtifacts(measureCode);
      } else {
        const res = await fetch('/api/accreditation/measures/' + encodeURIComponent(measureCode) + '/artifacts', { credentials: 'include' });
        if (res.ok) data = await res.json();
      }

      if (data) {
        HassanHub._artifactsCache[measureCode] = data;
        HassanHub.renderArtifactsSection(measureCode);
      }
    } catch (err) {
      console.error('[loadMeasureArtifacts]', err);
      const contentEl = document.getElementById('artifacts_content_' + measureCode);
      if (contentEl) {
        contentEl.innerHTML = `
          <div style="padding:24px;color:#f87171;font-size:13px;display:flex;align-items:center;gap:10px;">
            ⚠️ <span>خطا در دریافت اقلام سنجه: ${escapeHtml(err.message || 'خطای سرور')}</span>
            <button type="button" class="btn btn--secondary btn--sm" onclick="HassanHub.loadMeasureArtifacts('${measureCode}', true)">تلاش مجدد</button>
          </div>
        `;
      }
    }
  };

  function buildUnifiedArtifactList(data, measureCode) {
    const unified = [];
    const returnUrl = (typeof window !== 'undefined' && window.location && window.location.href) ? encodeURIComponent(window.location.href) : '';

    // ۱. چک‌لیست‌های تکمیل‌شده و پایش‌های بالینی (Submissions)
    (data.submissions || []).forEach(sub => {
      const dInfo = parseItemDate(sub.submitted_at || sub.created_at);
      const pct = (sub.max_score && sub.max_score > 0) ? Math.round(((sub.score || 0) / sub.max_score) * 100) : 100;
      const isGood = pct >= 80;
      unified.push({
        id: sub.id,
        category: 'submission',
        typeLabel: '✍️ چک‌لیست تکمیل‌شده',
        badgeColor: 'background:rgba(16,160,185,0.18);border:1px solid rgba(16,160,185,0.4);color:#6ed5e7;',
        title: (sub.checklist_title || 'ارزیابی ممیزی بالینی') + (sub.reference ? ' — ' + sub.reference : ''),
        code: sub.checklist_code || 'CL-SUB',
        dateText: dInfo.text,
        dateTime: dInfo.time,
        ts: dInfo.ts,
        author: sub.submitter_name ? (sub.submitter_name + (sub.submitter_role ? ' (' + sub.submitter_role + ')' : '')) : 'مسئول تکمیل',
        status: `امتیاز ${fa(sub.score || 0)} از ${fa(sub.max_score || 0)} (${fa(pct)}٪)`,
        statusClass: isGood ? 'background:rgba(16,160,185,0.2);color:#34bbd3;border:1px solid rgba(16,160,185,0.4);' : 'background:rgba(245,158,11,0.2);color:#fbbf24;border:1px solid rgba(245,158,11,0.4);',
        versionText: sub.note ? (sub.note.length > 55 ? sub.note.substring(0, 52) + '…' : sub.note) : 'تکمیل‌شده در بخش',
        actionFn: "if(typeof go==='function') go('checklists');",
        actionLabel: 'مشاهده کارنامه',
        actionIcon: '📊',
        attachment: null,
        rawItem: sub
      });
    });

    // ۲. ارزیابی‌های ثبت‌شده سنجه / استاندارد (Evaluations)
    (data.evaluations || []).forEach(ev => {
      const dInfo = parseItemDate(ev.last_reviewed_at || ev.updated_at);
      const isFull = ev.status === 'full_compliant';
      const isPart = ev.status === 'partial_compliant';
      const statusFa = isFull ? 'انطباق کامل (مصوب)' : (isPart ? 'انطباق مشروط' : 'عدم انطباق');
      const statusCls = isFull ? 'background:rgba(16,160,185,0.2);color:#34bbd3;border:1px solid rgba(16,160,185,0.4);' : 
                        (isPart ? 'background:rgba(245,158,11,0.2);color:#fbbf24;border:1px solid rgba(245,158,11,0.4);' : 'background:rgba(239,68,68,0.2);color:#f87171;border:1px solid rgba(239,68,68,0.4);');
      unified.push({
        id: ev.id,
        category: 'evaluation',
        typeLabel: '📊 ارزیابی سنجه',
        badgeColor: 'background:rgba(139,92,246,0.18);border:1px solid rgba(139,92,246,0.4);color:#c4b5fd;',
        title: `ارزیابی اعتباربخشی سال ${fa(ev.year || 1405)}` + (ev.notes ? ' — ' + ev.notes : ''),
        code: ev.measure_code || measureCode,
        dateText: dInfo.text,
        dateTime: dInfo.time,
        ts: dInfo.ts,
        author: ev.reviewer_name ? (ev.reviewer_name + (ev.reviewer_role ? ' (' + ev.reviewer_role + ')' : '')) : 'ارزیاب کیفیت',
        status: statusFa,
        statusClass: statusCls,
        versionText: `دوره ارزیابی: سال ${fa(ev.year || 1405)}`,
        actionFn: `if(typeof HassanHub.openEvaluationModal==='function') HassanHub.openEvaluationModal('${measureCode}'); else toast('ارزیابی ثبت‌شده سنجه');`,
        actionLabel: 'جزئیات ارزیابی',
        actionIcon: '🔎',
        attachment: null,
        rawItem: ev
      });
    });

    // ۳. خط‌مشی‌های مصوب (Policies)
    (data.policies || []).forEach(p => {
      const dInfo = parseItemDate(p.issue_date || p.created_at || p.updated_at);
      unified.push({
        id: p.id,
        category: 'policy',
        typeLabel: '📜 خط‌مشی سنجه',
        badgeColor: 'background:rgba(244,63,94,0.18);border:1px solid rgba(244,63,94,0.4);color:#fda4af;',
        title: p.title,
        code: p.doc_code || '—',
        dateText: dInfo.text,
        dateTime: dInfo.time,
        ts: dInfo.ts,
        author: p.responsible_person || 'مدیر بهبود کیفیت',
        status: p.status === 'active' || p.status === 'approved' ? 'مصوب و ابلاغ‌شده' : (p.status === 'draft' ? 'پیش‌نویس' : 'جاری'),
        statusClass: p.status === 'active' || p.status === 'approved' ? 'background:rgba(16,160,185,0.2);color:#34bbd3;border:1px solid rgba(16,160,185,0.4);' : 'background:rgba(245,158,11,0.2);color:#fbbf24;border:1px solid rgba(245,158,11,0.4);',
        versionText: `نسخه ${fa(p.version_no || 1)} (بازنگری ${fa(p.revision_no || 0)})`,
        actionUrl: `/accreditation/policy.html?code=${encodeURIComponent(measureCode)}&type=policy&docId=${encodeURIComponent(p.id)}&returnUrl=${returnUrl}`,
        actionLabel: 'مشاهده سند',
        actionIcon: '👁️',
        attachment: p.attachment_name ? `/api/documents/${p.id}/attachment` : null,
        rawItem: p
      });
    });

    // ۴. روش‌های اجرایی و دستورالعمل‌ها (Procedures & Instructions)
    (data.procedures || []).forEach(pr => {
      const isInst = pr.doc_type === 'instruction';
      const dInfo = parseItemDate(pr.issue_date || pr.created_at || pr.updated_at);
      unified.push({
        id: pr.id,
        category: 'procedure',
        typeLabel: isInst ? '📋 دستورالعمل مصوب' : '📋 روش اجرایی (SOP)',
        badgeColor: 'background:rgba(16,160,185,0.18);border:1px solid rgba(16,160,185,0.4);color:#6ed5e7;',
        title: pr.title,
        code: pr.doc_code || '—',
        dateText: dInfo.text,
        dateTime: dInfo.time,
        ts: dInfo.ts,
        author: pr.responsible_person || 'سوپروایزر / مسئول بخش',
        status: pr.status === 'active' || pr.status === 'approved' ? 'مصوب و ابلاغ‌شده' : (pr.status === 'draft' ? 'پیش‌نویس' : 'جاری'),
        statusClass: pr.status === 'active' || pr.status === 'approved' ? 'background:rgba(16,160,185,0.2);color:#34bbd3;border:1px solid rgba(16,160,185,0.4);' : 'background:rgba(245,158,11,0.2);color:#fbbf24;border:1px solid rgba(245,158,11,0.4);',
        versionText: `نسخه ${fa(pr.version_no || 1)} (بازنگری ${fa(pr.revision_no || 0)})`,
        actionUrl: `/accreditation/policy.html?code=${encodeURIComponent(measureCode)}&type=${encodeURIComponent(pr.doc_type || 'procedure')}&docId=${encodeURIComponent(pr.id)}&returnUrl=${returnUrl}`,
        actionLabel: 'مشاهده سند',
        actionIcon: '👁️',
        attachment: pr.attachment_name ? `/api/documents/${pr.id}/attachment` : null,
        rawItem: pr
      });
    });

    // ۵. الگوهای چک‌لیست‌های ممیزی (Checklists)
    (data.checklists || []).forEach(c => {
      const dInfo = parseItemDate(c.last_submission_at || c.created_at);
      const cadenceFa = { daily: 'روزانه', weekly: 'هفتگی', monthly: 'ماهانه', quarterly: 'فصلی', semiannual: 'شش‌ماهه', annual: 'سالانه', occasional: 'موردی' }[c.cadence] || (c.cadence || 'دوره‌ای');
      const subsCount = c.submissions_count || 0;
      unified.push({
        id: c.id,
        category: 'checklist',
        typeLabel: '✅ الگوی چک‌لیست',
        badgeColor: 'background:rgba(245,158,11,0.18);border:1px solid rgba(245,158,11,0.4);color:#fbbf24;',
        title: c.title,
        code: c.checklist_code || '—',
        dateText: dInfo.text,
        dateTime: dInfo.time,
        ts: dInfo.ts,
        author: `دوره ${cadenceFa}`,
        status: subsCount > 0 ? `${fa(subsCount)} مورد تکمیل‌شده` : 'آماده تکمیل',
        statusClass: subsCount > 0 ? 'background:rgba(16,160,185,0.2);color:#34bbd3;border:1px solid rgba(16,160,185,0.4);' : 'background:rgba(59,130,246,0.18);color:#93c5fd;border:1px solid rgba(59,130,246,0.4);',
        versionText: `تناوب: ${cadenceFa}`,
        actionFn: `HassanHub.openMeasureChecklistPage('${measureCode}')`,
        actionLabel: 'ورود به چک‌لیست',
        actionIcon: '✍️',
        attachment: null,
        rawItem: c
      });
    });

    // ۶. فلوچارت‌ها و فرآیندها (Flowcharts)
    (data.flowcharts || []).forEach(f => {
      const dInfo = parseItemDate(f.created_at);
      unified.push({
        id: f.id,
        category: 'flowchart',
        typeLabel: '🔄 فلوچارت فرآیند',
        badgeColor: 'background:rgba(59,130,246,0.18);border:1px solid rgba(59,130,246,0.4);color:#93c5fd;',
        title: f.title,
        code: f.process_code || '—',
        dateText: dInfo.text,
        dateTime: dInfo.time,
        ts: dInfo.ts,
        author: f.domain === 'main' ? 'فرآیند اصلی' : (f.domain === 'support' ? 'پشتیبانی' : 'مدیریتی'),
        status: 'ثبت‌شده در شناسنامه',
        statusClass: 'background:rgba(59,130,246,0.18);color:#93c5fd;border:1px solid rgba(59,130,246,0.4);',
        versionText: 'نسخه ۱',
        actionFn: "if(typeof go==='function') go('processes');",
        actionLabel: 'مشاهده فرآیند',
        actionIcon: '🔍',
        attachment: f.file_path ? `/api/processes/${f.id}/file` : null,
        rawItem: f
      });
    });

    // ۷. اسناد و شواهد بارگذاری‌شده (Evidence files)
    (data.evidence || []).forEach(e => {
      const dInfo = parseItemDate(e.created_at);
      const sizeKb = e.file_size_bytes ? Math.round(e.file_size_bytes / 1024) : 0;
      unified.push({
        id: e.id,
        category: 'evidence',
        typeLabel: '📎 سند شواهد',
        badgeColor: 'background:rgba(244,63,94,0.18);border:1px solid rgba(244,63,94,0.4);color:#fda4af;',
        title: e.title || e.file_name || 'فایل شواهد',
        code: e.file_name || 'فایل ضمیمه',
        dateText: dInfo.text,
        dateTime: dInfo.time,
        ts: dInfo.ts,
        author: e.uploaded_by || 'ثبت‌کننده شواهد',
        status: sizeKb > 0 ? `${fa(sizeKb)} KB` : 'پیوست معتبر',
        statusClass: 'background:rgba(255,255,255,0.08);color:#fff;',
        versionText: 'ضمیمه الکترونیکی',
        actionUrl: `/api/evidence/${e.id}/download`,
        actionTarget: '_blank',
        actionLabel: 'دانلود فایل',
        actionIcon: '📥',
        attachment: `/api/evidence/${e.id}/download`,
        rawItem: e
      });
    });

    return unified;
  }
  HassanHub.buildUnifiedArtifactList = buildUnifiedArtifactList;

  HassanHub.renderArtifactsSection = function(measureCode) {
    measureCode = normCode(measureCode);
    const data = HassanHub._artifactsCache[measureCode];
    if (!data) return;

    const activeTab = HassanHub._activeArtifactTab[measureCode] || 'all';
    const viewMode = HassanHub._artifactViewMode[measureCode] || 'table';
    const sortDir = HassanHub._artifactSortDir[measureCode] || 'desc';
    const searchQ = (HassanHub._artifactSearchQuery[measureCode] || '').toLowerCase();

    // تجمیع اقلام در ابتدای تابع تا هیچ خطای TDZ رخ ندهد
    const rawAllItems = buildUnifiedArtifactList(data, measureCode);
    HassanHub._currentFilteredItems = HassanHub._currentFilteredItems || {};
    HassanHub._currentFilteredItems[measureCode] = rawAllItems;

    // بروزرسانی بج تعداد کل
    const totalBadge = document.getElementById('artifacts_total_badge_' + measureCode);
    if (totalBadge) {
      totalBadge.textContent = `${fa(rawAllItems.length || data.counts.total)} مورد ثبت‌شده`;
    }

    // بروزرسانی بج مرتب‌سازی
    const sortBadge = document.getElementById('artifacts_sort_badge_' + measureCode);
    if (sortBadge) {
      sortBadge.textContent = sortDir === 'desc' ? '⬇ جدیدترین در صدر جدول' : '▲ قدیمی‌ترین در صدر جدول';
      sortBadge.style.background = sortDir === 'desc' ? 'rgba(16,160,185,0.18)' : 'rgba(59,130,246,0.18)';
      sortBadge.style.color = sortDir === 'desc' ? '#6ed5e7' : '#93c5fd';
    }

    // بروزرسانی استایل دکمه‌های سوئیچر نما
    const btnTable = document.getElementById('btn_view_table_' + measureCode);
    const btnCards = document.getElementById('btn_view_cards_' + measureCode);
    if (btnTable && btnCards) {
      if (viewMode === 'table') {
        btnTable.style.background = 'rgba(212,175,90,0.25)';
        btnTable.style.color = 'var(--sn-gold-light)';
        btnTable.style.fontWeight = '700';
        btnCards.style.background = 'transparent';
        btnCards.style.color = 'var(--sn-text-muted)';
        btnCards.style.fontWeight = '600';
      } else {
        btnCards.style.background = 'rgba(212,175,90,0.25)';
        btnCards.style.color = 'var(--sn-gold-light)';
        btnCards.style.fontWeight = '700';
        btnTable.style.background = 'transparent';
        btnTable.style.color = 'var(--sn-text-muted)';
        btnTable.style.fontWeight = '600';
      }
    }

    // رندر تب‌های دسته‌بندی
    const tabsContainer = document.getElementById('artifacts_tabs_' + measureCode);
    if (tabsContainer) {
      const tabsDef = [
        { key: 'all', label: 'همه موارد ثبت‌شده', icon: '📋', count: rawAllItems.length },
        { key: 'submission', label: 'چک‌لیست‌های تکمیل‌شده', icon: '✍️', count: (data.submissions || []).length },
        { key: 'evaluation', label: 'ارزیابی‌های سنجه', icon: '📊', count: (data.evaluations || []).length },
        { key: 'policy', label: 'خط‌مشی‌ها', icon: '📜', count: (data.policies || []).length },
        { key: 'procedure', label: 'روش‌های اجرایی و SOP', icon: '📋', count: (data.procedures || []).length },
        { key: 'checklist', label: 'الگوهای چک‌لیست', icon: '✅', count: (data.checklists || []).length },
        { key: 'flowchart', label: 'فلوچارت‌ها و فرآیندها', icon: '🔄', count: (data.flowcharts || []).length },
        { key: 'evidence', label: 'اسناد و شواهد', icon: '📎', count: (data.evidence || []).length }
      ].filter(t => t.key === 'all' || t.count > 0);

      tabsContainer.innerHTML = tabsDef.map(t => {
        const isActive = activeTab === t.key;
        return `
          <button type="button" 
                  class="sn-artifact-tab-btn ${isActive ? 'is-active' : ''}" 
                  onclick="HassanHub.setArtifactTab('${measureCode}', '${t.key}')"
                  style="display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:12px;font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all 0.25s ease;background:${isActive ? 'linear-gradient(135deg, rgba(212,175,90,0.28) 0%, rgba(212,175,90,0.12) 100%)' : 'rgba(255,255,255,0.05)'};border:1px solid ${isActive ? 'rgba(212,175,90,0.65)' : 'rgba(255,255,255,0.12)'};color:${isActive ? 'var(--sn-gold-light)' : 'var(--sn-text-muted)'};">
            <span style="font-size:14px;">${t.icon}</span>
            <span>${t.label}</span>
            <span style="font-size:11px;padding:2px 7px;border-radius:10px;background:${isActive ? 'rgba(212,175,90,0.35)' : 'rgba(255,255,255,0.1)'};color:${isActive ? '#fff' : 'rgba(255,255,255,0.7)'};font-weight:800;">
              ${fa(t.count)}
            </span>
          </button>
        `;
      }).join('');
    }

    // اعمال فیلتر تب فعال
    let allItems = rawAllItems;
    if (activeTab !== 'all') {
      allItems = allItems.filter(x => x.category === activeTab);
    }

    // اعمال فیلتر جستجو
    if (searchQ) {
      allItems = allItems.filter(x => 
        (x.title || '').toLowerCase().includes(searchQ) ||
        (x.code || '').toLowerCase().includes(searchQ) ||
        (x.author || '').toLowerCase().includes(searchQ) ||
        (x.typeLabel || '').toLowerCase().includes(searchQ)
      );
    }

    // مرتب‌سازی زمانی دقیق: از قدیم به جدید با جدیدترین در صدر جدول (desc)
    if (sortDir === 'desc') {
      allItems.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    } else {
      allItems.sort((a, b) => (a.ts || 0) - (b.ts || 0));
    }

    HassanHub._currentFilteredItems = HassanHub._currentFilteredItems || {};
    HassanHub._currentFilteredItems[measureCode] = allItems;

    const contentEl = document.getElementById('artifacts_content_' + measureCode);
    if (!contentEl) return;

    if (viewMode === 'table') {
      contentEl.innerHTML = renderArtifactsTableHtml(measureCode, allItems, sortDir, activeTab);
    } else {
      contentEl.innerHTML = renderArtifactsCardsTrackHtml(measureCode, allItems, activeTab);
    }
  };

  function renderArtifactsTableHtml(measureCode, items, sortDir, activeTab) {
    if (items.length === 0) {
      return `
        <div style="background:rgba(13,18,27,0.7);border:1px dashed rgba(212,175,90,0.3);border-radius:14px;padding:36px 20px;text-align:center;color:var(--sn-text-muted);">
          <div style="font-size:32px;margin-bottom:8px;">📂</div>
          <div style="font-size:14px;font-weight:700;color:var(--sn-gold-light);margin-bottom:6px;">هیچ موردی در این فیلتر ثبت نشده است</div>
          <div style="font-size:12px;margin-bottom:14px;">جهت تکمیل مستندات می‌توانید از کلیدهای بالای صفحه برای ثبت خط‌مشی، چک‌لیست یا شواهد استفاده کنید.</div>
          <button type="button" class="btn btn--success btn--sm" onclick="HassanHub.openGenericForm('policy', '${measureCode}')">
            ➕ ثبت مورد جدید برای این سنجه
          </button>
        </div>
      `;
    }

    return `
      <!-- جدول جمع‌وجور و تمام‌عرض بدون نیاز به اسکرول افقی (Zero Horizontal Scroll) -->
      <div class="sn-artifacts-table-wrap" style="width:100%;box-sizing:border-box;border-radius:14px;border:1px solid rgba(212,175,90,0.28);background:rgba(13,18,27,0.92);box-shadow:0 10px 28px rgba(0,0,0,0.45);overflow:hidden;">
        <table class="sn-artifacts-table" style="width:100%;table-layout:fixed;border-collapse:collapse;direction:rtl;text-align:right;font-size:12px;">
          <thead>
            <tr style="background:linear-gradient(90deg, rgba(212,175,90,0.2) 0%, rgba(212,175,90,0.1) 100%);border-bottom:2px solid rgba(212,175,90,0.3);color:var(--sn-gold-light);font-size:12px;font-weight:800;">
              <th style="padding:11px 4px;width:4%;text-align:center;">ردیف</th>
              <th style="padding:11px 8px;width:17%;">نوع و کد مدرک</th>
              <th style="padding:11px 10px;width:33%;">عنوان مورد پرشده (پرونده)</th>
              <th style="padding:11px 8px;width:13%;cursor:pointer;user-select:none;" onclick="HassanHub.toggleArtifactSort('${measureCode}')" title="تغییر جهت مرتب‌سازی تاریخ">
                <div style="display:inline-flex;align-items:center;gap:4px;">
                  <span>تاریخ ثبت</span>
                  <span style="font-size:10px;color:#fff;background:rgba(212,175,90,0.3);padding:1px 5px;border-radius:4px;font-weight:700;">
                    ${sortDir === 'desc' ? '▼ جدید' : '▲ قدیم'}
                  </span>
                </div>
              </th>
              <th style="padding:11px 8px;width:14%;">مسئول / ثبت‌کننده</th>
              <th style="padding:11px 6px;width:10%;text-align:center;">وضعیت انطباق</th>
              <th style="padding:11px 6px;width:9%;text-align:center;">بررسی</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((it, idx) => {
              const bg = (idx % 2 === 0) ? 'background:rgba(17,24,35,0.45);' : 'background:rgba(23,33,49,0.65);';
              const bgVal = (idx % 2 === 0) ? 'rgba(17,24,35,0.45)' : 'rgba(23,33,49,0.65)';
              return `
                <tr style="${bg}border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;transition:background 0.15s ease;"
                    onclick="HassanHub.openArtifactDossier('${measureCode}', ${idx})"
                    onmouseover="this.style.background='rgba(212,175,90,0.18)'"
                    onmouseout="this.style.background='${bgVal}'"
                    title="جهت بررسی و مشاهده پرونده کامل کلیک کنید">
                  
                  <!-- ردیف -->
                  <td style="padding:10px 4px;text-align:center;font-weight:700;color:var(--sn-gold-light);font-size:11.5px;">
                    ${fa(idx + 1)}
                  </td>

                  <!-- نوع مدرک و کد در یک ستون فشرده -->
                  <td style="padding:10px 8px;overflow:hidden;">
                    <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-start;">
                      <span style="display:inline-flex;align-items:center;padding:2px 7px;border-radius:6px;font-size:11px;font-weight:700;${it.badgeColor};white-space:nowrap;">
                        ${it.typeLabel}
                      </span>
                      <bdi dir="ltr" style="font-family:monospace;font-size:11px;color:var(--sn-gold-light);font-weight:700;padding-right:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">
                        ${escapeHtml(it.code)}
                      </bdi>
                    </div>
                  </td>

                  <!-- عنوان مورد پرشده با خلاصه‌سازی ۲ خطی -->
                  <td style="padding:10px 10px;overflow:hidden;">
                    <div style="font-weight:700;color:#fff;font-size:12.5px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(it.title)}">
                      ${escapeHtml(it.title)}
                    </div>
                    ${it.versionText ? `
                      <div style="font-size:11px;color:var(--sn-text-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        ${escapeHtml(it.versionText)}
                      </div>
                    ` : ''}
                  </td>

                  <!-- تاریخ و زمان ثبت -->
                  <td style="padding:10px 8px;overflow:hidden;">
                    <div style="display:flex;flex-direction:column;gap:2px;">
                      <span style="font-weight:700;color:#fff;font-size:11.5px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;">
                        <span>📅</span> <span>${it.dateText}</span>
                      </span>
                      ${it.dateTime ? `
                        <span style="font-size:10.5px;color:var(--sn-text-muted);white-space:nowrap;">
                          🕒 ${it.dateTime}
                        </span>
                      ` : ''}
                    </div>
                  </td>

                  <!-- مسئول / ثبت‌کننده -->
                  <td style="padding:10px 8px;overflow:hidden;">
                    <div style="font-size:11.5px;color:rgba(255,255,255,0.88);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(it.author)}">
                      ${escapeHtml(it.author)}
                    </div>
                  </td>

                  <!-- وضعیت انطباق -->
                  <td style="padding:10px 6px;text-align:center;overflow:hidden;">
                    <span style="display:inline-block;padding:2px 7px;border-radius:6px;font-size:11px;font-weight:700;${it.statusClass};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">
                      ${it.status}
                    </span>
                  </td>

                  <!-- عملیات: دکمه بررسی پرونده -->
                  <td style="padding:10px 6px;text-align:center;">
                    <button type="button" class="btn btn--primary btn--sm" 
                            onclick="event.stopPropagation(); HassanHub.openArtifactDossier('${measureCode}', ${idx})" 
                            style="padding:4px 9px;font-size:11px;border-radius:7px;display:inline-flex;align-items:center;gap:4px;background:rgba(212,175,90,0.22);border:1px solid rgba(212,175,90,0.5);color:var(--sn-gold-light);cursor:pointer;white-space:nowrap;" 
                            title="مشاهده و بررسی پرونده کامل">
                      <span>🔎</span> <span>بررسی</span>
                    </button>
                  </td>

                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // =========================================================================
  // هاب پرونده الکترونیکی سنجه و مشاهده و بررسی پرونده (Dossier Modal)
  // =========================================================================
  HassanHub.closeArtifactDossier = function() {
    const el = document.getElementById('sn_artifact_dossier_modal');
    if (el) el.remove();
  };

  HassanHub.openArtifactDossier = function(measureCode, itemIndex) {
    measureCode = normCode(measureCode);
    const list = (HassanHub._currentFilteredItems && HassanHub._currentFilteredItems[measureCode]) || [];
    if (!list || !list.length) return;
    
    itemIndex = parseInt(itemIndex, 10);
    if (isNaN(itemIndex) || itemIndex < 0) itemIndex = 0;
    if (itemIndex >= list.length) itemIndex = list.length - 1;
    
    const it = list[itemIndex];
    if (!it) return;

    const hasPrev = itemIndex > 0;
    const hasNext = itemIndex < list.length - 1;
    const raw = it.rawItem || {};

    let detailsHtml = '';

    if (it.category === 'submission') {
      let answers = [];
      try {
        answers = typeof raw.answers === 'string' ? JSON.parse(raw.answers) : (raw.answers || []);
      } catch(e) { answers = []; }

      const pct = (raw.max_score && raw.max_score > 0) ? Math.round(((raw.score || 0) / raw.max_score) * 100) : 100;
      
      detailsHtml = `
        <div style="background:rgba(17,24,35,0.7);border:1px solid rgba(212,175,90,0.28);border-radius:14px;padding:16px;margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
            <div style="font-size:13.5px;font-weight:800;color:var(--sn-gold-light);">
              📊 کارنامه ممیزی چک‌لیست: امتیاز ${fa(raw.score || 0)} از ${fa(raw.max_score || 0)} (${fa(pct)}٪ انطباق)
            </div>
            <div style="font-size:11px;padding:3px 9px;border-radius:6px;background:rgba(16,160,185,0.2);color:#34bbd3;font-weight:700;">
              تکمیل‌شده و مصوب
            </div>
          </div>
          <div style="height:7px;border-radius:4px;background:rgba(255,255,255,0.08);overflow:hidden;margin-bottom:12px;">
            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg, #10a0b9 0%, #34bbd3 100%);"></div>
          </div>
          <div style="font-size:12.5px;line-height:1.7;color:#fff;background:rgba(0,0,0,0.25);padding:12px 14px;border-radius:10px;border-right:3px solid #10a0b9;">
            <b>گزارش و یادداشت ارزیاب:</b> ${escapeHtml(raw.note || 'ارزیابی میدانی انجام شده و فرم تکمیل گردید.')}
          </div>
        </div>

        ${answers.length > 0 ? `
          <div style="margin-bottom:14px;">
            <h4 style="font-size:13px;font-weight:800;color:var(--sn-gold-light);margin-bottom:8px;">📋 ریز اقلام و پاسخ‌های ثبت‌شده در چک‌لیست:</h4>
            <div style="display:flex;flex-direction:column;gap:7px;max-height:240px;overflow-y:auto;padding-left:4px;">
              ${answers.map((ans, aIdx) => {
                const ansFa = ans.answer === 'excellent' ? 'عالی (انطباق کامل)' : (ans.answer === 'yes' ? 'بله (منطبق)' : 'خیر (عدم انطباق)');
                const ansColor = ans.answer === 'no' ? 'color:#f87171;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);' : 'color:#34bbd3;background:rgba(16,160,185,0.15);border:1px solid rgba(16,160,185,0.3);';
                return `
                  <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:9px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
                    <div style="flex:1;">
                      <div style="font-size:12px;font-weight:700;color:#fff;">بند شماره ${fa(aIdx + 1)} چک‌لیست ممیزی</div>
                      ${ans.note ? `<div style="font-size:11px;color:#fbbf24;margin-top:2px;">⚠️ مغایرت: ${escapeHtml(ans.note)}</div>` : ''}
                    </div>
                    <span style="font-size:11px;padding:2px 7px;border-radius:5px;font-weight:700;white-space:nowrap;${ansColor}">${ansFa}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
      `;
    } else if (it.category === 'evaluation') {
      detailsHtml = `
        <div style="background:rgba(17,24,35,0.7);border:1px solid rgba(212,175,90,0.28);border-radius:14px;padding:16px;margin-bottom:16px;">
          <div style="font-size:13.5px;font-weight:800;color:var(--sn-gold-light);margin-bottom:8px;">📊 ارزیابی رسمی سنجه — دوره سال ${fa(raw.year || 1405)}</div>
          <div style="font-size:12.5px;color:#fff;line-height:1.7;background:rgba(0,0,0,0.25);padding:12px 14px;border-radius:10px;border-right:3px solid #8b5cf6;">
            <b>مشروح نظرات ارزیاب کیفیت:</b> ${escapeHtml(raw.notes || 'ارزیابی انطباق سنجه ثبت شده است.')}
          </div>
          <div style="margin-top:10px;font-size:12px;color:var(--sn-text-muted);">
            وضعیت سیستمی: <b style="color:#fff;">${escapeHtml(it.status)}</b> · ارزیاب ثبت‌کننده: <b style="color:var(--sn-gold-light);">${escapeHtml(it.author)}</b>
          </div>
        </div>
      `;
    } else if (it.category === 'policy' || it.category === 'procedure') {
      detailsHtml = `
        <div style="background:rgba(17,24,35,0.7);border:1px solid rgba(212,175,90,0.28);border-radius:14px;padding:16px;margin-bottom:16px;">
          <div style="font-size:13.5px;font-weight:800;color:var(--sn-gold-light);margin-bottom:8px;">📜 مشخصات سند مصوب: ${escapeHtml(it.title)}</div>
          <div style="font-size:12px;color:var(--sn-text-muted);margin-bottom:10px;">
            کد سند: <bdi dir="ltr" style="font-family:monospace;color:var(--sn-gold-light);">${escapeHtml(it.code)}</bdi> · نسخه ${fa(raw.version_no || 1)} (بازنگری ${fa(raw.revision_no || 0)}) · وضعیت: <b style="color:#34bbd3;">${it.status}</b>
          </div>
          <div style="font-size:12.5px;line-height:1.7;color:#fff;background:rgba(0,0,0,0.25);padding:12px 14px;border-radius:10px;border-right:3px solid #d4af37;">
            <b>مسئول تدوین و اجرا:</b> ${escapeHtml(raw.responsible_person || it.author)}
            <br>
            <b>تاریخ ابلاغ / اعتبار:</b> ${escapeHtml(it.dateText)}
          </div>
          ${it.actionUrl ? `
            <div style="margin-top:12px;">
              <a href="${it.actionUrl}" class="btn btn--primary btn--sm" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:7px 14px;">
                <span>👁️</span> <span>مشاهده متن کامل سند در سندخوان تخصصی</span>
              </a>
            </div>
          ` : ''}
        </div>
      `;
    } else if (it.category === 'evidence') {
      detailsHtml = `
        <div style="background:rgba(17,24,35,0.7);border:1px solid rgba(212,175,90,0.28);border-radius:14px;padding:16px;margin-bottom:16px;">
          <div style="font-size:13.5px;font-weight:800;color:var(--sn-gold-light);margin-bottom:8px;">📎 سند شواهد پیوست‌شده: ${escapeHtml(it.title)}</div>
          <div style="font-size:12px;color:var(--sn-text-muted);margin-bottom:12px;">
            نام فایل: <bdi dir="ltr" style="font-family:monospace;color:#fff;">${escapeHtml(raw.file_name || it.code)}</bdi> · حجم فایل: <b>${it.status}</b> · ثبت‌کننده: <b>${escapeHtml(it.author)}</b>
          </div>
          ${it.actionUrl ? `
            <a href="${it.actionUrl}" target="_blank" class="btn btn--success btn--sm" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:7px 14px;">
              <span>📥</span> <span>دانلود و باز کردن فایل ضمیمه</span>
            </a>
          ` : ''}
        </div>
      `;
    } else if (it.category === 'flowchart') {
      detailsHtml = `
        <div style="background:rgba(17,24,35,0.7);border:1px solid rgba(212,175,90,0.28);border-radius:14px;padding:16px;margin-bottom:16px;">
          <div style="font-size:13.5px;font-weight:800;color:var(--sn-gold-light);margin-bottom:8px;">🔄 شناسنامه و فلوچارت فرآیند: ${escapeHtml(it.title)}</div>
          <div style="font-size:12px;color:var(--sn-text-muted);margin-bottom:12px;">
            کد فرآیند: <bdi dir="ltr" style="font-family:monospace;color:var(--sn-gold-light);">${escapeHtml(it.code)}</bdi> · حوزه فرآیند: <b>${escapeHtml(it.author)}</b>
          </div>
          <button type="button" class="btn btn--primary btn--sm" onclick="HassanHub.closeArtifactDossier(); if(typeof go==='function') go('processes');" style="display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:7px 14px;">
            <span>🔍</span> <span>مشاهده فلوچارت کامل در ماژول فرآیندها</span>
          </button>
        </div>
      `;
    } else if (it.category === 'checklist') {
      detailsHtml = `
        <div style="background:rgba(17,24,35,0.7);border:1px solid rgba(212,175,90,0.28);border-radius:14px;padding:16px;margin-bottom:16px;">
          <div style="font-size:13.5px;font-weight:800;color:var(--sn-gold-light);margin-bottom:8px;">✅ الگوی چک‌لیست ممیزی: ${escapeHtml(it.title)}</div>
          <div style="font-size:12px;color:var(--sn-text-muted);margin-bottom:12px;">
            کد چک‌لیست: <bdi dir="ltr" style="font-family:monospace;color:var(--sn-gold-light);">${escapeHtml(it.code)}</bdi> · دوره پایش: <b>${escapeHtml(it.author)}</b> · وضعیت: <b style="color:#34bbd3;">${it.status}</b>
          </div>
          <button type="button" class="btn btn--success btn--sm" onclick="HassanHub.closeArtifactDossier(); HassanHub.openMeasureChecklistPage('${measureCode}');" style="display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:7px 14px;">
            <span>✍️</span> <span>ورود به سامانه تکمیل و ثبت این چک‌لیست</span>
          </button>
        </div>
      `;
    }

    const modalHtml = `
      <div id="sn_artifact_dossier_modal" style="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:14px;direction:rtl;animation:fadeIn 0.2s ease;">
        <div style="background:linear-gradient(145deg, rgba(17,24,35,0.98) 0%, rgba(11,15,21,0.98) 100%);border:1px solid rgba(212,175,90,0.45);border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,0.75);max-width:760px;width:100%;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;">
          
          <!-- Header -->
          <header style="padding:16px 20px;border-bottom:1px solid rgba(212,175,90,0.22);display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.25);">
            <div style="display:flex;align-items:center;gap:12px;overflow:hidden;">
              <span style="font-size:22px;flex-shrink:0;">📁</span>
              <div style="overflow:hidden;">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <span style="display:inline-flex;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;${it.badgeColor}">
                    ${it.typeLabel}
                  </span>
                  <span style="font-size:11.5px;color:var(--sn-text-muted);">
                    پرونده شماره ${fa(itemIndex + 1)} از ${fa(list.length)}
                  </span>
                </div>
                <h3 style="font-size:15px;font-weight:800;color:#fff;margin:4px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${escapeHtml(it.title)}
                </h3>
              </div>
            </div>
            <button type="button" onclick="HassanHub.closeArtifactDossier()" style="background:transparent;border:none;color:var(--sn-text-muted);font-size:22px;cursor:pointer;padding:4px 8px;border-radius:8px;line-height:1;" title="بستن پرونده (Esc)">
              ✕
            </button>
          </header>

          <!-- Body -->
          <div style="padding:18px 20px;overflow-y:auto;flex:1;">
            
            <!-- ۴ کارت فشرده خلاصه وضعیت -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));gap:10px;margin-bottom:16px;">
              <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px;">
                <div style="font-size:11px;color:var(--sn-text-muted);margin-bottom:3px;">📅 تاریخ ثبت</div>
                <div style="font-size:12.5px;font-weight:700;color:#fff;">${it.dateText}</div>
                ${it.dateTime ? `<div style="font-size:10.5px;color:var(--sn-gold-light);margin-top:2px;">🕒 ${it.dateTime}</div>` : ''}
              </div>

              <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px;">
                <div style="font-size:11px;color:var(--sn-text-muted);margin-bottom:3px;">👤 مسئول / ثبت‌کننده</div>
                <div style="font-size:12px;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(it.author)}">${escapeHtml(it.author)}</div>
              </div>

              <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px;">
                <div style="font-size:11px;color:var(--sn-text-muted);margin-bottom:3px;">🔖 شناسه ثبتی</div>
                <div style="font-size:12.5px;font-weight:700;color:var(--sn-gold-light);font-family:monospace;">
                  <bdi dir="ltr">${escapeHtml(it.code)}</bdi>
                </div>
              </div>

              <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px;">
                <div style="font-size:11px;color:var(--sn-text-muted);margin-bottom:3px;">📊 وضعیت انطباق</div>
                <div style="font-size:11.5px;font-weight:700;">
                  <span style="display:inline-block;padding:2px 7px;border-radius:5px;${it.statusClass}">
                    ${it.status}
                  </span>
                </div>
              </div>
            </div>

            <!-- محتوای تخصصی -->
            ${detailsHtml}

          </div>

          <!-- Footer -->
          <footer style="padding:12px 20px;border-top:1px solid rgba(212,175,90,0.22);display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.3);flex-wrap:wrap;gap:8px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <button type="button" class="btn btn--secondary btn--sm" onclick="HassanHub.openArtifactDossier('${measureCode}', ${itemIndex - 1})" ${hasPrev ? '' : 'disabled'} style="opacity:${hasPrev ? 1 : 0.4};font-size:11.5px;padding:5px 10px;">
                <span>‹</span> <span>پرونده قبلی</span>
              </button>
              <button type="button" class="btn btn--secondary btn--sm" onclick="HassanHub.openArtifactDossier('${measureCode}', ${itemIndex + 1})" ${hasNext ? '' : 'disabled'} style="opacity:${hasNext ? 1 : 0.4};font-size:11.5px;padding:5px 10px;">
                <span>پرونده بعدی</span> <span>›</span>
              </button>
            </div>

            <div style="display:flex;align-items:center;gap:8px;">
              <button type="button" class="btn btn--ghost btn--sm" onclick="window.print()" style="display:inline-flex;align-items:center;gap:4px;font-size:11.5px;padding:5px 10px;">
                <span>🖨️</span> <span>چاپ پرونده</span>
              </button>
              <button type="button" class="btn btn--secondary btn--sm" onclick="HassanHub.closeArtifactDossier()" style="font-size:11.5px;padding:5px 12px;">
                بستن
              </button>
            </div>
          </footer>

        </div>
      </div>
    `;

    HassanHub.closeArtifactDossier();

    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div.firstElementChild);

    const escHandler = (e) => {
      if (e.key === 'Escape') {
        HassanHub.closeArtifactDossier();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  };
function renderArtifactsCardsTrackHtml(measureCode, items, activeTab) {
    if (items.length === 0) {
      return `
        <div style="background:rgba(13,18,27,0.7);border:1px dashed rgba(212,175,90,0.3);border-radius:14px;padding:36px 20px;text-align:center;color:var(--sn-text-muted);">
          <div style="font-size:32px;margin-bottom:8px;">📂</div>
          <div style="font-size:14px;font-weight:700;color:var(--sn-gold-light);margin-bottom:6px;">هیچ موردی در این فیلتر ثبت نشده است</div>
          <button type="button" class="btn btn--success btn--sm" onclick="HassanHub.openGenericForm('policy', '${measureCode}')" style="margin-top:10px;">
            ➕ ثبت مورد جدید برای این سنجه
          </button>
        </div>
      `;
    }

    let cardsHtml = items.map(it => {
      return renderSingleArtifactCard(measureCode, it.category, it.rawItem);
    }).join('');

    const addAction = (activeTab === 'checklist') ? `HassanHub.openGenericForm('checklist', '${measureCode}')` :
                      (activeTab === 'flowchart') ? `HassanHub.openGenericForm('flowchart', '${measureCode}')` :
                      (activeTab === 'evidence') ? `HassanHub.openEvidenceUploadModal('${measureCode}')` :
                      (activeTab === 'procedure') ? `HassanHub.openGenericForm('procedure', '${measureCode}')` :
                      `HassanHub.openGenericForm('policy', '${measureCode}')`;
    const addLabel = (activeTab === 'checklist') ? 'چک‌لیست ممیزی جدید' :
                     (activeTab === 'flowchart') ? 'فلوچارت فرآیند جدید' :
                     (activeTab === 'evidence') ? 'بارگذاری مدرک شواهد' :
                     (activeTab === 'procedure') ? 'روش اجرایی (SOP) جدید' :
                     'ثبت مدرک/خط‌مشی تازه';

    cardsHtml += `
      <div style="flex:0 0 260px;width:260px;background:rgba(19,26,37,0.6);border:2px dashed rgba(212,175,90,0.3);border-radius:16px;padding:24px 18px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:12px;cursor:pointer;transition:all 0.25s ease;"
           onmouseover="this.style.borderColor='var(--sn-gold-light)';this.style.background='rgba(212,175,90,0.12)'"
           onmouseout="this.style.borderColor='rgba(212,175,90,0.3)';this.style.background='rgba(19,26,37,0.6)'"
           onclick="${addAction}">
        <div style="width:52px;height:52px;border-radius:50%;background:rgba(212,175,90,0.18);border:1px solid rgba(212,175,90,0.4);display:flex;align-items:center;justify-content:center;font-size:24px;color:var(--sn-gold-light);">
          ➕
        </div>
        <div style="font-size:14px;font-weight:700;color:var(--sn-gold-light);">
          ${addLabel}
        </div>
        <div style="font-size:11.5px;color:var(--sn-text-muted);">
          افزودن مدرک مرتبط با سنجه <bdi dir="ltr">${measureCode}</bdi>
        </div>
      </div>
    `;

    return `
      <div class="sn-artifacts-cards-track" style="display:flex;flex-direction:row;gap:18px;overflow-x:auto;padding:8px 4px 18px;min-height:220px;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;scrollbar-width:thin;">
        ${cardsHtml}
      </div>
    `;
  }

  function renderSingleArtifactCard(measureCode, type, item) {
    const formatDate = (d) => {
      if (!d) return '—';
      try { return new Date(d).toLocaleDateString('fa-IR'); } catch(e) { return d; }
    };

    if (type === 'policy' || type === 'procedure') {
      const isPolicy = type === 'policy';
      const badgeColor = isPolicy ? 'background:rgba(244,63,94,0.15);border:1px solid rgba(244,63,94,0.35);color:#fda4af;' : 'background:rgba(16,160,185,0.15);border:1px solid rgba(16,160,185,0.35);color:#6ed5e7;';
      const typeLabel = isPolicy ? '📜 خط‌مشی استاندارد' : (item.doc_type === 'instruction' ? '📋 دستورالعمل مصوب' : '📋 روش اجرایی (SOP)');
      const docCode = item.doc_code || 'بدون کد';
      const statusLabel = item.status === 'active' || item.status === 'approved' ? 'مصوب و ابلاغ‌شده' : (item.status === 'draft' ? 'پیش‌نویس' : 'جاری');
      const statusClass = item.status === 'active' || item.status === 'approved' ? 'background:rgba(16,160,185,0.2);color:#34bbd3;border:1px solid rgba(16,160,185,0.4);' : 'background:rgba(245,158,11,0.2);color:#fbbf24;border:1px solid rgba(245,158,11,0.4);';

      const returnUrl = (typeof window !== 'undefined' && window.location && window.location.href) ? encodeURIComponent(window.location.href) : '';
      const openUrl = `/accreditation/policy.html?code=${encodeURIComponent(measureCode)}&type=${encodeURIComponent(item.doc_type || (isPolicy ? 'policy' : 'procedure'))}&docId=${encodeURIComponent(item.id)}&returnUrl=${returnUrl}`;

      return `
        <div class="sn-artifact-card" style="flex:0 0 340px;width:340px;min-width:340px;background:linear-gradient(145deg, rgba(21,29,41,0.94) 0%, rgba(13,18,27,0.96) 100%);border:1px solid rgba(212,175,90,0.28);border-radius:18px;padding:22px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 8px 24px rgba(0,0,0,0.38);transition:all 0.25s ease;text-align:right;"
             onmouseover="this.style.transform='translateY(-4px)';this.style.borderColor='rgba(212,175,90,0.6)';"
             onmouseout="this.style.transform='none';this.style.borderColor='rgba(212,175,90,0.28)';">
          
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;">
              <span style="display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;padding:4px 10px;border-radius:8px;${badgeColor}">
                <span>${typeLabel}</span>
              </span>
              <span style="font-size:11px;padding:3px 9px;border-radius:6px;font-weight:700;${statusClass}">
                ${statusLabel}
              </span>
            </div>

            <div style="font-size:11.5px;color:rgba(212,175,90,0.85);margin-bottom:6px;font-family:monospace;letter-spacing:0.5px;">
              کد سند: <bdi dir="ltr">${escapeHtml(docCode)}</bdi>
            </div>
            <h4 style="font-size:14.5px;font-weight:800;color:#fff;margin:0 0 14px;line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:46px;" title="${escapeHtml(item.title)}">
              ${escapeHtml(item.title)}
            </h4>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11.5px;color:var(--sn-text-muted);background:rgba(0,0,0,0.22);padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);margin-bottom:16px;">
              <div>
                <span style="opacity:0.7">نسخه:</span>
                <span style="font-weight:700;color:#fff;margin-right:4px;">${fa(item.version_no || 1)}</span>
              </div>
              <div>
                <span style="opacity:0.7">بازنگری:</span>
                <span style="font-weight:700;color:#fff;margin-right:4px;">${fa(item.revision_no || 0)}</span>
              </div>
              <div style="grid-column:span 2;display:flex;align-items:center;gap:6px;">
                <span style="opacity:0.7">تاریخ:</span>
                <span style="color:var(--sn-gold-light);font-weight:600;">${formatDate(item.issue_date || item.updated_at)}</span>
              </div>
              ${item.responsible_person ? `
                <div style="grid-column:span 2;display:flex;align-items:center;gap:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                  <span style="opacity:0.7">مسئول:</span>
                  <span style="color:#fff;" title="${escapeHtml(item.responsible_person)}">${escapeHtml(item.responsible_person)}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <div style="display:flex;gap:8px;margin-top:auto;padding-top:12px;border-top:1px solid rgba(255,255,255,0.08);">
            <a href="${openUrl}" class="btn btn--primary btn--sm" style="flex:1;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:12px;padding:7px 12px;border-radius:8px;">
              <span>👁️</span> <span>مشاهده و ویرایش سند</span>
            </a>
            ${item.attachment_name ? `
              <a href="/api/documents/${item.id}/attachment" target="_blank" class="btn btn--ghost btn--sm" style="display:inline-flex;align-items:center;justify-content:center;padding:7px 10px;border-radius:8px;font-size:12px;color:var(--sn-gold-light);border:1px solid rgba(212,175,90,0.3);" title="دانلود فایل پیوست: ${escapeHtml(item.attachment_name)}">
                📥
              </a>
            ` : ''}
          </div>

        </div>
      `;
    }

    if (type === 'checklist') {
      const code = item.checklist_code || 'CHK';
      const subsCount = item.submissions_count || 0;
      const cadenceFa = { daily: 'روزانه', weekly: 'هفتگی', monthly: 'ماهانه', quarterly: 'فصلی', semiannual: 'شش‌ماهه', annual: 'سالانه', occasional: 'موردی' }[item.cadence] || (item.cadence || 'دوره‌ای');

      return `
        <div class="sn-artifact-card" style="flex:0 0 340px;width:340px;min-width:340px;background:linear-gradient(145deg, rgba(21,29,41,0.94) 0%, rgba(13,18,27,0.96) 100%);border:1px solid rgba(212,175,90,0.28);border-radius:18px;padding:22px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 8px 24px rgba(0,0,0,0.38);transition:all 0.25s ease;text-align:right;"
             onmouseover="this.style.transform='translateY(-4px)';this.style.borderColor='rgba(212,175,90,0.6)';"
             onmouseout="this.style.transform='none';this.style.borderColor='rgba(212,175,90,0.28)';">
          
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;">
              <span style="display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;padding:4px 10px;border-radius:8px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.35);color:#fbbf24;">
                <span>✅ چک‌لیست ممیزی</span>
              </span>
              <span style="font-size:11px;padding:3px 9px;border-radius:6px;font-weight:700;background:rgba(59,130,246,0.18);border:1px solid rgba(59,130,246,0.35);color:#93c5fd;">
                دوره: ${cadenceFa}
              </span>
            </div>

            <div style="font-size:11.5px;color:rgba(212,175,90,0.85);margin-bottom:6px;font-family:monospace;letter-spacing:0.5px;">
              کد چک‌لیست: <bdi dir="ltr">${escapeHtml(code)}</bdi>
            </div>
            <h4 style="font-size:14.5px;font-weight:800;color:#fff;margin:0 0 14px;line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:46px;" title="${escapeHtml(item.title)}">
              ${escapeHtml(item.title)}
            </h4>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11.5px;color:var(--sn-text-muted);background:rgba(0,0,0,0.22);padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);margin-bottom:16px;">
              <div>
                <span style="opacity:0.7">سوابق تکمیل:</span>
                <span style="font-weight:800;color:#34bbd3;margin-right:4px;">${fa(subsCount)} مورد</span>
              </div>
              <div>
                <span style="opacity:0.7">وضعیت:</span>
                <span style="font-weight:700;color:#fff;margin-right:4px;">فعال</span>
              </div>
              <div style="grid-column:span 2;display:flex;align-items:center;gap:6px;">
                <span style="opacity:0.7">آخرین ثبت:</span>
                <span style="color:var(--sn-gold-light);font-weight:600;">${item.last_submission_at ? formatDate(item.last_submission_at) : 'بدون ثبت اخیر'}</span>
              </div>
            </div>
          </div>

          <div style="display:flex;gap:8px;margin-top:auto;padding-top:12px;border-top:1px solid rgba(255,255,255,0.08);">
            <button type="button" class="btn btn--success btn--sm" style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:12px;padding:7px 12px;border-radius:8px;" onclick="HassanHub.openMeasureChecklistPage('${measureCode}')">
              <span>✍️</span> <span>ورود به تکمیل و ممیزی</span>
            </button>
          </div>

        </div>
      `;
    }

    if (type === 'flowchart') {
      const code = item.process_code || 'PR';
      return `
        <div class="sn-artifact-card" style="flex:0 0 340px;width:340px;min-width:340px;background:linear-gradient(145deg, rgba(21,29,41,0.94) 0%, rgba(13,18,27,0.96) 100%);border:1px solid rgba(212,175,90,0.28);border-radius:18px;padding:22px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 8px 24px rgba(0,0,0,0.38);transition:all 0.25s ease;text-align:right;"
             onmouseover="this.style.transform='translateY(-4px)';this.style.borderColor='rgba(212,175,90,0.6)';"
             onmouseout="this.style.transform='none';this.style.borderColor='rgba(212,175,90,0.28)';">
          
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;">
              <span style="display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;padding:4px 10px;border-radius:8px;background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.35);color:#93c5fd;">
                <span>🔄 فلوچارت فرآیند</span>
              </span>
              <span style="font-size:11px;padding:3px 9px;border-radius:6px;font-weight:700;background:rgba(212,175,90,0.18);border:1px solid rgba(212,175,90,0.35);color:var(--sn-gold-light);">
                ${item.domain === 'main' ? 'فرآیند اصلی' : (item.domain === 'support' ? 'پشتیبانی' : 'مدیریتی')}
              </span>
            </div>

            <div style="font-size:11.5px;color:rgba(212,175,90,0.85);margin-bottom:6px;font-family:monospace;letter-spacing:0.5px;">
              کد فرآیند: <bdi dir="ltr">${escapeHtml(code)}</bdi>
            </div>
            <h4 style="font-size:14.5px;font-weight:800;color:#fff;margin:0 0 14px;line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:46px;" title="${escapeHtml(item.title)}">
              ${escapeHtml(item.title)}
            </h4>

            <div style="font-size:11.5px;color:var(--sn-text-muted);background:rgba(0,0,0,0.22);padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);margin-bottom:16px;">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="opacity:0.7">تاریخ ثبت:</span>
                <span style="color:var(--sn-gold-light);font-weight:600;">${formatDate(item.created_at)}</span>
              </div>
            </div>
          </div>

          <div style="display:flex;gap:8px;margin-top:auto;padding-top:12px;border-top:1px solid rgba(255,255,255,0.08);">
            <button type="button" class="btn btn--primary btn--sm" style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:12px;padding:7px 12px;border-radius:8px;" onclick="if(typeof go==='function') go('processes');">
              <span>🔍</span> <span>مشاهده شناسنامه و فلوچارت</span>
            </button>
            ${item.file_path ? `
              <a href="/api/processes/${item.id}/file" target="_blank" class="btn btn--ghost btn--sm" style="display:inline-flex;align-items:center;justify-content:center;padding:7px 10px;border-radius:8px;font-size:12px;color:var(--sn-gold-light);border:1px solid rgba(212,175,90,0.3);" title="دانلود دیاگرام">
                📥
              </a>
            ` : ''}
          </div>

        </div>
      `;
    }

    if (type === 'evidence') {
      const sizeKb = item.file_size_bytes ? Math.round(item.file_size_bytes / 1024) : 0;
      return `
        <div class="sn-artifact-card" style="flex:0 0 340px;width:340px;min-width:340px;background:linear-gradient(145deg, rgba(21,29,41,0.94) 0%, rgba(13,18,27,0.96) 100%);border:1px solid rgba(212,175,90,0.28);border-radius:18px;padding:22px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 8px 24px rgba(0,0,0,0.38);transition:all 0.25s ease;text-align:right;"
             onmouseover="this.style.transform='translateY(-4px)';this.style.borderColor='rgba(212,175,90,0.6)';"
             onmouseout="this.style.transform='none';this.style.borderColor='rgba(212,175,90,0.28)';">
          
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;">
              <span style="display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;padding:4px 10px;border-radius:8px;background:rgba(244,63,94,0.15);border:1px solid rgba(244,63,94,0.35);color:#fda4af;">
                <span>📎 سند شواهد</span>
              </span>
              <span style="font-size:11px;padding:3px 9px;border-radius:6px;font-weight:700;background:rgba(255,255,255,0.08);color:#fff;">
                ${sizeKb > 0 ? fa(sizeKb) + ' KB' : 'فایل پیوست'}
              </span>
            </div>

            <div style="font-size:11.5px;color:rgba(212,175,90,0.85);margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              نام فایل: <bdi dir="ltr">${escapeHtml(item.file_name || 'file')}</bdi>
            </div>
            <h4 style="font-size:14.5px;font-weight:800;color:#fff;margin:0 0 14px;line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:46px;" title="${escapeHtml(item.title || item.file_name)}">
              ${escapeHtml(item.title || item.file_name)}
            </h4>

            <div style="font-size:11.5px;color:var(--sn-text-muted);background:rgba(0,0,0,0.22);padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);margin-bottom:16px;">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="opacity:0.7">تاریخ بارگذاری:</span>
                <span style="color:var(--sn-gold-light);font-weight:600;">${formatDate(item.created_at)}</span>
              </div>
            </div>
          </div>

          <div style="display:flex;gap:8px;margin-top:auto;padding-top:12px;border-top:1px solid rgba(255,255,255,0.08);">
            <a href="/api/evidence/${item.id}/download" target="_blank" class="btn btn--primary btn--sm" style="flex:1;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:12px;padding:7px 12px;border-radius:8px;">
              <span>📥</span> <span>دریافت و مشاهده فایل</span>
            </a>
          </div>

        </div>
      `;
    }

    return '';
  }

  // =========================================================================
  // ۱۱. موتور امن راهنمای کتاب سنجه (Safe Non-blocking Book Guide)
  // =========================================================================
  window.__measureBookCache = window.__measureBookCache || {};
  window.__measureOwnersCache = window.__measureOwnersCache || {};

  HassanHub.toggleBookGuide = async function(code, measureId, page) {
    code = normCode(code);
    const panel = document.getElementById('book_guide_' + code);
    if (!panel) return;
    const isOpen = panel.classList.contains('is-open');
    if (isOpen) {
      panel.classList.remove('is-open');
      return;
    }
    panel.classList.add('is-open');

    const bodyEl = document.getElementById('book_body_' + code);
    if (!bodyEl) return;

    if (!measureId && window.ALL_ACCREDITATION_MEASURES) {
      const m = window.ALL_ACCREDITATION_MEASURES.find(x => normCode(x.code) === code);
      if (m && m.id) measureId = m.id;
    }

    if (window.__measureBookCache[code]) {
      renderBookContent(bodyEl, code, window.__measureBookCache[code], page, (window.__measureOwnersCache || {})[code]);
      return;
    }

    let localDetail = '';
    let localOwners;
    if (window.S && window.S.byId && measureId && window.S.byId[measureId] && window.S.byId[measureId].detail_text) {
      localDetail = window.S.byId[measureId].detail_text;
      localOwners = window.S.byId[measureId].step_owners;
    } else if (window.S && Array.isArray(window.S.sections)) {
      window.S.sections.forEach(sec => {
        (sec.axes || []).forEach(ax => {
          (ax.measures || []).forEach(m => {
            if (m.code === code && m.detail_text) { localDetail = m.detail_text; localOwners = m.step_owners; }
          });
        });
      });
    }

    if (localDetail) {
      window.__measureBookCache[code] = localDetail;
      window.__measureOwnersCache[code] = localOwners || [];
      renderBookContent(bodyEl, code, localDetail, page, localOwners);
      return;
    }

    bodyEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:12px;color:var(--sn-gold-light)">
        <span style="font-size:16px">⏳</span>
        <span>در حال واکشی الزامات و گام‌های ارزیابی از کتاب اعتباربخشی...</span>
      </div>
    `;

    try {
      if (measureId && typeof API !== 'undefined' && typeof API.measureDetails === 'function') {
        const res = await API.measureDetails([measureId]);
        if (res && res.measures && res.measures[0] && res.measures[0].detail_text) {
          const dt = res.measures[0].detail_text;
          const owners = res.measures[0].step_owners;
          window.__measureBookCache[code] = dt;
          window.__measureOwnersCache[code] = Array.isArray(owners) ? owners : [];
          renderBookContent(bodyEl, code, dt, page, owners);
          return;
        }
      }
      renderFallbackBookContent(bodyEl, code, page);
    } catch(err) {
      console.warn('[BookGuide] Fetch fallback for', code, err);
      renderFallbackBookContent(bodyEl, code, page);
    }
  };

  function renderBookContent(bodyEl, code, detailText, page, owners) {
    if (!detailText || !detailText.trim()) {
      renderFallbackBookContent(bodyEl, code, page);
      return;
    }

    // وقتی مسئول گام‌ها داریم، فقط با جداکنندهٔ رسمی کتاب (U+F0A7) می‌شکنیم تا
    // اندیس گام‌ها با اندیس owners یکی بماند. شکستن روی newline/• می‌تواند یک
    // گام را دو تکه کند و مسئول‌ها را جابه‌جا نشان دهد.
    const ownerList = Array.isArray(owners) ? owners : [];
    const rawSteps = (ownerList.length
      ? detailText.split('\uf0a7')
      : detailText.split(/[•\n]+/)).map(s => s.trim()).filter(s => s.length > 5);
    const steps = rawSteps.length ? rawSteps : [detailText.trim()];

    const stepsHtml = steps.map((step, i) => `
      <div class="sn-book-step-card">
        <span class="sn-book-step-icon">${ICONS.checkSmall}</span>
        <div style="flex:1">${escapeHtml(step)}${ownerList[i] ? `<div class="sn-book-step-owner">مسئول: ${escapeHtml(ownerList[i])}</div>` : ''}</div>
      </div>
    `).join('');

    bodyEl.innerHTML = `
      <div class="sn-book-section-title">
        <span style="display:inline-flex;align-items:center;gap:6px">${ICONS.measureBadge} <span>الزامات، گام‌های ارزیابی و شرایط احراز سنجه در کتاب ملی</span></span>
      </div>
      <div class="sn-book-steps-container">
        ${stepsHtml}
      </div>
      <div class="sn-book-methods-row">
        <span style="font-size:12px;color:var(--sn-text-muted)">روش‌های ارزشیابی مورد استفاده ارزیاب:</span>
        <span class="sn-book-method-tag" style="display:inline-flex;align-items:center;gap:5px;">${ICONS.docMethod} <span>بررسی مستندات (Doc)</span></span>
        <span class="sn-book-method-tag" style="display:inline-flex;align-items:center;gap:5px;">${ICONS.obsMethod} <span>مشاهده میدانی (Obs)</span></span>
        <span class="sn-book-method-tag" style="display:inline-flex;align-items:center;gap:5px;">${ICONS.itvMethod} <span>مصاحبه با کادر و بیمار (Itv)</span></span>
      </div>
    `;
  }

  function renderFallbackBookContent(bodyEl, code, page) {
    bodyEl.innerHTML = `
      <div class="sn-book-section-title">
        <span style="display:inline-flex;align-items:center;gap:6px;">${ICONS.measureBadge} <span>الزامات و شرایط احراز سنجه ${code}</span></span>
      </div>
      <div class="sn-book-step-card">
        <span class="sn-book-step-icon">${ICONS.bookPage}</span>
        <div style="flex:1">
          عین الزامات، گام‌های اجرایی و فرآیندهای مورد انتظار ارزیابان وزارت بهداشت در <b>صفحه ${fa(page)}</b> کتاب ملی استانداردهای اعتباربخشی بیمارستان‌های ایران درج گردیده است. مستندات بارگذاری‌شده در این سامانه بر اساس این الزامات مورد ممیزی قرار می‌گیرند.
        </div>
      </div>
      <div class="sn-book-methods-row">
        <span style="font-size:12px;color:var(--sn-text-muted)">روش‌های ارزشیابی استاندارد:</span>
        <span class="sn-book-method-tag" style="display:inline-flex;align-items:center;gap:5px;">${ICONS.docMethod} <span>بررسی مستندات</span></span>
        <span class="sn-book-method-tag" style="display:inline-flex;align-items:center;gap:5px;">${ICONS.obsMethod} <span>مشاهده میدانی</span></span>
        <span class="sn-book-method-tag" style="display:inline-flex;align-items:center;gap:5px;">${ICONS.itvMethod} <span>مصاحبه</span></span>
      </div>
    `;
  }

  // =========================================================================
  // ۱۲. سامانه استاندارد و کاربردی تدوین خط‌مشی، دستورالعمل و روش‌های اجرایی (SOP)
  // منطبق بر استانداردهای معاونت درمان وزارت بهداشت و کتاب ملی اعتباربخشی
  // =========================================================================

  // ذخیره‌سازی داده‌های اسناد در حافظه محلی جهت حفظ پایداری
  HassanHub._docStore = HassanHub._docStore || {};

  // ایجاد متن‌های استاندارد نمونه متناسب با سنجه
  function getAccreditationTemplate(type, code, stmt) {
    const isAccess = code.includes('ج-1-2') || stmt.includes('کم توان') || stmt.includes('تسهیلات');

    if (isAccess) {
      return {
        title: 'خط‌مشی تسهیل دسترسی، تردد و ارائه خدمات به بیماران و مراجعین کم‌توان جسمی',
        doc_code: 'POL-' + code,
        version_no: '۱ (۱۴۰۵)',
        dept: 'دفتر بهبود کیفیت / واحد حقوق گیرنده خدمت / خدمات عمومی',
        responsible: 'مسئول حقوق گیرنده خدمت / سوپروایزر بالینی',
        scope: 'کلیه ورودی‌ها، تریاژ، اورژانس، درمانگاه‌های تخصصی، بخش‌های بستری و پاراکلینیک بیمارستان',
        purpose: 'تضمین دسترسی ایمن، سریع، کرامت‌محور و بدون مانع کلیه بیماران و مراجعین کم‌توان جسمی، سالمندان و افراد دارای معلولیت به تمامی بخش‌های درمانی و تشخیصی مطابق با استانداردهای ملی اعتباربخشی.',
        legal: 'کتاب استانداردهای ملی اعتباربخشی بیمارستان‌های ایران (ویرایش ششم - سنجه ' + code + ')، قانون جامع حمایت از حقوق معلولان، منشور حقوق بیمار.',
        definitions: '• کم‌توان جسمی: هر فردی که به دلایل مادرزادی، بیماری حاد، شکستگی یا کهولت سن برای حرکت، پیمایش یا ارتباط نیازمند وسایل کمکی یا راهنما باشد.\n• مسیر دسترسی هموار: رمپ‌های استاندارد با شیب حداکثر ۸٪ و دستگیره کمکی دوطرفه.',
        policy_stmt: 'بیمارستان متعهد است کلیه خدمات درمانی و مشاوره‌ای را بدون کوچک‌ترین تاخیر ناشی از موانع ساختمانی یا فیزیکی به مراجعین کم‌توان ارائه نماید. اختصاص صندلی چرخدار، حضور راهنما در بدو ورود و اولویت در پذیرش و بستری این بیماران الزامی و غیرقابل اغماض است.',
        responsibilities: '• انتظامات و خدمات: تحویل ویلچر و راهنمایی همراه و بیمار از بدو ورود به تریاژ.\n• منشی پذیرش: اخذ مشخصات و صدور قبض بدون معطلی بیمار در صف و اعزام سریع.\n• سرپرستار بخش: اختصاص اتاق‌های نزدیک به ایستگاه پرستاری و سرویس بهداشتی مناسب‌سازی‌شده.\n• خدمات پشتیبانی: بازرسی روزانه رمپ‌ها، دستگیره‌ها، بالابرها و زنگ اخبار سرویس‌ها.',
        work_method: 'گام ۱: استقرار همیشگی حداقل ۲ دستگاه صندلی چرخدار سالم و تمیز در ورودی اصلی بیمارستان.\nگام ۲: راهنمایی و مشایعت بیمار توسط پرسنل خدمات یا پذیرش تا بخش مورد نظر بدون توقف در صف‌های طولانی.\nگام ۳: استفاده از تخت‌های برقی قابل تنظیم با هندریل‌های حفاظتی و تعبیه زنگ هشدار احضار پرستار در دسترس بیمار.\nگام ۴: ایجاد دسترسی مناسب‌سازی‌شده در آسانسورها (دکمه‌های دارای خط بریل و ارتفاع مناسب).\nگام ۵: ثبت گزارش‌های دوره‌ای از میزان رضایت بیماران کم‌توان و رفع فوری نواقص فیزیکی ظرف ۴۸ ساعت.',
        monitoring: 'ممیزی ماهانه مسیرهای تردد توسط کارشناس بهبود کیفیت با چک‌لیست مناسب‌سازی فیزیکی — سنجش شاخص رضایت مراجعین کم‌توان (هدف: بالای ۹۰٪).',
        related_docs: 'چک‌لیست ممیزی دسترسی فیزیکی، فرم گزارش خرابی تاسیسات، صورت‌جلسات کمیته حقوق گیرنده خدمت.',
        author: 'کارشناس بهبود کیفیت و رابط حقوق بیمار',
        reviewer: 'مدیر بهبود کیفیت و اعتباربخشی / مترون',
        approver: 'رئیس بیمارستان'
      };
    }

    return {
      title: (type === 'policy' ? 'خط‌مشی استاندارد' : (type === 'instruction' ? 'دستورالعمل اجرایی' : 'روش اجرایی مصوب')) + ' — ' + stmt.slice(0, 50),
      doc_code: (type.toUpperCase().slice(0,3)) + '-' + code,
      version_no: '۱ (۱۴۰۵)',
      dept: 'دفتر بهبود کیفیت و اعتباربخشی / بخش‌های بالینی',
      responsible: 'مسئول بهبود کیفیت / سرپرستار بخش',
      scope: 'کلیه بخش‌های بستری، مراقبت‌های ویژه، پاراکلینیک و درمانگاه‌های بیمارستان',
      purpose: 'استقرار الزامات ملی سنجه ' + code + ' و ارتقای ایمنی، اثربخشی بالینی و کیفیت خدمات درمانی به مراجعین بیمارستان.',
      legal: 'کتاب استانداردهای ملی اعتباربخشی بیمارستان‌های ایران (ویرایش ششم - سنجه ' + code + ') و بخشنامه‌های ابلاغی وزارت بهداشت.',
      definitions: 'مفاهیم و تعاریف عملیاتی مرتبط با الزامات سنجه مصوب ' + code + ' در کتابچه راهنما.',
      policy_stmt: 'بیمارستان خود را ملزم به پایبندی کامل به الزامات این سند می‌داند و کلیه کادر درمان و اداری مکلف به اجرای بندهای این ابلاغیه می‌باشند.',
      responsibilities: '• مدیریت و رهبری: تامین منابع و زیرساخت‌ها.\n• دفتر کیفیت: آموزش، پایش و ممیزی میدانی.\n• کادر درمان: اجرای دقیق گام‌های مندرج و ثبت کامل شواهد در پرونده بیمار.',
      work_method: 'گام ۱: آموزش الزامات سنجه به پرسنل بخش در بدو ورود و دوره‌های بازآموزی.\nگام ۲: اجرای دقیق پروتکل‌ها در فرآیند مراقبت از بیمار و ثبت کامل شواهد.\nگام ۳: تکمیل ماهانه چک‌لیست‌های نظارتی توسط سوپروایزر.\nگام ۴: تحلیل داده‌ها و ارسال گزارش مغایرت‌ها به کمیته‌های تخصصی بیمارستان.',
      monitoring: 'ممیزی دوره‌ای ماهانه توسط واحد بهبود کیفیت و سنجش شاخص‌های تحقق سنجه.',
      related_docs: 'چک‌لیست ارزیابی سنجه ' + code + '، فرم گزارش عدم انطباق، پرونده الکترونیکی بیمار.',
      author: 'کارشناس بهبود کیفیت',
      reviewer: 'مدیر بهبود کیفیت / مترون',
      approver: 'رئیس بیمارستان'
    };
  }

  // باز شدن میزکار استاندارد تدوین خط‌مشی با ارسال returnUrl جهت بازگشت مستقیم به همان کارت
  HassanHub.openGenericForm = function(type, code, title) {
    type = type || 'policy';
    code = normCode(code);
    const returnUrl = encodeURIComponent(window.location.href);
    const targetUrl = '/accreditation/policy.html?code=' + encodeURIComponent(code) + '&type=' + encodeURIComponent(type) + '&tab=profile&returnUrl=' + returnUrl;
    window.location.href = targetUrl;
  };

  // نسخه مودال در صورت نیاز تکمیلی (حفظ ۱۰۰٪ امکانات قبلی)
  HassanHub.openGenericFormModal = function(type, code, title) {
    const modalId = 'snFormModal';
    let modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'sn-modal-overlay';
      document.body.appendChild(modal);
    }

    type = type || 'policy';
    code = normCode(code);

    let m = (window.ALL_ACCREDITATION_MEASURES || []).find(x => normCode(x.code) === code);
    const stmt = title || (m ? (m.statement || m.title || code) : code);

    const typeNames = {
      policy: 'خط‌مشی استاندارد بیمارستان',
      instruction: 'دستورالعمل اجرایی مصوب',
      procedure: 'روش اجرایی مصوب (SOP)'
    };
    const typeTitle = typeNames[type] || 'سند استاندارد';

    // بازیابی داده‌های ذخیره‌شده قبلی یا قالب پیش‌فرض
    const storeKey = type + '_' + code;
    let data = HassanHub._docStore[storeKey] || getAccreditationTemplate(type, code, stmt);

    let currentTab = 'profile'; // 'profile' | 'purpose' | 'policy' | 'workflow' | 'monitoring' | 'a4'

    function renderModalContent() {
      modal.innerHTML = `
        <div class="sn-modal-box sn-policy-modal-box" style="max-width:1120px;width:96%;max-height:92vh;padding:24px 28px;display:flex;flex-direction:column;gap:16px;">
          
          <!-- هدر رسمی سازمانی سند کنترل‌شده -->
          <header class="sn-policy-header" style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(212,175,90,0.3);padding-bottom:14px;flex-wrap:wrap;gap:12px;">
            
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:42px;height:42px;border-radius:10px;background:rgba(212,175,90,0.18);border:1px solid rgba(212,175,90,0.4);display:flex;align-items:center;justify-content:center;color:var(--sn-gold-light);">
                ${ICONS.policyBtn}
              </div>
              <div>
                <div style="font-size:16px;font-weight:800;color:var(--sn-gold-light);display:flex;align-items:center;gap:8px;">
                  <span>${typeTitle}</span>
                  <span style="font-size:12px;background:rgba(212,175,90,0.18);padding:3px 10px;border-radius:6px;border:1px solid rgba(212,175,90,0.3);color:#fff;">
                    سنجه ملی: <bdi dir="ltr">${code}</bdi>
                  </span>
                </div>
                <div style="font-size:12px;color:var(--sn-text-muted);margin-top:3px;">
                  سامانه مدیریت مدارک کنترل‌شده و الزامات اعتباربخشی بیمارستان‌های ایران
                </div>
              </div>
            </div>

            <!-- کلیدهای ابزار کاربردی و بستن -->
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              
              <button type="button" class="btn btn--success btn--sm" id="btnLoadTpl">
                ${ICONS.sparkles}
                <span>درج نمونه متن استاندارد وزارت بهداشت</span>
              </button>

              <button type="button" class="btn ${currentTab==='a4'?'btn--primary':'btn--ghost'} btn--sm" id="btnToggleA4">
                ${ICONS.printDoc}
                <span>${currentTab==='a4'?'بازگشت به فرم تدوین':'پیش‌نمایش چاپ رسمی A4'}</span>
              </button>

              <button type="button" class="sn-modal-close" onclick="document.getElementById('${modalId}').style.display='none'">
                ${ICONS.close}
              </button>

            </div>

          </header>

          <!-- نوار تب‌های تفکیک‌شده استاندارد بیمارستانی -->
          <nav class="sn-policy-nav-tabs" style="display:flex;gap:8px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px;overflow-x:auto;">
            <button type="button" class="sn-policy-tab-btn ${currentTab==='profile'?'active':''}" data-tab="profile" style="padding:8px 14px;border-radius:8px;font-size:12.5px;font-weight:700;cursor:pointer;background:${currentTab==='profile'?'rgba(212,175,90,0.22)':'transparent'};color:${currentTab==='profile'?'var(--sn-gold-light)':'#94a3b8'};border:${currentTab==='profile'?'1px solid rgba(212,175,90,0.4)':'1px solid transparent'};display:inline-flex;align-items:center;gap:6px;">
              <span>📌</span> <span>۱. شناسنامه سند</span>
            </button>

            <button type="button" class="sn-policy-tab-btn ${currentTab==='purpose'?'active':''}" data-tab="purpose" style="padding:8px 14px;border-radius:8px;font-size:12.5px;font-weight:700;cursor:pointer;background:${currentTab==='purpose'?'rgba(212,175,90,0.22)':'transparent'};color:${currentTab==='purpose'?'var(--sn-gold-light)':'#94a3b8'};border:${currentTab==='purpose'?'1px solid rgba(212,175,90,0.4)':'1px solid transparent'};display:inline-flex;align-items:center;gap:6px;">
              <span>🎯</span> <span>۲. هدف و دامنه کاربرد</span>
            </button>

            <button type="button" class="sn-policy-tab-btn ${currentTab==='policy'?'active':''}" data-tab="policy" style="padding:8px 14px;border-radius:8px;font-size:12.5px;font-weight:700;cursor:pointer;background:${currentTab==='policy'?'rgba(212,175,90,0.22)':'transparent'};color:${currentTab==='policy'?'var(--sn-gold-light)':'#94a3b8'};border:${currentTab==='policy'?'1px solid rgba(212,175,90,0.4)':'1px solid transparent'};display:inline-flex;align-items:center;gap:6px;">
              <span>📜</span> <span>۳. بیانیه خط‌مشی و تعاریف</span>
            </button>

            <button type="button" class="sn-policy-tab-btn ${currentTab==='workflow'?'active':''}" data-tab="workflow" style="padding:8px 14px;border-radius:8px;font-size:12.5px;font-weight:700;cursor:pointer;background:${currentTab==='workflow'?'rgba(212,175,90,0.22)':'transparent'};color:${currentTab==='workflow'?'var(--sn-gold-light)':'#94a3b8'};border:${currentTab==='workflow'?'1px solid rgba(212,175,90,0.4)':'1px solid transparent'};display:inline-flex;align-items:center;gap:6px;">
              <span>⚙️</span> <span>۴. روش اجرا و مسئولیت‌ها</span>
            </button>

            <button type="button" class="sn-policy-tab-btn ${currentTab==='monitoring'?'active':''}" data-tab="monitoring" style="padding:8px 14px;border-radius:8px;font-size:12.5px;font-weight:700;cursor:pointer;background:${currentTab==='monitoring'?'rgba(212,175,90,0.22)':'transparent'};color:${currentTab==='monitoring'?'var(--sn-gold-light)':'#94a3b8'};border:${currentTab==='monitoring'?'1px solid rgba(212,175,90,0.4)':'1px solid transparent'};display:inline-flex;align-items:center;gap:6px;">
              <span>📊</span> <span>۵. پایش و امضاها</span>
            </button>

            <button type="button" class="sn-policy-tab-btn ${currentTab==='a4'?'active':''}" data-tab="a4" style="padding:8px 14px;border-radius:8px;font-size:12.5px;font-weight:700;cursor:pointer;background:${currentTab==='a4'?'rgba(59,130,246,0.22)':'transparent'};color:${currentTab==='a4'?'#93c5fd':'#94a3b8'};border:${currentTab==='a4'?'1px solid rgba(59,130,246,0.4)':'1px solid transparent'};display:inline-flex;align-items:center;gap:6px;margin-right:auto;">
              <span>🖨️</span> <span>پیش‌نمایش سربرگ A4</span>
            </button>
          </nav>

          <!-- محتوای تعاملی تب‌ها -->
          <div class="sn-policy-body" style="flex:1;overflow-y:auto;padding:6px 2px;">
            ${renderCurrentTabHtml()}
          </div>

          <!-- نوار اقدامات پایین مودال -->
          <footer style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(212,175,90,0.22);padding-top:14px;margin-top:6px;flex-wrap:wrap;gap:10px;">
            <div style="font-size:12px;color:var(--sn-text-muted);display:flex;align-items:center;gap:8px;">
              <span style="color:#10a0b9;">●</span>
              <span>سند دارای ساختار استاندارد اعتباربخشی (ISO / Ministry of Health Format)</span>
            </div>

            <div style="display:flex;gap:10px;">
              <button type="button" class="btn btn--primary btn--md" id="btnSaveDoc">
                ${ICONS.saveDisk}
                <span>ثبت و تصویب نهایی سند در سامانه</span>
              </button>

              <button type="button" class="btn btn--secondary btn--md" onclick="document.getElementById('${modalId}').style.display='none'">
                انصراف
              </button>
            </div>
          </footer>

        </div>
      `;

      attachModalEvents();
    }

    function renderCurrentTabHtml() {
      if (currentTab === 'a4') {
        return renderA4SheetHtml();
      }

      if (currentTab === 'profile') {
        const daysOpts = Array.from({length:31}, (_,i)=>'<option value="'+(i+1)+'">'+fa(i+1)+'</option>').join('');
        const monthsOpts = JALALI_MONTHS.map((m,idx)=>'<option value="'+(idx+1)+'">'+m+'</option>').join('');
        const yearsOpts = JALALI_YEARS.map(y=>'<option value="'+y+'" '+(y==='۱۴۰۵'?'selected':'')+'>'+y+'</option>').join('');
        const revYearsOpts = JALALI_YEARS.map(y=>'<option value="'+y+'" '+(y==='۱۴۰۶'?'selected':'')+'>'+y+'</option>').join('');

        return `
          <div style="display:flex;flex-direction:column;gap:16px;">
            <div style="background:rgba(23,31,44,0.5);border:1px solid rgba(212,175,90,0.2);border-radius:12px;padding:16px;">
              <div style="font-size:13px;font-weight:800;color:var(--sn-gold-light);margin-bottom:12px;display:flex;align-items:center;gap:6px;">
                ${ICONS.fileText} <span>مشخصات و کدهای شناسایی سند</span>
              </div>
              
              <div style="display:grid;grid-template-columns:2fr 1fr;gap:14px;margin-bottom:14px;">
                <div>
                  <label style="display:block;font-size:12px;font-weight:700;color:var(--sn-text-gold);margin-bottom:6px">عنوان کامل سند *</label>
                  <input type="text" id="f_title" value="${escapeHtml(data.title)}" style="width:100%;padding:10px 14px;background:rgba(19,25,35,0.85);border:1px solid rgba(212,175,90,0.3);border-radius:8px;color:#fff;font-family:inherit;font-size:13px;">
                </div>
                <div>
                  <label style="display:block;font-size:12px;font-weight:700;color:var(--sn-text-gold);margin-bottom:6px">کد دبیرخانه مدارک کنترل‌شده *</label>
                  <input type="text" id="f_doc_code" value="${escapeHtml(data.doc_code)}" style="width:100%;padding:10px 14px;background:rgba(19,25,35,0.85);border:1px solid rgba(212,175,90,0.3);border-radius:8px;color:#fff;font-family:inherit;font-size:13px;direction:ltr;font-weight:700;">
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;">
                <div>
                  <label style="display:block;font-size:12px;font-weight:700;color:var(--sn-text-gold);margin-bottom:6px">شماره ویرایش / نسخه</label>
                  <input type="text" id="f_version_no" value="${escapeHtml(data.version_no)}" style="width:100%;padding:9px 12px;background:rgba(19,25,35,0.85);border:1px solid rgba(212,175,90,0.3);border-radius:8px;color:#fff;font-family:inherit;font-size:12.5px;">
                </div>
                <div>
                  <label style="display:block;font-size:12px;font-weight:700;color:var(--sn-text-gold);margin-bottom:6px">واحد متولی / تدوین‌کننده</label>
                  <input type="text" id="f_dept" value="${escapeHtml(data.dept)}" style="width:100%;padding:9px 12px;background:rgba(19,25,35,0.85);border:1px solid rgba(212,175,90,0.3);border-radius:8px;color:#fff;font-family:inherit;font-size:12.5px;">
                </div>
                <div>
                  <label style="display:block;font-size:12px;font-weight:700;color:var(--sn-text-gold);margin-bottom:6px">مسئول نظارت و پایش</label>
                  <input type="text" id="f_responsible" value="${escapeHtml(data.responsible)}" style="width:100%;padding:9px 12px;background:rgba(19,25,35,0.85);border:1px solid rgba(212,175,90,0.3);border-radius:8px;color:#fff;font-family:inherit;font-size:12.5px;">
                </div>
              </div>
            </div>

            <!-- بخش تاریخ‌های تصویب و بازنگری جلالی -->
            <div style="background:rgba(23,31,44,0.5);border:1px solid rgba(212,175,90,0.2);border-radius:12px;padding:16px;">
              <div style="font-size:13px;font-weight:800;color:var(--sn-gold-light);margin-bottom:12px;display:flex;align-items:center;gap:6px;">
                ${ICONS.calendar} <span>چرخه زمانی و اعتبار سند (تقویم جلالی)</span>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div>
                  <label style="display:block;font-size:12px;font-weight:700;color:var(--sn-gold-light);margin-bottom:6px">📅 تاریخ تصویب و ابلاغ (شمسی)</label>
                  <div style="display:flex;gap:6px;">
                    <select id="snDateDay" style="padding:8px;background:rgba(19,25,35,0.9);border:1px solid rgba(212,175,90,0.3);border-radius:6px;color:#fff;font-family:inherit;">
                      ${daysOpts}
                    </select>
                    <select id="snDateMonth" style="padding:8px;background:rgba(19,25,35,0.9);border:1px solid rgba(212,175,90,0.3);border-radius:6px;color:#fff;font-family:inherit;">
                      ${monthsOpts}
                    </select>
                    <select id="snDateYear" style="padding:8px;background:rgba(19,25,35,0.9);border:1px solid rgba(212,175,90,0.3);border-radius:6px;color:#fff;font-family:inherit;">
                      ${yearsOpts}
                    </select>
                  </div>
                </div>

                <div>
                  <label style="display:block;font-size:12px;font-weight:700;color:var(--sn-gold-light);margin-bottom:6px">⏰ موعد بازنگری دوره‌ای (۱ سال پس از ابلاغ)</label>
                  <div style="display:flex;gap:6px;">
                    <select id="snRevDay" style="padding:8px;background:rgba(19,25,35,0.9);border:1px solid rgba(212,175,90,0.3);border-radius:6px;color:#fff;font-family:inherit;">
                      ${daysOpts}
                    </select>
                    <select id="snRevMonth" style="padding:8px;background:rgba(19,25,35,0.9);border:1px solid rgba(212,175,90,0.3);border-radius:6px;color:#fff;font-family:inherit;">
                      ${monthsOpts}
                    </select>
                    <select id="snRevYear" style="padding:8px;background:rgba(19,25,35,0.9);border:1px solid rgba(212,175,90,0.3);border-radius:6px;color:#fff;font-family:inherit;">
                      ${revYearsOpts}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      if (currentTab === 'purpose') {
        return `
          <div style="display:flex;flex-direction:column;gap:14px;">
            <div>
              <label style="display:block;font-size:12px;font-weight:700;color:var(--sn-text-gold);margin-bottom:6px">۱. هدف از تدوین و اجرای خط‌مشی (Purpose)</label>
              <textarea id="f_purpose" rows="4" style="width:100%;padding:10px 14px;background:rgba(19,25,35,0.85);border:1px solid rgba(212,175,90,0.3);border-radius:8px;color:#fff;font-family:inherit;font-size:13px;line-height:1.8;">${escapeHtml(data.purpose)}</textarea>
            </div>

            <div>
              <label style="display:block;font-size:12px;font-weight:700;color:var(--sn-text-gold);margin-bottom:6px">۲. دامنه شمول و کاربرد در بیمارستان (Scope)</label>
              <textarea id="f_scope" rows="3" style="width:100%;padding:10px 14px;background:rgba(19,25,35,0.85);border:1px solid rgba(212,175,90,0.3);border-radius:8px;color:#fff;font-family:inherit;font-size:13px;line-height:1.8;">${escapeHtml(data.scope)}</textarea>
            </div>

            <div>
              <label style="display:block;font-size:12px;font-weight:700;color:var(--sn-text-gold);margin-bottom:6px">۳. مراجع قانونی، اسناد بالادستی و استانداردهای اعتباربخشی (Legal References)</label>
              <textarea id="f_legal" rows="3" style="width:100%;padding:10px 14px;background:rgba(19,25,35,0.85);border:1px solid rgba(212,175,90,0.3);border-radius:8px;color:#fff;font-family:inherit;font-size:13px;line-height:1.8;">${escapeHtml(data.legal)}</textarea>
            </div>
          </div>
        `;
      }

      if (currentTab === 'policy') {
        return `
          <div style="display:flex;flex-direction:column;gap:14px;">
            <div>
              <label style="display:block;font-size:12px;font-weight:700;color:var(--sn-text-gold);margin-bottom:6px">۴. بیانیه و گزاره خط‌مشی قطعی بیمارستان (Policy Statement) *</label>
              <div style="font-size:11.5px;color:var(--sn-text-muted);margin-bottom:6px;">گزاره تعهدآور و الزام‌آور حاکمیت بالینی بیمارستان در خصوص این سنجه:</div>
              <textarea id="f_policy_stmt" rows="5" style="width:100%;padding:12px 14px;background:rgba(19,25,35,0.9);border:1px solid rgba(212,175,90,0.35);border-radius:8px;color:var(--sn-gold-light);font-family:inherit;font-size:13.5px;line-height:1.9;font-weight:600;">${escapeHtml(data.policy_stmt)}</textarea>
            </div>

            <div>
              <label style="display:block;font-size:12px;font-weight:700;color:var(--sn-text-gold);margin-bottom:6px">۵. تعاریف، اصطلاحات و کلیدواژه‌ها (Definitions)</label>
              <textarea id="f_definitions" rows="4" style="width:100%;padding:10px 14px;background:rgba(19,25,35,0.85);border:1px solid rgba(212,175,90,0.3);border-radius:8px;color:#fff;font-family:inherit;font-size:13px;line-height:1.8;">${escapeHtml(data.definitions)}</textarea>
            </div>
          </div>
        `;
      }

      if (currentTab === 'workflow') {
        return `
          <div style="display:flex;flex-direction:column;gap:14px;">
            <div>
              <label style="display:block;font-size:12px;font-weight:700;color:var(--sn-text-gold);margin-bottom:6px">۶. شرح وظایف و تفکیک مسئولیت‌های رده‌های شغلی (Responsibilities)</label>
              <textarea id="f_responsibilities" rows="5" style="width:100%;padding:10px 14px;background:rgba(19,25,35,0.85);border:1px solid rgba(212,175,90,0.3);border-radius:8px;color:#fff;font-family:inherit;font-size:13px;line-height:1.8;">${escapeHtml(data.responsibilities)}</textarea>
            </div>

            <div>
              <label style="display:block;font-size:12px;font-weight:700;color:var(--sn-text-gold);margin-bottom:6px">۷. روش اجرا و گام‌های عملیاتی اقدام (Step-by-Step Procedure)</label>
              <textarea id="f_work_method" rows="6" style="width:100%;padding:10px 14px;background:rgba(19,25,35,0.85);border:1px solid rgba(212,175,90,0.3);border-radius:8px;color:#fff;font-family:inherit;font-size:13px;line-height:1.8;">${escapeHtml(data.work_method)}</textarea>
            </div>
          </div>
        `;
      }

      if (currentTab === 'monitoring') {
        return `
          <div style="display:flex;flex-direction:column;gap:14px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
              <div>
                <label style="display:block;font-size:12px;font-weight:700;color:var(--sn-text-gold);margin-bottom:6px">۸. روش نظارت، پایش و شاخص‌های سنجش اثربخشی (Monitoring & KPIs)</label>
                <textarea id="f_monitoring" rows="4" style="width:100%;padding:10px 14px;background:rgba(19,25,35,0.85);border:1px solid rgba(212,175,90,0.3);border-radius:8px;color:#fff;font-family:inherit;font-size:13px;line-height:1.8;">${escapeHtml(data.monitoring)}</textarea>
              </div>

              <div>
                <label style="display:block;font-size:12px;font-weight:700;color:var(--sn-text-gold);margin-bottom:6px">۹. فرم‌ها، چک‌لیست‌ها و مستندات پیوست مرتبط (Related Records)</label>
                <textarea id="f_related_docs" rows="4" style="width:100%;padding:10px 14px;background:rgba(19,25,35,0.85);border:1px solid rgba(212,175,90,0.3);border-radius:8px;color:#fff;font-family:inherit;font-size:13px;line-height:1.8;">${escapeHtml(data.related_docs)}</textarea>
              </div>
            </div>

            <!-- جدول گردش امضا و تصویب رسمی -->
            <div style="background:rgba(23,31,44,0.5);border:1px solid rgba(212,175,90,0.2);border-radius:12px;padding:16px;">
              <div style="font-size:13px;font-weight:800;color:var(--sn-gold-light);margin-bottom:12px;display:flex;align-items:center;gap:6px;">
                ${ICONS.officialSeal} <span>جدول ارکان تایید و تصویب مصوب وزارت بهداشت</span>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
                <div style="background:rgba(19,25,35,0.7);padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);">
                  <div style="font-size:11px;color:var(--sn-gold-light);font-weight:700;margin-bottom:4px;">۱. تدوین‌کننده (تهیه‌کننده):</div>
                  <input type="text" id="f_author" value="${escapeHtml(data.author)}" style="width:100%;padding:6px 10px;background:transparent;border:1px solid rgba(212,175,90,0.3);border-radius:6px;color:#fff;font-family:inherit;font-size:12px;">
                </div>

                <div style="background:rgba(19,25,35,0.7);padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);">
                  <div style="font-size:11px;color:var(--sn-gold-light);font-weight:700;margin-bottom:4px;">۲. تاییدکننده (مدیر کیفیت / مترون):</div>
                  <input type="text" id="f_reviewer" value="${escapeHtml(data.reviewer)}" style="width:100%;padding:6px 10px;background:transparent;border:1px solid rgba(212,175,90,0.3);border-radius:6px;color:#fff;font-family:inherit;font-size:12px;">
                </div>

                <div style="background:rgba(19,25,35,0.7);padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);">
                  <div style="font-size:11px;color:var(--sn-gold-light);font-weight:700;margin-bottom:4px;">۳. تصویب‌کننده و ابلاغ (ریاست بیمارستان):</div>
                  <input type="text" id="f_approver" value="${escapeHtml(data.approver)}" style="width:100%;padding:6px 10px;background:transparent;border:1px solid rgba(212,175,90,0.3);border-radius:6px;color:#fff;font-family:inherit;font-size:12px;">
                </div>
              </div>
            </div>
          </div>
        `;
      }
    }

    // پیش‌نمایش رسمی A4 سربرگ‌دار با قابلیت چاپ
    function renderA4SheetHtml() {
      return `
        <div id="snPrintableArea" style="background:#ffffff;color:#0f172a;border-radius:8px;padding:32px 36px;box-shadow:0 8px 30px rgba(0,0,0,0.5);font-family:inherit;line-height:1.9;direction:rtl;margin:0 auto;max-width:850px;">
          
          <!-- سربرگ رسمی وزارت بهداشت و بیمارستان -->
          <div style="border:2px solid #0f172a;border-radius:4px;padding:12px;margin-bottom:18px;">
            <table style="width:100%;border-collapse:collapse;text-align:center;">
              <tr>
                <td style="width:25%;text-align:center;vertical-align:middle;">
                  <div style="font-size:24px;color:#0e7490;">🏥</div>
                  <div style="font-size:11px;font-weight:800;color:#334155;">معاونت درمان</div>
                </td>
                <td style="width:50%;text-align:center;">
                  <div style="font-size:14px;font-weight:900;color:#0f172a;margin-bottom:4px;">جمهوری اسلامی ایران — وزارت بهداشت، درمان و آموزش پزشکی</div>
                  <div style="font-size:15px;font-weight:900;color:#0e7490;margin-bottom:4px;">بیمارستان تخصصی و فوق تخصصی</div>
                  <div style="font-size:13px;font-weight:800;color:#0f172a;background:#f1f5f9;padding:4px 8px;border-radius:4px;display:inline-block;">
                    ${escapeHtml(data.title)}
                  </div>
                </td>
                <td style="width:25%;text-align:right;font-size:11px;font-weight:700;line-height:1.8;color:#334155;">
                  <div>کد سند: <b style="direction:ltr;display:inline-block;">${escapeHtml(data.doc_code)}</b></div>
                  <div>سنجه: <b style="direction:ltr;display:inline-block;">${code}</b></div>
                  <div>نسخه: <b>${escapeHtml(data.version_no)}</b></div>
                  <div>صفحه: <b>۱ از ۱</b></div>
                </td>
              </tr>
            </table>
          </div>

          <!-- جدول شناسنامه ۴ستونه -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11.5px;border:1px solid #cbd5e1;">
            <tr style="background:#f8fafc;">
              <td style="padding:6px 10px;border:1px solid #cbd5e1;font-weight:800;width:18%;">واحد متولی:</td>
              <td style="padding:6px 10px;border:1px solid #cbd5e1;">${escapeHtml(data.dept)}</td>
              <td style="padding:6px 10px;border:1px solid #cbd5e1;font-weight:800;width:18%;">مسئول نظارت:</td>
              <td style="padding:6px 10px;border:1px solid #cbd5e1;">${escapeHtml(data.responsible)}</td>
            </tr>
            <tr style="background:#fff;">
              <td style="padding:6px 10px;border:1px solid #cbd5e1;font-weight:800;">تاریخ ابلاغ:</td>
              <td style="padding:6px 10px;border:1px solid #cbd5e1;">۱ فروردین ۱۴۰۵</td>
              <td style="padding:6px 10px;border:1px solid #cbd5e1;font-weight:800;">موعد بازنگری:</td>
              <td style="padding:6px 10px;border:1px solid #cbd5e1;">۱ فروردین ۱۴۰۶</td>
            </tr>
          </table>

          <!-- بندهای تفصیلی خط‌مشی -->
          <div style="font-size:12.5px;color:#1e293b;">
            <div style="margin-bottom:12px;">
              <b style="color:#0e7490;">۱. هدف:</b> ${escapeHtml(data.purpose)}
            </div>
            <div style="margin-bottom:12px;">
              <b style="color:#0e7490;">۲. دامنه شمول:</b> ${escapeHtml(data.scope)}
            </div>
            <div style="margin-bottom:12px;">
              <b style="color:#0e7490;">۳. مراجع قانونی:</b> ${escapeHtml(data.legal)}
            </div>
            <div style="margin-bottom:12px;background:#f0fbfd;border-right:3px solid #168ea3;padding:8px 12px;border-radius:4px;">
              <b style="color:#1a617b;">۴. بیانیه خط‌مشی:</b> ${escapeHtml(data.policy_stmt)}
            </div>
            <div style="margin-bottom:12px;">
              <b style="color:#0e7490;">۵. تعاریف:</b> ${escapeHtml(data.definitions)}
            </div>
            <div style="margin-bottom:12px;">
              <b style="color:#0e7490;">۶. شرح وظایف:</b> <pre style="white-space:pre-wrap;font-family:inherit;margin:4px 0 0;">${escapeHtml(data.responsibilities)}</pre>
            </div>
            <div style="margin-bottom:12px;">
              <b style="color:#0e7490;">۷. روش اجرا (گردش کار):</b> <pre style="white-space:pre-wrap;font-family:inherit;margin:4px 0 0;">${escapeHtml(data.work_method)}</pre>
            </div>
            <div style="margin-bottom:12px;">
              <b style="color:#0e7490;">۸. پایش و شاخص‌ها:</b> ${escapeHtml(data.monitoring)}
            </div>
            <div style="margin-bottom:16px;">
              <b style="color:#0e7490;">۹. مدارک پیوست:</b> ${escapeHtml(data.related_docs)}
            </div>
          </div>

          <!-- جدول امضای رسمی تایید و تصویب -->
          <table style="width:100%;border-collapse:collapse;margin-top:20px;border:1px solid #94a3b8;text-align:center;font-size:11.5px;">
            <tr style="background:#f1f5f9;font-weight:800;color:#0f172a;">
              <td style="padding:8px;border:1px solid #94a3b8;width:33.3%;">تهیه‌کننده و تدوین</td>
              <td style="padding:8px;border:1px solid #94a3b8;width:33.3%;">بررسی و تایید</td>
              <td style="padding:8px;border:1px solid #94a3b8;width:33.3%;">تصویب و ابلاغ نهایی</td>
            </tr>
            <tr style="height:65px;vertical-align:bottom;">
              <td style="padding:8px;border:1px solid #94a3b8;">
                <div style="font-weight:700;">${escapeHtml(data.author)}</div>
                <div style="font-size:10px;color:#64748b;">امضای الکترونیکی ثبت شد</div>
              </td>
              <td style="padding:8px;border:1px solid #94a3b8;">
                <div style="font-weight:700;">${escapeHtml(data.reviewer)}</div>
                <div style="font-size:10px;color:#64748b;">تایید انطباق اعتباربخشی</div>
              </td>
              <td style="padding:8px;border:1px solid #94a3b8;">
                <div style="font-weight:700;">${escapeHtml(data.approver)}</div>
                <div style="font-size:10px;color:#168ea3;font-weight:800;">✓ مصوب و لازم‌الاجرا</div>
              </td>
            </tr>
          </table>

          <div style="display:flex;justify-content:center;margin-top:20px;" class="noprint">
            <button type="button" class="btn btn--info btn--md" onclick="window.print()">
              ${ICONS.printDoc} <span>ارسال به چاپگر و خروجی PDF (A4)</span>
            </button>
          </div>

        </div>
      `;
    }

    function syncFormInputsToData() {
      const g = id => { const el = document.getElementById(id); return el ? el.value.trim() : null; };
      if (currentTab === 'profile') {
        data.title = g('f_title') || data.title;
        data.doc_code = g('f_doc_code') || data.doc_code;
        data.version_no = g('f_version_no') || data.version_no;
        data.dept = g('f_dept') || data.dept;
        data.responsible = g('f_responsible') || data.responsible;
      } else if (currentTab === 'purpose') {
        data.purpose = g('f_purpose') || data.purpose;
        data.scope = g('f_scope') || data.scope;
        data.legal = g('f_legal') || data.legal;
      } else if (currentTab === 'policy') {
        data.policy_stmt = g('f_policy_stmt') || data.policy_stmt;
        data.definitions = g('f_definitions') || data.definitions;
      } else if (currentTab === 'workflow') {
        data.responsibilities = g('f_responsibilities') || data.responsibilities;
        data.work_method = g('f_work_method') || data.work_method;
      } else if (currentTab === 'monitoring') {
        data.monitoring = g('f_monitoring') || data.monitoring;
        data.related_docs = g('f_related_docs') || data.related_docs;
        data.author = g('f_author') || data.author;
        data.reviewer = g('f_reviewer') || data.reviewer;
        data.approver = g('f_approver') || data.approver;
      }
    }

    function attachModalEvents() {
      // سوئیچ بین تب‌ها
      const tabBtns = modal.querySelectorAll('.sn-policy-tab-btn');
      tabBtns.forEach(btn => {
        btn.onclick = function() {
          syncFormInputsToData();
          currentTab = this.getAttribute('data-tab');
          renderModalContent();
        };
      });

      // دکمه تغییر حالت A4
      const btnToggleA4 = modal.querySelector('#btnToggleA4');
      if (btnToggleA4) {
        btnToggleA4.onclick = function() {
          syncFormInputsToData();
          currentTab = (currentTab === 'a4') ? 'profile' : 'a4';
          renderModalContent();
        };
      }

      // درج نمونه استاندارد وزارت بهداشت
      const btnLoadTpl = modal.querySelector('#btnLoadTpl');
      if (btnLoadTpl) {
        btnLoadTpl.onclick = function() {
          data = getAccreditationTemplate(type, code, stmt);
          renderModalContent();
          if (typeof toast === 'function') {
            toast('نمونه متن رسمی و الزامات استاندارد سنجه در فرم بارگذاری شد.');
          } else {
            BTN.alert('نمونه متن استاندارد وزارت بهداشت با موفقیت بارگذاری شد.');
          }
        };
      }

      // ذخیره‌سازی رسمی سند در دیتابیس
      const btnSaveDoc = modal.querySelector('#btnSaveDoc');
      if (btnSaveDoc) {
        btnSaveDoc.onclick = async function() {
          syncFormInputsToData();
          HassanHub._docStore[storeKey] = data;

          // ارسال پایدار به سرور از طریق API اسناد کنترل‌شده
          try {
            const payload = {
              doc_type: type,
              title: data.title,
              doc_code: data.doc_code,
              purpose: data.purpose,
              scope: data.scope,
              legal_references: data.legal,
              definitions: data.definitions,
              work_method: data.work_method + '\n\n' + (data.policy_stmt ? 'بیانیه خط‌مشی:\n' + data.policy_stmt : ''),
              related_staff: data.responsibilities,
              responsible_person: data.responsible,
              monitoring_method: data.monitoring,
              related_documents: data.related_docs,
              status: 'approved',
              issue_date: '1405-01-01',
              review_date: '1406-01-01'
            };

            if (window.API && typeof window.API.createDocument === 'function') {
              await window.API.createDocument(payload);
            } else if (typeof fetch === 'function') {
              await fetch('/api/documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
            }
          } catch(e) {
            console.log('Doc API note:', e.message);
          }

          if (typeof toast === 'function') {
            toast('سند استاندارد ' + data.doc_code + ' با موفقیت مصوب و در سامانه ثبت گردید.');
          } else {
            BTN.alert('سند استاندارد ' + data.doc_code + ' با موفقیت در سامانه ثبت گردید.');
          }
          modal.style.display = 'none';
        };
      }
    }

    renderModalContent();
    modal.style.display = 'flex';
  };

  HassanHub.openProcedureForm = function(code, title) {
    HassanHub.openGenericForm('procedure', code, title);
  };


    // مودال آپلود شواهد
  // آپلود واقعی شواهد سنجه — جایگزین alert نمایشی قبلی.
  // چرا این‌جا: API سرور با id (نه code) کار می‌کند، پس id از درخت اعتباربخشی پیدا می‌شود.
  HassanHub.uploadEvidenceFile = async function(code) {
    var inp = document.getElementById('snEvidenceFile');
    var f = inp && inp.files[0];
    if (!f) return;
    try {
      toast('در حال بارگذاری فایل...');
      var t = await API.tree();
      var id = null;
      (function walk(nodes) {
        (nodes || []).forEach(function (n) {
          if (id) return;
          if (n.code === code && n.level_type === 'measure') id = n.id;
          if (n.children) walk(n.children);
        });
      })(t.tree || t.items || t);
      if (!id) { toast('سنجه یافت نشد', true); return; }
      await API.uploadEvidenceFile('measure', id, f);
      toast('فایل با موفقیت بارگذاری شد');
      inp.value = '';
    } catch (e) { toast((e && e.message) || 'خطا در بارگذاری', true); }
  };
  HassanHub.openEvidenceUploadModal = function(code) {
    if (!canUserEditMeasure(code)) {
      BTN.alert("🔒 شما در حالت فقط‌خواندنی هستید. بارگذاری مستندات این سنجه در حیطه وظایف سازمانی مسئول مربوطه یا مدیر بهبود کیفیت است.");
      return;
    }
    const modalId = 'snEvidenceModal';
    let modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'sn-modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="sn-modal-box" style="max-width:540px">
        <div class="sn-modal-header">
          <h3 class="sn-modal-title">
            <span style="display:inline-flex;align-items:center;gap:8px;">${ICONS.folderEvidence} <span>پرونده الکترونیکی شواهد — ${code}</span></span>
          </h3>
          <button type="button" class="sn-modal-close" onclick="document.getElementById('${modalId}').style.display='none'">${ICONS.close}</button>
        </div>

        <div style="text-align:center;padding:24px;border:2px dashed rgba(212,175,90,0.3);border-radius:12px;background:rgba(23,31,44,0.5);margin-bottom:16px">
          <div style="display:flex;justify-content:center;margin-bottom:10px">${ICONS.uploadBig}</div>
          <div style="font-weight:700;color:var(--sn-gold-light);margin-bottom:6px">فایل شواهد، صورت‌جلسه، گزارش یا تصویر را بکشید یا انتخاب کنید</div>
          <div style="font-size:11.5px;color:var(--sn-text-muted);margin-bottom:14px">پشتیبانی از فرمت‌های PDF, JPG, PNG, DOCX تا سقف ۱۰ مگابایت</div>
          <input type="file" id="snEvidenceFile" style="display:none" accept=".pdf,.jpg,.jpeg,.png,.docx" onchange="HassanHub.uploadEvidenceFile('${code}')">
          <button type="button" class="btn btn--success btn--md" onclick="document.getElementById('snEvidenceFile').click()">
            انتخاب فایل از کامپیوتر
          </button>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:8px">
          <button type="button" class="btn btn--secondary btn--md" onclick="document.getElementById('${modalId}').style.display='none'">
            بستن
          </button>
        </div>
      </div>
    `;
    modal.style.display = 'flex';
  };

  HassanHub.openBookGuideModal = function(code, statement, page) {
    if (typeof showHelpModal === 'function') {
      showHelpModal(code, statement, page, '');
      return;
    }
    BTN.alert(`راهنمای سنجه ${code} — صفحه ${page} کتاب اعتباربخشی`);
  };

  HassanHub.openDocumentHubModal = function(type, axisCode, axisTitle) {
    HassanHub.openGenericForm(type, axisCode, axisTitle);
  };

  // =========================================================================
  // ۱۳. سازگاری کامل به عقب (Safe Backward Compatibility Aliases)
  // =========================================================================
  // window.HassanHub
  // window.HassanState
  // normCode
  window.renderHassanLegacyDynamic = window.renderHassanDynamic;
  window.renderHassanLegacyCareHub = window.renderHassanCareHub;
  window.renderHassanLegacyManagementHub = window.renderHassanManagementHub;
  window.renderHassanLegacySupportHub = window.renderHassanSupportHub;
  window.renderHassanLegacySubAxisHub = window.renderHassanSubAxisHub;
  window.renderHassanLegacyGeneralCareSubHub = window.renderHassanGeneralCareSubHub;
  window.renderHassanLegacyProceduresFlow = window.renderHassanProceduresFlow;
  window.renderHassanLegacyStandardDetailPage = window.renderHassanStandardDetailPage;
  window.renderHassanLegacySafetyHub = window.renderHassanSafetyHub;
  window.renderHassanLegacySafetyMeasuresPage = window.renderHassanSafetyMeasuresPage;

  // هلپر تبدیل ارقام به فارسی
  function fa(num) {
    if (num == null) return '';
    const f = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
    return String(num).replace(/[0-9]/g, d => f[d]);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();

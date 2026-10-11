// src/services/gap-analysis.js
// تحلیل شکاف ۵۲۰ سنجه با شناسایی خودکار gap و پیشنهاد اقدامات

const { query, db } = require('../config/database-sqlite');
const { uuid } = require('../utils/db');

/**
 * نرمال‌سازی ارقام فارسی/عربی به لاتین تا مقایسه کدها (مثل الف-۱ با الف-1) کار کند
 */
function normalizeDigits(s) {
  return String(s || '')
    .replace(/[۰-۹]/g, (d) => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
    .replace(/[٠-٩]/g, (d) => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
}

/**
 * استخراج chapter از دو بخش اول code (ستون chapter در اسکیما وجود ندارد)
 * مثال: «الف-1-1-1» -> «الف-1»
 */
function deriveChapter(code) {
  const parts = String(code || '').split('-');
  if (parts.length >= 2) return parts.slice(0, 2).join('-');
  return String(code || '');
}

/**
 * استخراج section از سه بخش اول code (ستون section در اسکیما وجود ندارد)
 * مثال: «الف-1-1-1» -> «الف-1-1»
 */
function deriveSection(code) {
  const parts = String(code || '').split('-');
  if (parts.length >= 3) return parts.slice(0, 3).join('-');
  return deriveChapter(code);
}

/**
 * تشخیص پرچم ایمنی بیمار با ستون واقعی patient_safety_flag
 * (سازگار با ردیف‌های قدیمی که is_patient_safety دارند)
 */
function isPatientSafetyRow(measure) {
  if (!measure) return false;
  const v = measure.patient_safety_flag !== undefined ? measure.patient_safety_flag : measure.is_patient_safety;
  return v === 1 || v === '1' || v === true;
}

/**
 * تحلیل شکاف کامل یک بیمارستان
 */
function analyzeGaps(hospitalId, year) {
  const measures = query(`
    SELECT 
      m.id,
      m.code,
      m.title,
      m.statement,
      m.patient_safety_flag,
      ms.status,
      ms.internal_status,
      ms.external_status,
      ms.na_reason
    FROM accreditation_sections m
    LEFT JOIN measure_status ms ON m.id = ms.measure_id AND ms.hospital_id = ? AND ms.year = ?
    WHERE m.level_type = 'measure'
    ORDER BY m.code
  `, [hospitalId, year]).rows;

  const gaps = [];
  const stats = {
    total: measures.length,
    full_compliant: 0,
    partial: 0,
    non_compliant: 0,
    not_reviewed: 0,
    not_applicable: 0,
    patient_safety_gaps: 0,
    critical_gaps: 0
  };

  for (const measure of measures) {
    const rawStatus = measure.status || 'not_reviewed';
    // گارد: اگر status مقداری خارج از کلیدهای stats باشد، NaN نساز؛ not_reviewed حساب کن
    const status = Object.prototype.hasOwnProperty.call(stats, rawStatus) ? rawStatus : 'not_reviewed';
    stats[status]++;

    if (status === 'not_applicable') continue;

    const isPS = isPatientSafetyRow(measure);
    const chapter = measure.chapter || deriveChapter(measure.code);
    const section = measure.section || deriveSection(measure.code);
    const displayTitle = measure.title || measure.statement || measure.code;

    // شناسایی gap
    if (status === 'non_compliant' || status === 'not_reviewed') {
      const gapType = status === 'non_compliant' ? 'non_compliant' : 'not_assessed';
      const severity = isPS ? 'critical' : 'normal';

      if (isPS) {
        stats.patient_safety_gaps++;
      }
      if (severity === 'critical') {
        stats.critical_gaps++;
      }

      gaps.push({
        measure_id: measure.id,
        measure_code: measure.code,
        measure_title: displayTitle,
        chapter: chapter,
        section: section,
        current_status: status,
        gap_type: gapType,
        severity: severity,
        is_patient_safety: isPS,
        suggested_actions: suggestActions(measure, status)
      });
    } else if (status === 'partial') {
      gaps.push({
        measure_id: measure.id,
        measure_code: measure.code,
        measure_title: displayTitle,
        chapter: chapter,
        section: section,
        current_status: status,
        gap_type: 'partial_compliance',
        severity: isPS ? 'high' : 'medium',
        is_patient_safety: isPS,
        suggested_actions: suggestActions(measure, status)
      });
    }
  }

  return {
    hospital_id: hospitalId,
    year: year,
    stats: stats,
    gaps: gaps,
    priority_gaps: gaps.filter(g => g.severity === 'critical' || g.is_patient_safety)
      .sort((a, b) => (b.is_patient_safety ? 1 : 0) - (a.is_patient_safety ? 1 : 0))
  };
}

/**
 * پیشنهاد اقدامات بر اساس نوع سنجه
 */
function suggestActions(measure, status) {
  const actions = [];

  // اقدامات عمومی
  if (status === 'not_reviewed') {
    actions.push('ارزیابی اولیه و تعیین وضعیت');
    actions.push('بررسی مستندات موجود');
  }

  if (status === 'non_compliant' || status === 'partial') {
    actions.push('تدوین برنامه بهبود');
    actions.push('تعیین مسئول و زمان‌بندی');
  }

  // اقدامات محورمحور (chapter ستونی ندارد؛ از code مشتق می‌شود + نرمال‌سازی ارقام)
  const chapter = normalizeDigits(measure.chapter || deriveChapter(measure.code) || '');
  const isPS = isPatientSafetyRow(measure);
  
  if (chapter.includes(normalizeDigits('الف-۱'))) {
    actions.push('بررسی ساختار سازمانی و وظایف');
    actions.push('تدوین/بازنگری خط‌مشی‌ها');
  } else if (chapter.includes(normalizeDigits('الف-۲'))) {
    actions.push('ارزیابی ریسک و تدوین برنامه');
    actions.push('آموزش کارکنان');
  } else if (chapter.includes(normalizeDigits('الف-۳')) || chapter.includes(normalizeDigits('الف-۴'))) {
    actions.push('بررسی شرح وظایف و صلاحیت‌ها');
    actions.push('برنامه‌ریزی آموزش و ارزیابی');
  } else if (chapter.includes(normalizeDigits('الف-۵'))) {
    actions.push('تدوین/بازنگری اطلاعات پایه');
    actions.push('آموزش و ارزیابی سیستم');
  } else if (chapter.includes(normalizeDigits('الف-۶')) || chapter.includes(normalizeDigits('الف-۷'))) {
    actions.push('بررسی تجهیزات و زیرساخت');
    actions.push('تدوین برنامه نگهداری');
  } else if (chapter.includes(normalizeDigits('الف-۸')) || chapter.includes(normalizeDigits('الف-۹'))) {
    actions.push('بررسی مستندات مالی/عملیاتی');
    actions.push('تدوین شاخص‌ها و گزارش‌دهی');
  } else if (chapter.includes('ب-')) {
    // محورهای بالینی
    actions.push('بررسی پروتکل‌های بالینی');
    actions.push('آموزش و نظارت بالینی');
    if (isPS) {
      actions.push('اولویت بالا: ایمنی بیمار');
    }
  }

  return actions;
}

/**
 * تحلیل روند پیشرفت
 */
function analyzeTrends(hospitalId, startYear, endYear) {
  const trends = [];
  const sY = Number(startYear);
  const eY = Number(endYear);

  for (let year = sY; year <= eY; year++) {
    const stats = query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'full_compliant' THEN 1 ELSE 0 END) as full_compliant,
        SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END) as partial,
        SUM(CASE WHEN status = 'non_compliant' THEN 1 ELSE 0 END) as non_compliant,
        SUM(CASE WHEN status IS NULL OR status = 'not_reviewed' THEN 1 ELSE 0 END) as not_reviewed,
        SUM(CASE WHEN status = 'not_applicable' THEN 1 ELSE 0 END) as not_applicable
      FROM accreditation_sections m
      LEFT JOIN measure_status ms ON m.id = ms.measure_id AND ms.hospital_id = ? AND ms.year = ?
      WHERE m.level_type = 'measure'
    `, [hospitalId, String(year)]).rows[0];

    const denom = stats.total - stats.not_applicable;
    trends.push({
      year: year,
      stats: stats,
      readiness_rate: denom > 0 
        ? ((stats.full_compliant + stats.partial) / denom * 100).toFixed(1)
        : 0
    });
  }

  return trends;
}

/**
 * گزارش اولویت‌بندی شده
 */
function priorityReport(hospitalId, year) {
  const analysis = analyzeGaps(hospitalId, year);

  // دسته‌بندی بر اساس محور
  const byChapter = {};
  for (const gap of analysis.gaps) {
    const chapter = gap.chapter || 'سایر';
    if (!byChapter[chapter]) {
      byChapter[chapter] = {
        chapter: chapter,
        total_gaps: 0,
        critical_gaps: 0,
        gaps: []
      };
    }
    byChapter[chapter].total_gaps++;
    if (gap.severity === 'critical' || gap.is_patient_safety) {
      byChapter[chapter].critical_gaps++;
    }
    byChapter[chapter].gaps.push(gap);
  }

  // مرتب‌سازی بر اساس تعداد gap های بحرانی
  const chapters = Object.values(byChapter)
    .sort((a, b) => b.critical_gaps - a.critical_gaps);

  return {
    summary: analysis.stats,
    priority_gaps: analysis.priority_gaps.slice(0, 20),
    by_chapter: chapters,
    recommendations: generateRecommendations(analysis)
  };
}

/**
 * تولید توصیه‌های خودکار
 */
function generateRecommendations(analysis) {
  const recommendations = [];

  // بر اساس تعداد gap
  if (analysis.stats.not_reviewed > 50) {
    recommendations.push({
      type: 'assessment',
      priority: 'high',
      message: `${analysis.stats.not_reviewed} سنجه هنوز ارزیابی نشده است. توصیه می‌شود ارزیابی اولیه در اولویت قرار گیرد.`
    });
  }

  if (analysis.stats.patient_safety_gaps > 0) {
    recommendations.push({
      type: 'patient_safety',
      priority: 'critical',
      message: `${analysis.stats.patient_safety_gaps} سنجه ایمنی بیمار دارای شکاف است. اقدام فوری لازم است.`
    });
  }

  if (analysis.stats.non_compliant > analysis.stats.total * 0.3) {
    recommendations.push({
      type: 'compliance',
      priority: 'high',
      message: `بیش از ۳۰٪ سنجه‌ها غیرمنطبق هستند. برنامه‌ریزی جامع بهبود ضروری است.`
    });
  }

  // نرخ آمادگی (گارد مخرج صفر)
  const denom = analysis.stats.total - analysis.stats.not_applicable;
  const readinessRate = denom > 0 ? ((analysis.stats.full_compliant + analysis.stats.partial) / 
    denom * 100).toFixed(1) : 0;

  if (readinessRate < 50) {
    recommendations.push({
      type: 'readiness',
      priority: 'high',
      message: `نرخ آمادگی ${readinessRate}٪ است. تمرکز بر محورهای اصلی پیشنهاد می‌شود.`
    });
  } else if (readinessRate >= 80) {
    recommendations.push({
      type: 'readiness',
      priority: 'low',
      message: `نرخ آمادگی ${readinessRate}٪ است. عملکرد خوب، ادامه روند بهبود توصیه می‌شود.`
    });
  }

  return recommendations;
}

/**
 * ذخیره گزارش تحلیل
 */
function saveAnalysis(hospitalId, year, userId) {
  const analysis = analyzeGaps(hospitalId, year);
  const id = uuid();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const denom = analysis.stats.total - analysis.stats.not_applicable;
  const readinessRate = denom > 0
    ? ((analysis.stats.full_compliant + analysis.stats.partial) / denom * 100).toFixed(1)
    : 0;

  db.prepare(`
    INSERT INTO gap_analysis_reports (id, hospital_id, year, total_measures, gaps_count, critical_gaps, patient_safety_gaps, readiness_rate, report_data, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, 
    hospitalId, 
    year, 
    analysis.stats.total,
    analysis.gaps.length,
    analysis.stats.critical_gaps,
    analysis.stats.patient_safety_gaps,
    readinessRate,
    JSON.stringify(analysis),
    userId,
    now
  );

  return { id, analysis };
}

module.exports = {
  analyzeGaps,
  analyzeTrends,
  priorityReport,
  saveAnalysis
};

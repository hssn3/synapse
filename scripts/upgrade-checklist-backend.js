/**
 * Upgrade Checklist Audit Hub and Live Audit Form
 * Implements JCI / Clinical Governance Recurring Audit Cycle
 * Preserves all existing features without breaking anything.
 */
const fs = require('fs');
const path = require('path');

// ==========================================
// 1. UPDATE src/services/checklist-cadence.js
// ==========================================
const cadencePath = path.join(__dirname, '../src/services/checklist-cadence.js');
let cadenceContent = fs.readFileSync(cadencePath, 'utf8');

if (!cadenceContent.includes('function nextPeriod')) {
  // Add nextPeriod function
  const targetFn = `function previousPeriod(cadence, dateStr) {
  const cur = periodOf(cadence, dateStr);
  if (!cur) return null;
  return periodOf(cadence, addDays(cur.start, -1));
}`;

  const newFn = `function previousPeriod(cadence, dateStr) {
  const cur = periodOf(cadence, dateStr);
  if (!cur) return null;
  return periodOf(cadence, addDays(cur.start, -1));
}

/** دوره‌ی بعد از دوره‌ی جاری — برای تعیین سررسید پایش بعدی */
function nextPeriod(cadence, dateStr) {
  const cur = periodOf(cadence, dateStr);
  if (!cur) return null;
  return periodOf(cadence, addDays(cur.end, 1));
}`;

  cadenceContent = cadenceContent.replace(targetFn, newFn);

  // In checklistStatus, add next period info
  const targetStatus = `  let state;
  if (done) state = 'done';
  else if (daysLeft <= 0) state = 'last_day';
  else if (daysLeft <= lead) state = 'due_soon';
  else state = 'due';

  return {
    cadence, periodic: true, state,
    period_start: p.start, period_end: p.end,
    last_submitted_at: last,
    done_this_period: done,
    days_left: daysLeft,
    previous_period_missed: prevMissed,
  };`;

  const newStatus = `  const next = nextPeriod(cadence, today);

  let state;
  if (done) state = 'done';
  else if (daysLeft <= 0) state = 'last_day';
  else if (daysLeft <= lead) state = 'due_soon';
  else state = 'due';

  return {
    cadence, periodic: true, state,
    period_start: p.start, period_end: p.end,
    next_period_start: next ? next.start : null,
    next_period_end: next ? next.end : null,
    last_submitted_at: last,
    done_this_period: done,
    days_left: daysLeft,
    previous_period_missed: prevMissed,
  };`;

  cadenceContent = cadenceContent.replace(targetStatus, newStatus);

  // In exports
  cadenceContent = cadenceContent.replace(
    'previousPeriod, checklistStatus, addDays, daysBetween,',
    'previousPeriod, nextPeriod, checklistStatus, addDays, daysBetween,'
  );

  fs.writeFileSync(cadencePath, cadenceContent, 'utf8');
  console.log('✓ Updated src/services/checklist-cadence.js with nextPeriod calculation');
}

// ==========================================
// 2. UPDATE src/modules/quality/checklists.routes.js
// ==========================================
const routesPath = path.join(__dirname, '../src/modules/quality/checklists.routes.js');
let routesContent = fs.readFileSync(routesPath, 'utf8');

if (!routesContent.includes('hospital_wards')) {
  const targetGet = `    res.json({ checklist, domains, items: items.filter(i => !i.domain_id), measurers: chkMeasurers(checklist.id), cadence_fa: CL_CADENCE_FA });`;
  const newGet = `    const dbWards = query('SELECT DISTINCT title FROM nursing_wards WHERE hospital_id = ? ORDER BY sort_order, title', [req.hospitalId]).rows.map(w => w.title);
    const standardWards = ['اورژانس', 'مراقبت‌های ویژه (ICU)', 'قلب (CCU)', 'اتاق عمل جنرال', 'جراحی عمومی', 'داخلی', 'اطفال', 'زنان و زایمان', 'دیالیز', 'نوزادان (NICU)', 'آزمایشگاه', 'تصویربرداری', 'داروخانه', 'استریلیزاسیون (CSR)', 'بهداشت محیط', 'لاندری (رختشویخانه)', 'تغذیه و آشپزخانه', 'تأسیسات و مهندسی پزشکی'];
    const hospital_wards = [...new Set([...dbWards, ...standardWards])];
    res.json({ checklist, domains, items: items.filter(i => !i.domain_id), measurers: chkMeasurers(checklist.id), cadence_fa: CL_CADENCE_FA, hospital_wards });`;

  routesContent = routesContent.replace(targetGet, newGet);
  fs.writeFileSync(routesPath, routesContent, 'utf8');
  console.log('✓ Updated src/modules/quality/checklists.routes.js with hospital_wards');
}

console.log('Backend checklist service & routes upgraded successfully!');

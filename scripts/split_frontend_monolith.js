/**
 * Automated Frontend Monolith Decomposition Script
 * Decomposes public/js/app.js (17,277 LOC) into Modular Architecture
 * Part of MEGA-PROMPT v3.0 Phase 4
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcPath = 'public/js/app.js';
const content = fs.existsSync(srcPath)
  ? fs.readFileSync(srcPath, 'utf8')
  : execSync('git show HEAD:public/js/app.js', { maxBuffer: 25 * 1024 * 1024, encoding: 'utf8' });

const lines = content.split('\n');
console.log('Total lines in app.js:', lines.length);

function extract(startLine, endLine) {
  return lines.slice(startLine - 1, endLine).join('\n');
}

const modules = [
  // Core
  { file: 'public/js/core/core-roles-perms.js', desc: 'Core Roles & Permissions', start: 1, end: 264 },
  { file: 'public/js/core/core-visual-fx.js', desc: 'Core Visual Theme & Glassmorphism', start: 265, end: 502 },
  { file: 'public/js/core/core-tooltip.js', desc: 'Core Tooltip Portal', start: 503, end: 632 },
  { file: 'public/js/core/core-datetime-part1.js', desc: 'Core Tehran Timezone & Jalali Math', start: 633, end: 887 },
  { file: 'public/js/core/core-datetime-part2.js', desc: 'Core Jalali Date Picker', start: 888, end: 1142 },
  { file: 'public/js/core/core-onboarding.js', desc: 'Core Hospital Onboarding Wizard', start: 1143, end: 1260 },
  { file: 'public/js/core/core-floating-assistant.js', desc: 'Core Dana Floating Assistant', start: 1261, end: 1599 },
  { file: 'public/js/core/core-header-footer.js', desc: 'Core Header, Nav & Brand Footer', start: 1600, end: 1758 },
  { file: 'public/js/core/core-boot-auth.js', desc: 'Core Boot & Login Flow', start: 1759, end: 1854 },
  { file: 'public/js/core/core-data-loader.js', desc: 'Core Data Loader & Features', start: 4259, end: 4644 },
  { file: 'public/js/core/core-router-nav.js', desc: 'Core Router & History API', start: 4645, end: 5090 },
  { file: 'public/js/core/core-router-routes.js', desc: 'Core Route Table Dispatcher', start: 5091, end: 5539 },

  // Dashboard & Catalog
  { file: 'public/js/views/dashboard/catalog-part1.js', desc: 'Corporate Catalog Part 1', start: 1855, end: 2210 },
  { file: 'public/js/views/dashboard/catalog-part2.js', desc: 'Corporate Catalog Part 2', start: 2211, end: 2570 },
  { file: 'public/js/views/dashboard/catalog-part3.js', desc: 'Corporate Catalog Part 3', start: 2571, end: 2930 },
  { file: 'public/js/views/dashboard/catalog-part4.js', desc: 'Corporate Catalog Part 4', start: 2931, end: 3302 },
  { file: 'public/js/views/dashboard/dashboard-hubs-part1.js', desc: 'Dashboard Hubs Part 1', start: 5540, end: 5820 },
  { file: 'public/js/views/dashboard/dashboard-hubs-part2.js', desc: 'Dashboard Hubs Part 2', start: 5821, end: 6100 },
  { file: 'public/js/views/dashboard/dashboard-analytics.js', desc: 'Dashboard Analytics & Live Stats', start: 6101, end: 6563 },
  { file: 'public/js/views/dashboard/dashboard-divisions.js', desc: 'Dashboard Org Divisions & Cards', start: 6564, end: 6929 },

  // Superadmin Views
  { file: 'public/js/views/users/superadmin-logs.js', desc: 'Superadmin Error & Activity Logs', start: 3303, end: 3457 },
  { file: 'public/js/views/users/superadmin-docs-part1.js', desc: 'Superadmin Documentation Part 1', start: 3458, end: 3730 },
  { file: 'public/js/views/users/superadmin-docs-part2.js', desc: 'Superadmin Documentation Part 2', start: 3731, end: 4012 },
  { file: 'public/js/views/users/superadmin-packages.js', desc: 'Superadmin Hospital Packages', start: 4013, end: 4258 },

  // Accreditation Views
  { file: 'public/js/views/accreditation/measures-view.js', desc: 'Accreditation Measures & 3-Axis View', start: 6930, end: 7349 },
  { file: 'public/js/views/accreditation/evidence-records.js', desc: 'Accreditation Evidence Binder', start: 7350, end: 7611 },
  { file: 'public/js/views/accreditation/corrective-actions.js', desc: 'Accreditation Corrective Actions', start: 7612, end: 7821 },

  // Collaboration Views
  { file: 'public/js/views/collaboration/search-calendar.js', desc: 'Collaboration Search & Calendar', start: 7822, end: 8252 },
  { file: 'public/js/views/collaboration/reports-trends.js', desc: 'Collaboration Audit Reports & Trends', start: 8253, end: 8481 },
  { file: 'public/js/views/collaboration/kartabl-profile.js', desc: 'Collaboration Kartabl & User Profile', start: 8482, end: 8664 },
  { file: 'public/js/views/collaboration/dana-knowledge.js', desc: 'Collaboration Dana Knowledge Base', start: 8665, end: 8945 },
  { file: 'public/js/views/collaboration/messages-view.js', desc: 'Collaboration Internal Messages', start: 8946, end: 9055 },
  { file: 'public/js/views/collaboration/committees-view.js', desc: 'Collaboration Committees List & Structure', start: 9056, end: 9350 },
  { file: 'public/js/views/collaboration/committee-minutes.js', desc: 'Collaboration Committee Minutes & Decisions', start: 9351, end: 9627 },

  // Documents Views
  { file: 'public/js/views/documents/controlled-docs.js', desc: 'Documents Controlled Documents', start: 9628, end: 9979 },
  { file: 'public/js/views/documents/bulk-upload.js', desc: 'Documents Bulk OCR Upload', start: 9980, end: 10465 },
  { file: 'public/js/views/documents/processes-view.js', desc: 'Documents Clinical Processes Registry', start: 11120, end: 11470 },
  { file: 'public/js/views/documents/flowchart-view.js', desc: 'Documents Process Flowchart Visualizer', start: 11471, end: 11812 },
  { file: 'public/js/views/documents/digital-library.js', desc: 'Documents Digital Library Repository', start: 12055, end: 12190 },

  // Quality Views
  { file: 'public/js/views/quality/fmea-errors.js', desc: 'Quality FMEA & Incident Reporting', start: 10466, end: 10766 },
  { file: 'public/js/views/quality/certifications.js', desc: 'Quality Certifications & Badges', start: 10767, end: 10912 },
  { file: 'public/js/views/quality/audits-view.js', desc: 'Quality Internal Audits', start: 10913, end: 11119 },
  { file: 'public/js/views/quality/walkarounds-view.js', desc: 'Quality Management Walkarounds', start: 11813, end: 12054 },
  { file: 'public/js/views/quality/checklists-bank.js', desc: 'Quality Checklists Bank', start: 12191, end: 12530 },
  { file: 'public/js/views/quality/checklists-form.js', desc: 'Quality Checklists Form Submission', start: 12531, end: 12869 },
  { file: 'public/js/views/quality/checklists-print.js', desc: 'Quality Checklists Print Sheet', start: 12870, end: 13130 },
  { file: 'public/js/views/quality/improvement-programs.js', desc: 'Quality Improvement Programs', start: 13984, end: 14203 },
  { file: 'public/js/views/quality/strategic-wizard.js', desc: 'Quality 8-Step Strategic Plan Wizard', start: 14204, end: 14459 },
  { file: 'public/js/views/quality/training-needs.js', desc: 'Quality Training Needs Assessment', start: 14460, end: 14657 },
  { file: 'public/js/views/quality/bsc-view.js', desc: 'Quality Balanced Scorecard & Patient Survey', start: 14658, end: 14933 },
  { file: 'public/js/views/quality/indicators-view.js', desc: 'Quality Hospital KPIs & Indicators Bank', start: 15375, end: 15690 },
  { file: 'public/js/views/quality/indicators-compare-p1.js', desc: 'Quality Indicator Comparison Charts Part 1', start: 15691, end: 16000 },
  { file: 'public/js/views/quality/indicators-compare-p2.js', desc: 'Quality Indicator Comparison Charts Part 2', start: 16001, end: 16307 },
  { file: 'public/js/views/quality/indicators-reports.js', desc: 'Quality Indicator Reports & Analytics', start: 16308, end: 16666 },

  // Clinical Views
  { file: 'public/js/views/clinical/patient-followup.js', desc: 'Clinical Patient & Maternity Followup', start: 14934, end: 15374 },
  { file: 'public/js/views/clinical/nursing-hierarchy.js', desc: 'Clinical Nursing Supervisors Hierarchy', start: 16817, end: 17042 },
  { file: 'public/js/views/clinical/head-nurse-dashboard.js', desc: 'Clinical Head Nurse Ward Dashboard', start: 17043, end: 17277 },

  // Users & Org Views
  { file: 'public/js/views/users/users-management.js', desc: 'Users Management & Role Editor', start: 13131, end: 13348 },
  { file: 'public/js/views/users/role-guide-tour.js', desc: 'Users Role Duties Guide & Interactive Tour', start: 13349, end: 13678 },
  { file: 'public/js/views/users/activities-formbuilder.js', desc: 'Users Activities Log & Dynamic FormBuilder', start: 13679, end: 13983 },
  { file: 'public/js/views/users/org-structure.js', desc: 'Users Org Structure & Divisions', start: 16667, end: 16816 }
];

console.log(`Configured ${modules.length} modules for frontend decomposition.`);

let maxLoc = 0;
let overCeiling = 0;

modules.forEach(m => {
  const code = extract(m.start, m.end);
  const fullContent = `/**\n * ${m.desc}\n * Modular Frontend Component — Project 313\n */\n${code}\n`;
  const dir = path.dirname(m.file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(m.file, fullContent, 'utf8');

  const loc = fullContent.split('\n').length;
  if (loc > maxLoc) maxLoc = loc;
  if (loc > 500) {
    console.warn(`⚠️ WARNING: ${m.file} has ${loc} LOC (> 500 ceiling)!`);
    overCeiling++;
  } else {
    console.log(`Created ${m.file} [${loc} LOC]`);
  }
});

console.log(`\nDecomposition completed! Total modules: ${modules.length}, Max LOC: ${maxLoc}, Over ceiling: ${overCeiling}`);

// Export module scripts list for index.html
const scriptTags = modules.map(m => `    <script src="/${m.file.replace('public/', '')}?v=20261006_mod"></script>`).join('\n');
fs.writeFileSync('scripts/frontend_script_tags.html', scriptTags, 'utf8');
console.log('Generated script tags written to scripts/frontend_script_tags.html');

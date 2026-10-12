const fs = require('fs');
const path = require('path');

const { execSync } = require('child_process');
const srcApi = fs.existsSync('src/routes/api.js')
  ? fs.readFileSync('src/routes/api.js', 'utf8')
  : execSync('git show HEAD:src/routes/api.js', { maxBuffer: 20 * 1024 * 1024, encoding: 'utf8' });
const lines = srcApi.split('\n');

console.log('Total lines in api.js:', lines.length);

// Helper to extract line ranges (1-indexed, inclusive)
function extract(startLine, endLine) {
  return lines.slice(startLine - 1, endLine).join('\n');
}

const candidateHelpers = [
  'crudNormalize', 'crudHasUpdatedAt',
  'TIME_RE', 'DATE_RE', 'statusYear', 'codeCmp', 'sortTree',
  'canAssignRole', 'hasPerm', 'normFa', 'matchFa', 'truthy',
  'MER_EVAL_STATUSES', 'merValidate', 'merInsert', 'originalName', 'storeUploadedFile', 'sendStoredFile',
  'LIB_CATEGORIES', 'libSectionId', 'getChecklist', 'saveChecklistMeasurers', 'chkMeasurers', 'itemHasSubmissions',
  'BSC_PERSPECTIVES', 'JMONTHS_FA', 'matchPerspective', 'currentJalaliYear', 'bscYear', 'bscData',
  'IND_ASPECTS', 'IND_TYPES', 'IND_INTERVALS', 'IND_DESIRABILITY', 'IND_VALUE_STATUS',
  'IND_TEXT_FIELDS', 'IND_NUM_FIELDS', 'IND_FLAG_FIELDS', 'indBody',
  'nrsCanManage', 'nrsCanView', 'headNurseWardsOf', 'hnAccessWard', 'hnHeadPresentToday',
  'SHIFT_STAFF_ORDER', 'SHIFT_STAFF_ORDER_W', 'SHIFT_SETTINGS_DEFAULT', 'shiftCellHours', 'daysInJalaliMonth',
  'shiftAccessUnit', 'getWardShiftSettings', 'parseHolidays',
  'docCodes', 'signatureImageFor', 'resolveRecipient', 'nrsUserOrNull',
  'FMEA_STATUSES', 'fmeaBody', 'fmeaInsert',
  'CL_ANSWER_VALUES', 'CL_ANSWER_LABELS', 'CL_NONCONFORMITY', 'isNonConformity',
  'indJudge', 'indRow'
];

function makeModuleFile(targetFile, headerComment, content) {
  const dir = path.dirname(targetFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Adjust relative paths from src/routes (depth 2) to src/modules/<domain> (depth 3)
  let adjustedContent = content
    .replace(/require\(['"]\.\.\/\.\.\/database\//g, "require('../../../database/")
    .replace(/require\(['"]\.\.\/database\//g, "require('../../../database/")
    .replace(/require\(['"]\.\.\/services\//g, "require('../../services/")
    .replace(/require\(['"]\.\.\/config\//g, "require('../../config/")
    .replace(/require\(['"]\.\.\/middleware\//g, "require('../../middleware/")
    .replace(/require\(['"]\.\.\/utils\//g, "require('../../utils/");

  const helpersToImport = candidateHelpers.filter(name => {
    const declaredRegex = new RegExp(`(?:const|let|var|function)\\s+${name}\\b`);
    return !declaredRegex.test(adjustedContent);
  });

  const code = `/**
 * ${headerComment}
 * Part of Modular Monolith (Clean Architecture) — Project 313
 */
const express = require('express');
const router = express.Router();
const common = require('../common');
const {
  query, db, authRequired, requirePermission, requireAnyPermission,
  hospitalScope, requireFeature, scopeFor, axisCodeOf, measureAllowed,
  jalaliYearRange, jalaliMonthRange, safeYear, toGregorian, toJalali,
  todayJalali, JMONTHS, tehranNow, tehranTodayStr, TEHRAN_OFFSET_MS,
  logAction, uuid, parseJSON, safeArray, buildTrackingCode,
  bcrypt, config,
  applyYearFilter, loadOverrides, evaluatePolicy,
  upload, uploadSingle, uploadMultiple, compressImage,
  path, fs, RULE_TYPES, RULE_TYPE_FA, reminderItemsFor,
  timelineFor, dismissMilestone, snoozeMilestone, setMilestoneState,
  assistantNext, assistantReview, periodProgress,
  getSmartDecisions, myWork, assistantChat,
  extractText, classifyDocument, extractFlowchart,
  ${helpersToImport.join(',\n  ')}
} = common;

// Helper to bind mountCrud to this module router
const mountCrud = (prefix, ...args) => common.mountCrud(router, prefix, ...args);

${adjustedContent}

module.exports = router;
`;

  fs.writeFileSync(targetFile, code, 'utf8');
  const lineCount = code.split('\n').length;
  console.log(`Created ${targetFile} [${lineCount} LOC]`);
  if (lineCount > 500) {
    console.warn(`⚠️ WARNING: ${targetFile} has ${lineCount} LOC (> 500 ceiling)!`);
  }
}

// 1. Core Modules
makeModuleFile('src/modules/core/dashboard.routes.js', 'Core Dashboard Routes', extract(45, 171));
makeModuleFile('src/modules/core/reports.routes.js', 'Core Audit & Mapping Routes', extract(2889, 2946));
makeModuleFile('src/modules/core/evidence-upload.routes.js', 'Core Evidence Upload & OCR Routes', extract(3065, 3239));
makeModuleFile('src/modules/core/public.routes.js', 'Core Public Survey & Complaints Routes', extract(3492, 3668));
makeModuleFile('src/modules/core/assistant-legacy.routes.js', 'Core Legacy Assistant Routes', extract(2562, 2800));

// Core index.js
fs.writeFileSync('src/modules/core/index.js', `const express = require('express');
const router = express.Router();
router.use(require('./dashboard.routes'));
router.use(require('./reports.routes'));
router.use(require('./evidence-upload.routes'));
router.use(require('./public.routes'));
router.use(require('./assistant-legacy.routes'));
module.exports = router;
`, 'utf8');

// 2. Accreditation Modules
makeModuleFile('src/modules/accreditation/tree.routes.js', 'Accreditation Tree & Status Routes', extract(172, 381));
makeModuleFile('src/modules/accreditation/corrective-actions.routes.js', 'Accreditation Corrective Actions Routes', extract(382, 629));
makeModuleFile('src/modules/accreditation/overrides.routes.js', 'Accreditation Overrides & Period Routes', extract(1974, 2268));
makeModuleFile('src/modules/accreditation/timeline.routes.js', 'Accreditation Guide Timeline Routes', extract(2508, 2561));
makeModuleFile('src/modules/accreditation/gap-analysis.routes.js', 'Accreditation Gap Analysis Routes', extract(10710, 10758));

// Accreditation index.js
fs.writeFileSync('src/modules/accreditation/index.js', `const express = require('express');
const router = express.Router();
router.use(require('./tree.routes'));
router.use(require('./corrective-actions.routes'));
router.use(require('./overrides.routes'));
router.use(require('./timeline.routes'));
router.use(require('./gap-analysis.routes'));
module.exports = router;
`, 'utf8');

// 3. Collaboration Modules
makeModuleFile('src/modules/collaboration/activities.routes.js', 'Collaboration Activity Types & Calendar Routes', extract(630, 859));
makeModuleFile('src/modules/collaboration/tasks.routes.js', 'Collaboration Tasks & Trends Routes', extract(860, 974));
makeModuleFile('src/modules/collaboration/committees.routes.js', 'Collaboration Committees Structure Routes', extract(975, 1110));
makeModuleFile('src/modules/collaboration/committee-minutes.routes.js', 'Collaboration Committee Minutes & Decisions Routes', extract(1111, 1381));
makeModuleFile('src/modules/collaboration/meetings.routes.js', 'Collaboration Committee Meetings Routes', extract(1382, 1612));
makeModuleFile('src/modules/collaboration/inbox-messages.routes.js', 'Collaboration Inbox & Messages Routes', extract(1613, 1964));
makeModuleFile('src/modules/collaboration/reminders.routes.js', 'Collaboration Reminders Routes', extract(2414, 2507));

// Collaboration index.js
fs.writeFileSync('src/modules/collaboration/index.js', `const express = require('express');
const router = express.Router();
router.use(require('./activities.routes'));
router.use(require('./tasks.routes'));
router.use(require('./committees.routes'));
router.use(require('./committee-minutes.routes'));
router.use(require('./meetings.routes'));
router.use(require('./inbox-messages.routes'));
router.use(require('./reminders.routes'));
module.exports = router;
`, 'utf8');

// 4. Documents Modules
makeModuleFile('src/modules/documents/controlled-docs.routes.js', 'Controlled Documents & Revisions Routes', extract(3669, 4067));
makeModuleFile('src/modules/documents/signatures.routes.js', 'Digital Signatures Routes', extract(4068, 4163));
makeModuleFile('src/modules/documents/library.routes.js', 'Digital Library Routes', extract(4164, 4267));
makeModuleFile('src/modules/documents/processes.routes.js', 'Processes Registry & Flowchart Routes', extract(7748, 8034));
makeModuleFile('src/modules/documents/evidence.routes.js', 'Electronic Evidence Records Routes', extract(3240, 3349));

// Documents index.js
fs.writeFileSync('src/modules/documents/index.js', `const express = require('express');
const router = express.Router();
router.use(require('./controlled-docs.routes'));
router.use(require('./signatures.routes'));
router.use(require('./library.routes'));
router.use(require('./processes.routes'));
router.use(require('./evidence.routes'));
module.exports = router;
`, 'utf8');

// 5. Quality Modules
makeModuleFile('src/modules/quality/checklists.routes.js', 'Quality Checklists Bank Routes', extract(4268, 4519));
makeModuleFile('src/modules/quality/checklists-submissions.routes.js', 'Quality Checklists Submissions & Measurers Routes', extract(4520, 4726));
makeModuleFile('src/modules/quality/certifications.routes.js', 'Quality Certifications & Badges Routes', extract(4727, 4825));
makeModuleFile('src/modules/quality/audits.routes.js', 'Quality Internal Audits Routes', extract(7337, 7454));
makeModuleFile('src/modules/quality/walkarounds.routes.js', 'Quality Management Walkarounds Routes', extract(7455, 7618));
makeModuleFile('src/modules/quality/programs.routes.js', 'Quality Improvement Programs Routes', extract(7619, 7747));
makeModuleFile('src/modules/quality/bsc.routes.js', 'Quality Balanced Scorecard (BSC) Routes', extract(8035, 8173));
makeModuleFile('src/modules/quality/indicators-part1.routes.js', 'Quality Indicators & KPIs Part 1 Routes', extract(8174, 8562));
makeModuleFile('src/modules/quality/indicators-part2.routes.js', 'Quality Indicators & KPIs Part 2 Routes', extract(8563, 8808));
makeModuleFile('src/modules/quality/fmea-errors.routes.js', 'Quality Errors, Never Events & FMEA Routes', extract(2305, 2413) + '\n' + extract(3387, 3491));

// Quality index.js
fs.writeFileSync('src/modules/quality/index.js', `const express = require('express');
const router = express.Router();
router.use(require('./checklists.routes'));
router.use(require('./checklists-submissions.routes'));
router.use(require('./certifications.routes'));
router.use(require('./audits.routes'));
router.use(require('./walkarounds.routes'));
router.use(require('./programs.routes'));
router.use(require('./bsc.routes'));
router.use(require('./indicators-part1.routes'));
router.use(require('./indicators-part2.routes'));
router.use(require('./fmea-errors.routes'));
module.exports = router;
`, 'utf8');

// 6. Clinical Modules
makeModuleFile('src/modules/clinical/nursing-hierarchy.routes.js', 'Clinical Nursing Hierarchy Routes', extract(9054, 9246));
makeModuleFile('src/modules/clinical/head-nurse.routes.js', 'Clinical Head Nurse Dashboard Routes', extract(9247, 9466));
makeModuleFile('src/modules/clinical/shift-staff.routes.js', 'Clinical Shift Staff & Units Routes', extract(9467, 9680));
makeModuleFile('src/modules/clinical/shift-schedule.routes.js', 'Clinical Shift Schedule & Plan Routes', extract(9681, 9925));
makeModuleFile('src/modules/clinical/shift-attendance.routes.js', 'Clinical Shift Attendance & Leaves Routes', extract(9926, 10310));
makeModuleFile('src/modules/clinical/training-needs.routes.js', 'Clinical Training Needs Routes', extract(10311, 10457));
makeModuleFile('src/modules/clinical/clinical-safety.routes.js', 'Clinical Safety & Safe Surgery Routes', extract(10593, 10709));

// Clinical index.js
fs.writeFileSync('src/modules/clinical/index.js', `const express = require('express');
const router = express.Router();
router.use(require('./nursing-hierarchy.routes'));
router.use(require('./head-nurse.routes'));
router.use(require('./shift-staff.routes'));
router.use(require('./shift-schedule.routes'));
router.use(require('./shift-attendance.routes'));
router.use(require('./training-needs.routes'));
router.use(require('./clinical-safety.routes'));
module.exports = router;
`, 'utf8');

// 7. Operations Modules
makeModuleFile('src/modules/operations/facility-assets.routes.js', 'Operations Facility Assets Routes', extract(4826, 5065));
makeModuleFile('src/modules/operations/pharmacy.routes.js', 'Operations Pharmacy & Drugs Routes', extract(5066, 5184) + '\n' + extract(5332, 5448));
makeModuleFile('src/modules/operations/disaster.routes.js', 'Operations Disaster Management Routes', extract(5449, 5544));
makeModuleFile('src/modules/operations/occupational-health.routes.js', 'Operations Occupational Health Routes', extract(5545, 5660));
makeModuleFile('src/modules/operations/hr-development.routes.js', 'Operations HR Development Routes', extract(5661, 5904));
makeModuleFile('src/modules/operations/vendors.routes.js', 'Operations Vendors & Contractors Routes', extract(5905, 6024));
makeModuleFile('src/modules/operations/nursing-supervision.routes.js', 'Operations Nursing Supervision Routes', extract(6025, 6128));
makeModuleFile('src/modules/operations/finance.routes.js', 'Operations Finance & Donations Routes', extract(6129, 6324));
makeModuleFile('src/modules/operations/education.routes.js', 'Operations Education & Effectiveness Routes', extract(6325, 6433));
makeModuleFile('src/modules/operations/patient-focus.routes.js', 'Operations Patient Focus & Readmissions Routes', extract(6434, 6551));
makeModuleFile('src/modules/operations/infection-control.routes.js', 'Operations Infection Control Routes', extract(6552, 6677));
makeModuleFile('src/modules/operations/blood-transfusion.routes.js', 'Operations Blood Transfusion Routes', extract(6678, 6947));
makeModuleFile('src/modules/operations/laboratory.routes.js', 'Operations Laboratory Services Routes', extract(6948, 7173));
makeModuleFile('src/modules/operations/imaging.routes.js', 'Operations Imaging Services Routes', extract(7174, 7336));
makeModuleFile('src/modules/operations/crm.routes.js', 'Operations Healthcare CRM Routes', extract(10458, 10592));

// Operations index.js
fs.writeFileSync('src/modules/operations/index.js', `const express = require('express');
const router = express.Router();
router.use(require('./facility-assets.routes'));
router.use(require('./pharmacy.routes'));
router.use(require('./disaster.routes'));
router.use(require('./occupational-health.routes'));
router.use(require('./hr-development.routes'));
router.use(require('./vendors.routes'));
router.use(require('./nursing-supervision.routes'));
router.use(require('./finance.routes'));
router.use(require('./education.routes'));
router.use(require('./patient-focus.routes'));
router.use(require('./infection-control.routes'));
router.use(require('./blood-transfusion.routes'));
router.use(require('./laboratory.routes'));
router.use(require('./imaging.routes'));
router.use(require('./crm.routes'));
module.exports = router;
`, 'utf8');

// 8. Users Modules
makeModuleFile('src/modules/users/users-management.routes.js', 'Users Management Routes', extract(1965, 1973) + '\n' + extract(3350, 3386));
makeModuleFile('src/modules/users/roles-suggestions.routes.js', 'Users Roles & Suggestions Routes', extract(2269, 2304));
makeModuleFile('src/modules/users/profile.routes.js', 'Users Personal Profile Routes', extract(3010, 3239));
makeModuleFile('src/modules/users/hospital-profile.routes.js', 'Users Hospital Profile Routes', extract(2801, 2888));
makeModuleFile('src/modules/users/org-structure.routes.js', 'Users Org Structure & Divisions Routes', extract(8809, 9053));

// Users index.js
fs.writeFileSync('src/modules/users/index.js', `const express = require('express');
const router = express.Router();
router.use(require('./users-management.routes'));
router.use(require('./roles-suggestions.routes'));
router.use(require('./profile.routes'));
router.use(require('./hospital-profile.routes'));
router.use(require('./org-structure.routes'));
module.exports = router;
`, 'utf8');

console.log('✅ ALL DOMAIN MODULES GENERATED SUCCESSFULLY!');

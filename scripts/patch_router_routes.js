const fs = require('fs');
const path = require('path');

// 1. Check core-router-routes.js to grab the missing tail if needed
const coreFile = path.join(__dirname, '../public/js/core/core-router-routes.js');
const modFile = path.join(__dirname, '../public/js/core/08-router-routes.js');

let coreContent = fs.readFileSync(coreFile, 'utf8');
let modContent = fs.readFileSync(modFile, 'utf8');

// Ensure modContent has toggleSidebarOrCollapse and go()
if (!modContent.includes('function go(p, opts')) {
  const tailStart = coreContent.indexOf('function toggleSidebarOrCollapse()');
  if (tailStart !== -1) {
    const tail = coreContent.slice(tailStart);
    modContent += '\n' + tail;
    console.log('Appended missing go() and toggleSidebarOrCollapse to 08-router-routes.js');
  }
}

// Helper to patch router files
function patchFile(filePath, isCore) {
  let code = fs.readFileSync(filePath, 'utf8');

  // A. Add indicator_slides to navGroups
  if (!code.includes("'indicator_slides'")) {
    const targetNav = "{k:'acc',        i:ic('clipboard'), t:'اعتباربخشی'},";
    const replaceNav = `{k:'acc',        i:ic('clipboard'), t:'اعتباربخشی'},
      ...(S.user && ['admin', 'nursing_director', 'hospital_president', 'quality_control_manager', 'accreditation_manager', 'clinical_supervisor', 'education_supervisor', 'infection_control_supervisor', 'head_nurse', 'superadmin'].includes(S.user.role_code) || (typeof canViewIndicators === 'function' && canViewIndicators()) ? [{k:'indicator_slides', i:ic('chart'), t:'داشبورد اسلایدی شاخص‌ها'}] : []),`;
    if (code.includes(targetNav)) {
      code = code.replace(targetNav, replaceNav);
      console.log(`Added indicator_slides to navGroups in ${path.basename(filePath)}`);
    }
  }

  // B. Add indicator_slides to dispatch map
  if (!code.includes("indicator_slides:(typeof renderIndicatorSlidesView")) {
    const targetMap = "outpatient:(typeof renderOutpatientHub==='function'?renderOutpatientHub:renderDash),";
    const replaceMap = `outpatient:(typeof renderOutpatientHub==='function'?renderOutpatientHub:renderDash),
    indicator_slides:(typeof renderIndicatorSlidesView==='function'?renderIndicatorSlidesView:renderDash),`;
    if (code.includes(targetMap)) {
      code = code.replace(targetMap, replaceMap);
      console.log(`Added indicator_slides to dispatcher in ${path.basename(filePath)}`);
    }
  }

  fs.writeFileSync(filePath, code, 'utf8');
}

patchFile(coreFile, true);
patchFile(modFile, false);

console.log('Router routes patch completed successfully!');

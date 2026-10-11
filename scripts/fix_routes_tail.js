const fs = require('fs');
const path = require('path');

const coreFile = path.join(__dirname, '../public/js/core/core-router-routes.js');
const modFile = path.join(__dirname, '../public/js/core/08-router-routes.js');

const coreContent = fs.readFileSync(coreFile, 'utf8');
let modContent = fs.readFileSync(modFile, 'utf8');

const tailMarker = 'function toggleSidebarOrCollapse()';
const tailIdx = coreContent.indexOf(tailMarker);
if (tailIdx !== -1) {
  const tail = coreContent.slice(tailIdx);
  if (!modContent.includes(tailMarker)) {
    modContent = modContent.trim() + '\r\n\r\n' + tail;
    fs.writeFileSync(modFile, modContent, 'utf8');
    console.log('Appended tail to 08-router-routes.js');
  }
}

// Now verify both files
[coreFile, modFile].forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  if (!c.includes('indicator_slides:(typeof renderIndicatorSlidesView')) {
    c = c.replace(
      'outpatient:(typeof renderOutpatientHub===\'function\'?renderOutpatientHub:renderDash),',
      'outpatient:(typeof renderOutpatientHub===\'function\'?renderOutpatientHub:renderDash),\r\n    indicator_slides:(typeof renderIndicatorSlidesView===\'function\'?renderIndicatorSlidesView:renderDash),'
    );
    fs.writeFileSync(f, c, 'utf8');
    console.log('Added indicator_slides dispatch to', path.basename(f));
  }
});

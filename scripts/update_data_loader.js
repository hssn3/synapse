const fs = require('fs');
const path = require('path');

['06-data-loader.js', 'core-data-loader.js'].forEach(fname => {
  const file = path.join(__dirname, '../public/js/core', fname);
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes("'indicator_slides'")) {
      content = content.replace(
        "'indicators',",
        "'indicators', 'indicator_slides',"
      );
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Updated ${fname}`);
    } else {
      console.log(`${fname} already has indicator_slides`);
    }
  }
});

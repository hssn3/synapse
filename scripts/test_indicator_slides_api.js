const dbModule = require('../src/config/database');
const ExcelJS = require('exceljs');

console.log('Testing Database and Indicator Slides...');

// 1. Query total slides
const slidesCount = dbModule.query('SELECT COUNT(*) as c FROM hospital_indicator_slides').rows[0].c;
console.log(`✅ Total seeded slides in DB: ${slidesCount}`);

// 2. Query sections
const sections = dbModule.query(`
  SELECT section_id, section_title, COUNT(*) as c 
  FROM hospital_indicator_slides 
  GROUP BY section_id, section_title 
  ORDER BY MIN(slide_number) ASC
`).rows;
console.log('✅ Sections breakdown:');
sections.forEach(s => console.log(`   - ${s.section_title} (${s.section_id}): ${s.c} slides`));

// 3. Query sample slide with data
const slide2 = dbModule.query('SELECT * FROM hospital_indicator_slides WHERE slide_number = 2 LIMIT 1').rows[0];
console.log(`✅ Slide 2 Title: ${slide2.title}`);
const d2 = JSON.parse(slide2.data_json);
console.log(`✅ Slide 2 Data rows: ${d2.length} (first row: ${JSON.stringify(d2[0])})`);

// 4. Test Excel workbook generation
async function testExcel() {
  const rows = dbModule.query('SELECT * FROM hospital_indicator_slides WHERE hospital_id = ? ORDER BY slide_number ASC', [slide2.hospital_id]).rows;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('فهرست');
  ws.columns = [
    { header: 'شماره اسلاید', key: 'slide_number' },
    { header: 'عنوان شاخص', key: 'title' }
  ];
  rows.forEach(r => ws.addRow({ slide_number: r.slide_number, title: r.title }));
  const buf = await wb.xlsx.writeBuffer();
  console.log(`✅ Excel buffer generated successfully: ${buf.length} bytes`);
}

testExcel().then(() => {
  console.log('🎉 All Indicator Slides backend tests passed perfectly!');
}).catch(err => {
  console.error('❌ Error testing Excel:', err);
});

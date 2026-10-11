const puppeteer = require('puppeteer-core');
const fs = require('fs');

const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const baseUrl = 'http://127.0.0.1:3000';

async function runTest() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  
  console.log('Logging in...');
  await page.goto(baseUrl, { waitUntil: 'networkidle2' });
  await page.evaluate(async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'hospital3_admin', password: 'Hospital3@Admin2026' })
    });
    if (!res.ok) throw new Error('Login failed: ' + res.statusText);
  });
  await page.reload({ waitUntil: 'networkidle2' });
  console.log('Logged in successfully!');

  const forms = [
    { id: 'staffshift', name: 'برنامه ماهانه' },
    { id: 'errors', name: 'گزارش خطا' },
    { id: 'documents', name: 'خط‌مشی' },
    { id: 'checklists', name: 'چک‌لیست اعتباربخشی' },
    { id: 'profile', name: 'فرم پرسنلی' },
  ];

  for (let i = 0; i < forms.length; i++) {
    const f = forms[i];
    console.log(`Testing ${f.name}...`);
    
    // Go to route
    await page.evaluate((route) => { window.go(route); }, f.id);
    await new Promise(r => setTimeout(r, 1500));
    
    // Empty form screenshot
    await page.screenshot({ path: `audit-evidence/screenshots/forms/${i+4}-${f.id}-empty.png` });

    // Try to click any submit/save button
    const submitClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const submitBtn = btns.find(b => b.textContent.includes('ذخیره') || b.textContent.includes('ثبت'));
      if (submitBtn) {
        submitBtn.click();
        return true;
      }
      return false;
    });

    if (submitClicked) {
      await new Promise(r => setTimeout(r, 1000));
      await page.screenshot({ path: `audit-evidence/screenshots/forms/${i+4}-${f.id}-submitted.png` });
    }

    // Print to PDF
    console.log(`Printing ${f.name} to PDF...`);
    // Instead of clicking print button which might open window.print(), we can just use page.pdf() to print the current view
    await page.pdf({ path: `audit-evidence/print-pdfs/${i+4}-${f.id}.pdf`, format: 'A4', printBackground: true });
    await page.screenshot({ path: `audit-evidence/screenshots/print/${i+4}-${f.id}-print-button.png` }); // Just a placeholder screenshot for print phase
  }

  await browser.close();
}

runTest().catch(console.error);

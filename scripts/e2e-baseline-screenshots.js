const puppeteer = require('puppeteer-core');

const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const baseUrl = 'http://127.0.0.1:3000';

async function takeScreenshots() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  
  // 1. Login
  await page.goto(baseUrl, { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'audit-evidence/ui-redesign/before/01-login.png', fullPage: true });

  // Login as admin
  await page.evaluate(async () => {
    await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'hospital3_admin', password: 'Hospital3@Admin2026' })
    });
  });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  // 2. Dashboard
  await page.screenshot({ path: 'audit-evidence/ui-redesign/before/02-dashboard.png', fullPage: true });

  // 3. Accreditation
  await page.evaluate(() => { window.go('acc'); });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'audit-evidence/ui-redesign/before/03-accreditation.png', fullPage: true });

  // 4. Monthly Program Form (staffshift)
  await page.evaluate(() => { window.go('staffshift'); });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'audit-evidence/ui-redesign/before/04-form-monthly.png', fullPage: true });

  // 5. Error Report Form
  await page.evaluate(() => { window.go('errors'); });
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(() => { if (window.newErrorReport) window.newErrorReport(); });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'audit-evidence/ui-redesign/before/05-form-error.png', fullPage: true });

  // 6. Checklist Form
  await page.evaluate(() => { window.go('checklists'); });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'audit-evidence/ui-redesign/before/06-form-checklist.png', fullPage: true });

  // 7. Admin Panel
  await page.evaluate(() => { window.go('settings'); });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'audit-evidence/ui-redesign/before/07-admin.png', fullPage: true });

  // 8. AI Assistant
  await page.evaluate(() => { window.go('dash'); });
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(() => { const btn = document.getElementById('ent-assistant-trigger'); if (btn) btn.click(); });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'audit-evidence/ui-redesign/before/08-assistant.png', fullPage: true });

  console.log('Baseline screenshots taken successfully.');
  await browser.close();
}

takeScreenshots().catch(console.error);

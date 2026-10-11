const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

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
  
  const consoleLogs = [];
  const networkLogs = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleLogs.push(`[ERROR] ${msg.text()}`);
    } else {
      consoleLogs.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });

  page.on('response', response => {
    const status = response.status();
    if (status >= 400) {
      networkLogs.push(`[${status}] ${response.url()}`);
    }
  });

  console.log('Navigating to landing page...');
  await page.goto(baseUrl, { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'audit-evidence/screenshots/00-landing.png' });

  console.log('Logging in...');
  await page.evaluate(async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'hospital3_admin', password: 'Hospital3@Admin2026' })
    });
    if (!res.ok) throw new Error('Login failed: ' + res.statusText);
  });
  
  await page.reload({ waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'audit-evidence/screenshots/00-logged-in.png' });
  console.log('Logged in successfully!');

  // Save logs
  fs.writeFileSync('audit-evidence/console-logs/00-login.txt', consoleLogs.join('\n'));
  fs.writeFileSync('audit-evidence/network-logs/00-login.txt', networkLogs.join('\n'));

  // Phase 3: Form Builder Test
  console.log('Testing Form Builder...');
  await page.evaluate(() => { window.renderFormBuilder(); });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'audit-evidence/screenshots/forms/01-builder-landed.png' });

  // Add fields
  await page.type('#fb_title', 'فرم تست خودکار - Gemini');
  const fieldTypes = ['text', 'number', 'jalali-date', 'select', 'textarea', 'checkbox'];
  for (let i = 0; i < fieldTypes.length; i++) {
    await page.evaluate((type) => { window.fbAddField(type); }, fieldTypes[i]);
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: `audit-evidence/screenshots/forms/02-add-field-${i + 1}.png` });
  }

  // Handle alert
  page.on('dialog', async dialog => {
    console.log('Dialog:', dialog.message());
    await dialog.accept();
  });

  // Save form
  await page.evaluate(() => { window.fbSaveForm(); });
  await new Promise(r => setTimeout(r, 1000));
  
  await page.screenshot({ path: 'audit-evidence/screenshots/forms/03-form-saved.png' });

  // Wait a bit to ensure network response is captured
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
}

runTest().catch(console.error);

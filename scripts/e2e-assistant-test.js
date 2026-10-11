const puppeteer = require('puppeteer-core');

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
  
  // Go to an error form
  console.log('Navigating to errors and opening form...');
  await page.evaluate(() => { window.go('errors'); });
  await new Promise(r => setTimeout(r, 1000));
  await page.evaluate(() => { window.newErrorReport(); });
  await new Promise(r => setTimeout(r, 1000));
  
  // Open assistant panel
  console.log('Opening Assistant...');
  await page.evaluate(() => { document.getElementById('ent-assistant-trigger').click(); });
  await new Promise(r => setTimeout(r, 1000));

  // Type in the assistant
  console.log('Typing message...');
  await page.type('#drawer-input', 'برای این فرم کمک کن');
  await page.click('#drawer-send-btn');
  
  await new Promise(r => setTimeout(r, 3000)); // wait for bot reply

  await page.screenshot({ path: 'audit-evidence/screenshots/assistant-context-aware.png' });
  console.log('Screenshot saved!');
  await browser.close();
}

runTest().catch(console.error);

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
  
  console.log('Logging in as Head Nurse (ICU)...');
  await page.goto(baseUrl, { waitUntil: 'networkidle2' });
  await page.evaluate(async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'h3.wh.gtzmf4', password: 'Demo@2026' })
    });
    if (!res.ok) throw new Error('Login failed: ' + res.statusText);
  });
  
  await page.reload({ waitUntil: 'networkidle2' });
  console.log('Logged in successfully!');
  await new Promise(r => setTimeout(r, 2000));

  console.log('Navigating to staffshift...');
  await page.evaluate(() => { window.go('staffshift'); });
  await new Promise(r => setTimeout(r, 2000));
  
  await page.screenshot({ path: 'audit-evidence/screenshots/head-nurse-staffshift.png' });

  // Extract visible tabs
  const tabs = await page.evaluate(() => {
    // Collect specific text that indicates which ward is loaded
    const headers = Array.from(document.querySelectorAll('h1, h2, h3, .wd-title, .wtitle, .sec-h')).map(e => e.textContent.trim());
    // Find all ward switching buttons
    const wardButtons = Array.from(document.querySelectorAll('.tgl, .wd-btn, .wlist button, .tabs button')).map(e => e.textContent.trim());
    return { headers, wardButtons };
  });

  console.log('Visible Tabs in staffshift:');
  console.log(tabs);

  await browser.close();
}

runTest().catch(console.error);

const puppeteer = require('puppeteer-core');

const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const baseUrl = 'http://127.0.0.1:3000';

async function checkConsole() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto(baseUrl, { waitUntil: 'networkidle2' });

  // Login as admin
  await page.evaluate(async () => {
    await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'hospital3_admin', password: 'Hospital3@Admin2026' })
    });
  });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  // check if app is rendered
  const html = await page.evaluate(() => document.body.innerHTML.substring(0, 500));
  console.log("HTML START:", html);

  await browser.close();
}

checkConsole().catch(console.error);

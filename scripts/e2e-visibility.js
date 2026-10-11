const puppeteer = require('puppeteer-core');

const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const baseUrl = 'http://127.0.0.1:3000';

async function debugVisibility() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle2' });

  await page.evaluate(async () => {
    await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'hospital3_admin', password: 'Hospital3@Admin2026' })
    });
  });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  const styles = await page.evaluate(() => {
    const el = document.querySelector('#content');
    const style = window.getComputedStyle(el);
    return {
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      color: style.color,
      background: style.backgroundColor,
      zIndex: style.zIndex
    };
  });
  
  console.log("STYLES:", styles);
  await browser.close();
}

debugVisibility().catch(console.error);

const puppeteer = require('puppeteer-core');

const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const baseUrl = 'http://127.0.0.1:3000';

async function checkLayout() {
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
  
  const rects = await page.evaluate(() => {
    const getRect = selector => {
      const el = document.querySelector(selector);
      return el ? el.getBoundingClientRect().toJSON() : null;
    };
    return {
      body: getRect('body'),
      root: getRect('#root'),
      app: getRect('#app'),
      side: getRect('#side'),
      main: getRect('.main'),
      content: getRect('#content')
    };
  });
  
  console.log("RECTS:", JSON.stringify(rects, null, 2));

  await browser.close();
}

checkLayout().catch(console.error);

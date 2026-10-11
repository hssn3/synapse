const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const baseUrl = 'http://127.0.0.1:3000';
const artifactDir = 'C:\\Users\\NvDAdmin\\.gemini\\antigravity\\brain\\d070149b-5b32-47ef-a2e9-e8466deb24a5';

if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true });
}

async function capture() {
  console.log('[Puppeteer] Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    defaultViewport: { width: 1440, height: 950 },
    args: ['--no-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();

  // Log console messages from browser
  page.on('console', msg => console.log('[Browser Console]', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('[Browser PageError]', err.message));

  console.log('[Puppeteer] Navigating to login...');
  await page.goto(baseUrl, { waitUntil: 'networkidle2' });

  // 1. Perform login as nursing_director
  console.log('[Puppeteer] Logging in as h3.nursing_director...');
  const loginResult = await page.evaluate(async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'h3.nursing_director', password: 'Demo@2026' })
    });
    return res.json();
  });
  console.log('[Puppeteer] Login result:', loginResult.user ? loginResult.user.username : loginResult);

  // Reload page so app boots logged in
  await page.goto(baseUrl, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Screenshot 1: Main Dashboard showing Right Sidebar Menu with «شاخص‌ها»
  console.log('[Puppeteer] Screenshot 1: Dashboard with right menu...');
  const screen1Path = path.join(artifactDir, '01_sidebar_menu_indicators.png');
  await page.screenshot({ path: screen1Path, fullPage: false });
  console.log('Saved:', screen1Path);

  // Screenshot 2: Click on «شاخص‌ها» (or go('indicator_slides'))
  console.log('[Puppeteer] Navigating to indicator_slides...');
  await page.evaluate(() => {
    window.go('indicator_slides');
  });
  await page.waitForFunction(() => {
    return window.ISLIDE_STATE && window.ISLIDE_STATE.slides && window.ISLIDE_STATE.slides.length > 0;
  }, { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));

  const screen2Path = path.join(artifactDir, '02_indicators_executive_overview.png');
  await page.screenshot({ path: screen2Path, fullPage: false });
  console.log('Saved:', screen2Path);

  // Screenshot 3: Slide 2 (Admission chart & table)
  console.log('[Puppeteer] Jumping to Slide 2...');
  await page.evaluate(() => {
    if (window.jumpToSlideByNumber) window.jumpToSlideByNumber(2);
  });
  await new Promise(r => setTimeout(r, 1500));

  const screen3Path = path.join(artifactDir, '03_slide_02_admissions.png');
  await page.screenshot({ path: screen3Path, fullPage: false });
  console.log('Saved:', screen3Path);

  // Screenshot 4: Slide 20 (Surgical procedures)
  console.log('[Puppeteer] Jumping to Slide 20...');
  await page.evaluate(() => {
    if (window.jumpToSlideByNumber) window.jumpToSlideByNumber(20);
  });
  await new Promise(r => setTimeout(r, 1500));

  const screen4Path = path.join(artifactDir, '04_slide_20_surgeries.png');
  await page.screenshot({ path: screen4Path, fullPage: false });
  console.log('Saved:', screen4Path);

  // Screenshot 5: Slide 42 (Nursing Documentation)
  console.log('[Puppeteer] Jumping to Slide 42...');
  await page.evaluate(() => {
    if (window.jumpToSlideByNumber) window.jumpToSlideByNumber(42);
  });
  await new Promise(r => setTimeout(r, 1500));

  const screen5Path = path.join(artifactDir, '05_slide_42_nursing.png');
  await page.screenshot({ path: screen5Path, fullPage: false });
  console.log('Saved:', screen5Path);

  // Screenshot 6: Grid View (All 76 slides)
  console.log('[Puppeteer] Switching to Grid View...');
  await page.evaluate(() => {
    if (window.setSlideViewMode) window.setSlideViewMode('grid');
  });
  await new Promise(r => setTimeout(r, 1500));

  const screen6Path = path.join(artifactDir, '06_all_76_slides_grid.png');
  await page.screenshot({ path: screen6Path, fullPage: false });
  console.log('Saved:', screen6Path);

  // Screenshot 7: Excel Data Entry Tool
  console.log('[Puppeteer] Switching to Editor View...');
  await page.evaluate(() => {
    if (window.setSlideViewMode) window.setSlideViewMode('editor');
  });
  await new Promise(r => setTimeout(r, 1500));

  const screen7Path = path.join(artifactDir, '07_excel_data_entry_tool.png');
  await page.screenshot({ path: screen7Path, fullPage: false });
  console.log('Saved:', screen7Path);

  await browser.close();
  console.log('[Puppeteer] Done capturing all screenshots!');
}

capture().catch(err => {
  console.error('[Puppeteer Error]', err);
  process.exit(1);
});

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
  
  console.log('Logging in as Nursing Director...');
  await page.goto(baseUrl, { waitUntil: 'networkidle2' });
  await page.evaluate(async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'h3.nursing_director', password: 'Demo@2026' })
    });
    if (!res.ok) throw new Error('Login failed: ' + res.statusText);
  });
  
  await page.reload({ waitUntil: 'networkidle2' });
  console.log('Logged in successfully!');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'audit-evidence/screenshots/nurse-dir-01-dashboard.png' });

  // Get available modules from the sidebar / dashboard
  const features = await page.evaluate(() => {
    const featureList = [];
    
    // Look at navigation items
    const navItems = document.querySelectorAll('.nitem');
    navItems.forEach(n => {
      const text = n.textContent.trim();
      if (text && !featureList.includes(text)) featureList.push('Menu: ' + text);
    });

    // Look at dashboard cards
    const cards = document.querySelectorAll('.ccard, .dcard, .roleband-t');
    cards.forEach(c => {
      const title = c.querySelector('h3, .ctt') ? c.querySelector('h3, .ctt').textContent.trim() : c.textContent.trim();
      if (title && !featureList.includes(title)) featureList.push('Dashboard Card: ' + title);
    });

    return featureList;
  });

  fs.writeFileSync('audit-evidence/nurse-dir-features.txt', features.join('\n'));
  console.log('Features extracted:', features.length);

  // Now, let's navigate to the main modules and take a screenshot of each
  // We'll extract `data-p` from visible `.nitem`s and visit a few key ones.
  const routes = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.nitem[data-p]')).map(n => n.getAttribute('data-p'));
  });

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    console.log(`Navigating to ${route}...`);
    await page.evaluate((r) => { window.go(r); }, route);
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: `audit-evidence/screenshots/nurse-dir-02-${route}.png` });
    
    // Check if there are specific action buttons in this view
    const actions = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button.btn'))
        .filter(b => b.offsetWidth > 0 && b.offsetHeight > 0) // only visible
        .map(b => b.textContent.trim())
        .filter(t => t.length > 0);
    });
    fs.appendFileSync('audit-evidence/nurse-dir-features.txt', `\n--- Route: ${route} Actions ---\n` + actions.join('\n') + '\n');
  }

  await browser.close();
}

runTest().catch(console.error);

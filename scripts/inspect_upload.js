const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function main() {
  const edgePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  const executablePath = edgePaths.find(p => fs.existsSync(p));
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  const imgPath = 'file:///' + path.resolve('C:/Users/NvDAdmin/.gemini/antigravity/brain/e87c4fd0-63b2-413c-8247-c9cb9422468c/.user_uploaded/media_1789644986121.png').replace(/\\/g, '/');
  
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto(imgPath);
  await new Promise(r => setTimeout(r, 1000));
  
  const size = await page.evaluate(() => {
    const img = document.querySelector('img');
    return { width: img.naturalWidth, height: img.naturalHeight };
  });
  console.log('Image dimensions:', size);

  // We can render the image at native width and take several slices
  const sliceHeight = 800;
  await page.setViewport({ width: size.width, height: sliceHeight, deviceScaleFactor: 1 });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:0;background:#000;">
        <img id="myimg" src="${imgPath}" style="display:block;width:${size.width}px;height:${size.height}px;" />
      </body>
    </html>
  `);
  await new Promise(r => setTimeout(r, 500));

  // پوشه‌ی docs ممکن است جابه‌جا یا حذف شده باشد — در صورت لزوم خودمان می‌سازیم تا اسکرین‌شات خطا ندهد
  fs.mkdirSync(path.join(__dirname, '..', 'docs', 'ui_verify'), { recursive: true });

  for (let i = 0; i < 4; i++) {
    const y = i * sliceHeight;
    await page.screenshot({
      path: `docs/ui_verify/slice_${i}.png`,
      clip: { x: 0, y: y, width: size.width, height: Math.min(sliceHeight, size.height - y) }
    });
    console.log(`Saved slice_${i}.png (y: ${y})`);
  }

  await browser.close();
  console.log('Done inspecting');
}

main().catch(console.error);

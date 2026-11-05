const path = require('path');
const puppeteer = require(path.resolve(__dirname, '../frontend/node_modules/puppeteer-core'));
const fs = require('fs');

const BRAVE_PATH = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
const OUT_DIR = '/Users/apple/.gemini/antigravity/brain/fe779c64-c178-4bec-87f1-4ac1b290aef4';

async function capture() {
  console.log('Launching browser to capture help page...');
  const browser = await puppeteer.launch({
    executablePath: BRAVE_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--user-data-dir=/tmp/brave-temp-profile-' + Date.now(),
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1280,1000'
    ],
    defaultViewport: { width: 1280, height: 1000 },
  });

  const page = await browser.newPage();
  
  try {
    const tabs = ['faq', 'triage', 'fees', 'glossary', 'helpline'];
    for (const tab of tabs) {
      const url = `http://localhost:5175/bn/help?section=${tab}`;
      console.log(`Navigating to ${url}...`);
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
      await new Promise(r => setTimeout(r, 600));
      
      const screenshotPath = path.join(OUT_DIR, `help_page_${tab}_visual.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`SUCCESS: Captured ${screenshotPath}`);
    }
  } catch (err) {
    console.error('Error capturing screenshot:', err);
  } finally {
    await browser.close();
  }
}

capture();

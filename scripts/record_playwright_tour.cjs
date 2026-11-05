/**
 * BhumiShield (ভূমি সুরক্ষা) — Automated UI Screen Recording Tour
 * Uses Playwright / Chromium to navigate all key features and record high-res video.
 *
 * To run:
 *   npx playwright install chromium (if not already installed)
 *   node scripts/record_playwright_tour.cjs
 */

const fs = require('fs');
const path = require('path');

async function run() {
  let playwright;
  try {
    playwright = require('playwright');
  } catch (e) {
    try {
      playwright = require('@playwright/test');
    } catch (err) {
      console.log('Playwright not directly imported. Trying npx playwright runner...');
    }
  }

  const BASE_URL = process.env.BASE_URL || 'http://localhost:5175';
  const RECORD_DIR = path.resolve(__dirname, '../output/recordings');
  if (!fs.existsSync(RECORD_DIR)) {
    fs.mkdirSync(RECORD_DIR, { recursive: true });
  }

  console.log(`Starting automated tour against: ${BASE_URL}`);
  console.log(`Recordings will be saved to: ${RECORD_DIR}`);

  const browser = await (playwright.chromium).launch({
    headless: process.env.HEADLESS !== 'false',
    // Fall back to Brave Browser if local chromium is missing
    executablePath: fs.existsSync('/Applications/Brave Browser.app/Contents/MacOS/Brave Browser')
      ? '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'
      : undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    recordVideo: {
      dir: RECORD_DIR,
      size: { width: 1920, height: 1080 }
    },
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    // 1. Landing Page
    console.log('1. Navigating to Landing Page...');
    await page.goto(`${BASE_URL}/bn`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.scrollBy({ top: 600, behavior: 'smooth' }));
    await page.waitForTimeout(2500);
    await page.evaluate(() => window.scrollBy({ top: 600, behavior: 'smooth' }));
    await page.waitForTimeout(2500);

    // 2. Check Before Buy Page
    console.log('2. Navigating to Check Before Buy...');
    await page.goto(`${BASE_URL}/bn/check`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const demoBtn = await page.$('button:has-text("ডেমো"), button:has-text("নমুনা"), button:has-text("Sample")');
    if (demoBtn) {
      await demoBtn.click();
      await page.waitForTimeout(1000);
    }
    const checkBtn = await page.$('button:has-text("যাচাই করুন"), button:has-text("Check"), button[type="submit"]');
    if (checkBtn) {
      await checkBtn.click();
    }
    await page.waitForTimeout(4000);

    // 3. Cadastral Map
    console.log('3. Navigating to Cadastral Map...');
    await page.goto(`${BASE_URL}/bn/map`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);

    // 4. Verify Deed QR
    console.log('4. Navigating to Deed Verification...');
    await page.goto(`${BASE_URL}/bn/verify`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const verifyBtn = await page.$('button:has-text("যাচাই"), button:has-text("Verify")');
    if (verifyBtn) {
      await verifyBtn.click();
    }
    await page.waitForTimeout(3500);

    // 5. Auth / Persona Switcher
    console.log('5. Navigating to 1-Click Persona Login...');
    await page.goto(`${BASE_URL}/bn/auth`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 6. Sub-Registrar Workspace
    console.log('6. Navigating to Sub-Registrar Workspace...');
    await page.goto(`${BASE_URL}/bn/registrar`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3500);

    // 7. AC Land Workspace
    console.log('7. Navigating to AC Land Workspace...');
    await page.goto(`${BASE_URL}/bn/acland`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3500);

    // 8. Bank Officer Workspace
    console.log('8. Navigating to Bank Officer Workspace...');
    await page.goto(`${BASE_URL}/bn/bank`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3500);

    // 9. Admin Dashboard
    console.log('9. Navigating to Admin Dashboard...');
    await page.goto(`${BASE_URL}/bn/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3500);

    // 10. Citizen Vault
    console.log('10. Navigating to Citizen Vault...');
    await page.goto(`${BASE_URL}/bn/home`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);

    console.log('Tour completed successfully!');
  } catch (err) {
    console.error('Error during tour:', err);
  } finally {
    await page.close();
    await context.close();
    await browser.close();
    console.log('Browser closed. Video saved in:', RECORD_DIR);
  }
}

run().catch(console.error);

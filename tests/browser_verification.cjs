const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const BRAVE_PATH = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
const EVIDENCE_DIR = path.resolve(__dirname, '../docs/audit-evidence-2026-10-17');

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeClick(page, element) {
  if (!element) return;
  await page.evaluate((el) => {
    el.scrollIntoView({ behavior: 'instant', block: 'center' });
    el.click();
  }, element);
}

async function run() {
  console.log('Launching Brave Browser in headless mode...');
  const browser = await puppeteer.launch({
    executablePath: BRAVE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900'],
    defaultViewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();

  try {
    // 00. Landing Page
    console.log('Testing 00. Landing Page...');
    await page.goto('http://localhost:5175/?tab=landing', { waitUntil: 'networkidle0' });
    await sleep(1000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '00_landing_page.png') });
    console.log('Saved 00_landing_page.png');

    // 01. Check Before Buy Page & Certificate Modal
    console.log('Testing 01. Check Before Buy...');
    await page.goto('http://localhost:5175/?tab=check', { waitUntil: 'networkidle0' });
    await sleep(1500);

    // Click verify button
    const verifyButtons = await page.$$('button');
    for (const btn of verifyButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('যাচাই শুরু করুন') || text.includes('Start Verification') || text.includes('যাচাই করুন')) {
        await safeClick(page, btn);
        break;
      }
    }
    await sleep(2000);

    // Look for certificate button
    const certButtons = await page.$$('button');
    for (const btn of certButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('সনদ') || text.includes('Certificate')) {
        await safeClick(page, btn);
        break;
      }
    }
    await sleep(1000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '01_check_before_buy.png') });
    console.log('Saved 01_check_before_buy.png');

    // Press Escape to close modal
    await page.keyboard.press('Escape');
    await sleep(500);

    // 02. Citizen Land Vault & Deed Proof Modal
    console.log('Testing 02. Citizen Vault...');
    await page.goto('http://localhost:5175/?tab=home', { waitUntil: 'networkidle0' });
    await sleep(1500);

    // Click demo preset profile Rafiqul Islam
    const presetButtons = await page.$$('button');
    for (const btn of presetButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('রফিকুল ইসলাম') || text.includes('Rafiqul Islam')) {
        await safeClick(page, btn);
        break;
      }
    }
    await sleep(1500);

    // Click Deed QR / proof button
    const allBtns = await page.$$('button');
    for (const btn of allBtns) {
      const title = await page.evaluate(el => el.getAttribute('title') || '', btn);
      if (title.includes('QR') || title.includes('Proof') || title.includes('প্রমাণ')) {
        await safeClick(page, btn);
        break;
      }
    }
    await sleep(1500);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '02_citizen_vault_deed_modal.png') });
    console.log('Saved 02_citizen_vault_deed_modal.png');
    await page.keyboard.press('Escape');
    await sleep(500);

    // 03. Sub-Registrar Fees & Challan
    console.log('Testing 03. Sub-Registrar Console...');
    await page.goto('http://localhost:5175/?tab=registrar', { waitUntil: 'networkidle0' });
    await sleep(1500);

    // Switch role if needed
    const regRoleBtns = await page.$$('button');
    for (const btn of regRoleBtns) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('সাব-রেজিস্ট্রার প্যানেলে প্রবেশ') || text.includes('Activate Sub-Registrar')) {
        await safeClick(page, btn);
        break;
      }
    }
    await sleep(1500);

    // Click fee calculation tab or quick action
    const feeTabs = await page.$$('button');
    for (const btn of feeTabs) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('শুল্ক হিসাব') || text.includes('Fee') || text.includes('শুল্ক বিবরণী')) {
        await safeClick(page, btn);
        break;
      }
    }
    await sleep(1000);

    // Click Challan preview button
    const challanBtns = await page.$$('button');
    for (const btn of challanBtns) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('চালান') || text.includes('Challan')) {
        await safeClick(page, btn);
        break;
      }
    }
    await sleep(1000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '03_sub_registrar_fees_challan.png') });
    console.log('Saved 03_sub_registrar_fees_challan.png');
    await page.keyboard.press('Escape');
    await sleep(500);

    // 04. AC Land Console
    console.log('Testing 04. AC Land Console...');
    await page.goto('http://localhost:5175/?tab=acland', { waitUntil: 'networkidle0' });
    await sleep(1500);
    const aclandBtns = await page.$$('button');
    for (const btn of aclandBtns) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('এসি ল্যান্ড প্যানেলে প্রবেশ') || text.includes('Activate AC Land')) {
        await safeClick(page, btn);
        break;
      }
    }
    await sleep(1500);

    // Switch to disputes subtab
    const dspTabs = await page.$$('button');
    for (const btn of dspTabs) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('বিরোধ') || text.includes('Disputes')) {
        await safeClick(page, btn);
        break;
      }
    }
    await sleep(1000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '04_ac_land_console.png') });
    console.log('Saved 04_ac_land_console.png');

    // 05. Bank Officer Console & NOC
    console.log('Testing 05. Bank Officer Console...');
    await page.goto('http://localhost:5175/?tab=bank', { waitUntil: 'networkidle0' });
    await sleep(1500);
    const bankBtns = await page.$$('button');
    for (const btn of bankBtns) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('ব্যাংক মর্টগেজ প্যানেলে প্রবেশ') || text.includes('Activate Bank Officer')) {
        await safeClick(page, btn);
        break;
      }
    }
    await sleep(1500);

    // Click NOC download button
    const nocBtns = await page.$$('button');
    for (const btn of nocBtns) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('NOC') || text.includes('ছাড়পত্র')) {
        await safeClick(page, btn);
        break;
      }
    }
    await sleep(1000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '05_bank_officer_noc.png') });
    console.log('Saved 05_bank_officer_noc.png');
    await page.keyboard.press('Escape');
    await sleep(500);

    // 06. Admin Dashboard & OCR
    console.log('Testing 06. Admin Dashboard...');
    await page.goto('http://localhost:5175/?tab=admin', { waitUntil: 'networkidle0' });
    await sleep(1500);
    const ocrSubTabs = await page.$$('button');
    for (const btn of ocrSubTabs) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('OCR') || text.includes('যাচাই কেস')) {
        await safeClick(page, btn);
        break;
      }
    }
    await sleep(1000);
    // Scroll down to OCR section
    await page.evaluate(() => window.scrollBy(0, 600));
    await sleep(1000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '06_admin_governance_ocr.png') });
    console.log('Saved 06_admin_governance_ocr.png');

    // 07. QR Deed & NOC Verify Portal
    console.log('Testing 07. QR Verify Portal...');
    await page.goto('http://localhost:5175/?tab=qr', { waitUntil: 'networkidle0' });
    await sleep(1500);
    // Enter NOC-2026-0001
    const verifyInputs = await page.$$('input[type="text"]');
    if (verifyInputs.length > 0) {
      await verifyInputs[0].click({ clickCount: 3 });
      await verifyInputs[0].type('NOC-2026-0001');
    }
    const verifyActionBtns = await page.$$('button');
    for (const btn of verifyActionBtns) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('যাচাই') || text.includes('Verify')) {
        await safeClick(page, btn);
        break;
      }
    }
    await sleep(1500);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '07_qr_deed_and_noc_verify.png') });
    console.log('Saved 07_qr_deed_and_noc_verify.png');

    // 08. Mobile Citizen Vault (390 x 844)
    console.log('Testing 08. Mobile Viewport...');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:5175/?tab=home', { waitUntil: 'networkidle0' });
    await sleep(1500);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '08_mobile_citizen_vault.png') });
    console.log('Saved 08_mobile_citizen_vault.png');

    console.log('ALL_SCREENSHOTS_CAPTURED_SUCCESSFULLY');
  } catch (err) {
    console.error('Error during browser verification:', err);
  } finally {
    await browser.close();
  }
}

run();

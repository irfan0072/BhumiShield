const path = require('path');
const fs = require('fs');
const puppeteer = require(path.resolve(__dirname, '../frontend/node_modules/puppeteer-core'));

const BRAVE_PATH = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
const OUT_DIR = '/Users/apple/.gemini/antigravity/brain/b1e816da-5647-4a2f-af77-167a7fbe1c20';
const FRONTEND_URL = 'http://localhost:5176';
const BACKEND_URL = 'http://localhost:8000';

const TARGETS = [
  {
    name: '01_sub_registrar_dashboard',
    path: '/bn/registrar',
    role: 'sub_registrar',
    username: 'registrar',
    title: 'Sub-Registrar Workspace',
  },
  {
    name: '02_ac_land_dashboard',
    path: '/bn/acland',
    role: 'ac_land',
    username: 'acland',
    title: 'AC Land Executive Workspace',
  },
  {
    name: '03_bank_officer_dashboard',
    path: '/bn/bank',
    role: 'bank_officer',
    username: 'bank',
    title: 'Bank Officer Workspace',
  },
  {
    name: '04_lawyer_chamber_dashboard',
    path: '/bn/lawyer-case',
    role: 'lawyer_court_user',
    username: 'lawyer',
    title: 'Lawyer Chamber Workspace',
  },
  {
    name: '05_specialist_dc_dashboard',
    path: '/bn/specialist',
    role: 'dc_acquisition_officer',
    username: 'dc_la',
    title: 'Specialist DC Land Acquisition',
  },
  {
    name: '06_admin_overview_dashboard',
    path: '/bn/admin',
    role: 'admin',
    username: 'admin',
    title: 'National Admin Overview',
  },
  {
    name: '07_admin_deeds_fixed_table',
    path: '/bn/admin/deeds',
    role: 'admin',
    username: 'admin',
    title: 'Admin Deeds Fixed Table',
  },
  {
    name: '08_admin_mutations_fixed_table',
    path: '/bn/admin/mutations',
    role: 'admin',
    username: 'admin',
    title: 'Admin Mutations Fixed Table',
  },
];

async function loginUser(username) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'demo123' }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error(`Login error for ${username}:`, err.message);
    return null;
  }
}

async function run() {
  console.log('Launching headless browser via Puppeteer...');
  const browser = await puppeteer.launch({
    executablePath: BRAVE_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--user-data-dir=/tmp/brave-official-audit-' + Date.now(),
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1440,900',
    ],
    defaultViewport: { width: 1440, height: 900 },
  });

  const results = [];

  for (const t of TARGETS) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (err) => {
      console.error(`[${t.name}] Page Error:`, err.message);
      errors.push(err.message);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    try {
      console.log(`\nTesting ${t.name} (${t.title})...`);
      const auth = await loginUser(t.username);
      if (!auth || !auth.access_token) {
        throw new Error(`Failed to authenticate ${t.username}`);
      }

      // Initialize session on frontend
      await page.goto(`${FRONTEND_URL}/bn/landing`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.evaluate((authData) => {
        localStorage.setItem('bs_token', authData.access_token);
        localStorage.setItem('bs_role', authData.user.role);
        localStorage.setItem('bs_lang', 'bn');
        localStorage.setItem('bs_user', JSON.stringify(authData.user));
      }, auth);

      // Now navigate to the target workspace
      await page.goto(`${FRONTEND_URL}${t.path}`, { waitUntil: 'networkidle0', timeout: 20000 });
      await new Promise((r) => setTimeout(r, 1800));

      const screenshotFile = `${t.name}.png`;
      const screenshotPath = path.join(OUT_DIR, screenshotFile);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      const bodyText = await page.evaluate(() => document.body.innerText);
      const isCrashed =
        bodyText.includes('Something went wrong') ||
        bodyText.includes('ReferenceError') ||
        bodyText.includes('TypeError:');

      results.push({
        name: t.name,
        title: t.title,
        path: t.path,
        screenshot: screenshotPath,
        crashed: isCrashed,
        errors: errors.filter((e) => !e.includes('favicon')),
      });

      console.log(`✓ Captured: ${screenshotPath} (Crashed: ${isCrashed}, live user: ${auth.user.username})`);
    } catch (e) {
      console.error(`Failed on ${t.name}:`, e.message);
      results.push({
        name: t.name,
        title: t.title,
        path: t.path,
        error: e.message,
        crashed: true,
      });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  console.log('\n================ AUDIT SUMMARY ================');
  console.log(JSON.stringify(results, null, 2));
}

run().catch(console.error);

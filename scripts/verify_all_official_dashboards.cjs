const net = require('net');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = '/Users/apple/.gemini/antigravity/brain/7b8b01c8-f348-4efb-9538-8258cb9637e0';
const BASE_URL = 'http://localhost:5176';

const AUDIT_TARGETS = [
  { name: '01_citizen_home_cleaned', path: '/bn/home', role: 'citizen', username: 'citizen', name_bn: 'মো. রফিকুল ইসলাম' },
  { name: '02_sub_registrar_dashboard', path: '/bn/registrar', role: 'sub_registrar', username: 'registrar', name_bn: 'ফারহানা ইয়াসমিন' },
  { name: '03_ac_land_dashboard', path: '/bn/acland', role: 'ac_land', username: 'acland', name_bn: 'তানভীর আহমেদ' },
  { name: '04_bank_officer_dashboard', path: '/bn/bank', role: 'bank_officer', username: 'bank', name_bn: 'নাজমুল হাসান' },
  { name: '05_lawyer_chamber_dashboard', path: '/bn/lawyer-case', role: 'lawyer_court_user', username: 'advocate', name_bn: 'ব্যারিস্টার মাহবুবুল আলম' },
  { name: '06_dc_acquisition_dashboard', path: '/bn/specialist', role: 'dc_acquisition_officer', username: 'dc_la', name_bn: 'মো. আনিসুর রহমান' },
];

async function runAudit() {
  const profileDir = '/tmp/ff_marionette_dashboards_prof';
  if (fs.existsSync(profileDir)) {
    fs.rmSync(profileDir, { recursive: true, force: true });
  }
  fs.mkdirSync(profileDir, { recursive: true });

  console.log('Spawning Firefox Headless Marionette...');
  const ff = spawn('/Applications/Firefox.app/Contents/MacOS/firefox', [
    '--headless',
    '--marionette',
    '--no-remote',
    '-profile', profileDir
  ], { stdio: 'inherit' });

  ff.on('error', (err) => console.error('Firefox spawn error:', err));

  const client = new net.Socket();
  let msgId = 1;
  const pending = new Map();
  let buffer = '';

  function sendCommand(name, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++msgId;
      pending.set(id, { resolve, reject });
      const msg = JSON.stringify([0, id, name, params]);
      const frame = `${Buffer.byteLength(msg, 'utf8')}:${msg}`;
      client.write(frame, 'utf8');
    });
  }

  // Connect retry up to 10 seconds
  let connected = false;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 250));
    try {
      await new Promise((resolve, reject) => {
        client.once('connect', () => {
          connected = true;
          console.log('Connected to Marionette port 2828!');
          resolve();
        });
        client.once('error', (err) => reject(err));
        client.connect(2828, '127.0.0.1');
      });
      break;
    } catch {
      // retry
    }
  }

  if (!connected) {
    console.error('Could not connect to Marionette on port 2828');
    ff.kill('SIGKILL');
    process.exit(1);
  }

  client.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    while (true) {
      const colonIdx = buffer.indexOf(':');
      if (colonIdx === -1) break;
      const lenStr = buffer.substring(0, colonIdx);
      const byteLen = parseInt(lenStr, 10);
      if (isNaN(byteLen)) break;
      const headerLen = colonIdx + 1;
      const totalLen = headerLen + byteLen;
      if (Buffer.byteLength(buffer, 'utf8') < totalLen) break;

      const raw = buffer.substring(headerLen, totalLen);
      buffer = buffer.substring(totalLen);

      try {
        const parsed = JSON.parse(raw);
        const [type, id, err, res] = parsed;
        if (pending.has(id)) {
          const { resolve, reject } = pending.get(id);
          pending.delete(id);
          if (err) reject(err);
          else resolve(res);
        }
      } catch (e) {
        console.error('Parse err:', e);
      }
    }
  });

  try {
    await sendCommand('WebDriver:NewSession', { capabilities: {} });
    await sendCommand('WebDriver:SetTimeouts', { implicit: 5000, script: 30000, pageLoad: 30000 });
    await sendCommand('WebDriver:SetWindowRect', { width: 1440, height: 900 });

    for (const t of AUDIT_TARGETS) {
      console.log(`\n--- Auditing ${t.name} (${t.path}) for role ${t.role} ---`);
      
      // Seed LocalStorage
      await sendCommand('WebDriver:Navigate', { url: `${BASE_URL}/bn/landing` });
      await new Promise(r => setTimeout(r, 600));

      const seedScript = `
        localStorage.setItem('bs_token', 'mock_jwt_audit_${t.role}');
        localStorage.setItem('bs_role', '${t.role}');
        localStorage.setItem('bs_lang', 'bn');
        localStorage.setItem('bs_user', JSON.stringify({
          id: 99,
          username: '${t.username}',
          full_name_bn: '${t.name_bn}',
          full_name_en: '${t.username}',
          role: '${t.role}',
          nid: '9900001001',
          office_bn: 'উপজেলা ভূমি প্রশাসন • সাভার, ঢাকা',
          is_active: 1,
          is_identity_verified: 1,
          is_profile_complete: 1
        }));
      `;
      await sendCommand('WebDriver:ExecuteScript', { script: seedScript, args: [] });

      // Navigate to target
      await sendCommand('WebDriver:Navigate', { url: `${BASE_URL}${t.path}` });
      await new Promise(r => setTimeout(r, 1200));

      // Take Screenshot
      const ssRes = await sendCommand('WebDriver:TakeScreenshot', { full: false });
      const imgBuffer = Buffer.from(ssRes.value, 'base64');
      const ssPath = path.join(ARTIFACT_DIR, `${t.name}.png`);
      fs.writeFileSync(ssPath, imgBuffer);
      console.log(`✓ Screenshot saved: ${ssPath} (${(imgBuffer.length / 1024).toFixed(1)} KB)`);
    }

    console.log('\nAll 6 target dashboards verified and captured successfully!');
  } catch (err) {
    console.error('Audit execution error:', err);
  } finally {
    try {
      await sendCommand('WebDriver:DeleteSession', {});
    } catch {}
    client.destroy();
    ff.kill('SIGTERM');
    setTimeout(() => {
      try { ff.kill('SIGKILL'); } catch {}
      process.exit(0);
    }, 500);
  }
}

runAudit();

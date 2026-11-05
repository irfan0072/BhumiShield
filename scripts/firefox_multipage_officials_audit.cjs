const net = require('net');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = '/Users/apple/.gemini/antigravity/brain/ce162890-51b9-489c-9317-9fff593834be';
const BASE_URL = 'http://localhost:5175';

const MULTIPAGE_TESTS = [
  // 1. Sub-Registrar multi-page routes
  { name: 'registrar_docket', path: '/bn/registrar', role: 'sub_registrar', username: 'demo_sub_registrar' },
  { name: 'registrar_wizard', path: '/bn/registrar/wizard', role: 'sub_registrar', username: 'demo_sub_registrar' },
  { name: 'registrar_deeds', path: '/bn/registrar/deeds', role: 'sub_registrar', username: 'demo_sub_registrar' },
  { name: 'registrar_fees', path: '/bn/registrar/fees', role: 'sub_registrar', username: 'demo_sub_registrar' },

  // 2. AC Land multi-page routes
  { name: 'acland_mutations', path: '/bn/acland', role: 'ac_land', username: 'demo_ac_land' },
  { name: 'acland_khatians', path: '/bn/acland/khatians', role: 'ac_land', username: 'demo_ac_land' },
  { name: 'acland_disputes', path: '/bn/acland/disputes', role: 'ac_land', username: 'demo_ac_land' },

  // 3. Bank Officer multi-page routes
  { name: 'bank_mortgages', path: '/bn/bank', role: 'bank_officer', username: 'demo_bank' },
  { name: 'bank_new_lien', path: '/bn/bank/new-lien', role: 'bank_officer', username: 'demo_bank' },
  { name: 'bank_noc', path: '/bn/bank/noc', role: 'bank_officer', username: 'demo_bank' },
];

async function runMultiPageAudit() {
  const profileDir = '/tmp/ff_marionette_multipage_prof';
  if (fs.existsSync(profileDir)) {
    fs.rmSync(profileDir, { recursive: true, force: true });
  }
  fs.mkdirSync(profileDir, { recursive: true });

  console.log('Spawning Firefox with Marionette for Multi-Page Official Panels Audit...');
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
        client.once('error', (err) => {
          client.removeAllListeners('connect');
          reject(err);
        });
        client.connect(2828, '127.0.0.1');
      });
      break;
    } catch {}
  }

  if (!connected) {
    console.error('Could not connect to Firefox Marionette within 10 seconds.');
    ff.kill();
    process.exit(1);
  }

  const readyPromise = new Promise((resolve) => {
    client.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      while (true) {
        const colonIdx = buffer.indexOf(':');
        if (colonIdx === -1) break;
        const lenStr = buffer.substring(0, colonIdx);
        const len = parseInt(lenStr, 10);
        if (isNaN(len)) break;
        const totalLen = colonIdx + 1 + len;
        if (buffer.length < totalLen) break;

        const payloadStr = buffer.substring(colonIdx + 1, totalLen);
        buffer = buffer.substring(totalLen);

        try {
          const parsed = JSON.parse(payloadStr);
          if (parsed.applicationType) {
            resolve();
          } else if (Array.isArray(parsed)) {
            const [type, id, err, result] = parsed;
            if (pending.has(id)) {
              const { resolve: cmdResolve, reject: cmdReject } = pending.get(id);
              pending.delete(id);
              if (err) cmdReject(err);
              else cmdResolve(result);
            }
          }
        } catch (err) {
          console.error('Parse error:', err);
        }
      }
    });
  });

  await readyPromise;
  console.log('Handshake completed.');

  try {
    const session = await sendCommand('WebDriver:NewSession', { capabilities: {} });
    console.log('Marionette session created:', session.sessionId);

    // Initial navigation
    await sendCommand('WebDriver:Navigate', { url: BASE_URL + '/bn/' });
    await new Promise(r => setTimeout(r, 1000));

    // Admin token
    const adminLoginRes = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'demo123' })
    });
    const adminData = await adminLoginRes.json();
    const adminToken = adminData.access_token;
    const adminUser = JSON.stringify(adminData.user);

    for (const test of MULTIPAGE_TESTS) {
      console.log(`\nTesting Multi-Page Route: ${test.name} (${test.path}) as role ${test.role}...`);

      let token = adminToken;
      let userObj = adminData.user;

      try {
        const switchRes = await fetch('http://127.0.0.1:8000/api/v1/auth/switch-demo-role', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({ role: test.role, username: test.username })
        });
        const switchData = await switchRes.json();
        if (switchData.access_token) {
          token = switchData.access_token;
          userObj = switchData.user;
        }
      } catch (e) {
        console.warn('Switch role error:', e.message);
      }

      await sendCommand('WebDriver:ExecuteScript', {
        script: `
          localStorage.setItem('bs_role', '${test.role}');
          localStorage.setItem('bs_token', '${token}');
          localStorage.setItem('bs_user', '${JSON.stringify(userObj).replace(/'/g, "\\'")}');
          localStorage.setItem('bs_superadmin_mode', '1');
          localStorage.setItem('bs_admin_original_token', '${adminToken}');
          localStorage.setItem('bs_admin_original_user', '${adminUser.replace(/'/g, "\\'")}');
        `,
        args: []
      });

      // Desktop Screenshot (1440x900)
      await sendCommand('WebDriver:SetWindowRect', { width: 1440, height: 900 });
      await sendCommand('WebDriver:Navigate', { url: BASE_URL + test.path });
      await new Promise(r => setTimeout(r, 2000));

      const deskShot = await sendCommand('WebDriver:TakeScreenshot', { full: false });
      if (deskShot.value) {
        const deskPath = path.join(ARTIFACT_DIR, `audit_multipage_${test.name}.png`);
        fs.writeFileSync(deskPath, Buffer.from(deskShot.value, 'base64'));
        console.log(` -> Saved screenshot: audit_multipage_${test.name}.png`);
      }
    }

    await sendCommand('WebDriver:DeleteSession', {});
    console.log('\nMulti-Page Officials audit completed successfully!');
  } catch (err) {
    console.error('Audit execution error:', err);
  } finally {
    client.destroy();
    ff.kill();
    process.exit(0);
  }
}

runMultiPageAudit();

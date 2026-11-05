const net = require('net');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = '/Users/apple/.gemini/antigravity/brain/ce162890-51b9-489c-9317-9fff593834be';
const BASE_URL = 'http://localhost:5175';

const OFFICIAL_PAGES = [
  { name: 'official_registrar', path: '/bn/registrar', role: 'sub_registrar', username: 'demo_sub_registrar' },
  { name: 'official_acland', path: '/bn/acland', role: 'ac_land', username: 'demo_ac_land' },
  { name: 'official_bank', path: '/bn/bank', role: 'bank_officer', username: 'demo_bank' },
  { name: 'official_lawyer', path: '/bn/lawyer-case', role: 'lawyer_court_user', username: 'demo_lawyer' },
  { name: 'official_specialist', path: '/bn/specialist', role: 'dc_acquisition_officer', username: 'demo_dc' },
  { name: 'admin_roles_cleaned', path: '/bn/admin/roles', role: 'admin', username: 'admin' },
];

async function runOfficialsAudit() {
  const profileDir = '/tmp/ff_marionette_officials_prof';
  if (fs.existsSync(profileDir)) {
    fs.rmSync(profileDir, { recursive: true, force: true });
  }
  fs.mkdirSync(profileDir, { recursive: true });

  console.log('Spawning Firefox with Marionette for Official Workspaces Audit...');
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
        client.once('error', (err) => {
          client.removeAllListeners('connect');
          reject(err);
        });
        client.connect(2828, '127.0.0.1');
      });
      break;
    } catch {
      // Retry
    }
  }

  if (!connected) {
    console.error('Could not connect to Firefox Marionette within 10 seconds.');
    ff.kill();
    process.exit(1);
  }

  // Setup handler
  const readyPromise = new Promise((resolve) => {
    client.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      while (true) {
        const colonIdx = buffer.indexOf(':');
        if (colonIdx === -1) break;
        const lenStr = buffer.substring(0, colonIdx);
        const len = parseInt(lenStr, 10);
        if (isNaN(len)) {
          console.error('Invalid frame length:', lenStr);
          break;
        }
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

    // Initial navigation to localhost to establish origin
    await sendCommand('WebDriver:Navigate', { url: BASE_URL + '/bn/' });
    await new Promise(r => setTimeout(r, 1000));

    // Admin login token to preserve
    const adminLoginRes = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'demo123' })
    });
    const adminData = await adminLoginRes.json();
    const adminToken = adminData.access_token;
    const adminUser = JSON.stringify(adminData.user);

    for (const page of OFFICIAL_PAGES) {
      console.log(`\nAuditing Official page: ${page.name} (${page.path}) as role: ${page.role}`);

      let token = adminToken;
      let userObj = adminData.user;

      if (page.role !== 'admin') {
        try {
          const switchRes = await fetch('http://127.0.0.1:8000/api/v1/auth/switch-demo-role', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ role: page.role, username: page.username })
          });
          const switchData = await switchRes.json();
          if (switchData.access_token) {
            token = switchData.access_token;
            userObj = switchData.user;
          }
        } catch (e) {
          console.warn('Switch role error:', e.message);
        }
      }

      // Inject session with SuperAdmin impersonation mode active for official pages
      const isOfficial = page.role !== 'admin';
      await sendCommand('WebDriver:ExecuteScript', {
        script: `
          localStorage.setItem('bs_role', '${page.role}');
          localStorage.setItem('bs_token', '${token}');
          localStorage.setItem('bs_user', '${JSON.stringify(userObj).replace(/'/g, "\\'")}');
          ${isOfficial ? `
            localStorage.setItem('bs_superadmin_mode', '1');
            localStorage.setItem('bs_admin_original_token', '${adminToken}');
            localStorage.setItem('bs_admin_original_user', '${adminUser.replace(/'/g, "\\'")}');
          ` : `
            localStorage.removeItem('bs_superadmin_mode');
          `}
        `,
        args: []
      });

      // 1. Desktop Screenshot (1440x900)
      await sendCommand('WebDriver:SetWindowRect', { width: 1440, height: 900 });
      await sendCommand('WebDriver:Navigate', { url: BASE_URL + page.path });
      await new Promise(r => setTimeout(r, 2200));
      const deskShot = await sendCommand('WebDriver:TakeScreenshot', { full: false });
      if (deskShot.value) {
        const deskPath = path.join(ARTIFACT_DIR, `audit_workspace_${page.name}_desk.png`);
        fs.writeFileSync(deskPath, Buffer.from(deskShot.value, 'base64'));
        console.log(` -> Saved Desktop screenshot: audit_workspace_${page.name}_desk.png`);
      }

      // 2. Mobile Screenshot (390x844)
      await sendCommand('WebDriver:SetWindowRect', { width: 390, height: 844 });
      await sendCommand('WebDriver:Navigate', { url: BASE_URL + page.path });
      await new Promise(r => setTimeout(r, 2200));
      const mobShot = await sendCommand('WebDriver:TakeScreenshot', { full: false });
      if (mobShot.value) {
        const mobPath = path.join(ARTIFACT_DIR, `audit_workspace_${page.name}_mob.png`);
        fs.writeFileSync(mobPath, Buffer.from(mobShot.value, 'base64'));
        console.log(` -> Saved Mobile screenshot: audit_workspace_${page.name}_mob.png`);
      }
    }

    await sendCommand('WebDriver:DeleteSession', {});
    console.log('\nAll Official Workspaces audited successfully!');
  } catch (err) {
    console.error('Audit execution error:', err);
  } finally {
    client.destroy();
    ff.kill();
    process.exit(0);
  }
}

runOfficialsAudit();

const net = require('net');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = '/Users/apple/.gemini/antigravity/brain/ce162890-51b9-489c-9317-9fff593834be';
const BASE_URL = 'http://localhost:5175';

const ADMIN_PAGES = [
  { name: 'admin_overview', path: '/bn/admin' },
  { name: 'admin_officials', path: '/bn/admin/officials' },
  { name: 'admin_citizens', path: '/bn/admin/citizens' },
  { name: 'admin_roles', path: '/bn/admin/roles' },
  { name: 'admin_settings', path: '/bn/admin/settings' },
];

async function runAdminAudit() {
  const profileDir = '/tmp/ff_marionette_prof';
  if (fs.existsSync(profileDir)) {
    fs.rmSync(profileDir, { recursive: true, force: true });
  }
  fs.mkdirSync(profileDir, { recursive: true });

  console.log('Spawning Firefox with Marionette protocol for Admin Audit...');
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

    // Fetch real signed admin JWT from backend
    console.log('Fetching real signed admin JWT from backend...');
    const loginRes = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'demo123' })
    });
    const loginData = await loginRes.json();
    const realToken = loginData.access_token;
    const realUser = JSON.stringify(loginData.user);
    console.log('Got real token! Injecting into browser localStorage...');

    // Inject Admin auth credentials into localStorage
    await sendCommand('WebDriver:ExecuteScript', {
      script: `
        localStorage.setItem('bs_role', 'admin');
        localStorage.setItem('bs_token', '${realToken}');
        localStorage.setItem('bs_user', '${realUser.replace(/'/g, "\\'")}');
      `,
      args: []
    });
    console.log('Admin session injected into localStorage.');

    for (const page of ADMIN_PAGES) {
      console.log(`\nAuditing Admin page: ${page.name} (${page.path})`);

      // 1. Desktop Screenshot (1440x900)
      await sendCommand('WebDriver:SetWindowRect', { width: 1440, height: 900 });
      await sendCommand('WebDriver:Navigate', { url: BASE_URL + page.path });
      // Wait for React & API data
      await new Promise(r => setTimeout(r, 1800));
      const deskShot = await sendCommand('WebDriver:TakeScreenshot', { full: false });
      if (deskShot.value) {
        const deskPath = path.join(ARTIFACT_DIR, `audit_auth_desk_${page.name}.png`);
        fs.writeFileSync(deskPath, Buffer.from(deskShot.value, 'base64'));
        console.log(` -> Saved Authenticated Desktop screenshot: audit_auth_desk_${page.name}.png`);
      }

      // 2. Mobile Screenshot (390x844)
      await sendCommand('WebDriver:SetWindowRect', { width: 390, height: 844 });
      await sendCommand('WebDriver:Navigate', { url: BASE_URL + page.path });
      // Wait for React & responsive resize
      await new Promise(r => setTimeout(r, 1800));
      const mobShot = await sendCommand('WebDriver:TakeScreenshot', { full: false });
      if (mobShot.value) {
        const mobPath = path.join(ARTIFACT_DIR, `audit_auth_mob_${page.name}.png`);
        fs.writeFileSync(mobPath, Buffer.from(mobShot.value, 'base64'));
        console.log(` -> Saved Authenticated Mobile screenshot: audit_auth_mob_${page.name}.png`);
      }
    }

    await sendCommand('WebDriver:DeleteSession', {});
    console.log('\nAll Admin pages audited successfully!');
  } catch (err) {
    console.error('Audit execution error:', err);
  } finally {
    client.destroy();
    ff.kill();
    process.exit(0);
  }
}

runAdminAudit();

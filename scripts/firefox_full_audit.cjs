const net = require('net');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = '/Users/apple/.gemini/antigravity/brain/ce162890-51b9-489c-9317-9fff593834be';
const BASE_URL = 'http://localhost:5175';

const PAGES = [
  { name: 'landing', path: '/bn/' },
  { name: 'check', path: '/bn/check' },
  { name: 'qr', path: '/bn/qr' },
  { name: 'map', path: '/bn/map' },
  { name: 'sale', path: '/bn/sale' },
  { name: 'notices', path: '/bn/notices' },
  { name: 'blog', path: '/bn/blog' },
  { name: 'offices', path: '/bn/offices' },
  { name: 'help', path: '/bn/help' },
  { name: 'admin_overview', path: '/bn/admin' },
  { name: 'admin_deeds', path: '/bn/admin/deeds' },
  { name: 'admin_khatians', path: '/bn/admin/khatians' },
  { name: 'admin_ledger', path: '/bn/admin/ledger' },
  { name: 'admin_users', path: '/bn/admin/users' },
  { name: 'admin_system', path: '/bn/admin/system' },
];

async function runAudit() {
  const profileDir = '/tmp/ff_marionette_prof';
  if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

  console.log('Spawning Firefox with Marionette protocol...');
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

  // Connect retry
  let connected = false;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
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
    console.error('Could not connect to Firefox Marionette within 6 seconds.');
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

    // Initial navigation to warm up
    await sendCommand('WebDriver:Navigate', { url: BASE_URL + '/bn/' });
    await new Promise(r => setTimeout(r, 1000));

    for (const page of PAGES) {
      console.log(`\nAuditing page: ${page.name} (${page.path})`);

      // 1. Desktop Screenshot (1440x900)
      await sendCommand('WebDriver:SetWindowRect', { width: 1440, height: 900 });
      await sendCommand('WebDriver:Navigate', { url: BASE_URL + page.path });
      // Wait for React & API data
      await new Promise(r => setTimeout(r, 1500));
      const deskShot = await sendCommand('WebDriver:TakeScreenshot', { full: false });
      if (deskShot.value) {
        const deskPath = path.join(ARTIFACT_DIR, `audit_desk_${page.name}.png`);
        fs.writeFileSync(deskPath, Buffer.from(deskShot.value, 'base64'));
        console.log(` -> Saved Desktop screenshot: audit_desk_${page.name}.png`);
      }

      // 2. Mobile Screenshot (390x844)
      await sendCommand('WebDriver:SetWindowRect', { width: 390, height: 844 });
      await sendCommand('WebDriver:Navigate', { url: BASE_URL + page.path });
      // Wait for React & responsive resize
      await new Promise(r => setTimeout(r, 1500));
      const mobShot = await sendCommand('WebDriver:TakeScreenshot', { full: false });
      if (mobShot.value) {
        const mobPath = path.join(ARTIFACT_DIR, `audit_mob_${page.name}.png`);
        fs.writeFileSync(mobPath, Buffer.from(mobShot.value, 'base64'));
        console.log(` -> Saved Mobile screenshot: audit_mob_${page.name}.png`);
      }
    }

    await sendCommand('WebDriver:DeleteSession', {});
    console.log('\nAll pages audited successfully!');
  } catch (err) {
    console.error('Audit execution error:', err);
  } finally {
    client.destroy();
    ff.kill();
    process.exit(0);
  }
}

runAudit();

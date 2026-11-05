const net = require('net');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = '/Users/apple/.gemini/antigravity/brain/ce162890-51b9-489c-9317-9fff593834be';
const BASE_URL = 'http://localhost:5175';

async function runTourAudit() {
  const profileDir = '/tmp/ff_marionette_tour_prof';
  if (fs.existsSync(profileDir)) {
    fs.rmSync(profileDir, { recursive: true, force: true });
  }
  fs.mkdirSync(profileDir, { recursive: true });

  console.log('Spawning Firefox with Marionette for Tour Visual Audit...');
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

    // Initial navigation to localhost
    await sendCommand('WebDriver:Navigate', { url: BASE_URL + '/bn/' });
    await new Promise(r => setTimeout(r, 1000));

    // Get citizen token
    console.log('Fetching citizen login token...');
    const citLogin = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'citizen', password: 'demo123' })
    });
    const citData = await citLogin.json();
    const token = citData.access_token || '';
    const user = JSON.stringify(citData.user || { role: 'citizen', name_bn: 'মো. রফিকুল ইসলাম', username: 'citizen' });

    // Inject citizen session
    await sendCommand('WebDriver:ExecuteScript', {
      script: `
        localStorage.setItem('bs_role', 'citizen');
        localStorage.setItem('bs_token', '${token}');
        localStorage.setItem('bs_user', '${user.replace(/'/g, "\\'")}');
        localStorage.removeItem('bs_superadmin_mode');
      `,
      args: []
    });

    // 1. Navigate to /bn/home (Desktop 1440x900)
    await sendCommand('WebDriver:SetWindowRect', { width: 1440, height: 900 });
    await sendCommand('WebDriver:Navigate', { url: BASE_URL + '/bn/home' });
    await new Promise(r => setTimeout(r, 2000));

    // Trigger Tour on Desktop
    console.log('Triggering tour on Desktop...');
    await sendCommand('WebDriver:ExecuteScript', {
      script: `
        window.dispatchEvent(new CustomEvent('start-citizen-tour'));
      `,
      args: []
    });
    await new Promise(r => setTimeout(r, 1200));

    // Step 1 Screenshot
    let deskShot1 = await sendCommand('WebDriver:TakeScreenshot', { full: false });
    if (deskShot1.value) {
      fs.writeFileSync(path.join(ARTIFACT_DIR, 'audit_tour_step1_desk.png'), Buffer.from(deskShot1.value, 'base64'));
      console.log(' -> Saved audit_tour_step1_desk.png');
    }

    // Advance to Step 3 (the exact step in user image: "জমির ডিজিটাল স্বাস্থ্য পাসপোর্ট ও নিরীক্ষা")
    console.log('Advancing tour to Step 3...');
    await sendCommand('WebDriver:ExecuteScript', {
      script: `
        // Click Next button twice
        const nextBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent && (b.textContent.includes('পরবর্তী') || b.textContent.includes('Next')));
        if (nextBtns.length > 0) {
          nextBtns[nextBtns.length - 1].click();
        }
      `,
      args: []
    });
    await new Promise(r => setTimeout(r, 800));

    await sendCommand('WebDriver:ExecuteScript', {
      script: `
        const nextBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent && (b.textContent.includes('পরবর্তী') || b.textContent.includes('Next')));
        if (nextBtns.length > 0) {
          nextBtns[nextBtns.length - 1].click();
        }
      `,
      args: []
    });
    await new Promise(r => setTimeout(r, 1200));

    // Step 3 Desktop Screenshot
    let deskShot3 = await sendCommand('WebDriver:TakeScreenshot', { full: false });
    if (deskShot3.value) {
      fs.writeFileSync(path.join(ARTIFACT_DIR, 'audit_tour_step3_desk.png'), Buffer.from(deskShot3.value, 'base64'));
      console.log(' -> Saved audit_tour_step3_desk.png (Step 3 matching user request)');
    }

    // 2. Mobile Screenshot (390x844)
    console.log('Auditing Mobile view (390x844)...');
    await sendCommand('WebDriver:SetWindowRect', { width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 1500));
    let mobShot3 = await sendCommand('WebDriver:TakeScreenshot', { full: false });
    if (mobShot3.value) {
      fs.writeFileSync(path.join(ARTIFACT_DIR, 'audit_tour_step3_mob.png'), Buffer.from(mobShot3.value, 'base64'));
      console.log(' -> Saved audit_tour_step3_mob.png');
    }

    await sendCommand('WebDriver:DeleteSession', {});
    console.log('\nTour visual audit completed successfully!');
  } catch (err) {
    console.error('Audit execution error:', err);
  } finally {
    client.destroy();
    ff.kill();
    process.exit(0);
  }
}

runTourAudit();

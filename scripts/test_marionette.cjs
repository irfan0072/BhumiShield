const net = require('net');
const { spawn } = require('child_process');
const fs = require('fs');

async function test() {
  const profileDir = '/tmp/ff_marionette_prof';
  if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

  console.log('Spawning Firefox with Marionette...');
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

  // Retry connect until port 2828 is listening
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
          console.log('Marionette Handshake received:', parsed);
          // Initial connection ready, create session
          (async () => {
            try {
              const sessionRes = await sendCommand('WebDriver:NewSession', { capabilities: {} });
              console.log('Session created:', sessionRes);

              await sendCommand('WebDriver:SetWindowRect', { width: 1440, height: 900 });
              console.log('Window resized to 1440x900');

              await sendCommand('WebDriver:Navigate', { url: 'http://localhost:5175/bn/check' });
              console.log('Navigated to /bn/check');

              // Wait 2.5s for React state & API data
              await new Promise(r => setTimeout(r, 2500));

              const shotRes = await sendCommand('WebDriver:TakeScreenshot', { full: false });
              console.log('Screenshot taken! Base64 length:', shotRes.value?.length || 0);

              if (shotRes.value) {
                const outPath = '/Users/apple/.gemini/antigravity/brain/ce162890-51b9-489c-9317-9fff593834be/ff_marionette_check_test.png';
                fs.writeFileSync(outPath, Buffer.from(shotRes.value, 'base64'));
                console.log('Saved screenshot to:', outPath);
              }

              await sendCommand('WebDriver:DeleteSession', {});
              console.log('Session deleted.');
            } catch (e) {
              console.error('Error during execution:', e);
            } finally {
              client.destroy();
              ff.kill();
              process.exit(0);
            }
          })();
        } else if (Array.isArray(parsed)) {
          // [type, id, error, result]
          const [type, id, err, result] = parsed;
          if (pending.has(id)) {
            const { resolve, reject } = pending.get(id);
            pending.delete(id);
            if (err) reject(err);
            else resolve(result);
          }
        }
      } catch (err) {
        console.error('Failed to parse frame:', err);
      }
    }
  });
}

test();

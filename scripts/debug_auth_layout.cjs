const net = require('net');
const { spawn } = require('child_process');
const fs = require('fs');

async function debugAuthLayout() {
  const profileDir = '/tmp/ff_debug_prof2';
  if (fs.existsSync(profileDir)) fs.rmSync(profileDir, { recursive: true, force: true });
  fs.mkdirSync(profileDir, { recursive: true });

  const ff = spawn('/Applications/Firefox.app/Contents/MacOS/firefox', [
    '--headless', '--marionette', '--no-remote', '-profile', profileDir
  ]);

  const client = new net.Socket();
  let msgId = 1;
  const pending = new Map();
  let buffer = '';

  function sendCommand(name, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++msgId;
      pending.set(id, { resolve, reject });
      const msg = JSON.stringify([0, id, name, params]);
      client.write(`${Buffer.byteLength(msg, 'utf8')}:${msg}`, 'utf8');
    });
  }

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      await new Promise((res, rej) => {
        client.once('connect', res);
        client.once('error', rej);
        client.connect(2828, '127.0.0.1');
      });
      break;
    } catch {}
  }

  const ready = new Promise(res => {
    client.on('data', chunk => {
      buffer += chunk.toString('utf8');
      while (true) {
        const colon = buffer.indexOf(':');
        if (colon === -1) break;
        const len = parseInt(buffer.substring(0, colon), 10);
        const total = colon + 1 + len;
        if (buffer.length < total) break;
        const payload = JSON.parse(buffer.substring(colon + 1, total));
        buffer = buffer.substring(total);
        if (payload.applicationType) res();
        else if (Array.isArray(payload)) {
          const [t, id, err, val] = payload;
          if (pending.has(id)) {
            const p = pending.get(id);
            pending.delete(id);
            if (err) p.reject(err); else p.resolve(val);
          }
        }
      }
    });
  });

  await ready;
  await sendCommand('WebDriver:NewSession', {});
  await sendCommand('WebDriver:SetWindowRect', { width: 1440, height: 900 });
  await sendCommand('WebDriver:Navigate', { url: 'http://localhost:5175/bn/' });
  await new Promise(r => setTimeout(r, 1000));

  const loginRes = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'demo123' })
  });
  const loginData = await loginRes.json();
  const realToken = loginData.access_token;
  const realUser = JSON.stringify(loginData.user);

  await sendCommand('WebDriver:ExecuteScript', {
    script: `
      localStorage.setItem("bs_role", "admin");
      localStorage.setItem("bs_token", ${JSON.stringify(realToken)});
      localStorage.setItem("bs_user", ${JSON.stringify(realUser)});
    `,
    args: []
  });

  await sendCommand('WebDriver:Navigate', { url: 'http://localhost:5175/bn/admin/deeds' });
  await new Promise(r => setTimeout(r, 2000));

  const diag = await sendCommand('WebDriver:ExecuteScript', {
    script: `
      const res = {};
      res.windowScrollX = window.scrollX;
      res.windowScrollY = window.scrollY;
      const h1 = document.querySelector("h1");
      if (h1) {
        res.h1Text = h1.innerText;
        res.h1Rect = h1.getBoundingClientRect();
      }
      res.scrolledElements = [];
      document.querySelectorAll("*").forEach(el => {
        if (el.scrollLeft > 0) {
          res.scrolledElements.push({
            tag: el.tagName,
            class: el.className,
            scrollLeft: el.scrollLeft,
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
            rect: el.getBoundingClientRect()
          });
        }
      });
      return res;
    `,
    args: []
  });

  console.log('REAL AUTH DIAGNOSTICS:', JSON.stringify(diag.value, null, 2));

  await sendCommand('WebDriver:DeleteSession', {});
  client.destroy();
  ff.kill();
  process.exit(0);
}

debugAuthLayout();

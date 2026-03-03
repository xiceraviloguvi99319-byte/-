const fs = require('fs');
const path = require('path');
const https = require('https');
const vm = require('vm');

const ICON_DIR = path.join(__dirname, 'icons');
const DATA_FILE = path.join(__dirname, 'talent_data_official_full.js');
const REMOTE_BASE = 'https://talents.turtlecraft.gg/icons/';

function loadIconsFromData() {
  const code = fs.readFileSync(DATA_FILE, 'utf8');
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);

  const icons = new Set();
  const data = ctx.window.TALENT_DATA || {};
  const list = ctx.window.TALENT_CLASS_LIST || [];

  for (const cls of Object.values(data)) {
    for (const tree of cls.trees || []) {
      if (tree.icon) icons.add(tree.icon);
      for (const t of tree.talents || []) {
        if (t.i) icons.add(t.i);
      }
    }
  }

  for (const c of list) {
    if (c.icon) icons.add(c.icon);
  }

  icons.add('inv_misc_questionmark');
  return [...icons];
}

function downloadIcon(iconName) {
  return new Promise((resolve) => {
    const url = `${REMOTE_BASE}${iconName}.png`;
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Accept: 'image/png,image/*;q=0.9,*/*;q=0.8',
          Referer: 'https://talents.turtlecraft.gg/'
        }
      },
      (res) => {
        if ((res.statusCode || 0) < 200 || (res.statusCode || 0) >= 400) {
          res.resume();
          resolve({ ok: false, status: res.statusCode || 0, icon: iconName });
          return;
        }

        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          if (!buf.length) {
            resolve({ ok: false, status: res.statusCode || 0, icon: iconName });
            return;
          }
          const out = path.join(ICON_DIR, `${iconName}.png`);
          fs.writeFileSync(out, buf);
          resolve({ ok: true, status: res.statusCode || 0, icon: iconName });
        });
      }
    );

    req.setTimeout(20000, () => req.destroy(new Error('timeout')));
    req.on('error', () => resolve({ ok: false, status: 0, icon: iconName }));
  });
}

async function main() {
  if (!fs.existsSync(DATA_FILE)) {
    console.error('Missing data file:', DATA_FILE);
    process.exit(1);
  }

  fs.mkdirSync(ICON_DIR, { recursive: true });
  const icons = loadIconsFromData();
  const missing = icons.filter((name) => {
    const p = path.join(ICON_DIR, `${name}.png`);
    return !fs.existsSync(p) || fs.statSync(p).size === 0;
  });

  console.log(`Total icons: ${icons.length}`);
  console.log(`Need download: ${missing.length}`);

  const concurrency = 16;
  let index = 0;
  let active = 0;
  let ok = 0;
  let fail = 0;
  const failed = [];

  await new Promise((done) => {
    function pump() {
      if (index >= missing.length && active === 0) {
        done();
        return;
      }

      while (active < concurrency && index < missing.length) {
        const iconName = missing[index++];
        active++;

        downloadIcon(iconName)
          .then((r) => {
            if (r.ok) ok++;
            else {
              fail++;
              failed.push(`${r.icon} (${r.status})`);
            }
          })
          .finally(() => {
            active--;
            pump();
          });
      }
    }

    pump();
  });

  console.log(`Downloaded: ${ok}, Failed: ${fail}`);
  if (failed.length) {
    console.log('Failed sample:', failed.slice(0, 20).join(', '));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

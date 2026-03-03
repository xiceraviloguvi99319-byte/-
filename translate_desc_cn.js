const fs = require('fs');
const path = require('path');
const vm = require('vm');
const https = require('https');

const DATA_FILE = path.join(__dirname, 'talent_data_official_full.js');
const CACHE_FILE = path.join(__dirname, 'desc_cn_cache.json');

function loadTalentData() {
  const code = fs.readFileSync(DATA_FILE, 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return {
    data: sandbox.window.TALENT_DATA || {},
    list: sandbox.window.TALENT_CLASS_LIST || []
  };
}

function loadCache() {
  if (!fs.existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch (_) {
    return {};
  }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
}

function hasChinese(s) {
  return /[\u4e00-\u9fff]/.test(String(s || ''));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isBadTranslationText(s) {
  const x = String(s || '').trim();
  if (!x) return true;
  if (/MYMEMORY WARNING/i.test(x)) return true;
  if (/QUERY LENGTH LIMIT EXCEEDED/i.test(x)) return true;
  if (/VISIT HTTPS?:\/\//i.test(x)) return true;
  return false;
}

function postJson(hostname, pathName, payload) {
  return new Promise((resolve) => {
    const body = JSON.stringify(payload);
    const req = https.request(
      {
        hostname,
        path: pathName,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(body),
          'user-agent': 'Mozilla/5.0'
        }
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          if (res.statusCode !== 200) return resolve('');
          try {
            const json = JSON.parse(raw);
            resolve(String(json.translatedText || '').trim());
          } catch (_) {
            resolve('');
          }
        });
      }
    );
    req.on('error', () => resolve(''));
    req.write(body);
    req.end();
  });
}

function myMemoryTranslate(text) {
  return new Promise((resolve) => {
    const url =
      'https://api.mymemory.translated.net/get?q=' +
      encodeURIComponent(text) +
      '&langpair=en|zh-CN';
    https
      .get(url, (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            const json = JSON.parse(raw);
            const out = String(
              (json &&
                json.responseData &&
                json.responseData.translatedText) ||
                ''
            ).trim();
            resolve(out);
          } catch (_) {
            resolve('');
          }
        });
      })
      .on('error', () => resolve(''));
  });
}

async function translateOne(text) {
  // Primary translator (no API key).
  const primary = await postJson('translate.cutie.dating', '/translate', {
    q: text,
    source: 'en',
    target: 'zh',
    format: 'text'
  });
  if (!isBadTranslationText(primary)) return primary;

  // Fallback translator.
  const fallback = await myMemoryTranslate(text);
  if (!isBadTranslationText(fallback)) return fallback;

  // Last fallback: keep source text instead of warning garbage.
  return text;
}

function collectUniqueDescriptions(data) {
  const set = new Set();
  for (const cls of Object.values(data)) {
    for (const tree of cls.trees || []) {
      for (const t of tree.talents || []) {
        const d = String(t.desc || '').trim();
        if (d) set.add(d);
      }
    }
  }
  return Array.from(set);
}

function applyDescCn(data, cache) {
  let total = 0;
  let withCn = 0;
  for (const cls of Object.values(data)) {
    for (const tree of cls.trees || []) {
      for (const t of tree.talents || []) {
        total++;
        const d = String(t.desc || '').trim();
        if (!d) {
          t.descCn = '';
          continue;
        }
        const cn = String(cache[d] || '').trim();
        t.descCn = cn || '';
        if (t.descCn) withCn++;
      }
    }
  }
  return { total, withCn };
}

function saveData(data, list) {
  const out = [
    '// Auto-generated from official class snapshots (*.txt).',
    '// Source script: build_talent_data.js',
    'window.TALENT_DATA = ' + JSON.stringify(data, null, 2) + ';',
    'window.TALENT_CLASS_LIST = ' + JSON.stringify(list, null, 2) + ';',
    ''
  ].join('\n');
  fs.writeFileSync(DATA_FILE, out, 'utf8');
}

async function main() {
  const { data, list } = loadTalentData();
  const cache = loadCache();
  const allDesc = collectUniqueDescriptions(data);

  const pending = allDesc.filter((d) => {
    const c = String(cache[d] || '').trim();
    if (!c) return true;
    if (isBadTranslationText(c)) return true;
    if (!hasChinese(c)) return true;
    return false;
  });
  console.log('unique desc:', allDesc.length);
  console.log('need translate/retry:', pending.length);

  for (let i = 0; i < pending.length; i++) {
    const d = pending[i];
    const cn = await translateOne(d);
    cache[d] = cn;
    if ((i + 1) % 20 === 0 || i + 1 === pending.length) {
      console.log(`translated ${i + 1}/${pending.length}`);
      saveCache(cache);
    }
    await sleep(80);
  }

  for (const k of Object.keys(cache)) {
    const v = String(cache[k] || '').trim();
    if (!v) continue;
    if (!hasChinese(v)) cache[k] = v;
  }

  saveCache(cache);
  const stats = applyDescCn(data, cache);
  saveData(data, list);
  console.log('with descCn:', `${stats.withCn}/${stats.total}`);
  console.log('updated:', DATA_FILE);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

const fs = require('fs');
const path = require('path');

const CLASS_META = {
  Warrior: { id: 'warrior', nameCn: '战士', icon: 'class_warrior' },
  Paladin: { id: 'paladin', nameCn: '圣骑士', icon: 'class_paladin' },
  Mage: { id: 'mage', nameCn: '法师', icon: 'class_mage' },
  Hunter: { id: 'hunter', nameCn: '猎人', icon: 'class_hunter' },
  Rogue: { id: 'rogue', nameCn: '盗贼', icon: 'class_rogue' },
  Priest: { id: 'priest', nameCn: '牧师', icon: 'class_priest' },
  Shaman: { id: 'shaman', nameCn: '萨满', icon: 'class_shaman' },
  Warlock: { id: 'warlock', nameCn: '术士', icon: 'class_warlock' },
  Druid: { id: 'druid', nameCn: '德鲁伊', icon: 'class_druid' }
};

const TREE_CN = {
  warrior: { Arms: '武器', Fury: '狂暴', Protection: '防护' },
  paladin: { Holy: '神圣', Protection: '防护', Retribution: '惩戒' },
  mage: { Arcane: '奥术', Fire: '火焰', Frost: '冰霜' },
  hunter: { 'Beast Mastery': '野兽控制', Marksmanship: '射击', Survival: '生存' },
  rogue: { Assassination: '刺杀', Combat: '战斗', Subtlety: '敏锐' },
  priest: { Discipline: '戒律', Holy: '神圣', Shadow: '暗影' },
  shaman: { Elemental: '元素', Enhancement: '增强', Restoration: '恢复' },
  warlock: { Affliction: '痛苦', Demonology: '恶魔', Destruction: '毁灭' },
  druid: { Balance: '平衡', 'Feral Combat': '野性战斗', Restoration: '恢复' }
};

const CLASS_ORDER = [
  'warrior',
  'paladin',
  'mage',
  'hunter',
  'rogue',
  'priest',
  'shaman',
  'warlock',
  'druid'
];

function parseClassName(content) {
  const m = content.match(/<title>([^<]+) - Talent Calculator/);
  return m ? m[1] : null;
}

function parseClassColor(content) {
  const m = content.match(/<h3[^>]*style="color:([#A-Fa-f0-9]+)"/);
  return m ? m[1] : '#FFFFFF';
}

function parseTreeHeaders(content) {
  const result = [];
  const spanRe = /<span class="h4 grow truncate" title="([^"]+)">/g;
  let m;

  while ((m = spanRe.exec(content)) !== null) {
    const name = m[1];
    const back = content.slice(Math.max(0, m.index - 1500), m.index);
    const icons = [...back.matchAll(/\/icons\/([^"\/]+)\.png/g)]
      .map((x) => x[1])
      .filter((x) => !x.startsWith('class_') && x !== 'icon_hover');
    const icon = icons.length ? icons[icons.length - 1] : 'inv_misc_questionmark';
    result.push({ name, icon });
  }

  return result.slice(0, 3);
}

function parseDescriptions(content) {
  const map = {};
  const re = /<div class="fixed z-10[^>]*>[\s\S]*?<h4 class="tw-color">([^<]+)<\/h4>[\s\S]*?<p class="whitespace-pre-wrap">([\s\S]*?)<\/p>/g;
  let m;

  while ((m = re.exec(content)) !== null) {
    const name = decodeHtmlEntities(m[1].trim());
    const raw = m[2];
    const desc = cleanHtmlText(raw);
    if (!name || !desc) continue;
    if (!map[name]) map[name] = desc;
  }

  return map;
}

function parseDescriptionsFromFlight(content) {
  const map = {};
  const normalized = normalizeFlightData(content);
  const nameMarker = /\\"className\\":\\"tw-color\\",\\"children\\":\\"([^\\"]+)\\"/g;
  const descMarker = '\\"className\\":\\"whitespace-pre-wrap\\",\\"children\\":[';
  const nextNameToken = '\\"className\\":\\"tw-color\\",\\"children\\":\\"';
  let m;

  while ((m = nameMarker.exec(normalized)) !== null) {
    const name = m[1];
    if (!name || map[name]) continue;

    const from = m.index;
    const markerIndex = normalized.indexOf(descMarker, from);
    if (markerIndex < 0) continue;

    const nextNameIndex = normalized.indexOf(nextNameToken, from + 1);
    if (nextNameIndex >= 0 && markerIndex > nextNameIndex) continue;
    if (markerIndex - from > 2800) continue;

    const bracketStart = markerIndex + descMarker.length - 1;
    const childrenRaw = extractBracketArray(normalized, bracketStart);
    if (!childrenRaw) continue;

    const desc = decodeFlightChildren(childrenRaw);
    if (desc) map[name] = desc;
  }

  return map;
}

function cleanHtmlText(html) {
  let s = String(html);
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/p>/gi, '\n');
  s = s.replace(/<[^>]+>/g, ' ');
  s = decodeHtmlEntities(s);
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/\[\s+/g, '[').replace(/\s+\]/g, ']');
  s = s.replace(/\s*\/\s*/g, '/');
  s = s.replace(/\s+([,.%:;!?])/g, '$1');
  return s.trim();
}

function decodeHtmlEntities(s) {
  return String(s)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#([0-9]+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)));
}

function extractBracketArray(text, startBracketIndex) {
  let depth = 1;
  let i = startBracketIndex + 1;
  while (i < text.length && depth > 0) {
    const ch = text[i];
    if (ch === '[') depth++;
    else if (ch === ']') depth--;
    i++;
  }
  if (depth !== 0) return null;
  return text.slice(startBracketIndex + 1, i - 1);
}

function decodeFlightChildren(childrenRaw) {
  try {
    const jsonText = ('[' + childrenRaw + ']').replace(/\\"/g, '"');
    const arr = JSON.parse(jsonText);
    const out = [];
    flattenFlightNode(arr, out);
    const desc = out
      .join('')
      .replace(/\\r\\n/g, ' ')
      .replace(/\\n/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.%:;!?])/g, '$1')
      .trim();
    return desc;
  } catch (_) {
    return '';
  }
}

function flattenFlightNode(node, out) {
  if (node === null || node === undefined) return;

  if (typeof node === 'string') {
    if (node === '$') return;
    if (/^\$L\w+$/i.test(node)) return;
    out.push(node);
    return;
  }

  if (typeof node === 'number') {
    out.push(String(node));
    return;
  }

  if (Array.isArray(node)) {
    if (
      node[0] === '$' &&
      node[1] === '$L1e' &&
      node[3] &&
      Array.isArray(node[3].values)
    ) {
      out.push('[' + node[3].values.join('/') + ']');
      return;
    }
    node.forEach((x) => flattenFlightNode(x, out));
  }
}

function parseTalents(content) {
  const normalized = normalizeFlightData(content);
  const re = /\\"i\\":(\d+),\\"index\\":(\d+),\\"icon\\":\\"([^\\"]+)\\",\\"ranks\\":(\d+),\\"requires\\":(.*?),\\"reqRanks\\":(.*?),\\"reqBy\\":[\s\S]*?\\"className\\":\\"tw-color\\",\\"children\\":\\"([^\\"]+)\\"/g;
  const talents = [];
  let m;

  while ((m = re.exec(normalized)) !== null) {
    const slot = Number(m[1]);
    const treeIndex = Number(m[2]);
    const icon = m[3];
    const maxRanks = Number(m[4]);
    const req = parseOptionalNumber(m[5]);
    let reqRanks = parseOptionalNumber(m[6]);
    const name = m[7];
    if (req !== null && reqRanks === null) reqRanks = 1;

    talents.push({
      id: slot,
      slot,
      treeIndex,
      n: name,
      i: icon,
      m: maxRanks,
      r: Math.floor(slot / 4),
      c: slot % 4,
      req,
      reqRanks
    });
  }

  // Deduplicate by tree+slot to handle stream overlaps.
  const seen = new Set();
  return talents.filter((t) => {
    const key = `${t.treeIndex}:${t.slot}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeFlightData(text) {
  return text.replace(/"\]\)\s*<\/script>\s*<script>\s*self\.__next_f\.push\(\[1,\s*"/g, '');
}

function parseOptionalNumber(raw) {
  const clean = String(raw).replace(/\\"/g, '"').replace(/"/g, '').trim();
  if (/^\d+$/.test(clean)) return Number(clean);
  return null;
}

function loadDescCnCache() {
  const p = path.join(__dirname, 'desc_cn_cache.json');
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) {
    return {};
  }
}

function build() {
  const txtFiles = fs.readdirSync('.').filter((f) => f.endsWith('.txt'));
  const descCnCache = loadDescCnCache();
  const data = {};

  for (const file of txtFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const className = parseClassName(content);
    if (!className || !CLASS_META[className]) continue;

    const meta = CLASS_META[className];
    const color = parseClassColor(content);
    const treeHeaders = parseTreeHeaders(content);
    const descMapHtml = parseDescriptions(content);
    const descMapFlight = parseDescriptionsFromFlight(content);
    const allTalents = parseTalents(content);

    const trees = [];
    for (let idx = 0; idx < 3; idx++) {
      const header = treeHeaders[idx] || { name: `Tree ${idx + 1}`, icon: 'inv_misc_questionmark' };
      const talents = allTalents
        .filter((t) => t.treeIndex === idx)
        .sort((a, b) => (a.r - b.r) || (a.c - b.c) || a.n.localeCompare(b.n))
        .map((t) => ({
          id: t.id,
          n: t.n,
          i: t.i,
          m: t.m,
          r: t.r,
          c: t.c,
          req: t.req,
          reqRanks: t.reqRanks,
          desc: descMapHtml[t.n] || descMapFlight[t.n] || '',
          descCn: descCnCache[descMapHtml[t.n] || descMapFlight[t.n] || ''] || ''
        }));

      const treeCnMap = TREE_CN[meta.id] || {};
      trees.push({
        name: header.name,
        nameCn: treeCnMap[header.name] || header.name,
        icon: header.icon,
        talents
      });
    }

    data[meta.id] = {
      name: meta.nameCn,
      color,
      trees
    };
  }

  const list = CLASS_ORDER.filter((id) => data[id]).map((id) => {
    const classEn = Object.keys(CLASS_META).find((k) => CLASS_META[k].id === id);
    const meta = CLASS_META[classEn];
    return { id, n: meta.nameCn, icon: meta.icon };
  });

  const out = [
    '// Auto-generated from official class snapshots (*.txt).',
    '// Source script: build_talent_data.js',
    'window.TALENT_DATA = ' + JSON.stringify(data, null, 2) + ';',
    'window.TALENT_CLASS_LIST = ' + JSON.stringify(list, null, 2) + ';',
    ''
  ].join('\n');

  const outPath = path.join(__dirname, 'talent_data_official_full.js');
  fs.writeFileSync(outPath, out, 'utf8');

  for (const id of CLASS_ORDER) {
    if (!data[id]) continue;
    const counts = data[id].trees.map((t) => t.talents.length).join('/');
    console.log(`${id}: ${counts}`);
  }
  console.log(`Generated: ${outPath}`);
}

build();

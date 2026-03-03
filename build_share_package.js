const fs = require('fs');
const path = require('path');

const SOURCE_HTML = '天赋模拟器.html';
const DATA_JS = 'talent_data_official_full.js';
const OUT_DIR = 'share';
const OUT_HTML = path.join(OUT_DIR, 'index.html');
const OUT_GUIDE = path.join(OUT_DIR, 'README_SHARE.md');

function main() {
  if (!fs.existsSync(SOURCE_HTML)) {
    throw new Error(`Missing file: ${SOURCE_HTML}`);
  }
  if (!fs.existsSync(DATA_JS)) {
    throw new Error(`Missing file: ${DATA_JS}`);
  }

  let html = fs.readFileSync(SOURCE_HTML, 'utf8');
  const dataJs = fs.readFileSync(DATA_JS, 'utf8');

  // Inline talent data for single-file sharing.
  html = html.replace(
    /<script\s+src="talent_data_official_full\.js[^"]*"><\/script>/i,
    `<script>\n${dataJs}\n    </script>`
  );

  // Shared build: load icons directly from public CDN path.
  html = html.replace(
    /var ICON_BASE_LOCAL\s*=\s*'[^']*';/,
    "var ICON_BASE_LOCAL = 'https://talents.turtlecraft.gg/icons/';"
  );
  html = html.replace(
    /var ICON_BASE_REMOTE\s*=\s*'[^']*';/,
    "var ICON_BASE_REMOTE = 'https://talents.turtlecraft.gg/icons/';"
  );

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);
  fs.writeFileSync(OUT_HTML, html, 'utf8');

  const guide = [
    '# 分享说明',
    '',
    '## 文件',
    '- `index.html`: 单文件分享版，可直接上传静态托管。',
    '',
    '## 最简单发布方式（推荐）',
    '1. 打开 https://app.netlify.com/drop',
    '2. 把 `index.html` 拖进去',
    '3. 等待生成公开链接',
    '4. 把链接发到微信给别人测试',
    '',
    '## 微信内打开建议',
    '- 若页面未更新，让对方在微信里下拉刷新，或在右上角菜单里“刷新”。',
    '- 若仍旧缓存，给链接后面加版本参数，例如：`?v=20260228`。',
    ''
  ].join('\n');
  fs.writeFileSync(OUT_GUIDE, guide, 'utf8');

  console.log(`Generated: ${OUT_HTML}`);
  console.log(`Generated: ${OUT_GUIDE}`);
}

main();

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const sourceHtml = path.join(projectRoot, "share", "index.html");
const distDir = path.join(projectRoot, "dist");
const distHtml = path.join(distDir, "index.html");
const remoteIconBase = "https://talents.turtlecraft.gg/icons/";

function ensureExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`${label} not found: ${targetPath}`);
  }
}

function removeIfExists(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function patchIconBase(html) {
  let output = html;
  output = output.replace(
    /var\s+ICON_BASE_LOCAL\s*=\s*'[^']*';/g,
    `var ICON_BASE_LOCAL = '${remoteIconBase}';`
  );
  output = output.replace(
    /var\s+ICON_BASE_REMOTE\s*=\s*'[^']*';/g,
    `var ICON_BASE_REMOTE = '${remoteIconBase}';`
  );
  return output;
}

function writeBuildMeta() {
  const metaFile = path.join(distDir, "build-meta.json");
  const payload = {
    builtAt: new Date().toISOString(),
    source: "share/index.html"
  };
  fs.writeFileSync(metaFile, JSON.stringify(payload, null, 2), "utf8");
}

function main() {
  ensureExists(sourceHtml, "Source HTML");

  removeIfExists(distDir);
  fs.mkdirSync(distDir, { recursive: true });

  const html = fs.readFileSync(sourceHtml, "utf8");
  const patchedHtml = patchIconBase(html);
  fs.writeFileSync(distHtml, patchedHtml, "utf8");

  writeBuildMeta();

  console.log(`Built H5 package to: ${distDir}`);
  console.log(`index.html: ${distHtml}`);
  console.log(`icons base: ${remoteIconBase}`);
}

try {
  main();
} catch (error) {
  console.error("[build:h5] failed");
  if (error && error.stack) {
    console.error(error.stack);
  } else {
    console.error(String(error));
  }
  process.exit(1);
}

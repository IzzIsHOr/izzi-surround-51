// Builds the distributable zip. Run with: node dev/build.cjs
//
// Only what the extension needs goes in, so the dev harness never ships: it
// fakes chrome.* and would be dead weight at best.
//
// manifest.json sits at the root of the archive, which is what the Chrome Web
// Store requires and what "Load unpacked" expects after unzipping.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const INCLUDE = [
  "manifest.json",
  "LICENSE",
  "README.md",
  "PRIVACY.md",
  "bridge.js",
  "upmix.js",
  "options.html",
  "options.css",
  "options.js",
  "icons"
];

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
const dist = path.join(ROOT, "dist");
const stage = path.join(dist, "izzi-surround-51");
const zip = path.join(dist, `izzi-surround-51-v${manifest.version}.zip`);

// Only clear the staging folder and stale zips. dist/ also holds the store
// screenshots and promo tiles, and wiping it threw those away.
fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(stage, { recursive: true });
for (const f of fs.existsSync(dist) ? fs.readdirSync(dist) : []) {
  if (f.endsWith(".zip")) fs.rmSync(path.join(dist, f));
}

let files = 0;
for (const entry of INCLUDE) {
  const from = path.join(ROOT, entry);
  if (!fs.existsSync(from)) throw new Error("missing: " + entry);
  const to = path.join(stage, entry);
  if (fs.statSync(from).isDirectory()) {
    fs.cpSync(from, to, { recursive: true });
    const walk = (d) => {
      for (const name of fs.readdirSync(d)) {
        const p = path.join(d, name);
        fs.statSync(p).isDirectory() ? walk(p) : files++;
      }
    };
    walk(to);
  } else {
    fs.copyFileSync(from, to);
    files++;
  }
}

// `key` pins the extension ID for a local unpacked install, so moving the
// folder does not orphan the user's settings. The Chrome Web Store signs with
// its own key and does not want this field, so it is stripped from the package.
const staged = path.join(stage, "manifest.json");
const m = JSON.parse(fs.readFileSync(staged, "utf8"));
if (m.key) {
  delete m.key;
  fs.writeFileSync(staged, JSON.stringify(m, null, 2) + "\n");
  console.log("stripped `key` from the packaged manifest");
}

execFileSync(
  "powershell",
  [
    "-NoProfile",
    "-Command",
    `Compress-Archive -Path '${stage}\\*' -DestinationPath '${zip}' -Force`
  ],
  { stdio: "inherit" }
);

console.log(`\n${path.relative(ROOT, zip)}`);
console.log(`${files} files, ${(fs.statSync(zip).size / 1024).toFixed(1)} KB`);

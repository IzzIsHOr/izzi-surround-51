// Captures Chrome Web Store assets. Run with: node dev/shots.cjs
//
// Needs the dev server running: node dev/server.cjs
//
// The options page is about 4200px tall and the store wants 1280x800, so it is
// captured whole and sliced. Scrolling before the shot does not work: headless
// runs on virtual time and the scroll never lands, which produced a blank strip
// the first time round.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const png = require("./png.cjs");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PAGE = "http://localhost:5178/dev-preview.html?nofx=1";
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "dist", "shots");

const TALL = 2600; // generous; the real content height is measured below

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const tallFile = path.join(OUT, "_full.png");
execFileSync(
  CHROME,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    `--window-size=1280,${TALL}`,
    "--virtual-time-budget=6000",
    "--screenshot=" + tallFile,
    PAGE
  ],
  { stdio: ["ignore", "ignore", "ignore"] }
);

const full = png.decode(fs.readFileSync(tallFile));

/**
 * Where the page actually ends.
 *
 * Hardcoding it went wrong once: the height was measured in a narrow pane, the
 * capture happens at 1280 where the layout is far shorter, and two of the four
 * slices came out as empty background. Scanning up from the bottom for the
 * first row that is not flat background gets it right whatever the layout does.
 */
function contentHeight(img) {
  const { width, height, channels, pixels } = img;
  const at = (x, y, c) => pixels[(y * width + x) * channels + c];
  const bg = [at(0, height - 1, 0), at(0, height - 1, 1), at(0, height - 1, 2)];
  for (let y = height - 1; y > 0; y--) {
    for (let x = 0; x < width; x += 4) {
      if (
        Math.abs(at(x, y, 0) - bg[0]) > 6 ||
        Math.abs(at(x, y, 1) - bg[1]) > 6 ||
        Math.abs(at(x, y, 2) - bg[2]) > 6
      ) {
        return Math.min(height, y + 24); // a little breathing room below
      }
    }
  }
  return height;
}

const tall = contentHeight(full);
console.log(`page content is ${tall}px tall at 1280 wide
`);

// tile the page in 800px slices, the last one flush with the bottom
const offsets = [0];
if (tall > 800) {
  const steps = Math.ceil((tall - 800) / 700);
  for (let i = 1; i <= steps; i++) {
    offsets.push(Math.min(Math.round((i * (tall - 800)) / steps), TALL - 800));
  }
}

offsets.forEach((y, i) => {
  const name = String(i + 1).padStart(2, "0") + "-options";
  const file = path.join(OUT, name + ".png");
  fs.writeFileSync(file, png.encodeRgb(png.crop(full, 0, y, 1280, 800)));
  console.log(`${name}.png  1280x800  from y=${y}  ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
});

fs.rmSync(tallFile);

/* ------------------------------------------------------------- store icon */
//
// The store's listing icon is uploaded separately from the ones in the package,
// and Google asks for 96x96 of artwork inside a 128px canvas. The packaged icon
// fills all 128, so it would render larger than every neighbouring extension.

const promo = path.join(ROOT, "dist", "promo");
fs.mkdirSync(promo, { recursive: true });

const icon = png.decode(fs.readFileSync(path.join(ROOT, "icons", "icon128.png")));
const padded = png.pad(png.resize(icon, 96, 96), 128);
const iconFile = path.join(promo, "store-icon-128.png");
fs.writeFileSync(iconFile, png.encodeRgba(padded));
console.log(`\nstore-icon-128.png  128x128  96px artwork with 16px padding`);

console.log("\n" + path.relative(ROOT, OUT) + "  and  " + path.relative(ROOT, promo));

// Generates the toolbar icon: icons/play*.png. Run with:
//   node dev/make-play-icon.cjs
//
// Chrome does not recolour an extension's action icon to match the browser
// theme, and there is no API a service worker can read the theme from, so a
// single icon has to survive both. A white triangle with a dark outline does:
// on a light toolbar the outline draws the shape, on a dark one the white fill
// does. A flat black or flat white triangle disappears on one of the two.
//
// The 5.1 badge in icons/icon*.png stays as it is. That one is the store
// identity; this is the button.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const CRC = (() => {
  const t = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crc32 = (b) => {
  let c = 0xffffffff;
  for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

// signed distance to a triangle, so the edge can be antialiased and outlined
function sdTriangle(px, py, a, b, c) {
  const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1];
  const clamp = (v) => Math.min(1, Math.max(0, v));

  const p = [px, py];
  const e0 = sub(b, a), e1 = sub(c, b), e2 = sub(a, c);
  const v0 = sub(p, a), v1 = sub(p, b), v2 = sub(p, c);

  const pq = (e, v) => {
    const t = clamp(dot(v, e) / dot(e, e));
    return [v[0] - e[0] * t, v[1] - e[1] * t];
  };
  const p0 = pq(e0, v0), p1 = pq(e1, v1), p2 = pq(e2, v2);
  const s = Math.sign(e0[0] * e2[1] - e0[1] * e2[0]);

  const d = Math.min(
    Math.min(dot(p0, p0), dot(p1, p1)),
    dot(p2, p2)
  );
  const sg = Math.min(
    Math.min(s * (v0[0] * e0[1] - v0[1] * e0[0]), s * (v1[0] * e1[1] - v1[1] * e1[0])),
    s * (v2[0] * e2[1] - v2[1] * e2[0])
  );
  return -Math.sqrt(d) * Math.sign(sg);
}

function render(size) {
  const SS = 4;
  const S = size * SS;
  const acc = new Float64Array(size * size * 4);

  // a rounded-looking play triangle, inset so it does not touch the edges
  const A = [0.30, 0.18], B = [0.30, 0.82], C = [0.82, 0.50];
  const stroke = 0.075; // outline thickness, in fractions of the icon

  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const x = (px + 0.5) / S;
      const y = (py + 0.5) / S;
      const d = sdTriangle(x, y, A, B, C);

      let r, g, b, a;
      if (d <= 0) {
        // inside: white
        r = g = b = 255;
        a = 255;
      } else if (d <= stroke) {
        // the outline, fading out so the edge stays smooth
        r = g = b = 26;
        a = 255 * (1 - d / stroke) ** 0.6;
      } else {
        continue;
      }

      const i = (Math.floor(py / SS) * size + Math.floor(px / SS)) * 4;
      acc[i] += r * (a / 255);
      acc[i + 1] += g * (a / 255);
      acc[i + 2] += b * (a / 255);
      acc[i + 3] += a;
    }
  }

  const out = Buffer.alloc(size * size * 4);
  const n = SS * SS;
  for (let i = 0; i < size * size; i++) {
    const a = acc[i * 4 + 3] / n;
    const cov = a / 255 || 1;
    out[i * 4] = Math.min(255, Math.round(acc[i * 4] / n / cov));
    out[i * 4 + 1] = Math.min(255, Math.round(acc[i * 4 + 1] / n / cov));
    out[i * 4 + 2] = Math.min(255, Math.round(acc[i * 4 + 2] / n / cov));
    out[i * 4 + 3] = Math.round(a);
  }
  return out;
}

const dir = path.resolve(__dirname, "..", "icons");
for (const size of [16, 32, 48, 128]) {
  const file = path.join(dir, `play${size}.png`);
  fs.writeFileSync(file, png(size, render(size)));
  console.log("wrote icons/play" + size + ".png");
}

// Just enough PNG to read a capture back, crop it and write it out again.
// No dependency needed: an IHDR, one deflated IDAT and an IEND is the whole
// format for what these scripts do.

const zlib = require("zlib");

const CRC_TABLE = (() => {
  const t = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Reads a PNG into {width, height, channels, pixels}. */
function decode(buf) {
  let pos = 8;
  let width = 0;
  let height = 0;
  let colourType = 0;
  const idat = [];

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8) throw new Error("only 8-bit depth is handled");
      colourType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + len;
  }

  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colourType];
  if (!channels) throw new Error("unhandled colour type " + colourType);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? out[y * stride + i - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + i] : 0;
      const c = i >= channels && y > 0 ? out[(y - 1) * stride + i - channels] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + i] = v & 0xff;
    }
  }

  return { width, height, channels, pixels: out };
}

function write(width, height, outChannels, rowBytes) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = outChannels === 4 ? 6 : 2;

  const stride = width * outChannels;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rowBytes(y).copy(raw, y * (stride + 1) + 1);
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

/** 24-bit truecolour, no alpha. What the store accepts for images. */
function encodeRgb(img) {
  const { width, height, channels, pixels } = img;
  const row = Buffer.alloc(width * 3);
  return write(width, height, 3, (y) => {
    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * channels;
      row[x * 3] = pixels[s];
      row[x * 3 + 1] = pixels[s + 1];
      row[x * 3 + 2] = pixels[s + 2];
    }
    return row;
  });
}

/** Keeps the alpha channel. Used for icons, which need transparent corners. */
function encodeRgba(img) {
  const { width, height, pixels } = img;
  const row = Buffer.alloc(width * 4);
  return write(width, height, 4, (y) => {
    pixels.copy(row, 0, y * width * 4, (y + 1) * width * 4);
    return row;
  });
}

/** Cuts a rectangle out, for slicing one tall capture into store-sized shots. */
function crop(img, x, y, w, h) {
  const { width, channels, pixels } = img;
  const out = Buffer.alloc(w * h * channels);
  for (let row = 0; row < h; row++) {
    const from = ((y + row) * width + x) * channels;
    pixels.copy(out, row * w * channels, from, from + w * channels);
  }
  return { width: w, height: h, channels, pixels: out };
}

/**
 * Box-filter downscale. Alpha is premultiplied first and divided back out
 * after, otherwise transparent pixels drag their colour into the edges and the
 * result gets a dark fringe.
 */
function resize(img, w, h) {
  const { width, height, channels, pixels } = img;
  const out = Buffer.alloc(w * h * channels);
  const sx = width / w;
  const sy = height / h;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * sx);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
      const y0 = Math.floor(y * sy);
      const y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));

      let acc = [0, 0, 0, 0];
      let n = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const s = (yy * width + xx) * channels;
          const a = channels === 4 ? pixels[s + 3] / 255 : 1;
          for (let c = 0; c < Math.min(3, channels); c++) acc[c] += pixels[s + c] * a;
          if (channels === 4) acc[3] += pixels[s + 3];
          n++;
        }
      }

      const d = (y * w + x) * channels;
      const alpha = channels === 4 ? acc[3] / n : 255;
      const cov = alpha / 255 || 1;
      for (let c = 0; c < Math.min(3, channels); c++) {
        out[d + c] = Math.round(acc[c] / n / cov);
      }
      if (channels === 4) out[d + 3] = Math.round(alpha);
    }
  }

  return { width: w, height: h, channels, pixels: out };
}

/** Places an image into a larger transparent canvas, centred. */
function pad(img, size) {
  const out = Buffer.alloc(size * size * 4);
  const off = Math.round((size - img.width) / 2);
  for (let y = 0; y < img.height; y++) {
    img.pixels.copy(
      out,
      ((y + off) * size + off) * 4,
      y * img.width * 4,
      (y + 1) * img.width * 4
    );
  }
  return { width: size, height: size, channels: 4, pixels: out };
}

module.exports = { decode, encodeRgb, encodeRgba, crop, resize, pad };

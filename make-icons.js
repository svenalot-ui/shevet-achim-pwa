// Generates app icons: cream square with a gold Star of David (hexagram).
// Pure Node (zlib), no dependencies. Run: node make-icons.js
const zlib = require('zlib');
const fs = require('fs');

const BG = [0xF1, 0xEF, 0xEA];   // cream
const FG = [0xA1, 0x62, 0x07];   // gold

function crcTable() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
}
const CRC = crcTable();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function triSign(px, py, ax, ay, bx, by) { return (px - bx) * (ay - by) - (ax - bx) * (py - by); }
function inTri(px, py, v) {
  const d1 = triSign(px, py, v[0][0], v[0][1], v[1][0], v[1][1]);
  const d2 = triSign(px, py, v[1][0], v[1][1], v[2][0], v[2][1]);
  const d3 = triSign(px, py, v[2][0], v[2][1], v[0][0], v[0][1]);
  const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}
function verts(cx, cy, R, angs) { return angs.map(a => [cx + R * Math.cos(a * Math.PI / 180), cy + R * Math.sin(a * Math.PI / 180)]); }

function makePNG(S) {
  const c = S / 2, R = S * 0.40;
  const up = verts(c, c, R, [-90, 30, 150]);
  const down = verts(c, c, R, [90, 210, 330]);
  const SS = 2; // supersample
  const raw = Buffer.alloc(S * (1 + S * 4));
  for (let y = 0; y < S; y++) {
    raw[y * (1 + S * 4)] = 0; // filter: none
    for (let x = 0; x < S; x++) {
      let cov = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const px = x + (sx + 0.5) / SS, py = y + (sy + 0.5) / SS;
        if (inTri(px, py, up) || inTri(px, py, down)) cov++;
      }
      const f = cov / (SS * SS);
      const r = Math.round(BG[0] * (1 - f) + FG[0] * f);
      const g = Math.round(BG[1] * (1 - f) + FG[1] * f);
      const b = Math.round(BG[2] * (1 - f) + FG[2] * f);
      const o = y * (1 + S * 4) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4); ihdr[8] = 8; ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

for (const s of [512, 192, 180]) {
  fs.writeFileSync(`${__dirname}/icon-${s}.png`, makePNG(s));
  console.log('wrote icon-' + s + '.png');
}

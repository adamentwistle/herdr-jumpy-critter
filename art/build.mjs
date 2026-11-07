// Draws the character, one letter a pixel, and writes it as PNG with nothing but Node. Run: node art/build.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const COLOURS = { X: [217, 119, 87, 255], o: [20, 20, 19, 255], ".": [0, 0, 0, 0] };
const SCALE = 8;
const FRAMES = {
  down: [
    ".............",
    "..XXXXXXXXX..",
    "..XXXXXXXXX..",
    "..XXoXXXoXX..",
    "..XXoXXXoXX..",
    "XXXXXXXXXXXXX",
    "XXXXXXXXXXXXX",
    "..XXXXXXXXX..",
    "..X.X...X.X..",
    "..X.X...X.X..",
  ],
  up: [
    "..XXXXXXXXX..",
    "..XXXXXXXXX..",
    "XXXXoXXXoXXXX",
    "XXXXoXXXoXXXX",
    "..XXXXXXXXX..",
    "..XXXXXXXXX..",
    "..XXXXXXXXX..",
    "..X.X...X.X..",
    ".............",
    ".............",
  ],
  hit: [
    ".............",
    "..XXXXXXXXX..",
    "..XXXXXXXXX..",
    "..XoXoXoXoX..",
    "..XXoXXXoXX..",
    "XXXoXoXoXoXXX",
    "XXXXXXXXXXXXX",
    "..XXXXXXXXX..",
    "..X.X...X.X..",
    "..X.X...X.X..",
  ],
};

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = ~0; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return ~c >>> 0; };
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
}
function png(rows) {
  const w = rows[0].length * SCALE, h = rows.length * SCALE;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const colour = COLOURS[rows[Math.floor(y / SCALE)][Math.floor(x / SCALE)]];
    Buffer.from(colour).copy(raw, y * (w * 4 + 1) + 1 + x * 4);
  }
  const head = Buffer.alloc(13);
  head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4); head[8] = 8; head[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", head), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
for (const [name, rows] of Object.entries(FRAMES)) writeFileSync(new URL(`../mods/jumpycritter/art/${name}.png`, import.meta.url), png(rows));

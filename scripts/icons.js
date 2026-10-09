// Draws the extension's icon and writes it as the PNG files the manifest names.
//
//   node scripts/icons.js          writes src/icons/icon-<size>.png
//
// The icon is three lines of a Transcript on a dark page, the middle one a
// Highlight in the panel's own yellow. It is drawn on a grid of 16, so every
// edge falls on a whole pixel at 16, 32 and 48, and at 128, where the picture
// is 96 across with 16 of nothing around it, as the Chrome Web Store asks.
//
// Nothing is installed for it: the shapes are worked out here, point by point,
// and the PNG is written with Node's own zlib.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const to = fileURLToPath(new URL('../src/icons', import.meta.url));

/** The sizes the manifest names, each with the margin left clear around the picture. */
const SIZES = [
  { size: 16, margin: 0 },
  { size: 32, margin: 0 },
  { size: 48, margin: 0 },
  { size: 128, margin: 16 },
];

const PAGE = [0x16, 0x18, 0x1d];
const LINE = [0xb6, 0xbc, 0xc7];
const HIGHLIGHT = [0xff, 0xd2, 0x3f];

/** The picture, on a grid of 16: rectangles with rounded corners, the later over the earlier. */
const SHAPES = [
  { left: 0, top: 0, right: 16, bottom: 16, corner: 3.5, colour: PAGE },
  { left: 3, top: 3, right: 13, bottom: 5, corner: 1, colour: LINE },
  { left: 2, top: 6, right: 14, bottom: 10, corner: 1, colour: HIGHLIGHT },
  { left: 3, top: 11, right: 10, bottom: 13, corner: 1, colour: LINE },
];

/** Whether a point of the grid is inside a shape. */
const inside = ({ left, top, right, bottom, corner }, x, y) => {
  const nearestX = Math.min(Math.max(x, left + corner), right - corner);
  const nearestY = Math.min(Math.max(y, top + corner), bottom - corner);
  return x >= left && x <= right && y >= top && y <= bottom && Math.hypot(x - nearestX, y - nearestY) <= corner;
};

/** The colour at a point of the grid, or null where the picture is clear. */
const colourAt = (x, y) => SHAPES.findLast((shape) => inside(shape, x, y))?.colour ?? null;

/** How many points are looked at across each pixel, and down it, to smooth an edge. */
const FINE = 8;

/** The picture at one size, as rows of red, green, blue and how solid, a byte each. */
const draw = ({ size, margin }) => {
  const across = (size - 2 * margin) / 16;
  const pixels = Buffer.alloc(size * size * 4);
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      let red = 0;
      let green = 0;
      let blue = 0;
      let solid = 0;
      for (let down = 0; down < FINE; down += 1) {
        for (let along = 0; along < FINE; along += 1) {
          const colour = colourAt((column + (along + 0.5) / FINE - margin) / across, (row + (down + 0.5) / FINE - margin) / across);
          if (!colour) continue;
          red += colour[0];
          green += colour[1];
          blue += colour[2];
          solid += 1;
        }
      }
      const at = (row * size + column) * 4;
      if (solid > 0) pixels.set([Math.round(red / solid), Math.round(green / solid), Math.round(blue / solid), Math.round((255 * solid) / (FINE * FINE))], at);
    }
  }
  return pixels;
};

const CRC = Array.from({ length: 256 }, (_, byte) => {
  let crc = byte;
  for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});
const crcOf = (bytes) => (bytes.reduce((crc, byte) => CRC[(crc ^ byte) & 0xff] ^ (crc >>> 8), 0xffffffff) ^ 0xffffffff) >>> 0;

/** One chunk of a PNG: its length, its name, what it holds, and a check on the last two. */
const chunk = (name, held) => {
  const named = Buffer.concat([Buffer.from(name, 'latin1'), held]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(held.length);
  const check = Buffer.alloc(4);
  check.writeUInt32BE(crcOf(named));
  return Buffer.concat([length, named, check]);
};

/** The picture as a PNG file: 8 bits a channel, with transparency. */
const png = (size, pixels) => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8);
  // Each row starts with a byte saying it is written as it is, with no filter.
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let row = 0; row < size; row += 1) pixels.copy(rows, row * (size * 4 + 1) + 1, row * size * 4, (row + 1) * size * 4);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
};

mkdirSync(to, { recursive: true });
for (const each of SIZES) {
  writeFileSync(join(to, `icon-${each.size}.png`), png(each.size, draw(each)));
  console.log(`Drew ${join(to, `icon-${each.size}.png`)}`);
}

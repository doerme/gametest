'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 64;
const SCALE = 4;
const STROKE = 7;
const COLOR = [29, 39, 64];
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'images');

const ICONS = {
  up: [
    [[32, 54], [32, 12]],
    [[13, 30], [32, 11]],
    [[32, 11], [51, 30]]
  ],
  down: [
    [[32, 10], [32, 52]],
    [[13, 34], [32, 53]],
    [[32, 53], [51, 34]]
  ],
  left: [
    [[54, 32], [12, 32]],
    [[30, 13], [11, 32]],
    [[11, 32], [30, 51]]
  ],
  right: [
    [[10, 32], [52, 32]],
    [[34, 13], [53, 32]],
    [[53, 32], [34, 51]]
  ],
  v: [
    [[11, 12], [32, 53]],
    [[32, 53], [53, 12]]
  ],
  l: [
    [[17, 10], [17, 51]],
    [[17, 51], [53, 51]]
  ],
  z: [
    [[11, 12], [53, 12]],
    [[53, 12], [11, 52]],
    [[11, 52], [53, 52]]
  ]
};

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])), 0);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(data.length, 0);
  return Buffer.concat([size, name, data, crc]);
}

function distanceToSegment(x, y, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((x - start[0]) * dx + (y - start[1]) * dy) / lengthSquared));
  return Math.hypot(x - (start[0] + dx * t), y - (start[1] + dy * t));
}

function coverageAt(iconName, x, y) {
  if (iconName === 'circle') {
    return Math.abs(Math.hypot(x - 32, y - 32) - 20) <= STROKE / 2;
  }
  return ICONS[iconName].some((line) => distanceToSegment(x, y, line[0], line[1]) <= STROKE / 2);
}

function renderIcon(iconName) {
  const rows = [];
  for (let y = 0; y < SIZE; y += 1) {
    const row = Buffer.alloc(1 + SIZE * 4);
    for (let x = 0; x < SIZE; x += 1) {
      let samples = 0;
      for (let sy = 0; sy < SCALE; sy += 1) {
        for (let sx = 0; sx < SCALE; sx += 1) {
          if (coverageAt(iconName, x + (sx + 0.5) / SCALE, y + (sy + 0.5) / SCALE)) {
            samples += 1;
          }
        }
      }
      const offset = 1 + x * 4;
      row[offset] = COLOR[0];
      row[offset + 1] = COLOR[1];
      row[offset + 2] = COLOR[2];
      row[offset + 3] = Math.round((samples / (SCALE * SCALE)) * 255);
    }
    rows.push(row);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(SIZE, 0);
  header.writeUInt32BE(SIZE, 4);
  header[8] = 8;
  header[9] = 6;
  const image = Buffer.concat(rows);
  return Buffer.concat([
    signature,
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(image)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

Object.keys(ICONS).concat('circle').forEach((iconName) => {
  fs.writeFileSync(path.join(OUTPUT_DIR, 'symbol-' + iconName + '.png'), renderIcon(iconName));
});

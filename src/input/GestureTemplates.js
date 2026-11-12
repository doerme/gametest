'use strict';

// Screen coordinates with retained orientation; also used to draw spell guides.
const PATHS = {
  up: [[50, 100], [50, 0]], down: [[50, 0], [50, 100]],
  left: [[100, 50], [0, 50]], right: [[0, 50], [100, 50]],
  v: [[0, 0], [48, 100], [100, 0]],
  l: [[0, 0], [0, 100], [100, 100]],
  circle: Array.from({ length: 33 }, (_, i) => [50 + Math.cos(i / 32 * Math.PI * 2) * 50, 50 + Math.sin(i / 32 * Math.PI * 2) * 50]),
  z: [[0, 0], [100, 0], [0, 100], [100, 100]],
  m: [[0, 100], [0, 0], [50, 90], [100, 0], [100, 100]],
  s: [[95, 8], [68, 0], [32, 0], [8, 15], [0, 30], [15, 44], [50, 50], [83, 56], [100, 72], [92, 89], [65, 100], [30, 100], [0, 91]]
};
function getGuidePath(symbol) { return (PATHS[symbol] || []).map((p) => ({ x: p[0], y: p[1] })); }
module.exports = { PATHS, getGuidePath };

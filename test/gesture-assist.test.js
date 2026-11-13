'use strict';
const assert = require('assert');
const { recognize, recognizeDetailed, resample, SYMBOLS } = require('../src/input/GestureRecognizer');
const { GameState } = require('../src/core/GameState');
const Enemy = require('../src/entities/Enemy');

// Independent hand-drawn examples, deliberately unequal and irregular.
const samples = {
  up: [[34, 108], [30, 78], [35, 52], [29, 16]],
  down: [[30, 12], [34, 39], [29, 77], [37, 106]],
  left: [[110, 42], [78, 38], [43, 43], [11, 37]],
  right: [[12, 35], [31, 33], [46, 39], [80, 34]],
  v: [[20, 12], [43, 47], [65, 80], [76, 70], [94, 54]],
  l: [[20, 10], [25, 36], [30, 64], [42, 70], [84, 73]],
  circle: [[82, 12], [104, 37], [104, 67], [89, 93], [59, 105], [29, 95], [11, 69], [14, 37], [32, 15]],
  z: [[11, 18], [42, 14], [95, 20], [77, 43], [35, 80], [18, 100], [56, 104], [106, 96]],
  m: [[18, 90], [22, 18], [45, 63], [63, 81], [78, 43], [90, 20], [97, 89]],
  s: [[98, 18], [72, 6], [35, 12], [15, 26], [28, 47], [63, 54], [89, 69], [88, 89], [55, 104], [20, 95]]
};
for (const [symbol, values] of Object.entries(samples)) {
  const points = values.map(([x, y]) => ({ x, y }));
  for (const scale of [0.4, 1, 2.5]) for (const angle of [-0.17, 0, 0.17]) {
    const transformed = points.map((p) => ({ x: 200 + (p.x * Math.cos(angle) - p.y * Math.sin(angle)) * scale, y: 130 + (p.x * Math.sin(angle) + p.y * Math.cos(angle)) * scale }));
    assert.strictEqual(recognize(transformed), symbol, symbol + ' tolerates scale/tilt');
  }
  if (!['up', 'down', 'left', 'right'].includes(symbol)) assert.strictEqual(recognize(points.slice().reverse()), symbol, symbol + ' reverse start');
}
const arc = Array.from({ length: 25 }, (_, i) => ({ x: 100 + Math.cos(0.6 + i / 24 * Math.PI * 1.6) * 55, y: 100 + Math.sin(0.6 + i / 24 * Math.PI * 1.6) * 34 }));
assert.strictEqual(recognize(arc), SYMBOLS.CIRCLE);
assert.strictEqual(recognize(arc.slice().reverse()), SYMBOLS.CIRCLE);
assert.strictEqual(resample([{ x: 0, y: 0 }, { x: 100, y: 0 }]).length, 64);
assert.strictEqual(recognizeDetailed([{ x: 0, y: 0 }, { x: 5, y: 4 }]).ignored, true);
for (const values of [
  [[0, 0], [100, 100], [0, 100], [100, 0], [0, 0], [100, 100]],
  [[0, 0], [20, 100], [40, 0], [60, 100], [80, 0], [100, 100]],
  [[0, 0], [25, 80], [50, 0], [75, 80], [100, 0]]
]) assert.strictEqual(recognizeDetailed(values.map(([x, y]) => ({ x, y })), { expectedSymbols: Object.keys(samples) }).symbol, SYMBOLS.UNKNOWN, 'scribbles never get rescued by context');
const diagonal = [{ x: 0, y: 0 }, { x: 90, y: 100 }];
assert.strictEqual(recognizeDetailed(diagonal, { expectedSymbols: ['right'] }).assisted, true);
assert.strictEqual(recognizeDetailed(diagonal, { expectedSymbols: ['right'] }).symbol, SYMBOLS.RIGHT);
assert.strictEqual(recognizeDetailed(diagonal, { expectedSymbols: ['right', 'down'] }).assisted, false);
assert.strictEqual(recognizeDetailed([{ x: 0, y: 100 }, { x: 0, y: 0 }], { expectedSymbols: ['down'] }).symbol, SYMBOLS.UP);

// Unstructured paths are independent negatives; a few may coincidentally trace a valid glyph.
let seed = 146; let accidentalMatches = 0;
const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
for (let i = 0; i < 300; i += 1) {
  const path = Array.from({ length: 10 }, () => ({ x: random() * 100, y: random() * 100 }));
  if (recognizeDetailed(path, { expectedSymbols: Object.keys(samples) }).symbol !== SYMBOLS.UNKNOWN) accidentalMatches += 1;
}
assert.ok(accidentalMatches <= 15, 'random paths cannot become an always-successful spell');

const game = new GameState(375, 667, null); game.start('normal', 'symbol'); game.combo = 9;
game.enemies = [new Enemy({ x: 90, y: 100, symbols: ['right', 'down'] }), new Enemy({ x: 160, y: 100, symbols: ['right'] })];
const wrong = [{ x: 100, y: 0 }, { x: 0, y: 0 }];
game.handleGesture(wrong); assert.strictEqual(game.combo, 9); assert.strictEqual(game.gestureFailures, 1);
game.handleGesture([{ x: 1, y: 1 }, { x: 3, y: 2 }]); assert.strictEqual(game.gestureFailures, 1);
game.handleGesture(wrong); assert.strictEqual(game.combo, 0);
game.combo = 9; game.handleGesture(diagonal, { expectedSymbols: ['right'] });
assert.strictEqual(game.combo, 10); assert.strictEqual(game.gestureFailures, 0); assert.strictEqual(game.enemies.length, 1);
assert.deepStrictEqual(game.enemies[0].symbols, ['down']); assert.strictEqual(game.items.comboChain, 1); assert.strictEqual(game.lastGestureResult.assisted, true);
// A hidden tail cannot be passed as a valid assistance target.
game.enemies[0].symbols = ['up', 'right']; game.handleGesture(diagonal, { expectedSymbols: ['right'] }); assert.strictEqual(game.lastGestureResult.assisted, false);
game.enemies = []; game.gestureFailures = 0; game.handleGesture(wrong); assert.strictEqual(game.gestureFailures, 0);
game.beginLevelTransition(); assert.strictEqual(game.gestureFailures, 0);
console.log('gesture-assist.test.js passed');

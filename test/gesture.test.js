'use strict';

const assert = require('assert');
const { recognize, SYMBOLS } = require('../src/input/GestureRecognizer');

function line(a, b) {
  return [a, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, b];
}

const cases = [
  [SYMBOLS.UP, line({ x: 100, y: 160 }, { x: 100, y: 70 })],
  [SYMBOLS.DOWN, line({ x: 100, y: 70 }, { x: 100, y: 160 })],
  [SYMBOLS.LEFT, line({ x: 170, y: 100 }, { x: 70, y: 100 })],
  [SYMBOLS.RIGHT, line({ x: 70, y: 100 }, { x: 170, y: 100 })],
  [SYMBOLS.UP, [{ x: 104, y: 180 }, { x: 99, y: 150 }, { x: 102, y: 110 }, { x: 96, y: 78 }]],
  [SYMBOLS.RIGHT, [{ x: 42, y: 100 }, { x: 80, y: 104 }, { x: 122, y: 98 }, { x: 168, y: 103 }]],
  [SYMBOLS.V, [{ x: 60, y: 70 }, { x: 100, y: 150 }, { x: 145, y: 70 }]],
  [SYMBOLS.V, [{ x: 58, y: 72 }, { x: 76, y: 104 }, { x: 103, y: 153 }, { x: 126, y: 101 }, { x: 148, y: 73 }]],
  [SYMBOLS.CARET, [{ x: 60, y: 150 }, { x: 100, y: 70 }, { x: 145, y: 150 }]],
  [SYMBOLS.CARET, [{ x: 60, y: 150 }, { x: 83, y: 102 }, { x: 101, y: 68 }, { x: 124, y: 105 }, { x: 145, y: 150 }]]
];

for (const [expected, points] of cases) {
  assert.strictEqual(recognize(points), expected, 'recognizes ' + expected);
}

assert.strictEqual(recognize([{ x: 1, y: 1 }, { x: 4, y: 3 }]), SYMBOLS.UNKNOWN);

console.log('gesture.test.js passed');

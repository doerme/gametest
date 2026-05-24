'use strict';

const assert = require('assert');
const { recognize, SYMBOLS, LABELS } = require('../src/input/GestureRecognizer');

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
  [SYMBOLS.V, [{ x: 45, y: 70 }, { x: 70, y: 116 }, { x: 94, y: 158 }, { x: 111, y: 143 }, { x: 130, y: 132 }]],
  [SYMBOLS.V, [{ x: 80, y: 78 }, { x: 88, y: 94 }, { x: 90, y: 107 }, { x: 96, y: 99 }, { x: 101, y: 78 }]],
  [SYMBOLS.V, [{ x: 42, y: 65 }, { x: 65, y: 105 }, { x: 91, y: 150 }, { x: 100, y: 145 }, { x: 112, y: 141 }]],
  [SYMBOLS.V, [{ x: 90, y: 62 }, { x: 93, y: 98 }, { x: 97, y: 142 }, { x: 101, y: 104 }, { x: 105, y: 70 }]],
  [SYMBOLS.V, [{ x: 52, y: 72 }, { x: 75, y: 112 }, { x: 94, y: 151 }, { x: 106, y: 143 }, { x: 120, y: 136 }, { x: 126, y: 142 }]],
  [SYMBOLS.L, [{ x: 56, y: 62 }, { x: 56, y: 103 }, { x: 58, y: 145 }, { x: 101, y: 146 }, { x: 149, y: 145 }]],
  [SYMBOLS.L, [{ x: 50, y: 64 }, { x: 52, y: 92 }, { x: 49, y: 123 }, { x: 55, y: 147 }, { x: 86, y: 149 }, { x: 117, y: 144 }, { x: 151, y: 146 }]],
  [SYMBOLS.L, [{ x: 151, y: 146 }, { x: 104, y: 148 }, { x: 58, y: 146 }, { x: 56, y: 108 }, { x: 55, y: 65 }]],
  [SYMBOLS.CIRCLE, [{ x: 102, y: 58 }, { x: 132, y: 68 }, { x: 148, y: 98 }, { x: 136, y: 132 }, { x: 103, y: 146 }, { x: 70, y: 132 }, { x: 56, y: 100 }, { x: 69, y: 68 }, { x: 101, y: 60 }]],
  [SYMBOLS.CIRCLE, [{ x: 99, y: 60 }, { x: 128, y: 67 }, { x: 145, y: 93 }, { x: 141, y: 120 }, { x: 115, y: 143 }, { x: 80, y: 138 }, { x: 57, y: 110 }, { x: 61, y: 78 }, { x: 96, y: 62 }]],
  [SYMBOLS.CIRCLE, [{ x: 100, y: 60 }, { x: 145, y: 100 }, { x: 100, y: 145 }, { x: 55, y: 100 }, { x: 99, y: 61 }]],
  [SYMBOLS.CIRCLE, [{ x: 120, y: 55 }, { x: 151, y: 68 }, { x: 165, y: 99 }, { x: 155, y: 132 }, { x: 126, y: 151 }, { x: 89, y: 148 }, { x: 61, y: 125 }, { x: 56, y: 91 }, { x: 71, y: 67 }]],
  [SYMBOLS.CIRCLE, [{ x: 138, y: 73 }, { x: 153, y: 101 }, { x: 143, y: 132 }, { x: 110, y: 149 }, { x: 75, y: 137 }, { x: 57, y: 104 }, { x: 67, y: 74 }]],
  [SYMBOLS.CIRCLE, [{ x: 72, y: 78 }, { x: 58, y: 109 }, { x: 74, y: 138 }, { x: 108, y: 149 }, { x: 142, y: 130 }, { x: 151, y: 96 }, { x: 133, y: 68 }]],
  [SYMBOLS.Z, [{ x: 55, y: 65 }, { x: 101, y: 67 }, { x: 150, y: 64 }, { x: 112, y: 102 }, { x: 59, y: 145 }, { x: 104, y: 147 }, { x: 151, y: 146 }]],
  [SYMBOLS.Z, [{ x: 56, y: 68 }, { x: 102, y: 65 }, { x: 149, y: 70 }, { x: 119, y: 96 }, { x: 62, y: 142 }, { x: 105, y: 145 }, { x: 153, y: 141 }]],
  [SYMBOLS.Z, [{ x: 54, y: 65 }, { x: 84, y: 63 }, { x: 114, y: 66 }, { x: 127, y: 74 }, { x: 117, y: 87 }, { x: 99, y: 105 }, { x: 78, y: 124 }, { x: 67, y: 139 }, { x: 83, y: 146 }, { x: 112, y: 147 }, { x: 154, y: 145 }]],
  [SYMBOLS.Z, [{ x: 151, y: 146 }, { x: 104, y: 147 }, { x: 59, y: 145 }, { x: 112, y: 102 }, { x: 150, y: 64 }, { x: 101, y: 67 }, { x: 55, y: 65 }]],
  [SYMBOLS.Z, [{ x: 48, y: 61 }, { x: 90, y: 65 }, { x: 152, y: 62 }, { x: 133, y: 83 }, { x: 104, y: 104 }, { x: 73, y: 132 }, { x: 55, y: 148 }, { x: 102, y: 150 }, { x: 158, y: 146 }]]
];

for (const [expected, points] of cases) {
  assert.strictEqual(recognize(points), expected, 'recognizes ' + expected);
}

assert.strictEqual(recognize([{ x: 1, y: 1 }, { x: 4, y: 3 }]), SYMBOLS.UNKNOWN);
assert.strictEqual(LABELS[SYMBOLS.L], 'L');

console.log('gesture.test.js passed');

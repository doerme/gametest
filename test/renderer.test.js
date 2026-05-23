'use strict';

const assert = require('assert');
const Renderer = require('../src/render/Renderer');
const { SYMBOLS } = require('../src/input/GestureRecognizer');

const queue = Renderer.getSymbolIndicators({
  symbolDisplay: 'queue',
  symbols: [SYMBOLS.RIGHT, SYMBOLS.UP, SYMBOLS.V]
});
assert.deepStrictEqual(queue, [
  { type: 'symbol', symbol: SYMBOLS.RIGHT },
  { type: 'symbol', symbol: SYMBOLS.UP },
  { type: 'symbol', symbol: SYMBOLS.V }
]);

const hidden = Renderer.getSymbolIndicators({
  symbolDisplay: 'current-and-dots',
  symbols: [SYMBOLS.LEFT, SYMBOLS.DOWN, SYMBOLS.CARET, SYMBOLS.V]
});
assert.deepStrictEqual(hidden, [
  { type: 'symbol', symbol: SYMBOLS.LEFT },
  { type: 'dot' },
  { type: 'dot' },
  { type: 'dot' }
]);

const afterHit = Renderer.getSymbolIndicators({
  symbolDisplay: 'current-and-dots',
  symbols: [SYMBOLS.DOWN, SYMBOLS.CARET, SYMBOLS.V]
});
assert.deepStrictEqual(afterHit, [
  { type: 'symbol', symbol: SYMBOLS.DOWN },
  { type: 'dot' },
  { type: 'dot' }
]);

const compactBoss = Renderer.getSymbolIndicators({
  symbolDisplay: 'current-and-dots',
  symbols: [SYMBOLS.CIRCLE, SYMBOLS.Z, SYMBOLS.LEFT, SYMBOLS.RIGHT, SYMBOLS.V, SYMBOLS.CARET, SYMBOLS.CIRCLE, SYMBOLS.DOWN, SYMBOLS.Z, SYMBOLS.UP]
});
assert.deepStrictEqual(compactBoss, [
  { type: 'symbol', symbol: SYMBOLS.CIRCLE },
  { type: 'count', count: 9 }
]);

console.log('renderer.test.js passed');

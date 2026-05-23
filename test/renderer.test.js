'use strict';

const assert = require('assert');
const Renderer = require('../src/render/Renderer');
const { SYMBOLS } = require('../src/input/GestureRecognizer');
const { DIFFICULTY_MODES, getDifficultyButtons, findDifficultyAtPoint } = require('../src/ui/DifficultySelector');
const { getAudioToggleBounds, isAudioToggleHit } = require('../src/ui/AudioToggle');

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
  symbols: [SYMBOLS.CIRCLE, SYMBOLS.CIRCLE, SYMBOLS.LEFT, SYMBOLS.RIGHT, SYMBOLS.V, SYMBOLS.CARET, SYMBOLS.CIRCLE, SYMBOLS.DOWN, SYMBOLS.CIRCLE, SYMBOLS.UP]
});
assert.deepStrictEqual(compactBoss, [
  { type: 'symbol', symbol: SYMBOLS.CIRCLE },
  { type: 'count', count: 9 }
]);

const difficultyButtons = getDifficultyButtons(375, 667);
assert.strictEqual(difficultyButtons.length, 2);
assert.strictEqual(difficultyButtons[0].mode, DIFFICULTY_MODES.NORMAL);
assert.strictEqual(difficultyButtons[1].mode, DIFFICULTY_MODES.PLUS_ONE);
assert.strictEqual(findDifficultyAtPoint(375, 667, {
  x: difficultyButtons[1].x + difficultyButtons[1].width / 2,
  y: difficultyButtons[1].y + difficultyButtons[1].height / 2
}), DIFFICULTY_MODES.PLUS_ONE);
assert.strictEqual(findDifficultyAtPoint(375, 667, { x: 5, y: 5 }), null);

assert.strictEqual(Renderer.getLevelLabel({
  screen: 'playing',
  difficulty: DIFFICULTY_MODES.NORMAL,
  level: 1,
  totalLevels: 3
}, 1), '第 1/3 关');
assert.strictEqual(Renderer.getLevelLabel({
  screen: 'playing',
  difficulty: DIFFICULTY_MODES.PLUS_ONE,
  level: 1,
  totalLevels: 3
}, 1), '第 1/3 关  +1');
assert.strictEqual(Renderer.getLevelLabel({
  screen: 'level-transition',
  difficulty: DIFFICULTY_MODES.PLUS_ONE,
  level: 1,
  totalLevels: 3
}, 2), '第 2/3 关');

const audioToggle = getAudioToggleBounds(375);
assert.strictEqual(audioToggle.y, 128);
assert.strictEqual(isAudioToggleHit(375, {
  x: audioToggle.x + audioToggle.width / 2,
  y: audioToggle.y + audioToggle.height / 2
}), true);
assert.strictEqual(isAudioToggleHit(375, { x: 0, y: 0 }), false);

console.log('renderer.test.js passed');

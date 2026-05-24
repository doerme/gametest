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
  totalLevels: 4
}, 1), '第 1/4 关');
assert.strictEqual(Renderer.getLevelLabel({
  screen: 'playing',
  difficulty: DIFFICULTY_MODES.PLUS_ONE,
  level: 1,
  totalLevels: 4
}, 1), '第 1/4 关  +1');
assert.strictEqual(Renderer.getLevelLabel({
  screen: 'level-transition',
  difficulty: DIFFICULTY_MODES.PLUS_ONE,
  level: 1,
  totalLevels: 4
}, 2), '第 2/4 关');
assert.strictEqual(Renderer.getComboLabel(0), '');
assert.strictEqual(Renderer.getComboLabel(5), 'COMBO x5');
assert.strictEqual(Renderer.getComboTier(2).multiplierLabel, '');
assert.strictEqual(Renderer.getComboTier(3).multiplierLabel, '1.2x');
assert.strictEqual(Renderer.getComboTier(5).multiplierLabel, '1.5x');
assert.strictEqual(Renderer.getComboTier(10).multiplierLabel, '2.0x');
assert.strictEqual(Renderer.getComboTier(20).multiplierLabel, '2.5x');
assert.strictEqual(Renderer.getComboTier(50).multiplierLabel, '3.0x');
assert.strictEqual(Renderer.getComboTier(100).multiplierLabel, '4.0x');
assert.ok(Renderer.getComboTier(20).scale > Renderer.getComboTier(10).scale);
assert.ok(Renderer.getComboTier(50).scale > Renderer.getComboTier(20).scale);
assert.ok(Renderer.getComboTier(100).scale > Renderer.getComboTier(50).scale);
assert.ok(Renderer.getComboPulse(3, { type: 'hit', combo: 3, age: 0 }).scale > 1);
assert.strictEqual(Renderer.getComboPulse(3, { type: 'hit', combo: 3, age: 0.5 }).scale, 1);
assert.strictEqual(Renderer.getComboPulse(3, { type: 'miss', combo: 3, age: 0 }).burst, 0);
assert.strictEqual(Renderer.getSoundToggleLabel(true), '声音 开');
assert.strictEqual(Renderer.getSoundToggleLabel(false), '声音 关');
assert.deepStrictEqual(Renderer.getTransitionCopy(4), { title: '恐龙乐园', hint: '第四关 · 新增符咒：Z' });
assert.strictEqual(Renderer.getWinTitle(), '四关通关');

const audioToggle = getAudioToggleBounds(375);
assert.strictEqual(audioToggle.y, 128);
assert.strictEqual(isAudioToggleHit(375, {
  x: audioToggle.x + audioToggle.width / 2,
  y: audioToggle.y + audioToggle.height / 2
}), true);
assert.strictEqual(isAudioToggleHit(375, { x: 0, y: 0 }), false);

const sequenceOnlyRadii = [];
const sequenceOnlyContext = {
  save() {},
  restore() {},
  beginPath() {},
  fill() {},
  stroke() {},
  fillText() {},
  translate() {},
  scale() {},
  measureText() {
    return { width: 82 };
  },
  roundRect(x, y, width, height, radii) {
    assert.ok(Array.isArray(radii), 'roundRect radii must be passed as a sequence');
    sequenceOnlyRadii.push(radii);
  }
};
const sequenceOnlyRenderer = new Renderer(sequenceOnlyContext, { width: 375, height: 667 }, null);
sequenceOnlyRenderer.drawDifficultyButton(difficultyButtons[0], false);
sequenceOnlyRenderer.drawAudioToggle(true);
sequenceOnlyRenderer.drawSymbolQueue({
  kind: 'boss',
  species: 'tyrannosaurus',
  radius: 30,
  symbolDisplay: 'current-and-dots',
  symbols: [SYMBOLS.CIRCLE, SYMBOLS.CIRCLE, SYMBOLS.LEFT, SYMBOLS.RIGHT, SYMBOLS.V, SYMBOLS.CARET]
});
sequenceOnlyRenderer.drawComboCounter({
  screen: 'playing',
  combo: 5,
  feedback: { type: 'hit', combo: 5, age: 0 }
});
assert.deepStrictEqual(sequenceOnlyRadii, [[12], [17], [7], [7], [13], [11], [7]]);

console.log('renderer.test.js passed');

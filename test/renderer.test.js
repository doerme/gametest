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
  symbols: [SYMBOLS.LEFT, SYMBOLS.DOWN, SYMBOLS.L, SYMBOLS.V]
});
assert.deepStrictEqual(hidden, [
  { type: 'symbol', symbol: SYMBOLS.LEFT },
  { type: 'dot' },
  { type: 'dot' },
  { type: 'dot' }
]);

const afterHit = Renderer.getSymbolIndicators({
  symbolDisplay: 'current-and-dots',
  symbols: [SYMBOLS.DOWN, SYMBOLS.L, SYMBOLS.V]
});
assert.deepStrictEqual(afterHit, [
  { type: 'symbol', symbol: SYMBOLS.DOWN },
  { type: 'dot' },
  { type: 'dot' }
]);

const compactBoss = Renderer.getSymbolIndicators({
  symbolDisplay: 'current-and-dots',
  symbols: [SYMBOLS.CIRCLE, SYMBOLS.CIRCLE, SYMBOLS.LEFT, SYMBOLS.RIGHT, SYMBOLS.V, SYMBOLS.L, SYMBOLS.CIRCLE, SYMBOLS.DOWN, SYMBOLS.CIRCLE, SYMBOLS.UP]
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
assert.strictEqual(Renderer.getComboLabel(5), '连击 x5');
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
assert.deepStrictEqual(Renderer.getHeartSlotPosition(375, 3), { x: 269, y: 31 });
assert.deepStrictEqual(Renderer.getTransitionCopy(4), { title: '恐龙乐园', hint: '第四关 · 新增符咒：Z' });
assert.strictEqual(Renderer.getWinTitle(), '四关通关');

assert.strictEqual(Renderer.ENEMY_SPRITE.frames, 3);
assert.strictEqual(Renderer.ENEMY_SPRITE.fps, 6);
assert.strictEqual(Renderer.getEnemySpriteFrame(0), 0);
assert.strictEqual(Renderer.getEnemySpriteFrame(0.8), 1);
assert.strictEqual(Renderer.getEnemySpriteFrame(1.4), 2);
let enemyImageArgs = null;
const enemyImageRenderer = new Renderer({
  drawImage() {
    enemyImageArgs = Array.prototype.slice.call(arguments);
  }
}, { width: 375, height: 667 }, null);
enemyImageRenderer.drawEnemyImage({ kind: 'normal', radius: 24 }, { height: 384 }, 2);
assert.deepStrictEqual(enemyImageArgs.slice(1, 5), [768, 0, 384, 384]);

assert.strictEqual(Renderer.HERO_SPRITE.animations.walk.frames.length, 12);
assert.strictEqual(Renderer.HERO_SPRITE.animations.cast.frames.length, 12);
assert.strictEqual(Renderer.HERO_SPRITE.animations.hurt.frames.length, 12);
assert.strictEqual(Renderer.HERO_SPRITE.animations.walk.fps, 12);
assert.strictEqual(Renderer.HERO_SPRITE.animations.cast.fps, 16);
assert.strictEqual(Renderer.HERO_SPRITE.animations.hurt.fps, 14);
assert.strictEqual(Renderer.HERO_SPRITE.animations.cast.assetKey, 'catCast');
assert.strictEqual(Renderer.getHeroSpriteAnimation({ cast: 0.38, hurt: 0 }, false), 'cast');
assert.strictEqual(Renderer.getHeroSpriteAnimation({ cast: 0.38, hurt: 0.52 }, true), 'hurt');
assert.strictEqual(Renderer.getHeroSpriteFrame(0.13, null, false), 1);
assert.strictEqual(Renderer.getHeroSpriteFrame(99, { cast: 0.38, castAge: 0 }, false), 0);
assert.strictEqual(Renderer.getHeroSpriteFrame(99, { cast: 0.2, castAge: 0.18 }, false), 2);
assert.strictEqual(Renderer.getHeroSpriteFrame(99, { cast: 0.2, castAge: 0.18, hurt: 0.52, hurtAge: 0 }, true), 0);

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
  fillRect() {},
  fillText() {},
  moveTo() {},
  lineTo() {},
  arc() {},
  bezierCurveTo() {},
  translate() {},
  scale() {},
  rotate() {},
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
  symbols: [SYMBOLS.CIRCLE, SYMBOLS.CIRCLE, SYMBOLS.LEFT, SYMBOLS.RIGHT, SYMBOLS.V, SYMBOLS.L]
});
sequenceOnlyRenderer.drawComboCounter({
  screen: 'playing',
  combo: 5,
  feedback: { type: 'hit', combo: 5, age: 0 }
});
sequenceOnlyRenderer.drawHealthPotion({ radius: 30, phase: 0 });
sequenceOnlyRenderer.drawEffects([
  {
    type: 'comboChain',
    age: 0.12,
    duration: 0.5,
    originX: 180,
    originY: 430,
    targets: [
      { x: 80, y: 120, radius: 24 },
      { x: 130, y: 150, radius: 24 }
    ]
  },
  {
    type: 'comboThunder',
    age: 0.2,
    duration: 0.56,
    targets: [
      { x: 100, y: 120, radius: 24 },
      { x: 180, y: 180, radius: 28 }
    ]
  },
  {
    type: 'lightning',
    age: 0.08,
    duration: 0.3,
    fromX: 190,
    fromY: 430,
    toX: 80,
    toY: 120,
    radius: 24,
    kind: 'normal'
  },
  {
    type: 'heartLoss',
    age: 0.12,
    duration: 0.62,
    heartIndex: 4,
    burstIndex: 0,
    burstCount: 1
  },
  {
    type: 'potionToHeart',
    age: 0.18,
    duration: 0.5,
    x: 188,
    y: 160,
    radius: 30,
    heartIndex: 3
  }
]);
assert.deepStrictEqual(sequenceOnlyRadii, [[12], [17], [7], [7], [13], [11], [7], [4], [10], [8], [4], [10], [8]]);

console.log('renderer.test.js passed');

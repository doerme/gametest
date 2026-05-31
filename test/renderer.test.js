'use strict';

const assert = require('assert');
const Renderer = require('../src/render/Renderer');
const { SYMBOLS } = require('../src/input/GestureRecognizer');
const { THEME_IDS } = require('../src/levels/Themes');
const { DIFFICULTY_MODES, getDifficultyButtons, findDifficultyAtPoint } = require('../src/ui/DifficultySelector');
const { getAudioToggleBounds, isAudioToggleHit } = require('../src/ui/AudioToggle');
const { ITEM_TYPES, getItemSlots, findItemAtPoint } = require('../src/ui/ItemBar');

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
  totalLevels: 6
}, 1), '第 1/6 关');
assert.strictEqual(Renderer.getLevelLabel({
  screen: 'playing',
  difficulty: DIFFICULTY_MODES.PLUS_ONE,
  level: 1,
  totalLevels: 6
}, 1), '第 1/6 关  +1');
assert.strictEqual(Renderer.getLevelLabel({
  screen: 'level-transition',
  difficulty: DIFFICULTY_MODES.PLUS_ONE,
  level: 1,
  totalLevels: 6
}, 2), '第 2/6 关');
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
assert.deepStrictEqual(Renderer.getHeartSlotPosition(375, 667, 3), { x: 106, y: 639 });
assert.deepStrictEqual(Renderer.getTransitionCopy(4, THEME_IDS.CASTLE), { title: '幽光古堡', hint: '第四关 · 新增符咒：Z' });
assert.deepStrictEqual(Renderer.getTransitionCopy(5, THEME_IDS.SKY_CITY), { title: '天空之城', hint: '第五关 · 新增符咒：M' });
assert.deepStrictEqual(Renderer.getTransitionCopy(6, THEME_IDS.SEA_TRAIN), { title: '海上列车', hint: '第六关 · 新增符咒：S' });
assert.deepStrictEqual(Renderer.getTransitionCopy(2, THEME_IDS.DINOSAUR_PARK), { title: '恐龙乐园', hint: '第二关 · 符咒队列仅显示当前符号' });
assert.strictEqual(Renderer.getWinTitle(), '六关通关');

const requestedBackgrounds = [];
const themeRenderer = new Renderer({}, { width: 375, height: 667 }, {
  getImage(key) {
    requestedBackgrounds.push(key);
    return {};
  }
});
let skyFallbackCalls = 0;
let seaTrainFallbackCalls = 0;
themeRenderer.drawScrollingOceanBackground = function drawScrollingOceanBackground() {};
themeRenderer.drawScrollingDinosaurBackground = function drawScrollingDinosaurBackground() {};
themeRenderer.drawFallbackSkyCityBackground = function drawFallbackSkyCityBackground() {
  skyFallbackCalls += 1;
};
themeRenderer.drawFallbackSeaTrainBackground = function drawFallbackSeaTrainBackground() {
  seaTrainFallbackCalls += 1;
};
themeRenderer.drawBackground(0, THEME_IDS.OCEAN);
themeRenderer.drawBackground(0, THEME_IDS.DINOSAUR_PARK);
themeRenderer.drawBackground(0, THEME_IDS.SKY_CITY);
themeRenderer.drawBackground(0, THEME_IDS.SEA_TRAIN);
assert.deepStrictEqual(requestedBackgrounds, ['oceanSpaceshipCorridorLoop', 'dinosaurParkCorridorLoop']);
assert.strictEqual(skyFallbackCalls, 1);
assert.strictEqual(seaTrainFallbackCalls, 1);

function createCanvasSmokeContext() {
  const calls = [];
  const states = [];
  const context = {
    calls,
    shadowColor: 'transparent',
    shadowBlur: 0,
    save() {
      calls.push('save');
      states.push({
        shadowColor: context.shadowColor,
        shadowBlur: context.shadowBlur
      });
    },
    restore() {
      calls.push('restore');
      const state = states.pop();
      if (state) {
        context.shadowColor = state.shadowColor;
        context.shadowBlur = state.shadowBlur;
      }
    },
    beginPath() {
      calls.push('beginPath');
    },
    closePath() {
      calls.push('closePath');
    },
    fill() {
      calls.push('fill');
    },
    stroke() {
      calls.push('stroke');
    },
    fillRect() {
      calls.push('fillRect');
    },
    moveTo() {
      calls.push('moveTo');
    },
    lineTo() {
      calls.push('lineTo');
    },
    bezierCurveTo() {
      calls.push('bezierCurveTo');
    },
    quadraticCurveTo() {
      calls.push('quadraticCurveTo');
    },
    arc() {
      calls.push('arc');
    },
    ellipse() {
      calls.push('ellipse');
    },
    roundRect() {
      calls.push('roundRect');
    },
    translate() {
      calls.push('translate');
    },
    scale() {
      calls.push('scale');
    },
    rotate() {
      calls.push('rotate');
    },
    fillText() {
      calls.push('fillText');
    },
    createLinearGradient() {
      calls.push('createLinearGradient');
      return {
        addColorStop() {
          calls.push('addColorStop');
        }
      };
    },
    createRadialGradient() {
      calls.push('createRadialGradient');
      return {
        addColorStop() {
          calls.push('addColorStop');
        }
      };
    }
  };
  return context;
}

const skyCanvasContext = createCanvasSmokeContext();
const skyCanvasRenderer = new Renderer(skyCanvasContext, { width: 375, height: 667 }, null);
skyCanvasRenderer.drawFallbackSkyCityBackground(42);
skyCanvasRenderer.drawSkyCityEnemyFallback({ species: 'cloudWisp', radius: 24, phase: 0.4 });
skyCanvasRenderer.drawSkyCityEnemyFallback({ species: 'wingedSentinel', radius: 26, phase: 0.6 });
skyCanvasRenderer.drawSkyCityEnemyFallback({ species: 'templeGriffin', radius: 34, phase: 0.8 });
assert.strictEqual(skyCanvasContext.calls.filter((call) => call === 'save').length, skyCanvasContext.calls.filter((call) => call === 'restore').length);
assert.ok(skyCanvasContext.calls.filter((call) => call === 'fill').length >= 100);
assert.ok(skyCanvasContext.calls.filter((call) => call === 'stroke').length >= 90);
assert.ok(skyCanvasContext.calls.filter((call) => call === 'ellipse').length >= 64);

const seaTrainCanvasContext = createCanvasSmokeContext();
const seaTrainCanvasRenderer = new Renderer(seaTrainCanvasContext, { width: 375, height: 667 }, null);
seaTrainCanvasRenderer.drawFallbackSeaTrainBackground(54, 1.2);
seaTrainCanvasRenderer.drawSeaTrainEnemyFallback({ species: 'paperSpirit', radius: 24, phase: 0.4 });
seaTrainCanvasRenderer.drawSeaTrainEnemyFallback({ species: 'waveLantern', radius: 26, phase: 0.6 });
seaTrainCanvasRenderer.drawSeaTrainEnemyFallback({ species: 'trainConductor', radius: 34, phase: 0.8 });
assert.strictEqual(seaTrainCanvasContext.calls.filter((call) => call === 'save').length, seaTrainCanvasContext.calls.filter((call) => call === 'restore').length);
assert.ok(seaTrainCanvasContext.calls.filter((call) => call === 'fill').length >= 34);
assert.ok(seaTrainCanvasContext.calls.filter((call) => call === 'stroke').length >= 78);
assert.ok(seaTrainCanvasContext.calls.filter((call) => call === 'roundRect').length >= 10);

const resultCanvasContext = createCanvasSmokeContext();
const resultCanvasRenderer = new Renderer(resultCanvasContext, { width: 375, height: 667 }, null);
resultCanvasRenderer.drawOverlay('六关通关', '得分 1200', '点击再来一局', 'win');
resultCanvasRenderer.drawOverlay('爱心耗尽', '得分 80', '点击重试', 'lose');
assert.strictEqual(resultCanvasContext.calls.filter((call) => call === 'save').length, resultCanvasContext.calls.filter((call) => call === 'restore').length);
assert.ok(resultCanvasContext.calls.length >= 4);
assert.strictEqual(resultCanvasContext.shadowColor, 'transparent');
assert.strictEqual(resultCanvasContext.shadowBlur, 0);

let selectedRuneColor = null;
const runeRenderer = new Renderer({
  save() {},
  restore() {},
  translate() {},
  beginPath() {},
  arc() {},
  stroke() {},
  set strokeStyle(color) {
    selectedRuneColor = color;
  },
  set lineWidth(_lineWidth) {}
}, { width: 375, height: 667 }, null);
runeRenderer.drawRunes(0, THEME_IDS.DINOSAUR_PARK);
assert.strictEqual(selectedRuneColor, 'rgba(228, 190, 72, 0.31)');

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

let symbolImageArgs = null;
let symbolFallbackCount = 0;
const symbolIconRenderer = new Renderer({
  beginPath() {},
  fill() {},
  roundRect() {},
  drawImage() {
    symbolImageArgs = Array.prototype.slice.call(arguments);
  },
  fillText() {
    symbolFallbackCount += 1;
  }
}, { width: 375, height: 667 }, {
  getImage(key) {
    return key === 'symbolS' ? { width: 64, height: 64 } : null;
  }
});
symbolIconRenderer.drawSymbolQueue({
  kind: 'normal',
  species: 'ghost',
  radius: 24,
  symbolDisplay: 'queue',
  symbols: [SYMBOLS.S]
});
assert.strictEqual(Renderer.SYMBOL_ICON_ASSET_KEYS[SYMBOLS.Z], 'symbolZ');
assert.strictEqual(Renderer.SYMBOL_ICON_ASSET_KEYS[SYMBOLS.M], 'symbolM');
assert.strictEqual(Renderer.SYMBOL_ICON_ASSET_KEYS[SYMBOLS.S], 'symbolS');
assert.strictEqual(symbolImageArgs.length, 5);
assert.deepStrictEqual(symbolImageArgs[0], { width: 64, height: 64 });
assert.ok(symbolImageArgs[3] >= 27);
assert.strictEqual(symbolFallbackCount, 0);

let fallbackSymbol = null;
const fallbackSymbolRenderer = new Renderer({
  beginPath() {},
  fill() {},
  roundRect() {},
  fillText(text) {
    fallbackSymbol = text;
  }
}, { width: 375, height: 667 }, null);
fallbackSymbolRenderer.drawSymbolQueue({
  kind: 'normal',
  species: 'ghost',
  radius: 24,
  symbolDisplay: 'queue',
  symbols: [SYMBOLS.V]
});
assert.strictEqual(fallbackSymbol, 'V');

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

const itemSlots = getItemSlots(375, 667, { healthPotion: 2, comboChain: 3 });
assert.deepStrictEqual(itemSlots.map((slot) => slot.type), [ITEM_TYPES.HEALTH_POTION, ITEM_TYPES.COMBO_CHAIN]);
assert.ok(itemSlots[0].y > itemSlots[1].y);
assert.strictEqual((itemSlots[0].y + itemSlots[0].height + itemSlots[1].y) * 0.5, 667 * 0.5);
const singleItemSlot = getItemSlots(375, 667, { healthPotion: 0, comboChain: 1 })[0];
assert.strictEqual(singleItemSlot.y + singleItemSlot.height * 0.5, 667 * 0.5);
assert.ok(itemSlots[0].y + itemSlots[0].height < Renderer.getHeartSlotPosition(375, 667, 0).y);
assert.strictEqual(findItemAtPoint(375, 667, { healthPotion: 2, comboChain: 3 }, {
  x: itemSlots[1].x + 3,
  y: itemSlots[1].y + 3
}), ITEM_TYPES.COMBO_CHAIN);
assert.strictEqual(findItemAtPoint(375, 667, { healthPotion: 2, comboChain: 3 }, { x: 200, y: 600 }), null);

const itemLabels = [];
let itemStrokes = 0;
const itemRenderer = new Renderer({
  save() {},
  restore() {},
  beginPath() {},
  fill() {},
  stroke() {
    itemStrokes += 1;
  },
  moveTo() {},
  lineTo() {},
  bezierCurveTo() {},
  translate() {},
  scale() {},
  roundRect() {},
  fillText(text) {
    itemLabels.push(text);
  }
}, { width: 375, height: 667 }, null);
itemRenderer.drawItemBar({
  screen: 'playing',
  elapsed: 0,
  items: { healthPotion: 2, comboChain: 3 }
});
assert.deepStrictEqual(itemLabels, ['2', '3']);
assert.ok(itemStrokes >= 3);
itemRenderer.drawItemBar({
  screen: 'title',
  elapsed: 0,
  items: { healthPotion: 2, comboChain: 3 }
});
assert.deepStrictEqual(itemLabels, ['2', '3']);

const earnedIcons = [];
const rewardRenderer = new Renderer({
  save() {},
  restore() {},
  beginPath() {},
  stroke() {},
  arc() {},
  translate() {},
  scale() {}
}, { width: 375, height: 667 }, null);
rewardRenderer.drawHealthPotion = function drawHealthPotion() {
  earnedIcons.push(ITEM_TYPES.HEALTH_POTION);
};
rewardRenderer.drawComboChainItemIcon = function drawComboChainItemIcon() {
  earnedIcons.push(ITEM_TYPES.COMBO_CHAIN);
};
rewardRenderer.drawItemEarnEffect({
  type: 'itemEarn',
  itemType: ITEM_TYPES.HEALTH_POTION,
  age: 0.64,
  duration: 0.72,
  toX: itemSlots[0].x,
  toY: itemSlots[0].y
});
rewardRenderer.drawItemEarnEffect({
  type: 'itemEarn',
  itemType: ITEM_TYPES.COMBO_CHAIN,
  age: 0.64,
  duration: 0.72,
  toX: itemSlots[1].x,
  toY: itemSlots[1].y
});
assert.deepStrictEqual(earnedIcons, [ITEM_TYPES.HEALTH_POTION, ITEM_TYPES.COMBO_CHAIN]);

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

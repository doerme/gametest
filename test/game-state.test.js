'use strict';

const assert = require('assert');
const { GameState, SCREENS, getComboMultiplier } = require('../src/core/GameState');
const Enemy = require('../src/entities/Enemy');
const { SYMBOLS } = require('../src/input/GestureRecognizer');
const { THEME_IDS, THEME_ORDER, createThemeOrder } = require('../src/levels/Themes');
const { DIFFICULTY_MODES, getDifficultyButtons } = require('../src/ui/DifficultySelector');
const { getAudioToggleBounds } = require('../src/ui/AudioToggle');
const { ITEM_TYPES, getItemSlots } = require('../src/ui/ItemBar');

function centerOf(button) {
  return {
    x: button.x + button.width * 0.5,
    y: button.y + button.height * 0.5
  };
}

function itemCenterOf(state, type) {
  const slot = getItemSlots(state.width, state.height, state.items).find((entry) => entry.type === type);
  assert.ok(slot, 'expected visible item slot for ' + type);
  return centerOf(slot);
}

function assertClose(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 0.000001, actual + ' should equal ' + expected);
}

function fixedRandom(value) {
  return function random() {
    return value;
  };
}

function sequenceRandom(values) {
  let index = 0;
  return function random() {
    const value = values[index] === undefined ? values[values.length - 1] : values[index];
    index += 1;
    return value;
  };
}

assert.deepStrictEqual(createThemeOrder(fixedRandom(0.999999)), THEME_ORDER);
const shuffledThemes = createThemeOrder(fixedRandom(0));
assert.strictEqual(new Set(shuffledThemes).size, THEME_ORDER.length);
assert.notDeepStrictEqual(shuffledThemes, THEME_ORDER);

const buttons = getDifficultyButtons(375, 667);
const audioButton = getAudioToggleBounds(375);
const soundCalls = {
  enabled: [],
  tracks: [],
  stopped: 0,
  played: [],
  vibrated: 0,
  play(eventName) {
    this.played.push(eventName);
  },
  setSoundEnabled(enabled) {
    this.enabled.push(enabled);
  },
  playMusic(themeId) {
    this.tracks.push(themeId);
  },
  stopMusic() {
    this.stopped += 1;
  },
  vibrateDamage() {
    this.vibrated += 1;
  }
};
const audioControls = new GameState(375, 667, soundCalls, fixedRandom(0.999999));
assert.strictEqual(audioControls.soundEnabled, true);
assert.deepStrictEqual(soundCalls.enabled, [true]);
audioControls.handleTap(centerOf(audioButton));
assert.strictEqual(audioControls.soundEnabled, false);
audioControls.handleTap(centerOf(audioButton));
assert.strictEqual(audioControls.soundEnabled, true);
assert.deepStrictEqual(soundCalls.enabled, [true, false, true]);
audioControls.handleTap(centerOf(buttons[0]));
assert.deepStrictEqual(soundCalls.tracks, [THEME_IDS.CASTLE]);
audioControls.beginLevelTransition();
assert.deepStrictEqual(soundCalls.tracks, [THEME_IDS.CASTLE, THEME_IDS.OCEAN]);
audioControls.handleTap(centerOf(buttons[1]));
assert.strictEqual(audioControls.level, 2);
assert.strictEqual(audioControls.difficulty, DIFFICULTY_MODES.PLUS_ONE);
audioControls.screen = SCREENS.PLAYING;
audioControls.director.index = audioControls.director.total;
audioControls.level = audioControls.totalLevels;
audioControls.update(0);
assert.strictEqual(audioControls.screen, SCREENS.WIN);
assert.strictEqual(soundCalls.stopped, 1);

const selection = new GameState(375, 667, null);
selection.handleTap({ x: 8, y: 8 });
assert.strictEqual(selection.screen, SCREENS.TITLE);
selection.handleGesture([centerOf(buttons[1]), { x: 190, y: 430 }, { x: 210, y: 450 }, { x: 230, y: 470 }]);
assert.strictEqual(selection.screen, SCREENS.TITLE);
selection.handleTap(centerOf(buttons[1]));
assert.strictEqual(selection.screen, SCREENS.PLAYING);
assert.strictEqual(selection.difficulty, DIFFICULTY_MODES.PLUS_ONE);
assert.strictEqual(selection.timeScale, 1.5);

const normalSelection = new GameState(375, 667, null);
normalSelection.handleTap(centerOf(buttons[0]));
assert.strictEqual(normalSelection.screen, SCREENS.PLAYING);
assert.strictEqual(normalSelection.difficulty, DIFFICULTY_MODES.NORMAL);
assert.strictEqual(normalSelection.timeScale, 1);

const normalPace = new GameState(375, 667, null);
normalPace.start(DIFFICULTY_MODES.NORMAL);
normalPace.update(0.84);
assertClose(normalPace.elapsed, 0.84);
assert.strictEqual(normalPace.enemies.length, 0);

const fastPace = new GameState(375, 667, null);
fastPace.start(DIFFICULTY_MODES.PLUS_ONE);
fastPace.update(0.84);
assertClose(fastPace.elapsed, 1.26);
assert.strictEqual(fastPace.enemies.length, 1);

const normalMovement = new GameState(375, 667, null);
normalMovement.start(DIFFICULTY_MODES.NORMAL);
normalMovement.enemies = [new Enemy({ x: 50, y: 50, symbols: [SYMBOLS.RIGHT], speed: 40 })];
normalMovement.update(0.5);
const normalTravel = Math.hypot(normalMovement.enemies[0].x - 50, normalMovement.enemies[0].y - 50);

const fastMovement = new GameState(375, 667, null);
fastMovement.start(DIFFICULTY_MODES.PLUS_ONE);
fastMovement.enemies = [new Enemy({ x: 50, y: 50, symbols: [SYMBOLS.RIGHT], speed: 40 })];
fastMovement.update(0.5);
const fastTravel = Math.hypot(fastMovement.enemies[0].x - 50, fastMovement.enemies[0].y - 50);
assertClose(fastTravel, normalTravel * 1.5);

const feedbackTiming = new GameState(375, 667, null);
feedbackTiming.start(DIFFICULTY_MODES.PLUS_ONE);
feedbackTiming.enemies = [new Enemy({ x: 50, y: 50, symbols: [SYMBOLS.RIGHT], speed: 40 })];
feedbackTiming.enemies[0].hitFlash = 0.18;
feedbackTiming.update(0.1);
assertClose(feedbackTiming.enemies[0].hitFlash, 0.08);

const replay = new GameState(375, 667, null);
replay.start(DIFFICULTY_MODES.PLUS_ONE);
replay.screen = SCREENS.WIN;
replay.handleTap();
assert.strictEqual(replay.screen, SCREENS.TITLE);
assert.strictEqual(replay.difficulty, null);
assert.strictEqual(replay.timeScale, 1);
replay.handleTap(centerOf(buttons[0]));
assert.strictEqual(replay.screen, SCREENS.PLAYING);
assert.strictEqual(replay.difficulty, DIFFICULTY_MODES.NORMAL);

replay.screen = SCREENS.LOSE;
replay.handleTap();
assert.strictEqual(replay.screen, SCREENS.TITLE);
replay.handleTap(centerOf(buttons[1]));
assert.strictEqual(replay.difficulty, DIFFICULTY_MODES.PLUS_ONE);
assert.strictEqual(replay.timeScale, 1.5);

const themeLifecycle = new GameState(375, 667, null, sequenceRandom([
  0.999999, 0.999999, 0.999999,
  0, 0, 0
]));
const previewOrder = themeLifecycle.themeOrder.slice();
assert.deepStrictEqual(previewOrder, THEME_ORDER);
themeLifecycle.start(DIFFICULTY_MODES.NORMAL);
assert.deepStrictEqual(themeLifecycle.themeOrder, previewOrder);
assert.strictEqual(themeLifecycle.director.themeId, previewOrder[0]);
themeLifecycle.screen = SCREENS.WIN;
themeLifecycle.handleTap({ x: 0, y: 0 });
assert.notDeepStrictEqual(themeLifecycle.themeOrder, previewOrder);
assert.strictEqual(new Set(themeLifecycle.themeOrder).size, THEME_ORDER.length);
assert.strictEqual(themeLifecycle.director.themeId, themeLifecycle.themeOrder[0]);

const fastTransition = new GameState(375, 667, null);
fastTransition.start(DIFFICULTY_MODES.PLUS_ONE);
fastTransition.beginLevelTransition();
fastTransition.update(1);
assert.strictEqual(fastTransition.screen, SCREENS.LEVEL_TRANSITION);
assert.strictEqual(fastTransition.level, 1);
fastTransition.update(20);
assert.strictEqual(fastTransition.screen, SCREENS.LEVEL_TRANSITION);
fastTransition.handleTap(centerOf(buttons[0]));
assert.strictEqual(fastTransition.screen, SCREENS.PLAYING);
assert.strictEqual(fastTransition.level, 2);
assert.strictEqual(fastTransition.difficulty, DIFFICULTY_MODES.NORMAL);
assert.strictEqual(fastTransition.timeScale, 1);

assert.strictEqual(getComboMultiplier(2), 1);
assert.strictEqual(getComboMultiplier(3), 1.2);
assert.strictEqual(getComboMultiplier(5), 1.5);
assert.strictEqual(getComboMultiplier(10), 2);
assert.strictEqual(getComboMultiplier(20), 2.5);
assert.strictEqual(getComboMultiplier(50), 3);
assert.strictEqual(getComboMultiplier(100), 4);

const rightGesture = [{ x: 20, y: 20 }, { x: 110, y: 20 }];
const upGesture = [{ x: 100, y: 140 }, { x: 100, y: 40 }];

function eliminationScoreAfterCombo(priorCombo) {
  const scoreRun = new GameState(375, 667, null);
  scoreRun.start();
  scoreRun.combo = priorCombo;
  scoreRun.enemies = [new Enemy({
    x: 40,
    y: 40,
    symbols: [SYMBOLS.RIGHT],
    speed: 0,
    score: 100
  })];
  scoreRun.handleGesture(rightGesture);
  return scoreRun.score;
}

assert.strictEqual(eliminationScoreAfterCombo(2), 120);
assert.strictEqual(eliminationScoreAfterCombo(4), 150);
assert.strictEqual(eliminationScoreAfterCombo(9), 200);
assert.strictEqual(eliminationScoreAfterCombo(19), 250);
assert.strictEqual(eliminationScoreAfterCombo(49), 300);
assert.strictEqual(eliminationScoreAfterCombo(99), 400);

const combo10Run = new GameState(375, 667, null);
combo10Run.start();
combo10Run.combo = 9;
combo10Run.enemies = [
  new Enemy({ x: 40, y: 40, symbols: [SYMBOLS.RIGHT, SYMBOLS.UP], speed: 0, score: 100 })
];
combo10Run.handleGesture(rightGesture);
assert.strictEqual(combo10Run.combo, 10);
assert.strictEqual(combo10Run.items.comboChain, 1);
assert.strictEqual(combo10Run.items.healthPotion, 0);
assert.deepStrictEqual(combo10Run.enemies[0].symbols, [SYMBOLS.UP]);
assert.strictEqual(combo10Run.effects.some((effect) => effect.type === 'comboChain'), false);
assert.strictEqual(combo10Run.feedback.text, '命中 +30  获得紫色闪电');
assert.ok(combo10Run.effects.some((effect) => (
  effect.type === 'itemEarn'
  && effect.itemType === ITEM_TYPES.COMBO_CHAIN
  && effect.toX === itemCenterOf(combo10Run, ITEM_TYPES.COMBO_CHAIN).x
  && effect.toY === itemCenterOf(combo10Run, ITEM_TYPES.COMBO_CHAIN).y
)));

const combo15Run = new GameState(375, 667, null);
combo15Run.start();
combo15Run.combo = 14;
combo15Run.enemies = [
  new Enemy({ x: 40, y: 40, symbols: [SYMBOLS.RIGHT], speed: 0, score: 100 })
];
combo15Run.handleGesture(rightGesture);
assert.strictEqual(combo15Run.items.comboChain, 0);
assert.strictEqual(combo15Run.items.healthPotion, 1);
assert.strictEqual(combo15Run.enemies.some((enemy) => enemy.kind === 'potion'), false);
assert.strictEqual(combo15Run.feedback.text, '消除 +200  获得血瓶');
assert.ok(combo15Run.effects.some((effect) => (
  effect.type === 'itemEarn'
  && effect.itemType === ITEM_TYPES.HEALTH_POTION
  && effect.toX === itemCenterOf(combo15Run, ITEM_TYPES.HEALTH_POTION).x
  && effect.toY === itemCenterOf(combo15Run, ITEM_TYPES.HEALTH_POTION).y
)));

const combo30Run = new GameState(375, 667, null);
combo30Run.start();
combo30Run.combo = 29;
combo30Run.items.comboChain = 2;
combo30Run.items.healthPotion = 3;
combo30Run.enemies = [
  new Enemy({ x: 40, y: 40, symbols: [SYMBOLS.RIGHT, SYMBOLS.UP], speed: 0, score: 100 }),
  new Enemy({ x: 80, y: 40, symbols: [SYMBOLS.LEFT, SYMBOLS.UP], speed: 0, score: 120 })
];
combo30Run.handleGesture(rightGesture);
assert.strictEqual(combo30Run.combo, 30);
assert.strictEqual(combo30Run.items.comboChain, 3);
assert.strictEqual(combo30Run.items.healthPotion, 4);
assert.strictEqual(combo30Run.enemies.filter((enemy) => enemy.kind === 'potion').length, 0);
assert.strictEqual(combo30Run.effects.some((effect) => effect.type === 'comboChain'), false);
assert.deepStrictEqual(
  combo30Run.enemies[0].symbols,
  [SYMBOLS.UP]
);
const doubleRewardEffects = combo30Run.effects.filter((effect) => effect.type === 'itemEarn');
assert.strictEqual(doubleRewardEffects.length, 2);
assert.deepStrictEqual(
  doubleRewardEffects.map((effect) => effect.itemType),
  [ITEM_TYPES.COMBO_CHAIN, ITEM_TYPES.HEALTH_POTION]
);
assert.ok(doubleRewardEffects.every((effect) => {
  const target = itemCenterOf(combo30Run, effect.itemType);
  return effect.toX === target.x && effect.toY === target.y;
}));
combo30Run.updateAnimations(1);
assert.strictEqual(combo30Run.effects.some((effect) => effect.type === 'itemEarn'), false);

const chainUse = new GameState(375, 667, null);
chainUse.start();
chainUse.combo = 8;
chainUse.score = 450;
chainUse.items.comboChain = 2;
chainUse.enemies = [
  new Enemy({ x: 40, y: 40, symbols: [SYMBOLS.UP], speed: 0, score: 100 }),
  new Enemy({ x: 80, y: 40, symbols: [SYMBOLS.LEFT, SYMBOLS.UP], speed: 0, score: 120 })
];
chainUse.handleTap(itemCenterOf(chainUse, ITEM_TYPES.COMBO_CHAIN));
assert.strictEqual(chainUse.items.comboChain, 1);
assert.strictEqual(chainUse.enemies.length, 1);
assert.deepStrictEqual(chainUse.enemies[0].symbols, [SYMBOLS.UP]);
assert.strictEqual(chainUse.combo, 8);
assert.strictEqual(chainUse.score, 450);
assert.strictEqual(chainUse.feedback.text, '紫色闪电释放');
assert.ok(chainUse.effects.some((effect) => effect.type === 'comboChain'));

const emptyChainUse = new GameState(375, 667, null);
emptyChainUse.start();
emptyChainUse.items.comboChain = 1;
emptyChainUse.handleTap(itemCenterOf(emptyChainUse, ITEM_TYPES.COMBO_CHAIN));
assert.strictEqual(emptyChainUse.items.comboChain, 1);
assert.strictEqual(emptyChainUse.feedback.text, '没有可攻击目标');

const potionUse = new GameState(375, 667, null);
potionUse.start(DIFFICULTY_MODES.PLUS_ONE);
potionUse.lives = 3;
potionUse.items.healthPotion = 2;
const potionOrigin = itemCenterOf(potionUse, ITEM_TYPES.HEALTH_POTION);
potionUse.handleTap(potionOrigin);
assert.strictEqual(potionUse.lives, 4);
assert.strictEqual(potionUse.items.healthPotion, 1);
assert.strictEqual(potionUse.feedback.text, '爱心 +1');
assert.ok(potionUse.effects.some((effect) => (
  effect.type === 'potionToHeart'
  && effect.x === potionOrigin.x
  && effect.y === potionOrigin.y
  && effect.heartIndex === 3
)));

const fullPotionRun = new GameState(375, 667, null);
fullPotionRun.start(DIFFICULTY_MODES.NORMAL);
fullPotionRun.items.healthPotion = 1;
fullPotionRun.handleTap(itemCenterOf(fullPotionRun, ITEM_TYPES.HEALTH_POTION));
assert.strictEqual(fullPotionRun.lives, fullPotionRun.maxLives);
assert.strictEqual(fullPotionRun.items.healthPotion, 1);
assert.strictEqual(fullPotionRun.feedback.text, '爱心已满');
assert.strictEqual(fullPotionRun.effects.some((effect) => effect.type === 'potionToHeart'), false);

const itemLifecycle = new GameState(375, 667, null);
itemLifecycle.start(DIFFICULTY_MODES.NORMAL);
itemLifecycle.items.comboChain = 2;
itemLifecycle.items.healthPotion = 3;
itemLifecycle.beginLevelTransition();
itemLifecycle.startNextLevel(DIFFICULTY_MODES.PLUS_ONE);
assert.deepStrictEqual(itemLifecycle.items, { comboChain: 2, healthPotion: 3 });
itemLifecycle.screen = SCREENS.WIN;
itemLifecycle.handleTap({ x: 0, y: 0 });
assert.deepStrictEqual(itemLifecycle.items, { comboChain: 0, healthPotion: 0 });

const mixedScore = new GameState(375, 667, null);
mixedScore.start();
mixedScore.combo = 2;
mixedScore.enemies = [
  new Enemy({ x: 40, y: 40, symbols: [SYMBOLS.RIGHT], speed: 0, score: 100 }),
  new Enemy({ x: 60, y: 40, symbols: [SYMBOLS.RIGHT, SYMBOLS.UP], speed: 0, score: 200 })
];
mixedScore.handleGesture(rightGesture);
assert.strictEqual(mixedScore.combo, 3);
assert.strictEqual(mixedScore.score, 150);
assert.strictEqual(mixedScore.feedback.text, '消除 +150');
mixedScore.handleGesture([{ x: 120, y: 30 }, { x: 30, y: 30 }]);
assert.strictEqual(mixedScore.combo, 0);

const eventSound = {
  played: [],
  vibrated: 0,
  setSoundEnabled() {},
  playMusic() {},
  play(eventName) {
    this.played.push(eventName);
  },
  vibrateDamage() {
    this.vibrated += 1;
  }
};
const eventRun = new GameState(375, 667, eventSound);
eventRun.start();
eventSound.played = [];
eventRun.enemies = [
  new Enemy({ x: 40, y: 40, symbols: [SYMBOLS.RIGHT], speed: 0, score: 100 }),
  new Enemy({ x: 60, y: 40, symbols: [SYMBOLS.RIGHT], speed: 0, score: 100 })
];
eventRun.handleGesture(rightGesture);
assert.deepStrictEqual(eventSound.played, ['vanish']);

const state = new GameState(375, 667, null);
state.start();
assert.strictEqual(state.screen, SCREENS.PLAYING);
assert.strictEqual(state.lives, 5);

state.enemies.push(new Enemy({
  x: 180,
  y: 120,
  symbols: [SYMBOLS.RIGHT, SYMBOLS.UP],
  speed: 0,
  score: 100
}));
state.enemies.push(new Enemy({
  x: 210,
  y: 130,
  symbols: [SYMBOLS.RIGHT],
  speed: 0,
  score: 80
}));

let recognized = state.handleGesture(rightGesture);
assert.strictEqual(recognized, SYMBOLS.RIGHT);
assert.strictEqual(state.enemies[0].symbols.length, 1);
assert.strictEqual(state.enemies.length, 1);
assert.strictEqual(state.combo, 1);
assert.strictEqual(state.score, 110);
assert.ok(state.heroAnimation.cast > 0);
assert.strictEqual(state.heroAnimation.castAge, 0);
assert.ok(state.heroAnimation.cast > 0.7);
assert.ok(state.effects.some((effect) => effect.type === 'cast'));
assert.ok(state.effects.some((effect) => effect.type === 'vanish'));
assert.ok(state.effects.some((effect) => (
  effect.type === 'lightning'
  && effect.fromX === state.hero.x + state.hero.radius * 0.72
  && effect.toX === 210
  && effect.toY === 130
)));

recognized = state.handleGesture(upGesture);
assert.strictEqual(recognized, SYMBOLS.UP);
assert.strictEqual(state.enemies.length, 0);
assert.strictEqual(state.combo, 2);
assert.strictEqual(state.score, 210);
assert.strictEqual(state.effects.filter((effect) => effect.type === 'vanish').length, 2);
assert.strictEqual(state.effects.filter((effect) => effect.type === 'lightning').length, 2);

const danger = new Enemy({
  x: state.hero.x,
  y: state.hero.y,
  symbols: [SYMBOLS.LEFT],
  speed: 0
});
state.enemies = [danger];
state.update(0.016);
assert.strictEqual(state.lives, 4);
assert.strictEqual(state.feedback.text, '爱心 -1');
assert.ok(state.heroAnimation.hurt > 0);
assert.strictEqual(state.heroAnimation.hurtAge, 0);
assert.ok(state.heroAnimation.hurt > 0.8);
assert.ok(state.effects.some((effect) => effect.type === 'impact'));
assert.ok(state.effects.some((effect) => (
  effect.type === 'heartLoss'
  && effect.heartIndex === 4
  && effect.burstCount === 1
)));

const damageRun = new GameState(375, 667, eventSound);
damageRun.start();
eventSound.played = [];
eventSound.vibrated = 0;
damageRun.combo = 4;
damageRun.enemies = [
  new Enemy({ x: damageRun.hero.x, y: damageRun.hero.y, symbols: [SYMBOLS.LEFT], speed: 0 }),
  new Enemy({ x: damageRun.hero.x, y: damageRun.hero.y, symbols: [SYMBOLS.RIGHT], speed: 0 })
];
damageRun.update(0.016);
assert.strictEqual(damageRun.lives, 3);
assert.strictEqual(damageRun.combo, 0);
assert.strictEqual(damageRun.feedback.text, '爱心 -2');
assert.deepStrictEqual(
  damageRun.effects
    .filter((effect) => effect.type === 'heartLoss')
    .map((effect) => effect.heartIndex),
  [4, 3]
);
assert.strictEqual(eventSound.vibrated, 1);
assert.deepStrictEqual(eventSound.played, ['hurt']);

state.update(1);
assert.strictEqual(state.heroAnimation.cast, 0);
assert.strictEqual(state.heroAnimation.hurt, 0);
assert.ok(state.heroAnimation.castAge > 0);
assert.ok(state.heroAnimation.hurtAge > 0);
assert.strictEqual(state.effects.length, 0);

const run = new GameState(375, 667, null);
run.start();
run.score = 900;
run.lives = 3;
run.combo = 4;
run.director.index = run.director.total;
run.update(0);
assert.strictEqual(run.screen, SCREENS.LEVEL_TRANSITION);
assert.strictEqual(run.score, 900);
assert.strictEqual(run.lives, 3);
assert.strictEqual(run.combo, 0);

run.handleTap(centerOf(buttons[1]));
assert.strictEqual(run.screen, SCREENS.PLAYING);
assert.strictEqual(run.level, 2);
assert.strictEqual(run.elapsed, 0);
assert.strictEqual(run.director.level, 2);
assert.strictEqual(run.difficulty, DIFFICULTY_MODES.PLUS_ONE);

run.director.index = run.director.total;
run.update(0);
assert.strictEqual(run.screen, SCREENS.LEVEL_TRANSITION);

run.handleTap(centerOf(buttons[0]));
assert.strictEqual(run.screen, SCREENS.PLAYING);
assert.strictEqual(run.level, 3);
assert.strictEqual(run.director.level, 3);
assert.strictEqual(run.score, 900);
assert.strictEqual(run.lives, 3);
assert.strictEqual(run.difficulty, DIFFICULTY_MODES.NORMAL);

run.director.index = run.director.total;
run.update(0);
assert.strictEqual(run.screen, SCREENS.LEVEL_TRANSITION);

run.handleTap(centerOf(buttons[1]));
assert.strictEqual(run.screen, SCREENS.PLAYING);
assert.strictEqual(run.level, 4);
assert.strictEqual(run.director.level, 4);
assert.strictEqual(run.score, 900);
assert.strictEqual(run.lives, 3);
assert.strictEqual(run.difficulty, DIFFICULTY_MODES.PLUS_ONE);

run.director.index = run.director.total;
run.update(0);
assert.strictEqual(run.screen, SCREENS.WIN);

console.log('game-state.test.js passed');

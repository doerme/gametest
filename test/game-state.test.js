'use strict';

const assert = require('assert');
const { GameState, SCREENS, getComboMultiplier, getHealthPotionSymbols } = require('../src/core/GameState');
const Enemy = require('../src/entities/Enemy');
const { SYMBOLS } = require('../src/input/GestureRecognizer');
const { THEME_IDS, THEME_ORDER, createThemeOrder } = require('../src/levels/Themes');
const { DIFFICULTY_MODES, getDifficultyButtons } = require('../src/ui/DifficultySelector');
const { getAudioToggleBounds } = require('../src/ui/AudioToggle');

function centerOf(button) {
  return {
    x: button.x + button.width * 0.5,
    y: button.y + button.height * 0.5
  };
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
assert.deepStrictEqual(getHealthPotionSymbols(1, DIFFICULTY_MODES.NORMAL), [SYMBOLS.UP]);
assert.deepStrictEqual(getHealthPotionSymbols(1, DIFFICULTY_MODES.PLUS_ONE), [SYMBOLS.UP, SYMBOLS.V]);
assert.deepStrictEqual(getHealthPotionSymbols(2, DIFFICULTY_MODES.PLUS_ONE), [SYMBOLS.V, SYMBOLS.L]);
assert.deepStrictEqual(getHealthPotionSymbols(3, DIFFICULTY_MODES.PLUS_ONE), [SYMBOLS.CIRCLE, SYMBOLS.V]);
assert.deepStrictEqual(getHealthPotionSymbols(4, DIFFICULTY_MODES.PLUS_ONE), [SYMBOLS.Z, SYMBOLS.CIRCLE]);

const rightGesture = [{ x: 20, y: 20 }, { x: 110, y: 20 }];
const upGesture = [{ x: 100, y: 140 }, { x: 100, y: 40 }];
const vGesture = [{ x: 60, y: 70 }, { x: 100, y: 150 }, { x: 145, y: 70 }];

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
assert.strictEqual(combo10Run.enemies.some((enemy) => enemy.kind === 'potion'), false);
assert.strictEqual(combo10Run.enemies.length, 0);
assert.ok(combo10Run.effects.some((effect) => effect.type === 'comboChain'));

const combo20Run = new GameState(375, 667, null);
combo20Run.start();
combo20Run.combo = 19;
combo20Run.enemies = [
  new Enemy({ x: 40, y: 40, symbols: [SYMBOLS.RIGHT, SYMBOLS.UP], speed: 0, score: 100 }),
  new Enemy({ x: 80, y: 40, symbols: [SYMBOLS.LEFT], speed: 0, score: 120 }),
  new Enemy({ x: 120, y: 40, kind: 'potion', species: 'healthPotion', symbols: [SYMBOLS.UP], speed: 0, score: 0 })
];
combo20Run.handleGesture(rightGesture);
assert.strictEqual(combo20Run.combo, 20);
assert.strictEqual(combo20Run.enemies.some((enemy) => enemy.kind === 'potion'), true);
assert.strictEqual(combo20Run.enemies.length, 1);
assert.strictEqual(combo20Run.enemies[0].kind, 'potion');
assert.ok(combo20Run.effects.some((effect) => effect.type === 'comboChain'));

const combo30Run = new GameState(375, 667, null);
combo30Run.start();
combo30Run.combo = 29;
combo30Run.enemies = [
  new Enemy({ x: 40, y: 40, symbols: [SYMBOLS.RIGHT, SYMBOLS.UP], speed: 0, score: 100 }),
  new Enemy({ x: 80, y: 40, symbols: [SYMBOLS.LEFT, SYMBOLS.UP], speed: 0, score: 120 })
];
combo30Run.handleGesture(rightGesture);
assert.strictEqual(combo30Run.combo, 30);
assert.strictEqual(combo30Run.enemies.filter((enemy) => enemy.kind === 'potion').length, 1);
assert.ok(combo30Run.effects.some((effect) => effect.type === 'comboChain'));
assert.deepStrictEqual(
  combo30Run.enemies.find((enemy) => enemy.kind !== 'potion').symbols,
  [SYMBOLS.UP]
);

const existingPotionAt30 = new GameState(375, 667, null);
existingPotionAt30.start();
existingPotionAt30.combo = 29;
existingPotionAt30.enemies = [
  new Enemy({ x: 40, y: 40, symbols: [SYMBOLS.RIGHT], speed: 0, score: 100 }),
  new Enemy({ x: 120, y: 40, kind: 'potion', species: 'healthPotion', symbols: [SYMBOLS.UP], speed: 0, score: 0 })
];
existingPotionAt30.handleGesture(rightGesture);
assert.strictEqual(existingPotionAt30.enemies.filter((enemy) => enemy.kind === 'potion').length, 1);

const combo50Run = new GameState(375, 667, null);
combo50Run.start();
combo50Run.combo = 49;
combo50Run.enemies = [
  new Enemy({ x: 40, y: 40, symbols: [SYMBOLS.RIGHT], speed: 0, score: 100 }),
  new Enemy({ x: 80, y: 40, symbols: [SYMBOLS.LEFT, SYMBOLS.UP], speed: 0, score: 120 }),
  new Enemy({ x: 120, y: 40, kind: 'potion', species: 'healthPotion', symbols: [SYMBOLS.UP], speed: 0, score: 0 })
];
combo50Run.handleGesture(rightGesture);
assert.strictEqual(combo50Run.combo, 50);
assert.strictEqual(combo50Run.enemies.length, 2);
assert.strictEqual(combo50Run.enemies.some((enemy) => enemy.kind === 'potion'), true);
assert.deepStrictEqual(
  combo50Run.enemies.find((enemy) => enemy.kind !== 'potion').symbols,
  [SYMBOLS.UP]
);
assert.ok(combo50Run.effects.some((effect) => effect.type === 'comboChain'));

const combo100Run = new GameState(375, 667, null);
combo100Run.start();
combo100Run.combo = 99;
combo100Run.enemies = [
  new Enemy({ x: 40, y: 40, symbols: [SYMBOLS.RIGHT], speed: 0, score: 100 }),
  new Enemy({ x: 80, y: 40, symbols: [SYMBOLS.LEFT, SYMBOLS.UP], speed: 0, score: 120 })
];
combo100Run.handleGesture(rightGesture);
assert.strictEqual(combo100Run.combo, 100);
assert.strictEqual(combo100Run.enemies.length, 1);
assert.deepStrictEqual(combo100Run.enemies[0].symbols, [SYMBOLS.UP]);
assert.ok(combo100Run.effects.some((effect) => effect.type === 'comboChain'));

const normalPotionRun = new GameState(375, 667, null);
normalPotionRun.start(DIFFICULTY_MODES.NORMAL);
normalPotionRun.lives = 3;
normalPotionRun.combo = 14;
normalPotionRun.enemies = [new Enemy({ x: 40, y: 40, symbols: [SYMBOLS.RIGHT], speed: 0, score: 100 })];
normalPotionRun.handleGesture(rightGesture);
let potion = normalPotionRun.enemies.find((enemy) => enemy.kind === 'potion');
assert.ok(potion);
assert.deepStrictEqual(potion.symbols, [SYMBOLS.UP]);
assert.strictEqual(normalPotionRun.feedback.text, '消除 +200  血瓶出现');
const lightningBeforePotion = normalPotionRun.effects.filter((effect) => effect.type === 'lightning').length;
normalPotionRun.handleGesture(upGesture);
assert.strictEqual(normalPotionRun.lives, 4);
assert.strictEqual(normalPotionRun.enemies.some((enemy) => enemy.kind === 'potion'), false);
assert.strictEqual(normalPotionRun.feedback.text, '爱心 +1');
assert.ok(normalPotionRun.effects.some((effect) => (
  effect.type === 'potionToHeart'
  && effect.x === potion.x
  && effect.y === potion.y
  && effect.heartIndex === 3
)));
assert.strictEqual(normalPotionRun.effects.filter((effect) => effect.type === 'lightning').length, lightningBeforePotion);

const plusPotionRun = new GameState(375, 667, null);
plusPotionRun.start(DIFFICULTY_MODES.PLUS_ONE);
plusPotionRun.lives = 3;
plusPotionRun.combo = 14;
plusPotionRun.enemies = [new Enemy({ x: 40, y: 40, symbols: [SYMBOLS.RIGHT], speed: 0, score: 100 })];
plusPotionRun.handleGesture(rightGesture);
potion = plusPotionRun.enemies.find((enemy) => enemy.kind === 'potion');
assert.deepStrictEqual(potion.symbols, [SYMBOLS.UP, SYMBOLS.V]);
const potionPosition = { x: potion.x, y: potion.y };
plusPotionRun.update(0.1);
assert.deepStrictEqual({ x: potion.x, y: potion.y }, potionPosition);
assert.strictEqual(potion.dead, false);
plusPotionRun.handleGesture(upGesture);
assert.deepStrictEqual(potion.symbols, [SYMBOLS.V]);
assert.strictEqual(plusPotionRun.lives, 3);
assert.strictEqual(plusPotionRun.feedback.text, '血瓶解锁中');
plusPotionRun.handleGesture(vGesture);
assert.strictEqual(plusPotionRun.lives, 4);
assert.strictEqual(plusPotionRun.feedback.text, '爱心 +1');
assert.ok(plusPotionRun.effects.some((effect) => (
  effect.type === 'potionToHeart'
  && effect.heartIndex === 3
)));

const fullPotionRun = new GameState(375, 667, null);
fullPotionRun.start(DIFFICULTY_MODES.NORMAL);
fullPotionRun.enemies = [new Enemy({
  x: 180,
  y: 130,
  radius: 30,
  speed: 0,
  score: 0,
  kind: 'potion',
  species: 'healthPotion',
  symbols: [SYMBOLS.UP]
})];
fullPotionRun.handleGesture(upGesture);
assert.strictEqual(fullPotionRun.lives, fullPotionRun.maxLives);
assert.strictEqual(fullPotionRun.feedback.text, '爱心已满');
assert.strictEqual(fullPotionRun.effects.some((effect) => effect.type === 'potionToHeart'), false);
assert.strictEqual(fullPotionRun.effects.some((effect) => effect.type === 'lightning'), false);

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

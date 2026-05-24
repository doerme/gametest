'use strict';

const assert = require('assert');
const { GameState, SCREENS, getComboMultiplier } = require('../src/core/GameState');
const Enemy = require('../src/entities/Enemy');
const { SYMBOLS } = require('../src/input/GestureRecognizer');
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
  playMusic(level) {
    this.tracks.push(level);
  },
  stopMusic() {
    this.stopped += 1;
  },
  vibrateDamage() {
    this.vibrated += 1;
  }
};
const audioControls = new GameState(375, 667, soundCalls);
assert.strictEqual(audioControls.soundEnabled, true);
assert.deepStrictEqual(soundCalls.enabled, [true]);
audioControls.handleTap(centerOf(audioButton));
assert.strictEqual(audioControls.soundEnabled, false);
audioControls.handleTap(centerOf(audioButton));
assert.strictEqual(audioControls.soundEnabled, true);
assert.deepStrictEqual(soundCalls.enabled, [true, false, true]);
audioControls.handleTap(centerOf(buttons[0]));
assert.deepStrictEqual(soundCalls.tracks, [1]);
audioControls.beginLevelTransition();
assert.deepStrictEqual(soundCalls.tracks, [1, 2]);
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
assert.strictEqual(mixedScore.feedback.text, '消除 +150  Combo x3  1.2x');
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
assert.ok(state.effects.some((effect) => effect.type === 'cast'));
assert.ok(state.effects.some((effect) => effect.type === 'vanish'));

recognized = state.handleGesture(upGesture);
assert.strictEqual(recognized, SYMBOLS.UP);
assert.strictEqual(state.enemies.length, 0);
assert.strictEqual(state.combo, 2);
assert.strictEqual(state.score, 210);
assert.strictEqual(state.effects.filter((effect) => effect.type === 'vanish').length, 2);

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
assert.ok(state.effects.some((effect) => effect.type === 'impact'));

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
assert.strictEqual(eventSound.vibrated, 1);
assert.deepStrictEqual(eventSound.played, ['hurt']);

state.update(1);
assert.strictEqual(state.heroAnimation.cast, 0);
assert.strictEqual(state.heroAnimation.hurt, 0);
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

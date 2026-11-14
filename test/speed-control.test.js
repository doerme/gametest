'use strict';

const assert = require('assert');
const { GameState, GAME_MODES, SCREENS } = require('../src/core/GameState');
const Enemy = require('../src/entities/Enemy');
const InputManager = require('../src/input/InputManager');
const { getStartButtons, getContinueButton } = require('../src/ui/DifficultySelector');
const { getSpeedControl, isSpeedControlHit, findSpeedDirectionAtPoint } = require('../src/ui/SpeedControl');
const { getAudioToggleBounds } = require('../src/ui/AudioToggle');
const { getHanziLayout } = require('../src/ui/HanziLayout');
const { getStrokeMedian } = require('../src/hanzi/Characters');
const { sceneScale } = require('../src/hanzi/Pacing');

const GEARS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const center = (b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, actual + ' != ' + expected);
function setSpeed(state, speed) {
  while (state.timeScale !== speed) assert.ok(state.adjustSpeed(state.timeScale < speed ? 1 : -1));
}
function run(mode) {
  const state = new GameState(375, 667, null);
  state.start('normal', mode);
  state.director.index = state.director.total;
  const enemy = new Enemy({ x: state.hero.x, y: state.hero.y - 130, speed: 20, symbols: ['right'], hanzi: mode === GAME_MODES.HANZI ? { character: '水', strokeCount: 4 } : null });
  state.enemies = [enemy]; state.syncHanziTarget([enemy]);
  return { state, enemy };
}

const defaults = new GameState(375, 667);
assert.strictEqual(defaults.gameMode, GAME_MODES.HANZI);
assert.strictEqual(defaults.adjustSpeed(1), false, 'title is not a speed control');
defaults.start();
assert.strictEqual(defaults.gameMode, GAME_MODES.HANZI);
assert.strictEqual(defaults.timeScale, 1);
assert.deepStrictEqual(getStartButtons(375, 667).map((button) => button.label), ['开始汉字模式', '经典模式']);

for (const mode of Object.values(GAME_MODES)) {
  const { state } = run(mode);
  setSpeed(state, 0.5);
  assert.strictEqual(state.adjustSpeed(-1), false);
  const visited = [state.timeScale];
  while (state.adjustSpeed(1)) visited.push(state.timeScale);
  assert.deepStrictEqual(visited, GEARS);
  assert.strictEqual(state.timeScale, 2);
  assert.strictEqual(state.adjustSpeed(1), false);
  assert.strictEqual(state.adjustSpeed(0), false);
  assert.strictEqual(state.adjustSpeed(NaN), false);
  setSpeed(state, 1.75);
  state.beginLevelTransition();
  assert.strictEqual(state.adjustSpeed(-1), false);
  state.handleTap(center(getContinueButton(375, 667, mode, state.timeScale)));
  assert.strictEqual(state.screen, SCREENS.PLAYING);
  assert.strictEqual(state.level, 2);
  assert.strictEqual(state.gameMode, mode);
  assert.strictEqual(state.timeScale, 1.75);
  state.screen = SCREENS.LOSE; state.handleTap({ x: 0, y: 0 });
  assert.strictEqual(state.gameMode, GAME_MODES.HANZI);
  assert.strictEqual(state.timeScale, 1);
  state.start('plus-one', mode);
  assert.strictEqual(state.timeScale, 1.5, 'legacy difficulty maps in either mode');
  state.start('normal', mode); assert.strictEqual(state.timeScale, 1);

  for (const speed of GEARS) {
    const { state: s, enemy } = run(mode);
    setSpeed(s, speed);
    s.feedback = { text: 'retry', age: 0, type: 'retry' };
    s.heroAnimation.cast = 0.8; enemy.hitFlash = 0.18;
    const beforeY = enemy.y;
    s.update(0.1, { visibleEnemies: [enemy] });
    close(s.elapsed, 0.1 * speed);
    close(enemy.y - beforeY, 2 * speed);
    close(enemy.hitFlash, 0.08);
    close(s.heroAnimation.castAge, 0.1);
    close(s.feedback.age, 0.1);
    if (mode === GAME_MODES.HANZI) {
      close(s.sceneElapsed, 0.1 * speed * sceneScale(4));
      close(s.hanziGuideTime, 0.1);
    }
  }

  const spawn = new GameState(375, 667); spawn.start('normal', mode);
  const firstTime = spawn.director.config.timeline[0].time;
  spawn.update(firstTime - 0.1);
  assert.strictEqual(spawn.enemies.length, 0);
  const elapsed = spawn.elapsed;
  setSpeed(spawn, 2);
  assert.strictEqual(spawn.elapsed, elapsed, 'speed changes never rescale accumulated time');
  spawn.update(0.051);
  assert.strictEqual(spawn.enemies.length, 1, 'spawning follows the new speed on the next update');
}

const { state: writing, enemy: target } = run(GAME_MODES.HANZI);
target.hanzi.strokeIndex = 1;
writing.combo = 8; writing.score = 240; writing.lives = 3;
writing.items = { comboChain: 2, healthPotion: 1 };
const revision = writing.hanziRevision;
setSpeed(writing, 2); setSpeed(writing, 0.5);
assert.strictEqual(writing.hanziTarget, target);
assert.strictEqual(writing.hanziRevision, revision);
assert.strictEqual(target.hanzi.strokeIndex, 1);
assert.deepStrictEqual([writing.combo, writing.score, writing.lives, writing.items], [8, 240, 3, { comboChain: 2, healthPotion: 1 }]);
const board = getHanziLayout(375, 667).board;
const stroke = getStrokeMedian('水', 1).map((p) => ({ x: board.x + p.x * board.width, y: board.y + p.y * board.height }));
assert.ok(writing.handleHanziStroke(stroke, writing.captureHanziStroke(stroke[0])).accepted);
assert.strictEqual(target.hanzi.strokeIndex, 2);

for (const speed of GEARS) {
  const { state, enemy } = run(GAME_MODES.HANZI); setSpeed(state, speed);
  state.items.comboChain = 1; state.useItem('comboChain');
  const y = enemy.y;
  state.update(2, { visibleEnemies: [enemy] });
  close(state.freezeRemaining, 1); close(state.elapsed, 0); close(state.sceneElapsed, 0); close(enemy.y, y);
  state.update(1.1, { visibleEnemies: [enemy] });
  close(state.freezeRemaining, 0); close(state.elapsed, 0.1 * speed); close(enemy.y - y, 2 * speed);
}

for (const [width, height] of [[390, 844], [375, 667], [320, 568]]) {
  const { bounds, minus, plus, display } = getSpeedControl(width);
  const audio = getAudioToggleBounds(width);
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width < audio.x);
  assert.ok(bounds.y + bounds.height < getHanziLayout(width, height).panel.y);
  assert.ok(minus.width >= 32 && plus.width >= 32 && bounds.height >= 32);
  assert.strictEqual(findSpeedDirectionAtPoint(width, center(minus)), -1);
  assert.strictEqual(findSpeedDirectionAtPoint(width, center(plus)), 1);
  assert.strictEqual(findSpeedDirectionAtPoint(width, center(display)), null);
  assert.ok(isSpeedControlHit(width, center(display)));
}

const callbacks = {}; const wx = {};
for (const name of ['TouchStart', 'TouchMove', 'TouchEnd', 'TouchCancel']) {
  wx['on' + name] = (fn) => { callbacks[name] = fn; };
  wx['off' + name] = () => {};
}
const { state: clicks } = run(GAME_MODES.SYMBOL);
const input = new InputManager(wx, {}, { isUiPoint: (p) => isSpeedControlHit(375, p) });
let casts = 0;
input.onGesture = () => { casts += 1; };
input.onTap = (p) => clicks.handleTap(p); input.bind();
const p = center(getSpeedControl(375).plus);
const touch = (point) => ({ identifier: 1, clientX: point.x, clientY: point.y });
callbacks.TouchStart({ touches: [touch(p)] }); callbacks.TouchEnd({ changedTouches: [touch(p)] });
assert.strictEqual(clicks.timeScale, 1.25);
callbacks.TouchStart({ touches: [touch(p)] }); callbacks.TouchMove({ touches: [touch({ x: 250, y: 260 })] }); callbacks.TouchEnd({ changedTouches: [touch({ x: 250, y: 260 })] });
assert.strictEqual(casts, 0, 'dragging from a speed button never casts');
assert.strictEqual(clicks.timeScale, 1.25, 'dragging from a speed button never adjusts speed');
input.destroy();
console.log('speed-control.test.js passed');

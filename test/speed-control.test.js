'use strict';

const assert = require('assert');
const { GameState, GAME_MODES, SCREENS } = require('../src/core/GameState');
const Enemy = require('../src/entities/Enemy');
const InputManager = require('../src/input/InputManager');
const { getStartButtons, getContinueButton } = require('../src/ui/DifficultySelector');
const { getSpeedControl, isSpeedControlHit, findSpeedDirectionAtPoint, formatSpeed } = require('../src/ui/SpeedControl');
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
  const { bounds, hitBounds, panel, minus, plus, display } = getSpeedControl(width, { open: true });
  const audio = getAudioToggleBounds(width);
  assert.strictEqual(bounds.width, 88); assert.strictEqual(bounds.height, 28);
  assert.strictEqual(bounds.y, audio.y);
  assert.ok(hitBounds.width > bounds.width && hitBounds.height >= 36);
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width < audio.x);
  assert.ok(panel.y + panel.height < getHanziLayout(width, height).panel.y);
  assert.ok(minus.width >= 32 && plus.width >= 32 && minus.height >= 36);
  assert.strictEqual(findSpeedDirectionAtPoint(width, center(minus), { open: true }), -1);
  assert.strictEqual(findSpeedDirectionAtPoint(width, center(plus), { open: true }), 1);
  assert.strictEqual(findSpeedDirectionAtPoint(width, center(display), { open: true }), null);
  assert.strictEqual(findSpeedDirectionAtPoint(width, center(plus)), null, 'hidden buttons cannot adjust speed');
  assert.ok(isSpeedControlHit(width, center(display), { open: true }));
  assert.ok(!isSpeedControlHit(width, center(display)), 'hidden panel never captures writing');
  const hint = getSpeedControl(width, { hintVisible: true }).hint;
  assert.ok(isSpeedControlHit(width, center(hint), { hintVisible: true }));
}
assert.deepStrictEqual(GEARS.map(formatSpeed), ['0.5×', '0.75×', '1×', '1.25×', '1.5×', '1.75×', '2×']);

for (const mode of Object.values(GAME_MODES)) {
  const { state, enemy } = run(mode);
  const control = getSpeedControl(375, { open: true });
  state.elapsed = 0.4; state.sceneElapsed = 0.3; state.freezeRemaining = mode === GAME_MODES.HANZI ? 3 : 0;
  state.items = { comboChain: 1, healthPotion: 1 }; state.lives = 3; state.combo = 8;
  state.feedback = { text: 'retry', age: 0, type: 'retry' }; state.heroAnimation.cast = 0.8;
  const before = { y: enemy.y, elapsed: state.elapsed, scene: state.sceneElapsed, freeze: state.freezeRemaining, index: state.director.index, revision: state.hanziRevision };
  state.handleTap(center(control.bounds));
  assert.ok(state.speedControlOpen); assert.strictEqual(state.speedHintRemaining, 0);
  state.handleTap(center(control.plus)); assert.strictEqual(state.timeScale, 1.25);
  assert.ok(state.speedControlOpen, 'adjusting a gear keeps the panel open');
  state.update(5, { visibleEnemies: [enemy] });
  assert.deepStrictEqual({ y: enemy.y, elapsed: state.elapsed, scene: state.sceneElapsed, freeze: state.freezeRemaining, index: state.director.index, revision: state.hanziRevision }, before);
  assert.deepStrictEqual([state.lives, state.combo, state.score, state.items], [3, 8, 0, { comboChain: 1, healthPotion: 1 }]);
  assert.strictEqual(state.heroAnimation.cast, 0, 'UI animations continue during the speed pause');
  assert.strictEqual(state.useItem('comboChain'), false);
  assert.strictEqual(state.handleGesture([{ x: 20, y: 200 }, { x: 200, y: 200 }]), 'unknown');
  assert.strictEqual(state.lastGestureResult, null);
  state.handleTap(center(control.display)); assert.ok(state.speedControlOpen);
  const sound = state.soundEnabled;
  state.handleTap(center(getAudioToggleBounds(375)));
  assert.ok(!state.speedControlOpen); assert.strictEqual(state.soundEnabled, sound, 'outside tap only closes the panel');
  state.handleTap(center(getAudioToggleBounds(375))); assert.strictEqual(state.soundEnabled, !sound);
  state.freezeRemaining = 0;
  state.update(0.1, { visibleEnemies: [enemy] });
  close(state.elapsed, before.elapsed + 0.125); close(enemy.y - before.y, 2.5);
  state.handleTap(center(control.bounds)); state.start('normal', mode);
  assert.ok(!state.speedControlOpen); assert.strictEqual(state.speedHintRemaining, 0, 'a new run does not repeat onboarding');
}

const nextStroke = getStrokeMedian('水', 2).map((p) => ({ x: board.x + p.x * board.width, y: board.y + p.y * board.height }));
const captured = writing.captureHanziStroke(nextStroke[0]);
writing.handleTap(center(getSpeedControl(375).bounds));
assert.strictEqual(writing.captureHanziStroke(nextStroke[0]), null);
assert.deepStrictEqual(writing.handleHanziStroke(nextStroke, captured), { accepted: false, ignored: true });
assert.strictEqual(target.hanzi.strokeIndex, 2);
writing.handleTap({ x: 300, y: 300 });
assert.ok(writing.handleHanziStroke(nextStroke, captured).accepted, 'confirmed writing and a valid context survive the panel');

const callbacks = {}; const wx = {};
for (const name of ['TouchStart', 'TouchMove', 'TouchEnd', 'TouchCancel']) {
  wx['on' + name] = (fn) => { callbacks[name] = fn; };
  wx['off' + name] = () => {};
}
const { state: clicks } = run(GAME_MODES.SYMBOL);
const input = new InputManager(wx, {}, { isUiPoint: (p) => clicks.speedControlOpen || isSpeedControlHit(375, p, { hintVisible: clicks.speedHintRemaining > 0 }) });
let casts = 0;
input.onGesture = () => { casts += 1; };
input.onTap = (p) => clicks.handleTap(p); input.bind();
const touch = (point) => ({ identifier: 1, clientX: point.x, clientY: point.y });
const trigger = center(getSpeedControl(375).bounds);
callbacks.TouchStart({ touches: [touch(trigger)] }); callbacks.TouchEnd({ changedTouches: [touch(trigger)] });
assert.ok(clicks.speedControlOpen);
const p = center(getSpeedControl(375, { open: true }).plus);
callbacks.TouchStart({ touches: [touch(p)] }); callbacks.TouchEnd({ changedTouches: [touch(p)] });
assert.strictEqual(clicks.timeScale, 1.25);
callbacks.TouchStart({ touches: [touch(p)] }); callbacks.TouchMove({ touches: [touch({ x: 250, y: 260 })] }); callbacks.TouchEnd({ changedTouches: [touch({ x: 250, y: 260 })] });
assert.strictEqual(casts, 0, 'dragging from a speed button never casts');
assert.strictEqual(clicks.timeScale, 1.25, 'dragging from a speed button never adjusts speed');
const outside = { x: 300, y: 300 };
callbacks.TouchStart({ touches: [touch(outside)] }); callbacks.TouchMove({ touches: [touch({ x: 250, y: 260 })] }); callbacks.TouchEnd({ changedTouches: [touch({ x: 250, y: 260 })] });
assert.strictEqual(casts, 0, 'outside drags while paused are captured too');
callbacks.TouchStart({ touches: [touch(outside)] }); callbacks.TouchEnd({ changedTouches: [touch(outside)] });
assert.ok(!clicks.speedControlOpen);
callbacks.TouchStart({ touches: [touch(outside)] }); callbacks.TouchMove({ touches: [touch({ x: 250, y: 260 })] }); callbacks.TouchEnd({ changedTouches: [touch({ x: 250, y: 260 })] });
assert.strictEqual(casts, 1, 'drawing resumes on the next touch');
input.destroy();
console.log('speed-control.test.js passed');

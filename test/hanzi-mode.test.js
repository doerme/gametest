'use strict';
const assert = require('assert');
const { GameState, SCREENS, GAME_MODES } = require('../src/core/GameState');
const Enemy = require('../src/entities/Enemy');
const { getStrokeCount, getStrokeMedian } = require('../src/hanzi/Characters');
const { getHanziLayout } = require('../src/ui/HanziLayout');
const { getStartButtons, getContinueButton } = require('../src/ui/DifficultySelector');
const { successFeedbackDuration } = require('../src/hanzi/RecognitionPolicy');
const center = (b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
function fixture(character = '水', count = 1) {
  const state = new GameState(375, 667, null, () => 0.5);
  state.start('normal', GAME_MODES.HANZI);
  assert.strictEqual(state.timeScale, 1);
  state.director.index = state.director.total;
  state.enemies = Array.from({ length: count }, (_, i) => new Enemy({ x: state.hero.x + i * 10, y: state.hero.y - 80 - i * 80, speed: 0, hanzi: { character, strokeCount: getStrokeCount(character) } }));
  state.syncHanziTarget(state.enemies);
  return state;
}
function points(state, character, index) {
  const board = getHanziLayout(state.width, state.height).board;
  return getStrokeMedian(character, index).map((p) => ({ x: board.x + p.x * board.width, y: board.y + p.y * board.height }));
}
function write(state) {
  const target = state.hanziTarget;
  const path = points(state, target.hanzi.character, target.hanzi.strokeIndex);
  const context = state.captureHanziStroke(path[0]);
  assert.ok(state.handleHanziStroke(path, context).accepted);
  return { target, path, context };
}

const selection = new GameState(375, 667);
const buttons = getStartButtons(375, 667);
assert.strictEqual(buttons.length, 2);
selection.handleTap(center(buttons[0]));
assert.strictEqual(selection.gameMode, GAME_MODES.HANZI);
assert.strictEqual(selection.screen, SCREENS.PLAYING);
selection.beginLevelTransition();
selection.handleTap(center(getContinueButton(375, 667)));
assert.strictEqual(selection.level, 2);
assert.strictEqual(selection.gameMode, GAME_MODES.HANZI);
selection.screen = SCREENS.LOSE;
selection.handleTap({ x: 180, y: 380 });
assert.strictEqual(selection.gameMode, GAME_MODES.HANZI);
assert.strictEqual(selection.hanziTarget, null);
selection.start('plus-one');
assert.strictEqual(selection.gameMode, GAME_MODES.HANZI);
assert.strictEqual(selection.timeScale, 1.5);

const run = fixture('水');
run.combo = 8;
const first = write(run);
assert.strictEqual(run.score, 0);
assert.strictEqual(run.combo, 8);
assert.strictEqual(first.target.hanzi.strokeIndex, 1);
assert.strictEqual(run.handleHanziStroke(first.path, first.context).ignored, true, 'duplicate submission is ignored');
const current = points(run, '水', 1);
const capture = run.captureHanziStroke(current[0]);
for (let attempt = 1; attempt <= 3; attempt += 1) {
  run.hanziGuideTime = 1;
  assert.ok(!run.handleHanziStroke(current.slice().reverse(), capture).accepted);
  assert.strictEqual(run.feedback.protected, true);
  assert.strictEqual(run.feedback.retriesRemaining, 3 - attempt);
  assert.strictEqual(run.combo, 8);
  assert.strictEqual(run.hanziGuideTime, 0, 'retry restarts the current guide');
  assert.strictEqual(first.target.hanzi.strokeIndex, 1);
}
assert.ok(!run.handleHanziStroke(current.slice().reverse(), capture).accepted);
assert.strictEqual(run.feedback.protected, false);
assert.strictEqual(run.combo, 0);
assert.strictEqual(first.target.hanzi.strokeIndex, 1, 'mistakes retain confirmed strokes');
write(run);
assert.strictEqual(run.gestureFailures, 0, 'a successful stroke restores all three protections');
assert.strictEqual(run.combo, 0, 'partial success does not inflate the combo');
assert.ok(run.feedback.text.includes('真棒'));
run.updateAnimations(1.1);
assert.ok(run.feedback, 'positive feedback lasts longer than the former 0.7 seconds');
run.updateAnimations(successFeedbackDuration - 1.1 + 0.01);
assert.strictEqual(run.feedback, null);
const nextPath = points(run, '水', 2);
const nextCapture = run.captureHanziStroke(nextPath[0]);
run.combo = 3;
assert.ok(run.handleHanziStroke([nextPath[0], nextPath[0]], nextCapture).ignored);
assert.strictEqual(run.gestureFailures, 0, 'taps do not consume protection');
assert.ok(!run.handleHanziStroke(nextPath.slice().reverse(), nextCapture).accepted);
assert.strictEqual(run.combo, 3, 'a new set of three protections is available');
while (run.hanziTarget) write(run);
assert.strictEqual(run.combo, 4, 'one completed character grants one combo');
assert.strictEqual(run.score, 120);
assert.strictEqual(run.enemies.length, 0);

const matching = fixture('一', 2);
const untouched = matching.enemies[1];
write(matching);
assert.ok(!untouched.dead && untouched.hanzi.strokeIndex === 0, 'same-character monsters are not hit together');
assert.strictEqual(matching.hanziTarget, untouched);
assert.strictEqual(untouched.takeComboHit(), false);
assert.strictEqual(untouched.applySymbol('right'), false);

const locked = fixture('二', 2);
const target = locked.hanziTarget;
locked.enemies[1].y = locked.hero.y - 50;
locked.syncHanziTarget(locked.enemies);
assert.strictEqual(locked.hanziTarget, target, 'a newly closer monster cannot steal the target');
write(locked);
const oldPath = points(locked, '二', 1);
const oldContext = locked.captureHanziStroke(oldPath[0]);
locked.resize(320, 568);
assert.strictEqual(target.hanzi.strokeIndex, 1);
assert.ok(locked.handleHanziStroke(oldPath, oldContext).ignored, 'resize invalidates only the pending stroke');
write(locked);

const departed = fixture('二', 2);
const old = departed.hanziTarget;
const pendingPath = points(departed, '二', 0);
const pending = departed.captureHanziStroke(pendingPath[0]);
old.x = departed.hero.x; old.y = departed.hero.y;
departed.update(0, { visibleEnemies: departed.enemies });
assert.ok(old.dead && departed.hanziTarget !== old);
assert.ok(departed.handleHanziStroke(pendingPath, pending).ignored);
assert.strictEqual(departed.lives, 4);

const freeze = fixture('水');
freeze.enemies[0].speed = 10;
freeze.items.comboChain = 2;
const originalY = freeze.enemies[0].y;
const clock = freeze.director.spawnClock;
assert.ok(freeze.useItem('comboChain'));
freeze.update(2, { visibleEnemies: freeze.enemies });
assert.strictEqual(freeze.enemies[0].y, originalY);
assert.strictEqual(freeze.elapsed, 0);
assert.strictEqual(freeze.sceneElapsed, 0);
assert.strictEqual(freeze.director.spawnClock, clock);
write(freeze);
assert.strictEqual(freeze.enemies[0].hanzi.strokeIndex, 1, 'writing continues during freeze');
freeze.useItem('comboChain');
assert.strictEqual(freeze.freezeRemaining, 3, 'reuse refreshes rather than stacks');
freeze.update(3.25, { visibleEnemies: freeze.enemies });
assert.strictEqual(freeze.freezeRemaining, 0);
assert.ok(Math.abs(freeze.enemies[0].y - originalY - 2.5) < 1e-8);
assert.strictEqual(freeze.elapsed, 0.25);
assert.strictEqual(freeze.enemies[0].hanzi.strokeIndex, 1);

for (const [combo, item] of [[9, 'comboChain'], [14, 'healthPotion']]) {
  const state = fixture('一'); state.combo = combo; write(state);
  assert.strictEqual(state.items[item], 1);
  assert.strictEqual(state.combo, combo + 1);
}
const noTargets = fixture('一'); noTargets.enemies = []; noTargets.items.comboChain = 1;
assert.strictEqual(noTargets.useItem('comboChain'), false);
assert.strictEqual(noTargets.items.comboChain, 1);
console.log('hanzi-mode.test.js passed');

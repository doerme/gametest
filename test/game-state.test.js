'use strict';

const assert = require('assert');
const { GameState, SCREENS } = require('../src/core/GameState');
const Enemy = require('../src/entities/Enemy');
const { SYMBOLS } = require('../src/input/GestureRecognizer');

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

let recognized = state.handleGesture([{ x: 20, y: 20 }, { x: 110, y: 20 }]);
assert.strictEqual(recognized, SYMBOLS.RIGHT);
assert.strictEqual(state.enemies[0].symbols.length, 1);
assert.strictEqual(state.enemies.length, 1);
assert.ok(state.score >= 120);
assert.ok(state.heroAnimation.cast > 0);
assert.ok(state.effects.some((effect) => effect.type === 'cast'));
assert.ok(state.effects.some((effect) => effect.type === 'vanish'));

recognized = state.handleGesture([{ x: 100, y: 140 }, { x: 100, y: 40 }]);
assert.strictEqual(recognized, SYMBOLS.UP);
assert.strictEqual(state.enemies.length, 0);
assert.ok(state.score > 100);
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
assert.ok(state.heroAnimation.hurt > 0);
assert.ok(state.effects.some((effect) => effect.type === 'impact'));

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

run.update(2);
assert.strictEqual(run.screen, SCREENS.PLAYING);
assert.strictEqual(run.level, 2);
assert.strictEqual(run.elapsed, 0);
assert.strictEqual(run.director.level, 2);

run.director.index = run.director.total;
run.update(0);
assert.strictEqual(run.screen, SCREENS.LEVEL_TRANSITION);

run.update(2);
assert.strictEqual(run.screen, SCREENS.PLAYING);
assert.strictEqual(run.level, 3);
assert.strictEqual(run.director.level, 3);
assert.strictEqual(run.score, 900);
assert.strictEqual(run.lives, 3);

run.director.index = run.director.total;
run.update(0);
assert.strictEqual(run.screen, SCREENS.WIN);

console.log('game-state.test.js passed');

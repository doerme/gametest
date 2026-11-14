'use strict';

const assert = require('assert');
const { GameState } = require('../src/core/GameState');
const Enemy = require('../src/entities/Enemy');
const { getSpeedControl } = require('../src/ui/SpeedControl');
const { SPEED_HINT_KEY, createSpeedHintPreference } = require('../src/ui/SpeedHint');
const center = (r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });

function game(preference) { return new GameState(375, 667, null, undefined, { speedHintPreference: preference }); }
for (const native of [false, true]) {
  const data = new Map();
  const storage = native ? { getStorageSync: (key) => data.get(key), setStorageSync: (key, value) => data.set(key, value) }
    : { getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value) };
  const preference = () => createSpeedHintPreference(native ? storage : null, native ? undefined : storage);
  const first = game(preference());
  assert.strictEqual(data.size, 0, 'merely opening the title does not consume the hint');
  first.start();
  assert.strictEqual(first.speedHintRemaining, 4);
  assert.ok(data.has(SPEED_HINT_KEY));
  const hint = getSpeedControl(375, { hintVisible: true }).hint;
  first.handleTap(center(hint));
  assert.ok(first.speedControlOpen); assert.strictEqual(first.speedHintRemaining, 0);
  first.start(); assert.strictEqual(first.speedHintRemaining, 0);
  const nextLaunch = game(preference()); nextLaunch.start();
  assert.strictEqual(nextLaunch.speedHintRemaining, 0, 'stored preference survives a fresh game instance');
}

for (const speed of [0.5, 2]) {
  const state = game(createSpeedHintPreference(null, null)); state.start();
  state.timeScale = speed; state.director.index = state.director.total;
  state.enemies = [new Enemy({ x: 20, y: 20, speed: 0, symbols: ['right'] })];
  state.update(3.9); assert.ok(state.speedHintRemaining > 0);
  state.update(0.11); assert.strictEqual(state.speedHintRemaining, 0, 'hint duration uses real time at either speed');
  state.start(); assert.strictEqual(state.speedHintRemaining, 0);
}

const fail = () => { throw new Error('storage unavailable'); };
for (const wxApi of [null, {}, { getStorageSync: fail, setStorageSync: fail }]) {
  const pref = createSpeedHintPreference(wxApi, { getItem: fail, setItem: fail });
  const state = game(pref); state.start();
  assert.strictEqual(state.speedHintRemaining, 4);
  state.start(); assert.strictEqual(state.speedHintRemaining, 0);
  assert.ok(pref.seen, 'storage errors keep an in-memory preference');
}
console.log('speed-hint.test.js passed');

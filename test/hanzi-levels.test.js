'use strict';
const assert = require('assert');
const LevelDirector = require('../src/levels/LevelDirector');
const { GameState, GAME_MODES } = require('../src/core/GameState');
const { CHARACTERS, LEVEL_CHARACTERS, getStrokeCount } = require('../src/hanzi/Characters');
const { writingBudget, spawnInterval, sceneScale, movementSpeed } = require('../src/hanzi/Pacing');
const { getHanziLayout } = require('../src/ui/HanziLayout');
const { getItemSlots } = require('../src/ui/ItemBar');

assert.strictEqual(writingBudget(1), 5);
assert.strictEqual(writingBudget(9), 21);
assert.strictEqual(spawnInterval(2, 9), 21);
assert.ok(sceneScale(9) < sceneScale(1) && sceneScale(1) <= 0.5);
assert.ok(movementSpeed(60, 180, 9) < movementSpeed(60, 180, 1));
const seen = new Set();
let previousMax = 0;
for (let level = 1; level <= 6; level += 1) {
  const pool = LEVEL_CHARACTERS[level - 1];
  assert.ok(Math.min(...pool.map(getStrokeCount)) >= previousMax);
  previousMax = Math.max(...pool.map(getStrokeCount));
  const director = new LevelDirector(375, 667);
  director.startLevel(level, 'castle', GAME_MODES.HANZI, () => 0.3);
  assert.strictEqual(director.total, 22);
  const timeline = director.config.timeline;
  assert.deepStrictEqual(timeline.slice(0, pool.length).map((entry) => entry.character), pool);
  timeline.forEach((entry, i) => {
    seen.add(entry.character);
    assert.ok(pool.includes(entry.character));
    if (i > 0) assert.ok(entry.delay >= writingBudget(timeline[i - 1].strokeCount));
    const enemy = director.createEnemy(entry, i);
    const state = new GameState(375, 667, null);
    state.start('normal', GAME_MODES.HANZI);
    const travel = Math.hypot(enemy.x - state.hero.x, enemy.y - state.hero.y) - enemy.radius - state.hero.radius * 0.72;
    assert.ok(enemy.speed <= LevelDirector.LEVELS[level - 1].timeline[i].speed * 0.5);
    assert.ok(travel / enemy.speed >= 1.5 * writingBudget(entry.strokeCount) - 1e-8);
    assert.strictEqual(enemy.symbols.length, 0);
  });
}
assert.deepStrictEqual([...seen].sort(), CHARACTERS.slice().sort());

const director = new LevelDirector(375, 667);
director.startLevel(1, 'castle', GAME_MODES.HANZI);
const enemies = [];
director.update(2, enemies);
assert.strictEqual(enemies.length, 1);
director.update(7, enemies);
assert.strictEqual(enemies.length, 2);
director.update(200, enemies);
assert.strictEqual(enemies.length, 2);
assert.strictEqual(director.spawnClock, 0, 'a capped queue does not accumulate time');
enemies.shift();
director.update(200.1, enemies);
assert.strictEqual(enemies.length, 1, 'removing a monster does not release overdue spawns');
director.update(207.1, enemies);
assert.strictEqual(enemies.length, 2);
director.startLevel(1, 'castle');
assert.ok(director.config.timeline[0].symbols.length > 0, 'switching back restores the normal schedule');

for (const [width, height] of [[390, 844], [375, 667], [320, 568]]) {
  const { board, panel, heroY } = getHanziLayout(width, height);
  assert.ok(board.x > 0 && board.y > 200 && board.x + board.width < width);
  assert.ok(panel.y > heroY * height && panel.y + panel.height < height - 28);
  const slots = getItemSlots(width, height, { healthPotion: 1, comboChain: 1 }, GAME_MODES.HANZI);
  slots.forEach((slot) => {
    assert.ok(slot.x + slot.width <= board.x);
    assert.ok(slot.y >= board.y && slot.y + slot.height <= board.y + board.height);
  });
}
console.log('hanzi-levels.test.js passed');

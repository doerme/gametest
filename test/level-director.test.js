'use strict';

const assert = require('assert');
const LevelDirector = require('../src/levels/LevelDirector');
const { SYMBOLS } = require('../src/input/GestureRecognizer');

const director = new LevelDirector(375, 667);
let enemies = [];
director.update(60, enemies);
let boss = enemies[enemies.length - 1];

assert.strictEqual(director.level, 1);
assert.strictEqual(director.levelCount, 4);
assert.strictEqual(enemies.length, director.total);
assert.ok(enemies.every((enemy) => enemy.species === 'ghost'));
assert.ok(enemies.every((enemy) => enemy.symbolDisplay === 'queue'));
assert.strictEqual(boss.kind, 'boss');
assert.strictEqual(boss.symbols.length, 6);
assert.ok(enemies.every((enemy) => !enemy.symbols.includes(SYMBOLS.CIRCLE) && !enemy.symbols.includes(SYMBOLS.Z)));

director.startLevel(2);
enemies = [];
director.update(60, enemies);
boss = enemies[enemies.length - 1];

assert.strictEqual(director.level, 2);
assert.strictEqual(enemies.length, director.total);
assert.ok(enemies.some((enemy) => enemy.species === 'jellyfish'));
assert.ok(enemies.some((enemy) => enemy.species === 'pufferfish'));
assert.ok(enemies.some((enemy) => enemy.species === 'shark'));
assert.ok(enemies.every((enemy) => enemy.symbolDisplay === 'current-and-dots'));
assert.strictEqual(boss.species, 'megalodon');
assert.strictEqual(boss.kind, 'boss');
assert.strictEqual(boss.symbols.length, 8);
assert.ok(enemies.every((enemy) => !enemy.symbols.includes(SYMBOLS.CIRCLE) && !enemy.symbols.includes(SYMBOLS.Z)));

director.startLevel(3);
enemies = [];
director.update(60, enemies);
boss = enemies[enemies.length - 1];

assert.strictEqual(director.level, 3);
assert.strictEqual(enemies.length, director.total);
assert.ok(enemies.some((enemy) => enemy.species === 'penguinBellhop'));
assert.ok(enemies.some((enemy) => enemy.species === 'penguinChef'));
assert.ok(enemies.some((enemy) => enemy.symbols.includes(SYMBOLS.CIRCLE)));
assert.ok(enemies.every((enemy) => !enemy.symbols.includes(SYMBOLS.Z)));
assert.ok(enemies.filter((enemy) => enemy.symbols.includes(SYMBOLS.CIRCLE)).length >= 12);
assert.ok(enemies.every((enemy) => enemy.symbolDisplay === 'current-and-dots'));
assert.strictEqual(boss.species, 'emperorPenguin');
assert.strictEqual(boss.kind, 'boss');
assert.strictEqual(boss.score, 1000);
assert.strictEqual(boss.speed, 37);
assert.strictEqual(boss.symbols.length, 10);
assert.strictEqual(boss.symbols.filter((symbol) => symbol === SYMBOLS.CIRCLE).length, 4);
assert.strictEqual(LevelDirector.LEVELS[2].timeline[21].time, 51);

director.startLevel(4);
enemies = [];
director.update(60, enemies);
boss = enemies[enemies.length - 1];

assert.strictEqual(director.level, 4);
assert.strictEqual(enemies.length, director.total);
assert.ok(enemies.some((enemy) => enemy.species === 'pterosaur'));
assert.ok(enemies.some((enemy) => enemy.species === 'triceratops'));
assert.ok(enemies.some((enemy) => enemy.species === 'brachiosaurus'));
assert.ok(enemies.some((enemy) => enemy.symbols.includes(SYMBOLS.CIRCLE)));
assert.ok(enemies.some((enemy) => enemy.symbols.includes(SYMBOLS.Z)));
assert.ok(enemies.every((enemy) => enemy.symbolDisplay === 'current-and-dots'));
assert.strictEqual(boss.species, 'tyrannosaurus');
assert.strictEqual(boss.kind, 'boss');
assert.strictEqual(boss.score, 1300);
assert.strictEqual(boss.speed, 41);
assert.strictEqual(boss.radius, 54);
assert.deepStrictEqual(boss.symbols, [
  SYMBOLS.Z, SYMBOLS.CIRCLE, SYMBOLS.RIGHT, SYMBOLS.LEFT,
  SYMBOLS.V, SYMBOLS.L, SYMBOLS.Z, SYMBOLS.DOWN,
  SYMBOLS.CIRCLE, SYMBOLS.UP, SYMBOLS.Z, SYMBOLS.CIRCLE
]);
assert.deepStrictEqual(LevelDirector.LEVELS[3].timeline[0].symbols, [SYMBOLS.CIRCLE, SYMBOLS.RIGHT]);
assert.deepStrictEqual(LevelDirector.LEVELS[3].timeline[3].symbols, [SYMBOLS.LEFT, SYMBOLS.Z]);
assert.strictEqual(LevelDirector.LEVELS[3].timeline[21].time, 51);

console.log('level-director.test.js passed');

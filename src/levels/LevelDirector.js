'use strict';

const { SYMBOLS } = require('../input/GestureRecognizer');
const Enemy = require('../entities/Enemy');

const LANES = [
  { x: 0.12, y: 0.2 },
  { x: 0.88, y: 0.2 },
  { x: 0.2, y: 0.08 },
  { x: 0.8, y: 0.08 },
  { x: 0.5, y: -0.03 }
];

const TIMELINE = [
  { time: 1.0, lane: 0, symbols: [SYMBOLS.RIGHT], speed: 42 },
  { time: 3.0, lane: 1, symbols: [SYMBOLS.LEFT], speed: 42 },
  { time: 5.2, lane: 2, symbols: [SYMBOLS.DOWN], speed: 46 },
  { time: 7.2, lane: 3, symbols: [SYMBOLS.UP], speed: 46 },
  { time: 10.0, lane: 0, symbols: [SYMBOLS.V], speed: 48 },
  { time: 12.5, lane: 1, symbols: [SYMBOLS.CARET], speed: 48 },
  { time: 15.0, lane: 4, symbols: [SYMBOLS.LEFT, SYMBOLS.RIGHT], speed: 34, radius: 28, score: 160 },
  { time: 18.0, lane: 0, symbols: [SYMBOLS.UP], speed: 62, radius: 21, score: 120 },
  { time: 20.2, lane: 1, symbols: [SYMBOLS.DOWN], speed: 62, radius: 21, score: 120 },
  { time: 23.0, lane: 2, symbols: [SYMBOLS.V, SYMBOLS.UP], speed: 38, radius: 29, score: 180 },
  { time: 26.0, lane: 3, symbols: [SYMBOLS.CARET, SYMBOLS.DOWN], speed: 38, radius: 29, score: 180 },
  { time: 29.5, lane: 0, symbols: [SYMBOLS.RIGHT, SYMBOLS.RIGHT], speed: 46, score: 170 },
  { time: 32.0, lane: 1, symbols: [SYMBOLS.LEFT, SYMBOLS.LEFT], speed: 46, score: 170 },
  { time: 35.0, lane: 4, symbols: [SYMBOLS.DOWN, SYMBOLS.V, SYMBOLS.UP], speed: 30, radius: 32, score: 240 },
  { time: 39.5, lane: 0, symbols: [SYMBOLS.UP], speed: 72, radius: 20, score: 130 },
  { time: 41.0, lane: 1, symbols: [SYMBOLS.DOWN], speed: 72, radius: 20, score: 130 },
  { time: 43.0, lane: 2, symbols: [SYMBOLS.LEFT, SYMBOLS.V], speed: 46, radius: 27, score: 190 },
  { time: 46.0, lane: 3, symbols: [SYMBOLS.RIGHT, SYMBOLS.CARET], speed: 46, radius: 27, score: 190 },
  { time: 50.5, lane: 4, symbols: [SYMBOLS.UP, SYMBOLS.DOWN, SYMBOLS.V], speed: 28, radius: 35, score: 260 },
  { time: 56.0, lane: 0, symbols: [SYMBOLS.RIGHT], speed: 78, radius: 20, score: 140 },
  { time: 57.2, lane: 1, symbols: [SYMBOLS.LEFT], speed: 78, radius: 20, score: 140 },
  { time: 60.0, lane: 4, symbols: [SYMBOLS.LEFT, SYMBOLS.RIGHT, SYMBOLS.CARET], speed: 26, radius: 42, score: 500, kind: 'boss' }
];

class LevelDirector {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.index = 0;
    this.total = TIMELINE.length;
  }

  reset(width, height) {
    this.width = width || this.width;
    this.height = height || this.height;
    this.index = 0;
  }

  update(elapsed, enemies) {
    while (this.index < TIMELINE.length && elapsed >= TIMELINE[this.index].time) {
      enemies.push(this.createEnemy(TIMELINE[this.index]));
      this.index += 1;
    }
  }

  createEnemy(spawn) {
    const lane = LANES[spawn.lane % LANES.length];
    return new Enemy({
      x: lane.x * this.width,
      y: lane.y * this.height,
      speed: spawn.speed,
      symbols: spawn.symbols,
      radius: spawn.radius,
      score: spawn.score,
      kind: spawn.kind
    });
  }

  isComplete(enemies) {
    return this.index >= TIMELINE.length && enemies.length === 0;
  }
}

module.exports = LevelDirector;

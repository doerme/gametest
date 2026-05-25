'use strict';

const { SYMBOLS } = require('../input/GestureRecognizer');
const Enemy = require('../entities/Enemy');
const { THEME_ORDER, getTheme } = require('./Themes');

const LANES = [
  { x: 0.12, y: 0.2 },
  { x: 0.88, y: 0.2 },
  { x: 0.2, y: 0.08 },
  { x: 0.8, y: 0.08 },
  { x: 0.5, y: -0.03 }
];

const CASTLE_TIMELINE = [
  { time: 1.0, lane: 0, symbols: [SYMBOLS.RIGHT], speed: 42 },
  { time: 3.0, lane: 1, symbols: [SYMBOLS.LEFT], speed: 42 },
  { time: 5.2, lane: 2, symbols: [SYMBOLS.DOWN], speed: 46 },
  { time: 7.2, lane: 3, symbols: [SYMBOLS.UP], speed: 46 },
  { time: 10.0, lane: 0, symbols: [SYMBOLS.V], speed: 48 },
  { time: 12.5, lane: 1, symbols: [SYMBOLS.L], speed: 48 },
  { time: 15.0, lane: 4, symbols: [SYMBOLS.LEFT, SYMBOLS.RIGHT], speed: 34, radius: 28, score: 160 },
  { time: 18.0, lane: 0, symbols: [SYMBOLS.UP], speed: 62, radius: 21, score: 120 },
  { time: 20.2, lane: 1, symbols: [SYMBOLS.DOWN], speed: 62, radius: 21, score: 120 },
  { time: 23.0, lane: 2, symbols: [SYMBOLS.V, SYMBOLS.UP], speed: 38, radius: 29, score: 180 },
  { time: 26.0, lane: 3, symbols: [SYMBOLS.L, SYMBOLS.DOWN], speed: 38, radius: 29, score: 180 },
  { time: 29.5, lane: 0, symbols: [SYMBOLS.RIGHT, SYMBOLS.RIGHT], speed: 46, score: 170 },
  { time: 32.0, lane: 1, symbols: [SYMBOLS.LEFT, SYMBOLS.LEFT], speed: 46, score: 170 },
  { time: 35.0, lane: 4, symbols: [SYMBOLS.DOWN, SYMBOLS.V, SYMBOLS.UP], speed: 30, radius: 32, score: 240 },
  { time: 39.5, lane: 0, symbols: [SYMBOLS.UP], speed: 72, radius: 20, score: 130 },
  { time: 41.0, lane: 1, symbols: [SYMBOLS.DOWN], speed: 72, radius: 20, score: 130 },
  { time: 43.0, lane: 2, symbols: [SYMBOLS.LEFT, SYMBOLS.V], speed: 46, radius: 27, score: 190 },
  { time: 46.0, lane: 3, symbols: [SYMBOLS.RIGHT, SYMBOLS.L], speed: 46, radius: 27, score: 190 },
  { time: 50.5, lane: 4, symbols: [SYMBOLS.UP, SYMBOLS.DOWN, SYMBOLS.V], speed: 28, radius: 35, score: 260 },
  { time: 56.0, lane: 0, symbols: [SYMBOLS.RIGHT], speed: 78, radius: 20, score: 140 },
  { time: 57.2, lane: 1, symbols: [SYMBOLS.LEFT], speed: 78, radius: 20, score: 140 },
  { time: 60.0, lane: 4, symbols: [SYMBOLS.LEFT, SYMBOLS.RIGHT, SYMBOLS.L, SYMBOLS.LEFT, SYMBOLS.RIGHT, SYMBOLS.L], speed: 26, radius: 42, score: 500, kind: 'boss' }
];

const OCEAN_TIMELINE = [
  { time: 1.0, lane: 0, symbols: [SYMBOLS.UP], speed: 48 },
  { time: 2.8, lane: 1, symbols: [SYMBOLS.RIGHT], speed: 48 },
  { time: 5.0, lane: 2, symbols: [SYMBOLS.V], speed: 52 },
  { time: 7.0, lane: 3, symbols: [SYMBOLS.LEFT, SYMBOLS.DOWN], speed: 48, radius: 27, score: 170 },
  { time: 10.0, lane: 0, symbols: [SYMBOLS.L, SYMBOLS.RIGHT], speed: 48, radius: 28, score: 180 },
  { time: 12.2, lane: 1, symbols: [SYMBOLS.DOWN], speed: 58, radius: 22, score: 130 },
  { time: 14.6, lane: 4, symbols: [SYMBOLS.RIGHT, SYMBOLS.V], speed: 45, radius: 29, score: 190 },
  { time: 17.4, lane: 2, symbols: [SYMBOLS.LEFT, SYMBOLS.UP], speed: 47, radius: 29, score: 190 },
  { time: 20.0, lane: 3, symbols: [SYMBOLS.UP], speed: 68, radius: 21, score: 140 },
  { time: 22.0, lane: 0, symbols: [SYMBOLS.V, SYMBOLS.DOWN, SYMBOLS.RIGHT], speed: 40, radius: 32, score: 260 },
  { time: 25.2, lane: 1, symbols: [SYMBOLS.RIGHT, SYMBOLS.RIGHT], speed: 58, radius: 30, score: 210 },
  { time: 27.5, lane: 2, symbols: [SYMBOLS.LEFT, SYMBOLS.LEFT], speed: 58, radius: 30, score: 210 },
  { time: 30.2, lane: 3, symbols: [SYMBOLS.L, SYMBOLS.V], speed: 54, radius: 29, score: 210 },
  { time: 33.0, lane: 4, symbols: [SYMBOLS.DOWN, SYMBOLS.UP, SYMBOLS.RIGHT], speed: 43, radius: 34, score: 290 },
  { time: 37.0, lane: 0, symbols: [SYMBOLS.RIGHT], speed: 84, radius: 20, score: 150 },
  { time: 38.4, lane: 1, symbols: [SYMBOLS.LEFT], speed: 84, radius: 20, score: 150 },
  { time: 41.0, lane: 2, symbols: [SYMBOLS.V, SYMBOLS.UP], speed: 62, radius: 30, score: 230 },
  { time: 43.2, lane: 3, symbols: [SYMBOLS.L, SYMBOLS.DOWN], speed: 62, radius: 30, score: 230 },
  { time: 46.8, lane: 4, symbols: [SYMBOLS.UP, SYMBOLS.DOWN, SYMBOLS.V], speed: 44, radius: 34, score: 300 },
  { time: 51.0, lane: 0, symbols: [SYMBOLS.LEFT, SYMBOLS.V, SYMBOLS.RIGHT], speed: 55, radius: 33, score: 320 },
  { time: 54.5, lane: 1, symbols: [SYMBOLS.RIGHT, SYMBOLS.L], speed: 67, radius: 28, score: 230 },
  { time: 60.0, lane: 4, symbols: [SYMBOLS.LEFT, SYMBOLS.RIGHT, SYMBOLS.V, SYMBOLS.L, SYMBOLS.LEFT, SYMBOLS.RIGHT, SYMBOLS.V, SYMBOLS.L], speed: 32, radius: 48, score: 700, kind: 'boss' }
];

const PENGUIN_HOTEL_TIMELINE = [
  { time: 0.9, lane: 0, symbols: [SYMBOLS.CIRCLE, SYMBOLS.RIGHT], speed: 55, score: 180 },
  { time: 2.4, lane: 1, symbols: [SYMBOLS.CIRCLE, SYMBOLS.UP], speed: 55, score: 180 },
  { time: 4.3, lane: 2, symbols: [SYMBOLS.CIRCLE, SYMBOLS.V], speed: 60, score: 190 },
  { time: 6.0, lane: 3, symbols: [SYMBOLS.LEFT, SYMBOLS.CIRCLE], speed: 55, radius: 27, score: 210 },
  { time: 8.5, lane: 0, symbols: [SYMBOLS.L, SYMBOLS.CIRCLE], speed: 55, radius: 28, score: 220 },
  { time: 10.4, lane: 1, symbols: [SYMBOLS.DOWN, SYMBOLS.CIRCLE], speed: 67, radius: 23, score: 200 },
  { time: 12.4, lane: 4, symbols: [SYMBOLS.RIGHT, SYMBOLS.CIRCLE, SYMBOLS.V], speed: 52, radius: 30, score: 280 },
  { time: 14.8, lane: 2, symbols: [SYMBOLS.LEFT, SYMBOLS.CIRCLE, SYMBOLS.UP], speed: 54, radius: 30, score: 280 },
  { time: 17.0, lane: 3, symbols: [SYMBOLS.UP, SYMBOLS.CIRCLE], speed: 78, radius: 22, score: 220 },
  { time: 18.7, lane: 0, symbols: [SYMBOLS.V, SYMBOLS.DOWN, SYMBOLS.CIRCLE], speed: 46, radius: 33, score: 310 },
  { time: 21.4, lane: 1, symbols: [SYMBOLS.CIRCLE, SYMBOLS.RIGHT, SYMBOLS.CIRCLE], speed: 67, radius: 31, score: 290 },
  { time: 23.4, lane: 2, symbols: [SYMBOLS.CIRCLE, SYMBOLS.LEFT, SYMBOLS.CIRCLE], speed: 67, radius: 31, score: 290 },
  { time: 25.7, lane: 3, symbols: [SYMBOLS.L, SYMBOLS.V, SYMBOLS.CIRCLE], speed: 62, radius: 30, score: 300 },
  { time: 28.1, lane: 4, symbols: [SYMBOLS.DOWN, SYMBOLS.CIRCLE, SYMBOLS.UP, SYMBOLS.RIGHT], speed: 49, radius: 35, score: 380 },
  { time: 31.5, lane: 0, symbols: [SYMBOLS.RIGHT, SYMBOLS.CIRCLE], speed: 97, radius: 21, score: 240 },
  { time: 32.6, lane: 1, symbols: [SYMBOLS.LEFT, SYMBOLS.CIRCLE], speed: 97, radius: 21, score: 240 },
  { time: 34.9, lane: 2, symbols: [SYMBOLS.V, SYMBOLS.CIRCLE, SYMBOLS.UP], speed: 71, radius: 31, score: 330 },
  { time: 36.7, lane: 3, symbols: [SYMBOLS.CIRCLE, SYMBOLS.L, SYMBOLS.DOWN], speed: 71, radius: 31, score: 330 },
  { time: 39.8, lane: 4, symbols: [SYMBOLS.UP, SYMBOLS.CIRCLE, SYMBOLS.DOWN, SYMBOLS.V], speed: 51, radius: 35, score: 400 },
  { time: 43.4, lane: 0, symbols: [SYMBOLS.LEFT, SYMBOLS.CIRCLE, SYMBOLS.V, SYMBOLS.RIGHT], speed: 63, radius: 34, score: 430 },
  { time: 46.3, lane: 1, symbols: [SYMBOLS.RIGHT, SYMBOLS.CIRCLE, SYMBOLS.L], speed: 77, radius: 29, score: 340 },
  { time: 51.0, lane: 4, symbols: [SYMBOLS.CIRCLE, SYMBOLS.CIRCLE, SYMBOLS.LEFT, SYMBOLS.RIGHT, SYMBOLS.V, SYMBOLS.L, SYMBOLS.CIRCLE, SYMBOLS.DOWN, SYMBOLS.CIRCLE, SYMBOLS.UP], speed: 37, radius: 50, score: 1000, kind: 'boss' }
];

const DINOSAUR_PARK_TIMELINE = [
  { time: 0.9, lane: 0, symbols: [SYMBOLS.CIRCLE, SYMBOLS.RIGHT], speed: 59, score: 220 },
  { time: 2.4, lane: 1, symbols: [SYMBOLS.CIRCLE, SYMBOLS.UP], speed: 59, score: 220 },
  { time: 4.3, lane: 2, symbols: [SYMBOLS.CIRCLE, SYMBOLS.V], speed: 64, score: 230 },
  { time: 6.0, lane: 3, symbols: [SYMBOLS.LEFT, SYMBOLS.Z], speed: 59, radius: 27, score: 250 },
  { time: 8.5, lane: 0, symbols: [SYMBOLS.L, SYMBOLS.CIRCLE], speed: 59, radius: 28, score: 260 },
  { time: 10.4, lane: 1, symbols: [SYMBOLS.DOWN, SYMBOLS.Z], speed: 71, radius: 23, score: 240 },
  { time: 12.4, lane: 4, symbols: [SYMBOLS.RIGHT, SYMBOLS.CIRCLE, SYMBOLS.V], speed: 56, radius: 30, score: 320 },
  { time: 14.8, lane: 2, symbols: [SYMBOLS.LEFT, SYMBOLS.Z, SYMBOLS.UP], speed: 58, radius: 30, score: 320 },
  { time: 17.0, lane: 3, symbols: [SYMBOLS.UP, SYMBOLS.CIRCLE], speed: 82, radius: 22, score: 260 },
  { time: 18.7, lane: 0, symbols: [SYMBOLS.V, SYMBOLS.DOWN, SYMBOLS.Z], speed: 50, radius: 33, score: 350 },
  { time: 21.4, lane: 1, symbols: [SYMBOLS.CIRCLE, SYMBOLS.RIGHT, SYMBOLS.CIRCLE], speed: 71, radius: 31, score: 330 },
  { time: 23.4, lane: 2, symbols: [SYMBOLS.Z, SYMBOLS.LEFT, SYMBOLS.CIRCLE], speed: 71, radius: 31, score: 330 },
  { time: 25.7, lane: 3, symbols: [SYMBOLS.L, SYMBOLS.V, SYMBOLS.CIRCLE], speed: 66, radius: 30, score: 340 },
  { time: 28.1, lane: 4, symbols: [SYMBOLS.DOWN, SYMBOLS.Z, SYMBOLS.UP, SYMBOLS.RIGHT], speed: 53, radius: 35, score: 420 },
  { time: 31.5, lane: 0, symbols: [SYMBOLS.RIGHT, SYMBOLS.CIRCLE], speed: 101, radius: 21, score: 280 },
  { time: 32.6, lane: 1, symbols: [SYMBOLS.LEFT, SYMBOLS.Z], speed: 101, radius: 21, score: 280 },
  { time: 34.9, lane: 2, symbols: [SYMBOLS.V, SYMBOLS.CIRCLE, SYMBOLS.UP], speed: 75, radius: 31, score: 370 },
  { time: 36.7, lane: 3, symbols: [SYMBOLS.Z, SYMBOLS.L, SYMBOLS.DOWN], speed: 75, radius: 31, score: 370 },
  { time: 39.8, lane: 4, symbols: [SYMBOLS.UP, SYMBOLS.CIRCLE, SYMBOLS.DOWN, SYMBOLS.V], speed: 55, radius: 35, score: 440 },
  { time: 43.4, lane: 0, symbols: [SYMBOLS.LEFT, SYMBOLS.Z, SYMBOLS.V, SYMBOLS.RIGHT], speed: 67, radius: 34, score: 470 },
  { time: 46.3, lane: 1, symbols: [SYMBOLS.RIGHT, SYMBOLS.CIRCLE, SYMBOLS.L], speed: 81, radius: 29, score: 380 },
  { time: 51.0, lane: 4, symbols: [SYMBOLS.Z, SYMBOLS.CIRCLE, SYMBOLS.RIGHT, SYMBOLS.LEFT, SYMBOLS.V, SYMBOLS.L, SYMBOLS.Z, SYMBOLS.DOWN, SYMBOLS.CIRCLE, SYMBOLS.UP, SYMBOLS.Z, SYMBOLS.CIRCLE], speed: 41, radius: 54, score: 1300, kind: 'boss' }
];

const LEVELS = [
  {
    symbolDisplay: 'queue',
    timeline: CASTLE_TIMELINE
  },
  {
    symbolDisplay: 'current-and-dots',
    timeline: OCEAN_TIMELINE
  },
  {
    symbolDisplay: 'current-and-dots',
    timeline: PENGUIN_HOTEL_TIMELINE
  },
  {
    symbolDisplay: 'current-and-dots',
    timeline: DINOSAUR_PARK_TIMELINE
  }
];

class LevelDirector {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.levelCount = LEVELS.length;
    this.startLevel(1);
  }

  reset(width, height, level, themeId) {
    this.width = width || this.width;
    this.height = height || this.height;
    this.startLevel(level || 1, themeId);
  }

  startLevel(level, themeId) {
    const selectedLevel = Math.max(1, Math.min(this.levelCount, level || 1));
    this.level = selectedLevel;
    this.config = LEVELS[selectedLevel - 1];
    this.theme = getTheme(themeId || THEME_ORDER[selectedLevel - 1]);
    this.themeId = this.theme.id;
    this.index = 0;
    this.total = this.config.timeline.length;
  }

  update(elapsed, enemies) {
    const timeline = this.config.timeline;
    while (this.index < timeline.length && elapsed >= timeline[this.index].time) {
      enemies.push(this.createEnemy(timeline[this.index], this.index));
      this.index += 1;
    }
  }

  createEnemy(spawn, spawnIndex) {
    const lane = LANES[spawn.lane % LANES.length];
    return new Enemy({
      x: lane.x * this.width,
      y: lane.y * this.height,
      speed: spawn.speed,
      symbols: spawn.symbols,
      radius: spawn.radius,
      score: spawn.score,
      kind: spawn.kind,
      species: this.theme.species[spawnIndex] || this.theme.species[0],
      symbolDisplay: this.config.symbolDisplay
    });
  }

  isComplete(enemies) {
    return this.index >= this.config.timeline.length && enemies.length === 0;
  }
}

LevelDirector.LEVELS = LEVELS;

module.exports = LevelDirector;

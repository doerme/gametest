'use strict';

const LevelDirector = require('../levels/LevelDirector');
const { recognize, SYMBOLS } = require('../input/GestureRecognizer');

const SCREENS = {
  TITLE: 'title',
  PLAYING: 'playing',
  WIN: 'win',
  LOSE: 'lose'
};

class GameState {
  constructor(width, height, sound) {
    this.width = width;
    this.height = height;
    this.sound = sound;
    this.hero = this.createHero(width, height);
    this.director = new LevelDirector(width, height);
    this.screen = SCREENS.TITLE;
    this.resetRun();
  }

  createHero(width, height) {
    return {
      x: width * 0.5,
      y: height * 0.74,
      radius: Math.max(28, Math.min(width, height) * 0.07)
    };
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.hero = this.createHero(width, height);
    this.director.width = width;
    this.director.height = height;
  }

  resetRun() {
    this.score = 0;
    this.lives = 5;
    this.elapsed = 0;
    this.combo = 0;
    this.enemies = [];
    this.feedback = null;
    this.director.reset(this.width, this.height);
  }

  start() {
    this.resetRun();
    this.screen = SCREENS.PLAYING;
    if (this.sound) {
      this.sound.play('start');
    }
  }

  update(dt) {
    if (this.screen !== SCREENS.PLAYING) {
      return;
    }

    this.elapsed += dt;
    this.director.update(this.elapsed, this.enemies);

    for (let i = 0; i < this.enemies.length; i += 1) {
      const enemy = this.enemies[i];
      enemy.update(dt, this.hero);
      if (enemy.reachedHero) {
        this.lives -= 1;
        this.combo = 0;
        this.feedback = { text: '-1', age: 0, type: 'hurt' };
        if (this.sound) {
          this.sound.play('hurt');
        }
      }
    }

    this.enemies = this.enemies.filter((enemy) => !enemy.dead);

    if (this.lives <= 0) {
      this.screen = SCREENS.LOSE;
      if (this.sound) {
        this.sound.play('lose');
      }
      return;
    }

    if (this.director.isComplete(this.enemies)) {
      this.screen = SCREENS.WIN;
      if (this.sound) {
        this.sound.play('win');
      }
    }

    if (this.feedback) {
      this.feedback.age += dt;
      if (this.feedback.age > 0.7) {
        this.feedback = null;
      }
    }
  }

  handleTap() {
    if (this.screen === SCREENS.TITLE || this.screen === SCREENS.WIN || this.screen === SCREENS.LOSE) {
      this.start();
    }
  }

  handleGesture(points) {
    if (this.screen !== SCREENS.PLAYING) {
      this.handleTap();
      return SYMBOLS.UNKNOWN;
    }

    const symbol = recognize(points);
    const targets = this.findMatchingEnemies(symbol);
    if (targets.length === 0) {
      this.combo = 0;
      this.feedback = { text: 'Miss', age: 0, type: 'miss' };
      if (this.sound) {
        this.sound.play('miss');
      }
      return symbol;
    }

    let vanished = 0;
    let partialHits = 0;
    let earned = 0;
    for (let i = 0; i < targets.length; i += 1) {
      const target = targets[i];
      target.applySymbol(symbol);
      if (target.symbols.length === 0) {
        vanished += 1;
        earned += target.score;
      } else {
        partialHits += 1;
        earned += 30;
      }
    }

    this.combo += 1;
    earned += this.combo * 10;
    this.score += earned;
    this.feedback = {
      text: vanished > 0 ? '消除 +' + earned : '命中 +' + earned,
      age: 0,
      type: 'hit'
    };
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
    if (this.sound) {
      this.sound.play(vanished > 0 && partialHits === 0 ? 'vanish' : 'hit');
    }

    return symbol;
  }

  findMatchingEnemies(symbol) {
    if (symbol === SYMBOLS.UNKNOWN) {
      return [];
    }

    const matches = [];
    for (let i = 0; i < this.enemies.length; i += 1) {
      const enemy = this.enemies[i];
      if (!enemy.dead && enemy.matches(symbol)) {
        matches.push(enemy);
      }
    }
    return matches;
  }
}

module.exports = {
  GameState,
  SCREENS
};

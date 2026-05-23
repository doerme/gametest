'use strict';

const { distance, normalizeVector } = require('../utils/math');

class Enemy {
  constructor(config) {
    this.x = config.x;
    this.y = config.y;
    this.radius = config.radius || 24;
    this.speed = config.speed || 42;
    this.symbols = config.symbols.slice();
    this.score = config.score || 100;
    this.kind = config.kind || 'normal';
    this.species = config.species || 'ghost';
    this.symbolDisplay = config.symbolDisplay || 'queue';
    this.maxSymbols = this.symbols.length;
    this.hitFlash = 0;
    this.dead = false;
    this.reachedHero = false;
    this.phase = Math.random() * Math.PI * 2;
  }

  update(dt, hero) {
    if (this.dead) {
      return;
    }

    const dir = normalizeVector(hero.x - this.x, hero.y - this.y);
    this.x += dir.x * this.speed * dt;
    this.y += dir.y * this.speed * dt;
    this.phase += dt * 4;
    this.hitFlash = Math.max(0, this.hitFlash - dt);

    if (distance(this, hero) < this.radius + hero.radius * 0.72) {
      this.reachedHero = true;
      this.dead = true;
    }
  }

  matches(symbol) {
    return this.symbols[0] === symbol;
  }

  applySymbol(symbol) {
    if (!this.matches(symbol)) {
      return false;
    }

    this.symbols.shift();
    this.hitFlash = 0.18;
    if (this.symbols.length === 0) {
      this.dead = true;
    }
    return true;
  }
}

module.exports = Enemy;

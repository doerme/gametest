'use strict';

const { distance, normalizeVector } = require('../utils/math');

class Enemy {
  constructor(config) {
    this.x = config.x;
    this.y = config.y;
    this.radius = config.radius || 24;
    this.speed = config.speed === undefined ? 42 : config.speed;
    this.symbols = (config.symbols || []).slice();
    this.hanzi = config.hanzi ? { character: config.hanzi.character, strokeIndex: 0, strokeCount: config.hanzi.strokeCount } : null;
    this.score = config.score === undefined ? 100 : config.score;
    this.kind = config.kind || 'normal';
    this.species = config.species || 'ghost';
    this.symbolDisplay = config.symbolDisplay || 'queue';
    this.maxSymbols = this.symbols.length;
    this.hitFlash = 0;
    this.dead = false;
    this.reachedHero = false;
    this.phase = Math.random() * Math.PI * 2;
  }

  update(dt, hero, movementScale) {
    if (this.dead) {
      return;
    }

    this.phase += dt * 4;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    const travelDt = dt * (movementScale === undefined ? 1 : movementScale);
    const dir = normalizeVector(hero.x - this.x, hero.y - this.y);
    this.x += dir.x * this.speed * travelDt;
    this.y += dir.y * this.speed * travelDt;

    if (distance(this, hero) < this.radius + hero.radius * 0.72) {
      this.reachedHero = true;
      this.dead = true;
    }
  }

  matches(symbol) {
    return !this.hanzi && !this.dead && this.symbols[0] === symbol;
  }

  applyStroke(strokeIndex) {
    if (!this.hanzi || this.dead || strokeIndex !== this.hanzi.strokeIndex) return false;
    this.hanzi.strokeIndex += 1;
    this.hitFlash = 0.18;
    if (this.hanzi.strokeIndex === this.hanzi.strokeCount) this.dead = true;
    return true;
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

  takeComboHit() {
    if (this.hanzi || this.dead || this.symbols.length === 0) {
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

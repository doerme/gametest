'use strict';

const LevelDirector = require('../levels/LevelDirector');
const { THEME_IDS, createThemeOrder } = require('../levels/Themes');
const Enemy = require('../entities/Enemy');
const { recognize, SYMBOLS } = require('../input/GestureRecognizer');
const { DIFFICULTY_MODES, getDifficulty, findDifficultyAtPoint } = require('../ui/DifficultySelector');
const { isAudioToggleHit } = require('../ui/AudioToggle');
const { ITEM_TYPES, getItemSlots, findItemAtPoint } = require('../ui/ItemBar');

const SCREENS = {
  TITLE: 'title',
  PLAYING: 'playing',
  LEVEL_TRANSITION: 'level-transition',
  WIN: 'win',
  LOSE: 'lose'
};

const ANIMATION_DURATIONS = {
  cast: 0.38,
  impact: 0.52,
  vanish: 0.62,
  lightning: 0.3,
  comboChain: 0.5,
  heartLoss: 0.62,
  potionToHeart: 0.5,
  itemEarn: 0.72
};

const HERO_ANIMATION_DURATIONS = {
  cast: 0.8,
  hurt: 0.9
};

const MAX_LIVES = 5;

function getComboMultiplier(combo) {
  if (combo >= 100) {
    return 4;
  }
  if (combo >= 50) {
    return 3;
  }
  if (combo >= 20) {
    return 2.5;
  }
  if (combo >= 10) {
    return 2;
  }
  if (combo >= 5) {
    return 1.5;
  }
  if (combo >= 3) {
    return 1.2;
  }
  return 1;
}

class GameState {
  constructor(width, height, sound, random) {
    this.width = width;
    this.height = height;
    this.sound = sound;
    this.random = random || Math.random;
    this.themeOrder = createThemeOrder(this.random);
    this.hero = this.createHero(width, height);
    this.director = new LevelDirector(width, height);
    this.difficulty = null;
    this.timeScale = 1;
    this.soundEnabled = true;
    if (this.sound && this.sound.setSoundEnabled) {
      this.sound.setSoundEnabled(true);
    }
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
    this.maxLives = MAX_LIVES;
    this.lives = this.maxLives;
    this.level = 1;
    this.totalLevels = this.director.levelCount;
    this.elapsed = 0;
    this.transitionRemaining = 0;
    this.combo = 0;
    this.items = {
      comboChain: 0,
      healthPotion: 0
    };
    this.enemies = [];
    this.feedback = null;
    this.effects = [];
    this.heroAnimation = {
      cast: 0,
      castAge: 0,
      hurt: 0,
      hurtAge: 0
    };
    this.director.reset(this.width, this.height, this.level, this.getThemeId(this.level));
  }

  getThemeId(level) {
    return this.themeOrder[(level || 1) - 1] || THEME_IDS.CASTLE;
  }

  createNewThemeOrder() {
    this.themeOrder = createThemeOrder(this.random);
  }

  start(difficultyMode) {
    this.selectDifficulty(difficultyMode);
    this.resetRun();
    this.screen = SCREENS.PLAYING;
    if (this.sound) {
      this.sound.play('start');
      if (this.sound.playMusic) {
        this.sound.playMusic(this.getThemeId(this.level));
      }
    }
  }

  update(dt) {
    this.updateAnimations(dt);

    if (this.screen === SCREENS.LEVEL_TRANSITION) {
      return;
    }

    if (this.screen !== SCREENS.PLAYING) {
      return;
    }

    const playDt = dt * this.timeScale;
    this.elapsed += playDt;
    this.director.update(this.elapsed, this.enemies);

    const livesBeforeDamage = this.lives;
    let damageTaken = 0;
    for (let i = 0; i < this.enemies.length; i += 1) {
      const enemy = this.enemies[i];
      enemy.update(dt, this.hero, this.timeScale);
      if (enemy.reachedHero) {
        this.lives -= 1;
        this.combo = 0;
        damageTaken += 1;
      }
    }

    if (damageTaken > 0) {
      this.feedback = { text: '爱心 -' + damageTaken, age: 0, type: 'hurt' };
      this.triggerHeroImpact();
      this.triggerHeartLoss(livesBeforeDamage, damageTaken);
      if (this.sound) {
        this.sound.play('hurt');
        if (this.sound.vibrateDamage) {
          this.sound.vibrateDamage();
        }
      }
    }

    this.enemies = this.enemies.filter((enemy) => !enemy.dead);

    if (this.lives <= 0) {
      this.screen = SCREENS.LOSE;
      if (this.sound) {
        if (this.sound.stopMusic) {
          this.sound.stopMusic();
        }
        this.sound.play('lose');
      }
      return;
    }

    if (this.director.isComplete(this.enemies)) {
      if (this.level < this.totalLevels) {
        this.beginLevelTransition();
      } else {
        this.screen = SCREENS.WIN;
        if (this.sound) {
          if (this.sound.stopMusic) {
            this.sound.stopMusic();
          }
          this.sound.play('win');
        }
      }
    }
  }

  beginLevelTransition() {
    this.screen = SCREENS.LEVEL_TRANSITION;
    this.transitionRemaining = 0;
    this.combo = 0;
    this.feedback = null;
    this.enemies = [];
    if (this.sound && this.sound.playMusic) {
      this.sound.playMusic(this.getThemeId(this.level + 1));
    }
  }

  selectDifficulty(difficultyMode) {
    const difficulty = getDifficulty(difficultyMode || DIFFICULTY_MODES.NORMAL);
    this.difficulty = difficulty.id;
    this.timeScale = difficulty.timeScale;
  }

  startNextLevel(difficultyMode) {
    this.selectDifficulty(difficultyMode);
    this.level += 1;
    this.elapsed = 0;
    this.combo = 0;
    this.feedback = null;
    this.enemies = [];
    this.effects = [];
    this.director.startLevel(this.level, this.getThemeId(this.level));
    this.screen = SCREENS.PLAYING;
    if (this.sound) {
      this.sound.play('start');
    }
  }

  updateAnimations(dt) {
    if (this.heroAnimation.cast > 0) {
      this.heroAnimation.castAge += dt;
    }
    if (this.heroAnimation.hurt > 0) {
      this.heroAnimation.hurtAge += dt;
    }
    this.heroAnimation.cast = Math.max(0, this.heroAnimation.cast - dt);
    this.heroAnimation.hurt = Math.max(0, this.heroAnimation.hurt - dt);
    for (let i = 0; i < this.effects.length; i += 1) {
      this.effects[i].age += dt;
    }
    this.effects = this.effects.filter((effect) => effect.age < effect.duration);

    if (this.feedback) {
      this.feedback.age += dt;
      if (this.feedback.age > 0.7) {
        this.feedback = null;
      }
    }
  }

  addEffect(type, properties) {
    this.effects.push(Object.assign({
      type,
      age: 0,
      duration: ANIMATION_DURATIONS[type]
    }, properties));
  }

  triggerCast(symbol) {
    this.heroAnimation.cast = HERO_ANIMATION_DURATIONS.cast;
    this.heroAnimation.castAge = 0;
    this.addEffect('cast', {
      x: this.hero.x + this.hero.radius * 0.8,
      y: this.hero.y - this.hero.radius * 0.85,
      radius: this.hero.radius,
      symbol
    });
  }

  triggerHeroImpact() {
    this.heroAnimation.hurt = HERO_ANIMATION_DURATIONS.hurt;
    this.heroAnimation.hurtAge = 0;
    this.addEffect('impact', {
      x: this.hero.x,
      y: this.hero.y - this.hero.radius * 0.2,
      radius: this.hero.radius
    });
  }

  triggerHeartLoss(previousLives, damageTaken) {
    const lostHearts = Math.min(Math.max(previousLives, 0), damageTaken);
    for (let i = 0; i < lostHearts; i += 1) {
      this.addEffect('heartLoss', {
        heartIndex: previousLives - 1 - i,
        burstIndex: i,
        burstCount: lostHearts
      });
    }
  }

  triggerPotionToHeart(origin, heartIndex) {
    this.addEffect('potionToHeart', {
      x: origin.x,
      y: origin.y,
      radius: origin.radius,
      heartIndex
    });
  }

  triggerItemEarn(itemType) {
    const slot = getItemSlots(this.width, this.height, this.items).find((entry) => entry.type === itemType);
    if (!slot) {
      return;
    }

    this.addEffect('itemEarn', {
      itemType,
      toX: slot.x + slot.width * 0.5,
      toY: slot.y + slot.height * 0.5
    });
  }

  triggerVanish(enemy) {
    this.addEffect('vanish', {
      x: enemy.x,
      y: enemy.y,
      radius: enemy.radius,
      kind: enemy.kind
    });
    this.addEffect('lightning', {
      fromX: this.hero.x + this.hero.radius * 0.72,
      fromY: this.hero.y - this.hero.radius * 0.92,
      toX: enemy.x,
      toY: enemy.y,
      radius: enemy.radius,
      kind: enemy.kind
    });
  }

  triggerComboChain(targets) {
    if (!targets.length) {
      return;
    }

    this.addEffect('comboChain', {
      originX: this.hero.x + this.hero.radius * 0.72,
      originY: this.hero.y - this.hero.radius * 0.9,
      targets: targets.map((enemy) => ({
        x: enemy.x,
        y: enemy.y,
        radius: enemy.radius,
        kind: enemy.kind,
        dead: enemy.dead
      }))
    });

    for (let i = 0; i < targets.length; i += 1) {
      const enemy = targets[i];
      const hit = enemy.takeComboHit();
      if (hit && enemy.dead) {
        this.triggerVanish(enemy);
      }
    }
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    if (this.sound && this.sound.setSoundEnabled) {
      this.sound.setSoundEnabled(this.soundEnabled);
    }
  }

  handleTap(point) {
    if (isAudioToggleHit(this.width, point)) {
      this.toggleSound();
      return;
    }

    if (this.screen === SCREENS.TITLE) {
      const selectedDifficulty = findDifficultyAtPoint(this.width, this.height, point);
      if (selectedDifficulty) {
        this.start(selectedDifficulty);
      }
      return;
    }

    if (this.screen === SCREENS.LEVEL_TRANSITION) {
      const selectedDifficulty = findDifficultyAtPoint(this.width, this.height, point);
      if (selectedDifficulty) {
        this.startNextLevel(selectedDifficulty);
      }
      return;
    }

    if (this.screen === SCREENS.PLAYING) {
      const itemType = findItemAtPoint(this.width, this.height, this.items, point);
      if (itemType) {
        this.useItem(itemType);
      }
      return;
    }

    if (this.screen === SCREENS.WIN || this.screen === SCREENS.LOSE) {
      this.difficulty = null;
      this.timeScale = 1;
      this.createNewThemeOrder();
      this.resetRun();
      this.screen = SCREENS.TITLE;
    }
  }

  useItem(itemType) {
    if (!this.items[itemType] || this.items[itemType] <= 0) {
      return false;
    }

    if (itemType === ITEM_TYPES.COMBO_CHAIN) {
      const targets = this.enemies.filter((enemy) => !enemy.dead);
      if (targets.length === 0) {
        this.feedback = { text: '没有可攻击目标', age: 0, type: 'item' };
        return false;
      }

      this.items.comboChain -= 1;
      this.triggerComboChain(targets);
      this.feedback = { text: '紫色闪电释放', age: 0, type: 'hit' };
      return true;
    }

    if (itemType === ITEM_TYPES.HEALTH_POTION) {
      if (this.lives >= this.maxLives) {
        this.feedback = { text: '爱心已满', age: 0, type: 'item' };
        return false;
      }

      const slots = getItemSlots(this.width, this.height, this.items);
      const slot = slots.find((entry) => entry.type === ITEM_TYPES.HEALTH_POTION);
      this.items.healthPotion -= 1;
      const recoveredHeartIndex = this.lives;
      this.lives += 1;
      this.triggerPotionToHeart({
        x: slot.x + slot.width * 0.5,
        y: slot.y + slot.height * 0.5,
        radius: 22
      }, recoveredHeartIndex);
      this.feedback = { text: '爱心 +1', age: 0, type: 'hit' };
      return true;
    }

    return false;
  }

  handleGesture(points) {
    if (this.screen !== SCREENS.PLAYING) {
      return SYMBOLS.UNKNOWN;
    }

    const symbol = recognize(points);
    this.triggerCast(symbol);
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
    let vanishedScore = 0;
    for (let i = 0; i < targets.length; i += 1) {
      const target = targets[i];
      target.applySymbol(symbol);
      if (target.symbols.length === 0) {
        vanished += 1;
        vanishedScore += target.score;
        this.triggerVanish(target);
      } else {
        partialHits += 1;
      }
    }

    this.combo += 1;
    const multiplier = getComboMultiplier(this.combo);
    const earned = Math.round(vanishedScore * multiplier) + partialHits * 30;
    this.score += earned;
    const scoreFeedback = vanished > 0
      ? '消除 +' + earned
      : (partialHits > 0 ? '命中 +' + earned : '');
    let feedbackText = scoreFeedback;
    const earnedItems = [];
    if (this.combo % 10 === 0) {
      this.items.comboChain += 1;
      earnedItems.push(ITEM_TYPES.COMBO_CHAIN);
      feedbackText += '  获得紫色闪电';
    }
    if (this.combo % 15 === 0) {
      this.items.healthPotion += 1;
      earnedItems.push(ITEM_TYPES.HEALTH_POTION);
      feedbackText += '  获得血瓶';
    }
    for (let i = 0; i < earnedItems.length; i += 1) {
      this.triggerItemEarn(earnedItems[i]);
    }
    this.feedback = {
      text: feedbackText,
      age: 0,
      type: 'hit',
      combo: this.combo,
      multiplier: vanished > 0 ? multiplier : null
    };
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
    if (this.sound) {
      this.sound.play(vanished > 0 ? 'vanish' : 'hit');
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
  SCREENS,
  getComboMultiplier
};

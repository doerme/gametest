'use strict';

const LevelDirector = require('../levels/LevelDirector');
const { THEME_IDS, createThemeOrder } = require('../levels/Themes');
const Enemy = require('../entities/Enemy');
const { recognizeDetailed, SYMBOLS } = require('../input/GestureRecognizer');
const { DIFFICULTY_MODES, getDifficulty, findStartAtPoint, getContinueButton } = require('../ui/DifficultySelector');
const { isAudioToggleHit } = require('../ui/AudioToggle');
const { ITEM_TYPES, getItemSlots, findItemAtPoint } = require('../ui/ItemBar');
const ATTACK = require('./AttackEffect');
const GAME_MODES = require('./GameMode');
const { getHanziLayout, contains } = require('../ui/HanziLayout');
const { getStrokeMedian } = require('../hanzi/Characters');
const { recognizeStroke } = require('../input/HanziStrokeRecognizer');
const { sceneScale, FREEZE_DURATION } = require('../hanzi/Pacing');
const HANZI_RECOGNITION = require('../hanzi/RecognitionPolicy');
const { MIN_SPEED, MAX_SPEED, SPEED_STEP, DEFAULT_SPEED, getSpeedControl, findSpeedDirectionAtPoint, isSpeedControlHit } = require('../ui/SpeedControl');
const { SPEED_HINT_DURATION } = require('../ui/SpeedHint');

const SCREENS = {
  TITLE: 'title',
  PLAYING: 'playing',
  LEVEL_TRANSITION: 'level-transition',
  WIN: 'win',
  LOSE: 'lose'
};

const ANIMATION_DURATIONS = {
  attack: ATTACK.flightDuration + ATTACK.impactDuration,
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
  constructor(width, height, sound, random, options = {}) {
    this.width = width;
    this.height = height;
    this.sound = sound;
    this.random = random || Math.random;
    this.gameMode = GAME_MODES.HANZI;
    this.themeOrder = createThemeOrder(this.random);
    this.hero = this.createHero(width, height);
    this.director = new LevelDirector(width, height);
    this.difficulty = null;
    this.timeScale = DEFAULT_SPEED;
    this.speedHintPreference = options.speedHintPreference;
    this.speedHintSeen = !!(this.speedHintPreference && this.speedHintPreference.seen);
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
      y: this.gameMode === GAME_MODES.HANZI ? getHanziLayout(width, height).heroY * height : height * 0.74,
      radius: Math.max(28, Math.min(width, height) * 0.07)
    };
  }

  resize(width, height) {
    this.clearAttackEffects();
    this.hanziRevision += 1;
    const scaleX = width / this.width;
    const scaleY = height / this.height;
    (this.enemies || []).forEach((enemy) => {
      enemy.x *= scaleX; enemy.y *= scaleY;
      if (enemy.hanzi) enemy.speed *= Math.min(scaleX, scaleY);
    });
    this.width = width;
    this.height = height;
    this.hero = this.createHero(width, height);
    this.director.width = width;
    this.director.height = height;
  }

  resetRun() {
    this.speedControlOpen = false;
    this.speedHintRemaining = 0;
    this.hero = this.createHero(this.width, this.height);
    this.hanziTarget = null;
    this.hanziVisibleEnemies = [];
    this.hanziRevision = (this.hanziRevision || 0) + 1;
    this.freezeRemaining = 0;
    this.sceneElapsed = 0;
    this.hanziGuideTime = 0;
    this.score = 0;
    this.maxLives = MAX_LIVES;
    this.lives = this.maxLives;
    this.level = 1;
    this.totalLevels = this.director.levelCount;
    this.elapsed = 0;
    this.transitionRemaining = 0;
    this.combo = 0;
    this.gestureFailures = 0;
    this.lastGestureResult = null;
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
    this.director.reset(this.width, this.height, this.level, this.getThemeId(this.level), this.gameMode, this.random);
  }

  getThemeId(level) {
    return this.themeOrder[(level || 1) - 1] || THEME_IDS.CASTLE;
  }

  createNewThemeOrder() {
    this.themeOrder = createThemeOrder(this.random);
  }

  start(difficultyMode, gameMode = GAME_MODES.HANZI) {
    this.gameMode = gameMode === GAME_MODES.HANZI ? GAME_MODES.HANZI : GAME_MODES.SYMBOL;
    this.selectDifficulty(difficultyMode);
    this.resetRun();
    this.screen = SCREENS.PLAYING;
    if (!this.speedHintSeen) {
      this.speedHintRemaining = SPEED_HINT_DURATION;
      this.speedHintSeen = true;
      if (this.speedHintPreference) this.speedHintPreference.markSeen();
    }
    if (this.sound) {
      this.sound.play('start');
      if (this.sound.playMusic) {
        this.sound.playMusic(this.getThemeId(this.level));
      }
    }
  }

  update(dt, context = {}) {
    this.updateAnimations(dt);

    if (this.screen === SCREENS.LEVEL_TRANSITION) {
      return;
    }

    if (this.screen !== SCREENS.PLAYING) {
      return;
    }

    this.speedHintRemaining = Math.max(0, this.speedHintRemaining - dt);
    if (this.gameMode === GAME_MODES.HANZI) this.hanziGuideTime += dt;
    if (this.speedControlOpen) return;
    const frozenDt = this.gameMode === GAME_MODES.HANZI ? Math.min(dt, this.freezeRemaining) : 0;
    this.freezeRemaining = Math.max(0, this.freezeRemaining - frozenDt);
    const activeDt = dt - frozenDt;
    const playDt = activeDt * this.timeScale;
    this.elapsed += playDt;
    this.director.update(this.elapsed, this.enemies);
    if (this.gameMode === GAME_MODES.HANZI) {
      const next = this.director.config.timeline[this.director.index];
      const strokes = this.hanziTarget ? this.hanziTarget.hanzi.strokeCount : (next ? next.strokeCount : 1);
      this.sceneElapsed += playDt * sceneScale(strokes);
    }

    const livesBeforeDamage = this.lives;
    let damageTaken = 0;
    for (let i = 0; i < this.enemies.length; i += 1) {
      const enemy = this.enemies[i];
      enemy.update(dt, this.hero, this.timeScale * (dt > 0 ? activeDt / dt : 1));
      if (enemy.reachedHero) {
        this.lives -= 1;
        this.combo = 0;
        this.gestureFailures = 0;
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
    this.pruneAttackEffects();
    this.syncHanziTarget(context.visibleEnemies || this.hanziVisibleEnemies);

    if (this.lives <= 0) {
      this.screen = SCREENS.LOSE;
      this.clearHanziTarget();
      this.clearAttackEffects();
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
        this.clearHanziTarget();
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
    this.speedControlOpen = false;
    this.speedHintRemaining = 0;
    this.clearAttackEffects();
    this.clearHanziTarget();
    this.freezeRemaining = 0;
    this.screen = SCREENS.LEVEL_TRANSITION;
    this.transitionRemaining = 0;
    this.combo = 0;
    this.gestureFailures = 0;
    this.feedback = null;
    this.enemies = [];
    if (this.sound && this.sound.playMusic) {
      this.sound.playMusic(this.getThemeId(this.level + 1));
    }
  }

  selectDifficulty(difficultyMode) {
    const difficulty = getDifficulty(difficultyMode) || getDifficulty(DIFFICULTY_MODES.NORMAL);
    this.difficulty = difficulty.id;
    this.timeScale = difficulty.timeScale;
  }

  adjustSpeed(direction) {
    if (this.screen !== SCREENS.PLAYING || (direction !== -1 && direction !== 1)) return false;
    const speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, this.timeScale + direction * SPEED_STEP));
    if (speed === this.timeScale) return false;
    this.timeScale = speed;
    this.difficulty = speed === 1 ? DIFFICULTY_MODES.NORMAL : speed === 1.5 ? DIFFICULTY_MODES.PLUS_ONE : null;
    return true;
  }

  startNextLevel() {
    this.speedControlOpen = false;
    this.speedHintRemaining = 0;
    this.level += 1;
    this.elapsed = 0;
    this.sceneElapsed = 0;
    this.freezeRemaining = 0;
    this.clearHanziTarget();
    this.hanziVisibleEnemies = [];
    this.combo = 0;
    this.gestureFailures = 0;
    this.feedback = null;
    this.enemies = [];
    this.effects = [];
    this.director.startLevel(this.level, this.getThemeId(this.level), this.gameMode, this.random);
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
    this.pruneAttackEffects();

    if (this.feedback) {
      this.feedback.age += dt;
      const duration = this.feedback.type === 'retry' ? 2
        : this.gameMode === GAME_MODES.HANZI && this.feedback.type === 'hit' ? HANZI_RECOGNITION.successFeedbackDuration : 0.7;
      if (this.feedback.age > duration) {
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

  clearAttackEffects() {
    this.effects = (this.effects || []).filter((effect) => effect.type !== 'attack');
  }

  pruneAttackEffects() {
    const live = new Set(this.enemies);
    this.effects = this.effects.filter((effect) => effect.type !== 'attack'
      || (this.screen === SCREENS.PLAYING && live.has(effect.target) && !effect.target.dead && !effect.target.reachedHero));
  }

  triggerAttack(enemy) {
    // Keep the newest shots under rapid input, without dropping other effects.
    if (this.effects.filter((effect) => effect.type === 'attack').length >= ATTACK.maxActive) {
      this.effects.splice(this.effects.findIndex((effect) => effect.type === 'attack'), 1);
    }
    this.addEffect('attack', { target: enemy, radius: enemy.radius });
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
    const slot = getItemSlots(this.width, this.height, this.items, this.gameMode).find((entry) => entry.type === itemType);
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
    this.pruneAttackEffects();
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    if (this.sound && this.sound.setSoundEnabled) {
      this.sound.setSoundEnabled(this.soundEnabled);
    }
  }

  handleTap(point) {
    if (this.screen === SCREENS.PLAYING) {
      const options = { open: this.speedControlOpen, hintVisible: this.speedHintRemaining > 0 };
      const control = getSpeedControl(this.width, options);
      if (this.speedControlOpen) {
        const direction = findSpeedDirectionAtPoint(this.width, point, options);
        if (direction !== null) this.adjustSpeed(direction);
        else if (contains(control.hitBounds, point) || !contains(control.panel, point)) this.speedControlOpen = false;
        // An outside tap dismisses the panel without also using an item or audio.
        return;
      }
      if (isSpeedControlHit(this.width, point, options)) {
        this.speedControlOpen = true;
        this.speedHintRemaining = 0;
        return;
      }
    }
    if (isAudioToggleHit(this.width, point)) {
      this.toggleSound();
      return;
    }

    if (this.screen === SCREENS.TITLE) {
      const button = findStartAtPoint(this.width, this.height, point);
      if (button) {
        this.start(DIFFICULTY_MODES.NORMAL, button.gameMode);
      }
      return;
    }

    if (this.screen === SCREENS.LEVEL_TRANSITION) {
      if (contains(getContinueButton(this.width, this.height, this.gameMode, this.timeScale), point)) this.startNextLevel();
      return;
    }

    if (this.screen === SCREENS.PLAYING) {
      const itemType = findItemAtPoint(this.width, this.height, this.items, point, this.gameMode);
      if (itemType) {
        this.useItem(itemType);
      }
      return;
    }

    if (this.screen === SCREENS.WIN || this.screen === SCREENS.LOSE) {
      this.difficulty = null;
      this.timeScale = DEFAULT_SPEED;
      this.gameMode = GAME_MODES.HANZI;
      this.createNewThemeOrder();
      this.resetRun();
      this.screen = SCREENS.TITLE;
    }
  }

  useItem(itemType) {
    if (this.speedControlOpen) return false;
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
      if (this.gameMode === GAME_MODES.HANZI) {
        this.freezeRemaining = FREEZE_DURATION;
        this.feedback = { text: '定身 3 秒，继续写吧', age: 0, type: 'hit' };
        if (this.sound) this.sound.play('hit');
        return true;
      }
      this.triggerComboChain(targets);
      this.feedback = { text: '紫色闪电释放', age: 0, type: 'hit' };
      return true;
    }

    if (itemType === ITEM_TYPES.HEALTH_POTION) {
      if (this.lives >= this.maxLives) {
        this.feedback = { text: '爱心已满', age: 0, type: 'item' };
        return false;
      }

      const slots = getItemSlots(this.width, this.height, this.items, this.gameMode);
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

  handleGesture(points, context = {}) {
    if (this.screen !== SCREENS.PLAYING || this.speedControlOpen) {
      return SYMBOLS.UNKNOWN;
    }

    if (this.gameMode === GAME_MODES.HANZI) {
      this.handleHanziStroke(points, context);
      return SYMBOLS.UNKNOWN;
    }

    const currentSymbols = new Set(this.enemies.filter((enemy) => !enemy.dead).map((enemy) => enemy.symbols[0]));
    const expectedSymbols = (context.expectedSymbols || []).filter((symbol) => currentSymbols.has(symbol));
    const result = recognizeDetailed(points, { expectedSymbols });
    const symbol = result.symbol;
    this.lastGestureResult = result;
    if (result.ignored || currentSymbols.size === 0) return symbol;
    this.triggerCast(symbol);
    const targets = this.findMatchingEnemies(symbol);
    if (targets.length === 0) {
      this.gestureFailures += 1;
      const protectedRetry = this.gestureFailures === 1;
      if (!protectedRetry) this.combo = 0;
      this.feedback = {
        text: protectedRetry ? '再画一次，连击已保护' : '跟着符号再试一次',
        age: 0, type: 'retry', protected: protectedRetry,
        guideSymbol: expectedSymbols[0] || this.enemies.find((enemy) => !enemy.dead).symbols[0]
      };
      if (this.sound && !protectedRetry) {
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
        this.triggerAttack(target);
      }
    }

    this.gestureFailures = 0;
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
      assisted: result.assisted,
      combo: this.combo,
      multiplier: vanished > 0 ? multiplier : null
    };
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
    this.pruneAttackEffects();
    if (this.sound) {
      this.sound.play(vanished > 0 ? 'vanish' : 'hit');
    }

    return symbol;
  }

  clearHanziTarget() {
    this.hanziTarget = null;
    this.hanziRevision += 1;
  }

  syncHanziTarget(visibleEnemies = []) {
    if (this.gameMode !== GAME_MODES.HANZI || this.screen !== SCREENS.PLAYING) return;
    this.hanziVisibleEnemies = visibleEnemies;
    if (this.hanziTarget && !this.hanziTarget.dead && this.enemies.includes(this.hanziTarget)) return;
    const candidates = visibleEnemies.filter((enemy) => enemy.hanzi && !enemy.dead && this.enemies.includes(enemy));
    candidates.sort((a, b) => Math.hypot(a.x - this.hero.x, a.y - this.hero.y) - Math.hypot(b.x - this.hero.x, b.y - this.hero.y));
    const target = candidates[0] || null;
    if (target !== this.hanziTarget) {
      this.hanziTarget = target;
      this.hanziRevision += 1;
    }
  }

  captureHanziStroke(point, context = {}) {
    if (this.speedControlOpen) return null;
    this.syncHanziTarget(context.visibleEnemies || this.hanziVisibleEnemies);
    const board = getHanziLayout(this.width, this.height).board;
    if (this.screen !== SCREENS.PLAYING || this.gameMode !== GAME_MODES.HANZI || !this.hanziTarget || !contains(board, point)) return null;
    return { gameMode: GAME_MODES.HANZI, target: this.hanziTarget, strokeIndex: this.hanziTarget.hanzi.strokeIndex, revision: this.hanziRevision, board };
  }

  handleHanziStroke(points, context = {}) {
    const target = this.hanziTarget;
    if (this.screen !== SCREENS.PLAYING || this.speedControlOpen || this.gameMode !== GAME_MODES.HANZI
      || !target || target.dead || !this.enemies.includes(target) || context.target !== target
      || context.revision !== this.hanziRevision || context.strokeIndex !== target.hanzi.strokeIndex) {
      return { accepted: false, ignored: true };
    }
    const result = recognizeStroke(points, getStrokeMedian(target.hanzi.character, target.hanzi.strokeIndex), context.board);
    this.lastGestureResult = result;
    if (result.ignored) return result;
    if (!result.accepted) {
      this.gestureFailures += 1;
      const protectedRetry = this.gestureFailures <= HANZI_RECOGNITION.retryProtection;
      if (!protectedRetry) this.combo = 0;
      const retriesRemaining = Math.max(0, HANZI_RECOGNITION.retryProtection - this.gestureFailures);
      this.hanziGuideTime = 0;
      this.feedback = { text: protectedRetry ? '沿箭头再试试，连击已保护 · 剩余' + retriesRemaining + '次' : '慢慢写，已完成的笔画都保留', age: 0, type: 'retry', protected: protectedRetry, retriesRemaining };
      if (this.sound && !protectedRetry) this.sound.play('miss');
      return result;
    }
    target.applyStroke(context.strokeIndex);
    this.gestureFailures = 0;
    this.triggerCast(SYMBOLS.UNKNOWN);
    if (!target.dead) {
      this.triggerAttack(target);
      this.feedback = { text: '真棒！完成第 ' + target.hanzi.strokeIndex + ' / ' + target.hanzi.strokeCount + ' 笔', age: 0, type: 'hit' };
      if (this.sound) this.sound.play('hit');
      return result;
    }
    this.combo += 1;
    const multiplier = getComboMultiplier(this.combo);
    const earned = Math.round(target.score * multiplier);
    this.score += earned;
    let text = '写对「' + target.hanzi.character + '」 +' + earned;
    if (this.combo % 10 === 0) {
      this.items.comboChain += 1;
      this.triggerItemEarn(ITEM_TYPES.COMBO_CHAIN);
      text += '  获得定身闪电';
    }
    if (this.combo % 15 === 0) {
      this.items.healthPotion += 1;
      this.triggerItemEarn(ITEM_TYPES.HEALTH_POTION);
      text += '  获得血瓶';
    }
    this.feedback = { text, age: 0, type: 'hit', combo: this.combo, multiplier };
    this.triggerVanish(target);
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
    this.pruneAttackEffects();
    this.clearHanziTarget();
    this.syncHanziTarget(this.hanziVisibleEnemies);
    if (this.sound) this.sound.play('vanish');
    return result;
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
  GAME_MODES,
  getComboMultiplier
};

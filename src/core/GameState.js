'use strict';

const LevelDirector = require('../levels/LevelDirector');
const { recognize, SYMBOLS } = require('../input/GestureRecognizer');
const { DIFFICULTY_MODES, getDifficulty, findDifficultyAtPoint } = require('../ui/DifficultySelector');
const { isAudioToggleHit } = require('../ui/AudioToggle');

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
  vanish: 0.62
};

class GameState {
  constructor(width, height, sound) {
    this.width = width;
    this.height = height;
    this.sound = sound;
    this.hero = this.createHero(width, height);
    this.director = new LevelDirector(width, height);
    this.difficulty = null;
    this.timeScale = 1;
    this.musicEnabled = true;
    if (this.sound && this.sound.setMusicEnabled) {
      this.sound.setMusicEnabled(true);
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
    this.lives = 5;
    this.level = 1;
    this.totalLevels = this.director.levelCount;
    this.elapsed = 0;
    this.transitionRemaining = 0;
    this.combo = 0;
    this.enemies = [];
    this.feedback = null;
    this.effects = [];
    this.heroAnimation = {
      cast: 0,
      hurt: 0
    };
    this.director.reset(this.width, this.height, this.level);
  }

  start(difficultyMode) {
    this.selectDifficulty(difficultyMode);
    this.resetRun();
    this.screen = SCREENS.PLAYING;
    if (this.sound) {
      this.sound.play('start');
      if (this.sound.playMusic) {
        this.sound.playMusic(this.level);
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

    for (let i = 0; i < this.enemies.length; i += 1) {
      const enemy = this.enemies[i];
      enemy.update(dt, this.hero, this.timeScale);
      if (enemy.reachedHero) {
        this.lives -= 1;
        this.combo = 0;
        this.feedback = { text: '-1', age: 0, type: 'hurt' };
        this.triggerHeroImpact();
        if (this.sound) {
          this.sound.play('hurt');
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
      this.sound.playMusic(this.level + 1);
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
    this.director.startLevel(this.level);
    this.screen = SCREENS.PLAYING;
    if (this.sound) {
      this.sound.play('start');
    }
  }

  updateAnimations(dt) {
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
    this.heroAnimation.cast = ANIMATION_DURATIONS.cast;
    this.addEffect('cast', {
      x: this.hero.x + this.hero.radius * 0.8,
      y: this.hero.y - this.hero.radius * 0.85,
      radius: this.hero.radius,
      symbol
    });
  }

  triggerHeroImpact() {
    this.heroAnimation.hurt = ANIMATION_DURATIONS.impact;
    this.addEffect('impact', {
      x: this.hero.x,
      y: this.hero.y - this.hero.radius * 0.2,
      radius: this.hero.radius
    });
  }

  triggerVanish(enemy) {
    this.addEffect('vanish', {
      x: enemy.x,
      y: enemy.y,
      radius: enemy.radius,
      kind: enemy.kind
    });
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (this.sound && this.sound.setMusicEnabled) {
      this.sound.setMusicEnabled(this.musicEnabled);
    }
  }

  handleTap(point) {
    if (isAudioToggleHit(this.width, point)) {
      this.toggleMusic();
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

    if (this.screen === SCREENS.WIN || this.screen === SCREENS.LOSE) {
      this.difficulty = null;
      this.timeScale = 1;
      this.resetRun();
      this.screen = SCREENS.TITLE;
    }
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
    let earned = 0;
    for (let i = 0; i < targets.length; i += 1) {
      const target = targets[i];
      target.applySymbol(symbol);
      if (target.symbols.length === 0) {
        vanished += 1;
        earned += target.score;
        this.triggerVanish(target);
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

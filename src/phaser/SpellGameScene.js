'use strict';

const { GameState, SCREENS } = require('../core/GameState');
const SoundManager = require('../audio/SoundManager');
const PhaserInputAdapter = require('./PhaserInputAdapter');
const { IMAGE_ASSETS, SPRITESHEET_ASSETS, ENEMY_ASSET_KEYS } = require('./assets');
const RendererHelpers = require('../render/Renderer');
const { LABELS, SYMBOLS } = require('../input/GestureRecognizer');
const { THEME_IDS, getTheme } = require('../levels/Themes');
const { DIFFICULTY_MODES, getDifficultyButtons } = require('../ui/DifficultySelector');
const { getAudioToggleBounds } = require('../ui/AudioToggle');
const { ITEM_TYPES, getHeartSlotPosition, getItemSlots } = require('../ui/ItemBar');

const DEPTH = {
  background: 0,
  runes: 1,
  enemies: 10,
  hero: 20,
  effects: 30,
  gesture: 40,
  hud: 50,
  overlay: 70
};

const FONT_FAMILY = 'Arial, sans-serif';

function themeTint(themeId) {
  if (themeId === THEME_IDS.OCEAN) {
    return 0x64e9ff;
  }
  if (themeId === THEME_IDS.PENGUIN_HOTEL) {
    return 0xb8f7ff;
  }
  if (themeId === THEME_IDS.DINOSAUR_PARK) {
    return 0xf0d06a;
  }
  if (themeId === THEME_IDS.SKY_CITY) {
    return 0xffdd86;
  }
  if (themeId === THEME_IDS.SEA_TRAIN) {
    return 0xffc684;
  }
  return 0xffe9ab;
}

function createSpellGameScene(Phaser, runtime) {
  return class SpellGameScene extends Phaser.Scene {
    constructor() {
      super({ key: 'SpellGameScene' });
      this.runtime = runtime || {};
      this.enemyObjects = new Map();
      this.currentThemeId = null;
    }

    preload() {
      for (let i = 0; i < IMAGE_ASSETS.length; i += 1) {
        const asset = IMAGE_ASSETS[i];
        this.load.image(asset.key, asset.src);
      }
      for (let i = 0; i < SPRITESHEET_ASSETS.length; i += 1) {
        const asset = SPRITESHEET_ASSETS[i];
        this.load.spritesheet(asset.key, asset.src, {
          frameWidth: asset.frameWidth,
          frameHeight: asset.frameHeight
        });
      }
    }

    create() {
      this.width = this.runtime.width || this.scale.width || 375;
      this.height = this.runtime.height || this.scale.height || 667;
      this.soundManager = new SoundManager(this.runtime.wxApi);
      this.state = new GameState(this.width, this.height, this.soundManager);
      this.inputAdapter = new PhaserInputAdapter(this, this.state);
      this.inputAdapter.bind();

      this.createLayers();
      this.createAnimations();
      this.createHero();
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        if (this.inputAdapter) {
          this.inputAdapter.destroy();
        }
      });
    }

    createLayers() {
      this.backgroundLayer = this.add.container(0, 0).setDepth(DEPTH.background);
      this.runeGraphics = this.add.graphics().setDepth(DEPTH.runes);
      this.enemyLayer = this.add.container(0, 0).setDepth(DEPTH.enemies);
      this.effectGraphics = this.add.graphics().setDepth(DEPTH.effects);
      this.gestureGraphics = this.add.graphics().setDepth(DEPTH.gesture);
      this.hudGraphics = this.add.graphics().setDepth(DEPTH.hud);
      this.hudTextLayer = this.add.container(0, 0).setDepth(DEPTH.hud + 1);
      this.overlayLayer = this.add.container(0, 0).setDepth(DEPTH.overlay);
      this.itemEarnLayer = this.add.container(0, 0).setDepth(DEPTH.effects + 1);
      this.symbolLayer = this.add.container(0, 0).setDepth(DEPTH.enemies + 1);
    }

    createAnimations() {
      this.createAnimation('cat-walk', 'catWalk', RendererHelpers.HERO_SPRITE.animations.walk.fps, 12, -1);
      this.createAnimation('cat-cast', 'catCast', RendererHelpers.HERO_SPRITE.animations.cast.fps, 12, -1);
      this.createAnimation('cat-hurt', 'catHurt', RendererHelpers.HERO_SPRITE.animations.hurt.fps, 12, -1);

      Object.keys(ENEMY_ASSET_KEYS).forEach((species) => {
        const key = ENEMY_ASSET_KEYS[species];
        this.createAnimation(key + '-idle', key, RendererHelpers.ENEMY_SPRITE.fps, 3, -1);
      });
    }

    createAnimation(key, texture, frameRate, frameCount, repeat) {
      if (this.anims.exists(key)) {
        return;
      }
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(texture, {
          start: 0,
          end: frameCount - 1
        }),
        frameRate,
        repeat
      });
    }

    createHero() {
      this.heroSprite = this.add.sprite(this.state.hero.x, this.state.hero.y, 'catWalk')
        .setDepth(DEPTH.hero)
        .setOrigin(0.5, 0.5)
        .play('cat-walk');
      this.heroAura = this.add.graphics().setDepth(DEPTH.hero - 1);
    }

    update(_time, delta) {
      const dt = Math.min(0.033, Math.max(0, delta / 1000));
      this.state.update(dt);
      this.syncScene();
    }

    syncScene() {
      const visibleLevel = this.state.screen === SCREENS.LEVEL_TRANSITION
        ? Math.min(this.state.level + 1, this.state.totalLevels)
        : this.state.level;
      const visibleThemeId = this.state.getThemeId ? this.state.getThemeId(visibleLevel) : THEME_IDS.CASTLE;

      this.syncBackground(visibleThemeId);
      this.drawRunes(visibleThemeId);
      this.syncEnemies();
      this.syncHero();
      this.drawEffects();
      this.drawGesture();
      this.drawHud(visibleLevel);
      this.drawOverlay(visibleLevel, visibleThemeId);
      this.currentThemeId = visibleThemeId;
    }

    syncBackground(themeId) {
      if (this.currentThemeId === themeId && this.backgroundObject) {
        this.updateBackgroundScroll(themeId);
        return;
      }

      this.backgroundLayer.removeAll(true);
      this.backgroundObject = null;
      const theme = getTheme(themeId);
      if (theme.backgroundAsset && this.textures.exists(theme.backgroundAsset)) {
        this.backgroundObject = this.add.tileSprite(0, 0, this.width, this.height, theme.backgroundAsset)
          .setOrigin(0, 0);
        this.backgroundLayer.add(this.backgroundObject);
      } else {
        this.backgroundObject = this.add.graphics();
        this.backgroundLayer.add(this.backgroundObject);
      }
      this.updateBackgroundScroll(themeId);
    }

    updateBackgroundScroll(themeId) {
      if (!this.backgroundObject) {
        return;
      }

      const scroll = this.state.elapsed * 52 * (this.state.timeScale || 1);
      if (this.backgroundObject.tilePositionY !== undefined) {
        this.backgroundObject.tilePositionY = -scroll;
        return;
      }

      const graphics = this.backgroundObject;
      graphics.clear();
      this.drawFallbackBackground(graphics, themeId, scroll);
    }

    drawFallbackBackground(graphics, themeId, scroll) {
      const base = themeId === THEME_IDS.SKY_CITY ? 0x8ac9ff : 0x183456;
      const accent = themeId === THEME_IDS.SEA_TRAIN ? 0xffb06a : themeTint(themeId);
      graphics.fillGradientStyle(base, base, 0x13213e, 0x13213e, 1);
      graphics.fillRect(0, 0, this.width, this.height);
      graphics.lineStyle(2, accent, 0.35);
      for (let i = -2; i < 12; i += 1) {
        const y = ((i * 82 + scroll) % (this.height + 164)) - 82;
        graphics.beginPath();
        graphics.moveTo(this.width * 0.16, y);
        graphics.lineTo(this.width * 0.38, y + 72);
        graphics.lineTo(this.width * 0.62, y + 72);
        graphics.lineTo(this.width * 0.84, y);
        graphics.strokePath();
      }
      for (let i = 0; i < 9; i += 1) {
        const x = (i % 3) * this.width * 0.34 + this.width * 0.15;
        const y = ((Math.floor(i / 3) * 190 + scroll * 0.55) % (this.height + 160)) - 80;
        graphics.fillStyle(accent, 0.12);
        graphics.fillEllipse(x, y, 86, 24);
      }
    }

    drawRunes(themeId) {
      this.runeGraphics.clear();
      this.runeGraphics.lineStyle(1.4, themeTint(themeId), 0.26);
      for (let i = 0; i < 9; i += 1) {
        const x = ((i * 97 + this.state.elapsed * 14) % (this.width + 80)) - 40;
        const y = ((i * 151 + this.state.elapsed * 22) % (this.height + 80)) - 40;
        this.runeGraphics.strokeCircle(x, y, 12 + (i % 3) * 5);
        this.runeGraphics.beginPath();
        this.runeGraphics.moveTo(x - 9, y);
        this.runeGraphics.lineTo(x + 9, y);
        this.runeGraphics.moveTo(x, y - 9);
        this.runeGraphics.lineTo(x, y + 9);
        this.runeGraphics.strokePath();
      }
    }

    syncEnemies() {
      const liveEnemies = new Set(this.state.enemies);
      this.enemyObjects.forEach((entry, enemy) => {
        if (!liveEnemies.has(enemy)) {
          entry.container.destroy(true);
          this.enemyObjects.delete(enemy);
        }
      });

      this.symbolLayer.removeAll(true);
      for (let i = 0; i < this.state.enemies.length; i += 1) {
        const enemy = this.state.enemies[i];
        let entry = this.enemyObjects.get(enemy);
        if (!entry) {
          entry = this.createEnemyObject(enemy);
          this.enemyObjects.set(enemy, entry);
        }
        this.updateEnemyObject(enemy, entry);
        this.drawSymbolQueue(enemy);
      }
    }

    createEnemyObject(enemy) {
      const container = this.add.container(enemy.x, enemy.y);
      const assetKey = ENEMY_ASSET_KEYS[enemy.species];
      let body;
      if (assetKey && this.textures.exists(assetKey)) {
        body = this.add.sprite(0, 0, assetKey).play(assetKey + '-idle');
      } else {
        body = this.add.graphics();
        this.drawFallbackEnemy(body, enemy);
      }
      container.add(body);
      this.enemyLayer.add(container);
      return { container, body, assetKey };
    }

    updateEnemyObject(enemy, entry) {
      entry.container.setPosition(enemy.x, enemy.y);
      const targetSize = enemy.radius * (enemy.kind === 'boss' ? 2.35 : 2.15);
      if (entry.assetKey) {
        const frameSize = enemy.kind === 'boss' ? 512 : 384;
        entry.body.setDisplaySize(targetSize, targetSize);
        entry.body.setTint(enemy.hitFlash > 0 ? 0xffffff : 0xffffff);
        entry.body.setAlpha(enemy.hitFlash > 0 ? 0.72 : 1);
        if (frameSize) {
          entry.body.setScale(targetSize / frameSize);
        }
      } else {
        entry.body.clear();
        this.drawFallbackEnemy(entry.body, enemy);
      }
    }

    drawFallbackEnemy(graphics, enemy) {
      const radius = enemy.radius;
      const tint = enemy.kind === 'boss' ? 0x7e5cff : 0x7fe8ff;
      graphics.fillStyle(tint, 0.82);
      graphics.fillCircle(0, 0, radius);
      graphics.lineStyle(3, 0xffffff, 0.62);
      graphics.strokeCircle(0, 0, radius);
      graphics.fillStyle(0x18243b, 0.9);
      graphics.fillCircle(-radius * 0.32, -radius * 0.16, radius * 0.11);
      graphics.fillCircle(radius * 0.32, -radius * 0.16, radius * 0.11);
    }

    drawSymbolQueue(enemy) {
      const indicators = RendererHelpers.getSymbolIndicators(enemy);
      const startX = enemy.x - (indicators.length - 1) * 15;
      const y = enemy.y - enemy.radius - 26;
      for (let i = 0; i < indicators.length; i += 1) {
        const indicator = indicators[i];
        const x = startX + i * 30;
        const bg = this.add.graphics();
        bg.fillStyle(0x091326, 0.78);
        bg.fillRoundedRect(x - 14, y - 14, 28, 28, 8);
        this.symbolLayer.add(bg);

        if (indicator.type === 'dot') {
          const dot = this.add.graphics();
          dot.fillStyle(0xffffff, 0.72);
          dot.fillCircle(x, y, 4);
          this.symbolLayer.add(dot);
        } else if (indicator.type === 'count') {
          const text = this.add.text(x, y, '+' + indicator.count, {
            fontFamily: FONT_FAMILY,
            fontSize: '15px',
            color: '#ffffff'
          }).setOrigin(0.5);
          this.symbolLayer.add(text);
        } else {
          const iconKey = RendererHelpers.SYMBOL_ICON_ASSET_KEYS[indicator.symbol];
          if (iconKey && this.textures.exists(iconKey)) {
            const icon = this.add.image(x, y, iconKey).setDisplaySize(21, 21);
            this.symbolLayer.add(icon);
          } else {
            const text = this.add.text(x, y, LABELS[indicator.symbol] || '?', {
              fontFamily: FONT_FAMILY,
              fontSize: '18px',
              color: '#ffffff'
            }).setOrigin(0.5);
            this.symbolLayer.add(text);
          }
        }
      }
    }

    syncHero() {
      const hero = this.state.hero;
      this.heroSprite.setPosition(hero.x, hero.y);
      this.heroSprite.setDisplaySize(hero.radius * 3.2, hero.radius * 3.2);
      const animationName = RendererHelpers.getHeroSpriteAnimation(this.state.heroAnimation, this.inputAdapter && this.inputAdapter.isDrawing);
      const key = 'cat-' + animationName;
      if (!this.heroSprite.anims.currentAnim || this.heroSprite.anims.currentAnim.key !== key) {
        this.heroSprite.play(key);
      }

      this.heroAura.clear();
      if (this.inputAdapter && this.inputAdapter.isDrawing) {
        this.heroAura.lineStyle(3, 0xffe36b, 0.5);
        this.heroAura.strokeCircle(hero.x, hero.y - hero.radius * 0.18, hero.radius * 1.2);
      }
    }

    drawEffects() {
      this.effectGraphics.clear();
      this.itemEarnLayer.removeAll(true);
      for (let i = 0; i < this.state.effects.length; i += 1) {
        const effect = this.state.effects[i];
        const progress = Math.max(0, Math.min(1, effect.age / effect.duration));
        const fade = 1 - progress;
        if (effect.type === 'cast') {
          this.effectGraphics.lineStyle(4, 0xffe36b, fade * 0.85);
          this.effectGraphics.strokeCircle(effect.x, effect.y, effect.radius * (0.4 + progress * 1.4));
          this.effectGraphics.fillStyle(0xfff0a8, fade);
          this.effectGraphics.fillCircle(effect.x, effect.y, 4 + progress * 8);
        } else if (effect.type === 'impact') {
          this.effectGraphics.lineStyle(4, 0xff6f6f, fade);
          this.effectGraphics.strokeCircle(effect.x, effect.y, effect.radius * (0.8 + progress * 1.1));
        } else if (effect.type === 'vanish') {
          this.effectGraphics.lineStyle(3, 0x9df6ff, fade);
          this.effectGraphics.strokeCircle(effect.x, effect.y, effect.radius * (0.8 + progress * 1.5));
          this.effectGraphics.fillStyle(0xffffff, fade * 0.55);
          this.effectGraphics.fillCircle(effect.x, effect.y, effect.radius * fade);
        } else if (effect.type === 'lightning') {
          this.drawLightning(effect, fade);
        } else if (effect.type === 'comboChain') {
          this.drawComboChain(effect, fade);
        } else if (effect.type === 'heartLoss') {
          this.drawHeartLoss(effect, fade, progress);
        } else if (effect.type === 'potionToHeart') {
          this.drawPotionToHeart(effect, progress, fade);
        } else if (effect.type === 'itemEarn') {
          this.drawItemEarn(effect, progress, fade);
        }
      }
    }

    drawLightning(effect, fade) {
      this.effectGraphics.lineStyle(4, 0x9f6bff, fade);
      this.effectGraphics.beginPath();
      this.effectGraphics.moveTo(effect.fromX, effect.fromY);
      const midX = (effect.fromX + effect.toX) * 0.5 + Math.sin(this.state.elapsed * 20) * 10;
      const midY = (effect.fromY + effect.toY) * 0.5;
      this.effectGraphics.lineTo(midX, midY);
      this.effectGraphics.lineTo(effect.toX, effect.toY);
      this.effectGraphics.strokePath();
    }

    drawComboChain(effect, fade) {
      const targets = effect.targets || [];
      this.effectGraphics.lineStyle(3, 0xbb7cff, fade);
      for (let i = 0; i < targets.length; i += 1) {
        const target = targets[i];
        this.effectGraphics.beginPath();
        this.effectGraphics.moveTo(effect.originX, effect.originY);
        this.effectGraphics.lineTo(target.x, target.y);
        this.effectGraphics.strokePath();
        this.effectGraphics.strokeCircle(target.x, target.y, target.radius * 1.2);
      }
    }

    drawHeartLoss(effect, fade, progress) {
      const heart = getHeartSlotPosition(this.width, this.height, effect.heartIndex || 0);
      const lift = progress * 28;
      this.effectGraphics.fillStyle(0xff6070, fade);
      this.effectGraphics.fillCircle(heart.x, heart.y - lift, 8);
      this.effectGraphics.lineStyle(2, 0xffd6dd, fade);
      this.effectGraphics.beginPath();
      this.effectGraphics.moveTo(heart.x - 8, heart.y - lift - 8);
      this.effectGraphics.lineTo(heart.x + 8, heart.y - lift + 8);
      this.effectGraphics.strokePath();
    }

    drawPotionToHeart(effect, progress, fade) {
      const heart = getHeartSlotPosition(this.width, this.height, effect.heartIndex || 0);
      const x = effect.x + (heart.x - effect.x) * progress;
      const y = effect.y + (heart.y - effect.y) * progress;
      this.effectGraphics.fillStyle(0xff5f8f, fade);
      this.effectGraphics.fillCircle(x, y, 10);
      this.effectGraphics.lineStyle(2, 0xffffff, fade);
      this.effectGraphics.strokeCircle(x, y, 10);
    }

    drawItemEarn(effect, progress, fade) {
      const fromX = this.width * 0.5;
      const fromY = 110;
      const x = fromX + (effect.toX - fromX) * progress;
      const y = fromY + (effect.toY - fromY) * progress;
      this.effectGraphics.fillStyle(effect.itemType === ITEM_TYPES.HEALTH_POTION ? 0xff5f8f : 0x9f6bff, fade);
      this.effectGraphics.fillCircle(x, y, 12);
    }

    drawGesture() {
      this.gestureGraphics.clear();
      const path = this.inputAdapter ? this.inputAdapter.currentPath : [];
      if (!path || path.length < 2) {
        return;
      }

      this.gestureGraphics.lineStyle(5, 0xfff2ad, 0.82);
      this.gestureGraphics.beginPath();
      this.gestureGraphics.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i += 1) {
        this.gestureGraphics.lineTo(path[i].x, path[i].y);
      }
      this.gestureGraphics.strokePath();
    }

    drawHud(visibleLevel) {
      this.hudGraphics.clear();
      this.hudTextLayer.removeAll(true);

      this.addHudText(16, 18, '分数 ' + this.state.score, 19, '#ffffff', 0, 0);
      this.addHudText(this.width * 0.5, 18, RendererHelpers.getLevelLabel(this.state, visibleLevel), 18, '#ffffff', 0.5, 0);
      this.drawAudioToggle();
      this.drawHeartBar();
      this.drawItemBar();
      this.drawComboCounter();

      if (this.state.feedback) {
        const feedbackY = 92 - this.state.feedback.age * 22;
        const color = this.state.feedback.type === 'miss' ? '#ff8f8f' : '#fff2ad';
        this.addHudText(this.width * 0.5, feedbackY, this.state.feedback.text, 20, color, 0.5, 0.5);
      }
    }

    addHudText(x, y, text, fontSize, color, originX, originY) {
      const item = this.add.text(x, y, text, {
        fontFamily: FONT_FAMILY,
        fontSize: fontSize + 'px',
        color,
        stroke: '#071127',
        strokeThickness: 4
      }).setOrigin(originX, originY);
      this.hudTextLayer.add(item);
      return item;
    }

    drawAudioToggle() {
      const button = getAudioToggleBounds(this.width);
      this.hudGraphics.fillStyle(0x0b1427, 0.72);
      this.hudGraphics.fillRoundedRect(button.x, button.y, button.width, button.height, 17);
      this.hudGraphics.lineStyle(1, 0xffffff, 0.28);
      this.hudGraphics.strokeRoundedRect(button.x, button.y, button.width, button.height, 17);
      this.addHudText(button.x + button.width * 0.5, button.y + button.height * 0.5, RendererHelpers.getSoundToggleLabel(this.state.soundEnabled), 13, '#ffffff', 0.5, 0.5);
    }

    drawHeartBar() {
      for (let i = 0; i < this.state.maxLives; i += 1) {
        const position = getHeartSlotPosition(this.width, this.height, i);
        this.drawHeart(position.x, position.y, i < this.state.lives);
      }
    }

    drawHeart(x, y, filled) {
      this.hudGraphics.fillStyle(filled ? 0xff5f8f : 0x23304a, filled ? 0.95 : 0.72);
      this.hudGraphics.beginPath();
      this.hudGraphics.moveTo(x, y + 8);
      this.hudGraphics.lineTo(x - 12, y - 4);
      this.hudGraphics.lineTo(x - 6, y - 15);
      this.hudGraphics.lineTo(x, y - 9);
      this.hudGraphics.lineTo(x + 6, y - 15);
      this.hudGraphics.lineTo(x + 12, y - 4);
      this.hudGraphics.closePath();
      this.hudGraphics.fillPath();
    }

    drawItemBar() {
      const slots = getItemSlots(this.width, this.height, this.state.items);
      for (let i = 0; i < slots.length; i += 1) {
        const slot = slots[i];
        this.hudGraphics.fillStyle(0x0a1223, 0.72);
        this.hudGraphics.fillRoundedRect(slot.x, slot.y, slot.width, slot.height, 10);
        this.hudGraphics.lineStyle(1.5, slot.type === ITEM_TYPES.HEALTH_POTION ? 0xff77a4 : 0xa56cff, 0.86);
        this.hudGraphics.strokeRoundedRect(slot.x, slot.y, slot.width, slot.height, 10);
        const cx = slot.x + slot.width * 0.5;
        const cy = slot.y + slot.height * 0.5;
        this.hudGraphics.fillStyle(slot.type === ITEM_TYPES.HEALTH_POTION ? 0xff5f8f : 0x9f6bff, 0.92);
        this.hudGraphics.fillCircle(cx, cy, 15);
        if (slot.type === ITEM_TYPES.COMBO_CHAIN) {
          this.hudGraphics.lineStyle(3, 0xffffff, 0.9);
          this.hudGraphics.beginPath();
          this.hudGraphics.moveTo(cx - 3, cy - 14);
          this.hudGraphics.lineTo(cx + 4, cy - 2);
          this.hudGraphics.lineTo(cx - 1, cy - 1);
          this.hudGraphics.lineTo(cx + 3, cy + 14);
          this.hudGraphics.strokePath();
        }
        this.addHudText(slot.x + slot.width - 10, slot.y + 8, String(slot.count), 14, '#ffffff', 0.5, 0.5);
      }
    }

    drawComboCounter() {
      const label = RendererHelpers.getComboLabel(this.state.combo);
      if (!label) {
        return;
      }
      const tier = RendererHelpers.getComboTier(this.state.combo);
      const pulse = RendererHelpers.getComboPulse(this.state.combo, this.state.feedback);
      const x = this.width - 20;
      const y = 80 - pulse.lift;
      this.hudGraphics.fillStyle(0x091326, 0.72);
      this.hudGraphics.fillRoundedRect(x - 126 * tier.scale, y - 19, 118 * tier.scale, 34, 12);
      this.addHudText(x - 14, y - 1, label, Math.round(18 * tier.scale * pulse.scale), tier.color, 1, 0.5);
      if (tier.multiplierLabel) {
        this.addHudText(x - 22, y + 19, tier.multiplierLabel, 13, '#ffffff', 1, 0.5);
      }
    }

    drawOverlay(visibleLevel, visibleThemeId) {
      this.overlayLayer.removeAll(true);
      if (this.state.screen === SCREENS.TITLE) {
        this.drawDifficultyOverlay(RendererHelpers.GAME_TITLE, getTheme(visibleThemeId).name, '划箭头方向；V 和 L 照形状画', '选择难度开始游戏');
      } else if (this.state.screen === SCREENS.LEVEL_TRANSITION) {
        const copy = RendererHelpers.getTransitionCopy(visibleLevel, visibleThemeId);
        this.drawDifficultyOverlay(copy.title, copy.subtitle, copy.hint, '选择下一关难度');
      } else if (this.state.screen === SCREENS.WIN) {
        this.drawResultOverlay(RendererHelpers.getWinTitle(), '得分 ' + this.state.score, '点击再来一局', 0x143422);
      } else if (this.state.screen === SCREENS.LOSE) {
        this.drawResultOverlay('爱心耗尽', '得分 ' + this.state.score, '点击重试', 0x351927);
      }
    }

    drawDifficultyOverlay(title, subtitle, hint, prompt) {
      this.drawDimPanel();
      this.addOverlayText(this.width * 0.5, this.height * 0.27, title, 34, '#fff2ad');
      this.addOverlayText(this.width * 0.5, this.height * 0.335, subtitle, 21, '#ffdc6f');
      this.addOverlayText(this.width * 0.5, this.height * 0.39, hint, 16, '#d8f4ff');
      this.addOverlayText(this.width * 0.5, this.height * 0.46, prompt, 18, '#ffffff');
      const buttons = getDifficultyButtons(this.width, this.height);
      for (let i = 0; i < buttons.length; i += 1) {
        const button = buttons[i];
        const graphics = this.add.graphics();
        graphics.fillStyle(i === 0 ? 0xffd66d : 0x9f6bff, 0.88);
        graphics.fillRoundedRect(button.x, button.y, button.width, button.height, 14);
        graphics.lineStyle(2, 0xffffff, 0.42);
        graphics.strokeRoundedRect(button.x, button.y, button.width, button.height, 14);
        this.overlayLayer.add(graphics);
        this.addOverlayText(button.x + 18, button.y + button.height * 0.5, button.label, 18, '#10182a', 0, 0.5);
        this.addOverlayText(button.x + button.width - 18, button.y + button.height * 0.5, button.detail, 15, '#10182a', 1, 0.5);
      }
    }

    drawResultOverlay(title, subtitle, action, color) {
      this.drawDimPanel(color);
      this.addOverlayText(this.width * 0.5, this.height * 0.34, title, 36, '#fff2ad');
      this.addOverlayText(this.width * 0.5, this.height * 0.44, subtitle, 22, '#ffffff');
      this.addOverlayText(this.width * 0.5, this.height * 0.55, action, 18, '#d8f4ff');
    }

    drawDimPanel(color) {
      const graphics = this.add.graphics();
      graphics.fillStyle(color || 0x071127, 0.74);
      graphics.fillRect(0, 0, this.width, this.height);
      this.overlayLayer.add(graphics);
    }

    addOverlayText(x, y, text, fontSize, color, originX, originY) {
      const item = this.add.text(x, y, text, {
        fontFamily: FONT_FAMILY,
        fontSize: fontSize + 'px',
        color,
        stroke: '#071127',
        strokeThickness: 4
      }).setOrigin(originX === undefined ? 0.5 : originX, originY === undefined ? 0.5 : originY);
      this.overlayLayer.add(item);
      return item;
    }
  };
}

module.exports = createSpellGameScene;

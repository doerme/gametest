'use strict';

const { LABELS, SYMBOLS } = require('../input/GestureRecognizer');
const { SCREENS } = require('../core/GameState');
const { THEME_IDS, getTheme } = require('../levels/Themes');
const { DIFFICULTY_MODES, getDifficultyButtons } = require('../ui/DifficultySelector');
const { getAudioToggleBounds } = require('../ui/AudioToggle');

const ENEMY_ASSET_KEYS = {
  jellyfish: 'enemyJellyfish',
  pufferfish: 'enemyPufferfish',
  shark: 'enemyShark',
  megalodon: 'bossMegalodon',
  penguinBellhop: 'enemyPenguinBellhop',
  penguinChef: 'enemyPenguinChef',
  emperorPenguin: 'bossEmperorPenguin',
  pterosaur: 'enemyPterosaur',
  triceratops: 'enemyTriceratops',
  brachiosaurus: 'enemyBrachiosaurus',
  tyrannosaurus: 'bossTyrannosaurus'
};

const SYMBOL_ICON_ASSET_KEYS = {
  [SYMBOLS.UP]: 'symbolUp',
  [SYMBOLS.DOWN]: 'symbolDown',
  [SYMBOLS.LEFT]: 'symbolLeft',
  [SYMBOLS.RIGHT]: 'symbolRight',
  [SYMBOLS.V]: 'symbolV',
  [SYMBOLS.L]: 'symbolL',
  [SYMBOLS.CIRCLE]: 'symbolCircle',
  [SYMBOLS.Z]: 'symbolZ'
};

const ENEMY_SPRITE = {
  frames: 3,
  fps: 6,
  phaseSpeed: 4
};

function getEnemySpriteFrame(phase) {
  const animationTime = (phase || 0) / ENEMY_SPRITE.phaseSpeed;
  return Math.floor(animationTime * ENEMY_SPRITE.fps) % ENEMY_SPRITE.frames;
}

const HERO_SPRITE = {
  frameWidth: 128,
  frameHeight: 128,
  animations: {
    walk: {
      assetKey: 'catWalk',
      frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      fps: 12
    },
    cast: {
      assetKey: 'catCast',
      frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      fps: 16
    },
    hurt: {
      assetKey: 'catHurt',
      frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      fps: 14
    }
  }
};

function getHeroSpriteAnimation(animation, isDrawing) {
  if (animation && animation.hurt > 0) {
    return 'hurt';
  }
  if (isDrawing || (animation && animation.cast > 0)) {
    return 'cast';
  }
  return 'walk';
}

function getHeroSpriteFrame(elapsed, animation, isDrawing) {
  const animationName = getHeroSpriteAnimation(animation, isDrawing);
  const track = HERO_SPRITE.animations[animationName];
  let animationTime = elapsed || 0;

  if (animationName === 'hurt') {
    animationTime = animation.hurtAge || 0;
  } else if (animationName === 'cast' && animation && animation.cast > 0) {
    animationTime = animation.castAge || 0;
  }

  const frameIndex = Math.floor(animationTime * track.fps) % track.frames.length;
  return track.frames[frameIndex];
}

function getSymbolIndicators(enemy) {
  if (enemy.symbolDisplay !== 'current-and-dots') {
    return enemy.symbols.map((symbol) => ({ type: 'symbol', symbol }));
  }

  if (enemy.symbols.length > 5) {
    return [
      { type: 'symbol', symbol: enemy.symbols[0] },
      { type: 'count', count: enemy.symbols.length - 1 }
    ];
  }

  return enemy.symbols.map((symbol, index) => (
    index === 0 ? { type: 'symbol', symbol } : { type: 'dot' }
  ));
}

function getLevelLabel(state, visibleLevel) {
  const difficultyLabel = state.screen !== SCREENS.LEVEL_TRANSITION && state.difficulty === DIFFICULTY_MODES.PLUS_ONE ? '  +1' : '';
  return '第 ' + (visibleLevel || state.level) + '/' + state.totalLevels + ' 关' + difficultyLabel;
}

function getComboLabel(combo) {
  return combo > 0 ? '连击 x' + combo : '';
}

function getComboTier(combo) {
  if (combo >= 100) {
    return {
      color: '#ffc2ff',
      glow: 'rgba(255, 105, 255, 0.92)',
      background: 'rgba(86, 15, 94, 0.78)',
      multiplierLabel: '4.0x',
      scale: 1.44
    };
  }
  if (combo >= 50) {
    return {
      color: '#92edff',
      glow: 'rgba(71, 218, 255, 0.9)',
      background: 'rgba(13, 65, 92, 0.76)',
      multiplierLabel: '3.0x',
      scale: 1.32
    };
  }
  if (combo >= 20) {
    return {
      color: '#ff83bc',
      glow: 'rgba(255, 81, 154, 0.9)',
      background: 'rgba(101, 20, 61, 0.72)',
      multiplierLabel: '2.5x',
      scale: 1.22
    };
  }
  if (combo >= 10) {
    return {
      color: '#ff8f70',
      glow: 'rgba(255, 108, 89, 0.85)',
      background: 'rgba(105, 28, 28, 0.66)',
      multiplierLabel: '2.0x',
      scale: 1.14
    };
  }
  if (combo >= 5) {
    return {
      color: '#ffb451',
      glow: 'rgba(255, 164, 55, 0.82)',
      background: 'rgba(92, 53, 19, 0.62)',
      multiplierLabel: '1.5x',
      scale: 1.08
    };
  }
  if (combo >= 3) {
    return {
      color: '#ffe06e',
      glow: 'rgba(255, 220, 111, 0.78)',
      background: 'rgba(75, 57, 17, 0.58)',
      multiplierLabel: '1.2x',
      scale: 1.04
    };
  }
  return {
    color: '#ffdc6f',
    glow: 'rgba(255, 220, 111, 0.62)',
    background: 'rgba(8, 13, 25, 0.5)',
    multiplierLabel: '',
    scale: 1
  };
}

function getComboPulse(combo, feedback) {
  const duration = 0.48;
  if (!feedback || feedback.type !== 'hit' || feedback.combo !== combo || feedback.age >= duration) {
    return { burst: 0, scale: 1, lift: 0 };
  }

  const progress = Math.max(0, feedback.age) / duration;
  const burst = 1 - progress;
  return {
    burst,
    scale: 1 + burst * 0.2 + Math.sin(progress * Math.PI) * burst * 0.08,
    lift: burst * 3
  };
}

function getSoundToggleLabel(enabled) {
  return enabled ? '声音 开' : '声音 关';
}

function getHeartSlotPosition(width, heartIndex) {
  return {
    x: width - 28 - heartIndex * 26,
    y: 31
  };
}

function getComboTargets(effect) {
  return effect.targets || [];
}

function getTransitionCopy(visibleLevel, themeId) {
  const title = getTheme(themeId).name;
  if (visibleLevel === 4) {
    return { title, hint: '第四关 · 新增符咒：Z' };
  }
  if (visibleLevel === 3) {
    return { title, hint: '第三关 · 新增符咒：○' };
  }
  return { title, hint: '第二关 · 符咒队列仅显示当前符号' };
}

function getWinTitle() {
  return '四关通关';
}

class Renderer {
  constructor(ctx, canvas, assets) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.assets = assets;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
  }

  render(state, input) {
    const ctx = this.ctx;
    const visibleLevel = state.screen === SCREENS.LEVEL_TRANSITION ? Math.min(state.level + 1, state.totalLevels) : state.level;
    const visibleThemeId = state.getThemeId ? state.getThemeId(visibleLevel) : THEME_IDS.CASTLE;
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground(state.elapsed, visibleThemeId);
    this.drawRunes(state.elapsed, visibleThemeId);
    this.drawEnemies(state.enemies);
    this.drawHero(state.hero, state.elapsed, state.heroAnimation, input && input.isDrawing);
    this.drawEffects(state.effects);
    this.drawGesture(input.currentPath);
    this.drawHud(state, visibleLevel);

    if (state.screen === SCREENS.TITLE) {
      this.drawDifficultyOverlay(getTheme(visibleThemeId).name, '划箭头方向；V 和 L 照形状画', '选择难度开始游戏');
    } else if (state.screen === SCREENS.LEVEL_TRANSITION) {
      const copy = getTransitionCopy(visibleLevel, visibleThemeId);
      this.drawDifficultyOverlay(copy.title, copy.hint, '选择本关难度');
    } else if (state.screen === SCREENS.WIN) {
      this.drawOverlay(getWinTitle(), '得分 ' + state.score, '点击再来一局');
    } else if (state.screen === SCREENS.LOSE) {
      this.drawOverlay('爱心耗尽', '得分 ' + state.score, '点击重试');
    }

    this.drawAudioToggle(state.soundEnabled);
  }

  drawBackground(elapsed, themeId) {
    const ctx = this.ctx;
    const scroll = (elapsed || 0) * 68;
    const theme = getTheme(themeId);
    if (theme.id === THEME_IDS.DINOSAUR_PARK) {
      const dinosaurCorridor = this.assets && this.assets.getImage(theme.backgroundAsset);
      if (dinosaurCorridor) {
        this.drawScrollingDinosaurBackground(dinosaurCorridor, elapsed || 0);
      } else {
        this.drawFallbackDinosaurBackground(scroll);
      }
      return;
    }

    if (theme.id === THEME_IDS.PENGUIN_HOTEL) {
      const penguinCorridor = this.assets && this.assets.getImage(theme.backgroundAsset);
      if (penguinCorridor) {
        this.drawScrollingPenguinBackground(penguinCorridor, elapsed || 0);
      } else {
        this.drawFallbackPenguinBackground(scroll);
      }
      return;
    }

    if (theme.id === THEME_IDS.OCEAN) {
      const oceanCorridor = this.assets && this.assets.getImage(theme.backgroundAsset);
      if (oceanCorridor) {
        this.drawScrollingOceanBackground(oceanCorridor, elapsed || 0);
      } else {
        this.drawFallbackOceanBackground(scroll);
      }
      return;
    }

    const castleCorridor = this.assets && this.assets.getImage(theme.backgroundAsset);
    if (castleCorridor) {
      this.drawScrollingCastleBackground(castleCorridor, elapsed || 0);
      return;
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#101b32');
    gradient.addColorStop(0.56, '#243552');
    gradient.addColorStop(1, '#3a2d47');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = 'rgba(245, 232, 185, 0.12)';
    for (let i = 0; i < 28; i += 1) {
      const x = (i * 83) % this.width;
      const y = ((i * 137 + scroll * 0.32) % Math.floor(this.height * 0.64));
      ctx.beginPath();
      ctx.arc(x, y, (i % 3) + 1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255, 221, 139, 0.1)';
    ctx.lineWidth = 2;
    for (let i = -2; i < 14; i += 1) {
      const y = (i * 58 + scroll) % (this.height + 80);
      ctx.beginPath();
      ctx.moveTo(this.width * 0.18, y);
      ctx.lineTo(this.width * 0.82, y + Math.sin(i) * 8);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(139, 242, 255, 0.08)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.width * 0.28, 0);
    ctx.lineTo(this.width * 0.44, this.height);
    ctx.moveTo(this.width * 0.72, 0);
    ctx.lineTo(this.width * 0.56, this.height);
    ctx.stroke();

    ctx.fillStyle = '#1a2438';
    ctx.fillRect(0, this.height * 0.82, this.width, this.height * 0.18);
    ctx.strokeStyle = 'rgba(255, 221, 139, 0.18)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      const y = this.height * 0.82 + ((i * 24 + scroll * 1.15) % (this.height * 0.18 + 24));
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y + Math.sin(i) * 8);
      ctx.stroke();
    }
  }

  drawScrollingCastleBackground(image, elapsed) {
    const ctx = this.ctx;
    const sourceTop = 0;
    const sourceHeight = image.height;
    const tileHeight = Math.ceil(this.width * sourceHeight / image.width);
    const seamBlendHeight = Math.max(8, Math.min(12, Math.floor(tileHeight * 0.018)));
    const stride = tileHeight - seamBlendHeight;
    const offset = Math.floor((elapsed * 112) % stride);
    const firstTileY = offset - stride;

    ctx.save();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.drawImage(image, 0, sourceTop, image.width, sourceHeight, 0, firstTileY, this.width, tileHeight + 1);
    for (let y = firstTileY + stride; y < this.height; y += stride) {
      this.drawCastleTileWithSeamBlend(image, sourceTop, sourceHeight, y, tileHeight, seamBlendHeight);
    }
    ctx.restore();

    const shadow = ctx.createLinearGradient(0, 0, 0, this.height);
    shadow.addColorStop(0, 'rgba(5, 9, 20, 0.2)');
    shadow.addColorStop(0.42, 'rgba(5, 9, 20, 0.03)');
    shadow.addColorStop(1, 'rgba(5, 9, 20, 0.18)');
    ctx.fillStyle = shadow;
    ctx.fillRect(0, 0, this.width, this.height);

    const torchRows = [0.22, 0.48, 0.74, 0.98];
    for (let tileY = firstTileY; tileY < this.height; tileY += stride) {
      for (let i = 0; i < torchRows.length; i += 1) {
        const y = tileY + tileHeight * torchRows[i];
        this.drawTorchGlow(this.width * 0.17, y, elapsed, i * 1.3);
        this.drawTorchGlow(this.width * 0.83, y, elapsed, i * 1.3 + 0.8);
      }
    }
  }

  drawCastleTileWithSeamBlend(image, sourceTop, sourceHeight, y, tileHeight, blendHeight) {
    const ctx = this.ctx;
    const sourceBlendHeight = sourceHeight * blendHeight / tileHeight;

    ctx.drawImage(
      image,
      0,
      sourceTop + sourceBlendHeight,
      image.width,
      sourceHeight - sourceBlendHeight,
      0,
      y + blendHeight,
      this.width,
      tileHeight - blendHeight + 1
    );

    ctx.save();
    for (let top = 0; top < blendHeight; top += 1) {
      const progress = (top + 0.5) / blendHeight;
      ctx.globalAlpha = progress * progress * (3 - 2 * progress);
      ctx.drawImage(
        image,
        0,
        sourceTop + sourceHeight * top / tileHeight,
        image.width,
        sourceHeight / tileHeight,
        0,
        y + top,
        this.width,
        1
      );
    }
    ctx.restore();
  }

  drawScrollingOceanBackground(image, elapsed) {
    const ctx = this.ctx;
    const tileHeight = Math.ceil(this.width * image.height / image.width);
    const seamBlendHeight = Math.max(8, Math.min(14, Math.floor(tileHeight * 0.018)));
    const stride = tileHeight - seamBlendHeight;
    const offset = Math.floor((elapsed * 118) % stride);
    const firstTileY = offset - stride;

    ctx.save();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.drawImage(image, 0, firstTileY, this.width, tileHeight + 1);
    for (let y = firstTileY + stride; y < this.height; y += stride) {
      this.drawCastleTileWithSeamBlend(image, 0, image.height, y, tileHeight, seamBlendHeight);
    }
    ctx.restore();

    const waterLight = ctx.createLinearGradient(0, 0, this.width, this.height);
    waterLight.addColorStop(0, 'rgba(0, 203, 232, 0.12)');
    waterLight.addColorStop(0.48, 'rgba(2, 42, 80, 0.03)');
    waterLight.addColorStop(1, 'rgba(22, 167, 203, 0.13)');
    ctx.fillStyle = waterLight;
    ctx.fillRect(0, 0, this.width, this.height);

    for (let i = 0; i < 5; i += 1) {
      const y = ((i * 176 + elapsed * 36) % (this.height + 90)) - 45;
      ctx.strokeStyle = 'rgba(93, 238, 255, ' + (0.06 + (i % 2) * 0.025) + ')';
      ctx.lineWidth = 10 + i * 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.quadraticCurveTo(this.width * 0.5, y + 32, this.width, y - 6);
      ctx.stroke();
    }
  }

  drawFallbackOceanBackground(scroll) {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#062b48');
    gradient.addColorStop(0.45, '#084e69');
    gradient.addColorStop(1, '#031d39');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = 'rgba(31, 202, 220, 0.16)';
    ctx.fillRect(0, 0, this.width * 0.16, this.height);
    ctx.fillRect(this.width * 0.84, 0, this.width * 0.16, this.height);
    ctx.strokeStyle = 'rgba(150, 250, 255, 0.2)';
    ctx.lineWidth = 3;
    for (let i = -1; i < 12; i += 1) {
      const y = (i * 78 + scroll) % (this.height + 80);
      ctx.beginPath();
      ctx.moveTo(this.width * 0.19, y);
      ctx.lineTo(this.width * 0.81, y);
      ctx.stroke();
    }
  }

  drawScrollingPenguinBackground(image, elapsed) {
    const ctx = this.ctx;
    const tileHeight = Math.ceil(this.width * image.height / image.width);
    const seamBlendHeight = Math.max(8, Math.min(14, Math.floor(tileHeight * 0.018)));
    const stride = tileHeight - seamBlendHeight;
    const offset = Math.floor((elapsed * 124) % stride);
    const firstTileY = offset - stride;

    ctx.save();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.drawImage(image, 0, firstTileY, this.width, tileHeight + 1);
    for (let y = firstTileY + stride; y < this.height; y += stride) {
      this.drawCastleTileWithSeamBlend(image, 0, image.height, y, tileHeight, seamBlendHeight);
    }
    ctx.restore();

    const aurora = ctx.createLinearGradient(0, 0, this.width, this.height);
    aurora.addColorStop(0, 'rgba(76, 240, 245, 0.12)');
    aurora.addColorStop(0.45, 'rgba(109, 214, 255, 0.02)');
    aurora.addColorStop(1, 'rgba(190, 117, 251, 0.13)');
    ctx.fillStyle = aurora;
    ctx.fillRect(0, 0, this.width, this.height);

    for (let i = 0; i < 4; i += 1) {
      const y = ((i * 206 + elapsed * 40) % (this.height + 120)) - 60;
      ctx.strokeStyle = 'rgba(158, 248, 248, ' + (0.07 + i * 0.012) + ')';
      ctx.lineWidth = 9 + i * 2;
      ctx.beginPath();
      ctx.moveTo(this.width * 0.06, y);
      ctx.bezierCurveTo(this.width * 0.28, y - 25, this.width * 0.7, y + 40, this.width * 0.94, y + 4);
      ctx.stroke();
    }
  }

  drawFallbackPenguinBackground(scroll) {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#153f66');
    gradient.addColorStop(0.47, '#d2f5f6');
    gradient.addColorStop(1, '#275479');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = 'rgba(142, 231, 244, 0.26)';
    ctx.fillRect(0, 0, this.width * 0.18, this.height);
    ctx.fillRect(this.width * 0.82, 0, this.width * 0.18, this.height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.lineWidth = 3;
    for (let i = -1; i < 12; i += 1) {
      const y = (i * 74 + scroll * 1.2) % (this.height + 80);
      ctx.beginPath();
      ctx.moveTo(this.width * 0.2, y);
      ctx.lineTo(this.width * 0.8, y);
      ctx.stroke();
    }
  }

  drawScrollingDinosaurBackground(image, elapsed) {
    const ctx = this.ctx;
    const tileHeight = Math.ceil(this.width * image.height / image.width);
    const seamBlendHeight = Math.max(8, Math.min(14, Math.floor(tileHeight * 0.018)));
    const stride = tileHeight - seamBlendHeight;
    const offset = Math.floor((elapsed * 128) % stride);
    const firstTileY = offset - stride;

    ctx.save();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.drawImage(image, 0, firstTileY, this.width, tileHeight + 1);
    for (let y = firstTileY + stride; y < this.height; y += stride) {
      this.drawCastleTileWithSeamBlend(image, 0, image.height, y, tileHeight, seamBlendHeight);
    }
    ctx.restore();

    const jungleLight = ctx.createLinearGradient(0, 0, this.width, this.height);
    jungleLight.addColorStop(0, 'rgba(87, 185, 76, 0.14)');
    jungleLight.addColorStop(0.45, 'rgba(245, 196, 71, 0.03)');
    jungleLight.addColorStop(1, 'rgba(37, 87, 51, 0.16)');
    ctx.fillStyle = jungleLight;
    ctx.fillRect(0, 0, this.width, this.height);

    for (let i = 0; i < 4; i += 1) {
      const y = ((i * 196 + elapsed * 44) % (this.height + 120)) - 60;
      ctx.strokeStyle = 'rgba(245, 203, 86, ' + (0.06 + i * 0.012) + ')';
      ctx.lineWidth = 8 + i * 2;
      ctx.beginPath();
      ctx.moveTo(this.width * 0.08, y);
      ctx.bezierCurveTo(this.width * 0.28, y + 22, this.width * 0.7, y - 25, this.width * 0.92, y + 8);
      ctx.stroke();
    }
  }

  drawFallbackDinosaurBackground(scroll) {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#173f32');
    gradient.addColorStop(0.46, '#46743c');
    gradient.addColorStop(1, '#172f27');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = 'rgba(26, 75, 43, 0.52)';
    ctx.fillRect(0, 0, this.width * 0.18, this.height);
    ctx.fillRect(this.width * 0.82, 0, this.width * 0.18, this.height);
    ctx.strokeStyle = 'rgba(232, 181, 73, 0.22)';
    ctx.lineWidth = 3;
    for (let i = -1; i < 12; i += 1) {
      const y = (i * 76 + scroll * 1.26) % (this.height + 80);
      ctx.beginPath();
      ctx.moveTo(this.width * 0.19, y);
      ctx.lineTo(this.width * 0.81, y);
      ctx.stroke();
    }
  }

  drawTorchGlow(x, y, elapsed, phase) {
    const ctx = this.ctx;
    const flicker = 0.88 + Math.sin(elapsed * 9 + phase) * 0.08;
    const radius = this.width * 0.17 * flicker;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, 'rgba(255, 172, 70, 0.18)');
    glow.addColorStop(0.45, 'rgba(255, 145, 54, 0.08)');
    glow.addColorStop(1, 'rgba(255, 145, 54, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  drawRunes(elapsed, themeId) {
    const ctx = this.ctx;
    const drift = ((elapsed || 0) * 42) % 34;
    ctx.save();
    ctx.translate(this.width * 0.5, this.height * 0.74 + Math.sin((elapsed || 0) * 2) * 1.5);
    ctx.strokeStyle = getTheme(themeId).runeColor;
    ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i += 1) {
      ctx.beginPath();
      ctx.arc(0, drift * 0.12, i * 34 + drift * 0.06, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawHero(hero, elapsed, animation, isDrawing) {
    const motion = this.getHeroMotion(hero, elapsed, animation, isDrawing);
    this.drawCastingAura(hero, elapsed, animation, isDrawing);
    const spriteAnimation = HERO_SPRITE.animations[getHeroSpriteAnimation(animation, isDrawing)];
    const image = this.assets && (
      this.assets.getImage(spriteAnimation.assetKey) || this.assets.getImage('catWalk')
    );
    if (image) {
      this.drawCatHero(hero, elapsed, image, motion, animation, isDrawing);
      return;
    }

    this.drawFallbackHero(hero, elapsed, motion);
  }

  getHeroMotion(hero, elapsed, animation, isDrawing) {
    const castTime = animation ? animation.cast : 0;
    const hurtTime = animation ? animation.hurt : 0;
    const castPower = isDrawing ? 1 : Math.min(1, castTime / 0.2);
    return {
      x: hero.x + (hurtTime > 0 ? Math.sin(hurtTime * 74) * hero.radius * 0.16 : 0),
      y: hero.y + Math.sin(elapsed * 5) * 2 - castPower * hero.radius * 0.1,
      rotation: hurtTime > 0 ? Math.sin(hurtTime * 48) * 0.11 : -castPower * 0.045,
      scale: 1 + castPower * 0.06,
      flash: hurtTime > 0 && Math.floor(hurtTime * 30) % 2 === 0
    };
  }

  drawCastingAura(hero, elapsed, animation, isDrawing) {
    const castTime = animation ? animation.cast : 0;
    if (!isDrawing && castTime <= 0) {
      return;
    }

    const ctx = this.ctx;
    const strength = isDrawing ? 1 : Math.min(1, castTime / 0.28);
    const pulse = 1 + Math.sin(elapsed * 18) * 0.08;
    const orbX = hero.x + hero.radius * 0.8;
    const orbY = hero.y - hero.radius * 0.85;

    ctx.save();
    ctx.globalAlpha = 0.32 + strength * 0.56;
    ctx.strokeStyle = '#8bf2ff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#8bf2ff';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(orbX, orbY, hero.radius * 0.38 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#fff1a8';
    ctx.beginPath();
    ctx.arc(orbX, orbY, hero.radius * 0.12 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(139, 242, 255, 0.52)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hero.x, hero.y + hero.radius * 0.48, hero.radius * (1.12 + 0.08 * pulse), Math.PI * 0.08, Math.PI * 0.92);
    ctx.stroke();
    ctx.restore();
  }

  drawCatHero(hero, elapsed, image, motion, animation, isDrawing) {
    const ctx = this.ctx;
    const frame = getHeroSpriteFrame(elapsed, animation, isDrawing);
    const drawSize = hero.radius * 3.5;

    ctx.save();
    ctx.translate(motion.x, motion.y - hero.radius * 0.12);
    ctx.rotate(motion.rotation);
    ctx.scale(motion.scale, motion.scale);
    ctx.globalAlpha = motion.flash ? 0.55 : 1;
    ctx.drawImage(
      image,
      frame * HERO_SPRITE.frameWidth,
      0,
      HERO_SPRITE.frameWidth,
      HERO_SPRITE.frameHeight,
      -drawSize / 2,
      -drawSize / 2,
      drawSize,
      drawSize
    );
    ctx.restore();
  }

  drawFallbackHero(hero, elapsed, motion) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(motion.x, motion.y);
    ctx.rotate(motion.rotation);
    ctx.scale(motion.scale, motion.scale);
    ctx.globalAlpha = motion.flash ? 0.55 : 1;

    ctx.fillStyle = '#26204a';
    ctx.beginPath();
    ctx.moveTo(0, -hero.radius * 1.55);
    ctx.lineTo(-hero.radius * 0.88, -hero.radius * 0.2);
    ctx.lineTo(hero.radius * 0.88, -hero.radius * 0.2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f0d99f';
    ctx.beginPath();
    ctx.arc(0, 0, hero.radius * 0.72, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#27314e';
    ctx.beginPath();
    ctx.arc(-hero.radius * 0.22, -hero.radius * 0.05, 3, 0, Math.PI * 2);
    ctx.arc(hero.radius * 0.22, -hero.radius * 0.05, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffdf73';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(hero.radius * 0.6, -hero.radius * 0.2);
    ctx.lineTo(hero.radius * 1.4, -hero.radius * 1.2);
    ctx.stroke();

    ctx.restore();
  }

  drawEffects(effects) {
    if (!effects) {
      return;
    }

    for (let i = 0; i < effects.length; i += 1) {
      const effect = effects[i];
      if (effect.type === 'cast') {
        this.drawCastEffect(effect);
      } else if (effect.type === 'impact') {
        this.drawImpactEffect(effect);
      } else if (effect.type === 'vanish') {
        this.drawVanishEffect(effect);
      } else if (effect.type === 'lightning') {
        this.drawLightningEffect(effect);
      } else if (effect.type === 'comboChain') {
        this.drawComboChainEffect(effect);
      } else if (effect.type === 'heartLoss') {
        this.drawHeartLossEffect(effect);
      } else if (effect.type === 'potionToHeart') {
        this.drawPotionToHeartEffect(effect);
      }
    }
  }

  drawCastEffect(effect) {
    const ctx = this.ctx;
    const progress = effect.age / effect.duration;
    const alpha = Math.max(0, 1 - progress);
    const radius = effect.radius * (0.42 + progress * 1.04);

    ctx.save();
    ctx.translate(effect.x, effect.y - progress * effect.radius * 0.32);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#8bf2ff';
    ctx.lineWidth = 3 - progress;
    ctx.shadowColor = '#8bf2ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#fff1a8';
    ctx.font = 'bold ' + Math.floor(effect.radius * (0.55 + progress * 0.2)) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(LABELS[effect.symbol] || '?', 0, 1);
    ctx.restore();
  }

  drawImpactEffect(effect) {
    const ctx = this.ctx;
    const progress = effect.age / effect.duration;
    const alpha = Math.max(0, 1 - progress);
    const radius = effect.radius * (0.5 + progress * 1.7);

    ctx.save();
    ctx.translate(effect.x, effect.y);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#ff6f72';
    ctx.fillStyle = 'rgba(255, 116, 91, 0.24)';
    ctx.lineWidth = 5 - progress * 3;
    ctx.shadowColor = '#ff704d';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < 8; i += 1) {
      const angle = i * Math.PI / 4 + 0.18;
      const inner = radius * 0.76;
      const outer = radius * (1.18 + progress * 0.26);
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawVanishEffect(effect) {
    const ctx = this.ctx;
    const progress = effect.age / effect.duration;
    const alpha = Math.max(0, 1 - progress);
    const color = effect.kind === 'boss' ? '#d6a6ff' : (effect.kind === 'potion' ? '#ff8fa8' : '#c6f6ff');
    const ringRadius = effect.radius * (0.74 + progress * 1.55);

    ctx.save();
    ctx.translate(effect.x, effect.y);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4 - progress * 2.4;
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * Math.PI * 2 + progress * 0.8;
      const distance = effect.radius * (0.4 + progress * (1.2 + (i % 3) * 0.18));
      const dotRadius = Math.max(1, effect.radius * 0.11 * (1 - progress));
      ctx.fillStyle = i % 2 === 0 ? color : '#ffdc6f';
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * distance, Math.sin(angle) * distance, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawLightningEffect(effect) {
    const ctx = this.ctx;
    const progress = Math.max(0, Math.min(1, effect.age / effect.duration));
    const alpha = Math.max(0, 1 - progress);
    const dx = effect.toX - effect.fromX;
    const dy = effect.toY - effect.fromY;
    const length = Math.max(1, Math.hypot(dx, dy));
    const normalX = -dy / length;
    const normalY = dx / length;
    const points = [];

    for (let i = 0; i <= 5; i += 1) {
      const t = i / 5;
      const crackle = i === 0 || i === 5 ? 0 : (i % 2 === 0 ? -1 : 1) * (8 + effect.radius * 0.16) * (1 - progress * 0.45);
      points.push({
        x: effect.fromX + dx * t + normalX * crackle,
        y: effect.fromY + dy * t + normalY * crackle
      });
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#8bf2ff';
    ctx.shadowBlur = 18;
    ctx.strokeStyle = 'rgba(139, 242, 255, 0.82)';
    ctx.lineWidth = 9 - progress * 5;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    ctx.shadowBlur = 7;
    ctx.strokeStyle = '#fff8b7';
    ctx.lineWidth = 3.2 - progress * 1.6;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    ctx.fillStyle = '#fff8b7';
    ctx.beginPath();
    ctx.arc(effect.toX, effect.toY, effect.radius * (0.18 + progress * 0.28), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawComboChainEffect(effect) {
    const ctx = this.ctx;
    const progress = Math.max(0, Math.min(1, effect.age / effect.duration));
    const alpha = Math.max(0, 1 - progress);
    const originX = effect.originX;
    const originY = effect.originY;
    const targets = getComboTargets(effect);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#d7a2ff';
    ctx.shadowBlur = 20;

    for (let i = 0; i < targets.length; i += 1) {
      const target = targets[i];
      const dx = target.x - originX;
      const dy = target.y - originY;
      const length = Math.max(1, Math.hypot(dx, dy));
      const normalX = -dy / length;
      const normalY = dx / length;
      const wobble = (i % 2 === 0 ? 1 : -1) * (10 + i * 1.5) * (1 - progress * 0.4);
      ctx.strokeStyle = 'rgba(204, 143, 255, 0.9)';
      ctx.lineWidth = 8 - progress * 3.5;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(originX + dx * 0.3 + normalX * wobble, originY + dy * 0.3 + normalY * wobble);
      ctx.lineTo(originX + dx * 0.66 - normalX * wobble * 0.6, originY + dy * 0.66 - normalY * wobble * 0.6);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();

      ctx.shadowBlur = 8;
      ctx.fillStyle = '#f3dcff';
      ctx.beginPath();
      ctx.arc(target.x, target.y, Math.max(3, target.radius * 0.14), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawPotionToHeartEffect(effect) {
    const ctx = this.ctx;
    const progress = Math.max(0, Math.min(1, effect.age / effect.duration));
    const eased = 1 - Math.pow(1 - progress, 3);
    const target = getHeartSlotPosition(this.width, effect.heartIndex);
    const arcLift = Math.sin(progress * Math.PI) * Math.max(28, this.height * 0.08);
    const x = effect.x + (target.x - effect.x) * eased;
    const y = effect.y + (target.y - effect.y) * eased - arcLift;
    const scale = 1 - eased * 0.58;
    const sparkle = Math.max(0, (progress - 0.68) / 0.32);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, progress - 0.82) / 0.18);
    this.drawHealthPotion({
      radius: effect.radius,
      phase: progress * Math.PI * 4
    });
    ctx.restore();

    if (sparkle > 0) {
      ctx.save();
      ctx.translate(target.x, target.y);
      ctx.globalAlpha = 1 - sparkle;
      ctx.strokeStyle = '#ffdf73';
      ctx.lineWidth = 2.4;
      ctx.shadowColor = '#ff6f91';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, 0, 13 + sparkle * 17, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawHeartLossEffect(effect) {
    const ctx = this.ctx;
    const progress = Math.max(0, Math.min(1, effect.age / effect.duration));
    const target = getHeartSlotPosition(this.width, effect.heartIndex);
    const direction = effect.burstCount > 1 && effect.burstIndex % 2 === 1 ? 1 : -1;
    const driftX = direction * progress * (8 + effect.burstIndex * 2);
    const driftY = progress * 28;
    const rotation = direction * progress * 0.52;

    ctx.save();
    ctx.translate(target.x + driftX, target.y + driftY);
    ctx.rotate(rotation);
    ctx.globalAlpha = Math.max(0, 1 - progress);
    ctx.shadowColor = '#ff704d';
    ctx.shadowBlur = 10;
    this.drawHeart(0, 0, true);

    ctx.strokeStyle = '#fff1a8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-3, -9);
    ctx.lineTo(2, -2);
    ctx.lineTo(-1, 4);
    ctx.lineTo(4, 10);
    ctx.stroke();
    ctx.restore();
  }

  drawEnemies(enemies) {
    for (let i = 0; i < enemies.length; i += 1) {
      this.drawEnemy(enemies[i]);
    }
  }

  drawEnemy(enemy) {
    const ctx = this.ctx;
    const wobble = Math.sin(enemy.phase) * 3;
    const frame = getEnemySpriteFrame(enemy.phase);

    ctx.save();
    ctx.translate(enemy.x, enemy.y + wobble);
    ctx.globalAlpha = enemy.hitFlash > 0 ? 0.58 : 1;

    const assetKey = ENEMY_ASSET_KEYS[enemy.species];
    const image = assetKey && this.assets && this.assets.getImage(assetKey);
    if (enemy.kind === 'potion') {
      this.drawHealthPotion(enemy);
    } else if (image) {
      this.drawEnemyImage(enemy, image, frame);
    } else if (enemy.species === 'ghost') {
      this.drawGhostEnemy(enemy, frame);
    } else if (enemy.species.indexOf('penguin') !== -1 || enemy.species === 'emperorPenguin') {
      this.drawPenguinEnemyFallback(enemy);
    } else if (enemy.species === 'pterosaur' || enemy.species === 'triceratops' || enemy.species === 'brachiosaurus' || enemy.species === 'tyrannosaurus') {
      this.drawDinosaurEnemyFallback(enemy);
    } else {
      this.drawMarineEnemyFallback(enemy);
    }

    this.drawSymbolQueue(enemy);
    ctx.restore();
  }

  drawHealthPotion(enemy) {
    const ctx = this.ctx;
    const r = enemy.radius;
    const pulse = 1 + Math.sin(enemy.phase * 1.5) * 0.04;

    ctx.save();
    ctx.scale(pulse, pulse);
    ctx.shadowColor = '#ff6f91';
    ctx.shadowBlur = 16;

    ctx.fillStyle = '#f4e8ff';
    ctx.beginPath();
    ctx.roundRect(-r * 0.3, -r * 0.9, r * 0.6, r * 0.27, [4]);
    ctx.fill();

    ctx.fillStyle = '#f8b4d2';
    ctx.beginPath();
    ctx.roundRect(-r * 0.42, -r * 0.67, r * 0.84, r * 1.2, [10]);
    ctx.fill();

    ctx.fillStyle = '#e54066';
    ctx.beginPath();
    ctx.roundRect(-r * 0.34, -r * 0.34, r * 0.68, r * 0.76, [8]);
    ctx.fill();

    ctx.fillStyle = '#fff2c2';
    ctx.beginPath();
    ctx.moveTo(0, r * 0.2);
    ctx.bezierCurveTo(-r * 0.38, -r * 0.08, -r * 0.22, -r * 0.34, 0, -r * 0.16);
    ctx.bezierCurveTo(r * 0.22, -r * 0.34, r * 0.38, -r * 0.08, 0, r * 0.2);
    ctx.fill();
    ctx.restore();
  }

  drawEnemyImage(enemy, image, frame) {
    const sizeMultiplier = enemy.kind === 'boss' ? 3.15 : 2.7;
    const size = enemy.radius * sizeMultiplier;
    const frameSize = image.height;
    this.ctx.drawImage(
      image,
      (frame || 0) * frameSize,
      0,
      frameSize,
      frameSize,
      -size / 2,
      -size / 2,
      size,
      size
    );
  }

  drawGhostEnemy(enemy, frame) {
    const ctx = this.ctx;
    const r = enemy.radius;
    const stretch = [1, 0.92, 1.06][frame || 0];
    const lean = [-0.045, 0, 0.045][frame || 0];
    ctx.save();
    ctx.rotate(lean);
    ctx.scale(1 / stretch, stretch);
    ctx.fillStyle = enemy.kind === 'boss' ? '#b889ff' : '#dbe7ff';
    ctx.beginPath();
    ctx.arc(0, -r * 0.15, r, Math.PI, 0);
    ctx.quadraticCurveTo(r * 0.95, r * 0.75, r * 0.32, r * 0.55);
    ctx.quadraticCurveTo(0, r * 0.35, -r * 0.32, r * 0.55);
    ctx.quadraticCurveTo(-r * 0.95, r * 0.75, -r, -r * 0.15);
    ctx.fill();

    ctx.fillStyle = '#243552';
    ctx.beginPath();
    ctx.arc(-r * 0.28, -r * 0.22, Math.max(3, r * 0.1), 0, Math.PI * 2);
    ctx.arc(r * 0.28, -r * 0.22, Math.max(3, r * 0.1), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawMarineEnemyFallback(enemy) {
    const ctx = this.ctx;
    const r = enemy.radius;
    if (enemy.species === 'jellyfish') {
      ctx.fillStyle = '#7ee9ee';
      ctx.beginPath();
      ctx.arc(0, -r * 0.18, r, Math.PI, 0);
      ctx.lineTo(r, r * 0.18);
      ctx.lineTo(-r, r * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#a5f8fc';
      ctx.lineWidth = 3;
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * r * 0.42, r * 0.16);
        ctx.quadraticCurveTo(i * r * 0.6 + 6, r * 0.58, i * r * 0.38, r * 0.88);
        ctx.stroke();
      }
      return;
    }

    if (enemy.species === 'pufferfish') {
      ctx.fillStyle = '#ffd068';
      for (let i = 0; i < 10; i += 1) {
        const angle = i * Math.PI / 5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle - 0.14) * r * 0.82, Math.sin(angle - 0.14) * r * 0.82);
        ctx.lineTo(Math.cos(angle) * r * 1.25, Math.sin(angle) * r * 1.25);
        ctx.lineTo(Math.cos(angle + 0.14) * r * 0.82, Math.sin(angle + 0.14) * r * 0.82);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    ctx.fillStyle = enemy.species === 'megalodon' ? '#3279a7' : '#4ea2bb';
    ctx.beginPath();
    ctx.moveTo(-r * 1.2, -r * 0.04);
    ctx.quadraticCurveTo(-r * 0.26, -r * 0.86, r * 1.3, -r * 0.12);
    ctx.lineTo(r * 1.55, -r * 0.64);
    ctx.lineTo(r * 1.4, r * 0.02);
    ctx.lineTo(r * 1.55, r * 0.62);
    ctx.lineTo(r * 0.92, r * 0.3);
    ctx.quadraticCurveTo(-r * 0.2, r * 0.72, -r * 1.2, -r * 0.04);
    ctx.fill();
  }

  drawPenguinEnemyFallback(enemy) {
    const ctx = this.ctx;
    const r = enemy.radius;
    const bossScale = enemy.kind === 'boss' ? 1.12 : 1;
    ctx.save();
    ctx.scale(bossScale, bossScale);
    ctx.fillStyle = enemy.kind === 'boss' ? '#18243a' : '#23384d';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.83, r * 1.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f7fbf2';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.18, r * 0.56, r * 0.76, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd05b';
    ctx.beginPath();
    ctx.moveTo(-r * 0.16, -r * 0.3);
    ctx.lineTo(r * 0.17, -r * 0.3);
    ctx.lineTo(0, -r * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawDinosaurEnemyFallback(enemy) {
    const ctx = this.ctx;
    const r = enemy.radius;
    const isBoss = enemy.species === 'tyrannosaurus';
    ctx.fillStyle = isBoss ? '#9e4f29' : (enemy.species === 'triceratops' ? '#d69d43' : '#59955a');
    ctx.beginPath();
    if (enemy.species === 'pterosaur') {
      ctx.moveTo(-r * 1.45, r * 0.12);
      ctx.lineTo(-r * 0.32, -r * 0.46);
      ctx.lineTo(0, -r * 0.12);
      ctx.lineTo(r * 0.34, -r * 0.46);
      ctx.lineTo(r * 1.45, r * 0.12);
      ctx.lineTo(r * 0.18, r * 0.34);
      ctx.lineTo(-r * 0.18, r * 0.34);
    } else {
      ctx.ellipse(-r * 0.12, 0, r * (isBoss ? 1.18 : 1.04), r * 0.68, 0, 0, Math.PI * 2);
    }
    ctx.fill();

    if (enemy.species === 'triceratops') {
      ctx.fillStyle = '#f3d794';
      ctx.beginPath();
      ctx.moveTo(r * 0.2, -r * 0.42);
      ctx.lineTo(r * 1.3, -r * 0.82);
      ctx.lineTo(r * 0.7, -r * 0.05);
      ctx.lineTo(r * 1.32, r * 0.1);
      ctx.lineTo(r * 0.26, r * 0.36);
      ctx.closePath();
      ctx.fill();
    } else if (enemy.species === 'brachiosaurus') {
      ctx.fillRect(r * 0.35, -r * 1.02, r * 0.3, r * 1.05);
      ctx.beginPath();
      ctx.arc(r * 0.58, -r * 1.02, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    } else if (isBoss) {
      ctx.beginPath();
      ctx.arc(r * 0.85, -r * 0.28, r * 0.48, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff1c8';
      ctx.fillRect(r * 0.95, -r * 0.12, r * 0.3, r * 0.08);
    }
  }

  drawSymbolQueue(enemy) {
    const ctx = this.ctx;
    const indicators = getSymbolIndicators(enemy);
    const count = indicators.length;
    const size = Math.max(22, enemy.radius * 0.72);
    const gap = 5;
    const startX = -((count * size + (count - 1) * gap) / 2) + size / 2;
    const imageScale = enemy.kind === 'boss' ? 1.62 : 1.36;
    const visualRadius = enemy.species === 'ghost' ? enemy.radius : enemy.radius * imageScale;
    const y = -visualRadius - 24;

    ctx.font = 'bold ' + Math.floor(size * 0.82) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < count; i += 1) {
      const x = startX + i * (size + gap);
      const indicator = indicators[i];
      if (indicator.type === 'dot') {
        ctx.fillStyle = 'rgba(217, 246, 255, 0.84)';
        ctx.beginPath();
        ctx.arc(x, y, Math.max(4, size * 0.16), 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      if (indicator.type === 'count') {
        ctx.fillStyle = 'rgba(217, 246, 255, 0.88)';
        ctx.beginPath();
        ctx.roundRect(x - size / 2, y - size / 2, size, size, [7]);
        ctx.fill();
        ctx.fillStyle = '#1d2740';
        ctx.font = 'bold ' + Math.floor(size * 0.58) + 'px sans-serif';
        ctx.fillText('+' + indicator.count, x, y + 1);
        ctx.font = 'bold ' + Math.floor(size * 0.82) + 'px sans-serif';
        continue;
      }
      ctx.fillStyle = i === 0 ? '#ffdc6f' : 'rgba(255,255,255,0.68)';
      ctx.beginPath();
      ctx.roundRect(x - size / 2, y - size / 2, size, size, [7]);
      ctx.fill();
      const iconAssetKey = SYMBOL_ICON_ASSET_KEYS[indicator.symbol];
      const symbolIcon = iconAssetKey && this.assets && this.assets.getImage(iconAssetKey);
      if (symbolIcon) {
        const iconSize = size * 0.86;
        ctx.drawImage(
          symbolIcon,
          x - iconSize / 2,
          y - iconSize / 2,
          iconSize,
          iconSize
        );
      } else {
        ctx.fillStyle = '#1d2740';
        ctx.fillText(LABELS[indicator.symbol], x, y + 1);
      }
    }
  }

  drawGesture(path) {
    if (!path || path.length < 2) {
      return;
    }

    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = '#8bf2ff';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#8bf2ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i += 1) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawHud(state, visibleLevel) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(8, 13, 25, 0.32)';
    ctx.fillRect(0, 0, this.width, 62);

    ctx.fillStyle = '#fff2c2';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('分数 ' + state.score, 16, 31);

    ctx.fillStyle = '#d8e6ff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(getLevelLabel(state, visibleLevel), this.width * 0.5, 31);

    for (let i = 0; i < 5; i += 1) {
      this.drawHeart(this.width - 28 - i * 26, 31, i < state.lives);
    }

    this.drawComboCounter(state);

    if (state.feedback) {
      ctx.globalAlpha = Math.max(0, 1 - state.feedback.age / 0.7);
      ctx.fillStyle = state.feedback.type === 'hit' ? '#a4ffbf' : '#ff9a87';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(state.feedback.text, this.width * 0.5, 104 - state.feedback.age * 24);
      ctx.globalAlpha = 1;
    }
  }

  drawComboCounter(state) {
    if (state.screen !== SCREENS.PLAYING || state.combo <= 0) {
      return;
    }

    const ctx = this.ctx;
    const tier = getComboTier(state.combo);
    const pulse = getComboPulse(state.combo, state.feedback);
    const label = getComboLabel(state.combo);
    const x = 16;
    const y = 85 - pulse.lift;

    ctx.save();
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const labelWidth = ctx.measureText(label).width;
    const multiplierWidth = tier.multiplierLabel ? 45 : 0;
    const width = labelWidth + multiplierWidth + 18;

    ctx.translate(x, y);
    ctx.scale(tier.scale * pulse.scale, tier.scale * pulse.scale);

    if (pulse.burst > 0) {
      const spread = (1 - pulse.burst) * 13;
      ctx.globalAlpha = pulse.burst * 0.72;
      ctx.strokeStyle = tier.glow;
      ctx.lineWidth = 1.5 + pulse.burst * 2.5;
      ctx.beginPath();
      ctx.roundRect(-spread, -16 - spread * 0.38, width + spread * 2, 32 + spread * 0.76, [13]);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = tier.background;
    ctx.beginPath();
    ctx.roundRect(0, -14, width, 28, [11]);
    ctx.fill();

    ctx.strokeStyle = tier.glow;
    ctx.globalAlpha = 0.48 + pulse.burst * 0.45;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.shadowColor = tier.glow;
    ctx.shadowBlur = 5 + pulse.burst * 11;
    ctx.fillStyle = tier.color;
    ctx.fillText(label, 9, 0);

    if (tier.multiplierLabel) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.17)';
      ctx.beginPath();
      ctx.roundRect(width - 42, -10, 36, 20, [7]);
      ctx.fill();
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = tier.color;
      ctx.fillText(tier.multiplierLabel, width - 24, 0);
    }

    ctx.restore();
  }

  drawHeart(x, y, filled) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = filled ? '#ff6f91' : 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.bezierCurveTo(-16, -4, -8, -18, 0, -8);
    ctx.bezierCurveTo(8, -18, 16, -4, 0, 8);
    ctx.fill();
    ctx.restore();
  }

  drawDifficultyOverlay(title, subtitle, prompt) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(8, 13, 25, 0.7)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff2c2';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(title, this.width * 0.5, this.height * 0.29);

    ctx.fillStyle = '#d8e6ff';
    ctx.font = '20px sans-serif';
    ctx.fillText(subtitle, this.width * 0.5, this.height * 0.38);

    ctx.fillStyle = '#ffdc6f';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(prompt, this.width * 0.5, this.height * 0.46);

    const buttons = getDifficultyButtons(this.width, this.height);
    for (let i = 0; i < buttons.length; i += 1) {
      this.drawDifficultyButton(buttons[i], buttons[i].mode === DIFFICULTY_MODES.PLUS_ONE);
    }
  }

  drawDifficultyButton(button, emphasized) {
    const ctx = this.ctx;
    ctx.fillStyle = emphasized ? 'rgba(255, 220, 111, 0.19)' : 'rgba(216, 230, 255, 0.1)';
    ctx.strokeStyle = emphasized ? '#ffdc6f' : 'rgba(216, 230, 255, 0.72)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(button.x, button.y, button.width, button.height, [12]);
    ctx.fill();
    ctx.stroke();

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = emphasized ? '#ffdc6f' : '#fff2c2';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(button.label, button.x + 18, button.y + button.height * 0.5);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#d8e6ff';
    ctx.font = '15px sans-serif';
    ctx.fillText(button.detail, button.x + button.width - 18, button.y + button.height * 0.5);
  }

  drawAudioToggle(enabled) {
    const ctx = this.ctx;
    const button = getAudioToggleBounds(this.width);
    ctx.save();
    ctx.fillStyle = enabled ? 'rgba(255, 220, 111, 0.17)' : 'rgba(216, 230, 255, 0.1)';
    ctx.strokeStyle = enabled ? '#ffdc6f' : 'rgba(216, 230, 255, 0.64)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(button.x, button.y, button.width, button.height, [17]);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = enabled ? '#ffdc6f' : '#d8e6ff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(getSoundToggleLabel(enabled), button.x + button.width * 0.5, button.y + button.height * 0.5);
    ctx.restore();
  }

  drawOverlay(title, subtitle, action) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(8, 13, 25, 0.64)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff2c2';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(title, this.width * 0.5, this.height * 0.38);

    ctx.fillStyle = '#d8e6ff';
    ctx.font = '20px sans-serif';
    ctx.fillText(subtitle, this.width * 0.5, this.height * 0.47);

    ctx.fillStyle = '#ffdc6f';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(action, this.width * 0.5, this.height * 0.58);
  }
}

Renderer.getSymbolIndicators = getSymbolIndicators;
Renderer.getLevelLabel = getLevelLabel;
Renderer.getComboLabel = getComboLabel;
Renderer.getComboTier = getComboTier;
Renderer.getComboPulse = getComboPulse;
Renderer.getSoundToggleLabel = getSoundToggleLabel;
Renderer.getHeartSlotPosition = getHeartSlotPosition;
Renderer.getTransitionCopy = getTransitionCopy;
Renderer.getWinTitle = getWinTitle;
Renderer.getEnemySpriteFrame = getEnemySpriteFrame;
Renderer.ENEMY_SPRITE = ENEMY_SPRITE;
Renderer.SYMBOL_ICON_ASSET_KEYS = SYMBOL_ICON_ASSET_KEYS;
Renderer.getHeroSpriteAnimation = getHeroSpriteAnimation;
Renderer.getHeroSpriteFrame = getHeroSpriteFrame;
Renderer.HERO_SPRITE = HERO_SPRITE;

module.exports = Renderer;

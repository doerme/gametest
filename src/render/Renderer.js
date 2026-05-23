'use strict';

const { LABELS } = require('../input/GestureRecognizer');
const { SCREENS } = require('../core/GameState');

const ENEMY_ASSET_KEYS = {
  jellyfish: 'enemyJellyfish',
  pufferfish: 'enemyPufferfish',
  shark: 'enemyShark',
  megalodon: 'bossMegalodon',
  penguinBellhop: 'enemyPenguinBellhop',
  penguinChef: 'enemyPenguinChef',
  emperorPenguin: 'bossEmperorPenguin'
};

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
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground(state.elapsed, visibleLevel);
    this.drawRunes(state.elapsed, visibleLevel);
    this.drawEnemies(state.enemies);
    this.drawHero(state.hero, state.elapsed, state.heroAnimation, input && input.isDrawing);
    this.drawEffects(state.effects);
    this.drawGesture(input.currentPath);
    this.drawHud(state, visibleLevel);

    if (state.screen === SCREENS.TITLE) {
      this.drawOverlay('幽光古堡', '划箭头方向；V 和 ∧ 照形状画', '点击开始');
    } else if (state.screen === SCREENS.LEVEL_TRANSITION) {
      if (visibleLevel === 3) {
        this.drawOverlay('第三关', '极光企鹅酒店', '新增符咒：○ / Z');
      } else {
        this.drawOverlay('第二关', '深海飞船长廊', '准备迎战海洋生物');
      }
    } else if (state.screen === SCREENS.WIN) {
      this.drawOverlay('三关通关', '得分 ' + state.score, '点击再来一局');
    } else if (state.screen === SCREENS.LOSE) {
      this.drawOverlay('魔力耗尽', '得分 ' + state.score, '点击重试');
    }
  }

  drawBackground(elapsed, level) {
    const ctx = this.ctx;
    const scroll = (elapsed || 0) * 68;
    if (level === 3) {
      const penguinCorridor = this.assets && this.assets.getImage('penguinHotelCorridorLoop');
      if (penguinCorridor) {
        this.drawScrollingPenguinBackground(penguinCorridor, elapsed || 0);
      } else {
        this.drawFallbackPenguinBackground(scroll);
      }
      return;
    }

    if (level === 2) {
      const oceanCorridor = this.assets && this.assets.getImage('oceanSpaceshipCorridorLoop');
      if (oceanCorridor) {
        this.drawScrollingOceanBackground(oceanCorridor, elapsed || 0);
      } else {
        this.drawFallbackOceanBackground(scroll);
      }
      return;
    }

    const castleCorridor = this.assets && this.assets.getImage('castleCorridorLoop');
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
    // The art includes a near-duplicate torch row at both ends; omit one end in the repeating slice.
    const sourceTop = Math.floor(image.height * 0.11);
    const sourceHeight = image.height - sourceTop;
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
    const offset = Math.floor((elapsed * 118) % tileHeight);

    ctx.save();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    for (let y = offset - tileHeight; y < this.height; y += tileHeight) {
      ctx.drawImage(image, 0, y, this.width, tileHeight + 1);
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

  drawRunes(elapsed, level) {
    const ctx = this.ctx;
    const drift = ((elapsed || 0) * 42) % 34;
    ctx.save();
    ctx.translate(this.width * 0.5, this.height * 0.74 + Math.sin((elapsed || 0) * 2) * 1.5);
    ctx.strokeStyle = level === 3
      ? 'rgba(172, 249, 255, 0.28)'
      : (level === 2 ? 'rgba(115, 244, 255, 0.22)' : 'rgba(255, 235, 171, 0.18)');
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
    const image = this.assets && this.assets.getImage('catWalk');
    if (image) {
      this.drawCatHero(hero, elapsed, image, motion);
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

  drawCatHero(hero, elapsed, image, motion) {
    const ctx = this.ctx;
    const frame = Math.floor(elapsed * 8) % 4;
    const drawSize = hero.radius * 3.5;

    ctx.save();
    ctx.translate(motion.x, motion.y - hero.radius * 0.12);
    ctx.rotate(motion.rotation);
    ctx.scale(motion.scale, motion.scale);
    ctx.globalAlpha = motion.flash ? 0.55 : 1;
    ctx.drawImage(
      image,
      frame * 128,
      0,
      128,
      128,
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
    const color = effect.kind === 'boss' ? '#d6a6ff' : '#c6f6ff';
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

  drawEnemies(enemies) {
    for (let i = 0; i < enemies.length; i += 1) {
      this.drawEnemy(enemies[i]);
    }
  }

  drawEnemy(enemy) {
    const ctx = this.ctx;
    const wobble = Math.sin(enemy.phase) * 3;

    ctx.save();
    ctx.translate(enemy.x, enemy.y + wobble);
    ctx.globalAlpha = enemy.hitFlash > 0 ? 0.58 : 1;

    const assetKey = ENEMY_ASSET_KEYS[enemy.species];
    const image = assetKey && this.assets && this.assets.getImage(assetKey);
    if (image) {
      this.drawEnemyImage(enemy, image);
    } else if (enemy.species === 'ghost') {
      this.drawGhostEnemy(enemy);
    } else if (enemy.species.indexOf('penguin') !== -1 || enemy.species === 'emperorPenguin') {
      this.drawPenguinEnemyFallback(enemy);
    } else {
      this.drawMarineEnemyFallback(enemy);
    }

    this.drawSymbolQueue(enemy);
    ctx.restore();
  }

  drawEnemyImage(enemy, image) {
    const sizeMultiplier = enemy.kind === 'boss' ? 3.15 : 2.7;
    const size = enemy.radius * sizeMultiplier;
    this.ctx.drawImage(image, -size / 2, -size / 2, size, size);
  }

  drawGhostEnemy(enemy) {
    const ctx = this.ctx;
    const r = enemy.radius;
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
        ctx.roundRect(x - size / 2, y - size / 2, size, size, 7);
        ctx.fill();
        ctx.fillStyle = '#1d2740';
        ctx.font = 'bold ' + Math.floor(size * 0.58) + 'px sans-serif';
        ctx.fillText('+' + indicator.count, x, y + 1);
        ctx.font = 'bold ' + Math.floor(size * 0.82) + 'px sans-serif';
        continue;
      }
      ctx.fillStyle = i === 0 ? '#ffdc6f' : 'rgba(255,255,255,0.68)';
      ctx.beginPath();
      ctx.roundRect(x - size / 2, y - size / 2, size, size, 7);
      ctx.fill();
      ctx.fillStyle = '#1d2740';
      ctx.fillText(LABELS[indicator.symbol], x, y + 1);
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
    ctx.fillText('第 ' + (visibleLevel || state.level) + '/' + state.totalLevels + ' 关', this.width * 0.5, 31);

    for (let i = 0; i < 5; i += 1) {
      this.drawHeart(this.width - 28 - i * 26, 31, i < state.lives);
    }

    if (state.feedback) {
      ctx.globalAlpha = Math.max(0, 1 - state.feedback.age / 0.7);
      ctx.fillStyle = state.feedback.type === 'miss' ? '#ff9a87' : '#a4ffbf';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(state.feedback.text, this.width * 0.5, 104 - state.feedback.age * 24);
      ctx.globalAlpha = 1;
    }
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

module.exports = Renderer;

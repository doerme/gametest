'use strict';

const { LABELS } = require('../input/GestureRecognizer');
const { SCREENS } = require('../core/GameState');

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
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground(state.elapsed);
    this.drawRunes(state.elapsed);
    this.drawEnemies(state.enemies);
    this.drawHero(state.hero, state.elapsed);
    this.drawGesture(input.currentPath);
    this.drawHud(state);

    if (state.screen === SCREENS.TITLE) {
      this.drawOverlay('幽光古堡', '按箭头方向划线；V 和 ∧ 照形状画', '点击开始');
    } else if (state.screen === SCREENS.WIN) {
      this.drawOverlay('通关成功', '得分 ' + state.score, '点击再来一局');
    } else if (state.screen === SCREENS.LOSE) {
      this.drawOverlay('魔力耗尽', '得分 ' + state.score, '点击重试');
    }
  }

  drawBackground(elapsed) {
    const ctx = this.ctx;
    const scroll = (elapsed || 0) * 68;
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
    const tileHeight = Math.ceil(this.width * image.height / image.width);
    const offset = Math.floor((elapsed * 112) % tileHeight);

    for (let y = offset - tileHeight; y < this.height; y += tileHeight) {
      ctx.drawImage(image, 0, y, this.width, tileHeight + 1);
    }

    const shadow = ctx.createLinearGradient(0, 0, 0, this.height);
    shadow.addColorStop(0, 'rgba(5, 9, 20, 0.2)');
    shadow.addColorStop(0.42, 'rgba(5, 9, 20, 0.03)');
    shadow.addColorStop(1, 'rgba(5, 9, 20, 0.18)');
    ctx.fillStyle = shadow;
    ctx.fillRect(0, 0, this.width, this.height);

    const torchRows = [0.09, 0.31, 0.54, 0.77, 0.98];
    for (let tileY = offset - tileHeight; tileY < this.height; tileY += tileHeight) {
      for (let i = 0; i < torchRows.length; i += 1) {
        const y = tileY + tileHeight * torchRows[i];
        this.drawTorchGlow(this.width * 0.17, y, elapsed, i * 1.3);
        this.drawTorchGlow(this.width * 0.83, y, elapsed, i * 1.3 + 0.8);
      }
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

  drawRunes(elapsed) {
    const ctx = this.ctx;
    const drift = ((elapsed || 0) * 42) % 34;
    ctx.save();
    ctx.translate(this.width * 0.5, this.height * 0.74 + Math.sin((elapsed || 0) * 2) * 1.5);
    ctx.strokeStyle = 'rgba(255, 235, 171, 0.18)';
    ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i += 1) {
      ctx.beginPath();
      ctx.arc(0, drift * 0.12, i * 34 + drift * 0.06, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawHero(hero, elapsed) {
    const image = this.assets && this.assets.getImage('catWalk');
    if (image) {
      this.drawCatHero(hero, elapsed, image);
      return;
    }

    this.drawFallbackHero(hero, elapsed);
  }

  drawCatHero(hero, elapsed, image) {
    const ctx = this.ctx;
    const bob = Math.sin(elapsed * 5) * 2;
    const frame = Math.floor(elapsed * 8) % 4;
    const drawSize = hero.radius * 3.5;

    ctx.save();
    ctx.translate(hero.x, hero.y + bob - hero.radius * 0.12);
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

  drawFallbackHero(hero, elapsed) {
    const ctx = this.ctx;
    const bob = Math.sin(elapsed * 5) * 2;
    ctx.save();
    ctx.translate(hero.x, hero.y + bob);

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

  drawEnemies(enemies) {
    for (let i = 0; i < enemies.length; i += 1) {
      this.drawEnemy(enemies[i]);
    }
  }

  drawEnemy(enemy) {
    const ctx = this.ctx;
    const wobble = Math.sin(enemy.phase) * 3;
    const r = enemy.radius;

    ctx.save();
    ctx.translate(enemy.x, enemy.y + wobble);
    ctx.globalAlpha = enemy.hitFlash > 0 ? 0.58 : 1;

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

    this.drawSymbolQueue(enemy);
    ctx.restore();
  }

  drawSymbolQueue(enemy) {
    const ctx = this.ctx;
    const count = enemy.symbols.length;
    const size = Math.max(22, enemy.radius * 0.72);
    const gap = 5;
    const startX = -((count * size + (count - 1) * gap) / 2) + size / 2;
    const y = -enemy.radius - 24;

    ctx.font = 'bold ' + Math.floor(size * 0.82) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < count; i += 1) {
      const x = startX + i * (size + gap);
      ctx.fillStyle = i === 0 ? '#ffdc6f' : 'rgba(255,255,255,0.68)';
      ctx.beginPath();
      ctx.roundRect(x - size / 2, y - size / 2, size, size, 7);
      ctx.fill();
      ctx.fillStyle = '#1d2740';
      ctx.fillText(LABELS[enemy.symbols[i]], x, y + 1);
    }
  }

  drawGesture(path) {
    if (!path || path.length < 2) {
      return;
    }

    const ctx = this.ctx;
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
    ctx.shadowBlur = 0;
  }

  drawHud(state) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(8, 13, 25, 0.32)';
    ctx.fillRect(0, 0, this.width, 62);

    ctx.fillStyle = '#fff2c2';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('分数 ' + state.score, 16, 31);

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

module.exports = Renderer;

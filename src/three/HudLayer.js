'use strict';
const THREE = require('three');
const { LABELS, SYMBOLS } = require('../input/GestureRecognizer');
const { getGuidePath } = require('../input/GestureTemplates');
const { SCREENS, getComboMultiplier } = require('../core/GameState');
const { getTheme } = require('../levels/Themes');
const { getStartButtons, getContinueButton } = require('../ui/DifficultySelector');
const { getAudioToggleBounds } = require('../ui/AudioToggle');
const { getItemSlots, getHeartSlotPosition } = require('../ui/ItemBar');
const { getSymbolIndicators } = require('../ui/Presentation');
const GAME_MODES = require('../core/GameMode');
const { CHARACTERS, getStrokeCount } = require('../hanzi/Characters');
const { drawCharacter } = require('../hanzi/CanvasCharacter');
const { drawHanziBoard } = require('../ui/HanziBoard');
const { getHanziLayout } = require('../ui/HanziLayout');
const { getSpeedControl, MIN_SPEED, MAX_SPEED } = require('../ui/SpeedControl');

function rounded(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}

function spell(ctx, symbol, x, y, size, color = '#253749') {
  const path = getGuidePath(symbol);
  if (!path.length) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 100, size / 100);
  ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color;
  ctx.beginPath(); path.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)); ctx.stroke();
  if (['up', 'down', 'left', 'right'].includes(symbol)) {
    const end = path[path.length - 1]; const first = path[0];
    const a = Math.atan2(end.y - first.y, end.x - first.x);
    ctx.beginPath(); ctx.moveTo(end.x - Math.cos(a - 0.65) * 29, end.y - Math.sin(a - 0.65) * 29);
    ctx.lineTo(end.x, end.y); ctx.lineTo(end.x - Math.cos(a + 0.65) * 29, end.y - Math.sin(a + 0.65) * 29); ctx.stroke();
  }
  ctx.restore();
}

class HudLayer {
  constructor(platform, width, height, decodeCanvasSRGB = false) {
    this.platform = platform;
    this.decodeCanvasSRGB = decodeCanvasSRGB;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, width, 0, height, 0.1, 100);
    this.camera.position.z = 10;
    this.canvas = platform.createOffscreenCanvas();
    this.ctx = this.canvas.getContext('2d');
    this.texture = this.createTexture();
    this.material = this.canvasMaterial(this.texture);
    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material);
    this.plane.position.z = 3; this.scene.add(this.plane);
    this.badges = new Map(); this.glyphs = new Map();
    this.createAtlas();
    const positions = new Float32Array(2048 * 6 * 3);
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.trailMaterial = new THREE.MeshBasicMaterial({ color: 0xbef7ef, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
    this.trail = new THREE.Mesh(this.trailGeometry, this.trailMaterial); this.trail.frustumCulled = false; this.scene.add(this.trail);
    this.resize(width, height);
  }

  createAtlas() {
    const atlas = this.platform.createOffscreenCanvas(); atlas.width = 1024; atlas.height = 2048;
    const ctx = atlas.getContext('2d');
    const keys = Object.values(SYMBOLS).filter((s) => s !== 'unknown').concat('dot', Array.from({ length: 9 }, (_, i) => '+' + (i + 1)));
    keys.push(...CHARACTERS.map((character) => 'hanzi:' + character));
    [...new Set(CHARACTERS.map(getStrokeCount))].forEach((total) => {
      for (let completed = 0; completed <= total; completed += 1) keys.push('progress:' + completed + '/' + total);
    });
    keys.push('focus');
    keys.forEach((key, i) => {
      const x = i % 10 * 100; const y = Math.floor(i / 10) * 100;
      if (key === 'focus') {
        rounded(ctx, x + 4, y + 4, 92, 92, 20);
        ctx.strokeStyle = '#77f4bd'; ctx.lineWidth = 6; ctx.stroke();
      } else if (key === 'dot') { ctx.fillStyle = '#fff1c6'; ctx.beginPath(); ctx.arc(x + 50, y + 50, 9, 0, Math.PI * 2); ctx.fill(); }
      else {
        rounded(ctx, x + 3, y + 3, 94, 94, 23, key.startsWith('progress:') ? '#234651' : '#ffe5a6', '#fff7df');
        if (key.startsWith('+')) { ctx.font = 'bold 42px sans-serif'; ctx.fillStyle = '#2b3b50'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(key, x + 50, y + 52); }
        else if (key.startsWith('hanzi:')) drawCharacter(ctx, key.slice(6), x + 10, y + 10, 80, '#253749');
        else if (key.startsWith('progress:')) { ctx.font = 'bold 30px sans-serif'; ctx.fillStyle = '#def1da'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(key.slice(9), x + 50, y + 51); }
        else spell(ctx, key, x + 22, y + 22, 56);
      }
      const geometry = new THREE.PlaneGeometry(1, 1);
      const uv = geometry.attributes.uv;
      for (let j = 0; j < uv.count; j += 1) uv.setXY(j, (x + uv.getX(j) * 100) / atlas.width, 1 - (y + (1 - uv.getY(j)) * 100) / atlas.height);
      this.glyphs.set(key, geometry);
    });
    this.atlas = new THREE.CanvasTexture(atlas); this.atlas.colorSpace = this.decodeCanvasSRGB ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    this.atlas.generateMipmaps = false; this.atlas.minFilter = THREE.LinearFilter;
    this.badgeMaterial = this.canvasMaterial(this.atlas);
  }

  canvasMaterial(texture) {
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    // Three's WebGL 1 CPU sRGB conversion needs DOM canvas constructors absent
    // in wx. Reuse the shader's inline sRGB decode; alpha stays unchanged.
    if (this.decodeCanvasSRGB) material.defines = { DECODE_VIDEO_TEXTURE: '' };
    return material;
  }

  resize(width, height) {
    this.width = width; this.height = height;
    const ratio = Math.min(this.platform.pixelRatio, 1.5);
    this.canvas.width = Math.ceil(width * ratio); this.canvas.height = Math.ceil(height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    // WebGL 2 uses immutable texture storage; a new canvas size needs new storage.
    this.texture.dispose();
    this.texture = this.createTexture();
    this.material.map = this.texture;
    this.camera.right = width; this.camera.bottom = height; this.camera.updateProjectionMatrix();
    this.plane.position.set(width / 2, height / 2, 3); this.plane.scale.set(width, -height, 1);
    this.lastKey = null;
  }

  createTexture() {
    const texture = new THREE.CanvasTexture(this.canvas);
    texture.colorSpace = this.decodeCanvasSRGB ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  text(text, x, y, size = 16, color = '#fff0cf', align = 'left', weight = 'normal') {
    const ctx = this.ctx; ctx.font = weight + ' ' + size + 'px sans-serif'; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y);
  }

  heart(x, y, filled) {
    const c = this.ctx; c.save(); c.translate(x, y); c.scale(0.70, 0.70);
    c.beginPath(); c.moveTo(0, 13); c.bezierCurveTo(-25, -2, -14, -22, 0, -10); c.bezierCurveTo(14, -22, 25, -2, 0, 13);
    c.fillStyle = filled ? '#f1a194' : '#4d616b'; c.fill(); c.restore();
  }

  draw(state, input = {}) {
    const { width: w, height: h, ctx: c } = this;
    c.clearRect(0, 0, w, h);
    const level = state.screen === SCREENS.LEVEL_TRANSITION ? Math.min(6, state.level + 1) : state.level;
    const theme = getTheme(state.getThemeId(level));
    const hanzi = state.gameMode === GAME_MODES.HANZI;
    const top = c.createLinearGradient(0, 0, 0, 140); top.addColorStop(0, 'rgba(15,31,45,0.94)'); top.addColorStop(1, 'rgba(15,31,45,0)');
    c.fillStyle = top; c.fillRect(0, 0, w, 140);
    this.text('符咒学院', 20, 27, 19, '#ffedc8', 'left', 'bold');
    this.text('SPELL ACADEMY', w - 20, 27, 9, '#bbd6d0', 'right');
    this.text(String(state.score).padStart(4, '0'), 20, 63, 28, '#ffffff', 'left', 'bold');
    this.text('第 ' + level + ' / 6 关' + (hanzi ? '  汉字' : '  经典'), w - 20, 56, 13, '#f6dfad', 'right');
    this.text(theme.name, w - 20, 77, 12, '#c3d8d5', 'right');
    if (state.combo > 0 && state.screen === SCREENS.PLAYING && !hanzi) {
      const comboX = w - 166;
      const comboY = h - 146;
      rounded(c, comboX, comboY, 146, 31, 13, '#223f4a', '#819d94');
      this.text('连击 × ' + state.combo, comboX + 13, comboY + 16, 14, '#ffe0a1', 'left', 'bold');
      if (state.combo >= 3) this.text(getComboMultiplier(state.combo).toFixed(1) + '×', comboX + 135, comboY + 16, 12, '#c4e6d9', 'right');
    }
    const audio = getAudioToggleBounds(w);
    rounded(c, audio.x, audio.y, audio.width, audio.height, 12, 'rgba(19,39,53,0.80)', 'rgba(194,220,205,0.3)');
    this.text(state.soundEnabled ? '♪ 声音开' : '♪ 声音关', audio.x + audio.width / 2, audio.y + audio.height / 2, 12, '#e7e6cd', 'center');
    if (state.screen === SCREENS.PLAYING) {
      this.drawSpeedControl(state);
      const bottom = c.createLinearGradient(0, h - 112, 0, h); bottom.addColorStop(0, 'rgba(16,32,44,0)'); bottom.addColorStop(0.7, 'rgba(16,32,44,0.88)');
      c.fillStyle = bottom; c.fillRect(0, h - 112, w, 112);
      if (hanzi) drawHanziBoard(this, state, input);
      else {
        const symbols = ['up', 'down', 'left', 'right', 'v', 'l'].concat(level >= 3 ? ['circle'] : [], level >= 4 ? ['z'] : [], level >= 5 ? ['m'] : [], level >= 6 ? ['s'] : []);
        this.text('画出怪物头顶的符号', 20, h - 88, 11, '#c6d9ce');
        symbols.forEach((s, i) => spell(c, s, 21 + i * Math.min(29, (w - 44) / symbols.length), h - 69, 17, '#e7d7ae'));
      }
      for (let i = 0; i < state.maxLives; i += 1) { const p = getHeartSlotPosition(w, h, i); this.heart(p.x, p.y, i < state.lives); }
      this.text(state.gestureFailures === 0 ? '✧ 容错保护就绪' : '慢慢画，也可以', w - 18, h - 27, 11, '#afcec5', 'right');
      getItemSlots(w, h, state.items, state.gameMode).forEach((slot) => {
        rounded(c, slot.x, slot.y, slot.width, slot.height, 16, 'rgba(22,43,58,0.9)', '#9bb7b1');
        this.text(slot.type === 'healthPotion' ? '♥' : 'ϟ', slot.x + 22, slot.y + 23, 27, slot.type === 'healthPotion' ? '#f7a1a3' : '#c2a7f0', 'center', 'bold');
        this.text('×' + slot.count, slot.x + 40, slot.y + 43, 11, '#fff2cc', 'center');
        if (hanzi && slot.type === 'comboChain') this.text('定身', slot.x + 39, slot.y + 15, 9, '#d4c2f0', 'center');
      });
      if (state.feedback && !hanzi) {
        const f = state.feedback;
        const text = f.text.length > 21 ? f.text.slice(0, 21) : f.text;
        const size = Math.min(17, (w - 40) / Math.max(1, text.length));
        rounded(c, 18, 170, w - 36, f.guideSymbol ? 74 : 36, 14, 'rgba(19,43,55,0.88)');
        this.text(text, w / 2, 188, size, f.type === 'retry' ? '#ffe4af' : '#c5f5d6', 'center', 'bold');
        if (f.guideSymbol) { spell(c, f.guideSymbol, w / 2 - 12, 210, 23, '#ffe4af'); this.text('照这个形状画', w / 2 + 30, 220, 11, '#c9dcd1'); }
      }
      this.drawUiEffects(state);
    }
    if (state.healthNoticeVisible) {
      c.fillStyle = 'rgba(13,30,43,0.97)'; c.fillRect(0, 0, w, h);
      this.text('健康游戏忠告', w / 2, h * 0.25, 28, '#ffe4ab', 'center', 'bold');
      ['抵制不良游戏，拒绝盗版游戏。', '注意自我保护，谨防受骗上当。', '适度游戏益脑，沉迷游戏伤身。', '合理安排时间，享受健康生活。'].forEach((line, i) => this.text(line, w / 2, h * 0.38 + i * 36, Math.min(17, w / 23), '#d4e2d9', 'center'));
      this.text('点击屏幕，进入学院', w / 2, h * 0.74, 16, '#ffd990', 'center');
    } else if ([SCREENS.TITLE, SCREENS.LEVEL_TRANSITION].includes(state.screen)) {
      const buttons = state.screen === SCREENS.TITLE ? getStartButtons(w, h) : [getContinueButton(w, h, state.gameMode, state.timeScale)];
      const panelBottom = Math.max(h * 0.78, buttons[buttons.length - 1].y + buttons[buttons.length - 1].height + 18);
      rounded(c, 16, h * 0.18, w - 32, panelBottom - h * 0.18, 28, 'rgba(16,35,49,0.90)', 'rgba(218,222,190,0.45)');
      this.text(state.screen === SCREENS.TITLE ? '符咒学院' : '第 ' + level + ' 关', w / 2, h * 0.275, 38, '#ffe1a1', 'center', 'bold');
      this.text(state.screen === SCREENS.TITLE ? '指尖有魔法，勇气会发光' : theme.name, w / 2, h * 0.345, 15, '#c6ded1', 'center');
      const hint = hanzi ? '田字格描红 · 写完整个字消灭怪物' : level === 3 ? '新符咒 ○ · 留一点缺口也没关系' : level === 4 ? '新符咒 Z · 顺着折线画' : level === 5 ? '新符咒 M · 两边都能起笔' : level === 6 ? '新符咒 S · 跟着曲线画' : '按方向划箭头，V 和 L 照形状画';
      this.text(hint, w / 2, h * 0.425, Math.min(13, w / 29), '#e8d7b4', 'center');
      this.text(hanzi ? '一年级上册 · 笔画越多，时间越充足' : '手势不必完美 · 首次失误保护连击', w / 2, h * 0.469, 11, '#a6c9bf', 'center');
      buttons.forEach((button, i) => {
        rounded(c, button.x, button.y, button.width, button.height, 17, i ? '#284657' : '#f2d6a1', i ? '#819f9c' : '#fff0c9');
        this.text(button.label, button.x + 20, button.y + button.height / 2, 18, i ? '#e7e9d6' : '#293f4b', 'left', 'bold');
        this.text(button.detail + '  ›', button.x + button.width - 18, button.y + button.height / 2, 12, i ? '#b8d0c4' : '#597063', 'right');
      });
    } else if ([SCREENS.WIN, SCREENS.LOSE].includes(state.screen)) {
      rounded(c, 20, h * 0.27, w - 40, h * 0.40, 28, 'rgba(16,35,49,0.94)', '#b0c6b2');
      this.text(state.screen === SCREENS.WIN ? '六关通关！' : '休息一下，再出发', w / 2, h * 0.36, 28, '#ffe0a1', 'center', 'bold');
      this.text('本次得分  ' + state.score, w / 2, h * 0.46, 20, '#ecedda', 'center');
      this.text('点击屏幕，再来一局  ›', w / 2, h * 0.57, 15, '#bbd9cb', 'center');
    }
    this.texture.needsUpdate = true;
  }

  drawSpeedControl(state) {
    const { bounds, minus, display, plus } = getSpeedControl(this.width);
    rounded(this.ctx, bounds.x, bounds.y, bounds.width, bounds.height, 13, 'rgba(19,39,53,0.90)', 'rgba(194,220,205,0.45)');
    for (const [button, label, enabled] of [[minus, '−', state.timeScale > MIN_SPEED], [plus, '+', state.timeScale < MAX_SPEED]]) {
      rounded(this.ctx, button.x + 4, button.y + 4, button.width - 8, button.height - 8, 10, enabled ? '#315451' : '#223943');
      this.text(label, button.x + button.width / 2, button.y + button.height / 2, 22, enabled ? '#ffe3a8' : '#6c8385', 'center', 'bold');
    }
    this.text(state.timeScale.toFixed(2) + '×', display.x + display.width / 2, display.y + display.height / 2, 14, '#e7e6cd', 'center', 'bold');
  }

  drawUiEffects(state) {
    state.effects.forEach((effect) => {
      const t = effect.age / effect.duration;
      const from = { x: effect.x || this.width * 0.5, y: effect.y || 108 };
      let to;
      if (effect.type === 'itemEarn') to = { x: effect.toX, y: effect.toY };
      else if (effect.type === 'potionToHeart' || effect.type === 'heartLoss') to = getHeartSlotPosition(this.width, this.height, effect.heartIndex);
      else return;
      this.ctx.globalAlpha = 1 - t;
      if (effect.type === 'heartLoss') this.heart(to.x, to.y - t * 36, true);
      else this.text(effect.itemType === 'comboChain' ? 'ϟ' : '♥', from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * 35, 25, effect.itemType === 'comboChain' ? '#ccaff3' : '#f7aaae', 'center', 'bold');
      this.ctx.globalAlpha = 1;
    });
  }

  update(state, input, anchors) {
    const uiEffects = state.effects.filter((e) => ['heartLoss', 'potionToHeart', 'itemEarn'].includes(e.type));
    const hanzi = state.gameMode === GAME_MODES.HANZI;
    const point = input.currentPath && input.currentPath[input.currentPath.length - 1];
    const trailAge = (Date.now() - input.completedAt) / 1000;
    const key = [state.screen, state.healthNoticeVisible, state.level, state.getThemeId(state.screen === SCREENS.LEVEL_TRANSITION ? state.level + 1 : state.level), state.score, state.combo, state.lives, state.items.comboChain, state.items.healthPotion, state.soundEnabled, state.gestureFailures, state.difficulty, state.gameMode, state.timeScale,
      hanzi && [state.hanziRevision, state.hanziTarget && state.hanziTarget.hanzi.character, state.hanziTarget && state.hanziTarget.hanzi.strokeIndex, Math.floor(state.hanziGuideTime * 12), point && point.x, point && point.y, input.isDrawing, input.completedAt, trailAge < 0.28 && Math.floor(trailAge * 30)].join(':'),
      state.feedback && state.feedback.text, state.feedback && Math.floor(state.feedback.age * 20), uiEffects.map((e) => e.type + Math.floor(e.age * 20)).join(',')].join('|');
    if (this.lastKey !== key) { this.draw(state, input); this.lastKey = key; }
    this.syncBadges(state, anchors);
    this.syncTrail(input, state.screen === SCREENS.PLAYING && !hanzi);
  }

  syncBadges(state, anchors) {
    const live = new Set(state.enemies);
    this.badges.forEach((group, enemy) => { if (!live.has(enemy)) { this.scene.remove(group); this.badges.delete(enemy); } });
    const audio = getAudioToggleBounds(this.width);
    const occupied = [{ x: audio.x + audio.width / 2, y: audio.y + audio.height / 2, w: audio.width, h: audio.height }];
    const speed = getSpeedControl(this.width).bounds;
    occupied.push({ x: speed.x + speed.width / 2, y: speed.y + speed.height / 2, w: speed.width, h: speed.height });
    const hanzi = state.gameMode === GAME_MODES.HANZI;
    const panel = getHanziLayout(this.width, this.height).panel;
    if (hanzi) {
      occupied.push({ x: this.width / 2, y: panel.y + panel.height / 2, w: panel.width, h: panel.height });
    }
    if (state.feedback && !hanzi) occupied.push({ x: this.width / 2, y: state.feedback.guideSymbol ? 207 : 188, w: this.width - 36, h: state.feedback.guideSymbol ? 74 : 36 });
    anchors.slice().sort((a, b) => b.enemy.y - a.enemy.y).forEach((anchor) => {
      const enemy = anchor.enemy;
      let group = this.badges.get(enemy);
      if (!group) { group = new THREE.Group(); this.badges.set(enemy, group); this.scene.add(group); }
      group.visible = anchor.visible && state.screen === SCREENS.PLAYING && !state.healthNoticeVisible;
      if (!group.visible) return;
      const indicators = getSymbolIndicators(enemy);
      const size = enemy.hanzi ? enemy.kind === 'boss' ? 46 : 42 : enemy.kind === 'boss' ? 38 : 32; const gap = size + 3;
      const width = indicators.length * gap;
      const initialX = Math.max(width / 2 + 6, Math.min(this.width - width / 2 - 6, anchor.x));
      let x = initialX;
      const maxY = hanzi ? panel.y - size / 2 - 10 : this.height - 165;
      const initialY = Math.max(110, Math.min(maxY, anchor.y - size / 2 - 6));
      let y = initialY;
      let placed = false;
      for (let i = 0; i < 12 && !placed; i += 1) {
        const candidate = initialY + (i % 2 ? -1 : 1) * Math.ceil(i / 2) * (size + 5);
        if (candidate < 106 || candidate > maxY) continue;
        for (const offset of [0, -gap, gap]) {
          const candidateX = initialX + offset;
          if (candidateX < width / 2 + 6 || candidateX > this.width - width / 2 - 6) continue;
          if (!occupied.some((r) => Math.abs(r.x - candidateX) < (r.w + width) / 2 + 3 && Math.abs(r.y - candidate) < (r.h + size) / 2 + 4)) { x = candidateX; y = candidate; placed = true; break; }
        }
      }
      occupied.push({ x, y, w: width, h: size });
      group.position.set(x, y, 2);
      indicators.forEach((indicator, i) => {
        const glyph = indicator.type === 'hanzi' ? 'hanzi:' + indicator.character : indicator.type === 'progress' ? 'progress:' + indicator.completed + '/' + indicator.total : indicator.type === 'symbol' ? indicator.symbol : indicator.type === 'dot' ? 'dot' : '+' + indicator.count;
        let mesh = group.children[i];
        if (!mesh) { mesh = new THREE.Mesh(this.glyphs.get(glyph), this.badgeMaterial); group.add(mesh); }
        mesh.geometry = this.glyphs.get(glyph) || this.glyphs.get('+9'); mesh.visible = true;
        mesh.position.x = (i - (indicators.length - 1) / 2) * gap;
        mesh.scale.set(size, -size, 1);
      });
      group.children.forEach((child, i) => { child.visible = i < indicators.length; });
      if (enemy.hanzi && state.hanziTarget === enemy) {
        let frame = group.children[indicators.length];
        if (!frame) { frame = new THREE.Mesh(this.glyphs.get('focus'), this.badgeMaterial); group.add(frame); }
        frame.geometry = this.glyphs.get('focus'); frame.visible = true;
        frame.position.set(-(indicators.length - 1) / 2 * gap, 0, 0.1); frame.scale.set(size + 8, -size - 8, 1);
      }
    });
  }

  syncTrail(input, playing) {
    let path = input.currentPath;
    const age = (Date.now() - input.completedAt) / 1000;
    if ((!path || path.length < 2) && age < 0.34) path = input.lastCompletedPath;
    this.trail.visible = playing && !!path && path.length >= 2;
    if (!this.trail.visible) return;
    this.trailMaterial.opacity = input.isDrawing ? 0.9 : Math.max(0, 1 - age / 0.34) * 0.8;
    const attribute = this.trailGeometry.attributes.position;
    const count = Math.min(path.length - 1, 2048);
    for (let i = 0; i < count; i += 1) {
      const a = path[i]; const b = path[i + 1]; const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = -(b.y - a.y) / len * 3; const ny = (b.x - a.x) / len * 3;
      const vertices = [[a.x + nx, a.y + ny], [a.x - nx, a.y - ny], [b.x + nx, b.y + ny], [b.x + nx, b.y + ny], [a.x - nx, a.y - ny], [b.x - nx, b.y - ny]];
      vertices.forEach((p, j) => attribute.setXYZ(i * 6 + j, p[0], p[1], 4));
    }
    attribute.needsUpdate = true; this.trailGeometry.setDrawRange(0, count * 6);
  }

  dispose() {
    this.plane.geometry.dispose(); this.material.dispose(); this.texture.dispose();
    this.glyphs.forEach((g) => g.dispose()); this.badgeMaterial.dispose(); this.atlas.dispose(); this.trailGeometry.dispose(); this.trailMaterial.dispose(); this.badges.clear();
  }
}
module.exports = HudLayer;

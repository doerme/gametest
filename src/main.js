'use strict';

const installWechatPhaserAdapter = require('./platform/wechatPhaserAdapter');
const { GameState } = require('./core/GameState');
const InputManager = require('./input/InputManager');
const Renderer = require('./render/Renderer');
const SoundManager = require('./audio/SoundManager');
const AssetManager = require('./assets/AssetManager');

function safeSet(target, key, value) {
  if (!target) {
    return;
  }
  try {
    target[key] = value;
  } catch (_error) {
    // WeChat Mini Game runtime may expose host objects with read-only fields.
  }
}

function safeSetMissing(target, key, value) {
  if (!target || target[key] !== undefined) {
    return;
  }
  safeSet(target, key, value);
}

function getSystemInfo(wxApi) {
  if (wxApi && wxApi.getSystemInfoSync) {
    return wxApi.getSystemInfoSync();
  }
  return {
    windowWidth: 375,
    windowHeight: 667,
    pixelRatio: 1
  };
}

function createCanvas(wxApi) {
  if (wxApi && wxApi.createCanvas) {
    return wxApi.createCanvas();
  }

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    return canvas;
  }

  throw new Error('Canvas is only available in WeChat Mini Game or a browser preview.');
}

function ensureRoundRect(ctx) {
  if (ctx.roundRect) {
    return;
  }

  ctx.roundRect = function roundRect(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    this.moveTo(x + r, y);
    this.lineTo(x + width - r, y);
    this.quadraticCurveTo(x + width, y, x + width, y + r);
    this.lineTo(x + width, y + height - r);
    this.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    this.lineTo(x + r, y + height);
    this.quadraticCurveTo(x, y + height, x, y + height - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
  };
}

function createRaf(canvas) {
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame;
  }

  if (canvas && canvas.requestAnimationFrame) {
    return canvas.requestAnimationFrame.bind(canvas);
  }

  return function raf(fn) {
    return setTimeout(function tick() {
      fn(Date.now());
    }, 1000 / 60);
  };
}

function loadNativeAssets(assets) {
  assets.loadImage('catWalk', 'assets/images/cat-walk-v2-sheet.png');
  assets.loadImage('catCast', 'assets/images/cat-cast-v2-sheet.png');
  assets.loadImage('catHurt', 'assets/images/cat-hurt-v2-sheet.png');
  assets.loadImage('symbolUp', 'assets/images/symbol-up.png');
  assets.loadImage('symbolDown', 'assets/images/symbol-down.png');
  assets.loadImage('symbolLeft', 'assets/images/symbol-left.png');
  assets.loadImage('symbolRight', 'assets/images/symbol-right.png');
  assets.loadImage('symbolV', 'assets/images/symbol-v.png');
  assets.loadImage('symbolL', 'assets/images/symbol-l.png');
  assets.loadImage('symbolCircle', 'assets/images/symbol-circle.png');
  assets.loadImage('symbolZ', 'assets/images/symbol-z.png');
  assets.loadImage('symbolM', 'assets/images/symbol-m.png');
  assets.loadImage('symbolS', 'assets/images/symbol-s.png');
  assets.loadImage('castleCorridorLoop', 'assets/images/castle-corridor-loop.jpg');
  assets.loadImage('oceanSpaceshipCorridorLoop', 'assets/images/ocean-spaceship-corridor-loop.jpg');
  assets.loadImage('penguinHotelCorridorLoop', 'assets/images/penguin-hotel-corridor-loop.jpg');
  assets.loadImage('dinosaurParkCorridorLoop', 'assets/images/dinosaur-park-corridor-loop.jpg');
  assets.loadImage('enemyJellyfish', 'assets/images/enemy-jellyfish-sheet.png');
  assets.loadImage('enemyPufferfish', 'assets/images/enemy-pufferfish-sheet.png');
  assets.loadImage('enemyShark', 'assets/images/enemy-shark-sheet.png');
  assets.loadImage('bossMegalodon', 'assets/images/boss-megalodon-sheet.png');
  assets.loadImage('enemyPenguinBellhop', 'assets/images/enemy-penguin-bellhop-sheet.png');
  assets.loadImage('enemyPenguinChef', 'assets/images/enemy-penguin-chef-sheet.png');
  assets.loadImage('bossEmperorPenguin', 'assets/images/boss-emperor-penguin-sheet.png');
  assets.loadImage('enemyPterosaur', 'assets/images/enemy-pterosaur-sheet.png');
  assets.loadImage('enemyTriceratops', 'assets/images/enemy-triceratops-sheet.png');
  assets.loadImage('enemyBrachiosaurus', 'assets/images/enemy-brachiosaurus-sheet.png');
  assets.loadImage('bossTyrannosaurus', 'assets/images/boss-tyrannosaurus-sheet.png');
}

function drawBootError(canvas, error, width, height, ratio) {
  if (!canvas || !canvas.getContext) {
    return;
  }

  const message = error && (error.stack || error.message) ? (error.stack || error.message) : String(error);
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  const scale = ratio || 1;
  context.save();
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.fillStyle = '#071127';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#ffdf7e';
  context.font = '16px Arial';
  context.fillText('启动失败，请查看控制台', 20, 36);
  context.fillStyle = '#ffffff';
  context.font = '12px Arial';

  const lines = message.split('\n').join(' ').match(/.{1,42}/g) || [message];
  for (let i = 0; i < Math.min(lines.length, 12); i += 1) {
    context.fillText(lines[i], 20, 68 + i * 18);
  }
  context.restore();
}

function reportBootError(wxApi, canvas, error, width, height, ratio) {
  console.error(error);
  drawBootError(canvas, error, width, height, ratio);
  if (wxApi && wxApi.showModal) {
    wxApi.showModal({
      title: '启动失败',
      content: error && error.message ? error.message : String(error),
      showCancel: false
    });
  }
}

function bootstrapNativeGame(wxApi, canvas, width, height, ratio) {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable.');
  }

  if (!canvas.__spellCanvasScaled) {
    ctx.scale(ratio, ratio);
    canvas.__spellCanvasScaled = true;
  }
  ensureRoundRect(ctx);

  const assets = new AssetManager(wxApi);
  loadNativeAssets(assets);

  const sound = new SoundManager(wxApi);
  const state = new GameState(width, height, sound);
  state.healthNoticeVisible = true;
  const input = new InputManager(wxApi, canvas);
  const renderer = new Renderer(ctx, { width, height }, assets);

  input.onGesture = function onGesture(points) {
    state.handleGesture(points);
  };
  input.onTap = function onTap(point) {
    if (state.healthNoticeVisible) {
      state.healthNoticeVisible = false;
      return;
    }
    state.handleTap(point);
  };
  input.bind();

  let last = Date.now();
  const raf = createRaf(canvas);

  function loop() {
    const now = Date.now();
    const dt = Math.min(0.033, Math.max(0, (now - last) / 1000));
    last = now;
    state.update(dt);
    renderer.render(state, input);
    raf(loop);
  }

  loop();
  return { state, input, renderer };
}

function bootstrapPhaserGame(wxApi, canvas, info, width, height, ratio) {
  installWechatPhaserAdapter({ wxApi, canvas, info, width, height, pixelRatio: ratio });
  const Phaser = require('phaser/dist/phaser');
  const createSpellGameScene = require('./phaser/SpellGameScene');
  const SpellGameScene = createSpellGameScene(Phaser, { wxApi, canvas, width, height, pixelRatio: ratio });

  return new Phaser.Game({
    type: Phaser.CANVAS,
    canvas,
    width,
    height,
    resolution: ratio,
    backgroundColor: '#071127',
    parent: null,
    audio: {
      noAudio: true
    },
    input: {
      activePointers: 3,
      windowEvents: false
    },
    scale: {
      mode: Phaser.Scale.NONE,
      width,
      height
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false
    },
    autoFocus: false,
    scene: [SpellGameScene]
  });
}

function bootstrap() {
  const wxApi = typeof wx !== 'undefined' ? wx : null;
  const info = getSystemInfo(wxApi);
  const canvas = createCanvas(wxApi);
  const ratio = info.pixelRatio || 1;
  const width = info.windowWidth || 375;
  const height = info.windowHeight || 667;

  safeSet(canvas, 'width', Math.floor(width * ratio));
  safeSet(canvas, 'height', Math.floor(height * ratio));
  safeSetMissing(canvas, 'style', {});
  safeSet(canvas.style, 'width', width + 'px');
  safeSet(canvas.style, 'height', height + 'px');
  safeSetMissing(canvas, 'addEventListener', function addEventListener() {});
  safeSetMissing(canvas, 'removeEventListener', function removeEventListener() {});
  safeSetMissing(canvas, 'getBoundingClientRect', function getBoundingClientRect() {
    return { left: 0, top: 0, width, height };
  });

  try {
    if (wxApi) {
      return bootstrapNativeGame(wxApi, canvas, width, height, ratio);
    }
    return bootstrapPhaserGame(wxApi, canvas, info, width, height, ratio);
  } catch (error) {
    reportBootError(wxApi, canvas, error, width, height, ratio);
    return null;
  }
}

bootstrap();

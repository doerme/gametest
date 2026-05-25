'use strict';

const { GameState } = require('./core/GameState');
const InputManager = require('./input/InputManager');
const Renderer = require('./render/Renderer');
const SoundManager = require('./audio/SoundManager');
const AssetManager = require('./assets/AssetManager');

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

function bootstrap() {
  const wxApi = typeof wx !== 'undefined' ? wx : null;
  const info = getSystemInfo(wxApi);
  const canvas = createCanvas(wxApi);
  const ratio = info.pixelRatio || 1;
  const width = info.windowWidth || 375;
  const height = info.windowHeight || 667;

  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style = canvas.style || {};
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  ensureRoundRect(ctx);

  const assets = new AssetManager(wxApi);
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
  assets.loadImage('castleCorridorLoop', 'assets/images/castle-corridor-loop.jpg');
  assets.loadImage('oceanSpaceshipCorridorLoop', 'assets/images/ocean-spaceship-corridor-loop.jpg');
  assets.loadImage('enemyJellyfish', 'assets/images/enemy-jellyfish-sheet.png');
  assets.loadImage('enemyPufferfish', 'assets/images/enemy-pufferfish-sheet.png');
  assets.loadImage('enemyShark', 'assets/images/enemy-shark-sheet.png');
  assets.loadImage('bossMegalodon', 'assets/images/boss-megalodon-sheet.png');
  assets.loadImage('penguinHotelCorridorLoop', 'assets/images/penguin-hotel-corridor-loop.jpg');
  assets.loadImage('enemyPenguinBellhop', 'assets/images/enemy-penguin-bellhop-sheet.png');
  assets.loadImage('enemyPenguinChef', 'assets/images/enemy-penguin-chef-sheet.png');
  assets.loadImage('bossEmperorPenguin', 'assets/images/boss-emperor-penguin-sheet.png');
  assets.loadImage('dinosaurParkCorridorLoop', 'assets/images/dinosaur-park-corridor-loop.jpg');
  assets.loadImage('enemyPterosaur', 'assets/images/enemy-pterosaur-sheet.png');
  assets.loadImage('enemyTriceratops', 'assets/images/enemy-triceratops-sheet.png');
  assets.loadImage('enemyBrachiosaurus', 'assets/images/enemy-brachiosaurus-sheet.png');
  assets.loadImage('bossTyrannosaurus', 'assets/images/boss-tyrannosaurus-sheet.png');

  const sound = new SoundManager(wxApi);
  const state = new GameState(width, height, sound);
  const input = new InputManager(wxApi, canvas);
  const renderer = new Renderer(ctx, { width, height }, assets);

  input.onGesture = function onGesture(points) {
    state.handleGesture(points);
  };
  input.onTap = function onTap(point) {
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
}

bootstrap();

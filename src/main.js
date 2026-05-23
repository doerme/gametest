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
  assets.loadImage('catWalk', 'assets/images/cat-walk-sheet.png');
  assets.loadImage('castleCorridorLoop', 'assets/images/castle-corridor-loop.jpg');

  const sound = new SoundManager(wxApi);
  const state = new GameState(width, height, sound);
  const input = new InputManager(wxApi, canvas);
  const renderer = new Renderer(ctx, { width, height }, assets);

  input.onGesture = function onGesture(points) {
    state.handleGesture(points);
  };
  input.onTap = function onTap() {
    state.handleTap();
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

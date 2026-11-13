'use strict';
const createRuntime = require('./platform/Runtime');
const { GameState, SCREENS } = require('./core/GameState');
const InputManager = require('./input/InputManager');
const ThreeRenderer = require('./three/ThreeRenderer');
const SoundManager = require('./audio/SoundManager');
const { isAudioToggleHit } = require('./ui/AudioToggle');
const { findItemAtPoint } = require('./ui/ItemBar');
const GAME_MODES = require('./core/GameMode');
const { getHanziLayout, contains } = require('./ui/HanziLayout');
const { isSpeedControlHit } = require('./ui/SpeedControl');

function bootstrap() {
  const platform = createRuntime();
  let renderer;
  try {
    let size = platform.getSize();
    const sound = new SoundManager(platform.wx);
    const state = new GameState(size.width, size.height, sound);
    state.healthNoticeVisible = true;
    renderer = new ThreeRenderer(platform, size.width, size.height);
    const input = new InputManager(platform.wx, platform.canvas, {
      getSize: () => size,
      captureGestureContext: (point) => state.gameMode === GAME_MODES.HANZI ? state.captureHanziStroke(point, renderer.getGestureContext(state)) : null,
      getGestureThreshold: (context) => context && context.gameMode === GAME_MODES.HANZI ? 3 : 10,
      isUiPoint: (point) => state.healthNoticeVisible
        || state.screen !== SCREENS.PLAYING
        || isAudioToggleHit(size.width, point)
        || isSpeedControlHit(size.width, point)
        || !!findItemAtPoint(size.width, size.height, state.items, point, state.gameMode)
        || (state.gameMode === GAME_MODES.HANZI && !contains(getHanziLayout(size.width, size.height).board, point))
    });
    input.onGesture = (points, context) => {
      if (!state.healthNoticeVisible) state.handleGesture(points, context || renderer.getGestureContext(state));
    };
    input.onTap = (point) => {
      if (state.healthNoticeVisible) state.healthNoticeVisible = false;
      else state.handleTap(point);
    };
    input.bind();

    let paused = false;
    let destroyed = false;
    let frameId;
    let last = Date.now();
    let frames = 0;
    let fpsStart = last;
    let fps = 0;
    function frame() {
      if (destroyed || paused) return;
      const now = Date.now();
      const dt = Math.min(0.033, Math.max(0, (now - last) / 1000));
      last = now;
      state.update(dt, renderer.getGestureContext(state));
      renderer.render(state, input, dt);
      frames += 1;
      if (now - fpsStart >= 1000) {
        fps = frames * 1000 / (now - fpsStart);
        frames = 0;
        fpsStart = now;
      }
      frameId = platform.raf(frame);
    }

    function hide() {
      if (paused) return;
      paused = true;
      platform.cancelRaf(frameId);
      input.cancel();
      input.lastCompletedPath = null;
      sound.pause();
    }
    function show() {
      if (!paused || destroyed) return;
      paused = false;
      last = Date.now();
      fpsStart = last;
      frames = 0;
      sound.resume();
      frame();
    }
    function resize() {
      const next = platform.getSize();
      if (next.width === size.width && next.height === size.height) return;
      input.cancel();
      input.lastCompletedPath = null;
      state.resize(next.width, next.height);
      size = next;
      renderer.resize(size.width, size.height);
    }
    const visibility = () => document.hidden ? hide() : show();
    const contextLost = (event) => {
      if (event.preventDefault) event.preventDefault();
      hide();
    };
    platform.canvas.addEventListener('webglcontextlost', contextLost);
    platform.canvas.addEventListener('webglcontextrestored', show);
    if (platform.wx) {
      if (platform.wx.onHide) platform.wx.onHide(hide);
      if (platform.wx.onShow) platform.wx.onShow(show);
      if (platform.wx.onWindowResize) platform.wx.onWindowResize(resize);
    } else {
      window.addEventListener('resize', resize);
      document.addEventListener('visibilitychange', visibility);
    }

    const game = {
      state, input, renderer, platform,
      pause: hide,
      resume: show,
      getStats: () => ({ ...renderer.getStats(), fps }),
      destroy() {
        if (destroyed) return;
        destroyed = true;
        platform.cancelRaf(frameId);
        input.destroy();
        sound.destroy();
        renderer.dispose();
        platform.canvas.removeEventListener('webglcontextlost', contextLost);
        platform.canvas.removeEventListener('webglcontextrestored', show);
        if (platform.wx) {
          if (platform.wx.offHide) platform.wx.offHide(hide);
          if (platform.wx.offShow) platform.wx.offShow(show);
          if (platform.wx.offWindowResize) platform.wx.offWindowResize(resize);
        } else {
          window.removeEventListener('resize', resize);
          document.removeEventListener('visibilitychange', visibility);
        }
      }
    };
    if (typeof __SPELL_DEV__ !== 'undefined' && __SPELL_DEV__ && typeof window !== 'undefined') {
      window.__spellGame = game;
    }
    frame();
    return game;
  } catch (error) {
    if (renderer) renderer.dispose();
    platform.reportError(error);
    return null;
  }
}
bootstrap();

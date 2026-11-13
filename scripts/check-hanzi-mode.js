'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { getHanziLayout } = require('../src/ui/HanziLayout');
const { getStartButtons, getContinueButton } = require('../src/ui/DifficultySelector');
const { getStrokeMedian, getStrokeCount } = require('../src/hanzi/Characters');
const { getSpeedControl } = require('../src/ui/SpeedControl');

async function dimensions(page) {
  await page.waitForFunction(() => {
    const g = window.__spellGame;
    return g.state.width === g.platform.canvas.clientWidth && g.state.height === g.platform.canvas.clientHeight;
  });
  return page.evaluate(() => {
    const g = window.__spellGame;
    const rect = g.platform.canvas.getBoundingClientRect();
    return { width: g.state.width, height: g.state.height, left: rect.left, top: rect.top, scaleX: rect.width / g.state.width, scaleY: rect.height / g.state.height };
  });
}

async function pointerStroke(page, normalized, size) {
  const b = getHanziLayout(size.width, size.height).board;
  const points = normalized.map((p) => ({ x: size.left + (b.x + p.x * b.width) * size.scaleX, y: size.top + (b.y + p.y * b.height) * size.scaleY }));
  await page.mouse.move(points[0].x, points[0].y); await page.mouse.down();
  for (const point of points.slice(1)) await page.mouse.move(point.x, point.y);
  await page.mouse.up();
  await page.evaluate(() => { const g = window.__spellGame; g.renderer.render(g.state, g.input, 0.05); });
}

async function fixture(page, character, options = {}) {
  return page.evaluate(({ character, strokeCount, count, strokeIndex, showcase }) => {
    const g = window.__spellGame; const s = g.state;
    g.pause(); s.start('normal', 'hanzi'); s.healthNoticeVisible = false;
    s.director.index = s.director.total;
    s.enemies = [0, 1].slice(0, count).map((i) => {
      const enemy = s.director.createEnemy(s.director.config.timeline[0], i);
      enemy.x = s.width * (i ? 0.76 : 0.26); enemy.y = s.height * (i ? 0.13 : 0.22); enemy.speed = 0;
      enemy.hanzi = { character, strokeCount, strokeIndex: i ? 0 : strokeIndex };
      return enemy;
    });
    if (showcase) { s.score = 1280; s.combo = 12; s.lives = 4; s.items = { healthPotion: 1, comboChain: 1 }; }
    g.renderer.render(s, g.input, 0.3);
    s.syncHanziTarget(g.renderer.getGestureContext(s).visibleEnemies);
    g.renderer.render(s, g.input, 0);
    return { target: s.hanziTarget && s.hanziTarget.hanzi.character, stats: g.getStats() };
  }, { character, strokeCount: getStrokeCount(character), count: options.count || 1, strokeIndex: options.strokeIndex || 0, showcase: !!options.showcase });
}

async function checkHanziMode(page, output) {
  const directory = path.join(output, 'hanzi'); fs.mkdirSync(directory, { recursive: true });
  const originalViewport = page.viewportSize();
  const screenshots = [];
  for (const viewport of [{ width: 390, height: 844 }, { width: 375, height: 667 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport);
    // Resize events may arrive on the next animation frame even while paused.
    await page.waitForFunction((height) => window.__spellGame.state.height === height, viewport.height);
    const size = await dimensions(page);
    await page.evaluate(() => { const g = window.__spellGame; g.pause(); g.state.start('normal'); g.state.screen = 'title'; g.state.healthNoticeVisible = false; g.renderer.render(g.state, g.input, 0.3); });
    const button = getStartButtons(size.width, size.height)[0];
    assert.ok(button.y + button.height < size.height);
    await page.screenshot({ path: path.join(directory, 'title-' + viewport.width + '.png') });
    await page.mouse.click(size.left + (button.x + button.width / 2) * size.scaleX, size.top + (button.y + button.height / 2) * size.scaleY);
    assert.deepStrictEqual(await page.evaluate(() => [window.__spellGame.state.gameMode, window.__spellGame.state.screen]), ['hanzi', 'playing']);

    const scene = await fixture(page, '是', { count: 2, strokeIndex: 3, showcase: true });
    assert.strictEqual(scene.target, '是');
    assert.strictEqual(scene.stats.textures, 2);
    assert.ok(scene.stats.calls <= 200 && scene.stats.triangles <= 100000);
    const name = 'playing-' + viewport.width + '.png';
    await page.screenshot({ path: path.join(directory, name) });
    screenshots.push({ ...viewport, ...scene.stats, screenshot: 'hanzi/' + name });
  }

  let size = await dimensions(page);
  await fixture(page, '水');
  await pointerStroke(page, getStrokeMedian('水', 1), size);
  assert.strictEqual(await page.evaluate(() => window.__spellGame.state.hanziTarget.hanzi.strokeIndex), 0, 'out-of-order input cannot advance the target');
  await pointerStroke(page, getStrokeMedian('水', 0).slice().reverse(), size);
  assert.strictEqual(await page.evaluate(() => window.__spellGame.state.score), 0);
  for (let i = 0; i < 4; i += 1) {
    await pointerStroke(page, getStrokeMedian('水', i), size);
    const progress = await page.evaluate(() => ({ score: window.__spellGame.state.score, count: window.__spellGame.state.enemies.length, stroke: window.__spellGame.state.hanziTarget && window.__spellGame.state.hanziTarget.hanzi.strokeIndex, combo: window.__spellGame.state.combo }));
    if (i < 3) { assert.strictEqual(progress.stroke, i + 1); assert.strictEqual(progress.score, 0); assert.strictEqual(progress.count, 1); }
    else { assert.strictEqual(progress.score, 100); assert.strictEqual(progress.count, 0); assert.strictEqual(progress.combo, 1); }
  }

  // Actual visibility lifecycle cancels the unfinished stroke, retaining the first.
  await fixture(page, '水'); await pointerStroke(page, getStrokeMedian('水', 0), size);
  await page.evaluate(() => window.__spellGame.resume());
  const b = getHanziLayout(size.width, size.height).board;
  const first = getStrokeMedian('水', 1)[0];
  await page.mouse.move(size.left + (b.x + first.x * b.width) * size.scaleX, size.top + (b.y + first.y * b.height) * size.scaleY); await page.mouse.down();
  await page.mouse.move(size.left + (b.x + b.width / 2) * size.scaleX, size.top + (b.y + b.height / 2) * size.scaleY);
  await page.evaluate(() => window.__spellGame.pause()); await page.mouse.up();
  assert.strictEqual(await page.evaluate(() => window.__spellGame.state.hanziTarget.hanzi.strokeIndex), 1);
  await pointerStroke(page, getStrokeMedian('水', 1), size);
  assert.strictEqual(await page.evaluate(() => window.__spellGame.state.hanziTarget.hanzi.strokeIndex), 2);

  // Freeze changes neither confirmed strokes nor score and keeps writing enabled.
  const freeze = await page.evaluate(() => {
    const g = window.__spellGame; const s = g.state; s.items.comboChain = 2;
    s.enemies[0].speed = 20; const beforeY = s.enemies[0].y; const elapsed = s.elapsed;
    s.useItem('comboChain'); s.update(2, g.renderer.getGestureContext(s));
    const frozen = s.enemies[0].y === beforeY && s.elapsed === elapsed && s.enemies[0].hanzi.strokeIndex === 2;
    s.useItem('comboChain'); g.renderer.render(s, g.input, 0);
    return { frozen, duration: s.freezeRemaining };
  });
  assert.ok(freeze.frozen); assert.strictEqual(freeze.duration, 3);
  await pointerStroke(page, getStrokeMedian('水', 2), size);
  assert.strictEqual(await page.evaluate(() => window.__spellGame.state.hanziTarget.hanzi.strokeIndex), 3);
  await page.screenshot({ path: path.join(directory, 'freeze-and-progress.png') });

  // Exercise the six actual transition buttons, and reset back to symbol mode.
  await page.evaluate(() => window.__spellGame.state.start('normal', 'hanzi'));
  for (let level = 1; level <= 6; level += 1) {
    await page.evaluate(() => { const g = window.__spellGame; const s = g.state; s.enemies = []; s.director.index = s.director.total; s.update(0); g.renderer.render(s, g.input, 0.3); });
    if (level < 6) {
      assert.strictEqual(await page.evaluate(() => window.__spellGame.state.screen), 'level-transition');
      const button = getContinueButton(size.width, size.height);
      await page.mouse.click(size.left + (button.x + button.width / 2) * size.scaleX, size.top + (button.y + button.height / 2) * size.scaleY);
      assert.deepStrictEqual(await page.evaluate(() => ({ mode: window.__spellGame.state.gameMode, level: window.__spellGame.state.level, speed: window.__spellGame.state.timeScale })), { mode: 'hanzi', level: level + 1, speed: 1 });
    } else assert.strictEqual(await page.evaluate(() => window.__spellGame.state.screen), 'win');
  }
  await page.mouse.click(size.left + size.width / 2 * size.scaleX, size.height / 2);
  assert.strictEqual(await page.evaluate(() => window.__spellGame.state.gameMode), 'hanzi');
  await page.evaluate(() => window.__spellGame.state.start('normal', 'symbol'));
  await page.setViewportSize(originalViewport);
  return { screenshots, pointerStrokeOrder: true, completeCharacterRequired: true, lifecycleRetainsProgress: true, freeze, sixTransitions: true };
}

async function checkWechatHanzi(browser, url, bundle, output) {
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url); await page.waitForFunction(() => !!window.__spellGame);
  const board = getHanziLayout(375, 667).board;
  const pixels = (character, stroke) => getStrokeMedian(character, stroke).map((p) => ({ x: board.x + p.x * board.width, y: board.y + p.y * board.height }));
  const button = getStartButtons(375, 667)[0];
  const speed = getSpeedControl(375);
  const result = await page.evaluate(({ code, button, one, two, speed }) => {
    window.__spellGame.destroy(); document.body.innerHTML = '';
    const canvas = document.createElement('canvas'); canvas.style.width = '375px'; canvas.style.height = '667px'; document.body.appendChild(canvas);
    const callbacks = {}; const sounds = []; const modals = []; const speedLabels = []; let queued; let time = Date.now(); let count = 0;
    const RealDate = Date; class Clock extends RealDate { static now() { return time; } }
    const api = {
      getSystemInfoSync: () => ({ windowWidth: 375, windowHeight: 667, pixelRatio: 1.5 }),
      createCanvas() {
        const value = count++ === 0 ? canvas : document.createElement('canvas');
        if (value === canvas) {
          const get = value.getContext.bind(value);
          value.getContext = (name, options) => {
            if (name === 'webgl2') return null;
            const gl = get(name, options); const extension = gl.getExtension.bind(gl);
            gl.getExtension = (key) => ['OES_standard_derivatives', 'EXT_sRGB'].includes(key) ? null : extension(key);
            return gl;
          };
        } else {
          const get = value.getContext.bind(value);
          value.getContext = (name, options) => {
            const context = get(name, options);
            if (name === '2d' && !context.__trackedSpeed) {
              context.__trackedSpeed = true;
              const fillText = context.fillText.bind(context);
              context.fillText = (text, ...args) => {
                if (/^\d\.\d{2}×$/.test(text)) speedLabels.push(text);
                return fillText(text, ...args);
              };
            }
            return context;
          };
        }
        return value;
      },
      createInnerAudioContext: () => ({ play() { sounds.push(this.src); }, stop() {}, pause() {} }),
      onTouchStart: (fn) => { callbacks.start = fn; }, onTouchMove: (fn) => { callbacks.move = fn; }, onTouchEnd: (fn) => { callbacks.end = fn; }, onTouchCancel: (fn) => { callbacks.cancel = fn; },
      onHide: (fn) => { callbacks.hide = fn; }, onShow: (fn) => { callbacks.show = fn; }, showModal: (modal) => modals.push(modal)
    };
    const raf = (fn) => { queued = fn; return 1; };
    const run = new Function('wx', 'document', 'window', 'self', 'navigator', 'HTMLCanvasElement', 'Path2D', 'requestAnimationFrame', 'cancelAnimationFrame', 'Date', code);
    run(api, undefined, undefined, { requestAnimationFrame: raf, cancelAnimationFrame() {} }, undefined, undefined, undefined, raf, () => {}, Clock);
    const tick = (frames) => { for (let i = 0; i < frames; i += 1) { time += 1000 / 60; if (queued) queued(); } };
    const touch = (p) => ({ identifier: 1, clientX: p.x, clientY: p.y });
    const tap = (x, y) => { callbacks.start({ touches: [touch({ x, y })] }); callbacks.end({ changedTouches: [touch({ x, y })] }); };
    const stroke = (points) => { callbacks.start({ touches: [touch(points[0])] }); points.slice(1, -1).forEach((p) => callbacks.move({ touches: [touch(p)] })); callbacks.end({ changedTouches: [touch(points[points.length - 1])] }); tick(2); };
    const vanished = () => sounds.filter((name) => name.endsWith('/sfx-vanish.wav')).length;
    if (modals.length) return { modals };
    tap(180, 450); tick(1); tap(button.x + button.width / 2, button.y + button.height / 2); tick(135);
    stroke(one.slice().reverse()); const reversed = vanished();
    stroke(one); const completedOne = vanished();
    const tapSpeed = (rect) => { tap(rect.x + rect.width / 2, rect.y + rect.height / 2); tick(1); };
    for (let i = 0; i < 5; i += 1) tapSpeed(speed.plus);
    for (let i = 0; i < 7; i += 1) tapSpeed(speed.minus);
    for (let i = 0; i < 3; i += 1) tapSpeed(speed.plus);
    tick(310); stroke(two[0]); const incompleteTwo = vanished();
    callbacks.start({ touches: [touch(two[1][0])] }); callbacks.move({ touches: [touch(two[1][1])] });
    callbacks.hide(); callbacks.show(); tick(2);
    callbacks.end({ changedTouches: [touch(two[1][two[1].length - 1])] }); tick(1);
    const canceled = vanished(); stroke(two[1]);
    return { modals, reversed, completedOne, incompleteTwo, canceled, completedTwo: vanished(), offscreenCanvases: count - 1, speeds: [...new Set(speedLabels)], resumedSpeed: speedLabels[speedLabels.length - 1] };
  }, { code: bundle, button, one: pixels('一', 0), two: [pixels('二', 0), pixels('二', 1)], speed });
  assert.deepStrictEqual(result.modals, []);
  assert.strictEqual(result.reversed, 0);
  assert.strictEqual(result.completedOne, 1);
  assert.strictEqual(result.incompleteTwo, 1);
  assert.strictEqual(result.canceled, 1);
  assert.strictEqual(result.completedTwo, 2);
  assert.strictEqual(result.offscreenCanvases, 2);
  assert.deepStrictEqual(result.speeds.slice().sort(), ['0.50×', '0.75×', '1.00×', '1.25×', '1.50×', '1.75×', '2.00×']);
  assert.strictEqual(result.resumedSpeed, '1.25×');
  assert.deepStrictEqual(errors, []);
  await page.screenshot({ path: path.join(output, 'hanzi/wechat-webgl1.png') });
  await page.close();
  return result;
}

module.exports = { checkHanziMode, checkWechatHanzi };

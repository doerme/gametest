'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { CURRICULA } = require('../src/hanzi/Curricula');
const { getLevelCharacters, getStrokeCount, getStrokeMedian } = require('../src/hanzi/Characters');
const { getStartButtons, getContinueButton } = require('../src/ui/DifficultySelector');
const { getCurriculumSelectionLayout } = require('../src/ui/CurriculumSelector');
const { CURRICULUM_KEY } = require('../src/ui/CurriculumPreference');
const { getHanziLayout } = require('../src/ui/HanziLayout');

async function checkCurricula(page, output) {
  const directory = path.join(output, 'hanzi');
  fs.mkdirSync(directory, { recursive: true });
  const original = page.viewportSize();
  const cases = [];
  const click = async (rect) => {
    const point = await page.evaluate((rect) => {
      const g = window.__spellGame; const box = g.platform.canvas.getBoundingClientRect();
      return { x: box.left + (rect.x + rect.width / 2) * box.width / g.state.width,
        y: box.top + (rect.y + rect.height / 2) * box.height / g.state.height };
    }, rect);
    await page.mouse.click(point.x, point.y);
    await page.evaluate(() => { const g = window.__spellGame; g.renderer.render(g.state, g.input, 0); });
  };
  for (const viewport of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.waitForFunction((height) => window.__spellGame.state.height === height, viewport.height);
    const size = await page.evaluate(() => ({ width: window.__spellGame.state.width, height: window.__spellGame.state.height }));
    const layout = getCurriculumSelectionLayout(size.width, size.height);
    for (const curriculum of CURRICULA) {
      await page.evaluate(() => {
        const g = window.__spellGame; g.pause(); g.state.healthNoticeVisible = false; g.state.screen = 'title';
        g.state.enemies = []; g.state.clearHanziTarget();
        g.renderer.render(g.state, g.input, 0);
      });
      await click(getStartButtons(size.width, size.height)[0]);
      assert.strictEqual(await page.evaluate(() => window.__spellGame.state.screen), 'hanzi-selection');
      await click(layout.grades[curriculum.grade - 1]); await click(layout.semesters[curriculum.semester - 1]);
      assert.strictEqual(await page.evaluate(() => window.__spellGame.state.selectedCurriculumId), curriculum.id);
      if (curriculum.id === 'g6-s2') await page.screenshot({ path: path.join(directory, 'curriculum-grade6-' + viewport.width + '.png') });
      await click(layout.start);
      for (let level = 1; level <= (viewport.width === 375 ? 6 : 1); level += 1) {
        const state = await page.evaluate(() => {
          const g = window.__spellGame; const s = g.state;
          const enemy = s.director.createEnemy(s.director.config.timeline[0], 0);
          enemy.x = s.width / 2; enemy.y = s.hero.y - 130; enemy.speed = 0;
          s.enemies = [enemy]; g.renderer.render(s, g.input, 0.1);
          return { screen: s.screen, id: s.hanziCurriculumId, level: s.level, total: s.director.total,
            characters: s.director.config.timeline.map((spawn) => spawn.character), textures: g.getStats().textures };
        });
        assert.strictEqual(state.screen, 'playing'); assert.strictEqual(state.id, curriculum.id); assert.strictEqual(state.level, level);
        assert.strictEqual(state.total, 22); assert.ok(state.characters.every((character) => curriculum.characters.includes(character)));
        assert.ok(state.textures <= 3, 'switching books releases previous atlas textures');
        if (viewport.width === 375) {
          await page.evaluate(() => { const g = window.__spellGame; const s = g.state; s.enemies = []; s.director.index = s.director.total; s.update(0); g.renderer.render(s, g.input, 0); });
          if (level < 6) await click(getContinueButton(size.width, size.height));
          else assert.strictEqual(await page.evaluate(() => window.__spellGame.state.screen), 'win');
        }
      }
      cases.push({ width: viewport.width, curriculum: curriculum.id });
    }
  }
  // A dense upper-grade glyph exercises the actual guide, atlas and pointer path.
  const hardestBook = CURRICULA.find((book) => book.characters.includes('囊')) || CURRICULA[CURRICULA.length - 1];
  const hardest = Array.from(hardestBook.characters).sort((a, b) => getStrokeCount(b) - getStrokeCount(a))[0];
  await page.evaluate(({ id, character, strokes }) => {
    const g = window.__spellGame; const s = g.state; s.start('normal', 'hanzi', id); s.speedHintRemaining = 0;
    const enemy = s.director.createEnemy(s.director.config.timeline[0], 0);
    enemy.x = s.width / 2; enemy.y = s.hero.y - 130; enemy.speed = 0;
    enemy.hanzi = { character, strokeCount: strokes, strokeIndex: 0 }; s.enemies = [enemy]; s.director.index = s.director.total;
    g.renderer.render(s, g.input, 0); s.syncHanziTarget(g.renderer.getGestureContext(s).visibleEnemies); g.renderer.render(s, g.input, 0);
  }, { id: hardestBook.id, character: hardest, strokes: getStrokeCount(hardest) });
  const size = await page.evaluate(() => {
    const g = window.__spellGame; const rect = g.platform.canvas.getBoundingClientRect();
    return { width: g.state.width, height: g.state.height, x: rect.left, y: rect.top, scaleX: rect.width / g.state.width, scaleY: rect.height / g.state.height };
  });
  const board = getHanziLayout(size.width, size.height).board;
  for (let index = 0; index < getStrokeCount(hardest); index += 1) {
    const points = getStrokeMedian(hardest, index).map((point) => ({ x: size.x + (board.x + point.x * board.width) * size.scaleX,
      y: size.y + (board.y + point.y * board.height) * size.scaleY }));
    await page.mouse.move(points[0].x, points[0].y); await page.mouse.down();
    for (const point of points.slice(1)) await page.mouse.move(point.x, point.y);
    await page.mouse.up();
  }
  assert.strictEqual(await page.evaluate(() => window.__spellGame.state.score), 100);
  assert.strictEqual(await page.evaluate(() => window.__spellGame.state.enemies.length), 0);
  await page.reload(); await page.waitForFunction(() => !!window.__spellGame);
  await page.evaluate(() => { const g = window.__spellGame; g.pause(); g.state.healthNoticeVisible = false; });
  const reloadSize = await page.evaluate(() => ({ width: window.__spellGame.state.width, height: window.__spellGame.state.height }));
  await click(getStartButtons(reloadSize.width, reloadSize.height)[0]);
  assert.strictEqual(await page.evaluate(() => window.__spellGame.state.selectedCurriculumId), hardestBook.id);
  await page.setViewportSize(original);
  return { cases, denseGlyph: { character: hardest, strokes: getStrokeCount(hardest) }, savedSelection: true };
}

async function checkWechatCurricula(browser, url, bundle, output) {
  const results = [];
  const layout = getCurriculumSelectionLayout(375, 667);
  const board = getHanziLayout(375, 667).board;
  for (const curriculum of CURRICULA) {
    const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    try {
      await page.goto(url); await page.waitForFunction(() => !!window.__spellGame);
      const gradeCode = fs.readFileSync(path.join(__dirname, '../dist/wechat/hanzi/grade-' + curriculum.grade + '/game.js'), 'utf8');
      const traces = Object.fromEntries(getLevelCharacters(curriculum.id)[0].map((character) => [character,
        Array.from({ length: getStrokeCount(character) }, (_, index) => getStrokeMedian(character, index).map((p) => ({
          x: board.x + p.x * board.width, y: board.y + p.y * board.height
        })))]));
      const result = await page.evaluate(async ({ bundle, gradeCode, curriculum, layout, titleButton, traces, storageKey }) => {
        window.__spellGame.destroy(); document.body.innerHTML = '';
        const canvas = document.createElement('canvas'); document.body.appendChild(canvas);
        const callbacks = {}; const gameGlobal = {}; const storage = new Map(); const sounds = []; const requests = []; const modals = [];
        let queued; let waiting; let canvasCount = 0; let labels = []; let now = Date.now();
        const RealDate = Date; class Clock extends RealDate { static now() { return now; } }
        const api = {
          getSystemInfoSync: () => ({ windowWidth: 375, windowHeight: 667, pixelRatio: 1.5 }),
          createCanvas() {
            const index = canvasCount++; const value = index === 0 ? canvas : document.createElement('canvas');
            const get = value.getContext.bind(value);
            value.getContext = (name, options) => {
              if (index === 0 && name === 'webgl2') return null;
              const context = get(name, options);
              if (index === 1 && name === '2d' && !context.__labels) {
                context.__labels = true; const clear = context.clearRect.bind(context), fill = context.fillText.bind(context);
                context.clearRect = (...args) => { labels = []; clear(...args); };
                context.fillText = (text, ...args) => { labels.push(String(text)); fill(text, ...args); };
              }
              return context;
            };
            return value;
          },
          loadSubpackage: (options) => { requests.push(options.name); waiting = options; },
          getStorageSync: (key) => storage.get(key), setStorageSync: (key, value) => storage.set(key, value),
          createInnerAudioContext: () => ({ play() { sounds.push(this.src); }, stop() {}, pause() {} }),
          onTouchStart: (fn) => { callbacks.start = fn; }, onTouchMove: (fn) => { callbacks.move = fn; },
          onTouchEnd: (fn) => { callbacks.end = fn; }, onTouchCancel: (fn) => { callbacks.cancel = fn; },
          onHide: (fn) => { callbacks.hide = fn; }, onShow: (fn) => { callbacks.show = fn; }, showModal: (modal) => modals.push(modal)
        };
        const raf = (fn) => { queued = fn; return 1; };
        new Function('wx', 'GameGlobal', 'document', 'window', 'self', 'navigator', 'HTMLCanvasElement', 'Path2D', 'requestAnimationFrame', 'cancelAnimationFrame', 'Date', bundle)(
          api, gameGlobal, undefined, undefined, { requestAnimationFrame: raf, cancelAnimationFrame() {} }, undefined, undefined, undefined, raf, () => {}, Clock);
        const tick = (count = 1) => { for (let i = 0; i < count; i += 1) { now += 1000 / 60; if (queued) queued(); } };
        const touch = (p) => ({ identifier: 1, clientX: p.x, clientY: p.y });
        const tap = (r) => { const p = { x: r.x + r.width / 2, y: r.y + r.height / 2 }; callbacks.start({ touches: [touch(p)] }); callbacks.end({ changedTouches: [touch(p)] }); tick(); };
        const flush = async () => { for (let i = 0; i < 12; i += 1) await Promise.resolve(); tick(); };
        if (modals.length) return { modals };
        tap({ x: 1, y: 1, width: 1, height: 1 }); tap(titleButton);
        tap(layout.grades[curriculum.grade - 1]); tap(layout.semesters[curriculum.semester - 1]); tap(layout.start); await flush();
        let canceledLoadStayedOnTitle = false; let retryVisible = false;
        if (curriculum.id !== 'g1-s1') {
          if (!labels.includes('正在加载字库…')) throw new Error('missing loading UI: ' + curriculum.id);
          if (curriculum.id === 'g6-s2') {
            waiting.fail(new Error('offline')); await flush(); retryVisible = labels.includes('重新加载字库');
            tap(layout.start); await flush(); tap(layout.back);
            new Function('GameGlobal', gradeCode)(gameGlobal); waiting.success(); await flush();
            canceledLoadStayedOnTitle = labels.includes('开始汉字模式');
            tap(titleButton); tap(layout.grades[5]); tap(layout.semesters[1]); tap(layout.start); await flush();
          } else { new Function('GameGlobal', gradeCode)(gameGlobal); waiting.success(); await flush(); }
        }
        tick(150);
        const label = labels.find((text) => text.startsWith('写一写 · '));
        const character = label && label.slice('写一写 · '.length);
        if (!character || !traces[character]) throw new Error('missing selected-book target: ' + curriculum.id + ' / ' + labels.join(','));
        for (const points of traces[character]) {
          callbacks.start({ touches: [touch(points[0])] });
          points.slice(1, -1).forEach((p) => callbacks.move({ touches: [touch(p)] }));
          callbacks.end({ changedTouches: [touch(points[points.length - 1])] }); tick(2);
        }
        callbacks.hide();
        return { modals, id: curriculum.id, requests, character, completed: sounds.filter((name) => name.endsWith('sfx-vanish.wav')).length,
          saved: storage.get(storageKey), canceledLoadStayedOnTitle, retryVisible };
      }, { bundle, gradeCode, curriculum, layout, traces, storageKey: CURRICULUM_KEY, titleButton: getStartButtons(375, 667)[0] });
      assert.deepStrictEqual(result.modals, []); assert.strictEqual(result.saved, curriculum.id);
      assert.strictEqual(result.completed, 1); assert.ok(curriculum.characters.includes(result.character));
      assert.ok(result.requests.every((name) => name === 'hanzi-grade-' + curriculum.grade));
      if (curriculum.id === 'g1-s1') assert.strictEqual(result.requests.length, 0);
      if (curriculum.id === 'g6-s2') { assert.ok(result.retryVisible); assert.ok(result.canceledLoadStayedOnTitle); }
      assert.deepStrictEqual(errors, []);
      if (curriculum.semester === 2) await page.screenshot({ path: path.join(output, 'hanzi/wechat-curriculum-' + curriculum.id + '.png') });
      results.push(result);
    } finally { await page.close(); }
  }
  return results;
}

module.exports = { checkCurricula, checkWechatCurricula };

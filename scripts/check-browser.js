'use strict';
// Real GPU browser smoke tests, plus the actual WeChat CJS bundle in a DOM-less wx harness.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const checkAttackEffects = require('./check-attack-effects');
const checkThemeScenes = require('./check-theme-scenes');
const { checkHanziMode, checkWechatHanzi } = require('./check-hanzi-mode');
const checkSpeedControls = require('./check-speed-controls');
const checkTitleCat = require('./check-title-cat');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'output/three-qa');
const themes = ['castle', 'ocean', 'penguinHotel', 'dinosaurPark', 'skyCity', 'seaTrain'];

async function main() {
  fs.mkdirSync(output, { recursive: true });
  execFileSync(process.execPath, ['scripts/build.js'], { cwd: root, stdio: 'inherit' });
  const server = http.createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (relative === '/favicon.ico') { response.writeHead(204); response.end(); return; }
    const file = path.resolve(root, relative === '/' ? 'index.html' : '.' + relative);
    if (!file.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { response.writeHead(404); response.end(); return; }
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.m4a': 'audio/mp4', '.wav': 'audio/wav' };
      response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); response.end(data);
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const errors = []; const requests = [];
    page.on('pageerror', (error) => errors.push(error.message)); page.on('request', (request) => requests.push(request.url()));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(url); await page.waitForFunction(() => !!window.__spellGame);
    await page.mouse.click(195, 650); await page.screenshot({ path: path.join(output, 'title.png') });
    const titleCat = await checkTitleCat(page, output);
    // Start via UI, then exercise a true two-event swipe through browser pointer input.
    await page.mouse.click(195, 844 * 0.53 + 72 + 29);
    await page.evaluate(() => { const g = window.__spellGame; g.pause(); g.state.enemies = [g.state.director.createEnemy(g.state.director.config.timeline[0], 0)]; g.state.director.index = g.state.director.total; g.renderer.render(g.state, g.input, 0); });
    await page.mouse.move(90, 420); await page.mouse.down(); await page.mouse.move(220, 420); await page.mouse.up();
    assert.strictEqual(await page.evaluate(() => window.__spellGame.state.score), 100);
    const bossHasVisibleBadge = await page.evaluate(() => {
      const g = window.__spellGame; const s = g.state;
      const enemy = s.director.createEnemy(s.director.config.timeline[21], 21); enemy.radius = 62; enemy.x = s.width / 2; enemy.y = s.height * 0.2; enemy.symbols = ['z', 'm'];
      s.enemies = [enemy]; g.renderer.render(s, g.input, 0.3);
      return g.renderer.getGestureContext(s).expectedSymbols.includes('z');
    });
    assert.strictEqual(bossHasVisibleBadge, true, 'visible boss bodies retain readable badges even when their crowns cross the top edge');
    const metrics = [];
    for (const theme of themes) {
      const stats = await page.evaluate((themeId) => {
        const g = window.__spellGame; const s = g.state; g.pause();
        s.healthNoticeVisible = false; s.level = 6; s.themeOrder[5] = themeId; s.screen = 'playing'; s.feedback = null; s.effects = []; s.score = 1280; s.combo = 8; g.input.lastCompletedPath = null;
        s.director.startLevel(6, themeId); s.director.index = s.director.total; s.elapsed = 0; s.enemies = [];
        const species = [...new Set(s.director.theme.species)];
        species.forEach((name, i) => {
          const index = s.director.theme.species.indexOf(name); const enemy = s.director.createEnemy(s.director.config.timeline[index], index);
          enemy.x = s.width * (0.26 + (i % 2) * 0.48); enemy.y = s.height * (0.25 + Math.floor(i / 2) * 0.20); enemy.symbols = [['up'], ['v'], ['circle'], ['s']][i] || ['m']; s.enemies.push(enemy);
        });
        if (themeId === 'castle') { const enemy = s.director.createEnemy(s.director.config.timeline[21], 21); enemy.x = s.width * 0.70; enemy.y = s.height * 0.45; enemy.symbols = ['z', 'm', 'up']; s.enemies.push(enemy); }
        g.renderer.render(s, g.input, 0.25); g.renderer.render(s, g.input, 0.25);
        return g.getStats();
      }, theme);
      assert.ok(stats.calls <= 200, theme + ' draw-call budget: ' + stats.calls); assert.ok(stats.triangles <= 100000, theme + ' triangle budget: ' + stats.triangles);
      assert.strictEqual(stats.textures, 2, 'only the HUD and symbol atlas use textures');
      await page.screenshot({ path: path.join(output, theme + '.png') }); metrics.push({ theme, ...stats });
    }
    const themeScenes = await checkThemeScenes(page, output, themes);
    const attackFeedback = await checkAttackEffects(page, output, themes);
    // Repeat a complete theme cycle: GPU resource counts must plateau after prefab warmup.
    const resources = [];
    for (let pass = 0; pass < 3; pass += 1) {
      for (const theme of themes) await page.evaluate((id) => { const g = window.__spellGame; g.state.themeOrder[5] = id; g.renderer.render(g.state, g.input, 0.3); }, theme);
      resources.push(await page.evaluate(() => window.__spellGame.getStats().geometries));
    }
    assert.strictEqual(resources[1], resources[2], 'theme changes release old geometries');
    await page.evaluate(() => {
      const g = window.__spellGame; const s = g.state; s.screen = 'playing'; s.level = 6; s.themeOrder[5] = 'skyCity'; s.director.startLevel(6, 'skyCity'); s.director.index = s.director.total; s.enemies = [];
      for (let i = 0; i < 7; i += 1) { const enemy = s.director.createEnemy(s.director.config.timeline[i], i); enemy.x = s.width * (0.24 + i % 2 * 0.5); enemy.y = s.height * (0.18 + Math.floor(i / 2) * 0.06); enemy.speed = 0; s.enemies.push(enemy); }
      g.resume();
    });
    await page.waitForTimeout(2400);
    const livePerformance = await page.evaluate(() => { const g = window.__spellGame; const stats = g.getStats(); g.pause(); return stats; });
    // Context restoration rebuilds Three's GPU state and resumes the single game loop.
    await page.evaluate(() => { window.__loseExtension = window.__spellGame.renderer.renderer.getContext().getExtension('WEBGL_lose_context'); window.__loseExtension.loseContext(); });
    await page.waitForTimeout(100);
    await page.evaluate(() => window.__loseExtension.restoreContext());
    await page.waitForFunction(() => !window.__spellGame.renderer.renderer.getContext().isContextLost());
    assert.strictEqual(await page.evaluate(() => window.__spellGame.renderer.renderer.info.autoReset), false);
    await page.evaluate(() => window.__spellGame.pause());
    // Simulate every theme/level pairing on the CPU, then render its heaviest snapshots.
    // This avoids flooding the GPU with thousands of frames in one synchronous JS turn.
    const peak = await page.evaluate((themeIds) => {
      const g = window.__spellGame; const s = g.state; const result = [];
      const complexity = (root) => {
        let triangles = 0; let calls = 0;
        root.traverse((node) => { if (node.isMesh) { triangles += (node.geometry.index ? node.geometry.index.count : node.geometry.attributes.position.count) / 3; calls += 1; } });
        return { triangles, calls };
      };
      const weights = new Map();
      for (let level = 1; level <= 6; level += 1) {
        for (const theme of themeIds) {
          s.level = level; s.themeOrder[level - 1] = theme; s.screen = 'playing'; s.director.startLevel(level, theme); s.director.index = 0; s.elapsed = 0; s.enemies = []; s.effects = [];
          const maximum = { calls: 0, triangles: 0, enemies: 0, triangleUpperBound: 0 };
          let heaviest = { triangles: -1, calls: -1 }; let snapshots = [];
          for (let frame = 0; frame < 1500; frame += 1) {
            s.elapsed += 0.05; s.director.update(s.elapsed, s.enemies);
            s.enemies.forEach((enemy) => enemy.update(0.05, s.hero, 1)); s.enemies = s.enemies.filter((enemy) => !enemy.dead);
            const weight = s.enemies.reduce((sum, enemy) => {
              const key = enemy.species + enemy.kind;
              if (!weights.has(key)) weights.set(key, complexity(g.renderer.models.create(enemy.species, enemy.kind === 'boss')));
              const w = weights.get(key); return { triangles: sum.triangles + w.triangles, calls: sum.calls + w.calls };
            }, { triangles: 0, calls: 0 });
            maximum.enemies = Math.max(maximum.enemies, s.enemies.length);
            if (weight.triangles >= heaviest.triangles || weight.calls >= heaviest.calls) {
              if (weight.triangles > heaviest.triangles || weight.calls > heaviest.calls) snapshots = [];
              heaviest = { triangles: Math.max(weight.triangles, heaviest.triangles), calls: Math.max(weight.calls, heaviest.calls) };
              snapshots.push({ elapsed: s.elapsed, enemies: s.enemies.map((enemy) => Object.assign(Object.create(Object.getPrototypeOf(enemy)), enemy, { symbols: enemy.symbols.slice() })) });
              if (snapshots.length > 2) snapshots.shift();
            }
          }
          for (const snapshot of snapshots) {
            s.enemies = snapshot.enemies; s.elapsed = snapshot.elapsed; s.effects = [];
            if (s.enemies.length) for (let i = 0; i < 24; i++) s.triggerAttack(s.enemies[i % s.enemies.length]);
            s.effects.forEach((effect) => { effect.age = 0.09; });
            g.renderer.render(s, g.input, 0.5);
            const stats = g.getStats(); maximum.calls = Math.max(maximum.calls, stats.calls); maximum.triangles = Math.max(maximum.triangles, stats.triangles);
          }
          // Conservative all-in-view bound also covers intermediate camera positions.
          maximum.triangleUpperBound = heaviest.triangles + complexity(g.renderer.theme).triangles + complexity(g.renderer.hero).triangles + 1000 + g.renderer.effects.attacks.positions.count / 3;
          result.push({ level, theme, ...maximum });
        }
      }
      return result;
    }, themes);
    peak.forEach((entry) => { assert.ok(entry.calls <= 200, 'level peak draw calls'); assert.ok(entry.triangleUpperBound <= 100000, 'level triangle bound: ' + JSON.stringify(entry)); });
    // All six transitions and win preserve the existing run lifecycle.
    await page.evaluate(() => { const g = window.__spellGame; const s = g.state; s.start('normal', 'symbol'); for (let i = 0; i < 5; i += 1) { s.enemies = []; s.director.index = s.director.total; s.update(0); if (s.screen !== 'level-transition') throw new Error('missing transition'); s.startNextLevel(); } s.enemies = []; s.director.index = s.director.total; s.update(0); if (s.screen !== 'win') throw new Error('missing win'); });
    assert.strictEqual(requests.some((request) => /assets\/images\//.test(request)), false);
    assert.deepStrictEqual(errors, []);
    // Small-screen UI and resizes keep pointer coordinates and projected badges aligned.
    await page.setViewportSize({ width: 320, height: 568 });
    await page.evaluate(() => { const g = window.__spellGame; g.state.screen = 'playing'; g.state.combo = 12; g.state.gestureFailures = 1; g.state.feedback = { type: 'retry', text: '再画一次，连击已保护', guideSymbol: 'm', age: 0 }; g.renderer.render(g.state, g.input, 0.3); });
    await page.screenshot({ path: path.join(output, 'small-screen-retry.png') });
    const dimensions = await page.evaluate(() => ({ state: window.__spellGame.state.width, hud: window.__spellGame.renderer.hud.width, css: document.getElementById('game').clientWidth }));
    assert.strictEqual(dimensions.state, dimensions.css); assert.strictEqual(dimensions.hud, dimensions.css);
    const hanzi = await checkHanziMode(page, output);
    const speedControls = await checkSpeedControls(page, output);
    // Execute the actual shipping bundle with no document/window, forcing WebGL 1.
    const wxPage = await browser.newPage({ viewport: { width: 375, height: 667 } });
    const nativeErrors = [];
    wxPage.on('pageerror', (e) => nativeErrors.push(e.message));
    wxPage.on('console', (m) => { if (m.type() === 'error' || /sRGBToLinear|INVALID_OPERATION/.test(m.text())) nativeErrors.push(m.text()); });
    await wxPage.goto(url);
    const bundle = fs.readFileSync(path.join(root, 'dist/wechat/game.js'), 'utf8');
    assert.ok(!bundle.includes('assets/images/')); assert.ok(!bundle.includes('phaser/dist'));
    assert.ok(!bundle.includes('__spellGame'), 'the shipping build strips the development API');
    const native = await wxPage.evaluate((code) => {
      window.__spellGame.destroy(); document.body.innerHTML = '';
      const canvas = document.createElement('canvas'); document.body.appendChild(canvas);
      const callbacks = {}; const audioEvents = []; const modals = []; const shaders = new Set(); let queued; let time = Date.now(); let count = 0; let contextName;
      const RealDate = Date; class Clock extends RealDate { static now() { return time; } }
      const api = {
        getSystemInfoSync: () => ({ windowWidth: 375, windowHeight: 667, pixelRatio: 2 }),
        createCanvas() {
          const value = count++ === 0 ? canvas : document.createElement('canvas');
          if (value === canvas) { const get = value.getContext.bind(value); value.getContext = (name, attributes) => {
            if (name === 'webgl2') throw new Error('unsupported context'); contextName = name;
            const gl = get(name, attributes), extension = gl.getExtension.bind(gl), source = gl.shaderSource.bind(gl);
            gl.getExtension = (key) => ['OES_standard_derivatives', 'EXT_sRGB'].includes(key) ? null : extension(key);
            gl.shaderSource = (shader, code) => { if (code.includes('#define LAMBERT')) shaders.add('lambert'); if (code.includes('#define STANDARD')) shaders.add('standard'); source(shader, code); };
            return gl;
          }; }
          return value;
        },
        createInnerAudioContext: () => ({ play() { audioEvents.push(this.src); }, stop() {}, pause() {} }),
        onTouchStart: (fn) => { callbacks.start = fn; }, onTouchMove: (fn) => { callbacks.move = fn; }, onTouchEnd: (fn) => { callbacks.end = fn; }, onTouchCancel: (fn) => { callbacks.cancel = fn; },
        onHide: (fn) => { callbacks.hide = fn; }, onShow: (fn) => { callbacks.show = fn; }, showModal: (modal) => modals.push(modal)
      };
      const raf = (fn) => { queued = fn; return 1; };
      const run = new Function('wx', 'document', 'window', 'self', 'navigator', 'HTMLCanvasElement', 'WebGLRenderingContext', 'WebGL2RenderingContext', 'requestAnimationFrame', 'cancelAnimationFrame', 'Date', code);
      run(api, undefined, undefined, { requestAnimationFrame: raf, cancelAnimationFrame() {} }, undefined, undefined, undefined, undefined, raf, () => {}, Clock);
      const tick = (frames) => { for (let i = 0; i < frames; i += 1) { time += 1000 / 60; const next = queued; if (next) next(); } };
      const tap = (x, y) => { callbacks.start({ touches: [{ identifier: 1, clientX: x, clientY: y }] }); callbacks.end({ changedTouches: [{ identifier: 1, clientX: x, clientY: y }] }); };
      if (modals.length) return { modals, contextName };
      tap(180, 450); tick(1500); callbacks.hide(); time += 10000; callbacks.show(); tick(2);
      tap(180, 667 * 0.53 + 72 + 29); tick(65);
      callbacks.start({ touches: [{ identifier: 1, clientX: 80, clientY: 400 }] }); callbacks.end({ changedTouches: [{ identifier: 1, clientX: 230, clientY: 400 }] }); tick(2);
      callbacks.hide(); callbacks.show(); tick(2);
      return { modals, contextName, titleFrames: 1500, castHit: audioEvents.includes('assets/audio/sfx-vanish.wav'), offscreenCanvases: count - 1, canvasWidth: canvas.width, solidShaders: [...shaders] };
    }, bundle);
    assert.deepStrictEqual(native.modals, []); assert.strictEqual(native.contextName, 'webgl'); assert.strictEqual(native.castHit, true); assert.strictEqual(native.offscreenCanvases, 2); assert.strictEqual(native.canvasWidth, 562);
    assert.deepStrictEqual(native.solidShaders, ['lambert'], 'shipping wx bundle supports devices without derivatives or sRGB extensions');
    assert.deepStrictEqual(nativeErrors, [], 'wx native canvas needs no DOM color conversion or invalid shader programs');
    await wxPage.screenshot({ path: path.join(output, 'wechat-webgl1-harness.png') });
    const hanziWechat = await checkWechatHanzi(browser, url, bundle, output);
    // Reproduce the simulator's missing-derivatives capability, then a driver that
    // advertises support but actually fails the PBR fragment shader compilation.
    const compatibility = [];
    for (const failure of ['missing-derivatives', 'compiler-rejection']) {
      const restricted = await browser.newPage({ viewport: { width: 390, height: 844 } });
      const failures = [];
      restricted.on('pageerror', (e) => failures.push(e.message));
      restricted.on('console', (m) => { if (m.type() === 'error') failures.push(m.text()); });
      await restricted.addInitScript((mode) => {
        const get = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (name, options) {
          if (name === 'webgl2') return null;
          const gl = get.call(this, name, options);
          if (!gl || !name.includes('webgl') || gl.__restricted) return gl;
          gl.__restricted = true;
          if (mode === 'missing-derivatives') {
            const extension = gl.getExtension.bind(gl);
            gl.getExtension = (key) => key === 'OES_standard_derivatives' ? null : extension(key);
          } else {
            const source = gl.shaderSource.bind(gl);
            gl.shaderSource = (shader, code) => source(shader, code.includes('#define STANDARD') ? code.replace(/dFdx\(/g, 'unsupportedDerivative(') : code);
          }
          return gl;
        };
      }, failure);
      await restricted.goto(url); await restricted.waitForFunction(() => !!window.__spellGame);
      const menu = await checkTitleCat(restricted, output, failure + '-', [{ width: 390, height: 844 }]);
      const restored = await restricted.evaluate((themeIds) => {
        const g = window.__spellGame; g.pause();
        const s = g.state; s.start('normal', 'symbol'); s.healthNoticeVisible = false; s.screen = 'playing'; s.level = 6;
        const samples = [];
        for (const theme of themeIds) {
          s.themeOrder[5] = theme; s.director.startLevel(6, theme); s.enemies = [];
          [...new Set(s.director.theme.species)].forEach((name, i) => {
            const index = s.director.theme.species.indexOf(name), enemy = s.director.createEnemy(s.director.config.timeline[index], index);
            enemy.x = s.width * (0.25 + i % 2 * 0.48); enemy.y = s.height * (0.32 + Math.floor(i / 2) * 0.20); s.enemies.push(enemy);
          });
          g.renderer.render(s, g.input, 0.1); samples.push(g.getStats());
        }
        const allSolid = [];
        g.renderer.scene.traverse((n) => { if (n.isMesh && n.material.name.startsWith('SpellSolid')) allSolid.push(n.material.type); });
        g.renderer.models.prefabs.forEach((root) => root.traverse((n) => { if (n.isMesh && n.material.name.startsWith('SpellSolid')) allSolid.push(n.material.type); }));
        return { stats: g.getStats(), samples, allSolid, facing: g.renderer.heroRoot.rotation.y };
      }, themes);
      assert.strictEqual(restored.stats.materialMode, 'lambert');
      assert.strictEqual(restored.stats.webgl2, false);
      assert.ok(restored.allSolid.length > 20 && restored.allSolid.every((type) => type === 'MeshLambertMaterial'), 'scene and all cached prefabs use compatible lighting');
      assert.strictEqual(restored.facing, Math.PI);
      assert.deepStrictEqual(failures, [], 'shader failures recover without invalid draw calls');
      await restricted.screenshot({ path: path.join(output, failure + '.png') });
      const attacks = await checkAttackEffects(restricted, output, themes, failure + '-');
      assert.deepStrictEqual(failures, [], 'projectiles and vertex alpha compile under WebGL 1');
      compatibility.push({ failure, ...restored.stats, titleFrames: menu.samples.length, attackFrames: attacks.frames.length, attackPool: attacks.reuse }); await restricted.close();
    }
    const failurePage = await browser.newPage();
    await failurePage.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (name, options) { return name.includes('webgl') ? null : get.call(this, name, options); }; });
    await failurePage.goto(url); await failurePage.waitForSelector('#boot-error');
    assert.ok((await failurePage.locator('#boot-error').textContent()).includes('无法创建 3D 画布'));
    const report = { browser: 'Google Chrome headless / macOS', shippingBundleBytes: Buffer.byteLength(bundle), titleCat, metrics, themeScenes, peak, livePerformance, resourcePlateau: resources, wechatHarness: native, hanzi, hanziWechat, speedControls, attackFeedback, compatibility, actualWechatSimulator: 'manual verification recorded separately in docs/3d-verification.md', physicalDevice: 'unverified' };
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ browser: report.browser, shippingBundleBytes: report.shippingBundleBytes, peakScenarios: peak.length, maximumCalls: Math.max(...peak.map((p) => p.calls)), maximumTriangles: Math.max(...peak.map((p) => p.triangles)), livePerformance, resourcePlateau: resources, wechatHarness: native, compatibility, actualWechatSimulator: report.actualWechatSimulator, physicalDevice: report.physicalDevice }, null, 2));
  } finally {
    if (browser) {
      // A disconnected Chrome can leave its close acknowledgement pending.
      // Do not keep the completed report's HTTP server alive indefinitely.
      let timer;
      try { await Promise.race([browser.close(), new Promise((resolve) => { timer = setTimeout(resolve, 5000); })]); }
      finally { clearTimeout(timer); }
    }
    if (server.closeAllConnections) server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

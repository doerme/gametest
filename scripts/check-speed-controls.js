'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { getSpeedControl } = require('../src/ui/SpeedControl');
const { getContinueButton } = require('../src/ui/DifficultySelector');
const { getAudioToggleBounds } = require('../src/ui/AudioToggle');

async function checkBadgeStability(page, controls) {
  return page.evaluate((controls) => {
    const g = window.__spellGame; const s = g.state; const hud = g.renderer.hud;
    const first = s.enemies[0]; const second = s.director.createEnemy(s.director.config.timeline[0], 1);
    second.hanzi = first.hanzi ? { ...first.hanzi } : null; second.symbols = first.symbols.slice();
    const size = first.hanzi ? 42 : 32;
    const snapshot = () => [first, second].map((enemy) => { const p = hud.badges.get(enemy).position; return { x: p.x, y: p.y }; });
    s.enemies = [first, second]; hud.badgeLayout.clear();
    let previous; let maximumStep = 0; let overlap = false;
    for (let frame = 0; frame < 240; frame += 1) {
      const jitter = Math.sin(frame * 0.4) * 0.2;
      const anchors = [{ enemy: first, x: s.width * 0.4, y: 181 + size / 2 + 6 + jitter, visible: true },
        { enemy: second, x: s.width * 0.4 + 1, y: 181 + size / 2 + 6 - jitter, visible: true }];
      hud.syncBadges(s, frame % 2 ? anchors.reverse() : anchors, 1 / 60);
      const points = snapshot();
      if (previous) points.forEach((p, i) => { maximumStep = Math.max(maximumStep, Math.hypot(p.x - previous[i].x, p.y - previous[i].y)); });
      // The real meshes include the green selection frame; inspect every pair.
      const boxes = (enemy) => { const group = hud.badges.get(enemy); return group.children.filter((mesh) => mesh.visible).map((mesh) => ({ x: group.position.x + mesh.position.x, y: group.position.y, w: mesh.scale.x, h: Math.abs(mesh.scale.y) })); };
      for (const left of boxes(first)) for (const right of boxes(second)) {
        if (Math.abs(left.x - right.x) < (left.w + right.w) / 2 && Math.abs(left.y - right.y) < (left.h + right.h) / 2) overlap = true;
      }
      previous = points;
    }
    // A head crosses the controls' lower boundary in half-pixel increments.
    s.enemies = [first]; hud.badgeLayout.clear(); previous = null;
    let boundaryStep = 0; let controlOverlap = false;
    for (let frame = 0; frame < 240; frame += 1) {
      hud.syncBadges(s, [{ enemy: first, x: s.width * 0.6, y: 110 + frame * 0.5 + size / 2 + 6, visible: true }], 1 / 60);
      const group = hud.badges.get(first); const point = { x: group.position.x, y: group.position.y };
      if (previous) boundaryStep = Math.max(boundaryStep, Math.hypot(point.x - previous.x, point.y - previous.y));
      for (const mesh of group.children.filter((child) => child.visible)) {
        const x = point.x + mesh.position.x - mesh.scale.x / 2; const y = point.y - Math.abs(mesh.scale.y) / 2;
        for (const rect of controls) if (x < rect.x + rect.width && x + mesh.scale.x > rect.x && y < rect.y + rect.height && y + Math.abs(mesh.scale.y) > rect.y) controlOverlap = true;
      }
      previous = point;
    }
    hud.badgeLayout.clear(); g.renderer.render(s, g.input, 0);
    return { frames: 480, maximumStep, boundaryStep, overlap, controlOverlap };
  }, controls);
}

module.exports = async function checkSpeedControls(page, output) {
  const directory = path.join(output, 'speed'); fs.mkdirSync(directory, { recursive: true });
  const originalViewport = page.viewportSize();
  const samples = [];
  for (const viewport of [{ width: 390, height: 844 }, { width: 375, height: 667 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport);
    await page.waitForFunction((height) => window.__spellGame.state.height === height, viewport.height);
    const size = await page.evaluate(() => {
      const g = window.__spellGame; const r = g.platform.canvas.getBoundingClientRect();
      return { width: g.state.width, height: g.state.height, x: r.left, y: r.top, sx: r.width / g.state.width, sy: r.height / g.state.height };
    });
    const control = getSpeedControl(size.width);
    const point = (rect) => ({ x: size.x + (rect.x + rect.width / 2) * size.sx, y: size.y + (rect.y + rect.height / 2) * size.sy });
    const click = async (rect) => {
      const p = point(rect); await page.mouse.click(p.x, p.y);
      await page.evaluate(() => { const g = window.__spellGame; g.renderer.render(g.state, g.input, 0); });
    };
    for (const mode of ['hanzi', 'symbol']) {
      await page.evaluate((mode) => {
        const g = window.__spellGame; const s = g.state; g.pause(); s.start('normal', mode); s.healthNoticeVisible = false;
        const enemy = s.director.createEnemy(s.director.config.timeline[0], 0);
        enemy.x = s.width * 0.3; enemy.y = s.height * 0.2; enemy.speed = 0;
        if (mode === 'hanzi') enemy.hanzi = { character: '水', strokeIndex: 1, strokeCount: 4 };
        s.director.index = s.director.total; s.enemies = [enemy]; s.score = 240; s.combo = 8; s.lives = 3;
        s.items = { healthPotion: 1, comboChain: 1 };
        g.renderer.render(s, g.input, 0.3); s.syncHanziTarget(g.renderer.getGestureContext(s).visibleEnemies); g.renderer.render(s, g.input, 0);
      }, mode);
      const current = () => page.evaluate(() => window.__spellGame.state.timeScale);
      for (const expected of [1.25, 1.5, 1.75, 2, 2]) { await click(control.plus); assert.strictEqual(await current(), expected); }
      for (const expected of [1.75, 1.5, 1.25, 1, 0.75, 0.5, 0.5]) { await click(control.minus); assert.strictEqual(await current(), expected); }
      for (const expected of [0.75, 1, 1.25]) { await click(control.plus); assert.strictEqual(await current(), expected); }
      await click(control.display); assert.strictEqual(await current(), 1.25);

      const start = point(control.plus);
      await page.mouse.move(start.x, start.y); await page.mouse.down();
      await page.mouse.move(size.x + size.width * 0.65 * size.sx, size.y + size.height * 0.6 * size.sy); await page.mouse.up();
      const untouched = await page.evaluate(() => {
        const s = window.__spellGame.state;
        return { score: s.score, combo: s.combo, lives: s.lives, count: s.enemies.length, speed: s.timeScale, result: s.lastGestureResult, stroke: s.enemies[0].hanzi && s.enemies[0].hanzi.strokeIndex };
      });
      assert.deepStrictEqual(untouched, { score: 240, combo: 8, lives: 3, count: 1, speed: 1.25, result: null, stroke: mode === 'hanzi' ? 1 : null });
      const audioBefore = await page.evaluate(() => window.__spellGame.state.soundEnabled);
      await click(getAudioToggleBounds(size.width));
      assert.strictEqual(await page.evaluate(() => window.__spellGame.state.soundEnabled), !audioBefore);
      await click(getAudioToggleBounds(size.width));
      assert.strictEqual(await current(), 1.25);

      if (mode === 'hanzi') {
        await page.evaluate(() => { const g = window.__spellGame; g.resume(); g.pause(); });
        assert.strictEqual(await current(), 1.25);
        assert.strictEqual(await page.evaluate(() => window.__spellGame.state.hanziTarget.hanzi.strokeIndex), 1);
      }
      const stability = await checkBadgeStability(page, [control.bounds, getAudioToggleBounds(size.width)]);
      assert.ok(stability.maximumStep < 1 && stability.boundaryStep <= 0.501, 'moving badges slide without discrete row jumps');
      assert.strictEqual(stability.overlap, false, 'neighboring badge meshes, including selection frames, do not overlap');
      assert.strictEqual(stability.controlOverlap, false, 'badges stay below compact controls throughout movement');
      const layout = await page.evaluate(() => {
        const g = window.__spellGame;
        const badges = [];
        g.renderer.hud.badges.forEach((group) => {
          if (group.visible) group.children.filter((child) => child.visible).forEach((mesh) => badges.push({ x: group.position.x + mesh.position.x - mesh.scale.x / 2, y: group.position.y - Math.abs(mesh.scale.y) / 2, width: mesh.scale.x, height: Math.abs(mesh.scale.y) }));
        });
        return { badges, stats: g.getStats() };
      });
      for (const badge of layout.badges) {
        for (const b of [control.bounds, getAudioToggleBounds(size.width)]) assert.ok(badge.x + badge.width <= b.x || badge.x >= b.x + b.width || badge.y + badge.height <= b.y || badge.y >= b.y + b.height, 'badges avoid compact speed and audio controls');
      }
      assert.strictEqual(layout.stats.textures, 2);
      assert.ok(layout.stats.calls <= 200 && layout.stats.triangles <= 100000);
      const name = (mode === 'hanzi' ? 'hanzi' : 'classic') + '-' + viewport.width + '.png';
      await page.screenshot({ path: path.join(directory, name) });
      samples.push({ ...viewport, mode, speed: 1.25, screenshot: 'speed/' + name, stability, ...layout.stats });

      await page.evaluate(() => {
        const g = window.__spellGame; const s = g.state; s.enemies = []; s.director.index = s.director.total; s.update(0); g.renderer.render(s, g.input, 0.3);
      });
      const button = getContinueButton(size.width, size.height, mode, 1.25);
      if (viewport.width === 375) await page.screenshot({ path: path.join(directory, 'transition-' + mode + '.png') });
      await click(button);
      assert.deepStrictEqual(await page.evaluate(() => { const s = window.__spellGame.state; return [s.level, s.gameMode, s.timeScale, s.screen]; }), [2, mode, 1.25, 'playing']);
      await page.evaluate(() => { const g = window.__spellGame; g.state.screen = 'lose'; g.renderer.render(g.state, g.input, 0); });
      await page.mouse.click(size.x + size.width / 2 * size.sx, size.y + size.height / 2 * size.sy);
      assert.deepStrictEqual(await page.evaluate(() => { const s = window.__spellGame.state; return [s.screen, s.gameMode, s.timeScale]; }), ['title', 'hanzi', 1]);
    }
  }
  await page.setViewportSize(originalViewport);
  await page.evaluate(() => window.__spellGame.state.start('normal', 'symbol'));
  return { samples, allSevenSpeeds: true, limits: true, dragDoesNotCast: true, progressPreserved: true, transitionRetainsSpeed: true, restartDefaults: true };
};

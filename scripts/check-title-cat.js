'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { getStartButtons } = require('../src/ui/DifficultySelector');
const { getAudioToggleBounds } = require('../src/ui/AudioToggle');

module.exports = async function checkTitleCat(page, output, prefix = '', sizes = [{ width: 390, height: 844 }, { width: 375, height: 667 }, { width: 320, height: 568 }]) {
  const directory = path.join(output, 'title-cat'); fs.mkdirSync(directory, { recursive: true });
  const originalViewport = page.viewportSize(), samples = [];
  for (const viewport of sizes) {
    await page.setViewportSize(viewport);
    await page.waitForFunction((height) => window.__spellGame.state.height === height, viewport.height);
    const initial = await page.evaluate(() => {
      const g = window.__spellGame, s = g.state; g.pause();
      s.screen = 'title'; s.healthNoticeVisible = true; s.enemies = []; s.effects = [];
      g.renderer.render(s, g.input, 0);
      const hidden = !g.renderer.titleCat.active;
      s.healthNoticeVisible = false; g.renderer.titleCat.random = () => 0;
      g.renderer.render(s, g.input, 0);
      return { hidden, active: g.renderer.titleCat.active, edge: g.renderer.titleCat.edge, originalHidden: !g.renderer.heroRoot.visible,
        run: JSON.stringify([s.score, s.combo, s.lives, s.items, s.effects, s.elapsed]) };
    });
    assert.deepStrictEqual([initial.hidden, initial.active, initial.edge, initial.originalHidden], [true, true, 'upper', true]);
    const advance = (time) => page.evaluate((time) => {
      const g = window.__spellGame, cat = g.renderer.titleCat;
      while (cat.elapsed + 1e-7 < time) cat.update(true, Math.min(1 / 60, time - cat.elapsed));
      g.renderer.render(g.state, g.input, 0);
      const b = cat.bounds, r = cat.regions[cat.edge], h = g.state.height;
      const project = (x, y, z) => cat.root.position.clone().set(x, y, z).project(cat.camera);
      const top = project(b.min.x, b.max.y, 0), bottom = project(b.max.x, b.min.y, 0);
      return { edge: cat.edge, phase: cat.phase, elapsed: cat.elapsed, castCount: cat.castCount,
        spell: cat.spell && cat.spell.type, projectile: cat.attacks.mesh.visible, stars: cat.sparks.visible,
        catVisible: cat.root.visible, eyesOpen: cat.cat.userData.catRig.eyes.scale.y, headTilt: cat.cat.userData.catRig.head.rotation.z, modelScale: cat.root.scale.x,
        outward: !cat.spell || !cat.spell.emitted || cat.spell.target.x <= cat.spell.origin.x,
        bounds: { x: (top.x + 1) / 2 * g.state.width, y: (1 - top.y) / 2 * h,
          right: (bottom.x + 1) / 2 * g.state.width, bottom: (1 - bottom.y) / 2 * h }, region: r,
        stats: g.getStats(), scissorRestored: !g.renderer.renderer.getScissorTest(),
        run: JSON.stringify([g.state.score, g.state.combo, g.state.lives, g.state.items, g.state.effects, g.state.elapsed]) };
    }, time);
    const capture = async (name, time) => {
      const sample = await advance(time);
      assert.strictEqual(sample.run, initial.run, 'decorative spells never mutate the run');
      assert.strictEqual(sample.outward, true, 'the wand casts toward the outer left space');
      assert.ok(sample.scissorRestored, 'menu clipping does not leak into the next render');
      const b = sample.bounds, r = sample.region;
      if (sample.catVisible) assert.ok(b.x >= r.x - 0.01 && b.right <= r.x + r.width + 0.01 && b.y >= r.y - 0.01 && b.bottom <= r.y + r.height + 0.01, 'projected cat stays inside its safe region');
      assert.ok(sample.stats.calls <= 200 && sample.stats.triangles <= 100000); assert.ok(sample.stats.textures >= 1 && sample.stats.textures <= 2, 'title creates no textures beyond the HUD and lazily uploaded glyph atlas');
      const filename = prefix + viewport.width + '-' + name + '.png';
      await page.screenshot({ path: path.join(directory, filename) });
      samples.push({ ...viewport, name, ...sample, screenshot: 'title-cat/' + filename });
      return sample;
    };
    const upper = await capture('upper', 1.9); assert.strictEqual(upper.castCount, 0);
    assert.ok(Math.abs(upper.headTilt) > 0.05 && Math.abs(upper.headTilt) <= Math.PI / 45, 'title idle includes a gentle head tilt');
    const orb = await capture('orb', 2.34); assert.strictEqual(orb.spell, 'orb'); assert.strictEqual(orb.projectile, true);
    await capture('burst', 2.62);
    const blink = await capture('blink', 3.88); assert.ok(blink.eyesOpen < 0.1); assert.strictEqual(blink.modelScale, upper.modelScale, 'expressions keep a stable screen size');
    const departure = await capture('jump', 6.14); assert.strictEqual(departure.phase, 'transition'); assert.strictEqual(departure.stars, true);
    const hidden = await advance(6.42); assert.strictEqual(hidden.catVisible, false, 'no cat crosses the panel while teleporting');
    const lower = await capture('lower', 7.1); assert.strictEqual(lower.edge, 'lower'); assert.strictEqual(lower.catVisible, true);
    const lowerOrb = await capture('lower-orb', 10.15); assert.strictEqual(lowerOrb.spell, 'orb'); assert.strictEqual(lowerOrb.projectile, true);
    const lightning = await capture('lightning', 16.95); assert.strictEqual(lightning.spell, 'lightning'); assert.strictEqual(lightning.stars, true);
    const clockBeforeResize = await page.evaluate(() => { const c = window.__spellGame.renderer.titleCat; return [c.edge, c.elapsed, c.castCount]; });
    for (const resized of [viewport.width === 320 ? { width: 390, height: 844 } : { width: 320, height: 568 }, viewport]) {
      await page.setViewportSize(resized);
      await page.waitForFunction((height) => window.__spellGame.state.height === height, resized.height);
      const resizedStage = await page.evaluate(() => {
        const g = window.__spellGame, c = g.renderer.titleCat; g.renderer.render(g.state, g.input, 0);
        return { clock: [c.edge, c.elapsed, c.castCount], spell: c.spell, shots: c.attacks.active.size, sparks: c.sparks.visible };
      });
      assert.deepStrictEqual(resizedStage, { clock: clockBeforeResize, spell: null, shots: 0, sparks: false }, 'resize clears a live spell without restarting the invitation');
    }
    const lowerLightning = await capture('lower-lightning', 37.4); assert.strictEqual(lowerLightning.edge, 'lower'); assert.strictEqual(lowerLightning.spell, 'lightning'); assert.strictEqual(lowerLightning.stars, true);
    const resources = [];
    for (const time of [40, 80, 120]) resources.push((await advance(time)).stats.geometries);
    assert.strictEqual(resources[1], resources[2], 'menu geometries plateau over repeated cycles');

    await page.evaluate(() => window.__spellGame.resume());
    await page.waitForTimeout(100);
    await page.evaluate(() => window.__spellGame.pause());
    const paused = await page.evaluate(() => window.__spellGame.renderer.titleCat.elapsed);
    await page.waitForTimeout(100);
    assert.strictEqual(await page.evaluate(() => window.__spellGame.renderer.titleCat.elapsed), paused, 'background pause freezes the presentation');
    const resumed = await page.evaluate(() => { const g = window.__spellGame; g.resume(); g.pause(); return g.renderer.titleCat.elapsed; });
    assert.ok(resumed - paused <= 0.05, 'resume does not replay elapsed wall time');

    const rect = await page.evaluate(() => { const g = window.__spellGame, r = g.platform.canvas.getBoundingClientRect(); return { x: r.left, y: r.top, sx: r.width / g.state.width, sy: r.height / g.state.height, w: g.state.width, h: g.state.height }; });
    const click = async (b) => {
      await page.mouse.click(rect.x + (b.x + b.width / 2) * rect.sx, rect.y + (b.y + b.height / 2) * rect.sy);
      await page.evaluate(() => { const g = window.__spellGame; g.renderer.render(g.state, g.input, 0); });
    };
    const sound = await page.evaluate(() => window.__spellGame.state.soundEnabled);
    await click(getAudioToggleBounds(rect.w)); assert.strictEqual(await page.evaluate(() => window.__spellGame.state.soundEnabled), !sound);
    await click(getAudioToggleBounds(rect.w));
    for (const button of getStartButtons(rect.w, rect.h)) {
      const liveSpell = await page.evaluate(() => {
        const g = window.__spellGame, cat = g.renderer.titleCat; cat.reset(); g.renderer.render(g.state, g.input, 0);
        for (let frame = 0; frame < 141; frame++) cat.update(true, 1 / 60);
        g.renderer.render(g.state, g.input, 0); return cat.attacks.mesh.visible;
      });
      assert.strictEqual(liveSpell, true, 'entry is exercised during an in-flight projectile');
      await click(button);
      const playing = await page.evaluate(() => { const g = window.__spellGame; return { mode: g.state.gameMode, screen: g.state.screen, active: g.renderer.titleCat.active,
        original: g.renderer.heroRoot.visible, shots: g.renderer.titleCat.attacks.active.size, stars: g.renderer.titleCat.sparks.visible }; });
      assert.deepStrictEqual(playing, { mode: button.gameMode, screen: 'playing', active: false, original: true, shots: 0, stars: false });
      await page.evaluate(() => { const g = window.__spellGame; g.state.screen = 'lose'; g.renderer.render(g.state, g.input, 0); });
      await click({ x: rect.w / 2 - 1, y: rect.h / 2 - 1, width: 2, height: 2 });
      const fresh = await page.evaluate(() => { const c = window.__spellGame.renderer.titleCat; return [c.active, c.edge, c.elapsed, c.castCount]; });
      assert.deepStrictEqual(fresh, [true, 'upper', 0, 0]);
    }
  }
  await page.setViewportSize(originalViewport);
  await page.waitForFunction((height) => window.__spellGame.state.height === height, originalViewport.height);
  return { samples, noGameplayEffects: true, pauseResume: true, resizeDuringSpell: true, entryButtons: true, resourcesStable: true };
};

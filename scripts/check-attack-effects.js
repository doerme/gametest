'use strict';
const assert = require('assert');
const path = require('path');

module.exports = async function checkAttackEffects(page, output, themes, prefix = '') {
  const frames = [];
  for (const theme of themes) {
    await page.evaluate((themeId) => {
      const g = window.__spellGame, s = g.state; g.pause();
      s.healthNoticeVisible = false; s.level = 6; s.themeOrder[5] = themeId; s.screen = 'playing'; s.effects = []; s.enemies = []; s.feedback = null; s.score = 0; s.combo = 0; s.heroAnimation.cast = 0;
      s.director.startLevel(6, themeId); s.director.index = s.director.total; s.elapsed = 0;
      const species = [...new Set(s.director.theme.species)];
      for (let i = 0; i < 2; i++) {
        const index = s.director.theme.species.indexOf(species[i % species.length]);
        const enemy = s.director.createEnemy(s.director.config.timeline[index], index);
        enemy.x = s.width * (i ? 0.70 : 0.28); enemy.y = s.height * (i ? 0.44 : 0.51); enemy.radius = 33; enemy.speed = 1; enemy.symbols = ['right', 'up', 'left']; enemy.dead = false;
        s.enemies.push(enemy);
      }
      g.renderer.render(s, g.input, 0.3);
    }, theme);
    // Real input must remove symbols and award points before the projectile arrives.
    await page.mouse.move(90, 420); await page.mouse.down(); await page.mouse.move(220, 420); await page.mouse.up();
    const launch = await page.evaluate(() => {
      const g = window.__spellGame, s = g.state; g.input.lastCompletedPath = null; g.renderer.render(s, g.input, 0);
      return { score: s.score, combo: s.combo, symbols: s.enemies.map((e) => e.symbols), shots: g.renderer.effects.attacks.active.size };
    });
    assert.strictEqual(launch.score, 60); assert.strictEqual(launch.combo, 1); assert.strictEqual(launch.shots, 2);
    assert.deepStrictEqual(launch.symbols, [['up', 'left'], ['up', 'left']]);
    const flight = await page.evaluate(() => {
      const g = window.__spellGame; g.state.updateAnimations(0.09); g.renderer.render(g.state, g.input, 0);
      const shots = [...g.renderer.effects.attacks.active.values()];
      return { phases: shots.map((s) => s.phase), traveled: shots.every((s) => s.position.distanceTo(s.origin) > 1), ...g.getStats() };
    });
    assert.deepStrictEqual(flight.phases, ['flight', 'flight']); assert.strictEqual(flight.traveled, true);
    await page.screenshot({ path: path.join(output, prefix + 'attack-' + theme + '-flight.png') });
    const impact = await page.evaluate(() => {
      const g = window.__spellGame, s = g.state; s.enemies[0].x += s.width * 0.035; s.enemies[0].y += s.height * 0.02;
      s.updateAnimations(0.14); g.renderer.render(s, g.input, 0);
      const shots = [...g.renderer.effects.attacks.active.entries()];
      return { phases: shots.map(([, slot]) => slot.phase), tracks: shots.every(([effect, slot]) => slot.position.distanceTo(g.renderer.getAttackPosition(effect.target)) < 1e-6), ...g.getStats() };
    });
    assert.deepStrictEqual(impact.phases, ['impact', 'impact']); assert.strictEqual(impact.tracks, true);
    for (const sample of [flight, impact]) { assert.ok(sample.calls <= 200); assert.ok(sample.triangles <= 100000); assert.strictEqual(sample.textures, 2); }
    await page.screenshot({ path: path.join(output, prefix + 'attack-' + theme + '-impact.png') });
    const cleanup = await page.evaluate(() => {
      const g = window.__spellGame, s = g.state; s.updateAnimations(0.18); g.renderer.render(s, g.input, 0);
      return { events: s.effects.filter((e) => e.type === 'attack').length, active: g.renderer.effects.attacks.active.size, visible: g.renderer.effects.attacks.mesh.visible };
    });
    assert.deepStrictEqual(cleanup, { events: 0, active: 0, visible: false });
    frames.push({ theme, flight, impact });
  }
  const reuse = await page.evaluate(() => {
    const g = window.__spellGame, s = g.state, samples = [];
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < 30; i++) s.triggerAttack(s.enemies[i % s.enemies.length]);
      g.renderer.render(s, g.input, 0);
      const count = g.renderer.effects.attacks.active.size;
      s.updateAnimations(0.41); g.renderer.render(s, g.input, 0);
      samples.push({ count, slots: g.renderer.effects.attacks.slots.length, geometries: g.getStats().geometries });
    }
    s.triggerAttack(s.enemies[0]); g.renderer.render(s, g.input, 0);
    s.enemies[0].dead = true; s.enemies = s.enemies.filter((e) => !e.dead); g.renderer.render(s, g.input, 0);
    const cancelled = g.renderer.effects.attacks.active.size === 0;
    s.effects = []; s.enemies = []; g.renderer.render(s, g.input, 0.3);
    return { samples, cancelled };
  });
  assert.ok(reuse.samples.every((sample) => sample.count === 24 && sample.slots === 24));
  assert.strictEqual(reuse.samples[1].geometries, reuse.samples[2].geometries);
  assert.strictEqual(reuse.cancelled, true);
  return { frames, reuse };
};

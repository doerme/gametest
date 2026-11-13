'use strict';
const assert = require('assert');
const GeometryKit = require('../src/three/GeometryKit');
const ThemeFactory = require('../src/three/ThemeFactory');
const ThemeAmbient = require('../src/three/ThemeAmbient');
const { THEME_ORDER } = require('../src/levels/Themes');

const kit = new GeometryKit(), factory = new ThemeFactory(kit);
const stats = [];
for (const id of THEME_ORDER) {
  const root = factory.create(id), ambient = root.userData.ambient;
  const segments = root.children.filter((child) => child.userData.segment !== undefined);
  assert.strictEqual(segments.length, 9);
  assert.strictEqual(new Set(segments.map((segment) => segment.userData.variant)).size, 3);
  assert.ok(root.getObjectByName('distant-scenery') && root.getObjectByName('environment-animation'));
  let triangles = 0, meshes = 0;
  const geometries = new Set(), materials = new Set();
  root.traverse((node) => {
    if (!node.isMesh) return;
    meshes += 1; triangles += (node.geometry.index ? node.geometry.index.count : node.geometry.attributes.position.count) / 3;
    assert.strictEqual(node.material.map, null, 'environments do not add image textures');
    for (const name of ['position', 'normal', 'color']) {
      const attribute = node.geometry.getAttribute(name);
      if (attribute) assert.ok(attribute.array.every(Number.isFinite), id + ' finite ' + name);
    }
    if (!node.geometry.userData.pooled) geometries.add(node.geometry);
    if (node.material.userData.themeOwned) materials.add(node.material);
  });
  assert.ok(triangles <= 24000, id + ' full-buffer geometry budget: ' + triangles);
  const ground = (segment) => segment.getObjectByName('ground').children[0].geometry;
  assert.strictEqual(ground(segments[0]), ground(segments[3]), 'repeated modules share their baked geometry');
  assert.notStrictEqual(ground(segments[0]), ground(segments[1]), 'neighboring variants differ');

  const startGeometryCount = geometries.size;
  const positions = ambient.positions.array, colors = ambient.colors.array;
  factory.update(root, 5.4, 2);
  const atTwo = positions.slice(); const segmentPositions = segments.map((s) => s.position.z);
  factory.update(root, 5.4, 3);
  assert.deepStrictEqual(segments.map((s) => s.position.z), segmentPositions, 'ambient time does not move the track');
  assert.notDeepStrictEqual(positions, atTwo, id + ' ambient animation runs independently of travel');
  factory.update(root, 5.4, 2);
  assert.deepStrictEqual(positions, atTwo, 'revisiting a frame is deterministic');

  for (const travel of [-36000.01, -0.01, 0, 3.99999, 4, 4.00001, 35.99999, 36, 36.00001, 360000.25]) {
    for (const time of [0, 0.01, 10, 100000]) {
      factory.update(root, travel, time);
      const sorted = segments.map((s) => s.position.z).sort((a, b) => a - b);
      assert.ok(sorted.every((z) => z >= -28 && z < 8));
      for (let i = 1; i < sorted.length; i += 1) assert.ok(Math.abs(sorted[i] - sorted[i - 1] - 4) < 1e-7, 'modules remain contiguous at wrap boundaries');
      assert.ok(ambient.cursor > 0 && ambient.cursor <= ThemeAmbient.CAPACITY);
      assert.strictEqual(ambient.cursor % 3, 0);
      assert.strictEqual(ambient.geometry.drawRange.count, ambient.cursor);
      assert.ok(positions.every(Number.isFinite) && colors.every(Number.isFinite));
    }
  }
  factory.update(root, 14.75);
  const legacyFrame = positions.slice(); factory.update(root, 14.75, 14.75);
  assert.deepStrictEqual(positions, legacyFrame, 'the two-argument update interface remains supported');
  assert.strictEqual(ambient.positions.array, positions, 'animation reuses its position buffer');
  assert.strictEqual(ambient.colors.array, colors, 'animation reuses its color buffer');
  const after = new Set(); root.traverse((node) => { if (node.geometry && !node.geometry.userData.pooled) after.add(node.geometry); });
  assert.strictEqual(after.size, startGeometryCount, 'animation creates no new geometries');

  let disposedGeometry = 0, disposedMaterials = 0;
  geometries.forEach((g) => g.addEventListener('dispose', () => { disposedGeometry += 1; }));
  materials.forEach((m) => m.addEventListener('dispose', () => { disposedMaterials += 1; }));
  kit.disposeOwned(root);
  assert.strictEqual(disposedGeometry, geometries.size, 'shared geometry is released exactly once');
  assert.strictEqual(disposedMaterials, materials.size, 'theme-owned animation materials are released');
  stats.push({ theme: id, triangles, meshes });
}
// Three.js assigns random UUIDs when creating objects; cosmetic animation itself
// must not advance the gameplay PRNG, even during wrapping or long idle periods.
const root = factory.create('castle'), originalRandom = Math.random;
try { Math.random = () => { throw new Error('ambient animation consumed randomness'); }; factory.update(root, 360000, 50000); }
finally { Math.random = originalRandom; kit.disposeOwned(root); }
const fallback = factory.create('unknown'); assert.strictEqual(fallback.userData.themeId, 'castle'); kit.disposeOwned(fallback);
kit.dispose();
console.log('theme-scenes.test.js passed ' + JSON.stringify(stats));

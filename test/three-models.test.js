'use strict';
const assert = require('assert');
const THREE = require('three');
const GeometryKit = require('../src/three/GeometryKit');
const ModelFactory = require('../src/three/ModelFactory');
const ThemeFactory = require('../src/three/ThemeFactory');
const { THEMES } = require('../src/levels/Themes');
const kit = new GeometryKit(); const models = new ModelFactory(kit); const themes = new ThemeFactory(kit);
const species = new Set(Object.values(THEMES).flatMap((theme) => theme.species));
assert.strictEqual(species.size, 18);
let totalVertices = 0;
for (const name of ['cat', ...species]) {
  const model = models.create(name, name === 'ghost');
  const box = new THREE.Box3().setFromObject(model);
  assert.ok(box.max.y > 1 && box.max.y < 4, name + ' has a finite three-dimensional silhouette');
  assert.ok(box.max.z - box.min.z > 0.1, name + ' is a volume, not a flat image');
  let calls = 0;
  model.traverse((node) => {
    if (!node.isMesh) return;
    calls += 1; totalVertices += node.geometry.attributes.position.count;
    assert.strictEqual(node.material.map, null, name + ' has no image texture');
    assert.ok(Array.from(node.geometry.attributes.position.array).every(Number.isFinite));
  });
  assert.ok(calls <= 12, name + ' merges static parts');
  models.animate(model, 1.1, { cast: 0.4 });
  const clone = models.create(name, name === 'ghost');
  assert.notStrictEqual(clone, model);
  assert.strictEqual(clone.children[clone.children.length - 1].geometry, model.children[model.children.length - 1].geometry, 'instances share geometry');
}
for (const name of Object.keys(THEMES)) {
  const root = themes.create(name);
  const geometry = new Set(); let disposed = 0;
  root.traverse((node) => { if (node.geometry && !node.geometry.userData.pooled) geometry.add(node.geometry); if (node.isMesh) assert.strictEqual(node.material.map, null); });
  geometry.forEach((g) => g.addEventListener('dispose', () => { disposed += 1; }));
  themes.update(root, 37.5);
  assert.ok(root.children.filter((n) => n.userData.segment !== undefined).every((n) => n.position.z >= -28 && n.position.z < 8));
  kit.disposeOwned(root); assert.strictEqual(disposed, geometry.size, 'shared segments are disposed once');
}
assert.ok(totalVertices > 10000, 'all species have actual mesh detail');
models.dispose(); kit.dispose();
console.log('three-models.test.js passed');

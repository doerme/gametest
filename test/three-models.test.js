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
for (const { name, boss } of [{ name: 'cat' }, ...[...species].map((name) => ({ name })), { name: 'ghost', boss: true }]) {
  const model = models.create(name, !!boss);
  const box = new THREE.Box3().setFromObject(model);
  assert.ok(box.max.y > 1 && box.max.y < 4, name + ' has a finite three-dimensional silhouette');
  assert.ok(box.max.z - box.min.z > 0.1, name + ' is a volume, not a flat image');
  let calls = 0, triangles = 0;
  model.traverse((node) => {
    if (!node.isMesh) return;
    calls += 1; totalVertices += node.geometry.attributes.position.count;
    triangles += (node.geometry.index ? node.geometry.index.count : node.geometry.attributes.position.count) / 3;
    assert.strictEqual(node.material.map, null, name + ' has no image texture');
    assert.ok(Array.from(node.geometry.attributes.position.array).every(Number.isFinite));
    assert.ok(Array.from(node.geometry.attributes.normal.array).every(Number.isFinite), 'finite normals after sculpting and baking');
    if (node.material.vertexColors) {
      assert.strictEqual(node.geometry.attributes.color.count, node.geometry.attributes.position.count, 'complete vertex colors');
    }
  });
  assert.ok(calls <= (name === 'cat' ? 16 : 12), name + ' merges static parts');
  if (name === 'cat') assert.ok(triangles <= 16000, 'detailed cat stays within its geometry budget');
  models.animate(model, 1.1, { cast: 0.4 });
  const clone = models.create(name, !!boss);
  assert.notStrictEqual(clone, model);
  assert.strictEqual(clone.children[clone.children.length - 1].geometry, model.children[model.children.length - 1].geometry, 'instances share geometry');
}
// Negative scales are used by symmetrical modeled parts. Baking must retain front faces.
const mirror = new THREE.Group(); kit.part(mirror, 'box', 0xffffff, undefined, [-1, 1, 1]); kit.bake(mirror);
const p = mirror.children[0].geometry.attributes.position, n = mirror.children[0].geometry.attributes.normal;
for (let i = 0; i < p.count; i += 3) {
  const a = new THREE.Vector3().fromBufferAttribute(p, i), b = new THREE.Vector3().fromBufferAttribute(p, i + 1), c = new THREE.Vector3().fromBufferAttribute(p, i + 2);
  const faceNormal = b.sub(a).cross(c.sub(a)).normalize();
  assert.ok(faceNormal.dot(new THREE.Vector3().fromBufferAttribute(n, i)) > 0.99, 'mirrored triangles point outward');
}
kit.disposeOwned(mirror);
const cat = models.create('cat'); cat.rotation.y = Math.PI;
assert.ok(new THREE.Vector3(0, 0, 1).applyQuaternion(cat.quaternion).z < -0.99, 'cat faces the enemies');
models.animate(cat, 0.41, {}); cat.updateMatrixWorld(true);
const walkTip = cat.getObjectByName('castTip').getWorldPosition(new THREE.Vector3());
models.animate(cat, 0.41, { cast: 1 }); cat.updateMatrixWorld(true);
assert.ok(walkTip.distanceTo(cat.getObjectByName('castTip').getWorldPosition(new THREE.Vector3())) > 0.2, 'spell origin follows animated hand');
assert.ok(cat.getObjectByName('castTip').getWorldPosition(new THREE.Vector3()).z < walkTip.z, 'cat points the staff forward toward enemies when casting');
assert.ok(cat.getObjectByName('cape') && cat.getObjectByName('tail'), 'cape and tail animate independently');
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

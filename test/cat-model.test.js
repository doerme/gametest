'use strict';
const assert = require('assert');
const THREE = require('three');
const GeometryKit = require('../src/three/GeometryKit');
const ModelFactory = require('../src/three/ModelFactory');
const CatModel = require('../src/three/CatModel');

const kit = new GeometryKit(), models = new ModelFactory(kit);
const cat = models.create('cat'), other = models.create('cat');
const rig = cat.userData.catRig, otherRig = other.userData.catRig;
for (const name of ['head', 'eyes', 'ear-1', 'ear1', 'body', 'cape', 'tail', 'staff', 'castTip', 'leg-1', 'leg1']) assert.ok(cat.getObjectByName(name), name + ' remains addressable');
assert.notStrictEqual(rig, otherRig); assert.notStrictEqual(rig.eyes, otherRig.eyes);
assert.strictEqual(rig.eyes.children[0].geometry, otherRig.eyes.children[0].geometry, 'expressions share geometry, not transforms');
assert.ok(cat.userData.bounds.max[1] < 2.6 && cat.userData.bounds.max[1] > 2.35, 'the new silhouette keeps the existing gameplay scale');

const blinkAt = CatModel.BLINK_START + CatModel.BLINK_DURATION / 2;
models.animate(cat, blinkAt, { presentation: 'title' });
assert.ok(rig.eyes.scale.y < 0.1, 'the natural blink closes both eyes');
assert.strictEqual(otherRig.eyes.scale.y, 1, 'one cat cannot change another cat\'s expression');
models.animate(cat, blinkAt + CatModel.BLINK_DURATION, { presentation: 'title' });
assert.strictEqual(rig.eyes.scale.y, 1, 'eyes reopen after a short blink');
models.animate(cat, blinkAt + CatModel.BLINK_PERIOD, {}); assert.ok(rig.eyes.scale.y < 0.1, 'blink timing repeats on animation time');
models.animate(cat, blinkAt, { presentation: 'title', cast: 1 });
assert.strictEqual(rig.eyes.scale.y, 1); assert.strictEqual(rig.head.rotation.z, 0, 'casting takes priority over idle expressions');
models.animate(cat, blinkAt, { presentation: 'title', hurt: 1 });
assert.strictEqual(rig.eyes.scale.y, 0.78); assert.strictEqual(rig.head.rotation.z, 0);
models.animate(cat, 0, {}); assert.strictEqual(rig.eyes.scale.y, 1); assert.strictEqual(cat.scale.y, 1, 'recovery restores normal proportions');

models.animate(cat, 2.1, { presentation: 'title' });
assert.ok(Math.abs(rig.head.rotation.z) > 0.05 && Math.abs(rig.head.rotation.z) <= THREE.MathUtils.degToRad(4));
const breath = rig.body.scale.y, ear = rig.ears[0].node.rotation.z;
models.animate(cat, 2.1, { presentation: 'title' });
assert.strictEqual(rig.body.scale.y, breath); assert.strictEqual(rig.ears[0].node.rotation.z, ear, 'a paused clock never advances breathing or ears');
models.animate(cat, 0.5, {}); assert.strictEqual(rig.head.rotation.z, 0, 'gameplay preserves forward-facing aim');
assert.notStrictEqual(rig.body.scale.y, breath);
models.animate(cat, 1.35, {}); assert.notStrictEqual(rig.ears[0].node.rotation.z, ear);

// The title measures its envelope once; every full-size idle/cast pose must fit.
const envelope = new THREE.Box3(new THREE.Vector3(...cat.userData.presentationBounds.min), new THREE.Vector3(...cat.userData.presentationBounds.max));
for (let frame = 0; frame < 960; frame++) {
  const time = frame / 60;
  models.animate(cat, time, { presentation: 'title', cast: frame % 180 > 90 ? 1 : 0 });
  cat.rotation.y = -0.18 + Math.sin(time * 0.8) * 0.22;
  cat.updateMatrixWorld(true);
  assert.ok(envelope.containsBox(new THREE.Box3().setFromObject(cat)), 'stable presentation envelope includes time ' + time);
}

let sharedDisposed = 0;
rig.eyes.children[0].geometry.addEventListener('dispose', () => sharedDisposed++);
models.dispose(); assert.strictEqual(sharedDisposed, 1, 'shared expression geometry is released once'); kit.dispose();
console.log('cat-model.test.js passed');

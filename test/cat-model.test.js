'use strict';
const assert = require('assert');
const THREE = require('three');
const GeometryKit = require('../src/three/GeometryKit');
const ModelFactory = require('../src/three/ModelFactory');
const CatModel = require('../src/three/CatModel');

const kit = new GeometryKit(), models = new ModelFactory(kit);
const cat = models.create('cat'), other = models.create('cat');
const rig = cat.userData.catRig, otherRig = other.userData.catRig;
for (const name of ['costumeRoot', 'head', 'eyes', 'ear-1', 'ear1', 'hat', 'hatPendant', 'ribbons', 'body', 'cape', 'tail', 'staff', 'castTip', 'leg-1', 'leg1']) assert.ok(cat.getObjectByName(name), name + ' remains addressable');
assert.notStrictEqual(rig, otherRig); assert.notStrictEqual(rig.eyes, otherRig.eyes);
assert.strictEqual(rig.eyes.children[0].geometry, otherRig.eyes.children[0].geometry, 'expressions share geometry, not transforms');
assert.ok(cat.userData.bounds.max[1] < 2.6 && cat.userData.bounds.max[1] > 2.35, 'the new silhouette keeps the existing gameplay scale');
assert.ok(Math.abs(cat.userData.bounds.min[1]) < 0.02, 'short feet preserve the gameplay ground level');
models.animate(cat, 0, {}); cat.updateMatrixWorld(true);
assert.ok(cat.getObjectByName('castTip').getWorldPosition(new THREE.Vector3()).x < rig.head.getWorldPosition(new THREE.Vector3()).x, 'the reference wand is held on the viewer\'s left');

const blinkAt = CatModel.BLINK_START + CatModel.BLINK_DURATION / 2;
models.animate(cat, blinkAt, { presentation: 'title' });
assert.ok(rig.eyes.scale.y < 0.1, 'the natural blink closes both eyes');
assert.strictEqual(otherRig.eyes.scale.y, 1, 'one cat cannot change another cat\'s expression');
models.animate(cat, blinkAt + CatModel.BLINK_DURATION, { presentation: 'title' });
assert.strictEqual(rig.eyes.scale.y, 1, 'eyes reopen after a short blink');
models.animate(cat, blinkAt + CatModel.BLINK_PERIOD, {}); assert.ok(rig.eyes.scale.y < 0.1, 'blink timing repeats on animation time');
models.animate(cat, blinkAt, { presentation: 'title', cast: 1 });
assert.strictEqual(rig.eyes.scale.y, 1); assert.strictEqual(rig.head.rotation.z, 0, 'casting takes priority over idle expressions');
cat.updateMatrixWorld(true);
assert.ok(new THREE.Box3().setFromObject(rig.cape).min.z < new THREE.Box3().setFromObject(rig.body).min.z - 0.025, 'the full-length cloak remains behind the robe during a cast');
models.animate(cat, blinkAt, { presentation: 'title', hurt: 1 });
assert.strictEqual(rig.eyes.scale.y, 0.78); assert.strictEqual(rig.head.rotation.z, 0);
models.animate(cat, 0, {}); assert.strictEqual(rig.eyes.scale.y, 1); assert.strictEqual(cat.scale.y, 1, 'recovery restores normal proportions');

models.animate(cat, 2.1, { presentation: 'title' });
assert.ok(Math.abs(rig.head.rotation.z) > 0.05 && Math.abs(rig.head.rotation.z) <= THREE.MathUtils.degToRad(4));
const breath = rig.body.scale.y, ear = rig.ears[0].node.rotation.z;
const pendant = rig.pendant.rotation.z, ribbon = rig.ribbons.rotation.x;
models.animate(cat, 2.1, { presentation: 'title' });
assert.strictEqual(rig.body.scale.y, breath); assert.strictEqual(rig.ears[0].node.rotation.z, ear, 'a paused clock never advances breathing or ears');
assert.strictEqual(rig.pendant.rotation.z, pendant); assert.strictEqual(rig.ribbons.rotation.x, ribbon, 'pendant and ribbon animation also follows the paused clock');
models.animate(cat, 0.5, {}); assert.strictEqual(rig.head.rotation.z, 0, 'gameplay preserves forward-facing aim');
assert.notStrictEqual(rig.body.scale.y, breath);
assert.notStrictEqual(rig.pendant.rotation.z, pendant); assert.notStrictEqual(rig.ribbons.rotation.x, ribbon);
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

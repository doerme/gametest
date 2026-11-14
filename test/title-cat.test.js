'use strict';
const assert = require('assert');
const THREE = require('three');
const GeometryKit = require('../src/three/GeometryKit');
const ModelFactory = require('../src/three/ModelFactory');
const ThreeRenderer = require('../src/three/ThreeRenderer');
const TitleCatPresentation = require('../src/three/TitleCatPresentation');
const { getSelectionLayout, getStartButtons, getContinueButton } = require('../src/ui/DifficultySelector');

const kit = new GeometryKit(), models = new ModelFactory(kit);
const sharedCat = models.create('cat');
const sharedGeometry = sharedCat.children.find((node) => node.isMesh).geometry;
let sharedDisposed = 0; sharedGeometry.addEventListener('dispose', () => sharedDisposed++);

for (const [width, height] of [[390, 844], [375, 667], [320, 568]]) {
  const stage = new TitleCatPresentation(models, width, height, () => 0);
  const selection = getSelectionLayout(width, height);
  assert.deepStrictEqual(selection.buttons, getStartButtons(width, height));
  const last = selection.buttons[1];
  assert.ok(selection.panel.y + selection.panel.height >= last.y + last.height + 18 - 1e-8);
  const continuation = getSelectionLayout(width, height, [getContinueButton(width, height)]);
  assert.strictEqual(continuation.buttons.length, 1);
  stage.update(false, 1); assert.strictEqual(stage.active, false); assert.strictEqual(stage.root.visible, false);
  stage.update(true, 0); assert.strictEqual(stage.edge, 'upper'); assert.strictEqual(stage.cat.rotation.y, 0, 'menu cat faces the viewer');
  const edges = new Set(), types = [], phases = new Set(); let previousCount = 0, emitted = 0;
  const buffers = [stage.positions.array, stage.colors.array, stage.attacks.positions.array];
  for (let i = 0; i < 2400; i += 1) {
    stage.update(true, 1 / 60);
    edges.add(stage.edge); phases.add(stage.phase);
    if (stage.castCount !== previousCount) { types.push(stage.spell.type); previousCount = stage.castCount; }
    if (stage.spell && stage.spell.emitted) emitted++;
    if (i < 118) assert.strictEqual(stage.castCount, 0, 'no spell before the initial two-second invitation');
    if (stage.root.visible) {
      const b = stage.bounds, r = stage.regions[stage.edge];
      const box = { x: b.min.x / 0.03, y: height - b.max.y / 0.03, right: b.max.x / 0.03, bottom: height - b.min.y / 0.03 };
      assert.ok(box.x >= r.x - 1e-6 && box.right <= r.x + r.width + 1e-6 && box.y >= r.y - 1e-6 && box.bottom <= r.y + r.height + 1e-6, JSON.stringify({ width, box, r }));
      for (const button of selection.buttons) assert.ok(box.right <= button.x || box.x >= button.x + button.width || box.bottom <= button.y || box.y >= button.y + button.height, 'cat never covers an entry button');
    }
    assert.ok(stage.geometry.drawRange.count <= stage.positions.count && stage.attacks.geometry.drawRange.count <= stage.attacks.positions.count);
  }
  assert.deepStrictEqual([...edges], ['upper', 'lower']); assert.deepStrictEqual([...phases], ['perch', 'transition']);
  assert.deepStrictEqual(types.slice(0, 3), ['orb', 'orb', 'lightning']); assert.ok(emitted > 0);
  assert.strictEqual(stage.attacks.slots.length, 1, 'one pooled decorative projectile');
  assert.strictEqual(stage.positions.array, buffers[0]); assert.strictEqual(stage.colors.array, buffers[1]); assert.strictEqual(stage.attacks.positions.array, buffers[2]);
  const clock = stage.elapsed; stage.update(true, 0); assert.strictEqual(stage.elapsed, clock);
  stage.update(true, 60); assert.ok(stage.elapsed - clock <= 0.0500001, 'stalled frames cannot replay a backlog');
  // Resize during an active spell and retain the chosen edge and timeline.
  while (!stage.spell || !stage.spell.emitted) stage.update(true, 1 / 60);
  const edge = stage.edge, elapsed = stage.elapsed;
  stage.resize(320, 568);
  assert.strictEqual(stage.edge, edge); assert.strictEqual(stage.elapsed, elapsed); assert.strictEqual(stage.spell, null);
  assert.strictEqual(stage.attacks.active.size, 0); assert.strictEqual(stage.sparks.visible, false);
  stage.update(false, 0);
  assert.strictEqual(stage.root.visible, false); assert.strictEqual(stage.attacks.mesh.visible, false); assert.strictEqual(stage.geometry.drawRange.count, 0);
  stage.update(true, 0);
  assert.deepStrictEqual([stage.elapsed, stage.edge, stage.phase, stage.castCount], [0, 'upper', 'perch', 0], 'returning to the title starts a fresh invitation');
  while (stage.phase !== 'transition' || !stage.switched) stage.update(true, 1 / 60);
  stage.update(false, 0); stage.update(true, 0);
  while (stage.edge !== 'lower') stage.update(true, 1 / 60);
  assert.strictEqual(stage.phase, 'transition', 'leaving during a teleport never prevents the next edge switch');
  assert.strictEqual(stage.cat.children.find((node) => node.isMesh).geometry, sharedGeometry);

  // Scissor state is restored even if the menu's shader triggers a fallback.
  const scissor = new THREE.Vector4(1, 2, 3, 4); let testing = false;
  const renderer = {
    getScissor(out) { return out.copy(scissor); }, getScissorTest() { return testing; },
    setScissor(...args) { if (args[0].isVector4) scissor.copy(args[0]); else scissor.set(...args); },
    setScissorTest(value) { testing = value; }, clearDepth() {}, render() { throw new Error('shader'); }
  };
  assert.throws(() => stage.render(renderer), /shader/);
  assert.deepStrictEqual(scissor.toArray(), [1, 2, 3, 4]); assert.strictEqual(testing, false);
  let disposed = 0;
  for (const resource of [stage.geometry, stage.material, stage.attacks.geometry, stage.attacks.material, stage.attacks.orb]) resource.addEventListener('dispose', () => disposed++);
  stage.dispose(); assert.strictEqual(disposed, 5); assert.strictEqual(sharedDisposed, 0, 'disposing the menu never disposes shared gameplay assets');
}

const stage = new TitleCatPresentation(models, 390, 844);
const context = { kit, models, scene: new THREE.Scene(), titleCat: stage, shaderDiagnostics: [] };
ThreeRenderer.prototype.useCompatibleMaterial.call(context, 'menu test');
let solids = 0;
stage.scene.traverse((node) => { if (node.isMesh && node.material.name.startsWith('SpellSolid')) { solids++; assert.strictEqual(node.material.type, 'MeshLambertMaterial'); } });
assert.ok(solids > 0, 'hidden menu instances participate in shader recovery');
stage.dispose(); models.dispose(); kit.dispose();
console.log('title-cat.test.js passed');

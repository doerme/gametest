'use strict';
// Runs only in the generated developer gallery, never in the shipping bundle.
const THREE = require('three');
const GeometryKit = require('../src/three/GeometryKit');
const ModelFactory = require('../src/three/ModelFactory');
const LegacyRenderer = require('../src/render/Renderer');
const references = require('./model-references');
const kit = new GeometryKit(), models = new ModelFactory(kit);
const canvas = document.getElementById('models');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(960, 340); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xe8eee9);
scene.add(new THREE.HemisphereLight(0xfff1da, 0x607c99, 2));
const sun = new THREE.DirectionalLight(0xffe9cb, 2.8); sun.position.set(-4, 7, 5); scene.add(sun);
const fill = new THREE.DirectionalLight(0xb4e5ff, 1); fill.position.set(5, 2, -4); scene.add(fill);
const camera = new THREE.PerspectiveCamera(34, 320 / 340, 0.1, 30);
const legacy = document.getElementById('legacy'), ctx = legacy.getContext('2d');
const old = new LegacyRenderer(ctx, legacy, {});
const selector = document.getElementById('species');
references.forEach((r, i) => { const o = document.createElement('option'); o.value = i; o.textContent = r.name; selector.appendChild(o); });
let model, reference, box, time = 0, playing = false, frameId, yaw = 0;
const setMode = (mode) => {
  if (kit.solid.type === (mode === 'lambert' ? 'MeshLambertMaterial' : 'MeshStandardMaterial')) return;
  const previous = mode === 'lambert' ? kit.useCompatibleMaterial() : kit.solid;
  if (mode === 'standard') kit.solid = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0.02 });
  models.prefabs.forEach((root) => root.traverse((n) => { if (n.material === previous) n.material = kit.solid; }));
  if (model) model.traverse((n) => { if (n.material === previous) n.material = kit.solid; });
  previous.dispose(); render();
};
function render() {
  if (!model) return;
  const state = document.getElementById('motion').value;
  models.animate(model, time, { cast: state === 'cast' ? 1 : 0, hurt: state === 'hurt' ? 1 : 0 });
  const size = box.getSize(new THREE.Vector3());
  const target = box.getCenter(new THREE.Vector3()); target.y = size.y * 0.48;
  const distance = Math.max(4.6, size.y * 2.3, size.x * 2.1, size.z * 2.2);
  renderer.setScissorTest(true);
  [0, 0.70, Math.PI].forEach((a, i) => {
    camera.position.set(Math.sin(a + yaw) * distance, target.y + distance * 0.22, Math.cos(a + yaw) * distance);
    camera.lookAt(target); renderer.setViewport(i * 320, 0, 320, 340); renderer.setScissor(i * 320, 0, 320, 340); renderer.render(scene, camera);
  });
  renderer.setScissorTest(false);
}
async function select(index) {
  reference = references[index]; selector.value = index;
  if (model) scene.remove(model);
  model = models.create(reference.species || reference.id, !!reference.boss); scene.add(model);
  box = new THREE.Box3().setFromObject(model); time = 0; yaw = 0;
  document.getElementById('name').textContent = reference.name;
  document.getElementById('features').textContent = reference.features;
  ctx.clearRect(0, 0, legacy.width, legacy.height);
  if (reference.image) {
    const img = new Image(); img.src = window.referenceImages[reference.image]; await img.decode();
    const sw = reference.sheet ? 128 : img.naturalWidth, sh = reference.sheet ? 128 : img.naturalHeight;
    const scale = Math.min(235 / sw, 284 / sh);
    ctx.drawImage(img, 0, 0, sw, sh, (256 - sw * scale) / 2, (340 - sh * scale) / 2, sw * scale, sh * scale);
  } else {
    ctx.save(); ctx.translate(128, 175);
    const enemy = { species: reference.species || reference.id, kind: reference.boss ? 'boss' : 'normal', radius: 70, phase: 0 };
    old[reference.draw](enemy, 0); ctx.restore();
  }
  let triangles = 0, meshes = 0;
  model.traverse((n) => { if (n.isMesh) { meshes++; triangles += (n.geometry.index ? n.geometry.index.count : n.geometry.attributes.position.count) / 3; } });
  document.getElementById('stats').textContent = triangles.toLocaleString() + ' 三角形 · ' + meshes + ' 网格';
  render(); return { id: reference.id, triangles, meshes };
}
function tick() { if (!playing) return; time += 1 / 60; render(); frameId = requestAnimationFrame(tick); }
selector.onchange = () => select(Number(selector.value));
document.getElementById('motion').onchange = render;
document.getElementById('material').onchange = (e) => setMode(e.target.value);
document.getElementById('play').onclick = () => { playing = !playing; document.getElementById('play').textContent = playing ? '暂停动画' : '播放动画'; if (playing) tick(); else cancelAnimationFrame(frameId); };
let drag;
canvas.onpointerdown = (e) => { drag = e.clientX; canvas.setPointerCapture(e.pointerId); };
canvas.onpointermove = (e) => { if (drag === undefined) return; yaw += (e.clientX - drag) * 0.012; drag = e.clientX; render(); };
canvas.onpointerup = canvas.onpointercancel = () => { drag = undefined; };
window.modelGallery = { references, select, render, setMode, pose(value, seconds) { document.getElementById('motion').value = value; time = seconds; render(); }, stats: () => renderer.info.memory };
select(0).then(() => { window.galleryReady = true; });

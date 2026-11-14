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
const orthographic = new THREE.OrthographicCamera(-1.5, 1.5, 1.6, -1.6, 0.1, 30);
const legacy = document.getElementById('legacy'), ctx = legacy.getContext('2d');
const old = new LegacyRenderer(ctx, legacy, {});
const selector = document.getElementById('species');
references.forEach((r, i) => { const o = document.createElement('option'); o.value = i; o.textContent = r.name; selector.appendChild(o); });
let model, reference, box, time = 0, playing = false, frameId, yaw = 0, viewMode = 'ortho';
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
  models.animate(model, time, { cast: state === 'cast' ? 1 : 0, hurt: state === 'hurt' ? 1 : 0, presentation: state === 'idle' ? 'title' : undefined });
  const size = box.getSize(new THREE.Vector3());
  const target = box.getCenter(new THREE.Vector3()); target.y = size.y * 0.48;
  const cat = model.name === 'cat';
  const activeCamera = cat ? orthographic : camera;
  if (cat) {
    target.x = 0; target.z = 0; target.y = (box.max.y + box.min.y) / 2;
    const height = Math.max(size.y * 1.18, size.x * 340 / 320 * 1.15);
    orthographic.top = height / 2; orthographic.bottom = -height / 2;
    orthographic.left = -height * 320 / 340 / 2; orthographic.right = -orthographic.left; orthographic.updateProjectionMatrix();
  }
  const distance = Math.max(4.6, size.y * 2.3, size.x * 2.1, size.z * 2.2);
  renderer.setScissorTest(true);
  const angles = cat ? viewMode === 'quarter' ? [Math.PI / 4, Math.PI * 3 / 4, Math.PI * 5 / 4] : [0, Math.PI / 2, Math.PI] : [0, 0.70, Math.PI];
  const labels = document.querySelectorAll('.labels span');
  [cat && viewMode === 'quarter' ? '45°' : '正面', cat ? viewMode === 'quarter' ? '135°' : '侧面（90°）' : '侧前方', cat && viewMode === 'quarter' ? '225°' : '背面'].forEach((label, i) => { labels[i + 1].textContent = label; });
  angles.forEach((a, i) => {
    activeCamera.position.set(Math.sin(a + yaw) * distance, target.y + (cat ? 0 : distance * 0.22), Math.cos(a + yaw) * distance);
    activeCamera.lookAt(target); renderer.setViewport(i * 320, 0, 320, 340); renderer.setScissor(i * 320, 0, 320, 340); renderer.render(scene, activeCamera);
  });
  renderer.setScissorTest(false);
}
async function select(index) {
  reference = references[index]; selector.value = index;
  if (model) scene.remove(model);
  model = models.create(reference.species || reference.id, !!reference.boss); scene.add(model);
  box = new THREE.Box3().setFromObject(model); time = 0; yaw = 0; viewMode = 'ortho'; document.getElementById('view').value = viewMode;
  document.getElementById('name').textContent = reference.name;
  document.getElementById('features').textContent = reference.features;
  document.querySelector('.labels span').textContent = reference.referenceFile ? '三视图参考' : '原版参考';
  ctx.clearRect(0, 0, legacy.width, legacy.height);
  if (reference.image) {
    const img = new Image(); img.src = window.referenceImages[reference.image]; await img.decode();
    const crop = reference.crop;
    const sw = crop ? crop.width : reference.sheet ? 128 : img.naturalWidth, sh = crop ? crop.height : reference.sheet ? 128 : img.naturalHeight;
    const scale = Math.min(235 / sw, 284 / sh);
    ctx.drawImage(img, crop ? crop.x : 0, crop ? crop.y : 0, sw, sh, (256 - sw * scale) / 2, (340 - sh * scale) / 2, sw * scale, sh * scale);
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
const setView = (value) => { viewMode = value; yaw = 0; document.getElementById('view').value = value; render(); };
document.getElementById('view').onchange = (e) => setView(e.target.value);
document.getElementById('play').onclick = () => { playing = !playing; document.getElementById('play').textContent = playing ? '暂停动画' : '播放动画'; if (playing) tick(); else cancelAnimationFrame(frameId); };
let drag;
canvas.onpointerdown = (e) => { drag = e.clientX; canvas.setPointerCapture(e.pointerId); };
canvas.onpointermove = (e) => { if (drag === undefined) return; yaw += (e.clientX - drag) * 0.012; drag = e.clientX; render(); };
canvas.onpointerup = canvas.onpointercancel = () => { drag = undefined; };
window.modelGallery = { references, select, render, setMode, setView, pose(value, seconds) { document.getElementById('motion').value = value; time = seconds; render(); }, stats: () => renderer.info.memory };
select(0).then(() => { window.galleryReady = true; });

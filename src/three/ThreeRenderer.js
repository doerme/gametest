'use strict';
const THREE = require('three');
const GeometryKit = require('./GeometryKit');
const ModelFactory = require('./ModelFactory');
const ThemeFactory = require('./ThemeFactory');
const HudLayer = require('./HudLayer');
const WorldEffects = require('./WorldEffects');
const { SCREENS } = require('../core/GameState');

class ThreeRenderer {
  constructor(platform, width, height) {
    this.platform = platform; this.width = width; this.height = height;
    this.renderer = new THREE.WebGLRenderer({ canvas: platform.canvas, context: platform.createContext(), antialias: true, alpha: false, stencil: false });
    this.renderer.setPixelRatio(platform.pixelRatio); this.renderer.setSize(width, height, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.18;
    this.renderer.autoClear = false; this.renderer.info.autoReset = false;
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.kit = new GeometryKit(); this.models = new ModelFactory(this.kit); this.themes = new ThemeFactory(this.kit);
    this.materialMode = 'standard'; this.shaderDiagnostics = [];
    if (!this.renderer.capabilities.isWebGL2 && !this.renderer.extensions.has('OES_standard_derivatives')) {
      this.useCompatibleMaterial('WebGL 1 does not support OES_standard_derivatives');
    }
    this.renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
      const detail = { program: gl.getProgramInfoLog(program), vertex: gl.getShaderInfoLog(vertex), fragment: gl.getShaderInfoLog(fragment) };
      const error = new Error('3D 着色器编译失败: ' + detail.fragment);
      // Some wx drivers advertise the extension but reject it in the compiler.
      error.code = /#define STANDARD/.test(gl.getShaderSource(fragment)) ? 'SPELL_PBR_SHADER' : 'SPELL_SHADER';
      error.detail = detail;
      throw error; // Stop before useProgram/drawArrays can flood the console.
    };
    this.scene.add(new THREE.HemisphereLight(0xfff0d3, 0x526d83, 2.0));
    this.sun = new THREE.DirectionalLight(0xffe6bd, 2.8); this.sun.position.set(-5, 10, 6); this.scene.add(this.sun);
    const fill = new THREE.DirectionalLight(0xb6e7e4, 1.0); fill.position.set(6, 4, -5); this.scene.add(fill);
    this.hero = this.models.create('cat'); this.heroRoot = new THREE.Group(); this.heroRoot.add(this.hero); this.heroRoot.scale.setScalar(0.93); this.heroRoot.rotation.y = Math.PI; this.scene.add(this.heroRoot);
    this.enemies = new Map(); this.pool = new Map(); this.retiring = []; this.anchors = []; this.visualTime = 0;
    this.effects = new WorldEffects(this.kit, this.scene, this.toWorld.bind(this), () => this.hero.getObjectByName('castTip').getWorldPosition(new THREE.Vector3()), this.getAttackPosition.bind(this), this.camera);
    this.hud = new HudLayer(platform, width, height, !this.renderer.capabilities.isWebGL2 && !this.renderer.extensions.has('EXT_sRGB')); this.resize(width, height);
  }

  toWorld(x, y, height = 0) { return new THREE.Vector3((x / this.width - 0.5) * 6.1, height, (y / this.height - 0.74) * 21); }

  getAttackPosition(enemy) {
    const entry = this.enemies.get(enemy);
    if (!entry || enemy.dead || enemy.reachedHero) return null;
    const bounds = entry.model.userData.bounds;
    return entry.model.localToWorld(new THREE.Vector3((bounds.min[0] + bounds.max[0]) / 2, (bounds.min[1] + bounds.max[1]) / 2, (bounds.min[2] + bounds.max[2]) / 2));
  }

  useCompatibleMaterial(reason, detail) {
    const previous = this.kit.useCompatibleMaterial();
    const replace = (root) => root.traverse((node) => { if (node.material === previous) node.material = this.kit.solid; });
    replace(this.scene);
    this.models.prefabs.forEach(replace);
    if (this.pool) this.pool.forEach((list) => list.forEach((entry) => replace(entry.root)));
    previous.dispose();
    this.materialMode = 'lambert'; this.shaderDiagnostics.push({ reason, ...detail });
  }

  resize(width, height) {
    if (this.effects) this.effects.attacks.clear();
    this.width = width; this.height = height; this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    const distance = 16 * Math.max(1, 0.47 / this.camera.aspect);
    const angle = 50 * Math.PI / 180;
    this.camera.position.set(0, Math.sin(angle) * distance, -3 + Math.cos(angle) * distance);
    this.camera.lookAt(0, 0, -3); this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
    this.hud.resize(width, height);
  }

  setTheme(themeId) {
    if (this.themeId === themeId) return;
    this.effects.attacks.clear();
    this.enemies.forEach((entry) => this.release(entry)); this.enemies.clear();
    this.retiring.forEach((item) => this.release(item.entry)); this.retiring = [];
    if (this.theme) { this.scene.remove(this.theme); this.kit.disposeOwned(this.theme); }
    this.theme = this.themes.create(themeId); this.scene.add(this.theme); this.themeId = themeId;
    const style = this.theme.userData.style;
    this.scene.background = new THREE.Color(style.sky); this.scene.fog = new THREE.Fog(style.fog, 16, 43); this.sun.color.setHex(style.light);
  }

  obtain(enemy) {
    const key = enemy.species + ':' + (enemy.kind === 'boss');
    const list = this.pool.get(key) || [];
    const entry = list.pop() || { root: new THREE.Group(), model: this.models.create(enemy.species, enemy.kind === 'boss'), key };
    if (!entry.model.parent) entry.root.add(entry.model);
    const scale = Math.min(1.4, enemy.radius / 38);
    entry.root.scale.setScalar(scale); entry.root.visible = true;
    entry.root.rotation.set(0, 0, 0); entry.model.scale.setScalar(1);
    entry.scale = scale; this.scene.add(entry.root);
    return entry;
  }

  release(entry) {
    this.scene.remove(entry.root);
    if (!this.pool.has(entry.key)) this.pool.set(entry.key, []);
    const pool = this.pool.get(entry.key);
    if (pool.length < 12) pool.push(entry);
  }

  syncEnemies(state, dt) {
    const live = new Set(state.enemies);
    this.enemies.forEach((entry, enemy) => {
      if (!live.has(enemy)) { this.retiring.push({ entry, age: 0 }); this.enemies.delete(enemy); }
    });
    this.retiring = this.retiring.filter((item) => {
      item.age += dt; item.entry.root.scale.setScalar(item.entry.scale * Math.max(0.01, 1 - item.age / 0.23));
      if (item.age >= 0.23) { this.release(item.entry); return false; } return true;
    });
    const anchors = [];
    state.enemies.forEach((enemy) => {
      let entry = this.enemies.get(enemy);
      if (!entry) { entry = this.obtain(enemy); this.enemies.set(enemy, entry); }
      const bob = ['ghost', 'jellyfish', 'cloudWisp', 'paperSpirit', 'waveLantern', 'trainConductor', 'pterosaur'].includes(enemy.species) ? Math.sin(enemy.phase * 0.8) * 0.09 + 0.12 : 0;
      entry.root.position.copy(this.toWorld(enemy.x, enemy.y, bob));
      this.models.animate(entry.model, this.visualTime + enemy.phase, { hurt: enemy.hitFlash });
      entry.model.rotation.y = Math.sin(enemy.phase * 0.3) * 0.12;
      entry.root.updateWorldMatrix(true, true);
      const anchor = entry.model.localToWorld(new THREE.Vector3(0, entry.model.userData.height, 0));
      const projected = anchor.project(this.camera);
      // Far-side wings, tails and crests can project above the Y-highest point.
      // Project the modeled volume, including the current animated root scale.
      const bounds = entry.model.userData.bounds;
      let top = projected.y;
      for (const x of [bounds.min[0], bounds.max[0]]) for (const y of [bounds.min[1], bounds.max[1]]) for (const z of [bounds.min[2], bounds.max[2]]) {
        const corner = entry.model.localToWorld(new THREE.Vector3(x, y, z)).project(this.camera);
        top = Math.max(top, corner.y);
      }
      const foot = entry.root.position.clone().project(this.camera);
      anchors.push({ enemy, x: (projected.x + 1) / 2 * this.width, y: (1 - top) / 2 * this.height,
        // A tall head can cross the top edge while the body is already on-screen.
        visible: projected.z > -1 && projected.z < 1 && projected.x > -1.12 && projected.x < 1.12 && foot.y < 0.84 && projected.y > -0.82 });
    });
    this.anchors = anchors;
  }

  getGestureContext(state) {
    // Last rendered visibility, intersected with live queues at input time.
    const visible = new Set(this.anchors.filter((a) => a.visible).map((a) => a.enemy));
    return { expectedSymbols: [...new Set(state.enemies.filter((enemy) => visible.has(enemy) && !enemy.dead).map((enemy) => enemy.symbols[0]))] };
  }

  render(state, input, dt = 1 / 60) {
    this.visualTime += dt;
    const level = state.screen === SCREENS.LEVEL_TRANSITION ? Math.min(6, state.level + 1) : state.level;
    this.setTheme(state.getThemeId(level));
    this.themes.update(this.theme, state.elapsed * 1.35);
    this.heroRoot.position.copy(this.toWorld(state.hero.x, state.hero.y));
    this.heroRoot.position.y = Math.sin(this.visualTime * 10) * 0.025;
    this.models.animate(this.hero, this.visualTime, state.heroAnimation, input.isDrawing);
    this.syncEnemies(state, dt); this.effects.update(state.effects, this.visualTime); this.hud.update(state, input, this.anchors);
    this.renderer.info.reset(); this.renderer.clear();
    try { this.renderer.render(this.scene, this.camera); }
    catch (error) {
      if (error.code !== 'SPELL_PBR_SHADER' || this.materialMode !== 'standard') throw error;
      this.useCompatibleMaterial('Standard material shader failed to compile', error.detail);
      this.renderer.info.reset(); this.renderer.clear(); this.renderer.render(this.scene, this.camera);
    }
    this.renderer.clearDepth(); this.renderer.render(this.hud.scene, this.hud.camera);
  }

  getStats() {
    const info = this.renderer.info;
    return { calls: info.render.calls, triangles: info.render.triangles, geometries: info.memory.geometries, textures: info.memory.textures, webgl2: this.renderer.capabilities.isWebGL2, materialMode: this.materialMode, shaderDiagnostics: this.shaderDiagnostics, modelPrefabs: this.models.prefabs.size, activeEnemies: this.enemies.size };
  }

  dispose() {
    this.effects.dispose(); this.hud.dispose(); if (this.theme) this.kit.disposeOwned(this.theme);
    this.models.dispose(); this.kit.dispose(); this.renderer.dispose(); this.enemies.clear(); this.pool.clear(); this.retiring = [];
  }
}
module.exports = ThreeRenderer;

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
    this.scene.add(new THREE.HemisphereLight(0xfff0d3, 0x526d83, 2.0));
    this.sun = new THREE.DirectionalLight(0xffe6bd, 2.8); this.sun.position.set(-5, 10, 6); this.scene.add(this.sun);
    const fill = new THREE.DirectionalLight(0xb6e7e4, 1.0); fill.position.set(6, 4, -5); this.scene.add(fill);
    this.hero = this.models.create('cat'); this.heroRoot = new THREE.Group(); this.heroRoot.add(this.hero); this.heroRoot.scale.setScalar(0.93); this.heroRoot.rotation.y = -0.20; this.scene.add(this.heroRoot);
    this.enemies = new Map(); this.pool = new Map(); this.retiring = []; this.anchors = []; this.visualTime = 0;
    this.effects = new WorldEffects(this.kit, this.scene, this.toWorld.bind(this), () => this.hero.getObjectByName('staff').localToWorld(new THREE.Vector3(0.24, 0.96, 0.09)));
    this.hud = new HudLayer(platform, width, height); this.resize(width, height);
  }

  toWorld(x, y, height = 0) { return new THREE.Vector3((x / this.width - 0.5) * 6.1, height, (y / this.height - 0.74) * 21); }

  resize(width, height) {
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
      const anchor = entry.root.position.clone(); anchor.y += entry.model.userData.height * entry.scale + 0.14;
      const projected = anchor.project(this.camera);
      const foot = entry.root.position.clone().project(this.camera);
      anchors.push({ enemy, x: (projected.x + 1) / 2 * this.width, y: (1 - projected.y) / 2 * this.height,
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
    this.renderer.info.reset(); this.renderer.clear(); this.renderer.render(this.scene, this.camera);
    this.renderer.clearDepth(); this.renderer.render(this.hud.scene, this.hud.camera);
  }

  getStats() {
    const info = this.renderer.info;
    return { calls: info.render.calls, triangles: info.render.triangles, geometries: info.memory.geometries, textures: info.memory.textures, webgl2: this.renderer.capabilities.isWebGL2, modelPrefabs: this.models.prefabs.size, activeEnemies: this.enemies.size };
  }

  dispose() {
    this.effects.dispose(); this.hud.dispose(); if (this.theme) this.kit.disposeOwned(this.theme);
    this.models.dispose(); this.kit.dispose(); this.renderer.dispose(); this.enemies.clear(); this.pool.clear(); this.retiring = [];
  }
}
module.exports = ThreeRenderer;

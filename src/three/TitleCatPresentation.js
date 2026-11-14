'use strict';
const THREE = require('three');
const AttackEffects = require('./AttackEffects');
const ATTACK = require('../core/AttackEffect');
const { getSelectionLayout } = require('../ui/DifficultySelector');

const UNIT = 0.03;
const TRANSITION_DURATION = 0.8;
const CHARGE_DURATION = 0.18;
const ORB_DURATION = 0.64;
const SPELL_DURATION = 0.9;
const clamp = THREE.MathUtils.clamp;
const ease = (t) => { const p = clamp(t, 0, 1); return p * p * (3 - 2 * p); };

// A screen-space stage with its own clock. It never submits gameplay effects,
// consumes the game's random generator, or takes ownership of shared cat assets.
class TitleCatPresentation {
  constructor(models, width, height, random = Math.random) {
    this.models = models; this.random = random;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 1, 1, 0, 0.1, 100);
    this.camera.position.z = 20;
    this.scene.add(new THREE.HemisphereLight(0xfff1d5, 0x61788c, 2.1));
    const sun = new THREE.DirectionalLight(0xffe5bd, 2.8); sun.position.set(-4, 8, 10); this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xb9edf1, 0.8); fill.position.set(5, 3, 8); this.scene.add(fill);
    this.cat = models.create('cat');
    const bounds = this.cat.userData.presentationBounds || this.cat.userData.bounds;
    this.modelHeight = bounds.max[1] - bounds.min[1];
    this.modelAspect = (bounds.max[0] - bounds.min[0]) / this.modelHeight;
    this.cat.position.y = -bounds.min[1];
    this.root = new THREE.Group(); this.root.add(this.cat); this.scene.add(this.root);
    this.bounds = new THREE.Box3(); this.scissor = new THREE.Vector4();
    this.origin = new THREE.Vector3();
    this.attacks = new AttackEffects(this.scene, () => this.origin, (target) => target, this.camera, 1);
    this.orbEvents = [];
    // Twelve stars and the electric ribbon share a fixed, texture-free batch.
    this.geometry = new THREE.BufferGeometry();
    this.positions = new THREE.Float32BufferAttribute(new Float32Array(768 * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.colors = new THREE.Float32BufferAttribute(new Float32Array(768 * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', this.positions); this.geometry.setAttribute('color', this.colors);
    this.geometry.setDrawRange(0, 0);
    this.material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, fog: false, side: THREE.DoubleSide });
    this.material.forceSinglePass = true;
    this.sparks = new THREE.Mesh(this.geometry, this.material); this.sparks.frustumCulled = false; this.sparks.renderOrder = 21; this.scene.add(this.sparks);
    this.palette = { gold: new THREE.Color(0xffd77d), cyan: new THREE.Color(0x99f5ff), violet: new THREE.Color(0xb99aff), white: new THREE.Color(0xf4edff) };
    this.reset(); this.resize(width, height);
  }

  clearEffects() {
    this.spell = null; this.orbEvents.length = 0; this.attacks.clear();
    this.geometry.setDrawRange(0, 0); this.sparks.visible = false;
  }

  reset() {
    this.active = false; this.elapsed = 0; this.phase = 'perch'; this.phaseAge = 0; this.edge = 'upper';
    this.dwell = 6 + this.random() * 3; this.castAt = 2; this.castCount = 0; this.didCast = false; this.switched = false;
    this.root.visible = false; this.clearEffects();
  }

  resize(width, height) {
    this.width = width; this.height = height;
    this.camera.right = width * UNIT; this.camera.top = height * UNIT; this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
    this.layout = getSelectionLayout(width, height);
    const panel = this.layout.panel, bottom = panel.y + panel.height;
    // Use the card's empty top margin to give the enlarged cat room on short
    // screens, while leaving twelve pixels before the title's glyph bounds.
    const headingTop = height * 0.275 - 19;
    const left = Math.min(96, width * 0.30), right = Math.max(left + 24, width - 134);
    const upperBottom = Math.max(64, headingTop - 12);
    const lowerTop = bottom - 11;
    this.regions = {
      upper: { x: left, y: 40, width: right - left, height: upperBottom - 40 },
      lower: { x: 24, y: lowerTop, width: width - 48, height: Math.max(24, height - 28 - lowerTop) }
    };
    const desired = Math.min(112, width * 0.286);
    const upperDesired = Math.min(desired, 76 + Math.max(0, width - 320) * 0.58);
    const upperHeight = Math.min(upperDesired, this.regions.upper.height - 6, (this.regions.upper.width - 8) / this.modelAspect);
    const lowerHeight = Math.min(desired, this.regions.lower.height - 14, (this.regions.lower.width - 6) / this.modelAspect);
    this.anchors = {
      upper: { x: (left + right) / 2, footY: Math.min(upperBottom, Math.max(panel.y + 4, 40 + upperHeight + 2)), height: upperHeight },
      lower: { x: width * 0.66, footY: bottom + lowerHeight - 6, height: lowerHeight }
    };
    this.clearEffects();
    if (this.active) this.pose();
  }

  update(active, dt = 1 / 60) {
    if (!active) { if (this.active) this.reset(); return; }
    if (!this.active) { this.reset(); this.active = true; }
    // A stalled frame or a resumed tab must never catch up a series of casts.
    const step = Number.isFinite(dt) ? clamp(dt, 0, 0.05) : 0;
    this.elapsed += step; this.phaseAge += step;
    if (this.spell) {
      this.spell.age += step;
      if (this.spell.age >= SPELL_DURATION) this.spell = null;
    }
    if (this.phase === 'perch') {
      if (!this.didCast && this.phaseAge >= this.castAt) {
        this.didCast = true;
        this.spell = { type: this.castCount % 3 === 2 ? 'lightning' : 'orb', age: 0, emitted: false };
        this.castCount += 1;
      }
      if (this.phaseAge >= this.dwell) { this.phase = 'transition'; this.phaseAge = 0; this.clearEffects(); }
    } else {
      if (this.phaseAge >= TRANSITION_DURATION / 2 && !this.switched) {
        this.edge = this.edge === 'upper' ? 'lower' : 'upper'; this.switched = true;
      }
      if (this.phaseAge >= TRANSITION_DURATION) {
        this.phase = 'perch'; this.phaseAge = 0; this.switched = false;
        this.dwell = 6 + this.random() * 3; this.castAt = this.dwell * 0.5; this.didCast = false;
      }
    }
    this.pose();
    if (this.spell && !this.spell.emitted && this.spell.age >= CHARGE_DURATION) this.emit();
    this.drawEffects();
  }

  pose() {
    const anchor = this.anchors[this.edge];
    const p = this.phaseAge / TRANSITION_DURATION;
    const transition = this.phase === 'transition';
    const scale = transition ? p < 0.4 ? 1 - ease(p / 0.28) : ease((p - 0.64) / 0.36) : 1;
    const hop = transition ? Math.sin(clamp(p < 0.4 ? p / 0.4 : (1 - p) / 0.36, 0, 1) * Math.PI) * 10 : Math.sin(this.elapsed * 2.5) * 1.3;
    this.root.visible = scale > 0.025;
    this.root.scale.setScalar(anchor.height * UNIT / this.modelHeight * Math.max(0.001, scale));
    const stroll = this.edge === 'upper' ? Math.min(4, this.regions.upper.width * 0.04) : 10;
    this.root.position.set((anchor.x + Math.sin(this.elapsed * 0.75) * stroll) * UNIT, (this.height - anchor.footY + hop) * UNIT, 0);
    this.root.rotation.y = -0.18 + Math.sin(this.elapsed * 0.8) * 0.22;
    this.models.animate(this.cat, this.elapsed, { cast: this.spell ? 1 : 0, presentation: 'title' });
    // Rest the feet between small steps, while retaining the existing tail,
    // cape and staff articulation. The gameplay instance is untouched.
    const stepping = Math.sin(this.elapsed * 0.75) > 0.6;
    for (const joint of this.cat.userData.joints) {
      if (joint.name.startsWith('leg') && !stepping) joint.rotation.x = joint.userData.motion.rest;
      if (joint.name === 'arm' && !this.spell) joint.rotation.x += Math.sin(this.elapsed * 2) * 0.14;
    }
    this.root.updateMatrixWorld(true);
    this.bounds.setFromObject(this.root);
    const region = this.regions[this.edge];
    const minX = region.x * UNIT, maxX = (region.x + region.width) * UNIT;
    const minY = (this.height - region.y - region.height) * UNIT, maxY = (this.height - region.y) * UNIT;
    this.root.position.x += Math.max(0, minX - this.bounds.min.x) - Math.max(0, this.bounds.max.x - maxX);
    this.root.position.y += Math.max(0, minY - this.bounds.min.y) - Math.max(0, this.bounds.max.y - maxY);
    this.root.updateMatrixWorld(true);
    this.bounds.setFromObject(this.root);
  }

  emit() {
    const spell = this.spell, region = this.regions[this.edge];
    this.cat.getObjectByName('castTip').getWorldPosition(this.origin);
    spell.origin = this.origin.clone();
    const direction = this.origin.x < this.root.position.x ? -1 : 1;
    const originX = this.origin.x / UNIT;
    const available = direction < 0 ? originX - region.x : region.x + region.width - originX;
    const margin = Math.min(23, Math.max(7, available * 0.45), region.width / 2);
    const candidate = clamp(originX + direction * 44, region.x + margin, region.x + region.width - margin);
    const x = direction < 0 ? Math.min(originX, candidate) : Math.max(originX, candidate);
    const screenY = this.height - this.origin.y / UNIT;
    const y = clamp(screenY + (this.edge === 'upper' ? 10 : 4), region.y + 23, region.y + region.height - 23);
    spell.target = new THREE.Vector3(x * UNIT, (this.height - y) * UNIT, 1);
    spell.emitted = true;
    if (spell.type === 'orb') spell.event = { type: 'attack', age: 0, duration: ATTACK.flightDuration + ATTACK.impactDuration, target: spell.target, radius: 30 };
  }

  vertex(x, y, color, alpha) {
    if (this.cursor >= this.positions.count) return;
    this.positions.setXYZ(this.cursor, x, y, 1.1);
    this.colors.setXYZW(this.cursor++, color.r, color.g, color.b, alpha);
  }

  star(x, y, radius, color, alpha) {
    for (let i = 0; i < 8; i += 1) {
      const a = i * Math.PI / 4, b = (i + 1) * Math.PI / 4;
      this.vertex(x, y, color, alpha);
      this.vertex(x + Math.cos(a) * radius * (i % 2 ? 0.26 : 1), y + Math.sin(a) * radius * (i % 2 ? 0.26 : 1), color, alpha);
      this.vertex(x + Math.cos(b) * radius * (i % 2 ? 1 : 0.26), y + Math.sin(b) * radius * (i % 2 ? 1 : 0.26), color, alpha);
    }
  }

  line(ax, ay, bx, by, width, color, alpha) {
    const length = Math.hypot(bx - ax, by - ay) || 1;
    const x = -(by - ay) / length * width, y = (bx - ax) / length * width;
    for (const p of [[ax - x, ay - y], [ax + x, ay + y], [bx - x, by - y], [bx - x, by - y], [ax + x, ay + y], [bx + x, by + y]]) this.vertex(p[0], p[1], color, alpha);
  }

  drawEffects() {
    this.cursor = 0; this.orbEvents.length = 0;
    const spell = this.spell;
    if (spell && spell.emitted) {
      const age = spell.age - CHARGE_DURATION;
      if (spell.type === 'orb' && age < ORB_DURATION) {
        spell.event.age = age / ORB_DURATION * spell.event.duration;
        this.orbEvents.push(spell.event);
      } else if (spell.type === 'lightning' && age < 0.3) {
        const alpha = Math.sin(Math.PI * age / 0.3);
        for (let branch = 0; branch < 2; branch += 1) {
          let x = spell.origin.x, y = spell.origin.y;
          for (let i = 1; i <= 8; i += 1) {
            const t = i / 8;
            const nx = THREE.MathUtils.lerp(spell.origin.x, spell.target.x, t) + Math.sin(i * 9 + age * 36 + branch * 4) * 0.12 * Math.sin(t * Math.PI);
            const ny = THREE.MathUtils.lerp(spell.origin.y, spell.target.y, t) + Math.cos(i * 8 + branch * 2) * 0.14 * Math.sin(t * Math.PI);
            this.line(x, y, nx, ny, 0.06, this.palette.violet, alpha * 0.35);
            this.line(x, y, nx, ny, 0.018, this.palette.white, alpha);
            x = nx; y = ny;
          }
        }
        this.star(spell.target.x, spell.target.y, 0.2, this.palette.violet, alpha);
      }
    }
    this.attacks.update(this.orbEvents);
    if (this.phase === 'transition') {
      const p = this.phaseAge / TRANSITION_DURATION;
      const local = p < 0.4 ? p / 0.4 : (p - 0.5) / 0.5;
      const fade = Math.sin(clamp(local, 0, 1) * Math.PI);
      const anchor = this.anchors[this.edge];
      const x = anchor.x * UNIT, y = (this.height - anchor.footY + anchor.height * 0.48) * UNIT;
      for (let i = 0; i < 12; i += 1) {
        const angle = i * 2.399 + local * 0.6;
        const radius = (0.25 + local * 0.7) * (0.7 + i % 3 * 0.15);
        this.star(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius * 0.8, 0.07 + i % 3 * 0.025, i % 2 ? this.palette.gold : this.palette.cyan, fade);
      }
    }
    this.geometry.setDrawRange(0, this.cursor); this.sparks.visible = this.cursor > 0;
    if (this.cursor) { this.positions.needsUpdate = true; this.colors.needsUpdate = true; }
  }

  render(renderer) {
    if (!this.active) return;
    const region = this.regions[this.edge];
    renderer.getScissor(this.scissor); const previousTest = renderer.getScissorTest();
    try {
      renderer.setScissor(region.x, this.height - region.y - region.height, region.width, region.height);
      renderer.setScissorTest(true); renderer.clearDepth(); renderer.render(this.scene, this.camera);
    } finally {
      renderer.setScissor(this.scissor); renderer.setScissorTest(previousTest);
    }
  }

  dispose() {
    this.reset(); this.attacks.dispose(); this.geometry.dispose(); this.material.dispose();
    this.scene.clear();
  }
}

module.exports = TitleCatPresentation;

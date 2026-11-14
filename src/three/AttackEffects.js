'use strict';
const THREE = require('three');
const ATTACK = require('../core/AttackEffect');

// One dynamic batch for every projectile, trail, ring and spark. No textures,
// instancing extension or lit shaders are required by the wx WebGL 1 path.
class AttackEffects {
  constructor(scene, castOrigin, targetPosition, camera, maxActive = ATTACK.maxActive) {
    this.scene = scene; this.castOrigin = castOrigin; this.targetPosition = targetPosition; this.camera = camera;
    this.maxActive = maxActive;
    this.active = new Map(); this.slots = []; this.cancelled = new WeakSet();
    this.geometry = new THREE.BufferGeometry();
    const capacity = this.maxActive * 600;
    this.positions = new THREE.Float32BufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.colors = new THREE.Float32BufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', this.positions); this.geometry.setAttribute('color', this.colors); this.geometry.setDrawRange(0, 0);
    this.material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false, side: THREE.DoubleSide });
    this.material.forceSinglePass = true;
    this.mesh = new THREE.Mesh(this.geometry, this.material); this.mesh.name = 'attack-effects'; this.mesh.visible = false; this.mesh.frustumCulled = false; this.mesh.renderOrder = 20; scene.add(this.mesh);
    const sphere = new THREE.SphereGeometry(1, 8, 6);
    this.orb = sphere.toNonIndexed(); sphere.dispose();
    this.palette = { white: new THREE.Color(0xf1ffff), cyan: new THREE.Color(0x43e7ff), gold: new THREE.Color(0xffcc62) };
    this.right = new THREE.Vector3(); this.up = new THREE.Vector3(); this.tailA = new THREE.Vector3(); this.tailB = new THREE.Vector3(); this.side = new THREE.Vector3(); this.eye = new THREE.Vector3();
    this.cursor = 0;
  }

  vertex(x, y, z, color, alpha) {
    this.positions.setXYZ(this.cursor, x, y, z);
    this.colors.setXYZW(this.cursor++, color.r, color.g, color.b, alpha);
  }

  sphere(center, radius, color, alpha) {
    const positions = this.orb.attributes.position;
    for (let i = 0; i < positions.count; i += 1) this.vertex(center.x + positions.getX(i) * radius, center.y + positions.getY(i) * radius, center.z + positions.getZ(i) * radius, color, alpha);
  }

  path(out, start, end, t) {
    out.copy(start).lerp(end, t); out.y += Math.sin(Math.PI * t) * 0.24; return out;
  }

  trail(start, end, t) {
    const from = Math.max(0, t - 0.14), segments = 6;
    for (let i = 0; i < segments; i += 1) {
      const u = i / segments, v = (i + 1) / segments;
      this.path(this.tailA, start, end, from + (t - from) * u);
      this.path(this.tailB, start, end, from + (t - from) * v);
      this.side.subVectors(this.tailB, this.tailA).cross(this.eye.subVectors(this.camera.position, this.tailA)).normalize();
      if (this.side.lengthSq() === 0) this.side.copy(this.right);
      const wa = 0.016 + 0.033 * u, wb = 0.016 + 0.033 * v, a = this.tailA, b = this.tailB, s = this.side;
      const quad = [
        [a.x - s.x * wa, a.y - s.y * wa, a.z - s.z * wa, u],
        [a.x + s.x * wa, a.y + s.y * wa, a.z + s.z * wa, u],
        [b.x - s.x * wb, b.y - s.y * wb, b.z - s.z * wb, v],
        [b.x + s.x * wb, b.y + s.y * wb, b.z + s.z * wb, v]
      ];
      for (const index of [0, 1, 2, 2, 1, 3]) this.vertex(quad[index][0], quad[index][1], quad[index][2], this.palette.cyan, quad[index][3] * 0.75);
    }
  }

  billboardVertex(center, x, y, color, alpha) {
    this.vertex(center.x + this.right.x * x + this.up.x * y, center.y + this.right.y * x + this.up.y * y, center.z + this.right.z * x + this.up.z * y, color, alpha);
  }

  burst(center, progress, scale) {
    const fade = (1 - progress) * (1 - progress), radius = (0.10 + progress * 0.62) * scale;
    const inner = Math.max(0, radius - 0.05 * scale * (1 - progress * 0.5));
    for (let i = 0; i < 16; i += 1) {
      const a = i / 16 * Math.PI * 2, b = (i + 1) / 16 * Math.PI * 2;
      const points = [[Math.cos(a) * inner, Math.sin(a) * inner], [Math.cos(a) * radius, Math.sin(a) * radius], [Math.cos(b) * inner, Math.sin(b) * inner], [Math.cos(b) * radius, Math.sin(b) * radius]];
      for (const j of [0, 1, 2, 2, 1, 3]) this.billboardVertex(center, points[j][0], points[j][1], this.palette.gold, fade);
    }
    for (let i = 0; i < 8; i += 1) {
      const a = i / 8 * Math.PI * 2 + 0.15, d = (0.12 + progress * 0.66) * scale;
      const length = (0.14 - progress * 0.07) * scale, width = 0.032 * scale;
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      const points = [[x - Math.cos(a) * length, y - Math.sin(a) * length], [x - Math.sin(a) * width, y + Math.cos(a) * width], [x + Math.cos(a) * length, y + Math.sin(a) * length], [x + Math.sin(a) * width, y - Math.cos(a) * width]];
      for (const j of [0, 1, 2, 0, 2, 3]) this.billboardVertex(center, points[j][0], points[j][1], this.palette.gold, fade);
    }
    this.sphere(center, 0.15 * scale * (1 - progress), this.palette.white, fade * 0.9);
  }

  release(effect, slot) { slot.effect = null; this.active.delete(effect); }

  update(effects) {
    const live = new Set(effects.filter((effect) => effect.type === 'attack' && effect.age < effect.duration && !effect.target.dead && !effect.target.reachedHero));
    this.active.forEach((slot, effect) => { if (!live.has(effect)) this.release(effect, slot); });
    this.cursor = 0;
    this.right.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    this.up.set(0, 1, 0).applyQuaternion(this.camera.quaternion);
    for (const effect of live) {
      if (this.cancelled.has(effect)) continue;
      const target = this.targetPosition(effect.target);
      if (!target) { const slot = this.active.get(effect); if (slot) this.release(effect, slot); this.cancelled.add(effect); continue; }
      let slot = this.active.get(effect);
      if (!slot) {
        if (this.active.size >= this.maxActive) { this.cancelled.add(effect); continue; }
        slot = this.slots.find((entry) => !entry.effect);
        if (!slot) { slot = { origin: new THREE.Vector3(), position: new THREE.Vector3() }; this.slots.push(slot); }
        slot.effect = effect; slot.origin.copy(this.castOrigin()); this.active.set(effect, slot);
      }
      if (effect.age < ATTACK.flightDuration) {
        slot.phase = 'flight';
        const progress = Math.max(0, effect.age / ATTACK.flightDuration);
        this.path(slot.position, slot.origin, target, progress);
        this.trail(slot.origin, target, progress);
        this.sphere(slot.position, 0.19, this.palette.cyan, 0.30);
        this.sphere(slot.position, 0.095, this.palette.white, 1);
      } else {
        slot.phase = 'impact'; slot.position.copy(target);
        const progress = THREE.MathUtils.clamp((effect.age - ATTACK.flightDuration) / ATTACK.impactDuration, 0, 1);
        this.burst(slot.position, progress, THREE.MathUtils.clamp(effect.radius / 38, 0.7, 1.35));
      }
    }
    this.geometry.setDrawRange(0, this.cursor); this.mesh.visible = this.cursor > 0;
    if (this.cursor > 0) { this.positions.needsUpdate = true; this.colors.needsUpdate = true; }
  }

  clear() {
    this.active.forEach((slot, effect) => { this.cancelled.add(effect); slot.effect = null; });
    this.active.clear(); this.geometry.setDrawRange(0, 0); this.mesh.visible = false;
  }

  dispose() {
    this.clear(); this.scene.remove(this.mesh); this.geometry.dispose(); this.material.dispose(); this.orb.dispose(); this.slots = [];
  }
}
module.exports = AttackEffects;

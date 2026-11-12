'use strict';
const THREE = require('three');

class WorldEffects {
  constructor(kit, scene, toWorld, castOrigin) {
    this.kit = kit; this.scene = scene; this.toWorld = toWorld; this.castOrigin = castOrigin;
    this.slots = []; this.active = new Map();
    this.ribbonGeometry = new THREE.BufferGeometry();
    this.ribbonGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(4096 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    this.ribbonMaterial = new THREE.MeshBasicMaterial({ color: 0xd1b8ff, side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false });
    this.ribbon = new THREE.Mesh(this.ribbonGeometry, this.ribbonMaterial); this.ribbon.frustumCulled = false; scene.add(this.ribbon);
  }

  slot() {
    let slot = this.slots.find((s) => !s.effect);
    if (!slot) {
      const material = new THREE.MeshBasicMaterial({ color: 0xb8f5e6, transparent: true, depthWrite: false });
      const group = new THREE.Group();
      const ring = new THREE.Mesh(this.kit.geometries.ring, material); ring.rotation.x = -Math.PI / 2; group.add(ring);
      // One merged mesh for the four solid magic fragments.
      const fragments = new THREE.Group();
      for (let i = 0; i < 4; i += 1) this.kit.part(fragments, 'spike', 0xffe6a5, [Math.cos(i * Math.PI / 2), 0.25, Math.sin(i * Math.PI / 2)], [0.09, 0.20, 0.09], [0, 0, 0.4]);
      this.kit.bake(fragments); group.add(fragments); this.scene.add(group);
      slot = { group, ring, fragments, material, effect: null }; this.slots.push(slot);
    }
    return slot;
  }

  update(effects, time) {
    const live = new Set(effects);
    this.active.forEach((slot, effect) => { if (!live.has(effect)) { slot.group.visible = false; slot.effect = null; this.active.delete(effect); } });
    let vertices = 0;
    const attr = this.ribbonGeometry.attributes.position;
    const bolt = (from, to, age, offset = 0) => {
      const a = this.castOrigin ? this.castOrigin() : this.toWorld(from.x, from.y, 1.2);
      const b = this.toWorld(to.x, to.y, 0.8);
      let previous = a;
      for (let i = 1; i <= 8; i += 1) {
        const t = i / 8;
        const next = a.clone().lerp(b, t);
        if (i < 8) { next.x += Math.sin(i * 14 + age * 32 + offset) * 0.15; next.y += Math.cos(i * 7 + offset) * 0.1; }
        if (vertices + 6 > attr.count) break;
        [[previous.x - 0.028, previous.y, previous.z], [previous.x + 0.028, previous.y, previous.z], [next.x - 0.028, next.y, next.z], [next.x - 0.028, next.y, next.z], [previous.x + 0.028, previous.y, previous.z], [next.x + 0.028, next.y, next.z]].forEach((p) => { attr.setXYZ(vertices++, ...p); });
        previous = next;
      }
    };
    effects.forEach((effect) => {
      const progress = effect.age / effect.duration;
      if (['cast', 'impact', 'vanish'].includes(effect.type)) {
        let slot = this.active.get(effect);
        if (!slot && this.active.size < 24) { slot = this.slot(); slot.effect = effect; this.active.set(effect, slot); }
        if (!slot) return;
        slot.group.visible = true; slot.group.position.copy(this.toWorld(effect.x, effect.y, 0.1));
        slot.material.color.setHex(effect.type === 'impact' ? 0xf5a19c : effect.type === 'vanish' ? 0xb7f3e1 : 0xffdf95);
        slot.material.opacity = (1 - progress) * 0.85;
        const radius = effect.radius / 42 * (0.3 + progress * 1.4);
        slot.ring.scale.setScalar(radius); slot.fragments.scale.setScalar(radius);
        slot.fragments.position.y = progress * 0.8; slot.fragments.rotation.y = time * 2;
        slot.fragments.visible = effect.type === 'vanish';
      } else if (effect.type === 'lightning') bolt({ x: effect.fromX, y: effect.fromY }, { x: effect.toX, y: effect.toY }, effect.age);
      else if (effect.type === 'comboChain') (effect.targets || []).forEach((target, i) => bolt({ x: effect.originX, y: effect.originY }, target, effect.age, i));
    });
    this.ribbonGeometry.setDrawRange(0, vertices); attr.needsUpdate = true; this.ribbon.visible = vertices > 0;
  }

  dispose() {
    this.slots.forEach((slot) => { this.kit.disposeOwned(slot.fragments); slot.material.dispose(); this.scene.remove(slot.group); });
    this.scene.remove(this.ribbon); this.ribbonGeometry.dispose(); this.ribbonMaterial.dispose(); this.slots = []; this.active.clear();
  }
}
module.exports = WorldEffects;

'use strict';
const THREE = require('three');

const COLORS = { ink: 0x18253c, white: 0xfff4db, gold: 0xffc45b, violet: 0x7970d9, mint: 0x9ce2d7 };
const SPECIES = ['ghost', 'jellyfish', 'pufferfish', 'shark', 'megalodon', 'penguinBellhop', 'penguinChef', 'emperorPenguin', 'pterosaur', 'triceratops', 'brachiosaurus', 'tyrannosaurus', 'cloudWisp', 'wingedSentinel', 'templeGriffin', 'paperSpirit', 'waveLantern', 'trainConductor'];

class ModelFactory {
  constructor(kit) { this.kit = kit; this.prefabs = new Map(); }

  part(group, shape, color, p, s, r, glow) { return this.kit.part(group, shape, color, p, s, r, glow); }

  joint(parent, name, position, axis = 'z', amount = 0.2, phase = 0) {
    const joint = this.kit.group(parent, name);
    joint.position.set(...position);
    joint.userData.motion = { axis, amount, phase };
    return joint;
  }

  face(group, y, z, size = 1, color = COLORS.ink) {
    for (const side of [-1, 1]) {
      this.part(group, 'ball', color, [side * 0.22 * size, y, z], [0.075 * size, 0.11 * size, 0.052 * size]);
      this.part(group, 'ball', 0xffffff, [side * 0.22 * size - 0.016, y + 0.035 * size, z + 0.042 * size], [0.022 * size, 0.029 * size, 0.014 * size]);
    }
  }

  crown(group, y, size = 1) {
    this.part(group, 'cylinder', COLORS.gold, [0, y, 0], [0.39 * size, 0.16, 0.39 * size]);
    for (let i = 0; i < 5; i += 1) {
      const a = i / 5 * Math.PI * 2;
      this.part(group, 'cone', COLORS.gold, [Math.cos(a) * 0.32 * size, y + 0.18, Math.sin(a) * 0.32 * size], [0.10 * size, 0.32, 0.10 * size]);
    }
    this.part(group, 'ball', 0xf69bb9, [0, y + 0.04, 0.40 * size], [0.10, 0.12, 0.055]);
  }

  wings(root, color, size = 1, feathered = false) {
    for (const side of [-1, 1]) {
      const wing = this.joint(root, 'wing' + side, [side * 0.36, 1.25, -0.1], 'z', 0.28, side < 0 ? 0 : Math.PI);
      wing.scale.x = side;
      this.part(wing, 'wing', color, [0, 0, 0], [size, size * 0.85, size]);
      if (feathered) for (let i = 0; i < 4; i += 1) this.part(wing, 'ball', 0xffefcd, [0.5 + i * 0.24, 0.02 + i * 0.04, 0.06], [0.15, 0.35 - i * 0.03, 0.08], [0, 0, -0.45]);
    }
  }

  feet(root, color, x = 0.28) {
    for (const side of [-1, 1]) {
      const leg = this.joint(root, 'leg' + side, [side * x, 0.27, 0], 'x', 0.24, side < 0 ? 0 : Math.PI);
      this.part(leg, 'ball', color, [0, 0, 0.13], [0.20, 0.23, 0.30]);
    }
  }

  cat(root) {
    this.part(root, 'ball', 0xeeb887, [0, 0.79, 0], [0.47, 0.60, 0.36]);
    this.part(root, 'cone', 0x6863a5, [0, 0.68, -0.14], [0.62, 0.95, 0.36]);
    this.part(root, 'ball', 0xffd6a3, [0, 1.34, 0.07], [0.53, 0.43, 0.42]);
    for (const side of [-1, 1]) {
      this.part(root, 'cone', 0xf3bb8e, [side * 0.35, 1.69, 0.01], [0.21, 0.49, 0.18], [0, 0, side * -0.17]);
      this.part(root, 'cone', 0xde8e8f, [side * 0.35, 1.72, 0.12], [0.11, 0.30, 0.045], [0, 0, side * -0.17]);
      this.part(root, 'ball', 0xffe9bf, [side * 0.15, 1.19, 0.43], [0.18, 0.12, 0.09]);
      this.part(root, 'ball', 0xec9c8b, [side * 0.38, 1.24, 0.35], [0.09, 0.05, 0.04]);
    }
    this.face(root, 1.40, 0.446, 1.2);
    this.part(root, 'ball', 0xc87b84, [0, 1.26, 0.52], [0.065, 0.045, 0.05]);
    this.part(root, 'cylinder', 0x6d60ac, [0, 1.76, -0.025], [0.56, 0.065, 0.43]);
    this.part(root, 'cone', 0x7162ba, [-0.08, 2.04, -0.06], [0.40, 0.64, 0.34], [0, 0, 0.17]);
    this.part(root, 'ring', COLORS.gold, [-0.05, 1.86, -0.03], [0.32, 0.32, 0.32], [Math.PI / 2, 0, 0]);
    this.part(root, 'spike', COLORS.gold, [-0.09, 2.05, 0.20], [0.10, 0.20, 0.055], [0, 0, 0.3], true);
    const tail = this.joint(root, 'tail', [0.36, 0.60, -0.24], 'y', 0.25);
    this.part(tail, 'tail', 0xeab684, [0.08, 0.13, -0.22], [0.32, 0.32, 0.32], [0.3, 0.3, 0.2]);
    this.feet(root, 0xf2c69a);
    for (const side of [-1, 1]) {
      const arm = this.joint(root, side > 0 ? 'staff' : 'arm', [side * 0.43, 0.93, 0.04], 'x', 0.13, side);
      this.part(arm, 'ball', 0xf2c69a, [side * 0.035, -0.06, 0.10], [0.16, 0.24, 0.17]);
      if (side > 0) {
        this.part(arm, 'cylinder', 0x86624c, [0.16, 0.28, 0.09], [0.055, 1.23, 0.055], [0, 0, -0.12]);
        this.part(arm, 'ring', COLORS.gold, [0.24, 0.96, 0.09], [0.21, 0.25, 0.15]);
        this.part(arm, 'ball', 0xa9eddd, [0.24, 0.96, 0.09], [0.12, 0.15, 0.12], undefined, true);
      }
    }
  }

  ghost(root, boss) {
    const body = boss ? 0xba9fe9 : 0xb3e5d4;
    this.part(root, 'ball', body, [0, 1.1, 0], [0.64, 0.78, 0.50]);
    this.part(root, 'cone', body, [0, 0.62, 0], [0.62, 0.95, 0.48], [0, 0, Math.PI]);
    for (let i = 0; i < 5; i += 1) this.part(root, 'ball', body, [(i - 2) * 0.23, 0.27 + (i % 2) * 0.07, 0], [0.18, 0.22, 0.43]);
    this.face(root, 1.24, 0.47, 1.2);
    this.part(root, 'ball', 0x304d5e, [0, 0.99, 0.49], [0.09, 0.12, 0.04]);
    for (const side of [-1, 1]) {
      const arm = this.joint(root, 'arm' + side, [side * 0.54, 0.94, 0], 'z', 0.25, side);
      this.part(arm, 'ball', body, [side * 0.12, 0, 0], [0.24, 0.14, 0.18], [0, 0, side * 0.5]);
    }
    if (boss) this.crown(root, 1.88, 1.25);
  }

  marine(root, species) {
    if (species === 'jellyfish') {
      this.part(root, 'dome', 0xaa9fea, [0, 1.28, 0], [0.68, 0.65, 0.60]);
      this.part(root, 'cylinder', 0x9589ce, [0, 1.28, 0], [0.67, 0.09, 0.59]);
      this.part(root, 'ring', 0xcac1f6, [0, 1.3, 0], [0.58, 0.58, 0.58], [Math.PI / 2, 0, 0]);
      for (let i = 0; i < 6; i += 1) {
        const a = i / 6 * Math.PI * 2;
        const tentacle = this.joint(root, 'tentacle' + i, [Math.cos(a) * 0.4, 1.2, Math.sin(a) * 0.35], 'z', 0.24, i);
        this.part(tentacle, 'ball', 0xa6dfdd, [0, -0.35, 0], [0.085, 0.42, 0.085]);
        this.part(tentacle, 'ball', 0x89babd, [0.05, -0.72, 0], [0.09, 0.18, 0.09]);
      }
      this.face(root, 1.52, 0.51, 0.9);
    } else if (species === 'pufferfish') {
      this.part(root, 'ball', 0xf0c772, [0, 0.99, 0], [0.72, 0.69, 0.65]);
      this.part(root, 'ball', 0xffedc0, [0, 0.78, 0.32], [0.53, 0.40, 0.39]);
      for (let i = 0; i < 9; i += 1) {
        const a = i / 9 * Math.PI * 2;
        this.part(root, 'cone', 0xd7a14e, [Math.sin(a) * 0.67, 0.99 + Math.cos(a) * 0.64, 0], [0.10, 0.28, 0.10], [0, 0, -a]);
      }
      this.face(root, 1.17, 0.59, 1.1);
      this.part(root, 'ring', 0xda9a70, [0, 0.96, 0.66], [0.10, 0.10, 0.10]);
      this.wings(root, 0xe8ac57, 0.35);
    } else {
      const boss = species === 'megalodon';
      this.part(root, 'ball', boss ? 0x6487a2 : 0x88b5c3, [0, 0.93, -0.12], [0.53, 0.55, 1.0]);
      this.part(root, 'ball', 0xd7e7df, [0, 0.76, 0.46], [0.45, 0.26, 0.60]);
      this.part(root, 'ball', boss ? 0x527389 : 0x739ea8, [0, 0.98, 0.75], [0.49, 0.33, 0.44]);
      this.part(root, 'spike', 0x60869b, [0, 1.52, -0.30], [0.28, 0.66, 0.41], [-0.3, 0, 0]);
      const tail = this.joint(root, 'tail', [0, 0.98, -0.90], 'y', 0.25);
      this.part(tail, 'spike', 0x668da2, [0, 0.1, -0.28], [0.17, 0.77, 0.37], [0.35, 0, 0]);
      this.wings(root, 0x7396a7, 0.55);
      this.face(root, 1.15, 0.99, 1.2);
      for (let i = -2; i <= 2; i += 1) this.part(root, 'cone', COLORS.white, [i * 0.13, 0.77, 1.0], [0.07, 0.16, 0.05], [0, 0, Math.PI]);
      if (boss) this.crown(root, 1.73);
    }
  }

  penguin(root, species) {
    const emperor = species === 'emperorPenguin';
    this.part(root, 'ball', 0x253b58, [0, 0.90, 0], [0.55, 0.76, 0.47]);
    this.part(root, 'ball', 0xf4eeda, [0, 0.83, 0.25], [0.42, 0.56, 0.29]);
    this.part(root, 'ball', 0x253b58, [0, 1.44, 0.04], [0.46, 0.41, 0.40]);
    this.part(root, 'ball', 0xffefda, [0, 1.40, 0.32], [0.34, 0.28, 0.13]);
    this.face(root, 1.48, 0.427, 0.9);
    this.part(root, 'cone', COLORS.gold, [0, 1.29, 0.49], [0.14, 0.29, 0.11], [Math.PI / 2, 0, 0]);
    for (const side of [-1, 1]) {
      const wing = this.joint(root, 'wing' + side, [side * 0.47, 1.10, 0], 'z', 0.17, side);
      this.part(wing, 'ball', 0x304a69, [side * 0.08, -0.20, 0], [0.16, 0.43, 0.20], [0, 0, side * 0.25]);
    }
    this.feet(root, 0xeab15d);
    if (species === 'penguinChef') {
      this.part(root, 'cylinder', 0xf3edda, [0, 1.87, 0], [0.34, 0.33, 0.30]);
      for (let i = -1; i <= 1; i += 1) this.part(root, 'ball', 0xfff8e8, [i * 0.22, 2.06, 0], [0.25, 0.24, 0.27]);
      this.part(root, 'box', 0xc96e70, [0, 1.15, 0.48], [0.30, 0.09, 0.06]);
    } else if (emperor) {
      this.crown(root, 1.88, 1.1);
      this.part(root, 'cone', 0x8673b0, [0, 0.95, -0.18], [0.70, 1.1, 0.43]);
      this.part(root, 'ball', COLORS.gold, [0, 1.12, 0.49], [0.13, 0.15, 0.06]);
    } else {
      this.part(root, 'cylinder', 0xb75f78, [0, 1.87, 0], [0.36, 0.23, 0.32]);
      this.part(root, 'cylinder', COLORS.gold, [0, 1.77, 0], [0.38, 0.04, 0.33]);
      for (let i = 0; i < 3; i += 1) this.part(root, 'ball', COLORS.gold, [0, 0.68 + i * 0.18, 0.52], [0.045, 0.045, 0.03]);
    }
  }

  dinosaur(root, species) {
    const color = { pterosaur: 0xc88c9b, triceratops: 0x9ab982, brachiosaurus: 0x81b7b0, tyrannosaurus: 0xb8a768 }[species];
    this.part(root, 'ball', color, [0, 0.8, -0.15], [0.58, 0.55, 0.78]);
    const tall = species === 'brachiosaurus';
    const y = tall ? 1.93 : 1.24;
    if (tall) this.part(root, 'ball', color, [0, 1.4, 0.32], [0.24, 0.88, 0.25], [0.25, 0, 0]);
    this.part(root, 'ball', color, [0, y, 0.49], [0.49, tall ? 0.30 : 0.43, 0.50]);
    this.part(root, 'ball', 0xf0d5a5, [0, y - 0.15, 0.77], [0.39, 0.18, 0.26]);
    this.face(root, y + 0.09, 0.91, 1.05);
    const tail = this.joint(root, 'tail', [0, 0.76, -0.65], 'y', 0.25);
    this.part(tail, 'cone', color, [0, -0.01, -0.51], [0.24, 1.1, 0.24], [-Math.PI / 2 - 0.17, 0, 0]);
    this.feet(root, color, 0.39);
    if (species === 'pterosaur') {
      this.wings(root, 0xca91a7, 0.85);
      this.part(root, 'cone', 0xe1b17a, [0, 1.16, 1.03], [0.18, 0.65, 0.15], [Math.PI / 2, 0, 0]);
      this.part(root, 'spike', 0xa96c87, [0, 1.64, 0.20], [0.15, 0.55, 0.32], [-0.3, 0, 0]);
    } else if (species === 'triceratops') {
      this.part(root, 'ball', 0xb6ce96, [0, 1.38, 0.20], [0.69, 0.65, 0.14]);
      for (const side of [-1, 1]) this.part(root, 'cone', 0xffedc1, [side * 0.30, 1.64, 0.65], [0.11, 0.52, 0.11], [0.65, 0, side * -0.12]);
      this.part(root, 'cone', 0xffedc1, [0, 1.38, 0.97], [0.09, 0.28, 0.09], [0.75, 0, 0]);
    } else if (species === 'tyrannosaurus') {
      for (let i = -2; i <= 2; i += 1) this.part(root, 'cone', 0xfff2cf, [i * 0.14, 1.09, 0.92], [0.065, 0.18, 0.055], [0, 0, Math.PI]);
      for (const side of [-1, 1]) this.part(root, 'ball', color, [side * 0.58, 0.96, 0.30], [0.13, 0.25, 0.12], [0.3, 0, side * -0.5]);
      this.crown(root, 1.83);
    } else {
      for (let i = 0; i < 4; i += 1) this.part(root, 'ball', 0x568e8d, [(i % 2 ? -1 : 1) * 0.22, 1.0, -0.5 + i * 0.18], [0.12, 0.10, 0.12]);
    }
  }

  sky(root, species) {
    if (species === 'cloudWisp') {
      for (let i = 0; i < 5; i += 1) this.part(root, 'ball', i % 2 ? 0xe0d7f0 : 0xfff1dc, [(i - 2) * 0.23, 1.0 + Math.sin(i) * 0.14, 0], [0.36, 0.38, 0.38]);
      this.face(root, 1.12, 0.36, 0.9);
      this.part(root, 'ring', COLORS.gold, [0, 1.73, 0], [0.48, 0.48, 0.48], [Math.PI / 2 - 0.2, 0, 0], true);
      for (let i = -1; i <= 1; i += 1) this.part(root, 'spike', 0xdfba7f, [i * 0.3, 0.45, 0], [0.08, 0.25, 0.08], undefined, true);
    } else if (species === 'wingedSentinel') {
      this.part(root, 'ball', 0x82b8c1, [0, 0.92, 0], [0.39, 0.55, 0.30]);
      this.part(root, 'ball', 0xe6d6af, [0, 1.52, 0], [0.40, 0.37, 0.34]);
      this.part(root, 'box', 0x254f67, [0, 1.54, 0.30], [0.47, 0.10, 0.10]);
      this.part(root, 'box', 0xb2f1e0, [0, 1.54, 0.36], [0.35, 0.035, 0.02], undefined, true);
      this.part(root, 'spike', COLORS.gold, [0, 1.94, 0], [0.16, 0.43, 0.14]);
      this.wings(root, 0xf1e2c6, 0.7, true);
      this.feet(root, 0xe6d6af);
    } else {
      this.part(root, 'ball', 0xd9b681, [0, 0.77, -0.08], [0.61, 0.54, 0.76]);
      this.part(root, 'ball', 0xf0dab0, [0, 1.33, 0.38], [0.48, 0.50, 0.42]);
      for (let i = 0; i < 7; i += 1) {
        const a = i / 7 * Math.PI * 2;
        this.part(root, 'ball', 0xcba16c, [Math.cos(a) * 0.44, 1.25 + Math.sin(a) * 0.43, 0.21], [0.18, 0.21, 0.24]);
      }
      this.face(root, 1.47, 0.76, 1.0);
      this.part(root, 'cone', COLORS.gold, [0, 1.24, 0.91], [0.20, 0.42, 0.18], [Math.PI / 2 + 0.2, 0, 0]);
      this.wings(root, 0xe5d4b5, 0.9, true);
      this.feet(root, 0xd4a66c, 0.4);
      this.crown(root, 1.93);
    }
  }

  train(root, species) {
    if (species === 'paperSpirit') {
      this.part(root, 'box', 0xffedcf, [0, 1.08, 0], [0.66, 1.16, 0.11], [0, 0, 0.08]);
      this.part(root, 'spike', 0xf6d5ab, [0, 1.74, 0], [0.46, 0.45, 0.08]);
      this.part(root, 'box', 0xe1ad87, [0, 0.73, 0.07], [0.54, 0.035, 0.025], [0, 0, 0.12]);
      this.face(root, 1.19, 0.09, 0.85);
      this.wings(root, 0xfce7c2, 0.5);
    } else if (species === 'waveLantern') {
      this.part(root, 'ball', 0x7ebebb, [0, 1.02, 0], [0.53, 0.64, 0.48]);
      for (let i = -1; i <= 1; i += 1) this.part(root, 'cylinder', 0x375f70, [0, 1.02 + i * 0.40, 0], [0.50 - Math.abs(i) * 0.1, 0.06, 0.45 - Math.abs(i) * 0.1]);
      this.part(root, 'arc', COLORS.gold, [0, 1.72, 0], [0.25, 0.25, 0.25]);
      this.part(root, 'cone', 0xdab06c, [0, 0.27, 0], [0.13, 0.40, 0.13], [0, 0, Math.PI]);
      this.face(root, 1.10, 0.47, 0.9);
    } else {
      this.ghost(root, false);
      this.part(root, 'cone', 0x3d5874, [0, 0.82, -0.02], [0.63, 1.00, 0.52]);
      this.part(root, 'cylinder', 0x314c6b, [0, 1.93, 0], [0.47, 0.23, 0.42]);
      this.part(root, 'box', 0x233b59, [0, 1.83, 0.35], [0.71, 0.08, 0.38]);
      this.part(root, 'ball', COLORS.gold, [0, 1.94, 0.43], [0.15, 0.08, 0.04]);
      for (const side of [-1, 1]) for (let i = 0; i < 3; i += 1) this.part(root, 'ball', COLORS.gold, [side * 0.18, 0.63 + i * 0.17, 0.49], [0.042, 0.042, 0.025]);
    }
  }

  create(species = 'cat', boss = false) {
    const key = species + ':' + boss;
    if (!this.prefabs.has(key)) {
      const root = new THREE.Group(); root.name = species;
      if (species === 'cat') this.cat(root);
      else if (species === 'ghost') this.ghost(root, boss);
      else if (['jellyfish', 'pufferfish', 'shark', 'megalodon'].includes(species)) this.marine(root, species);
      else if (species.includes('penguin') || species === 'emperorPenguin') this.penguin(root, species);
      else if (['pterosaur', 'triceratops', 'brachiosaurus', 'tyrannosaurus'].includes(species)) this.dinosaur(root, species);
      else if (['cloudWisp', 'wingedSentinel', 'templeGriffin'].includes(species)) this.sky(root, species);
      else this.train(root, species);
      this.kit.bake(root);
      this.kit.contact(root, species === 'cat' ? 0.60 : 0.63);
      root.userData.height = new THREE.Box3().setFromObject(root).max.y;
      this.prefabs.set(key, root);
    }
    const clone = this.prefabs.get(key).clone(true);
    clone.userData.joints = [];
    clone.traverse((node) => { if (node.userData.motion) clone.userData.joints.push(node); });
    return clone;
  }

  animate(model, time, animation = {}, drawing = false) {
    const hurt = animation.hurt > 0;
    const cast = drawing || animation.cast > 0;
    model.rotation.z = hurt ? Math.sin(time * 45) * 0.12 : Math.sin(time * 2.4) * 0.025;
    model.userData.joints.forEach((joint) => {
      const m = joint.userData.motion;
      joint.rotation[m.axis] = Math.sin(time * (joint.name.startsWith('wing') ? 6 : 5) + m.phase) * m.amount;
      if (joint.name === 'staff' && cast) joint.rotation.x = -0.65 + Math.sin(time * 12) * 0.1;
    });
    model.scale.y = hurt ? 0.94 + Math.sin(time * 30) * 0.06 : 1;
  }

  dispose() { this.prefabs.forEach((root) => this.kit.disposeOwned(root)); this.prefabs.clear(); }
}
ModelFactory.SPECIES = SPECIES;
module.exports = ModelFactory;

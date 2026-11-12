'use strict';
const THREE = require('three');

const C = { ink: 0x172c3c, cream: 0xfff0d1, gold: 0xeab544, cyan: 0x43d8ed, purple: 0x74449b, orange: 0xee8a28 };
const SPECIES = ['ghost', 'jellyfish', 'pufferfish', 'shark', 'megalodon', 'penguinBellhop', 'penguinChef', 'emperorPenguin', 'pterosaur', 'triceratops', 'brachiosaurus', 'tyrannosaurus', 'cloudWisp', 'wingedSentinel', 'templeGriffin', 'paperSpirit', 'waveLantern', 'trainConductor'];

// Model-local forward is +Z. The hero alone faces -Z in the game.
class ModelFactory {
  constructor(kit) { this.kit = kit; this.prefabs = new Map(); }
  part(group, shape, color, p, s, r, glow) { return this.kit.part(group, shape, color, p, s, r, glow); }
  line(group, key, color, points, radius = 0.025, glow = false) {
    return this.part(group, this.kit.tube(key, points, radius), color, undefined, undefined, undefined, glow);
  }
  joint(parent, name, position, axis = 'z', amount = 0.2, phase = 0) {
    const joint = this.kit.group(parent, name); joint.position.set(...position);
    joint.userData.motion = { axis, amount, phase }; return joint;
  }
  face(group, y, z, size = 1, angry = false, eyeColor = C.ink) {
    for (const side of [-1, 1]) {
      this.part(group, 'ball', C.cream, [side * 0.23 * size, y, z - 0.015], [0.15 * size, 0.17 * size, 0.065 * size]);
      this.part(group, 'ball', eyeColor, [side * 0.21 * size, y - 0.005, z + 0.04], [0.082 * size, 0.106 * size, 0.045 * size]);
      this.part(group, 'ball', 0xffffff, [side * 0.21 * size - 0.024 * size, y + 0.034 * size, z + 0.077], [0.026 * size, 0.034 * size, 0.014]);
      if (angry) this.part(group, 'ball', C.ink, [side * 0.23 * size, y + 0.15 * size, z + 0.03], [0.17 * size, 0.035 * size, 0.055], [0, 0, side * 0.32]);
    }
  }
  gem(group, position, scale = 0.12, color = C.cyan) {
    this.part(group, 'ball', C.gold, position, [scale * 1.32, scale * 1.55, scale * 0.6]);
    this.part(group, 'spike', color, [position[0], position[1], position[2] + scale * 0.95], [scale * 0.70, scale * 1.65, scale * 0.35], [0, 0, Math.PI], true);
  }
  feet(root, color, x = 0.28, z = 0, prefix = 'leg') {
    for (const side of [-1, 1]) {
      const leg = this.joint(root, prefix + side, [side * x, 0.29, z], 'x', 0.27, side < 0 ? 0 : Math.PI);
      this.part(leg, 'ball', color, [0, -0.04, 0.12], [0.19, 0.23, 0.31]);
    }
  }
  wings(root, key, color, span = 1, feathered = true, y = 1.25) {
    const outline = feathered
      ? [[0, 0], [0.23, 0.32], [1.25, 0.74], [1.16, 0.33], [0.96, -0.08], [0.65, -0.36], [0.25, -0.24]]
      : [[0, 0], [0.37, 0.37], [1.55, 0.85], [1.30, 0.27], [1.44, -0.30], [0.86, -0.12], [0.46, -0.40], [0.12, -0.25]];
    const geometry = this.kit.outline(key + '-wing', outline, 0.10);
    for (const side of [-1, 1]) {
      const wing = this.joint(root, 'wing' + side, [side * 0.31, y, -0.1], 'y', 0.20, side < 0 ? 0 : Math.PI);
      wing.scale.set(side * span, span, span);
      this.part(wing, geometry, color);
      if (feathered) {
        for (let i = 0; i < 4; i += 1) this.part(wing, 'ball', C.cream, [0.45 + i * 0.19, 0.09 + i * 0.11, 0.07], [0.12, 0.32 - i * 0.025, 0.07], [0, 0, -0.60]);
      }
      this.line(wing, key + '-wing-rib', C.gold, [[0, 0.02, 0.10], [0.48, 0.34, 0.10], [1.15, 0.57, 0.10]], 0.025);
      if (!feathered) for (let i = 0; i < 3; i += 1) {
        this.line(wing, key + '-wing-strut' + i, 0x5d7641, [[0.25, 0.08, 0.09], [0.68 + i * 0.24, -0.18 + i * 0.34, 0.09]], 0.024);
      }
    }
  }
  cat(root) {
    this.part(root, 'ball', C.cream, [0, 0.72, 0], [0.36, 0.49, 0.30]);
      this.part(root, 'ball', 0xffdfac, [0, 1.36, 0], [0.55, 0.43, 0.39]);
    for (const side of [-1, 1]) {
      const ear = this.kit.outline('cat-ear', [[-0.15, 0], [0, 0.36], [0.19, 0.03]], 0.19);
      this.part(root, ear, C.orange, [side * 0.36, 1.53, 0], [side, 1, 1]);
      this.part(root, 'spike', 0xf0b0a1, [side * 0.36, 1.70, 0.11], [0.085, 0.21, 0.05]);
      for (const z of [-0.26, 0.27]) {
        this.part(root, 'ball', C.orange, [side * 0.45, 1.43, z], [0.14, 0.065, 0.08], [0, 0, side * 0.2]);
        this.part(root, 'ball', C.orange, [side * 0.46, 1.27, z], [0.13, 0.045, 0.08]);
      }
      this.part(root, 'ball', C.cream, [side * 0.18, 1.21, 0.34], [0.22, 0.12, 0.12]);
    }
    for (let i = 0; i < 3; i += 1) this.part(root, 'ball', C.orange, [0, 1.22 + i * 0.17, -0.374], [0.11 - i * 0.013, 0.052, 0.022]);
    this.face(root, 1.40, 0.345, 1.04);
    this.part(root, 'spike', 0xce8b79, [0, 1.25, 0.47], [0.075, 0.09, 0.035], [0, 0, Math.PI]);
    this.part(root, 'cylinder', 0xae794a, [0, 1.78, 0], [0.40, 0.05, 0.35]);
    this.part(root, 'cylinder', 0xffd9a0, [0, 1.81, 0], [0.37, 0.045, 0.32]);
    const hat = this.kit.bentCone('cat-curled-hat', [[0, 0, 0, 0], [0, 0.01, 0, 0.28], [0, 0.18, 0, 0.21], [-0.04, 0.37, 0, 0.14], [-0.13, 0.51, 0, 0.10], [-0.25, 0.55, 0, 0.067], [-0.32, 0.48, 0, 0.045], [-0.30, 0.42, 0, 0]]);
    this.part(root, hat, 0xffdfaf, [0, 1.82, 0]);
    this.part(root, 'cylinder', 0xad7349, [0, 1.87, 0], [0.275, 0.07, 0.26]);
    const cape = this.joint(root, 'cape', [0, 1.02, -0.14], 'x', 0.08);
    const cloak = this.kit.outline('cat-cloak', [[-0.19, 0.15], [0.19, 0.15], [0.44, -0.06], [0.57, -0.44], [0.24, -0.38], [0, -0.48], [-0.24, -0.38], [-0.57, -0.44], [-0.44, -0.06]], 0.12);
    this.part(cape, cloak, C.purple, [0, 0, -0.13], undefined, [0.27, 0, 0]);
    this.line(cape, 'cat-cape-gold', C.gold, [[-0.56, -0.44, -0.30], [-0.24, -0.38, -0.26], [0, -0.48, -0.29], [0.24, -0.38, -0.26], [0.56, -0.44, -0.30]], 0.023);
    this.part(root, 'ring', C.gold, [0, 1.08, 0], [0.30, 0.26, 0.30], [Math.PI / 2, 0, 0]);
    this.gem(root, [0, 1.03, 0.31], 0.075, C.gold);
    this.feet(root, C.cream, 0.19);
    const tail = this.joint(root, 'tail', [0.20, 0.46, -0.17], 'y', 0.34);
    const tailPoints = [[0, 0, 0], [0.35, -0.08, -0.22], [0.62, 0.06, -0.36], [0.64, 0.32, -0.39], [0.52, 0.40, -0.37]];
    this.line(tail, 'cat-striped-tail', C.cream, tailPoints, 0.10);
    for (const [i, p] of [[0, [0.29, -0.07, -0.19]], [1, [0.56, -0.01, -0.32]], [2, [0.65, 0.22, -0.39]]]) this.part(tail, 'ball', C.orange, p, [0.11, 0.08, 0.11], [0, 0, i === 0 ? 0.8 : 0]);
    for (const side of [-1, 1]) {
      const arm = this.joint(root, side > 0 ? 'staff' : 'arm', [side * 0.33, 0.92, 0.02], 'x', 0.13, side);
      this.part(arm, 'ball', C.cream, [side * 0.04, -0.15, 0.08], [0.14, 0.22, 0.15]);
      if (side > 0) {
        this.part(arm, 'cylinder', 0x80502f, [0.16, 0.27, 0.10], [0.043, 1.14, 0.043]);
        this.part(arm, 'arc', C.gold, [0.16, 0.88, 0.10], [0.17, 0.23, 0.14]);
        this.part(arm, 'ball', C.cyan, [0.16, 0.88, 0.10], [0.10, 0.12, 0.10], undefined, true);
        this.kit.group(arm, 'castTip').position.set(0.16, 0.88, 0.10);
      }
    }
  }
  ghost(root, boss) {
    const body = boss ? 0xb889ff : 0xdbe7ff;
    const profile = [[0, 0.32], [0.42, 0.22], [0.57, 0.28], [0.63, 0.70], [0.66, 1.13], [0.62, 1.38], [0.53, 1.59], [0.35, 1.76], [0.18, 1.82], [0, 1.84]];
    const geometry = this.kit.geometry('ghost-sheet', () => {
      const mesh = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 24);
      const p = mesh.attributes.position;
      for (let i = 0; i < p.count; i += 1) if (p.getY(i) < 0.4) p.setY(i, p.getY(i) + Math.cos(Math.atan2(p.getX(i), p.getZ(i)) * 5) * 0.085);
      mesh.computeVertexNormals(); return mesh;
    });
    this.part(root, geometry, body, undefined, [1, 1, 0.72]);
    for (const side of [-1, 1]) this.part(root, 'ball', C.ink, [side * 0.20, 1.21, 0.462], [0.075, 0.10, 0.034]);
    if (boss) {
      this.part(root, 'ball', 0x6c3f9c, [0, 0.99, 0.476], [0.13, 0.14, 0.035]);
      for (const side of [-1, 1]) this.part(root, 'ball', 0x8157bd, [side * 0.21, 1.38, 0.43], [0.18, 0.035, 0.045], [0, 0, side * 0.3]);
    }
    for (const side of [-1, 1]) {
      const arm = this.joint(root, 'arm' + side, [side * 0.54, 0.92, 0], 'z', 0.18, side);
      this.part(arm, 'ball', body, [side * 0.12, 0, 0], [0.23, 0.13, 0.17]);
    }
  }
  marine(root, species) {
    if (species === 'jellyfish') {
      const bell = this.kit.lathe('jelly-bell', [[0, 0], [0.35, 0], [0.68, 0.08], [0.69, 0.28], [0.58, 0.57], [0.35, 0.80], [0, 0.89]]);
      this.part(root, bell, 0x1bc6e4, [0, 0.94, 0], [1, 1, 0.87]);
      this.part(root, 'ring', 0x86fbf1, [0, 1.04, 0], [0.65, 0.65, 0.56], [Math.PI / 2, 0, 0], true);
      for (let i = 0; i < 5; i += 1) {
        const a = i / 5 * Math.PI * 2;
        const t = this.joint(root, 'tentacle' + i, [Math.cos(a) * 0.40, 1.02, Math.sin(a) * 0.31], 'z', 0.15, i * 1.2);
        this.line(t, 'jelly-tentacle' + i, i % 2 ? 0x65efe5 : 0x20b6cc, [[0, 0, 0], [Math.sin(i) * 0.09, -0.27, 0.05], [-0.10, -0.56, 0.02], [-0.01, -0.73, 0.06], [0.15, -0.63, 0.08]], 0.065);
      }
      this.face(root, 1.30, 0.56, 1, true, 0x005b8f);
      for (let i = -1; i <= 1; i += 1) this.part(root, 'ball', 0x9affee, [i * 0.26, 1.62, 0.44], [0.09, 0.06, 0.025], undefined, true);
    } else if (species === 'pufferfish') {
      this.part(root, 'ball', 0xf6b62d, [0, 1.0, 0], [0.77, 0.76, 0.65]);
      this.part(root, 'ball', 0xffd86a, [0, 0.86, 0.34], [0.64, 0.55, 0.40]);
      for (let i = 0; i < 12; i += 1) {
        const a = i / 12 * Math.PI * 2;
        this.part(root, 'cone', 0xffd779, [Math.sin(a) * 0.76, 1.0 + Math.cos(a) * 0.75, 0], [0.08, 0.27, 0.08], [0, 0, -a]);
      }
      for (const side of [-1, 1]) {
        const fin = this.joint(root, 'wing' + side, [side * 0.70, 0.97, -0.03], 'y', 0.4, side);
        this.part(fin, this.kit.outline('puffer-fin', [[0, 0], [0.26, 0.24], [0.37, 0], [0.26, -0.24]], 0.05), 0x37b69c, undefined, [side, 1, 1]);
        this.part(root, 'ball', 0xffd45b, [side * 0.42, 0.78, 0.59], [0.25, 0.22, 0.13]);
      }
      this.part(root, 'spike', 0x36a994, [0, 1.83, -0.04], [0.18, 0.36, 0.13]);
      this.face(root, 1.19, 0.64, 1.06, true, 0x137a76);
      this.part(root, 'ring', 0xb36c1c, [0, 0.94, 0.77], [0.11, 0.10, 0.10]);
      for (let i = -2; i <= 2; i += 1) this.part(root, 'ball', 0xe1971e, [i * 0.19, 1.46 + (i % 2) * 0.07, 0.48], [0.045, 0.055, 0.018]);
    } else this.shark(root, species === 'megalodon');
  }
  shark(root, boss) {
    const blue = boss ? 0x163f7d : 0x158bd0;
    // A continuous fusiform body is rotated onto the swimming axis.
    const body = this.kit.lathe('shark-body', [[0, -1.05], [0.17, -0.83], [0.40, -0.46], [0.56, 0], [0.54, 0.46], [0.34, 0.85], [0, 1.01]]);
    this.part(root, body, blue, [0, 0.97, 0], [1, 1.20, 0.83], [Math.PI / 2, 0, 0]);
    this.part(root, 'ball', boss ? 0xb7d7df : 0xdcefff, [0, 0.71, 0.43], [0.48, 0.23, 0.72]);
    this.part(root, 'ball', 0x13263b, [0, 0.79, 1.12], [0.36, boss ? 0.18 : 0.11, 0.09]);
    this.face(root, 1.12, 1.10, 0.93, true, boss ? C.cyan : C.ink);
    const fin = this.kit.outline('shark-dorsal', [[-0.27, 0], [0, 0.75], [0.26, -0.03]], 0.09);
    this.part(root, fin, blue, [0, 1.32, -0.22], [1, 1, 1], [0, Math.PI / 2, 0]);
    for (const side of [-1, 1]) {
      const wing = this.joint(root, 'wing' + side, [side * 0.36, 0.87, -0.06], 'z', 0.12, side);
      this.part(wing, this.kit.outline('shark-pectoral', [[0, 0], [0.85, -0.28], [0.48, -0.37], [-0.05, -0.13]], 0.15), blue, undefined, [side, 1, 1], [-0.5, 0, 0]);
      for (let i = 0; i < 3; i += 1) this.part(root, 'ball', 0x073c65, [side * 0.47, 1.01, 0.19 - i * 0.17], [0.026, 0.13, 0.035], [0, 0, side * -0.24]);
    }
    const tail = this.joint(root, 'tail', [0, 0.98, -1.12], 'y', 0.28);
    this.part(tail, this.kit.outline('shark-crescent-tail', [[0, 0], [-0.05, 0.28], [0.18, 0.82], [-0.17, 0.54], [-0.30, 0], [-0.14, -0.49], [0.15, -0.74], [0.02, -0.22]], 0.10), blue, undefined, undefined, [0, Math.PI / 2, 0]);
    for (let i = -3; i <= 3; i += 1) {
      this.part(root, 'cone', C.cream, [i * 0.085, 0.86, 1.19], [0.044, boss ? 0.16 : 0.10, 0.035], [0, 0, Math.PI]);
      if (boss) this.part(root, 'cone', C.cream, [i * 0.085, 0.68, 1.19], [0.043, 0.13, 0.035]);
    }
    if (boss) {
      for (let i = 0; i < 5; i += 1) {
        this.part(root, 'spike', 0x3b72a7, [0, 1.47, 0.65 - i * 0.33], [0.19, 0.25, 0.23], [0.35, 0, 0]);
        for (const side of [-1, 1]) this.part(root, 'box', C.cyan, [side * 0.49, 0.92, -0.15 - i * 0.13], [0.025, 0.17, 0.025], [0.22, 0, 0], true);
      }
    }
  }
  penguin(root, species) {
    const emperor = species === 'emperorPenguin', chef = species === 'penguinChef';
    const body = this.kit.lathe('penguin-pear', [[0, 0.18], [0.30, 0.19], [0.52, 0.42], [0.59, 0.80], [0.50, 1.15], [0.36, 1.39], [0, 1.48]]);
    this.part(root, body, 0x202f3b, undefined, [1, 1, 0.82]);
    this.part(root, 'ball', 0xffefcf, [0, 0.68, 0.28], [0.46, 0.48, 0.26]);
    this.part(root, 'ball', 0x20303c, [0, 1.38, 0.01], [0.45, 0.43, 0.39]);
    for (const side of [-1, 1]) this.part(root, 'ball', 0xfff2da, [side * 0.18, 1.37, 0.30], [0.23, 0.29, 0.12]);
    this.face(root, 1.44, 0.395, 0.83, true);
    this.part(root, this.kit.outline('penguin-beak', [[-0.19, 0.05], [0, -0.10], [0.19, 0.05], [0, 0.15]], 0.20), 0xf4a817, [0, 1.22, 0.47]);
    this.feet(root, 0xe4a022, 0.25);
    for (const side of [-1, 1]) {
      const arm = this.joint(root, 'wing' + side, [side * 0.46, 1.06, 0], 'z', 0.13, side);
      this.part(arm, 'ball', 0x20303c, [side * 0.11, -0.20, 0.04], [0.17, 0.39, 0.17], [0, 0, side * -0.28]);
      if (chef && side > 0) {
        this.part(arm, 'cylinder', 0x77c8ee, [0.28, 0.20, 0.20], [0.15, 0.21, 0.15]);
        this.part(arm, 'cone', C.cream, [0.28, 0.40, 0.20], [0.18, 0.27, 0.18]);
        this.part(arm, 'ball', 0x74c7ec, [0.28, 0.53, 0.20], [0.06, 0.065, 0.06]);
      } else if (!chef && !emperor && side > 0) {
        this.part(arm, 'box', 0x7e4826, [0.27, -0.51, 0.17], [0.43, 0.59, 0.26]);
        for (const x of [0.13, 0.40]) this.part(arm, 'box', C.gold, [x, -0.51, 0.31], [0.04, 0.60, 0.025]);
        this.part(arm, 'arc', C.gold, [0.27, -0.15, 0.17], [0.11, 0.10, 0.10]);
        this.part(arm, 'box', 0xf6d17e, [0.29, -0.48, 0.32], [0.09, 0.14, 0.025]);
      }
    }
    if (chef) {
      this.part(root, 'cylinder', 0x7ac7e6, [0, 1.82, 0], [0.35, 0.14, 0.31]);
      for (let i = -1; i <= 1; i += 1) this.part(root, 'ball', 0xfffae8, [i * 0.21, 2.01 + (i === 0 ? 0.10 : 0), 0], [0.25, 0.24, 0.26]);
      this.part(root, 'ball', 0x72c0e7, [0, 0.77, 0.47], [0.40, 0.44, 0.10]);
      this.line(root, 'chef-apron-trim', C.cream, [[-0.35, 1.03, 0.50], [-0.25, 0.43, 0.53], [0.25, 0.43, 0.53], [0.35, 1.03, 0.50]], 0.03);
      this.gem(root, [0, 0.78, 0.59], 0.13, C.gold);
    } else if (emperor) {
      const cape = this.kit.outline('emperor-cape', [[-0.23, 0.4], [0.23, 0.4], [0.70, -0.76], [0.34, -0.65], [0, -0.82], [-0.34, -0.65], [-0.70, -0.76]], 0.13);
      this.part(root, cape, 0x124876, [0, 1.03, -0.25]);
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i += 1) this.part(root, 'spike', 0x83d8fa, [side * (0.43 + i * 0.13), 1.39 + i * 0.04, 0], [0.12, 0.48, 0.15], [0, 0, -side * (0.4 + i * 0.2)]);
      }
      this.part(root, 'ring', C.gold, [0, 1.10, 0.07], [0.43, 0.40, 0.4], [Math.PI / 2, 0, 0]);
      this.gem(root, [0, 0.95, 0.54], 0.17, 0x75d6ff);
      this.part(root, 'cylinder', C.gold, [0, 1.79, 0], [0.34, 0.10, 0.31]);
      for (let i = 0; i < 7; i += 1) {
        const a = i / 7 * Math.PI * 2;
        this.part(root, 'spike', 0x8cdaff, [Math.cos(a) * 0.26, 1.98, Math.sin(a) * 0.25], [0.10, i % 2 ? 0.32 : 0.48, 0.10]);
      }
    } else {
      this.part(root, 'cylinder', 0x203763, [0, 1.86, 0], [0.38, 0.25, 0.33]);
      this.part(root, 'cylinder', C.gold, [0, 1.76, 0], [0.39, 0.055, 0.34]);
      this.part(root, 'box', 0x142137, [0, 1.73, 0.22], [0.68, 0.055, 0.34]);
      this.part(root, this.kit.outline('bellhop-jacket', [[-0.36, 0.30], [0.36, 0.30], [0.38, -0.28], [0, -0.36], [-0.38, -0.28]], 0.10), 0x243d69, [0, 0.86, 0.49]);
      this.line(root, 'bellhop-jacket-trim', C.gold, [[-0.36, 1.18, 0.55], [-0.35, 0.58, 0.55], [0, 0.51, 0.55], [0.35, 0.58, 0.55], [0.36, 1.18, 0.55]], 0.025);
      for (const side of [-1, 1]) for (let i = 0; i < 3; i += 1) this.part(root, 'ball', C.gold, [side * 0.21, 0.66 + i * 0.18, 0.57], [0.045, 0.045, 0.03]);
    }
  }
  dinosaur(root, species) {
    if (species === 'pterosaur') { this.pterosaur(root); return; }
    const rex = species === 'tyrannosaurus', tall = species === 'brachiosaurus';
    const color = rex ? 0xaa4930 : tall ? 0x73a551 : 0x63824b;
    const torso = this.kit.lathe('dino-torso', [[0, -0.61], [0.32, -0.55], [0.54, -0.25], [0.58, 0.18], [0.45, 0.55], [0, 0.66]]);
    this.part(root, torso, color, [0, 0.79, -0.15], [1, 1.20, 0.88], [Math.PI / 2, 0, 0]);
    this.feet(root, color, 0.39, 0.19);
    if (!rex) this.feet(root, color, 0.39, -0.56, 'hindleg');
    const tail = this.joint(root, 'tail', [0, 0.78, -0.78], 'y', 0.20);
    this.part(tail, this.kit.bentCone('dino-curved-tail', [[0, 0, 0, 0.25], [0, 0.32, 0, 0.19], [0.05, 0.68, 0, 0.10], [0.16, 1.03, 0, 0]]), color, undefined, undefined, [-Math.PI / 2 - 0.18, 0, 0]);
    const headY = tall ? 2.07 : rex ? 1.55 : 1.17;
    const headZ = tall ? 0.38 : rex ? 0.49 : 0.52;
    if (tall) {
      this.part(root, this.kit.bentCone('brachio-neck', [[0, 0, 0, 0.29], [0, 0.45, 0.02, 0.22], [0, 0.90, 0.02, 0.18], [0, 1.3, 0, 0.17], [0, 1.38, 0, 0]]), color, [0, 0.75, 0.37]);
      this.part(root, 'ball', 0xd4d58a, [0, 1.51, 0.53], [0.135, 0.61, 0.08]);
    }
    this.part(root, 'ball', color, [0, headY, headZ], [tall ? 0.32 : 0.49, tall ? 0.28 : 0.38, tall ? 0.39 : 0.50]);
    this.part(root, 'ball', tall ? 0xbccf81 : rex ? 0xc46b42 : 0xa09d5c, [0, headY - 0.13, headZ + 0.30], [tall ? 0.27 : 0.41, 0.16, 0.28]);
    this.face(root, headY + 0.09, headZ + (tall ? 0.32 : 0.41), tall ? 0.80 : 1, !tall, rex ? 0xc57d16 : C.ink);
    for (const side of [-1, 1]) {
      this.part(root, 'ball', 0x364f35, [side * 0.15, headY - 0.04, headZ + 0.51], [0.035, 0.025, 0.018]);
      for (let i = 0; i < 3; i += 1) this.part(root, 'cone', 0xd9cc98, [side * 0.39 + (i - 1) * 0.09, 0.17, 0.44], [0.045, 0.11, 0.045], [Math.PI / 2, 0, 0]);
    }
    if (!rex && !tall) {
      // Scalloped frill and three forward horns are the triceratops silhouette.
      const frill = [[-0.32, -0.22], [-0.65, -0.08], [-0.72, 0.19], [-0.62, 0.45], [-0.40, 0.68], [-0.14, 0.78], [0.14, 0.78], [0.40, 0.68], [0.62, 0.45], [0.72, 0.19], [0.65, -0.08], [0.32, -0.22]];
      this.part(root, this.kit.outline('trike-frill', frill, 0.13), 0x9b8b3c, [0, 1.04, 0.14]);
      for (let i = 0; i < 7; i += 1) {
        const a = (i / 6) * Math.PI;
        this.part(root, 'cone', 0xd7c58b, [Math.cos(a) * 0.68, 1.17 + Math.sin(a) * 0.66, 0.16], [0.085, 0.25, 0.085], [0, 0, a - Math.PI / 2]);
      }
      for (const side of [-1, 1]) this.part(root, 'cone', 0xf1d7a0, [side * 0.30, 1.55, 0.69], [0.10, 0.62, 0.10], [0.66, 0, -side * 0.16]);
      this.part(root, 'cone', 0xf1d7a0, [0, 1.28, 1.04], [0.10, 0.31, 0.10], [1.08, 0, 0]);
      this.gem(root, [0, 0.79, 0.71], 0.10, C.gold);
    } else if (rex) {
      this.part(root, 'ball', 0x351f1d, [0, 1.38, 0.95], [0.38, 0.24, 0.07]);
      for (let i = -3; i <= 3; i += 1) {
        this.part(root, 'cone', 0xffddac, [i * 0.092, 1.54, 1.01], [0.047, 0.19, 0.04], [0, 0, Math.PI]);
        this.part(root, 'cone', 0xffddac, [i * 0.092, 1.24, 1.01], [0.044, 0.14, 0.04]);
      }
      for (const side of [-1, 1]) {
        const arm = this.joint(root, 'arm' + side, [side * 0.48, 1.03, 0.22], 'x', 0.17, side);
        this.part(arm, 'ball', color, [0, -0.05, 0.12], [0.10, 0.21, 0.11]);
        this.part(root, 'spike', 0xd08332, [side * 0.38, 1.76, 0.17], [0.11, 0.38, 0.15], [0, 0, side * -0.35]);
      }
      for (let i = 0; i < 5; i += 1) this.part(root, 'spike', 0xd7a64b, [0, 1.31 - i * 0.045, -0.26 - i * 0.22], [0.10, 0.35 - i * 0.03, 0.12]);
      this.gem(root, [0, 1.96, 0.61], 0.13, 0xce5825);
      this.line(root, 'rex-crown-band', C.gold, [[-0.38, 1.86, 0.43], [0, 1.89, 0.58], [0.38, 1.86, 0.43]], 0.045);
    } else {
      for (let i = 0; i < 7; i += 1) for (const side of [-1, 1]) this.part(root, 'ball', 0x477d43, [side * (0.20 + i % 2 * 0.16), 1.20 - i % 2 * 0.08, 0.19 - i * 0.12], [0.095, 0.048, 0.11]);
      this.gem(root, [0, 0.88, 0.68], 0.11, C.gold);
    }
  }
  pterosaur(root) {
    this.part(root, 'ball', 0x66854c, [0, 0.95, -0.08], [0.29, 0.49, 0.32]);
    this.part(root, 'ball', 0xd8c28a, [0, 1.07, 0.17], [0.21, 0.35, 0.15]);
    this.part(root, 'ball', 0x72924f, [0, 1.52, 0.20], [0.33, 0.27, 0.32]);
    this.part(root, 'cone', 0xda8c36, [0, 1.39, 0.65], [0.20, 0.90, 0.14], [Math.PI / 2 + 0.08, 0, 0]);
    this.face(root, 1.58, 0.45, 0.72, true);
    this.part(root, this.kit.outline('ptero-crest', [[-0.05, 0], [-0.38, 0.48], [0.14, 0.12]], 0.10), 0xc88735, [0, 1.68, -0.02], undefined, [0, Math.PI / 2, 0]);
    this.wings(root, 'ptero', 0xcba057, 0.88, false, 1.17);
    this.feet(root, 0xb08842, 0.18, -0.1);
    this.gem(root, [0, 0.99, 0.34], 0.09, C.gold);
    const tail = this.joint(root, 'tail', [0, 0.75, -0.24], 'y', 0.18);
    this.part(tail, 'cone', 0x6d874e, [0, 0, -0.25], [0.13, 0.60, 0.13], [-Math.PI / 2, 0, 0]);
  }
  sky(root, species) {
    if (species === 'cloudWisp') {
      this.part(root, 'ball', 0xc4ecf6, [0, 0.99, 0], [0.67, 0.29, 0.41]);
      for (let i = -1; i <= 1; i += 1) this.part(root, 'ball', 0xebfcff, [i * 0.40, 1.16 + (i === 0 ? 0.18 : 0), -0.06], [i === 0 ? 0.44 : 0.33, i === 0 ? 0.45 : 0.29, 0.36]);
      this.part(root, 'ring', 0xc9a854, [0, 1.06, 0], [0.75, 0.75, 0.44], [Math.PI / 2 - 0.25, 0, 0]);
      this.part(root, 'arc', C.gold, [0, 1.0, 0.19], [0.63, 0.43, 0.62], [0.25, 0, 0]);
      this.part(root, 'ball', C.cyan, [0, 1.10, 0.45], [0.14, 0.14, 0.09], undefined, true);
      for (let i = 0; i < 5; i += 1) {
        const a = i / 5 * Math.PI * 2;
        this.part(root, 'box', C.gold, [Math.cos(a) * 0.73, 1.02, Math.sin(a) * 0.44], [0.15, 0.11, 0.14], [0, -a, 0]);
      }
    } else if (species === 'wingedSentinel') {
      const body = this.kit.lathe('sentinel-armor', [[0, 0.39], [0.25, 0.41], [0.37, 0.65], [0.35, 1.29], [0.22, 1.52], [0, 1.55]]);
      this.part(root, body, 0xd8bf7a, undefined, [1, 1, 0.78]);
      this.part(root, 'ball', 0xfff8d8, [0, 1.42, 0], [0.32, 0.32, 0.27]);
      this.part(root, 'spike', 0xffdf80, [0, 1.82, 0], [0.18, 0.48, 0.13]);
      for (const side of [-1, 1]) this.part(root, 'ball', 0x8b7744, [side * 0.12, 1.45, 0.26], [0.032, 0.045, 0.022]);
      this.part(root, this.kit.outline('sentinel-breastplate', [[-0.29, 0.30], [0, 0.42], [0.29, 0.30], [0.24, -0.28], [0, -0.36], [-0.24, -0.28]], 0.08), 0xbc9446, [0, 0.98, 0.27]);
      this.gem(root, [0, 0.98, 0.38], 0.15);
      this.wings(root, 'sentinel', 0xf7f4e8, 0.74, true, 1.24);
      this.feet(root, 0xd8bf7a, 0.22);
    } else {
      this.part(root, 'ball', 0xe9d49b, [0, 0.78, -0.12], [0.61, 0.47, 0.74]);
      this.part(root, 'ball', 0xd49b34, [0, 1.29, 0.45], [0.39, 0.40, 0.37]);
      this.part(root, 'cone', 0x8c6c2f, [0, 1.18, 0.87], [0.20, 0.43, 0.16], [Math.PI / 2 + 0.2, 0, 0]);
      this.face(root, 1.40, 0.72, 0.80, true);
      this.part(root, 'spike', 0xffe289, [0, 1.79, 0.35], [0.20, 0.58, 0.15]);
      this.part(root, this.kit.outline('griffin-plate', [[-0.32, 0.27], [0.32, 0.27], [0.36, -0.13], [0, -0.30], [-0.36, -0.13]], 0.09), 0xfff7cd, [0, 0.85, 0.53]);
      this.gem(root, [0, 0.87, 0.61], 0.15);
      this.wings(root, 'griffin', 0xf8f7ec, 0.91, true, 1.12);
      this.feet(root, 0x9f7a36, 0.38, 0.20); this.feet(root, 0x9f7a36, 0.38, -0.56, 'hindleg');
      const tail = this.joint(root, 'tail', [0, 0.80, -0.72], 'y', 0.22);
      this.line(tail, 'griffin-tail', 0xc7a354, [[0, 0, 0], [0.22, 0.13, -0.24], [0.31, 0.40, -0.28]], 0.075);
    }
  }
  train(root, species) {
    if (species === 'paperSpirit') {
      const paper = this.kit.outline('paper-folded-body', [[-0.46, 0.78], [0, 0.87], [0.46, 0.78], [0.39, -0.53], [0.21, -0.65], [0, -0.48], [-0.18, -0.67], [-0.42, -0.55]], 0.18);
      this.part(root, paper, 0xfff2d8, [0, 0.97, 0]);
      this.part(root, this.kit.outline('paper-fold', [[-0.27, 0.61], [0, 0.13], [0.27, 0.61], [0.18, -0.40], [0, -0.51], [-0.18, -0.40]], 0.03), 0xfffaeb, [0, 0.97, 0.11]);
      this.line(root, 'paper-center-crease', 0xa56d5d, [[-0.19, 1.52, 0.14], [0, 1.08, 0.15], [0.19, 1.52, 0.14]], 0.019);
      this.line(root, 'paper-vertical-crease', 0xa56d5d, [[0, 1.08, 0.15], [0, 0.57, 0.15]], 0.015);
      for (const side of [-1, 1]) this.part(root, 'ball', C.ink, [side * 0.17, 1.02, 0.145], [0.06, 0.066, 0.025]);
      this.line(root, 'paper-smile', C.ink, [[-0.12, 0.84, 0.15], [0, 0.80, 0.15], [0.12, 0.84, 0.15]], 0.013);
      const fold = this.joint(root, 'fold', [0, 0.52, -0.03], 'y', 0.18);
      this.line(fold, 'paper-wind', 0x528d9a, [[-0.48, 0.01, 0], [-0.15, -0.12, 0.1], [0.27, 0.05, 0.08]], 0.018);
    } else if (species === 'waveLantern') {
      this.part(root, this.kit.lathe('lantern-ribbed-body', [[0, 0.39], [0.22, 0.43], [0.38, 0.70], [0.46, 1.05], [0.37, 1.41], [0.19, 1.62], [0, 1.65]]), 0xffd99a, undefined, [1, 1, 0.84]);
      this.part(root, 'ball', 0xffefba, [0, 1.05, 0.30], [0.25, 0.43, 0.11]);
      for (let i = -1; i <= 1; i += 1) this.part(root, 'ring', 0x875d55, [0, 1.05 + i * 0.31, 0], [i === 0 ? 0.45 : 0.36, i === 0 ? 0.45 : 0.36, 0.37], [Math.PI / 2, 0, 0]);
      this.part(root, 'arc', 0x875d55, [0, 1.69, 0], [0.20, 0.24, 0.20]);
      this.line(root, 'lantern-center-rib', 0x875d55, [[0, 1.59, 0.11], [0, 1.36, 0.35], [0, 0.98, 0.40], [0, 0.50, 0.22]], 0.018);
      for (const side of [-1, 1]) this.part(root, 'ball', C.ink, [side * 0.13, 1.12, 0.40], [0.04, 0.05, 0.024]);
      const wave = this.joint(root, 'wave', [0, 0.40, 0], 'z', 0.08);
      this.line(wave, 'lantern-wave', 0x60b6cc, [[-0.58, 0.09, 0], [-0.28, -0.02, 0.18], [0.14, 0.17, 0.27], [0.57, 0.08, 0.02]], 0.08);
      this.line(wave, 'lantern-wave-foam', 0xd7f9f0, [[-0.54, 0.13, 0.04], [-0.24, 0.03, 0.23], [0.16, 0.22, 0.30], [0.55, 0.12, 0.06]], 0.017);
    } else {
      const coat = this.kit.lathe('conductor-uniform', [[0, 0.31], [0.40, 0.31], [0.48, 0.58], [0.45, 1.19], [0.30, 1.45], [0, 1.49]]);
      this.part(root, coat, 0x25304a, undefined, [1, 1, 0.76]);
      this.part(root, 'ball', 0xf1d0a2, [0, 1.43, 0.04], [0.33, 0.31, 0.28]);
      this.part(root, 'cylinder', 0x11182a, [0, 1.84, 0], [0.35, 0.26, 0.31]);
      this.part(root, 'box', 0x11182a, [0, 1.72, 0.15], [0.91, 0.10, 0.51]);
      this.part(root, 'box', C.gold, [0, 1.86, 0.31], [0.30, 0.075, 0.03]);
      for (const side of [-1, 1]) {
        this.part(root, 'ball', 0xffcb74, [side * 0.14, 1.45, 0.31], [0.05, 0.06, 0.025], undefined, true);
        const arm = this.joint(root, 'arm' + side, [side * 0.40, 1.10, 0], 'z', 0.13, side);
        this.part(arm, 'ball', 0x25304a, [side * 0.04, -0.20, 0], [0.13, 0.30, 0.16]);
      }
      this.part(root, this.kit.outline('conductor-kerchief', [[-0.19, 0.08], [0.19, 0.08], [0, -0.15]], 0.05), 0xd15d5d, [0, 1.07, 0.36]);
      for (let i = -1; i <= 1; i += 1) this.part(root, 'box', C.gold, [i * 0.21, 0.84, 0.365], [0.13, 0.10, 0.025]);
      this.line(root, 'conductor-chain', C.gold, [[-0.34, 0.72, 0.30], [0, 0.51, 0.40], [0.34, 0.72, 0.30]], 0.022);
      this.line(root, 'conductor-mist', 0x9edbe8, [[-0.47, 0.42, 0], [-0.17, 0.34, 0.25], [0.23, 0.43, 0.27], [0.48, 0.49, 0]], 0.04);
      this.line(root, 'conductor-smile', 0x684949, [[-0.13, 1.26, 0.28], [0, 1.22, 0.30], [0.13, 1.26, 0.28]], 0.015);
    }
  }
  create(species = 'cat', boss = false) {
    const key = species + ':' + boss;
    if (!this.prefabs.has(key)) {
      const root = new THREE.Group(); root.name = species;
      if (species === 'cat') this.cat(root);
      else if (species === 'ghost') this.ghost(root, boss);
      else if (['jellyfish', 'pufferfish', 'shark', 'megalodon'].includes(species)) this.marine(root, species);
      else if (['penguinBellhop', 'penguinChef', 'emperorPenguin'].includes(species)) this.penguin(root, species);
      else if (['pterosaur', 'triceratops', 'brachiosaurus', 'tyrannosaurus'].includes(species)) this.dinosaur(root, species);
      else if (['cloudWisp', 'wingedSentinel', 'templeGriffin'].includes(species)) this.sky(root, species);
      else this.train(root, species);
      root.traverse((node) => { if (node.userData.motion) node.userData.motion.rest = node.rotation[node.userData.motion.axis]; });
      this.kit.bake(root); this.kit.contact(root, species === 'cat' ? 0.52 : 0.60);
      const bounds = new THREE.Box3().setFromObject(root);
      root.userData.height = bounds.max.y + 0.08;
      root.userData.bounds = { min: bounds.min.toArray(), max: bounds.max.toArray() };
      this.prefabs.set(key, root);
    }
    const clone = this.prefabs.get(key).clone(true); clone.userData.joints = [];
    clone.traverse((node) => { if (node.userData.motion) clone.userData.joints.push(node); });
    return clone;
  }
  animate(model, time, animation = {}, drawing = false) {
    const hurt = animation.hurt > 0, cast = drawing || animation.cast > 0;
    model.rotation.z = hurt ? Math.sin(time * 45) * 0.12 : Math.sin(time * 2.4) * 0.025;
    model.userData.joints.forEach((joint) => {
      const m = joint.userData.motion;
      joint.rotation[m.axis] = m.rest + Math.sin(time * (joint.name.startsWith('wing') ? 6 : 5) + m.phase) * m.amount;
      if (joint.name === 'staff' && cast) joint.rotation.x = 0.65 + Math.sin(time * 12) * 0.1;
      if (joint.name === 'cape' && cast) joint.rotation.x = -0.12 + Math.sin(time * 10) * 0.05;
    });
    model.scale.y = hurt ? 0.94 + Math.sin(time * 30) * 0.06 : 1;
  }
  dispose() { this.prefabs.forEach((root) => this.kit.disposeOwned(root)); this.prefabs.clear(); }
}
ModelFactory.SPECIES = SPECIES;
module.exports = ModelFactory;

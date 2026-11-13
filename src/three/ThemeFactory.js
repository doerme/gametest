'use strict';
const THREE = require('three');
const ThemeAmbient = require('./ThemeAmbient');

const STYLES = {
  castle: { sky: 0x25243f, fog: 0x575473, floor: 0x65617f, edge: 0x38374f, accent: 0xd5b376, light: 0xffe1be, ambient: 0xc4c1ef, groundLight: 0x4e4669, fill: 0xa8c4f4, sunIntensity: 2.4, fogNear: 22, fogFar: 48 },
  ocean: { sky: 0x113f59, fog: 0x27657a, floor: 0x42788a, edge: 0x223e5b, accent: 0x80dfda, light: 0xcceef0, ambient: 0xb8e2ec, groundLight: 0x304b73, fill: 0x77d9dc, sunIntensity: 2.2, fogNear: 22, fogFar: 48 },
  penguinHotel: { sky: 0x91a8cf, fog: 0xb5c5dc, floor: 0xd3dfef, edge: 0x777caa, accent: 0xeac48f, light: 0xffe8cc, ambient: 0xe6e7ff, groundLight: 0x7f83ad, fill: 0xbbf2ed, sunIntensity: 2.5, fogNear: 24, fogFar: 50 },
  dinosaurPark: { sky: 0x538b7d, fog: 0x86b69b, floor: 0xd5b578, edge: 0x43795e, accent: 0xf0cc89, light: 0xffe2b2, ambient: 0xe2f0c5, groundLight: 0x536c4d, fill: 0xb6dfcb, sunIntensity: 2.6, fogNear: 24, fogFar: 50 },
  skyCity: { sky: 0x9bc7e1, fog: 0xcbdfe9, floor: 0xeee6da, edge: 0xa4abc7, accent: 0xd7ae8d, light: 0xffe9d4, ambient: 0xf1edff, groundLight: 0x8c9fba, fill: 0xc6e4ff, sunIntensity: 2.5, fogNear: 26, fogFar: 55 },
  seaTrain: { sky: 0xe9b495, fog: 0xd9b8b1, floor: 0xad795b, edge: 0x355870, accent: 0xe8b880, light: 0xffd2a2, ambient: 0xffe2d3, groundLight: 0x6d6681, fill: 0x9fcbdc, sunIntensity: 2.4, fogNear: 24, fogFar: 52 }
};
const wrap = (value, span) => ((value % span) + span) % span;

class ThemeFactory {
  constructor(kit) {
    this.kit = kit;
    // Scenery has small primitives of its own; character geometry is unchanged.
    kit.geometry('sceneryOrb', () => new THREE.SphereGeometry(1, 8, 5));
    kit.geometry('sceneryRock', () => new THREE.IcosahedronGeometry(1, 0));
    kit.geometry('sceneryColumn', () => new THREE.CylinderGeometry(1, 1, 1, 8));
    kit.geometry('sceneryCone', () => new THREE.ConeGeometry(1, 1, 8));
    kit.geometry('sceneryRing', () => new THREE.TorusGeometry(1, 0.075, 4, 16));
    kit.geometry('sceneryArc', () => new THREE.TorusGeometry(1, 0.10, 4, 12, Math.PI));
    this.silhouette('sceneryLeaf', [[0, 0], [0.28, 0.22], [0.38, 0.55], [0.18, 0.86], [0, 1], [-0.22, 0.78], [-0.35, 0.42], [-0.2, 0.12]], 0.045);
    const points = [];
    for (let i = 0; i < 10; i += 1) {
      const a = i * Math.PI / 5 + Math.PI / 2, r = i % 2 ? 0.43 : 1;
      points.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    this.silhouette('sceneryStar', points, 0.025);
    const moon = [];
    for (let i = 0; i <= 16; i += 1) { const a = Math.PI / 2 + i * Math.PI / 16; moon.push([Math.cos(a), Math.sin(a)]); }
    for (let i = 0; i <= 16; i += 1) { const a = -Math.PI / 2 - i * Math.PI / 16; moon.push([0.48 + Math.cos(a) * 0.48, Math.sin(a)]); }
    this.silhouette('sceneryMoon', moon, 0.10);
  }

  silhouette(key, points, depth) {
    return this.kit.geometry(key, () => {
      const shape = new THREE.Shape();
      points.forEach(([x, y], index) => index ? shape.lineTo(x, y) : shape.moveTo(x, y)); shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1, curveSegments: 1 });
      geometry.translate(0, 0, -depth / 2); return geometry;
    });
  }

  part(parent, shape, color, position, scale, rotation, glow) { return this.kit.part(parent, shape, color, position, scale, rotation, glow); }
  box(parent, color, position, scale, rotation, glow) { return this.part(parent, 'box', color, position, scale, rotation, glow); }
  orb(parent, color, position, scale, glow) { return this.part(parent, 'sceneryOrb', color, position, scale, undefined, glow); }

  star(parent, color, x, z, size = 0.18) {
    this.part(parent, 'sceneryStar', color, [x, 0.063, z], [size, size, 1], [-Math.PI / 2, 0, 0]);
  }

  snowflake(parent, color, x, z, radius) {
    for (let i = 0; i < 3; i += 1) this.box(parent, color, [x, 0.067, z], [radius * 2, 0.012, 0.035], [0, i * Math.PI / 3, 0]);
  }

  cloud(parent, x, y, z, size = 1, color = 0xf2edee) {
    this.orb(parent, color, [x, y, z], [size * 1.3, size * 0.40, size * 0.7]);
    this.orb(parent, color, [x - size * 0.7, y - size * 0.07, z + size * 0.1], [size * 0.8, size * 0.28, size * 0.55]);
    this.orb(parent, color, [x + size * 0.85, y - size * 0.1, z - size * 0.1], [size * 0.8, size * 0.27, size * 0.6]);
  }

  fern(parent, x, y, z, size = 1) {
    this.part(parent, 'sceneryColumn', 0x477a51, [x, y + size * 0.55, z], [0.035, size * 1.1, 0.035]);
    for (let i = 0; i < 4; i += 1) for (const side of [-1, 1]) {
      this.part(parent, 'sceneryLeaf', i % 2 ? 0x74b37c : 0x499879, [x, y + size * (0.18 + i * 0.2), z], [size * (0.8 - i * 0.1), size * 0.65, size], [0.25, side * 0.2, -side * (1.02 - i * 0.12)]);
    }
  }

  luggage(parent, x, y, z, color) {
    this.box(parent, color, [x, y + 0.32, z], [0.5, 0.64, 0.62]);
    for (const offset of [-0.18, 0.18]) this.box(parent, 0xe5c198, [x, y + 0.33, z + offset], [0.515, 0.65, 0.045]);
    this.part(parent, 'sceneryArc', 0xdbc79c, [x, y + 0.67, z], [0.12, 0.12, 0.12]);
  }

  floor(parent, id, variant, style) {
    this.box(parent, style.edge, [0, -0.23, 0], [8.4, 0.42, 4]);
    this.box(parent, style.floor, [0, -0.035, 0], [8.0, 0.14, 4]);
    if (id === 'castle') {
      for (let row = 0; row < 4; row += 1) for (let col = 0; col < 4; col += 1) {
        const x = (col - 1.5) * 1.94;
        this.box(parent, [0x686780, 0x5b5c78, 0x77728d][(row + col + variant) % 3], [x, 0.012, (row - 1.5) * 0.99], [1.88, 0.07, 0.94]);
        if ((row + col + variant) % 5 === 0) this.box(parent, 0x9290a6, [x + 0.4, 0.05, (row - 1.5) * 0.99], [0.4, 0.012, 0.018], [0, 0.3, 0]);
      }
      this.star(parent, 0xc2ae89, -2.6, -0.6, 0.23); this.star(parent, 0xaaa4b4, 2.7, 0.85, 0.14);
      if (variant === 1) this.part(parent, 'sceneryMoon', 0xc2b493, [0, 0.067, -0.5], [0.28, 0.28, 0.4], [-Math.PI / 2, 0, -0.4]);
    } else if (id === 'ocean') {
      for (let row = 0; row < 3; row += 1) for (const side of [-1, 1]) {
        const x = side * 1.96, z = (row - 1) * 1.32;
        this.box(parent, (row + variant) % 2 ? 0x477e8d : 0x3a6b80, [x, 0.017, z], [3.78, 0.07, 1.24]);
        for (let i = 0; i < 3; i += 1) this.box(parent, 0x294c65, [side * 3.28, 0.058, z + i * 0.14 - 0.14], [0.55, 0.014, 0.035]);
        this.box(parent, 0x8dc2c5, [side * 0.22, 0.06, z - 0.48], [0.07, 0.018, 0.07]);
      }
      for (const side of [-1, 1]) {
        this.box(parent, 0x1c4a64, [side * 3.62, 0.06, 0], [0.15, 0.014, 4]);
        this.box(parent, 0x60c8c8, [side * 3.62, 0.07, 0], [0.038, 0.012, 4], undefined, true);
      }
    } else if (id === 'penguinHotel') {
      for (const side of [-1, 1]) for (let row = 0; row < 2; row += 1) {
        this.box(parent, row % 2 ? 0xc0d0e6 : 0xe3e8ed, [side * 2.65, 0.018, row * 2 - 1], [2.52, 0.07, 1.94]);
        this.snowflake(parent, 0x9fb3d0, side * 2.65, row * 2 - 1, 0.40);
      }
      this.box(parent, 0x82739e, [0, 0.045, 0], [2.6, 0.035, 4]);
      this.box(parent, 0x9783b1, [0, 0.065, 0], [2.26, 0.012, 4]);
      for (const side of [-1, 1]) this.box(parent, 0xe5c49d, [side * 1.18, 0.078, 0], [0.04, 0.014, 4]);
      this.snowflake(parent, 0xc2b3ce, 0, variant - 1, 0.22);
    } else if (id === 'dinosaurPark') {
      for (let i = 0; i < 7; i += 1) {
        const x = (i % 3 - 1) * 2.25 + Math.sin(i + variant) * 0.22, z = (Math.floor(i / 3) - 1) * 1.4 + 0.12;
        this.part(parent, 'sceneryRock', [0xc5ba97, 0xe1c994, 0xb5b790][(i + variant) % 3], [x, 0.015, z], [0.75 + (i % 2) * 0.2, 0.075, 0.52], [0, i * 0.7, 0]);
      }
      for (const side of [-1, 1]) {
        for (let i = 0; i < 4; i += 1) this.part(parent, 'sceneryLeaf', 0x9b9c60, [side * 3.35, 0.06, -1.3 + i * 0.8], [0.22, 0.48, 0.2], [-Math.PI / 2, 0, i * 1.8]);
        for (let i = 0; i < 3; i += 1) this.part(parent, 'sceneryRock', 0xa69467, [side * 1.6 + i * 0.10, 0.052, -0.4 + i * 0.11], [0.065, 0.009, 0.10]);
      }
    } else if (id === 'skyCity') {
      for (let row = 0; row < 2; row += 1) for (let col = 0; col < 3; col += 1) {
        this.box(parent, [0xf0e8df, 0xe0dfea, 0xf3e6d6][(col + row + variant) % 3], [(col - 1) * 2.6, 0.017, row * 2 - 1], [2.54, 0.07, 1.94]);
      }
      for (const side of [-1, 1]) {
        this.part(parent, 'sceneryArc', 0xc3bdcf, [side * 2.55, 0.064, 0], [0.4, 0.40, 0.16], [-Math.PI / 2, 0, side * 0.5]);
        this.box(parent, 0xd1b59b, [side * 3.64, 0.063, 0], [0.035, 0.014, 4]);
      }
      this.star(parent, 0xd2bea7, 0, variant - 1, 0.15);
    } else {
      for (let i = 0; i < 9; i += 1) {
        const x = (i - 4) * 0.865;
        this.box(parent, [0xb68a68, 0x9d715b, 0xc0926f][(i + variant) % 3], [x, 0.015, 0], [0.832, 0.08, 4]);
        this.box(parent, 0x89634f, [x + 0.18, 0.059, (i % 3 - 1) * 0.75], [0.018, 0.012, 1.1]);
      }
      for (const z of [-1.96, 1.96]) this.box(parent, 0xd4aa7e, [0, 0.066, z], [7.98, 0.014, 0.035]);
      for (const side of [-1, 1]) this.box(parent, 0xddb88b, [side * 3.65, 0.065, 0], [0.045, 0.012, 4]);
    }
    for (const side of [-1, 1]) {
      this.box(parent, style.edge, [side * 4.17, 0.13, 0], [0.31, 0.45, 4]);
      this.box(parent, style.accent, [side * 4.04, 0.36, 0], [0.035, 0.025, 4]);
    }
  }

  castle(parent, side, variant) {
    const x = side * 4.75;
    this.box(parent, 0x45415f, [x, 0.48, 0], [0.76, 0.95, 4]);
    this.part(parent, 'sceneryColumn', 0x85819a, [side * 4.45, 1.2, -1.65], [0.17, 2.3, 0.17]);
    this.box(parent, 0xb3a0af, [side * 4.45, 0.28, -1.65], [0.58, 0.19, 0.58]);
    this.box(parent, 0xc5ad8d, [side * 4.45, 2.32, -1.65], [0.46, 0.14, 0.45]);
    for (const zSide of [-1, 1]) {
      this.box(parent, 0xaaa1b8, [x, 1.35, zSide * 0.65 - 0.1], [0.18, 1.8, 0.14]);
      this.box(parent, 0xaaa1b8, [x, 2.23, zSide * 0.33 - 0.1], [0.18, 0.96, 0.15], [zSide * 0.76, 0, 0]);
    }
    if (variant !== 2) {
      this.box(parent, 0x34304d, [x + side * 0.08, 1.43, -0.1], [0.11, 1.7, 1.14]);
      for (let i = 0; i < 3; i += 1) for (let row = 0; row < 2; row += 1) this.box(parent, [0x7396c7, 0xa17fca, 0xd1abbb][(i + row + variant) % 3], [x - side * 0.08, 1.08 + row * 0.62, -0.49 + i * 0.40], [0.06, 0.54, 0.32], undefined, true);
      this.box(parent, 0xe8c78a, [x - side * 0.12, 1.44, -0.1], [0.04, 0.05, 1.16]);
    } else {
      this.box(parent, 0x39344e, [x, 1.36, -0.1], [0.28, 1.5, 1.2]);
      for (let row = 0; row < 3; row += 1) {
        this.box(parent, 0xac916b, [x - side * 0.19, 0.75 + row * 0.45, -0.1], [0.42, 0.07, 1.3]);
        for (let i = 0; i < 5; i += 1) this.box(parent, [0x8e779f, 0x5d8f96, 0xc6a078][i % 3], [x - side * 0.21, 0.96 + row * 0.45, -0.55 + i * 0.23], [0.35, 0.32 + (i % 2) * 0.05, 0.16], [i % 2 * 0.1, 0, 0]);
      }
    }
    this.part(parent, 'sceneryStar', 0xd5b786, [side * 4.46, 2.46, -1.65], [0.15, 0.15, 0.8], [0, Math.PI / 2, 0]);
  }

  ocean(parent, side, variant) {
    const x = side * 4.65;
    const windowZ = variant === 1 ? 0.65 : -0.35, windowSize = variant === 2 ? 1.10 : variant === 1 ? 0.70 : 0.94;
    this.box(parent, 0x345468, [x, 0.36, 0], [0.65, 0.7, 4]);
    for (const z of [-1.86, 1.86]) {
      this.box(parent, 0x567d92, [x, 1.3, z], [0.34, 2.6, 0.17]);
      this.box(parent, 0x92cecf, [x - side * 0.2, 1.3, z], [0.045, 1.75, 0.055], undefined, true);
    }
    this.part(parent, 'sceneryRing', 0xb9c3bd, [x, 1.55, windowZ], [windowSize, windowSize, windowSize], [0, Math.PI / 2, 0]);
    this.part(parent, 'sceneryRing', 0x5bb9c3, [x - side * 0.08, 1.55, windowZ], [windowSize - 0.12, windowSize - 0.12, windowSize - 0.12], [0, Math.PI / 2, 0], true);
    // Open portholes reveal the actual coral and water outside.
    const consoleZ = variant === 1 ? -0.85 : 1.15;
    this.box(parent, 0x54758e, [side * 4.42, 0.68, consoleZ], [0.45, 0.64, 0.78]);
    this.box(parent, 0x80cfc9, [side * 4.15, 0.86, consoleZ], [0.045, 0.28, 0.50], [0, 0, -side * 0.22], true);
    for (let i = 0; i < 3; i += 1) this.box(parent, i === variant ? 0xffd18a : 0x8cbbce, [side * 4.11, 0.9, consoleZ - 0.16 + i * 0.15], [0.025, 0.035, 0.05], undefined, true);
    for (let i = 0; i <= variant; i += 1) {
      const z = -1.2 + i * 0.8, color = [0xb77eb2, 0x79c4b3, 0xe2a2ad][(i + variant) % 3];
      this.part(parent, 'sceneryColumn', color, [side * (5.25 + i * 0.25), 0.25 + i * 0.12, z], [0.08, 1.0 + i * 0.22, 0.08], [0.15, 0, side * 0.25]);
      this.orb(parent, color, [side * (5.4 + i * 0.25), 0.85 + i * 0.18, z], [0.26, 0.19, 0.23], true);
      this.part(parent, 'sceneryColumn', color, [side * (5.55 + i * 0.25), 0.5 + i * 0.12, z], [0.055, 0.6, 0.055], [0, 0, -side * 0.8]);
    }
    this.part(parent, 'sceneryRock', 0x314f6e, [side * 5.6, -0.35, -0.2], [1.1, 0.6, 1.6]);
  }

  penguinHotel(parent, side, variant) {
    const x = side * 4.7;
    this.box(parent, 0x9caacc, [x, 0.34, 0], [0.78, 0.7, 4]);
    this.part(parent, 'sceneryCone', 0xd0e4ec, [x, 1.66, -1.55], [0.35, 2.95, 0.37]);
    this.box(parent, 0xeee3cf, [x, 0.24, -1.55], [0.78, 0.18, 0.76]);
    this.box(parent, 0xb8c2e1, [x, 2.4, 0], [0.22, 0.15, 3.0]);
    this.box(parent, 0xede1c9, [side * 4.37, 1.55, -1.1], [0.16, 0.5, 0.20]);
    this.orb(parent, 0xffdba5, [side * 4.30, 1.86, -1.1], [0.12, 0.17, 0.12], true);
    if (variant === 0) {
      this.box(parent, 0x7e739f, [side * 4.67, 0.54, 0.35], [0.85, 1.0, 1.7]);
      this.box(parent, 0xe5c69e, [side * 4.6, 1.08, 0.35], [1.0, 0.13, 1.85]);
      this.part(parent, 'sceneryColumn', 0xdbc29e, [side * 4.40, 1.22, 0.45], [0.12, 0.04, 0.12]);
      this.orb(parent, 0xffe1aa, [side * 4.40, 1.28, 0.45], [0.11, 0.065, 0.11]);
      this.box(parent, 0xbbc7df, [side * 4.49, 1.24, -0.15], [0.24, 0.21, 0.30]);
    } else if (variant === 1) {
      for (const z of [-0.35, 0.95]) this.part(parent, 'sceneryColumn', 0xd8bf99, [side * 4.7, 0.85, z], [0.045, 1.55, 0.045]);
      this.box(parent, 0xd8bf99, [side * 4.7, 0.28, 0.3], [0.85, 0.09, 1.5]);
      this.luggage(parent, side * 4.57, 0.32, -0.05, 0xa27b9d); this.luggage(parent, side * 4.8, 0.32, 0.62, 0x7aa8b2);
    } else {
      this.box(parent, 0x7f82b1, [x, 1.06, 0.25], [0.3, 1.7, 1.2]);
      this.box(parent, 0xc0d5e2, [x - side * 0.18, 1.1, 0.25], [0.045, 1.5, 0.95]);
      this.part(parent, 'sceneryStar', 0xe9c894, [x - side * 0.23, 1.45, 0.25], [0.22, 0.22, 0.7], [0, Math.PI / 2, 0]);
      this.orb(parent, 0xdab58a, [x - side * 0.24, 0.86, 0.6], [0.065, 0.065, 0.065]);
    }
  }

  dinosaurPark(parent, side, variant) {
    this.box(parent, 0x6e9562, [side * 4.8, -0.05, 0], [1.6, 0.36, 4]);
    this.fern(parent, side * 4.8, 0.02, -1.25, 1.7);
    this.fern(parent, side * 5.45, 0, 0.65, 1.1);
    if (variant === 0) {
      this.part(parent, 'sceneryColumn', 0x8b7557, [side * 5.0, 1.3, 0.4], [0.16, 2.6, 0.19], [0.06, 0, side * 0.13]);
      for (let i = 0; i < 5; i += 1) this.part(parent, 'sceneryLeaf', i % 2 ? 0x6bae77 : 0x389783, [side * 5.25, 2.45, 0.4], [1.5, 1.75, 1.1], [0.6 + i * 0.7, i * 1.25, i * 0.9]);
      this.part(parent, 'sceneryArc', 0x6b9e68, [side * 5.05, 1.9, -0.3], [0.75, 1.0, 0.8], [0, Math.PI / 2, 0]);
    } else if (variant === 1) {
      this.part(parent, 'sceneryRock', 0x9d9773, [side * 4.8, 0.28, 0.4], [0.65, 0.44, 0.95]);
      for (let i = 0; i < 3; i += 1) this.orb(parent, [0xf0d3a4, 0xd8c5a1, 0xe4c3a0][i], [side * (4.55 + i * 0.2), 0.55, 0.1 + i * 0.3], [0.20, 0.29, 0.21]);
      for (let i = 0; i < 5; i += 1) this.box(parent, 0x9e8058, [side * 4.8, 0.4, i * 0.18], [1.0, 0.055, 0.055], [0, i * 0.7, 0]);
    } else {
      this.part(parent, 'sceneryRock', 0x91a38a, [side * 5.0, 0.66, 0.45], [0.8, 1.0, 1.0]);
      for (let i = 0; i < 5; i += 1) this.part(parent, 'sceneryRock', 0xe4d5b4, [side * 4.46, 0.52 + Math.sin(i * 0.6) * 0.35, i * 0.2 - 0.1], [0.055, 0.07, 0.055]);
      for (let i = 0; i < 3; i += 1) this.box(parent, 0xe4d5b4, [side * 4.44, 0.72, i * 0.24], [0.035, 0.32, 0.055], [0.3, 0, 0]);
    }
    for (let i = 0; i < 3; i += 1) {
      const z = 0.6 + i * 0.28;
      this.box(parent, 0x99b786, [side * 4.3, 0.15, z], [0.04, 0.3, 0.04]);
      this.part(parent, 'sceneryRock', i % 2 ? 0xefb28f : 0xf4d38b, [side * 4.3, 0.3, z], [0.10, 0.07, 0.10]);
    }
  }

  skyCity(parent, side, variant) {
    this.box(parent, 0xc2bed0, [side * 4.42, 0.35, 0], [0.40, 0.17, 4]);
    this.box(parent, 0xd5b495, [side * 4.42, 0.46, 0], [0.46, 0.045, 4]);
    for (const z of [-1.65, 1.65]) {
      this.part(parent, 'sceneryColumn', 0xe8dfe0, [side * 4.5, 0.28, z], [0.15, 0.7, 0.15]);
      this.orb(parent, 0xe5c09c, [side * 4.5, 0.67, z], [0.12, 0.12, 0.12]);
    }
    if (variant === 0) {
      this.part(parent, 'sceneryColumn', 0xe6dfe5, [side * 4.9, 1.5, -0.9], [0.23, 2.8, 0.23]);
      for (const y of [0.25, 2.82]) this.box(parent, 0xe8cfb0, [side * 4.9, y, -0.9], [0.78, 0.18, 0.75]);
      this.part(parent, 'sceneryCone', 0xd6ab90, [side * 4.9, 3.12, -0.9], [0.34, 0.6, 0.34]);
    } else if (variant === 1) {
      this.box(parent, 0xd8c8dc, [side * 4.8, 0.6, -0.3], [0.8, 1.0, 0.8]);
      this.part(parent, 'sceneryArc', 0xd8b396, [side * 4.8, 1.55, -0.3], [0.45, 0.65, 0.45], [0, Math.PI / 2, 0]);
      this.orb(parent, 0xf9e5be, [side * 4.8, 1.62, -0.3], [0.12, 0.18, 0.12], true);
    } else {
      for (let step = 0; step < 3; step += 1) this.box(parent, 0xe2d5db, [side * (4.65 + step * 0.22), 0.13 - step * 0.11, step * 0.45 - 0.6], [0.7, 0.12, 0.65]);
      this.part(parent, 'sceneryStar', 0xe0bd9e, [side * 4.85, 0.66, 0.6], [0.2, 0.2, 0.8], [0, Math.PI / 2, 0]);
    }
    this.cloud(parent, side * 5.5, -0.55, 0.5, 0.85);
  }

  seaTrain(parent, side, variant) {
    const x = side * 4.68;
    this.box(parent, 0x375a70, [x, 0.37, 0], [0.6, 0.74, 4]);
    for (const z of [-1.87, 1.87]) {
      this.box(parent, 0x577e91, [x, 1.4, z], [0.33, 2.8, 0.18]);
      this.box(parent, 0xd5ae81, [x - side * 0.18, 1.4, z], [0.035, 1.8, 0.045]);
    }
    this.box(parent, 0x578393, [x, 2.68, 0], [0.33, 0.17, 4]);
    this.box(parent, 0xc69974, [x, 0.8, 0], [0.7, 0.14, 3.7]);
    this.box(parent, 0x698d9c, [side * 4.50, 1.99, 0], [0.7, 0.07, 1.5]);
    this.box(parent, 0xdeb589, [side * 4.17, 2.05, -0.75], [0.045, 0.16, 0.06]);
    this.orb(parent, 0xffd7a4, [side * 4.32, 2.35, -1.5], [0.12, 0.15, 0.12], true);
    if (variant !== 2) {
      this.box(parent, variant ? 0x8d8d98 : 0x779ba4, [side * 4.50, 0.51, 0.18], [0.66, 0.38, 1.55]);
      this.box(parent, 0xaac1bd, [side * 4.48, 0.73, 0.18], [0.72, 0.16, 1.56]);
      this.box(parent, 0x5e8999, [side * 4.80, 1.02, 0.18], [0.18, 0.64, 1.54]);
      this.box(parent, 0xe2b991, [side * 4.3, 0.86, -0.65], [0.46, 0.07, 0.09]);
      if (variant === 1) this.luggage(parent, side * 4.55, 2.02, 0.1, 0xad8080);
    } else {
      this.box(parent, 0xc49b78, [side * 4.56, 0.98, 0], [0.85, 0.12, 1.25]);
      this.part(parent, 'sceneryColumn', 0xd4bd96, [side * 4.56, 0.63, 0], [0.055, 0.6, 0.055]);
      this.part(parent, 'sceneryColumn', 0xf0d9bc, [side * 4.40, 1.12, 0.2], [0.10, 0.18, 0.10]);
      this.box(parent, 0xadafc0, [side * 4.58, 1.08, -0.25], [0.32, 0.04, 0.42], [0, 0.15, 0]);
    }
  }

  backdrop(root, id, style) {
    const backdrop = this.kit.group(root, 'distant-scenery');
    const groundColor = { seaTrain: 0x6a9fae, ocean: 0x194c65, skyCity: 0x8eb9d6 }[id] || style.fog;
    this.box(backdrop, groundColor, [0, -1.4, -10], [120, 0.1, 130], undefined, true);
    const moving = [];
    const drift = (name, side, z, speed, bob = 0, y = 0) => {
      const group = this.kit.group(backdrop, name); group.position.set(side, y, z);
      moving.push({ group, z, y, speed, bob, phase: moving.length * 1.7 }); return group;
    };
    if (id === 'castle') {
      this.part(backdrop, 'sceneryMoon', 0xe2d3ad, [-5.2, 0.5, -11.5], [0.65, 0.65, 0.65], [0, 0, -0.25], true);
      for (const side of [-1, 1]) for (let i = 0; i < 3; i += 1) {
        const x = side * (5.9 + i * 0.7), z = -15 + i * 5;
        this.box(backdrop, 0x5b5678, [x, 0.8, z], [0.9, 3.3, 1.1]);
        this.part(backdrop, 'sceneryCone', 0x797398, [x, 2.65, z], [0.78, 1.3, 0.8]);
        this.box(backdrop, 0xd0b497, [x, 1.1, z + 0.56], [0.20, 0.55, 0.035], undefined, true);
      }
    } else if (id === 'ocean') {
      for (const side of [-1, 1]) for (let i = 0; i < 5; i += 1) {
        const x = side * (5.8 + (i % 2) * 1.0), z = -23 + i * 6;
        this.part(backdrop, 'sceneryRock', i % 2 ? 0x306d7d : 0x295369, [x, -0.15, z], [1.3, 1.6 + i % 3, 1.1]);
        this.orb(backdrop, 0x6fbabc, [x - side * 0.8, 0.1, z + 0.4], [0.30, 0.55, 0.30], true);
      }
    } else if (id === 'penguinHotel') {
      for (const side of [-1, 1]) for (let i = 0; i < 4; i += 1) {
        const x = side * (6.5 + i % 2), z = -19 + i * 6;
        this.part(backdrop, 'sceneryRock', 0xb1d2e2, [x, -0.1, z], [1.1, 1.4, 1.5]);
        this.part(backdrop, 'sceneryCone', 0xdce6ee, [x, 1.1, z], [0.65, 1.5, 0.65]);
      }
    } else if (id === 'dinosaurPark') {
      for (const side of [-1, 1]) for (let i = 0; i < 4; i += 1) {
        const x = side * (6.5 + i % 2), z = -20 + i * 6;
        this.part(backdrop, 'sceneryColumn', 0x698566, [x, 0.65, z], [0.18, 2.9, 0.18], [0.1, 0, side * 0.2]);
        this.cloud(backdrop, x, 2.1, z, 1.4, i % 2 ? 0x4f9d82 : 0x75a980);
      }
    } else if (id === 'skyCity') {
      for (const side of [-1, 1]) for (let i = 0; i < 3; i += 1) {
        const island = drift('floating-island', side * (4.7 + (i === 0 ? 0.55 : 0)), -18 + i * 10, 0.16 + i * 0.025, 0.10);
        this.part(island, 'sceneryCone', 0x9c9dbb, [0, -1.1, 0], [1.2, 1.8, 1.3], [0, 0, Math.PI]);
        this.part(island, 'sceneryColumn', 0xc3c2d5, [0, -0.2, 0], [1.25, 0.16, 1.3]);
        this.box(island, 0xe2dce7, [0, 0.4, 0], [0.8, 1.1, 0.8]);
        this.part(island, 'sceneryCone', 0xc4a1bc, [0, 1.2, 0], [0.6, 0.85, 0.6]);
        for (let step = 0; step < 4; step += 1) this.box(island, 0xe8e0de, [-side * (0.9 + step * 0.28), -0.12 - step * 0.14, 0.25], [0.4, 0.09, 0.5]);
        this.cloud(island, 0, -1.35, 0.4, 1.1);
      }
      for (let i = 0; i < 6; i += 1) {
        const cloud = drift('cloud-bank', (i % 2 ? -1 : 1) * (5.0 + i % 3), -24 + i * 6, 0.25 + i * 0.025);
        this.cloud(cloud, 0, -0.85, 0, 1.3);
      }
    } else {
      this.orb(backdrop, 0xffd79d, [-6.0, 0.25, -12], [1.65, 1.65, 0.35], true);
      for (const side of [-1, 1]) for (let i = 0; i < 4; i += 1) {
        const island = drift(i === 1 ? 'lighthouse-island' : 'sea-island', side * (i === 1 ? 4.65 : 5.6), -23 + i * 9, 0.38 + (i % 2) * 0.18);
        this.orb(island, i % 2 ? 0x779b98 : 0x7193a0, [0, -1.2, 0], [1.8, 0.38, 1.1]);
        if (i === 1) {
          for (let band = 0; band < 3; band += 1) this.part(island, 'sceneryColumn', band % 2 ? 0xc17f7a : 0xf3dfc1, [0, 0.3 + band * 0.42, 0], [0.22 - band * 0.02, 0.43, 0.22 - band * 0.02]);
          this.part(island, 'sceneryCone', 0x8d6b83, [0, 1.61, 0], [0.34, 0.30, 0.34]);
          this.orb(island, 0xffe2a6, [0, 1.37, 0], [0.16, 0.13, 0.16], true);
        }
      }
    }
    this.kit.bake(backdrop); return moving;
  }

  create(themeId) {
    const id = Object.prototype.hasOwnProperty.call(STYLES, themeId) ? themeId : 'castle', style = STYLES[id];
    const root = new THREE.Group(); root.name = 'theme-' + id; root.scale.x = 0.68;
    const variants = [];
    for (let variant = 0; variant < 3; variant += 1) {
      const tile = new THREE.Group(); tile.name = 'module-' + variant; tile.userData.variant = variant;
      const ground = this.kit.group(tile, 'ground'), architecture = this.kit.group(tile, 'architecture');
      this.floor(ground, id, variant, style);
      for (const side of [-1, 1]) this[id](architecture, side, variant);
      this.kit.bake(tile); variants.push(tile);
    }
    for (let i = 0; i < 9; i += 1) {
      const segment = variants[i % 3].clone(true); segment.userData.segment = i; segment.position.z = i * 4 - 28; root.add(segment);
    }
    root.userData.parallax = this.backdrop(root, id, style);
    root.userData.ambient = new ThemeAmbient(id); root.add(root.userData.ambient.mesh);
    root.userData.style = style; root.userData.themeId = id;
    this.update(root, 0, 0); return root;
  }

  update(root, travel, time = travel) {
    for (const child of root.children) if (child.userData.segment !== undefined) child.position.z = wrap(child.userData.segment * 4 + travel, 36) - 28;
    for (const item of root.userData.parallax) {
      item.group.position.z = wrap(item.z + 28 + travel * item.speed, 36) - 28;
      item.group.position.y = item.y + Math.sin(time * 0.55 + item.phase) * item.bob;
    }
    root.userData.ambient.update(travel, time);
  }
}
ThemeFactory.STYLES = STYLES;
module.exports = ThemeFactory;

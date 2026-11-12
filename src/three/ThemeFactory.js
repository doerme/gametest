'use strict';
const THREE = require('three');

const STYLES = {
  castle: { sky: 0x182c41, fog: 0x2c4658, floor: 0x657779, edge: 0x364c5b, accent: 0xe5bb70, light: 0xffe6be },
  ocean: { sky: 0x102c43, fog: 0x184258, floor: 0x547f89, edge: 0x304b66, accent: 0x8de2d6, light: 0xc3f1ee },
  penguinHotel: { sky: 0x849db9, fog: 0xa6c8d0, floor: 0xc3dad8, edge: 0x829eb7, accent: 0xf5d19d, light: 0xfff0dc },
  dinosaurPark: { sky: 0x6b8c7d, fog: 0x93ae92, floor: 0xc3b48d, edge: 0x708968, accent: 0xe0c48d, light: 0xffedc4 },
  skyCity: { sky: 0x97bed2, fog: 0xc6dce0, floor: 0xf1e3c6, edge: 0xb9b6b1, accent: 0xd7ad68, light: 0xfff1d0 },
  seaTrain: { sky: 0x7eacbc, fog: 0xb3cad0, floor: 0xbb9678, edge: 0x48647a, accent: 0xf2cb89, light: 0xffe5be }
};

class ThemeFactory {
  constructor(kit) { this.kit = kit; }

  create(themeId) {
    const style = STYLES[themeId] || STYLES.castle;
    const root = new THREE.Group();
    root.name = 'theme-' + themeId;
    root.scale.x = 0.68;
    const tile = new THREE.Group();
    const part = (shape, color, pos, scale, rotation, glow) => this.kit.part(tile, shape, color, pos, scale, rotation, glow);
    const box = (color, pos, scale, rotation, glow) => part('box', color, pos, scale, rotation, glow);
    // Three rows of staggered paving, never a photographic backdrop.
    box(style.edge, [0, -0.23, 0], [8.4, 0.42, 4]);
    for (let row = 0; row < 3; row += 1) for (let column = 0; column < 4; column += 1) {
      const offset = row % 2 ? 0.10 : 0;
      box(style.floor, [(column - 1.5) * 1.93 + offset, -0.015, (row - 1) * 1.31], [1.86, 0.13, 1.25]);
    }
    for (const side of [-1, 1]) {
      const x = side * 4.25;
      box(style.edge, [x, 0.14, 0], [0.42, 0.48, 4]);
      box(style.accent, [side * 4.03, 0.39, 0], [0.045, 0.04, 4], undefined, true);
      if (themeId === 'castle') {
        box(0x3a5264, [side * 4.8, 0.65, 0], [0.70, 1.4, 4]);
        part('cylinder', 0x6f8790, [x + side * 0.25, 1.64, -1.5], [0.25, 2.5, 0.25]);
        box(0x839599, [x + side * 0.25, 0.42, -1.5], [0.72, 0.28, 0.72]);
        box(0x839599, [x + side * 0.25, 2.87, -1.5], [0.66, 0.24, 0.66]);
        part('arc', 0x718995, [side * 4.82, 2.05, -1.5], [0.72, 0.9, 0.35], [0, 0, side * Math.PI / 2]);
        box(0x213c51, [side * 4.68, 1.75, 0.7], [0.14, 1.3, 1.00]);
        part('ball', 0xe8bd73, [side * 4.22, 1.60, 0.7], [0.14, 0.23, 0.14], undefined, true);
        box(0x8f7250, [side * 4.4, 1.25, 0.7], [0.34, 0.06, 0.34]);
      } else if (themeId === 'ocean') {
        box(0x395d71, [side * 4.8, 1.4, 0], [0.52, 2.8, 4]);
        part('cylinder', 0x407588, [side * 4.48, 1.78, 0], [0.90, 0.12, 0.90], [0, 0, Math.PI / 2]);
        part('cylinder', 0x6fc4c4, [side * 4.40, 1.78, 0], [0.72, 0.13, 0.72], [0, 0, Math.PI / 2], true);
        part('ring', 0xb8bca0, [side * 4.30, 1.78, 0], [0.84, 0.84, 0.84], [0, Math.PI / 2, 0]);
        for (let i = 0; i < 3; i += 1) part('ball', 0xd0e6cf, [side * 4.2, 1.45 + i * 0.28, -0.3 + i * 0.22], [0.06, 0.06, 0.06], undefined, true);
        box(0x8dc9bb, [side * 4.4, 0.48, 0], [0.08, 0.12, 3.7], undefined, true);
      } else if (themeId === 'penguinHotel') {
        box(0x9bb6c7, [side * 4.65, 0.6, 0], [0.8, 1.2, 4]);
        part('spike', 0xc7e2df, [side * 4.8, 2.2, -1.4], [0.63, 3.3, 0.56], [0, 0.4, side * 0.05]);
        part('spike', 0xe8f2de, [side * 4.64, 1.52, 1.0], [0.43, 1.8, 0.40], [0, 0.7, side * -0.1]);
        box(0x738aab, [side * 4.15, 0.7, 0.1], [0.2, 0.9, 1.1]);
        part('ball', 0xffdda3, [side * 4.08, 1.12, 0.1], [0.17, 0.23, 0.17], undefined, true);
        box(0xb1dacf, [side * 5.5, 3.4, 0], [0.18, 0.12, 4], [0, 0, side * 0.25], true);
      } else if (themeId === 'dinosaurPark') {
        box(0x7f8f69, [side * 4.6, 0.15, 0], [1.3, 0.4, 4]);
        part('cylinder', 0x846e54, [side * 5.0, 1.44, -1.1], [0.25, 2.5, 0.28], [0.1, 0, side * -0.12]);
        for (let i = 0; i < 3; i += 1) part('ball', [0x6d9972, 0x85a576, 0x577e66][i], [side * (4.9 + i * 0.30), 2.7 + (i % 2) * 0.3, -1 + i * 0.2], [0.85, 0.63, 0.85]);
        part('box', 0x8f9b83, [side * 4.4, 0.55, 0.9], [0.65, 1.1, 0.7], [0.1, 0.4, side * -0.2]);
        for (let i = 0; i < 3; i += 1) part('wing', 0x759a65, [side * 4.1, 0.42, 0.6], [0.37, 0.45, 0.4], [0, i * 1.6, side * 0.45]);
      } else if (themeId === 'skyCity') {
        part('cylinder', 0xddd5be, [side * 4.5, 1.5, -1.2], [0.33, 2.6, 0.33]);
        box(0xf6e7c9, [side * 4.5, 0.3, -1.2], [0.93, 0.25, 0.9]);
        box(0xe5d3ad, [side * 4.5, 2.86, -1.2], [0.90, 0.23, 0.85]);
        part('ring', 0xd5af6c, [side * 4.5, 1.1, -1.2], [0.36, 0.36, 0.36], [Math.PI / 2, 0, 0]);
        part('spike', 0xe9c77f, [side * 4.55, 3.2, -1.2], [0.18, 0.47, 0.18], undefined, true);
        for (let i = 0; i < 3; i += 1) part('ball', i % 2 ? 0xcbdde1 : 0xf4eedd, [side * (6.1 + i * 0.55), -0.25 + i * 0.10, i - 1], [1.5, 0.65, 0.9]);
      } else {
        box(0x5e7b8c, [side * 4.65, 0.72, 0], [0.68, 1.45, 4]);
        box(0x65899b, [side * 4.6, 2.83, 0], [0.45, 0.2, 4]);
        box(0x8bbcc4, [side * 4.62, 1.91, 0], [0.12, 1.55, 3.35], undefined, true);
        for (const z of [-1.75, 1.75]) box(0x405e77, [side * 4.5, 1.9, z], [0.48, 2.1, 0.18]);
        box(0x667d8b, [side * 4.08, 0.68, 0.2], [0.66, 0.55, 1.42]);
        box(0xceb18a, [side * 4.08, 0.96, 0.2], [0.76, 0.16, 1.5]);
        part('ball', 0xffdaa0, [side * 4.2, 2.64, -1.6], [0.15, 0.21, 0.15], undefined, true);
      }
    }
    // Small inset rune gives a sense of travel without texture scrolling.
    part('ring', style.accent, [0, 0.065, 0], [0.22, 0.22, 0.22], [-Math.PI / 2, 0, 0]);
    this.kit.bake(tile);
    for (let i = 0; i < 9; i += 1) {
      const segment = tile.clone(true);
      segment.userData.segment = i;
      segment.position.z = i * 4 - 28;
      root.add(segment);
    }
    const backdrop = new THREE.Group();
    this.kit.part(backdrop, 'box', themeId === 'seaTrain' ? 0x6eacb4 : style.fog, [0, -1.3, -10], [120, 0.2, 130]);
    if (themeId === 'skyCity' || themeId === 'seaTrain') {
      for (let i = 0; i < 10; i += 1) {
        this.kit.part(backdrop, 'ball', 0xe2e1ce, [(i % 2 ? -1 : 1) * (7 + i * 1.5), -0.5, -i * 4], [2.8, 0.7, 1.5]);
      }
    }
    this.kit.bake(backdrop); root.add(backdrop);
    root.userData.style = style;
    return root;
  }

  update(root, travel) {
    root.children.forEach((child) => {
      if (child.userData.segment !== undefined) child.position.z = ((child.userData.segment * 4 + travel) % 36) - 28;
    });
  }
}
ThemeFactory.STYLES = STYLES;
module.exports = ThemeFactory;

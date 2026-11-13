'use strict';
const THREE = require('three');

// Fixed-capacity ordinary triangles work on the same extension-free WebGL 1
// path as spell effects. All variation is deterministic and cosmetic.
const CAPACITY = 2400;
const TAU = Math.PI * 2;
const SIDES = [-1, 1];
const wrap = (value, span) => ((value % span) + span) % span;
const noise = (index, salt) => {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
};

class ThemeAmbient {
  constructor(themeId) {
    this.themeId = themeId;
    this.geometry = new THREE.BufferGeometry();
    this.positions = new THREE.Float32BufferAttribute(new Float32Array(CAPACITY * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.colors = new THREE.Float32BufferAttribute(new Float32Array(CAPACITY * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', this.positions); this.geometry.setAttribute('color', this.colors);
    this.geometry.setDrawRange(0, 0);
    this.material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    this.material.userData.themeOwned = true;
    this.material.forceSinglePass = true;
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = 'environment-animation'; this.mesh.frustumCulled = false; this.mesh.renderOrder = 1;
    this.palette = [0xffe6b1, 0xba9cf6, 0x7de8e9, 0xdcefff, 0xb9f18c, 0xffd6a5, 0xf4f5ef, 0x244f78, 0x54d9b9, 0x9b7bdf].map((hex) => new THREE.Color(hex));
    this.particles = Array.from({ length: 48 }, (_, i) => ({
      x: i < 12 ? (noise(i, 1) - 0.5) * 6.7 : (i % 2 ? -1 : 1) * (4.35 + noise(i, 1) * 1.8),
      y: noise(i, 2) * 3.6, z: noise(i, 3) * 36 - 28,
      phase: noise(i, 4) * TAU, speed: 0.25 + noise(i, 5) * 0.5,
      size: 0.025 + noise(i, 6) * 0.045
    }));
    this.cursor = 0;
  }

  vertex(x, y, z, color, alpha) {
    this.positions.setXYZ(this.cursor, x, y, z);
    this.colors.setXYZW(this.cursor++, color.r, color.g, color.b, alpha);
  }

  diamond(x, y, z, radius, color, alpha) {
    this.vertex(x, y + radius, z, color, alpha);
    this.vertex(x - radius * 0.65, y, z, color, alpha);
    this.vertex(x, y - radius, z, color, alpha);
    this.vertex(x, y + radius, z, color, alpha);
    this.vertex(x, y - radius, z, color, alpha);
    this.vertex(x + radius * 0.65, y, z, color, alpha);
  }

  bubble(x, y, z, radius, alpha) {
    // A broken hexagonal rim reads as a bubble without a textured sprite.
    for (let i = 0; i < 5; i += 1) {
      const a = i / 6 * TAU, b = (i + 1) / 6 * TAU;
      this.vertex(x + Math.cos(a) * radius, y + Math.sin(a) * radius, z, this.palette[2], alpha);
      this.vertex(x + Math.cos(b) * radius, y + Math.sin(b) * radius, z, this.palette[2], alpha);
      this.vertex(x + Math.cos(a) * radius * 0.65, y + Math.sin(a) * radius * 0.65, z, this.palette[3], alpha * 0.4);
    }
  }

  candle(x, y, z) {
    const color = this.palette[0];
    // A small hovering tray and wax column, in the same dynamic batch as flames.
    for (let face = 0; face < 2; face += 1) {
      const offset = face ? 0.1 : -0.1;
      this.vertex(x - 0.13, y - 0.22, z + offset, color, 0.85);
      this.vertex(x + 0.13, y - 0.22, z + offset, color, 0.85);
      this.vertex(x + 0.13, y - 0.27, z + offset, color, 0.85);
      this.vertex(x - 0.13, y - 0.22, z + offset, color, 0.85);
      this.vertex(x + 0.13, y - 0.27, z + offset, color, 0.85);
      this.vertex(x - 0.13, y - 0.27, z + offset, color, 0.85);
    }
    this.vertex(x - 0.045, y - 0.24, z, this.palette[6], 1);
    this.vertex(x + 0.045, y - 0.24, z, this.palette[6], 1);
    this.vertex(x + 0.045, y - 0.055, z, this.palette[6], 1);
    this.vertex(x - 0.045, y - 0.24, z, this.palette[6], 1);
    this.vertex(x + 0.045, y - 0.055, z, this.palette[6], 1);
    this.vertex(x - 0.045, y - 0.055, z, this.palette[6], 1);
  }

  ribbon(side, time, index, aurora) {
    const color = this.palette[aurora ? 8 + index % 2 : 5];
    for (let i = 0; i < 16; i += 1) {
      const z = -22 + i * 1.65;
      const y = aurora ? 0.8 + Math.sin(i * 0.4 + time * 0.24 + index) * 0.42 : -1.04;
      const nextY = aurora ? 0.8 + Math.sin((i + 1) * 0.4 + time * 0.24 + index) * 0.42 : -1.04;
      const x = side * (aurora ? 4.45 + index * 0.25 : 4.9 + index * 0.7 + Math.sin(time * 0.3 + i) * 0.3);
      const width = side * (aurora ? 0.60 : 0.25 + Math.sin(i + time * 0.5) * 0.13);
      const alpha = aurora ? 0.44 + Math.sin(i * 0.3) * 0.12 : 0.17;
      this.vertex(x, y, z, color, alpha);
      this.vertex(x + width, y + (aurora ? 0.8 : 0), z, color, aurora ? 0.02 : alpha);
      this.vertex(x, nextY, z + 1.65, color, alpha);
      this.vertex(x + width, y + (aurora ? 0.8 : 0), z, color, aurora ? 0.02 : alpha);
      this.vertex(x + width, nextY + (aurora ? 0.8 : 0), z + 1.65, color, aurora ? 0.02 : alpha);
      this.vertex(x, nextY, z + 1.65, color, alpha);
    }
  }

  update(travel, time) {
    this.cursor = 0;
    const id = this.themeId;
    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i], drift = Math.sin(time * p.speed + p.phase);
      const z = wrap(p.z + 28 + travel * (id === 'seaTrain' ? 0.6 : 0.17), 36) - 28;
      const x = p.x + drift * 0.16;
      if (id === 'ocean') {
        this.bubble(x, wrap(p.y + time * p.speed, 3.8) - 0.2, z, p.size * 1.9, 0.5);
        if (i < 10) {
          const fishX = (i % 2 ? -1 : 1) * (5.0 + Math.sin(time * 0.24 + p.phase) * 0.65), y = 0.6 + p.y * 0.45;
          this.diamond(fishX, y, z - 1, 0.12, this.palette[7], 0.7);
          this.vertex(fishX + 0.08, y, z - 1, this.palette[7], 0.7);
          this.vertex(fishX + 0.24, y + 0.12, z - 1, this.palette[7], 0.7);
          this.vertex(fishX + 0.24, y - 0.12, z - 1, this.palette[7], 0.7);
        }
      } else if (id === 'penguinHotel') {
        this.diamond(x, wrap(p.y - time * p.speed * 0.4, 4), z, p.size, this.palette[3], 0.7);
      } else if (id === 'dinosaurPark') {
        this.diamond(x, p.y * 0.55 + drift * 0.15, z, p.size, this.palette[4], 0.35 + (drift + 1) * 0.25);
        if (i < 12) {
          const leafX = (i % 2 ? -1 : 1) * 4.85;
          const y = 0.65 + p.y * 0.25, tip = leafX + drift * 0.15;
          this.vertex(leafX, y, z, this.palette[4], 0.65);
          this.vertex(tip - 0.3, y + 0.3, z + 0.16, this.palette[4], 0.8);
          this.vertex(tip, y + 0.85, z, this.palette[4], 0.65);
          this.vertex(leafX, y, z, this.palette[4], 0.65);
          this.vertex(tip, y + 0.85, z, this.palette[4], 0.65);
          this.vertex(tip + 0.3, y + 0.3, z - 0.16, this.palette[4], 0.8);
        }
      } else if (id === 'castle') {
        this.diamond(x, p.y * 0.75 + drift * 0.12, z, p.size, this.palette[i % 2], 0.18 + (drift + 1) * 0.25);
      } else if (id === 'skyCity') {
        this.diamond(x, p.y * 0.55 + drift * 0.1, z, p.size * 0.7, this.palette[0], 0.4);
      } else if (i < 24) {
        this.diamond(x, p.y * 0.45, z, p.size * 0.7, this.palette[5], 0.35);
      }
    }
    if (id === 'castle') {
      for (let segment = 0; segment < 9; segment += 1) for (const side of SIDES) {
        const z = wrap(segment * 4 + travel, 36) - 28;
        const y = 1.3 + Math.sin(time * 1.6 + segment) * 0.06;
        this.candle(side * 4.38, y, z + 0.72);
        this.diamond(side * 4.38, y, z + 0.72, 0.3, this.palette[0], 0.08);
        this.diamond(side * 4.38, y, z + 0.72, 0.13 + Math.sin(time * 7 + segment) * 0.018, this.palette[0], 0.85);
        if (segment % 3 !== 2) {
          const color = this.palette[segment % 2 + 1];
          this.vertex(side * 3.9, 0.082, z - 0.65, color, 0.14);
          this.vertex(side * 3.9, 0.082, z + 0.55, color, 0.14);
          this.vertex(side * 0.7, 0.082, z + 1.8, color, 0);
        }
      }
    }
    if (id === 'skyCity') {
      for (let segment = 1; segment < 9; segment += 3) for (const side of SIDES) {
        const z = wrap(segment * 4 + travel, 36) - 28 - 0.3, x = side * 4.8 + Math.sin(time * 1.4 + segment) * 0.12;
        this.vertex(side * 4.8 - 0.012, 1.7, z, this.palette[0], 0.85);
        this.vertex(side * 4.8 + 0.012, 1.7, z, this.palette[0], 0.85);
        this.vertex(x, 1.23, z, this.palette[0], 0.85);
        this.vertex(x - 0.13, 1.19, z, this.palette[0], 0.9);
        this.vertex(x, 1.4, z, this.palette[0], 0.9);
        this.vertex(x + 0.13, 1.19, z, this.palette[0], 0.9);
      }
    }
    if (id === 'penguinHotel' || id === 'seaTrain') for (const side of SIDES) for (let i = 0; i < 3; i += 1) this.ribbon(side, time, i, id === 'penguinHotel');
    if (id === 'ocean') {
      for (let i = 0; i < 12; i += 1) {
        const z = wrap(i * 3 + time * 0.35, 36) - 28, x = Math.sin(i * 2.3 + time * 0.25) * 2.8;
        const color = this.palette[2], alpha = 0.055;
        this.vertex(x - 0.6, 0.075, z, color, alpha); this.vertex(x + 0.4, 0.075, z - 0.3, color, alpha); this.vertex(x + 0.65, 0.075, z + 0.08, color, alpha);
      }
    }
    this.geometry.setDrawRange(0, this.cursor);
    this.positions.needsUpdate = true; this.colors.needsUpdate = true;
  }
}
ThemeAmbient.CAPACITY = CAPACITY;
module.exports = ThemeAmbient;

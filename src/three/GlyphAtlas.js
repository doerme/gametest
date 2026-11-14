'use strict';
const THREE = require('three');

// One page fits the WebGL 1 minimum texture limit. A glyph keeps the material
// of its own page, so extending the cache cannot invalidate existing UVs.
const PAGE_SIZE = 1024;
const CELL_SIZE = 100;
const COLUMNS = 10;
const PAGE_CAPACITY = 100;

class GlyphAtlas {
  constructor(platform, drawGlyph, createMaterial, decodeCanvasSRGB = false) {
    this.platform = platform;
    this.drawGlyph = drawGlyph;
    this.createMaterial = createMaterial;
    this.decodeCanvasSRGB = decodeCanvasSRGB;
    this.pages = [];
    this.glyphs = new Map();
  }

  get(key) {
    if (this.glyphs.has(key)) return this.glyphs.get(key);
    let page = this.pages[this.pages.length - 1];
    if (!page || page.used === PAGE_CAPACITY) {
      const canvas = this.platform.createOffscreenCanvas();
      canvas.width = PAGE_SIZE; canvas.height = PAGE_SIZE;
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = this.decodeCanvasSRGB ? THREE.NoColorSpace : THREE.SRGBColorSpace;
      texture.generateMipmaps = false; texture.minFilter = THREE.LinearFilter;
      page = { canvas, ctx: canvas.getContext('2d'), texture, material: this.createMaterial(texture), used: 0 };
      this.pages.push(page);
    }
    const index = page.used++;
    const x = index % COLUMNS * CELL_SIZE;
    const y = Math.floor(index / COLUMNS) * CELL_SIZE;
    this.drawGlyph(page.ctx, key, x, y);
    page.texture.needsUpdate = true;
    const geometry = new THREE.PlaneGeometry(1, 1);
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i += 1) {
      uv.setXY(i, (x + uv.getX(i) * CELL_SIZE) / PAGE_SIZE, 1 - (y + (1 - uv.getY(i)) * CELL_SIZE) / PAGE_SIZE);
    }
    const glyph = { geometry, material: page.material };
    this.glyphs.set(key, glyph);
    return glyph;
  }

  clear() {
    this.glyphs.forEach((glyph) => glyph.geometry.dispose());
    this.pages.forEach((page) => { page.material.dispose(); page.texture.dispose(); });
    this.glyphs.clear(); this.pages = [];
  }
}

module.exports = GlyphAtlas;

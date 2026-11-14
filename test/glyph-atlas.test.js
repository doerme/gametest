'use strict';
const assert = require('assert');
const THREE = require('three');
const GlyphAtlas = require('../src/three/GlyphAtlas');

let drawn = 0; let disposedGeometries = 0; let disposedMaterials = 0; let disposedTextures = 0;
const platform = { createOffscreenCanvas: () => ({ getContext: () => ({}) }) };
const atlas = new GlyphAtlas(platform, () => { drawn += 1; }, (texture) => new THREE.MeshBasicMaterial({ map: texture }));
const first = atlas.get('first'); assert.strictEqual(atlas.get('first'), first);
for (let i = 0; i < 204; i += 1) atlas.get('progress:' + i);
assert.strictEqual(atlas.pages.length, 3);
assert.strictEqual(drawn, 205);
assert.notStrictEqual(atlas.get('progress:150').material, first.material);
atlas.glyphs.forEach((glyph) => {
  assert.ok([...glyph.geometry.attributes.uv.array].every((value) => value >= 0 && value <= 1));
  glyph.geometry.addEventListener('dispose', () => { disposedGeometries += 1; });
});
atlas.pages.forEach((page) => {
  assert.strictEqual(page.canvas.width, 1024); assert.strictEqual(page.canvas.height, 1024);
  page.material.addEventListener('dispose', () => { disposedMaterials += 1; });
  page.texture.addEventListener('dispose', () => { disposedTextures += 1; });
});
atlas.clear();
assert.strictEqual(disposedGeometries, 205); assert.strictEqual(disposedMaterials, 3); assert.strictEqual(disposedTextures, 3);
assert.strictEqual(atlas.glyphs.size, 0); assert.strictEqual(atlas.pages.length, 0);
assert.notStrictEqual(atlas.get('first').geometry, first.geometry);
atlas.clear();
console.log('glyph-atlas.test.js passed');

'use strict';

const assert = require('assert');
const AssetManager = require('../src/assets/AssetManager');

function makeWxImageApi() {
  return {
    createImage() {
      const image = {};
      Object.defineProperty(image, 'src', {
        set() {
          image.onload();
        }
      });
      return image;
    }
  };
}

const manager = new AssetManager(makeWxImageApi());
manager.loadImage('catWalk', 'assets/images/cat-walk-sheet.png');
manager.loadImage('castleCorridorLoop', 'assets/images/castle-corridor-loop.jpg');

assert.ok(manager.getImage('catWalk'));
assert.ok(manager.getImage('castleCorridorLoop'));
assert.strictEqual(manager.getImage('missing'), null);

const fallback = new AssetManager(null);
fallback.loadImage('catWalk', 'missing.png');
assert.strictEqual(fallback.getImage('catWalk'), null);

console.log('asset-manager.test.js passed');

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
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
manager.loadImage('oceanSpaceshipCorridorLoop', 'assets/images/ocean-spaceship-corridor-loop.jpg');
manager.loadImage('enemyJellyfish', 'assets/images/enemy-jellyfish.png');
manager.loadImage('enemyPufferfish', 'assets/images/enemy-pufferfish.png');
manager.loadImage('enemyShark', 'assets/images/enemy-shark.png');
manager.loadImage('bossMegalodon', 'assets/images/boss-megalodon.png');
manager.loadImage('penguinHotelCorridorLoop', 'assets/images/penguin-hotel-corridor-loop.jpg');
manager.loadImage('enemyPenguinBellhop', 'assets/images/enemy-penguin-bellhop.png');
manager.loadImage('enemyPenguinChef', 'assets/images/enemy-penguin-chef.png');
manager.loadImage('bossEmperorPenguin', 'assets/images/boss-emperor-penguin.png');
manager.loadImage('dinosaurParkCorridorLoop', 'assets/images/dinosaur-park-corridor-loop.jpg');
manager.loadImage('enemyPterosaur', 'assets/images/enemy-pterosaur.png');
manager.loadImage('enemyTriceratops', 'assets/images/enemy-triceratops.png');
manager.loadImage('enemyBrachiosaurus', 'assets/images/enemy-brachiosaurus.png');
manager.loadImage('bossTyrannosaurus', 'assets/images/boss-tyrannosaurus.png');

assert.ok(manager.getImage('catWalk'));
assert.ok(manager.getImage('castleCorridorLoop'));
assert.ok(manager.getImage('oceanSpaceshipCorridorLoop'));
assert.ok(manager.getImage('enemyJellyfish'));
assert.ok(manager.getImage('enemyPufferfish'));
assert.ok(manager.getImage('enemyShark'));
assert.ok(manager.getImage('bossMegalodon'));
assert.ok(manager.getImage('penguinHotelCorridorLoop'));
assert.ok(manager.getImage('enemyPenguinBellhop'));
assert.ok(manager.getImage('enemyPenguinChef'));
assert.ok(manager.getImage('bossEmperorPenguin'));
assert.ok(manager.getImage('dinosaurParkCorridorLoop'));
assert.ok(manager.getImage('enemyPterosaur'));
assert.ok(manager.getImage('enemyTriceratops'));
assert.ok(manager.getImage('enemyBrachiosaurus'));
assert.ok(manager.getImage('bossTyrannosaurus'));
assert.strictEqual(manager.getImage('missing'), null);

[
  'dinosaur-park-corridor-loop.jpg',
  'enemy-pterosaur.png',
  'enemy-triceratops.png',
  'enemy-brachiosaurus.png',
  'boss-tyrannosaurus.png'
].forEach((filename) => {
  assert.strictEqual(fs.existsSync(path.join(__dirname, '..', 'assets', 'images', filename)), true);
});

const fallback = new AssetManager(null);
fallback.loadImage('catWalk', 'missing.png');
assert.strictEqual(fallback.getImage('catWalk'), null);

console.log('asset-manager.test.js passed');

'use strict';

const assert = require('assert');
const { IMAGE_ASSETS, SPRITESHEET_ASSETS, ENEMY_ASSET_KEYS } = require('../src/phaser/assets');
const PhaserInputAdapter = require('../src/phaser/PhaserInputAdapter');
const installWechatPhaserAdapter = require('../src/platform/wechatPhaserAdapter');

const imageKeys = IMAGE_ASSETS.map((asset) => asset.key);
[
  'symbolUp',
  'symbolDown',
  'symbolLeft',
  'symbolRight',
  'symbolV',
  'symbolL',
  'symbolCircle',
  'symbolZ',
  'symbolM',
  'symbolS',
  'castleCorridorLoop',
  'oceanSpaceshipCorridorLoop',
  'penguinHotelCorridorLoop',
  'dinosaurParkCorridorLoop'
].forEach((key) => assert.ok(imageKeys.includes(key), key + ' should be preloaded'));

const sheets = Object.fromEntries(SPRITESHEET_ASSETS.map((asset) => [asset.key, asset]));
assert.deepStrictEqual([sheets.catWalk.frameWidth, sheets.catWalk.frameHeight], [128, 128]);
assert.deepStrictEqual([sheets.catCast.frameWidth, sheets.catCast.frameHeight], [128, 128]);
assert.deepStrictEqual([sheets.catHurt.frameWidth, sheets.catHurt.frameHeight], [128, 128]);
assert.deepStrictEqual([sheets.enemyJellyfish.frameWidth, sheets.enemyJellyfish.frameHeight], [384, 384]);
assert.deepStrictEqual([sheets.enemyPenguinChef.frameWidth, sheets.enemyPenguinChef.frameHeight], [384, 384]);
assert.deepStrictEqual([sheets.bossMegalodon.frameWidth, sheets.bossMegalodon.frameHeight], [512, 512]);
assert.deepStrictEqual([sheets.bossTyrannosaurus.frameWidth, sheets.bossTyrannosaurus.frameHeight], [512, 512]);
assert.strictEqual(ENEMY_ASSET_KEYS.tyrannosaurus, 'bossTyrannosaurus');

function createScene() {
  const handlers = {};
  return {
    input: {
      on(name, handler) {
        handlers[name] = handler;
      },
      off(name, handler) {
        if (handlers[name] === handler) {
          delete handlers[name];
        }
      }
    },
    handlers
  };
}

const scene = createScene();
const calls = [];
const state = {
  handleTap(point) {
    calls.push({ type: 'tap', point });
  },
  handleGesture(points) {
    calls.push({ type: 'gesture', points });
  }
};
const input = new PhaserInputAdapter(scene, state);
input.bind();
scene.handlers.pointerdown({ x: 10, y: 12 });
scene.handlers.pointerup({ x: 11, y: 13 });
assert.strictEqual(calls[0].type, 'tap');

scene.handlers.pointerdown({ x: 0, y: 0 });
scene.handlers.pointermove({ x: 20, y: 0 });
scene.handlers.pointermove({ x: 40, y: 5 });
scene.handlers.pointerup({ x: 60, y: 5 });
assert.strictEqual(calls[1].type, 'gesture');
assert.strictEqual(calls[1].points.length, 4);
assert.strictEqual(input.isDrawing, false);

input.destroy();
assert.deepStrictEqual(scene.handlers, {});

const callbacks = {};
const bridgeCanvas = {
  width: 375,
  height: 667,
  style: {},
  getContext() {
    return {};
  },
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 375, height: 667 };
  }
};
installWechatPhaserAdapter({
  canvas: bridgeCanvas,
  width: 375,
  height: 667,
  pixelRatio: 1,
  wxApi: {
    createImage() {
      return {};
    },
    onTouchStart(handler) {
      callbacks.touchstart = handler;
    },
    onTouchMove(handler) {
      callbacks.touchmove = handler;
    },
    onTouchEnd(handler) {
      callbacks.touchend = handler;
    },
    onTouchCancel(handler) {
      callbacks.touchcancel = handler;
    }
  }
});
let bridgedTouch = null;
bridgeCanvas.addEventListener('touchstart', (event) => {
  bridgedTouch = event.changedTouches[0];
});
callbacks.touchstart({
  touches: [{ clientX: 31, clientY: 42, identifier: 7 }],
  changedTouches: [{ clientX: 31, clientY: 42, identifier: 7 }]
});
assert.deepStrictEqual(bridgedTouch, {
  identifier: 7,
  clientX: 31,
  clientY: 42,
  pageX: 31,
  pageY: 42,
  screenX: 31,
  screenY: 42
});

console.log('phaser-assets.test.js passed');

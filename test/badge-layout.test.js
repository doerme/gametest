'use strict';

const assert = require('assert');
const BadgeLayout = require('../src/ui/BadgeLayout');
const { getSpeedControl } = require('../src/ui/SpeedControl');
const { getAudioToggleBounds } = require('../src/ui/AudioToggle');
const { getHanziLayout } = require('../src/ui/HanziLayout');

const movement = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function rect(position, item) { return { x: position.x - item.width / 2, y: position.y - item.height / 2, width: item.width, height: item.height }; }
function intersects(a, b) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; }

for (const [width, height] of [[390, 844], [375, 667], [320, 568]]) {
  const speed = getSpeedControl(width).bounds; const audio = getAudioToggleBounds(width);
  const bounds = { left: 6, right: width - 6, top: Math.max(speed.y + speed.height, audio.y + audio.height) + 8, bottom: getHanziLayout(width, height).panel.y - 10 };
  const layout = new BadgeLayout();
  let previous;
  for (let frame = 0; frame < 440; frame += 1) {
    const item = { key: 'head', x: width * 0.6, y: 120 + frame * 0.25, width: 98, height: 50 };
    const point = layout.update([item], bounds, [audio, speed]).get(item.key);
    assert.ok(![audio, speed].some((r) => intersects(rect(point, item), r)));
    if (previous) assert.ok(movement(previous, point) <= 0.251, 'sliding along the control strip cannot jump by a badge height');
    previous = point;
  }

  layout.clear(); previous = null;
  for (let frame = 0; frame < 240; frame += 1) {
    const phase = Math.sin(frame * 0.4) * 0.2;
    const a = { key: 'a', x: width * 0.4, y: 181 + phase, width: 98, height: 50 };
    const b = { key: 'b', x: width * 0.4 + 1, y: 181 - phase, width: 98, height: 50 };
    const positions = layout.update(frame % 2 ? [b, a] : [a, b], bounds, []);
    assert.ok(!intersects(rect(positions.get('a'), a), rect(positions.get('b'), b)), 'neighboring Hanzi badges stay separate');
    if (previous) {
      for (const key of ['a', 'b']) assert.ok(movement(previous.get(key), positions.get(key)) < 1, 'head order changes cannot swap badge rows');
    }
    previous = positions;
  }
  layout.update([], bounds, []);
  assert.strictEqual(layout.entries.size, 0, 'departed enemies release their layout history');
}

const bounds = { left: 6, right: 314, top: 136, bottom: 419 };
const feedback = { x: 18, y: 170, width: 284, height: 74 };
const item = { key: 'retry', x: 160, y: 210, width: 70, height: 32 };
const layout = new BadgeLayout();
const displaced = layout.update([item], bounds, [feedback]).get(item.key);
assert.ok(!intersects(rect(displaced, item), feedback));
for (let frame = 0; frame < 6; frame += 1) assert.deepStrictEqual(layout.update([item], bounds, []).get(item.key), displaced, 'briefly disappearing feedback does not bounce the badge back');
assert.deepStrictEqual(layout.update([item], bounds, [feedback]).get(item.key), displaced);
let previous = displaced;
for (let frame = 0; frame < 90; frame += 1) {
  const point = layout.update([item], bounds, []).get(item.key);
  assert.ok(movement(previous, point) < 6, 'return from avoidance is gradual'); previous = point;
}
assert.ok(movement(previous, item) < 0.1, 'cleared obstacles eventually restore the head position');
assert.deepStrictEqual(layout.update([item], bounds, [], 0).get(item.key), previous, 'paused redraws do not advance layout easing');
layout.clear(); assert.strictEqual(layout.entries.size, 0);

const inventory = [{ x: 14, y: 250, width: 56, height: 56 }, { x: 14, y: 316, width: 56, height: 56 }];
const crowd = Array.from({ length: 7 }, (_, i) => ({ key: i, x: 155 + i * 2, y: 278 + i * 3, width: 70, height: 32 }));
const packed = layout.update(crowd, bounds, [feedback, ...inventory]);
for (const enemy of crowd) {
  const box = rect(packed.get(enemy.key), enemy);
  assert.ok(![feedback, ...inventory].some((r) => intersects(box, r)), 'crowded classic badges avoid feedback and item buttons');
  for (const other of crowd) if (other.key < enemy.key) assert.ok(!intersects(box, rect(packed.get(other.key), other)), 'seven crowded classic badges can remain separate');
}
console.log('badge-layout.test.js passed');

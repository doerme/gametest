'use strict';
const assert = require('assert');
const { CHARACTERS, getCharacter, getStrokeMedian } = require('../src/hanzi/Characters');
const { recognizeStroke } = require('../src/input/HanziStrokeRecognizer');
const { drawCharacter } = require('../src/hanzi/CanvasCharacter');

assert.strictEqual(CHARACTERS.length, 100);
assert.strictEqual(new Set(CHARACTERS).size, 100);
assert.ok(CHARACTERS.includes('羊') && CHARACTERS.includes('爸') && CHARACTERS.includes('是'));
const board = { x: 72, y: 320, width: 176, height: 176 };
const pixels = (points) => points.map((p) => ({ x: board.x + p.x * board.width, y: board.y + p.y * board.height }));
let strokeCount = 0;
for (const character of CHARACTERS) {
  const entry = getCharacter(character);
  assert.ok(entry.strokes.length > 0);
  assert.strictEqual(entry.strokes.length, entry.medians.length);
  for (let index = 0; index < entry.medians.length; index += 1) {
    const median = getStrokeMedian(character, index);
    assert.ok(median.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)));
    const trace = pixels(median);
    assert.ok(recognizeStroke(trace, median, board).accepted, character + ':' + index);
    assert.ok(!recognizeStroke(trace.slice().reverse(), median, board).accepted, 'reverse ' + character + ':' + index);
    const jitter = trace.map((p, i) => ({ x: p.x + Math.sin(i * 2) * 2.5, y: p.y + Math.cos(i * 2) * 2.5 }));
    assert.ok(recognizeStroke(jitter, median, board).accepted, 'child-sized jitter ' + character + ':' + index);
    strokeCount += 1;
  }
  // The shipping renderer can draw every glyph with only native Canvas methods.
  let fills = 0;
  const context = { save() {}, restore() {}, translate() {}, scale(x, y) { assert.ok(x > 0 && y < 0); }, beginPath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, bezierCurveTo() {}, closePath() {}, fill() { fills += 1; } };
  drawCharacter(context, character, 0, 0, 100, '#000');
  assert.strictEqual(fills, entry.strokes.length);
}

// Handwritten horizontal line, rather than a replay of the reference median.
assert.ok(recognizeStroke(pixels([{ x: 0.12, y: 0.50 }, { x: 0.35, y: 0.49 }, { x: 0.63, y: 0.48 }, { x: 0.90, y: 0.48 }]), getStrokeMedian('一', 0), board).accepted);
assert.ok(recognizeStroke([{ x: 80, y: 330 }], getStrokeMedian('一', 0), board).ignored);
assert.ok(recognizeStroke([{ x: 80, y: 330 }, { x: 81, y: 331 }], getStrokeMedian('一', 0), board).ignored);
assert.ok(recognizeStroke([{ x: NaN, y: 2 }], getStrokeMedian('一', 0), board).ignored);
assert.ok(!recognizeStroke(pixels(getStrokeMedian('木', 1)), getStrokeMedian('木', 0), board).accepted, 'next stroke cannot skip the horizontal');
assert.ok(!recognizeStroke(pixels(getStrokeMedian('二', 1)), getStrokeMedian('二', 0), board).accepted, 'position distinguishes two horizontal strokes');
assert.ok(!recognizeStroke(pixels(getStrokeMedian('了', 0)).filter((_p, i, a) => i === 0 || i === a.length - 1), getStrokeMedian('了', 0), board).accepted, 'a straight line cannot replace a bend');
assert.ok(!recognizeStroke(pixels(getStrokeMedian('小', 0)).filter((_p, i, a) => i === 0 || i === a.length - 1), getStrokeMedian('小', 0), board).accepted, 'a straight line cannot replace a hook');
assert.ok(!recognizeStroke(pixels([...getStrokeMedian('二', 0), ...getStrokeMedian('二', 1)]), getStrokeMedian('二', 0), board).accepted, 'two strokes joined without lifting are rejected');
assert.ok(!recognizeStroke(pixels([{ x: -0.2, y: 0.5 }, { x: 0.9, y: 0.5 }]), getStrokeMedian('一', 0), board).accepted);
const scribble = Array.from({ length: 30 }, (_, i) => ({ x: board.x + (i % 2 ? 150 : 20), y: board.y + 20 + i * 4 }));
assert.ok(!recognizeStroke(scribble, getStrokeMedian('一', 0), board).accepted);
console.log('hanzi-stroke.test.js passed (' + strokeCount + ' strokes, 100 glyphs)');

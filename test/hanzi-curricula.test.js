'use strict';
const assert = require('assert');
const crypto = require('crypto');
const { CURRICULA, DEFAULT_CURRICULUM_ID, getCurriculum } = require('../src/hanzi/Curricula');
const { ALL_CHARACTERS, getCharacter, getStrokeCount, getStrokeMedian, getLevelCharacters, createCharacterSequence } = require('../src/hanzi/Characters');
const { recognizeStroke } = require('../src/input/HanziStrokeRecognizer');
const { drawCharacter } = require('../src/hanzi/CanvasCharacter');
const { GameState, SCREENS } = require('../src/core/GameState');
const { getCurriculumSelectionLayout, findCurriculumAction } = require('../src/ui/CurriculumSelector');
const { createCurriculumPreference, CURRICULUM_KEY } = require('../src/ui/CurriculumPreference');
const center = (r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });

assert.strictEqual(CURRICULA.length, 12);
assert.strictEqual(new Set(CURRICULA.map((entry) => entry.id)).size, 12);
assert.strictEqual(getCurriculum('missing'), null);
assert.strictEqual(getCurriculum().id, DEFAULT_CURRICULUM_ID);
for (let grade = 1; grade <= 6; grade += 1) for (let semester = 1; semester <= 2; semester += 1) {
  assert.ok(getCurriculum('g' + grade + '-s' + semester));
}

for (const curriculum of CURRICULA) {
  const characters = Array.from(curriculum.characters);
  assert.strictEqual(characters.length, curriculum.characterCount);
  assert.strictEqual(new Set(characters).size, characters.length);
  assert.strictEqual(crypto.createHash('sha256').update(curriculum.characters).digest('hex'), curriculum.charactersSha256);
  assert.ok(curriculum.edition && curriculum.source);
  const groups = getLevelCharacters(curriculum.id);
  assert.strictEqual(groups.length, 6);
  assert.deepStrictEqual(groups.flat().slice().sort(), characters.slice().sort());
  let previous = 0;
  groups.forEach((pool, index) => {
    assert.ok(Math.min(...pool.map(getStrokeCount)) >= previous);
    previous = Math.max(...pool.map(getStrokeCount));
    let calls = 0;
    const sequence = createCharacterSequence(index + 1, 22, () => calls++ === 0 ? 0 : 0.999999, curriculum.id);
    assert.strictEqual(sequence.length, 22);
    assert.ok(sequence.every((character) => pool.includes(character)));
    assert.strictEqual(new Set(sequence).size, Math.min(pool.length, 22));
    if (pool.length > 22) assert.ok(sequence.includes(pool[pool.length - 1]), 'the tail of a large group can be selected');
    else assert.deepStrictEqual(sequence.slice(0, pool.length), pool, 'small groups appear in order before review');
  });
  const state = new GameState(375, 667, null);
  state.start('plus-one', 'hanzi', curriculum.id);
  for (let level = 1; level <= 6; level += 1) {
    assert.strictEqual(state.level, level);
    assert.strictEqual(state.hanziCurriculumId, curriculum.id);
    assert.strictEqual(state.director.curriculumId, curriculum.id);
    assert.strictEqual(state.timeScale, 1.5);
    assert.ok(state.director.config.timeline.every((spawn) => characters.includes(spawn.character)));
    state.enemies = []; state.director.index = state.director.total; state.update(0);
    if (level < 6) { assert.strictEqual(state.screen, SCREENS.LEVEL_TRANSITION); state.startNextLevel(); }
    else assert.strictEqual(state.screen, SCREENS.WIN);
  }
  state.handleTap({ x: 180, y: 400 }); state.openCurriculumSelection();
  assert.strictEqual(state.selectedCurriculumId, curriculum.id);
  state.start('normal', 'symbol');
  assert.ok(state.director.config.timeline.every((spawn) => !spawn.character));
  state.start(); assert.strictEqual(state.hanziCurriculumId, DEFAULT_CURRICULUM_ID);
}

// Every shipped glyph can render and every reference stroke can be completed.
const board = { x: 0, y: 0, width: 176, height: 176 };
let strokes = 0;
for (const character of ALL_CHARACTERS) {
  const entry = getCharacter(character);
  assert.ok(entry && entry.strokes.length > 0 && entry.strokes.length === entry.medians.length);
  let fills = 0;
  const context = { save() {}, restore() {}, translate() {}, scale() {}, beginPath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, bezierCurveTo() {}, closePath() {}, fill() { fills += 1; } };
  drawCharacter(context, character, 0, 0, 100, '#000');
  assert.strictEqual(fills, entry.strokes.length);
  entry.medians.forEach((_median, index) => {
    const median = getStrokeMedian(character, index);
    assert.ok(median.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)));
    const trace = median.map((p) => ({ x: p.x * board.width, y: p.y * board.height }));
    assert.ok(recognizeStroke(trace, median, board).accepted, character + ':' + index);
    assert.ok(!recognizeStroke(trace.slice().reverse(), median, board).accepted, 'reverse ' + character + ':' + index);
    strokes += 1;
  });
}

for (const native of [false, true]) {
  const store = new Map();
  const storage = native ? { getStorageSync: (key) => store.get(key), setStorageSync: (key, value) => store.set(key, value) }
    : { getItem: (key) => store.get(key), setItem: (key, value) => store.set(key, value) };
  const preference = () => createCurriculumPreference(native ? storage : null, native ? undefined : storage);
  assert.strictEqual(preference().id, DEFAULT_CURRICULUM_ID);
  const first = preference(); assert.ok(first.save('g6-s2'));
  assert.strictEqual(preference().id, 'g6-s2');
  assert.strictEqual(first.save('unknown'), false); assert.strictEqual(first.save(undefined), false);
  store.set(CURRICULUM_KEY, 'invalid'); assert.strictEqual(preference().id, DEFAULT_CURRICULUM_ID);
}
const fail = () => { throw new Error('storage unavailable'); };
for (const wxApi of [null, {}, { getStorageSync: fail, setStorageSync: fail }]) {
  const pref = createCurriculumPreference(wxApi, { getItem: fail, setItem: fail });
  pref.save('g4-s2'); assert.strictEqual(pref.id, 'g4-s2');
  const state = new GameState(375, 667, null, undefined, { curriculumPreference: pref });
  state.openCurriculumSelection(); assert.strictEqual(state.selectedCurriculumId, 'g4-s2');
}

for (const [width, height] of [[320, 568], [375, 667], [390, 844]]) {
  const layout = getCurriculumSelectionLayout(width, height);
  assert.ok(layout.panel.y > 110 && layout.panel.y + layout.panel.height < height);
  for (const rect of [...layout.grades, ...layout.semesters, layout.start, layout.back]) {
    assert.ok(rect.x > 0 && rect.x + rect.width < width && rect.y + rect.height < height);
  }
  assert.strictEqual(findCurriculumAction(width, height, { x: 0, y: 0 }), null);
  const state = new GameState(width, height, null); state.openCurriculumSelection();
  state.handleTap(center(layout.grades[5])); state.handleTap(center(layout.semesters[1]));
  assert.strictEqual(state.selectedCurriculumId, 'g6-s2');
  state.handleTap(center(layout.back)); assert.strictEqual(state.screen, SCREENS.TITLE);
  state.openCurriculumSelection(); assert.strictEqual(state.selectedCurriculumId, DEFAULT_CURRICULUM_ID, 'cancel does not save the pending selection');
  state.handleTap(center(layout.grades[5])); state.handleTap(center(layout.semesters[1])); state.handleTap(center(layout.start));
  assert.strictEqual(state.screen, SCREENS.PLAYING); assert.strictEqual(state.hanziCurriculumId, 'g6-s2');
}
console.log('hanzi-curricula.test.js passed (' + CURRICULA.length + ' books, ' + ALL_CHARACTERS.length + ' glyphs, ' + strokes + ' strokes)');

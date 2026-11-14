'use strict';
const assert = require('assert');
const path = require('path');
const vm = require('vm');
const esbuild = require('esbuild');
const curricula = require('../src/hanzi/curriculum.json');
const data = require('../src/hanzi/data.json');

// Exercise the shipping main-package branch, which cannot see the full JSON.
const bundle = esbuild.buildSync({ stdin: { contents: `module.exports = {
  ...require('./src/core/GameState'), ...require('./src/hanzi/Characters'),
  ...require('./src/hanzi/CurriculumLoader'), ...require('./src/ui/CurriculumPreference')
};`, resolveDir: path.resolve(__dirname, '..') }, bundle: true, platform: 'node', write: false,
  define: { __SPELL_WECHAT__: 'true' } }).outputFiles[0].text;

async function main() {
  const context = { module: { exports: {} }, console }; vm.runInNewContext(bundle, context);
  const api = context.module.exports;
  const callbacks = [];
  const wxApi = { loadSubpackage: (options) => callbacks.push(options) };
  const load = api.createCurriculumLoader(wxApi);
  const pref = api.createCurriculumPreference(null, null);
  const make = () => new api.GameState(375, 667, null, undefined, { loadHanziCurriculum: load, curriculumPreference: pref });
  const register = (grade) => {
    const characters = [...new Set(curricula.filter((entry) => entry.grade === grade).flatMap((entry) => Array.from(entry.characters)))];
    context.__spellHanziRegister(Object.fromEntries(characters.map((c) => [c, data[c]])));
  };
  assert.ok(api.isCurriculumLoaded('g1-s1')); assert.ok(!api.isCurriculumLoaded('g6-s2'));
  await load('g1-s1'); assert.strictEqual(callbacks.length, 0);
  await assert.rejects(load('missing'));

  const failed = make(); failed.openCurriculumSelection(); failed.selectedCurriculumId = 'g5-s2';
  const attempt = failed.startSelectedCurriculum(); await Promise.resolve();
  assert.ok(failed.curriculumLoading); assert.strictEqual(failed.startSelectedCurriculum(), false);
  callbacks[0].fail(new Error('offline')); assert.strictEqual(await attempt, false);
  assert.strictEqual(failed.screen, 'hanzi-selection'); assert.ok(failed.curriculumLoadError);
  assert.strictEqual(pref.id, 'g1-s1');
  const retry = failed.startSelectedCurriculum(); await Promise.resolve();
  assert.strictEqual(callbacks.length, 2); register(5); callbacks[1].success();
  assert.strictEqual(await retry, true); assert.strictEqual(failed.screen, 'playing');
  assert.strictEqual(failed.hanziCurriculumId, 'g5-s2'); assert.strictEqual(pref.id, 'g5-s2');

  const canceled = make(); canceled.openCurriculumSelection(); canceled.selectedCurriculumId = 'g6-s1';
  const late = canceled.startSelectedCurriculum(); await Promise.resolve();
  canceled.cancelCurriculumLoad(); canceled.screen = 'title'; register(6); callbacks[2].success();
  assert.strictEqual(await late, false); assert.strictEqual(canceled.screen, 'title');
  assert.strictEqual(pref.id, 'g5-s2', 'canceled loads cannot overwrite the saved book');

  const changed = make(); changed.openCurriculumSelection(); changed.selectedCurriculumId = 'g4-s1';
  const old = changed.startSelectedCurriculum(); await Promise.resolve();
  changed.cancelCurriculumLoad(); changed.selectedCurriculumId = 'g3-s2';
  register(4); callbacks[3].success(); assert.strictEqual(await old, false);
  assert.strictEqual(changed.screen, 'hanzi-selection'); assert.strictEqual(changed.selectedCurriculumId, 'g3-s2');

  const one = load('g2-s1'); const two = load('g2-s2');
  assert.strictEqual(callbacks.length, 5, 'both semesters share one grade request');
  register(2); callbacks[4].success(); await Promise.all([one, two]);
  assert.ok(api.isCurriculumLoaded('g2-s1') && api.isCurriculumLoaded('g2-s2'));

  const missing = load('g1-s2'); callbacks[5].success(); await assert.rejects(missing, /不完整/);
  const fixed = load('g1-s2'); register(1); callbacks[6].success(); await fixed;
  failed.start(); assert.strictEqual(failed.hanziCurriculumId, 'g1-s1', 'legacy direct starts still use the default book');
  console.log('hanzi-loading.test.js passed');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

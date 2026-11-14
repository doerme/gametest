'use strict';
/*! Hanzi stroke data: hanzi-writer-data@2.0.1 / Make Me a Hanzi.
 * Copyright (C) 1999 Arphic Technology Co., Ltd. Arphic Public License.
 * The complete license is distributed in ARPHICPL.TXT. */

const { CURRICULA, DEFAULT_CURRICULUM_ID, getCurriculum } = require('./Curricula');
// The WeChat main package contains only the default book. Grade subpackages
// register their additional glyphs before a selected run is started.
const data = typeof __SPELL_WECHAT__ !== 'undefined' && __SPELL_WECHAT__
  ? require('./default-data.json') : require('./data.json');
const CHARACTERS = Array.from(getCurriculum().characters);
const ALL_CHARACTERS = [...new Set(CURRICULA.flatMap((entry) => Array.from(entry.characters)))];
const groups = new Map();

function isCurriculumLoaded(id) {
  const curriculum = getCurriculum(id);
  return !!curriculum && Array.from(curriculum.characters).every((character) => !!data[character]);
}

function registerCharacterData(entries) {
  for (const [character, entry] of Object.entries(entries)) {
    if (!entry || !Array.isArray(entry.strokes) || !entry.strokes.length
      || !Array.isArray(entry.medians) || entry.medians.length !== entry.strokes.length
      || entry.medians.some((median) => !Array.isArray(median) || median.length < 2)) {
      throw new Error('汉字笔画数据不完整：' + character);
    }
  }
  Object.assign(data, entries);
}

function getLevelCharacters(curriculumId = DEFAULT_CURRICULUM_ID) {
  if (!isCurriculumLoaded(curriculumId)) throw new Error('字库尚未加载：' + curriculumId);
  if (!groups.has(curriculumId)) {
    const sorted = Array.from(getCurriculum(curriculumId).characters)
      .sort((a, b) => getStrokeCount(a) - getStrokeCount(b));
    groups.set(curriculumId, Object.freeze(Array.from({ length: 6 }, (_, i) =>
      Object.freeze(sorted.slice(Math.floor(i * sorted.length / 6), Math.floor((i + 1) * sorted.length / 6))))));
  }
  return groups.get(curriculumId);
}
const LEVEL_CHARACTERS = getLevelCharacters();

function getCharacter(character) { return data[character] || null; }
function getStrokeCount(character) {
  const entry = getCharacter(character);
  if (!entry) throw new Error('缺少汉字笔画数据：' + character);
  return entry.strokes.length;
}
function getStrokeMedian(character, index) {
  const entry = getCharacter(character);
  // Original coordinates increase upwards, from -124 to 900.
  return entry && entry.medians[index] ? entry.medians[index].map(([x, y]) => ({ x: x / 1024, y: (900 - y) / 1024 })) : [];
}

function shuffled(pool, random) {
  const result = pool.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function createCharacterSequence(level, count, random = Math.random, curriculumId = DEFAULT_CURRICULUM_ID) {
  const pool = getLevelCharacters(curriculumId)[Math.max(0, Math.min(5, (level || 1) - 1))];
  // Larger books must not permanently hide the tail behind the 22-spawn limit.
  const sequence = pool.length > count ? shuffled(pool, random) : pool.slice();
  while (sequence.length < count) {
    sequence.push(...shuffled(pool, random));
  }
  return sequence.slice(0, count);
}

module.exports = { CHARACTERS, ALL_CHARACTERS, LEVEL_CHARACTERS, getLevelCharacters, getCharacter,
  getStrokeCount, getStrokeMedian, createCharacterSequence, isCurriculumLoaded, registerCharacterData };

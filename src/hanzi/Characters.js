'use strict';
/*! Hanzi stroke data: hanzi-writer-data@2.0.1 / Make Me a Hanzi.
 * Copyright (C) 1999 Arphic Technology Co., Ltd. Arphic Public License.
 * The complete license is distributed in ARPHICPL.TXT. */

const data = require('./data.json');
const curriculum = require('./curriculum.json');

const CHARACTERS = Array.from(curriculum.characters);
const sorted = CHARACTERS.slice().sort((a, b) => data[a].strokes.length - data[b].strokes.length);
const LEVEL_CHARACTERS = Array.from({ length: 6 }, (_, i) => sorted.slice(Math.floor(i * 100 / 6), Math.floor((i + 1) * 100 / 6)));

function getCharacter(character) { return data[character] || null; }
function getStrokeCount(character) { return data[character].strokes.length; }
function getStrokeMedian(character, index) {
  const entry = getCharacter(character);
  // Original coordinates increase upwards, from -124 to 900.
  return entry && entry.medians[index] ? entry.medians[index].map(([x, y]) => ({ x: x / 1024, y: (900 - y) / 1024 })) : [];
}

function createCharacterSequence(level, count, random = Math.random) {
  const pool = LEVEL_CHARACTERS[Math.max(0, Math.min(5, level - 1))];
  const sequence = pool.slice(); // Every character appears before any review.
  while (sequence.length < count) {
    const review = pool.slice();
    for (let i = review.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [review[i], review[j]] = [review[j], review[i]];
    }
    sequence.push(...review);
  }
  return sequence.slice(0, count);
}

module.exports = { CHARACTERS, LEVEL_CHARACTERS, getCharacter, getStrokeCount, getStrokeMedian, createCharacterSequence };

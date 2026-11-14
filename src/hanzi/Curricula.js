'use strict';

const CURRICULA = require('./curriculum.json').map((entry) => Object.freeze(entry));
const DEFAULT_CURRICULUM_ID = 'g1-s1';
const byId = new Map(CURRICULA.map((entry) => [entry.id, entry]));

function getCurriculum(id = DEFAULT_CURRICULUM_ID) { return byId.get(id) || null; }

module.exports = { CURRICULA: Object.freeze(CURRICULA), DEFAULT_CURRICULUM_ID, getCurriculum };

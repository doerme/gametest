'use strict';
const { getCurriculum } = require('./Curricula');
const { isCurriculumLoaded, registerCharacterData } = require('./Characters');

function createCurriculumLoader(wxApi) {
  const pending = new Map();
  if (wxApi) {
    const registry = typeof GameGlobal !== 'undefined' ? GameGlobal : globalThis;
    registry.__spellHanziRegister = registerCharacterData;
  }
  return function loadCurriculum(id) {
    const curriculum = getCurriculum(id);
    if (!curriculum) return Promise.reject(new Error('未知字库'));
    if (isCurriculumLoaded(id)) return Promise.resolve();
    if (!wxApi || !wxApi.loadSubpackage) return Promise.reject(new Error('暂时无法加载字库，请重试'));
    const grade = curriculum.grade;
    if (!pending.has(grade)) {
      const task = new Promise((resolve, reject) => {
        wxApi.loadSubpackage({ name: 'hanzi-grade-' + grade, success: resolve, fail: reject });
      }).then(() => {
        if (!isCurriculumLoaded(id)) throw new Error('字库数据不完整，请重试');
      }).finally(() => pending.delete(grade));
      pending.set(grade, task);
    }
    return pending.get(grade);
  };
}

module.exports = { createCurriculumLoader };

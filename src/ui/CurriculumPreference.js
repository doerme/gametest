'use strict';
const { DEFAULT_CURRICULUM_ID, getCurriculum } = require('../hanzi/Curricula');
const CURRICULUM_KEY = 'spell-academy.hanzi-curriculum.v1';

function createCurriculumPreference(wxApi, browserStorage) {
  let id = DEFAULT_CURRICULUM_ID;
  let storage = browserStorage;
  try {
    if (!wxApi && storage === undefined) storage = globalThis.localStorage;
    const saved = wxApi ? wxApi.getStorageSync && wxApi.getStorageSync(CURRICULUM_KEY)
      : storage && storage.getItem(CURRICULUM_KEY);
    if (typeof saved === 'string' && getCurriculum(saved)) id = saved;
  } catch (_error) { /* Restricted storage keeps the default and session memory. */ }
  return {
    get id() { return id; },
    save(nextId) {
      if (typeof nextId !== 'string' || !getCurriculum(nextId)) return false;
      id = nextId;
      try {
        if (wxApi) { if (wxApi.setStorageSync) wxApi.setStorageSync(CURRICULUM_KEY, id); }
        else if (storage) storage.setItem(CURRICULUM_KEY, id);
      } catch (_error) { /* Remember this launch's selection even without storage. */ }
      return true;
    }
  };
}
module.exports = { CURRICULUM_KEY, createCurriculumPreference };

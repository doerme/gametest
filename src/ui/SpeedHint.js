'use strict';

const SPEED_HINT_KEY = 'spell-academy.speed-hint.v1';
const SPEED_HINT_DURATION = 4;

function createSpeedHintPreference(wxApi, browserStorage) {
  let seen = false;
  let storage = browserStorage;
  try {
    if (wxApi) {
      if (wxApi.getStorageSync) seen = wxApi.getStorageSync(SPEED_HINT_KEY) === true;
    } else {
      if (storage === undefined) storage = globalThis.localStorage;
      seen = !!storage && storage.getItem(SPEED_HINT_KEY) === '1';
    }
  } catch (_error) { /* Private browsing and restricted wx storage still allow a session-only hint. */ }
  return {
    get seen() { return seen; },
    markSeen() {
      seen = true;
      try {
        if (wxApi) {
          if (wxApi.setStorageSync) wxApi.setStorageSync(SPEED_HINT_KEY, true);
        } else if (storage) storage.setItem(SPEED_HINT_KEY, '1');
      } catch (_error) { /* The in-memory flag prevents repeats for this launch. */ }
    }
  };
}

module.exports = { SPEED_HINT_KEY, SPEED_HINT_DURATION, createSpeedHintPreference };

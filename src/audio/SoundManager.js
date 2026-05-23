'use strict';

class SoundManager {
  constructor(wxApi) {
    this.wx = wxApi;
    this.enabled = false;
  }

  play() {
    // Audio hooks are intentionally quiet in the MVP so the game runs without bundled assets.
  }
}

module.exports = SoundManager;

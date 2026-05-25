'use strict';

const { THEME_IDS, THEMES } = require('../levels/Themes');

const BGM_TRACKS = {
  [THEME_IDS.CASTLE]: THEMES[THEME_IDS.CASTLE].music,
  [THEME_IDS.OCEAN]: THEMES[THEME_IDS.OCEAN].music,
  [THEME_IDS.PENGUIN_HOTEL]: THEMES[THEME_IDS.PENGUIN_HOTEL].music,
  [THEME_IDS.DINOSAUR_PARK]: THEMES[THEME_IDS.DINOSAUR_PARK].music
};

const EFFECT_TRACKS = {
  vanish: 'assets/audio/sfx-vanish.wav'
};

class SoundManager {
  constructor(wxApi) {
    this.wx = wxApi;
    this.soundEnabled = true;
    this.currentTrack = null;
    this.music = null;
    this.effect = null;

    if (wxApi && wxApi.createInnerAudioContext) {
      this.music = wxApi.createInnerAudioContext();
      this.music.loop = true;
      this.music.volume = 0.38;
      this.effect = wxApi.createInnerAudioContext();
      this.effect.loop = false;
      this.effect.volume = 0.72;
    }
  }

  play(eventName) {
    const track = EFFECT_TRACKS[eventName];
    if (!track || !this.effect || !this.soundEnabled) {
      return;
    }

    this.effect.stop();
    this.effect.src = track;
    this.effect.play();
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = enabled !== false;
    if (!this.soundEnabled && this.effect) {
      this.effect.stop();
    }
    if (!this.music) {
      return;
    }

    if (!this.soundEnabled) {
      this.music.pause();
    } else if (this.currentTrack) {
      this.music.play();
    }
  }

  playMusic(themeId) {
    const track = BGM_TRACKS[themeId];
    if (!track || !this.music) {
      return;
    }

    const changedTrack = track !== this.currentTrack;
    if (changedTrack) {
      this.currentTrack = track;
      this.music.src = track;
    }

    if (this.soundEnabled && changedTrack) {
      this.music.play();
    }
  }

  stopMusic() {
    if (this.music) {
      this.music.stop();
    }
    this.currentTrack = null;
  }

  vibrateDamage() {
    if (this.wx && this.wx.vibrateShort) {
      this.wx.vibrateShort();
    }
  }
}

SoundManager.BGM_TRACKS = BGM_TRACKS;
SoundManager.EFFECT_TRACKS = EFFECT_TRACKS;

module.exports = SoundManager;

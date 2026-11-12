'use strict';

const { THEME_IDS, THEMES } = require('../levels/Themes');

const BGM_TRACKS = {
  [THEME_IDS.CASTLE]: THEMES[THEME_IDS.CASTLE].music,
  [THEME_IDS.OCEAN]: THEMES[THEME_IDS.OCEAN].music,
  [THEME_IDS.PENGUIN_HOTEL]: THEMES[THEME_IDS.PENGUIN_HOTEL].music,
  [THEME_IDS.DINOSAUR_PARK]: THEMES[THEME_IDS.DINOSAUR_PARK].music,
  [THEME_IDS.SKY_CITY]: THEMES[THEME_IDS.SKY_CITY].music,
  [THEME_IDS.SEA_TRAIN]: THEMES[THEME_IDS.SEA_TRAIN].music
};

const EFFECT_TRACKS = {
  vanish: 'assets/audio/sfx-vanish.wav'
};

function createBrowserAudio() {
  const audio = new Audio();
  audio.stop = () => { audio.pause(); audio.currentTime = 0; };
  const play = audio.play.bind(audio);
  audio.play = () => {
    const result = play();
    if (result && result.catch) result.catch(() => {});
  };
  return audio;
}

class SoundManager {
  constructor(wxApi) {
    this.wx = wxApi;
    this.soundEnabled = true;
    this.currentTrack = null;
    this.music = null;
    this.effect = null;

    const createAudio = wxApi && wxApi.createInnerAudioContext
      ? () => wxApi.createInnerAudioContext()
      : (typeof Audio !== 'undefined' ? createBrowserAudio : null);
    if (createAudio) {
      this.music = createAudio();
      this.music.loop = true;
      this.music.volume = 0.38;
      this.effect = createAudio();
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

  pause() {
    if (this.music && this.music.pause) this.music.pause();
    if (this.effect && this.effect.pause) this.effect.pause();
  }

  resume() { if (this.music && this.currentTrack && this.soundEnabled) this.music.play(); }

  destroy() {
    this.pause();
    [this.music, this.effect].forEach((audio) => { if (audio && audio.destroy) audio.destroy(); });
  }
}

SoundManager.BGM_TRACKS = BGM_TRACKS;
SoundManager.EFFECT_TRACKS = EFFECT_TRACKS;

module.exports = SoundManager;

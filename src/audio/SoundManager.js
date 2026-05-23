'use strict';

const BGM_TRACKS = {
  1: 'assets/audio/bgm-castle.wav',
  2: 'assets/audio/bgm-ocean.wav',
  3: 'assets/audio/bgm-penguin-hotel.wav'
};

class SoundManager {
  constructor(wxApi) {
    this.wx = wxApi;
    this.musicEnabled = true;
    this.currentTrack = null;
    this.music = null;

    if (wxApi && wxApi.createInnerAudioContext) {
      this.music = wxApi.createInnerAudioContext();
      this.music.loop = true;
      this.music.volume = 0.38;
    }
  }

  play() {
    // Sound effects remain optional; background music is controlled separately below.
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled !== false;
    if (!this.music) {
      return;
    }

    if (!this.musicEnabled) {
      this.music.pause();
    } else if (this.currentTrack) {
      this.music.play();
    }
  }

  playMusic(level) {
    const track = BGM_TRACKS[level];
    if (!track || !this.music) {
      return;
    }

    const changedTrack = track !== this.currentTrack;
    if (changedTrack) {
      this.currentTrack = track;
      this.music.src = track;
    }

    if (this.musicEnabled && changedTrack) {
      this.music.play();
    }
  }

  stopMusic() {
    if (this.music) {
      this.music.stop();
    }
    this.currentTrack = null;
  }
}

SoundManager.BGM_TRACKS = BGM_TRACKS;

module.exports = SoundManager;

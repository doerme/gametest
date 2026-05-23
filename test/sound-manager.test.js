'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const SoundManager = require('../src/audio/SoundManager');

function makeWxAudioApi(events) {
  return {
    createInnerAudioContext() {
      return {
        play() {
          events.push('play');
        },
        pause() {
          events.push('pause');
        },
        stop() {
          events.push('stop');
        }
      };
    }
  };
}

const events = [];
const sound = new SoundManager(makeWxAudioApi(events));
assert.strictEqual(sound.musicEnabled, true);
assert.strictEqual(sound.music.loop, true);
assert.strictEqual(sound.music.volume, 0.38);
Object.keys(SoundManager.BGM_TRACKS).forEach((level) => {
  assert.strictEqual(fs.existsSync(path.join(__dirname, '..', SoundManager.BGM_TRACKS[level])), true);
});

sound.playMusic(1);
assert.strictEqual(sound.music.src, SoundManager.BGM_TRACKS[1]);
assert.deepStrictEqual(events, ['play']);

sound.playMusic(1);
assert.deepStrictEqual(events, ['play']);

sound.setMusicEnabled(false);
assert.deepStrictEqual(events, ['play', 'pause']);
sound.playMusic(2);
assert.strictEqual(sound.music.src, SoundManager.BGM_TRACKS[2]);
assert.deepStrictEqual(events, ['play', 'pause']);

sound.setMusicEnabled(true);
assert.deepStrictEqual(events, ['play', 'pause', 'play']);
sound.stopMusic();
assert.strictEqual(sound.currentTrack, null);
assert.deepStrictEqual(events, ['play', 'pause', 'play', 'stop']);

const silent = new SoundManager(null);
silent.setMusicEnabled(false);
silent.playMusic(1);
silent.stopMusic();

console.log('sound-manager.test.js passed');

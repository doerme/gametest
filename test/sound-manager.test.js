'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const SoundManager = require('../src/audio/SoundManager');

function makeWxAudioApi(events) {
  return {
    vibrateShort() {
      events.push('vibrate');
    },
    createInnerAudioContext() {
      const channel = events.contexts.length === 0 ? 'music' : 'effect';
      const context = {
        channel,
        play() {
          events.push(channel + ':play');
        },
        pause() {
          events.push(channel + ':pause');
        },
        stop() {
          events.push(channel + ':stop');
        }
      };
      events.contexts.push(context);
      return context;
    }
  };
}

const events = [];
events.contexts = [];
const sound = new SoundManager(makeWxAudioApi(events));
assert.strictEqual(sound.soundEnabled, true);
assert.strictEqual(sound.music.loop, true);
assert.strictEqual(sound.music.volume, 0.38);
assert.strictEqual(sound.effect.loop, false);
assert.strictEqual(sound.effect.volume, 0.72);
Object.keys(SoundManager.BGM_TRACKS).forEach((level) => {
  assert.strictEqual(fs.existsSync(path.join(__dirname, '..', SoundManager.BGM_TRACKS[level])), true);
});
Object.keys(SoundManager.EFFECT_TRACKS).forEach((effect) => {
  assert.strictEqual(fs.existsSync(path.join(__dirname, '..', SoundManager.EFFECT_TRACKS[effect])), true);
});

sound.playMusic(1);
assert.strictEqual(sound.music.src, SoundManager.BGM_TRACKS[1]);
assert.deepStrictEqual(events.slice(), ['music:play']);

sound.playMusic(1);
assert.deepStrictEqual(events.slice(), ['music:play']);

sound.play('vanish');
assert.strictEqual(sound.effect.src, SoundManager.EFFECT_TRACKS.vanish);
assert.deepStrictEqual(events.slice(), ['music:play', 'effect:stop', 'effect:play']);

sound.setSoundEnabled(false);
assert.deepStrictEqual(events.slice(), ['music:play', 'effect:stop', 'effect:play', 'effect:stop', 'music:pause']);
sound.playMusic(2);
assert.strictEqual(sound.music.src, SoundManager.BGM_TRACKS[2]);
sound.play('vanish');
assert.deepStrictEqual(events.slice(), ['music:play', 'effect:stop', 'effect:play', 'effect:stop', 'music:pause']);

sound.setSoundEnabled(true);
assert.deepStrictEqual(events.slice(), ['music:play', 'effect:stop', 'effect:play', 'effect:stop', 'music:pause', 'music:play']);
sound.playMusic(4);
assert.strictEqual(sound.music.src, SoundManager.BGM_TRACKS[4]);
assert.deepStrictEqual(events.slice(), ['music:play', 'effect:stop', 'effect:play', 'effect:stop', 'music:pause', 'music:play', 'music:play']);
sound.vibrateDamage();
assert.deepStrictEqual(events.slice(), ['music:play', 'effect:stop', 'effect:play', 'effect:stop', 'music:pause', 'music:play', 'music:play', 'vibrate']);
sound.stopMusic();
assert.strictEqual(sound.currentTrack, null);
assert.deepStrictEqual(events.slice(), ['music:play', 'effect:stop', 'effect:play', 'effect:stop', 'music:pause', 'music:play', 'music:play', 'vibrate', 'music:stop']);

const silent = new SoundManager(null);
silent.setSoundEnabled(false);
silent.playMusic(1);
silent.play('vanish');
silent.vibrateDamage();
silent.stopMusic();

console.log('sound-manager.test.js passed');

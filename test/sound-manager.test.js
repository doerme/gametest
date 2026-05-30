'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const SoundManager = require('../src/audio/SoundManager');
const { THEME_IDS } = require('../src/levels/Themes');

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
const seaTrainBgm = fs.readFileSync(path.join(__dirname, '..', SoundManager.BGM_TRACKS[THEME_IDS.SEA_TRAIN]));
assert.ok(seaTrainBgm.some((byte, index) => index >= 44 && byte !== 0));
Object.keys(SoundManager.EFFECT_TRACKS).forEach((effect) => {
  assert.strictEqual(fs.existsSync(path.join(__dirname, '..', SoundManager.EFFECT_TRACKS[effect])), true);
});

sound.playMusic(THEME_IDS.CASTLE);
assert.strictEqual(sound.music.src, SoundManager.BGM_TRACKS[THEME_IDS.CASTLE]);
assert.deepStrictEqual(events.slice(), ['music:play']);

sound.playMusic(THEME_IDS.CASTLE);
assert.deepStrictEqual(events.slice(), ['music:play']);

sound.play('vanish');
assert.strictEqual(sound.effect.src, SoundManager.EFFECT_TRACKS.vanish);
assert.deepStrictEqual(events.slice(), ['music:play', 'effect:stop', 'effect:play']);

sound.setSoundEnabled(false);
assert.deepStrictEqual(events.slice(), ['music:play', 'effect:stop', 'effect:play', 'effect:stop', 'music:pause']);
sound.playMusic(THEME_IDS.OCEAN);
assert.strictEqual(sound.music.src, SoundManager.BGM_TRACKS[THEME_IDS.OCEAN]);
sound.play('vanish');
assert.deepStrictEqual(events.slice(), ['music:play', 'effect:stop', 'effect:play', 'effect:stop', 'music:pause']);

sound.setSoundEnabled(true);
assert.deepStrictEqual(events.slice(), ['music:play', 'effect:stop', 'effect:play', 'effect:stop', 'music:pause', 'music:play']);
sound.playMusic(THEME_IDS.DINOSAUR_PARK);
assert.strictEqual(sound.music.src, SoundManager.BGM_TRACKS[THEME_IDS.DINOSAUR_PARK]);
assert.deepStrictEqual(events.slice(), ['music:play', 'effect:stop', 'effect:play', 'effect:stop', 'music:pause', 'music:play', 'music:play']);
sound.playMusic(THEME_IDS.SEA_TRAIN);
assert.strictEqual(sound.music.src, SoundManager.BGM_TRACKS[THEME_IDS.SEA_TRAIN]);
assert.deepStrictEqual(events.slice(), ['music:play', 'effect:stop', 'effect:play', 'effect:stop', 'music:pause', 'music:play', 'music:play', 'music:play']);
sound.vibrateDamage();
assert.deepStrictEqual(events.slice(), ['music:play', 'effect:stop', 'effect:play', 'effect:stop', 'music:pause', 'music:play', 'music:play', 'music:play', 'vibrate']);
sound.stopMusic();
assert.strictEqual(sound.currentTrack, null);
assert.deepStrictEqual(events.slice(), ['music:play', 'effect:stop', 'effect:play', 'effect:stop', 'music:pause', 'music:play', 'music:play', 'music:play', 'vibrate', 'music:stop']);

const silent = new SoundManager(null);
silent.setSoundEnabled(false);
silent.playMusic(THEME_IDS.CASTLE);
silent.play('vanish');
silent.vibrateDamage();
silent.stopMusic();

console.log('sound-manager.test.js passed');

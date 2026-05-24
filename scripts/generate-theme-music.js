'use strict';

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 16000;
const DURATION = 8;
const SAMPLE_COUNT = SAMPLE_RATE * DURATION;
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'audio');

function frequency(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function wave(type, phase) {
  if (type === 'triangle') {
    return 2 * Math.asin(Math.sin(phase)) / Math.PI;
  }
  if (type === 'soft-square') {
    return Math.tanh(Math.sin(phase) * 2.2) * 0.75;
  }
  return Math.sin(phase);
}

function addNote(samples, start, length, note, volume, type) {
  const startIndex = Math.round(start * SAMPLE_RATE);
  const lengthSamples = Math.round(length * SAMPLE_RATE);
  const attack = Math.max(1, Math.round(Math.min(0.03, length * 0.15) * SAMPLE_RATE));
  const release = Math.max(1, Math.round(Math.min(0.18, length * 0.35) * SAMPLE_RATE));
  const hz = frequency(note);

  for (let i = 0; i < lengthSamples && startIndex + i < samples.length; i += 1) {
    const attackGain = Math.min(1, i / attack);
    const releaseGain = Math.min(1, (lengthSamples - i) / release);
    const envelope = Math.min(attackGain, releaseGain);
    const phase = Math.PI * 2 * hz * i / SAMPLE_RATE;
    samples[startIndex + i] += wave(type, phase) * volume * envelope;
  }
}

function addPad(samples, note, volume, type) {
  for (let start = 0; start < DURATION; start += 2) {
    addNote(samples, start, 1.94, note, volume, type);
    addNote(samples, start, 1.94, note + 7, volume * 0.42, 'sine');
  }
}

function normalize(samples) {
  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) {
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  const scale = peak > 0 ? 0.76 / peak : 1;
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] *= scale;
  }
}

function createCastleTheme() {
  const samples = new Float32Array(SAMPLE_COUNT);
  const arpeggio = [57, 60, 64, 60, 55, 60, 64, 60, 53, 57, 60, 57, 52, 55, 59, 55];
  addPad(samples, 33, 0.12, 'soft-square');
  for (let i = 0; i < arpeggio.length; i += 1) {
    addNote(samples, i * 0.5, 0.44, arpeggio[i], 0.28, 'triangle');
    addNote(samples, i * 0.5, 0.32, arpeggio[i] + 12, 0.09, 'sine');
  }
  [45, 41, 40, 38].forEach((note, index) => {
    addNote(samples, index * 2, 1.82, note, 0.2, 'sine');
  });
  return samples;
}

function createOceanTheme() {
  const samples = new Float32Array(SAMPLE_COUNT);
  [38, 41, 45, 43].forEach((note, index) => {
    addNote(samples, index * 2, 1.96, note, 0.17, 'sine');
    addNote(samples, index * 2, 1.96, note + 7, 0.11, 'sine');
  });
  const bubbles = [69, 74, 76, 72, 67, 74, 79, 76];
  for (let i = 0; i < bubbles.length; i += 1) {
    const start = i * 1 + (i % 2) * 0.12;
    addNote(samples, start, 0.68, bubbles[i], 0.2, 'sine');
    addNote(samples, start + 0.18, 0.6, bubbles[i] + 12, 0.07, 'triangle');
  }
  for (let i = 0; i < 4; i += 1) {
    addNote(samples, i * 2 + 1.38, 0.48, 55 + (i % 2) * 2, 0.1, 'triangle');
  }
  return samples;
}

function createPenguinTheme() {
  const samples = new Float32Array(SAMPLE_COUNT);
  const melody = [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 81, 79, 77, 74];
  const bass = [48, 55, 50, 55, 48, 55, 53, 55];
  for (let i = 0; i < bass.length; i += 1) {
    addNote(samples, i, 0.82, bass[i], 0.2, 'triangle');
    addNote(samples, i + 0.5, 0.34, bass[i] + 12, 0.13, 'soft-square');
  }
  for (let i = 0; i < melody.length; i += 1) {
    addNote(samples, i * 0.5, 0.35, melody[i], 0.3, 'triangle');
    addNote(samples, i * 0.5 + 0.04, 0.22, melody[i] + 12, 0.06, 'sine');
  }
  return samples;
}

function createDinosaurParkTheme() {
  const samples = new Float32Array(SAMPLE_COUNT);
  const drums = [38, 38, 41, 38, 36, 38, 43, 41];
  const calls = [57, 60, 64, 67, 64, 62, 60, 55];
  for (let i = 0; i < drums.length; i += 1) {
    addNote(samples, i, 0.82, drums[i], 0.24, 'soft-square');
    addNote(samples, i + 0.48, 0.3, drums[i] - 12, 0.17, 'triangle');
    addNote(samples, i, 0.7, calls[i], 0.22, 'triangle');
    addNote(samples, i + 0.1, 0.54, calls[i] + 12, 0.08, 'sine');
  }
  [45, 48, 43, 41].forEach((note, index) => {
    addNote(samples, index * 2, 1.92, note, 0.12, 'sine');
  });
  return samples;
}

function createVanishSfx() {
  const samples = new Float32Array(Math.round(SAMPLE_RATE * 0.46));
  addNote(samples, 0, 0.16, 84, 0.42, 'triangle');
  addNote(samples, 0.06, 0.18, 91, 0.36, 'sine');
  addNote(samples, 0.15, 0.28, 96, 0.3, 'triangle');
  addNote(samples, 0.18, 0.23, 103, 0.17, 'sine');
  return samples;
}

function writeWav(filename, samples) {
  normalize(samples);
  const dataLength = samples.length * 2;
  const output = Buffer.alloc(44 + dataLength);
  output.write('RIFF', 0);
  output.writeUInt32LE(36 + dataLength, 4);
  output.write('WAVE', 8);
  output.write('fmt ', 12);
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20);
  output.writeUInt16LE(1, 22);
  output.writeUInt32LE(SAMPLE_RATE, 24);
  output.writeUInt32LE(SAMPLE_RATE * 2, 28);
  output.writeUInt16LE(2, 32);
  output.writeUInt16LE(16, 34);
  output.write('data', 36);
  output.writeUInt32LE(dataLength, 40);

  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    output.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, filename), output);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
writeWav('bgm-castle.wav', createCastleTheme());
writeWav('bgm-ocean.wav', createOceanTheme());
writeWav('bgm-penguin-hotel.wav', createPenguinTheme());
writeWav('bgm-dinosaur-park.wav', createDinosaurParkTheme());
writeWav('sfx-vanish.wav', createVanishSfx());

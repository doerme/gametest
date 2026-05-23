'use strict';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function normalizeVector(dx, dy) {
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: dx / len, y: dy / len, len };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

module.exports = {
  clamp,
  distance,
  normalizeVector,
  lerp
};

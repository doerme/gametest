'use strict';

const { resample, pathLength } = require('./GestureRecognizer');

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function trajectoryDistance(a, b) {
  // Preserve absolute character coordinates: equal strokes at different positions
  // must not pass. DTW allows uneven finger speed without reversing direction.
  let previous = new Float64Array(b.length + 1).fill(Infinity);
  previous[0] = 0;
  for (let i = 1; i <= a.length; i += 1) {
    const row = new Float64Array(b.length + 1).fill(Infinity);
    for (let j = Math.max(1, i - 10); j <= Math.min(b.length, i + 10); j += 1) {
      row[j] = distance(a[i - 1], b[j - 1]) + Math.min(previous[j], row[j - 1], previous[j - 1]);
    }
    previous = row;
  }
  return previous[b.length] / a.length;
}

function recognizeStroke(points, median, board) {
  const ignored = { accepted: false, ignored: true };
  if (!Array.isArray(points) || points.length < 2 || !median || median.length < 2 || !board) return ignored;
  const clean = points.filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y));
  if (clean.length < 2 || pathLength(clean) < 3) return ignored;
  const path = clean.map((p) => ({ x: (p.x - board.x) / board.width, y: (p.y - board.y) / board.height }));
  if (path.some((p) => p.x < -0.025 || p.x > 1.025 || p.y < -0.025 || p.y > 1.025)) return { accepted: false, ignored: false };
  const expectedLength = pathLength(median);
  const actualLength = pathLength(path);
  const tolerance = Math.min(0.13, Math.max(0.065, expectedLength * 0.16));
  const start = distance(path[0], median[0]);
  const end = distance(path[path.length - 1], median[median.length - 1]);
  const samples = resample(path, 48);
  const expected = resample(median, 48);
  const forward = trajectoryDistance(samples, expected);
  const reverse = trajectoryDistance(samples.slice().reverse(), expected);
  const accepted = start <= tolerance && end <= tolerance
    && actualLength >= expectedLength * 0.55 && actualLength <= expectedLength * 1.75
    && forward <= 0.085 && forward + Math.min(0.012, expectedLength * 0.1) < reverse;
  return { accepted, ignored: false, distance: forward, startError: start, endError: end };
}

module.exports = { recognizeStroke };

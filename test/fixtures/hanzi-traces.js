'use strict';

// Synthetic child-sized inaccuracies, not samples captured from actual children.
const { resample, pathLength } = require('../../src/input/GestureRecognizer');

const offset = (points) => points.map((p) => ({ x: p.x + 0.08, y: p.y + 0.06 }));
const shortened = (points) => resample(points, 48).slice(7, -7);
const wobbly = (points) => resample(points, 48).map((p, i) => ({ x: p.x + Math.sin(i * 1.7) * 0.04, y: p.y + Math.cos(i * 1.3) * 0.04 }));
const approximate = (points) => resample(points, 5);
function overflow(points) {
  const end = points[points.length - 1];
  const edges = [{ key: 'x', gap: end.x, value: -0.03 }, { key: 'x', gap: 1 - end.x, value: 1.03 }, { key: 'y', gap: end.y, value: -0.03 }, { key: 'y', gap: 1 - end.y, value: 1.03 }].sort((a, b) => a.gap - b.gap);
  if (edges[0].gap > 0.08 || pathLength(points) < 0.12) return null;
  const path = resample(points, 48);
  path[path.length - 1] = { ...end, [edges[0].key]: edges[0].value };
  return path;
}

// Stop these particular strokes before the short finishing hook.
const HOOK_CASES = [
  { character: '小', index: 0, count: 6 },
  { character: '水', index: 0, count: 5 },
  { character: '手', index: 3, count: 6 },
  { character: '子', index: 1, count: 7 },
  { character: '了', index: 1, count: 7 },
  { character: '九', index: 1, count: 18 },
  { character: '几', index: 1, count: 16 }
];

module.exports = { offset, shortened, wobbly, approximate, overflow, HOOK_CASES };

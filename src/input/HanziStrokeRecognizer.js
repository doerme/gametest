'use strict';

const { resample, pathLength } = require('./GestureRecognizer');
const POLICY = require('../hanzi/RecognitionPolicy');

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function segmentDistance(point, a, b) {
  const dx = b.x - a.x; const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return distance(point, { x: a.x + dx * t, y: a.y + dy * t });
}

function preparePath(points) {
  // Densify sparse pointer events before smoothing, preserving real bends. Bound
  // very dense input by event index so finger jitter cannot inflate sampling.
  const count = Math.max(POLICY.samples, Math.min(POLICY.maxInputSamples, points.length));
  let path = Array.from({ length: count }, (_, i) => {
    const index = i * (points.length - 1) / (count - 1);
    const a = points[Math.floor(index)]; const b = points[Math.min(points.length - 1, Math.floor(index) + 1)];
    const t = index - Math.floor(index);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  });
  for (let pass = 0; pass < POLICY.smoothingPasses; pass += 1) {
    path = path.map((point, i) => {
      if (i === 0 || i === path.length - 1) return point;
      let x = 0; let y = 0; let total = 0;
      POLICY.smoothingWeights.forEach((weight, j) => {
        const neighbor = path[Math.max(0, Math.min(path.length - 1, i + j - 2))];
        x += neighbor.x * weight; y += neighbor.y * weight; total += weight;
      });
      return { x: x / total, y: y / total };
    });
  }
  return path;
}

function simplifyTurns(points, tolerance) {
  if (points.length <= 2) return points;
  let index = 0; let furthest = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const d = segmentDistance(points[i], points[0], points[points.length - 1]);
    if (d > furthest) { furthest = d; index = i; }
  }
  if (furthest <= tolerance) return [points[0], points[points.length - 1]];
  return simplifyTurns(points.slice(0, index + 1), tolerance).slice(0, -1).concat(simplifyTurns(points.slice(index), tolerance));
}

function turns(points, minimumArm, minimumDegrees, tolerance) {
  const path = simplifyTurns(points, tolerance); const result = [];
  for (let i = 1; i < path.length - 1; i += 1) {
    const a = path[i - 1]; const p = path[i]; const b = path[i + 1];
    const ax = p.x - a.x; const ay = p.y - a.y; const bx = b.x - p.x; const by = b.y - p.y;
    const angle = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
    if (distance(a, p) >= minimumArm && distance(p, b) >= minimumArm && Math.abs(angle) * 180 / Math.PI >= minimumDegrees) result.push({ point: p, angle, position: points.indexOf(p) });
  }
  return result;
}

function retainsMajorTurns(samples, expected) {
  const required = turns(expected, POLICY.majorArmLength, POLICY.majorTurnDegrees, POLICY.simplifyTolerance);
  // Coarse turns keep rounded right angles intact; finer turns retain the gentle
  // 25-degree bends allowed for children. Merge without counting a corner twice.
  const drawn = turns(samples, POLICY.drawnArmLength, POLICY.drawnTurnDegrees, POLICY.simplifyTolerance)
    .concat(turns(samples, POLICY.drawnArmLength, POLICY.drawnTurnDegrees, POLICY.drawnSimplifyTolerance))
    .sort((a, b) => a.position - b.position)
    .filter((turn, i, all) => i === 0 || turn.position !== all[i - 1].position);
  let next = 0;
  return required.every((turn) => {
    while (next < drawn.length) {
      const candidate = drawn[next++];
      if (turn.angle * candidate.angle > 0 && distance(turn.point, candidate.point) <= POLICY.maximumRawDeviation) return true;
    }
    return false;
  });
}

function trajectoryDistance(a, b) {
  // Keep character coordinates and drawing direction while tolerating uneven
  // finger speed, loose placement and omitted small finishing details.
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
  if (!Array.isArray(points) || points.length < 2 || !median || median.length < 2 || !board
    || ![board.x, board.y, board.width, board.height].every(Number.isFinite) || board.width <= 0 || board.height <= 0) return ignored;
  const clean = points.filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y));
  if (clean.length < 2 || pathLength(clean) < POLICY.minimumPixels) return ignored;
  const path = clean.map((p) => ({ x: (p.x - board.x) / board.width, y: (p.y - board.y) / board.height }));
  if (path[0].x < 0 || path[0].x > 1 || path[0].y < 0 || path[0].y > 1) return ignored;
  const reject = { accepted: false, ignored: false };
  if (path.some((p) => p.x < -POLICY.boundaryTolerance || p.x > 1 + POLICY.boundaryTolerance || p.y < -POLICY.boundaryTolerance || p.y > 1 + POLICY.boundaryTolerance)) return reject;
  const expectedLength = pathLength(median);
  // Check the raw path too: smoothing must not turn large scribbles into a pass.
  if (pathLength(path) > expectedLength * POLICY.maximumRawLengthRatio + path.length * POLICY.rawJitterAllowancePerPoint
    || path.some((p) => Math.min(...median.slice(1).map((b, i) => segmentDistance(p, median[i], b))) > POLICY.maximumRawDeviation)) return reject;
  const smooth = preparePath(path);
  const actualLength = pathLength(smooth);
  const tolerance = Math.min(POLICY.maximumEndpointTolerance, Math.max(POLICY.minimumEndpointTolerance, expectedLength * POLICY.endpointLengthFactor));
  const start = distance(path[0], median[0]);
  const end = distance(path[path.length - 1], median[median.length - 1]);
  const samples = resample(smooth, POLICY.samples);
  const expected = resample(preparePath(median), POLICY.samples);
  const forward = trajectoryDistance(samples, expected);
  const reverse = trajectoryDistance(samples.slice().reverse(), expected);
  const accepted = start <= tolerance && end <= tolerance
    && actualLength >= expectedLength * POLICY.minimumLengthRatio && actualLength <= expectedLength * POLICY.maximumLengthRatio
    && forward <= POLICY.maximumTrajectoryDistance && forward + Math.min(POLICY.directionMargin, expectedLength * POLICY.directionLengthFactor) < reverse
    && retainsMajorTurns(samples, median);
  return { accepted, ignored: false, distance: forward, startError: start, endError: end };
}

module.exports = { recognizeStroke };

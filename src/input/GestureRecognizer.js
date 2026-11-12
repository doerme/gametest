'use strict';

const { getGuidePath } = require('./GestureTemplates');

const SYMBOLS = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
  V: 'v',
  L: 'l',
  CIRCLE: 'circle',
  Z: 'z',
  M: 'm',
  S: 's',
  UNKNOWN: 'unknown'
};

const LABELS = {
  [SYMBOLS.UP]: '↑',
  [SYMBOLS.DOWN]: '↓',
  [SYMBOLS.LEFT]: '←',
  [SYMBOLS.RIGHT]: '→',
  [SYMBOLS.V]: 'V',
  [SYMBOLS.L]: 'L',
  [SYMBOLS.CIRCLE]: '○',
  [SYMBOLS.Z]: 'Z',
  [SYMBOLS.M]: 'M',
  [SYMBOLS.S]: 'S',
  [SYMBOLS.UNKNOWN]: '?'
};

function getBounds(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

function pathLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

function simplify(points) {
  if (!points || points.length < 2) {
    return [];
  }

  points = points.filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y));
  if (points.length < 2) return [];
  const out = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    const prev = out[out.length - 1];
    const next = points[i];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    if (Math.sqrt(dx * dx + dy * dy) >= 1.5) {
      out.push(next);
    }
  }

  if (out[out.length - 1] !== points[points.length - 1]) {
    out.push(points[points.length - 1]);
  }

  return out;
}

function findCornerIndex(points, wantLowY) {
  let bestIndex = -1;
  let bestScore = wantLowY ? Infinity : -Infinity;

  for (let i = 1; i < points.length - 1; i += 1) {
    const p = points[i];
    if ((wantLowY && p.y < bestScore) || (!wantLowY && p.y > bestScore)) {
      bestScore = p.y;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function hasLooseCorner(firstArm, secondArm, spread, bounds) {
  const longArm = Math.max(firstArm, secondArm);
  const shortArm = Math.min(firstArm, secondArm);
  return (
    longArm > bounds.height * 0.42 &&
    shortArm > Math.max(5, bounds.height * 0.08) &&
    spread > Math.max(6, bounds.width * 0.18)
  );
}

function recognizeVShape(points, bounds) {
  if (points.length < 3 || bounds.width < 8 || bounds.height < 14) {
    return SYMBOLS.UNKNOWN;
  }

  const first = points[0];
  const last = points[points.length - 1];
  const bottomIndex = findCornerIndex(points, false);
  const bottom = points[bottomIndex];

  if (bottom && bottomIndex > 0 && bottomIndex < points.length - 1) {
    const leftDrop = bottom.y - first.y;
    const rightRise = bottom.y - last.y;
    const spread = Math.abs(last.x - first.x);
    // Young players often finish one arm early or draw a very narrow corner.
    if (hasLooseCorner(leftDrop, rightRise, spread, bounds)) {
      return SYMBOLS.V;
    }
  }

  return SYMBOLS.UNKNOWN;
}

function pointDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function angularTravel(points, bounds) {
  const center = {
    x: bounds.minX + bounds.width / 2,
    y: bounds.minY + bounds.height / 2
  };
  let previous = Math.atan2(points[0].y - center.y, points[0].x - center.x);
  let signed = 0;
  let total = 0;

  for (let i = 1; i < points.length; i += 1) {
    const next = Math.atan2(points[i].y - center.y, points[i].x - center.x);
    const delta = Math.atan2(Math.sin(next - previous), Math.cos(next - previous));
    signed += delta;
    total += Math.abs(delta);
    previous = next;
  }

  return { signed, total };
}

function followsZDirection(points, bounds) {
  const first = points[0];
  const last = points[points.length - 1];
  if (
    first.x > bounds.minX + bounds.width * 0.45 ||
    first.y > bounds.minY + bounds.height * 0.45 ||
    last.x < bounds.maxX - bounds.width * 0.45 ||
    last.y < bounds.maxY - bounds.height * 0.45
  ) {
    return false;
  }

  for (let topIndex = 1; topIndex < points.length - 2; topIndex += 1) {
    const topRight = points[topIndex];
    if (
      topRight.x - first.x < bounds.width * 0.4 ||
      Math.abs(topRight.y - first.y) > bounds.height * 0.4 ||
      topRight.y > bounds.minY + bounds.height * 0.43
    ) {
      continue;
    }

    for (let bottomIndex = topIndex + 1; bottomIndex < points.length - 1; bottomIndex += 1) {
      const bottomLeft = points[bottomIndex];
      if (
        topRight.x - bottomLeft.x >= bounds.width * 0.32 &&
        bottomLeft.y - topRight.y >= bounds.height * 0.36 &&
        bottomLeft.x <= bounds.minX + bounds.width * 0.43 &&
        bottomLeft.y >= bounds.maxY - bounds.height * 0.43 &&
        last.x - bottomLeft.x >= bounds.width * 0.4 &&
        Math.abs(last.y - bottomLeft.y) <= bounds.height * 0.4
      ) {
        return true;
      }
    }
  }

  return false;
}

function recognizeZShape(points, bounds) {
  if (points.length < 4 || bounds.width < 28 || bounds.height < 28) {
    return SYMBOLS.UNKNOWN;
  }

  if (followsZDirection(points, bounds) || followsZDirection(points.slice().reverse(), bounds)) {
    return SYMBOLS.Z;
  }

  return SYMBOLS.UNKNOWN;
}

function followsMDirection(points, bounds) {
  const first = points[0];
  const last = points[points.length - 1];
  if (
    first.x > bounds.minX + bounds.width * 0.34 ||
    first.y < bounds.maxY - bounds.height * 0.45 ||
    last.x < bounds.maxX - bounds.width * 0.34 ||
    last.y < bounds.maxY - bounds.height * 0.45
  ) {
    return false;
  }

  for (let leftIndex = 1; leftIndex < points.length - 2; leftIndex += 1) {
    const leftPeak = points[leftIndex];
    if (
      leftPeak.x > bounds.minX + bounds.width * 0.38 ||
      leftPeak.y > bounds.minY + bounds.height * 0.35 ||
      first.y - leftPeak.y < bounds.height * 0.38
    ) {
      continue;
    }

    for (let valleyIndex = leftIndex + 1; valleyIndex < points.length - 1; valleyIndex += 1) {
      const valley = points[valleyIndex];
      if (
        valley.x < bounds.minX + bounds.width * 0.25 ||
        valley.x > bounds.maxX - bounds.width * 0.25 ||
        valley.y - leftPeak.y < bounds.height * 0.3
      ) {
        continue;
      }

      for (let rightIndex = valleyIndex + 1; rightIndex < points.length - 1; rightIndex += 1) {
        const rightPeak = points[rightIndex];
        if (
          rightPeak.x < bounds.maxX - bounds.width * 0.38 ||
          rightPeak.y > bounds.minY + bounds.height * 0.35 ||
          valley.y - rightPeak.y < bounds.height * 0.3 ||
          last.y - rightPeak.y < bounds.height * 0.38
        ) {
          continue;
        }

        return true;
      }
    }
  }

  return false;
}

function recognizeMShape(points, bounds) {
  if (points.length < 5 || bounds.width < 30 || bounds.height < 28) {
    return SYMBOLS.UNKNOWN;
  }

  if (followsMDirection(points, bounds) || followsMDirection(points.slice().reverse(), bounds)) {
    return SYMBOLS.M;
  }

  return SYMBOLS.UNKNOWN;
}

function followsSDirection(points, bounds) {
  const first = points[0];
  const last = points[points.length - 1];

  if (
    first.x < bounds.maxX - bounds.width * 0.42 ||
    first.y > bounds.minY + bounds.height * 0.4 ||
    last.x > bounds.minX + bounds.width * 0.42 ||
    last.y < bounds.maxY - bounds.height * 0.38
  ) {
    return false;
  }

  let topLeftIndex = -1;
  for (let i = 1; i < points.length - 2; i += 1) {
    const p = points[i];
    if (
      p.x <= bounds.minX + bounds.width * 0.4 &&
      p.y <= bounds.minY + bounds.height * 0.42
    ) {
      topLeftIndex = i;
      break;
    }
  }

  if (topLeftIndex < 0) {
    return false;
  }

  let middleRightIndex = -1;
  for (let i = topLeftIndex + 1; i < points.length - 1; i += 1) {
    const p = points[i];
    if (
      p.x >= bounds.maxX - bounds.width * 0.38 &&
      p.y >= bounds.minY + bounds.height * 0.3 &&
      p.y <= bounds.maxY - bounds.height * 0.2
    ) {
      middleRightIndex = i;
      break;
    }
  }

  if (middleRightIndex < 0) {
    return false;
  }

  for (let i = middleRightIndex + 1; i < points.length; i += 1) {
    const p = points[i];
    if (
      p.x <= bounds.minX + bounds.width * 0.42 &&
      p.y >= bounds.maxY - bounds.height * 0.38
    ) {
      return true;
    }
  }

  return false;
}

function recognizeSShape(points, bounds) {
  if (points.length < 6 || bounds.width < 30 || bounds.height < 36) {
    return SYMBOLS.UNKNOWN;
  }

  if (followsSDirection(points, bounds) || followsSDirection(points.slice().reverse(), bounds)) {
    return SYMBOLS.S;
  }

  return SYMBOLS.UNKNOWN;
}

function followsLDirection(points, bounds) {
  const first = points[0];
  const last = points[points.length - 1];
  if (
    first.x > bounds.minX + bounds.width * 0.43 ||
    first.y > bounds.minY + bounds.height * 0.43 ||
    last.x < bounds.maxX - bounds.width * 0.43 ||
    last.y < bounds.maxY - bounds.height * 0.43
  ) {
    return false;
  }

  for (let cornerIndex = 1; cornerIndex < points.length - 1; cornerIndex += 1) {
    const corner = points[cornerIndex];
    if (
      corner.y - first.y < bounds.height * 0.4 ||
      Math.abs(corner.x - first.x) > bounds.width * 0.4 ||
      corner.x > bounds.minX + bounds.width * 0.43 ||
      corner.y < bounds.maxY - bounds.height * 0.43
    ) {
      continue;
    }

    if (
      last.x - corner.x >= bounds.width * 0.34 &&
      Math.abs(last.y - corner.y) <= bounds.height * 0.4
    ) {
      return true;
    }
  }

  return false;
}

function recognizeLShape(points, bounds) {
  if (points.length < 3 || bounds.width < 24 || bounds.height < 28) {
    return SYMBOLS.UNKNOWN;
  }

  if (followsLDirection(points, bounds) || followsLDirection(points.slice().reverse(), bounds)) {
    return SYMBOLS.L;
  }

  return SYMBOLS.UNKNOWN;
}

function resample(points, count = 64) {
  if (points.length < 2) return [];
  const length = pathLength(points);
  if (length === 0) return [];
  const result = [{ ...points[0] }];
  let segment = 1;
  let traveled = 0;
  for (let i = 1; i < count; i += 1) {
    const target = length * i / (count - 1);
    while (segment < points.length - 1 && traveled + pointDistance(points[segment - 1], points[segment]) < target) {
      traveled += pointDistance(points[segment - 1], points[segment]);
      segment += 1;
    }
    const a = points[segment - 1];
    const b = points[segment];
    const t = Math.min(1, (target - traveled) / (pointDistance(a, b) || 1));
    result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return result;
}

function normalize(points) {
  const b = getBounds(points);
  return points.map((p) => ({ x: (p.x - b.minX) / Math.max(1, b.width) * 100, y: (p.y - b.minY) / Math.max(1, b.height) * 100 }));
}

function smooth(points) {
  const step = Math.max(1, Math.ceil(points.length / 256));
  const reduced = points.filter((_p, i) => i % step === 0 || i === points.length - 1);
  if (reduced.length < 5) return reduced;
  return reduced.map((p, i) => i === 0 || i === reduced.length - 1 ? p : {
    x: p.x * 0.8 + (reduced[i - 1].x + reduced[i + 1].x) * 0.1,
    y: p.y * 0.8 + (reduced[i - 1].y + reduced[i + 1].y) * 0.1
  });
}

function templateDistance(a, b) {
  // Banded DTW tolerates unequal arm lengths and uneven drawing speed.
  let previous = new Float64Array(b.length + 1).fill(Infinity);
  previous[0] = 0;
  for (let i = 1; i <= a.length; i += 1) {
    const row = new Float64Array(b.length + 1).fill(Infinity);
    for (let j = Math.max(1, i - 16); j <= Math.min(b.length, i + 16); j += 1) {
      row[j] = pointDistance(a[i - 1], b[j - 1]) + Math.min(previous[j], row[j - 1], previous[j - 1]);
    }
    previous = row;
  }
  return previous[b.length] / a.length / 100;
}

const SHAPES = { v: recognizeVShape, l: recognizeLShape, z: recognizeZShape, m: recognizeMShape, s: recognizeSShape };
const TEMPLATES = {};
Object.keys(SHAPES).forEach((symbol) => {
  const guide = getGuidePath(symbol);
  const variants = symbol === 'v' ? [guide, [{ x: 0, y: 0 }, { x: 58, y: 100 }, { x: 100, y: 72 }], [{ x: 0, y: 0 }, { x: 70, y: 100 }, { x: 100, y: 90 }]] : [guide];
  TEMPLATES[symbol] = variants.flatMap((variant) => [variant, variant.slice().reverse()]).flatMap((path) => [-0.22, 0, 0.22].map((angle) => {
    const rotated = path.map((p) => ({ x: p.x * Math.cos(angle) - p.y * Math.sin(angle), y: p.x * Math.sin(angle) + p.y * Math.cos(angle) }));
    return normalize(resample(rotated));
  }));
});

function recognizeDetailed(points, options = {}) {
  const clean = simplify(Array.isArray(points) ? points : []);
  const result = { symbol: SYMBOLS.UNKNOWN, confidence: 0, candidates: [], assisted: false, ignored: false };
  const bounds = getBounds(clean);
  const extent = Math.max(bounds.width, bounds.height);
  const length = pathLength(clean);
  if (clean.length < 2 || extent < 18 || length < 18) return { ...result, ignored: true };
  if (length > extent * 8) return result;
  const samples = resample(smooth(clean));
  const normalized = normalize(samples);
  const normalizedBounds = getBounds(normalized);
  const featurePoints = normalize(clean.filter((_p, i) => i % Math.max(1, Math.ceil(clean.length / 128)) === 0 || i === clean.length - 1));
  const first = samples[0];
  const last = samples[samples.length - 1];
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const straightness = Math.hypot(dx, dy) / pathLength(samples);
  const candidates = [];
  if (straightness > 0.78 && Math.hypot(dx, dy) > 17) {
    const dominance = Math.min(Math.abs(dx), Math.abs(dy)) / Math.max(Math.abs(dx), Math.abs(dy));
    const symbol = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? SYMBOLS.LEFT : SYMBOLS.RIGHT) : (dy < 0 ? SYMBOLS.UP : SYMBOLS.DOWN);
    candidates.push({ symbol, confidence: dominance < 0.72 ? 0.94 * straightness : 0.76 * straightness });
    if (dominance >= 0.82) {
      const alternate = Math.abs(dx) > Math.abs(dy) ? (dy < 0 ? SYMBOLS.UP : SYMBOLS.DOWN) : (dx < 0 ? SYMBOLS.LEFT : SYMBOLS.RIGHT);
      candidates.push({ symbol: alternate, confidence: 0.72 * straightness });
    }
  }
  const ratio = bounds.width / Math.max(1, bounds.height);
  const turn = angularTravel(samples, bounds);
  const radii = normalized.map((p) => Math.hypot(p.x - 50, p.y - 50));
  const meanRadius = radii.reduce((sum, value) => sum + value, 0) / radii.length;
  const radialVariation = Math.sqrt(radii.reduce((sum, value) => sum + (value - meanRadius) ** 2, 0) / radii.length) / meanRadius;
  const area = Math.abs(normalized.reduce((sum, p, i) => { const next = normalized[(i + 1) % normalized.length]; return sum + p.x * next.y - next.x * p.y; }, 0)) / 20000;
  if (ratio >= 0.42 && ratio <= 2.3 && radialVariation < 0.30 && area > 0.42 && Math.abs(turn.signed) >= Math.PI * 1.13 && Math.abs(turn.signed) >= turn.total * 0.85 && length >= extent * 1.7 && length <= extent * 5.5) {
    candidates.push({ symbol: SYMBOLS.CIRCLE, confidence: Math.min(0.99, 0.82 + Math.abs(turn.signed) / (Math.PI * 2) * 0.16) });
  }
  if (bounds.width >= 7 && bounds.height >= 12 && straightness < 0.92) {
    const normalizedLength = pathLength(normalized);
    const maxLength = { v: 310, l: 290, z: 470, m: 620, s: 510 };
    Object.keys(SHAPES).forEach((symbol) => {
      if (normalizedLength > maxLength[symbol]) return;
      const feature = SHAPES[symbol](normalized, normalizedBounds) !== SYMBOLS.UNKNOWN || SHAPES[symbol](featurePoints, getBounds(featurePoints)) !== SYMBOLS.UNKNOWN;
      const distance = Math.min(...TEMPLATES[symbol].map((template) => templateDistance(normalized, template)));
      const match = Math.max(0, 1 - distance / 0.60);
      const confidence = feature && distance < 0.30 ? 0.70 + match * 0.28 : (distance < 0.18 ? match * 0.90 : 0);
      if (confidence > 0.60) candidates.push({ symbol, confidence });
    });
  }
  candidates.sort((a, b) => b.confidence - a.confidence);
  result.candidates = candidates;
  if (!candidates.length) return result;
  let chosen = candidates[0];
  const expected = new Set(options.expectedSymbols || []);
  if (chosen.confidence < 0.90 && expected.size) {
    const plausible = candidates.filter((candidate) => expected.has(candidate.symbol) && candidate.confidence >= 0.70 && chosen.confidence - candidate.confidence <= 0.08);
    if (plausible.length === 1 && plausible[0].symbol !== chosen.symbol) {
      chosen = plausible[0];
      result.assisted = true;
    }
  }
  result.confidence = chosen.confidence;
  const arrow = [SYMBOLS.UP, SYMBOLS.DOWN, SYMBOLS.LEFT, SYMBOLS.RIGHT].includes(chosen.symbol);
  if (chosen.confidence >= (arrow ? 0.74 : 0.84) || (result.assisted && chosen.confidence >= 0.70)) result.symbol = chosen.symbol;
  return result;
}

function recognize(points) { return recognizeDetailed(points).symbol; }

module.exports = {
  SYMBOLS,
  LABELS,
  recognize,
  recognizeDetailed,
  resample,
  simplify,
  getBounds,
  pathLength
};

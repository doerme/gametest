'use strict';

const SYMBOLS = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
  V: 'v',
  CARET: 'caret',
  UNKNOWN: 'unknown'
};

const LABELS = {
  [SYMBOLS.UP]: '↑',
  [SYMBOLS.DOWN]: '↓',
  [SYMBOLS.LEFT]: '←',
  [SYMBOLS.RIGHT]: '→',
  [SYMBOLS.V]: 'V',
  [SYMBOLS.CARET]: '∧',
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

  const out = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    const prev = out[out.length - 1];
    const next = points[i];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    if (Math.sqrt(dx * dx + dy * dy) >= 4) {
      out.push(next);
    }
  }

  if (out[out.length - 1] !== points[points.length - 1]) {
    out.push(points[points.length - 1]);
  }

  return out;
}

function recognizeLine(points, bounds) {
  const first = points[0];
  const last = points[points.length - 1];
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (Math.max(absX, absY) < 22) {
    return SYMBOLS.UNKNOWN;
  }

  if (absY > absX * 1.12 && bounds.height > 20) {
    return dy < 0 ? SYMBOLS.UP : SYMBOLS.DOWN;
  }

  if (absX > absY * 1.12 && bounds.width > 20) {
    return dx < 0 ? SYMBOLS.LEFT : SYMBOLS.RIGHT;
  }

  return SYMBOLS.UNKNOWN;
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

function recognizeVShape(points, bounds) {
  if (points.length < 3 || bounds.width < 24 || bounds.height < 24) {
    return SYMBOLS.UNKNOWN;
  }

  const first = points[0];
  const last = points[points.length - 1];
  const bottomIndex = findCornerIndex(points, false);
  const topIndex = findCornerIndex(points, true);
  const bottom = points[bottomIndex];
  const top = points[topIndex];

  if (bottom && bottomIndex > 0 && bottomIndex < points.length - 1) {
    const leftDrop = bottom.y - first.y;
    const rightRise = bottom.y - last.y;
    const spread = Math.abs(last.x - first.x);
    if (leftDrop > bounds.height * 0.38 && rightRise > bounds.height * 0.38 && spread > bounds.width * 0.36) {
      return SYMBOLS.V;
    }
  }

  if (top && topIndex > 0 && topIndex < points.length - 1) {
    const leftRise = first.y - top.y;
    const rightDrop = last.y - top.y;
    const spread = Math.abs(last.x - first.x);
    if (leftRise > bounds.height * 0.38 && rightDrop > bounds.height * 0.38 && spread > bounds.width * 0.36) {
      return SYMBOLS.CARET;
    }
  }

  return SYMBOLS.UNKNOWN;
}

function recognize(points) {
  const simplified = simplify(points);
  if (simplified.length < 2) {
    return SYMBOLS.UNKNOWN;
  }

  const bounds = getBounds(simplified);
  if (pathLength(simplified) < 24) {
    return SYMBOLS.UNKNOWN;
  }

  const vShape = recognizeVShape(simplified, bounds);
  if (vShape !== SYMBOLS.UNKNOWN) {
    return vShape;
  }

  return recognizeLine(simplified, bounds);
}

module.exports = {
  SYMBOLS,
  LABELS,
  recognize,
  simplify,
  getBounds,
  pathLength
};

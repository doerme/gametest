'use strict';

const SYMBOLS = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
  V: 'v',
  L: 'l',
  CIRCLE: 'circle',
  Z: 'z',
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

function recognizeCircle(points, bounds) {
  if (points.length < 5 || bounds.width < 28 || bounds.height < 28) {
    return SYMBOLS.UNKNOWN;
  }

  const ratio = bounds.width / bounds.height;
  const maxSide = Math.max(bounds.width, bounds.height);
  const perimeter = 2 * (bounds.width + bounds.height);
  if (ratio < 0.5 || ratio > 1.9) {
    return SYMBOLS.UNKNOWN;
  }

  // Let players leave a visible gap when drawing a quick ring gesture.
  if (pointDistance(points[0], points[points.length - 1]) > maxSide * 0.84) {
    return SYMBOLS.UNKNOWN;
  }

  if (pathLength(points) < perimeter * 0.48) {
    return SYMBOLS.UNKNOWN;
  }

  const turn = angularTravel(points, bounds);
  if (Math.abs(turn.signed) < Math.PI * 1.16 || Math.abs(turn.signed) < turn.total * 0.58) {
    return SYMBOLS.UNKNOWN;
  }

  return SYMBOLS.CIRCLE;
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

function recognize(points) {
  const simplified = simplify(points);
  if (simplified.length < 2) {
    return SYMBOLS.UNKNOWN;
  }

  const bounds = getBounds(simplified);
  if (pathLength(simplified) < 24) {
    return SYMBOLS.UNKNOWN;
  }

  const circle = recognizeCircle(simplified, bounds);
  if (circle !== SYMBOLS.UNKNOWN) {
    return circle;
  }

  const zShape = recognizeZShape(simplified, bounds);
  if (zShape !== SYMBOLS.UNKNOWN) {
    return zShape;
  }

  const lShape = recognizeLShape(simplified, bounds);
  if (lShape !== SYMBOLS.UNKNOWN) {
    return lShape;
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

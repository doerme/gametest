'use strict';

const GAP = 6;
const RELEASE_MARGIN = 12;
const RELEASE_DELAY = 0.18;
const RETURN_RATE = 6;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const rectangle = (point, item) => ({ x: point.x - item.width / 2, y: point.y - item.height / 2, width: item.width, height: item.height });
function overlaps(a, b, gap = GAP) {
  return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x
    && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
}

class BadgeLayout {
  constructor() { this.entries = new Map(); this.nextOrder = 0; }

  clear() { this.entries.clear(); this.nextOrder = 0; }

  update(items, bounds, obstacles, dt = 1 / 60) {
    const live = new Set(items.map((item) => item.key));
    this.entries.forEach((entry, key) => { if (!live.has(key)) this.entries.delete(key); });
    items.forEach((item) => {
      if (!this.entries.has(item.key)) this.entries.set(item.key, { order: this.nextOrder++ });
    });
    const occupied = [];
    const positions = new Map();
    const elapsed = Math.max(0, Math.min(0.1, dt));
    // Keep priority for each visible enemy instead of swapping rows when two
    // animated world positions cross between frames.
    items.slice().sort((a, b) => this.entries.get(a.key).order - this.entries.get(b.key).order).forEach((item) => {
      const previous = this.entries.get(item.key);
      const minX = bounds.left + item.width / 2; const maxX = Math.max(minX, bounds.right - item.width / 2);
      const minY = bounds.top + item.height / 2; const maxY = Math.max(minY, bounds.bottom - item.height / 2);
      const constrain = (p) => ({ x: clamp(p.x, minX, maxX), y: clamp(p.y, minY, maxY) });
      const natural = constrain(item);
      const blockers = obstacles.concat(occupied);
      let preferred = natural;
      if (previous.position) {
        // Carry the previous avoidance offset with the head. Release only when
        // the natural position has stayed clearly free, then ease back to it.
        const carried = constrain({ x: previous.position.x + natural.x - previous.natural.x, y: previous.position.y + natural.y - previous.natural.y });
        const clear = !blockers.some((r) => overlaps(rectangle(natural, item), r, GAP + RELEASE_MARGIN));
        previous.clearTime = clear ? (previous.clearTime || 0) + elapsed : 0;
        const alpha = previous.clearTime >= RELEASE_DELAY ? 1 - Math.exp(-RETURN_RATE * elapsed) : 0;
        preferred = { x: carried.x + (natural.x - carried.x) * alpha, y: carried.y + (natural.y - carried.y) * alpha };
      }
      let position = preferred;
      if (blockers.some((r) => overlaps(rectangle(preferred, item), r))) {
        // Exact obstacle edges give continuous sliding, replacing jumps of an
        // entire badge height. Always protect fixed controls, even in a crowd.
        const xs = [preferred.x, natural.x, minX, maxX]; const ys = [preferred.y, natural.y, minY, maxY];
        blockers.forEach((r) => {
          xs.push(r.x - item.width / 2 - GAP, r.x + r.width + item.width / 2 + GAP);
          ys.push(r.y - item.height / 2 - GAP, r.y + r.height + item.height / 2 + GAP);
        });
        let best = Infinity;
        for (const x of new Set(xs.map((v) => clamp(v, minX, maxX)))) {
          for (const y of new Set(ys.map((v) => clamp(v, minY, maxY)))) {
            const candidate = { x, y }; const rect = rectangle(candidate, item);
            if (obstacles.some((r) => overlaps(rect, r))) continue;
            const collisions = occupied.filter((r) => overlaps(rect, r)).length;
            const score = collisions * 1e7 + (x - preferred.x) ** 2 + (y - preferred.y) ** 2
              + 0.02 * ((x - natural.x) ** 2 + (y - natural.y) ** 2);
            if (score < best) { best = score; position = candidate; }
          }
        }
      }
      occupied.push(rectangle(position, item));
      previous.position = position; previous.natural = natural;
      positions.set(item.key, position);
    });
    return positions;
  }
}

module.exports = BadgeLayout;

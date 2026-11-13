'use strict';
const { getCharacter } = require('./Characters');
const paths = new Map();
const ARITY = { M: 2, L: 2, Q: 4, C: 6, Z: 0 };

function commands(path) {
  if (!paths.has(path)) {
    const tokens = path.match(/[MLQCZ]|-?\d+(?:\.\d+)?/g);
    const result = [];
    for (let i = 0; i < tokens.length;) {
      const type = tokens[i++];
      const count = ARITY[type];
      if (count === undefined) throw new Error('Unsupported character path: ' + type);
      result.push([type, ...tokens.slice(i, i + count).map(Number)]);
      i += count;
    }
    paths.set(path, result);
  }
  return paths.get(path);
}

function drawCharacter(ctx, character, x, y, size, strokeColor) {
  const entry = getCharacter(character);
  if (!entry) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 1024, -size / 1024); ctx.translate(0, -900);
  entry.strokes.forEach((path, index) => {
    ctx.beginPath();
    commands(path).forEach(([type, ...values]) => {
      if (type === 'M') ctx.moveTo(...values);
      else if (type === 'L') ctx.lineTo(...values);
      else if (type === 'Q') ctx.quadraticCurveTo(...values);
      else if (type === 'C') ctx.bezierCurveTo(...values);
      else ctx.closePath();
    });
    ctx.fillStyle = typeof strokeColor === 'function' ? strokeColor(index) : strokeColor;
    ctx.fill();
  });
  ctx.restore();
}

module.exports = { drawCharacter, commands };

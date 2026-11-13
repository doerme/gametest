'use strict';

function getHanziLayout(width, height) {
  const size = Math.min(224, width - 112, height * 0.31);
  const board = { x: (width - size) / 2, y: height - size - 71, width: size, height: size };
  // One shared layout defines drawing, hit testing and gameplay coordinates.
  return { board, panel: { x: 12, y: board.y - 51, width: width - 24, height: size + 90 }, heroY: (board.y - 78) / height };
}
function contains(rect, point) {
  return !!point && point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}
module.exports = { getHanziLayout, contains };

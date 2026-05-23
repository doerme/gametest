'use strict';

function getAudioToggleBounds(width) {
  return {
    x: width - 91,
    y: 128,
    width: 75,
    height: 34
  };
}

function isAudioToggleHit(width, point) {
  if (!point) {
    return false;
  }

  const button = getAudioToggleBounds(width);
  return (
    point.x >= button.x &&
    point.x <= button.x + button.width &&
    point.y >= button.y &&
    point.y <= button.y + button.height
  );
}

module.exports = {
  getAudioToggleBounds,
  isAudioToggleHit
};

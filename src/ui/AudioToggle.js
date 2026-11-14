'use strict';

function getAudioToggleBounds(width) {
  return {
    x: width - 76,
    y: 98,
    width: 60,
    height: 28
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

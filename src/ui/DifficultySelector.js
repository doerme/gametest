'use strict';

const DIFFICULTY_MODES = {
  NORMAL: 'normal',
  PLUS_ONE: 'plus-one'
};

const DIFFICULTIES = {
  normal: {
    id: DIFFICULTY_MODES.NORMAL,
    label: '普通难度',
    detail: '标准速度',
    timeScale: 1
  },
  'plus-one': {
    id: DIFFICULTY_MODES.PLUS_ONE,
    label: '+1 难度',
    detail: '速度 +50%',
    timeScale: 1.5
  }
};

function getDifficulty(mode) {
  return DIFFICULTIES[mode] || null;
}

function getDifficultyButtons(width, height) {
  const buttonWidth = Math.min(288, width - 48);
  const buttonHeight = 58;
  const x = (width - buttonWidth) * 0.5;
  const startY = height * 0.53;
  const gap = 14;

  return [DIFFICULTY_MODES.NORMAL, DIFFICULTY_MODES.PLUS_ONE].map((mode, index) => {
    const difficulty = getDifficulty(mode);
    return {
      mode,
      label: difficulty.label,
      detail: difficulty.detail,
      x,
      y: startY + index * (buttonHeight + gap),
      width: buttonWidth,
      height: buttonHeight
    };
  });
}

function findDifficultyAtPoint(width, height, point) {
  if (!point) {
    return null;
  }

  const buttons = getDifficultyButtons(width, height);
  for (let i = 0; i < buttons.length; i += 1) {
    const button = buttons[i];
    if (
      point.x >= button.x &&
      point.x <= button.x + button.width &&
      point.y >= button.y &&
      point.y <= button.y + button.height
    ) {
      return button.mode;
    }
  }

  return null;
}

module.exports = {
  DIFFICULTY_MODES,
  getDifficulty,
  getDifficultyButtons,
  findDifficultyAtPoint
};

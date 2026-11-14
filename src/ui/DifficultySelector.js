'use strict';
const GAME_MODES = require('../core/GameMode');
const { contains } = require('./HanziLayout');
const { getCurriculum } = require('../hanzi/Curricula');

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

function getStartButtons(width, height) {
  const buttons = getDifficultyButtons(width, height);
  return [
    { ...buttons[0], mode: GAME_MODES.HANZI, gameMode: GAME_MODES.HANZI, label: '开始汉字模式', detail: '选择字库' },
    { ...buttons[1], mode: GAME_MODES.SYMBOL, gameMode: GAME_MODES.SYMBOL, label: '经典模式', detail: '画符闯关' }
  ];
}

function getSelectionLayout(width, height, buttons = getStartButtons(width, height)) {
  const last = buttons[buttons.length - 1];
  const bottom = Math.max(height * 0.78, last.y + last.height + 18);
  return {
    buttons,
    panel: { x: 16, y: height * 0.18, width: width - 32, height: bottom - height * 0.18 }
  };
}

function findStartAtPoint(width, height, point) {
  return getStartButtons(width, height).find((button) => contains(button, point)) || null;
}

function getContinueButton(width, height, gameMode = GAME_MODES.HANZI, speed = 1, curriculumId) {
  const curriculum = curriculumId && getCurriculum(curriculumId);
  return { ...getDifficultyButtons(width, height)[0], label: '继续下一关', detail: (gameMode === GAME_MODES.HANZI ? curriculum ? curriculum.label.replace('学期', '') : '汉字描红' : '经典模式') + ' · ' + speed.toFixed(2) + '×' };
}

module.exports = {
  DIFFICULTY_MODES,
  getDifficulty,
  getDifficultyButtons,
  findDifficultyAtPoint,
  getStartButtons,
  getSelectionLayout,
  findStartAtPoint,
  getContinueButton
};

'use strict';

const { contains } = require('./HanziLayout');
const MIN_SPEED = 0.5;
const MAX_SPEED = 2;
const SPEED_STEP = 0.25;
const DEFAULT_SPEED = 1;

function getSpeedControl(width, { open = false, hintVisible = false } = {}) {
  const bounds = { x: 16, y: 98, width: 88, height: 28 };
  const hitBounds = { x: bounds.x - 4, y: bounds.y - 4, width: bounds.width + 8, height: bounds.height + 8 };
  // Leave enough room beside the panel for a complete Hanzi/progress badge,
  // even on a 320px screen with the writing board directly below it.
  const panel = open ? { x: bounds.x, y: bounds.y + bounds.height + 8, width: Math.min(216, width - 136), height: 112 } : null;
  const buttonWidth = panel ? (panel.width - 24 - 56) / 2 : 0;
  return {
    bounds,
    hitBounds,
    panel,
    hint: hintVisible && !open ? { x: bounds.x, y: bounds.y + bounds.height + 8, width: 184, height: 30 } : null,
    minus: panel ? { x: panel.x + 12, y: panel.y + 48, width: buttonWidth, height: 36 } : null,
    display: panel ? { x: panel.x + 12 + buttonWidth, y: panel.y + 48, width: 56, height: 36 } : null,
    plus: panel ? { x: panel.x + panel.width - 12 - buttonWidth, y: panel.y + 48, width: buttonWidth, height: 36 } : null
  };
}

function findSpeedDirectionAtPoint(width, point, options = {}) {
  if (!options.open) return null;
  const control = getSpeedControl(width, options);
  if (contains(control.minus, point)) return -1;
  if (contains(control.plus, point)) return 1;
  return null;
}

function isSpeedControlHit(width, point, options = {}) {
  const { hitBounds, panel, hint } = getSpeedControl(width, options);
  return [hitBounds, panel, hint].some((rect) => rect && contains(rect, point));
}

function formatSpeed(speed) { return String(speed) + '×'; }

module.exports = { MIN_SPEED, MAX_SPEED, SPEED_STEP, DEFAULT_SPEED, getSpeedControl, findSpeedDirectionAtPoint, isSpeedControlHit, formatSpeed };

'use strict';

const { contains } = require('./HanziLayout');
const MIN_SPEED = 0.5;
const MAX_SPEED = 2;
const SPEED_STEP = 0.25;
const DEFAULT_SPEED = 1;

function getSpeedControl(width) {
  const bounds = { x: 16, y: 96, width: Math.min(148, width - 108), height: 32 };
  return {
    bounds,
    minus: { x: bounds.x, y: bounds.y, width: 32, height: bounds.height },
    display: { x: bounds.x + 32, y: bounds.y, width: bounds.width - 64, height: bounds.height },
    plus: { x: bounds.x + bounds.width - 32, y: bounds.y, width: 32, height: bounds.height }
  };
}

function findSpeedDirectionAtPoint(width, point) {
  const control = getSpeedControl(width);
  if (contains(control.minus, point)) return -1;
  if (contains(control.plus, point)) return 1;
  return null;
}

function isSpeedControlHit(width, point) { return contains(getSpeedControl(width).bounds, point); }

module.exports = { MIN_SPEED, MAX_SPEED, SPEED_STEP, DEFAULT_SPEED, getSpeedControl, findSpeedDirectionAtPoint, isSpeedControlHit };

'use strict';

const writingBudget = (strokeCount) => 3 + 2 * strokeCount;
const spawnInterval = (baseInterval, previousStrokeCount) => Math.max(baseInterval * 2, writingBudget(previousStrokeCount));
function movementSpeed(baseSpeed, distanceToCollision, strokeCount) {
  return Math.min(baseSpeed * 0.5, Math.max(0, distanceToCollision) / (1.5 * writingBudget(strokeCount)));
}
const sceneScale = (strokeCount) => Math.min(0.5, 5 / writingBudget(strokeCount));

module.exports = { writingBudget, spawnInterval, movementSpeed, sceneScale, MAX_ENEMIES: 2, FREEZE_DURATION: 3 };

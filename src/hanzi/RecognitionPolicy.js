'use strict';

module.exports = Object.freeze({
  samples: 48,
  maxInputSamples: 256,
  smoothingPasses: 2,
  smoothingWeights: Object.freeze([1, 2, 3, 2, 1]),
  minimumPixels: 3,
  boundaryTolerance: 0.08,
  minimumEndpointTolerance: 0.12,
  maximumEndpointTolerance: 0.22,
  endpointLengthFactor: 0.28,
  minimumLengthRatio: 0.35,
  maximumLengthRatio: 2.5,
  maximumTrajectoryDistance: 0.14,
  directionMargin: 0.006,
  directionLengthFactor: 0.08,
  maximumRawDeviation: 0.28,
  maximumRawLengthRatio: 6,
  rawJitterAllowancePerPoint: 0.09,
  simplifyTolerance: 0.055,
  drawnSimplifyTolerance: 0.015,
  majorArmLength: 0.2,
  majorTurnDegrees: 55,
  drawnArmLength: 0.05,
  drawnTurnDegrees: 25,
  retryProtection: 3,
  successFeedbackDuration: 1.2
});

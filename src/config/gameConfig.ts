import type { RuleSet } from '../core/RuleSet';

export const defaultRuleSet: RuleSet = {
  board: { width: 6, height: 6 },
  minChainLength: 3,
  maxTileValue: 10,
  startingSpawnWeights: {
    1: 32,
    2: 28,
    3: 20,
    4: 11,
    5: 6,
    6: 2,
    7: 1,
    8: 0,
    9: 0,
    10: 0,
  },
  refillSpawnWeights: {
    1: 27,
    2: 27,
    3: 20,
    4: 14,
    5: 7,
    6: 3,
    7: 2,
    8: 0,
    9: 0,
    10: 0,
  },
  boardHealthSpawnTuning: {
    lowValueThreshold: 3,
    lowValueRatioTrigger: 0.72,
    refillSpawnWeightsWhenClogged: {
      1: 19,
      2: 21,
      3: 20,
      4: 18,
      5: 11,
      6: 7,
      7: 4,
      8: 0,
      9: 0,
      10: 0,
    },
  },
  bridgeScarcityTuning: {
    enabled: true,
    monitorValues: [2, 3, 4],
    lowCountThreshold: 1,
    zeroCountBoost: {
      2: 2.0,
      3: 1.9,
      4: 1.2,
    },
    lowCountBoost: {
      2: 1.35,
      3: 1.3,
    },
    suppressionWhenMissing: {
      2: {
        1: 0.8,
        3: 0.9,
      },
      3: {
        2: 0.85,
        4: 0.95,
      },
    },
    maxMultiplier: 2.5,
    minMultiplierRatio: 0.1,
  },
  scoring: {
    lengthMultiplierStep: 0.2,
    cascadeMultiplierBase: 1.1,
  },
};

import type { RuleSet } from '../core/RuleSet';

export const defaultRuleSet: RuleSet = {
  board: { width: 6, height: 6 },
  minChainLength: 3,
  maxTileValue: 10,
  spawnWeights: {
    1: 35,
    2: 30,
    3: 20,
    4: 8,
    5: 4,
    6: 2,
    7: 1,
    8: 0,
    9: 0,
    10: 0,
  },
  scoring: {
    lengthMultiplierStep: 0.2,
    cascadeMultiplierBase: 1.1,
  },
};

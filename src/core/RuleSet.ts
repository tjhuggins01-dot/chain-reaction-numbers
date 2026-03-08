export interface SpawnWeights {
  [value: number]: number;
}

export interface BoardHealthSpawnTuning {
  lowValueThreshold: number;
  lowValueRatioTrigger: number;
  refillSpawnWeightsWhenClogged: SpawnWeights;
}

export interface RuleSet {
  board: { width: number; height: number };
  minChainLength: number;
  maxTileValue: number;
  startingSpawnWeights: SpawnWeights;
  refillSpawnWeights: SpawnWeights;
  boardHealthSpawnTuning?: BoardHealthSpawnTuning;
  scoring: {
    lengthMultiplierStep: number;
    cascadeMultiplierBase: number;
  };
}

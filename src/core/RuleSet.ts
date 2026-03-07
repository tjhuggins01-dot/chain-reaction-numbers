export interface SpawnWeights {
  [value: number]: number;
}

export interface RuleSet {
  board: { width: number; height: number };
  minChainLength: number;
  maxTileValue: number;
  spawnWeights: SpawnWeights;
  scoring: {
    lengthMultiplierStep: number;
    cascadeMultiplierBase: number;
  };
}

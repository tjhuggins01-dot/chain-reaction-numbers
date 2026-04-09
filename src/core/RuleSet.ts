export interface SpawnWeights {
  [value: number]: number;
}

export interface BoardHealthSpawnTuning {
  lowValueThreshold: number;
  lowValueRatioTrigger: number;
  refillSpawnWeightsWhenClogged: SpawnWeights;
}

export interface BridgeScarcityTuning {
  enabled: boolean;
  monitorValues?: number[];
  lowCountThreshold?: number;
  zeroCountBoost: Record<number, number>;
  lowCountBoost: Record<number, number>;
  suppressionWhenMissing: Record<number, Record<number, number>>;
  maxMultiplier: number;
  minMultiplierRatio: number;
}

export interface RuleSet {
  board: { width: number; height: number };
  minChainLength: number;
  maxTileValue: number;
  startingSpawnWeights: SpawnWeights;
  refillSpawnWeights: SpawnWeights;
  boardHealthSpawnTuning?: BoardHealthSpawnTuning;
  bridgeScarcityTuning?: BridgeScarcityTuning;
  scoring: {
    lengthMultiplierStep: number;
    cascadeMultiplierBase: number;
  };
}

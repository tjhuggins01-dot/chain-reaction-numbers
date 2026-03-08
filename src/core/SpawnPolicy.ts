import { getTile, type BoardState } from './BoardState';
import type { RuleSet, SpawnWeights } from './RuleSet';
import type { Rng } from './Rng';

export interface SpawnContext {
  phase: 'start' | 'refill';
  board: BoardState;
}

export interface SpawnPolicy {
  nextValue(rng: Rng, rules: RuleSet, context: SpawnContext): number;
}

function selectWeights(rules: RuleSet, context: SpawnContext): SpawnWeights {
  if (context.phase === 'start') {
    return rules.startingSpawnWeights;
  }

  const refillWeights = rules.refillSpawnWeights;
  const tuning = rules.boardHealthSpawnTuning;
  if (!tuning) return refillWeights;

  const totalTiles = context.board.width * context.board.height;
  let lowValueTiles = 0;

  for (let y = 0; y < context.board.height; y += 1) {
    for (let x = 0; x < context.board.width; x += 1) {
      const tile = getTile(context.board, { x, y });
      if (!tile) continue;
      if (tile.value > 0 && tile.value <= tuning.lowValueThreshold) {
        lowValueTiles += 1;
      }
    }
  }

  const ratio = totalTiles > 0 ? lowValueTiles / totalTiles : 0;
  if (ratio >= tuning.lowValueRatioTrigger) {
    return tuning.refillSpawnWeightsWhenClogged;
  }

  return refillWeights;
}

export class WeightedSpawnPolicy implements SpawnPolicy {
  nextValue(rng: Rng, rules: RuleSet, context: SpawnContext): number {
    const activeWeights = selectWeights(rules, context);
    const entries = Object.entries(activeWeights)
      .map(([k, w]) => ({ value: Number(k), weight: w }))
      .filter((x) => x.weight > 0 && x.value >= 1 && x.value <= rules.maxTileValue)
      .sort((a, b) => a.value - b.value);

    if (entries.length === 0) return 1;

    const total = entries.reduce((sum, item) => sum + item.weight, 0);
    let threshold = rng.nextFloat() * total;
    for (const entry of entries) {
      threshold -= entry.weight;
      if (threshold <= 0) return entry.value;
    }
    return entries[entries.length - 1]?.value ?? 1;
  }
}

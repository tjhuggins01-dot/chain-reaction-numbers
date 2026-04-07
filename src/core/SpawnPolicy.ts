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
  let baseWeights: SpawnWeights = refillWeights;
  const tuning = rules.boardHealthSpawnTuning;
  if (tuning) {
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
      baseWeights = tuning.refillSpawnWeightsWhenClogged;
    }
  }

  const counts = Array.from({ length: rules.maxTileValue + 1 }, () => 0);
  for (let y = 0; y < context.board.height; y += 1) {
    for (let x = 0; x < context.board.width; x += 1) {
      const tile = getTile(context.board, { x, y });
      if (!tile) continue;
      if (tile.value >= 1 && tile.value <= rules.maxTileValue) {
        counts[tile.value] += 1;
      }
    }
  }

  const adjustedWeights: SpawnWeights = { ...baseWeights };
  for (let value = 1; value <= rules.maxTileValue; value += 1) {
    adjustedWeights[value] = baseWeights[value] ?? 0;
  }

  const multiplyWeight = (value: number, factor: number): void => {
    adjustedWeights[value] = (adjustedWeights[value] ?? 0) * factor;
  };

  const c2 = counts[2] ?? 0;
  const c3 = counts[3] ?? 0;
  const c4 = counts[4] ?? 0;

  if (c2 === 0) {
    multiplyWeight(2, 2.0);
    multiplyWeight(1, 0.7);
    multiplyWeight(3, 0.8);
  } else if (c2 === 1) {
    multiplyWeight(2, 1.35);
  }

  if (c3 === 0) {
    multiplyWeight(3, 1.9);
    multiplyWeight(2, 0.75);
    multiplyWeight(4, 0.9);
  } else if (c3 === 1) {
    multiplyWeight(3, 1.3);
  }

  if (c4 === 0 && c3 <= 1) {
    multiplyWeight(4, 1.2);
  }

  for (let value = 1; value <= rules.maxTileValue; value += 1) {
    const baseWeight = baseWeights[value] ?? 0;
    if (baseWeight === 0) {
      adjustedWeights[value] = 0;
      continue;
    }
    const minWeight = 0.1 * baseWeight;
    const maxWeight = 2.5 * baseWeight;
    const adjusted = adjustedWeights[value] ?? 0;
    adjustedWeights[value] = Math.min(maxWeight, Math.max(minWeight, adjusted));
  }

  return adjustedWeights;
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

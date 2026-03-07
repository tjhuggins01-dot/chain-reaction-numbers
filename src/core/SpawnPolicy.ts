import type { RuleSet } from './RuleSet';
import type { Rng } from './Rng';

export interface SpawnPolicy {
  nextValue(rng: Rng, rules: RuleSet): number;
}

export class WeightedSpawnPolicy implements SpawnPolicy {
  nextValue(rng: Rng, rules: RuleSet): number {
    const entries = Object.entries(rules.spawnWeights)
      .map(([k, w]) => ({ value: Number(k), weight: w }))
      .filter((x) => x.weight > 0)
      .sort((a, b) => a.value - b.value);
    const total = entries.reduce((sum, item) => sum + item.weight, 0);
    let threshold = rng.nextFloat() * total;
    for (const entry of entries) {
      threshold -= entry.weight;
      if (threshold <= 0) return entry.value;
    }
    return entries[entries.length - 1]?.value ?? 1;
  }
}

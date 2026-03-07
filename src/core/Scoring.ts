import type { RuleSet } from './RuleSet';

export function calculateStepScore(values: number[], cascadeDepth: number, rules: RuleSet): number {
  const baseScore = values.reduce((sum, n) => sum + n, 0);
  const lengthMultiplier = 1 + rules.scoring.lengthMultiplierStep * (values.length - rules.minChainLength);
  const cascadeMultiplier = rules.scoring.cascadeMultiplierBase ** cascadeDepth;
  return Math.floor(baseScore * lengthMultiplier * cascadeMultiplier);
}

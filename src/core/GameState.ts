import type { BoardState } from './BoardState';
import type { RuleSet } from './RuleSet';

export interface GameState {
  board: BoardState;
  score: number;
  seed: number;
  runActive: boolean;
  cascadeDepth: number;
  rules: RuleSet;
}

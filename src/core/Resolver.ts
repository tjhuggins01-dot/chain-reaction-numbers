import type { Position } from './Position';

export interface MoveResult {
  boardChanged: boolean;
  cascade: CascadeResult;
  scoreDelta: number;
  upgradedAt?: Position;
}

export interface CascadeResult {
  steps: number;
}

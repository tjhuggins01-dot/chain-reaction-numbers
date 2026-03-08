import type { Path } from './Path';
import type { BoardState } from './BoardState';

export type EngineEvent =
  | { type: 'RunStarted'; seed: number; board: BoardState }
  | { type: 'PathCommitted'; path: Path }
  | {
      type: 'ChainResolved';
      removedValues: number[];
      removedPositions: { x: number; y: number }[];
      upgradedValue: number;
      upgradedPosition: { x: number; y: number };
      cascadeDepth: number;
    }
  | { type: 'CascadeTriggered'; depth: number }
  | { type: 'GravityApplied'; cascadeDepth: number }
  | { type: 'BoardRefilled'; board: BoardState; cascadeDepth: number }
  | { type: 'ScoreChanged'; score: number; delta: number }
  | { type: 'RunEnded'; finalScore: number; reason: 'no_moves' }
  | { type: 'InvalidPathRejected'; reason: string };

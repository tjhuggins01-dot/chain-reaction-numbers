import type { GameState } from '../core/GameState';

export interface Objective {
  id: string;
  description: string;
  isCompleted(state: GameState): boolean;
}

export interface GameMode {
  id: string;
  name: string;
  objectives: Objective[];
  isRunOver(state: GameState): { over: boolean; reason?: 'no_moves' };
}

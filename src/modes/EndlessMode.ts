import { hasAnyValidMove } from '../core/MoveScanner';
import type { GameState } from '../core/GameState';
import type { GameMode } from './GameMode';

export const endlessMode: GameMode = {
  id: 'endless',
  name: 'Endless',
  objectives: [],
  isRunOver(state: GameState) {
    if (!hasAnyValidMove(state.board, state.rules)) {
      return { over: true, reason: 'no_moves' };
    }
    return { over: false };
  },
};

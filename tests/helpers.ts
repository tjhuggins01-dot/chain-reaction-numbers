import { GameEngine } from '../src/core/GameEngine';
import type { BoardState } from '../src/core/BoardState';
import type { RuleSet } from '../src/core/RuleSet';
import type { GameState } from '../src/core/GameState';
import { endlessMode } from '../src/modes/EndlessMode';
import { defaultRuleSet } from '../src/config/gameConfig';

export function boardFromValues(values: number[][]): BoardState {
  return {
    width: values[0].length,
    height: values.length,
    tiles: values.map((row, y) =>
      row.map((value, x) => ({
        id: `t-${x}-${y}`,
        value,
        effects: [],
        position: { x, y },
      })),
    ),
  };
}

export function boardValues(board: BoardState): number[][] {
  return board.tiles.map((row) => row.map((tile) => tile.value));
}

export function makeDeterministicRuleSet(board: { width: number; height: number }): RuleSet {
  const deterministicWeights = {
    1: 100,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: 0,
    9: 0,
    10: 0,
  };

  return {
    ...defaultRuleSet,
    board,
    startingSpawnWeights: deterministicWeights,
    refillSpawnWeights: deterministicWeights,
  };
}

export function createEngineWithBoard(board: BoardState, rules: RuleSet, seed = 1): GameEngine {
  const state: GameState = {
    board,
    score: 0,
    seed,
    runActive: true,
    cascadeDepth: 0,
    rules,
  };
  return new GameEngine(state, endlessMode);
}

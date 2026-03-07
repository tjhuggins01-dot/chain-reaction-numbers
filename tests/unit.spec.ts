import { describe, expect, test } from 'vitest';
import { validatePath } from '../src/core/PathValidator';
import { defaultRuleSet } from '../src/config/gameConfig';
import { boardFromValues } from './helpers';
import { applyGravity } from '../src/core/GravityResolver';
import { refillBoard } from '../src/core/RefillResolver';
import { SeededRng } from '../src/core/Rng';
import { WeightedSpawnPolicy } from '../src/core/SpawnPolicy';
import { calculateStepScore } from '../src/core/Scoring';
import { hasAnyValidMove } from '../src/core/MoveScanner';
import { GameEngine } from '../src/core/GameEngine';
import { endlessMode } from '../src/modes/EndlessMode';

describe('path validation', () => {
  const board = boardFromValues([
    [1, 2, 3],
    [2, 3, 4],
    [3, 4, 5],
  ]);

  test('adjacency validation', () => {
    const result = validatePath(board, [{ x: 0, y: 0 }, { x: 2, y: 2 }, { x: 2, y: 1 }], defaultRuleSet);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('not_adjacent');
  });

  test('ascending validation', () => {
    const result = validatePath(board, [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }], defaultRuleSet);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('not_ascending');
  });

  test('no-repeat and min length', () => {
    const repeated = validatePath(board, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 }], defaultRuleSet);
    expect(repeated.reason).toBe('repeated');
    const short = validatePath(board, [{ x: 0, y: 0 }, { x: 1, y: 0 }], defaultRuleSet);
    expect(short.reason).toBe('too_short');
  });
});

describe('resolvers and scoring', () => {
  test('gravity correctness', () => {
    const board = boardFromValues([
      [1, 0],
      [2, 0],
      [0, 4],
    ]);
    const out = applyGravity(board);
    expect(out.tiles.map((r) => r.map((t) => t.value))).toEqual([
      [0, 0],
      [1, 0],
      [2, 4],
    ]);
  });

  test('refill and deterministic seeded generation', () => {
    const board = boardFromValues([
      [0, 0],
      [0, 0],
    ]);
    const p = new WeightedSpawnPolicy();
    const a = refillBoard(board, defaultRuleSet, p, new SeededRng(42));
    const b = refillBoard(board, defaultRuleSet, p, new SeededRng(42));
    expect(a.tiles.map((r) => r.map((t) => t.value))).toEqual(b.tiles.map((r) => r.map((t) => t.value)));
  });

  test('score calculation', () => {
    expect(calculateStepScore([1, 2, 3], 0, defaultRuleSet)).toBe(6);
  });
});

describe('engine behavior', () => {
  test('game-over detection on dead board', () => {
    const board = boardFromValues([
      [10, 10, 10],
      [10, 10, 10],
      [10, 10, 10],
    ]);
    expect(hasAnyValidMove(board, defaultRuleSet)).toBe(false);
  });

  test('command/event flow and replay determinism', () => {
    const engineA = GameEngine.create(100, defaultRuleSet, endlessMode);
    const engineB = GameEngine.create(100, defaultRuleSet, endlessMode);
    engineA.dispatch({ type: 'StartRun' });
    engineB.dispatch({ type: 'StartRun' });

    const state = engineA.getState();
    const path = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ];
    const maybe = validatePath(state.board, path, defaultRuleSet);
    if (maybe.valid) {
      engineA.dispatch({ type: 'CommitPath', path });
      engineB.dispatch({ type: 'CommitPath', path });
    }

    expect(engineA.getState()).toEqual(engineB.getState());
    expect(engineA.getReplayLog().initialSeed).toBe(100);
  });
});

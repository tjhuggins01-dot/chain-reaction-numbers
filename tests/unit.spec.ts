import { describe, expect, test } from 'vitest';
import { validatePath } from '../src/core/PathValidator';
import { defaultRuleSet } from '../src/config/gameConfig';
import { boardFromValues } from './helpers';
import { applyGravity } from '../src/core/GravityResolver';
import { refillBoard } from '../src/core/RefillResolver';
import { SeededRng } from '../src/core/Rng';
import { WeightedSpawnPolicy } from '../src/core/SpawnPolicy';
import { calculateStepScore } from '../src/core/Scoring';
import { findAnyValidPath, findLocalCascadePath, hasAnyValidMove } from '../src/core/MoveScanner';
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

  test('valid adjacent ascending path is accepted', () => {
    const result = validatePath(board, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }], defaultRuleSet);
    expect(result.valid).toBe(true);
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
    expect(a.tiles.every((row) => row.every((tile) => tile.value >= 1 && tile.value <= defaultRuleSet.maxTileValue))).toBe(true);
  });

  test('score calculation', () => {
    expect(calculateStepScore([1, 2, 3], 0, defaultRuleSet)).toBe(6);
  });

  test('upgraded tile placement and event payload fidelity', () => {
    const engine = GameEngine.create(101, defaultRuleSet, endlessMode);
    engine.dispatch({ type: 'StartRun' });
    const state = engine.getState();
    const path = findAnyValidPath(state.board, state.rules);
    expect(path).not.toBeNull();
    if (!path) return;

    const last = path[path.length - 1];
    const lastValue = state.board.tiles[last.y][last.x].value;
    const events = engine.dispatch({ type: 'CommitPath', path });
    const resolved = events.find((e) => e.type === 'ChainResolved');
    expect(resolved?.type).toBe('ChainResolved');
    if (!resolved || resolved.type !== 'ChainResolved') return;

    expect(resolved.removedValues).toEqual(path.map((p) => state.board.tiles[p.y][p.x].value));
    expect(resolved.upgradedValue).toBe(Math.min(lastValue + 1, defaultRuleSet.maxTileValue));
  });

  test('invalid path does not mutate board or score', () => {
    const engine = GameEngine.create(222, defaultRuleSet, endlessMode);
    engine.dispatch({ type: 'StartRun' });
    const before = engine.getState();

    const events = engine.dispatch({
      type: 'CommitPath',
      path: [{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 4, y: 4 }],
    });

    expect(events.some((event) => event.type === 'InvalidPathRejected')).toBe(true);
    expect(engine.getState()).toEqual(before);
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
    const path = findAnyValidPath(state.board, defaultRuleSet);
    if (path) {
      engineA.dispatch({ type: 'CommitPath', path });
      engineB.dispatch({ type: 'CommitPath', path });
    }

    expect(engineA.getState()).toEqual(engineB.getState());
    expect(engineA.getReplayLog().initialSeed).toBe(100);
    expect(engineA.getReplayLog().commands[0]?.type).toBe('StartRun');
  });

  test('seeded initialization is deterministic', () => {
    const engineA = GameEngine.create(321, defaultRuleSet, endlessMode);
    const engineB = GameEngine.create(321, defaultRuleSet, endlessMode);

    engineA.dispatch({ type: 'StartRun' });
    engineB.dispatch({ type: 'StartRun' });

    expect(engineA.getState().board).toEqual(engineB.getState().board);
  });

  test('local cascade discovery can find paths ending at pivot', () => {
    const board = boardFromValues([
      [1, 2, 3],
      [2, 3, 4],
      [3, 4, 5],
    ]);

    const path = findLocalCascadePath(board, { x: 2, y: 2 }, defaultRuleSet);
    expect(path).not.toBeNull();
    if (!path) return;
    expect(path[path.length - 1]).toEqual({ x: 2, y: 2 });
    expect(path.length).toBeGreaterThanOrEqual(defaultRuleSet.minChainLength);
  });
});

import { describe, expect, test } from 'vitest';
import { calculateStepScore } from '../src/core/Scoring';
import { validatePath } from '../src/core/PathValidator';
import { findLocalCascadePath, hasAnyValidMove } from '../src/core/MoveScanner';
import { defaultRuleSet } from '../src/config/gameConfig';
import { boardFromValues, boardValues, createEngineWithBoard, makeDeterministicRuleSet } from './helpers';

describe('targeted rules coverage', () => {
  test('diagonal + exact +1 ascending path is valid', () => {
    const board = boardFromValues([
      [1, 9, 9],
      [9, 2, 9],
      [9, 9, 3],
    ]);

    const result = validatePath(board, [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }], defaultRuleSet);
    expect(result.valid).toBe(true);
  });

  test('ascending rule rejects leaps greater than +1', () => {
    const board = boardFromValues([
      [1, 2, 4],
      [9, 9, 9],
      [9, 9, 9],
    ]);

    const result = validatePath(board, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }], defaultRuleSet);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('not_ascending');
  });

  test('local cascade path eligibility requires including pivot', () => {
    const board = boardFromValues([
      [1, 2, 3],
      [2, 3, 4],
      [3, 4, 5],
    ]);

    const path = findLocalCascadePath(board, { x: 2, y: 2 }, defaultRuleSet);
    expect(path).not.toBeNull();
    if (!path) return;
    expect(path.some((point) => point.x === 2 && point.y === 2)).toBe(true);
  });
});

describe('engine integration and regression safety', () => {
  test('full move resolution pipeline applies removal, gravity, refill, endpoint upgrade and score (non-cascade)', () => {
    const rules = makeDeterministicRuleSet({ width: 3, height: 3 });
    const board = boardFromValues([
      [1, 2, 3],
      [4, 9, 9],
      [9, 9, 9],
    ]);

    const engine = createEngineWithBoard(board, rules, 10);
    const events = engine.dispatch({ type: 'CommitPath', path: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }] });

    const chainEvents = events.filter((event) => event.type === 'ChainResolved');
    expect(chainEvents).toHaveLength(1);
    const chain = chainEvents[0];
    expect(chain.removedPositions).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }]);
    expect(chain.upgradedPosition).toEqual({ x: 2, y: 0 });

    const refillEvents = events.filter((event) => event.type === 'BoardRefilled');
    expect(refillEvents).toHaveLength(1);
    expect(refillEvents[0].cascadeDepth).toBe(0);
    expect(engine.getState().score).toBe(calculateStepScore([1, 2, 3], 0, rules));
    expect(boardValues(engine.getState().board)).toEqual([
      [1, 1, 4],
      [4, 9, 9],
      [9, 9, 9],
    ]);
  });

  test('full move + single cascade emits exactly two chain resolutions', () => {
    const rules = makeDeterministicRuleSet({ width: 5, height: 4 });
    const board = boardFromValues([
      [9, 9, 5, 6, 9],
      [1, 2, 3, 9, 1],
      [9, 9, 9, 9, 2],
      [9, 9, 9, 9, 3],
    ]);

    const engine = createEngineWithBoard(board, rules, 11);
    const events = engine.dispatch({ type: 'CommitPath', path: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }] });

    const chainEvents = events.filter((event) => event.type === 'ChainResolved');
    expect(chainEvents).toHaveLength(2);
    expect(chainEvents.map((event) => event.cascadeDepth)).toEqual([0, 1]);
  });

  test('full move + multi-step cascade applies depth scoring', () => {
    const rules = makeDeterministicRuleSet({ width: 5, height: 5 });
    const board = boardFromValues([
      [1, 9, 9, 9, 9],
      [2, 9, 9, 9, 9],
      [3, 9, 9, 9, 9],
      [0, 5, 6, 8, 9],
      [9, 9, 9, 9, 9],
    ]);

    const engine = createEngineWithBoard(board, rules, 12);
    const events = engine.dispatch({ type: 'CommitPath', path: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }] });

    const chainEvents = events.filter((event) => event.type === 'ChainResolved');
    expect(chainEvents).toHaveLength(3);
    expect(chainEvents.map((event) => event.removedValues)).toEqual([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ]);

    const expected =
      calculateStepScore([1, 2, 3], 0, rules)
      + calculateStepScore([4, 5, 6], 1, rules)
      + calculateStepScore([7, 8, 9], 2, rules);
    expect(engine.getState().score).toBe(expected);
  });

  test('invalid move leaves board and score unchanged, and emits rejection', () => {
    const rules = makeDeterministicRuleSet({ width: 3, height: 3 });
    const board = boardFromValues([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ]);

    const engine = createEngineWithBoard(board, rules, 5);
    const before = engine.getState();
    const events = engine.dispatch({ type: 'CommitPath', path: [{ x: 0, y: 0 }, { x: 2, y: 2 }, { x: 2, y: 1 }] });

    expect(events.some((event) => event.type === 'InvalidPathRejected')).toBe(true);
    expect(engine.getState()).toEqual(before);
  });

  test('endless mode fail-state detection ends run on dead board', () => {
    const rules = {
      ...makeDeterministicRuleSet({ width: 3, height: 3 }),
      maxTileValue: 3,
      spawnWeights: { 1: 0, 2: 0, 3: 100 },
    };
    const board = boardFromValues([
      [1, 2, 3],
      [3, 3, 3],
      [3, 3, 3],
    ]);

    const engine = createEngineWithBoard(board, rules, 19);
    const events = engine.dispatch({ type: 'CommitPath', path: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }] });

    expect(hasAnyValidMove(engine.getState().board, rules)).toBe(false);
    expect(events.some((event) => event.type === 'RunEnded' && event.reason === 'no_moves')).toBe(true);
    expect(engine.getState().runActive).toBe(false);
  });
});

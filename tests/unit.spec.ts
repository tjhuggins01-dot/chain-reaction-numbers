import { describe, expect, test } from 'vitest';
import { validatePath } from '../src/core/PathValidator';
import { defaultRuleSet } from '../src/config/gameConfig';
import { boardFromValues } from './helpers';
import { applyGravity } from '../src/core/GravityResolver';
import { refillBoard } from '../src/core/RefillResolver';
import { SeededRng } from '../src/core/Rng';
import { WeightedSpawnPolicy } from '../src/core/SpawnPolicy';
import { calculateStepScore } from '../src/core/Scoring';
import { countPlayableStarts, findAnyValidPath, findBestValidPath, findLocalCascadePath, hasAnyValidMove } from '../src/core/MoveScanner';
import { GameEngine } from '../src/core/GameEngine';
import { endlessMode } from '../src/modes/EndlessMode';
import { resolveLocalCascades } from '../src/core/CascadeResolver';
import type { RuleSet } from '../src/core/RuleSet';

const fixedSpawnPolicy = {
  nextValue: () => 10,
};

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

  test('local cascade discovery can find paths containing pivot', () => {
    const board = boardFromValues([
      [1, 2, 3],
      [2, 3, 4],
      [3, 4, 5],
    ]);

    const path = findLocalCascadePath(board, { x: 2, y: 2 }, defaultRuleSet);
    expect(path).not.toBeNull();
    if (!path) return;
    expect(path.some((point) => point.x === 2 && point.y === 2)).toBe(true);
    expect(path.length).toBeGreaterThanOrEqual(defaultRuleSet.minChainLength);
  });

  test('local cascade tie-break prefers the longest path first', () => {
    const board = boardFromValues([
      [2, 3, 6],
      [1, 4, 5],
      [9, 9, 9],
    ]);

    const path = findLocalCascadePath(board, { x: 1, y: 1 }, defaultRuleSet);
    expect(path).toEqual([
      { x: 0, y: 1 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 0 },
    ]);
  });

  test('local cascade tie-break prefers lexicographically smallest coordinates when fully tied', () => {
    const board = boardFromValues([
      [6, 9, 6],
      [5, 4, 5],
      [9, 9, 9],
    ]);

    const path = findLocalCascadePath(board, { x: 1, y: 1 }, defaultRuleSet);
    expect(path).toEqual([
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: 0, y: 0 },
    ]);
  });
});



describe('simulation helpers', () => {
  test('best-path selector prefers longer chains with deterministic tie-breaks', () => {
    const board = boardFromValues([
      [1, 2, 3, 4],
      [2, 3, 4, 5],
      [7, 8, 9, 9],
      [9, 9, 9, 9],
    ]);

    expect(findBestValidPath(board, defaultRuleSet)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 3, y: 1 },
    ]);
  });

  test('countPlayableStarts reports how many starts have at least one valid chain', () => {
    const board = boardFromValues([
      [1, 2, 3],
      [2, 3, 4],
      [8, 8, 8],
    ]);

    expect(countPlayableStarts(board, defaultRuleSet)).toBe(3);
  });
});

describe('spawn balance tuning', () => {
  test('board-health refill weights apply when low-value congestion is extreme', () => {
    const rules = {
      ...defaultRuleSet,
      refillSpawnWeights: { 1: 100, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 },
      boardHealthSpawnTuning: {
        lowValueThreshold: 3,
        lowValueRatioTrigger: 0.5,
        refillSpawnWeightsWhenClogged: { 1: 0, 2: 0, 3: 0, 4: 100, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 },
      },
    };
    const board = boardFromValues([
      [1, 1],
      [0, 0],
    ]);

    const out = refillBoard(board, rules, new WeightedSpawnPolicy(), new SeededRng(2), 'tile', 'refill');
    expect(out.tiles[1][0].value).toBe(4);
    expect(out.tiles[1][1].value).toBe(4);
  });
});

describe('bridge scarcity refill adjustments', () => {
  function makeBaselineRules(refillSpawnWeights: RuleSet['refillSpawnWeights']): RuleSet {
    return {
      ...defaultRuleSet,
      maxTileValue: 3,
      boardHealthSpawnTuning: undefined,
      refillSpawnWeights,
      bridgeScarcityTuning: {
        enabled: false,
        monitorValues: [2, 3],
        zeroCountBoost: { 2: 1, 3: 1 },
        lowCountBoost: { 2: 1, 3: 1 },
        suppressionWhenMissing: { 2: {}, 3: {} },
        maxMultiplier: 100,
        minMultiplierRatio: 0.01,
      },
    };
  }

  test('missing 3s can still spawn 3 under deterministic refill despite 2-heavy baseline weights', () => {
    const board = boardFromValues([
      [2, 2],
      [2, 0],
    ]);
    const baselineRules = makeBaselineRules({ 1: 0, 2: 1000, 3: 1 });
    const adjustedRules: RuleSet = {
      ...baselineRules,
      bridgeScarcityTuning: {
        enabled: true,
        monitorValues: [3],
        zeroCountBoost: { 3: 500 },
        lowCountBoost: {},
        suppressionWhenMissing: {},
        maxMultiplier: 1000,
        minMultiplierRatio: 0,
      },
    };

    const baseline = refillBoard(board, baselineRules, new WeightedSpawnPolicy(), new SeededRng(1327));
    const adjusted = refillBoard(board, adjustedRules, new WeightedSpawnPolicy(), new SeededRng(1327));

    expect(baseline.tiles[1][1].value).toBe(2);
    expect(adjusted.tiles[1][1].value).toBe(3);
  });

  test('missing 2s boosts 2 and suppresses 1 relative to baseline under the same seed', () => {
    const board = boardFromValues([
      [1, 3],
      [1, 0],
    ]);
    const baselineRules = makeBaselineRules({ 1: 10, 2: 9, 3: 0 });
    const adjustedRules: RuleSet = {
      ...baselineRules,
      bridgeScarcityTuning: {
        enabled: true,
        monitorValues: [2],
        zeroCountBoost: { 2: 10 },
        lowCountBoost: {},
        suppressionWhenMissing: { 2: { 1: 0.1 } },
        maxMultiplier: 100,
        minMultiplierRatio: 0.01,
      },
    };

    const baseline = refillBoard(board, baselineRules, new WeightedSpawnPolicy(), new SeededRng(165));
    const adjusted = refillBoard(board, adjustedRules, new WeightedSpawnPolicy(), new SeededRng(165));

    expect(baseline.tiles[1][1].value).toBe(1);
    expect(adjusted.tiles[1][1].value).toBe(2);
  });

  test('healthy bridge values produce identical refill results vs baseline under the same seed', () => {
    const board = boardFromValues([
      [2, 3, 2],
      [3, 1, 0],
    ]);
    const baselineRules = makeBaselineRules({ 1: 10, 2: 9, 3: 0 });
    const adjustedRules: RuleSet = {
      ...baselineRules,
      bridgeScarcityTuning: {
        enabled: true,
        monitorValues: [2, 3],
        zeroCountBoost: { 2: 10, 3: 10 },
        lowCountBoost: { 2: 5, 3: 5 },
        suppressionWhenMissing: { 2: { 1: 0.1 }, 3: { 2: 0.1 } },
        maxMultiplier: 100,
        minMultiplierRatio: 0.01,
      },
    };

    const baseline = refillBoard(board, baselineRules, new WeightedSpawnPolicy(), new SeededRng(165));
    const adjusted = refillBoard(board, adjustedRules, new WeightedSpawnPolicy(), new SeededRng(165));

    expect(adjusted.tiles[1][2].value).toBe(baseline.tiles[1][2].value);
  });
});


describe('local cascade resolution', () => {
  test('does not cascade when no pivot-based follow-up exists', () => {
    const board = boardFromValues([
      [9, 9, 9, 9],
      [1, 2, 3, 9],
      [9, 9, 9, 9],
      [9, 9, 9, 9],
    ]);

    const result = resolveLocalCascades(
      board,
      [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
      defaultRuleSet,
      fixedSpawnPolicy,
      new SeededRng(7),
    );

    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]?.depth).toBe(0);
  });

  test('single-step local cascade triggers correctly and remains local-only', () => {
    const board = boardFromValues([
      [9, 9, 5, 6, 9],
      [1, 2, 3, 9, 1],
      [9, 9, 9, 9, 2],
      [9, 9, 9, 9, 3],
    ]);

    const result = resolveLocalCascades(
      board,
      [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
      defaultRuleSet,
      fixedSpawnPolicy,
      new SeededRng(11),
    );

    expect(result.steps).toHaveLength(2);
    expect(result.steps.map((step) => step.depth)).toEqual([0, 1]);
    expect(result.steps[1]?.removedValues).toEqual([4, 5, 6]);
  });

  test('multi-step local cascade tracks pivot and applies depth scoring', () => {
    const board = boardFromValues([
      [1, 9, 9, 9, 9],
      [2, 9, 9, 9, 9],
      [3, 9, 9, 9, 9],
      [0, 5, 6, 8, 9],
      [9, 9, 9, 9, 9],
    ]);

    const result = resolveLocalCascades(
      board,
      [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }],
      defaultRuleSet,
      fixedSpawnPolicy,
      new SeededRng(3),
    );

    expect(result.steps).toHaveLength(3);
    expect(result.steps.map((step) => step.depth)).toEqual([0, 1, 2]);
    expect(result.steps[0]?.pivot).toEqual({ x: 0, y: 3 });
    expect(result.steps[1]?.pivot).toEqual({ x: 2, y: 3 });
    expect(result.steps[2]?.pivot).toEqual({ x: 2, y: 3 });

    expect(result.steps[0]?.scoreDelta).toBe(calculateStepScore([1, 2, 3], 0, defaultRuleSet));
    expect(result.steps[1]?.scoreDelta).toBe(calculateStepScore([4, 5, 6], 1, defaultRuleSet));
    expect(result.steps[2]?.scoreDelta).toBe(calculateStepScore([7, 8, 9], 2, defaultRuleSet));
  });

  test('same seed and initial move produce deterministic cascade sequence', () => {
    const board = boardFromValues([
      [1, 9, 9, 9, 9],
      [2, 9, 9, 9, 9],
      [3, 9, 9, 9, 9],
      [0, 5, 6, 8, 9],
      [9, 9, 9, 9, 9],
    ]);
    const initialPath = [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }];

    const a = resolveLocalCascades(board, initialPath, defaultRuleSet, fixedSpawnPolicy, new SeededRng(99));
    const b = resolveLocalCascades(board, initialPath, defaultRuleSet, fixedSpawnPolicy, new SeededRng(99));

    expect(a).toEqual(b);
  });
});

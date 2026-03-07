import { describe, expect, test } from 'vitest';
import { GameEngine } from '../src/core/GameEngine';
import { defaultRuleSet } from '../src/config/gameConfig';
import { endlessMode } from '../src/modes/EndlessMode';
import { findAnyValidPath, hasAnyValidMove } from '../src/core/MoveScanner';

describe('integration', () => {
  test('endless mode run loop starts with moves available', () => {
    const engine = GameEngine.create(123, defaultRuleSet, endlessMode);
    engine.dispatch({ type: 'StartRun' });
    const state = engine.getState();
    expect(state.runActive).toBe(true);
    expect(hasAnyValidMove(state.board, state.rules)).toBe(true);
  });

  test('snapshot-like board and score regression', () => {
    const seed = 999;
    const engine = GameEngine.create(seed, defaultRuleSet, endlessMode);
    engine.dispatch({ type: 'StartRun' });

    const pathA = findAnyValidPath(engine.getState().board, defaultRuleSet);
    expect(pathA).not.toBeNull();
    if (!pathA) return;
    engine.dispatch({ type: 'CommitPath', path: pathA });

    const pathB = findAnyValidPath(engine.getState().board, defaultRuleSet);
    expect(pathB).not.toBeNull();
    if (!pathB) return;
    engine.dispatch({ type: 'CommitPath', path: pathB });

    const final = engine.getState();

    const replayEngine = GameEngine.create(seed, defaultRuleSet, endlessMode);
    replayEngine.dispatch({ type: 'StartRun' });
    replayEngine.dispatch({ type: 'CommitPath', path: pathA });
    replayEngine.dispatch({ type: 'CommitPath', path: pathB });

    expect(replayEngine.getState()).toEqual(final);
    expect(final.score).toBeGreaterThan(0);
    expect(final.board.tiles).toHaveLength(defaultRuleSet.board.height);
    expect(final.board.tiles[0]).toHaveLength(defaultRuleSet.board.width);
  });

  test('command/event flow includes cascade and scoring events on valid commit', () => {
    const engine = GameEngine.create(1234, defaultRuleSet, endlessMode);
    engine.dispatch({ type: 'StartRun' });
    const path = findAnyValidPath(engine.getState().board, defaultRuleSet);
    expect(path).not.toBeNull();
    if (!path) return;

    const events = engine.dispatch({ type: 'CommitPath', path });
    expect(events.some((e) => e.type === 'PathCommitted')).toBe(true);
    expect(events.some((e) => e.type === 'ChainResolved')).toBe(true);
    expect(events.some((e) => e.type === 'ScoreChanged')).toBe(true);
  });
});

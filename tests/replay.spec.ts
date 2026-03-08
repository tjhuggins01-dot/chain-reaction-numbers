import { describe, expect, test } from 'vitest';
import { GameEngine } from '../src/core/GameEngine';
import { defaultRuleSet } from '../src/config/gameConfig';
import { endlessMode } from '../src/modes/EndlessMode';
import { findAnyValidPath } from '../src/core/MoveScanner';

function commitAutoPath(engine: GameEngine): void {
  const path = findAnyValidPath(engine.getState().board, defaultRuleSet);
  expect(path).not.toBeNull();
  if (!path) return;
  engine.dispatch({ type: 'CommitPath', path });
}

describe('replay determinism', () => {
  test('same seed and same command sequence produce identical board, score, and cascade events', () => {
    const seed = 8080;
    const a = GameEngine.create(seed, defaultRuleSet, endlessMode);
    const b = GameEngine.create(seed, defaultRuleSet, endlessMode);

    a.dispatch({ type: 'StartRun' });
    b.dispatch({ type: 'StartRun' });

    for (let step = 0; step < 3; step += 1) {
      const path = findAnyValidPath(a.getState().board, defaultRuleSet);
      expect(path).not.toBeNull();
      if (!path) return;
      a.dispatch({ type: 'CommitPath', path });
      b.dispatch({ type: 'CommitPath', path });
    }

    expect(a.getState().board).toEqual(b.getState().board);
    expect(a.getState().score).toEqual(b.getState().score);

    const cascadeA = a.getReplayLog().events.filter((event) => event.type === 'ChainResolved');
    const cascadeB = b.getReplayLog().events.filter((event) => event.type === 'ChainResolved');
    expect(cascadeA).toEqual(cascadeB);
  });

  test('invalid commands do not introduce nondeterministic drift', () => {
    const seed = 707;
    const a = GameEngine.create(seed, defaultRuleSet, endlessMode);
    const b = GameEngine.create(seed, defaultRuleSet, endlessMode);

    a.dispatch({ type: 'StartRun' });
    b.dispatch({ type: 'StartRun' });

    for (let i = 0; i < 2; i += 1) {
      a.dispatch({ type: 'CommitPath', path: [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 20 }] });
      b.dispatch({ type: 'CommitPath', path: [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 20 }] });
    }

    commitAutoPath(a);
    commitAutoPath(b);

    expect(a.getState()).toEqual(b.getState());
    expect(a.getReplayLog().events.filter((event) => event.type === 'InvalidPathRejected').length).toBe(2);
  });

  test('reset runs record a concrete replayable seed', () => {
    const engine = GameEngine.create(55, defaultRuleSet, endlessMode);
    engine.dispatch({ type: 'StartRun' });
    engine.dispatch({ type: 'ResetRun' });

    const replay = engine.getReplayLog();
    const reset = replay.commands.find((command) => command.type === 'ResetRun');
    expect(reset?.type).toBe('ResetRun');
    if (!reset || reset.type !== 'ResetRun') return;
    expect(reset.seed).toBeTypeOf('number');

    const replayed = GameEngine.create(1, defaultRuleSet, endlessMode);
    replayed.dispatch({ type: 'StartRun', seed: replay.initialSeed });
    replayed.dispatch(reset);

    expect(replayed.getState().board).toEqual(engine.getState().board);
  });
});

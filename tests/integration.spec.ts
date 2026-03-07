import { describe, expect, test } from 'vitest';
import { GameEngine } from '../src/core/GameEngine';
import { defaultRuleSet } from '../src/config/gameConfig';
import { endlessMode } from '../src/modes/EndlessMode';
import { hasAnyValidMove } from '../src/core/MoveScanner';

describe('integration', () => {
  test('endless mode run loop starts with moves available', () => {
    const engine = GameEngine.create(123, defaultRuleSet, endlessMode);
    engine.dispatch({ type: 'StartRun' });
    const state = engine.getState();
    expect(state.runActive).toBe(true);
    expect(hasAnyValidMove(state.board, state.rules)).toBe(true);
  });

  test('snapshot-like board and score regression', () => {
    const engine = GameEngine.create(999, defaultRuleSet, endlessMode);
    engine.dispatch({ type: 'StartRun' });
    const before = engine.getState();
    const scoreBefore = before.score;
    expect(before.board.tiles[0][0].value).toBeGreaterThanOrEqual(1);
    expect(scoreBefore).toBe(0);
  });
});

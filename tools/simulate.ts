import { defaultRuleSet } from '../src/config/gameConfig';
import { GameEngine } from '../src/core/GameEngine';
import { hasAnyValidMove } from '../src/core/MoveScanner';
import { endlessMode } from '../src/modes/EndlessMode';

function run(seed: number): { score: number; moves: number; dead: boolean } {
  const engine = GameEngine.create(seed, defaultRuleSet, endlessMode);
  engine.dispatch({ type: 'StartRun' });
  let moves = 0;

  while (moves < 50) {
    const state = engine.getState();
    if (!hasAnyValidMove(state.board, state.rules)) break;
    let committed = false;
    for (let y = 0; y < state.board.height && !committed; y += 1) {
      for (let x = 0; x < state.board.width && !committed; x += 1) {
        const p = [
          { x, y },
          { x: Math.min(x + 1, state.board.width - 1), y },
          { x: Math.min(x + 2, state.board.width - 1), y },
        ];
        const events = engine.dispatch({ type: 'CommitPath', path: p });
        committed = events.some((e) => e.type === 'PathCommitted');
      }
    }
    if (!committed) break;
    moves += 1;
  }

  const finalState = engine.getState();
  return { score: finalState.score, moves, dead: !hasAnyValidMove(finalState.board, finalState.rules) };
}

const runs = Array.from({ length: 10 }, (_, i) => run(i + 1));
const avgScore = runs.reduce((s, r) => s + r.score, 0) / runs.length;
const avgMoves = runs.reduce((s, r) => s + r.moves, 0) / runs.length;
const deadBoards = runs.filter((r) => r.dead).length;
console.log(JSON.stringify({ avgScore, avgMoves, deadBoards, cascadeFrequency: 'tracked via replay events' }, null, 2));

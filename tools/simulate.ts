import { defaultRuleSet } from '../src/config/gameConfig';
import { GameEngine } from '../src/core/GameEngine';
import { findAnyValidPath, hasAnyValidMove } from '../src/core/MoveScanner';
import { endlessMode } from '../src/modes/EndlessMode';

function run(seed: number): { score: number; moves: number; dead: boolean; cascades: number } {
  const engine = GameEngine.create(seed, defaultRuleSet, endlessMode);
  engine.dispatch({ type: 'StartRun' });
  let moves = 0;
  let cascades = 0;

  while (moves < 50) {
    const state = engine.getState();
    if (!hasAnyValidMove(state.board, state.rules)) break;
    const path = findAnyValidPath(state.board, state.rules);
    if (!path) break;
    const events = engine.dispatch({ type: 'CommitPath', path });
    cascades += events.filter((e) => e.type === 'CascadeTriggered').length;
    moves += 1;
  }

  const finalState = engine.getState();
  return { score: finalState.score, moves, dead: !hasAnyValidMove(finalState.board, finalState.rules), cascades };
}

const runs = Array.from({ length: 10 }, (_, i) => run(i + 1));
const avgScore = runs.reduce((s, r) => s + r.score, 0) / runs.length;
const avgMoves = runs.reduce((s, r) => s + r.moves, 0) / runs.length;
const deadBoards = runs.filter((r) => r.dead).length;
const totalMoves = runs.reduce((s, r) => s + r.moves, 0);
const totalCascades = runs.reduce((s, r) => s + r.cascades, 0);
const cascadeFrequency = totalMoves > 0 ? totalCascades / totalMoves : 0;
console.log(JSON.stringify({ avgScore, avgMoves, deadBoards, cascadeFrequency }, null, 2));

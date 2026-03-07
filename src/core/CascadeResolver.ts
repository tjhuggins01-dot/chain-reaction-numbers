import { getTile, type BoardState } from './BoardState';
import { applyGravity } from './GravityResolver';
import { findLocalCascadePath } from './MoveScanner';
import { refillBoard } from './RefillResolver';
import type { Position } from './Position';
import type { RuleSet } from './RuleSet';
import { calculateStepScore } from './Scoring';
import type { SpawnPolicy } from './SpawnPolicy';
import type { Rng } from './Rng';

interface CascadeStep {
  board: BoardState;
  scoreDelta: number;
  depth: number;
}

function resolveSingle(board: BoardState, path: Position[], rules: RuleSet, depth: number): { board: BoardState; score: number; pivot: Position } {
  const values: number[] = [];
  const pivot = path[path.length - 1];
  const tiles = board.tiles.map((row) => row.map((t) => ({ ...t, position: { ...t.position }, effects: [...t.effects] })));

  for (const pos of path) {
    const tile = getTile(board, pos);
    if (!tile) continue;
    values.push(tile.value);
    tiles[pos.y][pos.x] = { id: `empty-${pos.x}-${pos.y}`, value: 0, effects: [], position: { ...pos } };
  }

  const lastValue = values[values.length - 1] ?? 1;
  tiles[pivot.y][pivot.x] = {
    id: `upgraded-${pivot.x}-${pivot.y}-${depth}`,
    value: Math.min(lastValue + 1, rules.maxTileValue),
    effects: [],
    position: { ...pivot },
  };

  const score = calculateStepScore(values, depth, rules);
  return { board: { width: board.width, height: board.height, tiles }, score, pivot };
}

export function resolveLocalCascades(
  board: BoardState,
  initialPath: Position[],
  rules: RuleSet,
  spawnPolicy: SpawnPolicy,
  rng: Rng,
): { board: BoardState; steps: CascadeStep[] } {
  const steps: CascadeStep[] = [];
  let depth = 0;
  let currentPath: Position[] | null = initialPath;
  let currentBoard = board;
  let pivot: Position = initialPath[initialPath.length - 1];

  while (currentPath) {
    const resolved = resolveSingle(currentBoard, currentPath, rules, depth);
    currentBoard = applyGravity(resolved.board);
    currentBoard = refillBoard(currentBoard, rules, spawnPolicy, rng);
    steps.push({ board: currentBoard, scoreDelta: resolved.score, depth });

    pivot = resolved.pivot;
    currentPath = findLocalCascadePath(currentBoard, pivot);
    depth += 1;
  }

  return { board: currentBoard, steps };
}

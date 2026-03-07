import { getTile, inBounds, type BoardState } from './BoardState';
import { isAdjacent, positionKey, type Position } from './Position';
import type { RuleSet } from './RuleSet';

const directions = [-1, 0, 1];

function neighbors(board: BoardState, pos: Position): Position[] {
  const out: Position[] = [];
  for (const dy of directions) {
    for (const dx of directions) {
      if (dx === 0 && dy === 0) continue;
      const next = { x: pos.x + dx, y: pos.y + dy };
      if (inBounds(board, next) && isAdjacent(pos, next)) out.push(next);
    }
  }
  return out;
}

function dfs(board: BoardState, current: Position, length: number, seen: Set<string>, rules: RuleSet): boolean {
  if (length >= rules.minChainLength) return true;
  const currentTile = getTile(board, current);
  if (!currentTile) return false;
  for (const next of neighbors(board, current)) {
    const key = positionKey(next);
    if (seen.has(key)) continue;
    const nextTile = getTile(board, next);
    if (!nextTile || nextTile.value !== currentTile.value + 1) continue;
    seen.add(key);
    if (dfs(board, next, length + 1, seen, rules)) return true;
    seen.delete(key);
  }
  return false;
}

function dfsPath(
  board: BoardState,
  current: Position,
  seen: Set<string>,
  path: Position[],
  rules: RuleSet,
): Position[] | null {
  if (path.length >= rules.minChainLength) return [...path];
  const currentTile = getTile(board, current);
  if (!currentTile) return null;

  for (const next of neighbors(board, current)) {
    const key = positionKey(next);
    if (seen.has(key)) continue;
    const nextTile = getTile(board, next);
    if (!nextTile || nextTile.value !== currentTile.value + 1) continue;
    seen.add(key);
    path.push(next);
    const found = dfsPath(board, next, seen, path, rules);
    if (found) return found;
    path.pop();
    seen.delete(key);
  }

  return null;
}

export function hasAnyValidMove(board: BoardState, rules: RuleSet): boolean {
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const start = { x, y };
      if (dfs(board, start, 1, new Set([positionKey(start)]), rules)) return true;
    }
  }
  return false;
}

export function findAnyValidPath(board: BoardState, rules: RuleSet): Position[] | null {
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const start = { x, y };
      const key = positionKey(start);
      const found = dfsPath(board, start, new Set([key]), [start], rules);
      if (found) return found;
    }
  }
  return null;
}

export function findLocalCascadePath(board: BoardState, pivot: Position): Position[] | null {
  const pivotTile = getTile(board, pivot);
  if (!pivotTile) return null;

  interface Step {
    pos: Position;
    path: Position[];
    seen: Set<string>;
  }

  const stack: Step[] = [{ pos: pivot, path: [pivot], seen: new Set([positionKey(pivot)]) }];

  while (stack.length > 0) {
    const step = stack.pop();
    if (!step) break;
    const tile = getTile(board, step.pos);
    if (!tile) continue;

    if (step.path.length >= 3) {
      const reversed = [...step.path].reverse();
      return reversed;
    }

    for (const next of neighbors(board, step.pos)) {
      const key = positionKey(next);
      if (step.seen.has(key)) continue;
      const nextTile = getTile(board, next);
      if (!nextTile || nextTile.value !== tile.value - 1) continue;
      stack.push({
        pos: next,
        path: [...step.path, next],
        seen: new Set([...step.seen, key]),
      });
    }
  }

  return null;
}

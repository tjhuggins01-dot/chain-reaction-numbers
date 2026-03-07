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

export function hasAnyValidMove(board: BoardState, rules: RuleSet): boolean {
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const start = { x, y };
      if (dfs(board, start, 1, new Set([positionKey(start)]), rules)) return true;
    }
  }
  return false;
}

export function findLocalCascadePath(board: BoardState, pivot: Position, rules: RuleSet): Position[] | null {
  const pivotTile = getTile(board, pivot);
  if (!pivotTile) return null;

  for (const n1 of neighbors(board, pivot)) {
    const t1 = getTile(board, n1);
    if (!t1 || t1.value !== pivotTile.value - 1) continue;
    for (const n2 of neighbors(board, n1)) {
      if (n2.x === pivot.x && n2.y === pivot.y) continue;
      const t2 = getTile(board, n2);
      if (!t2 || t2.value !== t1.value - 1) continue;
      return [n2, n1, pivot];
    }
  }

  return null;
}

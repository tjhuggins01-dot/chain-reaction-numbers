import { getTile, inBounds, type BoardState } from './BoardState';
import { isAdjacent, positionKey, type Position } from './Position';
import type { Path } from './Path';
import type { RuleSet } from './RuleSet';

export interface PathValidationResult {
  valid: boolean;
  reason?: 'out_of_bounds' | 'not_adjacent' | 'not_ascending' | 'repeated' | 'too_short' | 'missing_tile';
}

function assertAscending(board: BoardState, prev: Position, next: Position): boolean {
  const prevTile = getTile(board, prev);
  const nextTile = getTile(board, next);
  if (!prevTile || !nextTile) return false;
  if (prevTile.value <= 0 || nextTile.value <= 0) return false;
  return nextTile.value === prevTile.value + 1;
}

export function validatePath(board: BoardState, path: Path, rules: RuleSet): PathValidationResult {
  if (path.length < rules.minChainLength) return { valid: false, reason: 'too_short' };
  const seen = new Set<string>();

  for (let i = 0; i < path.length; i += 1) {
    const pos = path[i];
    if (!inBounds(board, pos)) return { valid: false, reason: 'out_of_bounds' };
    const tile = getTile(board, pos);
    if (!tile || tile.value <= 0 || tile.value > rules.maxTileValue) return { valid: false, reason: 'missing_tile' };
    const key = positionKey(pos);
    if (seen.has(key)) return { valid: false, reason: 'repeated' };
    seen.add(key);

    if (i > 0) {
      const prev = path[i - 1];
      if (!isAdjacent(prev, pos)) return { valid: false, reason: 'not_adjacent' };
      if (!assertAscending(board, prev, pos)) return { valid: false, reason: 'not_ascending' };
    }
  }

  return { valid: true };
}

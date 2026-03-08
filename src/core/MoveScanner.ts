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

function orderedNeighbors(board: BoardState, pos: Position): Position[] {
  return neighbors(board, pos).sort((a, b) => (a.y - b.y) || (a.x - b.x));
}

function dfs(board: BoardState, current: Position, length: number, seen: Set<string>, rules: RuleSet): boolean {
  if (length >= rules.minChainLength) return true;
  const currentTile = getTile(board, current);
  if (!currentTile || currentTile.value <= 0 || currentTile.value > rules.maxTileValue) return false;
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
  if (!currentTile || currentTile.value <= 0 || currentTile.value > rules.maxTileValue) return null;

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

function comparePathLexicographic(a: Position[], b: Position[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    if (a[i].y !== b[i].y) return a[i].y - b[i].y;
    if (a[i].x !== b[i].x) return a[i].x - b[i].x;
  }
  return a.length - b.length;
}

function shouldReplaceBest(board: BoardState, candidate: Position[], best: Position[] | null): boolean {
  if (!best) return true;
  if (candidate.length !== best.length) return candidate.length > best.length;

  const candidateEndpoint = getTile(board, candidate[candidate.length - 1])?.value ?? 0;
  const bestEndpoint = getTile(board, best[best.length - 1])?.value ?? 0;
  if (candidateEndpoint !== bestEndpoint) return candidateEndpoint > bestEndpoint;

  return comparePathLexicographic(candidate, best) < 0;
}

function collectPathsFrom(
  board: BoardState,
  current: Position,
  seen: Set<string>,
  path: Position[],
  rules: RuleSet,
  out: Position[][],
): void {
  const currentTile = getTile(board, current);
  if (!currentTile || currentTile.value <= 0 || currentTile.value > rules.maxTileValue) return;

  if (path.length >= rules.minChainLength) {
    out.push([...path]);
  }

  for (const next of orderedNeighbors(board, current)) {
    const key = positionKey(next);
    if (seen.has(key)) continue;
    const nextTile = getTile(board, next);
    if (!nextTile || nextTile.value !== currentTile.value + 1) continue;

    seen.add(key);
    path.push(next);
    collectPathsFrom(board, next, seen, path, rules, out);
    path.pop();
    seen.delete(key);
  }
}

export function hasAnyValidMove(board: BoardState, rules: RuleSet): boolean {
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const start = { x, y };
      const startTile = getTile(board, start);
      if (!startTile || startTile.value <= 0 || startTile.value > rules.maxTileValue) continue;
      if (dfs(board, start, 1, new Set([positionKey(start)]), rules)) return true;
    }
  }
  return false;
}

export function countPlayableStarts(board: BoardState, rules: RuleSet): number {
  let count = 0;
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const start = { x, y };
      const startTile = getTile(board, start);
      if (!startTile || startTile.value <= 0 || startTile.value > rules.maxTileValue) continue;
      if (dfs(board, start, 1, new Set([positionKey(start)]), rules)) count += 1;
    }
  }
  return count;
}

export function findAnyValidPath(board: BoardState, rules: RuleSet): Position[] | null {
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const start = { x, y };
      const startTile = getTile(board, start);
      if (!startTile || startTile.value <= 0 || startTile.value > rules.maxTileValue) continue;
      const key = positionKey(start);
      const found = dfsPath(board, start, new Set([key]), [start], rules);
      if (found) return found;
    }
  }
  return null;
}

export function findBestValidPath(board: BoardState, rules: RuleSet): Position[] | null {
  let best: Position[] | null = null;

  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const start = { x, y };
      const startTile = getTile(board, start);
      if (!startTile || startTile.value <= 0 || startTile.value > rules.maxTileValue) continue;
      const candidates: Position[][] = [];
      collectPathsFrom(board, start, new Set([positionKey(start)]), [start], rules, candidates);
      for (const candidate of candidates) {
        if (shouldReplaceBest(board, candidate, best)) {
          best = candidate;
        }
      }
    }
  }

  return best;
}

export function findLocalCascadePath(board: BoardState, pivot: Position, rules: RuleSet): Position[] | null {
  const pivotTile = getTile(board, pivot);
  if (!pivotTile || pivotTile.value <= 0 || pivotTile.value > rules.maxTileValue) return null;

  const orderedNeighbors = (pos: Position): Position[] =>
    neighbors(board, pos).sort((a, b) => (a.x - b.x) || (a.y - b.y));

  const lexCompare = (a: Position[], b: Position[]): number => {
    for (let i = 0; i < a.length; i += 1) {
      if (a[i].x !== b[i].x) return a[i].x - b[i].x;
      if (a[i].y !== b[i].y) return a[i].y - b[i].y;
    }
    return 0;
  };

  const isBetter = (candidate: Position[], currentBest: Position[] | null): boolean => {
    if (!currentBest) return true;
    if (candidate.length !== currentBest.length) return candidate.length > currentBest.length;

    const candidateEndpoint = getTile(board, candidate[candidate.length - 1])?.value ?? 0;
    const bestEndpoint = getTile(board, currentBest[currentBest.length - 1])?.value ?? 0;
    if (candidateEndpoint !== bestEndpoint) return candidateEndpoint > bestEndpoint;

    return lexCompare(candidate, currentBest) < 0;
  };

  const pivotKey = positionKey(pivot);
  let best: Position[] | null = null;

  const search = (current: Position, seen: Set<string>, path: Position[], hasPivot: boolean): void => {
    const currentTile = getTile(board, current);
    if (!currentTile || currentTile.value <= 0 || currentTile.value > rules.maxTileValue) return;

    if (hasPivot && path.length >= rules.minChainLength && isBetter(path, best)) {
      best = [...path];
    }

    for (const next of orderedNeighbors(current)) {
      const nextKey = positionKey(next);
      if (seen.has(nextKey)) continue;
      const nextTile = getTile(board, next);
      if (!nextTile || nextTile.value !== currentTile.value + 1) continue;
      seen.add(nextKey);
      path.push(next);
      search(next, seen, path, hasPivot || positionKey(next) === pivotKey);
      path.pop();
      seen.delete(nextKey);
    }
  };

  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const start = { x, y };
      const tile = getTile(board, start);
      if (!tile || tile.value <= 0 || tile.value > rules.maxTileValue) continue;
      const startKey = positionKey(start);
      search(start, new Set([startKey]), [start], startKey === pivotKey);
    }
  }

  return best;
}

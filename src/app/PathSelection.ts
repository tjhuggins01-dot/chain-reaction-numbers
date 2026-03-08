import type { BoardState } from '../core/BoardState';
import { isAdjacent, type Position } from '../core/Position';

function tileValueAt(board: BoardState, pos: Position): number {
  return board.tiles[pos.y]?.[pos.x]?.value ?? 0;
}

export function getExtendedPath(board: BoardState, currentPath: Position[], next: Position): Position[] {
  const last = currentPath[currentPath.length - 1];
  if (!last) {
    return [next];
  }

  if (last.x === next.x && last.y === next.y) {
    return currentPath;
  }

  if (currentPath.length > 1) {
    const previous = currentPath[currentPath.length - 2];
    if (previous.x === next.x && previous.y === next.y) {
      return currentPath.slice(0, -1);
    }
  }

  if (currentPath.some((p) => p.x === next.x && p.y === next.y)) {
    return currentPath;
  }

  if (!isAdjacent(last, next)) {
    return currentPath;
  }

  if (tileValueAt(board, next) !== tileValueAt(board, last) + 1) {
    return currentPath;
  }

  return [...currentPath, next];
}

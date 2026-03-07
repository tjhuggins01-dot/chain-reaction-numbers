import type { Position } from './Position';
import type { Tile } from './Tile';

export interface BoardState {
  width: number;
  height: number;
  tiles: Tile[][];
}

export function inBounds(board: BoardState, pos: Position): boolean {
  return pos.x >= 0 && pos.x < board.width && pos.y >= 0 && pos.y < board.height;
}

export function getTile(board: BoardState, pos: Position): Tile | undefined {
  if (!inBounds(board, pos)) return undefined;
  return board.tiles[pos.y][pos.x];
}

export function cloneBoard(board: BoardState): BoardState {
  return {
    width: board.width,
    height: board.height,
    tiles: board.tiles.map((row) => row.map((tile) => ({ ...tile, position: { ...tile.position }, effects: [...tile.effects] }))),
  };
}

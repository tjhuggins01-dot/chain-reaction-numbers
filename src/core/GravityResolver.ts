import type { BoardState } from './BoardState';
import type { Tile } from './Tile';

export function applyGravity(board: BoardState): BoardState {
  const tiles: (Tile | undefined)[][] = Array.from({ length: board.height }, () => Array.from({ length: board.width }));
  for (let x = 0; x < board.width; x += 1) {
    const stack: Tile[] = [];
    for (let y = board.height - 1; y >= 0; y -= 1) {
      const tile = board.tiles[y][x];
      if (tile.value > 0) stack.push(tile);
    }
    let yCursor = board.height - 1;
    for (const tile of stack) {
      tiles[yCursor][x] = { ...tile, position: { x, y: yCursor } };
      yCursor -= 1;
    }
    for (; yCursor >= 0; yCursor -= 1) {
      tiles[yCursor][x] = { id: `empty-${x}-${yCursor}`, value: 0, effects: [], position: { x, y: yCursor } };
    }
  }

  return {
    width: board.width,
    height: board.height,
    tiles: tiles as Tile[][],
  };
}

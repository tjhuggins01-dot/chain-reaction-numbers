import type { BoardState } from './BoardState';
import type { RuleSet } from './RuleSet';
import type { SpawnPolicy } from './SpawnPolicy';
import type { Rng } from './Rng';
import type { Tile } from './Tile';

export function refillBoard(
  board: BoardState,
  rules: RuleSet,
  spawnPolicy: SpawnPolicy,
  rng: Rng,
  idPrefix = 'tile',
  phase: 'start' | 'refill' = 'refill',
): BoardState {
  const tiles: Tile[][] = board.tiles.map((row) => row.map((tile) => ({ ...tile, position: { ...tile.position }, effects: [...tile.effects] })));
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      if (tiles[y][x].value === 0) {
        const value = spawnPolicy.nextValue(rng, rules, { phase, board: { width: board.width, height: board.height, tiles } });
        tiles[y][x] = { id: `${idPrefix}-${rng.next()}`, value, effects: [], position: { x, y } };
      }
    }
  }
  return { width: board.width, height: board.height, tiles };
}

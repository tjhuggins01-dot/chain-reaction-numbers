import type { Position } from './Position';

export interface TileEffect {
  type: string;
  payload?: Record<string, unknown>;
}

export interface Tile {
  id: string;
  value: number;
  position: Position;
  effects: TileEffect[];
}

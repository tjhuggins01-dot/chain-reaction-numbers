import type { BoardState } from '../src/core/BoardState';

export function boardFromValues(values: number[][]): BoardState {
  return {
    width: values[0].length,
    height: values.length,
    tiles: values.map((row, y) =>
      row.map((value, x) => ({
        id: `t-${x}-${y}`,
        value,
        effects: [],
        position: { x, y },
      })),
    ),
  };
}

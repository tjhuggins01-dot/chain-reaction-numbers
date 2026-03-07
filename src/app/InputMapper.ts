import type { Position } from '../core/Position';

export function mapCanvasPointToCell(
  px: number,
  py: number,
  canvasWidth: number,
  canvasHeight: number,
  cols: number,
  rows: number,
): Position | null {
  const cellW = canvasWidth / cols;
  const cellH = canvasHeight / rows;
  const x = Math.floor(px / cellW);
  const y = Math.floor(py / cellH);
  if (x < 0 || y < 0 || x >= cols || y >= rows) return null;
  return { x, y };
}

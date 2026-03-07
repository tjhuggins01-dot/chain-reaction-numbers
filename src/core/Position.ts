export interface Position {
  x: number;
  y: number;
}

export function positionKey(pos: Position): string {
  return `${pos.x},${pos.y}`;
}

export function isAdjacent(a: Position, b: Position): boolean {
  if (a.x === b.x && a.y === b.y) return false;
  return Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1;
}

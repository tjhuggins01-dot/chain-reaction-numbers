import type { Position } from '../core/Position';

export function shouldCommitPath(path: Position[], runActive: boolean, minPathLength: number): boolean {
  return runActive && path.length >= minPathLength;
}

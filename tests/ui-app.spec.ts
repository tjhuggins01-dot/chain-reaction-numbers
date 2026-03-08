import { describe, expect, test } from 'vitest';
import { boardFromValues } from './helpers';
import { getExtendedPath } from '../src/app/PathSelection';
import { shouldCommitPath } from '../src/app/UiGuards';

describe('UI app-layer path mapping', () => {
  const board = boardFromValues([
    [1, 2, 3],
    [2, 3, 4],
    [7, 8, 9],
  ]);

  test('extends path only for adjacent ascending steps', () => {
    const start = [{ x: 0, y: 0 }];
    const valid = getExtendedPath(board, start, { x: 1, y: 0 });
    expect(valid).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);

    const invalidGap = getExtendedPath(board, valid, { x: 2, y: 2 });
    expect(invalidGap).toEqual(valid);

    const invalidValue = getExtendedPath(board, valid, { x: 2, y: 1 });
    expect(invalidValue).toEqual(valid);
  });

  test('backtracks one step when dragging to previous cell', () => {
    const path = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ];

    const backtracked = getExtendedPath(board, path, { x: 1, y: 0 });
    expect(backtracked).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);
  });
});

describe('UI commit guards', () => {
  test('disables commit when game is over', () => {
    const path = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ];
    expect(shouldCommitPath(path, false, 3)).toBe(false);
  });

  test('requires minimum path length before commit', () => {
    const shortPath = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ];
    expect(shouldCommitPath(shortPath, true, 3)).toBe(false);
    expect(shouldCommitPath([...shortPath, { x: 2, y: 0 }], true, 3)).toBe(true);
  });
});

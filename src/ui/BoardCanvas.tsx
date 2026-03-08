import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { BoardState } from '../core/BoardState';
import type { Position } from '../core/Position';
import { mapCanvasPointToCell } from '../app/InputMapper';
import { getExtendedPath } from '../app/PathSelection';

interface Props {
  board: BoardState;
  previousBoard: BoardState | null;
  fallProgress: number;
  popProgress: number;
  minPathLength: number;
  inputEnabled: boolean;
  resolving: boolean;
  selectedPath: Position[];
  removingCells: Position[];
  upgradedCell: Position | null;
  onPathChange(path: Position[]): void;
  onCommit(path: Position[]): void;
}

const maxCanvasSize = 520;
const minCanvasSize = 140;
const reservedVerticalSpace = 300;
const horizontalBoundary = 32;
const verticalBoundary = 16;

function colorForValue(value: number): string {
  const palette = ['#111827', '#2563eb', '#0f766e', '#a16207', '#c2410c', '#dc2626', '#9333ea', '#0f766e', '#6d28d9', '#be123c', '#334155'];
  return palette[value] ?? '#111827';
}

function key(pos: Position): string {
  return `${pos.x},${pos.y}`;
}

function getViewportWidth(): number {
  return Math.floor((window.visualViewport?.width ?? window.innerWidth) - horizontalBoundary);
}

export function BoardCanvas({
  board,
  previousBoard,
  fallProgress,
  popProgress,
  minPathLength,
  inputEnabled,
  resolving,
  selectedPath,
  removingCells,
  upgradedCell,
  onPathChange,
  onCommit,
}: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [displaySize, setDisplaySize] = useState(maxCanvasSize);
  const [invalidCell, setInvalidCell] = useState<Position | null>(null);

  const selectedSet = useMemo(() => new Set(selectedPath.map((p) => key(p))), [selectedPath]);
  const removingSet = useMemo(() => new Set(removingCells.map((p) => key(p))), [removingCells]);

  useEffect(() => {
    if (!invalidCell) return;
    const t = window.setTimeout(() => setInvalidCell(null), 120);
    return () => window.clearTimeout(t);
  }, [invalidCell]);

  useEffect(() => {
    const updateSize = () => {
      const viewportWidth = getViewportWidth();
      const viewportHeight = Math.floor(window.innerHeight - reservedVerticalSpace - verticalBoundary);
      const containerWidth = Math.floor((containerRef.current?.clientWidth ?? viewportWidth) - horizontalBoundary);
      const usableWidth = Math.min(viewportWidth, containerWidth);
      const next = Math.min(maxCanvasSize, usableWidth, viewportHeight);
      const minimumSafeSize = Math.min(minCanvasSize, usableWidth);
      setDisplaySize(Math.max(minimumSafeSize, next));
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      window.removeEventListener('resize', updateSize);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const pxSize = Math.floor(displaySize * dpr);
    canvas.width = pxSize;
    canvas.height = pxSize;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cellW = displaySize / board.width;
    const cellH = displaySize / board.height;

    ctx.clearRect(0, 0, displaySize, displaySize);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, displaySize, displaySize);

    const prevById = new Map<string, Position>();
    if (previousBoard) {
      for (let y = 0; y < previousBoard.height; y += 1) {
        for (let x = 0; x < previousBoard.width; x += 1) {
          prevById.set(previousBoard.tiles[y][x].id, { x, y });
        }
      }
    }

    for (let y = 0; y < board.height; y += 1) {
      for (let x = 0; x < board.width; x += 1) {
        const tile = board.tiles[y][x];
        const tileKey = `${x},${y}`;
        const left = x * cellW;
        const top = y * cellH;

        const isSelected = selectedSet.has(tileKey);
        const isRemoving = removingSet.has(tileKey);
        const isUpgraded = upgradedCell && upgradedCell.x === x && upgradedCell.y === y;
        const isInvalid = invalidCell && invalidCell.x === x && invalidCell.y === y;

        ctx.fillStyle = isSelected ? '#fef3c7' : '#e2e8f0';
        if (isInvalid) ctx.fillStyle = '#fee2e2';
        ctx.fillRect(left + 1, top + 1, cellW - 2, cellH - 2);

        if (tile.value > 0) {
          let drawX = left + cellW / 2;
          let drawY = top + cellH / 2;
          const prev = prevById.get(tile.id);
          if (fallProgress < 1 && prev) {
            const startX = prev.x * cellW + cellW / 2;
            const startY = prev.y * cellH + cellH / 2;
            drawX = startX + (drawX - startX) * fallProgress;
            drawY = startY + (drawY - startY) * fallProgress;
          }

          const removeScale = isRemoving ? Math.max(0.1, 1 - popProgress * 0.9) : 1;
          const upgradedBoost = isUpgraded ? 1 + Math.max(0, 0.2 * (1 - popProgress)) : 1;
          const radius = Math.min(cellW, cellH) * 0.33 * removeScale * upgradedBoost;
          const isSpawnedDuringFall = Boolean(previousBoard) && fallProgress < 1 && !prev;

          ctx.save();
          if (isSpawnedDuringFall) {
            ctx.globalAlpha = Math.max(0.12, fallProgress);
          }

          ctx.fillStyle = colorForValue(tile.value);
          ctx.beginPath();
          ctx.arc(drawX, drawY, Math.max(0, radius), 0, Math.PI * 2);
          ctx.fill();

          if (isUpgraded) {
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(drawX, drawY, radius + 4, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(14, Math.floor(cellW * 0.31))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(tile.value), drawX, drawY);
          ctx.restore();
        }
      }
    }

    for (let line = 0; line <= board.width; line += 1) {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const x = line * cellW;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, displaySize);
      ctx.stroke();
    }

    for (let line = 0; line <= board.height; line += 1) {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const y = line * cellH;
      ctx.moveTo(0, y);
      ctx.lineTo(displaySize, y);
      ctx.stroke();
    }

    if (selectedPath.length > 1) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      selectedPath.forEach((pos, index) => {
        const px = pos.x * cellW + cellW / 2;
        const py = pos.y * cellH + cellH / 2;
        if (index === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      selectedPath.forEach((pos, index) => {
        const cx = pos.x * cellW + cellW / 2;
        const cy = pos.y * cellH + cellH / 2;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(10, cellW * 0.13), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(10, Math.floor(cellW * 0.18))}px sans-serif`;
        ctx.fillText(String(index + 1), cx, cy);
      });
    }
  }, [board, displaySize, selectedPath, selectedSet, previousBoard, fallProgress, popProgress, removingSet, upgradedCell, invalidCell]);

  function pointerToCell(e: PointerEvent<HTMLCanvasElement>): Position | null {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return mapCanvasPointToCell(x, y, rect.width, rect.height, board.width, board.height);
  }

  function appendIfValid(next: Position) {
    const nextPath = getExtendedPath(board, selectedPath, next);
    if (nextPath.length === selectedPath.length && key(next) !== key(selectedPath[selectedPath.length - 2] ?? next)) {
      setInvalidCell(next);
    }
    onPathChange(nextPath);
  }

  function finishSelection() {
    if (!dragging) return;
    setDragging(false);
    if (selectedPath.length >= minPathLength) {
      onCommit(selectedPath);
    }
    onPathChange([]);
  }

  useEffect(() => {
    if (!inputEnabled) {
      setDragging(false);
      onPathChange([]);
    }
  }, [inputEnabled, onPathChange]);

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', paddingInline: horizontalBoundary / 2, boxSizing: 'border-box' }}>
      <canvas
        ref={ref}
        style={{
          width: displaySize,
          height: displaySize,
          maxWidth: '100%',
          border: '2px solid #64748b',
          borderRadius: 8,
          touchAction: 'none',
          display: 'block',
          cursor: inputEnabled ? 'pointer' : 'not-allowed',
          opacity: !inputEnabled && !resolving ? 0.7 : 1,
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        onPointerDown={(e) => {
          if (!inputEnabled) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          const cell = pointerToCell(e);
          if (!cell) {
            onPathChange([]);
            return;
          }
          onPathChange([cell]);
        }}
        onPointerMove={(e) => {
          if (!dragging || !inputEnabled) return;
          e.preventDefault();
          const cell = pointerToCell(e);
          if (!cell) return;
          appendIfValid(cell);
        }}
        onPointerUp={(e) => {
          if (!inputEnabled) return;
          e.preventDefault();
          finishSelection();
        }}
        onPointerCancel={(e) => {
          e.preventDefault();
          setDragging(false);
          onPathChange([]);
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button type="button" onClick={() => onPathChange([])} disabled={selectedPath.length === 0 || !inputEnabled}>
          Cancel Selection
        </button>
        <button
          type="button"
          onClick={() => {
            if (selectedPath.length >= minPathLength && inputEnabled) {
              onCommit(selectedPath);
              onPathChange([]);
            }
          }}
          disabled={selectedPath.length < minPathLength || !inputEnabled}
        >
          Commit Path
        </button>
        <span style={{ fontSize: 12, color: '#475569' }}>{inputEnabled ? `Path: ${selectedPath.length} cells` : resolving ? 'Input disabled: resolving' : 'Input disabled: run ended'}</span>
      </div>
    </div>
  );
}

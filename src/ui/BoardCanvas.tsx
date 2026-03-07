import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { BoardState } from '../core/BoardState';
import type { Position } from '../core/Position';
import { mapCanvasPointToCell } from '../app/InputMapper';

interface Props {
  board: BoardState;
  selectedPath: Position[];
  onPathChange(path: Position[]): void;
  onCommit(path: Position[]): void;
}

const size = 420;

function colorForValue(value: number): string {
  const palette = ['#111827', '#1d4ed8', '#059669', '#ca8a04', '#ea580c', '#dc2626', '#9333ea', '#0f766e', '#7c3aed', '#be123c', '#334155'];
  return palette[value] ?? '#000';
}

export function BoardCanvas({ board, selectedPath, onPathChange, onCommit }: Props): JSX.Element {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedPath.map((p) => `${p.x},${p.y}`)), [selectedPath]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellW = size / board.width;
    const cellH = size / board.height;
    ctx.clearRect(0, 0, size, size);

    for (let y = 0; y < board.height; y += 1) {
      for (let x = 0; x < board.width; x += 1) {
        const tile = board.tiles[y][x];
        const key = `${x},${y}`;
        ctx.fillStyle = selectedSet.has(key) ? '#fde68a' : '#e5e7eb';
        ctx.fillRect(x * cellW + 1, y * cellH + 1, cellW - 2, cellH - 2);
        ctx.fillStyle = colorForValue(tile.value);
        ctx.beginPath();
        ctx.arc(x * cellW + cellW / 2, y * cellH + cellH / 2, Math.min(cellW, cellH) * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(tile.value), x * cellW + cellW / 2, y * cellH + cellH / 2);
      }
    }

    if (selectedPath.length > 1) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      selectedPath.forEach((pos, i) => {
        const px = pos.x * cellW + cellW / 2;
        const py = pos.y * cellH + cellH / 2;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }
  }, [board, selectedSet, selectedPath]);

  function pointerToCell(e: PointerEvent<HTMLCanvasElement>): Position | null {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return mapCanvasPointToCell(x, y, rect.width, rect.height, board.width, board.height);
  }

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      style={{ border: '1px solid #94a3b8', borderRadius: 8, touchAction: 'none' }}
      onPointerDown={(e) => {
        const cell = pointerToCell(e);
        if (!cell) return;
        setDragging(true);
        onPathChange([cell]);
      }}
      onPointerMove={(e) => {
        if (!dragging) return;
        const cell = pointerToCell(e);
        if (!cell) return;
        const last = selectedPath[selectedPath.length - 1];
        if (last && last.x === cell.x && last.y === cell.y) return;
        if (selectedPath.some((p) => p.x === cell.x && p.y === cell.y)) return;
        onPathChange([...selectedPath, cell]);
      }}
      onPointerUp={() => {
        if (!dragging) return;
        setDragging(false);
        onCommit(selectedPath);
        onPathChange([]);
      }}
      onPointerLeave={() => {
        if (!dragging) return;
        setDragging(false);
        onCommit(selectedPath);
        onPathChange([]);
      }}
    />
  );
}

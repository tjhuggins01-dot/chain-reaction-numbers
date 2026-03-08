import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { BoardState } from '../core/BoardState';
import type { Position } from '../core/Position';
import { mapCanvasPointToCell } from '../app/InputMapper';
import { getExtendedPath } from '../app/PathSelection';

interface Props {
  board: BoardState;
  minPathLength: number;
  inputEnabled: boolean;
  selectedPath: Position[];
  onPathChange(path: Position[]): void;
  onCommit(path: Position[]): void;
}

const maxCanvasSize = 520;
const minCanvasSize = 280;

function colorForValue(value: number): string {
  const palette = ['#111827', '#1d4ed8', '#059669', '#ca8a04', '#ea580c', '#dc2626', '#9333ea', '#0f766e', '#7c3aed', '#be123c', '#334155'];
  return palette[value] ?? '#000';
}

export function BoardCanvas({ board, minPathLength, inputEnabled, selectedPath, onPathChange, onCommit }: Props): JSX.Element {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [displaySize, setDisplaySize] = useState(maxCanvasSize);

  const selectedSet = useMemo(() => new Set(selectedPath.map((p) => `${p.x},${p.y}`)), [selectedPath]);

  useEffect(() => {
    const updateSize = () => {
      const viewportWidth = Math.max(minCanvasSize, Math.floor(window.innerWidth - 32));
      setDisplaySize(Math.max(minCanvasSize, Math.min(maxCanvasSize, viewportWidth)));
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
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

    for (let y = 0; y < board.height; y += 1) {
      for (let x = 0; x < board.width; x += 1) {
        const tile = board.tiles[y][x];
        const key = `${x},${y}`;
        const left = x * cellW;
        const top = y * cellH;

        ctx.fillStyle = selectedSet.has(key) ? '#fef3c7' : '#e2e8f0';
        ctx.fillRect(left + 1, top + 1, cellW - 2, cellH - 2);

        ctx.fillStyle = colorForValue(tile.value);
        ctx.beginPath();
        ctx.arc(left + cellW / 2, top + cellH / 2, Math.min(cellW, cellH) * 0.33, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(14, Math.floor(cellW * 0.28))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(tile.value), left + cellW / 2, top + cellH / 2);
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
  }, [board, displaySize, selectedPath, selectedSet]);

  function pointerToCell(e: PointerEvent<HTMLCanvasElement>): Position | null {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return mapCanvasPointToCell(x, y, rect.width, rect.height, board.width, board.height);
  }

  function appendIfValid(next: Position) {
    onPathChange(getExtendedPath(board, selectedPath, next));
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
    <div>
      <canvas
        ref={ref}
        style={{
          width: displaySize,
          height: displaySize,
          border: '1px solid #64748b',
          borderRadius: 8,
          touchAction: 'none',
          display: 'block',
          cursor: inputEnabled ? 'pointer' : 'not-allowed',
          opacity: inputEnabled ? 1 : 0.65,
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
      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
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
        <span style={{ fontSize: 12, color: '#475569' }}>
          {inputEnabled ? `Path: ${selectedPath.length} cells` : 'Input disabled: run ended'}
        </span>
      </div>
    </div>
  );
}

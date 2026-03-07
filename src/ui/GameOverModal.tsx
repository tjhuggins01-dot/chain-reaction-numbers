interface Props {
  open: boolean;
  score: number;
  onReset(): void;
}

export function GameOverModal({ open, score, onReset }: Props): JSX.Element | null {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center' }}>
      <div style={{ background: '#fff', padding: 20, borderRadius: 8 }}>
        <h2>Game Over</h2>
        <p>Final Score: {score}</p>
        <button onClick={onReset}>New Run</button>
      </div>
    </div>
  );
}

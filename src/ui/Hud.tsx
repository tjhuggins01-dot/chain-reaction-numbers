interface Props {
  score: number;
  cascadeDepth: number;
  modeName: string;
  isGameOver: boolean;
  onReset(): void;
}

export function Hud({ score, cascadeDepth, modeName, isGameOver, onReset }: Props): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
      <strong>Score: {score}</strong>
      <span>Cascade Depth: {cascadeDepth}</span>
      <span>Mode: {modeName}</span>
      <span style={{ color: isGameOver ? '#b91c1c' : '#166534', fontWeight: 600 }}>{isGameOver ? 'Game Over' : 'Run Active'}</span>
      <button onClick={onReset}>Reset</button>
    </div>
  );
}

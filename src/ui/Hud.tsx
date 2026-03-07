interface Props {
  score: number;
  cascadeDepth: number;
  onReset(): void;
}

export function Hud({ score, cascadeDepth, onReset }: Props): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
      <strong>Score: {score}</strong>
      <span>Cascade Depth: {cascadeDepth}</span>
      <button onClick={onReset}>Reset</button>
    </div>
  );
}

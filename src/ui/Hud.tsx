interface Props {
  score: number;
  scoreDelta: number;
  cascadeDepth: number;
  modeName: string;
  isGameOver: boolean;
  resolving: boolean;
  onReset(): void;
}

export function Hud({ score, scoreDelta, cascadeDepth, modeName, isGameOver, resolving, onReset }: Props): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
      <strong style={{ fontSize: 20 }}>
        Score: {score}
        {scoreDelta > 0 && <span style={{ marginLeft: 8, color: '#166534', fontSize: 14 }}>+{scoreDelta}</span>}
      </strong>
      <span style={{ fontWeight: cascadeDepth > 0 ? 700 : 500, color: cascadeDepth > 0 ? '#7c2d12' : '#334155' }}>Cascade Depth: {cascadeDepth}</span>
      <span>Mode: {modeName}</span>
      <span style={{ color: isGameOver ? '#b91c1c' : '#166534', fontWeight: 600 }}>{isGameOver ? 'Game Over' : resolving ? 'Resolving…' : 'Run Active'}</span>
      <button onClick={onReset}>Reset</button>
    </div>
  );
}

import type { ReplayLog } from '../core/ReplayLog';

interface Props {
  seed: number;
  replay: ReplayLog;
  onResetSameSeed(): void;
  onResetNewSeed(): void;
}

export function DebugPanel({ seed, replay, onResetSameSeed, onResetNewSeed }: Props): JSX.Element {
  const replayJson = JSON.stringify(replay, null, 2);

  return (
    <details style={{ marginTop: 12 }}>
      <summary>Debug</summary>
      <div style={{ fontFamily: 'monospace', fontSize: 12 }}>
        <p>Seed: {seed}</p>
        <p>Commands: {replay.commands.length}</p>
        <p>Events: {replay.events.length}</p>
        <p>Replay bytes: {replayJson.length}</p>
        <button onClick={onResetSameSeed}>Reset Same Seed</button>
        <button onClick={onResetNewSeed} style={{ marginLeft: 8 }}>Reset New Seed</button>
        <details style={{ marginTop: 8 }}>
          <summary>Replay export</summary>
          <textarea
            readOnly
            value={replayJson}
            style={{ width: '100%', minHeight: 120, fontFamily: 'monospace', fontSize: 11 }}
          />
        </details>
      </div>
    </details>
  );
}

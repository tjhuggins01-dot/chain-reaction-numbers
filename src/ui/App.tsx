import { useEffect, useMemo, useState } from 'react';
import { GameSession } from '../app/GameSession';
import type { Position } from '../core/Position';
import { defaultFeatureFlags } from '../app/FeatureFlags';
import { BoardCanvas } from './BoardCanvas';
import { Hud } from './Hud';
import { GameOverModal } from './GameOverModal';
import { DebugPanel } from './DebugPanel';

export function App(): JSX.Element {
  const session = useMemo(() => new GameSession(Date.now() % 1000000), []);
  const [path, setPath] = useState<Position[]>([]);
  const [, setVersion] = useState(0);

  useEffect(() => {
    session.controller.send({ type: 'StartRun' });
    setVersion((v) => v + 1);
  }, [session]);

  const state = session.engine.getState();
  const replay = session.engine.getReplayLog();

  const refresh = () => setVersion((v) => v + 1);

  return (
    <main style={{ maxWidth: 520, margin: '20px auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h1>Chain Reaction Numbers</h1>
      <Hud score={state.score} cascadeDepth={state.cascadeDepth} onReset={() => { session.controller.send({ type: 'ResetRun' }); refresh(); }} />
      <BoardCanvas
        board={state.board}
        selectedPath={path}
        onPathChange={setPath}
        onCommit={(p) => {
          if (p.length > 0) {
            session.controller.send({ type: 'CommitPath', path: p });
            refresh();
          }
        }}
      />
      <GameOverModal
        open={!state.runActive}
        score={state.score}
        onReset={() => {
          session.controller.send({ type: 'ResetRun' });
          refresh();
        }}
      />
      {defaultFeatureFlags.debugPanel && (
        <DebugPanel
          seed={state.seed}
          replay={replay}
          onResetSameSeed={() => {
            session.controller.send({ type: 'ResetRun', keepSeed: true });
            refresh();
          }}
          onResetNewSeed={() => {
            session.controller.send({ type: 'ResetRun' });
            refresh();
          }}
        />
      )}
    </main>
  );
}

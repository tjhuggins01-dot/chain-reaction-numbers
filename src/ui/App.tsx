import { useEffect, useMemo, useState } from 'react';
import { GameSession } from '../app/GameSession';
import type { Position } from '../core/Position';
import { defaultFeatureFlags } from '../app/FeatureFlags';
import { BoardCanvas } from './BoardCanvas';
import { Hud } from './Hud';
import { GameOverModal } from './GameOverModal';
import { DebugPanel } from './DebugPanel';
import { shouldCommitPath } from '../app/UiGuards';
import type { BoardState } from '../core/BoardState';
import type { EngineEvent } from '../core/EngineEvent';

const STEP_POP_MS = 180;
const STEP_FALL_MS = 280;
const STEP_BETWEEN_MS = 80;
const SCORE_DELTA_MS = 1400;
const CASCADE_HINT_MS = 1200;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function App(): JSX.Element {
  const session = useMemo(() => new GameSession(Date.now() % 1000000), []);
  const [path, setPath] = useState<Position[]>([]);
  const [engineState, setEngineState] = useState(session.engine.getState());
  const [displayBoard, setDisplayBoard] = useState<BoardState>(engineState.board);
  const [previousBoard, setPreviousBoard] = useState<BoardState | null>(null);
  const [fallProgress, setFallProgress] = useState(1);
  const [popProgress, setPopProgress] = useState(1);
  const [removingCells, setRemovingCells] = useState<Position[]>([]);
  const [upgradedCell, setUpgradedCell] = useState<Position | null>(null);
  const [resolving, setResolving] = useState(false);
  const [scoreDelta, setScoreDelta] = useState(0);
  const [cascadeHint, setCascadeHint] = useState<string | null>(null);

  useEffect(() => {
    session.controller.send({ type: 'StartRun' });
    const next = session.engine.getState();
    setEngineState(next);
    setDisplayBoard(next.board);
  }, [session]);

  useEffect(() => {
    if (scoreDelta <= 0) return;
    const t = window.setTimeout(() => setScoreDelta(0), SCORE_DELTA_MS);
    return () => window.clearTimeout(t);
  }, [scoreDelta]);

  useEffect(() => {
    if (!cascadeHint) return;
    const t = window.setTimeout(() => setCascadeHint(null), CASCADE_HINT_MS);
    return () => window.clearTimeout(t);
  }, [cascadeHint]);

  async function animateProgress(durationMs: number, onFrame: (progress: number) => void): Promise<void> {
    onFrame(0);
    const started = performance.now();

    await new Promise<void>((resolve) => {
      const tick = (time: number) => {
        const elapsed = time - started;
        const progress = Math.min(1, elapsed / durationMs);
        onFrame(progress);
        if (progress >= 1) {
          resolve();
          return;
        }
        window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
    });
  }

  async function animatePop(): Promise<void> {
    await animateProgress(STEP_POP_MS, (progress) => setPopProgress(progress));
  }

  async function animateFall(fromBoard: BoardState, toBoard: BoardState): Promise<void> {
    setPreviousBoard(fromBoard);
    setDisplayBoard(toBoard);
    await animateProgress(STEP_FALL_MS, (progress) => setFallProgress(progress));
    setPreviousBoard(null);
  }

  async function playResolution(events: EngineEvent[], boardBeforeMove: BoardState): Promise<void> {
    const chainEvents = events.filter((event) => event.type === 'ChainResolved');
    const refillEvents = events.filter((event) => event.type === 'BoardRefilled');

    if (chainEvents.length === 0) return;

    setResolving(true);
    let currentBoard = boardBeforeMove;

    for (let i = 0; i < chainEvents.length; i += 1) {
      const chain = chainEvents[i];
      if (chain.cascadeDepth > 0) {
        setCascadeHint(`Cascade x${chain.cascadeDepth + 1}`);
      }

      setRemovingCells(chain.removedPositions);
      setUpgradedCell(chain.upgradedPosition);
      await animatePop();
      setRemovingCells([]);

      const refill = refillEvents[i];
      if (refill && refill.type === 'BoardRefilled') {
        await animateFall(currentBoard, refill.board);
        currentBoard = refill.board;
      }

      await delay(STEP_BETWEEN_MS);
    }

    setUpgradedCell(null);
    const scoreEvent = events.find((event) => event.type === 'ScoreChanged');
    if (scoreEvent && scoreEvent.type === 'ScoreChanged') {
      setScoreDelta(scoreEvent.delta);
    }

    const next = session.engine.getState();
    setEngineState(next);
    setDisplayBoard(next.board);
    setResolving(false);
  }

  function resetRun(keepSeed = false): void {
    session.controller.send({ type: 'ResetRun', keepSeed });
    setPath([]);
    setResolving(false);
    setRemovingCells([]);
    setUpgradedCell(null);
    setCascadeHint(null);
    setScoreDelta(0);
    setPopProgress(1);
    setFallProgress(1);

    const next = session.engine.getState();
    setEngineState(next);
    setDisplayBoard(next.board);
  }

  return (
    <main style={{ maxWidth: 560, margin: '12px auto', padding: '0 12px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h1>Chain Reaction Numbers</h1>
      <Hud
        score={engineState.score}
        scoreDelta={scoreDelta}
        cascadeDepth={engineState.cascadeDepth}
        modeName="Endless"
        isGameOver={!engineState.runActive}
        resolving={resolving}
        onReset={() => resetRun()}
      />
      <div style={{ minHeight: 24, marginBottom: 8, color: '#92400e', fontWeight: 700 }}>{cascadeHint ?? ''}</div>
      <BoardCanvas
        board={displayBoard}
        previousBoard={previousBoard}
        fallProgress={fallProgress}
        popProgress={popProgress}
        minPathLength={engineState.rules.minChainLength}
        inputEnabled={engineState.runActive && !resolving}
        selectedPath={path}
        removingCells={removingCells}
        upgradedCell={upgradedCell}
        onPathChange={setPath}
        onCommit={(p) => {
          if (resolving) return;
          if (shouldCommitPath(p, engineState.runActive, engineState.rules.minChainLength)) {
            const boardBeforeMove = displayBoard;
            const events = session.controller.send({ type: 'CommitPath', path: p });
            void playResolution(events, boardBeforeMove);
          }
        }}
      />
      <GameOverModal open={!engineState.runActive} score={engineState.score} onReset={() => resetRun()} />
      {defaultFeatureFlags.debugPanel && (
        <DebugPanel
          seed={engineState.seed}
          replay={session.engine.getReplayLog()}
          onResetSameSeed={() => resetRun(true)}
          onResetNewSeed={() => resetRun(false)}
        />
      )}
    </main>
  );
}

import { defaultRuleSet } from '../src/config/gameConfig';
import { getTile, type BoardState } from '../src/core/BoardState';
import { GameEngine } from '../src/core/GameEngine';
import { countPlayableStarts, findAnyValidPath, findBestValidPath, hasAnyValidMove } from '../src/core/MoveScanner';
import type { Position } from '../src/core/Position';
import { endlessMode } from '../src/modes/EndlessMode';

interface SimulationOptions {
  runs: number;
  baseSeed: number;
  maxTurns: number;
  agent: 'first' | 'longest';
}

interface RunSummary {
  seed: number;
  turns: number;
  score: number;
  deadBoard: boolean;
  averageChainLength: number;
  averageCascadeDepth: number;
  lowTileRatioAvg: number;
  lowTileRatioPeak: number;
  lowTileCongestedTurns: number;
  lowMoveTurns: number;
  playableStartsAvg: number;
  tileHistogramSamples: Record<number, number>;
  boardSamples: number;
}

function parseArgs(): SimulationOptions {
  const args = process.argv.slice(2);
  const getNumber = (flag: string, fallback: number): number => {
    const idx = args.indexOf(flag);
    if (idx === -1 || !args[idx + 1]) return fallback;
    const n = Number(args[idx + 1]);
    return Number.isFinite(n) ? n : fallback;
  };

  const getAgent = (): 'first' | 'longest' => {
    const idx = args.indexOf('--agent');
    if (idx === -1 || !args[idx + 1]) return 'longest';
    return args[idx + 1] === 'first' ? 'first' : 'longest';
  };


  return {
    runs: Math.max(1, Math.floor(getNumber('--runs', 200))),
    baseSeed: Math.max(1, Math.floor(getNumber('--seed', 1000))),
    maxTurns: Math.max(1, Math.floor(getNumber('--max-turns', 300))),
    agent: getAgent(),
  };
}


function choosePath(board: BoardState, rules: typeof defaultRuleSet, agent: 'first' | 'longest'): Position[] | null {
  if (agent === 'first') return findAnyValidPath(board, rules);
  return findBestValidPath(board, rules);
}

function tileHistogram(board: BoardState): Record<number, number> {
  const histogram: Record<number, number> = {};
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const value = getTile(board, { x, y })?.value ?? 0;
      histogram[value] = (histogram[value] ?? 0) + 1;
    }
  }
  return histogram;
}

function lowTileRatio(board: BoardState, threshold = 3): number {
  const total = board.width * board.height;
  let low = 0;
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const value = getTile(board, { x, y })?.value ?? 0;
      if (value > 0 && value <= threshold) low += 1;
    }
  }
  return total > 0 ? low / total : 0;
}

function mergeHistogram(into: Record<number, number>, sample: Record<number, number>): void {
  for (const [value, count] of Object.entries(sample)) {
    const key = Number(value);
    into[key] = (into[key] ?? 0) + count;
  }
}

function runSimulation(seed: number, options: SimulationOptions): RunSummary {
  const engine = GameEngine.create(seed, defaultRuleSet, endlessMode);
  engine.dispatch({ type: 'StartRun' });

  let turns = 0;
  let boardSamples = 0;
  let score = 0;
  let totalChainLength = 0;
  let cascadeDepthTotal = 0;
  let lowTileRatioTotal = 0;
  let lowTileRatioPeak = 0;
  let lowTileCongestedTurns = 0;
  let lowMoveTurns = 0;
  let playableStartsTotal = 0;
  const histogram: Record<number, number> = {};

  while (turns < options.maxTurns) {
    const state = engine.getState();
    const playableStarts = countPlayableStarts(state.board, state.rules);
    boardSamples += 1;
    playableStartsTotal += playableStarts;
    if (playableStarts <= 2) lowMoveTurns += 1;

    const ratio = lowTileRatio(state.board);
    lowTileRatioTotal += ratio;
    lowTileRatioPeak = Math.max(lowTileRatioPeak, ratio);
    if (ratio >= 0.72) lowTileCongestedTurns += 1;
    mergeHistogram(histogram, tileHistogram(state.board));

    if (!hasAnyValidMove(state.board, state.rules)) break;

    const path = choosePath(state.board, state.rules, options.agent);
    if (!path) break;

    totalChainLength += path.length;
    const events = engine.dispatch({ type: 'CommitPath', path });

    const cascades = events
      .filter((event): event is { type: 'CascadeTriggered'; depth: number } => event.type === 'CascadeTriggered')
      .map((event) => event.depth);

    cascadeDepthTotal += cascades.length === 0 ? 0 : Math.max(...cascades);

    const scoreChanged = events.find(
      (event): event is Extract<(typeof events)[number], { type: 'ScoreChanged' }> => event.type === 'ScoreChanged',
    );
    score = scoreChanged?.score ?? engine.getState().score;

    turns += 1;
  }

  const final = engine.getState();

  return {
    seed,
    turns,
    score: final.score ?? score,
    deadBoard: !hasAnyValidMove(final.board, final.rules),
    averageChainLength: turns > 0 ? totalChainLength / turns : 0,
    averageCascadeDepth: turns > 0 ? cascadeDepthTotal / turns : 0,
    lowTileRatioAvg: boardSamples > 0 ? lowTileRatioTotal / boardSamples : 0,
    lowTileRatioPeak,
    lowTileCongestedTurns,
    lowMoveTurns,
    playableStartsAvg: boardSamples > 0 ? playableStartsTotal / boardSamples : 0,
    tileHistogramSamples: histogram,
    boardSamples,
  };
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

function main(): void {
  const options = parseArgs();
  const runs = Array.from({ length: options.runs }, (_, i) => runSimulation(options.baseSeed + i, options));

  const avg = (selector: (run: RunSummary) => number): number => runs.reduce((sum, run) => sum + selector(run), 0) / runs.length;
  const totalBoardSamples = runs.reduce((sum, run) => sum + run.boardSamples, 0);
  const deadBoards = runs.filter((run) => run.deadBoard).length;

  const histogramTotals: Record<number, number> = {};
  for (const run of runs) {
    mergeHistogram(histogramTotals, run.tileHistogramSamples);
  }

  const histogramTotalCount = Object.values(histogramTotals).reduce((sum, count) => sum + count, 0);
  const histogramRatios = Object.fromEntries(
    Object.entries(histogramTotals)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([value, count]) => [value, histogramTotalCount > 0 ? count / histogramTotalCount : 0]),
  );

  const scores = runs.map((run) => run.score);

  const report = {
    options,
    runs: runs.length,
    deadBoardFrequency: deadBoards / runs.length,
    avgRunLengthTurns: avg((run) => run.turns),
    avgScore: avg((run) => run.score),
    avgChainLength: avg((run) => run.averageChainLength),
    avgCascadeDepthPerTurn: avg((run) => run.averageCascadeDepth),
    avgPlayableStarts: avg((run) => run.playableStartsAvg),
    lowMoveTurnRate: totalBoardSamples > 0 ? runs.reduce((sum, run) => sum + run.lowMoveTurns, 0) / totalBoardSamples : 0,
    lowTileCongestionTurnRate: totalBoardSamples > 0 ? runs.reduce((sum, run) => sum + run.lowTileCongestedTurns, 0) / totalBoardSamples : 0,
    avgLowTileRatio: avg((run) => run.lowTileRatioAvg),
    avgPeakLowTileRatio: avg((run) => run.lowTileRatioPeak),
    scorePercentiles: {
      p50: percentile(scores, 50),
      p75: percentile(scores, 75),
      p90: percentile(scores, 90),
      max: Math.max(...scores),
    },
    tileValueDistribution: histogramRatios,
    sampleRuns: runs.slice(0, Math.min(5, runs.length)).map((run) => ({
      seed: run.seed,
      turns: run.turns,
      score: run.score,
      lowTileRatioAvg: run.lowTileRatioAvg,
      lowMoveTurns: run.lowMoveTurns,
      deadBoard: run.deadBoard,
    })),
  };

  console.log(JSON.stringify(report, null, 2));
}

main();

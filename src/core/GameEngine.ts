import { createReplayLog, type ReplayLog } from './ReplayLog';
import type { EngineCommand } from './EngineCommand';
import type { EngineEvent } from './EngineEvent';
import type { GameState } from './GameState';
import type { RuleSet } from './RuleSet';
import { SeededRng } from './Rng';
import { WeightedSpawnPolicy } from './SpawnPolicy';
import { validatePath } from './PathValidator';
import { refillBoard } from './RefillResolver';
import { resolveLocalCascades } from './CascadeResolver';
import type { GameMode } from '../modes/GameMode';

function buildEmptyBoard(rules: RuleSet) {
  return {
    width: rules.board.width,
    height: rules.board.height,
    tiles: Array.from({ length: rules.board.height }, (_, y) =>
      Array.from({ length: rules.board.width }, (_, x) => ({ id: `empty-${x}-${y}`, value: 0, effects: [], position: { x, y } })),
    ),
  };
}

export class GameEngine {
  private rng: SeededRng;
  private spawnPolicy = new WeightedSpawnPolicy();
  private replay: ReplayLog;

  constructor(private state: GameState, private readonly mode: GameMode) {
    this.rng = new SeededRng(state.seed);
    this.replay = createReplayLog(state.seed, state.rules);
  }

  static create(seed: number, rules: RuleSet, mode: GameMode): GameEngine {
    const baseState: GameState = {
      board: buildEmptyBoard(rules),
      score: 0,
      seed,
      runActive: false,
      cascadeDepth: 0,
      rules,
    };
    return new GameEngine(baseState, mode);
  }

  getState(): GameState {
    return JSON.parse(JSON.stringify(this.state)) as GameState;
  }

  getReplayLog(): ReplayLog {
    return JSON.parse(JSON.stringify(this.replay)) as ReplayLog;
  }

  dispatch(command: EngineCommand): EngineEvent[] {
    const events: EngineEvent[] = [];
    this.replay.commands.push(command);

    switch (command.type) {
      case 'StartRun': {
        this.resetInternal(command.seed ?? this.state.seed);
        events.push({ type: 'RunStarted', seed: this.state.seed, board: this.getState().board });
        break;
      }
      case 'ResetRun': {
        const seed = command.keepSeed ? this.state.seed : command.seed ?? (Math.floor(Math.random() * 1_000_000) + 1);
        this.resetInternal(seed);
        events.push({ type: 'RunStarted', seed: this.state.seed, board: this.getState().board });
        break;
      }
      case 'CommitPath': {
        if (!this.state.runActive) {
          events.push({ type: 'InvalidPathRejected', reason: 'run_inactive' });
          break;
        }
        const validation = validatePath(this.state.board, command.path, this.state.rules);
        if (!validation.valid) {
          events.push({ type: 'InvalidPathRejected', reason: validation.reason ?? 'invalid' });
          break;
        }
        events.push({ type: 'PathCommitted', path: command.path });

        const resolved = resolveLocalCascades(this.state.board, command.path, this.state.rules, this.spawnPolicy, this.rng);
        this.state.board = resolved.board;
        let totalDelta = 0;
        for (const step of resolved.steps) {
          totalDelta += step.scoreDelta;
          this.state.cascadeDepth = step.depth;
          events.push({ type: 'ChainResolved', removedValues: [], upgradedValue: 0, cascadeDepth: step.depth });
          if (step.depth > 0) events.push({ type: 'CascadeTriggered', depth: step.depth });
          events.push({ type: 'GravityApplied' });
          events.push({ type: 'BoardRefilled' });
        }
        this.state.score += totalDelta;
        events.push({ type: 'ScoreChanged', score: this.state.score, delta: totalDelta });

        const runOver = this.mode.isRunOver(this.state);
        if (runOver.over && runOver.reason) {
          this.state.runActive = false;
          events.push({ type: 'RunEnded', finalScore: this.state.score, reason: runOver.reason });
        }
        break;
      }
      case 'ReviveRun': {
        events.push({ type: 'InvalidPathRejected', reason: 'not_implemented' });
        break;
      }
      case 'ApplyPowerUp': {
        events.push({ type: 'InvalidPathRejected', reason: 'not_implemented' });
        break;
      }
    }

    this.replay.events.push(...events);
    return events;
  }

  private resetInternal(seed: number): void {
    this.state.seed = seed;
    this.rng = new SeededRng(seed);
    const emptyBoard = buildEmptyBoard(this.state.rules);
    this.state.board = refillBoard(emptyBoard, this.state.rules, this.spawnPolicy, this.rng, 'start');
    this.state.score = 0;
    this.state.runActive = true;
    this.state.cascadeDepth = 0;
    this.replay = createReplayLog(seed, this.state.rules);
  }
}

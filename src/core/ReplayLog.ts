import type { EngineCommand } from './EngineCommand';
import type { EngineEvent } from './EngineEvent';
import type { RuleSet } from './RuleSet';

export interface ReplayLog {
  initialSeed: number;
  configSnapshot: RuleSet;
  commands: EngineCommand[];
  events: EngineEvent[];
}

export function createReplayLog(seed: number, configSnapshot: RuleSet): ReplayLog {
  return { initialSeed: seed, configSnapshot, commands: [], events: [] };
}

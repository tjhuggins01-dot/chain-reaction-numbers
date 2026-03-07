import { GameEngine } from '../core/GameEngine';
import type { EngineCommand } from '../core/EngineCommand';
import type { EngineEvent } from '../core/EngineEvent';

export class RunController {
  constructor(private readonly engine: GameEngine) {}

  send(command: EngineCommand): EngineEvent[] {
    return this.engine.dispatch(command);
  }
}

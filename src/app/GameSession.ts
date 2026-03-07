import { defaultRuleSet } from '../config/gameConfig';
import { GameEngine } from '../core/GameEngine';
import { endlessMode } from '../modes/EndlessMode';
import { RunController } from './RunController';

export class GameSession {
  readonly engine: GameEngine;
  readonly controller: RunController;

  constructor(seed = 12345) {
    this.engine = GameEngine.create(seed, defaultRuleSet, endlessMode);
    this.controller = new RunController(this.engine);
  }
}

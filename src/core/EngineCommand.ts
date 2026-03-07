import type { Path } from './Path';

export type EngineCommand =
  | { type: 'StartRun'; seed?: number }
  | { type: 'CommitPath'; path: Path }
  | { type: 'ResetRun'; seed?: number; keepSeed?: boolean }
  | { type: 'ReviveRun' }
  | { type: 'ApplyPowerUp'; powerUpId: string };

# Architecture

## Layers
- `src/core`: Headless deterministic domain engine, command handling, state transition, replay.
- `src/modes`: Pluggable mode policies; v1 includes Endless mode only.
- `src/app`: Session orchestration, command dispatch, input mapping, save integration points.
- `src/ui`: React shell and HUD with Canvas board rendering.
- `src/platform`: Service interfaces and no-op/local implementations.

## Command/Event Flow
1. UI captures drag path on canvas.
2. App dispatches `CommitPath` through `RunController` to `GameEngine`.
3. Engine validates path, resolves chain + local cascades, updates state, emits structured events.
4. UI re-reads engine state and renders.

## Extension Points
- `GameMode` interface for objectives and run-over policies.
- `TileEffect` and effect payload on each tile for future special tile behaviors.
- `EngineCommand` includes `ReviveRun` and `ApplyPowerUp` stubs.
- `platform/*Service` interfaces for ads, purchases, analytics, remote config, persistence.

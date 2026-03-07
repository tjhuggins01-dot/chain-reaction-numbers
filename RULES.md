# Rules Source of Truth

## Chain Rules
- Board is 6x6.
- Tiles are integers in `[1..10]`.
- Path must be adjacent (8 directions), no repeated cells.
- Path must be strictly ascending by `+1` each step.
- Minimum chain length is `3`.

## Resolution Rules
- Remove all tiles in committed chain.
- Spawn upgraded tile at final path cell: `min(lastValue + 1, 10)`.
- Apply gravity downward per column.
- Refill empty cells using weighted spawn policy.

## Cascade Rules
- Local cascades only around upgraded pivot tile.
- Re-trigger while a local ascending chain into pivot exists.
- Do not trigger unrelated board-wide chains automatically.

## Scoring Rules
- Base: sum of chain values.
- Length multiplier: `1.0 + 0.2 * (chainLength - 3)`.
- Cascade multiplier: `1.1 ^ cascadeDepth`.
- Score increments per resolution step.

## Fail State
- Endless mode ends when global valid-move scan finds no legal chain.

## Refill / Tie-breaking Assumptions
- Weighted random refill values are deterministic under seed.
- No additional tie-breaking needed in v1 because path order is player-defined.

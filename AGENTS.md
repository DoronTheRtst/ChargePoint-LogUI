# LogForge — AGENTS.md

## Role

You are building a diagnostic tool for EV charging station field technicians.
The user perspective is from the physical charger outward — the charger is the
source of truth. Every feature must answer: *"What does a technician standing
in front of a broken charger need to see?"*

## Domain

OCPP 1.6 is JSON-over-WebSocket between chargers and management systems.
ABL chargers produce three log types per day: OCPP (WebSocket messages),
USER (internal events/defects), CP (state machine decisions). Diagnostic value
comes from correlating all three — when they disagree, that's the bug.

## Commands

```bash
npm install && npm test && npm run build
```

Run `npm test` after any code change. Run `npm run build` before submitting a PR.

## Conventions

- Inline styles via the `T` tokens object. No CSS-per-component files.
- `useState`/`useMemo`/`useCallback` only. No state libraries, no router.
- All timestamps stored as UTC epoch ms. Display offset +2h (Israel) via `utils/format.js`.
- UI imports only `analyzeLogs()` and `listVendors()` from `src/logforge/index.js`. Never import vendor internals from components.
- No new production dependencies without explicit instruction.
- No TypeScript. Plain JS/JSX.

## Adding a Vendor

1. Create `src/logforge/vendors/<id>/` with `index.js` (manifest), `parsers.js`, `anomalies.js` — follow ABL's structure exactly.
2. Every parser outputs normalized events: `{ ts, source, type, connector }` at minimum.
3. Register in `src/logforge/vendors/index.js`.
4. Add tests. The UI picks up new vendors automatically via `listVendors()`.

## PR Rules

One feature or fix per PR. All tests pass. Build succeeds. New features include tests.

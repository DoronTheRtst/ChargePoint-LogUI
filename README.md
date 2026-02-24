# ChargePoint LogUI (LogForge)

Minimal React + Vite bootstrap for the LogForge vendor-plugin architecture.

## Scripts

- `npm run dev`: start local development server
- `npm run build`: production build
- `npm run preview`: preview production build
- `npm test`: run tests once with Vitest

## Current scope

- Core vendor-plugin analysis lives under `src/logforge/`.
- The app shell (`src/App.jsx`) is intentionally minimal and confirms plugin registration.
- Full UI integration of the original monolith is a follow-up task.

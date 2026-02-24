# LogForge Core (Vendor-Plugin Architecture)

This folder decomposes the LogForge monolith into modular pieces with a vendor abstraction layer.

## Structure

- `core/`
  - `sessionBuilder.js`: vendor-agnostic session construction from normalized events.
  - `anomalyEngine.js`: shared anomaly execution engine + universal rules.
  - `time.js`: timestamp parsing utilities.
- `vendors/`
  - `index.js`: plugin registry/discovery.
  - `abl/`: first vendor plugin (manifest + parsers + vendor anomaly rules).
- `index.js`: façade API (`analyzeLogs`) used by UI.

## Plugin contract

Each vendor plugin exports:

- `id`, `label`, `models` metadata
- `parseLogsByType(filesByType)` -> `{ ocppEvents, userEvents, cpEvents }`
- `anomalyRules()` -> list of vendor-specific anomaly functions

New vendors can be added by creating `vendors/<vendor-id>/index.js` and registering it in `vendors/index.js`.

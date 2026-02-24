# LogForge — AGENTS.md

## What This Project Is

LogForge is a browser-based diagnostic tool for EV charging station technicians.
It parses raw log files from charging hardware, correlates events across multiple
log sources, reconstructs charging sessions, and flags anomalies automatically.

The user perspective is **from the physical charger outward**, not from a cloud
platform inward. The charger is the source of truth. Every feature must answer:
*"What does a technician standing in front of a broken charger need to see?"*

---

## Setup & Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # Production build to dist/
npm test             # Run Vitest test suite
npm run lint         # ESLint check
```

- Always run `npm test` after modifying any `.js` or `.jsx` file.
- Always run `npm run build` before submitting a PR to confirm no build errors.
- If you add a new dependency, add it to `package.json` and run `npm install`.
- Prefer exact or caret versions (`^`) for dependencies.

---

## Architecture Overview

```
src/
├── main.jsx                    # Entry point — mounts React app
├── App.jsx                     # Main shell — layout, tab routing, state management
├── styles.css                  # Global styles, CSS vars, scrollbar styling
├── tokens.js                   # Design tokens (colors, labels) exported as object T
├── utils/
│   └── format.js               # Timestamp formatting (fmt, fmtTime, fmtDate, fmtShort, fmtDur)
├── components/
│   ├── Badge.jsx               # Badge, SeverityIcon, SourceBadge, ConnectorBadge
│   ├── FileChip.jsx            # Removable file chip (name + line count)
│   ├── MultiUploadZone.jsx     # Drag-and-drop multi-file upload per log type
│   ├── PasteZone.jsx           # Manual paste input with log type selector
│   ├── SessionList.jsx         # Left sidebar session list
│   ├── SessionDetail.jsx       # Right panel — overview/events/raw tabs
│   ├── MeterChart.jsx          # Recharts line charts (energy, power, current)
│   ├── TimelineBrush.jsx       # Canvas-based density histogram with draggable range
│   ├── TimelineView.jsx        # Timeline tab — filters + brush + event list
│   └── AnomalyView.jsx        # Anomaly summary sorted by severity
└── logforge/                   # Core analysis engine (vendor-agnostic + vendor plugins)
    ├── index.js                # Facade API: analyzeLogs({ vendorId, filesByType })
    ├── index.test.js           # Integration tests
    ├── README.md               # Plugin contract documentation
    ├── core/
    │   ├── time.js             # parseWallClock, sortByTs
    │   ├── sessionBuilder.js   # Correlation engine — builds sessions from normalized events
    │   └── anomalyEngine.js    # Universal + vendor-specific anomaly rule runner
    └── vendors/
        ├── index.js            # Plugin registry — imports all vendors, exports listVendors()
        └── abl/                # ABL vendor plugin (first vendor)
            ├── index.js        # Plugin manifest (id, label, models, logTypes, parsers, rules)
            ├── parsers.js      # parseOcppLog, parseUserLog, parseCpLog
            └── anomalies.js    # ABL-specific rules (current mismatch, defects, vetos)
```

### Key Architectural Concepts

**Vendor Plugin System:** Each charging station vendor gets a directory under
`src/logforge/vendors/`. A plugin exports: `id`, `label`, `models` (with
`logTypes`), `parseLogsByType(filesByType)`, and `anomalyRules`. The registry
in `vendors/index.js` discovers plugins automatically.

**Normalized Event Schema:** All vendor parsers must output events with at
minimum: `{ ts, source, type, connector }`. The session builder and anomaly
engine are vendor-agnostic — they operate on this normalized format.

**Session Correlation:** `sessionBuilder.js` matches OCPP StartTransaction →
MeterValues → StopTransaction, then attaches USER/CP events by connector +
timestamp proximity (±5 minute window).

**Facade API:** UI code calls only `analyzeLogs()` and `listVendors()` from
`src/logforge/index.js`. Never import vendor internals directly from components.

---

## Domain Context

### OCPP 1.6 Protocol

JSON-over-WebSocket between chargers and central management systems:
- `[2, msgId, action, payload]` — Request (Call)
- `[3, msgId, result]` — Response (CallResult)
- `[4, msgId, code, desc, {}]` — Error (CallError)

Key actions: BootNotification, Heartbeat, Authorize, StartTransaction,
StopTransaction, MeterValues, StatusNotification, RemoteStartTransaction,
RemoteStopTransaction, ChangeConfiguration.

### ABL Log Types (First Vendor)

1. **OCPP Log** — Raw WebSocket messages with wall-clock timestamps
2. **USER Log** — Internal charger events (CSV-like: EVENT_TYPE, LEVEL, EPOCH_MS, CONNECTOR, DATA)
3. **CP Log** — State machine log (Intent/Step/Defects/Votes/Vetos)

Diagnostic value comes from correlating all three: OCPP shows what the charger
*told* the backend, USER shows what it *detected* internally, CP shows what the
state machine *decided* to do. Disagreements between sources indicate bugs.

---

## Coding Conventions

### Style & Formatting
- Use inline styles via the `T` tokens object from `tokens.js`. Do NOT create
  separate CSS files per component.
- The only CSS file is `styles.css` for globals (body, scrollbar, font imports).
- Use `'IBM Plex Sans'` for UI text and `'IBM Plex Mono'` for data/code.
- Follow the existing dark industrial theme. Do NOT change colors or fonts.

### Design Tokens (Reference)
```
Backgrounds: #080c12 (bg), #0d1117 (surface), #161b22 (card)
Borders:     #21262d, #30363d
Text:        #c9d1d9 (primary), #8b949e (dim), #484f58 (muted)
Accents:     #d29922 (amber), #58a6ff (blue/OCPP), #3fb950 (green/USER),
             #bc8cff (purple/CP), #f85149 (red/critical), #f0883e (orange/warning)
```

### React Conventions
- Functional components with hooks only. No class components.
- State management: `useState`, `useMemo`, `useCallback`, `useRef`, `useEffect`.
  Do NOT add Zustand, Redux, React Context, or any state library.
- No React Router. Tabs are managed with `useState`.
- No separate CSS/JS files per component — inline styles with tokens.
- Component files export a single default component.

### JavaScript Conventions
- ES module syntax (`import`/`export`), not CommonJS.
- Pure functions for parsers, session builder, and anomaly rules — no side effects.
- All timestamps internally stored as epoch milliseconds (UTC).
- Display timestamps offset +2 hours (Israel time) using `utils/format.js`.

### Testing
- Use Vitest (already configured in `vite.config.js`).
- Test files use `.test.js` suffix and live next to the module they test.
- Every new vendor parser must include test fixtures with representative log
  samples and at least one integration test through `analyzeLogs()`.
- Every new anomaly rule must have a test case that triggers it.

---

## Adding a New Vendor

This is the most common type of task. Follow this pattern exactly:

1. Create `src/logforge/vendors/<vendor_id>/` with three files:
   - `index.js` — Plugin manifest (copy ABL's structure)
   - `parsers.js` — Log parsers that output normalized events
   - `anomalies.js` — Vendor-specific anomaly rules

2. Register the plugin in `src/logforge/vendors/index.js`:
   ```js
   import <vendor>Plugin from './<vendor_id>';
   const plugins = [ablPlugin, <vendor>Plugin];
   ```

3. Every parser must output events matching this minimum schema:
   ```js
   { ts: <epoch_ms>, source: 'ocpp'|'user'|'cp'|..., type: <string>, connector: <number|null> }
   ```

4. Add tests in `src/logforge/vendors/<vendor_id>/parsers.test.js`.

5. Run `npm test` and `npm run build` to verify nothing breaks.

6. The UI automatically picks up new vendors via `listVendors()` — no UI
   changes needed unless the vendor has unique log types that need special
   display treatment.

---

## What NOT To Do

- Do NOT add routing libraries (React Router, etc.).
- Do NOT add state management libraries (Zustand, Redux, MobX, etc.).
- Do NOT add CSS-in-JS libraries (styled-components, Emotion, etc.).
- Do NOT add TypeScript — the project uses plain JavaScript/JSX.
- Do NOT create a backend or API server — all processing happens in the browser.
- Do NOT change the visual design (colors, fonts, spacing, dark theme) without
  explicit instruction.
- Do NOT import vendor modules directly from UI components — always go through
  the `analyzeLogs()` facade.
- Do NOT add new production dependencies without justification. If the task can
  be accomplished with existing deps (React, Recharts, Vitest), prefer that.

---

## PR Expectations

- PR title: concise description of what changed (e.g., "Add Alfen vendor parser")
- PR body: list what was added/changed/fixed, any decisions made, and test results
- All existing tests must pass (`npm test`)
- Build must succeed (`npm run build`)
- If adding a new feature, include tests for it
- If fixing a bug, include a test that would have caught it
- Keep PRs focused — one feature or fix per PR

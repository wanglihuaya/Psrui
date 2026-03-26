# Architecture

PSRCHIVE Viewer is a desktop application built as three cooperating layers:

```
┌─────────────────────────────────────────────────────────────┐
│                      Electron Shell                          │
│                                                              │
│  src/main/index.ts      — Window lifecycle, IPC handlers     │
│  src/main/backend.ts    — FastAPI process manager            │
│  src/preload/index.ts   — Context bridge (IPC → renderer)    │
├─────────────────────────────────────────────────────────────┤
│                    React Renderer                            │
│                                                              │
│  App.tsx                — Root: data loading, shortcuts      │
│  components/            — UI components (see below)          │
│  lib/api.ts             — HTTP client for backend            │
│  lib/store.ts           — Global state (Jotai atoms)         │
│  lib/settings.ts        — Persisted settings atoms           │
│  lib/i18n.ts            — EN / ZH translation table          │
│  lib/shortcuts.ts       — Keyboard shortcut definitions       │
├─────────────────────────────────────────────────────────────┤
│                   FastAPI Backend                            │
│                                                              │
│  app/main.py            — FastAPI app, CORS config           │
│  app/routes.py          — REST endpoints                     │
│  app/data_provider.py   — Abstract provider + implementations│
│  app/psrcat.py          — PSRCAT database parser             │
└─────────────────────────────────────────────────────────────┘
```

## Communication flows

### Startup
1. Electron main process spawns `python3 -m uvicorn app.main:app --port 8787`
2. `BackendProcess.waitForReady()` polls `GET /api/health` every 300 ms (15 s timeout)
3. Once healthy, `createWindow()` opens the renderer; renderer polls `/api/health` independently and sets `backendReadyAtom = true`

### File loading (renderer → backend)
```
User picks .ar file
  → App.tsx: Promise.allSettled([loadArchive, getProfile, getWaterfall, getTimePhase, getBandpass])
  → lib/api.ts: fetch() → FastAPI routes.py
  → data_provider.py: PsrchiveProvider or MockProvider
  → JSON response → Jotai atoms → Plotly charts
```

### IPC (renderer ↔ main)
All IPC uses `contextBridge`; the renderer calls `window.electron.*`, which maps to `ipcRenderer.invoke()`.

| `window.electron` method | IPC channel | Main handler |
|---|---|---|
| `openFile()` | `dialog:openFile` | `dialog.showOpenDialog` |
| `openDirectory()` | `dialog:openDirectory` | `dialog.showOpenDialog` |
| `saveFile(name)` | `dialog:saveFile` | `dialog.showSaveDialog` |
| `showInFolder(path)` | `shell:showItemInFolder` | `shell.showItemInFolder` |
| `getBackendPort()` | `backend:port` | returns `8787` |
| `getBackendStatus()` | `backend:status` | `backend.isRunning()` |
| `restartBackend()` | `backend:restart` | `backend.restart()` |
| `newWindow(path?)` | `window:new` | `createWindow(path)` |
| `onFileOpen(cb)` | `file:open` (listen) | sent by main on file association |

## Data provider abstraction

`data_provider.py` defines `DataProvider` (ABC) with five abstract methods:

```python
get_metadata(path)    → dict   # archive info
get_profile(path, *, subint, chan)   → dict   # Stokes I/Q/U/V
get_waterfall(path, *, subint)       → dict   # freq × phase 2D
get_time_phase(path, *, chan)        → dict   # time × phase 2D
get_bandpass(path)                  → dict   # mean power per channel
```

`get_provider()` tries `PsrchiveProvider()` first; falls back to `MockProvider()` on `ImportError`.

## State management

All global state lives in Jotai atoms (no Redux, no Context API).

**Ephemeral state** (`lib/store.ts`): resets on every page load.
**Persisted state** (`lib/settings.ts`): written to `localStorage` via `atomWithStorage`.

See [state.md](state.md) for a full atom reference.

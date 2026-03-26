# Electron Layer

## Main process (`src/main/index.ts`)

Entry point for the Electron main process. Responsibilities:

- Starts the FastAPI backend (`BackendProcess`)
- Creates `BrowserWindow` instances
- Registers all IPC handlers
- Manages multi-window state via a `Set<BrowserWindow>`

### Window configuration

| Option | Value |
|--------|-------|
| Size | 1440 × 900, min 960 × 640 |
| Title bar | `hiddenInset` (macOS) with traffic lights at x=16, y=16 |
| Background | `#0a0e17` (prevents white flash before renderer loads) |
| Security | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: false` |

In development, the renderer loads from `ELECTRON_RENDERER_URL` (Vite dev server). In production, it loads the built `index.html`.

### IPC handlers

| Channel | Direction | Description |
|---------|-----------|-------------|
| `dialog:openFile` | invoke | `dialog.showOpenDialog` filtered to `.ar .fits .fit .sf .rf .cf .pfd` |
| `dialog:openDirectory` | invoke | `dialog.showOpenDialog({ properties: ['openDirectory'] })` |
| `dialog:saveFile` | invoke | `dialog.showSaveDialog` filtered to PNG / SVG |
| `backend:port` | invoke | Returns `8787` |
| `backend:status` | invoke | Returns `backend.isRunning()` |
| `backend:restart` | invoke | Calls `backend.restart()` |
| `window:new` | invoke | Calls `createWindow(filePath?)` |
| `shell:showItemInFolder` | invoke | `shell.showItemInFolder(path)` |
| `file:open` | send (main → renderer) | Sent when a window is opened with a pre-selected file path |

### App lifecycle

```
app.whenReady
  → registerIPC()
  → backend.start()     ← waits up to 15 s
  → createWindow()

app.activate (macOS dock click)
  → createWindow() if no windows open

window-all-closed
  → backend.stop()
  → app.quit() on non-macOS

before-quit
  → backend.stop()
```

---

## Backend process manager (`src/main/backend.ts`)

`BackendProcess` class manages the uvicorn child process.

### `start()`

Spawns:
```
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8787
```

- `cwd`: `backend/` (dev) or `process.resourcesPath/backend` (production)
- `env`: inherits process env + `PYTHONUNBUFFERED=1`
- stdout/stderr piped and logged to the main process console as `[backend]`

Waits for readiness by polling `GET http://127.0.0.1:8787/api/health` every 300 ms, starting after an initial 500 ms delay. Times out after 15 seconds.

### `stop()`

Sends `SIGTERM` to the child process.

### `restart()`

`stop()` → 500 ms delay → `start()`

---

## Preload / context bridge (`src/preload/index.ts`)

Exposes a typed `ElectronAPI` object on `window.electron` using `contextBridge.exposeInMainWorld`.

```ts
interface ElectronAPI {
  openFile: () => Promise<string[]>
  openDirectory: () => Promise<string | null>
  saveFile: (defaultName: string) => Promise<string | null>
  showInFolder: (path: string) => Promise<void>
  getBackendPort: () => Promise<number>
  getBackendStatus: () => Promise<boolean>
  restartBackend: () => Promise<boolean>
  newWindow: (filePath?: string) => Promise<void>
  onFileOpen: (callback: (path: string) => void) => void
}
```

`onFileOpen` registers a persistent `ipcRenderer.on` listener for the `file:open` event, which the main process sends when a window is created with a pre-loaded file path.

# Electron Layer

中文版本: [electron.zh.md](electron.zh.md)

## Main process (`src/main/index.ts`)

Entry point for the Electron main process. Responsibilities:

- Starts the FastAPI backend (`BackendProcess`)
- Creates `BrowserWindow` instances
- Registers all IPC handlers
- Manages multi-window state via a `Set<BrowserWindow>`
- Builds the native macOS application menu and dev-only `Debug` menu
- Dispatches shared app commands to the focused renderer via `app:command`

### Window configuration

| Option | Value |
|--------|-------|
| Size | 1440 × 900, min 960 × 640 |
| Title bar | `hiddenInset` (macOS) with traffic lights at x=16, y=16 |
| Background | `#0a0e17` (prevents white flash before renderer loads) |
| Security | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: false` |
| Auto updates | `electron-updater` + GitHub Releases |

In development, the renderer loads from `ELECTRON_RENDERER_URL` (Vite dev server). In production, it loads the built `index.html`.

### Auto-update flow

- Packaged builds initialize `UpdateManager` after `app.whenReady()`
- Startup performs one background `checkForUpdates()`
- Stable builds keep plain semver versions like `0.0.2`
- Nightly builds are rewritten in CI to semver prereleases like `0.0.2-nightly.153`
- `autoUpdater.allowPrerelease` is turned on only for nightly builds, so stable installs do not receive prereleases
- Downloads are manual (`autoDownload = false`): the renderer checks first, then explicitly triggers `downloadUpdate()`
- After download completes, the renderer triggers `installUpdate()`, which calls `quitAndInstall()`

### Native application menu

`Menu.buildFromTemplate()` + `Menu.setApplicationMenu()` are configured at startup.

On macOS the top-level structure is:

- **App** (`label: app.getName()`)
  - About
  - Check for Updates
  - Settings / Preferences… (`Cmd+,`)
  - services / hide / hide others / unhide / quit
- **File**
  - New Window
  - Open File
  - Open Workspace
  - Close File
  - Save Image
  - Save Archive
- **View**
  - Profile
  - Freq × Phase
  - Time × Phase
  - Bandpass
  - PSRCAT
  - Toggle Sidebar
  - Toggle Full Screen
- **Window**
  - Minimize
  - Zoom
  - Bring All to Front
- **Help**
  - Keyboard Shortcuts
  - About
- **Debug** (development only)
  - Reload
  - Force Reload
  - Toggle Developer Tools

Renderer-owned actions are forwarded with `webContents.send('app:command', commandId)`. Main-owned actions such as creating a new window, minimizing, toggling full screen, and quitting run directly in the main process.

### IPC handlers

| Channel | Direction | Description |
|---------|-----------|-------------|
| `dialog:openFile` | invoke | `dialog.showOpenDialog` filtered to `.ar .fits .fit .sf .rf .cf .pfd` |
| `dialog:openDirectory` | invoke | `dialog.showOpenDialog({ properties: ['openDirectory'] })` |
| `dialog:saveFile` | invoke | `dialog.showSaveDialog` filtered to PNG / SVG |
| `backend:port` | invoke | Returns `8787` |
| `backend:status` | invoke | Returns `backend.isRunning()` |
| `backend:runtime` | invoke | Returns `'local'` or `'docker'` |
| `backend:restart` | invoke | Calls `backend.restart()` |
| `window:new` | invoke | Calls `createWindow(filePath?)` |
| `window:minimize` | invoke | Minimizes the current BrowserWindow |
| `window:toggleFullScreen` | invoke | Toggles fullscreen on the sender window |
| `app:quit` | invoke | Calls `app.quit()` |
| `updates:getState` | invoke | Returns the latest updater state snapshot |
| `updates:check` | invoke | Starts an update check |
| `updates:download` | invoke | Downloads the available update |
| `updates:install` | invoke | Restarts and installs a downloaded update |
| `shell:showItemInFolder` | invoke | `shell.showItemInFolder(path)` |
| `file:open` | send (main → renderer) | Sent when a window is opened with a pre-selected file path |
| `app:command` | send (main → renderer) | Native menu → focused renderer command dispatch |
| `updates:state` | send (main → renderer) | Broadcasts updater state changes to every open window |

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

`BackendProcess` manages either a host uvicorn process or a Docker-backed uvicorn container.

### Runtime selection

Runtime is selected from `PSRCHIVE_BACKEND_RUNTIME`:

- `local` — default host Python runtime
- `docker` — Docker / OrbStack runtime using `alex88ridolfi/psrchive_dspsr_presto_ubuntu22.04`

Docker mode mounts:

- the backend resource directory to `/workspace/backend`
- `/Users`
- `/Volumes`
- `/private`
- `/tmp`

That keeps absolute archive paths usable inside the container, so the renderer can continue sending host file paths unchanged.

### `start()`

Local mode spawns:
```
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8787
```

Docker mode spawns the Docker CLI and runs a container roughly equivalent to:

```bash
docker run --rm \
  --name psrchive-viewer-backend-8787 \
  -p 127.0.0.1:8787:8787 \
  -v /path/to/backend:/workspace/backend \
  alex88ridolfi/psrchive_dspsr_presto_ubuntu22.04 \
  /bin/bash -lc '(python3 -c "import fastapi,uvicorn,numpy" >/dev/null 2>&1 || python3 -m pip install -r requirements.txt) && exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8787'
```

- `cwd`: `backend/` (dev) or `process.resourcesPath/backend` (production)
- `env`: inherits process env + `PYTHONUNBUFFERED=1`
- stdout/stderr piped and logged to the main process console as `[backend]`

Waits for readiness by polling `GET http://127.0.0.1:8787/api/health` every 400 ms. Docker mode gets a longer startup window because the image may need to install Python packages on first boot.

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
  getBackendRuntime: () => Promise<BackendRuntime>
  restartBackend: () => Promise<boolean>
  newWindow: (filePath?: string) => Promise<void>
  minimizeWindow: () => Promise<void>
  toggleFullScreen: () => Promise<void>
  quitApp: () => Promise<void>
  getUpdateState: () => Promise<UpdateState | null>
  checkForUpdates: () => Promise<UpdateState | null>
  downloadUpdate: () => Promise<UpdateState | null>
  installUpdate: () => Promise<UpdateState | null>
  onFileOpen: (callback: (path: string) => void) => void
  onAppCommand: (callback: (commandId: AppCommandId) => void) => () => void
  onUpdateState: (callback: (state: UpdateState) => void) => () => void
}
```

`onFileOpen` registers a persistent `ipcRenderer.on` listener for the `file:open` event, which the main process sends when a window is created with a pre-loaded file path.

`onAppCommand` subscribes the renderer to native-menu events so the custom title bar menu, global shortcuts, and the macOS menu bar can all reuse the same command handler map in `App.tsx`.

`onUpdateState` subscribes the renderer to updater status broadcasts so the UI can move through `checking → available → downloading → downloaded`.

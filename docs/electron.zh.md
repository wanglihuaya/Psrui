# Electron 层

English version: [electron.md](electron.md)

## 主进程（`src/main/index.ts`）

Electron 主进程入口，职责包括：

- 启动 FastAPI backend（`BackendProcess`）
- 创建 `BrowserWindow`
- 注册全部 IPC handlers
- 用 `Set<BrowserWindow>` 管理多窗口状态
- 构建 macOS 原生应用菜单与仅开发环境显示的 `Debug` 菜单
- 通过 `app:command` 把共享命令发送给当前聚焦的 renderer

### 窗口配置

| 选项 | 值 |
|------|----|
| 尺寸 | 1440 × 900，最小 960 × 640 |
| 标题栏 | `hiddenInset`（macOS），红绿灯位置 x=16, y=16 |
| 背景色 | `#0a0e17`（避免 renderer 加载前出现白屏） |
| 安全相关 | `contextIsolation: true`、`nodeIntegration: false`、`sandbox: false` |
| 自动更新 | `electron-updater` + GitHub Releases |

开发环境下，renderer 从 `ELECTRON_RENDERER_URL`（Vite dev server）加载；生产环境下加载打包后的 `index.html`。

### 自动更新流程

- 打包版在 `app.whenReady()` 之后初始化 `UpdateManager`
- 启动时会自动后台执行一次 `checkForUpdates()`
- 稳定版保留普通 semver，例如 `0.0.2`
- nightly 会在 CI 中改写成 `0.0.2-nightly.153` 这样的 prerelease 版本
- 只有 nightly 构建才开启 `autoUpdater.allowPrerelease`，因此 stable 安装包不会收到 prerelease
- 下载是手动触发的（`autoDownload = false`）：先检查，再显式调用 `downloadUpdate()`
- 下载完成后，renderer 触发 `installUpdate()`，主进程内部执行 `quitAndInstall()`

### 原生应用菜单

启动时通过 `Menu.buildFromTemplate()` + `Menu.setApplicationMenu()` 创建。

在 macOS 下，顶层结构为：

- **App**（`label: app.getName()`）
  - About
  - Check for Updates
  - Settings / Preferences…（`Cmd+,`）
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
- **Debug**（仅开发环境）
  - Reload
  - Force Reload
  - Toggle Developer Tools

属于 renderer 的动作通过 `webContents.send('app:command', commandId)` 转发。属于 main 的动作，例如创建新窗口、最小化、切全屏、退出应用，则直接在主进程执行。

### IPC handlers

| Channel | 方向 | 说明 |
|---------|------|------|
| `dialog:openFile` | invoke | `dialog.showOpenDialog`，过滤 `.ar .fits .fit .sf .rf .cf .pfd` |
| `dialog:openDirectory` | invoke | `dialog.showOpenDialog({ properties: ['openDirectory'] })` |
| `dialog:saveFile` | invoke | `dialog.showSaveDialog`，用于 PNG / SVG |
| `backend:port` | invoke | 返回 `8787` |
| `backend:status` | invoke | 返回 `backend.isRunning()` |
| `backend:runtime` | invoke | 返回 `'local'` 或 `'docker'` |
| `backend:restart` | invoke | 调用 `backend.restart()` |
| `window:new` | invoke | 调用 `createWindow(filePath?)` |
| `window:minimize` | invoke | 最小化当前 BrowserWindow |
| `window:toggleFullScreen` | invoke | 切换发送方窗口的全屏状态 |
| `app:quit` | invoke | 调用 `app.quit()` |
| `updates:getState` | invoke | 返回当前 updater 状态快照 |
| `updates:check` | invoke | 开始检查更新 |
| `updates:download` | invoke | 下载可用更新 |
| `updates:install` | invoke | 重启并安装已下载更新 |
| `shell:showItemInFolder` | invoke | `shell.showItemInFolder(path)` |
| `file:open` | send（main → renderer） | 窗口带预选文件打开时发送 |
| `app:command` | send（main → renderer） | 原生菜单向聚焦窗口派发命令 |
| `updates:state` | send（main → renderer） | 向所有窗口广播 updater 状态变更 |

### 应用生命周期

```text
app.whenReady
  -> registerIPC()
  -> backend.start()     <- 最长等待 15 s
  -> createWindow()

app.activate（macOS dock 点击）
  -> 如果没有窗口则 createWindow()

window-all-closed
  -> backend.stop()
  -> 非 macOS 平台上 app.quit()

before-quit
  -> backend.stop()
```

---

## Backend 进程管理器（`src/main/backend.ts`）

`BackendProcess` 负责管理宿主机 uvicorn 进程，或者 Docker 模式下的 uvicorn 容器。

### Runtime 选择

通过 `PSRCHIVE_BACKEND_RUNTIME` 决定：

- `local`：默认，宿主机 Python runtime
- `docker`：Docker / OrbStack runtime，使用 `alex88ridolfi/psrchive_dspsr_presto_ubuntu22.04`

Docker 模式会挂载：

- backend 资源目录到 `/workspace/backend`
- `/Users`
- `/Volumes`
- `/private`
- `/tmp`

这样 renderer 传来的绝对归档路径可以原样在容器内使用，不需要做路径映射。

### `start()`

Local 模式启动：

```text
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8787
```

Docker 模式等价于执行下面这种 `docker run`：

```bash
docker run --rm \
  --name psrchive-viewer-backend-8787 \
  -p 127.0.0.1:8787:8787 \
  -v /path/to/backend:/workspace/backend \
  alex88ridolfi/psrchive_dspsr_presto_ubuntu22.04 \
  /bin/bash -lc '(python3 -c "import fastapi,uvicorn,numpy" >/dev/null 2>&1 || python3 -m pip install -r requirements.txt) && exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8787'
```

- `cwd`：开发环境是 `backend/`，生产环境是 `process.resourcesPath/backend`
- `env`：继承当前进程环境变量，并补充 `PYTHONUNBUFFERED=1`
- stdout / stderr 都会被接管，并以 `[backend]` 前缀打印到主进程控制台

就绪检测通过轮询 `GET http://127.0.0.1:8787/api/health` 完成。Docker 模式会给更长一点的启动窗口，因为镜像首次启动时可能需要安装 Python 依赖。

### `stop()`

向子进程发送 `SIGTERM`。

### `restart()`

`stop()` → 等待 500 ms → `start()`

---

## Preload / context bridge（`src/preload/index.ts`）

通过 `contextBridge.exposeInMainWorld` 在 `window.electron` 上暴露强类型 `ElectronAPI`。

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

`onFileOpen` 注册 `ipcRenderer.on('file:open')` 监听器，用来接收主进程在“带文件路径创建窗口”时派发的事件。

`onAppCommand` 让 renderer 订阅原生菜单命令，这样自定义标题栏菜单、全局快捷键、macOS 顶部菜单都可以共用 `App.tsx` 里的同一套 command handler map。

`onUpdateState` 订阅 updater 状态广播，让 UI 可以跟随 `checking → available → downloading → downloaded` 状态推进。

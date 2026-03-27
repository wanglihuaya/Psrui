# 架构

English version: [architecture.md](architecture.md)

PSRCHIVE Viewer 是一个由三层协同组成的桌面应用：

```
┌─────────────────────────────────────────────────────────────┐
│                      Electron Shell                         │
│                                                             │
│  src/main/index.ts      — 窗口生命周期、IPC、原生菜单       │
│  src/main/backend.ts    — FastAPI 进程 / 容器管理器         │
│  src/preload/index.ts   — Context bridge（IPC → renderer）  │
├─────────────────────────────────────────────────────────────┤
│                    React Renderer                           │
│                                                             │
│  App.tsx                — 根组件：数据加载、快捷键、命令映射 │
│  components/            — UI 组件                           │
│  lib/api.ts             — backend HTTP client               │
│  lib/store.ts           — 全局临时状态（Jotai atoms）       │
│  lib/settings.ts        — 持久化设置 atoms                  │
│  lib/i18n.ts            — EN / ZH 翻译表                    │
│  lib/shortcuts.ts       — 键盘快捷键定义                    │
├─────────────────────────────────────────────────────────────┤
│                   FastAPI Backend                           │
│                                                             │
│  app/main.py            — FastAPI app、CORS 配置            │
│  app/routes.py          — REST 接口                         │
│  app/data_provider.py   — 抽象 provider 与具体实现          │
│  app/psrcat.py          — PSRCAT 数据库解析器               │
└─────────────────────────────────────────────────────────────┘
```

## 通信流

### 启动流程

1. Electron main process 根据 `PSRCHIVE_BACKEND_RUNTIME` 决定启动宿主机 `python3 -m uvicorn app.main:app --port 8787`，还是启动 Docker 容器。
2. `BackendProcess.waitForReady()` 每 300 ms 轮询一次 `GET /api/health`（超时 15 s）。
3. backend 就绪后，`createWindow()` 打开 renderer；renderer 自己也会继续轮询 `/api/health`，成功后把 `backendReadyAtom = true`。

### 文件加载（renderer → backend）

```text
用户选择 .ar / .fits 文件
  → App.tsx: Promise.allSettled([loadArchive, getProfile, getWaterfall, getTimePhase, getBandpass])
  → lib/api.ts: fetch() → FastAPI routes.py
  → data_provider.py: PsrchiveProvider 或 MockProvider
  → JSON 响应 → Jotai atoms → Plotly 图表
```

### IPC（renderer ↔ main）

所有 IPC 都通过 `contextBridge` 暴露；renderer 调用 `window.electron.*`，底层映射到 `ipcRenderer.invoke()`。

| `window.electron` 方法 | IPC channel | main handler |
|---|---|---|
| `openFile()` | `dialog:openFile` | `dialog.showOpenDialog` |
| `openDirectory()` | `dialog:openDirectory` | `dialog.showOpenDialog` |
| `saveFile(name)` | `dialog:saveFile` | `dialog.showSaveDialog` |
| `showInFolder(path)` | `shell:showItemInFolder` | `shell.showItemInFolder` |
| `getBackendPort()` | `backend:port` | 返回 `8787` |
| `getBackendStatus()` | `backend:status` | `backend.isRunning()` |
| `getBackendRuntime()` | `backend:runtime` | 返回 `'local'` 或 `'docker'` |
| `restartBackend()` | `backend:restart` | `backend.restart()` |
| `newWindow(path?)` | `window:new` | `createWindow(path)` |
| `onFileOpen(cb)` | `file:open`（监听） | main 在文件关联打开时发送 |

## 数据 provider 抽象

`data_provider.py` 里定义了 `DataProvider` 抽象基类，包含 5 个核心方法：

```python
get_metadata(path)    → dict
get_profile(path, *, subint, chan)   → dict
get_waterfall(path, *, subint)       → dict
get_time_phase(path, *, chan)        → dict
get_bandpass(path)                   → dict
```

`get_provider()` 会先尝试 `PsrchiveProvider()`；如果 `ImportError`，再回退到 `MockProvider()`。

## 状态管理

全局状态全部使用 Jotai 管理（没有 Redux，也没有 Context API）。

- **临时状态**（`lib/store.ts`）：页面刷新后重置
- **持久化状态**（`lib/settings.ts`）：通过 `atomWithStorage` 写入 `localStorage`

完整 atom 参考见 [state.zh.md](state.zh.md)。

如果你想看 local / Docker runtime 的完整区别，以及从 archive 到 Plotly 的数据链路，继续看 [data-flow.zh.md](data-flow.zh.md)。

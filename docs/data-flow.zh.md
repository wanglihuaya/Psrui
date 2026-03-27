# Runtime 与数据流

English version: [data-flow.md](data-flow.md)

这份文档专门解释应用当前的端到端逻辑：

1. 不使用 Docker 时，backend 是怎么启动的
2. 使用 Docker / OrbStack 时，backend 是怎么启动的
3. 一个 archive 文件从文件选择器走到最终图表渲染的路径
4. `psrchive` 在代码里到底是怎么被调用的

---

## 1. Runtime 模式

Electron 壳层始终通过同一个地址访问 backend：

- `http://127.0.0.1:8787`

变化的只有一件事：**这个 backend 进程是怎么被拉起来的**。

### Local runtime

默认模式：

- `PSRCHIVE_BACKEND_RUNTIME` 未设置，或显式设为 `local`
- Electron main process 直接启动宿主机 Python
- 等价命令：

```bash
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8787
```

代码路径：

- `src/main/backend.ts`
  - `resolveRuntime()`
  - `spawnLocalBackend()`

适合场景：

- 宿主机 Python 已经具备你需要的依赖
- 你可以接受本机安装 `psrchive`，或者让它回退到 mock provider

### Docker / OrbStack runtime

Docker 模式下：

- `PSRCHIVE_BACKEND_RUNTIME=docker`
- Electron 仍然访问 `127.0.0.1:8787`
- 但 backend 实际运行在镜像 `alex88ridolfi/psrchive_dspsr_presto_ubuntu22.04` 内

代码路径：

- `src/main/backend.ts`
  - `resolveRuntime()`
  - `spawnDockerBackend()`
- `src/shared/backend.ts`

大致等价于下面这个 `docker run`：

```bash
docker run --rm \
  --name psrchive-viewer-backend-8787 \
  -p 127.0.0.1:8787:8787 \
  -v <repo>/backend:/workspace/backend \
  -v /Users:/Users \
  -v /Volumes:/Volumes \
  -v /private:/private \
  -v /tmp:/tmp \
  alex88ridolfi/psrchive_dspsr_presto_ubuntu22.04 \
  /bin/bash -lc '(python3 -c "import fastapi,uvicorn,numpy" >/dev/null 2>&1 || python3 -m pip install -r requirements.txt) && exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8787'
```

为什么宿主机路径要按原路径挂载：

- renderer 会直接发送 macOS 绝对路径，比如 `/Users/lihua/Downloads/psrchive/a/gl98_910.fits`
- backend 直接把这个字符串传给 provider
- 因此 Docker 模式必须把 `/Users`、`/Volumes`、`/private`、`/tmp` 原样挂进容器
- 这样 backend 完全不需要做路径转换

常用命令：

```bash
npm run backend:docker:pull
npm run backend:docker
npm run dev:docker
```

---

## 2. 启动流程

### Electron 主进程

主入口：

- `src/main/index.ts`

启动顺序：

1. `app.whenReady()`
2. `registerIPC()`
3. `backend = new BackendProcess(8787)`
4. `backend.start()`
5. `BackendProcess.waitForReady()` 轮询 `GET /api/health`
6. `createWindow()`

主进程通过 preload 向 renderer 暴露 backend 相关接口：

- `backend:status`
- `backend:runtime`
- `backend:restart`

### Renderer 启动

renderer 入口：

- `src/renderer/src/App.tsx`

挂载后 renderer 会：

1. 轮询 `api.health()`，直到 backend 就绪
2. 通过 preload 获取 `getBackendRuntime()`
3. 订阅 updater 状态
4. 等待某个文件变为 active

因此无论 local 还是 Docker 模式，renderer 看到的都是相同接口：

- 相同的 API base URL
- 相同的响应结构
- 相同的图表渲染流程

---

## 3. 文件到图表的主链路

这是归档数据最核心的流转路径。

### Step A：用户选择文件或 workspace

文件选择路径：

- 标题栏 / sidebar / 快捷键 / 原生菜单
- `window.electron.openFile()`
- main process 的 `dialog:openFile`
- 返回绝对文件路径

workspace 选择路径：

- `window.electron.openDirectory()`
- 路径写入 `workspacePathAtom`
- sidebar 再调用 `/api/files/tree?dir=...` 构建 explorer

相关文件：

- `src/preload/index.ts`
- `src/main/index.ts`
- `src/renderer/src/components/Sidebar.tsx`

### Step B：renderer 设置当前激活文件

文件被选中后：

- `currentFileAtom` 更新
- `openFilesAtom` 更新

随后会触发 `App.tsx` 中负责加载归档的 effect。

### Step C：renderer 并行发起 5 个 backend 请求

应用通过 `Promise.allSettled()` 一次性请求：

1. `/api/archive`
2. `/api/archive/profile`
3. `/api/archive/waterfall`
4. `/api/archive/time-phase`
5. `/api/archive/bandpass`

API client 位于：

- `src/renderer/src/lib/api.ts`

这意味着元数据与各类图表数组是并行获取的，而不是串行等待。

### Step D：renderer 将响应写入 Jotai atoms

接口与 atom 的映射关系：

- `/api/archive` → `metadataAtom`
- `/api/archive/profile` → `profileDataAtom`
- `/api/archive/waterfall` → `waterfallDataAtom`
- `/api/archive/time-phase` → `timePhaseDataAtom`
- `/api/archive/bandpass` → `bandpassDataAtom`

这些 atom 定义在：

- `src/renderer/src/lib/store.ts`

一个关键行为：

- 如果 metadata 请求失败，`App.tsx` 会抛出 `meta.reason`
- 所以 metadata 实际上是“这次文件加载是否算成功”的门槛
- 即便其他几个图表请求已经成功返回，也会被整体视为一次失败加载

### Step E：MainPanel 渲染当前选中的图表布局

布局控制器：

- `src/renderer/src/components/MainPanel.tsx`

MainPanel 可以在四种视图之间切换：

- `ProfileChart`
- `WaterfallChart`
- `TimePhaseChart`
- `BandpassChart`

也可以选择四种布局：

- 单图
- 左右双列
- 上下双行
- 2×2 四宫格

分屏布局 **不会** 触发额外 backend 请求。  
它只是复用已经加载好的 atoms，然后渲染不同的图表组件。

---

## 4. 图像是怎么生成的

backend **不会** 直接生成 PNG 图像文件。

backend 返回的是 JSON 数组；真正把这些数组变成图像的是 renderer 里的 Plotly 组件。

### Profile

- 组件：`ProfileChart.tsx`
- 输入 atom：`profileDataAtom`
- 输出：Plotly line traces，对应 Stokes I，以及可选的 Q / U / V

### Frequency × Phase

- 组件：`WaterfallChart.tsx`
- 输入 atom：`waterfallDataAtom`、`metadataAtom`
- 输出：Plotly `heatmap`
- `metadataAtom` 负责提供频率范围等坐标标注信息

### Time × Phase

- 组件：`TimePhaseChart.tsx`
- 输入 atom：`timePhaseDataAtom`、`metadataAtom`
- 输出：Plotly `heatmap`
- `metadataAtom` 提供总时长等标注信息

### Bandpass

- 组件：`BandpassChart.tsx`
- 输入 atom：`bandpassDataAtom`
- 输出：Plotly line chart

### 共用 Plotly 层

所有图表最终都通过：

- `PlotlyWrapper.tsx`

来渲染。

因此真正的可视化链路是：

```text
archive 文件路径
  -> backend JSON
  -> Jotai atoms
  -> chart component
  -> Plotly trace / layout objects
  -> renderer 中的 canvas / SVG
```

---

## 5. `psrchive` 是怎么被调用的

真正的 `psrchive` 集成位于：

- `backend/app/data_provider.py`

里面有两个 provider：

- `MockProvider`
- `PsrchiveProvider`

选择逻辑是：

```python
try:
    return PsrchiveProvider()
except ImportError:
    return MockProvider()
```

也就是说：

- 只要 Python 成功 `import psrchive`，应用就用真实 archive reader
- 否则自动回退到 mock 数据

### Metadata 路径

`PsrchiveProvider.get_metadata(path)` 会执行：

1. `ar = psrchive.Archive_load(path)`
2. `ar.remove_baseline()`
3. `first_integration = ar.get_Integration(0)`
4. 读取：
   - `ar.get_source()`
   - `ar.get_telescope()`
   - `ar.get_backend_name()`
   - `ar.get_centre_frequency()`
   - `ar.get_bandwidth()`
   - `ar.get_nchan()`
   - `ar.get_nsubint()`
   - `ar.get_nbin()`
   - `ar.get_npol()`
   - `first_integration.get_folding_period()`
   - `ar.get_dispersion_measure()`
   - `ar.integration_length()`

### Profile 路径

`PsrchiveProvider.get_profile(path, subint, chan)` 会执行：

1. `Archive_load(path)`
2. `remove_baseline()`
3. `dedisperse()`
4. 如果 `subint` 未指定，则 `tscrunch()`
5. 如果 `chan` 未指定，则 `fscrunch()`
6. `data = ar.get_data()`
7. 从 `data[si, pol, ch]` 中返回 Stokes 数组

### Frequency × Phase 路径

`PsrchiveProvider.get_waterfall(path, subint)` 会执行：

1. `Archive_load(path)`
2. `remove_baseline()`
3. `dedisperse()`
4. `subint` 未指定时执行 `tscrunch()`
5. `data = ar.get_data()`
6. 返回 `data[si, 0]` 作为热力图矩阵

### Time × Phase 路径

`PsrchiveProvider.get_time_phase(path, chan)` 会执行：

1. `Archive_load(path)`
2. `remove_baseline()`
3. `dedisperse()`
4. `chan` 未指定时执行 `fscrunch()`
5. `data = ar.get_data()`
6. 返回 `data[:, 0, ch]`

### Bandpass 路径

`PsrchiveProvider.get_bandpass(path)` 会执行：

1. `Archive_load(path)`
2. `remove_baseline()`
3. `tscrunch()`
4. `data = ar.get_data()`
5. 计算 `bandpass = data[0, 0].mean(axis=1)`

所以这里并不是通过外部 CLI 命令去驱动 `psrchive`。  
它是在 FastAPI 进程内部，以 **Python binding** 的方式直接调用。

---

## 6. Local 与 Docker 到底差在哪

从 renderer 与图表层看：

- 没有区别
- 同样的 `fetch()`
- 同样的 endpoints
- 同样的 atoms
- 同样的 Plotly 组件

从 backend runtime 层看：

- **local**：使用宿主机 Python 与宿主机安装的 `psrchive`
- **docker**：使用容器内 Python 与容器内安装的 `psrchive`

从 provider 层看：

- 仍然没有区别
- 两种模式里都是通过 Python `import psrchive`
- 两种模式里调用的都是 `Archive_load()` 和同一批 `Archive` 方法

所以 runtime 的差异只在这里：

```text
renderer -> preload -> Electron main
                     -> local python process
                     或
                     -> docker container
```

backend 一旦启动成功，后面的整条数据链就完全一致。

---

## 7. 相关文档

- [architecture.zh.md](architecture.zh.md)
- [backend.zh.md](backend.zh.md)
- [electron.zh.md](electron.zh.md)
- [components.zh.md](components.zh.md)
- [state.zh.md](state.zh.md)

# 后端

English version: [backend.md](backend.md)

后端是位于 `backend/app/` 下的 FastAPI 应用，通过 uvicorn 监听 `127.0.0.1:8787`。

它支持两种运行模式：

- **Local runtime**：在宿主机上直接启动 `python3 -m uvicorn ...`
- **Docker runtime**：在 `alex88ridolfi/psrchive_dspsr_presto_ubuntu22.04` 容器内启动 backend

如果你关心从“选中文件”到“Plotly 出图”的完整链路，建议直接看 [data-flow.zh.md](data-flow.zh.md)。

## 入口文件

| 文件 | 作用 |
|------|------|
| `app/main.py` | 创建 FastAPI app，配置 CORS（本地桌面应用默认全开），并把 router 挂在 `/api` |
| `app/routes.py` | 所有 REST endpoint handler；模块加载时初始化 `DataProvider` 和 `PsrcatDB` |
| `app/data_provider.py` | 抽象 `DataProvider` 基类 + `MockProvider` + `PsrchiveProvider` |
| `app/psrcat.py` | 解析 `backend/data/psrcat_tar/psrcat.db`，并提供查询方法 |
| `../src/main/backend.ts` | Electron 侧的 runtime 选择器，以及进程 / 容器生命周期管理 |

## 数据 provider

### `MockProvider`

当 `psrchive` Python bindings 不可用时启用。所有数据都根据文件路径做确定性生成（以 hash 为随机种子），因此同一路径每次都会得到一致的假数据。

生成内容包括：

- 1 到 3 个高斯分量组成的 pulse profile
- 带通道增益变化和约 3% RFI 通道的 frequency-phase waterfall
- 带 scintillation 抖动和约 2% dropout subint 的 time-phase 数组
- 带平滑包络和 3 个 RFI spikes 的 bandpass 曲线

### `PsrchiveProvider`

对真实 `psrchive` Python bindings 的轻量封装。每次请求都会加载 archive，调用 `remove_baseline()` 和 `dedisperse()`，再根据接口需要执行 time / frequency scrunch，然后提取最终数据。

### `get_provider()` 自动探测

```python
try:
    return PsrchiveProvider()
except ImportError:
    return MockProvider()
```

也就是说：

- 只要 Python 能 `import psrchive`，应用就会使用真实 archive reader
- 如果 bindings 不可用，就自动回退到 mock 数据

## PSRCAT 解析器（`psrcat.py`）

读取扁平文本格式的 `psrcat.db`（记录之间用 `@` 分隔）。

**直接解析的字段**：`PSRJ`, `PSRB`, `RAJ`, `DECJ`, `P0`, `P1`, `F0`, `F1`, `DM`, `S400`, `S1400`, `DIST`, `DIST_DM`, `TYPE`, `ASSOC`, `SURVEY`, `PB`, `BINARY`, `GL`, `GB`, `AGE`, `BSURF`, `EDOT`, `W50`

**`_process_pulsar()` 派生字段**：

- `P0` / `P1` 缺失时，会从 `F0` / `F1` 反推：`P0 = 1 / F0`，`P1 = -F1 / F0^2`
- `RAJ_deg`、`DECJ_deg`：从 HH:MM:SS / DD:MM:SS 转为角度
- `derived_B_surf`：`3.2×10^19 * sqrt(P0 * P1)`（Gauss）
- `derived_tau_c`：`P0 / (2 * P1)`（seconds）
- `derived_Edot`：`4π² × 10^45 × P1 / P0^3`（erg/s）

**分类规则**（`class` 字段）：

| 分类 | 条件 |
|------|------|
| `Magnetar` | `TYPE` 含 `AXP` 或 `SGR` |
| `MSP` | `P0 < 0.03` s |
| `Binary` | 存在 `PB` 或 `BINARY` 字段 |
| `Normal` | 其他情况 |

## 单独运行 backend

```bash
# 开发模式（auto-reload）
npm run backend:dev

# 或直接运行：
cd backend && python3 -m uvicorn app.main:app --reload --port 8787
```

### 通过 Docker / OrbStack 运行

Electron 壳层可以通过下面方式切到 Docker 模式：

```bash
PSRCHIVE_BACKEND_RUNTIME=docker npm run dev
```

便捷命令：

```bash
npm run backend:docker:pull   # 拉取 alex88ridolfi/psrchive_dspsr_presto_ubuntu22.04
npm run backend:docker        # 只跑 backend 容器，监听 127.0.0.1:8787
npm run dev:docker            # Electron dev + Docker backend
```

`PSRCHIVE_BACKEND_RUNTIME` 取值：

- `local`：默认，宿主机 Python runtime
- `docker`：容器 runtime，使用带 PSRCHIVE 的镜像

Docker 模式会把这些宿主机路径按原样挂进容器，确保归档文件路径在容器内仍然有效：

- `/Users`
- `/Volumes`
- `/private`
- `/tmp`

此外还会把仓库里的 `backend/` 目录挂到 `/workspace/backend`，并在镜像里缺少依赖时按需安装 `fastapi`、`uvicorn`、`numpy`。

## 安装 psrchive

### 在 macOS + OrbStack 上的推荐方式

优先使用 Docker，不建议在本机直接编译 PSRCHIVE：

```bash
npm run backend:docker:pull
PSRCHIVE_BACKEND_RUNTIME=docker npm run dev
```

backend 启动后，如果镜像里的 bindings 正常工作，`/api/health` 应返回 `"provider": "psrchive"`。

### 宿主机原生安装

```bash
# conda（推荐）
conda install -c conda-forge psrchive

# 从源码编译
git clone git://git.code.sf.net/p/psrchive/code psrchive
cd psrchive && ./bootstrap && ./configure && make && make install
```

安装完成后重启 backend；此时 `/api/health` 会返回 `"provider": "psrchive"`。

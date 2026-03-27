# PSRCHIVE Viewer

English version: [README.md](README.md)

基于 Electron + FastAPI + Plotly.js 的脉冲星数据交互分析桌面应用。

它将 [PSRCHIVE](https://psrchive.sourceforge.net/) 这套脉冲星数据处理工具包装成现代桌面 UI，并用交互式可视化替代传统的 X11 / PGPLOT 工作流。

## 桌面体验

- 统一命令系统：自定义标题栏菜单、macOS 原生顶部菜单栏、键盘快捷键共用同一组 command id。
- 更贴近 macOS 的桌面壳层：`hiddenInset` 红绿灯、自定义图标命令菜单，以及开发环境专属的 `Debug` 原生菜单。
- 分类式设置中心：双栏设置 UI，包含 App、Appearance、Workspace、Backend、Shortcuts、About。
- 更新状态联动：标题栏和设置中心都会展示 updater 当前状态。

## 架构

```
┌─────────────────────────────────────────────────────┐
│                    Electron App                      │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │  File Sidebar │  │  Plotly.js   │                 │
│  │  (drag .ar)  │  │ Charts       │                 │
│  └──────┬───────┘  └──────▲───────┘                 │
│         │     HTTP (localhost:8787)  │                │
├─────────┼──────────────────┼────────────────────────┤
│  ┌──────────────────────────────────────────────┐   │
│  │           FastAPI Python Backend              │   │
│  │  • psrchive bindings（可用时）                │   │
│  │  • Mock 数据（开发兜底）                     │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面壳层 | Electron 41, electron-vite 3 |
| 前端 | React 19, TypeScript 5.8, TailwindCSS 4, Jotai |
| 图表 | Plotly.js 3.4（缩放 / 平移 / hover） |
| UI | Radix UI primitives, Lucide icons |
| 后端 | FastAPI 0.115, uvicorn, numpy |
| 数据 | PSRCHIVE Python bindings（可选）+ mock fallback |

## 快速开始

### 前置要求

- Node.js ≥ 18
- Python 3.9+
- npm

### 安装

```bash
# 前端依赖
npm install

# 后端依赖
cd backend && pip3 install -r requirements.txt && cd ..
```

### 开发

```bash
# 一键启动（Electron 会自动拉起 backend）
npm run dev

# 或者把 backend 单独跑起来便于调试
npm run backend:dev    # terminal 1
npm run dev            # terminal 2
```

### 使用 OrbStack / Docker 运行 PSRCHIVE

如果你希望使用真实的 `psrchive` bindings，但不想在 macOS 本机直接安装，这个仓库可以把 FastAPI backend 跑在 Docker 镜像 [`alex88ridolfi/psrchive_dspsr_presto_ubuntu22.04`](https://hub.docker.com/r/alex88ridolfi/psrchive_dspsr_presto_ubuntu22.04) 里。

```bash
# 首次拉取镜像
npm run backend:docker:pull

# 启动完整 Electron 应用，backend 走 Docker
npm run dev:docker

# 只启动 backend 容器用于调试
npm run backend:docker
```

Docker runtime 会把 `/Users`、`/Volumes`、`/private`、`/tmp` 以相同绝对路径挂进容器，这样从 Finder 打开的归档文件路径在容器里也能直接访问，无需额外路径转换。

### 构建

```bash
npm run build          # 生产构建
npm run build:mac      # 打包 macOS 应用
```

## 发版自动化

- 推送到 `main`：GitHub Actions 会自动构建 macOS、Linux、Windows 包，并发布 nightly prerelease。
- 推送 `v0.0.2` 这种 tag：GitHub Actions 会构建同一批产物，并创建稳定版 GitHub Release。
- 手动触发：也可以在 Actions 页面通过 `workflow_dispatch` 执行 `Release` workflow。
- `main` 分支产物会在 CI 中把应用版本改写成 `0.0.1-nightly.153` 这种 semver prerelease，方便夜版检测后续夜版更新。
- tag 触发的稳定版会把应用版本改写成 tag 对应的正式版本号，例如 `v0.0.2` → `0.0.2`。
- 稳定版 release 的 `desc` / body 取自 annotated tag message，所以请使用 `git tag -a v0.0.2 -m "..."`，并把 release notes 写在 tag 内容里。
- 应用内更新由 `electron-updater` 负责：打包版启动后自动检查，Help 菜单可手动检查，发现更新后按需下载，下载完成后通过重启安装。
- macOS 原生菜单里的 Settings、视图切换、Window 动作、Help 都会走和自定义标题栏菜单相同的 renderer command map。
- 更新通道严格分离：nightly 安装包只接收 GitHub prerelease，stable 安装包只接收 stable release。

更完整的发版步骤和 release note 模板见 [docs/release.zh.md](docs/release.zh.md)。

工作流定义在 `.github/workflows/release.yml`，默认使用仓库自带的 `GITHUB_TOKEN`，标准 GitHub Release 场景不需要额外发布 token。

如果仓库的 GitHub Actions workflow 权限被限制为只读，创建 release 时可能会报 `403 Resource not accessible by integration`。这时可以：

- 在 `Settings -> Actions -> General -> Workflow permissions` 中切到 `Read and write permissions`，或
- 增加一个仓库 secret：`RELEASE_TOKEN`，并赋予当前仓库创建 release 的权限。

## 项目结构

```
psrchive-ele/
├── src/
│   ├── main/
│   │   ├── index.ts       # 窗口生命周期、IPC、原生菜单
│   │   ├── backend.ts     # FastAPI 生命周期管理
│   │   └── updater.ts     # electron-updater 集成
│   ├── preload/
│   │   └── index.ts       # Context bridge（IPC → renderer）
│   ├── shared/
│   │   ├── commands.ts    # 菜单 / 快捷键 / UI 共享 command id
│   │   └── update.ts      # 共享 updater 状态类型
│   └── renderer/src/
│       ├── App.tsx         # 根组件：数据加载与 command handlers
│       ├── components/
│       │   ├── TitleBar.tsx       # 图标命令菜单 + 更新状态
│       │   ├── Sidebar.tsx
│       │   ├── MainPanel.tsx
│       │   ├── StatusBar.tsx
│       │   ├── SettingsPanel.tsx  # 分类设置中心
│       │   ├── HelpPanel.tsx
│       │   └── charts/
│       │       ├── PlotlyWrapper.tsx
│       │       ├── ProfileChart.tsx
│       │       ├── WaterfallChart.tsx
│       │       ├── TimePhaseChart.tsx
│       │       ├── BandpassChart.tsx
│       │       └── PsrcatView.tsx
│       └── lib/
│           ├── api.ts        # 后端 HTTP client + TypeScript 类型
│           ├── store.ts      # 临时 Jotai atoms
│           ├── settings.ts   # 持久化 Jotai atoms
│           ├── i18n.ts       # EN / ZH 翻译表
│           └── shortcuts.ts  # 快捷键定义
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app
│   │   ├── routes.py        # REST endpoints
│   │   ├── data_provider.py # Mock / 真正的 psrchive 数据提供者
│   │   └── psrcat.py        # PSRCAT 数据库解析器
│   └── requirements.txt
├── docs/                    # 开发者文档
│   ├── architecture.md
│   ├── architecture.zh.md
│   ├── api.md
│   ├── api.zh.md
│   ├── components.md
│   ├── components.zh.md
│   ├── data-flow.md
│   ├── data-flow.zh.md
│   ├── state.md
│   ├── state.zh.md
│   ├── shortcuts.md
│   ├── shortcuts.zh.md
│   ├── backend.md
│   ├── backend.zh.md
│   ├── electron.md
│   ├── electron.zh.md
│   ├── release.md
│   └── release.zh.md
├── electron.vite.config.ts
├── electron-builder.yml
└── package.json
```

## API 端点

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/health` | 后端状态 + provider 名称 |
| GET | `/api/files?dir=` | 列出目录中的归档文件 |
| GET | `/api/archive?path=` | 归档元数据 |
| GET | `/api/archive/profile` | 脉冲轮廓（Stokes I/Q/U/V） |
| GET | `/api/archive/waterfall` | Frequency × Phase 热力图 |
| GET | `/api/archive/time-phase` | Time × Phase 热力图 |
| GET | `/api/archive/bandpass` | 每个频率通道的平均强度 |
| GET | `/api/psrcat/pulsars` | 全部 PSRCAT pulsars |
| GET | `/api/psrcat/pulsar/{n}` | 按名称查询单个 pulsar |
| GET | `/api/psrcat/stats` | PSRCAT 汇总统计 |

完整请求 / 响应 schema 见 [docs/api.zh.md](docs/api.zh.md)。

## PSRCHIVE 集成

后端会自动检测 `psrchive` 是否可用：

- **安装了 psrchive**：使用 `psrchive.Archive_load()` 读取真实 `.ar` / `.fits` 数据
- **未安装 psrchive**：使用 numpy 生成拟真的 mock 数据，方便前端开发

如果你在 macOS + OrbStack 环境下开发，可以不在本机装原生 bindings，而直接用 Docker backend：

```bash
npm run backend:docker:pull
PSRCHIVE_BACKEND_RUNTIME=docker npm run dev
```

`PSRCHIVE_BACKEND_RUNTIME` 支持：

- `local`：默认值，启动 `python3 -m uvicorn ...`
- `docker`：在 `alex88ridolfi/psrchive_dspsr_presto_ubuntu22.04` 容器内运行 backend

安装 psrchive 的方式：

```bash
# conda（推荐）
conda install -c conda-forge psrchive

# 或从源码编译
git clone git://git.code.sf.net/p/psrchive/code psrchive
cd psrchive && ./bootstrap && ./configure && make && make install
```

## 开发文档

| 文档 | 说明 |
|------|------|
| [docs/architecture.zh.md](docs/architecture.zh.md) | 系统总览、通信流、状态管理入口 |
| [docs/api.zh.md](docs/api.zh.md) | 完整 REST API 参考与请求 / 响应结构 |
| [docs/data-flow.zh.md](docs/data-flow.zh.md) | local / Docker runtime 对比、文件到图表的数据链路、`psrchive` 实际调用路径 |
| [docs/components.zh.md](docs/components.zh.md) | React 组件职责、props、行为与子结构 |
| [docs/state.zh.md](docs/state.zh.md) | 所有 Jotai atoms、类型、默认值与持久化规则 |
| [docs/shortcuts.zh.md](docs/shortcuts.zh.md) | 键盘快捷键与新增快捷键方式 |
| [docs/backend.zh.md](docs/backend.zh.md) | FastAPI 内部结构、数据 provider、PSRCAT 解析 |
| [docs/electron.zh.md](docs/electron.zh.md) | Electron 主进程、IPC、preload、原生菜单 |
| [docs/release.zh.md](docs/release.zh.md) | 提交 → tag → GitHub Release → 应用内更新流程 |

## 路线图

- [x] POC：Electron + FastAPI + mock data + Plotly 图表
- [x] PSRCAT P–Ṗ 图与搜索
- [x] 设置面板（主题、色带、语言、高级项）
- [x] 快捷键 + Help 面板
- [x] 文件标签与右键菜单
- [x] 多窗口支持
- [x] 标题栏、自定义菜单、快捷键、macOS 顶部菜单的统一 command system
- [x] 带 updater 与 backend 控件的分类设置中心
- [ ] 交互式 RFI zapping（在 waterfall 上点击 / 框选）
- [ ] 带可视化 residuals 的 TOA 提取
- [ ] 偏振标定向导
- [ ] 实时参数调节（pam 操作滑杆）
- [ ] 批处理流水线配置

## 参考资料

- [PSRCHIVE Home](https://psrchive.sourceforge.net/index.shtml)
- [PSRCHIVE Manuals](https://psrchive.sourceforge.net/manuals/)
- [PSRCHIVE Developer Guide](https://psrchive.sourceforge.net/devel/)
- [PSRCHIVE Build Instructions](https://psrchive.sourceforge.net/current/build.shtml)

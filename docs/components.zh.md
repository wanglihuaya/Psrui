# 组件参考

English version: [components.md](components.md)

所有组件都位于 `src/renderer/src/components/`。

---

## TitleBar

**文件**：`TitleBar.tsx`  
**Props**：`{ onRunCommand: (commandId: AppCommandId) => void, onOpenSettingsSection: (section: SettingsSection) => void, updateState: UpdateState | null }`

一个 macOS 风格的自定义标题栏，横向分成三块主要区域：

- **Traffic-lights reserve**（92 px）：给 `titleBarStyle: 'hiddenInset'` 创建的原生红 / 黄 / 绿按钮预留空间
- **左侧命令区**：纯图标的 `Toggle Sidebar` 按钮，以及一个替代旧 `File / View / Help` 文本菜单的 Radix `DropdownMenu`
- **中间文件名区**：当前文件 basename，或退回应用标题
- **右侧状态区**：updater pill / dot，以及 backend `Live` / `Offline` 指示

### 命令菜单结构

顶层顺序固定为：

1. `New Window`
2. `File`
3. `View`
4. `Window`
5. `Settings`
6. `Help`
7. `Quit`

子菜单：

- **File**：Open File、Open Workspace、Close File、Save Image、Save Archive
- **View**：Profile、Freq × Phase、Time × Phase、Bandpass、PSRCAT
- **Window**：Toggle Sidebar、Minimize Window、Toggle Full Screen
- **Help**：Keyboard Shortcuts、Check for Updates、About

自定义菜单与 macOS 原生菜单栏共用 `src/shared/commands.ts` 里的同一套 command id。

### 更新状态入口

- `checking`：中性小胶囊，文案 `Checking…`
- `available`：紧凑绿色圆点，hover 后展开成 `Update`
- `downloading`：进度胶囊，如 `Downloading 37%`
- `downloaded`：显示 `Restart to Update`

---

## Sidebar

**文件**：`Sidebar.tsx`  
**Props**：`{ onOpenFile: () => void, onOpenFolder?: () => void }`

双列布局：

### 图标栏（46 px 宽，始终可见）

| 图标 | 动作 |
|------|------|
| FolderOpen | 打开 Files navigator 面板 |
| Globe | 打开全屏 PSRCAT 面板（`psrcatOpenAtom = true`） |
| HelpCircle | 打开 HelpPanel |
| Settings | 打开 SettingsPanel |

当前激活项会在按钮左侧显示一条 3 px 的高亮条。

### Navigator 面板（240 px，可通过 `sidebarCollapsedAtom` 折叠）

内部包含 `FilesNavigator`，主要结构：

#### Explorer header

打开文件图标、打开目录图标、刷新图标（加载时会旋转）。

#### File Tree

设置了 workspace 时，会渲染递归 `TreeNode`：

- **目录节点**：可展开 / 收起 chevron、文件夹图标、子节点随深度增加缩进（每层 12 px）
- **文件节点**：文件图标、等宽字体文件名、标签颜色点、已打开但未激活的小圆点提示
- 空目录不显示
- 点击文件节点会激活文件（加入 `openFilesAtom`，并设置 `currentFileAtom`）

如果没有 workspace，则退回到扁平的 open-files 列表。

#### Label filter

点击 Labels 区域中的某个 label，可以过滤文件树，只显示带该标签的文件。激活过滤后，顶部会显示一个可关闭的 chip。

#### Labels 区域（可折叠）

- 展示所有用户 label：颜色点、文件数量 badge、删除按钮
- **+ 按钮** 会打开内联输入框来创建新 label（颜色自动从调色板分配）
- 点击某个 label 可作为过滤条件应用到文件树

#### Metadata 区域（可折叠）

展示当前归档的 source、telescope、centre frequency、bandwidth、channels、sub-integrations、period、DM。

#### 右键菜单（任意文件节点）

- Open / Close
- Copy Path
- Reveal in Finder
- Label toggle 列表（已应用的 label 会显示 checkmark）

## PsrcatPanel

**文件**：`PsrcatPanel.tsx`

全屏覆盖面板（`fixed inset-0`, `z-150`），内部是 PSRCAT P–Ṗ 图。可通过 sidebar 的 globe 图标或 `⌘5` 打开。按 `Escape` 或点击 ✕ 关闭。

---

## MainPanel

**文件**：`MainPanel.tsx`

主内容区。没有加载文件时会显示带 Radio 图标的 empty state。

**PSRCAT 已从主 tabs 中移除**，现在它是一个独立的全屏面板，通过 sidebar 的 globe 图标打开。

### Tab bar（单布局模式）

Profile | Freq × Phase | Time × Phase | Bandpass

当前 tab 会显示高亮底边和轻微背景色。

### 布局切换器（右上角）

| 图标 | 布局 | 说明 |
|------|------|------|
| □ | `single` | 单图占满区域 |
| ⫴ | `horizontal` | 左右双列 |
| ☰ | `vertical` | 上下双行 |
| ⊞ | `grid` | 2×2 四宫格 |

### 分屏 slot（`splitSlotsAtom`）

多面板布局下，每个 pane 都有独立 `SlotHeader`。点击 pane 标题会弹出下拉菜单，选择该 pane 要展示的图表类型。slot 配置保存在 `splitSlotsAtom` 中（默认：profile / waterfall / time-phase / bandpass）。

### 图表区域

- 绝对定位的 loading spinner overlay（`loadingAtom`）
- 绝对定位的 error overlay（`errorAtom`）
- 每个 pane 都通过 `ChartRenderer` 渲染对应 `ViewTab`
- 右上角新增 `Processing` 按钮，用来切换右侧 `ProcessingInspector`
- `WaterfallChart` 现在会接收共享的 processing recipe updater，因此 zapping 和 inspector 控件共用同一条 session history

---

## ProcessingInspector

**文件**：`ProcessingInspector.tsx`

右侧 processing 工作区，承载基于 session 的 PSRCHIVE 处理流程。

### 布局

- 固定宽度的右侧栏，挂在图表区域旁边
- 只有当 `processingInspectorOpenAtom = true` 时才显示
- Header 带关闭按钮和 runtime 摘要
- 如果高级处理不可用，面板不会消失，而是显示 `/api/capabilities` 返回的 capability notes

### 标签页

1. **Zap**
   - 显示已 zap channel 数量
   - 列出 `recipe.zap.channels`
   - 支持一键清空
2. **Pam**
   - 对 `dedisperse`、`tscrunch`、`fscrunch`、`bscrunch`、`phase rotate` 做 debounce 控制
3. **TOA**
   - Template 选择
   - `pat` 算法与输出格式选择
   - 可选 scrunch 开关与文本导出路径
   - 展示解析后的 TOA 行和 observed/template/difference residual 图
4. **Cal**
   - Search path / `database.txt` / solution file 输入
   - 模型选择（`SingleAxis`、`Polar`、`Reception`）
   - `pol-only` 开关
   - 显示最近一次 `pac` preview 的命令与日志
5. **Batch**
   - 输出命名默认值
   - 按 workspace 保存的 recipe 管理
   - 顺序 batch runner

### 共享行为

- 会影响 preview 的编辑都会走和 undo/redo 相同的 recipe updater。
- `toa` 和 `output` 配置也属于 live recipe，因此可以直接保存进 batch recipes。
- batch run 会为每个文件创建临时 session、导出处理后的 archive、按需导出 TOA 文本，然后销毁该 session。

---

## StatusBar

**文件**：`StatusBar.tsx`

底部 28 px 状态栏。

左侧：backend 状态点；`loadingAtom` 为真时额外显示 `Loading...`。  
右侧（有文件时）：source 名、telescope、`NchxNsubxNbin`、文件路径。

---

## SettingsPanel

**文件**：`SettingsPanel.tsx`  
**导出**：`SettingsPanel`, `applyTheme`

居中的设置中心（不再是右侧抽屉），通过 `settingsOpenAtom` 打开。

设置仍然沿用 **draft-save 模式**：

- `settingsAtom`：已提交、持久化到本地的配置
- `draftSettingsAtom`：面板打开期间的工作副本
- Save：提交 draft
- Cancel：丢弃 draft

`settingsSectionAtom` 负责左侧当前分类，且 **不会持久化**。

### 布局

- **左列**：分类导航 + updater 摘要
- **右列**：当前分类内容 + 共享 Save / Cancel footer

### 分类

1. **App**
   - Language
   - Show Welcome
   - Update Status / Current Version / Update Channel
   - `Check for Updates`
   - 禁用预留项：`Desktop notifications`、`Keep screen awake`、`HTTP proxy`
2. **Appearance**
   - Theme cards
   - Chart Colorscale swatches
3. **Workspace**
   - Current workspace path
   - `Open Workspace` / `Change Workspace`
   - Default View
   - Recent Files Limit
4. **Backend**
   - Backend status
   - `Restart Backend`
   - Backend Port
   - Python Path
5. **Shortcuts**
   - 从 `SHORTCUTS` 常量生成的只读分组视图
6. **About**
   - App version
   - Release channel
   - Update phase
   - `Open Help`
   - 外部文档链接

### 即时动作 vs 保存型设置

- 即时动作：`Check for Updates`、`Open Workspace`、`Restart Backend`
- footer 提交：language、welcome screen、theme、colorscale、default view、recent file limit、backend port、python path

主题切换仍通过 `applyTheme(theme)` 执行，并在 draft 提交后应用。

---

## HelpPanel

**文件**：`HelpPanel.tsx`  
**导出**：`HelpPanel`, `HelpButton`

一个模态对话框（`max-w-3xl`, `85vh`），点击遮罩或按 `Escape` 关闭。

三类子标签：

| 标签 | 内容 |
|------|------|
| **View Guide** | 各图表的科学含义，以及 Plotly 的 zoom / pan / hover / reset 操作；包括 Split View 提示 |
| **Shortcuts** | 来自 `SHORTCUTS` 的全部快捷键，按分类分组，使用 `<kbd>` 样式显示 |
| **UI Guide** | 按图标解释 sidebar、PSRCAT 面板、Labels、Split View、Settings、Plotly 控件 |

所有内容都会跟随 `settings.language`（EN / ZH）切换。

`HelpButton` 是一个独立图标按钮，点击时设置 `helpOpenAtom = true`。

---

## 图表组件

所有图表组件都位于 `components/charts/`。

### PlotlyWrapper

**文件**：`charts/PlotlyWrapper.tsx`  
**Props**：`{ data: Plotly.Data[], layout?: Partial<Plotly.Layout>, config?: Partial<Plotly.Config>, onPlotlyClick?: ..., onPlotlySelected?: ... }`

管理原生 `plotly.js-dist-min` `<div>`，负责：

- Mount：`Plotly.newPlot()` + `ResizeObserver` → `Plotly.Plots.resize()`
- Update：数据或 layout 改变时执行 `Plotly.react()`
- Unmount：`Plotly.purge()` + 断开 observer

它会把共享的 `DARK_LAYOUT`（透明背景、`#0f1420` plot area、等宽字体、低饱和网格）与每个图表的局部覆盖项合并。

现在它也可以把 Plotly 的 click/select 事件继续往上传递，供图表组件驱动非破坏处理动作。

### ProfileChart

**文件**：`charts/ProfileChart.tsx`

线图：展示 `intensity`（Stokes I），以及可选的 `stokes_q`、`stokes_u`、`stokes_v`，横轴为 `phase`。  
X 轴：`Phase (0–1)`，Y 轴：`Intensity (normalized)`。

### WaterfallChart

**文件**：`charts/WaterfallChart.tsx`

形状为 `[nchan][nbin]` 的热力图，Y 轴是频率通道（MHz），X 轴是相位。  
颜色表由 `settings.chartColorscale` 驱动。  
常用于检查色散、RFI 等问题。

新增的 v1 processing 行为：

- 在 modebar 中启用了 Plotly box-select
- 单击某一行会切换单个 zapped channel
- 框选会把一段 channel range 加入 `recipe.zap.channels`
- 所有 zapping 仍然统一走 `ProcessingInspector` 共用的 session recipe updater

### TimePhaseChart

**文件**：`charts/TimePhaseChart.tsx`

形状为 `[nsubint][nbin]` 的热力图，Y 轴是子积分索引，X 轴是相位。  
常用于观察 pulse jitter、scintillation 和 dropout。

### BandpassChart

**文件**：`charts/BandpassChart.tsx`

每个频率通道平均强度的线图。  
X 轴：`Frequency (MHz)`，Y 轴：`Mean Intensity`。  
适合识别坏通道和 bandpass 形状。

### PsrcatView

**文件**：`charts/PsrcatView.tsx`

全页 P–Ṗ 图（scatter GL），包含：

- 按分类着色的点：Normal（蓝）、MSP（绿）、Binary（青）、Magnetar（红）
- 常参数线：B-field（虚线）、characteristic age τ（点线）、spin-down luminosity Ė（实线）
- 线端点注释
- 搜索框：精确名称匹配后，用白色星形 marker 高亮对应 pulsar
- Stats bar：总数 + 各分类胶囊

组件挂载时会拉取两次数据：`/api/psrcat/pulsars` 和 `/api/psrcat/stats`。

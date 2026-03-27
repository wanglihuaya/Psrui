# Processing 使用手册

English version: [processing-guide.md](processing-guide.md)

这份手册说明桌面 UI 里基于 session 的 PSRCHIVE processing workflow 该怎么使用。

## 核心模型

- 打开一个 archive 后，backend 会创建一个 processing session。
- renderer 从 `/api/sessions/{id}/preview/*` 读取图表数据。
- 每次处理参数变化都会更新 session recipe，然后刷新 preview。
- 原始 archive 永远不会被就地修改。
- `Save Archive` 和 batch run 永远都会导出新文件。

## 打开 Processing Inspector

1. 先打开任意一个 archive 文件。
2. 在图表区域顶部工具栏点击 `Processing`。
3. 右侧会打开 Processing Inspector，包含五个标签：
   - `Zap`
   - `Pam`
   - `TOA`
   - `Cal`
   - `Batch`

如果 backend 当前跑在 mock 模式，或者缺少需要的 PSRCHIVE 工具，面板不会消失，但会显示 capability notes，而不是可交互控件。

## Zap 工作流

v1 只支持在 `Freq x Phase` waterfall 上做频道级 zapping。

### 单个频道

1. 切换到 `Freq x Phase`。
2. 在热图里点击某一行 channel。
3. 这个 channel 会加入 `recipe.zap.channels`。
4. 再点一次同一行就会取消 zap。

### 一段频道范围

1. 在 Plotly modebar 里切到 box select。
2. 沿纵向拖拽，覆盖一个或多个 channel row。
3. 选中的 channels 会合并进 `recipe.zap.channels`。

`Zap` 标签页会列出所有已选 channel，并支持单独移除或一键清空。

## Pam 参数

`Pam` 标签页暴露了 v1 的实时参数：

- `dedisperse`
- `tscrunch`
- `fscrunch`
- `bscrunch`
- `phase rotate`

说明：

- 滑杆变化会先 debounce，再触发 backend preview 刷新。
- preview 和 export 使用同一份 recipe。
- `dedisperse` 会即时影响图表提取，也会在导出 archive 时真实落盘。

## TOA 提取

`TOA` 标签页是一个基于 `pat` 的 v1 工作流。

1. 选择 template archive。
2. 选择算法（`PGS`、`GIS`、`PIS`、`SIS`、`ZPS`）。
3. 选择输出格式（`tempo2` 或 `parkes`）。
4. 需要的话启用 time/frequency scrunch。
5. 可选指定一个文本输出路径。
6. 点击 `Run TOA`。

结果区域会展示：

- 解析后的 TOA 行
- 原始 `pat` 文本输出
- visual residual 图，包括：
  - observed profile
  - aligned template
  - difference trace

这一步还不是完整的 `tempo2` timing residual 工作流。

## Calibration preview

`Cal` 标签页是基于 `pac` 的 v1 工作流，只面向已有 calibration 资产。

你可以给它提供：

- calibration search path
- `database.txt`
- solution file

同时可以选择：

- 模型：`SingleAxis`、`Polar`、`Reception`
- `pol-only`

当前 session 的 preview 会带着 calibration 配置刷新，`Refresh` 按钮会显示最近一次 `pac` 命令和日志输出。

## 导出当前 archive

`Save Archive` 会把当前 session recipe 导出成一个新的 archive 路径。

默认文件名规则：

```text
<原始文件名 stem>.<archiveExtension><原始扩展名>
```

例如：

```text
J0437-4715.processed.ar
```

除非你在保存对话框里手动选回原路径，否则它不会覆盖原始文件。

## Batch recipes

`Batch` 标签页负责三件事：

1. 按 workspace 保存可复用 recipes
2. 管理默认导出命名和输出目录
3. 顺序执行 batch 导出

### 保存 recipe

1. 先在 `Zap`、`Pam`、`TOA`、`Cal` 标签页里把 live recipe 调好。
2. 在 `Batch` 输入一个 recipe 名称。
3. 点击 `Save recipe`。

### 复用已保存 recipe

1. 在 `Batch` 里对某条 recipe 点击 `Load`。
2. 当前 session preview 会切换到那条 recipe。

### 跑 batch export

1. 在 `Batch` 里决定是否同时导出 TOA 文本。
2. 可选设置一个输出目录。
3. 点击 `Select files and run`。
4. 选择一个或多个 archive 文件。

对每个文件，应用会按顺序做：

1. 创建临时 processing session
2. 应用选中的 recipe
3. 导出处理后的 archive 副本
4. 可选导出 TOA 文本
5. 在 batch log 里记录成功或失败

## 推荐 runtime

想要最完整的处理流程，推荐用 Docker / OrbStack：

```bash
npm run backend:docker:pull
npm run dev:docker
```

这样应用能稳定拿到 `paz`、`pam`、`pat`、`pac`、`tempo2`。

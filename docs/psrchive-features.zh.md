# PSRCHIVE 功能矩阵

English version: [psrchive-features.md](psrchive-features.md)

这份文档用来说明目前应用里和 PSRCHIVE 相关的能力现状：哪些已经可用，哪些是 v1 先收敛的范围，以及哪些还在后续路线图里。

## 运行时前提

- `local` runtime 可以在宿主机已经安装真实 PSRCHIVE bindings 时直接工作。
- `docker` runtime 是当前高级处理流程的主推荐环境，因为它能稳定提供 [`alex88ridolfi/psrchive_dspsr_presto_ubuntu22.04`](https://hub.docker.com/r/alex88ridolfi/psrchive_dspsr_presto_ubuntu22.04) 镜像中的 `paz`、`pam`、`pat`、`pac`、`tempo2`。
- 如果真实 bindings 不可用，backend 会回退到 `MockProvider`。这种模式下高级处理会被禁用，Processing Inspector 会给出原因说明。

## 已实现

| 能力 | 状态 | 运行时 | 工具 / bindings | 说明 |
|------|------|--------|------------------|------|
| 归档元数据 | 已实现 | local + docker | `psrchive` Python bindings 或 mock fallback | `/api/archive` 与 session preview metadata |
| Profile 图 | 已实现 | local + docker | `Archive_load()`、`get_data()` | 支持 Stokes I，必要时带 Q/U/V |
| Frequency x Phase waterfall | 已实现 | local + docker | `Archive_load()`、`get_data()` | 也是交互式 zapping 的入口 |
| Time x Phase 热图 | 已实现 | local + docker | `Archive_load()`、`get_data()` | 会跟随当前 processing recipe 刷新 |
| Bandpass 图 | 已实现 | local + docker | `Archive_load()`、`get_data()` | 会跟随当前 processing recipe 刷新 |
| 会话化 processing preview | 已实现 | local + docker | FastAPI session manager | 所有高级处理默认都是非破坏预览 |
| 导出处理后的 archive 副本 | 已实现 | local + docker | 启用时会调用 `paz`、`pam`、`pac` | 永远导出新文件，不覆盖原始 archive |
| Interactive RFI zapping（频道级） | 已实现 v1 | 推荐真实 provider | `paz -z` | 在 waterfall 上支持点击和框选频道 |
| 实时 pam 参数调节 | 已实现 v1 | 真实 provider + `pam` | `pam -t/-f/-b/-r/-D` | 包含 `dedisperse`、`tscrunch`、`fscrunch`、`bscrunch`、`phase rotate` |
| TOA extraction + visual residuals | 已实现 v1 | 真实 provider + `pat` | `pat -A`、`pat -R` | 有 observed/template/difference 三联 residual 图，但还不是完整 timing residual |
| 偏振标定向导 | 已实现 v1 | 真实 provider + `pac` | `pac -d/-p/-A/-s/-S/-P` | 仅支持已有 database / path / solution 输入 |
| Batch processing recipes | 已实现 v1 | local + docker | renderer 顺序编排 + session APIs | 支持 recipe 保存、加载、重命名、删除和顺序执行 |

## 已实现但明确收敛在 v1 的范围

### RFI zapping

- 当前只做频道级 zapping。
- 在 waterfall 上单击会切换单个 channel。
- 在 waterfall 上框选会追加一个 channel range。
- 还没有暴露：
  - 自动 `paz -r` / `paz -L`
  - sub-integration zapping
  - phase-bin zapping

### TOA extraction

- 当前只做基于 archive template 的 `pat`。
- 返回内容包括：
  - 原始 `pat` 文本输出
  - 解析后的 subint / chan / shift / error 字段
  - 基于 aligned template 和 observed profile 的 visual residual
- 还没有暴露：
  - Gaussian component templates
  - 基于 `.par + .tim` 的 `tempo2` timing residual 图

### Calibration

- 当前默认假设校准输入已经存在。
- 可以给 session 指定：
  - calibration search path
  - `database.txt`
  - 单独 solution file
- 还不支持从原始 calibrator observation 直接建新的 calibration database。

### Batch processing

- 当前是 renderer 前台顺序执行。
- recipe 按 workspace 本地持久化。
- 还没有：
  - 后台任务队列
  - retry 策略
  - 可恢复任务
  - 团队共享 recipes

## 仍未实现

| 能力 | 计划范围 |
|------|----------|
| 完整 timing residuals | 用 `.par + .tim` 调 `tempo2`，并画 residual vs epoch / frequency |
| 自动 RFI heuristics UI | 暴露 `paz -r`、`paz -L` 等自动 zapping 能力 |
| Subint / phase-bin zapping | 超出当前 channel-only 的交互式 zapping |
| Calibration database builder | 从原始 calibrator observation 生成 `pac` database |
| 后台 batch queue | 长任务队列、重试和历史记录 |

## 相关文档

- [processing-guide.zh.md](processing-guide.zh.md)
- [api.zh.md](api.zh.md)
- [data-flow.zh.md](data-flow.zh.md)
- [backend.zh.md](backend.zh.md)

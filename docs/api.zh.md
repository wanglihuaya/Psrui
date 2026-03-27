# 后端 API 参考

English version: [api.md](api.md)

Base URL：`http://127.0.0.1:8787`（可在 Settings → Backend Port 中调整）

所有接口都挂在 `/api` 前缀下。错误统一返回 HTTP 500，JSON 结构为 `{ "detail": "<message>" }`。

---

## 健康检查

### `GET /api/health`

检查 backend 是否存活，以及当前激活的数据 provider。

**响应**
```json
{ "status": "ok", "provider": "mock" }
```

如果真实 `psrchive` bindings 可用，`provider` 会变成 `"psrchive"`；否则是 `"mock"`。

### `GET /api/capabilities`

返回 Processing Inspector 需要的 runtime 级 processing 能力信息。

**响应**
```json
{
  "runtime": "docker",
  "provider": "psrchive",
  "cli": {
    "paz": true,
    "pam": true,
    "pat": true,
    "pac": true,
    "tempo2": true
  },
  "features": {
    "sessions": true,
    "zapping": true,
    "pam": true,
    "toa": true,
    "calibration": true,
    "batch": true
  },
  "messages": []
}
```

---

## 文件

### `GET /api/files`

列出某个目录下的一层脉冲星归档文件。

**Query 参数**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `dir` | string | `~` | 需要扫描的绝对目录路径 |

**响应**
```json
{ "files": ["/path/to/archive.ar", "..."] }
```

支持扫描的扩展名：`.ar .fits .fit .sf .rf .cf .pfd`

---

### `GET /api/files/tree`

返回某个目录的递归文件树。会跳过隐藏路径，以及常见的非必要目录（`__pycache__`、`.git`、`node_modules`、`venv`）。

**Query 参数**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `dir` | string | `~` | 要扫描的根目录 |

**响应**（`FileTreeNode`）
```json
{
  "name": "data",
  "path": "/Users/me/data",
  "type": "directory",
  "children": [
    {
      "name": "J0437-4715.ar",
      "path": "/Users/me/data/J0437-4715.ar",
      "type": "file",
      "children": []
    },
    {
      "name": "calibration",
      "path": "/Users/me/data/calibration",
      "type": "directory",
      "children": [
        {
          "name": "obs1.fits",
          "path": "/Users/me/data/calibration/obs1.fits",
          "type": "file",
          "children": []
        }
      ]
    }
  ]
}
```

文件树里只会包含归档扩展名文件（与 `/api/files` 相同），空目录会在响应中被裁剪掉。

---

## 归档

### `GET /api/archive`

读取归档元数据。

**Query 参数**

| 参数 | 必填 | 说明 |
|------|------|------|
| `path` | 是 | 归档文件绝对路径 |

**响应**（`ArchiveMetadata`）
```json
{
  "filename": "J0437-4715.ar",
  "source": "J0437-4715",
  "telescope": "Parkes",
  "instrument": "PDFB4",
  "freq_lo": 1241.0,
  "freq_hi": 1497.0,
  "centre_freq": 1369.0,
  "bandwidth": 256.0,
  "nchan": 1024,
  "nsubint": 64,
  "nbin": 512,
  "npol": 4,
  "period": 0.005757,
  "dm": 2.64,
  "duration": 1800.0
}
```

---

### `GET /api/archive/profile`

积分后的 pulse profile（Stokes 参数）。

**Query 参数**

| 参数 | 必填 | 说明 |
|------|------|------|
| `path` | 是 | 归档文件路径 |
| `subint` | 否 | 子积分索引（默认：全部 tscrunch） |
| `chan` | 否 | 频率通道索引（默认：全部 fscrunch） |

**响应**（`ProfileData`）
```json
{
  "phase": [0.0, 0.002, "..."],
  "intensity": [0.12, 0.15, "..."],
  "stokes_q": ["..."],
  "stokes_u": ["..."],
  "stokes_v": ["..."]
}
```

当 `npol < 4` 时，`stokes_q/u/v` 会被省略。

---

### `GET /api/archive/waterfall`

Frequency × Phase 二维强度图。

**Query 参数**

| 参数 | 必填 | 说明 |
|------|------|------|
| `path` | 是 | 归档文件路径 |
| `subint` | 否 | 子积分索引（默认：全部 tscrunch） |

**响应**（`WaterfallData`）
```json
{
  "phase": [0.0, 0.002, "..."],
  "channels": [1241.0, 1241.25, "..."],
  "intensities": [[0.1, 0.2, "..."], "..."]
}
```

`intensities` 是一个二维数组，形状为 `[nchan][nbin]`。

---

### `GET /api/archive/time-phase`

Time × Phase 二维强度图。

**Query 参数**

| 参数 | 必填 | 说明 |
|------|------|------|
| `path` | 是 | 归档文件路径 |
| `chan` | 否 | 频率通道索引（默认：全部 fscrunch） |

**响应**（`TimePhaseData`）
```json
{
  "phase": [0.0, 0.002, "..."],
  "subints": [0, 1, 2, "..."],
  "intensities": [[0.1, 0.2, "..."], "..."]
}
```

`intensities` 是一个二维数组，形状为 `[nsubint][nbin]`。

---

### `GET /api/archive/bandpass`

每个频率通道的平均强度（bandpass 形状）。

**Query 参数**

| 参数 | 必填 | 说明 |
|------|------|------|
| `path` | 是 | 归档文件路径 |

**响应**（`BandpassData`）
```json
{
  "channels": [1241.0, 1241.25, "..."],
  "intensities": [0.98, 1.02, "..."]
}
```

---

## Processing sessions

renderer 现在会使用 session 级 preview 接口来承载高级 PSRCHIVE 处理流程。session 是非破坏性的，preview archive 会被 materialize 到 backend 管理的临时目录里。

### `POST /api/sessions`

根据 archive 路径创建一个 processing session。

**请求**
```json
{ "path": "/Users/me/data/J0437-4715.ar" }
```

**响应**
```json
{
  "id": "f38c4f7fb57b4f95b54f7d5dbcb6d7f9",
  "path": "/Users/me/data/J0437-4715.ar",
  "previewPath": null,
  "recipe": {
    "zap": { "channels": [] },
    "pam": {
      "dedisperse": true,
      "tscrunchFactor": 1,
      "fscrunchFactor": 1,
      "bscrunchFactor": 1,
      "phaseRotateTurns": 0
    },
    "calibration": {
      "enabled": false,
      "searchPath": null,
      "databasePath": null,
      "solutionPath": null,
      "model": "SingleAxis",
      "polOnly": false
    },
    "toa": null,
    "output": {
      "archiveExtension": "processed",
      "exportToa": false,
      "toaFormat": "tempo2",
      "outputDirectory": null
    }
  }
}
```

### `PATCH /api/sessions/{session_id}/recipe`

替换当前 session 的 processing recipe。

**请求**
```json
{
  "recipe": {
    "zap": { "channels": [12, 13, 14] },
    "pam": {
      "dedisperse": true,
      "tscrunchFactor": 4,
      "fscrunchFactor": 2,
      "bscrunchFactor": 1,
      "phaseRotateTurns": 0.0
    }
  }
}
```

**响应**：结构和 `POST /api/sessions` 相同。

### `GET /api/sessions/{session_id}/preview/metadata`

返回当前 session preview archive 的 `ArchiveMetadata`。

### `GET /api/sessions/{session_id}/preview/profile`

返回当前 session preview 的 `ProfileData`。

查询参数：

| Param | 必填 | 说明 |
|-------|------|------|
| `subint` | 否 | 子积分索引 |
| `chan` | 否 | 频道索引 |

### `GET /api/sessions/{session_id}/preview/waterfall`

返回当前 session preview 的 `WaterfallData`。

查询参数：

| Param | 必填 | 说明 |
|-------|------|------|
| `subint` | 否 | 子积分索引 |

### `GET /api/sessions/{session_id}/preview/time-phase`

返回当前 session preview 的 `TimePhaseData`。

查询参数：

| Param | 必填 | 说明 |
|-------|------|------|
| `chan` | 否 | 频道索引 |

### `GET /api/sessions/{session_id}/preview/bandpass`

返回当前 session preview 的 `BandpassData`。

### `POST /api/sessions/{session_id}/export`

把当前 preview recipe 导出到一个新的 archive 文件。

**请求**
```json
{ "outputPath": "/Users/me/data/J0437-4715.processed.ar" }
```

**响应**
```json
{ "outputPath": "/Users/me/data/J0437-4715.processed.ar" }
```

### `POST /api/sessions/{session_id}/toa`

对当前 session preview 运行 `pat`。

**请求**
```json
{
  "templatePath": "/Users/me/templates/J0437-4715.std.ar",
  "algorithm": "PGS",
  "format": "tempo2",
  "timeScrunch": false,
  "frequencyScrunch": false,
  "outputPath": "/Users/me/data/J0437-4715.tim"
}
```

**响应**
```json
{
  "format": "tempo2",
  "rawOutput": "FORMAT 1\n...",
  "rows": [
    {
      "line": "/Users/me/data/J0437-4715.ar ...",
      "shiftTurns": -3.2e-9,
      "errorTurns": 1.8e-10,
      "frequencyMHz": 1369.0,
      "subint": 0,
      "chan": 0
    }
  ],
  "residual": {
    "phase": [0.0, 0.002, "..."],
    "observed": [0.1, 0.11, "..."],
    "template": [0.09, 0.1, "..."],
    "difference": [0.01, 0.01, "..."]
  },
  "command": ["pat", "-A", "PGS", "..."],
  "outputPath": "/Users/me/data/J0437-4715.tim"
}
```

这是一条 v1 的 `pat` 工作流，带 visual residual preview，但还不是完整的 `tempo2` timing residual pipeline。

### `POST /api/sessions/{session_id}/calibration/preview`

返回当前 session preview 最近一次 calibration materialization 的命令与日志。

**响应**
```json
{
  "command": ["pac", "-e", "previewcal", "..."],
  "commands": [["paz", "..."], ["pac", "..."]],
  "log": "pac output...",
  "previewPath": "/tmp/psrchive-viewer-session-.../source.previewcal"
}
```

### `DELETE /api/sessions/{session_id}`

销毁 processing session，并删除所有临时 preview 文件。

---

## PSRCAT

### `GET /api/psrcat/pulsars`

返回内嵌 PSRCAT 数据库中的全部 pulsar。

**响应**：`PsrcatPulsar` 数组（定义见下文）。

---

### `GET /api/psrcat/pulsar/{name}`

按 J-name 或 B-name 查询单个 pulsar。

**Path 参数**：`name`，例如 `J0437-4715` 或 `B0833-45`

**响应**：单个 `PsrcatPulsar`，若不存在则返回 HTTP 404。

---

### `GET /api/psrcat/stats`

返回当前已加载 PSRCAT 的汇总统计。

**响应**
```json
{
  "total": 3389,
  "classes": {
    "Normal": 2890,
    "MSP": 367,
    "Binary": 98,
    "Magnetar": 34
  }
}
```

---

## `PsrcatPulsar` schema

| 字段 | 类型 | 说明 |
|------|------|------|
| `PSRJ` | string | J2000 名称 |
| `PSRB` | string \| null | B1950 名称 |
| `RAJ` | string \| null | 赤经（HH:MM:SS） |
| `DECJ` | string \| null | 赤纬（DD:MM:SS） |
| `RAJ_deg` | float \| null | 角度制赤经 |
| `DECJ_deg` | float \| null | 角度制赤纬 |
| `P0` | float \| null | 自转周期（s） |
| `P1` | float \| null | 周期导数（s/s） |
| `F0` | float \| null | 自转频率（Hz） |
| `F1` | float \| null | 频率导数（Hz/s） |
| `DM` | float \| null | 色散量（pc/cm³） |
| `S400` | float \| null | 400 MHz 流量（mJy） |
| `S1400` | float \| null | 1400 MHz 流量（mJy） |
| `DIST` | float \| null | 距离（kpc） |
| `PB` | float \| null | 双星轨道周期（天） |
| `AGE` | float \| null | 特征年龄（yr） |
| `BSURF` | float \| null | 表面磁场（G） |
| `EDOT` | float \| null | 自转能损耗亮度（erg/s） |
| `W50` | float \| null | 50% 峰值脉冲宽度（ms） |
| `class` | string | `Normal` / `MSP` / `Binary` / `Magnetar` |
| `derived_B_surf` | float \| null | 计算值：`3.2×10^19 * sqrt(P0 * P1)` |
| `derived_tau_c` | float \| null | 计算值：`P0 / (2 * P1)`（s） |
| `derived_Edot` | float \| null | 计算值：`4π² × 10^45 × P1 / P0³` |

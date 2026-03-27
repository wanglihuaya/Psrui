# 状态参考

English version: [state.md](state.md)

状态管理使用 [Jotai](https://jotai.org/)。atoms 主要分成两个文件：

- **`src/renderer/src/lib/store.ts`**：临时状态，页面刷新后重置
- **`src/renderer/src/lib/settings.ts`**：通过 `atomWithStorage` 持久化到 `localStorage`

---

## 临时 atoms（`store.ts`）

| Atom | 类型 | 说明 |
|------|------|------|
| `currentFileAtom` | `string \| null` | 当前激活归档文件的绝对路径 |
| `metadataAtom` | `ArchiveMetadata \| null` | 来自 `/api/archive` 的元数据 |
| `profileDataAtom` | `ProfileData \| null` | 来自 `/api/archive/profile` 的数据 |
| `waterfallDataAtom` | `WaterfallData \| null` | 来自 `/api/archive/waterfall` 的数据 |
| `timePhaseDataAtom` | `TimePhaseData \| null` | 来自 `/api/archive/time-phase` 的数据 |
| `bandpassDataAtom` | `BandpassData \| null` | 来自 `/api/archive/bandpass` 的数据 |
| `activeTabAtom` | `ViewTab` | 当前主面板 tab：`'profile' \| 'waterfall' \| 'time-phase' \| 'bandpass'` |
| `loadingAtom` | `boolean` | 只要有任意 archive 请求在进行中，就为 `true` |
| `errorAtom` | `string \| null` | 最近一次错误信息（新文件加载时会清空） |
| `backendReadyAtom` | `boolean` | `/api/health` 成功后变为 `true` |
| `openFilesAtom` | `string[]` | 当前打开的全部文件路径 |
| `helpOpenAtom` | `boolean` | Help 面板是否可见 |
| `helpSectionAtom` | `'views' \| 'shortcuts' \| 'ui'` | HelpPanel 打开时默认激活哪个子标签 |
| `psrcatOpenAtom` | `boolean` | 全屏 PSRCAT 面板是否打开 |
| `fileTreeAtom` | `FileTreeNode \| null` | `/api/files/tree` 返回的递归文件树 |
| `fileTreeLoadingAtom` | `boolean` | 文件树是否正在加载 |
| `splitLayoutAtom` | `SplitLayout` | 主面板布局：`'single' \| 'horizontal' \| 'vertical' \| 'grid'` |
| `splitSlotsAtom` | `SplitSlot[]` | 每个分屏显示哪张图；长度固定为 4；`SplitSlot = ViewTab` |

---

## 持久化 atoms（`settings.ts`）

所有持久化 atom 都通过 `atomWithStorage` 存在 `psrchive-` 命名空间下。

### `settingsAtom` — key `psrchive-settings`

类型：`AppSettings`

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `language` | `'en' \| 'zh'` | `'en'` | UI 语言 |
| `appTheme` | `'dark' \| 'midnight' \| 'nord' \| 'light'` | `'dark'` | 应用主题 |
| `chartColorscale` | `'blues' \| 'viridis' \| 'plasma' \| 'inferno' \| 'magma'` | `'blues'` | Plotly 热力图色带 |
| `defaultView` | `'profile' \| 'waterfall' \| 'time-phase' \| 'bandpass'` | `'profile'` | 打开文件后默认展示的视图 |
| `recentFilesLimit` | `number` | `20` | 最近文件列表的最大条数 |
| `backendPort` | `number` | `8787` | FastAPI backend 端口 |
| `pythonPath` | `string` | `'python3'` | 启动 backend 使用的 Python 可执行文件 |
| `showWelcome` | `boolean` | `true` | 预留项：是否显示欢迎页 |

### `recentFilesAtom` — key `psrchive-recent-files`

类型：`string[]`，保存最近打开过的绝对路径列表。

### `settingsOpenAtom`

类型：`boolean`，表示 Settings 面板是否打开。

### `settingsSectionAtom`

类型：`'app' \| 'appearance' \| 'workspace' \| 'backend' \| 'shortcuts' \| 'about'`

设置中心左侧导航当前所在分类。它不做持久化，因此像标题栏里的 `About` 这类命令可以直接把设置页打开到指定 section。

### `draftSettingsAtom`

类型：`AppSettings | null`，设置面板中的工作副本；Save 时提交，Cancel 时丢弃。

### `workspacePathAtom` — key `psrchive-workspace`

类型：`string | null`，最近一次打开的 workspace 目录。

### `activeSidebarSectionAtom`

类型：`'files' \| 'psrcat' \| 'settings'`，当前 sidebar 图标栏激活区块（不持久化）。

### `sidebarCollapsedAtom` — key `psrchive-sidebar-collapsed`

类型：`boolean`，表示 240 px 宽的 navigator 面板当前是否收起。

### 共享 command ids（`src/shared/commands.ts`）

标题栏 dropdown、macOS 原生菜单栏、renderer 键盘快捷键共用同一套 command id：

- `new-window`
- `open-file`
- `open-workspace`
- `close-file`
- `save-image`
- `save-archive`
- `view-profile`
- `view-waterfall`
- `view-time-phase`
- `view-bandpass`
- `view-psrcat`
- `toggle-sidebar`
- `open-settings`
- `open-help`
- `check-for-updates`
- `update-action`
- `window-minimize`
- `window-toggle-full-screen`
- `app-quit`
- `debug-reload`
- `debug-force-reload`
- `debug-toggle-devtools`

### `labelsAtom` — key `psrchive-labels`

类型：`FileLabel[]`，用户自定义的颜色标签，用来给归档文件打标。

```ts
interface FileLabel {
  id: string
  name: string
  color: string
}
```

默认标签包括：`Observed`、`Calibrated`、`RFI Cleaned`、`Template`、`Processed`。

### `fileLabelMapAtom` — key `psrchive-file-labels`

类型：`Record<string, string[]>`，表示文件路径 → label id 数组的映射关系。

---

## 主题系统

主题通过给 `<html>` 节点打 class 的方式应用：

| `appTheme` 值 | 对应 class | 背景色 |
|---------------|------------|--------|
| `dark` | `theme-dark` | `#0a0e17` |
| `midnight` | `theme-midnight` | `#020617` |
| `nord` | `theme-nord` | `#2e3440` |
| `light` | `theme-light` | `#f8f9fb` |

需要命令式切换主题时，调用 `applyTheme(theme)`（由 `SettingsPanel.tsx` 导出）。`App.tsx` 和 `SettingsPanel.tsx` 里的 `useEffect` 也会自动调用它。

# State Reference

中文版本: [state.zh.md](state.zh.md)

State is managed with [Jotai](https://jotai.org/). Atoms are split into two files:

- **`src/renderer/src/lib/store.ts`** — ephemeral, resets on page reload
- **`src/renderer/src/lib/settings.ts`** — persisted to `localStorage` via `atomWithStorage`

---

## Ephemeral atoms (`store.ts`)

| Atom | Type | Description |
|------|------|-------------|
| `currentFileAtom` | `string \| null` | Absolute path of the currently active archive |
| `currentSessionIdAtom` | `string \| null` | Active backend processing session id for the current archive |
| `metadataAtom` | `ArchiveMetadata \| null` | Metadata from `/api/sessions/{id}/preview/metadata` |
| `profileDataAtom` | `ProfileData \| null` | Profile data from `/api/sessions/{id}/preview/profile` |
| `waterfallDataAtom` | `WaterfallData \| null` | Waterfall data from `/api/sessions/{id}/preview/waterfall` |
| `timePhaseDataAtom` | `TimePhaseData \| null` | Time-phase data from `/api/sessions/{id}/preview/time-phase` |
| `bandpassDataAtom` | `BandpassData \| null` | Bandpass data from `/api/sessions/{id}/preview/bandpass` |
| `activeTabAtom` | `ViewTab` | Active main-panel tab: `'profile' \| 'waterfall' \| 'time-phase' \| 'bandpass'` |
| `loadingAtom` | `boolean` | `true` while any archive endpoint is in flight |
| `errorAtom` | `string \| null` | Last error message (cleared on new file load) |
| `backendReadyAtom` | `boolean` | Set to `true` once `/api/health` succeeds |
| `openFilesAtom` | `string[]` | All file paths currently opened (superset of tree selection) |
| `helpOpenAtom` | `boolean` | Whether the Help panel is visible |
| `helpSectionAtom` | `'views' \| 'shortcuts' \| 'ui'` | Which HelpPanel tab should be active when opened |
| `psrcatOpenAtom` | `boolean` | Whether the full-screen PSRCAT panel is open |
| `fileTreeAtom` | `FileTreeNode \| null` | Recursive tree from `/api/files/tree` |
| `fileTreeLoadingAtom` | `boolean` | `true` while tree is being fetched |
| `splitLayoutAtom` | `SplitLayout` | Main panel layout: `'single' \| 'horizontal' \| 'vertical' \| 'grid'` |
| `splitSlotsAtom` | `SplitSlot[]` | Which chart each split pane shows; length 4; `SplitSlot = ViewTab` |
| `processingCapabilitiesAtom` | `ProcessingCapabilities \| null` | Capability report from `/api/capabilities` used to enable/disable advanced tools |
| `processingRecipeAtom` | `ProcessingRecipe` | Current live recipe for zap/pam/calibration/toa/output |
| `processingHistoryAtom` | `ProcessingRecipe[]` | Undo history for preview-affecting recipe changes |
| `processingRedoHistoryAtom` | `ProcessingRecipe[]` | Redo history for preview-affecting recipe changes |
| `processingInspectorOpenAtom` | `boolean` | Whether the right-side Processing Inspector is visible |
| `toaResultAtom` | `ToaResult \| null` | Latest `pat` result and aligned residual preview |

---

## Persisted atoms (`settings.ts`)

All persisted atoms use `atomWithStorage` with keys under the `psrchive-` namespace.

### `settingsAtom` — key `psrchive-settings`

Type: `AppSettings`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `language` | `'en' \| 'zh'` | `'en'` | UI language |
| `appTheme` | `'dark' \| 'midnight' \| 'nord' \| 'light'` | `'dark'` | Color theme |
| `chartColorscale` | `'blues' \| 'viridis' \| 'plasma' \| 'inferno' \| 'magma'` | `'blues'` | Plotly heatmap colorscale |
| `defaultView` | `'profile' \| 'waterfall' \| 'time-phase' \| 'bandpass'` | `'profile'` | Tab shown on file open |
| `recentFilesLimit` | `number` | `20` | Max entries in recent-files list |
| `backendPort` | `number` | `8787` | Port for FastAPI server |
| `pythonPath` | `string` | `'python3'` | Python executable used to launch backend |
| `showWelcome` | `boolean` | `true` | Reserved — show welcome screen on launch |

### `recentFilesAtom` — key `psrchive-recent-files`

Type: `string[]` — list of recently opened absolute paths.

### `settingsOpenAtom`

Type: `boolean` — whether the Settings panel is visible.

### `settingsSectionAtom`

Type: `'app' \| 'appearance' \| 'workspace' \| 'backend' \| 'shortcuts' \| 'about'`

Non-persisted left-nav section for the settings center. Commands like the title bar `About` entry can open a specific section directly.

### `draftSettingsAtom`

Type: `AppSettings | null` — working copy of settings within the panel; committed on Save, discarded on Cancel.

### `workspacePathAtom` — key `psrchive-workspace`

Type: `string | null` — last opened workspace folder.

### `activeSidebarSectionAtom`

Type: `'files' \| 'psrcat' \| 'settings'` — selected icon-rail section (not persisted).

### `sidebarCollapsedAtom` — key `psrchive-sidebar-collapsed`

Type: `boolean` — whether the navigator panel (240 px wide) is hidden.

### Shared command ids (`src/shared/commands.ts`)

The title bar dropdown, native macOS menu, and renderer keyboard shortcuts all share the same command ids:

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

Type: `FileLabel[]` — user-defined color labels for tagging archive files.

```ts
interface FileLabel {
  id: string
  name: string
  color: string   // CSS hex color
}
```

Default labels: `Observed`, `Calibrated`, `RFI Cleaned`, `Template`, `Processed`.

### `fileLabelMapAtom` — key `psrchive-file-labels`

Type: `Record<string, string[]>` — maps file path → array of applied label IDs.

### `batchRecipesAtom` — key `psrchive-batch-recipes`

Type: `BatchRecipe[]` — saved processing recipes scoped by workspace. Used by the Batch tab in `ProcessingInspector.tsx`.

---

## Theme system

Themes are applied as a class on `<html>`:

| `appTheme` value | Class applied | Background |
|------------------|--------------|-----------|
| `dark` | `theme-dark` | `#0a0e17` |
| `midnight` | `theme-midnight` | `#020617` |
| `nord` | `theme-nord` | `#2e3440` |
| `light` | `theme-light` | `#f8f9fb` |

Call `applyTheme(theme)` (exported from `SettingsPanel.tsx`) to switch themes imperatively. It is also called automatically in `App.tsx` and `SettingsPanel.tsx` via `useEffect`.

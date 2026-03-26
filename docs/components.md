# Component Reference

All components live under `src/renderer/src/components/`.

---

## TitleBar

**File**: `TitleBar.tsx`  
**Props**: `{ onOpenFile: () => void, onOpenFolder: () => void, hasUpdate?: boolean, onUpdate?: () => void }`

macOS-style title bar — traffic-light zone and app content share the **same horizontal line** (no separate spacer row):

- **Traffic-lights zone** (76 px left padding) — native window controls sit here via `titleBarStyle: 'hiddenInset'`
- **Fourth traffic-light button** — always visible at the right of the traffic lights zone:
  - No update: grey 12 px circle (idle)
  - Has update: green filled 12 px circle → on hover expands to a green pill showing `▼ Update` (300 ms transition)
- **Menu bar** — File / View / Help dropdown menus
- **Center filename** — current file basename or app title
- **Backend status indicator** — green `Live` or red pulsing `Offline`

The menu bar closes on outside click or `Escape`.

**Menu items**

| Menu | Item | Shortcut |
|------|------|----------|
| File | Open File | `⌘O` |
| File | Open Workspace | `⌘⇧O` |
| File | Close File | `⌘W` |
| File | Save Image | `⌘S` |
| File | Save Archive | `⌘⇧S` |
| File | New Window | `⌘N` |
| View | Profile | `⌘1` |
| View | Freq × Phase | `⌘2` |
| View | Time × Phase | `⌘3` |
| View | Bandpass | `⌘4` |
| View | PSRCAT | `⌘5` |
| View | Toggle Sidebar | `⌘B` |
| Help | Keyboard Shortcuts | `⌘/` |
| Help | About | — |

---

## Sidebar

**File**: `Sidebar.tsx`  
**Props**: `{ onOpenFile: () => void, onOpenFolder?: () => void }`

Two-column layout:

### Icon Rail (46 px wide, always visible)

| Icon | Action |
|------|--------|
| FolderOpen | Opens Files navigator panel |
| Globe | Opens full-screen PSRCAT panel (`psrcatOpenAtom = true`) |
| HelpCircle | Opens HelpPanel |
| Settings | Opens SettingsPanel |

Active section: 3 px accent bar on the left edge of the icon button.

### Navigator Panel (240 px, collapsible via `sidebarCollapsedAtom`)

Contains `FilesNavigator` with:

#### Explorer header
Open-file icon, open-folder icon, refresh icon (spins while loading).

#### File Tree
When a workspace is set, renders a recursive `TreeNode` component:
- **Directory nodes**: chevron expand/collapse, folder icon, children rendered at increasing indent (12 px per depth level)
- **File nodes**: file icon, monospace filename, label color dots, open-but-not-active indicator dot
- Empty directories are not rendered
- Click a file node to activate it (adds to `openFilesAtom`, sets `currentFileAtom`)

Without workspace: falls back to flat open-files list.

#### Label filter
Click any label in the Labels section to filter the tree to only show files tagged with that label. An active filter shows a dismissal chip at the top.

#### Labels section (collapsible)
- Shows all user labels with colored dots, file count badge, delete button
- **+ button** opens an inline name input to create a new label (color auto-assigned from palette)
- Click a label to filter the file tree by that label

#### Metadata section (collapsible)
Source, telescope, centre frequency, bandwidth, channels, sub-integrations, period, DM for the active archive.

#### Context menu (right-click on any file node)
- Open / Close
- Copy Path
- Reveal in Finder
- Label toggle list (checkmark for applied labels)

## PsrcatPanel

**File**: `PsrcatPanel.tsx`

Full-screen overlay panel (fixed inset-0, z-150) containing the PSRCAT P–Ṗ diagram. Opened via globe icon in sidebar or `⌘5`. Press `Escape` or click ✕ to close.

---

## MainPanel

**File**: `MainPanel.tsx`

Root content area. Shows empty state (Radio icon) when no file is loaded.

**PSRCAT removed from main tabs** — it is now a full-screen panel opened from the sidebar globe icon.

### Tab bar (single layout)
Profile | Freq × Phase | Time × Phase | Bandpass

Active tab: accent bottom-border + subtle background.

### Layout picker (top-right)

| Icon | Layout | Description |
|------|--------|-------------|
| □ | `single` | One chart, full area |
| ⫴ | `horizontal` | Two columns, side by side |
| ☰ | `vertical` | Two rows, stacked |
| ⊞ | `grid` | 2×2 grid of four panes |

### Split pane slots (`splitSlotsAtom`)
In multi-pane layouts each pane has its own **SlotHeader** — click the pane title to get a dropdown to pick which of the 4 chart types that pane renders. Slots persist in `splitSlotsAtom` (default: profile/waterfall/time-phase/bandpass).

### Chart area
- Absolute loading spinner overlay (`loadingAtom`)
- Absolute error overlay (`errorAtom`)
- Each pane renders a `ChartRenderer` with the assigned `ViewTab`

---

## StatusBar

**File**: `StatusBar.tsx`

28 px bar at the bottom of the screen.

Left side: backend status dot + `Loading...` when `loadingAtom` is true.  
Right side (when a file is loaded): source name, telescope, `NchxNsubxNbin`, file path.

---

## SettingsPanel

**File**: `SettingsPanel.tsx`  
**Exported**: `SettingsPanel`, `applyTheme`

Slide-in panel from the right (384 px wide), opened via `settingsOpenAtom`.

Uses a **draft pattern**: settings are copied to `draftSettingsAtom` on open; only written back to `settingsAtom` on Save. Cancel discards the draft.

**Sections**:

1. **General** — Language (EN / ZH toggle), Default View (select), Show Welcome (checkbox)
2. **Appearance** — Theme (2×2 grid with preview), Chart Colorscale (full-width gradient swatches)
3. **Advanced** — Backend Port (number), Python Path (text), Recent Files Limit (number)

Theme is applied immediately on save via `applyTheme(draft.appTheme)`.

---

## HelpPanel

**File**: `HelpPanel.tsx`  
**Exported**: `HelpPanel`, `HelpButton`

Modal dialog (max-w-3xl, 85 vh), closed by overlay click or `Escape`.

Three sub-tabs:

| Tab | Content |
|-----|---------|
| **View Guide** | Per-chart scientific meaning + Plotly interactions (zoom/pan/hover/reset) for Profile, Freq×Phase, Time×Phase, Bandpass; Split View tip |
| **Shortcuts** | All shortcuts from `SHORTCUTS` constant, grouped by category, with `<kbd>` chips |
| **UI Guide** | Icon-by-icon explanation of sidebar rail, PSRCAT panel, Labels, Split View, Settings, Plotly controls |

Language follows `settings.language` (EN / ZH) for all content.

`HelpButton` is a standalone icon button that sets `helpOpenAtom = true`.

---

## Chart components

All charts live in `components/charts/`.

### PlotlyWrapper

**File**: `charts/PlotlyWrapper.tsx`  
**Props**: `{ data: Plotly.Data[], layout?: Partial<Plotly.Layout>, config?: Partial<Plotly.Config> }`

Manages a raw `plotly.js-dist-min` `<div>`, handling:
- Mount: `Plotly.newPlot()` + `ResizeObserver` → `Plotly.Plots.resize()`
- Update: `Plotly.react()` on data/layout changes
- Unmount: `Plotly.purge()` + disconnect observer

Merges a shared `DARK_LAYOUT` (transparent background, `#0f1420` plot area, monospace font, muted grid) with per-chart overrides.

### ProfileChart

**File**: `charts/ProfileChart.tsx`

Line chart showing `intensity` (Stokes I) and optional `stokes_q`, `stokes_u`, `stokes_v` vs `phase`.  
X-axis: `Phase (0–1)`, Y-axis: `Intensity (normalized)`.

### WaterfallChart

**File**: `charts/WaterfallChart.tsx`

Heatmap of shape `[nchan][nbin]` — frequency channels (MHz) on Y, phase on X.  
Colorscale driven by `settings.chartColorscale`.  
Used to inspect dispersion and RFI.

### TimePhaseChart

**File**: `charts/TimePhaseChart.tsx`

Heatmap of shape `[nsubint][nbin]` — sub-integration index on Y, phase on X.  
Used to inspect pulse jitter, scintillation, and dropout events.

### BandpassChart

**File**: `charts/BandpassChart.tsx`

Line chart of mean intensity per frequency channel.  
X-axis: `Frequency (MHz)`, Y-axis: `Mean Intensity`.  
Useful for identifying bad channels and bandpass shape.

### PsrcatView

**File**: `charts/PsrcatView.tsx`

Full-page P–Ṗ diagram (scatter GL) with:
- Points color-coded by class: Normal (blue), MSP (green), Binary (cyan), Magnetar (red)
- Constant-parameter lines: B-field (dashed), characteristic age τ (dotted), spin-down luminosity Ė (solid)
- Annotations at line endpoints
- Search box — exact name match highlights the pulsar with a white star marker
- Stats bar — total count + per-class pills

Fetches data once on mount from `/api/psrcat/pulsars` and `/api/psrcat/stats`.

# Component Reference

中文版本: [components.zh.md](components.zh.md)

All components live under `src/renderer/src/components/`.

---

## TitleBar

**File**: `TitleBar.tsx`  
**Props**: `{ onRunCommand: (commandId: AppCommandId) => void, onOpenSettingsSection: (section: SettingsSection) => void, updateState: UpdateState | null }`

macOS-style custom title bar with three zones on the same horizontal line:

- **Traffic-lights reserve** (92 px) — leaves room for the native red / yellow / green controls created by `titleBarStyle: 'hiddenInset'`
- **Left command cluster** — icon-only `Toggle Sidebar` button plus a single Radix `DropdownMenu` trigger that replaces the old `File / View / Help` text menus
- **Center filename** — current file basename or fallback app title
- **Right status cluster** — updater pill / dot and backend `Live` / `Offline` indicator

### Command menu structure

Top-level order is fixed:

1. `New Window`
2. `File`
3. `View`
4. `Window`
5. `Settings`
6. `Help`
7. `Quit`

Submenus:

- **File** — Open File, Open Workspace, Close File, Save Image, Save Archive
- **View** — Profile, Freq × Phase, Time × Phase, Bandpass, PSRCAT
- **Window** — Toggle Sidebar, Minimize Window, Toggle Full Screen
- **Help** — Keyboard Shortcuts, Check for Updates, About

The custom menu and the native macOS menu bar both dispatch into the same shared command ids from `src/shared/commands.ts`.

### Update affordance

- `checking` — small neutral pill `Checking…`
- `available` — compact green dot that expands to `Update` on hover
- `downloading` — progress pill `Downloading 37%`
- `downloaded` — `Restart to Update`

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

Centered settings center (not a right drawer anymore), opened via `settingsOpenAtom`.

The panel keeps the **draft-save model** for persisted preferences:

- `settingsAtom` — committed preferences in local storage
- `draftSettingsAtom` — working copy while the modal is open
- Save commits the draft
- Cancel discards it

`settingsSectionAtom` chooses the active left-nav category and is intentionally **not** persisted.

### Layout

- **Left column** — category navigation and updater summary
- **Right column** — active category detail area plus a shared Save / Cancel footer

### Categories

1. **App**
   - Language
   - Show Welcome
   - Update Status / Current Version / Update Channel
   - `Check for Updates`
   - Disabled placeholders: `Desktop notifications`, `Keep screen awake`, `HTTP proxy`
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
   - Read-only grouped view generated from the `SHORTCUTS` constant
6. **About**
   - App version
   - Release channel
   - Update phase
   - `Open Help`
   - external documentation link

### Immediate actions vs saved settings

- Immediate: `Check for Updates`, `Open Workspace`, `Restart Backend`
- Saved on footer: language, welcome screen, theme, colorscale, default view, recent file limit, backend port, python path

Theme changes are still applied through `applyTheme(theme)` when the draft is committed.

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

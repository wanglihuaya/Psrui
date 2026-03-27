# PSRCHIVE Viewer

中文版本: [README.zh.md](README.zh.md)

Interactive pulsar data analysis GUI built with Electron + FastAPI + Plotly.js.

Wraps the [PSRCHIVE](https://psrchive.sourceforge.net/) pulsar data processing suite in a modern desktop UI with interactive visualizations, replacing the X11/PGPLOT workflow.

## Desktop UX

- Unified command system: custom title bar menu, native macOS menu bar, and keyboard shortcuts all dispatch through the same shared command ids.
- macOS-native shell: `hiddenInset` traffic lights, a custom icon command menu, and a native top menu bar with a dev-only `Debug` menu in development.
- Settings center: categorized two-column settings UI with App, Appearance, Workspace, Backend, Shortcuts, and About sections.
- Updater-aware chrome: updater state appears both in the title bar and inside the Settings center.

## Architecture

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
│  │  • psrchive bindings (when available)        │   │
│  │  • Mock data (numpy) for development         │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer    | Technology                                          |
|----------|-----------------------------------------------------|
| Shell    | Electron 41, electron-vite 3                        |
| Frontend | React 19, TypeScript 5.8, TailwindCSS 4, Jotai     |
| Charts   | Plotly.js 3.4 (interactive zoom/pan/hover)           |
| UI       | Radix UI primitives, Lucide icons                   |
| Backend  | FastAPI 0.115, uvicorn, numpy                       |
| Data     | PSRCHIVE Python bindings (optional), mock fallback  |

## Quick Start

### Prerequisites

- Node.js ≥ 18
- Python 3.9+
- npm

### Install

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend && pip3 install -r requirements.txt && cd ..
```

### Development

```bash
# Start everything (Electron launches the backend automatically)
npm run dev

# Or run backend separately for debugging
npm run backend:dev    # terminal 1
npm run dev            # terminal 2
```

### Development with OrbStack / Docker PSRCHIVE

If you want real `psrchive` bindings without installing them on macOS directly, this repo can run the FastAPI backend inside the Docker image [`alex88ridolfi/psrchive_dspsr_presto_ubuntu22.04`](https://hub.docker.com/r/alex88ridolfi/psrchive_dspsr_presto_ubuntu22.04).

```bash
# Pull the image once
npm run backend:docker:pull

# Start the full Electron app with the backend running in Docker
npm run dev:docker

# Or run only the backend container for debugging
npm run backend:docker
```

The Docker runtime mounts `/Users`, `/Volumes`, `/private`, and `/tmp` into the container at the same absolute paths so archive files opened from Finder still resolve correctly inside the container.

### Build

```bash
npm run build          # Build for production
npm run build:mac      # Package as macOS app
```

## Release Automation

- Push to `main`: GitHub Actions will build macOS, Linux, and Windows packages and publish a prerelease automatically.
- Push a tag like `v0.0.2`: GitHub Actions will build the same artifacts and publish a stable GitHub Release.
- Manual trigger: you can also run the `Release` workflow from the Actions tab with `workflow_dispatch`.
- On `main`, the workflow rewrites the packaged app version to a semver prerelease like `0.0.1-nightly.153`, so nightly builds can detect newer nightly releases.
- On tagged releases, the workflow rewrites the packaged app version to the tag version (for example `v0.0.2` → `0.0.2`) before packaging.
- Stable release `desc` comes from the annotated tag message, so use `git tag -a v0.0.2 -m "..."` and write the release notes there.
- In-app updates are handled by `electron-updater`: packaged builds auto-check on launch, Help menu can manually trigger checks, available updates download on demand, and downloaded updates install via restart.
- Native macOS menu bar items for Settings, View switching, Window actions, and Help all flow through the same renderer command map used by the custom title bar command menu.
- Update channel split is strict: nightly installs receive GitHub prereleases only, stable installs receive stable releases only.

Detailed release steps and a release note template live in [docs/release.md](docs/release.md).

The workflow file lives at `.github/workflows/release.yml` and uses the repository `GITHUB_TOKEN`, so no extra publish token is required for standard GitHub Releases.

If the repository has GitHub Actions workflow permissions restricted to read-only, release creation can fail with `403 Resource not accessible by integration`. In that case, either:

- set `Settings -> Actions -> General -> Workflow permissions` to `Read and write permissions`, or
- add a repository secret named `RELEASE_TOKEN` with permission to create releases in this repository.

## Project Structure

```
psrchive-ele/
├── src/
│   ├── main/
│   │   ├── index.ts       # Window management, IPC handlers, native menu
│   │   ├── backend.ts     # FastAPI lifecycle manager
│   │   └── updater.ts     # electron-updater integration
│   ├── preload/
│   │   └── index.ts       # Context bridge (IPC → renderer)
│   ├── shared/
│   │   ├── commands.ts    # Shared command ids for menu / shortcuts / UI
│   │   ├── processing.ts  # Shared processing/session/TOA/batch types
│   │   └── update.ts      # Shared updater state types
│   └── renderer/src/
│       ├── App.tsx         # Root: data loading, shared command handlers
│       ├── components/
│       │   ├── TitleBar.tsx       # Icon command menu + updater status
│       │   ├── Sidebar.tsx
│       │   ├── MainPanel.tsx
│       │   ├── ProcessingInspector.tsx # Session-based PSRCHIVE workflow UI
│       │   ├── StatusBar.tsx
│       │   ├── SettingsPanel.tsx  # Categorized settings center
│       │   ├── HelpPanel.tsx
│       │   └── charts/
│       │       ├── PlotlyWrapper.tsx
│       │       ├── ProfileChart.tsx
│       │       ├── WaterfallChart.tsx
│       │       ├── TimePhaseChart.tsx
│       │       ├── BandpassChart.tsx
│       │       └── PsrcatView.tsx
│       └── lib/
│           ├── api.ts        # Backend HTTP client + TypeScript types
│           ├── store.ts      # Ephemeral Jotai atoms
│           ├── settings.ts   # Persisted Jotai atoms
│           ├── i18n.ts       # EN / ZH translation table
│           └── shortcuts.ts  # Keyboard shortcut definitions
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app
│   │   ├── routes.py        # REST endpoints
│   │   ├── data_provider.py # Mock / real psrchive data
│   │   ├── processing.py    # Session materialization + paz/pam/pat/pac orchestration
│   │   └── psrcat.py        # PSRCAT database parser
│   └── requirements.txt
├── docs/                    # Developer documentation
│   ├── architecture.md      # System overview & communication flows
│   ├── api.md               # Backend REST API reference
│   ├── processing-guide.md  # End-user session processing workflow guide
│   ├── psrchive-features.md # Implemented vs planned PSRCHIVE capability matrix
│   ├── components.md        # React component reference
│   ├── state.md             # Jotai atom reference
│   ├── shortcuts.md         # Keyboard shortcuts
│   ├── backend.md           # Backend internals & PSRCAT parser
│   └── electron.md          # Electron main process & IPC
├── electron.vite.config.ts
├── electron-builder.yml
└── package.json
```

## API Endpoints

| Method | Path                      | Description                      |
|--------|---------------------------|----------------------------------|
| GET    | `/api/health`             | Backend status + provider name   |
| GET    | `/api/capabilities`       | Runtime/provider/CLI processing capabilities |
| GET    | `/api/files?dir=`         | List archive files in directory  |
| GET    | `/api/archive?path=`      | Archive metadata                 |
| GET    | `/api/archive/profile`    | Pulse profile (Stokes I/Q/U/V)   |
| GET    | `/api/archive/waterfall`  | Frequency × Phase heatmap        |
| GET    | `/api/archive/time-phase` | Time × Phase heatmap             |
| GET    | `/api/archive/bandpass`   | Mean intensity per channel       |
| POST   | `/api/sessions`           | Create a non-destructive processing session |
| PATCH  | `/api/sessions/{id}/recipe` | Update the active processing recipe |
| GET    | `/api/sessions/{id}/preview/*` | Session preview metadata + charts |
| POST   | `/api/sessions/{id}/export` | Export a processed archive copy |
| POST   | `/api/sessions/{id}/toa`  | Run `pat` and return TOA + residual preview |
| POST   | `/api/sessions/{id}/calibration/preview` | Inspect the active `pac` preview command/log |
| DELETE | `/api/sessions/{id}`      | Destroy a processing session |
| GET    | `/api/psrcat/pulsars`     | All PSRCAT pulsars               |
| GET    | `/api/psrcat/pulsar/{n}`  | Single pulsar by name            |
| GET    | `/api/psrcat/stats`       | PSRCAT summary statistics        |

Full request/response schemas: [docs/api.md](docs/api.md)

## PSRCHIVE Integration

The backend auto-detects psrchive availability:
- **With psrchive**: Uses `psrchive.Archive_load()` for real `.ar`/`.fits` data
- **Without psrchive**: Generates realistic synthetic data via numpy for development

For macOS development with OrbStack, you can skip installing native bindings locally and run the backend with Docker instead:

```bash
npm run backend:docker:pull
PSRCHIVE_BACKEND_RUNTIME=docker npm run dev
```

`PSRCHIVE_BACKEND_RUNTIME` supports:
- `local` — default, spawns `python3 -m uvicorn ...`
- `docker` — runs the backend inside `alex88ridolfi/psrchive_dspsr_presto_ubuntu22.04`

To install psrchive:
```bash
# Via conda (recommended)
conda install -c conda-forge psrchive

# Or build from source
git clone git://git.code.sf.net/p/psrchive/code psrchive
cd psrchive && ./bootstrap && ./configure && make && make install
```

## PSRCHIVE Processing Workflow

The app now ships a session-based processing workflow:

- opening an archive creates a non-destructive backend processing session
- the right-side `Processing` inspector drives `paz`, `pam`, `pat`, and `pac`
- chart previews always come from `/api/sessions/{id}/preview/*`
- `Save Archive` exports a new processed copy instead of mutating the source file

Implemented in v1:

- interactive channel zapping from the waterfall
- live `pam` controls for `dedisperse`, `tscrunch`, `fscrunch`, `bscrunch`, and `phase rotate`
- `pat` TOA extraction with an observed/template/difference residual preview
- calibration preview from an existing search path / `database.txt` / solution file
- local workspace-scoped batch recipe save/load/run support

Current limitations:

- zapping is channel-only for now
- TOA uses `pat` and visual residuals, not full `tempo2` timing residuals yet
- calibration does not build new databases from raw calibrator observations
- batch processing is sequential foreground orchestration, not a background job queue

## Developer Docs

| Document | Description |
|----------|-------------|
| [docs/architecture.md](docs/architecture.md) | System overview, data flow, state management |
| [docs/api.md](docs/api.md) | Full REST API reference with request/response schemas |
| [docs/processing-guide.md](docs/processing-guide.md) | How to use the Processing Inspector, export flow, TOA, calibration, and batch recipes |
| [docs/psrchive-features.md](docs/psrchive-features.md) | Implemented vs planned PSRCHIVE capabilities and runtime requirements |
| [docs/data-flow.md](docs/data-flow.md) | Local vs Docker runtime, archive-to-chart pipeline, and exact `psrchive` call path |
| [docs/components.md](docs/components.md) | React component props, behavior, and sub-components |
| [docs/state.md](docs/state.md) | All Jotai atoms — types, defaults, persistence |
| [docs/shortcuts.md](docs/shortcuts.md) | Keyboard shortcuts and how to add new ones |
| [docs/backend.md](docs/backend.md) | FastAPI internals, data providers, PSRCAT parser |
| [docs/electron.md](docs/electron.md) | Electron main process, IPC channels, preload bridge |
| [docs/release.md](docs/release.md) | Commit → tag → GitHub Release → in-app update workflow |

## Roadmap

- [x] POC: Electron + FastAPI + mock data + Plotly charts
- [x] PSRCAT P–Ṗ diagram with search
- [x] Settings panel (theme, colorscale, language, advanced)
- [x] Keyboard shortcuts + Help panel
- [x] File labels and context menu
- [x] Multi-window support
- [x] Shared command menu across title bar, shortcuts, and macOS menu bar
- [x] Categorized settings center with updater and backend controls
- [x] Interactive RFI zapping (channel click / box-select on waterfall, v1)
- [x] TOA extraction with visual residuals (v1 `pat` workflow)
- [x] Polarization calibration wizard (v1 existing database / solution inputs)
- [x] Real-time parameter adjustment (v1 `pam` controls)
- [x] Batch processing pipeline configuration (v1 saved recipes + sequential execution)
- [ ] Full `tempo2` timing residual workflow
- [ ] Automatic / subint / phase-bin RFI tooling
- [ ] Calibration database builder from raw calibrator observations
- [ ] Background batch queue with retry/history

## References

- [PSRCHIVE Home](https://psrchive.sourceforge.net/index.shtml)
- [PSRCHIVE Manuals](https://psrchive.sourceforge.net/manuals/)
- [PSRCHIVE Developer Guide](https://psrchive.sourceforge.net/devel/)
- [PSRCHIVE Build Instructions](https://psrchive.sourceforge.net/current/build.shtml)

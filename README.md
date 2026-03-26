# PSRCHIVE Viewer

Interactive pulsar data analysis GUI built with Electron + FastAPI + Plotly.js.

Wraps the [PSRCHIVE](https://psrchive.sourceforge.net/) pulsar data processing suite in a modern desktop UI with interactive visualizations, replacing the X11/PGPLOT workflow.

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

### Build

```bash
npm run build          # Build for production
npm run build:mac      # Package as macOS app
```

## Release Automation

- Push to `main`: GitHub Actions will build macOS, Linux, and Windows packages and publish a prerelease automatically.
- Push a tag like `v0.0.2`: GitHub Actions will build the same artifacts and publish a stable GitHub Release.
- Manual trigger: you can also run the `Release` workflow from the Actions tab with `workflow_dispatch`.

The workflow file lives at `.github/workflows/release.yml` and uses the repository `GITHUB_TOKEN`, so no extra publish token is required for standard GitHub Releases.

## Project Structure

```
psrchive-ele/
├── src/
│   ├── main/
│   │   ├── index.ts       # Window management, IPC handlers
│   │   └── backend.ts     # FastAPI lifecycle manager
│   ├── preload/
│   │   └── index.ts       # Context bridge (IPC → renderer)
│   └── renderer/src/
│       ├── App.tsx         # Root: data loading, shortcuts
│       ├── components/
│       │   ├── TitleBar.tsx
│       │   ├── Sidebar.tsx
│       │   ├── MainPanel.tsx
│       │   ├── StatusBar.tsx
│       │   ├── SettingsPanel.tsx
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
│   │   └── psrcat.py        # PSRCAT database parser
│   └── requirements.txt
├── docs/                    # Developer documentation
│   ├── architecture.md      # System overview & communication flows
│   ├── api.md               # Backend REST API reference
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
| GET    | `/api/files?dir=`         | List archive files in directory  |
| GET    | `/api/archive?path=`      | Archive metadata                 |
| GET    | `/api/archive/profile`    | Pulse profile (Stokes I/Q/U/V)   |
| GET    | `/api/archive/waterfall`  | Frequency × Phase heatmap        |
| GET    | `/api/archive/time-phase` | Time × Phase heatmap             |
| GET    | `/api/archive/bandpass`   | Mean intensity per channel       |
| GET    | `/api/psrcat/pulsars`     | All PSRCAT pulsars               |
| GET    | `/api/psrcat/pulsar/{n}`  | Single pulsar by name            |
| GET    | `/api/psrcat/stats`       | PSRCAT summary statistics        |

Full request/response schemas: [docs/api.md](docs/api.md)

## PSRCHIVE Integration

The backend auto-detects psrchive availability:
- **With psrchive**: Uses `psrchive.Archive_load()` for real `.ar`/`.fits` data
- **Without psrchive**: Generates realistic synthetic data via numpy for development

To install psrchive:
```bash
# Via conda (recommended)
conda install -c conda-forge psrchive

# Or build from source
git clone git://git.code.sf.net/p/psrchive/code psrchive
cd psrchive && ./bootstrap && ./configure && make && make install
```

## Developer Docs

| Document | Description |
|----------|-------------|
| [docs/architecture.md](docs/architecture.md) | System overview, data flow, state management |
| [docs/api.md](docs/api.md) | Full REST API reference with request/response schemas |
| [docs/components.md](docs/components.md) | React component props, behavior, and sub-components |
| [docs/state.md](docs/state.md) | All Jotai atoms — types, defaults, persistence |
| [docs/shortcuts.md](docs/shortcuts.md) | Keyboard shortcuts and how to add new ones |
| [docs/backend.md](docs/backend.md) | FastAPI internals, data providers, PSRCAT parser |
| [docs/electron.md](docs/electron.md) | Electron main process, IPC channels, preload bridge |

## Roadmap

- [x] POC: Electron + FastAPI + mock data + Plotly charts
- [x] PSRCAT P–Ṗ diagram with search
- [x] Settings panel (theme, colorscale, language, advanced)
- [x] Keyboard shortcuts + Help panel
- [x] File labels and context menu
- [x] Multi-window support
- [ ] Interactive RFI zapping (click/box-select on waterfall)
- [ ] TOA extraction with visual residuals
- [ ] Polarization calibration wizard
- [ ] Real-time parameter adjustment (sliders for pam operations)
- [ ] Batch processing pipeline configuration
- [ ] Docker packaging for distribution

## References

- [PSRCHIVE Home](https://psrchive.sourceforge.net/index.shtml)
- [PSRCHIVE Manuals](https://psrchive.sourceforge.net/manuals/)
- [PSRCHIVE Developer Guide](https://psrchive.sourceforge.net/devel/)
- [PSRCHIVE Build Instructions](https://psrchive.sourceforge.net/current/build.shtml)

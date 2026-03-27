# Runtime And Data Flow

中文版本: [data-flow.zh.md](data-flow.zh.md)

This document explains the current end-to-end logic of the app:

1. how the backend starts without Docker
2. how the backend starts with Docker / OrbStack
3. how an archive file flows into a session-based preview pipeline
4. how `psrchive` is actually called

---

## 1. Runtime modes

The Electron shell always talks to the backend over the same URL:

- `http://127.0.0.1:8787`

What changes is only **how that backend process is launched**.

### Local runtime

Default mode:

- `PSRCHIVE_BACKEND_RUNTIME` is unset or set to `local`
- Electron main process starts host Python directly
- command:

```bash
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8787
```

Code path:

- [src/main/backend.ts](/Users/lihua/Documents/code/test/Psrui/src/main/backend.ts)
  - `resolveRuntime()`
  - `spawnLocalBackend()`

Use this mode when:

- host Python already has the dependencies you want
- you are fine with local `psrchive` installation or mock fallback

### Docker / OrbStack runtime

Docker mode:

- `PSRCHIVE_BACKEND_RUNTIME=docker`
- Electron still talks to `127.0.0.1:8787`
- but the backend actually runs inside the image `alex88ridolfi/psrchive_dspsr_presto_ubuntu22.04`

Code path:

- [src/main/backend.ts](/Users/lihua/Documents/code/test/Psrui/src/main/backend.ts)
  - `resolveRuntime()`
  - `spawnDockerBackend()`
- [src/shared/backend.ts](/Users/lihua/Documents/code/test/Psrui/src/shared/backend.ts)

Equivalent Docker shape:

```bash
docker run --rm \
  --name psrchive-viewer-backend-8787 \
  -p 127.0.0.1:8787:8787 \
  -v <repo>/backend:/workspace/backend \
  -v /Users:/Users \
  -v /Volumes:/Volumes \
  -v /private:/private \
  -v /tmp:/tmp \
  alex88ridolfi/psrchive_dspsr_presto_ubuntu22.04 \
  /bin/bash -lc '(python3 -c "import fastapi,uvicorn,numpy" >/dev/null 2>&1 || python3 -m pip install -r requirements.txt) && exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8787'
```

Why the host paths are mounted unchanged:

- the renderer sends absolute macOS paths like `/Users/lihua/Downloads/psrchive/a/gl98_910.fits`
- the backend uses those exact strings
- Docker mode therefore mounts `/Users`, `/Volumes`, `/private`, and `/tmp` to the same paths inside the container
- this means the backend does **not** need path translation logic

Useful commands:

```bash
npm run backend:docker:pull
npm run backend:docker
npm run dev:docker
```

---

## 2. Startup flow

### Electron main process

Main entry:

- [src/main/index.ts](/Users/lihua/Documents/code/test/Psrui/src/main/index.ts)

Startup order:

1. `app.whenReady()`
2. `registerIPC()`
3. `backend = new BackendProcess(8787)`
4. `backend.start()`
5. `BackendProcess.waitForReady()` polls `GET /api/health`
6. `createWindow()`

Main process exposes backend runtime to the renderer through preload:

- `backend:status`
- `backend:runtime`
- `backend:restart`

### Renderer startup

Renderer entry:

- [src/renderer/src/App.tsx](/Users/lihua/Documents/code/test/Psrui/src/renderer/src/App.tsx)

On mount the renderer:

1. polls `api.health()` until healthy
2. asks preload for `getBackendRuntime()`
3. subscribes to updater state
4. waits for a file to become active

So both local and Docker modes look identical from the renderer's point of view:

- same API base URL
- same response shapes
- same chart rendering path

---

## 3. File to chart flow

This is the main archive data pipeline.

### Step A: user chooses a file or workspace

File picker path:

- title bar / sidebar / shortcut / native menu
- `window.electron.openFile()`
- main process `dialog:openFile`
- returns absolute file paths

Workspace picker path:

- `window.electron.openDirectory()`
- stored in `workspacePathAtom`
- sidebar uses `/api/files/tree?dir=...` to build the explorer

Relevant files:

- [src/preload/index.ts](/Users/lihua/Documents/code/test/Psrui/src/preload/index.ts)
- [src/main/index.ts](/Users/lihua/Documents/code/test/Psrui/src/main/index.ts)
- [src/renderer/src/components/Sidebar.tsx](/Users/lihua/Documents/code/test/Psrui/src/renderer/src/components/Sidebar.tsx)

### Step B: renderer sets the active file and creates a processing session

When a file is selected:

- `currentFileAtom` is updated
- `openFilesAtom` is updated
- `App.tsx` creates a backend processing session with `POST /api/sessions`
- the returned `session.id` is stored in `currentSessionIdAtom`

That triggers the session-initialization effect in:

- [src/renderer/src/App.tsx](/Users/lihua/Documents/code/test/Psrui/src/renderer/src/App.tsx)

### Step C: renderer fires five session preview requests in parallel

The app uses `Promise.allSettled()` to request:

1. `/api/sessions/{id}/preview/metadata`
2. `/api/sessions/{id}/preview/profile`
3. `/api/sessions/{id}/preview/waterfall`
4. `/api/sessions/{id}/preview/time-phase`
5. `/api/sessions/{id}/preview/bandpass`

API client:

- [src/renderer/src/lib/api.ts](/Users/lihua/Documents/code/test/Psrui/src/renderer/src/lib/api.ts)

This means metadata and chart arrays are fetched together from the active session preview, not serially.

### Step D: renderer stores each response into Jotai atoms

Response to atom mapping:

- `/api/sessions/{id}/preview/metadata` → `metadataAtom`
- `/api/sessions/{id}/preview/profile` → `profileDataAtom`
- `/api/sessions/{id}/preview/waterfall` → `waterfallDataAtom`
- `/api/sessions/{id}/preview/time-phase` → `timePhaseDataAtom`
- `/api/sessions/{id}/preview/bandpass` → `bandpassDataAtom`

Atoms live in:

- [src/renderer/src/lib/store.ts](/Users/lihua/Documents/code/test/Psrui/src/renderer/src/lib/store.ts)

Important behavior:

- if preview metadata fails, `App.tsx` treats the session load as failed
- so preview metadata is effectively the gating request for a “clean” archive load
- even though some chart requests may already have succeeded

### Step E: processing edits update the session recipe

The new Processing Inspector does not edit charts directly. Instead:

1. UI controls update the in-memory `processingRecipeAtom`
2. preview-affecting edits call `PATCH /api/sessions/{id}/recipe`
3. the backend materializes a new temporary preview archive
4. the renderer re-requests the five preview endpoints above

This is how waterfall zapping, live pam controls, and calibration preview all stay non-destructive while still updating charts immediately.

### Step F: MainPanel renders the selected chart layout

Layout controller:

- [src/renderer/src/components/MainPanel.tsx](/Users/lihua/Documents/code/test/Psrui/src/renderer/src/components/MainPanel.tsx)

MainPanel chooses one of four views:

- `ProfileChart`
- `WaterfallChart`
- `TimePhaseChart`
- `BandpassChart`

It can render them in:

- single view
- 2-column split
- 2-row split
- 2×2 grid

Split view does **not** cause extra backend requests.
It only reuses the already-loaded atoms and renders different chart components.

---

## 4. How chart images are generated

The backend does **not** generate PNG image files for the charts.

What the backend returns is JSON arrays.
The renderer then turns those arrays into interactive Plotly charts.

### Legacy compatibility

The original `/api/archive*` endpoints still exist for compatibility and lower-level debugging, but the renderer's main archive workflow now uses session preview endpoints by default.

### Profile

- component: [ProfileChart.tsx](/Users/lihua/Documents/code/test/Psrui/src/renderer/src/components/charts/ProfileChart.tsx)
- input atom: `profileDataAtom`
- output: Plotly line traces for Stokes I and optionally Q/U/V

### Frequency × Phase

- component: [WaterfallChart.tsx](/Users/lihua/Documents/code/test/Psrui/src/renderer/src/components/charts/WaterfallChart.tsx)
- input atoms: `waterfallDataAtom`, `metadataAtom`
- output: Plotly `heatmap`
- `metadataAtom` supplies axis labeling like frequency range

### Time × Phase

- component: [TimePhaseChart.tsx](/Users/lihua/Documents/code/test/Psrui/src/renderer/src/components/charts/TimePhaseChart.tsx)
- input atoms: `timePhaseDataAtom`, `metadataAtom`
- output: Plotly `heatmap`
- `metadataAtom` supplies total-duration labeling

### Bandpass

- component: [BandpassChart.tsx](/Users/lihua/Documents/code/test/Psrui/src/renderer/src/components/charts/BandpassChart.tsx)
- input atom: `bandpassDataAtom`
- output: Plotly line chart

### Shared Plotly layer

All charts render through:

- [PlotlyWrapper.tsx](/Users/lihua/Documents/code/test/Psrui/src/renderer/src/components/charts/PlotlyWrapper.tsx)

So the actual visual flow is:

```text
archive file path
  -> backend JSON
  -> Jotai atoms
  -> chart component
  -> Plotly trace/layout objects
  -> canvas / SVG in the renderer
```

---

## 5. How `psrchive` is called

The real `psrchive` integration lives in:

- [backend/app/data_provider.py](/Users/lihua/Documents/code/test/Psrui/backend/app/data_provider.py)

There are two providers:

- `MockProvider`
- `PsrchiveProvider`

Selection logic:

```python
try:
    return PsrchiveProvider()
except ImportError:
    return MockProvider()
```

That means:

- if Python can import `psrchive`, the app uses the real archive reader
- otherwise it falls back to synthetic mock data

### Metadata path

`PsrchiveProvider.get_metadata(path)` does:

1. `ar = psrchive.Archive_load(path)`
2. `ar.remove_baseline()`
3. `first_integration = ar.get_Integration(0)`
4. reads:
   - `ar.get_source()`
   - `ar.get_telescope()`
   - `ar.get_backend_name()`
   - `ar.get_centre_frequency()`
   - `ar.get_bandwidth()`
   - `ar.get_nchan()`
   - `ar.get_nsubint()`
   - `ar.get_nbin()`
   - `ar.get_npol()`
   - `first_integration.get_folding_period()`
   - `ar.get_dispersion_measure()`
   - `ar.integration_length()`

### Profile path

`PsrchiveProvider.get_profile(path, subint, chan)` does:

1. `Archive_load(path)`
2. `remove_baseline()`
3. `dedisperse()`
4. `tscrunch()` if `subint` is omitted
5. `fscrunch()` if `chan` is omitted
6. `data = ar.get_data()`
7. returns Stokes arrays from `data[si, pol, ch]`

### Frequency × Phase path

`PsrchiveProvider.get_waterfall(path, subint)` does:

1. `Archive_load(path)`
2. `remove_baseline()`
3. `dedisperse()`
4. `tscrunch()` when `subint` is omitted
5. `data = ar.get_data()`
6. returns `data[si, 0]` as the heatmap intensity matrix

### Time × Phase path

`PsrchiveProvider.get_time_phase(path, chan)` does:

1. `Archive_load(path)`
2. `remove_baseline()`
3. `dedisperse()`
4. `fscrunch()` when `chan` is omitted
5. `data = ar.get_data()`
6. returns `data[:, 0, ch]`

### Bandpass path

`PsrchiveProvider.get_bandpass(path)` does:

1. `Archive_load(path)`
2. `remove_baseline()`
3. `tscrunch()`
4. `data = ar.get_data()`
5. computes `bandpass = data[0, 0].mean(axis=1)`

So `psrchive` is not being driven through external command-line tools here.
It is used as a **Python binding** inside the FastAPI process.

---

## 6. Local vs Docker: what is actually different

From the renderer and chart layer:

- no difference
- same `fetch()`
- same endpoints
- same atoms
- same Plotly components

From the backend runtime layer:

- **local** uses host Python and host-installed `psrchive`
- **docker** uses the container image and container-installed `psrchive`

From the provider layer:

- still no difference
- both modes import `psrchive` in Python the same way
- both modes call `Archive_load()` and the same `Archive` methods

So the runtime split is only:

```text
renderer -> preload -> Electron main
                     -> local python process
                     or
                     -> docker container
```

After the backend starts, the rest of the pipeline is identical.

---

## 7. Related docs

- [architecture.md](/Users/lihua/Documents/code/test/Psrui/docs/architecture.md)
- [backend.md](/Users/lihua/Documents/code/test/Psrui/docs/backend.md)
- [electron.md](/Users/lihua/Documents/code/test/Psrui/docs/electron.md)
- [components.md](/Users/lihua/Documents/code/test/Psrui/docs/components.md)
- [state.md](/Users/lihua/Documents/code/test/Psrui/docs/state.md)

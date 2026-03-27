# Backend

中文版本: [backend.zh.md](backend.zh.md)

The backend is a FastAPI application in `backend/app/` served by uvicorn on `127.0.0.1:8787`.

It can run in two modes:

- **Local runtime** — launches `python3 -m uvicorn ...` on the host
- **Docker runtime** — launches the backend inside `alex88ridolfi/psrchive_dspsr_presto_ubuntu22.04`

If you want the exact end-to-end pipeline from file selection to Plotly rendering, see [data-flow.md](data-flow.md).

## Entry points

| File | Purpose |
|------|---------|
| `app/main.py` | Creates the FastAPI app, configures CORS (allow-all for localhost use), mounts the router at `/api` |
| `app/routes.py` | All REST endpoint handlers; instantiates `DataProvider` and `PsrcatDB` at module load |
| `app/data_provider.py` | Abstract `DataProvider` base class + `MockProvider` + `PsrchiveProvider` |
| `app/psrcat.py` | Parses `backend/data/psrcat_tar/psrcat.db` and exposes query methods |
| `../src/main/backend.ts` | Electron-side runtime selector and process/container manager |

## Data provider

### MockProvider

Used when `psrchive` Python bindings are not installed. All data is generated deterministically from the file path (hash seed), so the same path always returns the same data.

Generates:
- Gaussian pulse profiles with 1–3 components
- Frequency-phase waterfall with simulated channel gains and ~3% RFI-flagged channels
- Time-phase array with scintillation jitter and ~2% dropout sub-integrations
- Bandpass curve with smooth sinusoidal envelope and 3 RFI spikes

### PsrchiveProvider

Wraps the real `psrchive` Python bindings. On each call, loads the archive, calls `remove_baseline()` and `dedisperse()`, then optionally time/frequency scrunches before extracting data.

### `get_provider()` — auto-detection

```python
try:
    return PsrchiveProvider()   # succeeds if psrchive is importable
except ImportError:
    return MockProvider()
```

## PSRCAT parser (`psrcat.py`)

Reads the flat-text `psrcat.db` format (records separated by `@`).

**Parsed fields**: `PSRJ`, `PSRB`, `RAJ`, `DECJ`, `P0`, `P1`, `F0`, `F1`, `DM`, `S400`, `S1400`, `DIST`, `DIST_DM`, `TYPE`, `ASSOC`, `SURVEY`, `PB`, `BINARY`, `GL`, `GB`, `AGE`, `BSURF`, `EDOT`, `W50`

**Derived fields** computed by `_process_pulsar()`:
- `P0` / `P1` from `F0` / `F1` when missing: $P_0 = 1/F_0$, $P_1 = -F_1/F_0^2$
- `RAJ_deg`, `DECJ_deg` — converted from HH:MM:SS and DD:MM:SS
- `derived_B_surf` — $3.2\times10^{19}\sqrt{P_0 P_1}$ (Gauss)
- `derived_tau_c` — $P_0/(2P_1)$ (seconds)
- `derived_Edot` — $4\pi^2\times10^{45}P_1/P_0^3$ (erg/s)

**Classification** (`class` field):

| Class | Condition |
|-------|-----------|
| `Magnetar` | `TYPE` contains `AXP` or `SGR` |
| `MSP` | $P_0 < 0.03$ s |
| `Binary` | `PB` or `BINARY` field present |
| `Normal` | otherwise |

## Running the backend standalone

```bash
# Development (auto-reload)
npm run backend:dev
# or directly:
cd backend && python3 -m uvicorn app.main:app --reload --port 8787
```

### Running through Docker / OrbStack

The Electron shell can switch to Docker mode with:

```bash
PSRCHIVE_BACKEND_RUNTIME=docker npm run dev
```

Convenience scripts:

```bash
npm run backend:docker:pull   # pull alex88ridolfi/psrchive_dspsr_presto_ubuntu22.04
npm run backend:docker        # run only the backend container on 127.0.0.1:8787
npm run dev:docker            # Electron dev + Docker backend
```

`PSRCHIVE_BACKEND_RUNTIME` values:

- `local` — default, host Python runtime
- `docker` — container runtime with the PSRCHIVE image

Docker mode mounts these host paths into the container unchanged so archive file paths remain valid:

- `/Users`
- `/Volumes`
- `/private`
- `/tmp`

The container also mounts the repo `backend/` directory at `/workspace/backend` and lazily installs `fastapi`, `uvicorn`, and `numpy` if they are not already present in the image.

## Installing psrchive

### Recommended on macOS with OrbStack

Use Docker instead of trying to compile PSRCHIVE locally:

```bash
npm run backend:docker:pull
PSRCHIVE_BACKEND_RUNTIME=docker npm run dev
```

After the backend comes up, `/api/health` should report `"provider": "psrchive"` when the image bindings load correctly.

### Native host install

```bash
# Via conda (recommended)
conda install -c conda-forge psrchive

# From source
git clone git://git.code.sf.net/p/psrchive/code psrchive
cd psrchive && ./bootstrap && ./configure && make && make install
```

After installing, restart the backend; `/api/health` will return `"provider": "psrchive"`.

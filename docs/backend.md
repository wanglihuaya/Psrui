# Backend

The backend is a FastAPI application in `backend/app/` served by uvicorn on `127.0.0.1:8787`.

## Entry points

| File | Purpose |
|------|---------|
| `app/main.py` | Creates the FastAPI app, configures CORS (allow-all for localhost use), mounts the router at `/api` |
| `app/routes.py` | All REST endpoint handlers; instantiates `DataProvider` and `PsrcatDB` at module load |
| `app/data_provider.py` | Abstract `DataProvider` base class + `MockProvider` + `PsrchiveProvider` |
| `app/psrcat.py` | Parses `backend/data/psrcat_tar/psrcat.db` and exposes query methods |

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

## Installing psrchive

```bash
# Via conda (recommended)
conda install -c conda-forge psrchive

# From source
git clone git://git.code.sf.net/p/psrchive/code psrchive
cd psrchive && ./bootstrap && ./configure && make && make install
```

After installing, restart the backend; `/api/health` will return `"provider": "psrchive"`.

# Backend API Reference

Base URL: `http://127.0.0.1:8787` (configurable via Settings → Backend Port)

All endpoints live under the `/api` prefix. Errors return HTTP 500 with a JSON body `{ "detail": "<message>" }`.

---

## Health

### `GET /api/health`

Check backend liveness and active data provider.

**Response**
```json
{ "status": "ok", "provider": "mock" }
```

`provider` is `"psrchive"` when real bindings are available, otherwise `"mock"`.

---

## Files

### `GET /api/files`

List pulsar archive files in a directory (flat, one level).

**Query params**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `dir` | string | `~` | Absolute directory path to scan |

**Response**
```json
{ "files": ["/path/to/archive.ar", ...] }
```

Scanned extensions: `.ar .fits .fit .sf .rf .cf .pfd`

---

### `GET /api/files/tree`

Return a recursive file-tree rooted at a directory. Skips hidden paths and common non-essential dirs (`__pycache__`, `.git`, `node_modules`, `venv`).

**Query params**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `dir` | string | `~` | Root directory to scan |

**Response** (`FileTreeNode`)
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
      "children": [...]
    }
  ]
}
```

Only archive file extensions are included in the tree (same as `/api/files`). Empty directories are pruned from the response.

---

## Archive

### `GET /api/archive`

Load archive metadata.

**Query params**

| Param | Required | Description |
|-------|----------|-------------|
| `path` | yes | Absolute path to archive file |

**Response** (`ArchiveMetadata`)
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

Integrated pulse profile (Stokes parameters).

**Query params**

| Param | Required | Description |
|-------|----------|-------------|
| `path` | yes | Archive file path |
| `subint` | no | Sub-integration index (default: all scrunched) |
| `chan` | no | Channel index (default: all scrunched) |

**Response** (`ProfileData`)
```json
{
  "phase": [0.0, 0.002, ...],
  "intensity": [0.12, 0.15, ...],
  "stokes_q": [...],
  "stokes_u": [...],
  "stokes_v": [...]
}
```

`stokes_q/u/v` are omitted when `npol < 4`.

---

### `GET /api/archive/waterfall`

Frequency × Phase 2D intensity map.

**Query params**

| Param | Required | Description |
|-------|----------|-------------|
| `path` | yes | Archive file path |
| `subint` | no | Sub-integration index (default: all scrunched) |

**Response** (`WaterfallData`)
```json
{
  "phase": [0.0, 0.002, ...],
  "channels": [1241.0, 1241.25, ...],
  "intensities": [[0.1, 0.2, ...], ...]
}
```

`intensities` is a 2D array of shape `[nchan][nbin]`.

---

### `GET /api/archive/time-phase`

Time × Phase 2D intensity map.

**Query params**

| Param | Required | Description |
|-------|----------|-------------|
| `path` | yes | Archive file path |
| `chan` | no | Channel index (default: all scrunched) |

**Response** (`TimePhaseData`)
```json
{
  "phase": [0.0, 0.002, ...],
  "subints": [0, 1, 2, ...],
  "intensities": [[0.1, 0.2, ...], ...]
}
```

`intensities` is a 2D array of shape `[nsubint][nbin]`.

---

### `GET /api/archive/bandpass`

Mean intensity per frequency channel (bandpass shape).

**Query params**

| Param | Required | Description |
|-------|----------|-------------|
| `path` | yes | Archive file path |

**Response** (`BandpassData`)
```json
{
  "channels": [1241.0, 1241.25, ...],
  "intensities": [0.98, 1.02, ...]
}
```

---

## PSRCAT

### `GET /api/psrcat/pulsars`

Return all pulsars from the embedded PSRCAT database.

**Response**: array of `PsrcatPulsar` objects (see below).

---

### `GET /api/psrcat/pulsar/{name}`

Lookup a single pulsar by J-name or B-name.

**Path param**: `name` — e.g. `J0437-4715` or `B0833-45`

**Response**: single `PsrcatPulsar` or HTTP 404.

---

### `GET /api/psrcat/stats`

Summary statistics from the loaded PSRCAT.

**Response**
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

## PsrcatPulsar schema

| Field | Type | Description |
|-------|------|-------------|
| `PSRJ` | string | J2000 name |
| `PSRB` | string \| null | B1950 name |
| `RAJ` | string \| null | Right ascension (HH:MM:SS) |
| `DECJ` | string \| null | Declination (DD:MM:SS) |
| `RAJ_deg` | float \| null | RA in degrees |
| `DECJ_deg` | float \| null | Dec in degrees |
| `P0` | float \| null | Spin period (s) |
| `P1` | float \| null | Period derivative (s/s) |
| `F0` | float \| null | Spin frequency (Hz) |
| `F1` | float \| null | Frequency derivative (Hz/s) |
| `DM` | float \| null | Dispersion measure (pc/cm³) |
| `S400` | float \| null | Flux at 400 MHz (mJy) |
| `S1400` | float \| null | Flux at 1400 MHz (mJy) |
| `DIST` | float \| null | Distance (kpc) |
| `PB` | float \| null | Binary orbital period (days) |
| `AGE` | float \| null | Characteristic age (yr) |
| `BSURF` | float \| null | Surface B-field (G) |
| `EDOT` | float \| null | Spin-down luminosity (erg/s) |
| `W50` | float \| null | Pulse width at 50% peak (ms) |
| `class` | string | `Normal` / `MSP` / `Binary` / `Magnetar` |
| `derived_B_surf` | float \| null | Computed: $3.2\times10^{19}\sqrt{P_0 P_1}$ |
| `derived_tau_c` | float \| null | Computed: $P_0 / (2 P_1)$ (s) |
| `derived_Edot` | float \| null | Computed: $4\pi^2 \times 10^{45} P_1 / P_0^3$ |

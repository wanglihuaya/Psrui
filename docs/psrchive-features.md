# PSRCHIVE Feature Matrix

中文版本: [psrchive-features.zh.md](psrchive-features.zh.md)

This document tracks what PSRCHIVE-facing workflows are already available in the app, what is intentionally limited to a v1 scope, and what still remains on the roadmap.

## Runtime expectations

- `local` runtime can load archives with real PSRCHIVE bindings when they are installed on the host.
- `docker` runtime is the primary supported environment for advanced processing because it guarantees access to `paz`, `pam`, `pat`, `pac`, and `tempo2` inside [`alex88ridolfi/psrchive_dspsr_presto_ubuntu22.04`](https://hub.docker.com/r/alex88ridolfi/psrchive_dspsr_presto_ubuntu22.04).
- If real bindings are unavailable, the backend falls back to `MockProvider`. In that mode, advanced processing is disabled and the Processing Inspector explains why.

## Implemented now

| Capability | Status | Runtime | Tools / bindings | Notes |
|------------|--------|---------|------------------|-------|
| Archive metadata | Implemented | local + docker | `psrchive` Python binding or mock fallback | `/api/archive` and session preview metadata |
| Profile chart | Implemented | local + docker | `Archive_load()`, `get_data()` | Supports Stokes I and optional Q/U/V |
| Frequency x Phase waterfall | Implemented | local + docker | `Archive_load()`, `get_data()` | Also used for interactive zapping |
| Time x Phase heatmap | Implemented | local + docker | `Archive_load()`, `get_data()` | Preview updates follow the active processing recipe |
| Bandpass chart | Implemented | local + docker | `Archive_load()`, `get_data()` | Preview updates follow the active processing recipe |
| Sessionized processing preview | Implemented | local + docker | FastAPI session manager | All advanced flows are non-destructive session previews |
| Save processed archive copy | Implemented | local + docker | `paz`, `pam`, `pac` when enabled | Export always writes a new file |
| Interactive RFI zapping (channel) | Implemented v1 | real provider recommended | `paz -z` | Click or box-select channels in the waterfall |
| Real-time pam controls | Implemented v1 | real provider + `pam` | `pam -t/-f/-b/-r/-D` | `dedisperse`, `tscrunch`, `fscrunch`, `bscrunch`, `phase rotate` |
| TOA extraction with visual residuals | Implemented v1 | real provider + `pat` | `pat -A`, `pat -R` | Includes observed/template/difference residual plot, not full timing residuals |
| Polarization calibration wizard | Implemented v1 | real provider + `pac` | `pac -d/-p/-A/-s/-S/-P` | Uses existing database / path / solution inputs only |
| Batch processing recipes | Implemented v1 | local + docker | renderer orchestration + session APIs | Save, load, rename, delete, and sequentially run recipes |

## Implemented with intentional v1 limits

### RFI zapping

- Current scope is channel zapping only.
- Waterfall click toggles one channel.
- Waterfall box select adds a channel range.
- The app does not yet expose:
  - automatic `paz -r` / `paz -L`
  - sub-integration zapping
  - phase-bin zapping

### TOA extraction

- Current scope is `pat` with archive templates.
- The app returns:
  - raw `pat` text output
  - parsed subint / chan / shift / error fields
  - a visual residual built from the aligned template and observed profile
- The app does not yet expose:
  - Gaussian component templates
  - `tempo2` timing residual plots against `.par + .tim`

### Calibration

- Current scope assumes calibration inputs already exist.
- You can point the session to:
  - a calibration search path
  - `database.txt`
  - a specific solution file
- The app does not yet build new calibration databases from raw calibrator observations.

### Batch processing

- Current scope is a foreground sequential run orchestrated by the renderer.
- Recipes are persisted locally per workspace.
- The app does not yet include:
  - a background queue
  - retry policies
  - resumable jobs
  - shared/team recipes

## Still not implemented

| Capability | Planned scope |
|------------|---------------|
| Full timing residuals | Run `tempo2` with `.par + .tim` and plot residuals vs epoch / frequency |
| Automatic RFI heuristics UI | Expose `paz -r`, `paz -L`, and other automatic zapping helpers |
| Subint / phase-bin zapping | Extend beyond channel-only zapping in the waterfall |
| Calibration database builder | Generate `pac` databases from raw calibrator observations |
| Background batch queue | Long-running jobs, retry, and progress history |

## Related docs

- [processing-guide.md](processing-guide.md)
- [api.md](api.md)
- [data-flow.md](data-flow.md)
- [backend.md](backend.md)

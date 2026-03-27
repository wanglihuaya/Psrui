# Processing Guide

中文版本: [processing-guide.zh.md](processing-guide.zh.md)

This guide explains how to use the session-based PSRCHIVE processing workflow from the desktop UI.

## Core model

- Opening an archive creates a backend processing session.
- The renderer reads charts from `/api/sessions/{id}/preview/*`.
- Every processing change updates the session recipe, then refreshes the preview.
- Nothing mutates the source archive in place.
- `Save Archive` and batch runs always export new files.

## Opening the Processing Inspector

1. Open any archive file.
2. In the chart toolbar, click the `Processing` button.
3. The right-side Processing Inspector opens with five tabs:
   - `Zap`
   - `Pam`
   - `TOA`
   - `Cal`
   - `Batch`

If the backend is running in mock mode, or required PSRCHIVE tools are missing, the panel stays visible but shows capability notes instead of active controls.

## Zap workflow

v1 supports channel zapping from the `Freq x Phase` waterfall.

### Single channel

1. Switch to `Freq x Phase`.
2. Click a channel row in the heatmap.
3. The channel is added to `recipe.zap.channels`.
4. Click the same channel again to unzap it.

### Channel range

1. In the Plotly modebar, choose box select.
2. Drag vertically across one or more channel rows.
3. The selected channels are merged into `recipe.zap.channels`.

The `Zap` tab lists every selected channel and lets you remove them individually or clear the whole set.

## Pam controls

The `Pam` tab exposes live v1 controls:

- `dedisperse`
- `tscrunch`
- `fscrunch`
- `bscrunch`
- `phase rotate`

Notes:

- Slider changes are debounced before the backend preview refreshes.
- Preview uses the same recipe that export uses.
- `dedisperse` changes chart extraction immediately and is also applied during archive export.

## TOA extraction

The `TOA` tab is a v1 `pat` workflow.

1. Choose a template archive.
2. Pick an algorithm (`PGS`, `GIS`, `PIS`, `SIS`, `ZPS`).
3. Choose output format (`tempo2` or `parkes`).
4. Optionally enable time/frequency scrunch before TOA extraction.
5. Optionally choose an output text path.
6. Click `Run TOA`.

The result area shows:

- parsed TOA rows
- raw `pat` output
- a visual residual chart with:
  - observed profile
  - aligned template
  - difference trace

This is not yet a full `tempo2` timing residual workflow.

## Calibration preview

The `Cal` tab is a v1 `pac` workflow for existing calibration assets.

You can provide:

- a calibration search path
- `database.txt`
- a solution file

You can also choose:

- model: `SingleAxis`, `Polar`, `Reception`
- `pol-only`

The current session preview updates with calibration enabled, and `Refresh` shows the latest `pac` command and log output.

## Exporting the current archive

`Save Archive` exports the current session recipe to a new archive path.

The default filename pattern is:

```text
<original-stem>.<archiveExtension><original-extension>
```

Example:

```text
J0437-4715.processed.ar
```

The output never overwrites the source file unless you explicitly choose the same target path in the save dialog.

## Batch recipes

The `Batch` tab does three things:

1. stores reusable recipes per workspace
2. controls default export naming/output directory
3. runs sequential batch exports

### Save a recipe

1. Build the live recipe with the `Zap`, `Pam`, `TOA`, and `Cal` tabs.
2. Enter a recipe name in `Batch`.
3. Click `Save recipe`.

### Reuse a saved recipe

1. In `Batch`, click `Load` on a saved recipe.
2. The current session preview updates to match that recipe.

### Run a batch export

1. In `Batch`, choose whether TOA text should be exported alongside archives.
2. Optionally set an output directory.
3. Click `Select files and run`.
4. Pick one or more archive files.

The app then, for each file:

1. creates a temporary processing session
2. applies the selected recipe
3. exports a processed archive copy
4. optionally exports a TOA text file
5. records success or failure in the batch log

## Recommended runtime

Use Docker / OrbStack for the most complete workflow:

```bash
npm run backend:docker:pull
npm run dev:docker
```

That runtime gives the app stable access to `paz`, `pam`, `pat`, `pac`, and `tempo2`.

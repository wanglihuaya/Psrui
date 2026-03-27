from __future__ import annotations

import os
from typing import Optional

from fastapi import APIRouter, Body, HTTPException, Query

from app.data_provider import get_provider
from app.processing import ProcessingSessionManager
from app.psrcat import PsrcatDB

router = APIRouter()
provider = get_provider()
psrcat_db = PsrcatDB()
processing_sessions = ProcessingSessionManager(provider)


@router.get("/health")
async def health():
    return {"status": "ok", "provider": provider.name}


@router.get("/capabilities")
async def capabilities():
    return processing_sessions.get_capabilities()


ARCHIVE_EXTENSIONS = {".ar", ".fits", ".fit", ".sf", ".rf", ".cf", ".pfd"}
IGNORE_DIRS = {"__pycache__", ".git", "node_modules", ".DS_Store", "venv", ".venv"}


@router.get("/files")
async def list_files(dir: str = Query(default="")):
    """List pulsar archive files in a directory (flat, one level)."""
    target = dir or os.path.expanduser("~")
    if not os.path.isdir(target):
        raise HTTPException(404, f"Directory not found: {target}")

    files = []
    for entry in sorted(os.listdir(target)):
        path = os.path.join(target, entry)
        if os.path.isfile(path):
            _, ext = os.path.splitext(entry)
            if ext.lower() in ARCHIVE_EXTENSIONS:
                files.append(path)
    return {"files": files}


def _build_tree(base: str, rel: str = "") -> dict:
    """Recursively build a file-tree dict for `base/rel`."""
    abs_path = os.path.join(base, rel) if rel else base
    name = os.path.basename(abs_path) or abs_path
    node: dict = {"name": name, "path": abs_path, "type": "directory", "children": []}

    try:
        entries = sorted(os.listdir(abs_path))
    except PermissionError:
        return node

    for entry in entries:
        if entry.startswith(".") or entry in IGNORE_DIRS:
            continue
        child_abs = os.path.join(abs_path, entry)
        if os.path.isdir(child_abs):
            child_rel = os.path.join(rel, entry) if rel else entry
            node["children"].append(_build_tree(base, child_rel))
        elif os.path.isfile(child_abs):
            _, ext = os.path.splitext(entry)
            if ext.lower() in ARCHIVE_EXTENSIONS:
                node["children"].append({
                    "name": entry,
                    "path": child_abs,
                    "type": "file",
                    "children": [],
                })

    return node


@router.get("/files/tree")
async def get_file_tree(dir: str = Query(default="")):
    """Return a recursive file-tree rooted at `dir`."""
    target = dir or os.path.expanduser("~")
    if not os.path.isdir(target):
        raise HTTPException(404, f"Directory not found: {target}")
    return _build_tree(target)


@router.get("/archive")
async def load_archive(path: str = Query(...)):
    """Load archive metadata."""
    try:
        return provider.get_metadata(path)
    except Exception as e:
        raise HTTPException(500, f"Failed to load archive: {e}")


@router.get("/archive/profile")
async def get_profile(
    path: str = Query(...),
    subint: Optional[int] = Query(default=None),
    chan: Optional[int] = Query(default=None),
):
    """Get integrated pulse profile."""
    try:
        return provider.get_profile(path, subint=subint, chan=chan)
    except Exception as e:
        raise HTTPException(500, f"Failed to get profile: {e}")


@router.get("/archive/waterfall")
async def get_waterfall(
    path: str = Query(...),
    subint: Optional[int] = Query(default=None),
):
    """Get frequency-phase waterfall (2D intensity map)."""
    try:
        return provider.get_waterfall(path, subint=subint)
    except Exception as e:
        raise HTTPException(500, f"Failed to get waterfall: {e}")


@router.get("/archive/time-phase")
async def get_time_phase(
    path: str = Query(...),
    chan: Optional[int] = Query(default=None),
):
    """Get time-phase plot data."""
    try:
        return provider.get_time_phase(path, chan=chan)
    except Exception as e:
        raise HTTPException(500, f"Failed to get time-phase: {e}")


@router.get("/archive/bandpass")
async def get_bandpass(
    path: str = Query(...),
):
    """Get bandpass (mean intensity per channel)."""
    try:
        return provider.get_bandpass(path)
    except Exception as e:
        raise HTTPException(500, f"Failed to get bandpass: {e}")


@router.post("/sessions")
async def create_processing_session(payload: dict = Body(...)):
    path = payload.get("path")
    if not path:
        raise HTTPException(400, "path is required")

    try:
        return processing_sessions.create_session(path)
    except Exception as e:
        raise HTTPException(500, f"Failed to create processing session: {e}")


@router.patch("/sessions/{session_id}/recipe")
async def update_processing_recipe(session_id: str, payload: dict = Body(...)):
    recipe = payload.get("recipe")
    if recipe is None:
        raise HTTPException(400, "recipe is required")

    try:
        return processing_sessions.update_recipe(session_id, recipe)
    except KeyError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Failed to update recipe: {e}")


def _get_session_preview_path(session_id: str) -> str:
    try:
        return processing_sessions.get_preview_path(session_id)
    except KeyError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Failed to materialize session preview: {e}")


def _get_session(session_id: str):
    try:
        return processing_sessions.get_session(session_id)
    except KeyError as e:
        raise HTTPException(404, str(e))


@router.get("/sessions/{session_id}/preview/metadata")
async def get_session_metadata(session_id: str):
    preview_path = _get_session_preview_path(session_id)
    try:
        return provider.get_metadata(preview_path)
    except Exception as e:
        raise HTTPException(500, f"Failed to get session metadata: {e}")


@router.get("/sessions/{session_id}/preview/profile")
async def get_session_profile(
    session_id: str,
    subint: Optional[int] = Query(default=None),
    chan: Optional[int] = Query(default=None),
):
    preview_path = _get_session_preview_path(session_id)
    session = _get_session(session_id)
    try:
        return provider.get_profile(
            preview_path,
            subint=subint,
            chan=chan,
            dedisperse=bool(session.recipe["pam"]["dedisperse"]),
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to get session profile: {e}")


@router.get("/sessions/{session_id}/preview/waterfall")
async def get_session_waterfall(
    session_id: str,
    subint: Optional[int] = Query(default=None),
):
    preview_path = _get_session_preview_path(session_id)
    session = _get_session(session_id)
    try:
        return provider.get_waterfall(
            preview_path,
            subint=subint,
            dedisperse=bool(session.recipe["pam"]["dedisperse"]),
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to get session waterfall: {e}")


@router.get("/sessions/{session_id}/preview/time-phase")
async def get_session_time_phase(
    session_id: str,
    chan: Optional[int] = Query(default=None),
):
    preview_path = _get_session_preview_path(session_id)
    session = _get_session(session_id)
    try:
        return provider.get_time_phase(
            preview_path,
            chan=chan,
            dedisperse=bool(session.recipe["pam"]["dedisperse"]),
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to get session time-phase: {e}")


@router.get("/sessions/{session_id}/preview/bandpass")
async def get_session_bandpass(session_id: str):
    preview_path = _get_session_preview_path(session_id)
    try:
        return provider.get_bandpass(preview_path)
    except Exception as e:
        raise HTTPException(500, f"Failed to get session bandpass: {e}")


@router.post("/sessions/{session_id}/export")
async def export_session_archive(session_id: str, payload: dict = Body(...)):
    output_path = payload.get("outputPath")
    if not output_path:
        raise HTTPException(400, "outputPath is required")

    try:
        return processing_sessions.export_archive(session_id, output_path)
    except KeyError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Failed to export archive: {e}")


@router.post("/sessions/{session_id}/toa")
async def run_session_toa(session_id: str, payload: dict = Body(...)):
    try:
        return processing_sessions.run_toa(session_id, payload)
    except KeyError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Failed to run TOA extraction: {e}")


@router.post("/sessions/{session_id}/calibration/preview")
async def preview_session_calibration(session_id: str):
    try:
        return processing_sessions.get_preview_log(session_id)
    except KeyError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Failed to preview calibration: {e}")


@router.delete("/sessions/{session_id}")
async def delete_processing_session(session_id: str):
    processing_sessions.delete_session(session_id)
    return {"ok": True}


@router.get("/psrcat/pulsars")
async def get_psrcat_pulsars():
    """Get all pulsars from PSRCAT."""
    return psrcat_db.get_all()


@router.get("/psrcat/pulsar/{name}")
async def get_psrcat_pulsar(name: str):
    """Get single pulsar ephemeris from PSRCAT."""
    p = psrcat_db.get_pulsar(name)
    if not p:
        raise HTTPException(404, f"Pulsar {name} not found in PSRCAT")
    return p


@router.get("/psrcat/stats")
async def get_psrcat_stats():
    """Get PSRCAT summary statistics."""
    return psrcat_db.get_stats()

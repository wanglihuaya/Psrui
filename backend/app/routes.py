from __future__ import annotations

import os
import traceback
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.data_provider import get_provider
from app.psrcat import PsrcatDB

router = APIRouter()
provider = get_provider()
psrcat_db = PsrcatDB()


@router.get("/health")
async def health():
    return {"status": "ok", "provider": provider.name}


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

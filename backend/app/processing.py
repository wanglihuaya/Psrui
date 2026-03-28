from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from uuid import uuid4

import numpy as np

from app.data_provider import DataProvider
from app.validators import validate_channels, validate_toa_algorithm, MAX_SCRUNCH_FACTOR
from app.errors import ValidationError, NotFoundError, ProcessingError, CapabilityError


DEFAULT_RECIPE: dict[str, Any] = {
    "zap": {
        "channels": [],
    },
    "pam": {
        "dedisperse": True,
        "tscrunchFactor": 1,
        "fscrunchFactor": 1,
        "bscrunchFactor": 1,
        "phaseRotateTurns": 0.0,
    },
    "calibration": {
        "enabled": False,
        "searchPath": None,
        "databasePath": None,
        "solutionPath": None,
        "model": "SingleAxis",
        "polOnly": False,
    },
    "toa": None,
    "output": {
        "archiveExtension": "processed",
        "exportToa": False,
        "toaFormat": "tempo2",
        "outputDirectory": None,
    },
}


def _deep_merge(base: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    merged: dict[str, Any] = json.loads(json.dumps(base))
    for key, value in patch.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def normalize_recipe(recipe: dict[str, Any] | None) -> dict[str, Any]:
    merged = _deep_merge(DEFAULT_RECIPE, recipe or {})

    # Validate and normalize zap channels
    channels = merged["zap"].get("channels") or []
    merged["zap"]["channels"] = validate_channels(channels)

    # Validate and normalize pam settings with max limits
    pam = merged["pam"]
    pam["dedisperse"] = bool(pam.get("dedisperse", True))
    pam["tscrunchFactor"] = min(MAX_SCRUNCH_FACTOR, max(1, int(pam.get("tscrunchFactor", 1))))
    pam["fscrunchFactor"] = min(MAX_SCRUNCH_FACTOR, max(1, int(pam.get("fscrunchFactor", 1))))
    pam["bscrunchFactor"] = min(MAX_SCRUNCH_FACTOR, max(1, int(pam.get("bscrunchFactor", 1))))
    pam["phaseRotateTurns"] = float(pam.get("phaseRotateTurns", 0.0))

    calibration = merged["calibration"]
    calibration["enabled"] = bool(calibration.get("enabled", False))
    calibration["searchPath"] = calibration.get("searchPath") or None
    calibration["databasePath"] = calibration.get("databasePath") or None
    calibration["solutionPath"] = calibration.get("solutionPath") or None
    calibration["model"] = calibration.get("model") or "SingleAxis"
    calibration["polOnly"] = bool(calibration.get("polOnly", False))

    toa = merged.get("toa")
    if toa:
        toa["templatePath"] = toa.get("templatePath") or ""
        toa["algorithm"] = validate_toa_algorithm(toa.get("algorithm") or "PGS")
        toa["format"] = toa.get("format") or "tempo2"
        toa["timeScrunch"] = bool(toa.get("timeScrunch", False))
        toa["frequencyScrunch"] = bool(toa.get("frequencyScrunch", False))
        toa["outputPath"] = toa.get("outputPath") or None
    else:
        merged["toa"] = None

    output = merged["output"]
    output["archiveExtension"] = (output.get("archiveExtension") or "processed").strip().lstrip(".") or "processed"
    output["exportToa"] = bool(output.get("exportToa", False))
    output["toaFormat"] = output.get("toaFormat") or "tempo2"
    output["outputDirectory"] = output.get("outputDirectory") or None

    return merged


def clone_recipe(recipe: dict[str, Any]) -> dict[str, Any]:
    return json.loads(json.dumps(recipe))


def _shift_profile(values: list[float], turns: float) -> list[float]:
    profile = np.asarray(values, dtype=np.float64)
    if profile.size == 0:
        return []

    freqs = np.fft.rfftfreq(profile.size)
    spectrum = np.fft.rfft(profile)
    shifted = np.fft.irfft(spectrum * np.exp(-2j * np.pi * freqs * turns * profile.size), n=profile.size)
    return shifted.real.tolist()


def detect_capabilities(runtime: str, provider_name: str) -> dict[str, Any]:
    cli = {
        "paz": shutil.which("paz") is not None,
        "pam": shutil.which("pam") is not None,
        "pat": shutil.which("pat") is not None,
        "pac": shutil.which("pac") is not None,
        "tempo2": shutil.which("tempo2") is not None,
    }

    messages: list[str] = []
    using_real_provider = provider_name == "psrchive"

    if not using_real_provider:
        messages.append("Real PSRCHIVE bindings are not available; advanced processing stays disabled.")

    if runtime != "docker":
        messages.append("Docker runtime is the primary supported environment for advanced PSRCHIVE workflows.")

    features = {
        "sessions": True,
        "zapping": using_real_provider and cli["paz"],
        "pam": using_real_provider and cli["pam"],
        "toa": using_real_provider and cli["pat"],
        "calibration": using_real_provider and cli["pac"],
        "batch": using_real_provider and cli["paz"] and cli["pam"],
    }

    if not features["zapping"]:
        messages.append("Interactive zapping requires both psrchive bindings and the paz CLI.")
    if not features["pam"]:
        messages.append("Live pam controls require both psrchive bindings and the pam CLI.")
    if not features["toa"]:
        messages.append("TOA extraction requires the pat CLI.")
    if not features["calibration"]:
        messages.append("Calibration preview requires the pac CLI.")

    return {
        "runtime": runtime,
        "provider": provider_name,
        "cli": cli,
        "features": features,
        "messages": messages,
    }


@dataclass
class ProcessingSession:
    id: str
    path: str
    recipe: dict[str, Any]
    temp_dir: str
    preview_path: str | None = None
    materialized_digest: str | None = None
    last_commands: list[list[str]] = field(default_factory=list)
    last_log: str = ""

    def summary(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "path": self.path,
            "previewPath": self.preview_path,
            "recipe": clone_recipe(self.recipe),
        }


class ProcessingSessionManager:
    def __init__(self, provider: DataProvider):
        self.provider = provider
        self.runtime = os.getenv("PSRCHIVE_VIEWER_RUNTIME", "local")
        self._sessions: dict[str, ProcessingSession] = {}
        self._lock = threading.Lock()

    def get_capabilities(self) -> dict[str, Any]:
        return detect_capabilities(self.runtime, self.provider.name)

    def create_session(self, path: str) -> dict[str, Any]:
        if not os.path.isfile(path):
            raise FileNotFoundError(f"Archive not found: {path}")

        session = ProcessingSession(
            id=uuid4().hex,
            path=os.path.abspath(path),
            recipe=clone_recipe(DEFAULT_RECIPE),
            temp_dir=tempfile.mkdtemp(prefix="psrchive-viewer-session-"),
        )

        with self._lock:
            self._sessions[session.id] = session

        return session.summary()

    def get_session(self, session_id: str) -> ProcessingSession:
        with self._lock:
            session = self._sessions.get(session_id)
        if not session:
            raise KeyError(f"Unknown session: {session_id}")
        return session

    def update_recipe(self, session_id: str, recipe: dict[str, Any]) -> dict[str, Any]:
        session = self.get_session(session_id)
        session.recipe = normalize_recipe(recipe)
        session.materialized_digest = None
        return session.summary()

    def delete_session(self, session_id: str) -> None:
        with self._lock:
            session = self._sessions.pop(session_id, None)

        if not session:
            return

        shutil.rmtree(session.temp_dir, ignore_errors=True)

    def get_preview_path(self, session_id: str) -> str:
        session = self.get_session(session_id)
        return self._ensure_materialized(session)

    def get_preview_log(self, session_id: str) -> dict[str, Any]:
        session = self.get_session(session_id)
        self._ensure_materialized(session)
        return {
            "command": session.last_commands[-1] if session.last_commands else [],
            "commands": session.last_commands,
            "log": session.last_log,
            "previewPath": session.preview_path,
        }

    def export_archive(self, session_id: str, output_path: str) -> dict[str, Any]:
        session = self.get_session(session_id)
        preview_path = self._ensure_materialized(session)
        target = os.path.abspath(output_path)
        os.makedirs(os.path.dirname(target) or ".", exist_ok=True)

        shutil.copy2(preview_path, target)

        if session.recipe["pam"]["dedisperse"] and self.get_capabilities()["features"]["pam"]:
            self._run_command(["pam", "-m", "-D", target], cwd=session.temp_dir)

        return {"outputPath": target}

    def run_toa(self, session_id: str, request: dict[str, Any]) -> dict[str, Any]:
        capabilities = self.get_capabilities()
        if not capabilities["features"]["toa"]:
            raise RuntimeError("TOA extraction requires the pat CLI and real psrchive bindings.")

        session = self.get_session(session_id)
        preview_path = self._ensure_materialized(session)

        template_path = os.path.abspath(request.get("templatePath") or "")
        if not os.path.isfile(template_path):
            raise FileNotFoundError("Template archive not found.")

        algorithm = (request.get("algorithm") or "PGS").upper()
        fmt = request.get("format") or "tempo2"
        time_scrunch = bool(request.get("timeScrunch", False))
        frequency_scrunch = bool(request.get("frequencyScrunch", False))
        output_path = request.get("outputPath") or None

        line_command = ["pat", "-A", algorithm, "-s", template_path]
        shift_command = ["pat", "-A", algorithm, "-s", template_path, "-R"]

        if time_scrunch:
            line_command.append("-T")
            shift_command.append("-T")
        if frequency_scrunch:
            line_command.append("-F")
            shift_command.append("-F")

        if fmt == "parkes":
            line_command.extend(["-f", "parkes"])
        else:
            line_command.extend(["-f", "tempo2"])

        line_command.append(preview_path)
        shift_command.append(preview_path)

        line_output = self._run_command(line_command, cwd=session.temp_dir)
        shift_output = self._run_command(shift_command, cwd=session.temp_dir)

        raw_output = self._strip_runtime_warnings(line_output["stdout"])
        shift_text = self._strip_runtime_warnings(shift_output["stdout"])

        parsed_row = self._parse_shift_output(shift_text)
        metadata = self.provider.get_metadata(preview_path)
        observed = self.provider.get_profile(preview_path, dedisperse=False)
        template = self.provider.get_profile(template_path, dedisperse=False)

        residual = None
        if observed.get("phase") and observed.get("intensity") and template.get("intensity"):
            aligned_template = _shift_profile(template["intensity"], parsed_row["shiftTurns"])
            difference = [
                observed_value - template_value
                for observed_value, template_value in zip(observed["intensity"], aligned_template)
            ]
            residual = {
                "phase": observed["phase"],
                "observed": observed["intensity"],
                "template": aligned_template,
                "difference": difference,
            }

        row = {
            "line": raw_output.splitlines()[-1] if raw_output.splitlines() else raw_output,
            "shiftTurns": parsed_row["shiftTurns"],
            "errorTurns": parsed_row["errorTurns"],
            "frequencyMHz": float(metadata.get("centre_freq")) if metadata.get("centre_freq") is not None else None,
            "subint": parsed_row["subint"],
            "chan": parsed_row["chan"],
        }

        if output_path:
            target = os.path.abspath(output_path)
            os.makedirs(os.path.dirname(target) or ".", exist_ok=True)
            with open(target, "w", encoding="utf-8") as handle:
                handle.write(raw_output.strip())
                handle.write("\n")

        return {
            "format": fmt,
            "rawOutput": raw_output.strip(),
            "rows": [row],
            "residual": residual,
            "command": line_command,
            "outputPath": os.path.abspath(output_path) if output_path else None,
        }

    def _ensure_materialized(self, session: ProcessingSession) -> str:
        recipe_digest = hashlib.sha1(json.dumps(session.recipe, sort_keys=True).encode("utf-8")).hexdigest()
        if session.preview_path and session.materialized_digest == recipe_digest and os.path.exists(session.preview_path):
            return session.preview_path

        self._clear_temp_dir(session.temp_dir)
        source_path = Path(session.path)
        working_path = Path(session.temp_dir) / f"source{source_path.suffix or '.ar'}"
        shutil.copy2(source_path, working_path)

        session.last_commands = []
        build_logs: list[str] = []

        if session.recipe["zap"]["channels"] and self.get_capabilities()["features"]["zapping"]:
            channels = " ".join(str(channel) for channel in session.recipe["zap"]["channels"])
            result = self._run_command(["paz", "-m", "-z", channels, str(working_path)], cwd=session.temp_dir)
            session.last_commands.append(result["command"])
            build_logs.append(result["stderr"] or result["stdout"])

        pam_recipe = session.recipe["pam"]
        pam_args = ["pam", "-m"]
        if pam_recipe["tscrunchFactor"] > 1:
            pam_args.extend(["-t", str(pam_recipe["tscrunchFactor"])])
        if pam_recipe["fscrunchFactor"] > 1:
            pam_args.extend(["-f", str(pam_recipe["fscrunchFactor"])])
        if pam_recipe["bscrunchFactor"] > 1:
            pam_args.extend(["-b", str(pam_recipe["bscrunchFactor"])])
        if abs(float(pam_recipe["phaseRotateTurns"])) > 1e-9:
            pam_args.extend(["-r", str(pam_recipe["phaseRotateTurns"])])

        if len(pam_args) > 2 and self.get_capabilities()["features"]["pam"]:
            pam_args.append(str(working_path))
            result = self._run_command(pam_args, cwd=session.temp_dir)
            session.last_commands.append(result["command"])
            build_logs.append(result["stderr"] or result["stdout"])

        calibration = session.recipe["calibration"]
        if calibration["enabled"] and self.get_capabilities()["features"]["calibration"]:
            calibration_result = self._run_calibration(session, working_path)
            working_path = Path(calibration_result["previewPath"])
            session.last_commands.extend(calibration_result["commands"])
            build_logs.append(calibration_result["log"])

        session.preview_path = str(working_path)
        session.materialized_digest = recipe_digest
        session.last_log = "\n".join(log.strip() for log in build_logs if log and log.strip())
        return session.preview_path

    def _run_calibration(self, session: ProcessingSession, working_path: Path) -> dict[str, Any]:
        calibration = session.recipe["calibration"]
        args = ["pac", "-e", "previewcal", "-O", session.temp_dir]

        if calibration["databasePath"]:
            args.extend(["-d", str(calibration["databasePath"])])
        if calibration["searchPath"]:
            args.extend(["-p", str(calibration["searchPath"])])
        if calibration["solutionPath"]:
            args.extend(["-A", str(calibration["solutionPath"])])
        if calibration["model"] == "Polar":
            args.append("-s")
        elif calibration["model"] == "Reception":
            args.append("-S")
        if calibration["polOnly"]:
            args.append("-P")

        args.append(str(working_path))
        result = self._run_command(args, cwd=session.temp_dir)

        preview_path = Path(session.temp_dir) / f"{working_path.stem}.previewcal"
        if not preview_path.exists():
            matches = list(Path(session.temp_dir).glob(f"{working_path.stem}.*"))
            if matches:
                preview_path = matches[0]

        if not preview_path.exists():
            raise RuntimeError("Calibration completed but no output archive was created.")

        return {
            "previewPath": str(preview_path),
            "commands": [result["command"]],
            "log": (result["stderr"] or result["stdout"]).strip(),
        }

    def _clear_temp_dir(self, temp_dir: str) -> None:
        directory = Path(temp_dir)
        directory.mkdir(parents=True, exist_ok=True)
        for child in directory.iterdir():
            if child.is_dir():
                shutil.rmtree(child, ignore_errors=True)
            else:
                child.unlink(missing_ok=True)

    def _run_command(self, command: list[str], cwd: str) -> dict[str, Any]:
        completed = subprocess.run(
            command,
            cwd=cwd,
            capture_output=True,
            text=True,
            check=False,
        )

        if completed.returncode != 0:
            detail = completed.stderr.strip() or completed.stdout.strip() or f"Command failed: {' '.join(command)}"
            raise RuntimeError(detail)

        return {
            "command": command,
            "stdout": completed.stdout,
            "stderr": completed.stderr,
        }

    def _strip_runtime_warnings(self, output: str) -> str:
        useful_lines = [
            line.strip()
            for line in output.splitlines()
            if line.strip()
            and "unknown; assuming linear" not in line
            and "Tempo::toa::Tempo2_unload no antennae named" not in line
        ]
        return "\n".join(useful_lines)

    def _parse_shift_output(self, output: str) -> dict[str, Any]:
        line = output.splitlines()[-1] if output.splitlines() else ""
        parts = line.split()

        if len(parts) < 5:
            raise RuntimeError("Could not parse pat shift output.")

        return {
            "subint": int(parts[1]),
            "chan": int(parts[2]),
            "shiftTurns": float(parts[3]),
            "errorTurns": float(parts[4]),
        }

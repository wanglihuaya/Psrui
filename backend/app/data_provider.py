"""
Data provider abstraction — switches between real psrchive and mock data.

When psrchive Python bindings are available, uses them directly.
Otherwise, falls back to numpy-generated synthetic pulsar data
that mimics realistic pulse profiles, frequency-phase waterfalls, etc.
"""

from __future__ import annotations

import os
from abc import ABC, abstractmethod
from typing import Any

import numpy as np


class DataProvider(ABC):
    """Abstract base for pulsar data access."""

    name: str

    @abstractmethod
    def get_metadata(self, path: str) -> dict[str, Any]: ...

    @abstractmethod
    def get_profile(
        self,
        path: str,
        *,
        subint: int | None = None,
        chan: int | None = None,
        dedisperse: bool = True,
    ) -> dict[str, Any]: ...

    @abstractmethod
    def get_waterfall(
        self,
        path: str,
        *,
        subint: int | None = None,
        dedisperse: bool = True,
    ) -> dict[str, Any]: ...

    @abstractmethod
    def get_time_phase(
        self,
        path: str,
        *,
        chan: int | None = None,
        dedisperse: bool = True,
    ) -> dict[str, Any]: ...

    @abstractmethod
    def get_bandpass(self, path: str, **kwargs) -> dict[str, Any]: ...


# ---------------------------------------------------------------------------
# Mock provider — synthetic data for POC development
# ---------------------------------------------------------------------------

class MockProvider(DataProvider):
    """Generates realistic-looking synthetic pulsar data."""

    name = "mock"

    def _parse_params(self, path: str):
        """Derive reproducible mock parameters from the file path."""
        seed = hash(path) % (2**31)
        rng = np.random.default_rng(seed)
        return {
            "source": f"J{rng.integers(0, 24):02d}{rng.integers(0, 60):02d}+{rng.integers(-90, 90):+03d}{rng.integers(0, 60):02d}",
            "telescope": rng.choice(["Parkes", "GBT", "Effelsberg", "FAST", "MeerKAT"]),
            "instrument": rng.choice(["PDFB4", "GUPPI", "PUPPI", "ROACH"]),
            "centre_freq": float(rng.choice([728.0, 1369.0, 1520.0, 3100.0])),
            "bandwidth": float(rng.choice([64.0, 256.0, 400.0, 800.0])),
            "nchan": int(rng.choice([128, 256, 512, 1024])),
            "nsubint": int(rng.choice([32, 64, 128, 256])),
            "nbin": int(rng.choice([256, 512, 1024])),
            "npol": 4,
            "period": float(rng.uniform(0.001, 2.0)),
            "dm": float(rng.uniform(5.0, 500.0)),
            "duration": float(rng.uniform(60.0, 3600.0)),
            "rng": rng,
        }

    def _make_profile(self, nbin: int, rng: np.random.Generator) -> np.ndarray:
        """Generate a synthetic pulse profile with 1-3 Gaussian components."""
        phase = np.linspace(0, 1, nbin, endpoint=False)
        profile = np.zeros(nbin, dtype=np.float64)
        n_components = rng.integers(1, 4)
        for _ in range(n_components):
            center = rng.uniform(0.35, 0.65)
            width = rng.uniform(0.01, 0.08)
            amplitude = rng.uniform(0.3, 1.0)
            profile += amplitude * np.exp(-0.5 * ((phase - center) / width) ** 2)
        return profile

    def get_metadata(self, path: str) -> dict[str, Any]:
        p = self._parse_params(path)
        freq_lo = p["centre_freq"] - p["bandwidth"] / 2
        freq_hi = p["centre_freq"] + p["bandwidth"] / 2
        return {
            "filename": os.path.basename(path),
            "source": p["source"],
            "telescope": p["telescope"],
            "instrument": p["instrument"],
            "freq_lo": freq_lo,
            "freq_hi": freq_hi,
            "centre_freq": p["centre_freq"],
            "bandwidth": p["bandwidth"],
            "nchan": p["nchan"],
            "nsubint": p["nsubint"],
            "nbin": p["nbin"],
            "npol": p["npol"],
            "period": p["period"],
            "dm": p["dm"],
            "duration": p["duration"],
        }

    def get_profile(
        self,
        path: str,
        *,
        subint: int | None = None,
        chan: int | None = None,
        dedisperse: bool = True,
    ) -> dict[str, Any]:
        p = self._parse_params(path)
        rng = p["rng"]
        nbin = p["nbin"]
        profile_i = self._make_profile(nbin, rng)
        noise = rng.normal(0, 0.02, nbin)
        profile_i = profile_i + noise
        profile_i = (profile_i - profile_i.min()) / (profile_i.max() - profile_i.min())

        phase = np.linspace(0, 1, nbin, endpoint=False)

        # Stokes Q, U, V as fractions of I
        stokes_q = 0.3 * profile_i * np.cos(4 * np.pi * phase) + rng.normal(0, 0.01, nbin)
        stokes_u = 0.3 * profile_i * np.sin(4 * np.pi * phase) + rng.normal(0, 0.01, nbin)
        stokes_v = 0.1 * profile_i * np.sin(2 * np.pi * phase) + rng.normal(0, 0.01, nbin)

        return {
            "phase": phase.tolist(),
            "intensity": profile_i.tolist(),
            "stokes_q": stokes_q.tolist(),
            "stokes_u": stokes_u.tolist(),
            "stokes_v": stokes_v.tolist(),
        }

    def get_waterfall(
        self,
        path: str,
        *,
        subint: int | None = None,
        dedisperse: bool = True,
    ) -> dict[str, Any]:
        p = self._parse_params(path)
        rng = p["rng"]
        nchan = min(p["nchan"], 256)  # cap for performance
        nbin = min(p["nbin"], 512)

        base_profile = self._make_profile(nbin, rng)
        phase = np.linspace(0, 1, nbin, endpoint=False)

        waterfall = np.zeros((nchan, nbin), dtype=np.float64)
        for ch in range(nchan):
            # simulate dispersion smearing
            shift = int(rng.uniform(-2, 2))
            shifted = np.roll(base_profile, shift)
            # channel-dependent gain and noise
            gain = 1.0 + 0.3 * np.sin(2 * np.pi * ch / nchan)
            noise = rng.normal(0, 0.05, nbin)
            waterfall[ch] = gain * shifted + noise

            # simulate RFI in a few channels
            if rng.random() < 0.03:
                waterfall[ch] += rng.uniform(0.5, 2.0)

        freq_lo = p["centre_freq"] - p["bandwidth"] / 2
        freq_hi = p["centre_freq"] + p["bandwidth"] / 2
        channels = np.linspace(freq_lo, freq_hi, nchan).tolist()

        return {
            "phase": phase.tolist(),
            "channels": channels,
            "intensities": waterfall.tolist(),
        }

    def get_time_phase(
        self,
        path: str,
        *,
        chan: int | None = None,
        dedisperse: bool = True,
    ) -> dict[str, Any]:
        p = self._parse_params(path)
        rng = p["rng"]
        nsubint = min(p["nsubint"], 128)
        nbin = min(p["nbin"], 512)

        base_profile = self._make_profile(nbin, rng)
        phase = np.linspace(0, 1, nbin, endpoint=False)

        time_phase = np.zeros((nsubint, nbin), dtype=np.float64)
        for si in range(nsubint):
            # simulate slight pulse jitter and scintillation
            jitter = rng.integers(-3, 4)
            scint = rng.uniform(0.5, 1.5)
            noise = rng.normal(0, 0.04, nbin)
            time_phase[si] = scint * np.roll(base_profile, jitter) + noise

            # occasional dropout
            if rng.random() < 0.02:
                time_phase[si] *= 0.1

        subints = list(range(nsubint))

        return {
            "phase": phase.tolist(),
            "subints": subints,
            "intensities": time_phase.tolist(),
        }

    def get_bandpass(self, path: str, **kwargs) -> dict[str, Any]:
        p = self._parse_params(path)
        rng = p["rng"]
        nchan = min(p["nchan"], 256)
        freq_lo = p["centre_freq"] - p["bandwidth"] / 2
        freq_hi = p["centre_freq"] + p["bandwidth"] / 2
        channels = np.linspace(freq_lo, freq_hi, nchan)
        # bandpass shape: smooth curve with some RFI spikes
        bandpass = 1.0 + 0.3 * np.sin(np.pi * np.arange(nchan) / nchan)
        bandpass += rng.normal(0, 0.02, nchan)
        # RFI spikes
        for _ in range(3):
            idx = rng.integers(0, nchan)
            bandpass[idx] += rng.uniform(0.5, 2.0)
        return {"channels": channels.tolist(), "intensities": bandpass.tolist()}


# ---------------------------------------------------------------------------
# Real psrchive provider (stub — activate when psrchive is installed)
# ---------------------------------------------------------------------------

class PsrchiveProvider(DataProvider):
    """Uses the real psrchive Python bindings."""

    name = "psrchive"

    def __init__(self):
        import psrchive  # noqa: F401
        self._psrchive = psrchive

    def get_metadata(self, path: str) -> dict[str, Any]:
        ar = self._psrchive.Archive_load(path)
        ar.remove_baseline()
        first_integration = ar.get_Integration(0)
        return {
            "filename": os.path.basename(path),
            "source": ar.get_source(),
            "telescope": ar.get_telescope(),
            "instrument": ar.get_backend_name(),
            "freq_lo": float(ar.get_centre_frequency() - ar.get_bandwidth() / 2),
            "freq_hi": float(ar.get_centre_frequency() + ar.get_bandwidth() / 2),
            "centre_freq": float(ar.get_centre_frequency()),
            "bandwidth": float(ar.get_bandwidth()),
            "nchan": int(ar.get_nchan()),
            "nsubint": int(ar.get_nsubint()),
            "nbin": int(ar.get_nbin()),
            "npol": int(ar.get_npol()),
            "period": float(first_integration.get_folding_period()),
            "dm": float(ar.get_dispersion_measure()),
            "duration": float(ar.integration_length()),
        }

    def get_profile(
        self,
        path: str,
        *,
        subint: int | None = None,
        chan: int | None = None,
        dedisperse: bool = True,
    ) -> dict[str, Any]:
        ar = self._psrchive.Archive_load(path)
        ar.remove_baseline()
        if dedisperse:
            ar.dedisperse()

        if subint is None:
            ar.tscrunch()
        if chan is None:
            ar.fscrunch()

        nbin = ar.get_nbin()
        phase = [i / nbin for i in range(nbin)]

        data = ar.get_data()
        si = 0 if subint is None else subint
        ch = 0 if chan is None else chan

        result = {
            "phase": phase,
            "intensity": data[si, 0, ch].tolist(),
        }
        if ar.get_npol() >= 4:
            result["stokes_q"] = data[si, 1, ch].tolist()
            result["stokes_u"] = data[si, 2, ch].tolist()
            result["stokes_v"] = data[si, 3, ch].tolist()
        return result

    def get_waterfall(
        self,
        path: str,
        *,
        subint: int | None = None,
        dedisperse: bool = True,
    ) -> dict[str, Any]:
        ar = self._psrchive.Archive_load(path)
        ar.remove_baseline()
        if dedisperse:
            ar.dedisperse()
        if subint is None:
            ar.tscrunch()

        data = ar.get_data()
        si = 0 if subint is None else subint
        nchan = ar.get_nchan()
        nbin = ar.get_nbin()

        freq_lo = ar.get_centre_frequency() - ar.get_bandwidth() / 2
        freq_hi = ar.get_centre_frequency() + ar.get_bandwidth() / 2

        return {
            "phase": [i / nbin for i in range(nbin)],
            "channels": [freq_lo + (freq_hi - freq_lo) * i / nchan for i in range(nchan)],
            "intensities": data[si, 0].tolist(),
        }

    def get_time_phase(
        self,
        path: str,
        *,
        chan: int | None = None,
        dedisperse: bool = True,
    ) -> dict[str, Any]:
        ar = self._psrchive.Archive_load(path)
        ar.remove_baseline()
        if dedisperse:
            ar.dedisperse()
        if chan is None:
            ar.fscrunch()

        data = ar.get_data()
        ch = 0 if chan is None else chan
        nsubint = ar.get_nsubint()
        nbin = ar.get_nbin()

        return {
            "phase": [i / nbin for i in range(nbin)],
            "subints": list(range(nsubint)),
            "intensities": data[:, 0, ch].tolist(),
        }

    def get_bandpass(self, path: str, **kwargs) -> dict[str, Any]:
        ar = self._psrchive.Archive_load(path)
        ar.remove_baseline()
        ar.tscrunch()
        data = ar.get_data()
        nchan = ar.get_nchan()
        bandpass = data[0, 0].mean(axis=1)  # mean over phase bins per channel
        freq_lo = ar.get_centre_frequency() - ar.get_bandwidth() / 2
        freq_hi = ar.get_centre_frequency() + ar.get_bandwidth() / 2
        return {
            "channels": [freq_lo + (freq_hi - freq_lo) * i / nchan for i in range(nchan)],
            "intensities": bandpass.tolist(),
        }


def get_provider() -> DataProvider:
    """Auto-detect which provider to use."""
    try:
        return PsrchiveProvider()
    except ImportError:
        print("[backend] psrchive not available — using mock data provider")
        return MockProvider()

"""
Input validation utilities for the PSRCHIVE Viewer backend.

Provides functions to validate paths, numeric ranges, and other inputs
to prevent security issues like path traversal and command injection.
"""

import os
from pathlib import Path
from typing import Optional

ALLOWED_ARCHIVE_EXTENSIONS = {".ar", ".fits", ".fit", ".sf", ".rf", ".cf", ".pfd"}
ALLOWED_TOA_ALGORITHMS = {"PGS", "GIS", "PIS", "SIS", "ZPS"}
MAX_SCRUNCH_FACTOR = 1000


class ValidationError(ValueError):
    """Raised when input validation fails."""
    pass


def validate_path(path: str, must_exist: bool = True) -> str:
    """
    Validate a path for security, preventing path traversal attacks.

    Args:
        path: The path to validate
        must_exist: Whether the path must exist on disk

    Returns:
        The normalized absolute path

    Raises:
        ValidationError: If the path is invalid or contains traversal attempts
        FileNotFoundError: If must_exist=True and path doesn't exist
    """
    if not path:
        raise ValidationError("Path is required")

    # Normalize the path to resolve . and .. components
    normalized = os.path.normpath(path)

    # Check for path traversal attempts
    # After normpath, any remaining ".." in parts indicates traversal
    parts = Path(normalized).parts
    for part in parts:
        if part == "..":
            raise ValidationError("Path traversal not allowed")

    if must_exist and not os.path.exists(normalized):
        raise FileNotFoundError(f"Path not found: {normalized}")

    return normalized


def validate_directory(path: str) -> str:
    """
    Validate that a path exists and is a directory.

    Args:
        path: The directory path to validate

    Returns:
        The normalized directory path

    Raises:
        ValidationError: If the path is not a directory
        FileNotFoundError: If the directory doesn't exist
    """
    normalized = validate_path(path, must_exist=True)
    if not os.path.isdir(normalized):
        raise ValidationError(f"Not a directory: {normalized}")
    return normalized


def validate_file(path: str, allowed_extensions: Optional[set] = None) -> str:
    """
    Validate that a path exists and is a file, optionally checking extension.

    Args:
        path: The file path to validate
        allowed_extensions: Optional set of allowed file extensions (e.g., {'.ar', '.fits'})

    Returns:
        The normalized file path

    Raises:
        ValidationError: If the path is not a file or has invalid extension
        FileNotFoundError: If the file doesn't exist
    """
    normalized = validate_path(path, must_exist=True)
    if not os.path.isfile(normalized):
        raise ValidationError(f"Not a file: {normalized}")

    if allowed_extensions:
        ext = Path(normalized).suffix.lower()
        if ext not in allowed_extensions:
            raise ValidationError(f"Invalid file extension: {ext}. Allowed: {', '.join(allowed_extensions)}")

    return normalized


def validate_numeric_range(
    value: Optional[int],
    min_val: int = 0,
    max_val: Optional[int] = None,
    name: str = "value"
) -> Optional[int]:
    """
    Validate that a numeric value is within an acceptable range.

    Args:
        value: The value to validate (None is allowed and passed through)
        min_val: Minimum allowed value (inclusive)
        max_val: Maximum allowed value (inclusive), None for no limit
        name: Name of the parameter for error messages

    Returns:
        The validated value, or None if input was None

    Raises:
        ValidationError: If the value is out of range
    """
    if value is None:
        return None

    if value < min_val:
        raise ValidationError(f"{name} must be >= {min_val}, got {value}")

    if max_val is not None and value > max_val:
        raise ValidationError(f"{name} must be <= {max_val}, got {value}")

    return value


def validate_channels(channels: list, max_channel: Optional[int] = None) -> list[int]:
    """
    Validate a list of channel numbers, preventing command injection.

    Args:
        channels: List of channel values (will be converted to int)
        max_channel: Optional maximum channel number (exclusive)

    Returns:
        Sorted list of unique validated channel integers

    Raises:
        ValidationError: If any channel is invalid
    """
    if not isinstance(channels, list):
        raise ValidationError("Channels must be a list")

    validated = []
    for ch in channels:
        try:
            ch_int = int(ch)
        except (ValueError, TypeError):
            raise ValidationError(f"Invalid channel value: {ch}")

        if ch_int < 0:
            raise ValidationError(f"Channel must be non-negative: {ch_int}")

        if max_channel is not None and ch_int >= max_channel:
            raise ValidationError(f"Channel {ch_int} exceeds maximum {max_channel}")

        validated.append(ch_int)

    return sorted(set(validated))


def validate_toa_algorithm(algorithm: str) -> str:
    """
    Validate a TOA extraction algorithm name.

    Args:
        algorithm: The algorithm name to validate

    Returns:
        The uppercase algorithm name

    Raises:
        ValidationError: If the algorithm is not in the allowed list
    """
    upper = (algorithm or "PGS").upper()
    if upper not in ALLOWED_TOA_ALGORITHMS:
        raise ValidationError(
            f"Invalid TOA algorithm: {algorithm}. "
            f"Allowed: {', '.join(sorted(ALLOWED_TOA_ALGORITHMS))}"
        )
    return upper


def validate_output_path(path: str) -> str:
    """
    Validate an output file path for writing.

    Args:
        path: The output path to validate

    Returns:
        The normalized output path

    Raises:
        ValidationError: If the path is invalid
    """
    if not path:
        raise ValidationError("Output path is required")

    normalized = os.path.normpath(path)

    # Check for path traversal
    parts = Path(normalized).parts
    for part in parts:
        if part == "..":
            raise ValidationError("Path traversal not allowed in output path")

    # Ensure parent directory exists or can be created
    parent = os.path.dirname(normalized)
    if parent and not os.path.exists(parent):
        try:
            os.makedirs(parent, exist_ok=True)
        except OSError as e:
            raise ValidationError(f"Cannot create output directory: {e}")

    return normalized

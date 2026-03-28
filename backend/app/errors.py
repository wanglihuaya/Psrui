"""
Custom error classes for the PSRCHIVE Viewer backend.

Provides a hierarchy of application-specific errors that map to HTTP status codes.
"""

from typing import Optional


class AppError(Exception):
    """
    Base application error that maps to an HTTP status code.

    All custom exceptions should inherit from this class.
    """

    def __init__(self, message: str, status_code: int = 500, details: Optional[dict] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)

    def __str__(self) -> str:
        return self.message


class ValidationError(AppError):
    """
    Validation error (HTTP 400).

    Raised when input validation fails, such as invalid parameters or malformed requests.
    """

    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(message, status_code=400, details=details)


class NotFoundError(AppError):
    """
    Resource not found error (HTTP 404).

    Raised when a requested resource (file, session, pulsar, etc.) doesn't exist.
    """

    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(message, status_code=404, details=details)


class ProcessingError(AppError):
    """
    Processing error (HTTP 500).

    Raised when an internal processing operation fails, such as PSRCHIVE tool errors.
    """

    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(message, status_code=500, details=details)


class CapabilityError(AppError):
    """
    Capability not available error (HTTP 501).

    Raised when a requested feature is not available in the current environment.
    """

    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(message, status_code=501, details=details)

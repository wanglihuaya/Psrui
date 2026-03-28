/**
 * Shared constants for the application
 */

/** Maximum number of processing history entries to keep for undo */
export const MAX_PROCESSING_HISTORY = 50

/** Debounce delay in milliseconds for PAM parameter updates */
export const PAM_UPDATE_DEBOUNCE_MS = 220

/** Maximum allowed scrunch factor to prevent DoS */
export const MAX_SCRUNCH_FACTOR = 1000

/** Allowed archive file extensions */
export const ARCHIVE_EXTENSIONS = ['.ar', '.fits', '.fit', '.sf', '.rf', '.cf', '.pfd'] as const

/** Default backend port */
export const DEFAULT_BACKEND_PORT = 8787

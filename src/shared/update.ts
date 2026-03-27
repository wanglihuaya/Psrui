export type UpdateChannel = 'stable' | 'nightly'

export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'unsupported'

export interface UpdateState {
  channel: UpdateChannel
  currentVersion: string
  phase: UpdatePhase
  availableVersion: string | null
  releaseName: string | null
  releaseNotes: string | null
  progress: number | null
  error: string | null
  lastCheckedAt: string | null
  canCheck: boolean
  canDownload: boolean
  canInstall: boolean
}

export function detectUpdateChannel(version: string): UpdateChannel {
  return /-nightly(?:\.|$)/.test(version) ? 'nightly' : 'stable'
}

export function createInitialUpdateState(
  version: string,
  packaged: boolean
): UpdateState {
  return {
    channel: detectUpdateChannel(version),
    currentVersion: version,
    phase: packaged ? 'idle' : 'unsupported',
    availableVersion: null,
    releaseName: null,
    releaseNotes: null,
    progress: null,
    error: packaged ? null : 'Auto-updates are only available in packaged builds.',
    lastCheckedAt: null,
    canCheck: packaged,
    canDownload: false,
    canInstall: false
  }
}

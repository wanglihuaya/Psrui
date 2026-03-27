import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { ProgressInfo, UpdateDownloadedEvent, UpdateInfo } from 'electron-updater'
import { createInitialUpdateState, detectUpdateChannel, type UpdateState } from '../shared/update'

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function normalizeReleaseNotes(info: UpdateInfo): string | null {
  const value = info.releaseNotes
  if (typeof value === 'string') {
    return value.trim() || null
  }

  if (Array.isArray(value)) {
    const text = value
      .map((entry) => {
        const note = toRecord(entry)
        const version = typeof note.version === 'string' ? note.version : null
        const noteText = typeof note.note === 'string' ? note.note.trim() : ''
        if (!noteText) return null
        return version ? `${version}\n${noteText}` : noteText
      })
      .filter((entry): entry is string => Boolean(entry))
      .join('\n\n')

    return text || null
  }

  return null
}

function releaseNameFromInfo(info: UpdateInfo): string | null {
  const record = toRecord(info)
  return typeof record.releaseName === 'string' ? record.releaseName : null
}

export class UpdateManager {
  private state: UpdateState = createInitialUpdateState(app.getVersion(), app.isPackaged)
  private configured = false
  private startupCheckStarted = false

  constructor(private readonly publishState: (state: UpdateState) => void) {}

  getState(): UpdateState {
    return { ...this.state }
  }

  initialize(): void {
    this.emitState()

    if (!app.isPackaged || this.configured) {
      return
    }

    this.configured = true

    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = false
    autoUpdater.autoRunAppAfterInstall = true
    autoUpdater.allowPrerelease = detectUpdateChannel(this.state.currentVersion) === 'nightly'
    autoUpdater.allowDowngrade = false
    autoUpdater.fullChangelog = true
    autoUpdater.logger = console

    autoUpdater.on('checking-for-update', () => {
      this.updateState({
        phase: 'checking',
        error: null,
        progress: null,
        canCheck: false,
        canDownload: false,
        canInstall: false
      })
    })

    autoUpdater.on('update-available', (info) => {
      this.applyUpdateInfo(info, 'available')
    })

    autoUpdater.on('update-not-available', () => {
      this.updateState({
        phase: 'not-available',
        availableVersion: null,
        releaseName: null,
        releaseNotes: null,
        progress: null,
        error: null,
        lastCheckedAt: new Date().toISOString(),
        canCheck: true,
        canDownload: false,
        canInstall: false
      })
    })

    autoUpdater.on('download-progress', (progress) => {
      this.onDownloadProgress(progress)
    })

    autoUpdater.on('update-downloaded', (event) => {
      this.onUpdateDownloaded(event)
    })

    autoUpdater.on('error', (error) => {
      this.updateState({
        phase: 'error',
        error: error.message,
        progress: null,
        lastCheckedAt: new Date().toISOString(),
        canCheck: true,
        canDownload: false,
        canInstall: false
      })
    })
  }

  scheduleStartupCheck(): void {
    if (!app.isPackaged || this.startupCheckStarted) {
      return
    }

    this.startupCheckStarted = true
    void this.checkForUpdates()
  }

  async checkForUpdates(): Promise<UpdateState> {
    if (!app.isPackaged) {
      this.updateState({
        phase: 'unsupported',
        error: 'Auto-updates are only available in packaged builds.',
        canCheck: false,
        canDownload: false,
        canInstall: false
      })
      return this.getState()
    }

    this.initialize()
    try {
      await autoUpdater.checkForUpdates()
    } catch (error) {
      this.updateState({
        phase: 'error',
        error: error instanceof Error ? error.message : 'Failed to check for updates.',
        lastCheckedAt: new Date().toISOString(),
        canCheck: true,
        canDownload: false,
        canInstall: false
      })
    }
    return this.getState()
  }

  async downloadUpdate(): Promise<UpdateState> {
    if (!app.isPackaged) {
      return this.getState()
    }

    if (this.state.phase === 'downloaded') {
      return this.getState()
    }

    if (this.state.phase !== 'available' && this.state.phase !== 'error') {
      return this.getState()
    }

    this.updateState({
      phase: 'downloading',
      error: null,
      progress: 0,
      canCheck: false,
      canDownload: false,
      canInstall: false
    })

    try {
      await autoUpdater.downloadUpdate()
    } catch (error) {
      this.updateState({
        phase: 'error',
        error: error instanceof Error ? error.message : 'Failed to download update.',
        progress: null,
        canCheck: true,
        canDownload: this.state.availableVersion !== null,
        canInstall: false
      })
    }
    return this.getState()
  }

  installUpdate(): UpdateState {
    if (this.state.phase !== 'downloaded') {
      return this.getState()
    }

    autoUpdater.quitAndInstall()
    return this.getState()
  }

  private applyUpdateInfo(info: UpdateInfo, phase: 'available' | 'downloaded'): void {
    this.updateState({
      phase,
      availableVersion: info.version,
      releaseName: releaseNameFromInfo(info),
      releaseNotes: normalizeReleaseNotes(info),
      progress: phase === 'downloaded' ? 100 : null,
      error: null,
      lastCheckedAt: new Date().toISOString(),
      canCheck: true,
      canDownload: phase === 'available',
      canInstall: phase === 'downloaded'
    })
  }

  private onDownloadProgress(progress: ProgressInfo): void {
    this.updateState({
      phase: 'downloading',
      progress: progress.percent,
      error: null,
      canCheck: false,
      canDownload: false,
      canInstall: false
    })
  }

  private onUpdateDownloaded(event: UpdateDownloadedEvent): void {
    this.applyUpdateInfo(event, 'downloaded')
  }

  private updateState(patch: Partial<UpdateState>): void {
    this.state = { ...this.state, ...patch }
    this.emitState()
  }

  private emitState(): void {
    this.publishState(this.getState())
  }
}

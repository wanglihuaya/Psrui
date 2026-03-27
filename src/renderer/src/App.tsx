import { useEffect, useEffectEvent, useState } from 'react'
import { useAtom, useSetAtom, useAtomValue } from 'jotai'
import { api } from '@/lib/api'
import {
  backendReadyAtom,
  currentFileAtom,
  metadataAtom,
  profileDataAtom,
  waterfallDataAtom,
  timePhaseDataAtom,
  bandpassDataAtom,
  loadingAtom,
  errorAtom,
  openFilesAtom,
  activeTabAtom,
  helpOpenAtom,
  helpSectionAtom,
  psrcatOpenAtom,
  type HelpSection
} from '@/lib/store'
import { TitleBar } from '@/components/TitleBar'
import { Sidebar } from '@/components/Sidebar'
import { MainPanel } from '@/components/MainPanel'
import { StatusBar } from '@/components/StatusBar'
import { SettingsPanel, applyTheme } from '@/components/SettingsPanel'
import { HelpPanel } from '@/components/HelpPanel'
import { PsrcatPanel } from '@/components/PsrcatPanel'
import {
  settingsAtom,
  settingsOpenAtom,
  settingsSectionAtom,
  sidebarCollapsedAtom,
  workspacePathAtom,
  type SettingsSection
} from '@/lib/settings'
import { useShortcuts, type ShortcutCommandId } from '@/lib/shortcuts'
import type { BackendRuntime } from '../../shared/backend'
import type { AppCommandId } from '../../shared/commands'
import type { UpdateState } from '../../shared/update'

export default function App() {
  const [backendReady, setBackendReady] = useAtom(backendReadyAtom)
  const [currentFile, setCurrentFile] = useAtom(currentFileAtom)
  const settings = useAtomValue(settingsAtom)
  const setMetadata = useSetAtom(metadataAtom)
  const setProfile = useSetAtom(profileDataAtom)
  const setWaterfall = useSetAtom(waterfallDataAtom)
  const setTimePhase = useSetAtom(timePhaseDataAtom)
  const setBandpass = useSetAtom(bandpassDataAtom)
  const setLoading = useSetAtom(loadingAtom)
  const setError = useSetAtom(errorAtom)
  const setOpenFiles = useSetAtom(openFilesAtom)
  const setActiveTab = useSetAtom(activeTabAtom)
  const setHelpOpen = useSetAtom(helpOpenAtom)
  const setHelpSection = useSetAtom(helpSectionAtom)
  const setSettingsOpen = useSetAtom(settingsOpenAtom)
  const setSettingsSection = useSetAtom(settingsSectionAtom)
  const setSidebarCollapsed = useSetAtom(sidebarCollapsedAtom)
  const setWorkspacePath = useSetAtom(workspacePathAtom)
  const setPsrcatOpen = useSetAtom(psrcatOpenAtom)
  const [updateState, setUpdateState] = useState<UpdateState | null>(null)
  const [backendRuntime, setBackendRuntime] = useState<BackendRuntime>('local')

  const openSettingsSection = (section: SettingsSection = 'app') => {
    setSettingsSection(section)
    setSettingsOpen(true)
  }

  const openHelpSection = (section: HelpSection = 'views') => {
    setHelpSection(section)
    setHelpOpen(true)
  }

  const clearCurrentFile = () => {
    setCurrentFile(null)
    setMetadata(null)
    setProfile(null)
    setWaterfall(null)
    setTimePhase(null)
    setBandpass(null)
    setError(null)
  }

  const setView = (view: 'profile' | 'waterfall' | 'time-phase' | 'bandpass') => {
    setPsrcatOpen(false)
    setActiveTab(view)
  }

  // apply theme
  useEffect(() => {
    applyTheme(settings.appTheme)
  }, [settings.appTheme])

  // poll backend health
  useEffect(() => {
    let mounted = true
    const check = async () => {
      try {
        await api.health()
        if (mounted) setBackendReady(true)
      } catch {
        if (mounted) {
          setBackendReady(false)
          setTimeout(check, 1000)
        }
      }
    }
    check()
    return () => { mounted = false }
  }, [setBackendReady])

  // handle multi-window file opening from main process
  useEffect(() => {
    if (window.electron?.onFileOpen) {
      window.electron.onFileOpen((path: string) => {
        setOpenFiles((prev) => Array.from(new Set([...prev, path])))
        setCurrentFile(path)
      })
    }
  }, [setCurrentFile, setOpenFiles])

  useEffect(() => {
    let mounted = true

    const loadBackendRuntime = async () => {
      const nextRuntime = await window.electron.getBackendRuntime()
      if (mounted) {
        setBackendRuntime(nextRuntime)
      }
    }

    void loadBackendRuntime()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    let cleanup = () => {}

    const loadUpdateState = async () => {
      const initialState = await window.electron.getUpdateState()
      if (mounted) {
        setUpdateState(initialState)
      }
      cleanup = window.electron.onUpdateState((nextState: UpdateState) => {
        if (mounted) {
          setUpdateState(nextState)
        }
      })
    }

    void loadUpdateState()

    return () => {
      mounted = false
      cleanup()
    }
  }, [])

  // load archive data when current file changes
  useEffect(() => {
    if (!currentFile || !backendReady) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const results = await Promise.allSettled([
          api.loadArchive(currentFile),
          api.getProfile(currentFile),
          api.getWaterfall(currentFile),
          api.getTimePhase(currentFile),
          api.getBandpass(currentFile)
        ])
        if (cancelled) return

        const [meta, profile, waterfall, timePhase, bandpass] = results
        if (meta.status === 'fulfilled') setMetadata(meta.value)
        if (profile.status === 'fulfilled') setProfile(profile.value)
        if (waterfall.status === 'fulfilled') setWaterfall(waterfall.value)
        if (timePhase.status === 'fulfilled') setTimePhase(timePhase.value)
        if (bandpass.status === 'fulfilled') setBandpass(bandpass.value)
        if (meta.status === 'rejected') throw meta.reason
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load archive')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [currentFile, backendReady, setMetadata, setProfile, setWaterfall, setTimePhase, setBandpass, setLoading, setError])

  const handleOpenFile = async () => {
    try {
      const files = await window.electron.openFile()
      if (files.length > 0) {
        setOpenFiles(prev => Array.from(new Set([...prev, ...files])))
        setCurrentFile(files[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open file')
    }
  }

  const handleOpenFolder = async () => {
    try {
      const folder = await window.electron.openDirectory()
      if (folder) {
        setWorkspacePath(folder)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open workspace')
    }
  }

  const handleSaveImage = () => {
    setError('Save Image is not implemented yet.')
  }

  const handleSaveArchive = () => {
    setError('Save Archive is not implemented yet.')
  }

  const handleCheckForUpdates = async () => {
    const nextState = await window.electron.checkForUpdates()
    if (nextState) {
      setUpdateState(nextState)
    }
  }

  const handleUpdateAction = async () => {
    if (!updateState) return

    if (updateState.phase === 'downloaded') {
      await window.electron.installUpdate()
      return
    }

    if (updateState.phase === 'available') {
      const nextState = await window.electron.downloadUpdate()
      if (nextState) {
        setUpdateState(nextState)
      }
    }
  }

  const handleRestartBackend = async () => {
    try {
      setBackendReady(false)
      await window.electron.restartBackend()
      const nextRuntime = await window.electron.getBackendRuntime()
      setBackendRuntime(nextRuntime)
      await api.health()
      setBackendReady(true)
      setError(null)
    } catch (err) {
      setBackendReady(false)
      setError(err instanceof Error ? err.message : 'Failed to restart backend')
    }
  }

  const commandHandlers: Partial<Record<ShortcutCommandId, () => void | Promise<void>>> = {
    'new-window': () => window.electron.newWindow(),
    'open-file': handleOpenFile,
    'open-workspace': handleOpenFolder,
    'close-file': clearCurrentFile,
    'save-image': handleSaveImage,
    'save-archive': handleSaveArchive,
    'view-profile': () => setView('profile'),
    'view-waterfall': () => setView('waterfall'),
    'view-time-phase': () => setView('time-phase'),
    'view-bandpass': () => setView('bandpass'),
    'view-psrcat': () => setPsrcatOpen(true),
    'toggle-sidebar': () => setSidebarCollapsed((prev) => !prev),
    'open-settings': () => openSettingsSection('app'),
    'open-help': () => openHelpSection('shortcuts'),
    'check-for-updates': handleCheckForUpdates,
    'update-action': handleUpdateAction,
    'window-minimize': () => window.electron.minimizeWindow(),
    'window-toggle-full-screen': () => window.electron.toggleFullScreen(),
    'app-quit': () => window.electron.quitApp(),
    'debug-reload': () => window.location.reload(),
    'debug-force-reload': () => window.location.reload(),
    'debug-toggle-devtools': () => undefined,
    undo: () => console.log('Undo...'),
    redo: () => console.log('Redo...')
  }

  const runCommand = useEffectEvent(async (commandId: AppCommandId) => {
    const handler = commandHandlers[commandId]
    if (!handler) {
      return
    }

    try {
      await handler()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Command failed: ${commandId}`)
    }
  })

  useShortcuts(commandHandlers)

  useEffect(() => {
    return window.electron.onAppCommand((commandId: AppCommandId) => {
      void runCommand(commandId)
    })
  }, [])

  return (
    <div className="flex flex-col h-screen w-screen transition-colors duration-300 bg-surface-0">
      <TitleBar
        onRunCommand={(commandId: AppCommandId) => {
          void runCommand(commandId)
        }}
        onOpenSettingsSection={openSettingsSection}
        updateState={updateState}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar onOpenFile={handleOpenFile} onOpenFolder={handleOpenFolder} />
        <div className="relative flex-1 overflow-hidden flex flex-col">
          <MainPanel />
          <PsrcatPanel />
        </div>
      </div>
      <StatusBar />
      <SettingsPanel
        backendRuntime={backendRuntime}
        updateState={updateState}
        onRunCommand={(commandId: AppCommandId) => {
          void runCommand(commandId)
        }}
        onRestartBackend={handleRestartBackend}
      />
      <HelpPanel />
    </div>
  )
}

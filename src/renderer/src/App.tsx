import { useEffect, useEffectEvent, useState, useRef } from 'react'
import { useAtom, useSetAtom, useAtomValue } from 'jotai'
import { api } from '@/lib/api'
import {
  backendReadyAtom,
  currentSessionIdAtom,
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
  processingCapabilitiesAtom,
  processingHistoryAtom,
  processingRecipeAtom,
  processingRedoHistoryAtom,
  psrcatOpenAtom,
  toaResultAtom,
  type HelpSection
} from '@/lib/store'
import { TitleBar } from '@/components/TitleBar'
import { Sidebar } from '@/components/Sidebar'
import { MainPanel } from '@/components/MainPanel'
import { StatusBar } from '@/components/StatusBar'
import { SettingsPanel, applyTheme } from '@/components/SettingsPanel'
import { HelpPanel } from '@/components/HelpPanel'
import { PsrcatPanel } from '@/components/PsrcatPanel'
import { ProcessingInspector } from '@/components/ProcessingInspector'
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
import { cloneProcessingRecipe, DEFAULT_PROCESSING_RECIPE, type ProcessingRecipe, type ToaRequest, type RecipeUpdate } from '../../shared/processing'
import type { UpdateState } from '../../shared/update'

function buildProcessedArchiveName(filepath: string, extension: string): string {
  const filename = filepath.split(/[/\\]/).pop() ?? 'archive.ar'
  const dotIndex = filename.lastIndexOf('.')
  const stem = dotIndex > 0 ? filename.slice(0, dotIndex) : filename
  const suffix = dotIndex > 0 ? filename.slice(dotIndex) : '.ar'
  const safeExtension = extension.trim().replace(/^\.+/, '') || 'processed'
  return `${stem}.${safeExtension}${suffix}`
}

export default function App() {
  const [backendReady, setBackendReady] = useAtom(backendReadyAtom)
  const [currentFile, setCurrentFile] = useAtom(currentFileAtom)
  const [currentSessionId, setCurrentSessionId] = useAtom(currentSessionIdAtom)
  const setProcessingCapabilities = useSetAtom(processingCapabilitiesAtom)
  const [processingRecipe, setProcessingRecipe] = useAtom(processingRecipeAtom)
  const [processingHistory, setProcessingHistory] = useAtom(processingHistoryAtom)
  const [processingRedoHistory, setProcessingRedoHistory] = useAtom(processingRedoHistoryAtom)
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
  const activeTab = useAtomValue(activeTabAtom)
  const setHelpOpen = useSetAtom(helpOpenAtom)
  const setHelpSection = useSetAtom(helpSectionAtom)
  const setSettingsOpen = useSetAtom(settingsOpenAtom)
  const setSettingsSection = useSetAtom(settingsSectionAtom)
  const setSidebarCollapsed = useSetAtom(sidebarCollapsedAtom)
  const setWorkspacePath = useSetAtom(workspacePathAtom)
  const setPsrcatOpen = useSetAtom(psrcatOpenAtom)
  const setToaResult = useSetAtom(toaResultAtom)
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
    setCurrentSessionId(null)
    setMetadata(null)
    setProfile(null)
    setWaterfall(null)
    setTimePhase(null)
    setBandpass(null)
    setProcessingRecipe(cloneProcessingRecipe(DEFAULT_PROCESSING_RECIPE))
    setProcessingHistory([])
    setProcessingRedoHistory([])
    setToaResult(null)
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
    if (!backendReady) {
      setProcessingCapabilities(null)
      return
    }

    let cancelled = false

    const loadCapabilities = async () => {
      try {
        const capabilities = await api.getCapabilities()
        if (!cancelled) {
          setProcessingCapabilities(capabilities)
        }
      } catch (error) {
        if (!cancelled) {
          setProcessingCapabilities(null)
          setError(error instanceof Error ? error.message : 'Failed to load processing capabilities')
        }
      }
    }

    void loadCapabilities()

    return () => {
      cancelled = true
    }
  }, [backendReady, setProcessingCapabilities, setError])

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

  const loadSessionPreview = async (sessionId: string) => {
    setLoading(true)
    setError(null)

    try {
      const results = await Promise.allSettled([
        api.getSessionMetadata(sessionId),
        api.getSessionProfile(sessionId),
        api.getSessionWaterfall(sessionId),
        api.getSessionTimePhase(sessionId),
        api.getSessionBandpass(sessionId)
      ])

      const [meta, profile, waterfall, timePhase, bandpass] = results
      if (meta.status === 'fulfilled') setMetadata(meta.value)
      if (profile.status === 'fulfilled') setProfile(profile.value)
      if (waterfall.status === 'fulfilled') setWaterfall(waterfall.value)
      if (timePhase.status === 'fulfilled') setTimePhase(timePhase.value)
      if (bandpass.status === 'fulfilled') setBandpass(bandpass.value)

      if (meta.status === 'rejected') {
        throw meta.reason
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load processing preview')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!currentFile || !backendReady) {
      if (!currentFile) {
        setCurrentSessionId(null)
      }
      return
    }

    let cancelled = false
    let createdSessionId: string | null = null

    const initializeSession = async () => {
      setLoading(true)
      setError(null)
      setToaResult(null)
      setProcessingRecipe(cloneProcessingRecipe(DEFAULT_PROCESSING_RECIPE))
      setProcessingHistory([])
      setProcessingRedoHistory([])

      try {
        const session = await api.createSession(currentFile)
        createdSessionId = session.id

        if (cancelled) {
          await api.deleteSession(session.id)
          return
        }

        setCurrentSessionId(session.id)
        setProcessingRecipe(cloneProcessingRecipe(session.recipe))
        await loadSessionPreview(session.id)
      } catch (error) {
        if (!cancelled) {
          setError(error instanceof Error ? error.message : 'Failed to create processing session')
          setLoading(false)
        }
      }
    }

    void initializeSession()

    return () => {
      cancelled = true
      if (createdSessionId) {
        void api.deleteSession(createdSessionId)
      }
      setCurrentSessionId(null)
      setToaResult(null)
      setProcessingRecipe(cloneProcessingRecipe(DEFAULT_PROCESSING_RECIPE))
      setProcessingHistory([])
      setProcessingRedoHistory([])
    }
  }, [
    currentFile,
    backendReady,
    setCurrentSessionId,
    setError,
    setLoading,
    setProcessingHistory,
    setProcessingRecipe,
    setProcessingRedoHistory,
    setToaResult
  ])

  const handleOpenFile = async () => {
    try {
      const files = await window.electron.openFile('archive')
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

  const handleSaveImage = async () => {
    if (!currentSessionId) {
      setError('Open an archive first before exporting an image.')
      return
    }

    // Get the current file name for default export name
    const defaultName = currentFile
      ? `${currentFile.split(/[/\\]/).pop()?.split('.')[0] ?? 'chart'}-${activeTab}.png`
      : 'chart.png'

    const outputPath = await window.electron.saveFile(defaultName, 'image')
    if (!outputPath) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Find the Plotly chart element
      const chartElement = document.querySelector('.plotly-chart .js-plotly-plot')
      if (!chartElement) {
        throw new Error('No chart found to export. Make sure a chart is visible.')
      }

      // Use Plotly's downloadImage function
      const Plotly = await import('plotly.js-dist-min')
      await Plotly.downloadImage(chartElement as HTMLElement, {
        format: 'png',
        width: 1920,
        height: 1080,
        filename: outputPath.replace(/\.png$/i, ''),
        scale: 2
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save image')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveArchive = async () => {
    if (!currentFile || !currentSessionId) {
      setError('Open an archive first before exporting a processed copy.')
      return
    }

    const defaultName = buildProcessedArchiveName(currentFile, processingRecipe.output.archiveExtension)
    const outputPath = await window.electron.saveFile(defaultName, 'archive')

    if (!outputPath) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      await api.exportSessionArchive(currentSessionId, outputPath)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to export processed archive')
    } finally {
      setLoading(false)
    }
  }

  const commitProcessingRecipe = async (
    update: RecipeUpdate,
    options: {
      pushHistory?: boolean
      resetToa?: boolean
      preserveRedo?: boolean
    } = {}
  ) => {
    if (!currentSessionId) {
      return
    }

    const nextRecipe = cloneProcessingRecipe(
      typeof update === 'function' ? update(processingRecipe) : update
    )
    const shouldPushHistory = options.pushHistory ?? true
    const shouldResetToa = options.resetToa ?? true
    const shouldPreserveRedo = options.preserveRedo ?? false

    if (shouldPushHistory) {
      setProcessingHistory((prev) => [...prev.slice(-49), cloneProcessingRecipe(processingRecipe)])
    }

    if (!shouldPreserveRedo) {
      setProcessingRedoHistory([])
    }

    if (shouldResetToa) {
      setToaResult(null)
    }

    setError(null)

    try {
      const session = await api.updateSessionRecipe(currentSessionId, nextRecipe)
      setProcessingRecipe(cloneProcessingRecipe(session.recipe))
      await loadSessionPreview(currentSessionId)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update processing recipe')
    }
  }

  const handleRunToa = async (request: ToaRequest) => {
    if (!currentSessionId) {
      setError('Open an archive first before running TOA extraction.')
      return
    }

    setLoading(true)
    setError(null)
    setProcessingRecipe((prev) => ({
      ...cloneProcessingRecipe(prev),
      toa: { ...request },
      output: { ...prev.output, toaFormat: request.format }
    }))

    try {
      const result = await api.runSessionToa(currentSessionId, request)
      setToaResult(result)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to run TOA extraction')
    } finally {
      setLoading(false)
    }
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

  const handleUndo = async () => {
    if (!currentSessionId || processingHistory.length === 0) {
      return
    }

    const previousRecipe = cloneProcessingRecipe(processingHistory[processingHistory.length - 1])
    setProcessingHistory((prev) => prev.slice(0, -1))
    setProcessingRedoHistory((prev) => [...prev, cloneProcessingRecipe(processingRecipe)])
    await commitProcessingRecipe(previousRecipe, {
      pushHistory: false,
      preserveRedo: true,
      resetToa: true
    })
  }

  const handleRedo = async () => {
    if (!currentSessionId || processingRedoHistory.length === 0) {
      return
    }

    const nextRecipe = cloneProcessingRecipe(processingRedoHistory[processingRedoHistory.length - 1])
    setProcessingRedoHistory((prev) => prev.slice(0, -1))
    setProcessingHistory((prev) => [...prev.slice(-49), cloneProcessingRecipe(processingRecipe)])
    await commitProcessingRecipe(nextRecipe, {
      pushHistory: false,
      preserveRedo: true,
      resetToa: true
    })
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
    undo: handleUndo,
    redo: handleRedo
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
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <MainPanel onApplyProcessingRecipe={commitProcessingRecipe} />
            <ProcessingInspector
              currentFile={currentFile}
              backendReady={backendReady}
              onApplyProcessingRecipe={commitProcessingRecipe}
              onRunToa={handleRunToa}
              onSaveArchive={handleSaveArchive}
            />
          </div>
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

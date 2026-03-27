import { useEffect, useState } from 'react'
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
  helpOpenAtom
} from '@/lib/store'
import { TitleBar } from '@/components/TitleBar'
import { Sidebar } from '@/components/Sidebar'
import { MainPanel } from '@/components/MainPanel'
import { StatusBar } from '@/components/StatusBar'
import { SettingsPanel, applyTheme } from '@/components/SettingsPanel'
import { HelpPanel } from '@/components/HelpPanel'
import { PsrcatPanel } from '@/components/PsrcatPanel'
import { settingsAtom, settingsOpenAtom, sidebarCollapsedAtom, workspacePathAtom } from '@/lib/settings'
import { psrcatOpenAtom } from '@/lib/store'
import { useShortcuts } from '@/lib/shortcuts'
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
  const setSettingsOpen = useSetAtom(settingsOpenAtom)
  const [sidebarCollapsed, setSidebarCollapsed] = useAtom(sidebarCollapsedAtom)
  const setWorkspacePath = useSetAtom(workspacePathAtom)
  const setPsrcatOpen = useSetAtom(psrcatOpenAtom)
  const [updateState, setUpdateState] = useState<UpdateState | null>(null)

  // apply theme
  useEffect(() => {
    applyTheme(settings.appTheme)
  }, [settings.appTheme])

  // keyboard shortcuts
  useShortcuts({
    'Open File': () => handleOpenFile(),
    'Open Workspace': () => handleOpenFolder(),
    'Toggle Sidebar': () => setSidebarCollapsed(prev => !prev),
    'Close File': () => setCurrentFile(null),
    'Save Image': () => console.log('Save image...'),
    'Save Archive': () => console.log('Save archive...'),
    'New Window': () => window.electron?.newWindow?.(),
    'Profile View': () => setActiveTab('profile'),
    'Freq × Phase': () => setActiveTab('waterfall'),
    'Time × Phase': () => setActiveTab('time-phase'),
    'Bandpass': () => setActiveTab('bandpass'),
    'PSRCAT': () => setPsrcatOpen(true),
    'Undo': () => console.log('Undo...'),
    'Redo': () => console.log('Redo...'),
    'Settings': () => setSettingsOpen(true),
    'Help': () => setHelpOpen(true),
  })

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
      if (folder) setWorkspacePath(folder)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open workspace')
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

  return (
    <div className="flex flex-col h-screen w-screen transition-colors duration-300 bg-surface-0">
      <TitleBar
        onOpenFile={handleOpenFile}
        onOpenFolder={handleOpenFolder}
        onCheckForUpdates={handleCheckForUpdates}
        updateState={updateState}
        onUpdate={handleUpdateAction}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar onOpenFile={handleOpenFile} onOpenFolder={handleOpenFolder} />
        <div className="relative flex-1 overflow-hidden flex flex-col">
          <MainPanel />
          <PsrcatPanel />
        </div>
      </div>
      <StatusBar />
      <SettingsPanel />
      <HelpPanel />
    </div>
  )
}

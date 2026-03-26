import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export type Language = 'en' | 'zh'
export type AppTheme = 'dark' | 'midnight' | 'nord' | 'light'
export type ChartColorscale = 'blues' | 'viridis' | 'plasma' | 'inferno' | 'magma'

export interface AppSettings {
  language: Language
  appTheme: AppTheme
  chartColorscale: ChartColorscale
  defaultView: 'profile' | 'waterfall' | 'time-phase' | 'bandpass'
  recentFilesLimit: number
  backendPort: number
  pythonPath: string
  showWelcome: boolean
}

const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  appTheme: 'dark',
  chartColorscale: 'blues',
  defaultView: 'profile',
  recentFilesLimit: 20,
  backendPort: 8787,
  pythonPath: 'python3',
  showWelcome: true,
}

export const settingsAtom = atomWithStorage<AppSettings>('psrchive-settings', DEFAULT_SETTINGS)
export const recentFilesAtom = atomWithStorage<string[]>('psrchive-recent-files', [])
export const settingsOpenAtom = atom(false)

// draft settings atom for the settings panel — only committed on save
export const draftSettingsAtom = atom<AppSettings | null>(null)

// workspace (folder) path
export const workspacePathAtom = atomWithStorage<string | null>('psrchive-workspace', null)

// sidebar state
export type SidebarSection = 'files' | 'psrcat' | 'settings'
export const activeSidebarSectionAtom = atom<SidebarSection>('files')
export const sidebarCollapsedAtom = atomWithStorage<boolean>('psrchive-sidebar-collapsed', false)

// labels for file tagging
export interface FileLabel {
  id: string
  name: string
  color: string
}
export const labelsAtom = atomWithStorage<FileLabel[]>('psrchive-labels', [
  { id: 'observed', name: 'Observed', color: '#5b8def' },
  { id: 'calibrated', name: 'Calibrated', color: '#5bef8f' },
  { id: 'rfi-cleaned', name: 'RFI Cleaned', color: '#efcf5b' },
  { id: 'template', name: 'Template', color: '#ef5b5b' },
  { id: 'processed', name: 'Processed', color: '#5bcfef' },
])
export const fileLabelMapAtom = atomWithStorage<Record<string, string[]>>('psrchive-file-labels', {})

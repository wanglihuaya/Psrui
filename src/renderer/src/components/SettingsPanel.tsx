import { useEffect, type ComponentType, type ReactNode } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import {
  AppWindow,
  CheckCircle2,
  CircleAlert,
  CircleHelp,
  Cpu,
  ExternalLink,
  FolderOpen,
  Keyboard,
  Monitor,
  Palette,
  X
} from 'lucide-react'
import * as Separator from '@radix-ui/react-separator'
import {
  draftSettingsAtom,
  settingsAtom,
  settingsOpenAtom,
  settingsSectionAtom,
  workspacePathAtom
} from '@/lib/settings'
import type {
  AppSettings,
  AppTheme,
  ChartColorscale,
  Language,
  SettingsSection
} from '@/lib/settings'
import { useT } from '@/lib/i18n'
import { clsx } from 'clsx'
import { backendReadyAtom } from '@/lib/store'
import { SHORTCUTS } from '@/lib/shortcuts'
import type { BackendRuntime } from '../../../shared/backend'
import type { AppCommandId } from '../../../shared/commands'
import type { UpdateState } from '../../../shared/update'

/**
 * Applies the theme class to the document root
 */
export function applyTheme(theme: AppTheme) {
  const html = document.documentElement
  html.classList.remove('theme-dark', 'theme-midnight', 'theme-nord', 'theme-light')
  html.classList.add(`theme-${theme}`)
}

interface SettingsPanelProps {
  backendRuntime: BackendRuntime
  updateState: UpdateState | null
  onRunCommand: (commandId: AppCommandId) => void
  onRestartBackend: () => void | Promise<void>
}

interface SettingsCategory {
  id: SettingsSection
  label: string
  description: string
  icon: ComponentType<{ className?: string }>
}

interface SettingsCardProps {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}

const THEMES: { id: AppTheme; label: string; color: string }[] = [
  { id: 'dark', label: 'Dark', color: '#0a0e17' },
  { id: 'light', label: 'Light', color: '#f8f9fb' },
  { id: 'midnight', label: 'Midnight', color: '#020617' },
  { id: 'nord', label: 'Nord', color: '#2e3440' }
]

const COLORSCALES: { id: ChartColorscale; label: string; gradient: string }[] = [
  { id: 'blues', label: 'Blues', gradient: 'bg-linear-to-r from-blue-900 via-blue-500 to-blue-200' },
  { id: 'viridis', label: 'Viridis', gradient: 'bg-linear-to-r from-[#440154] via-[#21918c] to-[#fde725]' },
  { id: 'plasma', label: 'Plasma', gradient: 'bg-linear-to-r from-[#0d0887] via-[#9c179e] to-[#f0f921]' },
  { id: 'inferno', label: 'Inferno', gradient: 'bg-linear-to-r from-[#000004] via-[#bb3754] to-[#fcffa4]' },
  { id: 'magma', label: 'Magma', gradient: 'bg-linear-to-r from-[#000004] via-[#b63679] to-[#fcfdbf]' }
]

function SettingsCard({ title, description, action, children }: SettingsCardProps) {
  return (
    <section className="rounded-2xl border border-border bg-surface-0/70">
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          {description ? <p className="text-xs leading-relaxed text-text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="space-y-3 px-5 py-4">{children}</div>
    </section>
  )
}

function FieldLabel({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium text-text-primary">{title}</div>
      {description ? <div className="text-xs leading-relaxed text-text-muted">{description}</div> : null}
    </div>
  )
}

function TogglePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-surface-1/60 px-4 py-3 opacity-70">
      <FieldLabel title={title} description={`${description} · Coming soon`} />
      <div className="flex h-6 w-11 items-center rounded-full bg-surface-3 px-1">
        <div className="h-4 w-4 rounded-full bg-text-primary/85" />
      </div>
    </div>
  )
}

function formatShortcutLabel(key: string): string {
  return key
    .split('')
    .map((segment) => segment.toUpperCase())
    .join('')
}

function getShortcutCombo(shortcut: (typeof SHORTCUTS)[number]): string {
  const parts: string[] = []

  if (shortcut.meta) {
    parts.push('⌘')
  }
  if (shortcut.shift) {
    parts.push('⇧')
  }
  if (shortcut.alt) {
    parts.push('⌥')
  }

  parts.push(formatShortcutLabel(shortcut.key))
  return parts.join('')
}

function getUpdatePhaseLabel(updateState: UpdateState | null): string {
  if (!updateState) {
    return 'Waiting for updater'
  }

  switch (updateState.phase) {
    case 'idle':
      return 'Ready'
    case 'checking':
      return 'Checking for updates'
    case 'available':
      return updateState.availableVersion ? `Update ${updateState.availableVersion} available` : 'Update available'
    case 'not-available':
      return 'Up to date'
    case 'downloading':
      return `Downloading ${Math.round(updateState.progress ?? 0)}%`
    case 'downloaded':
      return 'Ready to restart and install'
    case 'error':
      return updateState.error ?? 'Update failed'
    case 'unsupported':
      return 'Updates available in packaged builds only'
    default:
      return 'Ready'
  }
}

export function SettingsPanel({ backendRuntime, updateState, onRunCommand, onRestartBackend }: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useAtom(settingsOpenAtom)
  const [activeSection, setActiveSection] = useAtom(settingsSectionAtom)
  const [settings, setSettings] = useAtom(settingsAtom)
  const [draft, setDraft] = useAtom(draftSettingsAtom)
  const workspacePath = useAtomValue(workspacePathAtom)
  const backendReady = useAtomValue(backendReadyAtom)
  const t = useT()

  const categories: SettingsCategory[] = [
    { id: 'app', label: 'App', description: 'Notifications and updates', icon: AppWindow },
    { id: 'appearance', label: 'Appearance', description: 'Theme and chart palette', icon: Palette },
    { id: 'workspace', label: 'Workspace', description: 'Name, folder, default view', icon: FolderOpen },
    { id: 'backend', label: 'Backend', description: 'Service status and runtime', icon: Cpu },
    { id: 'shortcuts', label: 'Shortcuts', description: 'Keyboard shortcuts', icon: Keyboard },
    { id: 'about', label: 'About', description: 'Version, channel, docs', icon: CircleHelp }
  ]

  useEffect(() => {
    if (isOpen) {
      setDraft({ ...settings })
    } else {
      setDraft(null)
    }
  }, [isOpen, settings, setDraft])

  useEffect(() => {
    applyTheme(settings.appTheme)
  }, [settings.appTheme])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, setIsOpen])

  if (!isOpen || !draft) {
    return null
  }

  const updateDraft = (patch: Partial<AppSettings>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : null))
  }

  const handleSave = () => {
    setSettings(draft)
    applyTheme(draft.appTheme)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setIsOpen(false)
  }

  const groupedShortcuts = SHORTCUTS.reduce<Record<string, typeof SHORTCUTS>>((groups, shortcut) => {
    const category = shortcut.category
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(shortcut)
    return groups
  }, {})

  const renderSection = () => {
    switch (activeSection) {
      case 'app':
        return (
          <div className="space-y-4">
            <SettingsCard
              title="General"
              description="Core app defaults, language, and release channel behavior."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel title={t('settings.language')} description="Choose the app language for menus and panels." />
                  <div className="grid grid-cols-2 gap-2">
                    {(['en', 'zh'] as Language[]).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => updateDraft({ language: lang })}
                        className={clsx(
                          'rounded-xl border px-3 py-2 text-sm transition-colors',
                          draft.language === lang
                            ? 'border-accent bg-accent/12 text-accent'
                            : 'border-border bg-surface-1 text-text-secondary hover:border-border-hover hover:text-text-primary'
                        )}
                      >
                        {lang === 'en' ? 'English' : '简体中文'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <FieldLabel title={t('settings.showWelcome')} description="Keep the onboarding splash visible on fresh launches." />
                  <button
                    type="button"
                    onClick={() => updateDraft({ showWelcome: !draft.showWelcome })}
                    className={clsx(
                      'flex h-12 items-center justify-between rounded-2xl border px-4 transition-colors',
                      draft.showWelcome
                        ? 'border-accent bg-accent/12 text-accent'
                        : 'border-border bg-surface-1 text-text-secondary hover:border-border-hover'
                    )}
                  >
                    <span className="text-sm font-medium">{draft.showWelcome ? 'Enabled' : 'Disabled'}</span>
                    <div
                      className={clsx(
                        'flex h-6 w-11 items-center rounded-full px-1 transition-colors',
                        draft.showWelcome ? 'bg-accent' : 'bg-surface-3'
                      )}
                    >
                      <div
                        className={clsx(
                          'h-4 w-4 rounded-full bg-white transition-transform',
                          draft.showWelcome ? 'translate-x-5' : 'translate-x-0'
                        )}
                      />
                    </div>
                  </button>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Updates"
              description="Nightly builds track prereleases, while stable builds stay on stable GitHub Releases."
              action={
                <button
                  type="button"
                  onClick={() => onRunCommand('check-for-updates')}
                  className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:border-border-hover hover:bg-surface-3"
                >
                  Check for Updates
                </button>
              }
            >
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-surface-1/60 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Update status</div>
                  <div className="mt-2 text-sm font-semibold text-text-primary">{getUpdatePhaseLabel(updateState)}</div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-surface-1/60 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Current version</div>
                  <div className="mt-2 text-sm font-semibold text-text-primary">{updateState?.currentVersion ?? 'Unknown'}</div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-surface-1/60 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Update channel</div>
                  <div className="mt-2 text-sm font-semibold capitalize text-text-primary">{updateState?.channel ?? 'stable'}</div>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Reserved integrations"
              description="These controls mirror the future desktop app surface and stay disabled until the backend support exists."
            >
              <TogglePlaceholder title="Desktop notifications" description="Get notified when long-running analysis completes." />
              <TogglePlaceholder title="Keep screen awake" description="Prevent the display from sleeping during active observing sessions." />
              <TogglePlaceholder title="HTTP proxy" description="Route API and release traffic through a local or remote proxy." />
            </SettingsCard>
          </div>
        )

      case 'appearance':
        return (
          <div className="space-y-4">
            <SettingsCard
              title="Theme"
              description="Choose the overall shell atmosphere used by the title bar, sidebar, and charts."
            >
              <div className="grid gap-3 md:grid-cols-2">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => updateDraft({ appTheme: theme.id })}
                    className={clsx(
                      'group relative overflow-hidden rounded-2xl border p-4 text-left transition-all',
                      draft.appTheme === theme.id
                        ? 'border-accent bg-accent/10'
                        : 'border-border bg-surface-1 hover:border-border-hover'
                    )}
                  >
                    <div className="absolute inset-x-0 top-0 h-1" style={{ background: theme.color }} />
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-text-primary">{theme.label}</div>
                        <div className="mt-1 text-xs text-text-muted">Theme preset</div>
                      </div>
                      <div className="h-9 w-9 rounded-full border border-white/10" style={{ background: theme.color }} />
                    </div>
                  </button>
                ))}
              </div>
            </SettingsCard>

            <SettingsCard
              title="Chart Colorscale"
              description="Pick the default heatmap ramp used by waterfall and time-phase plots."
            >
              <div className="grid gap-3">
                {COLORSCALES.map((colorscale) => (
                  <button
                    key={colorscale.id}
                    type="button"
                    onClick={() => updateDraft({ chartColorscale: colorscale.id })}
                    className={clsx(
                      'flex items-center justify-between rounded-2xl border px-4 py-3 transition-colors',
                      draft.chartColorscale === colorscale.id
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border bg-surface-1 text-text-secondary hover:border-border-hover hover:text-text-primary'
                    )}
                  >
                    <span className="text-sm font-medium">{colorscale.label}</span>
                    <div className={clsx('h-2.5 w-36 rounded-full', colorscale.gradient)} />
                  </button>
                ))}
              </div>
            </SettingsCard>
          </div>
        )

      case 'workspace':
        return (
          <div className="space-y-4">
            <SettingsCard
              title="Workspace"
              description="Point the navigator at a folder and choose how new sessions open."
              action={
                <button
                  type="button"
                  onClick={() => onRunCommand('open-workspace')}
                  className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:border-border-hover hover:bg-surface-3"
                >
                  {workspacePath ? 'Change Workspace' : 'Open Workspace'}
                </button>
              }
            >
              <div className="rounded-2xl border border-border/70 bg-surface-1/60 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Current workspace path</div>
                <div className="mt-2 break-all text-sm text-text-primary">
                  {workspacePath ?? 'No workspace selected yet'}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel title={t('settings.defaultView')} description="The first chart tab to show when a file opens." />
                  <select
                    value={draft.defaultView}
                    onChange={(event) => updateDraft({ defaultView: event.target.value as AppSettings['defaultView'] })}
                    className="w-full rounded-xl border border-border bg-surface-1 px-3 py-2 text-sm text-text-primary outline-hidden transition-colors focus:border-accent"
                  >
                    <option value="profile">Profile</option>
                    <option value="waterfall">Freq × Phase</option>
                    <option value="time-phase">Time × Phase</option>
                    <option value="bandpass">Bandpass</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <FieldLabel title={t('settings.recentLimit')} description="How many recent files to remember in the explorer." />
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={draft.recentFilesLimit}
                    onChange={(event) => updateDraft({ recentFilesLimit: Number(event.target.value) || 1 })}
                    className="w-full rounded-xl border border-border bg-surface-1 px-3 py-2 text-sm text-text-primary outline-hidden transition-colors focus:border-accent"
                  />
                </div>
              </div>
            </SettingsCard>
          </div>
        )

      case 'backend':
        return (
          <div className="space-y-4">
            <SettingsCard
              title="Backend Runtime"
              description="Inspect the embedded FastAPI service and restart it without leaving the app."
              action={
                <button
                  type="button"
                  onClick={() => void onRestartBackend()}
                  className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:border-border-hover hover:bg-surface-3"
                >
                  Restart Backend
                </button>
              }
            >
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-surface-1/60 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Backend status</div>
                  <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-text-primary">
                    {backendReady ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <CircleAlert className="h-4 w-4 text-danger" />
                    )}
                    {backendReady ? 'Live' : 'Offline'}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-surface-1/60 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Python path</div>
                  <div className="mt-2 text-sm font-semibold text-text-primary">
                    {backendRuntime === 'docker' ? 'Managed inside Docker image' : draft.pythonPath}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-surface-1/60 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Runtime</div>
                  <div className="mt-2 text-sm font-semibold capitalize text-text-primary">{backendRuntime}</div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel title={t('settings.backendPort')} description="Port used by the embedded FastAPI service." />
                  <input
                    type="number"
                    min={1}
                    value={draft.backendPort}
                    onChange={(event) => updateDraft({ backendPort: Number(event.target.value) || 8787 })}
                    className="w-full rounded-xl border border-border bg-surface-1 px-3 py-2 text-sm text-text-primary outline-hidden transition-colors focus:border-accent"
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel title={t('settings.pythonPath')} description="Interpreter used when the backend process boots." />
                  <input
                    type="text"
                    value={draft.pythonPath}
                    onChange={(event) => updateDraft({ pythonPath: event.target.value })}
                    disabled={backendRuntime === 'docker'}
                    className="w-full rounded-xl border border-border bg-surface-1 px-3 py-2 text-sm text-text-primary outline-hidden transition-colors focus:border-accent"
                    placeholder={backendRuntime === 'docker' ? 'Docker runtime manages Python inside the container' : 'python3'}
                  />
                </div>
              </div>
            </SettingsCard>
          </div>
        )

      case 'shortcuts':
        return (
          <div className="space-y-4">
            <SettingsCard
              title="Keyboard Shortcuts"
              description="The title bar command menu and macOS menu bar dispatch to the same command map used here."
            >
              {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
                <div key={category} className="space-y-3 rounded-2xl border border-border/70 bg-surface-1/60 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">{category}</div>
                  <div className="grid gap-2">
                    {shortcuts.map((shortcut) => (
                      <div key={`${shortcut.commandId}-${shortcut.key}`} className="flex items-center justify-between gap-4 rounded-xl bg-surface-0/80 px-3 py-2">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-text-primary">{shortcut.label}</div>
                          <div className="text-xs text-text-muted">{shortcut.description}</div>
                        </div>
                        <kbd className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-[11px] font-semibold text-text-secondary">
                          {getShortcutCombo(shortcut)}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </SettingsCard>
          </div>
        )

      case 'about':
        return (
          <div className="space-y-4">
            <SettingsCard
              title="About"
              description="Release metadata, update status, and quick links for contributors."
            >
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-surface-1/60 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">App version</div>
                  <div className="mt-2 text-sm font-semibold text-text-primary">{updateState?.currentVersion ?? 'Unknown'}</div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-surface-1/60 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Release channel</div>
                  <div className="mt-2 text-sm font-semibold capitalize text-text-primary">{updateState?.channel ?? 'stable'}</div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-surface-1/60 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Update phase</div>
                  <div className="mt-2 text-sm font-semibold text-text-primary">{getUpdatePhaseLabel(updateState)}</div>
                </div>
              </div>

              <Separator.Root className="h-px bg-border" />

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => onRunCommand('open-help')}
                  className="flex items-center justify-between rounded-2xl border border-border bg-surface-1 px-4 py-3 text-left transition-colors hover:border-border-hover hover:bg-surface-2"
                >
                  <div>
                    <div className="text-sm font-medium text-text-primary">Open Help</div>
                    <div className="mt-1 text-xs text-text-muted">Keyboard shortcuts and UI guide.</div>
                  </div>
                  <CircleHelp className="h-4 w-4 text-text-secondary" />
                </button>

                <button
                  type="button"
                  onClick={() => window.open('https://www.electronjs.org/zh/docs/latest/tutorial/examples')}
                  className="flex items-center justify-between rounded-2xl border border-border bg-surface-1 px-4 py-3 text-left transition-colors hover:border-border-hover hover:bg-surface-2"
                >
                  <div>
                    <div className="text-sm font-medium text-text-primary">Documentation</div>
                    <div className="mt-1 text-xs text-text-muted">Open the Electron examples reference used for this shell.</div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-text-secondary" />
                </button>
              </div>
            </SettingsCard>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={handleCancel} />

      <div className="relative flex h-[min(760px,calc(100vh-48px))] w-[min(1120px,calc(100vw-48px))] overflow-hidden rounded-[28px] border border-border bg-surface-1 shadow-[0_36px_120px_rgba(0,0,0,0.55)]">
        <aside className="flex w-[272px] shrink-0 flex-col border-r border-border bg-surface-0/85 p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-text-primary">{t('settings.title')}</div>
              <div className="mt-1 text-xs text-text-muted">Command center for the desktop shell.</div>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl border border-border bg-surface-1 p-2 text-text-secondary transition-colors hover:border-border-hover hover:bg-surface-2 hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            {categories.map((category) => {
              const Icon = category.icon
              const active = category.id === activeSection
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveSection(category.id)}
                  className={clsx(
                    'flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors',
                    active
                      ? 'bg-surface-2 text-text-primary'
                      : 'text-text-secondary hover:bg-surface-1 hover:text-text-primary'
                  )}
                >
                  <Icon className={clsx('mt-0.5 h-4 w-4 shrink-0', active ? 'text-accent' : 'text-text-muted')} />
                  <div>
                    <div className="text-sm font-medium">{category.label}</div>
                    <div className="mt-1 text-xs leading-relaxed text-text-muted">{category.description}</div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-auto rounded-2xl border border-border bg-surface-1/70 px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Updater</div>
            <div className="mt-2 text-sm font-semibold text-text-primary">{getUpdatePhaseLabel(updateState)}</div>
            <div className="mt-1 text-xs text-text-muted">
              {updateState?.currentVersion ? `Version ${updateState.currentVersion}` : 'Waiting for app metadata'}
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                {categories.find((category) => category.id === activeSection)?.label ?? 'Settings'}
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                {categories.find((category) => category.id === activeSection)?.description ?? 'App preferences'}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">{renderSection()}</div>

          <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-0/75 px-6 py-4">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Monitor className="h-4 w-4" />
              Save applies editable preferences. Action buttons run immediately.
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-xl border border-border bg-surface-1 px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-hover hover:bg-surface-2"
              >
                {t('settings.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-lg shadow-accent/25 transition-colors hover:bg-accent/90"
              >
                {t('settings.save')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

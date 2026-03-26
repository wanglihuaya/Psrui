import React, { useEffect } from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { X, Globe, Palette, Cpu, Settings as SettingsIcon, Monitor, List, Zap, Terminal, Sun, Moon } from 'lucide-react'
import * as Separator from '@radix-ui/react-separator'
import { settingsAtom, settingsOpenAtom, draftSettingsAtom } from '@/lib/settings'
import type { AppSettings, AppTheme, ChartColorscale, Language } from '@/lib/settings'
import { useT } from '@/lib/i18n'
import { clsx } from 'clsx'

/**
 * Applies the theme class to the document root
 */
export function applyTheme(theme: AppTheme) {
  const html = document.documentElement
  html.classList.remove('theme-dark', 'theme-midnight', 'theme-nord', 'theme-light')
  html.classList.add(`theme-${theme}`)
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

export function SettingsPanel() {
  const [isOpen, setIsOpen] = useAtom(settingsOpenAtom)
  const [settings, setSettings] = useAtom(settingsAtom)
  const [draft, setDraft] = useAtom(draftSettingsAtom)
  const t = useT()

  // Initialize draft when panel opens
  useEffect(() => {
    if (isOpen) {
      setDraft({ ...settings })
    } else {
      setDraft(null)
    }
  }, [isOpen, settings, setDraft])

  // Apply theme on initial load (fallback in case App.tsx doesn't)
  useEffect(() => {
    applyTheme(settings.appTheme)
  }, [settings.appTheme])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, setIsOpen])

  if (!isOpen || !draft) return null

  const updateDraft = (patch: Partial<AppSettings>) => {
    setDraft((prev) => prev ? { ...prev, ...patch } : null)
  }

  const handleSave = () => {
    if (draft) {
      setSettings(draft)
      applyTheme(draft.appTheme)
      setIsOpen(false)
    }
  }

  const handleCancel = () => {
    setIsOpen(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={handleCancel}
      />

      {/* Panel */}
      <div className="relative w-96 h-full bg-surface-1 border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-2/50">
          <div className="flex items-center gap-2 font-bold text-text-primary">
            <SettingsIcon size={18} />
            {t('settings.title')}
          </div>
          <button 
            onClick={handleCancel}
            className="p-1.5 rounded-md hover:bg-surface-3 transition-colors text-text-secondary hover:text-text-primary"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-12">
          {/* General Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
              <Globe size={14} />
              {t('settings.general')}
            </div>
            
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary">{t('settings.language')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['en', 'zh'] as Language[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => updateDraft({ language: lang })}
                      className={clsx(
                        "py-1.5 px-3 rounded-md text-sm border transition-all",
                        draft.language === lang 
                          ? "bg-accent/10 border-accent text-accent shadow-[0_0_8px_rgba(91,141,239,0.3)]"
                          : "bg-surface-2 border-border text-text-secondary hover:border-border-hover"
                      )}
                    >
                      {lang === 'en' ? 'English' : '简体中文'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary flex items-center gap-2">
                  <Monitor size={14} />
                  {t('settings.defaultView')}
                </label>
                <select
                  value={draft.defaultView}
                  onChange={(e) => updateDraft({ defaultView: e.target.value as any })}
                  className="bg-surface-2 border border-border text-sm p-1.5 rounded-md text-text-primary focus:outline-hidden focus:border-accent"
                >
                  <option value="profile">{t('tabs.profile')}</option>
                  <option value="waterfall">{t('tabs.waterfall')}</option>
                  <option value="time-phase">{t('tabs.timePhase')}</option>
                  <option value="bandpass">{t('tabs.bandpass')}</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-text-secondary">{t('settings.showWelcome')}</label>
                <input 
                  type="checkbox" 
                  checked={draft.showWelcome}
                  onChange={(e) => updateDraft({ showWelcome: e.target.checked })}
                  className="accent-accent w-4 h-4 cursor-pointer"
                />
              </div>
            </div>
          </section>

          <Separator.Root className="h-[1px] bg-border" />

          {/* Appearance Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
              <Palette size={14} />
              {t('settings.appearance')}
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary">{t('settings.theme')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => updateDraft({ appTheme: theme.id })}
                      className={clsx(
                        "group relative h-14 rounded-md border flex flex-col items-center justify-center gap-1 transition-all overflow-hidden",
                        draft.appTheme === theme.id 
                          ? "border-accent ring-1 ring-accent" 
                          : "border-border hover:border-border-hover bg-surface-2"
                      )}
                    >
                      <div className="w-full h-full absolute inset-0 opacity-10" style={{ background: theme.color }} />
                      <div className="flex items-center gap-2 relative z-10">
                        {theme.id === 'light' ? (
                          <Sun size={14} className={clsx(draft.appTheme === theme.id ? "text-accent" : "text-orange-500")} />
                        ) : (
                          <Moon size={14} className={clsx(draft.appTheme === theme.id ? "text-accent" : "text-blue-400")} />
                        )}
                        <span className="text-xs font-medium text-text-primary">{theme.label}</span>
                      </div>
                      <div className="relative z-10 w-8 h-1 rounded-full opacity-40" style={{ background: theme.color }} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary">{t('settings.colorscale')}</label>
                <div className="grid grid-cols-1 gap-2">
                  {COLORSCALES.map((cs) => (
                    <button
                      key={cs.id}
                      onClick={() => updateDraft({ chartColorscale: cs.id })}
                      className={clsx(
                        "flex items-center justify-between p-2 rounded-md border transition-all",
                        draft.chartColorscale === cs.id 
                          ? "bg-accent/10 border-accent text-accent"
                          : "bg-surface-2 border-border text-text-secondary hover:border-border-hover"
                      )}
                    >
                      <span className="text-xs">{cs.label}</span>
                      <div className={clsx("w-32 h-2 rounded-full", cs.gradient)} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <Separator.Root className="h-[1px] bg-border" />

          {/* Advanced Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
              <Cpu size={14} />
              {t('settings.advanced')}
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Zap size={14} />
                  {t('settings.backendPort')}
                </div>
                <input 
                  type="number"
                  value={draft.backendPort}
                  onChange={(e) => updateDraft({ backendPort: parseInt(e.target.value) })}
                  className="bg-surface-2 border border-border text-sm p-1.5 rounded-md text-text-primary focus:outline-hidden focus:border-accent"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Terminal size={14} />
                  {t('settings.pythonPath')}
                </div>
                <input 
                  type="text"
                  value={draft.pythonPath}
                  onChange={(e) => updateDraft({ pythonPath: e.target.value })}
                  className="bg-surface-2 border border-border text-sm p-1.5 rounded-md text-text-primary focus:outline-hidden focus:border-accent"
                  placeholder="python3"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <List size={14} />
                  {t('settings.recentLimit')}
                </div>
                <input 
                  type="number"
                  value={draft.recentFilesLimit}
                  onChange={(e) => updateDraft({ recentFilesLimit: parseInt(e.target.value) })}
                  className="bg-surface-2 border border-border text-sm p-1.5 rounded-md text-text-primary focus:outline-hidden focus:border-accent"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-border bg-surface-2/30 flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 py-2 bg-surface-3 hover:bg-surface-2 border border-border text-text-primary rounded-md text-sm font-medium transition-colors"
          >
            {t('settings.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 bg-accent hover:bg-accent/90 text-white rounded-md text-sm font-medium transition-colors shadow-lg shadow-accent/20"
          >
            {t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

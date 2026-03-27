import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useT } from '@/lib/i18n'
import { type SettingsSection, sidebarCollapsedAtom } from '@/lib/settings'
import { backendReadyAtom, currentFileAtom } from '@/lib/store'
import { useAtomValue } from 'jotai'
import {
  AppWindow,
  ArrowDownCircle,
  ChevronRight,
  CircleHelp,
  Eye,
  FileText,
  LogOut,
  Menu,
  MonitorCog,
  PanelLeft,
  Settings2
} from 'lucide-react'
import { useState, type ComponentType, type ReactNode } from 'react'
import type { AppCommandId } from '../../../shared/commands'
import type { UpdateState } from '../../../shared/update'

interface TitleBarProps {
  onRunCommand: (commandId: AppCommandId) => void
  onOpenSettingsSection: (section: SettingsSection) => void
  updateState: UpdateState | null
}

interface CommandMenuItemProps {
  label: string
  shortcut?: string
  onSelect: () => void
  icon?: ComponentType<{ className?: string }>
  danger?: boolean
}

function CommandMenuItem({ label, shortcut, onSelect, icon: Icon, danger = false }: CommandMenuItemProps) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className={`group flex cursor-default items-center gap-3 rounded-xl px-3 py-2.5 text-sm outline-hidden transition-colors ${
        danger
          ? 'text-danger focus:bg-danger/12'
          : 'text-text-primary focus:bg-surface-3'
      }`}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0 text-text-secondary group-focus:text-current" /> : null}
      <span className="flex-1">{label}</span>
      {shortcut ? (
        <span className="text-[11px] uppercase tracking-[0.16em] text-text-muted">
          {shortcut}
        </span>
      ) : null}
    </DropdownMenu.Item>
  )
}

interface CommandSubmenuProps {
  label: string
  icon: ComponentType<{ className?: string }>
  children: ReactNode
}

function CommandSubmenu({ label, icon: Icon, children }: CommandSubmenuProps) {
  return (
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger className="group flex cursor-default items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-primary outline-hidden transition-colors focus:bg-surface-3">
        <Icon className="h-4 w-4 shrink-0 text-text-secondary group-focus:text-text-primary" />
        <span className="flex-1">{label}</span>
        <ChevronRight className="h-4 w-4 text-text-muted" />
      </DropdownMenu.SubTrigger>
      <DropdownMenu.Portal>
        <DropdownMenu.SubContent
          sideOffset={10}
          className="z-[220] min-w-[240px] rounded-2xl border border-border bg-surface-1 p-2 shadow-[0_24px_64px_rgba(0,0,0,0.45)]"
        >
          {children}
        </DropdownMenu.SubContent>
      </DropdownMenu.Portal>
    </DropdownMenu.Sub>
  )
}

function UpdateButton({ updateState, onUpdate }: { updateState: UpdateState | null; onUpdate: () => void }) {
  const [hovered, setHovered] = useState(false)

  if (!updateState) {
    return null
  }

  if (updateState.phase === 'checking') {
    return (
      <div className="no-drag rounded-full border border-border px-2.5 py-0.5 text-[10px] font-semibold text-text-secondary">
        Checking…
      </div>
    )
  }

  if (updateState.phase === 'downloading') {
    return (
      <div className="no-drag rounded-full border border-success/50 bg-success/15 px-2.5 py-0.5 text-[10px] font-semibold text-success">
        {`Downloading ${Math.round(updateState.progress ?? 0)}%`}
      </div>
    )
  }

  if (updateState.phase === 'downloaded') {
    return (
      <button
        onClick={onUpdate}
        className="no-drag rounded-full border border-success/50 bg-success/15 px-2.5 py-0.5 text-[10px] font-semibold text-success transition-colors hover:bg-success/20"
        title="Restart and install update"
      >
        Restart to Update
      </button>
    )
  }

  if (updateState.phase !== 'available') {
    return null
  }

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onUpdate}
      className={`no-drag flex h-3 shrink-0 items-center gap-1.5 overflow-hidden rounded-full border transition-all duration-300 ease-in-out ${
        hovered
          ? 'border-success/50 bg-success/20 px-2.5 py-0.5 text-success'
          : 'h-3 w-3 border-success/60 bg-success p-0'
      }`}
      title={updateState.availableVersion ? `Update ${updateState.availableVersion} available` : 'Update available'}
      style={{ minWidth: hovered ? 90 : 12 }}
    >
      {hovered ? (
        <>
          <ArrowDownCircle className="h-3 w-3 shrink-0" />
          <span className="whitespace-nowrap text-[10px] font-semibold leading-none">Update</span>
        </>
      ) : null}
    </button>
  )
}

export function TitleBar({ onRunCommand, onOpenSettingsSection, updateState }: TitleBarProps) {
  const t = useT()
  const backendReady = useAtomValue(backendReadyAtom)
  const currentFile = useAtomValue(currentFileAtom)
  const sidebarCollapsed = useAtomValue(sidebarCollapsedAtom)

  const filename = currentFile?.split('/').pop() ?? t('app.title')

  return (
    <div className="drag-region flex h-[47px] shrink-0 select-none items-center border-b border-border bg-surface-1">
      <div className="titlebar-traffic-space shrink-0" aria-hidden="true" />

      <div className="no-drag flex items-center gap-2 pl-1">
        <button
          type="button"
          onClick={() => onRunCommand('toggle-sidebar')}
          title={sidebarCollapsed ? 'Toggle Sidebar' : 'Toggle Sidebar'}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-surface-2 text-text-secondary transition-colors hover:border-border-hover hover:bg-surface-3 hover:text-text-primary"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              title="Open command menu"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-surface-2 text-text-secondary transition-colors hover:border-border-hover hover:bg-surface-3 hover:text-text-primary"
            >
              <Menu className="h-4 w-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              sideOffset={10}
              align="start"
              className="z-[220] min-w-[270px] rounded-[22px] border border-border bg-surface-1 p-2 shadow-[0_28px_90px_rgba(0,0,0,0.5)]"
            >
              <CommandMenuItem
                label="New Window"
                shortcut="⌘N"
                icon={AppWindow}
                onSelect={() => onRunCommand('new-window')}
              />

              <DropdownMenu.Separator className="my-2 h-px bg-border" />

              <CommandSubmenu label="File" icon={FileText}>
                <CommandMenuItem label="Open File" shortcut="⌘O" onSelect={() => onRunCommand('open-file')} />
                <CommandMenuItem label="Open Workspace" shortcut="⌘⇧O" onSelect={() => onRunCommand('open-workspace')} />
                <CommandMenuItem label="Close File" shortcut="⌘W" onSelect={() => onRunCommand('close-file')} />
                <DropdownMenu.Separator className="my-2 h-px bg-border" />
                <CommandMenuItem label="Save Image" shortcut="⌘S" onSelect={() => onRunCommand('save-image')} />
                <CommandMenuItem label="Save Archive" shortcut="⌘⇧S" onSelect={() => onRunCommand('save-archive')} />
              </CommandSubmenu>

              <CommandSubmenu label="View" icon={Eye}>
                <CommandMenuItem label="Profile" shortcut="⌘1" onSelect={() => onRunCommand('view-profile')} />
                <CommandMenuItem label="Freq × Phase" shortcut="⌘2" onSelect={() => onRunCommand('view-waterfall')} />
                <CommandMenuItem label="Time × Phase" shortcut="⌘3" onSelect={() => onRunCommand('view-time-phase')} />
                <CommandMenuItem label="Bandpass" shortcut="⌘4" onSelect={() => onRunCommand('view-bandpass')} />
                <CommandMenuItem label="PSRCAT" shortcut="⌘5" onSelect={() => onRunCommand('view-psrcat')} />
              </CommandSubmenu>

              <CommandSubmenu label="Window" icon={MonitorCog}>
                <CommandMenuItem label="Toggle Sidebar" shortcut="⌘B" onSelect={() => onRunCommand('toggle-sidebar')} />
                <CommandMenuItem label="Minimize Window" onSelect={() => onRunCommand('window-minimize')} />
                <CommandMenuItem label="Toggle Full Screen" onSelect={() => onRunCommand('window-toggle-full-screen')} />
              </CommandSubmenu>

              <DropdownMenu.Separator className="my-2 h-px bg-border" />

              <CommandMenuItem
                label="Settings"
                shortcut="⌘,"
                icon={Settings2}
                onSelect={() => onOpenSettingsSection('app')}
              />

              <CommandSubmenu label="Help" icon={CircleHelp}>
                <CommandMenuItem label="Keyboard Shortcuts" shortcut="⌘/" onSelect={() => onRunCommand('open-help')} />
                <CommandMenuItem label="Check for Updates" onSelect={() => onRunCommand('check-for-updates')} />
                <CommandMenuItem label="About" onSelect={() => onOpenSettingsSection('about')} />
              </CommandSubmenu>

              <DropdownMenu.Separator className="my-2 h-px bg-border" />

              <CommandMenuItem
                label="Quit"
                shortcut="⌘Q"
                icon={LogOut}
                danger
                onSelect={() => onRunCommand('app-quit')}
              />
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <div className="pointer-events-none flex flex-1 justify-center overflow-hidden px-4">
        <span className="truncate text-xs font-medium text-text-secondary">
          {filename}
        </span>
      </div>

      <div className="no-drag flex shrink-0 items-center gap-3 px-4">
        <UpdateButton updateState={updateState} onUpdate={() => onRunCommand('update-action')} />
        <div className="flex items-center gap-1.5">
          <div
            className={`h-1.5 w-1.5 rounded-full ${
              backendReady ? 'bg-success' : 'animate-pulse bg-danger'
            }`}
          />
          <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
            {backendReady ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>
    </div>
  )
}

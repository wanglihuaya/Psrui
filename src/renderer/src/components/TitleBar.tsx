import { useT } from '@/lib/i18n'
import { settingsOpenAtom, sidebarCollapsedAtom, workspacePathAtom } from '@/lib/settings'
import type { ViewTab } from '@/lib/store'
import { activeTabAtom, backendReadyAtom, currentFileAtom, helpOpenAtom } from '@/lib/store'
import { useAtomValue, useSetAtom } from 'jotai'
import { ArrowDownCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface TitleBarProps {
  onOpenFile: () => void
  onOpenFolder: () => void
  hasUpdate?: boolean
  onUpdate?: () => void
}

interface MenuItem {
  label?: string
  shortcut?: string
  onClick?: () => void
  separator?: boolean
}

interface MenuProps {
  label: string
  items: MenuItem[]
  isOpen: boolean
  onToggle: () => void
}

function Menu({ label, items, isOpen, onToggle }: MenuProps) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`px-3 py-1 text-xs rounded-md transition-colors no-drag ${
          isOpen
            ? 'bg-surface-3 text-text-primary'
            : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
        }`}
      >
        {label}
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-surface-2 border border-border rounded-md shadow-xl py-1 z-50 no-drag">
          {items.map((item, i) =>
            item.separator ? (
              <div key={i} className="h-px bg-border my-1" />
            ) : (
              <button
                key={i}
                onClick={() => {
                  item.onClick?.()
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-3 hover:text-text-primary transition-colors text-left"
              >
                <span>{item.label}</span>
                {item.shortcut && (
                  <span className="text-[10px] text-text-muted ml-4 tabular-nums">
                    {item.shortcut}
                  </span>
                )}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

// Fourth traffic-light style button: circle at rest, expands to pill on hover
function UpdateButton({ hasUpdate, onUpdate }: { hasUpdate: boolean; onUpdate?: () => void }) {
  const [hovered, setHovered] = useState(false)

  if (!hasUpdate) {
    // Idle dot — same visual weight as a traffic light
    return (
      <div
        className="size-[14px] rounded-full bg-success border border-border/60 shrink-0"
        title="Up to date"
      />
    )
  }

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onUpdate}
      className={`no-drag flex items-center gap-1.5 overflow-hidden transition-all duration-300 ease-in-out rounded-full border shrink-0 ${
        hovered
          ? 'bg-success/20 border-success/50 px-2.5 py-0.5 text-success'
          : 'w-3 h-3 bg-success border-success/60 p-0'
      }`}
      title="Update available"
      style={{ minWidth: hovered ? 80 : 12, height: 12 }}
    >
      {hovered ? (
        <>
          <ArrowDownCircle className="w-3 h-3 shrink-0" />
          <span className="text-[10px] font-semibold whitespace-nowrap leading-none">Update</span>
        </>
      ) : null}
    </button>
  )
}

export function TitleBar({ onOpenFile, onOpenFolder, hasUpdate = false, onUpdate }: TitleBarProps) {
  const t = useT()
  const backendReady = useAtomValue(backendReadyAtom)
  const currentFile = useAtomValue(currentFileAtom)
  const setCurrentFile = useSetAtom(currentFileAtom)
  const setActiveTab = useSetAtom(activeTabAtom)
  const setHelpOpen = useSetAtom(helpOpenAtom)
  const setSettingsOpen = useSetAtom(settingsOpenAtom)
  const sidebarCollapsed = useAtomValue(sidebarCollapsedAtom)
  const setSidebarCollapsed = useSetAtom(sidebarCollapsedAtom)
  const setWorkspacePath = useSetAtom(workspacePathAtom)

  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const filename = currentFile?.split('/').pop() ?? t('app.title')

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleOpenFolderAction = async () => {
    const path = await window.electron.openDirectory()
    if (path) {
      setWorkspacePath(path)
      onOpenFolder()
    }
    setOpenMenu(null)
  }

  const menus = [
    {
      id: 'file',
      label: 'File',
      items: [
        { label: 'Open File', shortcut: '⌘O', onClick: () => { onOpenFile(); setOpenMenu(null) } },
        { label: 'Open Workspace', shortcut: '⌘⇧O', onClick: handleOpenFolderAction },
        { label: 'Close File', shortcut: '⌘W', onClick: () => { setCurrentFile(null); setOpenMenu(null) } },
        { label: 'Save Image', shortcut: '⌘S', onClick: () => setOpenMenu(null) },
        { label: 'Save Archive', shortcut: '⌘⇧S', onClick: () => setOpenMenu(null) },
        { separator: true },
        { label: 'New Window', shortcut: '⌘N', onClick: () => { window.electron.newWindow(); setOpenMenu(null) } },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        { label: 'Profile', shortcut: '⌘1', onClick: () => { setActiveTab('profile' as ViewTab); setOpenMenu(null) } },
        { label: 'Freq × Phase', shortcut: '⌘2', onClick: () => { setActiveTab('waterfall' as ViewTab); setOpenMenu(null) } },
        { label: 'Time × Phase', shortcut: '⌘3', onClick: () => { setActiveTab('time-phase' as ViewTab); setOpenMenu(null) } },
        { label: 'Bandpass', shortcut: '⌘4', onClick: () => { setActiveTab('bandpass' as ViewTab); setOpenMenu(null) } },
        { separator: true },
        { label: 'Toggle Sidebar', shortcut: '⌘B', onClick: () => { setSidebarCollapsed(!sidebarCollapsed); setOpenMenu(null) } },
      ],
    },
    {
      id: 'help',
      label: 'Help',
      items: [
        { label: 'Keyboard Shortcuts', shortcut: '⌘/', onClick: () => { setHelpOpen(true); setOpenMenu(null) } },
        { label: 'About', onClick: () => { setSettingsOpen(true); setOpenMenu(null) } },
      ],
    },
  ]

  return (
    <div className="drag-region flex items-center h-[47px] bg-surface-1 border-b border-border shrink-0 select-none">
      {/* macOS Traffic Lights zone — traffic lights sit at x=16,y=11 in main process */}
      {/* pl-[87px] = 16px (x) + ~56px (3 buttons × 12px + 2 gaps × 11px) + 5px breathing room */}
      <div className="flex items-center gap-2 pl-[87px] pr-3 shrink-0 no-drag">
        <UpdateButton hasUpdate={hasUpdate} onUpdate={onUpdate} />
      </div>

      {/* Menus */}
      <div className="flex items-center gap-0.5 no-drag" ref={menuRef}>
        {menus.map((menu) => (
          <Menu
            key={menu.id}
            label={menu.label}
            isOpen={openMenu === menu.id}
            onToggle={() => setOpenMenu(openMenu === menu.id ? null : menu.id)}
            items={menu.items}
          />
        ))}
      </div>

      {/* Center: Title/Filename */}
      <div className="flex-1 flex justify-center overflow-hidden px-4 pointer-events-none">
        <span className="text-xs font-medium text-text-secondary truncate">
          {filename}
        </span>
      </div>

      {/* Right side: Backend Status */}
      <div className="flex items-center gap-3 px-4 no-drag shrink-0">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              backendReady ? 'bg-success' : 'bg-danger animate-pulse'
            }`}
          />
          <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
            {backendReady ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>
    </div>
  )
}

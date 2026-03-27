import { api, type FileTreeNode } from '@/lib/api'
import { useT } from '@/lib/i18n'
import {
  activeSidebarSectionAtom,
  fileLabelMapAtom,
  labelsAtom,
  settingsOpenAtom,
  settingsSectionAtom,
  sidebarCollapsedAtom,
  workspacePathAtom,
  type FileLabel
} from '@/lib/settings'
import {
  currentFileAtom,
  fileTreeAtom,
  fileTreeLoadingAtom,
  helpSectionAtom,
  helpOpenAtom,
  metadataAtom,
  openFilesAtom,
  psrcatOpenAtom
} from '@/lib/store'
import { clsx } from 'clsx'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  Filter,
  Folder,
  FolderClosed,
  FolderOpen,
  Globe,
  HelpCircle,
  Plus,
  RefreshCw,
  Settings,
  Tag,
  Trash2,
  X
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { HelpButton } from './HelpPanel'

export { HelpButton }

interface SidebarProps {
  onOpenFile: () => void
  onOpenFolder?: () => void
}

// ─── Rail Icon ────────────────────────────────────────────────────────────────

function RailIcon({
  icon: Icon,
  active,
  onClick,
  tooltip
}: {
  icon: any
  active?: boolean
  onClick: () => void
  tooltip?: string
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full h-10 flex items-center justify-center transition-colors relative group',
        active ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
      )}
      title={tooltip}
    >
      {active && (
        <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-accent rounded-r" />
      )}
      <Icon className="w-[18px] h-[18px]" />
    </button>
  )
}

// ─── Root Sidebar ─────────────────────────────────────────────────────────────

export function Sidebar({ onOpenFile, onOpenFolder }: SidebarProps) {
  const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom)
  const [activeSection, setActiveSection] = useAtom(activeSidebarSectionAtom)
  const [psrcatOpen, setPsrcatOpen] = useAtom(psrcatOpenAtom)
  const setSettingsOpen = useSetAtom(settingsOpenAtom)
  const setSettingsSection = useSetAtom(settingsSectionAtom)
  const setHelpOpen = useSetAtom(helpOpenAtom)
  const setHelpSection = useSetAtom(helpSectionAtom)
  const t = useT()

  // Files is active when: section is files AND psrcat is NOT open AND panel is expanded
  const filesActive = activeSection === 'files' && !psrcatOpen && !collapsed

  return (
    <div className="flex h-full shrink-0 select-none overflow-hidden">
      {/* Icon Rail */}
      <aside className="w-[46px] bg-surface-0 border-r border-border flex flex-col items-center py-3 z-20 shrink-0">
        <div className="flex-1 flex flex-col gap-1 items-center w-full">
          <RailIcon
            icon={FolderOpen}
            active={filesActive}
            onClick={() => {
              setActiveSection('files')
              setCollapsed(false)
              setPsrcatOpen(false)
            }}
            tooltip={t('nav.files')}
          />
          <RailIcon
            icon={Globe}
            active={psrcatOpen}
            onClick={() => {
              // Toggle: if already open, close; else open
              setPsrcatOpen(prev => !prev)
            }}
            tooltip={t('tabs.psrcat')}
          />
        </div>

        <div className="flex flex-col gap-1 items-center w-full">
          <RailIcon
            icon={HelpCircle}
            onClick={() => {
              setHelpSection('views')
              setHelpOpen(true)
            }}
            tooltip={t('app.help')}
          />
          <RailIcon
            icon={Settings}
            onClick={() => {
              setSettingsSection('app')
              setSettingsOpen(true)
            }}
            tooltip={t('app.settings')}
          />
        </div>
      </aside>

      {/* Navigator Panel — hidden when collapsed OR psrcat is open */}
      <aside
        className={clsx(
          'bg-surface-1 border-r border-border flex flex-col transition-all duration-200 ease-in-out overflow-hidden relative',
          (collapsed || psrcatOpen) ? 'w-0 opacity-0' : 'w-[240px] opacity-100'
        )}
      >
        <div className="flex flex-col h-full min-w-[240px]">
          {activeSection === 'files' && (
            <FilesNavigator onOpenFile={onOpenFile} onOpenFolder={onOpenFolder} />
          )}
        </div>
      </aside>
    </div>
  )
}

// ─── File Tree Node ───────────────────────────────────────────────────────────

function TreeNode({
  node,
  depth,
  onSelectFile,
  currentFile,
  openFiles,
  fileLabelMap,
  labels,
  onContextMenu
}: {
  node: FileTreeNode
  depth: number
  onSelectFile: (path: string) => void
  currentFile: string | null
  openFiles: string[]
  fileLabelMap: Record<string, string[]>
  labels: FileLabel[]
  onContextMenu: (e: React.MouseEvent, path: string) => void
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const isDir = node.type === 'directory'
  const isActive = node.path === currentFile
  const isOpen = openFiles.includes(node.path)

  if (isDir && node.children.length === 0) return null

  if (isDir) {
    return (
      <div>
        <button
          className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-surface-2 transition-colors text-text-secondary group"
          style={{ paddingLeft: 8 + depth * 12 }}
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-text-muted shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-text-muted shrink-0" />
          )}
          {expanded ? (
            <FolderOpen className="w-3.5 h-3.5 text-accent/70 shrink-0" />
          ) : (
            <FolderClosed className="w-3.5 h-3.5 text-text-muted shrink-0" />
          )}
          <span className="text-xs truncate font-medium">{node.name}</span>
        </button>
        {expanded && (
          <div>
            {node.children.map(child => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                onSelectFile={onSelectFile}
                currentFile={currentFile}
                openFiles={openFiles}
                fileLabelMap={fileLabelMap}
                labels={labels}
                onContextMenu={onContextMenu}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // file node
  const fileLabels = (fileLabelMap[node.path] || [])
    .map(id => labels.find(l => l.id === id))
    .filter(Boolean) as FileLabel[]

  return (
    <div
      className={clsx(
        'group flex items-center gap-1.5 py-1 cursor-pointer transition-colors relative',
        isActive ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-surface-2'
      )}
      style={{ paddingLeft: 16 + depth * 12, paddingRight: 8 }}
      onClick={() => onSelectFile(node.path)}
      onContextMenu={e => onContextMenu(e, node.path)}
    >
      <FileText
        className={clsx('w-3.5 h-3.5 shrink-0', isActive ? 'text-accent' : 'text-text-muted')}
      />
      <span className="text-xs truncate flex-1 font-mono">{node.name}</span>

      {/* label dots */}
      <div className="flex gap-0.5 shrink-0">
        {fileLabels.map(label => (
          <div
            key={label.id}
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: label.color }}
            title={label.name}
          />
        ))}
      </div>

      {isOpen && !isActive && (
        <div className="w-1.5 h-1.5 rounded-full bg-accent/40 shrink-0" />
      )}
    </div>
  )
}

// ─── Files Navigator ──────────────────────────────────────────────────────────

function FilesNavigator({ onOpenFile, onOpenFolder }: SidebarProps) {
  const [openFiles, setOpenFiles] = useAtom(openFilesAtom)
  const [currentFile, setCurrentFile] = useAtom(currentFileAtom)
  const [workspacePath, setWorkspacePath] = useAtom(workspacePathAtom)
  const metadata = useAtomValue(metadataAtom)
  const [labels, setLabels] = useAtom(labelsAtom)
  const [fileLabelMap, setFileLabelMap] = useAtom(fileLabelMapAtom)
  const [fileTree, setFileTree] = useAtom(fileTreeAtom)
  const [treeLoading, setTreeLoading] = useAtom(fileTreeLoadingAtom)
  const t = useT()

  const [sections, setSections] = useState({ labels: false, metadata: true })
  const [labelFilter, setLabelFilter] = useState<string | null>(null)

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string } | null>(null)
  const [editingLabel, setEditingLabel] = useState<string | null>(null)
  const [newLabelName, setNewLabelName] = useState('')

  // Load file tree whenever workspace changes
  const loadTree = useCallback(async (dir: string) => {
    setTreeLoading(true)
    try {
      const tree = await api.getFileTree(dir)
      setFileTree(tree)
    } catch {
      setFileTree(null)
    } finally {
      setTreeLoading(false)
    }
  }, [setFileTree, setTreeLoading])

  useEffect(() => {
    if (workspacePath) loadTree(workspacePath)
  }, [workspacePath, loadTree])

  const handleSelectFile = (path: string) => {
    setCurrentFile(path)
    setOpenFiles(prev => {
      const s = new Set(prev)
      s.add(path)
      return Array.from(s)
    })
  }

  const handleContextMenu = (e: React.MouseEvent, path: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, path })
  }

  const toggleLabel = (filePath: string, labelId: string) => {
    setFileLabelMap(prev => {
      const cur = prev[filePath] || []
      const next = cur.includes(labelId) ? cur.filter(id => id !== labelId) : [...cur, labelId]
      return { ...prev, [filePath]: next }
    })
  }

  const closeFile = (path: string) => {
    setOpenFiles(prev => prev.filter(f => f !== path))
    if (currentFile === path) {
      const remaining = openFiles.filter(f => f !== path)
      setCurrentFile(remaining.length > 0 ? remaining[0] : null)
    }
  }

  const addLabel = () => {
    const name = newLabelName.trim()
    if (!name) return
    const colors = ['#5b8def', '#5bef8f', '#efcf5b', '#ef5b5b', '#5bcfef', '#cf5bef', '#ef8f5b']
    const color = colors[labels.length % colors.length]
    setLabels(prev => [...prev, { id: `label-${Date.now()}`, name, color }])
    setNewLabelName('')
  }

  const removeLabel = (id: string) => {
    setLabels(prev => prev.filter(l => l.id !== id))
    setFileLabelMap(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(k => {
        next[k] = next[k].filter(lid => lid !== id)
      })
      return next
    })
  }

  // Filter tree files by selected label
  const filterPaths = labelFilter
    ? new Set(
        Object.entries(fileLabelMap)
          .filter(([, ids]) => ids.includes(labelFilter))
          .map(([p]) => p)
      )
    : null

  const filteredTree = filterPaths && fileTree
    ? filterTreeByPaths(fileTree, filterPaths)
    : fileTree

  const handleOpenFolderClick = async () => {
    const path = await window.electron.openDirectory()
    if (path) {
      setWorkspacePath(path)
      loadTree(path)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-border shrink-0">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenFile}
            className="p-1 hover:bg-surface-3 rounded text-text-muted hover:text-text-secondary transition-colors"
            title={t('nav.openFile')}
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleOpenFolderClick}
            className="p-1 hover:bg-surface-3 rounded text-text-muted hover:text-text-secondary transition-colors"
            title={t('nav.openFolder')}
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
          {workspacePath && (
            <button
              onClick={() => loadTree(workspacePath)}
              className="p-1 hover:bg-surface-3 rounded text-text-muted hover:text-text-secondary transition-colors"
              title="Refresh"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', treeLoading && 'animate-spin')} />
            </button>
          )}
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto py-1 scrollbar-thin">
        {!workspacePath && openFiles.length === 0 && (
          <div className="px-3 py-6 text-center">
            <FolderOpen className="w-8 h-8 text-surface-3 mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-xs text-text-muted">Open a folder to browse files</p>
            <button
              onClick={handleOpenFolderClick}
              className="mt-2 text-xs text-accent hover:underline"
            >
              Open Workspace
            </button>
          </div>
        )}

        {/* Workspace file tree */}
        {filteredTree && (
          <div className="py-0.5">
            <div className="flex items-center gap-1.5 px-2 py-1">
              <Folder className="w-3.5 h-3.5 text-accent/70 shrink-0" />
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider truncate">
                {filteredTree.name}
              </span>
            </div>
            {filteredTree.children.map(child => (
              <TreeNode
                key={child.path}
                node={child}
                depth={0}
                onSelectFile={handleSelectFile}
                currentFile={currentFile}
                openFiles={openFiles}
                fileLabelMap={fileLabelMap}
                labels={labels}
                onContextMenu={handleContextMenu}
              />
            ))}
          </div>
        )}

        {/* Flat open files (no workspace) */}
        {!workspacePath && openFiles.map(file => {
          const name = file.split('/').pop() || file
          const isActive = file === currentFile
          const fileLabels = (fileLabelMap[file] || [])
            .map(id => labels.find(l => l.id === id))
            .filter(Boolean) as FileLabel[]

          return (
            <div
              key={file}
              className={clsx(
                'group px-3 py-1.5 flex items-center gap-2 cursor-pointer transition-colors relative',
                isActive ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-surface-2'
              )}
              onClick={() => setCurrentFile(file)}
              onContextMenu={e => handleContextMenu(e, file)}
            >
              <FileText className={clsx('w-3.5 h-3.5 shrink-0', isActive ? 'text-accent' : 'text-text-muted')} />
              <span className="text-xs truncate flex-1 font-mono">{name}</span>
              <div className="flex gap-0.5">
                {fileLabels.map(label => (
                  <div key={label.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: label.color }} />
                ))}
              </div>
              <button
                onClick={e => { e.stopPropagation(); closeFile(file) }}
                className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-surface-3 rounded text-text-muted hover:text-danger transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Labels Section */}
      <CollapsibleSection
        title={t('nav.labels')}
        isOpen={sections.labels}
        onToggle={() => setSections(s => ({ ...s, labels: !s.labels }))}
        extra={
          <button
            onClick={e => { e.stopPropagation(); setEditingLabel('new') }}
            className="p-0.5 hover:bg-surface-3 rounded text-text-muted hover:text-text-secondary transition-colors"
            title="Add label"
          >
            <Plus className="w-3 h-3" />
          </button>
        }
      >
        <div className="px-1 py-1 space-y-0.5">
          {/* Active filter indicator */}
          {labelFilter && (
            <button
              onClick={() => setLabelFilter(null)}
              className="w-full flex items-center gap-2 px-2 py-1 text-xs text-accent bg-accent/10 rounded-md mb-1"
            >
              <Filter className="w-3 h-3" />
              <span className="flex-1 text-left">Filtering by label</span>
              <X className="w-3 h-3" />
            </button>
          )}

          {labels.map(label => {
            const count = Object.values(fileLabelMap).filter(ids => ids.includes(label.id)).length
            const isFiltering = labelFilter === label.id
            return (
              <div
                key={label.id}
                className={clsx(
                  'w-full flex items-center gap-2 px-2 py-1 text-xs rounded-md transition-colors group/label',
                  isFiltering
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:bg-surface-2 cursor-pointer'
                )}
                onClick={() => setLabelFilter(isFiltering ? null : label.id)}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                <span className="flex-1 truncate">{label.name}</span>
                {count > 0 && (
                  <span className="text-[10px] text-text-muted bg-surface-3 rounded px-1">{count}</span>
                )}
                <button
                  onClick={e => { e.stopPropagation(); removeLabel(label.id) }}
                  className="opacity-0 group-hover/label:opacity-100 p-0.5 hover:text-danger transition-all"
                  title="Remove label"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )
          })}

          {/* New label input */}
          {editingLabel === 'new' && (
            <div className="flex items-center gap-1 px-1 pt-1">
              <input
                autoFocus
                value={newLabelName}
                onChange={e => setNewLabelName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { addLabel(); setEditingLabel(null) }
                  if (e.key === 'Escape') setEditingLabel(null)
                }}
                placeholder="Label name..."
                className="flex-1 bg-surface-0 border border-border rounded px-2 py-1 text-xs text-text-primary outline-none focus:border-accent"
              />
              <button onClick={() => { addLabel(); setEditingLabel(null) }} className="p-1 hover:bg-surface-3 rounded text-text-muted">
                <Check className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Metadata Section */}
      {metadata && (
        <CollapsibleSection
          title={t('nav.metadata')}
          isOpen={sections.metadata}
          onToggle={() => setSections(s => ({ ...s, metadata: !s.metadata }))}
        >
          <div className="px-3 py-2 space-y-1.5 bg-surface-0/30">
            <MetaRow label={t('meta.source')} value={metadata.source} />
            <MetaRow label={t('meta.telescope')} value={metadata.telescope} />
            <MetaRow label={t('meta.freq')} value={`${metadata.centre_freq.toFixed(1)} MHz`} />
            <MetaRow label={t('meta.bw')} value={`${metadata.bandwidth.toFixed(1)} MHz`} />
            <MetaRow label={t('meta.nchan')} value={String(metadata.nchan)} />
            <MetaRow label={t('meta.nsub')} value={String(metadata.nsubint)} />
            <MetaRow label={t('meta.period')} value={`${(metadata.period * 1000).toFixed(3)} ms`} />
            <MetaRow label={t('meta.dm')} value={`${metadata.dm.toFixed(2)} pc/cm³`} />
          </div>
        </CollapsibleSection>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          path={contextMenu.path}
          labels={labels}
          fileLabelMap={fileLabelMap}
          onClose={() => setContextMenu(null)}
          onSelect={path => { setCurrentFile(path); setOpenFiles(prev => { const s = new Set(prev); s.add(path); return Array.from(s) }) }}
          onToggleLabel={toggleLabel}
          onClose2={closeFile}
        />
      )}
    </div>
  )
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

function ContextMenu({
  x, y, path, labels, fileLabelMap, onClose, onSelect, onToggleLabel, onClose2
}: {
  x: number; y: number; path: string
  labels: FileLabel[]
  fileLabelMap: Record<string, string[]>
  onClose: () => void
  onSelect: (path: string) => void
  onToggleLabel: (path: string, labelId: string) => void
  onClose2: (path: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    setTimeout(() => {
      document.addEventListener('mousedown', handler)
      document.addEventListener('keydown', keyHandler)
    }, 0)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [onClose])

  const name = path.split('/').pop() || path

  // Adjust position to stay in viewport
  const menuWidth = 192
  const menuHeight = 240
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 8)
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 8)

  return (
    <div
      ref={ref}
      className="fixed z-[200] w-48 bg-surface-2 border border-border rounded-lg shadow-xl py-1"
      style={{ left: adjustedX, top: adjustedY }}
    >
      <div className="px-3 py-1.5 text-[10px] text-text-muted truncate border-b border-border mb-1">
        {name}
      </div>
      <CtxItem icon={FolderOpen} label="Open" onClick={() => { onSelect(path); onClose() }} />
      <CtxItem icon={X} label="Close" onClick={() => { onClose2(path); onClose() }} />
      <CtxItem icon={Copy} label="Copy Path" onClick={() => { navigator.clipboard.writeText(path); onClose() }} />
      <CtxItem icon={Folder} label="Reveal in Finder" onClick={() => { window.electron?.showInFolder?.(path); onClose() }} />

      <div className="h-px bg-border my-1" />
      <div className="px-2 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1">
        <Tag className="w-3 h-3" /> Labels
      </div>
      <div className="max-h-28 overflow-y-auto">
        {labels.map(label => {
          const applied = (fileLabelMap[path] || []).includes(label.id)
          return (
            <button
              key={label.id}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-3 transition-colors"
              onClick={() => onToggleLabel(path, label.id)}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
                <span>{label.name}</span>
              </div>
              {applied && <Check className="w-3 h-3 text-accent" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CtxItem({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-3 transition-colors"
    >
      <Icon className="w-3.5 h-3.5 text-text-muted" />
      <span>{label}</span>
    </button>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CollapsibleSection({
  title, children, isOpen, onToggle, extra
}: {
  title: string
  children: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  extra?: React.ReactNode
}) {
  return (
    <div className="border-t border-border shrink-0">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-surface-2 transition-colors"
      >
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
          {title}
        </span>
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {extra}
          {isOpen ? (
            <ChevronDown className="w-3 h-3 text-text-muted" />
          ) : (
            <ChevronRight className="w-3 h-3 text-text-muted" />
          )}
        </div>
      </button>
      {isOpen && <div>{children}</div>}
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-text-muted">{label}</span>
      <span className="text-text-primary font-mono truncate ml-2">{value}</span>
    </div>
  )
}

// Filter tree to only include directories containing files with matching paths
function filterTreeByPaths(node: FileTreeNode, paths: Set<string>): FileTreeNode | null {
  if (node.type === 'file') {
    return paths.has(node.path) ? node : null
  }
  const filteredChildren = node.children
    .map(child => filterTreeByPaths(child, paths))
    .filter((c): c is FileTreeNode => c !== null)
  if (filteredChildren.length === 0) return null
  return { ...node, children: filteredChildren }
}

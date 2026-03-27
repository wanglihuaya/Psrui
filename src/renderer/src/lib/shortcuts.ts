import type { AppCommandId } from '../../../shared/commands'
import { useEffect } from 'react'

export type ShortcutCommandId = AppCommandId | 'undo' | 'redo'

export interface Shortcut {
  key: string           // e.g. 'o', 's', '1'
  meta: boolean         // Cmd key
  shift?: boolean
  alt?: boolean
  commandId: ShortcutCommandId
  label: string         // Human-readable label
  labelZh: string       // Chinese label
  description: string   // What it does
  descriptionZh: string
  category: 'file' | 'view' | 'edit' | 'tools' | 'app'
}

export const SHORTCUTS: Shortcut[] = [
  { key: 'o', meta: true, commandId: 'open-file', label: 'Open File', labelZh: '打开文件', description: 'Open pulsar archive files', descriptionZh: '打开脉冲星数据文件', category: 'file' },
  { key: 'o', meta: true, shift: true, commandId: 'open-workspace', label: 'Open Workspace', labelZh: '打开工作区', description: 'Open a workspace folder', descriptionZh: '打开工作区文件夹', category: 'file' },
  { key: 'w', meta: true, commandId: 'close-file', label: 'Close File', labelZh: '关闭文件', description: 'Close current file', descriptionZh: '关闭当前文件', category: 'file' },
  { key: 's', meta: true, commandId: 'save-image', label: 'Save Image', labelZh: '保存图片', description: 'Save current chart as PNG', descriptionZh: '保存当前图表为 PNG', category: 'file' },
  { key: 's', meta: true, shift: true, commandId: 'save-archive', label: 'Save Archive', labelZh: '保存文件', description: 'Save processed archive', descriptionZh: '保存处理后的文件', category: 'file' },
  { key: 'n', meta: true, commandId: 'new-window', label: 'New Window', labelZh: '新建窗口', description: 'Open new window', descriptionZh: '打开新窗口', category: 'app' },
  { key: '1', meta: true, commandId: 'view-profile', label: 'Profile View', labelZh: '轮廓图', description: 'Switch to pulse profile', descriptionZh: '切换到脉冲轮廓图', category: 'view' },
  { key: '2', meta: true, commandId: 'view-waterfall', label: 'Freq × Phase', labelZh: '频率-相位图', description: 'Switch to frequency-phase', descriptionZh: '切换到频率-相位图', category: 'view' },
  { key: '3', meta: true, commandId: 'view-time-phase', label: 'Time × Phase', labelZh: '时间-相位图', description: 'Switch to time-phase', descriptionZh: '切换到时间-相位图', category: 'view' },
  { key: '4', meta: true, commandId: 'view-bandpass', label: 'Bandpass', labelZh: '通带响应', description: 'Switch to bandpass view', descriptionZh: '切换到通带响应图', category: 'view' },
  { key: '5', meta: true, commandId: 'view-psrcat', label: 'PSRCAT', labelZh: '脉冲星目录', description: 'Open PSRCAT catalogue panel', descriptionZh: '打开脉冲星目录面板', category: 'view' },
  { key: 'z', meta: true, commandId: 'undo', label: 'Undo', labelZh: '撤销', description: 'Undo last operation', descriptionZh: '撤销上一步操作', category: 'edit' },
  { key: 'z', meta: true, shift: true, commandId: 'redo', label: 'Redo', labelZh: '重做', description: 'Redo last undone operation', descriptionZh: '重做上一步操作', category: 'edit' },
  { key: 'b', meta: true, commandId: 'toggle-sidebar', label: 'Toggle Sidebar', labelZh: '收起/展开侧栏', description: 'Toggle sidebar visibility', descriptionZh: '收起或展开侧边栏', category: 'app' },
  { key: ',', meta: true, commandId: 'open-settings', label: 'Settings', labelZh: '设置', description: 'Open settings', descriptionZh: '打开设置', category: 'app' },
  { key: '/', meta: true, commandId: 'open-help', label: 'Help', labelZh: '帮助', description: 'Show keyboard shortcuts', descriptionZh: '显示快捷键帮助', category: 'app' },
]

export function useShortcuts(handlers: Partial<Record<ShortcutCommandId, () => void>>) {
  useEffect(() => {
    const isMac = navigator.platform.toUpperCase().includes('MAC')

    const handleKeyDown = (e: KeyboardEvent) => {
      // Find matching shortcut
      const shortcut = SHORTCUTS.find((s) => {
        const keyMatch = e.key.toLowerCase() === s.key.toLowerCase()
        const metaMatch = s.meta ? (isMac ? e.metaKey : e.ctrlKey) : (!e.metaKey && !e.ctrlKey)
        const shiftMatch = !!s.shift === e.shiftKey
        const altMatch = !!s.alt === e.altKey
        return keyMatch && metaMatch && shiftMatch && altMatch
      })

      if (shortcut && handlers[shortcut.commandId]) {
        e.preventDefault()
        handlers[shortcut.commandId]?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlers])
}

import { contextBridge, ipcRenderer } from 'electron'
import type { BackendRuntime } from '../shared/backend'
import type { AppCommandId } from '../shared/commands'
import type { UpdateState } from '../shared/update'

export type ElectronAPI = {
  openFile: (kind?: 'archive' | 'calibration' | 'text' | 'any') => Promise<string[]>
  openDirectory: () => Promise<string | null>
  saveFile: (defaultName: string, kind?: 'image' | 'archive' | 'text' | 'any') => Promise<string | null>
  showInFolder: (path: string) => Promise<void>
  getBackendPort: () => Promise<number>
  getBackendStatus: () => Promise<boolean>
  getBackendRuntime: () => Promise<BackendRuntime>
  restartBackend: () => Promise<boolean>
  newWindow: (filePath?: string) => Promise<void>
  minimizeWindow: () => Promise<void>
  toggleFullScreen: () => Promise<void>
  quitApp: () => Promise<void>
  onFileOpen: (callback: (path: string) => void) => void
  onAppCommand: (callback: (commandId: AppCommandId) => void) => () => void
  getUpdateState: () => Promise<UpdateState | null>
  checkForUpdates: () => Promise<UpdateState | null>
  downloadUpdate: () => Promise<UpdateState | null>
  installUpdate: () => Promise<UpdateState | null>
  onUpdateState: (callback: (state: UpdateState) => void) => () => void
}

const api: ElectronAPI = {
  openFile: (kind = 'archive') => ipcRenderer.invoke('dialog:openFile', kind),
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  saveFile: (defaultName: string, kind = 'image') => ipcRenderer.invoke('dialog:saveFile', defaultName, kind),
  showInFolder: (path: string) => ipcRenderer.invoke('shell:showItemInFolder', path),
  getBackendPort: () => ipcRenderer.invoke('backend:port'),
  getBackendStatus: () => ipcRenderer.invoke('backend:status'),
  getBackendRuntime: () => ipcRenderer.invoke('backend:runtime'),
  restartBackend: () => ipcRenderer.invoke('backend:restart'),
  newWindow: (filePath?: string) => ipcRenderer.invoke('window:new', filePath),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  toggleFullScreen: () => ipcRenderer.invoke('window:toggleFullScreen'),
  quitApp: () => ipcRenderer.invoke('app:quit'),
  getUpdateState: () => ipcRenderer.invoke('updates:getState'),
  checkForUpdates: () => ipcRenderer.invoke('updates:check'),
  downloadUpdate: () => ipcRenderer.invoke('updates:download'),
  installUpdate: () => ipcRenderer.invoke('updates:install'),
  onFileOpen: (callback: (path: string) => void) => {
    ipcRenderer.on('file:open', (_, path) => callback(path))
  },
  onAppCommand: (callback: (commandId: AppCommandId) => void) => {
    const listener = (_: Electron.IpcRendererEvent, commandId: AppCommandId) => callback(commandId)
    ipcRenderer.on('app:command', listener)
    return () => ipcRenderer.removeListener('app:command', listener)
  },
  onUpdateState: (callback: (state: UpdateState) => void) => {
    const listener = (_: Electron.IpcRendererEvent, state: UpdateState) => callback(state)
    ipcRenderer.on('updates:state', listener)
    return () => ipcRenderer.removeListener('updates:state', listener)
  }
}

contextBridge.exposeInMainWorld('electron', api)

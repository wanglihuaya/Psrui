import { contextBridge, ipcRenderer } from 'electron'
import type { UpdateState } from '../shared/update'

export type ElectronAPI = {
  openFile: () => Promise<string[]>
  openDirectory: () => Promise<string | null>
  saveFile: (defaultName: string) => Promise<string | null>
  showInFolder: (path: string) => Promise<void>
  getBackendPort: () => Promise<number>
  getBackendStatus: () => Promise<boolean>
  restartBackend: () => Promise<boolean>
  newWindow: (filePath?: string) => Promise<void>
  onFileOpen: (callback: (path: string) => void) => void
  getUpdateState: () => Promise<UpdateState | null>
  checkForUpdates: () => Promise<UpdateState | null>
  downloadUpdate: () => Promise<UpdateState | null>
  installUpdate: () => Promise<UpdateState | null>
  onUpdateState: (callback: (state: UpdateState) => void) => () => void
}

const api: ElectronAPI = {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  saveFile: (defaultName: string) => ipcRenderer.invoke('dialog:saveFile', defaultName),
  showInFolder: (path: string) => ipcRenderer.invoke('shell:showItemInFolder', path),
  getBackendPort: () => ipcRenderer.invoke('backend:port'),
  getBackendStatus: () => ipcRenderer.invoke('backend:status'),
  restartBackend: () => ipcRenderer.invoke('backend:restart'),
  newWindow: (filePath?: string) => ipcRenderer.invoke('window:new', filePath),
  getUpdateState: () => ipcRenderer.invoke('updates:getState'),
  checkForUpdates: () => ipcRenderer.invoke('updates:check'),
  downloadUpdate: () => ipcRenderer.invoke('updates:download'),
  installUpdate: () => ipcRenderer.invoke('updates:install'),
  onFileOpen: (callback: (path: string) => void) => {
    ipcRenderer.on('file:open', (_, path) => callback(path))
  },
  onUpdateState: (callback: (state: UpdateState) => void) => {
    const listener = (_: Electron.IpcRendererEvent, state: UpdateState) => callback(state)
    ipcRenderer.on('updates:state', listener)
    return () => ipcRenderer.removeListener('updates:state', listener)
  }
}

contextBridge.exposeInMainWorld('electron', api)

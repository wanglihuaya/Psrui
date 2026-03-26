import { contextBridge, ipcRenderer } from 'electron'

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
  onFileOpen: (callback: (path: string) => void) => {
    ipcRenderer.on('file:open', (_, path) => callback(path))
  }
}

contextBridge.exposeInMainWorld('electron', api)
